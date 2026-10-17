<!-- @component Pusat Informasi Publik & Transparansi Pelayanan (PPID) — katalog, tab berkala/serta-merta/setiap-saat, pencarian & filter kategori. -->
<script lang="ts">
  import { publicInfoService } from '../../shared/services/publicInfoService.js';
  import type { PublicInfoEntity, PublicInfoCategory } from '../../shared/types/index.js';
  import {
    FileText, Search, ShieldCheck, Calendar, ArrowRight, BookOpen, FileCheck
  } from 'lucide-svelte';
  import LoadingSkeleton from '../../shared/ui/LoadingSkeleton.svelte';
  import EmptyState from '../../shared/ui/EmptyState.svelte';
  import ErrorState from '../../shared/ui/ErrorState.svelte';

  const CATEGORIES: PublicInfoCategory[] = [
    'Profil Puskesmas',
    'Layanan',
    'Standar Pelayanan',
    'Persyaratan',
    'Tarif',
    'Jadwal',
    'Dokumen',
    'Pengumuman',
    'Statistik Pelayanan',
    'Informasi Publik Lainnya',
    'Informasi Berkala',
    'Informasi Serta-Merta',
    'Informasi Setiap Saat'
  ];

  const TABS = [
    { id: 'katalog', label: 'Semua Katalog Informasi' },
    { id: 'berkala', label: 'Informasi Berkala' },
    { id: 'sertamerta', label: 'Informasi Serta-Merta' },
    { id: 'setiapsaat', label: 'Informasi Setiap Saat' }
  ] as const;

  let infos = $state<PublicInfoEntity[]>([]);
  let loading = $state(true);
  let loadError = $state<string | null>(null);
  let search = $state('');
  let selectedCategory = $state('');
  let activeTab = $state<'katalog' | 'berkala' | 'sertamerta' | 'setiapsaat'>('katalog');

  async function loadData() {
    loading = true;
    loadError = null;
    try {
      let catFilter = selectedCategory;
      if (activeTab === 'berkala') catFilter = 'Informasi Berkala';
      if (activeTab === 'sertamerta') catFilter = 'Informasi Serta-Merta';
      if (activeTab === 'setiapsaat') catFilter = 'Informasi Setiap Saat';

      infos = await publicInfoService.getPublishedPublicInfos(catFilter || undefined, search);
    } catch (e) {
      console.error(e);
      loadError = 'Informasi publik tidak dapat dimuat. Periksa koneksi internet Anda lalu coba lagi.';
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    // Re-run saat search/kategori/tab berubah
    void search; void selectedCategory; void activeTab;
    loadData();
  });
</script>

