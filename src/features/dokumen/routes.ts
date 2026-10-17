import type { RouteDef } from '../../app/router.svelte.js';

/** Rute fitur dokumen — repositori dokumen publik. */
export const dokumenRoutes: RouteDef[] = [
  { path: '/dokumen', load: () => import('./index.svelte'), layout: 'public' },
];
