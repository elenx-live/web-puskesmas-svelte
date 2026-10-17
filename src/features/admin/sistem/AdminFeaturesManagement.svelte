<!-- @component Halaman admin: Panel Kontrol Fitur Website — saklar modular fitur publik dengan kategori, pencarian, aksi massal, dan penyimpanan perubahan. -->
<script lang="ts">
  import { onMount } from 'svelte';
  import {
    Sliders, CheckCircle2, Save, RotateCcw, ShieldCheck, ExternalLink,
    MessageSquare, HelpCircle, FileCheck, Globe, Sparkles, FileText,
    Image, Users, GitBranch, Building2, Bell, Eye, EyeOff, Search,
    Activity
  } from 'lucide-svelte';
  import {
    featureFlagsService,
    FEATURE_CATALOG,
    DEFAULT_FEATURE_FLAGS
  } from '../../../shared/services/featureFlagsService.js';
  import type { SiteFeatureFlags } from '../../../shared/types/index.js';
  import { authStore } from '../../../shared/stores/auth.svelte.js';
  import { toastStore } from '../../../shared/stores/toast.svelte.js';

  const user = $derived(authStore.user);

  const ICON_MAP: Record<string, any> = {
    Activity,
    MessageSquare,
    HelpCircle,
    FileCheck,
    Globe,
    Sparkles,
    FileText,
    Image,
    Users,
    GitBranch,
    Building2,
    Bell
  };

  let flags = $state<SiteFeatureFlags>({ ...DEFAULT_FEATURE_FLAGS });
  let initialFlagsJson = $state('');
  let loading = $state(true);
  let saving = $state(false);
  let activeCategory = $state('all');
  let searchQuery = $state('');

  onMount(() => {
    loadFlags();

    const handleFeatureUpdate = (e: Event) => {
      const detail = (e as CustomEvent<SiteFeatureFlags>).detail;
      if (detail) {
        flags = detail;
        initialFlagsJson = JSON.stringify(detail);
      }
    };
    window.addEventListener('puskesmas_features_updated', handleFeatureUpdate);
    return () => {
      window.removeEventListener('puskesmas_features_updated', handleFeatureUpdate);
    };
  });

  function loadFlags() {
    try {
      const current = featureFlagsService.getFlags();
      flags = current;
      initialFlagsJson = JSON.stringify(current);
    } finally {
      loading = false;
    }
  }

  function handleToggle(key: keyof SiteFeatureFlags) {
    flags = { ...flags, [key]: !flags[key] };
  }

  async function handleSave() {
    saving = true;
    try {
      await featureFlagsService.updateFlags(
        flags,
        user ? { id: user.uid, email: user.email || '', name: user.displayName || 'Admin' } : undefined
      );
      initialFlagsJson = JSON.stringify(flags);
      toastStore.showToast('Konfigurasi modul fitur berhasil disimpan & disinkronkan ke seluruh website!', 'success');
    } catch (e) {
      console.error(e);
      toastStore.showToast('Gagal menyimpan pengaturan fitur.', 'error');
    } finally {
      saving = false;
    }
  }

  function handleToggleAll(enabled: boolean) {
    const updated = { ...flags };
    FEATURE_CATALOG.forEach(item => {
      updated[item.key] = enabled;
    });
    flags = updated;
  }

  function handleResetDefaults() {
    if (confirm('Kembalikan semua fitur ke pengaturan aktif bawaan (default)?')) {
      flags = { ...DEFAULT_FEATURE_FLAGS };
      toastStore.showToast('Status fitur dikembalikan ke pengaturan default. Klik Simpan untuk menerapkan.', 'info');
    }
  }

  function handleDisablePatientOnline() {
    // Toggle off only patient online services (Online Queue, Complaints, SKM, PPID)
    flags = { ...flags, onlineQueue: false, complaints: false, skm: false, publicInfoRequests: false };
    toastStore.showToast('Layanan online pasien diset nonaktif.', 'info');
  }

  const hasUnsavedChanges = $derived(JSON.stringify(flags) !== initialFlagsJson);

  const categories = ['all', 'Pelayanan Pasien', 'Publikasi & Media', 'Profil & Direktori'];

  const filteredCatalog = $derived(FEATURE_CATALOG.filter(item => {
    const matchCategory = activeCategory === 'all' || item.category === activeCategory;
    const matchSearch = searchQuery.trim() === '' ||
      item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.affectedPaths.some(p => p.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCategory && matchSearch;
  }));

  const activeCount = $derived(Object.values(flags).filter(Boolean).length);
  const totalCount = FEATURE_CATALOG.length;
  const disabledCount = $derived(totalCount - activeCount);
</script>

<div class="space-y-8 max-w-7xl mx-auto pb-16">
  <!-- Header Title & Actions -->
  <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-6">
    <div>
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
        <Sliders class="w-3.5 h-3.5" />
        <span>Modular Feature Controller</span>
      </div>
      <h1 class="text-2xl sm:text-3xl font-bold text-[var(--color-text)] tracking-tight">
        Panel Kontrol Fitur & Modul Website
      </h1>
      <p class="text-xs sm:text-sm text-[var(--color-muted-foreground)] mt-1.5 max-w-3xl leading-relaxed">
        Aktifkan atau nonaktifkan fitur website secara fleksibel. Ketika fitur dimatikan, seluruh tombol, tautan, menu navigasi, dan akses halaman langsung otomatis disembunyikan di seluruh website.
      </p>
    </div>

    <div class="flex items-center gap-2.5 shrink-0 flex-wrap">
      <button
        onclick={handleResetDefaults}
        class="px-3.5 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text)] text-xs font-semibold hover:bg-[var(--color-bg)] transition flex items-center gap-1.5 cursor-pointer"
        title="Reset ke pengaturan default"
      >
        <RotateCcw class="w-3.5 h-3.5" />
        <span>Reset</span>
      </button>
      <button
        onclick={handleSave}
        disabled={saving || !hasUnsavedChanges}
        class={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition shadow-md cursor-pointer ${
          hasUnsavedChanges
            ? 'bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse'
            : 'bg-emerald-600 text-white opacity-80'
        }`}
      >
        <Save class="w-4 h-4" />
        <span>{saving ? 'Menyimpan...' : hasUnsavedChanges ? 'Simpan Perubahan' : 'Tersimpan'}</span>
      </button>
    </div>
  </div>

  <!-- Status Metrics Bar -->
  <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
    <div class="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl p-5 flex items-center justify-between">
      <div class="space-y-1">
        <span class="text-[11px] font-bold text-[var(--color-muted-foreground)] uppercase tracking-wider">
          Total Fitur Modular
        </span>
        <div class="text-2xl font-black text-[var(--color-text)]">
          {totalCount} Modul
        </div>
      </div>
      <div class="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
        <Sliders class="w-6 h-6" />
      </div>
    </div>

    <div class="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl p-5 flex items-center justify-between">
      <div class="space-y-1">
        <span class="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
          Fitur Sedang Aktif
        </span>
        <div class="text-2xl font-black text-emerald-600 dark:text-emerald-400">
          {activeCount} Modul
        </div>
      </div>
      <div class="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
        <Eye class="w-6 h-6" />
      </div>
    </div>

    <div class="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl p-5 flex items-center justify-between">
      <div class="space-y-1">
        <span class="text-[11px] font-bold text-rose-500 uppercase tracking-wider">
          Fitur Dinonaktifkan
        </span>
        <div class="text-2xl font-black text-rose-600 dark:text-rose-400">
          {disabledCount} Modul
        </div>
      </div>
      <div class="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
        <EyeOff class="w-6 h-6" />
      </div>
    </div>
  </div>

  <!-- Global Batch Controls Banner -->
  <div class="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
        <ShieldCheck class="w-5 h-5" />
      </div>
      <div>
        <h3 class="text-sm font-bold text-[var(--color-text)]">Aksi Cepat Saklar Global</h3>
        <p class="text-xs text-[var(--color-muted-foreground)]">Aktifkan semua atau nonaktifkan kelompok fitur secara serentak.</p>
      </div>
    </div>
    <div class="flex items-center gap-2 flex-wrap">
      <button
        type="button"
        onclick={() => handleToggleAll(true)}
        class="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
      >
        <CheckCircle2 class="w-3.5 h-3.5" />
        <span>Aktifkan Semua</span>
      </button>
      <button
        type="button"
        onclick={handleDisablePatientOnline}
        class="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
      >
        <EyeOff class="w-3.5 h-3.5" />
        <span>Matikan Layanan Pasien Online</span>
      </button>
    </div>
  </div>

  <!-- Filter & Search Bar -->
  <div class="flex flex-col sm:flex-row items-center justify-between gap-3">
    <div class="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
      {#each categories as cat}
        <button
          type="button"
          onclick={() => (activeCategory = cat)}
          class={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
            activeCategory === cat
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:text-[var(--color-text)]'
          }`}
        >
          {cat === 'all' ? 'Semua Kategori' : cat}
        </button>
      {/each}
    </div>

    <div class="relative w-full sm:w-72">
      <Search class="w-4 h-4 text-[var(--color-muted-foreground)] absolute left-3.5 top-1/2 -translate-y-1/2" />
      <input
        type="text"
        bind:value={searchQuery}
        placeholder="Cari modul atau rute URL..."
        class="w-full bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl pl-10 pr-4 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-emerald-500"
      />
    </div>
  </div>

  <!-- Feature Cards Grid -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
    {#each filteredCatalog as item (item.key)}
      {@const isEnabled = flags[item.key] !== false}
      {@const IconComponent = ICON_MAP[item.iconName] || Sliders}
      <div
        class={`rounded-2xl border transition-all duration-200 p-6 flex flex-col justify-between shadow-xs ${
          isEnabled
            ? 'bg-[var(--color-card)] border-[var(--color-border)] hover:border-emerald-500/40'
            : 'bg-[var(--color-card)]/60 border-[var(--color-border)] opacity-85 hover:opacity-100'
        }`}
      >
        <div class="space-y-4">
          <!-- Top Bar: Icon, Category & Toggle Switch -->
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3">
              <div
                class={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition ${
                  isEnabled
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'bg-zinc-500/10 text-zinc-400'
                }`}
              >
                <IconComponent class="w-5 h-5" />
              </div>
              <div>
                <div class="flex items-center gap-2 flex-wrap">
                  <h2 class="text-sm font-bold text-[var(--color-text)] leading-snug">
                    {item.label}
                  </h2>
                  {#if item.badge}
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-muted-foreground)]">
                      {item.badge}
                    </span>
                  {/if}
                </div>
                <span class="text-[10px] text-[var(--color-muted-foreground)] font-semibold uppercase tracking-wider block mt-0.5">
                  {item.category}
                </span>
              </div>
            </div>

            <!-- Master Switch Button -->
            <button
              type="button"
              role="switch"
              aria-checked={isEnabled}
              onclick={() => handleToggle(item.key)}
              class={`relative inline-flex h-6 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isEnabled ? 'bg-emerald-600' : 'bg-zinc-300 dark:bg-zinc-700'
              }`}
            >
              <span
                class={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  isEnabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <!-- Description -->
          <p class="text-xs text-[var(--color-muted-foreground)] leading-relaxed">
            {item.description}
          </p>

          <!-- Status Indicator -->
          <div class="flex items-center gap-2 text-xs">
            {#if isEnabled}
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold text-[11px]">
                <CheckCircle2 class="w-3.5 h-3.5" />
                Aktif & Tampil di Seluruh Website
              </span>
            {:else}
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-700 dark:text-rose-400 font-semibold text-[11px]">
                <EyeOff class="w-3.5 h-3.5" />
                Dinonaktifkan Sepenuhnya (Tersembunyi)
              </span>
            {/if}
          </div>

          <!-- Impact Details Box -->
          <div class="p-3.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] space-y-2 text-xs">
            <div>
              <span class="text-[10px] font-bold uppercase tracking-wider text-[var(--color-primary)] block">
                Dampak Terhadap Tampilan:
              </span>
              <p class="text-[11px] text-[var(--color-muted-foreground)] mt-0.5 leading-relaxed">
                {item.impactExplanation}
              </p>
            </div>

            <div>
              <span class="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted-foreground)] block">
                Rute URL Terkait:
              </span>
              <div class="flex flex-wrap gap-1 mt-1">
                {#each item.affectedPaths as path}
                  <span class="font-mono text-[10px] px-2 py-0.5 rounded bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text)]">
                    {path}
                  </span>
                {/each}
              </div>
            </div>

            <div class="pt-1 border-t border-[var(--color-border)]/60">
              <span class="text-[10px] text-amber-600 dark:text-amber-400 font-semibold block">
                💡 Rekomendasi: {item.recommendedUse}
              </span>
            </div>
          </div>
        </div>

        <!-- Footer status link -->
        <div class="pt-4 mt-2 border-t border-[var(--color-border)]/60 flex items-center justify-between text-[11px]">
          <span class="text-[var(--color-muted-foreground)]">
            Kunci Sistem: <code class="font-mono text-[var(--color-text)] font-bold">{item.key}</code>
          </span>
          <a
            href={`#${item.affectedPaths[0]}`}
            target="_blank"
            rel="noreferrer"
            class="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline inline-flex items-center gap-1"
          >
            <span>Cek Rute</span>
            <ExternalLink class="w-3 h-3" />
          </a>
        </div>
      </div>
    {/each}
  </div>

  <!-- Unsaved Changes Sticky Floating Action Bar -->
  {#if hasUnsavedChanges}
    <div class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[var(--color-card)] border-2 border-emerald-500 shadow-2xl rounded-2xl px-6 py-3.5 flex items-center gap-4 max-w-lg w-[90%]">
      <div class="w-3 h-3 rounded-full bg-emerald-500 animate-ping shrink-0" />
      <div class="flex-1 text-xs">
        <strong class="text-[var(--color-text)] block">Ada Perubahan Belum Disimpan</strong>
        <span class="text-[var(--color-muted-foreground)]">Klik simpan untuk menerapkan saklar fitur ke seluruh website.</span>
      </div>
      <button
        onclick={handleSave}
        disabled={saving}
        class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shrink-0 flex items-center gap-1.5 shadow-md cursor-pointer"
      >
        <Save class="w-3.5 h-3.5" />
        <span>{saving ? 'Menyimpan...' : 'Simpan Sekarang'}</span>
      </button>
    </div>
  {/if}
</div>
