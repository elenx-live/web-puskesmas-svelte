<!-- @component Halaman detail artikel berita berdasarkan slug: breadcrumb, isi artikel, tag, bagikan, & sidebar berita/layanan terkait. -->
<script lang="ts">
  import { ChevronRight, User, ArrowLeft, Tag, Clock, Share2, Send, Copy, Check, Smartphone } from 'lucide-svelte';
  import { postService } from '../../shared/services/postService.js';
  import { serviceEngineService } from '../../shared/services/serviceEngineService.js';
  import { sanitizeHtml } from '../../shared/utils/sanitize.js';
  import { updateClientMetaTags } from '../../shared/utils/metaSync.js';
  import { openWhatsAppShare } from '../../shared/utils/shareUtils.js';
  import type { PostEntity, ServiceEntity } from '../../shared/types/index.js';

  const { slug: slugProp = '' }: { slug?: string } = $props();

  const slug = $derived(decodeURIComponent(slugProp));
  let post = $state<PostEntity | null>(null);
  let related = $state<PostEntity[]>([]);
  let relatedServices = $state<ServiceEntity[]>([]);
  let loading = $state(true);
  let copied = $state(false);

  $effect(() => {
    fetchPost(slug);
  });

  function handleCopyLink() {
    navigator.clipboard.writeText(window.location.href);
    copied = true;
    setTimeout(() => { copied = false; }, 2000);
  }

  function handleWhatsAppShare() {
    if (!post) return;
    openWhatsAppShare({
      title: post.title,
      description: post.excerpt,
      imageUrl: post.featuredImage,
      targetPath: `/berita/${post.slug}`,
      siteName: 'Puskesmas Manding'
    });
  }

  async function handleNativeShare() {
    if (!post) return;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: post.title,
          text: post.excerpt,
          url: window.location.href
        });
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }
    handleWhatsAppShare();
  }

  async function fetchPost(s: string) {
    loading = true;
    try {
      if (!s) return;
      const data = await postService.getPostBySlug(s);
      if (data) {
        post = data;
        updateClientMetaTags({
          title: `${data.title} - Puskesmas Manding`,
          description: data.excerpt || data.seoDescription,
          image: data.featuredImage,
          type: 'article',
          url: window.location.href
        });
        const rel = await postService.getRelatedPosts(data.id, data.categoryId, 4);
        related = rel;
        const services = await serviceEngineService.getPublishedServices();
        relatedServices = services.slice(0, 3);
      } else {
        post = null;
      }
    } catch {
      post = null;
    } finally {
      loading = false;
    }
  }
</script>

