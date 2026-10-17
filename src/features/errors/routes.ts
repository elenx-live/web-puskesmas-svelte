import type { RouteDef } from '../../app/router.svelte.js';

/**
 * Rute fitur errors — halaman 403/500.
 * Catatan: 404 ditangani App.svelte sebagai fallback catch-all
 * (merender NotFoundPage) bila tidak ada rute yang cocok.
 */
export const errorsRoutes: RouteDef[] = [
  { path: '/500', load: () => import('./ServerErrorPage.svelte'), layout: 'public' },
  { path: '/403', load: () => import('./ForbiddenPage.svelte'), layout: 'none' },
];
