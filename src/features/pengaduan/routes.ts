/**
 * Rute fitur Pengaduan & Notifikasi.
 * Diimpor oleh `src/features/registry.ts`.
 */
import type { RouteDef } from '../../app/router.svelte.js';
import C_index_svelte from './index.svelte';
import C_PengaduanCekPage_svelte from './PengaduanCekPage.svelte';
import C_NotificationsPage_svelte from './NotificationsPage.svelte';

export const pengaduanRoutes: RouteDef[] = [
  { path: '/pengaduan', load: () => Promise.resolve({ default: C_index_svelte }).catch(e => { console.error('Chunk load failed:', './index.svelte', e); throw e; }), layout: 'public' },
  { path: '/kritik-saran', load: () => Promise.resolve({ default: C_index_svelte }).catch(e => { console.error('Chunk load failed:', './index.svelte', e); throw e; }), layout: 'public' },
  { path: '/pengaduan/cek', load: () => Promise.resolve({ default: C_PengaduanCekPage_svelte }).catch(e => { console.error('Chunk load failed:', './PengaduanCekPage.svelte', e); throw e; }), layout: 'public' },
  { path: '/notifications', load: () => Promise.resolve({ default: C_NotificationsPage_svelte }).catch(e => { console.error('Chunk load failed:', './NotificationsPage.svelte', e); throw e; }), layout: 'public' },
  { path: '/aktivitas', load: () => Promise.resolve({ default: C_NotificationsPage_svelte }).catch(e => { console.error('Chunk load failed:', './NotificationsPage.svelte', e); throw e; }), layout: 'public' },
];
