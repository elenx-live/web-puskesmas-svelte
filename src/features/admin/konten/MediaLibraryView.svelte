<!-- @component Media library — unggah, cari, dan hapus gambar/dokumen pendukung website. -->
<script lang="ts">
  import { Upload, Search, Trash2, ExternalLink, CheckCircle2 } from 'lucide-svelte';
  import Card from '../../../shared/ui/Card.svelte';
  import Button from '../../../shared/ui/Button.svelte';
  import Input from '../../../shared/ui/Input.svelte';
  import Select from '../../../shared/ui/Select.svelte';
  import Modal from '../../../shared/ui/Modal.svelte';
  import ConfirmModal from '../../../shared/components/ConfirmModal.svelte';
  import { authStore } from '../../../shared/stores/auth.svelte.js';
  import { toastStore } from '../../../shared/stores/toast.svelte.js';
  import { apiFetch } from '../../../shared/lib/api.js';
  import { mediaService } from '../../../shared/services/mediaService.js';
  import type { MediaItem } from '../../../shared/types/index.js';

  let mediaList = $state<MediaItem[]>([]);
  let search = $state('');
  let categoryFilter = $state('');
  let loading = $state(true);

  // Upload Modal
  let isUploadOpen = $state(false);
  let fileName = $state('');
  let fileUrl = $state('');
  let fileCategory = $state('Gedung & Sarana');
  let uploading = $state(false);
  let uploadingFile = $state(false);
  let fileInput = $state<HTMLInputElement | undefined>(undefined);

  // Delete Confirm
  let deleteModalOpen = $state(false);
  let selectedMedia = $state<MediaItem | null>(null);

  async function handleDeviceFileUpload(e: Event & { currentTarget: HTMLInputElement }) {
    const file = e.currentTarget.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toastStore.showToast('Harap pilih berkas gambar yang valid', 'error');
      if (fileInput) fileInput.value = '';
      return;
    }

    uploadingFile = true;
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const rawBase64 = reader.result as string;
          fileName = file.name;
          fileUrl = rawBase64;

          const res = await apiFetch('/api/upload-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageBase64: rawBase64,
              fileName: file.name.replace(/\.[^/.]+$/, '')
            })
          });

          const data = await res.json();
          if (data.success && data.url) {
            fileUrl = data.url;
            toastStore.showToast('Berkas foto berhasil diunggah ke server!', 'success');
          }
        } catch (err: any) {
          toastStore.showToast('Berkas dimuat secara lokal: ' + err.message, 'info');
        } finally {
          uploadingFile = false;
          if (fileInput) fileInput.value = '';
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      uploadingFile = false;
      toastStore.showToast('Gagal memproses berkas gambar', 'error');
      if (fileInput) fileInput.value = '';
    }
  }

  async function loadMedia() {
    loading = true;
    try {
      mediaList = await mediaService.getMediaList(categoryFilter, search);
    } catch {
      toastStore.showToast('Gagal memuat media library', 'error');
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    loadMedia();
  });

  async function handleAddMedia(e: SubmitEvent) {
    e.preventDefault();
    const user = authStore.user;
    if (!user) return;
    uploading = true;

    try {
      await mediaService.addMedia(
        {
          name: fileName,
          url: fileUrl || 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=800',
          mimeType: 'image/jpeg',
          size: 1500000,
          category: fileCategory
        },
        {
          id: user.uid,
          email: user.email,
          name: user.displayName
        }
      );

      toastStore.showToast(`Berkas ${fileName} berhasil ditambahkan.`);
      isUploadOpen = false;
      fileName = '';
      fileUrl = '';
      loadMedia();
    } catch (err: any) {
      toastStore.showToast(err.message || 'Gagal mengunggah media', 'error');
    } finally {
      uploading = false;
    }
  }

  async function handleDelete() {
    const user = authStore.user;
    if (!user || !selectedMedia) return;
    uploading = true;

    try {
      await mediaService.deleteMedia(selectedMedia.id, {
        id: user.uid,
        email: user.email,
        name: user.displayName
      });

      toastStore.showToast(`Berkas ${selectedMedia.fileName} dihapus.`);
      deleteModalOpen = false;
      selectedMedia = null;
      loadMedia();
    } catch (err: any) {
      toastStore.showToast(err.message || 'Gagal menghapus media', 'error');
    } finally {
      uploading = false;
    }
  }
</script>

<!-- Top Controls -->
<div class="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[var(--color-card)] border border-[var(--color-border)] p-4 rounded-3xl">
  <div class="flex items-center gap-3 w-full sm:w-auto flex-1">
    <div class="relative w-full max-w-xs">
      <Search class="w-4 h-4 text-[var(--color-muted-foreground)] absolute left-3 top-1/2 -translate-y-1/2" />
      <input
        type="text"
        placeholder="Cari nama berkas..."
        bind:value={search}
        class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)]/70 focus:outline-none rounded-2xl pl-9 pr-4 py-2 text-xs text-[var(--color-text)] placeholder-zinc-600"
      />
    </div>

    <div class="w-48">
      <Select
        bind:value={categoryFilter}
        options={[
          { value: '', label: 'Semua Kategori' },
          { value: 'Gedung & Sarana', label: 'Gedung & Sarana' },
          { value: 'Identitas Visual', label: 'Identitas Visual' },
          { value: 'Pelayanan', label: 'Pelayanan' },
          { value: 'Umum', label: 'Umum' },
        ]}
      />
    </div>
  </div>

  <Button onclick={() => (isUploadOpen = true)} variant="primary">
    <Upload class="w-4 h-4" />
    Unggah Berkas Baru
  </Button>
