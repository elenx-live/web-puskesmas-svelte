import type { RouteDef } from '../../app/router.svelte.js';

/**
 * Rute fitur Kontak & Lokasi + Pusat Bantuan/FAQ.
 * Komponen dimuat lazy (satu chunk per halaman).
 */
export const kontakRoutes: RouteDef[] = [
  { path: '/kontak', load: () => import('./index.svelte'), layout: 'public' },
  { path: '/lokasi', load: () => import('./index.svelte'), layout: 'public' },
  { path: '/kontak-lokasi', load: () => import('./index.svelte'), layout: 'public' },
  { path: '/hubungi-kami', load: () => import('./index.svelte'), layout: 'public' },
  { path: '/faq', load: () => import('./PublicFaqPage.svelte'), layout: 'public' },
  { path: '/pusat-bantuan', load: () => import('./PublicFaqPage.svelte'), layout: 'public' },
];
