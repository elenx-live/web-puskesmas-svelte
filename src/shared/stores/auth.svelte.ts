import type { AppUser } from '../types/index.js';
import { authService } from '../services/authService.js';

/**
 * Auth store — single source of truth untuk sesi pengguna.
 *
 * Menggantikan AuthContext React. Dipakai langsung di komponen via
 * `import { authStore } from '.../auth.svelte.js'`.
 */
export class AuthStore {
  /** Pengguna yang sedang login, null bila belum/tidak login. */
  user = $state<AppUser | null>(null);

  /** True selama pemeriksaan sesi awal / proses login-logout. */
  loading = $state(true);

  /** Muat ulang pengguna aktif dari authService. */
  async refreshUser(): Promise<void> {
    try {
      this.user = await authService.getCurrentUser();
    } catch {
      this.user = null;
    } finally {
      this.loading = false;
    }
  }

  /** Login dengan kredensial (email + password) atau Google bila tanpa password. */
  async login(email: string, pass?: string): Promise<AppUser> {
    this.loading = true;
    try {
      const loggedUser = pass
        ? await authService.loginWithCredentials(email, pass)
        : await authService.loginWithGoogle(email);
      this.user = loggedUser;
      return loggedUser;
    } finally {
      this.loading = false;
    }
  }

  /** Login via Google (opsional data profil). */
  async loginWithGoogle(email?: string, name?: string, photo?: string): Promise<AppUser> {
    this.loading = true;
    try {
      const loggedUser = await authService.loginWithGoogle(email, name, photo);
      this.user = loggedUser;
      return loggedUser;
    } finally {
      this.loading = false;
    }
  }

  /** Login dengan credential GIS langsung (dari tombol Google resmi). */
  async loginWithGoogleCredential(credential: string): Promise<AppUser> {
    this.loading = true;
    try {
      const loggedUser = await authService.loginWithGoogleCredential(credential);
      this.user = loggedUser;
      return loggedUser;
    } finally {
      this.loading = false;
    }
  }

  /** Logout dan kembali ke halaman login (mengganti history). */
  async logout(): Promise<void> {
    this.loading = true;
    try {
      await authService.logout();
      this.user = null;
      try {
        sessionStorage.removeItem('admin_open_groups');
        sessionStorage.removeItem('admin_open_subnavs');
        sessionStorage.removeItem('admin_sidebar_scroll');
      } catch {
        /* abaikan */
      }
      window.location.replace('#/login');
    } finally {
      this.loading = false;
    }
  }

  /**
   * Cek izin granular. SuperAdmin (role-superadmin) bypass semua izin.
   */
  hasPermission(permissionCode: string): boolean {
    if (!this.user) return false;
    if (this.user.roleId === 'role-superadmin') return true;
    return this.user.permissions?.includes(permissionCode) ?? false;
  }
}

export const authStore = new AuthStore();

if (typeof window !== 'undefined') {
  window.addEventListener('storage', () => {
    void authStore.refreshUser();
  });
}
