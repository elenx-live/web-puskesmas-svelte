import type { RouteDef } from '../../app/router.svelte.js';

/**
 * Rute fitur profil — halaman profil institusi.
 * Slug CMS dinamis (/sejarah-puskesmas, /visi-misi) dirender oleh halaman
 * profil utama. Komponen dimuat lazy (satu chunk per halaman).
 */
export const profilRoutes: RouteDef[] = [
  { path: '/profil', load: () => import('./index.svelte'), layout: 'public' },
  { path: '/sejarah-puskesmas', load: () => import('./index.svelte'), layout: 'public' },
  { path: '/visi-misi', load: () => import('./index.svelte'), layout: 'public' },
  { path: '/struktur-organisasi', load: () => import('./PublicOrganizationPage.svelte'), layout: 'public' },
  { path: '/profil/struktur-organisasi', load: () => import('./PublicOrganizationPage.svelte'), layout: 'public' },
  { path: '/tenaga-kesehatan', load: () => import('./PublicStaffDirectoryPage.svelte'), layout: 'public' },
  { path: '/profil/petugas', load: () => import('./PublicStaffDirectoryPage.svelte'), layout: 'public' },
  { path: '/petugas', load: () => import('./PublicStaffDirectoryPage.svelte'), layout: 'public' },
];