</div>

<!-- Media Grid -->
<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
  {#if loading}
    <div class="col-span-full p-8 text-center text-[var(--color-muted-foreground)]">Memuat media library...</div>
  {:else if mediaList.length === 0}
    <div class="col-span-full p-8 text-center text-[var(--color-muted-foreground)]">Tidak ada media ditemukan.</div>
  {:else}
    {#each mediaList as item (item.id)}
      <Card class="p-4 space-y-3 flex flex-col justify-between group">
        <div class="space-y-3">
          <div class="aspect-video bg-[var(--color-bg)] rounded-2xl overflow-hidden relative border border-[var(--color-border)]">
            <img
              src={item.fileUrl}
              alt={item.fileName}
              class="w-full h-full object-cover group-hover:scale-105 transition duration-300"
            />
            <span class="absolute top-2 left-2 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg bg-black/70 backdrop-blur-md text-[var(--color-primary)] border border-[var(--color-primary)]/30">
              {item.category || 'Umum'}
            </span>
          </div>

          <div>
            <div class="text-xs font-bold text-[var(--color-text)] truncate">{item.fileName}</div>
            <div class="text-[10px] text-[var(--color-muted-foreground)]">
              {(item.size / 1024 / 1024).toFixed(2)} MB • {new Date(item.createdAt).toLocaleDateString('id-ID')}
            </div>
          </div>
        </div>

        <div class="pt-3 border-t border-[var(--color-border)] flex items-center justify-between">
          <a
            href={item.fileUrl}
            target="_blank"
            rel="noreferrer"
            class="p-1.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:text-[var(--color-text)] transition"
            title="Lihat Gambar"
          >
            <ExternalLink class="w-3.5 h-3.5" />
          </a>

          <button
            onclick={() => {
              selectedMedia = item;
              deleteModalOpen = true;
            }}
            class="p-1.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition"
            title="Hapus Media"
          >
            <Trash2 class="w-3.5 h-3.5" />
          </button>
        </div>
      </Card>
    {/each}
  {/if}
</div>

<!-- Upload Modal -->
<Modal
  isOpen={isUploadOpen}
  onClose={() => (isUploadOpen = false)}
  title="Unggah Media Baru"
>
  {#snippet footer()}
    <Button variant="secondary" onclick={() => (isUploadOpen = false)}>
      Batal
    </Button>
    <Button variant="primary" onclick={handleAddMedia} isLoading={uploading}>
      Simpan ke Media Library
    </Button>
  {/snippet}
  <form onsubmit={handleAddMedia} class="space-y-4">
    <div>
      <label class="block text-xs font-semibold text-[var(--color-text)] mb-1.5">
        Unggah Berkas Langsung Dari Komputer / HP
      </label>
      <input
        type="file"
        bind:this={fileInput}
        onchange={handleDeviceFileUpload}
        accept="image/jpeg,image/png,image/webp,image/gif"
        class="hidden"
      />
      <Button
        type="button"
        variant="secondary"
        onclick={() => fileInput?.click()}
        disabled={uploadingFile}
        isLoading={uploadingFile}
        class="w-full text-xs gap-2 border-[var(--color-border)] hover:border-[var(--color-primary)]/50"
      >
        <Upload class="w-3.5 h-3.5 text-[var(--color-primary)]" />
        {uploadingFile ? 'Mengunggah Berkas Foto...' : 'Pilih Berkas Foto dari Perangkat'}
      </Button>
    </div>

    {#if fileUrl}
      <div class="p-2.5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center gap-3">
        <div class="w-20 h-14 rounded-xl overflow-hidden bg-black/40 flex-shrink-0 border border-white/10">
          <img
            src={fileUrl}
            alt="Pratinjau Berkas"
            class="w-full h-full object-cover"
            referrerpolicy="no-referrer"
          />
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-[11px] font-semibold text-[var(--color-text)] truncate flex items-center gap-1">
            <CheckCircle2 class="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            Berkas Siap Digunakan
          </p>
          <p class="text-[10px] text-zinc-400 truncate mt-0.5 font-mono">
            {fileUrl.startsWith('data:') ? 'Unggahan Lokal' : fileUrl}
          </p>
        </div>
      </div>
    {/if}

    <Input
      label="Nama Berkas *"
      placeholder="Gedung_Baru_Puskesmas.jpg"
      bind:value={fileName}
      required
    />

    <Input
      label="Atau Gunakan URL Gambar Eksternal"
      placeholder="https://images.unsplash.com/..."
      bind:value={fileUrl}
      helperText="Otomatis terisi jika mengunggah berkas di atas"
    />

    <Select
      label="Kategori Media"
      bind:value={fileCategory}
      options={[
        { value: 'Gedung & Sarana', label: 'Gedung & Sarana' },
        { value: 'Identitas Visual', label: 'Identitas Visual' },
        { value: 'Pelayanan', label: 'Pelayanan' },
        { value: 'Umum', label: 'Umum' },
      ]}
    />
  </form>
</Modal>

<!-- Delete Confirmation -->
<ConfirmModal
  isOpen={deleteModalOpen}
  onClose={() => (deleteModalOpen = false)}
  onConfirm={handleDelete}
  isLoading={uploading}
  title="Hapus Media"
  message={`Apakah Anda yakin ingin menghapus berkas "${selectedMedia?.fileName}" dari Media Library?`}
/>
