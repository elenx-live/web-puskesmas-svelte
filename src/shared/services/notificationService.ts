import type { 
  NotificationEntity, 
  NotificationTemplate, 
  NotificationPreference, 
  NotificationJob 
} from '../types/index.js';
import { auditService } from './auditService';

const STORAGE_NOTIFICATIONS = 'puskesmas_notifications';
const STORAGE_TEMPLATES = 'puskesmas_notification_templates';
const STORAGE_PREFERENCES = 'puskesmas_notification_preferences';
const STORAGE_JOBS = 'puskesmas_notification_jobs';

// Default Templates
const DEFAULT_TEMPLATES: NotificationTemplate[] = [
  {
    id: 'tpl-reg-created',
    event: 'registration_created',
    titleTemplate: 'Pendaftaran Baru Berhasil',
    messageTemplate: 'Pendaftaran Anda telah berhasil dikirim dengan nomor {registrationNumber} untuk layanan {serviceName}.',
    variables: ['registrationNumber', 'serviceName'],
    isActive: true
  },
  {
    id: 'tpl-reg-verified',
    event: 'registration_verified',
    titleTemplate: 'Pendaftaran Terverifikasi',
    messageTemplate: 'Pendaftaran Anda {registrationNumber} telah diverifikasi oleh petugas.',
    variables: ['registrationNumber'],
    isActive: true
  },
  {
    id: 'tpl-reg-confirmed',
    event: 'registration_confirmed',
    titleTemplate: 'Pendaftaran Dikonfirmasi',
    messageTemplate: 'Pendaftaran {registrationNumber} telah dikonfirmasi untuk tanggal {visitDate}. Nomor antrean Anda adalah {queueNumber}.',
    variables: ['registrationNumber', 'visitDate', 'queueNumber'],
    isActive: true
  },
  {
    id: 'tpl-reg-rejected',
    event: 'registration_rejected',
    titleTemplate: 'Pendaftaran Ditolak',
    messageTemplate: 'Pendaftaran Anda {registrationNumber} ditolak. Alasan: {rejectionReason}.',
    variables: ['registrationNumber', 'rejectionReason'],
    isActive: true
  },
  {
    id: 'tpl-reg-cancelled',
    event: 'registration_cancelled',
    titleTemplate: 'Pendaftaran Dibatalkan',
    messageTemplate: 'Pendaftaran Anda {registrationNumber} telah dibatalkan.',
    variables: ['registrationNumber'],
    isActive: true
  },
  {
    id: 'tpl-queue-created',
    event: 'queue_created',
    titleTemplate: 'Nomor Antrean Dibuat',
    messageTemplate: 'Nomor antrean Anda {queueNumber} untuk {serviceName} telah berhasil dibuat.',
    variables: ['queueNumber', 'serviceName'],
    isActive: true
  },
  {
    id: 'tpl-queue-called',
    event: 'queue_called',
    titleTemplate: 'Nomor Antrean Dipanggil',
    messageTemplate: 'Nomor antrean {queueNumber} sedang dipanggil. Silakan menuju Loket {counterNumber} di {serviceName}.',
    variables: ['queueNumber', 'counterNumber', 'serviceName'],
    isActive: true
  },
  {
    id: 'tpl-queue-recalled',
    event: 'queue_recalled',
    titleTemplate: 'Nomor Antrean Dipanggil Ulang',
    messageTemplate: 'Panggilan Ulang: Nomor antrean {queueNumber} sedang dipanggil kembali di Loket {counterNumber}.',
    variables: ['queueNumber', 'counterNumber'],
    isActive: true
  },
  {
    id: 'tpl-queue-skipped',
    event: 'queue_skipped',
    titleTemplate: 'Antrean Dilewati',
    messageTemplate: 'Nomor antrean {queueNumber} untuk {serviceName} telah dilewati karena tidak hadir di loket.',
    variables: ['queueNumber', 'serviceName'],
    isActive: true
  },
  {
    id: 'tpl-queue-completed',
    event: 'queue_completed',
    titleTemplate: 'Pelayanan Selesai',
    messageTemplate: 'Pelayanan Anda untuk nomor antrean {queueNumber} di {serviceName} telah selesai. Terima kasih.',
    variables: ['queueNumber', 'serviceName'],
    isActive: true
  },
  {
    id: 'tpl-comp-received',
    event: 'complaint_received',
    titleTemplate: 'Pengaduan Diterima',
    messageTemplate: 'Kritik/saran/pengaduan Anda telah diterima dengan nomor tiket {ticketNumber}.',
    variables: ['ticketNumber'],
    isActive: true
  },
  {
    id: 'tpl-comp-status',
    event: 'complaint_status_changed',
    titleTemplate: 'Status Pengaduan Diperbarui',
    messageTemplate: 'Pengaduan dengan nomor tiket {ticketNumber} sedang dalam status: {status}.',
    variables: ['ticketNumber', 'status'],
    isActive: true
  },
  {
    id: 'tpl-comp-completed',
    event: 'complaint_completed',
    titleTemplate: 'Pengaduan Selesai',
    messageTemplate: 'Pengaduan dengan nomor tiket {ticketNumber} telah selesai diproses. Terima kasih atas masukan Anda.',
    variables: ['ticketNumber'],
    isActive: true
  },
  {
    id: 'tpl-survey-low-rating',
    event: 'survey_low_rating',
    titleTemplate: 'Peringatan Survei: Kepuasan Rendah',
    messageTemplate: 'Survei "{surveyTitle}" menerima penilaian rendah ({score}/4). Masukan: "{saran}"',
    variables: ['surveyTitle', 'score', 'saran'],
    isActive: true
  }
];

