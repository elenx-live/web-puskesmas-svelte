import type { ServiceRegistrationEntity, RegistrationStatus, RegistrationHistoryItem } from '../types/index.js';
import { serviceEngineService } from './serviceEngineService';
import { auditService } from './auditService';
import { notificationService } from './notificationService';
import { sanitizeText } from '../utils/sanitize';
import { getCollectionData, saveDocumentData } from '../lib/firebase';
import { memStore } from '../lib/memStore';

const REGISTRATIONS_STORAGE_KEY = 'puskesmas_online_registrations';
const REGISTRATIONS_COLLECTION = 'registrations';

function getStoredRegistrations(): ServiceRegistrationEntity[] {
  try {
    const data = memStore.getItem(REGISTRATIONS_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveStoredRegistrations(list: ServiceRegistrationEntity[]): void {
  try {
    memStore.setItem(REGISTRATIONS_STORAGE_KEY, JSON.stringify(list));
    fetch('/api/data/registrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(list)
    }).catch(() => {});
  } catch (err) {
    console.error('Failed to save online registrations:', err);
  }
}

export const registrationService = {
  async getRegistrations(filters?: {
    search?: string;
    status?: RegistrationStatus | '';
    serviceId?: string;
    visitDate?: string;
  }): Promise<ServiceRegistrationEntity[]> {
    let list = await getCollectionData<ServiceRegistrationEntity>(REGISTRATIONS_COLLECTION, REGISTRATIONS_STORAGE_KEY, []);

    // Sort by creation date descending by default
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (!filters) return list;

    if (filters.status) {
      list = list.filter(r => r.status === filters.status);
    }

    if (filters.serviceId) {
      list = list.filter(r => r.serviceId === filters.serviceId);
    }

    if (filters.visitDate) {
      list = list.filter(r => r.visitDate === filters.visitDate);
    }

    if (filters.search) {
      const q = filters.search.toLowerCase().trim();
      list = list.filter(r => 
        r.registrationNumber.toLowerCase().includes(q) ||
        r.fullName.toLowerCase().includes(q) ||
        r.identityNumber.toLowerCase().includes(q) ||
        r.phoneNumber.toLowerCase().includes(q)
      );
    }

    return list;
  },

  async getRegistrationById(id: string): Promise<ServiceRegistrationEntity | null> {
    const list = getStoredRegistrations();
    return list.find(r => r.id === id) || null;
  },

  async getRegistrationByNumber(regNum: string): Promise<ServiceRegistrationEntity | null> {
    const list = getStoredRegistrations();
    const formatted = regNum.trim().toUpperCase();
    return list.find(r => r.registrationNumber.toUpperCase() === formatted) || null;
  },

  /**
   * Secure lookup requiring registration number AND identity or phone number
   */
  async verifyAndGetRegistration(
    registrationNumber: string,
    verificationValue: string
  ): Promise<ServiceRegistrationEntity | null> {
    const reg = await this.getRegistrationByNumber(registrationNumber);
    if (!reg) return null;

    const cleanVerify = verificationValue.trim().toLowerCase();
    
    // Check match against phoneNumber or identityNumber or dateOfBirth
    const matchPhone = reg.phoneNumber.replace(/[^0-9]/g, '').endsWith(cleanVerify.replace(/[^0-9]/g, ''));
    const matchIdentity = reg.identityNumber.toLowerCase() === cleanVerify;
    const matchDob = reg.dateOfBirth === cleanVerify;

    if (matchPhone || matchIdentity || matchDob) {
      return reg;
    }

    return null;
  },

  async createRegistration(
    input: Omit<ServiceRegistrationEntity, 'id' | 'registrationNumber' | 'status' | 'createdAt' | 'updatedAt' | 'history'>
  ): Promise<ServiceRegistrationEntity> {
    // 1. Sanitize inputs
    const fullName = sanitizeText(input.fullName);
    const identityNumber = sanitizeText(input.identityNumber);
    const phoneNumber = sanitizeText(input.phoneNumber);
    const notes = sanitizeText(input.notes || '');

    // 2. Fetch target service
    const service = await serviceEngineService.getServiceById(input.serviceId);
    if (!service) {
      throw new Error('Layanan yang dipilih tidak ditemukan atau sudah tidak aktif.');
    }

    if (service.status !== 'published') {
      throw new Error(`Layanan "${service.name}" saat ini tidak menerima pendaftaran baru.`);
    }

    if (!service.onlineRegistrationEnabled) {
      throw new Error(`Layanan "${service.name}" tidak dikonfigurasi untuk pendaftaran online.`);
    }

    // 3. Validate Date - Can't be in the past
    const todayStr = new Date().toISOString().split('T')[0]; // Local date comparison
    if (input.visitDate < todayStr) {
      throw new Error('Tanggal kunjungan tidak boleh di masa lampau.');
    }

    // 4. Validate Schedule (Check weekly rules and exceptions)
    const schedule = await serviceEngineService.getServiceSchedule(input.serviceId);
    const exceptions = await serviceEngineService.getScheduleExceptionsByServiceId(input.serviceId);

    // Parse day of week for selected visit date
    const visitDateObj = new Date(input.visitDate);
    const days: ('sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday')[] = [
      'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'
    ];
    const visitDayName = days[visitDateObj.getDay()];

    // Check exceptions first
    const exception = exceptions.find(e => e.status !== 'archived' && e.date === input.visitDate);
    if (exception) {
      if (exception.type === 'closed' || !exception.isOpen) {
        throw new Error(`Layanan tutup pada tanggal ${input.visitDate} karena: ${exception.reason || 'Jadwal Libur'}`);
      }
    } else {
      // Check regular schedule rule
      const rule = schedule?.rules?.find(r => r.dayOfWeek === visitDayName);
      if (!rule || !rule.isOpen || rule.status === 'inactive') {
        throw new Error(`Layanan "${service.name}" tidak buka pada hari ${visitDayName === 'sunday' ? 'Minggu' : visitDayName === 'monday' ? 'Senin' : visitDayName === 'tuesday' ? 'Selasa' : visitDayName === 'wednesday' ? 'Rabu' : visitDayName === 'thursday' ? 'Kamis' : visitDayName === 'friday' ? 'Jumat' : 'Sabtu'}.`);
      }
    }

    // 5. Anti-spam/Duplicate Prevention
    // Ensure no pending/approved registration for same person + same service + same date
    const list = getStoredRegistrations();
    const isDuplicate = list.some(r => 
      r.identityNumber === identityNumber &&
      r.serviceId === input.serviceId &&
      r.visitDate === input.visitDate &&
      (r.status === 'waiting' || r.status === 'confirmed')
    );

    if (isDuplicate) {
      throw new Error('Anda sudah terdaftar di layanan ini pada tanggal kunjungan yang sama.');
    }

    // 6. Generate unique registration number: REG-YYYY-000001
    const currentYear = new Date().getFullYear().toString();
    const sameYearRegs = list.filter(r => r.registrationNumber.startsWith(`REG-${currentYear}`));
    const nextSeq = sameYearRegs.length + 1;
    const registrationNumber = `REG-${currentYear}-${nextSeq.toString().padStart(6, '0')}`;

    const nowStr = new Date().toISOString();

    const newReg: ServiceRegistrationEntity = {
      id: `reg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      registrationNumber,
      fullName,
      identityNumber,
      dateOfBirth: input.dateOfBirth,
      gender: input.gender,
      phoneNumber,
      whatsappConsent: !!input.whatsappConsent,
      serviceId: input.serviceId,
      serviceName: service.name,
      visitDate: input.visitDate,
      notes,
      status: 'waiting',
      createdAt: nowStr,
      updatedAt: nowStr,
      history: [
        {
          status: 'waiting',
          updatedBy: 'Sistem Pendaftaran Mandiri',
          updatedAt: nowStr,
          notes: 'Pendaftaran online berhasil diajukan.'
        }
      ]
    };

    list.push(newReg);
    saveStoredRegistrations(list);

    // Record Audit Log (public actions use System actor)
    await auditService.recordLog({
      userId: 'system-public',
      userName: fullName,
      userEmail: 'public-registration@puskesmas.go.id',
      action: 'CREATE',
      module: 'ONLINE_REGISTRATIONS',
      targetId: newReg.id,
      targetName: registrationNumber,
      description: `Pendaftaran online baru ${registrationNumber} dibuat oleh pasien ${fullName} untuk layanan ${service.name}`
    });

    // Trigger notification safely (Core transaction first, notification second)
    await notificationService.triggerEvent(
      'registration_created',
      newReg.identityNumber,
      { 
        registrationNumber: newReg.registrationNumber, 
        serviceName: newReg.serviceName 
      },
      'pendaftaran',
      newReg.id,
      `/pendaftaran/cek?reg=${newReg.registrationNumber}`,
      { id: 'system-public', email: 'public-registration@puskesmas.go.id', name: fullName }
    );

    return newReg;
  },

  async updateStatus(
    id: string,
    newStatus: RegistrationStatus,
    actor: { id: string; email: string; name: string },
    adminNotes?: string
  ): Promise<ServiceRegistrationEntity> {
    const list = getStoredRegistrations();
    const idx = list.findIndex(r => r.id === id);
    if (idx === -1) {
      throw new Error('Pendaftaran tidak ditemukan.');
    }

    const current = list[idx];
    const oldStatus = current.status;
    const nowStr = new Date().toISOString();

    // Check cancellation validation (if cancelled by user, we can handle)
    if (newStatus === 'cancelled' && oldStatus !== 'waiting' && oldStatus !== 'confirmed') {
      throw new Error('Pendaftaran yang sudah diproses tidak dapat dibatalkan.');
    }

    let queueNumber = current.queueNumber;
    let queueStatus = current.queueStatus;

    if (newStatus === 'confirmed' && !queueNumber) {
      const service = await serviceEngineService.getServiceById(current.serviceId);
      if (service && service.queueEnabled) {
        const prefix = (service.queuePrefix || 'A').toUpperCase().trim();
        const existingQueueNumbers = list
          .filter(r => r.serviceId === service.id && r.visitDate === current.visitDate && r.queueNumber)
          .map(r => r.queueNumber as string);

        let maxSeq = 0;
        for (const qNum of existingQueueNumbers) {
          const parts = qNum.split('-');
          if (parts.length >= 2) {
            const numPart = parseInt(parts[parts.length - 1], 10);
            if (!isNaN(numPart) && numPart > maxSeq) {
              maxSeq = numPart;
            }
          }
        }
        const nextSeq = maxSeq + 1;
        queueNumber = `${prefix}-${nextSeq.toString().padStart(3, '0')}`;
        queueStatus = 'waiting';
      }
    }

    if (newStatus === 'cancelled') {
      queueStatus = 'cancelled';
    }

    const historyItem: RegistrationHistoryItem = {
      status: newStatus,
      updatedBy: actor.name,
      updatedAt: nowStr,
      notes: adminNotes || `Status diperbarui dari ${oldStatus} menjadi ${newStatus}`
    };

    const updated: ServiceRegistrationEntity = {
      ...current,
      status: newStatus,
      queueNumber,
      queueStatus,
      adminNotes: adminNotes || current.adminNotes,
      rejectionReason: newStatus === 'rejected' ? (adminNotes || current.rejectionReason) : current.rejectionReason,
      updatedAt: nowStr,
      history: [...current.history, historyItem]
    };

    list[idx] = updated;
    saveStoredRegistrations(list);

    // Record Audit Log for registration status change
    await auditService.recordLog({
      userId: actor.id,
      userName: actor.name,
      userEmail: actor.email,
      action: 'UPDATE',
      module: 'ONLINE_REGISTRATIONS',
      targetId: updated.id,
      targetName: updated.registrationNumber,
      description: `Mengubah status pendaftaran ${updated.registrationNumber} dari '${oldStatus}' menjadi '${newStatus}'`
    });

    // Extra Audit logs for queue creation/cancellation
    if (queueNumber && !current.queueNumber) {
      await auditService.recordLog({
        userId: actor.id,
        userName: actor.name,
        userEmail: actor.email,
        action: 'CREATE',
        module: 'ONLINE_REGISTRATIONS',
        targetId: updated.id,
        targetName: queueNumber,
        description: `Antrean dibuat: Nomor ${queueNumber} untuk pendaftaran ${updated.registrationNumber} (layanan ${updated.serviceName})`
      });
    }

    if (newStatus === 'cancelled' && current.queueNumber) {
      await auditService.recordLog({
        userId: actor.id,
        userName: actor.name,
        userEmail: actor.email,
        action: 'UPDATE',
        module: 'ONLINE_REGISTRATIONS',
        targetId: updated.id,
        targetName: updated.queueNumber,
        description: `Antrean dibatalkan untuk nomor ${updated.queueNumber} pendaftaran ${updated.registrationNumber}`
      });
    }

    // Trigger Notification Event (Core transaction first, notification second)
    try {
      if (newStatus === 'confirmed') {
        // Dispatch verified first, then confirmed
        await notificationService.triggerEvent(
          'registration_verified',
          updated.identityNumber,
          { registrationNumber: updated.registrationNumber },
          'pendaftaran',
          updated.id,
          `/pendaftaran/cek?reg=${updated.registrationNumber}`,
          actor
        );

        await notificationService.triggerEvent(
          'registration_confirmed',
          updated.identityNumber,
          { 
            registrationNumber: updated.registrationNumber, 
            visitDate: updated.visitDate, 
            queueNumber: updated.queueNumber || '-' 
          },
          'pendaftaran',
          updated.id,
          `/pendaftaran/cek?reg=${updated.registrationNumber}`,
          actor
        );

        if (queueNumber && !current.queueNumber) {
          await notificationService.triggerEvent(
            'queue_created',
            updated.identityNumber,
            { 
              queueNumber: queueNumber, 
              serviceName: updated.serviceName 
            },
            'antrean',
            updated.id,
            `/antrian`,
            actor
          );
        }
      } else if (newStatus === 'rejected') {
        await notificationService.triggerEvent(
          'registration_rejected',
          updated.identityNumber,
          { 
            registrationNumber: updated.registrationNumber, 
            rejectionReason: updated.rejectionReason || adminNotes || 'Tidak memenuhi syarat' 
          },
          'pendaftaran',
          updated.id,
          `/pendaftaran/cek?reg=${updated.registrationNumber}`,
          actor
        );
      } else if (newStatus === 'cancelled') {
        await notificationService.triggerEvent(
          'registration_cancelled',
          updated.identityNumber,
          { registrationNumber: updated.registrationNumber },
          'pendaftaran',
          updated.id,
          `/pendaftaran/cek?reg=${updated.registrationNumber}`,
          actor
        );
      }
    } catch (err) {
      console.error('Failed to trigger registration status notification:', err);
    }

    return updated;
  },

  async getDashboardSummary(): Promise<{
    total: number;
    waiting: number;
    confirmed: number;
    rejected: number;
    completed: number;
    cancelled: number;
  }> {
    const list = getStoredRegistrations();
    const total = list.length;
    const waiting = list.filter(r => r.status === 'waiting').length;
    const confirmed = list.filter(r => r.status === 'confirmed').length;
    const rejected = list.filter(r => r.status === 'rejected').length;
    const completed = list.filter(r => r.status === 'completed').length;
    const cancelled = list.filter(r => r.status === 'cancelled').length;

    return {
      total,
      waiting,
      confirmed,
      rejected,
      completed,
      cancelled
    };
  },

  async updateQueueStatus(
    id: string,
    newQueueStatus: 'waiting' | 'calling' | 'serving' | 'completed' | 'skipped' | 'cancelled',
    actor: { id: string; email: string; name: string },
    counterNumber?: number,
    adminNotes?: string
  ): Promise<ServiceRegistrationEntity> {
    const list = getStoredRegistrations();
    const idx = list.findIndex(r => r.id === id);
    if (idx === -1) {
      throw new Error('Antrean tidak ditemukan.');
    }
    const current = list[idx];
    const oldQueueStatus = current.queueStatus || 'waiting';
    const nowStr = new Date().toISOString();

    const historyItem: RegistrationHistoryItem = {
      status: current.status,
      updatedBy: actor.name,
      updatedAt: nowStr,
      notes: adminNotes || `Status antrean diperbarui dari ${oldQueueStatus} menjadi ${newQueueStatus}`
    };

    let regStatus = current.status;
    if (newQueueStatus === 'completed') {
      regStatus = 'completed';
    } else if (newQueueStatus === 'cancelled') {
      regStatus = 'cancelled';
    }

    const updated: ServiceRegistrationEntity = {
      ...current,
      status: regStatus,
      queueStatus: newQueueStatus,
      counterNumber: counterNumber !== undefined ? counterNumber : current.counterNumber,
      adminNotes: adminNotes || current.adminNotes,
      updatedAt: nowStr,
      queueCalledAt: newQueueStatus === 'calling' ? nowStr : current.queueCalledAt,
      history: [...current.history, historyItem]
    };

    list[idx] = updated;
    saveStoredRegistrations(list);

    let auditDesc = `Mengubah status antrean ${current.queueNumber} dari '${oldQueueStatus}' menjadi '${newQueueStatus}'`;
    if (newQueueStatus === 'calling') {
      auditDesc = `Antrean ${current.queueNumber} dipanggil di Loket ${counterNumber || updated.counterNumber || '-'}`;
    } else if (newQueueStatus === 'serving') {
      auditDesc = `Antrean ${current.queueNumber} mulai dilayani`;
    } else if (newQueueStatus === 'completed') {
      auditDesc = `Antrean ${current.queueNumber} selesai dilayani`;
    } else if (newQueueStatus === 'skipped') {
      auditDesc = `Antrean ${current.queueNumber} dilewati (Alasan: ${adminNotes || 'tidak hadir'})`;
    } else if (newQueueStatus === 'cancelled') {
      auditDesc = `Antrean ${current.queueNumber} dibatalkan`;
    }

    await auditService.recordLog({
      userId: actor.id,
      userName: actor.name,
      userEmail: actor.email,
      action: 'UPDATE',
      module: 'ONLINE_REGISTRATIONS',
      targetId: updated.id,
      targetName: updated.queueNumber,
      description: auditDesc
    });

    // Trigger Notification Event (Core transaction first, notification second)
    try {
      if (newQueueStatus === 'calling') {
        await notificationService.triggerEvent(
          'queue_called',
          updated.identityNumber,
          { 
            queueNumber: updated.queueNumber || '-', 
            counterNumber: String(updated.counterNumber || '-'), 
            serviceName: updated.serviceName 
          },
          'antrean',
          updated.id,
          `/antrian`,
          actor
        );
      } else if (newQueueStatus === 'skipped') {
        await notificationService.triggerEvent(
          'queue_skipped',
          updated.identityNumber,
          { 
            queueNumber: updated.queueNumber || '-', 
            serviceName: updated.serviceName 
          },
          'antrean',
          updated.id,
          `/antrian`,
          actor
        );
      } else if (newQueueStatus === 'completed') {
        await notificationService.triggerEvent(
          'queue_completed',
          updated.identityNumber,
          { 
            queueNumber: updated.queueNumber || '-', 
            serviceName: updated.serviceName 
          },
          'antrean',
          updated.id,
          `/antrian`,
          actor
        );
      }
    } catch (err) {
      console.error('Failed to trigger queue status notification:', err);
    }

    return updated;
  },

  async recallQueue(
    id: string,
    actor: { id: string; email: string; name: string }
  ): Promise<ServiceRegistrationEntity> {
    const list = getStoredRegistrations();
    const idx = list.findIndex(r => r.id === id);
    if (idx === -1) {
      throw new Error('Antrean tidak ditemukan.');
    }
    const current = list[idx];
    const nowStr = new Date().toISOString();

    const historyItem: RegistrationHistoryItem = {
      status: current.status,
      updatedBy: actor.name,
      updatedAt: nowStr,
      notes: `Antrean dipanggil ulang (recall)`
    };

    const updated: ServiceRegistrationEntity = {
      ...current,
      queueCalledAt: nowStr,
      updatedAt: nowStr,
      history: [...current.history, historyItem]
    };

    list[idx] = updated;
    saveStoredRegistrations(list);

    await auditService.recordLog({
      userId: actor.id,
      userName: actor.name,
      userEmail: actor.email,
      action: 'UPDATE',
      module: 'ONLINE_REGISTRATIONS',
      targetId: updated.id,
      targetName: updated.queueNumber,
      description: `Antrean ${updated.queueNumber} dipanggil ulang (recall) di Loket ${updated.counterNumber || '-'}`
    });

    // Trigger Notification Event for recall (Core transaction first, notification second)
    try {
      await notificationService.triggerEvent(
        'queue_recalled',
        updated.identityNumber,
        { 
          queueNumber: updated.queueNumber || '-', 
          counterNumber: String(updated.counterNumber || '-') 
        },
        'antrean',
        updated.id,
        `/antrian`,
        actor
      );
    } catch (err) {
      console.error('Failed to trigger queue recall notification:', err);
    }

    return updated;
  },

  async getQueueDashboardSummary(filters?: {
    visitDate?: string;
    serviceId?: string;
  }): Promise<{
    todayCount: number;
    waitingCount: number;
    callingCount: number;
    servingCount: number;
    completedCount: number;
    skippedCount: number;
    cancelledCount: number;
  }> {
    const list = getStoredRegistrations();
    const dateToUse = filters?.visitDate || new Date().toISOString().split('T')[0];
    
    let filtered = list.filter(r => r.visitDate === dateToUse && r.queueNumber);
    if (filters?.serviceId) {
      filtered = filtered.filter(r => r.serviceId === filters.serviceId);
    }

    const todayCount = filtered.length;
    const waitingCount = filtered.filter(r => r.queueStatus === 'waiting').length;
    const callingCount = filtered.filter(r => r.queueStatus === 'calling').length;
    const servingCount = filtered.filter(r => r.queueStatus === 'serving').length;
    const completedCount = filtered.filter(r => r.queueStatus === 'completed').length;
    const skippedCount = filtered.filter(r => r.queueStatus === 'skipped').length;
    const cancelledCount = filtered.filter(r => r.queueStatus === 'cancelled').length;

    return {
      todayCount,
      waitingCount,
      callingCount,
      servingCount,
      completedCount,
      skippedCount,
      cancelledCount
    };
  }
};
