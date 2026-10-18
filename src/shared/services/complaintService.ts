import type { ComplaintEntity, ComplaintType, ComplaintStatus, ComplaintPriority, ComplaintAttachment, InternalNoteItem, PublicResponseItem } from '../types/index.js';
import { INITIAL_COMPLAINTS } from '../firebase/seedData';
import { serviceEngineService } from './serviceEngineService';
import { auditService } from './auditService';
import { notificationService } from './notificationService';
import { getCollectionData, saveDocumentData, deleteDocumentData } from '../lib/firebase';
import { logger } from '../lib/logger';
import { memStore } from '../lib/memStore';

const COMPLAINTS_STORAGE_KEY = 'puskesmas_complaints';
const RATE_LIMIT_STORAGE_KEY = 'puskesmas_complaint_rate_limit';
const COMPLAINTS_COLLECTION = 'complaints';

function getStoredComplaints(): ComplaintEntity[] {
  try {
    const data = memStore.getItem(COMPLAINTS_STORAGE_KEY);
    let items: any[] = [];
    if (!data) {
      items = INITIAL_COMPLAINTS;
      memStore.setItem(COMPLAINTS_STORAGE_KEY, JSON.stringify(items));
    } else {
      items = JSON.parse(data);
    }
    
    let modified = false;
    const mapped: ComplaintEntity[] = items.map(c => {
      let updated = { ...c };
      if (!updated.title) {
        updated.title = updated.content ? (updated.content.substring(0, 40) + (updated.content.length > 40 ? '...' : '')) : 'Laporan Tanpa Judul';
        modified = true;
      }
      if (!updated.category) {
        updated.category = 'Lainnya';
        modified = true;
      }
      if (!updated.status) {
        updated.status = 'new';
        modified = true;
      }
      if (!updated.priority) {
        updated.priority = 'normal';
        modified = true;
      }
      if (!updated.targetResponseTime) {
        const createdDate = new Date(updated.createdAt || Date.now());
        updated.targetResponseTime = new Date(createdDate.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString();
        updated.targetResolutionTime = new Date(createdDate.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString();
        modified = true;
      }
      return updated;
    });

    if (modified) {
      saveStoredComplaints(mapped);
    }
    return mapped;
  } catch {
    return (INITIAL_COMPLAINTS as any[]).map(c => ({
      ...c,
      title: c.content ? (c.content.substring(0, 40) + '...') : 'Laporan Tanpa Judul',
      category: 'Lainnya',
      priority: 'normal',
      targetResponseTime: new Date().toISOString(),
      targetResolutionTime: new Date().toISOString()
    })) as ComplaintEntity[];
  }
}

function saveStoredComplaints(items: ComplaintEntity[]) {
  try {
    memStore.setItem(COMPLAINTS_STORAGE_KEY, JSON.stringify(items));
    fetch('/api/data/complaints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(items)
    }).catch(() => {});
  } catch (err) {
    console.error('Failed to save complaints:', err);
  }
}

// Basic XSS & HTML Sanitization
function sanitizeText(str: string | undefined): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .trim();
}

// Rate Limiter Check (Max 3 submissions per 10 minutes per client)
function checkRateLimit(): boolean {
  try {
    const now = Date.now();
    const windowMs = 10 * 60 * 1000; // 10 minutes
    const maxSubmissions = 3;

    const raw = memStore.getItem(RATE_LIMIT_STORAGE_KEY);
    let timestamps: number[] = raw ? JSON.parse(raw) : [];

    // Clean old timestamps outside the window
    timestamps = timestamps.filter(t => now - t < windowMs);

    if (timestamps.length >= maxSubmissions) {
      return false;
    }

    timestamps.push(now);
    memStore.setItem(RATE_LIMIT_STORAGE_KEY, JSON.stringify(timestamps));
    return true;
  } catch {
    return true;
  }
}

