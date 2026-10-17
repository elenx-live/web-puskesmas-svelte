<!-- @component Halaman galeri publik: grid album foto & kegiatan dengan lightbox modal penampil foto album. -->
<script lang="ts">
  import { X, Images } from 'lucide-svelte';
  import { galleryService } from '../../shared/services/galleryService.js';
  import type { GalleryAlbum } from '../../shared/types/index.js';
  import LoadingSkeleton from '../../shared/ui/LoadingSkeleton.svelte';
  import EmptyState from '../../shared/ui/EmptyState.svelte';
  import ErrorState from '../../shared/ui/ErrorState.svelte';

  let albums = $state<GalleryAlbum[]>([]);
  let loading = $state(true);
  let loadError = $state<string | null>(null);
  let activeAlbum = $state<GalleryAlbum | null>(null);

  $effect(() => {
    loadAlbums();
  });

  async function loadAlbums() {
    loading = true;
    loadError = null;
    try {
      const data = await galleryService.getPublishedAlbums();
      albums = data;
    } catch (e) {
      console.error(e);
      loadError = 'Galeri foto tidak dapat dimuat. Periksa koneksi internet Anda lalu coba lagi.';
    } finally {
      loading = false;
    }
  }
</script>

<div class="py-12 px-6 max-w-7xl mx-auto space-y-8">

  <!-- Header -->
  <div class="space-y-2 border-b border-[var(--color-border)] pb-8">
    <span class="text-xs font-bold uppercase tracking-widest text-[var(--color-primary)]">Dokumentasi Visual</span>
    <h1 class="text-3xl font-light text-[var(--color-text)]">Galeri Foto & Album Kegiatan</h1>
    <p class="text-xs text-[var(--color-muted-foreground)]">
      Liputan foto sarana prasarana gedung, pelayanan kesehatan keliling, posyandu, dan imunisasi.
    </p>
  </div>

  <!-- Albums Grid -->
  {#if loading}
    <LoadingSkeleton variant="card" count={6} />
  {:else if loadError}
    <ErrorState message={loadError} onRetry={loadAlbums} retrying={loading} />
  {:else if albums.length === 0}
    <EmptyState
      icon={Images}
      title="Belum ada album foto"
      description="Dokumentasi foto kegiatan puskesmas akan tampil di sini setelah dipublikasikan."
    />
  {:else}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {#each albums as album (album.id)}
        <div
          onclick={() => { activeAlbum = album; }}
          class="bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl overflow-hidden cursor-pointer group hover:border-[var(--color-primary)]/50 transition space-y-4 p-4"
          role="button"
          tabindex="0"
          onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activeAlbum = album; } }}
        >
          <div class="relative h-48 rounded-2xl overflow-hidden">
            <img
              src={album.coverImage}
              alt={album.title}
              class="w-full h-full object-cover group-hover:scale-105 transition duration-500"
            />
            <div class="absolute top-3 right-3 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-xl text-[10px] text-[var(--color-primary)] font-mono font-bold border border-white/10">
              {album.images.length} Foto
            </div>
          </div>

          <div class="space-y-1">
            <h2 class="text-base font-bold text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition line-clamp-1">{album.title}</h2>
            <p class="text-xs text-[var(--color-muted-foreground)] line-clamp-2">{album.description}</p>
          </div>
        </div>
      {/each}
    </div>
  {/if}

  <!-- Lightbox Modal -->
  {#if activeAlbum}
    {@const album = activeAlbum}
    <div class="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4">
      <div class="bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl max-w-4xl w-full p-6 space-y-6 relative max-h-[90vh] overflow-y-auto">
        <button
          onclick={() => { activeAlbum = null; }}
          class="absolute top-4 right-4 p-2 rounded-full bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:text-[var(--color-text)]"
        >
          <X class="w-5 h-5" />
        </button>

        <div>
          <h2 class="text-xl font-bold text-[var(--color-text)]">{album.title}</h2>
          <p class="text-xs text-[var(--color-muted-foreground)] mt-1">{album.description}</p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {#each album.images as img, i (img.id ?? i)}
            <div class="space-y-1.5">
              <img
                src={img.url}
                alt={img.caption || `Foto ${i + 1}`}
                class="w-full h-40 object-cover rounded-2xl border border-[var(--color-border)]"
              />
              {#if img.caption}
                <div class="text-[10px] text-[var(--color-muted-foreground)] italic">{img.caption}</div>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    </div>
  {/if}

</div>
