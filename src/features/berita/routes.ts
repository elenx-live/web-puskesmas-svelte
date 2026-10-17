import type { RouteDef } from '../../app/router.svelte.js';
import C_index_svelte from './index.svelte';
import C_BeritaDetailPage_svelte from './BeritaDetailPage.svelte';

export const beritaRoutes: RouteDef[] = [
  { path: '/berita', load: () => Promise.resolve({ default: C_index_svelte }).catch(e => { console.error('Chunk load failed:', './index.svelte', e); throw e; }), layout: 'public' },
  { path: '/berita/:slug', load: () => Promise.resolve({ default: C_BeritaDetailPage_svelte }).catch(e => { console.error('Chunk load failed:', './BeritaDetailPage.svelte', e); throw e; }), layout: 'public' }
];
