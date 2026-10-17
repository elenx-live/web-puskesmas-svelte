import type { RouteDef } from '../../app/router.svelte.js';
import BerandaIndex from './index.svelte';
import BerandaSearch from './SearchPage.svelte';
import BerandaBlueprint from './BlueprintViewer.svelte';

/**
 * Rute fitur beranda — halaman depan publik, pencarian terpadu, dan cetak biru arsitektur.
 * Catatan: halaman beranda & pencarian dibungkus PublicLayout oleh App.svelte (layout: 'public').
 */
export const berandaRoutes: RouteDef[] = [
  { path: '/', load: () => Promise.resolve({ default: BerandaIndex }), layout: 'public' },
  { path: '/search', load: () => Promise.resolve({ default: BerandaSearch }), layout: 'public' },
  { path: '/blueprint', load: () => Promise.resolve({ default: BerandaBlueprint }), layout: 'none' },
];