// Ticket Number Generator: ADU-2026-000123
function generateTicketNumber(existingComplaints: ComplaintEntity[]): string {
  const year = new Date().getFullYear();
  const prefix = `ADU-${year}-`;

  let maxSequence = 0;
  existingComplaints.forEach(c => {
    if (c.ticketNumber && c.ticketNumber.startsWith(prefix)) {
      const seqStr = c.ticketNumber.replace(prefix, '');
      const seq = parseInt(seqStr, 10);
      if (!isNaN(seq) && seq > maxSequence) {
        maxSequence = seq;
      }
    }
  });

  const nextSeq = (maxSequence + 1).toString().padStart(6, '0');
  return `${prefix}${nextSeq}`;
}

const CATEGORIES_STORAGE_KEY = 'puskesmas_complaint_categories';
const SLA_STORAGE_KEY = 'puskesmas_complaint_sla';
const ENABLED_TYPES_STORAGE_KEY = 'puskesmas_complaint_enabled_types';

const DEFAULT_CATEGORIES = [
  'Administrasi',
  'Waktu Pelayanan',
  'Sikap Petugas',
  'Fasilitas',
  'Informasi',
  'Prosedur',
  'Sarana/Prasarana',
  'Lainnya'
];

const DEFAULT_SLA = {
  responseDays: 1,
  resolutionDays: 5
};

const DEFAULT_ENABLED_TYPES: ComplaintType[] = ['pengaduan', 'kritik', 'saran', 'apresiasi', 'informasi'];

export interface CreateComplaintInput {
  type: ComplaintType;
  title: string;
  senderName?: string;
  senderEmail?: string;
  senderPhone?: string;
  isAnonymous: boolean;
  serviceId?: string;
  unitId?: string;
  unitName?: string;
  locationId?: string;
  locationName?: string;
  category?: string;
  occurrenceDate?: string;
  content: string;
  attachment?: ComplaintAttachment;
}

export interface ComplaintFilterOptions {
  search?: string;
  type?: ComplaintType | '';
  status?: ComplaintStatus | '';
  priority?: ComplaintPriority | '';
  serviceId?: string;
  unitId?: string;
  locationId?: string;
  category?: string;
  assignedTo?: string;
  startDate?: string;
  endDate?: string;
}

