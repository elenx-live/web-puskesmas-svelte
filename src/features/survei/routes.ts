import type { RouteDef } from '../../app/router.svelte.js';

/**
 * Rute fitur survei — daftar kuesioner publik dan halaman pengisian survei.
 * Param rute `:id` diteruskan sebagai prop `id` ke PublicSurveyPage.
 * Komponen dimuat lazy (satu chunk per halaman).
 */
export const surveiRoutes: RouteDef[] = [
  { path: '/survei', load: () => import('./index.svelte'), layout: 'public' },
  { path: '/survei/:id', load: () => import('./PublicSurveyPage.svelte'), layout: 'public' },
];
