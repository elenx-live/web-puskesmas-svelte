<!-- @component Halaman dokumen publik: arsip dokumen resmi & regulasi dengan pencarian, filter kategori, dan modal baca rinci. -->
<script lang="ts">
  import { FileText, Download, Search, ShieldCheck, X, Calendar, Share2, Check, Info, BookOpen, Sparkles } from 'lucide-svelte';
  import { documentService } from '../../shared/services/documentService.js';
  import { categoryService } from '../../shared/services/categoryService.js';
  import type { DocumentEntity, CategoryEntity } from '../../shared/types/index.js';
  import LoadingSkeleton from '../../shared/ui/LoadingSkeleton.svelte';
  import EmptyState from '../../shared/ui/EmptyState.svelte';
  import ErrorState from '../../shared/ui/ErrorState.svelte';

  let documents = $state<DocumentEntity[]>([]);
  let categories = $state<CategoryEntity[]>([]);
  let loading = $state(true);
  let loadError = $state<string | null>(null);

  let search = $state('');
  let selectedCat = $state('Semua');
  let activeReadingDoc = $state<DocumentEntity | null>(null);
  let copiedLink = $state(false);

  $effect(() => {
    loadDocs(search, selectedCat);
  });

  async function loadDocs(s: string, cat: string) {
    loading = true;
    loadError = null;
    try {
      const [docList, catList] = await Promise.all([
        documentService.getPublishedDocuments(cat === 'Semua' ? '' : cat, s),
        categoryService.getCategories('document')
      ]);
      documents = docList;
      categories = catList;
    } catch (e) {
      console.error(e);
      loadError = 'Dokumen tidak dapat dimuat. Periksa koneksi internet Anda lalu coba lagi.';
    } finally {
      loading = false;
    }
  }

  async function handleDownload(doc: DocumentEntity) {
    await documentService.incrementDownloadCount(doc.id);
    window.open(doc.fileUrl, '_blank');
  }

  function handleShare(doc: DocumentEntity) {
    if (navigator.share) {
      navigator.share({
        title: doc.title,
        text: doc.description || doc.title,
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`${window.location.origin}/dokumen#${doc.id}`);
      copiedLink = true;
      setTimeout(() => { copiedLink = false; }, 2500);
    }
  }

  // Derive unique categories including custom ones
  const allCategoryTabs = $derived.by(() => {
    const base = ['Semua'];
    const foundInDocs = Array.from(new Set(documents.map(d => d.category))).filter(Boolean);
    const fromCatService = categories.map(c => c.name);
    return Array.from(new Set([...base, ...foundInDocs, ...fromCatService]));
  });

  // Helper for document badge colors
  function getDocTypeInfo(doc: DocumentEntity) {
    const catLower = (doc.category || '').toLowerCase();
    if (catLower.includes('standar') || catLower.includes('spp')) {
      return { label: 'SPP Resmi', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' };
    }
    if (catLower.includes('regulasi') || catLower.includes('sk')) {
      return { label: 'Regulasi / SK', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' };
    }
    if (catLower.includes('laporan') || catLower.includes('ikm')) {
      return { label: 'Laporan IKM', color: 'bg-sky-500/10 text-sky-600 border-sky-500/20' };
    }
    if (catLower.includes('maklumat')) {
      return { label: 'Maklumat', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' };
    }
    if (catLower.includes('formulir')) {
      return { label: 'Formulir PPID', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' };
    }
    return { label: doc.category || 'Dokumen', color: 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] border-[var(--color-primary)]/20' };
  }

  function formatFileSizeMB(bytes: number): string {
    return (bytes / (1024 * 1024)).toFixed(2);
  }
</script>

<div class="py-6 sm:py-10 px-4 sm:px-6 max-w-7xl mx-auto space-y-6 sm:space-y-8">

  <!-- Mobile-First Header Banner -->
  <div class="bg-gradient-to-br from-[var(--color-card)] to-[var(--color-bg)] border border-[var(--color-border)] rounded-3xl p-5 sm:p-8 space-y-4 shadow-xs">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/25 text-[var(--color-primary)] text-xs font-semibold">
        <ShieldCheck class="w-3.5 h-3.5" />
        <span>Transparansi & Dokumentasi Publik</span>
      </div>
      <span class="text-[11px] text-[var(--color-muted-foreground)] font-mono bg-[var(--color-card)] px-2.5 py-1 rounded-lg border border-[var(--color-border)]">
        {documents.length} Berkas Tersedia
      </span>
    </div>

    <div>
      <h1 class="text-2xl sm:text-3xl font-light text-[var(--color-text)] tracking-tight">
        Dokumentasi & Regulasi Publik
      </h1>
      <p class="text-xs sm:text-sm text-[var(--color-muted-foreground)] mt-1.5 leading-relaxed max-w-3xl">
        Pusat akses dokumen Standar Pelayanan Publik (SPP 11 Komponen), Keputusan Tarif, Maklumat Pelayanan, dan Laporan Indeks Kepuasan Masyarakat (IKM).
      </p>
    </div>

    <!-- Quick Search Bar -->
    <div class="pt-2">
      <div class="relative">
        <Search class="w-4 h-4 text-[var(--color-muted-foreground)] absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input aria-label="Cari judul berkas, SPP, regulasi, atau kata kunci..."
          type="text"
          placeholder="Cari judul berkas, SPP, regulasi, atau kata kunci..."
          bind:value={search}
          class="w-full bg-[var(--color-card)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] rounded-2xl pl-10 pr-10 py-3 text-xs sm:text-sm text-[var(--color-text)] placeholder-[var(--color-muted-foreground)] transition shadow-inner"
        />
        {#if search}
          <button
            onclick={() => { search = ''; }}
            class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-text)] p-1"
          >
            <X class="w-4 h-4" />
          </button>
        {/if}
      </div>
    </div>

    <!-- Horizontal Scrollable Category Filter Pills (Mobile First) -->
    <div class="pt-1">
      <div class="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none -mx-1 px-1">
        {#each allCategoryTabs as cat (cat)}
          {@const isSelected = selectedCat === cat}
          <button
            onclick={() => { selectedCat = cat; }}
            class={`whitespace-nowrap px-3.5 py-2 rounded-2xl text-xs font-semibold transition shrink-0 cursor-pointer flex items-center gap-1.5 ${
              isSelected
                ? 'bg-[var(--color-primary)] text-white shadow-sm'
                : 'bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]'
            }`}
          >
            <span>{cat}</span>
          </button>
        {/each}
      </div>
    </div>
  </div>

  <!-- Documents Grid / Feed -->
  {#if loading}
    <LoadingSkeleton variant="list" count={5} />
  {:else if loadError}
    <ErrorState
      message={loadError}
      onRetry={() => loadDocs(search, selectedCat)}
      retrying={loading}
    />
  {:else if documents.length === 0}
    <EmptyState
      icon={FileText}
      title="Dokumen Tidak Ditemukan"
      description={search ? `Tidak ada dokumen yang cocok dengan pencarian "${search}". Coba kata kunci lain atau pilih kategori Semua.` : 'Belum ada dokumen resmi yang dipublikasikan.'}
      actionLabel="Reset Filter"
      onAction={() => { search = ''; selectedCat = 'Semua'; }}
    />
  {:else}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {#each documents as doc (doc.id)}
        {@const typeInfo = getDocTypeInfo(doc)}
        {@const fileSizeMB = formatFileSizeMB(doc.fileSize)}
        {@const pubDate = doc.publishedAt ? new Date(doc.publishedAt).toLocaleDateString('id-ID', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }) : 'Terbaru'}
        <div
          id={doc.id}
          class="bg-[var(--color-card)] border border-[var(--color-border)] hover:border-[var(--color-primary)]/50 rounded-3xl p-5 sm:p-6 flex flex-col justify-between space-y-4 transition shadow-xs group"
        >
          <div class="space-y-3">
            <!-- Badge Header -->
            <div class="flex items-center justify-between gap-2">
              <span class={`px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider border ${typeInfo.color}`}>
                {typeInfo.label}
              </span>
              <span class="text-[10px] text-[var(--color-muted-foreground)] font-mono">
                {fileSizeMB} MB • PDF
              </span>
            </div>

            <!-- Document Title -->
            <h2 class="text-sm sm:text-base font-bold text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition leading-snug">
              {doc.title}
            </h2>

            <!-- Description / Summary -->
            {#if doc.description}
              <p class="text-xs text-[var(--color-muted-foreground)] leading-relaxed line-clamp-3">
                {doc.description}
              </p>
            {/if}

            <!-- Metadata items -->
            <div class="flex flex-wrap items-center gap-3 pt-1 text-[10px] text-[var(--color-muted-foreground)] font-mono border-t border-[var(--color-border)]/60">
              <span class="flex items-center gap-1">
                <Calendar class="w-3 h-3 text-[var(--color-primary)]" />
                {pubDate}
              </span>
              <span>•</span>
              <span class="flex items-center gap-1">
                <Download class="w-3 h-3 text-[var(--color-primary)]" />
                {doc.downloadCount}x diunduh
              </span>
            </div>
          </div>

          <!-- Action Buttons (Read In-App & Download) -->
          <div class="pt-3 border-t border-[var(--color-border)] flex items-center gap-2">
            <button
              type="button"
              onclick={() => { activeReadingDoc = doc; }}
              class="flex-1 py-2.5 px-3 rounded-2xl bg-[var(--color-surface)] hover:bg-[var(--color-primary)]/10 text-[var(--color-text)] hover:text-[var(--color-primary)] border border-[var(--color-border)] text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <BookOpen class="w-3.5 h-3.5 text-[var(--color-primary)]" />
              <span>Baca Rinci</span>
            </button>

            <button
              type="button"
              onclick={() => handleDownload(doc)}
              title="Unduh Berkas Asli"
              class="py-2.5 px-3.5 rounded-2xl bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer"
            >
              <Download class="w-3.5 h-3.5" />
              <span class="hidden xs:inline">Unduh</span>
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}

  <!-- Mobile-Friendly In-App Document Reader / Summary Modal -->
  {#if activeReadingDoc}
    {@const doc = activeReadingDoc}
    <div class="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div class="bg-[var(--color-card)] border border-[var(--color-border)] rounded-t-[32px] sm:rounded-3xl max-w-2xl w-full max-h-[85vh] sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom-6 duration-300">

        <!-- Modal Header -->
        <div class="p-5 sm:p-6 border-b border-[var(--color-border)] flex items-start justify-between gap-4 bg-[var(--color-bg)]/60">
          <div class="space-y-1">
            <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-[10px] font-bold uppercase tracking-wider border border-[var(--color-primary)]/20">
              <ShieldCheck class="w-3 h-3" />
              <span>{doc.category || 'Dokumen Resmi'}</span>
            </div>
            <h3 class="text-base sm:text-lg font-bold text-[var(--color-text)] leading-snug">
              {doc.title}
            </h3>
          </div>

          <button
            onclick={() => { activeReadingDoc = null; }}
            class="p-2 rounded-full bg-[var(--color-card)] hover:bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:text-[var(--color-text)] transition shrink-0"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Modal Body - Structured & High Readability -->
        <div class="p-5 sm:p-6 overflow-y-auto space-y-5 text-left text-xs sm:text-sm text-[var(--color-text)] leading-relaxed">

          <!-- Executive Summary Box -->
          <div class="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-2">
            <div class="text-xs font-bold text-[var(--color-primary)] flex items-center gap-1.5 uppercase tracking-wider">
              <Info class="w-4 h-4" />
              <span>Ringkasan Informasi Dokumen</span>
            </div>
            <p class="text-xs text-[var(--color-text)] leading-relaxed">
              {doc.description || 'Dokumen resmi yang diterbitkan oleh Puskesmas Manding sebagai pedoman pelayanan dan transparansi publik.'}
            </p>
          </div>

          <!-- Document Information & Legal Basis -->
          <div class="space-y-3">
            <h4 class="text-xs font-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">
              Detail Spesifikasi & Dasar Regulasi
            </h4>

            <div class="grid grid-cols-2 gap-3 text-xs">
              <div class="p-3 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)]">
                <span class="text-[10px] text-[var(--color-muted-foreground)] block">Nama Berkas</span>
                <span class="font-mono font-medium truncate block">{doc.fileName}</span>
              </div>

              <div class="p-3 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)]">
                <span class="text-[10px] text-[var(--color-muted-foreground)] block">Ukuran Berkas</span>
                <span class="font-mono font-medium">{formatFileSizeMB(doc.fileSize)} MB (PDF)</span>
              </div>

              <div class="p-3 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)]">
                <span class="text-[10px] text-[var(--color-muted-foreground)] block">Versi Dokumen</span>
                <span class="font-mono font-medium">v{doc.version || '1.0'}</span>
              </div>

              <div class="p-3 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)]">
                <span class="text-[10px] text-[var(--color-muted-foreground)] block">Aksesibilitas</span>
                <span class="font-semibold text-emerald-600">Publik (Terbuka)</span>
              </div>
            </div>
          </div>

          <!-- Key Points / Petunjuk Pelayanan -->
          <div class="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-2">
            <div class="text-xs font-bold text-amber-600 flex items-center gap-1.5">
              <Sparkles class="w-3.5 h-3.5" />
              <span>Petunjuk Penggunaan & Hak Pasien</span>
            </div>
            <ul class="text-[11px] text-[var(--color-muted-foreground)] space-y-1.5 list-disc pl-4">
              <li>Dokumen ini berlaku resmi di seluruh unit pelayanan Puskesmas Manding.</li>
              <li>Masyarakat dapat mengajukan pertanyaan atau klarifikasi terkait dokumen ini melalui loket PPID atau menu Kritik & Saran.</li>
              <li>Penggandaan dan publikasi kembali untuk keperluan non-komersial diizinkan dengan mencantumkan sumber resmi.</li>
            </ul>
          </div>

          {#if copiedLink}
            <div class="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-semibold flex items-center justify-center gap-1.5 animate-in fade-in">
              <Check class="w-4 h-4 text-emerald-600" />
              <span>Tautan dokumen berhasil disalin ke papan klip!</span>
            </div>
          {/if}
        </div>

        <!-- Modal Footer Actions -->
        <div class="p-4 sm:p-6 border-t border-[var(--color-border)] bg-[var(--color-bg)]/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onclick={() => handleShare(doc)}
            class="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] text-xs font-semibold text-[var(--color-text)] hover:bg-[var(--color-surface)] flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <Share2 class="w-3.5 h-3.5 text-[var(--color-primary)]" />
            <span>Bagikan Tautan</span>
          </button>

          <div class="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onclick={() => { activeReadingDoc = null; }}
              class="flex-1 sm:flex-none px-4 py-2.5 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] text-xs font-semibold text-[var(--color-muted-foreground)] hover:text-[var(--color-text)] transition cursor-pointer"
            >
              Tutup
            </button>

            <button
              type="button"
              onclick={() => handleDownload(doc)}
              class="flex-1 sm:flex-none px-5 py-2.5 rounded-2xl bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
            >
              <Download class="w-4 h-4" />
              <span>Unduh Dokumen Asli</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  {/if}

</div>
