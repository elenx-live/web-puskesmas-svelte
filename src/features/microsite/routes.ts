import type { RouteDef } from '../../app/router.svelte.js';

/**
 * Rute fitur microsite — direktori microsite dan halaman microsite per-slug.
 * Halaman per-slug dirender fullscreen mandiri (layout 'none').
 * Komponen dimuat lazy (satu chunk per halaman).
 */
export const micrositeRoutes: RouteDef[] = [
  { path: '/microsites', load: () => import('./MicrositeCategoriesPage.svelte'), layout: 'public' },
  { path: '/m', load: () => import('./MicrositeCategoriesPage.svelte'), layout: 'public' },
  { path: '/m/:slug', load: () => import('./index.svelte'), layout: 'none' },
  { path: '/microsite/:slug', load: () => import('./index.svelte'), layout: 'none' },
];
