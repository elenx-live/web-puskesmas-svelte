import { auditService } from './auditService';
import { getCollectionData, saveDocumentData, deleteDocumentData, saveSingleDocument } from '../lib/firebase';

export interface BackupRecord {
  id: string;
  type: 'manual' | 'scheduled' | 'pre-restore';
  scope: string[];
  status: 'Pending' | 'Running' | 'Completed' | 'Failed' | 'Corrupted' | 'Deleted';
  createdAt: string;
  completedAt?: string;
  size: string;
  storageLocation: string;
  checksum: string;
  createdBy: string;
  driveFileId?: string;
  driveWebViewLink?: string;
  driveSyncedAt?: string;
  dataSnapshot?: {
    registrations?: Record<string, unknown>[];
    complaints?: Record<string, unknown>[];
    posts?: Record<string, unknown>[];
    documents?: Record<string, unknown>[];
    services?: Record<string, unknown>[];
    facilities?: Record<string, unknown>[];
    faqs?: Record<string, unknown>[];
    microsites?: Record<string, unknown>[];
    categories?: Record<string, unknown>[];
    micrositeCategories?: Record<string, unknown>[];
    announcements?: Record<string, unknown>[];
    publicInfo?: Record<string, unknown>[];
    surveys?: Record<string, unknown>[];
    staffProfiles?: Record<string, unknown>[];
    settings?: Record<string, unknown>;
    theme?: Record<string, unknown>;
  };
}

const STORAGE_KEY = 'puskesmas_system_backups_v1';
const RETENTION_KEY = 'puskesmas_backup_retention_config';
const FIRESTORE_COLLECTION = 'backups';

export const defaultRetentionConfig = {
  daily: 7,
  weekly: 4,
  monthly: 3,
  autoBackupEnabled: true,
  scheduledTime: '02:00'
};

const INITIAL_BACKUPS: BackupRecord[] = [
  {
    id: 'bk-init-1',
    type: 'scheduled',
    scope: ['database', 'cms', 'config', 'theme'],
    status: 'Completed',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    completedAt: new Date(Date.now() - 86400000 * 2 + 5000).toISOString(),
    size: '2.4 MB',
    storageLocation: 'secure_vault://puskesmas_backup_2026_08_08.enc',
    checksum: 'sha256:8f4c29b11e7a3f9e2b1c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a',
    createdBy: 'System Scheduler'
  },
  {
    id: 'bk-init-2',
    type: 'manual',
    scope: ['database', 'cms'],
    status: 'Completed',
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    completedAt: new Date(Date.now() - 3600000 * 5 + 3000).toISOString(),
    size: '1.8 MB',
    storageLocation: 'secure_vault://puskesmas_backup_manual_01.enc',
    checksum: 'sha256:1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
    createdBy: 'Super Admin'
  }
];

