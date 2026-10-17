<!-- @component Manajemen pengumuman resmi — daftar, buat, dan hapus pengumuman publik. -->
<script lang="ts">
  import { Megaphone, Plus, Trash2, Save } from 'lucide-svelte';
  import Card from '../../../shared/ui/Card.svelte';
  import Button from '../../../shared/ui/Button.svelte';
  import Input from '../../../shared/ui/Input.svelte';
  import Select from '../../../shared/ui/Select.svelte';
  import Badge from '../../../shared/ui/Badge.svelte';
  import Modal from '../../../shared/ui/Modal.svelte';
  import ConfirmModal from '../../../shared/components/ConfirmModal.svelte';
  import { authStore } from '../../../shared/stores/auth.svelte.js';
  import { toastStore } from '../../../shared/stores/toast.svelte.js';
  import { announcementService } from '../../../shared/services/announcementService.js';
  import type { AnnouncementEntity, PriorityLevel } from '../../../shared/types/index.js';

  let announcements = $state<AnnouncementEntity[]>([]);
  let loading = $state(true);

  // Form Modal
  let isModalOpen = $state(false);
  let editingAnn = $state<Partial<AnnouncementEntity> | null>(null);
  let saving = $state(false);

  // Delete Modal
  let deleteModalOpen = $state(false);
  let annToDelete = $state<AnnouncementEntity | null>(null);

  async function loadData() {
    loading = true;
    try {
      announcements = await announcementService.getAnnouncements();
    } catch {
      toastStore.showToast('Gagal memuat daftar pengumuman', 'error');
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    loadData();
  });

  function handleOpenCreate() {
    editingAnn = {
      title: '',
      content: '',
      priority: 'normal',
      status: 'published'
    };
    isModalOpen = true;
  }

  async function handleSave(e: SubmitEvent) {
    e.preventDefault();
    const user = authStore.user;
    if (!user || !editingAnn) return;

    if (!editingAnn.title?.trim() || !editingAnn.content?.trim()) {
      toastStore.showToast('Judul dan Isi Pengumuman wajib diisi!', 'error');
      return;
    }

    saving = true;
    try {
      await announcementService.createAnnouncement(editingAnn, {
        id: user.uid,
        email: user.email,
        name: user.displayName
      });
      toastStore.showToast('Pengumuman baru berhasil dipublikasikan.');
      isModalOpen = false;
      editingAnn = null;
      loadData();
    } catch (err: any) {
      toastStore.showToast(err.message || 'Gagal menyimpan pengumuman', 'error');
    } finally {
      saving = false;
    }
  }

  async function handleDelete() {
    const user = authStore.user;
    if (!user || !annToDelete) return;
    saving = true;
    try {
      await announcementService.deleteAnnouncement(annToDelete.id, {
        id: user.uid,
        email: user.email,
        name: user.displayName
      });
      toastStore.showToast(`Pengumuman "${annToDelete.title}" dihapus.`);
      deleteModalOpen = false;
      annToDelete = null;
      loadData();
    } catch (err: any) {
      toastStore.showToast(err.message || 'Gagal menghapus pengumuman', 'error');
    } finally {
      saving = false;
    }
  }

  function priorityMeta(p: PriorityLevel): { variant: 'rose' | 'amber' | 'sky'; label: string } {
    if (p === 'urgent') return { variant: 'rose', label: 'Darurat / Urgent' };
    if (p === 'high') return { variant: 'amber', label: 'Penting / High' };
    return { variant: 'sky', label: 'Biasa / Normal' };
  }
</script>

