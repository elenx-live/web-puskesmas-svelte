import type { RouteDef } from '../../app/router.svelte.js';
import C_index_svelte from './index.svelte';
export const authRoutes: RouteDef[] = [
  { path: '/login', load: () => Promise.resolve({ default: C_index_svelte }).catch(e => { console.error('Chunk load failed:', './index.svelte', e); throw e; }), layout: 'none' },
];
