import type { RouteDef } from '../../app/router.svelte.js';
import C_index_svelte from './index.svelte';
import C_CekPendaftaranPage_svelte from './CekPendaftaranPage.svelte';
import C_PublicQueueStatusPage_svelte from './PublicQueueStatusPage.svelte';
import C_AntrianDisplayPage_svelte from './AntrianDisplayPage.svelte';

/**
 * Rute fitur pendaftaran — halaman publik pendaftaran online,
 * verifikasi status, dan monitor antrean.
 */
export const pendaftaranRoutes: RouteDef[] = [
  { path: '/pendaftaran', load: () => Promise.resolve({ default: C_index_svelte }).catch(e => { console.error('Chunk load failed:', './index.svelte', e); throw e; }), layout: 'public' },
  { path: '/pendaftaran/cek', load: () => Promise.resolve({ default: C_CekPendaftaranPage_svelte }).catch(e => { console.error('Chunk load failed:', './CekPendaftaranPage.svelte', e); throw e; }), layout: 'public' },
  { path: '/antrian', load: () => Promise.resolve({ default: C_PublicQueueStatusPage_svelte }).catch(e => { console.error('Chunk load failed:', './PublicQueueStatusPage.svelte', e); throw e; }), layout: 'public' },
  { path: '/antrian/display', load: () => Promise.resolve({ default: C_AntrianDisplayPage_svelte }).catch(e => { console.error('Chunk load failed:', './AntrianDisplayPage.svelte', e); throw e; }), layout: 'public' },
];