<div class="flex items-center justify-between bg-[var(--color-card)] border border-[var(--color-border)] p-4 rounded-3xl">
  <div class="flex items-center gap-3">
    <div class="p-2.5 bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 text-[var(--color-primary)] rounded-2xl">
      <Megaphone class="w-5 h-5" />
    </div>
    <div>
      <h2 class="text-sm font-bold text-[var(--color-text)]">Pengumuman & Running Banner</h2>
      <p class="text-xs text-[var(--color-muted-foreground)]">Tampil otomatis di bagian teratas website publik dan beranda</p>
    </div>
  </div>

  {#if authStore.hasPermission('create_posts')}
    <Button onclick={handleOpenCreate} variant="primary">
      <Plus class="w-4 h-4" />
      Buat Pengumuman
    </Button>
  {/if}
</div>

<Card class="p-0 overflow-hidden">
  <div class="overflow-x-auto">
  <table class="w-full text-xs text-left text-[var(--color-text)]">
    <thead class="bg-[var(--color-bg)] text-[10px] font-bold uppercase text-[var(--color-muted-foreground)] border-b border-[var(--color-border)]">
      <tr>
        <th class="p-4">Judul & Pesan</th>
        <th class="p-4">Prioritas</th>
        <th class="p-4">Penulis & Tanggal</th>
        <th class="p-4 text-right">Tindakan</th>
      </tr>
    </thead>
    <tbody class="divide-y divide-[var(--color-border)]">
      {#if loading}
        <tr><td colspan={4} class="p-8 text-center text-[var(--color-muted-foreground)]">Memuat pengumuman...</td></tr>
      {:else if announcements.length === 0}
        <tr><td colspan={4} class="p-8 text-center text-[var(--color-muted-foreground)]">Belum ada pengumuman publik.</td></tr>
      {:else}
        {#each announcements as ann (ann.id)}
          <tr class="hover:bg-[var(--color-card)]/50 transition">
            <td class="p-4">
              <div class="font-bold text-[var(--color-text)] text-sm">{ann.title}</div>
              <div class="text-[11px] text-[var(--color-muted-foreground)] mt-0.5 line-clamp-2">{ann.content}</div>
            </td>
            <td class="p-4"><Badge variant={priorityMeta(ann.priority).variant}>{priorityMeta(ann.priority).label}</Badge></td>
            <td class="p-4">
              <div class="text-[var(--color-text)] font-semibold">{ann.createdBy.name}</div>
              <div class="text-[10px] text-[var(--color-muted-foreground)]">{new Date(ann.createdAt).toLocaleDateString('id-ID')}</div>
            </td>
            <td class="p-4 text-right">
              <button
                onclick={() => {
                  annToDelete = ann;
                  deleteModalOpen = true;
                }}
                class="p-1.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400"
              >
                <Trash2 class="w-3.5 h-3.5" />
              </button>
            </td>
          </tr>
        {/each}
      {/if}
    </tbody>
  </table>
  </div>
</Card>

<!-- Add Modal -->
<Modal
  isOpen={isModalOpen}
  onClose={() => (isModalOpen = false)}
  title="Buat Pengumuman Publik Baru"
>
  {#snippet footer()}
    <Button variant="secondary" onclick={() => (isModalOpen = false)}>
      Batal
    </Button>
    <Button variant="primary" onclick={handleSave} isLoading={saving}>
      <Save class="w-4 h-4" />
      Publikasikan
    </Button>
  {/snippet}
  {#if editingAnn}
    <form onsubmit={handleSave} class="space-y-4">
      <Input
        label="Judul Pengumuman *"
        placeholder="Contoh: Penyesuaian Jam Operasional Pelayanan..."
        bind:value={editingAnn.title}
        required
      />

      <Select
        label="Tingkat Prioritas"
        bind:value={editingAnn.priority}
        options={[
          { value: 'normal', label: 'Biasa (Informasi Umum)' },
          { value: 'high', label: 'Penting (Perubahan Layanan)' },
          { value: 'urgent', label: 'Urgent / Darurat (Running Text Merah)' }
        ]}
      />

      <div>
        <label class="block text-xs font-semibold text-[var(--color-text)] mb-1">Isi Pesan Pengumuman *</label>
        <textarea
          rows={4}
          bind:value={editingAnn.content}
          placeholder="Tuliskan pesan lengkap pengumuman untuk pengunjung..."
          class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)]/70 focus:outline-none rounded-2xl p-3 text-xs text-[var(--color-text)]"
          required
        ></textarea>
      </div>
    </form>
  {/if}
</Modal>

<!-- Delete Confirmation -->
<ConfirmModal
  isOpen={deleteModalOpen}
  onClose={() => (deleteModalOpen = false)}
  onConfirm={handleDelete}
  isLoading={saving}
  title="Hapus Pengumuman"
  message={`Hapus pengumuman "${annToDelete?.title}"?`}
/>
