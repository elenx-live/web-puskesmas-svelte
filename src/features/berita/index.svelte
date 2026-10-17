<!-- @component Halaman daftar berita publik: kabar puskesmas dengan pencarian, filter kategori, berita unggulan & grid artikel. -->
<script lang="ts">
  import { Search, Clock, Newspaper } from 'lucide-svelte';
  import { postService } from '../../shared/services/postService.js';
  import { categoryService } from '../../shared/services/categoryService.js';
  import type { PostEntity, CategoryEntity } from '../../shared/types/index.js';
  import LoadingSkeleton from '../../shared/ui/LoadingSkeleton.svelte';
  import EmptyState from '../../shared/ui/EmptyState.svelte';
  import ErrorState from '../../shared/ui/ErrorState.svelte';

  let posts = $state<PostEntity[]>([]);
  let categories = $state<CategoryEntity[]>([]);
  let loading = $state(true);
  let loadError = $state<string | null>(null);
  let search = $state('');
  let selectedCat = $state('');

  $effect(() => {
    loadPosts(search, selectedCat);
  });

  async function loadPosts(s: string, cat: string) {
    loading = true;
    loadError = null;
    try {
      const [postList, catList] = await Promise.all([
        postService.getPublishedPosts(cat, s),
        categoryService.getCategories('post')
      ]);
      posts = postList;
      categories = catList;
    } catch (e) {
      console.error(e);
      loadError = 'Berita tidak dapat dimuat. Periksa koneksi internet Anda lalu coba lagi.';
    } finally {
      loading = false;
    }
  }

  const featuredPost = $derived(posts[0]);
  const sidePosts = $derived(posts.slice(1, 4));
  const gridPosts = $derived(posts.slice(4));

  function formatDate(d: string | undefined, format: 'long' | 'short'): string {
    if (!d) return '';
    return new Date(d).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: format === 'long' ? 'long' : 'short',
      year: 'numeric'
    });
  }
</script>

