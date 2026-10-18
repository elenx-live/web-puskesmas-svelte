<!-- @component Manajemen galeri foto & album kegiatan — buat album dan pratinjau lightbox. -->
<script lang="ts">
  import { Image, Plus, Trash2, Eye, Upload, Loader2, X } from 'lucide-svelte';
  import Card from '../../../shared/ui/Card.svelte';
  import Button from '../../../shared/ui/Button.svelte';
  import Input from '../../../shared/ui/Input.svelte';
  import Modal from '../../../shared/ui/Modal.svelte';
  import ConfirmModal from '../../../shared/components/ConfirmModal.svelte';
  import { authStore } from '../../../shared/stores/auth.svelte.js';
  import { toastStore } from '../../../shared/stores/toast.svelte.js';
  import { galleryService } from '../../../shared/services/galleryService.js';
  import { errorMessage } from '../../../shared/lib/logger.js';
  import { apiFetch } from '../../../shared/lib/api.js';
  import type { GalleryAlbum } from '../../../shared/types/index.js';

  let albums = $state<GalleryAlbum[]>([]);
  let loading = $state(true);

  // Modal State
  let isModalOpen = $state(false);
  let editingAlbum = $state<Partial<GalleryAlbum> | null>(null);
  let saving = $state(false);
  // Key agar form uncontrolled me-reset tiap kali modal dibuka
  let modalKey = $state(0);

  // Upload state
  let coverInputEl = $state<HTMLInputElement | null>(null);
  let uploadingCover = $state(false);
  let photoInputEl = $state<HTMLInputElement | null>(null);
  let uploadingPhotos = $state(false);
  let uploadProgress = $state({ done: 0, total: 0 });

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
    modalKey += 1;
    isModalOpen = true;
  }

  function handleOpenEdit(album: GalleryAlbum) {
    editingAlbum = JSON.parse(JSON.stringify(album));
    modalKey += 1;
    isModalOpen = true;
  }

  /** Resize gambar via canvas (maks 1920px) agar upload cepat. */
  async function processImageFile(file: File): Promise<string> {
    const rawBase64: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Gagal membaca berkas gambar'));
      reader.readAsDataURL(file);
    });

    try {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Gagal memuat gambar'));
        img.src = rawBase64;
      });

      const maxDim = 1920;
      let width = img.width;
      let height = img.height;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          return canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.9);
        }
      }
    } catch (e) {
      console.warn('Optimasi gambar dilewati:', e);
    }
    return rawBase64;
  }

  /** Upload satu gambar ke server, kembalikan URL. */
  async function uploadToServer(imageBase64: string, fileName: string): Promise<string> {
    const res = await apiFetch('/api/upload-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64, fileName: fileName.replace(/\.[^/.]+$/, '') })
    });
    const data = await res.json();
    if (data.success && data.url) return data.url as string;
    throw new Error(data.error || 'Upload ke server gagal');
  }

  function validateImageFile(file: File): boolean {
    if (!file.type.startsWith('image/')) {
      toastStore.showToast('Harap pilih berkas gambar yang valid (JPG, PNG, WebP, GIF)', 'error');
      return false;
    }
    if (file.size > 25 * 1024 * 1024) {
      toastStore.showToast(`Berkas "${file.name}" melebihi batas 25MB`, 'error');
      return false;
    }
    return true;
  }

  /** Upload foto sampul album. */
  async function handleCoverUpload(e: Event & { currentTarget: HTMLInputElement }) {
    const file = e.currentTarget.files?.[0];
    if (!file || !editingAlbum) return;
    if (!validateImageFile(file)) {
      if (coverInputEl) coverInputEl.value = '';
      return;
    }

    uploadingCover = true;
    const prevCover = editingAlbum.coverImage;
    try {
      const base64 = await processImageFile(file);
      // Pratinjau lokal langsung
      editingAlbum.coverImage = base64;
      const url = await uploadToServer(base64, file.name);
      editingAlbum.coverImage = url;
      toastStore.showToast('Foto sampul berhasil diunggah ke server!', 'success');
    } catch (err: unknown) {
      // Kembalikan ke nilai sebelumnya — jangan biarkan base64 gagal masuk ke data simpan
      editingAlbum.coverImage = prevCover;
      toastStore.showToast('Upload foto sampul gagal: ' + errorMessage(err), 'error');
    } finally {
      uploadingCover = false;
      if (coverInputEl) coverInputEl.value = '';
    }
  }

  /** Upload banyak foto sekaligus ke dalam album. */
  async function handlePhotosUpload(e: Event & { currentTarget: HTMLInputElement }) {
    const files = Array.from(e.currentTarget.files || []);
    if (files.length === 0 || !editingAlbum) return;

    const validFiles = files.filter(validateImageFile);
    if (validFiles.length === 0) {
      if (photoInputEl) photoInputEl.value = '';
      return;
    }

    uploadingPhotos = true;
    uploadProgress = { done: 0, total: validFiles.length };
    let okCount = 0;
    try {
      for (const file of validFiles) {
        const tempId = `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        try {
          const base64 = await processImageFile(file);
          // Pratinjau lokal langsung
          editingAlbum.images = [...(editingAlbum.images || []), { id: tempId, url: base64, caption: '' }];
          const url = await uploadToServer(base64, file.name);
          // Ganti pratinjau lokal dengan URL server
          editingAlbum.images = (editingAlbum.images || []).map((img) =>
            img.id === tempId ? { ...img, url } : img
          );
          okCount += 1;
        } catch (err: unknown) {
          // Hapus entri yang gagal — jangan biarkan base64 gagal masuk ke data simpan
          editingAlbum.images = (editingAlbum.images || []).filter((img) => img.id !== tempId);
          toastStore.showToast(`"${file.name}": ` + errorMessage(err), 'error');
        } finally {
          uploadProgress = { done: uploadProgress.done + 1, total: validFiles.length };
        }
      }
      if (okCount > 0) {
        toastStore.showToast(`${okCount} foto berhasil diunggah ke server!`, 'success');
      }
    } finally {
      uploadingPhotos = false;
      uploadProgress = { done: 0, total: 0 };
      if (photoInputEl) photoInputEl.value = '';
    }
  }

  function handleDeletePhoto(id: string) {
    if (!editingAlbum) return;
    editingAlbum.images = (editingAlbum.images || []).filter((img) => img.id !== id);
  }

  async function handleSave(e: SubmitEvent) {
    e.preventDefault();
    const user = authStore.user;
    if (!user || !editingAlbum) return;

    if (!editingAlbum.title?.trim()) {
      toastStore.showToast('Judul Album Galeri wajib diisi!', 'error');
      return;
    }

    // Jangan simpan saat upload masih berjalan (hindari URL base64 sementara tersimpan)
    if (uploadingCover || uploadingPhotos) {
      toastStore.showToast('Tunggu hingga semua foto selesai diunggah.', 'warning');
      return;
    }

    // Tolak payload yang masih mengandung base64 (upload gagal yang lolos)
    const hasBase64Cover = (editingAlbum.coverImage || '').startsWith('data:image/');
    const hasBase64Photo = (editingAlbum.images || []).some((img) => (img.url || '').startsWith('data:image/'));
    if (hasBase64Cover || hasBase64Photo) {
      toastStore.showToast('Ada foto yang gagal diunggah. Hapus foto tersebut lalu coba lagi.', 'error');
      return;
    }

    saving = true;
    try {
      const actor = {
        id: user.uid,
        email: user.email,
        name: user.displayName
      };
      if (editingAlbum.id) {
        await galleryService.updateAlbum(editingAlbum.id, editingAlbum, actor);
        toastStore.showToast(`Album galeri "${editingAlbum.title}" berhasil diperbarui.`);
      } else {
        await galleryService.createAlbum(editingAlbum, actor);
        toastStore.showToast(`Album galeri "${editingAlbum.title}" berhasil dibuat.`);
      }
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
    const deletedId = albumToDelete.id;
    try {
      await galleryService.deleteAlbum(deletedId, {
        id: user.uid,
        email: user.email,
        name: user.displayName
      });
      toastStore.showToast(`Album "${albumToDelete.title}" dihapus.`);
      // Update UI langsung tanpa perlu reload dari server
      albums = albums.filter((a) => a.id !== deletedId);
      deleteModalOpen = false;
      albumToDelete = null;
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
              onclick={() => handleOpenEdit(album)}
              class="p-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400"
              title="Edit Album"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
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
  title={editingAlbum?.id ? "Edit Album Galeri" : "Buat Album Galeri Baru"}
>
  {#snippet footer()}
    <Button variant="secondary" onclick={() => (isModalOpen = false)}>Batal</Button>
    <Button variant="primary" onclick={handleSave} isLoading={saving} disabled={saving || uploadingCover || uploadingPhotos}>Simpan Album</Button>
  {/snippet}
  {#if editingAlbum}
  {#key modalKey}
    <form onsubmit={handleSave} class="space-y-4">
      <Input
        label="Judul Album Foto *"
        placeholder="Contoh: Gedung dan Sarana Prasarana Layanan Utama"
        defaultValue={editingAlbum.title || ''}
        oninput={(e) => { if (editingAlbum) editingAlbum.title = e.currentTarget.value; }}
        required
      />

      <div>
        <Input
          label="Gambar Sampul (Cover Image URL) *"
          placeholder="https://... atau unggah foto"
          defaultValue={editingAlbum.coverImage || ''}
          oninput={(e) => { if (editingAlbum) editingAlbum.coverImage = e.currentTarget.value; }}
          required
        />
        <div class="flex items-center gap-3 mt-2">
          {#if editingAlbum.coverImage}
            <img
              src={editingAlbum.coverImage}
              alt="Pratinjau sampul"
              class="w-20 h-14 object-cover rounded-xl border border-[var(--color-border)]"
            />
          {/if}
          <input
            type="file"
            accept="image/*"
            class="hidden"
            bind:this={coverInputEl}
            onchange={handleCoverUpload}
          />
          <Button
            type="button"
            variant="secondary"
            onclick={() => coverInputEl?.click()}
            disabled={uploadingCover}
          >
            {#if uploadingCover}
              <Loader2 class="w-4 h-4 animate-spin" />
              Mengunggah...
            {:else}
              <Upload class="w-4 h-4" />
              Upload Foto Sampul
            {/if}
          </Button>
        </div>
        <p class="text-[10px] text-[var(--color-muted-foreground)] mt-1.5">
          Foto tersimpan di server VPS (folder <span class="font-mono">dist/uploads/</span>) dan otomatis tampil sebagai sampul album.
        </p>
      </div>

      <Input
        label="Deskripsi Album"
        placeholder="Keterangan foto kegiatan..."
        defaultValue={editingAlbum.description || ''}
        oninput={(e) => { if (editingAlbum) editingAlbum.description = e.currentTarget.value; }}
      />

      <!-- Foto Album -->
      <div class="pt-2 border-t border-[var(--color-border)]">
        <div class="flex items-center justify-between mb-3">
          <div>
            <p class="text-xs font-bold text-[var(--color-text)]">
              Foto Album ({(editingAlbum.images || []).length})
            </p>
            <p class="text-[10px] text-[var(--color-muted-foreground)]">
              Unggah banyak foto sekaligus, beri caption tiap foto.
            </p>
          </div>
          <input
            type="file"
            accept="image/*"
            multiple
            class="hidden"
            bind:this={photoInputEl}
            onchange={handlePhotosUpload}
          />
          <Button
            type="button"
            variant="secondary"
            onclick={() => photoInputEl?.click()}
            disabled={uploadingPhotos}
          >
            {#if uploadingPhotos}
              <Loader2 class="w-4 h-4 animate-spin" />
              {uploadProgress.done}/{uploadProgress.total}
            {:else}
              <Plus class="w-4 h-4" />
              Tambah Foto
            {/if}
          </Button>
        </div>

        {#if uploadingPhotos}
          <div class="flex items-center gap-2 text-xs text-[var(--color-muted-foreground)] mb-3">
            <Loader2 class="w-4 h-4 animate-spin" />
            Mengunggah foto {uploadProgress.done + 1} dari {uploadProgress.total}...
          </div>
        {/if}

        {#if (editingAlbum.images || []).length === 0}
          <p class="text-xs text-[var(--color-muted-foreground)] text-center py-6 border border-dashed border-[var(--color-border)] rounded-2xl">
            Belum ada foto. Klik "Tambah Foto" untuk mengunggah.
          </p>
        {:else}
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[320px] overflow-y-auto pr-1">
            {#each editingAlbum.images || [] as img (img.id)}
              <div class="relative group rounded-2xl overflow-hidden border border-[var(--color-border)] bg-[var(--color-bg)]">
                <img
                  src={img.url}
                  alt={img.caption || 'Foto album'}
                  class="w-full h-28 object-cover"
                  loading="lazy"
                />
                <button
                  type="button"
                  onclick={() => handleDeletePhoto(img.id)}
                  class="absolute top-1.5 right-1.5 p-1.5 rounded-xl bg-black/70 text-red-300 transition"
                  title="Hapus foto"
                >
                  <X class="w-3.5 h-3.5" />
                </button>
                <div class="p-1.5">
                  <Input
                    placeholder="Caption foto..."
                    defaultValue={img.caption || ''}
                    oninput={(e) => { img.caption = e.currentTarget.value; }}
                  />
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </form>
  {/key}
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
