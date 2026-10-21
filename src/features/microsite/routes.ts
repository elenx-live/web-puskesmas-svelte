import type { RouteDef } from '../../app/router.svelte.js';

/**
 * Rute fitur microsite — SEJAK 21 Okt 2026 halaman publik PINDAH ke aplikasi
 * mandiri microsite.puskesmasmanding.com. Rute di bawah ini hanya mengalihkan
 * (komponen MicrositeRedirect); admin (#/admin/microsites) TIDAK pindah dan
 * tidak berubah. Komponen halaman publik lama tetap ada di folder ini untuk
 * referensi, tapi tidak lagi dirutekan dari web utama.
 */
export const micrositeRoutes: RouteDef[] = [
  { path: '/microsites', load: () => import('./MicrositeRedirect.svelte'), layout: 'public' },
  { path: '/m', load: () => import('./MicrositeRedirect.svelte'), layout: 'public' },
  { path: '/m/:slug', load: () => import('./MicrositeRedirect.svelte'), layout: 'none' },
  { path: '/microsite/:slug', load: () => import('./MicrositeRedirect.svelte'), layout: 'none' },
];
