import { CheckCircle2, AlertCircle, AlertTriangle, X } from 'lucide-svelte';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

/** Ikon per tipe toast — dipakai ToastHost.svelte. */
export const toastIcons = { CheckCircle2, AlertCircle, AlertTriangle, X };

/**
 * Toast store — antrean notifikasi kecil di kanan bawah layar.
 *
 * Menggantikan ToastContext React. Tampilkan via `toastStore.showToast(pesan, tipe)`.
 * Render visual ditangani komponen `ToastHost` yang membaca `toastStore.toasts`.
 */
export class ToastStore {
  /** Daftar toast aktif. */
  toasts = $state<ToastItem[]>([]);

  /** Tambah toast; otomatis hilang setelah 4 detik. */
  showToast(message: string, type: ToastType = 'success'): void {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    this.toasts = [...this.toasts, { id, type, message }];
    setTimeout(() => this.removeToast(id), 4000);
  }

  /** Hapus toast secara manual. */
  removeToast(id: string): void {
    this.toasts = this.toasts.filter((t) => t.id !== id);
  }

  /** Shortcut tipe toast. */
  success(message: string): void {
    this.showToast(message, 'success');
  }
  error(message: string): void {
    this.showToast(message, 'error');
  }
  warning(message: string): void {
    this.showToast(message, 'warning');
  }
  info(message: string): void {
    this.showToast(message, 'info');
  }
}

export const toastStore = new ToastStore();
