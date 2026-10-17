import type { RouteDef } from '../../app/router.svelte.js';

/**
 * Rute fitur Pengaduan & Notifikasi.
 * Komponen dimuat lazy (satu chunk per halaman).
 */
export const pengaduanRoutes: RouteDef[] = [
  { path: '/pengaduan', load: () => import('./index.svelte'), layout: 'public' },
  { path: '/kritik-saran', load: () => import('./index.svelte'), layout: 'public' },
  { path: '/pengaduan/cek', load: () => import('./PengaduanCekPage.svelte'), layout: 'public' },
  { path: '/notifications', load: () => import('./NotificationsPage.svelte'), layout: 'public' },
  { path: '/aktivitas', load: () => import('./NotificationsPage.svelte'), layout: 'public' },
];
