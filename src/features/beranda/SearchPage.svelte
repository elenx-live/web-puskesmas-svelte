<!-- @component Halaman pencarian terpadu (layanan, berita, dokumen, FAQ, dsb.) dengan saran & riwayat. -->
<script lang="ts">
  import { onMount } from 'svelte';
  import {
    Search,
    HeartPulse,
    Newspaper,
    FileText,
    Megaphone,
    FileCheck,
    ArrowRight,
    SearchX,
    Sparkles,
    HelpCircle,
    Building2,
    Users,
    BookOpen,
    X,
    History,
    Phone,
    MessageSquare
  } from 'lucide-svelte';
  import type { SearchResultItem } from '../../shared/types/index.js';
  import { searchService } from '../../shared/services/searchService.js';
  import { navigate, routerState } from '../../app/router.svelte.js';
  import LoadingSkeleton from '../../shared/ui/LoadingSkeleton.svelte';

  const queryParam = $derived(routerState.query.q || '');
  const typeParam = $derived(routerState.query.type || 'all');
  const sortParam = $derived(routerState.query.sort || 'relevance');

  let inputQuery = $state(routerState.query.q || '');
  let activeTab = $state(routerState.query.type || 'all');
  let sortOrder = $state(routerState.query.sort || 'relevance');
  let results = $state<SearchResultItem[]>([]);
  let loading = $state(false);
  let recentSearches = $state<string[]>([]);
  let showSuggestions = $state(false);
  let suggestions = $state<SearchResultItem[]>([]);
  let searchInputRef: HTMLInputElement | null = $state(null);

  // SEO noindex
  $effect(() => {
    const q = queryParam;
    document.title = q
      ? `Pencarian: ${q} - Puskesmas Manding`
      : `Pencarian Informasi Terpadu - Puskesmas Manding`;
    let meta = document.querySelector('meta[name="robots"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'robots');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', 'noindex, nofollow');
  });

  // Muat riwayat pencarian
  onMount(() => {
    recentSearches = searchService.getRecentSearches();
    searchInputRef?.focus();
  });

  // Ambil hasil saat query/tab/sort berubah
  $effect(() => {
    const q = queryParam;
    const tab = activeTab;
    const sort = sortOrder;

    const doSearch = async () => {
      if (!q.trim()) {
        results = [];
        return;
      }
      loading = true;
      try {
        const items = await searchService.searchAll(q, tab === 'all' ? undefined : tab);

        if (sort === 'newest') {
          items.sort(
            (a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime()
          );
        } else if (sort === 'oldest') {
          items.sort(
            (a, b) => new Date(a.publishedAt || 0).getTime() - new Date(b.publishedAt || 0).getTime()
          );
        } else {
          items.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
        }

        results = items;
        searchService.addRecentSearch(q);
        recentSearches = searchService.getRecentSearches();
      } catch (e) {
        console.error(e);
        results = [];
      } finally {
        loading = false;
      }
    };

    doSearch();
  });

  // Debounce saran pencarian
  $effect(() => {
    const q = inputQuery;
    const handler = setTimeout(async () => {
      if (q.trim().length >= 2) {
        const items = await searchService.searchAll(q.trim());
        suggestions = items.slice(0, 5);
      } else {
        suggestions = [];
      }
    }, 250);

    return () => clearTimeout(handler);
  });

  function toSearchUrl(q: string, type: string, sort: string): string {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (type !== 'all') params.set('type', type);
    if (sort !== 'relevance') params.set('sort', sort);
    const qs = params.toString();
    return qs ? `/search?${qs}` : '/search';
  }

  function handleSearchSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (inputQuery.trim()) {
      showSuggestions = false;
      navigate(toSearchUrl(inputQuery.trim(), activeTab, sortOrder));
    }
  }

  function handleTabChange(tab: string) {
    activeTab = tab;
    navigate(toSearchUrl(queryParam, tab, sortOrder));
  }

  function handleSortChange(sort: string) {
    sortOrder = sort;
    navigate(toSearchUrl(queryParam, activeTab, sort));
  }

  function handleSelectSuggestion(item: SearchResultItem) {
    showSuggestions = false;
    if (item.url.startsWith('/#')) {
      // Tautan anchor di beranda — navigasi lalu scroll ke section
      const anchor = item.url.slice(2);
      if (routerState.path !== '/') {
        navigate('/');
        setTimeout(() => document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth' }), 400);
      } else {
        document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      navigate(item.url);
    }
  }

  // Hitungan per tab
  const typeCounts = $derived({
    all: results.length,
    service: results.filter((r) => r.type === 'service').length,
    news: results.filter((r) => r.type === 'news').length,
    article: results.filter((r) => r.type === 'article').length,
    faq: results.filter((r) => r.type === 'faq' || r.type === 'guide').length,
    document: results.filter((r) => r.type === 'document').length,
    facility: results.filter((r) => r.type === 'facility').length,
    staff: results.filter((r) => r.type === 'staff').length,
    'public-info': results.filter((r) => r.type === 'public-info').length,
    announcement: results.filter((r) => r.type === 'announcement').length
  });
</script>

{#snippet typeBadge(type: SearchResultItem['type'])}
  {#if type === 'service'}
    <span class="px-2.5 py-1 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20 text-[10px] font-bold flex items-center gap-1"><HeartPulse class="w-3 h-3" /> Layanan</span>
  {:else if type === 'news'}
    <span class="px-2.5 py-1 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20 text-[10px] font-bold flex items-center gap-1"><Newspaper class="w-3 h-3" /> Berita</span>
  {:else if type === 'article'}
    <span class="px-2.5 py-1 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] font-bold flex items-center gap-1"><BookOpen class="w-3 h-3" /> Artikel</span>
  {:else if type === 'faq'}
    <span class="px-2.5 py-1 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] font-bold flex items-center gap-1"><HelpCircle class="w-3 h-3" /> FAQ</span>
  {:else if type === 'guide'}
    <span class="px-2.5 py-1 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-bold flex items-center gap-1"><BookOpen class="w-3 h-3" /> Panduan</span>
  {:else if type === 'document'}
    <span class="px-2.5 py-1 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-bold flex items-center gap-1"><FileCheck class="w-3 h-3" /> Dokumen</span>
  {:else if type === 'facility'}
    <span class="px-2.5 py-1 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20 text-[10px] font-bold flex items-center gap-1"><Building2 class="w-3 h-3" /> Fasilitas</span>
  {:else if type === 'staff'}
    <span class="px-2.5 py-1 rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/20 text-[10px] font-bold flex items-center gap-1"><Users class="w-3 h-3" /> Petugas</span>
  {:else if type === 'public-info'}
    <span class="px-2.5 py-1 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20 text-[10px] font-bold flex items-center gap-1"><FileText class="w-3 h-3" /> Informasi Publik</span>
  {:else if type === 'announcement'}
    <span class="px-2.5 py-1 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold flex items-center gap-1"><Megaphone class="w-3 h-3" /> Pengumuman</span>
  {:else}
    <span class="px-2.5 py-1 rounded-xl bg-[var(--color-card)]0/10 text-[var(--color-muted-foreground)] border border-zinc-500/20 text-[10px] font-bold flex items-center gap-1"><FileText class="w-3 h-3" /> {type}</span>
  {/if}
{/snippet}

<div class="py-12 px-6 max-w-6xl mx-auto space-y-8">
  <!-- Header Search Box with Suggestions -->
  <div class="bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl p-6 md:p-8 space-y-4 shadow-2xl relative">
    <div>
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-xs font-bold mb-2">
        <Sparkles class="w-3.5 h-3.5" />
        <span>Pencarian Terpadu Puskesmas</span>
      </div>
      <h1 class="text-2xl md:text-3xl font-light text-[var(--color-text)] tracking-tight">
        Cari Layanan, Berita, Dokumen & Bantuan
      </h1>
      <p class="text-xs text-[var(--color-muted-foreground)] mt-1">
        Sistem pencarian cepat mencakup seluruh direktori informasi publik secara real-time.
      </p>
    </div>

    <form onsubmit={handleSearchSubmit} class="relative">
      <div class="relative flex gap-3">
        <div class="relative flex-1">
          <Search class="w-4 h-4 text-[var(--color-muted-foreground)] absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            bind:this={searchInputRef}
            type="text"
            bind:value={inputQuery}
            oninput={() => (showSuggestions = true)}
            onfocus={() => (showSuggestions = true)}
            placeholder="Cari layanan, informasi, berita, atau bantuan..."
            class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)]/70 focus:outline-none rounded-2xl pl-11 pr-10 py-4 text-sm text-[var(--color-text)] placeholder-zinc-500 transition shadow-inner"
          />
          {#if inputQuery}
            <button
              type="button"
              onclick={() => {
                inputQuery = '';
                suggestions = [];
              }}
              class="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)] hover:text-[var(--color-text)] p-1"
            >
              <X class="w-4 h-4" />
            </button>
          {/if}
        </div>
        <button
          type="submit"
          class="px-8 py-4 rounded-2xl bg-[var(--color-primary)] hover:bg-[var(--color-primary)] text-[var(--color-primary-foreground)] font-bold text-xs transition flex items-center gap-2 shadow-lg shadow-[var(--color-primary)]/20 shrink-0"
        >
          <Search class="w-4 h-4" />
          <span>Cari Informasi</span>
        </button>
      </div>

      <!-- Suggestions Dropdown -->
      {#if showSuggestions && (inputQuery.trim().length >= 2 || recentSearches.length > 0)}
        <div class="absolute left-0 right-0 top-full mt-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl shadow-2xl z-50 overflow-hidden divide-y divide-[var(--color-border)]">
          {#if inputQuery.trim().length < 2 && recentSearches.length > 0}
            <div class="p-3">
              <div class="flex items-center justify-between text-[10px] font-mono text-[var(--color-muted-foreground)] px-2 pb-2">
                <span class="flex items-center gap-1"><History class="w-3 h-3" /> Pencarian Terakhir Anda</span>
                <button
                  type="button"
                  onclick={() => {
                    searchService.clearRecentSearches();
                    recentSearches = [];
                  }}
                  class="hover:text-[var(--color-primary)] underline"
                >
                  Hapus Riwayat
                </button>
              </div>
              <div class="flex flex-wrap gap-1.5 px-1">
                {#each recentSearches as rec, idx (idx)}
                  <button
                    type="button"
                    onclick={() => {
                      inputQuery = rec;
                      showSuggestions = false;
                      navigate(toSearchUrl(rec, activeTab, sortOrder));
                    }}
                    class="px-3 py-1.5 rounded-xl bg-[var(--color-card)] hover:bg-[var(--color-primary)]/20 hover:text-[var(--color-primary)] text-xs text-[var(--color-primary-foreground)] border border-[var(--color-border)] transition flex items-center gap-1.5"
                  >
                    <Search class="w-3 h-3 text-[var(--color-muted-foreground)]" />
                    <span>{rec}</span>
                  </button>
                {/each}
              </div>
            </div>
          {/if}

          {#if suggestions.length > 0}
            <div class="p-2 space-y-1">
              <div class="text-[10px] font-mono text-[var(--color-muted-foreground)] px-3 py-1">
                Saran Hasil Pencarian
              </div>
              {#each suggestions as item (item.id)}
                <button
                  type="button"
                  onclick={() => handleSelectSuggestion(item)}
                  class="w-full text-left px-3 py-2.5 rounded-xl hover:bg-[var(--color-card)] transition flex items-center justify-between group"
                >
                  <div class="flex items-center gap-2.5 truncate">
                    {@render typeBadge(item.type)}
                    <span class="text-xs text-[var(--color-text)] font-medium group-hover:text-[var(--color-primary)] truncate">
                      {item.title}
                    </span>
                  </div>
                  <ArrowRight class="w-3.5 h-3.5 text-zinc-600 group-hover:text-[var(--color-primary)] shrink-0" />
                </button>
              {/each}
            </div>
          {/if}
        </div>
      {/if}
    </form>

    <!-- Quick Popular Keywords -->
    <div class="flex items-center gap-2 flex-wrap pt-2 text-xs text-[var(--color-muted-foreground)]">
      <span class="font-mono text-[10px] text-[var(--color-muted-foreground)]">Pencarian Populer:</span>
      {#each ['Imunisasi', 'Poli Umum', 'BPJS', 'Jadwal Dokter', 'Syarat Rujukan', 'Demam Berdarah', 'Surat Sehat'] as tag (tag)}
        <button
          type="button"
          onclick={() => {
            inputQuery = tag;
            navigate(toSearchUrl(tag, activeTab, sortOrder));
          }}
          class="px-2.5 py-1 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] hover:border-[var(--color-primary)]/50 hover:text-[var(--color-primary)] text-[11px] text-[var(--color-text)] transition"
        >
          {tag}
        </button>
      {/each}
    </div>
  </div>

  <!-- Filter Tabs & Sort Controls -->
  {#if queryParam}
    <div class="space-y-4">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-4">
        <div class="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
          {#each [
            { id: 'all', label: 'Semua', count: typeCounts.all },
            { id: 'service', label: 'Layanan', count: typeCounts.service },
            { id: 'news', label: 'Berita', count: typeCounts.news },
            { id: 'article', label: 'Artikel', count: typeCounts.article },
            { id: 'faq', label: 'FAQ & Panduan', count: typeCounts.faq },
            { id: 'document', label: 'Dokumen', count: typeCounts.document },
            { id: 'facility', label: 'Fasilitas', count: typeCounts.facility },
            { id: 'staff', label: 'Petugas', count: typeCounts.staff },
            { id: 'public-info', label: 'Informasi Publik', count: typeCounts['public-info'] },
            { id: 'announcement', label: 'Pengumuman', count: typeCounts.announcement }
          ] as tab (tab.id)}
            <button
              onclick={() => handleTabChange(tab.id)}
              class="px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 {activeTab ===
              tab.id
                ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow-lg shadow-[var(--color-primary)]/20'
                : 'bg-[var(--color-card)] text-[var(--color-muted-foreground)] border border-[var(--color-border)] hover:text-[var(--color-text)]'}"
            >
              <span>{tab.label}</span>
              <span
                class="px-1.5 py-0.5 rounded-full text-[10px] {activeTab === tab.id
                  ? 'bg-black/20 text-[var(--color-primary-foreground)] font-mono'
                  : 'bg-black/40 text-[var(--color-muted-foreground)] font-mono'}"
              >
                {tab.count}
              </span>
            </button>
          {/each}
        </div>

        <!-- Sort selector -->
        <div class="flex items-center gap-2 shrink-0">
          <span class="text-xs text-[var(--color-muted-foreground)] font-mono">Urutkan:</span>
          <select
            value={sortOrder}
            onchange={(e) => handleSortChange((e.currentTarget as HTMLSelectElement).value)}
            aria-label="Urutkan Hasil Pencarian"
            class="bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text)] text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[var(--color-primary)]"
          >
            <option value="relevance">Paling Relevan</option>
            <option value="newest">Terbaru</option>
            <option value="oldest">Terlama</option>
          </select>
        </div>
      </div>
    </div>
  {/if}

  <!-- Results List / No Result / Empty State -->
  <div class="space-y-4">
    {#if queryParam}
      <div class="text-xs text-[var(--color-muted-foreground)] font-mono flex items-center justify-between">
        <span>
          Hasil pencarian untuk: <strong class="text-[var(--color-primary)]">"{queryParam}"</strong>
        </span>
        <span>{results.length} hasil ditemukan</span>
      </div>
    {/if}

    {#if loading}
      <LoadingSkeleton variant="list" count={5} />
    {:else if !queryParam}
      <div class="p-16 text-center space-y-4 bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl text-[var(--color-muted-foreground)]">
        <Search class="w-12 h-12 text-[var(--color-primary)]/50 mx-auto" />
        <div class="max-w-md mx-auto space-y-1">
          <h3 class="text-base font-bold text-[var(--color-text)]">Mulai Pencarian Terpadu</h3>
          <p class="text-xs text-[var(--color-muted-foreground)]">
            Ketik kata kunci di atas untuk menemukan informasi layanan, jadwal dokter, persyaratan
            administrasi, berita kegiatan, atau panduan kesehatan.
          </p>
        </div>
      </div>
    {:else if results.length === 0}
      <div class="p-16 text-center space-y-6 bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl">
        <SearchX class="w-12 h-12 text-[var(--color-primary)]/50 mx-auto" />
        <div class="max-w-md mx-auto space-y-2">
          <h3 class="text-lg font-bold text-[var(--color-text)]">Informasi tidak ditemukan.</h3>
          <p class="text-xs text-[var(--color-muted-foreground)] leading-relaxed">
            Tidak ada informasi publik yang cocok dengan kata kunci
            <span class="text-[var(--color-primary)] font-bold">"{queryParam}"</span>.
          </p>
        </div>

        <div class="pt-4 border-t border-[var(--color-border)] max-w-lg mx-auto space-y-3">
          <p class="text-xs text-[var(--color-muted-foreground)] font-mono">
            Silakan kunjungi menu utama berikut:
          </p>
          <div class="grid grid-cols-2 gap-3">
            <a
              href="#/layanan"
              class="p-3 bg-[var(--color-bg)] border border-[var(--color-border)] hover:border-[var(--color-primary)]/50 rounded-2xl text-xs font-bold text-[var(--color-text)] hover:text-[var(--color-primary)] transition flex items-center justify-center gap-2"
            >
              <HeartPulse class="w-4 h-4 text-[var(--color-primary)]" />
              <span>Lihat Semua Layanan</span>
            </a>
            <a
              href="#/faq"
              class="p-3 bg-[var(--color-bg)] border border-[var(--color-border)] hover:border-[var(--color-primary)]/50 rounded-2xl text-xs font-bold text-[var(--color-text)] hover:text-[var(--color-primary)] transition flex items-center justify-center gap-2"
            >
              <HelpCircle class="w-4 h-4 text-purple-400" />
              <span>Lihat Pusat Bantuan / FAQ</span>
            </a>
            <a
              href="#/kontak"
              class="p-3 bg-[var(--color-bg)] border border-[var(--color-border)] hover:border-[var(--color-primary)]/50 rounded-2xl text-xs font-bold text-[var(--color-text)] hover:text-[var(--color-primary)] transition flex items-center justify-center gap-2"
            >
              <Phone class="w-4 h-4 text-[var(--color-primary)]" />
              <span>Hubungi Puskesmas</span>
            </a>
            <a
              href="#/kritik-saran"
              class="p-3 bg-[var(--color-bg)] border border-[var(--color-border)] hover:border-[var(--color-primary)]/50 rounded-2xl text-xs font-bold text-[var(--color-text)] hover:text-[var(--color-primary)] transition flex items-center justify-center gap-2"
            >
              <MessageSquare class="w-4 h-4 text-sky-400" />
              <span>Kirim Pertanyaan / Pengaduan</span>
            </a>
          </div>
        </div>
      </div>
    {:else}
      <div class="space-y-3">
        {#each results as item (item.id)}
          <a
            href="#{item.url}"
            onclick={(e) => {
              e.preventDefault();
              handleSelectSuggestion(item);
            }}
            class="block p-5 bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl space-y-2.5 hover:border-[var(--color-primary)]/50 transition group shadow-md"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                {@render typeBadge(item.type)}
                {#if item.category}
                  <span class="text-[10px] text-[var(--color-muted-foreground)] font-mono">
                    • {item.category}
                  </span>
                {/if}
              </div>
              <ArrowRight class="w-4 h-4 text-[var(--color-muted-foreground)] group-hover:text-[var(--color-primary)] group-hover:translate-x-1 transition" />
            </div>

            <h3 class="font-bold text-[var(--color-text)] text-base group-hover:text-[var(--color-primary)] transition">
              {item.title}
            </h3>
            <p class="text-xs text-[var(--color-muted-foreground)] leading-relaxed line-clamp-2">
              {item.excerpt}
            </p>

            <div class="flex items-center justify-between pt-2 text-[10px] text-[var(--color-muted-foreground)] font-mono border-t border-[var(--color-border)]/50">
              <span>
                Terbit: {item.publishedAt
                  ? new Date(item.publishedAt).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })
                  : 'Informasi Publik'}
              </span>
              <span class="text-[var(--color-primary)] group-hover:underline flex items-center gap-1 font-bold">
                Buka Detail →
              </span>
            </div>
          </a>
        {/each}
      </div>
    {/if}
  </div>
</div>
