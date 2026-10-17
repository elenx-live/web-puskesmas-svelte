import type { RouteDef } from '../../app/router.svelte.js';

/**
 * Rute fitur pendaftaran — halaman publik pendaftaran online,
 * verifikasi status, dan monitor antrean.
 * Komponen dimuat lazy (satu chunk per halaman).
 */
export const pendaftaranRoutes: RouteDef[] = [
  { path: '/pendaftaran', load: () => import('./index.svelte'), layout: 'public' },
  { path: '/pendaftaran/cek', load: () => import('./CekPendaftaranPage.svelte'), layout: 'public' },
  { path: '/antrian', load: () => import('./PublicQueueStatusPage.svelte'), layout: 'public' },
  { path: '/queue', load: () => import('./PublicQueueStatusPage.svelte'), layout: 'public' },
  { path: '/antrian/display', load: () => import('./AntrianDisplayPage.svelte'), layout: 'public' },
];