{#if loading}
  <div class="max-w-5xl mx-auto px-4 py-20 flex flex-col items-center justify-center text-[var(--color-muted-foreground)] space-y-4">
    <div class="w-8 h-8 border-4 border-[var(--color-primary)]/30 border-t-[var(--color-primary)] rounded-full animate-spin"></div>
    <div class="text-xs font-bold uppercase tracking-widest">Memuat Artikel...</div>
  </div>
{:else if !post}
  <div class="max-w-3xl mx-auto px-4 py-32 text-center space-y-6">
    <h1 class="text-4xl font-black text-[var(--color-text)] tracking-tight">404 - Artikel Tidak Ditemukan</h1>
    <p class="text-[var(--color-muted-foreground)] text-sm font-medium">Artikel atau berita yang Anda cari tidak tersedia atau telah dihapus.</p>
    <a href="#/berita" class="inline-flex items-center gap-2 px-8 py-3.5 rounded-none bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-[var(--color-primary-foreground)] font-bold text-xs transition">
      <ArrowLeft class="w-4 h-4" />
      Kembali ke Berita
    </a>
  </div>
{:else}
  <div class="max-w-7xl mx-auto px-4 sm:px-6 py-12">

    <!-- Breadcrumb -->
    <nav class="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted-foreground)] pb-4 border-b-2 border-[var(--color-border)] mb-8">
      <a href="#/" class="hover:text-[var(--color-primary)] transition">Beranda</a>
      <ChevronRight class="w-3.5 h-3.5 text-[var(--color-border)]" />
      <a href="#/berita" class="hover:text-[var(--color-primary)] transition">Kabar Puskesmas</a>
      <ChevronRight class="w-3.5 h-3.5 text-[var(--color-border)]" />
      <span class="text-[var(--color-primary)] truncate max-w-[200px] sm:max-w-xs">{post.title}</span>
    </nav>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">

      <!-- Main Article Content -->
      <div class="lg:col-span-8 space-y-8">

        <!-- Article Header -->
        <header class="space-y-4">
          <span class="text-[var(--color-primary)] text-sm font-bold uppercase tracking-wider inline-block">
            {post.categoryName}
          </span>
          <h1 class="text-4xl md:text-5xl font-black text-[var(--color-text)] leading-[1.1] tracking-tight">
            {post.title}
          </h1>

          <div class="flex flex-wrap items-center gap-4 text-xs text-[var(--color-muted-foreground)] font-medium pt-4">
            <div class="flex items-center gap-1.5">
              <User class="w-3.5 h-3.5" />
              <span>Oleh <span class="font-bold text-[var(--color-text)]">{post.authorName}</span></span>
            </div>
            <span class="text-[var(--color-border)]">•</span>
            <div class="flex items-center gap-1.5">
              <Clock class="w-3.5 h-3.5" />
              <span>{new Date(post.publishedAt || post.createdAt).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
          </div>
        </header>

        <!-- Featured Image -->
        {#if post.featuredImage}
          <figure class="w-full bg-[var(--color-card)] border border-[var(--color-border)]">
            <img src={post.featuredImage} alt={post.title} class="w-full h-auto max-h-[500px] object-cover" />
            <figcaption class="p-3 text-[11px] text-center text-[var(--color-muted-foreground)] border-t border-[var(--color-border)] bg-[var(--color-bg)]">
              {post.title}
            </figcaption>
          </figure>
        {/if}

        <!-- Article Body -->
        <article
          class="prose prose-lg max-w-none text-[var(--color-text)] leading-relaxed
            prose-headings:font-bold prose-headings:text-[var(--color-text)] prose-headings:tracking-tight
            prose-p:text-[var(--color-text)] prose-p:leading-loose
            prose-a:text-[var(--color-primary)] prose-a:no-underline hover:prose-a:underline
            prose-strong:text-[var(--color-text)]
            prose-ul:text-[var(--color-text)] prose-ol:text-[var(--color-text)]
            prose-li:marker:text-[var(--color-primary)]
            prose-blockquote:border-l-4 prose-blockquote:border-[var(--color-primary)] prose-blockquote:bg-[var(--color-primary)]/5 prose-blockquote:p-4 prose-blockquote:not-italic prose-blockquote:text-[var(--color-text)]
            prose-img:border prose-img:border-[var(--color-border)]"
        >
          {@html sanitizeHtml(post.content)}
        </article>

        <!-- Tags -->
        {#if (post.tagNames || []).length > 0}
          <div class="pt-8 border-t border-[var(--color-border)] flex flex-wrap items-center gap-2">
            <Tag class="w-4 h-4 text-[var(--color-primary)] mr-2" />
            {#each (post.tagNames || []) as t, idx (idx)}
              <span class="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text)] bg-[var(--color-card)] px-3 py-1.5 border border-[var(--color-border)]">
                {t}
              </span>
            {/each}
          </div>
        {/if}

        <!-- WhatsApp & Social Share Card -->
        <div class="p-5 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 shadow-sm">
          <div class="space-y-1 text-center sm:text-left">
            <p class="text-xs font-bold text-[var(--color-text)] flex items-center justify-center sm:justify-start gap-1.5">
              <Share2 class="w-4 h-4 text-emerald-600" />
              Bagikan Berita Ini ke WhatsApp
            </p>
            <p class="text-[11px] text-[var(--color-muted-foreground)]">Dilengkapi kartu pratinjau judul, ringkasan, dan gambar berita otomatis saat dikirim ke grup/chat WhatsApp.</p>
          </div>
          <div class="flex flex-wrap items-center justify-center gap-2.5 shrink-0 w-full sm:w-auto">
            <button
              type="button"
              onclick={handleWhatsAppShare}
              class="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition active:scale-95"
            >
              <Send class="w-4 h-4" />
              <span>Kirim ke WhatsApp</span>
            </button>
            <button
              type="button"
              onclick={handleNativeShare}
              class="sm:hidden w-full px-4 py-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] text-xs font-bold flex items-center justify-center gap-2 transition"
            >
              <Smartphone class="w-4 h-4 text-[var(--color-primary)]" />
              <span>Menu Berbagi HP</span>
            </button>
            <button
              type="button"
              onclick={handleCopyLink}
              class="w-full sm:w-auto px-3 py-2.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] hover:bg-[var(--color-surface)] text-[var(--color-text)] text-xs font-semibold flex items-center justify-center gap-1.5 transition"
              title="Salin Tautan"
            >
              {#if copied}
                <Check class="w-4 h-4 text-emerald-500" />
              {:else}
                <Copy class="w-4 h-4" />
              {/if}
              <span>{copied ? 'Tersalin!' : 'Salin Link'}</span>
            </button>
          </div>
        </div>

      </div>

      <!-- Sidebar -->
      <aside class="lg:col-span-4 space-y-12">

        <!-- Related Posts -->
        {#if related.length > 0}
          <div class="space-y-4">
            <div class="border-b-2 border-[var(--color-border)] pb-2">
              <h3 class="text-lg font-bold text-[var(--color-text)] tracking-tight uppercase">
                Berita Terkait
              </h3>
            </div>

            <div class="flex flex-col divide-y divide-[var(--color-border)]">
              {#each related as r (r.id)}
                <a
                  href="#/berita/{r.slug}"
                  class="group py-4 first:pt-0 last:pb-0 flex gap-4 items-start"
                >
                  {#if r.featuredImage}
                    <div class="w-24 h-24 shrink-0 bg-[var(--color-card)] overflow-hidden border border-[var(--color-border)]">
                      <img src={r.featuredImage} alt={r.title} class="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                    </div>
                  {/if}
                  <div class="space-y-1.5 flex-1">
                    <div class="text-[10px] text-[var(--color-primary)] font-bold uppercase tracking-wider">
                      {r.categoryName}
                    </div>
                    <h4 class="font-bold text-[var(--color-text)] text-sm leading-snug group-hover:text-[var(--color-primary)] transition line-clamp-3">
                      {r.title}
                    </h4>
                    <div class="text-[10px] text-[var(--color-muted-foreground)] font-medium flex items-center gap-1.5">
                      <Clock class="w-3 h-3" />
                      {new Date(r.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                </a>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Related Services -->
        {#if relatedServices.length > 0}
          <div class="space-y-4">
            <div class="flex items-center justify-between border-b-2 border-[var(--color-border)] pb-2">
              <h3 class="text-lg font-bold text-[var(--color-text)] tracking-tight uppercase">
                Layanan
              </h3>
              <a href="#/layanan" class="text-[10px] font-bold text-[var(--color-primary)] hover:underline uppercase tracking-wider">
                Lihat Semua
              </a>
            </div>

            <div class="flex flex-col divide-y divide-[var(--color-border)]">
              {#each relatedServices as srv (srv.id)}
                <a
                  href="#/layanan/{srv.slug}"
                  class="py-4 first:pt-0 last:pb-0 group block"
                >
                  <span class="text-[10px] text-[var(--color-primary)] font-bold uppercase tracking-wider block mb-1">
                    {srv.categoryName}
                  </span>
                  <h4 class="font-bold text-[var(--color-text)] text-sm group-hover:text-[var(--color-primary)] transition line-clamp-2">
                    {srv.name}
                  </h4>
                </a>
              {/each}
            </div>
          </div>
        {/if}

      </aside>

    </div>
  </div>
{/if}
