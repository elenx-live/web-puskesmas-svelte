import type { RouteDef } from '../../app/router.svelte.js';

/** Rute fitur galeri — album foto kegiatan. */
export const galeriRoutes: RouteDef[] = [
  { path: '/galeri', load: () => import('./index.svelte'), layout: 'public' },
];
