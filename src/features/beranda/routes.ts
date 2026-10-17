import type { RouteDef } from '../../app/router.svelte.js';

/**
 * Rute fitur beranda — halaman depan publik dan pencarian terpadu.
 * Komponen dimuat lazy (satu chunk per halaman).
 */
export const berandaRoutes: RouteDef[] = [
  { path: '/', load: () => import('./index.svelte'), layout: 'public' },
  { path: '/search', load: () => import('./SearchPage.svelte'), layout: 'public' },
];
