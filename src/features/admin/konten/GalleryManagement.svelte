<!-- @component Manajemen galeri foto & album kegiatan — buat album dan pratinjau lightbox. -->
<script lang="ts">
  import { Image, Plus, Trash2, Eye } from 'lucide-svelte';
  import Card from '../../../shared/ui/Card.svelte';
  import Button from '../../../shared/ui/Button.svelte';
  import Input from '../../../shared/ui/Input.svelte';
  import Modal from '../../../shared/ui/Modal.svelte';
  import ConfirmModal from '../../../shared/components/ConfirmModal.svelte';
  import { authStore } from '../../../shared/stores/auth.svelte.js';
  import { toastStore } from '../../../shared/stores/toast.svelte.js';
  import { galleryService } from '../../../shared/services/galleryService.js';
  import type { GalleryAlbum } from '../../../shared/types/index.js';

  let albums = $state<GalleryAlbum[]>([]);
  let loading = $state(true);

  // Modal State
  let isModalOpen = $state(false);
  let editingAlbum = $state<Partial<GalleryAlbum> | null>(null);
  let saving = $state(false);

  // Lightbox Preview
  let previewAlbum = $state<GalleryAlbum | null>(null);

  // Delete Confirm
  let deleteModalOpen = $state(false);
  let albumToDelete = $state<GalleryAlbum | null>(null);

  async function loadData() {
    loading = true;
    try {
      albums = await galleryService.getAlbums();
    } catch {
      toastStore.showToast('Gagal memuat galeri album', 'error');
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    loadData();
  });

  function handleOpenAdd() {
    editingAlbum = {
      title: '',
      description: '',
      coverImage: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=800',
      images: [
        { id: '1', url: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=800', caption: 'Foto Utama' }
      ],
      status: 'published'
    };
    isModalOpen = true;
  }

  async function handleSave(e: SubmitEvent) {
    e.preventDefault();
    const user = authStore.user;
    if (!user || !editingAlbum) return;

    if (!editingAlbum.title?.trim()) {
      toastStore.showToast('Judul Album Galeri wajib diisi!', 'error');
      return;
    }

    saving = true;
    try {
      await galleryService.createAlbum(editingAlbum, {
        id: user.uid,
        email: user.email,
        name: user.displayName
      });
      toastStore.showToast(`Album galeri "${editingAlbum.title}" berhasil dibuat.`);
      isModalOpen = false;
      editingAlbum = null;
      loadData();
    } catch (err: any) {
      toastStore.showToast(err.message || 'Gagal menyimpan album galeri', 'error');
    } finally {
      saving = false;
    }
  }

  async function handleDelete() {
    const user = authStore.user;
    if (!user || !albumToDelete) return;
    saving = true;
    try {
      await galleryService.deleteAlbum(albumToDelete.id, {
        id: user.uid,
        email: user.email,
        name: user.displayName
      });
      toastStore.showToast(`Album "${albumToDelete.title}" dihapus.`);
      deleteModalOpen = false;
      albumToDelete = null;
      loadData();
    } catch (err: any) {
      toastStore.showToast(err.message || 'Gagal menghapus album', 'error');
    } finally {
      saving = false;
    }
  }
</script>

<div class="flex items-center justify-between bg-[var(--color-card)] border border-[var(--color-border)] p-4 rounded-3xl">
  <div class="flex items-center gap-3">
    <div class="p-2.5 bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 text-[var(--color-primary)] rounded-2xl">
      <Image class="w-5 h-5" />
    </div>
    <div>
      <h2 class="text-sm font-bold text-[var(--color-text)]">Album Foto Publik</h2>
      <p class="text-xs text-[var(--color-muted-foreground)]">Tampil dengan efek Lightbox foto resolusi tinggi</p>
    </div>
  </div>

  {#if authStore.hasPermission('create_pages')}
    <Button onclick={handleOpenAdd} variant="primary">
      <Plus class="w-4 h-4" />
      Buat Album Foto Baru
    </Button>
  {/if}
</div>

<!-- Grid of Albums -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {#if loading}
    <div class="col-span-full p-8 text-center text-[var(--color-muted-foreground)]">Memuat album galeri...</div>
  {:else if albums.length === 0}
    <div class="col-span-full p-8 text-center text-[var(--color-muted-foreground)]">Belum ada album galeri.</div>
  {:else}
    {#each albums as album (album.id)}
      <Card class="p-4 space-y-3 group hover:border-[var(--color-primary)]/50 transition">
        <div class="relative h-44 rounded-2xl overflow-hidden border border-[var(--color-border)]">
          <img
            src={album.coverImage}
            alt={album.title}
            class="w-full h-full object-cover group-hover:scale-105 transition duration-500"
          />
          <div class="absolute top-3 right-3 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-xl text-[10px] text-[var(--color-primary)] font-mono font-bold border border-white/10">
            {album.images.length} Foto
          </div>
        </div>

        <div>
          <h3 class="font-bold text-[var(--color-text)] text-sm line-clamp-1">{album.title}</h3>
          <p class="text-xs text-[var(--color-muted-foreground)] line-clamp-2 mt-0.5">{album.description}</p>
        </div>

        <div class="flex items-center justify-between pt-3 border-t border-[var(--color-border)] text-xs">
          <span class="text-[10px] text-[var(--color-muted-foreground)]">
            {new Date(album.createdAt).toLocaleDateString('id-ID')}
          </span>

          <div class="flex items-center gap-1.5">
            <button
              onclick={() => (previewAlbum = album)}
              class="p-1.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:text-[var(--color-text)]"
              title="Buka Lightbox Pratinjau"
            >
              <Eye class="w-3.5 h-3.5" />
            </button>

            <button
              onclick={() => {
                albumToDelete = album;
                deleteModalOpen = true;
              }}
              class="p-1.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400"
              title="Hapus Album"
            >
              <Trash2 class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </Card>
    {/each}
  {/if}
</div>

<!-- Add Modal -->
<Modal
  isOpen={isModalOpen}
  onClose={() => (isModalOpen = false)}
  title="Buat Album Galeri Baru"
>
  {#snippet footer()}
    <Button variant="secondary" onclick={() => (isModalOpen = false)}>Batal</Button>
    <Button variant="primary" onclick={handleSave} isLoading={saving}>Simpan Album</Button>
  {/snippet}
  {#if editingAlbum}
    <form onsubmit={handleSave} class="space-y-4">
      <Input
        label="Judul Album Foto *"
        placeholder="Contoh: Gedung dan Sarana Prasarana Layanan Utama"
        bind:value={editingAlbum.title}
        required
      />

      <Input
        label="Gambar Sampul (Cover Image URL) *"
        placeholder="https://images.unsplash.com/..."
        bind:value={editingAlbum.coverImage}
        required
      />

      <Input
        label="Deskripsi Album"
        placeholder="Keterangan foto kegiatan..."
        bind:value={editingAlbum.description}
      />
    </form>
  {/if}
</Modal>

<!-- Lightbox Preview Modal -->
<Modal
  isOpen={!!previewAlbum}
  onClose={() => (previewAlbum = null)}
  title={`Album Foto: ${previewAlbum?.title}`}
  size="2xl"
>
  {#if previewAlbum}
    <div class="space-y-4">
      <p class="text-xs text-[var(--color-muted-foreground)]">{previewAlbum.description}</p>
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto pr-1">
        {#each previewAlbum.images as img, i (i)}
          <div class="space-y-1">
            <img
              src={img.url}
              alt={img.caption || `Foto ${i + 1}`}
              class="w-full h-32 object-cover rounded-2xl border border-[var(--color-border)]"
            />
            <div class="text-[10px] text-[var(--color-muted-foreground)] italic line-clamp-1">{img.caption}</div>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</Modal>

<!-- Delete Confirmation -->
<ConfirmModal
  isOpen={deleteModalOpen}
  onClose={() => (deleteModalOpen = false)}
  onConfirm={handleDelete}
  isLoading={saving}
  title="Hapus Album"
  message={`Hapus album "${albumToDelete?.title}"?`}
/>
