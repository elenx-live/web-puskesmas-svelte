import type { RouteDef } from '../../app/router.svelte.js';
import C_MicrositeCategoriesPage_svelte from './MicrositeCategoriesPage.svelte';
import C_index_svelte from './index.svelte';

export const micrositeRoutes: RouteDef[] = [
  { path: '/microsites', load: () => Promise.resolve({ default: C_MicrositeCategoriesPage_svelte }).catch(e => { console.error('Chunk load failed:', './MicrositeCategoriesPage.svelte', e); throw e; }), layout: 'public' },
  { path: '/m', load: () => Promise.resolve({ default: C_MicrositeCategoriesPage_svelte }).catch(e => { console.error('Chunk load failed:', './MicrositeCategoriesPage.svelte', e); throw e; }), layout: 'public' },
  { path: '/m/:slug', load: () => Promise.resolve({ default: C_index_svelte }).catch(e => { console.error('Chunk load failed:', './index.svelte', e); throw e; }), layout: 'none' },
];
