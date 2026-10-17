import type { RouteDef } from '../../app/router.svelte.js';
import C_index_svelte from './index.svelte';
import C_LayananDetailPage_svelte from './LayananDetailPage.svelte';
import C_PublicFacilityPage_svelte from './PublicFacilityPage.svelte';

/**
 * Rute fitur layanan publik — direktori layanan, detail layanan,
 * dan halaman fasilitas/sarana-prasarana.
 */
export const layananRoutes: RouteDef[] = [
  { path: '/layanan', load: () => Promise.resolve({ default: C_index_svelte }).catch(e => { console.error('Chunk load failed:', './index.svelte', e); throw e; }), layout: 'public' },
  { path: '/layanan/:slug', load: () => Promise.resolve({ default: C_LayananDetailPage_svelte }).catch(e => { console.error('Chunk load failed:', './LayananDetailPage.svelte', e); throw e; }), layout: 'public' },
  { path: '/fasilitas', load: () => Promise.resolve({ default: C_PublicFacilityPage_svelte }).catch(e => { console.error('Chunk load failed:', './PublicFacilityPage.svelte', e); throw e; }), layout: 'public' },
  { path: '/sarana-prasarana', load: () => Promise.resolve({ default: C_PublicFacilityPage_svelte }).catch(e => { console.error('Chunk load failed:', './PublicFacilityPage.svelte', e); throw e; }), layout: 'public' },
];
