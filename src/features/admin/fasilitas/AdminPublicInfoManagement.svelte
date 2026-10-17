<!-- @component Manajemen informasi publik & transparansi (PPID): daftar, filter kategori, editor, pratinjau publik, hapus. -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { authStore } from '../../../shared/stores/auth.svelte.js';
  import { toastStore } from '../../../shared/stores/toast.svelte.js';
  import { publicInfoService } from '../../../shared/services/publicInfoService.js';
  import type {
    PublicInfoEntity,
    PublicInfoCategory,
    PublicInfoStatus,
    InformationInfoStatusType,
  } from '../../../shared/types/index.js';
  import Card from '../../../shared/ui/Card.svelte';
  import ConfirmModal from '../../../shared/components/ConfirmModal.svelte';
  import { Plus, Search, Edit3, Trash2, Eye, X } from 'lucide-svelte';

  const CATEGORIES: PublicInfoCategory[] = [
    'Profil Puskesmas',
    'Layanan',
    'Standar Pelayanan',
    'Persyaratan',
    'Tarif',
    'Jadwal',
    'Dokumen',
    'Pengumuman',
    'Statistik Pelayanan',
    'Informasi Publik Lainnya',
    'Informasi Berkala',
    'Informasi Serta-Merta',
    'Informasi Setiap Saat',
  ];

  let infos = $state<PublicInfoEntity[]>([]);
  let loading = $state(true);
  let search = $state('');
  let selectedCategory = $state('');

  // Modal State
  let isModalOpen = $state(false);
  let editingId = $state<string | null>(null);
  let title = $state('');
  let category = $state<PublicInfoCategory>('Profil Puskesmas');
  let summary = $state('');
  let content = $state('');
  let status = $state<PublicInfoStatus>('Published');
  let infoStatus = $state<InformationInfoStatusType>('Tersedia');
  let updatePeriod = $state('Bulanan');

  // Delete Confirm Modal
  let deleteModalOpen = $state(false);
  let infoToDelete = $state<PublicInfoEntity | null>(null);
  let deleting = $state(false);

  function getActor() {
    const user = authStore.user;
    return {
      id: user?.uid || 'usr-admin',
      name: user?.displayName || 'Administrator',
      email: user?.email || 'admin@puskesmas.id',
    };
  }

  async function loadData() {
    loading = true;
    try {
      const data = await publicInfoService.getPublicInfos(
        selectedCategory || undefined,
        undefined,
        search
      );
      infos = data;
    } catch (e) {
      console.error(e);
      toastStore.showToast('Gagal memuat informasi publik', 'error');
    } finally {
      loading = false;
    }
  }

  function handleOpenCreate() {
    editingId = null;
    title = '';
    category = 'Profil Puskesmas';
    summary = '';
    content = '';
    status = 'Published';
    infoStatus = 'Tersedia';
    updatePeriod = 'Bulanan';
    isModalOpen = true;
  }

  function handleOpenEdit(item: PublicInfoEntity) {
    editingId = item.id;
    title = item.title;
    category = item.category;
    summary = item.summary;
    content = item.content;
    status = item.status;
    infoStatus = item.infoStatus || 'Tersedia';
    updatePeriod = item.updatePeriod || 'Bulanan';
    isModalOpen = true;
  }

  async function handleSave(e: SubmitEvent) {
    e.preventDefault();
    try {
      const actor = getActor();
      if (editingId) {
        await publicInfoService.updatePublicInfo(
          editingId,
          { title, category, summary, content, status, infoStatus, updatePeriod },
          actor
        );
        toastStore.showToast('Informasi publik berhasil diperbarui', 'success');
      } else {
        await publicInfoService.addPublicInfo(
          {
            title,
            category,
            summary,
            content,
            status,
            infoStatus,
            updatePeriod,
            publicationDate: new Date().toISOString(),
          },
          actor
        );
        toastStore.showToast('Informasi publik berhasil ditambahkan', 'success');
      }
      isModalOpen = false;
      loadData();
    } catch (e: any) {
      toastStore.showToast(e.message || 'Gagal menyimpan informasi', 'error');
    }
  }

  function handleDeleteClick(item: PublicInfoEntity) {
    infoToDelete = item;
    deleteModalOpen = true;
  }

  async function handleDelete() {
    if (!infoToDelete) return;
    deleting = true;
    try {
      await publicInfoService.deletePublicInfo(infoToDelete.id, getActor());
      toastStore.showToast('Informasi publik berhasil dihapus', 'success');
      deleteModalOpen = false;
      infoToDelete = null;
      loadData();
    } catch (e) {
      toastStore.showToast('Gagal menghapus informasi', 'error');
    } finally {
      deleting = false;
    }
  }

  onMount(() => {
    loadData();
  });

  $effect(() => {
    const s = search;
    const c = selectedCategory;
    void s;
    void c;
    loadData();
  });
