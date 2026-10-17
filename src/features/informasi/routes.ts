import type { RouteDef } from '../../app/router.svelte.js';

/**
 * Rute fitur informasi publik (PPID) — pusat informasi, detail,
 * permohonan informasi, dan maklumat pelayanan.
 * Komponen dimuat lazy (satu chunk per halaman).
 */
export const informasiRoutes: RouteDef[] = [
  { path: '/informasi', load: () => import('./index.svelte'), layout: 'public' },
  { path: '/informasi-publik', load: () => import('./index.svelte'), layout: 'public' },
  { path: '/informasi-publik/:slug', load: () => import('./PublicInformationDetailPage.svelte'), layout: 'public' },
  { path: '/permintaan-informasi', load: () => import('./PermintaanInformasiPage.svelte'), layout: 'public' },
  { path: '/maklumat', load: () => import('./index.svelte'), layout: 'public' },
  { path: '/maklumat-pelayanan', load: () => import('./MaklumatPelayananPage.svelte'), layout: 'public' },
  { path: '/ppid', load: () => import('./index.svelte'), layout: 'public' },
];