<div class="py-12 px-4 sm:px-6 max-w-7xl mx-auto space-y-10">

  <!-- Header - Editorial Style -->
  <div class="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b-4 border-[var(--color-primary)] pb-6">
    <div class="space-y-2">
      <span class="text-xs font-bold uppercase tracking-widest text-[var(--color-primary)]">Portal Informasi</span>
      <h1 class="text-4xl md:text-5xl font-black text-[var(--color-text)] tracking-tight ">Kabar <span class="text-[var(--color-primary)]">Puskesmas</span></h1>
      <p class="text-sm text-[var(--color-muted-foreground)] font-medium">Informasi resmi, liputan kegiatan, dan artikel kesehatan masyarakat.</p>
    </div>

    <!-- Search & Category Tabs -->
    <div class="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto shrink-0">
      <div class="relative w-full sm:w-64">
        <Search class="w-4 h-4 text-[var(--color-muted-foreground)] absolute left-3 top-1/2 -translate-y-1/2" />
        <input aria-label="Cari berita..."
          type="text"
          placeholder="Cari berita..."
          bind:value={search}
          class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none rounded-none pl-9 pr-4 py-2 text-sm text-[var(--color-text)] placeholder-[var(--color-muted-foreground)] transition"
        />
      </div>
      <select aria-label="Filter Kategori Berita"
        bind:value={selectedCat}
        class="w-full sm:w-auto bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none rounded-none px-4 py-2 text-sm text-[var(--color-text)] font-semibold transition"
      >
        <option value="">Semua Kategori</option>
        {#each categories as c (c.id)}
          <option value={c.id}>{c.name}</option>
        {/each}
      </select>
    </div>
  </div>

  <!-- Article Grid -->
  {#if loading}
    <LoadingSkeleton variant="card" count={6} />
  {:else if loadError}
    <ErrorState
      message={loadError}
      onRetry={() => loadPosts(search, selectedCat)}
      retrying={loading}
    />
  {:else if posts.length === 0}
    <EmptyState
      icon={Newspaper}
      title="Tidak ada berita"
      description="Belum ada berita yang dipublikasikan atau tidak ada yang sesuai dengan pencarian Anda."
    />
  {:else}
    <div class="space-y-12">

      <!-- Top Section: Featured + Side -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">

        <!-- Main Featured -->
        {#if featuredPost}
          <div class="lg:col-span-8">
            <a href="#/berita/{featuredPost.slug || featuredPost.id}" class="group block h-full">
              <div class="h-full flex flex-col space-y-4">
                {#if featuredPost.featuredImage}
                  <div class="w-full aspect-[16/9] overflow-hidden bg-[var(--color-card)] relative">
                    <img
                      src={featuredPost.featuredImage}
                      alt={featuredPost.title}
                      class="w-full h-full object-cover group-hover:scale-105 transition duration-700"
                    />
                  </div>
                {/if}
                <div class="flex flex-col flex-1 justify-start space-y-3">
                  <div class="flex items-center gap-3 text-xs">
                    <span class="text-[var(--color-primary)] font-bold uppercase tracking-widest">
                      {featuredPost.categoryName}
                    </span>
                    <span class="text-[var(--color-muted-foreground)]">•</span>
                    <span class="text-[var(--color-muted-foreground)] flex items-center gap-1.5 font-medium">
                      <Clock class="w-3.5 h-3.5" />
                      {formatDate(featuredPost.publishedAt || featuredPost.createdAt, 'long')}
                    </span>
                  </div>
                  <h2 class="text-3xl md:text-5xl font-black text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition leading-tight ">
                    {featuredPost.title}
                  </h2>
                  <p class="text-base text-[var(--color-muted-foreground)] line-clamp-3 leading-relaxed">
                    {featuredPost.excerpt}
                  </p>
                </div>
              </div>
            </a>
          </div>
        {/if}

        <!-- Side Posts (Berita Terkini) -->
        {#if sidePosts.length > 0}
          <div class="lg:col-span-4 flex flex-col">
            <div class="border-b-2 border-[var(--color-border)] pb-2 mb-4">
              <h3 class="text-lg font-bold uppercase tracking-widest text-[var(--color-text)]">Berita Terkini</h3>
            </div>
            <div class="flex flex-col flex-1 divide-y divide-[var(--color-border)]">
              {#each sidePosts as post (post.id)}
                <a href="#/berita/{post.slug || post.id}" class="group py-4 first:pt-0 last:pb-0 flex flex-col space-y-2">
                  <div class="text-[10px] text-[var(--color-primary)] font-bold uppercase tracking-wider">
                    {post.categoryName}
                  </div>
                  <h3 class="text-lg font-bold text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition leading-snug line-clamp-3 ">
                    {post.title}
                  </h3>
                  <div class="text-[11px] text-[var(--color-muted-foreground)] font-medium flex items-center gap-1.5">
                     <Clock class="w-3 h-3" />
                     {formatDate(post.publishedAt || post.createdAt, 'short')}
                  </div>
                </a>
              {/each}
            </div>
          </div>
        {/if}
      </div>

      <!-- Grid Posts -->
      {#if gridPosts.length > 0}
        <div class="pt-8 border-t-2 border-[var(--color-border)] space-y-8">
          <div class="flex items-center gap-4">
            <h3 class="text-xl font-bold uppercase tracking-widest text-[var(--color-text)]">
              Artikel Lainnya
            </h3>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-x-8 md:gap-y-12">
            {#each gridPosts as post (post.id)}
              <a href="#/berita/{post.slug || post.id}" class="group flex flex-col h-full gap-4">
                {#if post.featuredImage}
                  <div class="w-full aspect-[16/9] overflow-hidden bg-[var(--color-card)] border border-[var(--color-border)]">
                    <img
                      src={post.featuredImage}
                      alt={post.title}
                      class="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                  </div>
                {/if}
                <div class="flex flex-col flex-1 space-y-2">
                  <div class="flex items-center gap-2 text-xs">
                    <span class="text-[var(--color-primary)] font-bold uppercase tracking-wider">{post.categoryName}</span>
                    <span class="text-[var(--color-border)]">•</span>
                    <span class="text-[var(--color-muted-foreground)] font-medium">{formatDate(post.publishedAt || post.createdAt, 'long')}</span>
                  </div>
                  <h4 class="text-xl font-bold text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition leading-snug line-clamp-3 ">
                    {post.title}
                  </h4>
                  <p class="text-sm text-[var(--color-muted-foreground)] line-clamp-2 leading-relaxed">
                    {post.excerpt}
                  </p>
                </div>
              </a>
            {/each}
          </div>
        </div>
      {/if}

    </div>
  {/if}
</div>
