<!--
  @component Root aplikasi Svelte 5 — routing langsung per fitur (modular).
  Setiap fitur di src/features/<nama>/ independen.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { routerState } from './router.svelte.js';
  import { authStore } from '../shared/stores/auth.svelte.js';
  import { siteSettingsService } from '../shared/services/siteSettingsService.js';
  import type { SiteSettings } from '../shared/types/index.js';
  import ThemeStyleInjector from '../shared/components/ThemeStyleInjector.svelte';
  import ToastHost from '../shared/ui/ToastHost.svelte';
  import PublicLayout from '../shared/layout/PublicLayout.svelte';
  import AdminLayout from '../shared/layout/AdminLayout.svelte';
  import MaintenanceScreen from '../shared/components/MaintenanceScreen.svelte';
  import NotFoundPage from '../features/errors/NotFoundPage.svelte';

  // --- Halaman per fitur ---
  import BerandaPage from '../features/beranda/index.svelte';
  import SearchPage from '../features/beranda/SearchPage.svelte';
  import ProfilPage from '../features/profil/index.svelte';
  import LayananPage from '../features/layanan/index.svelte';
  import BeritaPage from '../features/berita/index.svelte';
  import DokumenPage from '../features/dokumen/index.svelte';
  import GaleriPage from '../features/galeri/index.svelte';
  import KontakPage from '../features/kontak/index.svelte';
  import PengaduanPage from '../features/pengaduan/index.svelte';
  import PendaftaranPage from '../features/pendaftaran/index.svelte';
  import SurveiPage from '../features/survei/index.svelte';
  import InformasiPage from '../features/informasi/index.svelte';
  import MicrositePage from '../features/microsite/index.svelte';
  import MicrositeDirectoryPage from '../features/microsite/MicrositeCategoriesPage.svelte';
  import AuthPage from '../features/auth/index.svelte';
  import BeritaDetailPage from '../features/berita/BeritaDetailPage.svelte';
  import LayananDetailPage from '../features/layanan/LayananDetailPage.svelte';
  import PublicSurveyPage from '../features/survei/PublicSurveyPage.svelte';
  import PublicFacilityPage from '../features/layanan/PublicFacilityPage.svelte';
  import AdminRouter from '../features/admin/AdminRouter.svelte';

  let currentPath = $state('/');
  let settings = $state<SiteSettings | null>(null);

  onMount(() => {
    const cleanup = routerState.init();
    authStore.init();
    siteSettingsService.getSettings().then((s) => { settings = s; });
    const onUpdate = () => siteSettingsService.getSettings().then((s) => { settings = s; });
    window.addEventListener('puskesmas_settings_updated', onUpdate);
    return () => {
      cleanup();
      window.removeEventListener('puskesmas_settings_updated', onUpdate);
    };
  });

  $effect(() => {
    currentPath = routerState.path;
  });

  const isPublicRoute = $derived(!currentPath.startsWith('/admin') && currentPath !== '/login');
  const isMaintenanceActive = $derived(
    Boolean(settings?.maintenanceMode || (typeof localStorage !== 'undefined' && localStorage.getItem('puskesmas_maintenance_mode') === 'true'))
  );
  const showMaintenanceScreen = $derived.by(() => {
    if (!isMaintenanceActive || !isPublicRoute) return false;
    return !authStore.user;
  });

  // Extract microsite slug dari URL (/m/:slug atau /microsite/:slug)
  const micrositeSlug = $derived.by(() => {
    const p = currentPath.split('?')[0];
    if (p.startsWith('/m/')) return p.substring(3).split('/')[0];
    if (p.startsWith('/microsite/')) return p.substring(11).split('/')[0];
    return '';
  });

  // Tentukan halaman berdasarkan path
  // Ekstrak slug/id untuk halaman detail (berita/layanan/survei)
  const detailSlug = $derived.by(() => {
    const p = currentPath.split('?')[0];
    const parts = p.split('/').filter(Boolean);
    if (parts.length === 2 && ['berita', 'layanan', 'survei'].includes(parts[0])) {
      return parts[1];
    }
    return '';
  });

  const page = $derived.by(() => {
    const p = currentPath.split('?')[0];
    if (p === '/') return 'beranda';
    if (p === '/search') return 'search';
    if (p === '/login') return 'auth';
    if (p.startsWith('/profil') || ['/sejarah-puskesmas','/visi-misi','/struktur-organisasi','/tenaga-kesehatan','/sarana-prasarana'].includes(p)) return 'profil';
    // Detail pages: /berita/{slug}, /layanan/{slug}, /survei/{id}
    if (p.startsWith('/berita/') && p.split('/').filter(Boolean).length === 2) return 'berita-detail';
    if (p.startsWith('/layanan/') && p.split('/').filter(Boolean).length === 2) return 'layanan-detail';
    if (p.startsWith('/layanan')) return 'layanan';
    if (p.startsWith('/fasilitas')) return 'fasilitas';
    if (p.startsWith('/berita')) return 'berita';
    if (p.startsWith('/dokumen')) return 'dokumen';
    if (p.startsWith('/galeri')) return 'galeri';
    if (p.startsWith('/kontak') || p.startsWith('/kritik-saran')) return 'kontak';
    if (p.startsWith('/pengaduan')) return 'pengaduan';
    if (p.startsWith('/pendaftaran')) return 'pendaftaran';
    if (p.startsWith('/survei/') && p.split('/').filter(Boolean).length === 2) return 'survei-detail';
    if (p.startsWith('/survei')) return 'survei';
    if (p.startsWith('/informasi') || p.startsWith('/maklumat') || p.startsWith('/ppid') || p.startsWith('/faq')) return 'informasi';
    if (p === '/microsites' || p === '/m') return 'microsite-dir';
    if (p.startsWith('/m/') || p.startsWith('/microsite/')) return 'microsite';
    if (p.startsWith('/antrian') || p.startsWith('/queue')) return 'pendaftaran';
    if (p.startsWith('/admin')) return 'admin';
    return 'notfound';
  });
