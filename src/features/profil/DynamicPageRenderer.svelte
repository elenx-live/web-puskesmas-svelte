<!--
  @component Render halaman CMS dinamis berdasarkan prop `slug` (path tanpa
  leading slash, mis. 'visi-misi'). Jika prop slug kosong, slug diambil dari
  segmen pertama path hash aktif — fallback untuk rute otomatis App.svelte.
  Dibungkus PublicLayout oleh App.svelte.
-->
<script lang="ts">
  import { ChevronRight, Calendar, User, ShieldCheck } from 'lucide-svelte';
  import { routerState } from '../../app/router.svelte.js';
  import { pageService } from '../../shared/services/pageService.js';
  import { formatSafeHtml } from '../../shared/utils/sanitize.js';
  import type { PageEntity } from '../../shared/types/index.js';
  import NotFoundPage from '../errors/NotFoundPage.svelte';

  /** Slug halaman CMS (tanpa leading slash), mis. 'visi-misi'. */
  const { slug = '' }: { slug?: string } = $props();

  const effectiveSlug = $derived(
    slug || routerState.path.replace(/^\//, '').split('/')[0] || ''
  );

  let page = $state<PageEntity | null>(null);
  let loading = $state(true);
  let notFound = $state(false);

  const publishDate = $derived(
    page
      ? new Date(page.publishedAt || page.createdAt).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        })
      : ''
  );

  $effect(() => {
    const currentSlug = effectiveSlug;
    let cancelled = false;

    async function fetchPage() {
      loading = true;
      notFound = false;
      try {
        if (!currentSlug) {
          notFound = true;
          return;
        }
        const data = await pageService.getPageBySlug(currentSlug);
        if (cancelled) return;
        if (data && data.status === 'published') {
          page = data;
        } else {
          notFound = true;
        }
      } catch {
        if (!cancelled) notFound = true;
      } finally {
        if (!cancelled) loading = false;
      }
    }

    fetchPage();
    return () => {
      cancelled = true;
    };
  });

  // Perbarui judul dokumen (SEO) sesuai halaman yang dimuat
  $effect(() => {
    if (page?.seoTitle) {
      document.title = `${page.seoTitle} - Puskesmas Manding`;
    }
  });
</script>

{#if loading}
  <div class="max-w-5xl mx-auto px-4 py-20 text-center text-[var(--color-muted-foreground)] font-mono text-sm">
    Memuat halaman resmi Puskesmas...
  </div>
{:else if notFound || !page}
  <NotFoundPage />
{:else}
  <div class="max-w-5xl mx-auto px-4 py-12 space-y-8">

    <!-- Breadcrumb Navigation -->
    <nav class="flex items-center gap-2 text-xs text-[var(--color-muted-foreground)] font-mono">
      <a href="#/" class="hover:text-[var(--color-primary)] transition">Beranda</a>
      <ChevronRight class="w-3.5 h-3.5 text-zinc-600" />
      <span class="text-[var(--color-muted-foreground)]">Halaman</span>
      <ChevronRight class="w-3.5 h-3.5 text-zinc-600" />
      <span class="text-[var(--color-primary)] truncate">{page.title}</span>
    </nav>

    <!-- Header Title Section -->
    <div class="space-y-4 pb-6 border-b border-[var(--color-border)]">
      <h1 class="text-3xl md:text-4xl font-light tracking-tight text-[var(--color-text)] leading-tight">
        {page.title}
      </h1>

      {#if page.excerpt}
        <p class="text-base text-[var(--color-text)] font-light leading-relaxed max-w-3xl">
          {page.excerpt}
        </p>
      {/if}

      <div class="flex flex-wrap items-center gap-4 text-xs text-[var(--color-muted-foreground)] pt-2 font-mono">
        <div class="flex items-center gap-1.5">
          <Calendar class="w-3.5 h-3.5 text-[var(--color-primary)]" />
          <span>{publishDate}</span>
        </div>

        <div class="flex items-center gap-1.5">
          <User class="w-3.5 h-3.5 text-[var(--color-primary)]" />
          <span>Dipublikasikan oleh {page.createdBy.name}</span>
        </div>

        <div class="flex items-center gap-1.5 text-[var(--color-primary)] border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/10 px-2.5 py-1 rounded-full text-[10px]">
          <ShieldCheck class="w-3 h-3" />
          <span>Terverifikasi Resmi</span>
        </div>
      </div>
    </div>

    <!-- Featured Image -->
    {#if page.featuredImage}
      <div class="rounded-3xl overflow-hidden border border-[var(--color-border)] max-h-96">
        <img
          src={page.featuredImage}
          alt={page.title}
          class="w-full h-full object-cover"
        />
      </div>
    {/if}

    <!-- Content Body -->
    <div class="bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl p-6 md:p-10 shadow-xl space-y-6">
      <div class="html-safe-content max-w-none text-[var(--color-text)] font-sans">
        {@html formatSafeHtml(page.content)}
      </div>
    </div>

  </div>
{/if}
