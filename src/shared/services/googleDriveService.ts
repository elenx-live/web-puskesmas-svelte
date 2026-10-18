import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth, isLiveFirebaseConfigured } from '../firebase/firebase';
import type { BackupRecord } from './backupService.js';
import { auditService } from './auditService';

interface GoogleOAuth2TokenClient {
  requestAccessToken: () => void;
}

interface GoogleTokenResponse {
  error?: string;
  error_description?: string;
  access_token?: string;
  expires_in?: number;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: Record<string, unknown>) => GoogleOAuth2TokenClient;
        };
      };
    };
  }
}

// In-memory saja — TIDAK disimpan di browser (aturan: jangan simpan data di browser).
// Token & info Drive hilang saat refresh; user perlu re-auth OAuth jika diperlukan.
interface StoredToken { token: string; expiresAt: number }
let _gdriveToken: StoredToken | null = null;
let _gdriveUser: DriveUserInfo | null = null;
let _gdriveAutoSync = false;

export interface DriveFileInfo {
  id: string;
  name: string;
  mimeType: string;
  createdTime: string;
  size?: string;
  webViewLink?: string;
}

export interface DriveUserInfo {
  email?: string;
  displayName?: string;
  photoLink?: string;
  connectedAt: string;
}

export const googleDriveService = {
  getAccessToken(): string | null {
    if (!_gdriveToken) return null;
    if (_gdriveToken.expiresAt && Date.now() > _gdriveToken.expiresAt) {
      _gdriveToken = null;
      return null;
    }
    return _gdriveToken.token;
  },

  setAccessToken(token: string, expiresInSeconds = 3600) {
    _gdriveToken = {
      token,
      expiresAt: Date.now() + expiresInSeconds * 1000 - 60000 // 1 min buffer
    };
  },

  getDriveUser(): DriveUserInfo | null {
    return _gdriveUser;
  },

  setDriveUser(user: DriveUserInfo) {
    _gdriveUser = user;
  },

  isAutoSyncEnabled(): boolean {
    return _gdriveAutoSync;
  },

  setAutoSyncEnabled(enabled: boolean) {
    _gdriveAutoSync = enabled;
  },

  disconnect() {
    _gdriveToken = null;
  },

  /**
   * Connect to Google Drive via Google OAuth popup
   */
  async connectWithGoogleOAuth(): Promise<{ token: string; userInfo: DriveUserInfo }> {
    // 1. Try Firebase Auth GoogleAuthProvider with Drive Scope
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/drive.file');
      provider.setCustomParameters({ prompt: 'consent select_account' });
      
      let result;
      try {
        result = await signInWithPopup(auth, provider);
      } catch (firstErr: unknown) {
        const _firstMsg = (firstErr as { message?: unknown })?.message;
        const msg = (typeof _firstMsg === 'string' ? _firstMsg : '').toLowerCase();
        if (msg.includes('database is closing') || msg.includes('closing/hidden')) {
          await new Promise(r => setTimeout(r, 450));
          result = await signInWithPopup(auth, provider);
        } else {
          throw firstErr;
        }
      }

      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;

      if (token) {
        this.setAccessToken(token);
        const userInfo: DriveUserInfo = {
          email: result.user.email || undefined,
          displayName: result.user.displayName || undefined,
          photoLink: result.user.photoURL || undefined,
          connectedAt: new Date().toISOString()
        };
        this.setDriveUser(userInfo);
        return { token, userInfo };
      }
    } catch (firebaseErr: unknown) {
      console.warn('Firebase Google Auth popup failed, checking GSI / direct token:', firebaseErr);
      if ((firebaseErr as { code?: unknown })?.code === 'auth/popup-closed-by-user') {
        throw new Error('Proses otorisasi Google dibatalkan oleh pengguna.');
      }
    }

    // 2. Try Google Identity Services (GSI) Token Client if available
    const gsiOAuth2 = typeof window !== 'undefined' ? window.google?.accounts?.oauth2 : undefined;
    if (gsiOAuth2) {
      return new Promise((resolve, reject) => {
        try {
          const tokenClient = gsiOAuth2.initTokenClient({
            client_id: '959224361046.apps.googleusercontent.com',
            scope: 'https://www.googleapis.com/auth/drive.file',
            callback: async (resp: GoogleTokenResponse) => {
              if (resp.error) {
                reject(new Error(resp.error_description || resp.error || 'Gagal otorisasi Google'));
                return;
              }
              if (resp.access_token) {
                googleDriveService.setAccessToken(resp.access_token, resp.expires_in || 3600);
                const userInfo = await googleDriveService.fetchUserInfo(resp.access_token);
                resolve({ token: resp.access_token, userInfo });
              } else {
                reject(new Error('Tidak ada access token yang diterima dari Google.'));
              }
            }
          });
          tokenClient.requestAccessToken();
        } catch (err) {
          reject(err);
        }
      });
    }

    throw new Error('Silakan gunakan opsi masukan Token Akses OAuth Google Drive secara manual jika popup diblokir oleh browser.');
  },

  /**
   * Fetch user info from Google API using access token
   */
  async fetchUserInfo(accessToken: string): Promise<DriveUserInfo> {
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        const info: DriveUserInfo = {
          email: data.email,
          displayName: data.name,
          photoLink: data.picture,
          connectedAt: new Date().toISOString()
        };
        this.setDriveUser(info);
        return info;
      }
    } catch (e) {
      console.warn('Failed to fetch Google user info:', e);
    }
    const fallback: DriveUserInfo = { connectedAt: new Date().toISOString() };
    this.setDriveUser(fallback);
    return fallback;
  },

  /**
   * Upload a system backup snapshot to Google Drive
   */
  async uploadBackupToDrive(
    backupRecord: BackupRecord,
    accessToken?: string,
    actor?: { id: string; name: string; email: string }
  ): Promise<DriveFileInfo> {
    const token = accessToken || this.getAccessToken();
    if (!token) {
      throw new Error('Akses token Google Drive tidak ditemukan. Harap hubungkan Google Drive terlebih dahulu.');
    }

    const fileName = `Puskesmas_Backup_${backupRecord.id}_${backupRecord.createdAt.split('T')[0]}.json`;

    const metadata = {
      name: fileName,
      mimeType: 'application/json',
      description: `Backup Sistem Puskesmas Manding - ID: ${backupRecord.id}, Type: ${backupRecord.type}, Created: ${backupRecord.createdAt}`
    };

    const dataPayload = {
      backupInfo: {
        id: backupRecord.id,
        type: backupRecord.type,
        scope: backupRecord.scope,
        createdAt: backupRecord.createdAt,
        checksum: backupRecord.checksum,
        createdBy: backupRecord.createdBy,
        size: backupRecord.size
      },
      dataSnapshot: backupRecord.dataSnapshot || {}
    };

    const fileContent = JSON.stringify(dataPayload, null, 2);

    const boundary = 'foo_bar_baz_puskesmas_boundary';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      fileContent +
      closeDelimiter;

    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,createdTime,size,webViewLink', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: multipartRequestBody
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      const errorMsg = errJson.error?.message || `Gagal upload file ke Google Drive (Status ${response.status})`;
      if (response.status === 401) {
        this.disconnect();
        throw new Error('Sesi token Google Drive telah kedaluwarsa. Silakan hubungkan ulang Google Drive.');
      }
      throw new Error(errorMsg);
    }

    const driveFile: DriveFileInfo = await response.json();

    if (actor) {
      await auditService.recordLog({
        userId: actor.id,
        userName: actor.name,
        userEmail: actor.email,
        module: 'SETTINGS',
        action: 'CREATE',
        description: `Berhasil mengunggah arsip backup ${backupRecord.id} ke Google Drive (${driveFile.name}, Drive ID: ${driveFile.id}).`
      });
    }

    return driveFile;
  },

  /**
   * List Puskesmas backup files existing in Google Drive
   */
  async listDriveBackups(accessToken?: string): Promise<DriveFileInfo[]> {
    const token = accessToken || this.getAccessToken();
    if (!token) return [];

    try {
      const query = encodeURIComponent("name contains 'Puskesmas_Backup' and trashed = false");
      const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,mimeType,createdTime,size,webViewLink)&orderBy=createdTime desc`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        if (response.status === 401) this.disconnect();
        return [];
      }

      const data = await response.json();
      return data.files || [];
    } catch (e) {
      console.warn('Gagal mengambil daftar backup dari Google Drive:', e);
      return [];
    }
  },

  /**
   * Download and parse backup data from Google Drive
   */
  async downloadAndParseDriveBackup(fileId: string, accessToken?: string): Promise<{ backupInfo: Record<string, unknown>; dataSnapshot: Record<string, unknown> }> {
    const token = accessToken || this.getAccessToken();
    if (!token) {
      throw new Error('Akses token Google Drive tidak ditemukan.');
    }

    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error(`Gagal mengunduh file dari Google Drive (Status ${response.status})`);
    }

    const content = await response.json();
    if (!content.dataSnapshot) {
      throw new Error('Struktur file backup Google Drive tidak valid atau rusak.');
    }
    return content;
  },

  /**
   * Delete a backup file from Google Drive
   */
  async deleteDriveBackup(fileId: string, accessToken?: string): Promise<void> {
    const token = accessToken || this.getAccessToken();
    if (!token) throw new Error('Akses token Google Drive tidak ditemukan.');

    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok && response.status !== 404) {
      throw new Error(`Gagal menghapus file di Google Drive (Status ${response.status})`);
    }
  }
};
