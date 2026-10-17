import type { RouteDef } from '../../app/router.svelte.js';
import C_index_svelte from './index.svelte';
import C_PublicInformationDetailPage_svelte from './PublicInformationDetailPage.svelte';
import C_PermintaanInformasiPage_svelte from './PermintaanInformasiPage.svelte';
import C_MaklumatPelayananPage_svelte from './MaklumatPelayananPage.svelte';

/**
 * Rute fitur informasi publik (PPID) — pusat informasi, detail, permohonan, dan maklumat pelayanan.
 */
export const informasiRoutes: RouteDef[] = [
  { path: '/informasi-publik', load: () => Promise.resolve({ default: C_index_svelte }).catch(e => { console.error('Chunk load failed:', './index.svelte', e); throw e; }), layout: 'public' },
  { path: '/informasi-publik/:slug', load: () => Promise.resolve({ default: C_PublicInformationDetailPage_svelte }).catch(e => { console.error('Chunk load failed:', './PublicInformationDetailPage.svelte', e); throw e; }), layout: 'public' },
  { path: '/permintaan-informasi', load: () => Promise.resolve({ default: C_PermintaanInformasiPage_svelte }).catch(e => { console.error('Chunk load failed:', './PermintaanInformasiPage.svelte', e); throw e; }), layout: 'public' },
  { path: '/maklumat-pelayanan', load: () => Promise.resolve({ default: C_MaklumatPelayananPage_svelte }).catch(e => { console.error('Chunk load failed:', './MaklumatPelayananPage.svelte', e); throw e; }), layout: 'public' },
];
