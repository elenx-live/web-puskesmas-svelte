import type { RouteDef } from '../../app/router.svelte.js';

/**
 * Rute fitur berita — daftar artikel dan halaman detail berita.
 * Komponen dimuat lazy (satu chunk per halaman).
 */
export const beritaRoutes: RouteDef[] = [
  { path: '/berita', load: () => import('./index.svelte'), layout: 'public' },
  { path: '/berita/:slug', load: () => import('./BeritaDetailPage.svelte'), layout: 'public' },
];