// Helper Storage
function getNotifications(): NotificationEntity[] {
  try {
    const data = localStorage.getItem(STORAGE_NOTIFICATIONS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveNotifications(list: NotificationEntity[]) {
  localStorage.setItem(STORAGE_NOTIFICATIONS, JSON.stringify(list));
}

function getTemplates(): NotificationTemplate[] {
  try {
    const data = localStorage.getItem(STORAGE_TEMPLATES);
    if (!data) {
      localStorage.setItem(STORAGE_TEMPLATES, JSON.stringify(DEFAULT_TEMPLATES));
      return DEFAULT_TEMPLATES;
    }
    return JSON.parse(data);
  } catch {
    return DEFAULT_TEMPLATES;
  }
}

function saveTemplates(list: NotificationTemplate[]) {
  localStorage.setItem(STORAGE_TEMPLATES, JSON.stringify(list));
}

function getPreferences(): NotificationPreference[] {
  try {
    const data = localStorage.getItem(STORAGE_PREFERENCES);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function savePreferences(list: NotificationPreference[]) {
  localStorage.setItem(STORAGE_PREFERENCES, JSON.stringify(list));
}

function getJobs(): NotificationJob[] {
  try {
    const data = localStorage.getItem(STORAGE_JOBS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveJobs(list: NotificationJob[]) {
  localStorage.setItem(STORAGE_JOBS, JSON.stringify(list));
}

// Security & Sanitization
function sanitizeString(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .trim();
}

function replaceVariables(templateStr: string, vars: Record<string, string>): string {
  let result = templateStr;
  Object.entries(vars).forEach(([key, val]) => {
    const safeVal = sanitizeString(val || '');
    result = result.replace(new RegExp(`{${key}}`, 'g'), safeVal);
  });
  return result;
}

export const notificationService = {
  // Read preference
  getPreference(userId: string): NotificationPreference {
    const prefs = getPreferences();
    const found = prefs.find(p => p.userId === userId);
    if (found) return found;
    return { userId, inAppEnabled: true };
  },

  // Save preference
  savePreference(userId: string, inAppEnabled: boolean, actor: { id: string; email: string; name: string }): NotificationPreference {
    const prefs = getPreferences();
    const idx = prefs.findIndex(p => p.userId === userId);
    const newPref = { userId, inAppEnabled };

    if (idx !== -1) {
      prefs[idx] = newPref;
    } else {
      prefs.push(newPref);
    }
    savePreferences(prefs);

    auditService.recordLog({
      userId: actor.id,
      userName: actor.name,
      userEmail: actor.email,
      action: 'SETTINGS_CHANGE',
      module: 'SETTINGS',
      targetId: userId,
      targetName: 'Preferences',
      description: `Mengubah preferensi notifikasi in-app menjadi: ${inAppEnabled ? 'AKTIF' : 'NON-AKTIF'}`
    });

    return newPref;
  },

  // Get User's Notifications
  getUserNotifications(userId: string): NotificationEntity[] {
    const all = getNotifications();
    // Strict isolation check: user can only see their own notifications
    return all
      .filter(n => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  // Mark single as read
  markAsRead(id: string, userId: string): void {
    const all = getNotifications();
    const idx = all.findIndex(n => n.id === id && n.userId === userId);
    if (idx !== -1) {
      all[idx].status = 'read';
      all[idx].readAt = new Date().toISOString();
      saveNotifications(all);
    }
  },

  // Mark single as unread
  markAsUnread(id: string, userId: string): void {
    const all = getNotifications();
    const idx = all.findIndex(n => n.id === id && n.userId === userId);
    if (idx !== -1) {
      all[idx].status = 'unread';
      all[idx].readAt = undefined;
      saveNotifications(all);
    }
  },

  // Delete single notification (does NOT delete source)
  deleteNotification(id: string, userId: string): void {
    const all = getNotifications();
    const filtered = all.filter(n => !(n.id === id && n.userId === userId));
    saveNotifications(filtered);
  },

  updatePreferences(
    userId: string, 
    fields: Partial<NotificationPreference>, 
    actor: { id: string; email: string; name: string }
  ): NotificationPreference {
    const prefs = getPreferences();
    const idx = prefs.findIndex(p => p.userId === userId);
    const existing = prefs[idx] || { userId, inAppEnabled: true, emailEnabled: true, whatsappEnabled: true };
    const updated = { ...existing, ...fields };

    if (idx !== -1) {
      prefs[idx] = updated;
    } else {
      prefs.push(updated);
    }
    savePreferences(prefs);

    auditService.recordLog({
      userId: actor.id,
      userName: actor.name,
      userEmail: actor.email,
      action: 'SETTINGS_CHANGE',
      module: 'SETTINGS',
      targetId: userId,
      targetName: 'NotificationPreferences',
      description: `Memperbarui preferensi notifikasi saluran (In-App/Email/WhatsApp)`
    });

    return updated;
  },

  // Get User Activity Center items ("Aktivitas Saya")
  getUserActivityLogs(userId: string): Array<{
    id: string;
    action: string;
    module: string;
    targetName: string;
    description: string;
    createdAt: string;
  }> {
    try {
      const data = localStorage.getItem('puskesmas_audit_logs');
      if (!data) return [];
      const logs: any[] = JSON.parse(data);
      return logs
        .filter(l => l.userId === userId)
        .map(l => ({
          id: l.id,
          action: l.action,
          module: l.module,
          targetName: l.targetName || 'Objek',
          description: l.description,
          createdAt: l.timestamp || l.createdAt || new Date().toISOString()
        }));
    } catch {
      return [];
    }
  },

  // Mark all as read
  markAllAsRead(userId: string): void {
    const all = getNotifications();
    let updated = false;
    all.forEach(n => {
      if (n.userId === userId && n.status === 'unread') {
        n.status = 'read';
        n.readAt = new Date().toISOString();
        updated = true;
      }
    });
    if (updated) {
      saveNotifications(all);
    }
  },

  // Archive single
  archiveNotification(id: string, userId: string): void {
    const all = getNotifications();
    const idx = all.findIndex(n => n.id === id && n.userId === userId);
    if (idx !== -1) {
      all[idx].status = 'archived';
      saveNotifications(all);
    }
  },

  // Get templates
  getTemplates(): NotificationTemplate[] {
    return getTemplates();
  },

  // Update Template
  updateTemplate(
    id: string, 
    fields: Partial<Pick<NotificationTemplate, 'titleTemplate' | 'messageTemplate' | 'isActive'>>,
    actor: { id: string; email: string; name: string }
  ): NotificationTemplate {
    const tpls = getTemplates();
    const idx = tpls.findIndex(t => t.id === id);
    if (idx === -1) throw new Error('Template not found');

    const updated = {
      ...tpls[idx],
      ...fields
    };

    tpls[idx] = updated;
    saveTemplates(tpls);

    auditService.recordLog({
      userId: actor.id,
      userName: actor.name,
      userEmail: actor.email,
      action: 'UPDATE',
      module: 'SETTINGS',
      targetId: id,
      targetName: updated.event,
      description: `Memperbarui template notifikasi untuk event: ${updated.event}`
    });

    return updated;
  },

  // Get Jobs (Logs for admin)
  getJobs(filters?: {
    search?: string;
    status?: string;
    channel?: string;
    type?: string;
  }): NotificationJob[] {
    let list = getJobs();

    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (filters?.status) {
      list = list.filter(j => j.status === filters.status);
    }
    if (filters?.channel) {
      list = list.filter(j => j.channel === filters.channel);
    }
    if (filters?.type) {
      list = list.filter(j => j.type === filters.type);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(j => 
        j.recipient.toLowerCase().includes(q) ||
        (j.errorMessage && j.errorMessage.toLowerCase().includes(q))
      );
    }

    return list;
  },

  // Core transaction second: safe helper to send/dispatch
  async triggerEvent(
    event: string,
    recipient: string, // uid, identityNumber, or email/phone
    variables: Record<string, string>,
    relatedEntity: 'pendaftaran' | 'antrean' | 'pengaduan' | 'none' = 'none',
    relatedEntityId?: string,
    actionUrl?: string,
    actor?: { id: string; email: string; name: string }
  ): Promise<boolean> {
    try {
      // Find template
      const templates = getTemplates();
      const template = templates.find(t => t.event === event);
      if (!template || !template.isActive) {
        console.warn(`Template not found or inactive for event: ${event}`);
        return false;
      }

      // Check preference for in_app
      const preference = this.getPreference(recipient);
      if (!preference.inAppEnabled) {
        console.info(`Notification disabled by user preference for: ${recipient}`);
        return false;
      }

      // Process string values safely
      const cleanTitle = replaceVariables(template.titleTemplate, variables);
      const cleanMessage = replaceVariables(template.messageTemplate, variables);

      const now = new Date().toISOString();

      // Create primary NotificationJob
      const jobId = `job-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const job: NotificationJob = {
        id: jobId,
        recipient,
        type: event,
        channel: 'in_app',
        status: 'pending',
        relatedEntity,
        relatedEntityId,
        createdAt: now
      };

      const jobs = getJobs();
      jobs.unshift(job);
      saveJobs(jobs);

      // Process Job
      job.status = 'processing';
      saveJobs(getJobs().map(j => j.id === jobId ? { ...j, status: 'processing' } : j));

      // Create Notification Entity
      const notifId = `ntf-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const newNotif: NotificationEntity = {
        id: notifId,
        userId: recipient,
        title: cleanTitle,
        message: cleanMessage,
        type: event.startsWith('registration_') ? 'registration' : 
              event.startsWith('queue_') ? 'queue' : 
              event.startsWith('complaint_') ? 'complaint' : 'system',
        status: 'unread',
        channel: 'in_app',
        createdAt: now,
        relatedEntity,
        relatedEntityId,
        actionUrl
      };

      const notifs = getNotifications();
      notifs.unshift(newNotif);
      saveNotifications(notifs);

      // Update job to sent
      job.status = 'sent';
      job.sentAt = new Date().toISOString();
      saveJobs(getJobs().map(j => j.id === jobId ? { ...j, status: 'sent', sentAt: job.sentAt } : j));

      // Record simple audit for sending if actor supplied
      if (actor) {
        await auditService.recordLog({
          userId: actor.id,
          userName: actor.name,
          userEmail: actor.email,
          action: 'PUBLISH',
          module: 'ONLINE_REGISTRATIONS',
          targetId: notifId,
          targetName: cleanTitle,
          description: `Notifikasi in-app berhasil dikirim ke '${recipient}' untuk event: ${event}`
        });
      }

      // WhatsApp Integration (Phase 5D)
      try {
        const configRes = await fetch('/api/whatsapp/config');
        if (configRes.ok) {
          const config = await configRes.json();
          if (config.enabled) {
            let phone = '';
            let consented = false;
            let patientName = '';

            if (relatedEntityId && (relatedEntity === 'pendaftaran' || relatedEntity === 'antrean')) {
              try {
                const regsData = localStorage.getItem('puskesmas_online_registrations');
                const registrations = regsData ? JSON.parse(regsData) : [];
                const matchedReg = registrations.find((r: any) => r.id === relatedEntityId);
                if (matchedReg) {
                  phone = matchedReg.phoneNumber || '';
                  consented = !!matchedReg.whatsappConsent;
                  patientName = matchedReg.fullName || '';
                }
              } catch (e) {
                console.error('Failed to parse registrations for WhatsApp lookup:', e);
              }
            }

            if (phone && consented) {
              const waRes = await fetch('/api/whatsapp/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  event,
                  recipient: phone,
                  variables: {
                    ...variables,
                    name: variables.name || variables.fullName || patientName
                  },
                  notificationId: notifId,
                  relatedEntity,
                  relatedEntityId
                })
              });

              if (waRes.ok) {
                console.info(`WhatsApp notification for ${event} sent successfully.`);
              } else {
                console.warn(`WhatsApp notification for ${event} failed or skipped.`);
              }
            } else {
              console.info(`WhatsApp skipped: phone is empty or consent not given for ${relatedEntityId}.`);
            }
          }
        }
      } catch (err) {
        console.error('Failed to trigger WhatsApp notification:', err);
      }

      return true;
    } catch (err: any) {
      console.error('Trigger notification event failed:', err);
      // Fail gracefully: Core transaction first, notification second.
      // We still record the failed job so admins can see.
      try {
        const jobs = getJobs();
        const failedJob: NotificationJob = {
          id: `job-fail-${Date.now()}`,
          recipient,
          type: event,
          channel: 'in_app',
          status: 'failed',
          errorMessage: err.message || 'Unknown error',
          createdAt: new Date().toISOString()
        };
        jobs.unshift(failedJob);
        saveJobs(jobs);
      } catch (e) {
        console.error('Failed to save failed job details:', e);
      }
      return false;
    }
  }
};