export const complaintService = {
  getCategories(): string[] {
    try {
      const stored = memStore.getItem(CATEGORIES_STORAGE_KEY);
      if (!stored) {
        memStore.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(DEFAULT_CATEGORIES));
        return DEFAULT_CATEGORIES;
      }
      return JSON.parse(stored);
    } catch {
      return DEFAULT_CATEGORIES;
    }
  },

  saveCategories(cats: string[]): void {
    try {
      memStore.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(cats));
    } catch (err) {
      console.error('Failed to save categories:', err);
    }
  },

  getSLASettings(): { responseDays: number; resolutionDays: number } {
    try {
      const stored = memStore.getItem(SLA_STORAGE_KEY);
      if (!stored) {
        memStore.setItem(SLA_STORAGE_KEY, JSON.stringify(DEFAULT_SLA));
        return DEFAULT_SLA;
      }
      return JSON.parse(stored);
    } catch {
      return DEFAULT_SLA;
    }
  },

  saveSLASettings(sla: { responseDays: number; resolutionDays: number }): void {
    try {
      memStore.setItem(SLA_STORAGE_KEY, JSON.stringify(sla));
    } catch (err) {
      console.error('Failed to save SLA settings:', err);
    }
  },

  getEnabledTypes(): ComplaintType[] {
    try {
      const stored = memStore.getItem(ENABLED_TYPES_STORAGE_KEY);
      if (!stored) {
        memStore.setItem(ENABLED_TYPES_STORAGE_KEY, JSON.stringify(DEFAULT_ENABLED_TYPES));
        return DEFAULT_ENABLED_TYPES;
      }
      return JSON.parse(stored);
    } catch {
      return DEFAULT_ENABLED_TYPES;
    }
  },

  saveEnabledTypes(types: ComplaintType[]): void {
    try {
      memStore.setItem(ENABLED_TYPES_STORAGE_KEY, JSON.stringify(types));
    } catch (err) {
      console.error('Failed to save enabled types:', err);
    }
  },

  async getComplaints(filters?: ComplaintFilterOptions): Promise<ComplaintEntity[]> {
    let list = await getCollectionData<ComplaintEntity>(COMPLAINTS_COLLECTION, COMPLAINTS_STORAGE_KEY, INITIAL_COMPLAINTS);

    if (!filters) {
      return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    if (filters.status) {
      list = list.filter(c => c.status === filters.status);
    }

    if (filters.type) {
      list = list.filter(c => c.type === filters.type);
    }

    if (filters.priority) {
      list = list.filter(c => c.priority === filters.priority);
    }

    if (filters.serviceId) {
      list = list.filter(c => c.serviceId === filters.serviceId);
    }

    if (filters.unitId) {
      list = list.filter(c => c.unitId === filters.unitId);
    }

    if (filters.locationId) {
      list = list.filter(c => c.locationId === filters.locationId);
    }

    if (filters.category) {
      list = list.filter(c => c.category === filters.category);
    }

    if (filters.assignedTo) {
      list = list.filter(c => c.assignedTo === filters.assignedTo);
    }

    if (filters.startDate) {
      const start = new Date(filters.startDate).getTime();
      list = list.filter(c => new Date(c.createdAt).getTime() >= start);
    }

    if (filters.endDate) {
      const end = new Date(filters.endDate).setHours(23, 59, 59, 999);
      list = list.filter(c => new Date(c.createdAt).getTime() <= end);
    }

    if (filters.search) {
      const q = filters.search.toLowerCase().trim();
      list = list.filter(c => {
        const matchTicket = c.ticketNumber.toLowerCase().includes(q);
        const matchTitle = c.title?.toLowerCase().includes(q);
        const matchContent = c.content.toLowerCase().includes(q);
        const matchSender = !c.isAnonymous && (
          c.senderName?.toLowerCase().includes(q) || 
          c.senderEmail?.toLowerCase().includes(q) ||
          c.senderPhone?.toLowerCase().includes(q)
        );
        const matchService = c.serviceName?.toLowerCase().includes(q);
        const matchUnit = c.unitName?.toLowerCase().includes(q);
        return matchTicket || matchTitle || matchContent || matchSender || matchService || matchUnit;
      });
    }

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async getComplaintById(id: string): Promise<ComplaintEntity | null> {
    const list = getStoredComplaints();
    return list.find(c => c.id === id) || null;
  },

  async getComplaintByTicketNumber(ticketNumber: string): Promise<any | null> {
    const list = getStoredComplaints();
    const formatted = ticketNumber.trim().toUpperCase();
    const comp = list.find(c => c.ticketNumber.toUpperCase() === formatted);
    if (!comp) return null;
    
    // Mask/hide private/internal data for public tracking
    return {
      id: comp.id,
      ticketNumber: comp.ticketNumber,
      type: comp.type,
      title: comp.title,
      senderName: comp.isAnonymous ? '' : (comp.senderName ? (comp.senderName.charAt(0) + '***' + (comp.senderName.length > 2 ? comp.senderName.slice(-1) : '')) : ''),
      isAnonymous: comp.isAnonymous,
      serviceId: comp.serviceId,
      serviceName: comp.serviceName,
      unitId: comp.unitId,
      unitName: comp.unitName,
      locationId: comp.locationId,
      locationName: comp.locationName,
      occurrenceDate: comp.occurrenceDate,
      content: comp.content,
      attachment: comp.attachment,
      status: comp.status,
      createdAt: comp.createdAt,
      updatedAt: comp.updatedAt,
      resolvedAt: comp.resolvedAt,
      publicResponses: comp.publicResponses || [],
      isDuplicate: comp.isDuplicate,
      duplicateOfTicket: comp.duplicateOfTicket,
      targetResponseTime: comp.targetResponseTime,
      targetResolutionTime: comp.targetResolutionTime,
      satisfactionRating: comp.satisfactionRating,
      satisfactionComment: comp.satisfactionComment
    };
  },

  async createComplaint(input: CreateComplaintInput): Promise<ComplaintEntity> {
    // 1. Anti-spam Rate Limit Check
    if (!checkRateLimit()) {
      throw new Error('Anda telah mengirim beberapa pengaduan dalam waktu singkat. Mohon tunggu 10 menit sebelum mencoba kembali.');
    }

    // 2. Validation
    const enabledTypes = this.getEnabledTypes();
    if (!enabledTypes.includes(input.type)) {
      throw new Error(`Jenis penyampaian "${input.type}" saat ini dinonaktifkan oleh administrator.`);
    }

    const cleanTitle = sanitizeText(input.title);
    if (!cleanTitle || cleanTitle.length < 5) {
      throw new Error('Judul penyampaian minimal 5 karakter.');
    }

    const cleanContent = sanitizeText(input.content);
    if (!cleanContent || cleanContent.length < 10) {
      throw new Error('Isi kritik/saran/pengaduan minimal 10 karakter.');
    }

    if (cleanContent.length > 2000) {
      throw new Error('Isi pengaduan melebihi batas maksimum 2000 karakter.');
    }

    let cleanName = sanitizeText(input.senderName);
    let cleanEmail = sanitizeText(input.senderEmail);
    let cleanPhone = sanitizeText(input.senderPhone);

    if (input.isAnonymous) {
      cleanName = '';
      cleanEmail = '';
      cleanPhone = '';
    } else {
      if (cleanEmail) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(cleanEmail)) {
          throw new Error('Format alamat email tidak valid.');
        }
      }

      if (cleanPhone) {
        const phoneRegex = /^[0-9+\-\s()]{8,20}$/;
        if (!phoneRegex.test(cleanPhone)) {
          throw new Error('Format nomor telepon / HP tidak valid.');
        }
      }
    }

    // Attachment validation if present
    if (input.attachment) {
      const forbiddenExts = ['.exe', '.bat', '.sh', '.msi', '.cmd', '.vbs', '.js', '.php'];
      const fileExt = input.attachment.fileName.slice(input.attachment.fileName.lastIndexOf('.')).toLowerCase();
      if (forbiddenExts.includes(fileExt)) {
        throw new Error('Jenis berkas yang diunggah tidak diizinkan untuk alasan keamanan.');
      }

      if (input.attachment.fileSize && input.attachment.fileSize > 5 * 1024 * 1024) {
        throw new Error('Ukuran lampiran berkas tidak boleh melebihi 5 MB.');
      }
    }

    // 3. Resolve Service Name
    let serviceName = 'Tidak terkait layanan tertentu';
    if (input.serviceId) {
      try {
        const srv = await serviceEngineService.getServiceById(input.serviceId);
        if (srv) {
          serviceName = srv.name;
        }
      } catch {
        // Fallback
      }
    }

    // 4. Generate Ticket Number & ID
    const list = getStoredComplaints();
    const ticketNumber = generateTicketNumber(list);
    const now = new Date();
    const nowISO = now.toISOString();

    // SLA Time Calculations
    const sla = this.getSLASettings();
    const targetResponseTime = new Date(now.getTime() + sla.responseDays * 24 * 60 * 60 * 1000).toISOString();
    const targetResolutionTime = new Date(now.getTime() + sla.resolutionDays * 24 * 60 * 60 * 1000).toISOString();

    const newComplaint: ComplaintEntity = {
      id: `cmp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      ticketNumber,
      type: input.type,
      title: cleanTitle,
      senderName: cleanName || undefined,
      senderEmail: cleanEmail || undefined,
      senderPhone: cleanPhone || undefined,
      isAnonymous: Boolean(input.isAnonymous),
      serviceId: input.serviceId || undefined,
      serviceName,
      unitId: input.unitId || undefined,
      unitName: input.unitName || undefined,
      locationId: input.locationId || undefined,
      locationName: input.locationName || undefined,
      category: input.category || 'Lainnya',
      occurrenceDate: input.occurrenceDate || undefined,
      content: cleanContent,
      attachment: input.attachment,
      status: 'new',
      priority: 'normal',
      createdAt: nowISO,
      updatedAt: nowISO,
      targetResponseTime,
      targetResolutionTime,
      internalNotes: [],
      publicResponses: []
    };

    const updatedList = [newComplaint, ...list];
    saveStoredComplaints(updatedList);

    // Audit log
    await auditService.recordLog({
      userId: 'public-user',
      userEmail: cleanEmail || 'public@anon.local',
      userName: cleanName || (input.isAnonymous ? 'Pengirim Anonim' : 'Masyarakat Public'),
      action: 'CREATE',
      module: 'COMPLAINTS',
      targetId: newComplaint.id,
      targetName: ticketNumber,
      description: `Penyampaian ${input.type.toUpperCase()} baru diterima dengan nomor tiket: ${ticketNumber}`
    });

    // Trigger Notification Event
    try {
      const recipient = newComplaint.senderEmail || newComplaint.ticketNumber;
      await notificationService.triggerEvent(
        'complaint_received',
        recipient,
        { ticketNumber: newComplaint.ticketNumber },
        'pengaduan',
        newComplaint.id,
        `/pengaduan/cek?ticket=${newComplaint.ticketNumber}`
      );

      // Simulated WhatsApp Message
      const waSettingsStr = memStore.getItem('puskesmas_whatsapp_settings');
      if (waSettingsStr && cleanPhone) {
        const waSettings = JSON.parse(waSettingsStr);
        if (waSettings.isEnabled) {
          logger.debug(`[WhatsApp API Simulated] Sent received notification to ${cleanPhone}: Tiket ${ticketNumber}`);
        }
      }
    } catch (err) {
      console.error('Failed to trigger complaint received notification:', err);
    }

    return newComplaint;
  },

  async updateComplaintStatus(
    id: string,
    newStatus: ComplaintStatus,
    actor: { id: string; email: string; name: string }
  ): Promise<ComplaintEntity> {
    const list = getStoredComplaints();
    const index = list.findIndex(c => c.id === id);
    if (index === -1) {
      throw new Error('Pengaduan tidak ditemukan.');
    }

    const current = list[index];
    const now = new Date().toISOString();

    const updated: ComplaintEntity = {
      ...current,
      status: newStatus,
      updatedAt: now,
      resolvedAt: (newStatus === 'completed' || newStatus === 'rejected') ? now : current.resolvedAt,
      resolvedBy: (newStatus === 'completed' || newStatus === 'rejected') ? actor.name : current.resolvedBy
    };

    list[index] = updated;
    saveStoredComplaints(list);

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'UPDATE',
      module: 'COMPLAINTS',
      targetId: updated.id,
      targetName: updated.ticketNumber,
      description: `Memperbarui status pengaduan ${updated.ticketNumber} dari '${current.status}' menjadi '${newStatus}'`
    });

    // Trigger Notification Event
    try {
      const recipient = updated.senderEmail || updated.ticketNumber;
      const isCompleted = newStatus === 'completed' || newStatus === 'rejected';
      
      const statusLabels: Record<ComplaintStatus, string> = {
        new: 'Diterima',
        verified: 'Diverifikasi',
        assigned: 'Ditugaskan',
        processing: 'Diproses',
        pending_info: 'Menunggu Informasi',
        completed: 'Selesai',
        closed: 'Ditutup',
        rejected: 'Ditolak'
      };

      await notificationService.triggerEvent(
        isCompleted ? 'complaint_completed' : 'complaint_status_changed',
        recipient,
        { 
          ticketNumber: updated.ticketNumber,
          status: statusLabels[newStatus]
        },
        'pengaduan',
        updated.id,
        `/pengaduan/cek?ticket=${updated.ticketNumber}`,
        actor
      );

      // Simulated WhatsApp Message
      if (updated.senderPhone) {
        const waSettingsStr = memStore.getItem('puskesmas_whatsapp_settings');
        if (waSettingsStr) {
          const waSettings = JSON.parse(waSettingsStr);
          if (waSettings.isEnabled) {
            logger.debug(`[WhatsApp API Simulated] Sent status update to ${updated.senderPhone}: Tiket ${updated.ticketNumber} status is now ${statusLabels[newStatus]}`);
          }
        }
      }
    } catch (err) {
      console.error('Failed to trigger complaint status notification:', err);
    }

    return updated;
  },

  async updateComplaintPriority(
    id: string,
    newPriority: ComplaintPriority,
    actor: { id: string; email: string; name: string }
  ): Promise<ComplaintEntity> {
    const list = getStoredComplaints();
    const index = list.findIndex(c => c.id === id);
    if (index === -1) {
      throw new Error('Pengaduan tidak ditemukan.');
    }

    const current = list[index];
    const updated: ComplaintEntity = {
      ...current,
      priority: newPriority,
      updatedAt: new Date().toISOString()
    };

    list[index] = updated;
    saveStoredComplaints(list);

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'UPDATE',
      module: 'COMPLAINTS',
      targetId: updated.id,
      targetName: updated.ticketNumber,
      description: `Memperbarui prioritas pengaduan ${updated.ticketNumber} menjadi '${newPriority}'`
    });

    return updated;
  },

  async updateComplaintCategory(
    id: string,
    category: string,
    actor: { id: string; email: string; name: string }
  ): Promise<ComplaintEntity> {
    const list = getStoredComplaints();
    const index = list.findIndex(c => c.id === id);
    if (index === -1) {
      throw new Error('Pengaduan tidak ditemukan.');
    }

    const current = list[index];
    const updated: ComplaintEntity = {
      ...current,
      category,
      updatedAt: new Date().toISOString()
    };

    list[index] = updated;
    saveStoredComplaints(list);

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'UPDATE',
      module: 'COMPLAINTS',
      targetId: updated.id,
      targetName: updated.ticketNumber,
      description: `Memperbarui kategori pengaduan ${updated.ticketNumber} menjadi '${category}'`
    });

    return updated;
  },

  async assignComplaint(
    id: string,
    assignedToUserId: string,
    assignedToName: string,
    actor: { id: string; email: string; name: string }
  ): Promise<ComplaintEntity> {
    const list = getStoredComplaints();
    const index = list.findIndex(c => c.id === id);
    if (index === -1) {
      throw new Error('Pengaduan tidak ditemukan.');
    }

    const current = list[index];
    const updated: ComplaintEntity = {
      ...current,
      assignedTo: assignedToUserId || undefined,
      assignedToName: assignedToName || undefined,
      status: assignedToUserId ? 'assigned' : current.status,
      updatedAt: new Date().toISOString()
    };

    list[index] = updated;
    saveStoredComplaints(list);

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'UPDATE',
      module: 'COMPLAINTS',
      targetId: updated.id,
      targetName: updated.ticketNumber,
      description: `Penugasan pengaduan ${updated.ticketNumber} kepada petugas: ${assignedToName}`
    });

    return updated;
  },

  async addInternalNote(
    id: string,
    noteText: string,
    actor: { id: string; email: string; name: string }
  ): Promise<ComplaintEntity> {
    const cleanNote = sanitizeText(noteText);
    if (!cleanNote) {
      throw new Error('Catatan internal tidak boleh kosong.');
    }

    const list = getStoredComplaints();
    const index = list.findIndex(c => c.id === id);
    if (index === -1) {
      throw new Error('Pengaduan tidak ditemukan.');
    }

    const current = list[index];
    const newNoteItem: InternalNoteItem = {
      id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      authorId: actor.id,
      authorName: actor.name,
      note: cleanNote,
      createdAt: new Date().toISOString()
    };

    const existingNotes = current.internalNotes || [];
    const updatedNotes = [...existingNotes, newNoteItem];

    const updated: ComplaintEntity = {
      ...current,
      internalNotes: updatedNotes,
      updatedAt: new Date().toISOString()
    };

    list[index] = updated;
    saveStoredComplaints(list);

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'UPDATE',
      module: 'COMPLAINTS',
      targetId: updated.id,
      targetName: updated.ticketNumber,
      description: `Menambahkan catatan internal pada pengaduan ${updated.ticketNumber}`
    });

    return updated;
  },

  async addPublicResponse(
    id: string,
    responseText: string,
    actor: { id: string; email: string; name: string }
  ): Promise<ComplaintEntity> {
    const cleanResponse = sanitizeText(responseText);
    if (!cleanResponse) {
      throw new Error('Tanggapan publik tidak boleh kosong.');
    }

    const list = getStoredComplaints();
    const index = list.findIndex(c => c.id === id);
    if (index === -1) {
      throw new Error('Pengaduan tidak ditemukan.');
    }

    const current = list[index];
    const newResponseItem: PublicResponseItem = {
      id: `pub-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      authorName: actor.name,
      response: cleanResponse,
      createdAt: new Date().toISOString()
    };

    const existingResponses = current.publicResponses || [];
    const updatedResponses = [...existingResponses, newResponseItem];

    const updated: ComplaintEntity = {
      ...current,
      publicResponses: updatedResponses,
      updatedAt: new Date().toISOString()
    };

    list[index] = updated;
    saveStoredComplaints(list);

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'UPDATE',
      module: 'COMPLAINTS',
      targetId: updated.id,
      targetName: updated.ticketNumber,
      description: `Menambahkan tanggapan publik pada pengaduan ${updated.ticketNumber}`
    });

    // Trigger Notification Event for public response
    try {
      const recipient = updated.senderEmail || updated.ticketNumber;
      await notificationService.triggerEvent(
        'complaint_status_changed', // Event fallback
        recipient,
        { 
          ticketNumber: updated.ticketNumber,
          status: 'Menerima Tanggapan Baru'
        },
        'pengaduan',
        updated.id,
        `/pengaduan/cek?ticket=${updated.ticketNumber}`,
        actor
      );
    } catch (err) {
      console.error('Failed to trigger public response notification:', err);
    }

    return updated;
  },

  async markAsDuplicate(
    id: string,
    duplicateOfTicket: string | undefined,
    actor: { id: string; email: string; name: string }
  ): Promise<ComplaintEntity> {
    const list = getStoredComplaints();
    const index = list.findIndex(c => c.id === id);
    if (index === -1) {
      throw new Error('Pengaduan tidak ditemukan.');
    }

    const current = list[index];
    const isDuplicate = Boolean(duplicateOfTicket);

    const updated: ComplaintEntity = {
      ...current,
      isDuplicate,
      duplicateOfTicket: duplicateOfTicket || undefined,
      updatedAt: new Date().toISOString()
    };

    list[index] = updated;
    saveStoredComplaints(list);

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'UPDATE',
      module: 'COMPLAINTS',
      targetId: updated.id,
      targetName: updated.ticketNumber,
      description: isDuplicate
        ? `Menandai pengaduan ${updated.ticketNumber} sebagai duplikat dari tiket ${duplicateOfTicket}`
        : `Membatalkan tanda duplikat pada pengaduan ${updated.ticketNumber}`
    });

    return updated;
  },

  async submitSatisfactionSurvey(
    id: string,
    rating: number,
    comment: string
  ): Promise<ComplaintEntity> {
    const list = getStoredComplaints();
    const index = list.findIndex(c => c.id === id);
    if (index === -1) {
      throw new Error('Pengaduan tidak ditemukan.');
    }

    const current = list[index];
    const cleanComment = sanitizeText(comment);

    const updated: ComplaintEntity = {
      ...current,
      satisfactionRating: rating,
      satisfactionComment: cleanComment,
      updatedAt: new Date().toISOString()
    };

    list[index] = updated;
    saveStoredComplaints(list);

    await auditService.recordLog({
      userId: 'public-user',
      userEmail: current.senderEmail || 'public@anon.local',
      userName: current.senderName || 'Pelapor Publik',
      action: 'UPDATE',
      module: 'COMPLAINTS',
      targetId: updated.id,
      targetName: updated.ticketNumber,
      description: `Pelapor memberikan penilaian penanganan tiket ${updated.ticketNumber}: ${rating} Bintang`
    });

    return updated;
  },

  async deleteComplaint(id: string, actor: { id: string; email: string; name: string }): Promise<void> {
    const list = getStoredComplaints();
    const item = list.find(c => c.id === id);
    if (!item) return;

    const filtered = list.filter(c => c.id !== id);
    saveStoredComplaints(filtered);

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'DELETE',
      module: 'COMPLAINTS',
      targetId: id,
      targetName: item.ticketNumber,
      description: `Menghapus pengaduan ${item.ticketNumber}`
    });
  }
};
