import type { RouteDef } from '../../app/router.svelte.js';

/**
 * Rute fitur auth — halaman login administrator.
 * Dirender layar penuh tanpa layout situs (layout 'none').
 */
export const authRoutes: RouteDef[] = [
  { path: '/login', load: () => import('./index.svelte'), layout: 'none' },
];
