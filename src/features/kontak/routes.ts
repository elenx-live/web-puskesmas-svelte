/**
 * Rute fitur Kontak & Lokasi.
 * Diimpor oleh `src/features/registry.ts`.
 */
import type { RouteDef } from '../../app/router.svelte.js';
import C_index_svelte from './index.svelte';
import C_PublicFaqPage_svelte from './PublicFaqPage.svelte';

export const kontakRoutes: RouteDef[] = [
  { path: '/kontak', load: () => Promise.resolve({ default: C_index_svelte }).catch(e => { console.error('Chunk load failed:', './index.svelte', e); throw e; }), layout: 'public' },
  { path: '/lokasi', load: () => Promise.resolve({ default: C_index_svelte }).catch(e => { console.error('Chunk load failed:', './index.svelte', e); throw e; }), layout: 'public' },
  { path: '/kontak-lokasi', load: () => Promise.resolve({ default: C_index_svelte }).catch(e => { console.error('Chunk load failed:', './index.svelte', e); throw e; }), layout: 'public' },
  { path: '/hubungi-kami', load: () => Promise.resolve({ default: C_index_svelte }).catch(e => { console.error('Chunk load failed:', './index.svelte', e); throw e; }), layout: 'public' },
  { path: '/faq', load: () => Promise.resolve({ default: C_PublicFaqPage_svelte }).catch(e => { console.error('Chunk load failed:', './PublicFaqPage.svelte', e); throw e; }), layout: 'public' },
  { path: '/pusat-bantuan', load: () => Promise.resolve({ default: C_PublicFaqPage_svelte }).catch(e => { console.error('Chunk load failed:', './PublicFaqPage.svelte', e); throw e; }), layout: 'public' },
];
