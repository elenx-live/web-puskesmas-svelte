import type { RouteDef } from '../../app/router.svelte.js';
import C_ServerErrorPage_svelte from './ServerErrorPage.svelte';
import C_ForbiddenPage_svelte from './ForbiddenPage.svelte';

/**
 * Rute fitur errors — halaman 403/404/500.
 * Catatan: NotFoundPage dirender App.svelte sebagai fallback catch-all.
 */
export const errorsRoutes: RouteDef[] = [
  { path: '/500', load: () => Promise.resolve({ default: C_ServerErrorPage_svelte }).catch(e => { console.error('Chunk load failed:', './ServerErrorPage.svelte', e); throw e; }), layout: 'public' },
  { path: '/403', load: () => Promise.resolve({ default: C_ForbiddenPage_svelte }).catch(e => { console.error('Chunk load failed:', './ForbiddenPage.svelte', e); throw e; }), layout: 'none' },
];
