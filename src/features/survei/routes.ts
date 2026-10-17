import type { RouteDef } from '../../app/router.svelte.js';
import C_index_svelte from './index.svelte';
import C_PublicSurveyPage_svelte from './PublicSurveyPage.svelte';

/**
 * Rute fitur survei — daftar kuesioner publik dan halaman pengisian survei.
 * Param rute `:id` diteruskan App.svelte sebagai prop `id` (berisi slug survei).
 */
export const surveiRoutes: RouteDef[] = [
  { path: '/survei', load: () => Promise.resolve({ default: C_index_svelte }).catch(e => { console.error('Chunk load failed:', './index.svelte', e); throw e; }), layout: 'public' },
  { path: '/survei/:id', load: () => Promise.resolve({ default: C_PublicSurveyPage_svelte }).catch(e => { console.error('Chunk load failed:', './PublicSurveyPage.svelte', e); throw e; }), layout: 'public' },
];