<div class="py-12 px-6 max-w-7xl mx-auto space-y-10">

  <!-- Header Hero -->
  <div class="bg-gradient-to-r from-emerald-900/30 to-teal-900/20 border border-[var(--color-primary)]/20 rounded-3xl p-8 md:p-12 space-y-6">
    <div class="flex items-center gap-2 text-[var(--color-primary)] text-xs font-bold uppercase tracking-widest">
      <ShieldCheck class="w-4 h-4" /> PPID Puskesmas Sehat Mandiri
    </div>
    <div class="space-y-3 max-w-3xl">
      <h1 class="text-3xl md:text-4xl font-light text-[var(--color-text)] tracking-tight">
        Pusat Informasi Publik & Transparansi Pelayanan
      </h1>
      <p class="text-sm text-[var(--color-text)] leading-relaxed">
        Sesuai Undang-Undang Keterbukaan Informasi Publik (KIP) dan standar pelayanan kesehatan permenkes, kami menyediakan akses terbuka terhadap profil, standar layanan, tarif, jadwal, dan laporan berkala Puskesmas.
      </p>
    </div>

    <div class="flex flex-wrap gap-3 pt-2">
      <a
        href="#/permintaan-informasi"
        class="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-[var(--color-primary)] text-[var(--color-primary-foreground)] font-medium text-xs shadow-lg transition flex items-center gap-2"
      >
        <FileText class="w-4 h-4" /> Ajukan Permintaan Informasi
      </a>
      <a
        href="#/maklumat-pelayanan"
        class="px-6 py-3 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] hover:border-[var(--color-primary)]/50 text-[var(--color-text)] font-medium text-xs transition flex items-center gap-2"
      >
        <FileCheck class="w-4 h-4" /> Lihat Maklumat Pelayanan
      </a>
    </div>
  </div>

  <!-- Tab Selection -->
  <div class="flex flex-wrap gap-2 border-b border-[var(--color-border)] pb-4">
    {#each TABS as tab (tab.id)}
      <button
        onclick={() => { activeTab = tab.id; selectedCategory = ''; }}
        class={`px-5 py-2.5 rounded-2xl text-xs font-semibold transition ${
          activeTab === tab.id
            ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/30'
            : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-text)] hover:bg-[var(--color-card)]'
        }`}
      >
        {tab.label}
      </button>
    {/each}
  </div>

  <!-- Filters and Search -->
  <div class="flex flex-col md:flex-row items-center justify-between gap-4">
    <div class="relative w-full md:w-80">
      <Search class="w-4 h-4 text-[var(--color-muted-foreground)] absolute left-3 top-1/2 -translate-y-1/2" />
      <input aria-label="Cari informasi, dokumen, regulasi..."
        type="text"
        placeholder="Cari informasi, dokumen, regulasi..."
        bind:value={search}
        class="w-full bg-[var(--color-card)] border border-[var(--color-border)] focus:border-[var(--color-primary)]/70 focus:outline-none rounded-2xl pl-9 pr-4 py-2.5 text-xs text-[var(--color-text)] placeholder-zinc-500"
      />
    </div>

    {#if activeTab === 'katalog'}
      <select aria-label="Filter Kategori Informasi"
        bind:value={selectedCategory}
        class="w-full md:w-auto bg-[var(--color-card)] border border-[var(--color-border)] focus:border-[var(--color-primary)]/70 focus:outline-none rounded-2xl px-4 py-2.5 text-xs text-[var(--color-text)]"
      >
        <option value="">Semua Kategori Informasi</option>
        {#each CATEGORIES as cat (cat)}
          <option value={cat}>{cat}</option>
        {/each}
      </select>
    {/if}
  </div>

  <!-- Information List -->
  {#if loading}
    <LoadingSkeleton variant="list" count={5} />
  {:else if loadError}
    <ErrorState message={loadError} onRetry={loadData} retrying={loading} />
  {:else if infos.length === 0}
    <EmptyState
      icon={BookOpen}
      title="Tidak ada informasi ditemukan"
      description="Coba ubah kata kunci pencarian atau kategori Anda."
    />
  {:else}
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      {#each infos as info (info.id)}
        <a
          href={`#/informasi-publik/${info.slug}`}
          class="bg-[var(--color-card)] border border-[var(--color-border)] hover:border-[var(--color-primary)]/50 rounded-3xl p-6 flex flex-col justify-between space-y-4 transition group"
        >
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="px-3 py-1 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20 text-[10px] font-semibold">
                {info.category}
              </span>
              <span class="text-[10px] text-[var(--color-muted-foreground)] flex items-center gap-1 font-mono">
                <Calendar class="w-3 h-3" />
                {new Date(info.publicationDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>

            <h3 class="text-base font-medium text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition">
              {info.title}
            </h3>

            <p class="text-xs text-[var(--color-muted-foreground)] line-clamp-2 leading-relaxed">
              {info.summary}
            </p>
          </div>

          <div class="pt-4 border-t border-[var(--color-border)] flex items-center justify-between text-xs">
            <span class="text-[var(--color-muted-foreground)] font-mono">
              Status: <strong class="text-[var(--color-primary)]">{info.infoStatus || 'Tersedia'}</strong>
            </span>
            <span class="text-[var(--color-primary)] font-medium flex items-center gap-1 group-hover:translate-x-1 transition">
              Baca Selengkapnya <ArrowRight class="w-3.5 h-3.5" />
            </span>
          </div>
        </a>
      {/each}
    </div>
  {/if}

</div>