</script>

<div class="space-y-6 max-w-7xl mx-auto">
  <!-- Top Header -->
  <div
    class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--color-card)] border border-[var(--color-border)] p-6 rounded-3xl"
  >
    <div class="space-y-1">
      <span class="text-[10px] font-bold uppercase tracking-widest text-[var(--color-primary)]"
        >Modul 5I</span
      >
      <h1 class="text-xl font-bold text-[var(--color-text)]">Kelola Informasi Publik & Transparansi</h1>
      <p class="text-xs text-[var(--color-muted-foreground)]">
        Kelola direktori informasi publik PPID, profil, standar pelayanan, dan laporan berkala.
      </p>
    </div>
    <button
      onclick={handleOpenCreate}
      class="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-[var(--color-primary)] text-[var(--color-primary-foreground)] text-xs font-semibold shadow-lg transition flex items-center gap-2 shrink-0"
    >
      <Plus class="w-4 h-4" /> Tambah Informasi Publik
    </button>
  </div>

  <!-- Filters -->
  <div class="flex flex-col md:flex-row gap-4 items-center justify-between">
    <div class="relative w-full md:w-80">
      <Search class="w-4 h-4 text-[var(--color-muted-foreground)] absolute left-3 top-1/2 -translate-y-1/2" />
      <input
        type="text"
        placeholder="Cari judul informasi..."
        bind:value={search}
        class="w-full bg-[var(--color-card)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none rounded-2xl pl-9 pr-4 py-2.5 text-xs text-[var(--color-text)] placeholder-zinc-500"
      />
    </div>

    <select
      bind:value={selectedCategory}
      class="w-full md:w-auto bg-[var(--color-card)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none rounded-2xl px-4 py-2.5 text-xs text-[var(--color-text)]"
    >
      <option value="">Semua Kategori</option>
      {#each CATEGORIES as cat (cat)}
        <option value={cat}>{cat}</option>
      {/each}
    </select>
  </div>

  <!-- Table -->
  <Card class="border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden shadow-xl">
    {#if loading}
      <div class="p-12 text-center text-[var(--color-muted-foreground)] font-mono text-xs">
        Memuat data...
      </div>
    {:else if infos.length === 0}
      <div class="p-12 text-center text-[var(--color-muted-foreground)] text-xs">
        Tidak ada data informasi publik.
      </div>
    {:else}
      <div class="overflow-x-auto">
        <table class="w-full text-xs text-left text-[var(--color-text)]">
          <thead
            class="bg-[var(--color-bg)] text-[10px] font-bold uppercase text-[var(--color-muted-foreground)] border-b border-[var(--color-border)]"
          >
            <tr>
              <th class="px-6 py-4">Informasi / Judul</th>
              <th class="px-6 py-4">Kategori</th>
              <th class="px-6 py-4">Status PPID</th>
              <th class="px-6 py-4">Publikasi</th>
              <th class="px-6 py-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[var(--color-border)]">
            {#each infos as item (item.id)}
              <tr class="hover:bg-[var(--color-card)] transition">
                <td class="px-6 py-4 space-y-1 max-w-md">
                  <div class="font-semibold text-[var(--color-text)]">{item.title}</div>
                  <div class="text-[var(--color-muted-foreground)] text-[11px] line-clamp-1">
                    {item.summary}
                  </div>
                </td>
                <td class="px-6 py-4">
                  <span
                    class="px-2.5 py-1 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20 text-[10px] font-semibold"
                  >
                    {item.category}
                  </span>
                </td>
                <td class="px-6 py-4">
                  <span
                    class={`px-2.5 py-1 rounded-lg text-[10px] font-semibold ${
                      item.status === 'Published'
                        ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20'
                        : 'bg-[var(--color-card)]/10 text-[var(--color-muted-foreground)] border border-zinc-500/20'
                    }`}
                  >
                    {item.status} ({item.infoStatus || 'Tersedia'})
                  </span>
                </td>
                <td class="px-6 py-4 text-[var(--color-muted-foreground)] font-mono text-[11px]">
                  {new Date(item.publicationDate).toLocaleDateString('id-ID')}
                </td>
                <td class="px-6 py-4 text-right space-x-2">
                  <a
                    href={`#/informasi-publik/${item.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    class="p-2 rounded-xl bg-[var(--color-bg)] text-[var(--color-muted-foreground)] hover:text-[var(--color-text)] inline-flex items-center"
                    title="Lihat Publik"
                  >
                    <Eye class="w-3.5 h-3.5" />
                  </a>
                  <button
                    onclick={() => handleOpenEdit(item)}
                    class="p-2 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20 inline-flex items-center"
                    title="Edit"
                  >
                    <Edit3 class="w-3.5 h-3.5" />
                  </button>
                  <button
                    onclick={() => handleDeleteClick(item)}
                    class="p-2 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 inline-flex items-center"
                    title="Hapus"
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </Card>

  <!-- Modal Create/Edit -->
  {#if isModalOpen}
    <div class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        class="bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl max-w-2xl w-full p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div class="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
          <h3 class="text-lg font-bold text-[var(--color-text)]">
            {editingId ? 'Edit Informasi Publik' : 'Tambah Informasi Publik Baru'}
          </h3>
          <button
            onclick={() => (isModalOpen = false)}
            class="text-[var(--color-muted-foreground)] hover:text-[var(--color-text)]"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <form onsubmit={handleSave} class="space-y-4">
          <div class="space-y-1">
            <label class="text-xs font-medium text-[var(--color-text)]">Judul Informasi</label>
            <input
              type="text"
              required
              bind:value={title}
              class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none rounded-2xl px-4 py-2.5 text-xs text-[var(--color-text)]"
            />
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-1">
              <label class="text-xs font-medium text-[var(--color-text)]">Kategori</label>
              <select
                bind:value={category}
                class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none rounded-2xl px-4 py-2.5 text-xs text-[var(--color-text)]"
              >
                {#each CATEGORIES as cat (cat)}
                  <option value={cat}>{cat}</option>
                {/each}
              </select>
            </div>

            <div class="space-y-1">
              <label class="text-xs font-medium text-[var(--color-text)]">Status Publikasi</label>
              <select
                bind:value={status}
                class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none rounded-2xl px-4 py-2.5 text-xs text-[var(--color-text)]"
              >
                <option value="Published">Published (Tayang)</option>
                <option value="Draft">Draft</option>
                <option value="Unpublished">Unpublished</option>
                <option value="Archived">Archived</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-1">
              <label class="text-xs font-medium text-[var(--color-text)]">Ketersediaan Dokumen/Info</label>
              <select
                bind:value={infoStatus}
                class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none rounded-2xl px-4 py-2.5 text-xs text-[var(--color-text)]"
              >
                <option value="Tersedia">Tersedia</option>
                <option value="Dalam Pembaruan">Dalam Pembaruan</option>
                <option value="Tidak Tersedia">Tidak Tersedia</option>
              </select>
            </div>

            <div class="space-y-1">
              <label class="text-xs font-medium text-[var(--color-text)]">Periode Pembaruan</label>
              <input
                type="text"
                bind:value={updatePeriod}
                placeholder="Contoh: Bulanan, Tahunan"
                class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none rounded-2xl px-4 py-2.5 text-xs text-[var(--color-text)]"
              />
            </div>
          </div>

          <div class="space-y-1">
            <label class="text-xs font-medium text-[var(--color-text)]">Ringkasan (Excerpt)</label>
            <textarea
              rows={2}
              bind:value={summary}
              class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none rounded-2xl p-3 text-xs text-[var(--color-text)]"
            ></textarea>
          </div>

          <div class="space-y-1">
            <label class="text-xs font-medium text-[var(--color-text)]">Konten Lengkap (HTML)</label>
            <textarea
              rows={6}
              bind:value={content}
              class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none rounded-2xl p-3 text-xs text-[var(--color-text)] font-mono"
            ></textarea>
          </div>

          <div class="flex justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
            <button
              type="button"
              onclick={() => (isModalOpen = false)}
              class="px-5 py-2.5 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:text-[var(--color-text)] text-xs font-medium"
            >
              Batal
            </button>
            <button
              type="submit"
              class="px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-[var(--color-primary)] text-[var(--color-primary-foreground)] text-xs font-semibold shadow-lg"
            >
              Simpan Informasi
            </button>
          </div>
        </form>
      </div>
    </div>
  {/if}
</div>

<!-- Delete Confirmation Modal -->
<ConfirmModal
  isOpen={deleteModalOpen}
  onClose={() => (deleteModalOpen = false)}
  onConfirm={handleDelete}
  isLoading={deleting}
  title="Hapus Informasi Publik"
  message={`Apakah Anda yakin ingin menghapus informasi publik "${infoToDelete?.title}"?`}
/>