</script>

<ThemeStyleInjector />
<ToastHost />

{#if showMaintenanceScreen}
  <MaintenanceScreen {settings} />
{:else if page === 'admin'}
  <AdminLayout>
    <AdminRouter path={currentPath} />
  </AdminLayout>
{:else}
  <PublicLayout>
    {#key currentPath}
    {#if page === 'beranda'}
      <BerandaPage />
    {:else if page === 'search'}
      <SearchPage />
    {:else if page === 'profil'}
      <ProfilPage />
    {:else if page === 'layanan'}
      <LayananPage />
    {:else if page === 'layanan-detail'}
      <LayananDetailPage slug={detailSlug} />
    {:else if page === 'fasilitas'}
      <PublicFacilityPage />
    {:else if page === 'berita'}
      <BeritaPage />
    {:else if page === 'berita-detail'}
      <BeritaDetailPage slug={detailSlug} />
    {:else if page === 'dokumen'}
      <DokumenPage />
    {:else if page === 'galeri'}
      <GaleriPage />
    {:else if page === 'kontak'}
      <KontakPage />
    {:else if page === 'pengaduan'}
      <PengaduanPage />
    {:else if page === 'pendaftaran'}
      <PendaftaranPage />
    {:else if page === 'survei'}
      <SurveiPage />
    {:else if page === 'survei-detail'}
      <PublicSurveyPage id={detailSlug} />
    {:else if page === 'informasi'}
      <InformasiPage />
    {:else if page === 'microsite-dir'}
      <MicrositeDirectoryPage />
    {:else if page === 'microsite'}
      <MicrositePage slug={micrositeSlug} />
    {:else if page === 'auth'}
      <AuthPage />
    {:else}
      <NotFoundPage />
    {/if}
    {/key}
  </PublicLayout>
{/if}
