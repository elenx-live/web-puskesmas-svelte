import type { RouteDef } from '../../app/router.svelte.js';
import C_index_svelte from './index.svelte';
import C_PublicOrganizationPage_svelte from './PublicOrganizationPage.svelte';
import C_PublicStaffDirectoryPage_svelte from './PublicStaffDirectoryPage.svelte';

/**
 * Rute fitur profil — halaman profil institusi, struktur organisasi,
 * dan direktori tenaga medis/petugas.
 * Catatan: slug CMS dinamis (mis. /visi-misi, /sejarah-puskesmas) ditangani
 * App.svelte secara otomatis lewat DynamicPageRenderer, tidak perlu rute di sini.
 */
export const profilRoutes: RouteDef[] = [
  { path: '/profil', load: () => Promise.resolve({ default: C_index_svelte }).catch(e => { console.error('Chunk load failed:', './index.svelte', e); throw e; }), layout: 'public' },
  { path: '/struktur-organisasi', load: () => Promise.resolve({ default: C_PublicOrganizationPage_svelte }).catch(e => { console.error('Chunk load failed:', './PublicOrganizationPage.svelte', e); throw e; }), layout: 'public' },
  { path: '/profil/struktur-organisasi', load: () => Promise.resolve({ default: C_PublicOrganizationPage_svelte }).catch(e => { console.error('Chunk load failed:', './PublicOrganizationPage.svelte', e); throw e; }), layout: 'public' },
  { path: '/tenaga-kesehatan', load: () => Promise.resolve({ default: C_PublicStaffDirectoryPage_svelte }).catch(e => { console.error('Chunk load failed:', './PublicStaffDirectoryPage.svelte', e); throw e; }), layout: 'public' },
  { path: '/profil/petugas', load: () => Promise.resolve({ default: C_PublicStaffDirectoryPage_svelte }).catch(e => { console.error('Chunk load failed:', './PublicStaffDirectoryPage.svelte', e); throw e; }), layout: 'public' },
  { path: '/petugas', load: () => Promise.resolve({ default: C_PublicStaffDirectoryPage_svelte }).catch(e => { console.error('Chunk load failed:', './PublicStaffDirectoryPage.svelte', e); throw e; }), layout: 'public' },
];