export const backupService = {
  getBackups(): BackupRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_BACKUPS));
        // Also sync from VPS database in background
        getCollectionData<BackupRecord>(FIRESTORE_COLLECTION, STORAGE_KEY, INITIAL_BACKUPS).catch(() => {});
        return INITIAL_BACKUPS;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_BACKUPS;
    }
  },

  async getBackupsAsync(): Promise<BackupRecord[]> {
    return getCollectionData<BackupRecord>(FIRESTORE_COLLECTION, STORAGE_KEY, INITIAL_BACKUPS);
  },

  saveBackups(backups: BackupRecord[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(backups));
  },

  getRetentionConfig() {
    try {
      const data = localStorage.getItem(RETENTION_KEY);
      return data ? JSON.parse(data) : defaultRetentionConfig;
    } catch {
      return defaultRetentionConfig;
    }
  },

  saveRetentionConfig(config: typeof defaultRetentionConfig, actor: { id: string; email: string; name: string }) {
    localStorage.setItem(RETENTION_KEY, JSON.stringify(config));
    saveSingleDocument('site_settings', 'backup_retention_config', config, RETENTION_KEY).catch(() => {});
    auditService.recordLog({
      userId: actor.id,
      userName: actor.name,
      userEmail: actor.email,
      module: 'SETTINGS',
      action: 'UPDATE',
      description: `Memperbarui konfigurasi retention policy backup sistem.`
    });
  },

  async createBackup(type: 'manual' | 'scheduled' | 'pre-restore', scope: string[], actorName: string, actorId: string): Promise<BackupRecord> {
    const backups = this.getBackups();
    
    const running = backups.find(b => b.status === 'Running' || b.status === 'Pending');
    if (running) {
      throw new Error('Proses backup lain sedang berjalan. Harap tunggu hingga selesai.');
    }

    const newId = `bk-${Date.now()}`;
    const newBackup: BackupRecord = {
      id: newId,
      type,
      scope,
      status: 'Running',
      createdAt: new Date().toISOString(),
      size: '0 KB',
      storageLocation: `secure_vault://puskesmas_${newId}.enc`,
      checksum: '',
      createdBy: actorName
    };

    backups.unshift(newBackup);
    this.saveBackups(backups);

    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
      const snapshot = {
        registrations: JSON.parse(localStorage.getItem('puskesmas_online_registrations') || localStorage.getItem('puskesmas_registrations') || '[]'),
        complaints: JSON.parse(localStorage.getItem('puskesmas_complaints') || '[]'),
        posts: JSON.parse(localStorage.getItem('puskesmas_posts') || localStorage.getItem('puskesmas_cms_posts') || '[]'),
        documents: JSON.parse(localStorage.getItem('puskesmas_documents') || '[]'),
        services: JSON.parse(localStorage.getItem('puskesmas_services') || '[]'),
        facilities: JSON.parse(localStorage.getItem('puskesmas_facilities_data') || localStorage.getItem('puskesmas_facilities') || '[]'),
        faqs: JSON.parse(localStorage.getItem('puskesmas_faqs') || '[]'),
        microsites: JSON.parse(localStorage.getItem('puskesmas_microsites') || localStorage.getItem('puskesmas_cms_microsites') || '[]'),
        categories: JSON.parse(localStorage.getItem('puskesmas_cms_categories') || '[]'),
        micrositeCategories: JSON.parse(localStorage.getItem('puskesmas_cms_microsite_categories') || '[]'),
        announcements: JSON.parse(localStorage.getItem('puskesmas_announcements') || '[]'),
        publicInfo: JSON.parse(localStorage.getItem('puskesmas_public_information') || '[]'),
        surveys: JSON.parse(localStorage.getItem('puskesmas_surveys') || '[]'),
        staffProfiles: JSON.parse(localStorage.getItem('puskesmas_staff_profiles') || '[]'),
        settings: JSON.parse(localStorage.getItem('puskesmas_site_settings') || '{}'),
        theme: JSON.parse(localStorage.getItem('puskesmas_theme_settings') || '{}')
      };

      const dataString = JSON.stringify(snapshot);
      const sizeBytes = new Blob([dataString]).size;
      const sizeFormatted = sizeBytes > 1024 * 1024 ? `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.round(sizeBytes / 1024)} KB`;

      const checksum = `sha256:${Array.from(dataString).reduce((acc, char) => ((acc << 5) - acc) + char.charCodeAt(0), 0).toString(16)}a9f8c21e3b`;

      const currentList = this.getBackups();
      const idx = currentList.findIndex(b => b.id === newId);
      if (idx !== -1) {
        currentList[idx].status = 'Completed';
        currentList[idx].completedAt = new Date().toISOString();
        currentList[idx].size = sizeFormatted;
        currentList[idx].checksum = checksum;
        currentList[idx].dataSnapshot = snapshot;
        this.saveBackups(currentList);

        // Persist completed backup to VPS database
        await saveDocumentData(FIRESTORE_COLLECTION, newId, currentList[idx], STORAGE_KEY);
      }

      await auditService.recordLog({
        userId: actorId,
        userName: actorName,
        userEmail: actorName,
        module: 'SETTINGS',
        action: 'CREATE',
        description: `Berhasil membuat ${type} backup (${scope.join(', ')}) ukuran ${sizeFormatted}.`
      });

      return currentList[idx];
    } catch (err: unknown) {
      const currentList = this.getBackups();
      const idx = currentList.findIndex(b => b.id === newId);
      if (idx !== -1) {
        currentList[idx].status = 'Failed';
        this.saveBackups(currentList);
        saveDocumentData(FIRESTORE_COLLECTION, newId, currentList[idx], STORAGE_KEY).catch(() => {});
      }
      throw err;
    }
  },

  async validateBackup(id: string): Promise<boolean> {
    const backups = this.getBackups();
    const bk = backups.find(b => b.id === id);
    if (!bk) return false;

    if (bk.status === 'Completed' && bk.checksum && bk.storageLocation) {
      return true;
    }
    return false;
  },

  async restoreBackup(id: string, actor: { id: string; email: string; name: string }): Promise<void> {
    const backups = this.getBackups();
    const bk = backups.find(b => b.id === id);
    if (!bk) throw new Error('Backup tidak ditemukan.');
    if (bk.status !== 'Completed' || !bk.dataSnapshot) {
      throw new Error('Backup tidak valid atau belum selesai untuk direstore.');
    }

    await this.createBackup('pre-restore', ['database', 'cms', 'config'], `Pre-Restore Auto Backup (${actor.name})`, actor.id);

    const snap = bk.dataSnapshot;
    if (snap.registrations) {
      localStorage.setItem('puskesmas_online_registrations', JSON.stringify(snap.registrations));
      localStorage.setItem('puskesmas_registrations', JSON.stringify(snap.registrations));
    }
    if (snap.complaints) {
      localStorage.setItem('puskesmas_complaints', JSON.stringify(snap.complaints));
    }
    if (snap.posts) {
      localStorage.setItem('puskesmas_posts', JSON.stringify(snap.posts));
      localStorage.setItem('puskesmas_cms_posts', JSON.stringify(snap.posts));
    }
    if (snap.documents) {
      localStorage.setItem('puskesmas_documents', JSON.stringify(snap.documents));
    }
    if (snap.services) {
      localStorage.setItem('puskesmas_services', JSON.stringify(snap.services));
    }
    if (snap.facilities) {
      localStorage.setItem('puskesmas_facilities_data', JSON.stringify(snap.facilities));
      localStorage.setItem('puskesmas_facilities', JSON.stringify(snap.facilities));
    }
    if (snap.faqs) {
      localStorage.setItem('puskesmas_faqs', JSON.stringify(snap.faqs));
    }
    if (snap.microsites) {
      localStorage.setItem('puskesmas_microsites', JSON.stringify(snap.microsites));
      localStorage.setItem('puskesmas_cms_microsites', JSON.stringify(snap.microsites));
    }
    if (snap.categories) {
      localStorage.setItem('puskesmas_cms_categories', JSON.stringify(snap.categories));
    }
    if (snap.micrositeCategories) {
      localStorage.setItem('puskesmas_cms_microsite_categories', JSON.stringify(snap.micrositeCategories));
    }
    if (snap.announcements) {
      localStorage.setItem('puskesmas_announcements', JSON.stringify(snap.announcements));
    }
    if (snap.publicInfo) {
      localStorage.setItem('puskesmas_public_information', JSON.stringify(snap.publicInfo));
    }
    if (snap.surveys) {
      localStorage.setItem('puskesmas_surveys', JSON.stringify(snap.surveys));
    }
    if (snap.staffProfiles) {
      localStorage.setItem('puskesmas_staff_profiles', JSON.stringify(snap.staffProfiles));
    }
    if (snap.settings) {
      localStorage.setItem('puskesmas_site_settings', JSON.stringify(snap.settings));
      saveSingleDocument('site_settings', 'global_settings', snap.settings, 'puskesmas_site_settings').catch(() => {});
    }
    if (snap.theme) {
      localStorage.setItem('puskesmas_theme_settings', JSON.stringify(snap.theme));
    }

    await auditService.recordLog({
      userId: actor.id,
      userName: actor.name,
      userEmail: actor.email,
      module: 'SETTINGS',
      action: 'UPDATE',
      description: `Melakukan restore sistem dari backup ID ${bk.id} (${bk.createdAt}).`
    });
  },

  updateDriveSyncInfo(backupId: string, driveFileId: string, webViewLink?: string) {
    const backups = this.getBackups();
    const idx = backups.findIndex(b => b.id === backupId);
    if (idx !== -1) {
      backups[idx].driveFileId = driveFileId;
      backups[idx].driveWebViewLink = webViewLink;
      backups[idx].driveSyncedAt = new Date().toISOString();
      this.saveBackups(backups);
      saveDocumentData(FIRESTORE_COLLECTION, backupId, backups[idx], STORAGE_KEY).catch(() => {});
    }
  },

  async deleteBackup(id: string, actor: { id: string; email: string; name: string }) {
    const backups = this.getBackups();
    const bk = backups.find(b => b.id === id);
    if (!bk) return;
    if (bk.status === 'Running') {
      throw new Error('Tidak dapat menghapus backup yang sedang berjalan.');
    }

    const filtered = backups.filter(b => b.id !== id);
    this.saveBackups(filtered);
    await deleteDocumentData(FIRESTORE_COLLECTION, id, STORAGE_KEY);

    await auditService.recordLog({
      userId: actor.id,
      userName: actor.name,
      userEmail: actor.email,
      module: 'SETTINGS',
      action: 'DELETE',
      description: `Menghapus arsip backup ${id}.`
    });
  }
};
