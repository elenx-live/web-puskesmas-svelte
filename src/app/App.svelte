<!--
  @component Root aplikasi Svelte 5 — routing tunggal via registry (lazy load per halaman).

  Satu sumber kebenaran routing: `src/features/registry.ts` (dibangun dari
  `src/features/<nama>/routes.ts` tiap fitur). App.svelte TIDAK meng-import
  halaman secara statis — setiap halaman dimuat lazy via `def.load()` sehingga
  satu halaman = satu chunk bundle yang independen.

  - Rute tak dikenal -> NotFoundPage (publik) / pesan 404 dalam AdminLayout (admin).
  - Mendukung hash (`#/layanan`) dan fallback path-based (`/layanan`).
-->
<script lang="ts">
import { memStore } from '../shared/lib/memStore';
  import { onMount } from 'svelte';
  import type { Component } from 'svelte';
  import { routerState, matchRoute, type MatchedRoute } from './router.svelte.js';
  import { authStore } from '../shared/stores/auth.svelte.js';
  import { siteSettingsService } from '../shared/services/siteSettingsService.js';
  import type { SiteSettings } from '../shared/types/index.js';
  import ThemeStyleInjector from '../shared/components/ThemeStyleInjector.svelte';
  import ToastHost from '../shared/ui/ToastHost.svelte';
  import PublicLayout from '../shared/layout/PublicLayout.svelte';
  import AdminLayout from '../shared/layout/AdminLayout.svelte';
  import MaintenanceScreen from '../shared/components/MaintenanceScreen.svelte';
  import NotFoundPage from '../features/errors/NotFoundPage.svelte';

  let currentPath = $derived(routerState.path);
  let settings = $state<SiteSettings | null>(null);

  // Hasil pencocokan rute dari registry tunggal + komponen hasil lazy-load.
  // Diinisialisasi sinkron dari path saat ini (bukan null) supaya render pertama
  // untuk rute valid langsung menampilkan status memuat — bukan NotFoundPage.
  let matched = $state<MatchedRoute | null>(matchRoute(routerState.path));
  let PageComponent = $state<Component | null>(null);
  let loadState = $state<'idle' | 'loading' | 'error'>(matched ? 'loading' : 'idle');

  // Cache komponen yang sudah dimuat: navigasi ulang ke halaman yang sama
  // menjadi instan (tanpa flash loading), remount tetap terjadi via {#key}.
  const componentCache = new Map<string, Component>();

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

  /** Cocokkan path ke registry lalu lazy-load komponen halamannya. */
  function resolveRoute(path: string) {
    const m = matchRoute(path);
    matched = m;
    if (!m) {
      PageComponent = null;
      loadState = 'idle';
      return;
    }
    const cached = componentCache.get(m.def.path);
    if (cached) {
      PageComponent = cached;
      loadState = 'idle';
      return;
    }
    PageComponent = null;
    loadState = 'loading';
    const pathAtLoad = path;
    m.def.load().then(
      (mod) => {
        const comp = (mod as { default: Component }).default;
        componentCache.set(m.def.path, comp);
        // Abaikan hasil basi bila pengguna sudah pindah halaman lain.
        if (pathAtLoad === currentPath) {
          PageComponent = comp;
          loadState = 'idle';
        }
      },
      () => {
        if (pathAtLoad === currentPath) loadState = 'error';
      }
    );
  }

  $effect(() => {
    resolveRoute(currentPath);
  });

  function retryLoad() {
    resolveRoute(currentPath);
  }

  const layout = $derived(matched?.def.layout ?? 'public');
  const routeParams = $derived(matched?.params ?? {});

  const isPublicRoute = $derived(!currentPath.startsWith('/admin') && currentPath !== '/login');
  const isMaintenanceActive = $derived(
    Boolean(settings?.maintenanceMode || memStore.getItem('puskesmas_maintenance_mode') === 'true')
  );
  const showMaintenanceScreen = $derived.by(() => {
    if (!isMaintenanceActive || !isPublicRoute) return false;
    return !authStore.user;
  });
</script>

<ThemeStyleInjector />
<ToastHost />

{#snippet pageContent()}
  {#if PageComponent}
    <PageComponent {...routeParams} />
  {:else if loadState === 'error'}
    <div class="p-8 text-center">
      <h2 class="text-xl font-bold mb-2">Gagal memuat halaman</h2>
      <p class="text-gray-600 mb-4">Periksa koneksi internet Anda lalu coba lagi.</p>
      <button
        onclick={retryLoad}
        class="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition"
      >
        Coba lagi
      </button>
    </div>
  {:else}
    <div class="p-12 text-center text-sm text-gray-500" role="status" aria-live="polite">
      Memuat halaman…
    </div>
  {/if}
{/snippet}

{#if showMaintenanceScreen}
  <MaintenanceScreen {settings} />
{:else if matched && layout === 'admin'}
  <AdminLayout>
    {#key currentPath}
      {@render pageContent()}
    {/key}
  </AdminLayout>
{:else if matched && layout === 'none'}
  {#key currentPath}
    {@render pageContent()}
  {/key}
{:else if matched}
  <PublicLayout>
    {#key currentPath}
      {@render pageContent()}
    {/key}
  </PublicLayout>
{:else if currentPath.startsWith('/admin')}
  <!-- Rute admin tak dikenal: 404 di dalam layout admin (perilaku lama AdminRouter). -->
  <AdminLayout>
    <div class="p-8 text-center">
      <h2 class="text-xl font-bold mb-2">Halaman tidak ditemukan</h2>
      <p class="text-gray-600">Path: {currentPath}</p>
    </div>
  </AdminLayout>
{:else}
  <PublicLayout>
    <NotFoundPage />
  </PublicLayout>
{/if}
