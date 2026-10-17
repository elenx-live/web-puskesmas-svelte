import type { RouteDef } from '../../app/router.svelte.js';
import C_index_svelte from './index.svelte';

export const galeriRoutes: RouteDef[] = [
  { path: '/galeri', load: () => Promise.resolve({ default: C_index_svelte }).catch(e => { console.error('Chunk load failed:', './index.svelte', e); throw e; }), layout: 'public' }
];
