import type { RouteDef } from '../../app/router.svelte.js';

/**
 * Rute fitur layanan publik — direktori layanan, detail layanan,
 * dan halaman fasilitas/sarana-prasarana.
 * Komponen dimuat lazy (satu chunk per halaman).
 */
export const layananRoutes: RouteDef[] = [
  { path: '/layanan', load: () => import('./index.svelte'), layout: 'public' },
  { path: '/layanan/:slug', load: () => import('./LayananDetailPage.svelte'), layout: 'public' },
  { path: '/fasilitas', load: () => import('./PublicFacilityPage.svelte'), layout: 'public' },
  { path: '/sarana-prasarana', load: () => import('./PublicFacilityPage.svelte'), layout: 'public' },
];
