<!-- @component Manajemen kategori layanan kesehatan (Phase 4B): cari, filter klaster/status, CRUD, toggle status, hapus. -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { authStore } from '../../../shared/stores/auth.svelte.js';
  import { toastStore } from '../../../shared/stores/toast.svelte.js';
  import { serviceEngineService } from '../../../shared/services/serviceEngineService.js';
  import type {
    ServiceCategoryEntity,
    ServiceClusterEntity,
    ActiveStatus,
  } from '../../../shared/types/index.js';
  import ConfirmModal from '../../../shared/components/ConfirmModal.svelte';
  import {
    Layers,
    Plus,
    Search,
    Filter,
    Edit,
    Trash2,
    CheckCircle2,
    XCircle,
    AlertCircle,
    RefreshCw,
    ChevronRight,
    Layers3,
  } from 'lucide-svelte';

  let categories = $state<ServiceCategoryEntity[]>([]);
  let clusters = $state<ServiceClusterEntity[]>([]);
  let loading = $state(true);
  let searchQuery = $state('');
  let statusFilter = $state('all');
  let clusterFilter = $state('all');

  // Form State
  let modalOpen = $state(false);
  let editingCategory = $state<ServiceCategoryEntity | null>(null);
  let formData = $state({
    name: '',
    slug: '',
    clusterId: '',
    description: '',
    status: 'active' as ActiveStatus,
    displayOrder: 1,
  });
  let formError = $state('');
  let saving = $state(false);

  // Delete & Usage State
  let deleteModalOpen = $state(false);
  let categoryToDelete = $state<ServiceCategoryEntity | null>(null);
  let deleteError = $state('');

  async function loadData() {
    loading = true;
    try {
      const cls = await serviceEngineService.getClusters();
      clusters = cls;

      const cats = await serviceEngineService.getCategories({
        search: searchQuery,
        status: statusFilter === 'all' ? undefined : statusFilter,
        clusterId: clusterFilter === 'all' ? undefined : clusterFilter,
      });
      categories = cats;
    } catch (err: any) {
      console.error('Error loading service categories:', err);
      toastStore.showToast('Gagal memuat data kategori layanan', 'error');
    } finally {
      loading = false;
    }
  }

  function handleOpenCreateModal() {
    editingCategory = null;
    formData = {
      name: '',
      slug: '',
      clusterId: clusters.length > 0 ? clusters[0].id : '',
      description: '',
      status: 'active',
      displayOrder: categories.length + 1,
    };
    formError = '';
    modalOpen = true;
  }

  function handleOpenEditModal(cat: ServiceCategoryEntity) {
    editingCategory = cat;
    formData = {
      name: cat.name,
      slug: cat.slug,
      clusterId: cat.clusterId || '',
      description: cat.description || '',
      status: cat.status,
      displayOrder: cat.displayOrder,
    };
    formError = '';
    modalOpen = true;
  }

  function handleNameChange(name: string) {
    if (!editingCategory) {
      const generated = name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
      formData = { ...formData, name, slug: generated };
    } else {
      formData = { ...formData, name };
    }
  }

  function getActor() {
    const user = authStore.user;
    return {
      id: user?.uid || 'usr-admin',
      email: user?.email || 'admin@puskesmas.go.id',
      name: user?.displayName || 'Administrator',
    };
  }

  async function handleSave(e: SubmitEvent) {
    e.preventDefault();
    if (!formData.name.trim()) {
      formError = 'Nama kategori wajib diisi.';
      return;
    }

    saving = true;
    formError = '';
    try {
      const actor = getActor();

      if (editingCategory) {
        await serviceEngineService.updateCategory(
          editingCategory.id,
          {
            name: formData.name.trim(),
            slug: formData.slug.trim(),
            clusterId: formData.clusterId,
            description: formData.description.trim(),
            status: formData.status,
            displayOrder: Number(formData.displayOrder) || 1,
          },
          actor
        );
        toastStore.showToast(`Kategori "${formData.name}" berhasil diperbarui`, 'success');
      } else {
        await serviceEngineService.createCategory(
          {
            name: formData.name.trim(),
            slug: formData.slug.trim(),
            clusterId: formData.clusterId,
            description: formData.description.trim(),
            status: formData.status,
            displayOrder: Number(formData.displayOrder) || 1,
          },
          actor
        );
        toastStore.showToast(`Kategori "${formData.name}" berhasil dibuat`, 'success');
      }

      modalOpen = false;
      loadData();
    } catch (err: any) {
      formError = err.message || 'Gagal menyimpan kategori layanan';
    } finally {
      saving = false;
    }
  }

  async function handleToggleStatus(cat: ServiceCategoryEntity) {
    try {
      const actor = getActor();
      const newStatus: ActiveStatus = cat.status === 'active' ? 'inactive' : 'active';
      await serviceEngineService.updateCategory(cat.id, { status: newStatus }, actor);
      toastStore.showToast(`Status kategori "${cat.name}" diubah menjadi ${newStatus}`, 'success');
      loadData();
    } catch (err: any) {
      toastStore.showToast(err.message || 'Gagal mengubah status kategori', 'error');
    }
  }

  function handleDeleteClick(cat: ServiceCategoryEntity) {
    categoryToDelete = cat;
    deleteError = '';
    deleteModalOpen = true;
  }

  async function handleDeleteConfirm() {
    if (!categoryToDelete) return;
    try {
      const actor = getActor();

      await serviceEngineService.deleteCategory(categoryToDelete.id, actor);
      toastStore.showToast(`Kategori "${categoryToDelete.name}" berhasil dihapus permanen`, 'success');
      deleteModalOpen = false;
      categoryToDelete = null;
      loadData();
    } catch (err: any) {
      deleteError = err.message || 'Gagal menghapus kategori';
    }
  }

  onMount(() => {
    loadData();
  });

  $effect(() => {
    const s = searchQuery;
    const st = statusFilter;
    const cl = clusterFilter;
    void s; void st; void cl;
    loadData();
  });
</script>

<div class="space-y-6">
  <div
    class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--color-card)] p-6 rounded-3xl border border-[var(--color-border)]"
  >
    <div>
      <div
        class="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-primary)] mb-1"
      >
        <span>Service Engine</span>
        <ChevronRight class="w-3 h-3 text-zinc-600" />
        <span>Phase 4B</span>
      </div>
      <h2 class="text-xl font-bold text-[var(--color-text)] tracking-tight flex items-center gap-2">
        <Layers class="w-6 h-6 text-[var(--color-primary)]" />
        <span>Kategori Layanan Kesehatan</span>
      </h2>
      <p class="text-xs text-[var(--color-muted-foreground)] mt-1">
        Pengelompokan jenis pelayanan medis dan kesehatan publik di Puskesmas.
      </p>
    </div>

    <div class="flex items-center gap-3">
      <button
        onclick={loadData}
        class="p-2.5 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:text-[var(--color-text)] transition"
        title="Refresh Data"
      >
        <RefreshCw class={`w-4 h-4 ${loading ? 'animate-spin text-[var(--color-primary)]' : ''}`} />
      </button>

      <button
        onclick={handleOpenCreateModal}
        class="px-4 py-2.5 rounded-2xl bg-[var(--color-primary)] hover:bg-amber-600 text-[var(--color-primary-foreground)] font-bold text-xs flex items-center gap-2 transition shadow-lg shadow-[var(--color-primary)]/20"
      >
        <Plus class="w-4 h-4 stroke-[3]" />
        <span>Tambah Kategori</span>
      </button>
    </div>
  </div>

  <!-- Search & Filter Bar -->
  <div
    class="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[var(--color-card)] p-4 rounded-2xl border border-[var(--color-border)]"
  >
    <div class="relative w-full sm:w-80">
      <Search class="w-4 h-4 absolute left-3.5 top-3 text-[var(--color-muted-foreground)]" />
      <input
        type="text"
        value={searchQuery}
        oninput={(e) => (searchQuery = e.currentTarget.value)}
        placeholder="Cari kategori..."
        class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl pl-10 pr-4 py-2 text-xs text-[var(--color-text)] placeholder-zinc-500 focus:outline-none focus:border-[var(--color-primary)]/50"
      />
    </div>

    <div class="flex items-center gap-3 w-full sm:w-auto">
      <div
        class="flex items-center gap-2 bg-[var(--color-bg)] border border-[var(--color-border)] px-3 py-1.5 rounded-xl text-xs"
      >
        <Filter class="w-3.5 h-3.5 text-[var(--color-muted-foreground)]" />
        <select
          bind:value={clusterFilter}
          class="bg-transparent text-[var(--color-text)] focus:outline-none"
        >
          <option value="all" class="bg-[var(--color-card)]">Semua Klaster</option>
          {#each clusters as cls (cls.id)}
            <option value={cls.id} class="bg-[var(--color-card)]">{cls.name}</option>
          {/each}
        </select>
      </div>

      <div
        class="flex items-center gap-2 bg-[var(--color-bg)] border border-[var(--color-border)] px-3 py-1.5 rounded-xl text-xs"
      >
        <select
          bind:value={statusFilter}
          class="bg-transparent text-[var(--color-text)] focus:outline-none"
        >
          <option value="all" class="bg-[var(--color-card)]">Semua Status</option>
          <option value="active" class="bg-[var(--color-card)]">Aktif</option>
          <option value="inactive" class="bg-[var(--color-card)]">Nonaktif</option>
          <option value="archived" class="bg-[var(--color-card)]">Diarsipkan</option>
        </select>
      </div>
    </div>
  </div>

  <!-- Categories Table -->
  <div class="bg-[var(--color-card)] rounded-3xl border border-[var(--color-border)] overflow-hidden">
    {#if loading}
      <div class="p-12 text-center text-[var(--color-muted-foreground)] text-sm">
        <RefreshCw class="w-6 h-6 animate-spin mx-auto mb-2 text-[var(--color-primary)]" />
        <span>Memuat data kategori layanan...</span>
      </div>
    {:else if categories.length === 0}
      <div class="p-12 text-center text-[var(--color-muted-foreground)] text-sm">
        <Layers3 class="w-10 h-10 mx-auto mb-3 text-zinc-600 stroke-1" />
        <p class="font-semibold text-[var(--color-muted-foreground)]">Belum ada kategori layanan.</p>
        <p class="text-xs text-zinc-600 mt-1">Silakan tambah kategori baru untuk mulai mengelompokkan layanan.</p>
      </div>
    {:else}
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr
              class="border-b border-[var(--color-border)] bg-[var(--color-bg)]/50 text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted-foreground)]"
            >
              <th class="py-4 px-6">Urutan</th>
              <th class="py-4 px-6">Nama Kategori & Slug</th>
              <th class="py-4 px-6">Klaster</th>
              <th class="py-4 px-6 text-center">Jumlah Layanan</th>
              <th class="py-4 px-6">Status</th>
              <th class="py-4 px-6">Terakhir Diperbarui</th>
              <th class="py-4 px-6 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[var(--color-border)] text-xs">
            {#each categories as cat (cat.id)}
              <tr class="hover:bg-[var(--color-card)]/50 transition">
                <td class="py-4 px-6 text-[var(--color-muted-foreground)] font-mono font-bold">
                  #{cat.displayOrder}
                </td>

                <td class="py-4 px-6">
                  <div class="font-bold text-[var(--color-text)]">{cat.name}</div>
                  <div class="text-[10px] text-[var(--color-primary)]/80 font-mono mt-0.5">/{cat.slug}</div>
                  {#if cat.description}
                    <p class="text-[11px] text-[var(--color-muted-foreground)] truncate max-w-xs mt-1">
                      {cat.description}
                    </p>
                  {/if}
                </td>

                <td class="py-4 px-6">
                  <span class="text-[var(--color-text)] font-medium">
                    {cat.clusterName || '—'}
                  </span>
                </td>

                <td class="py-4 px-6 text-center">
                  <span
                    class="inline-flex items-center justify-center px-2.5 py-1 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-bold border border-[var(--color-primary)]/20 text-xs"
                  >
                    {cat.serviceCount || 0} layanan
                  </span>
                </td>

                <td class="py-4 px-6">
                  <span
                    class={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold capitalize ${
                      cat.status === 'active'
                        ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20'
                        : cat.status === 'inactive'
                          ? 'bg-[var(--color-surface)] text-[var(--color-muted-foreground)] border border-[var(--color-border)]'
                          : 'bg-rose-950/40 text-rose-400 border border-rose-800/30'
                    }`}
                  >
                    <span
                      class={`w-1.5 h-1.5 rounded-full ${
                        cat.status === 'active'
                          ? 'bg-[var(--color-primary)]'
                          : cat.status === 'inactive'
                            ? 'bg-[var(--color-card)]0'
                            : 'bg-rose-400'
                      }`}
                    />
                    {cat.status === 'active' ? 'Aktif' : cat.status === 'inactive' ? 'Nonaktif' : 'Diarsipkan'}
                  </span>
                </td>

                <td class="py-4 px-6 text-[var(--color-muted-foreground)] text-[11px]">
                  {new Date(cat.updatedAt).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </td>

                <td class="py-4 px-6 text-right space-x-1">
                  <button
                    onclick={() => handleToggleStatus(cat)}
                    title={cat.status === 'active' ? 'Nonaktifkan Kategori' : 'Aktifkan Kategori'}
                    class="p-1.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] hover:border-[var(--color-primary)]/40 text-[var(--color-muted-foreground)] hover:text-[var(--color-text)] transition"
                  >
                    {#if cat.status === 'active'}
                      <XCircle class="w-3.5 h-3.5 text-[var(--color-muted-foreground)]" />
                    {:else}
                      <CheckCircle2 class="w-3.5 h-3.5 text-[var(--color-primary)]" />
                    {/if}
                  </button>

                  <button
                    onclick={() => handleOpenEditModal(cat)}
                    title="Edit Kategori"
                    class="p-1.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] hover:border-[var(--color-primary)]/40 text-[var(--color-primary)] transition"
                  >
                    <Edit class="w-3.5 h-3.5" />
                  </button>

                  <button
                    onclick={() => handleDeleteClick(cat)}
                    title="Hapus Kategori"
                    class="p-1.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] hover:border-red-500/40 text-red-400 transition"
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
  </div>
</div>

<!-- Modal Form Create/Edit Category -->
{#if modalOpen}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
    <div
      class="bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl w-full max-w-lg p-6 space-y-5 shadow-2xl"
    >
      <div class="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
        <h3 class="text-lg font-bold text-[var(--color-text)] flex items-center gap-2">
          <Layers class="w-5 h-5 text-[var(--color-primary)]" />
          <span>{editingCategory ? 'Edit Kategori Layanan' : 'Tambah Kategori Layanan'}</span>
        </h3>
        <button
          onclick={() => (modalOpen = false)}
          class="text-[var(--color-muted-foreground)] hover:text-[var(--color-text)] transition text-sm font-bold"
        >
          ✕
        </button>
      </div>

      {#if formError}
        <div
          class="p-3.5 rounded-2xl bg-red-950/50 border border-red-500/30 text-red-300 text-xs flex items-center gap-2"
        >
          <AlertCircle class="w-4 h-4 text-red-400 shrink-0" />
          <span>{formError}</span>
        </div>
      {/if}

      <form onsubmit={handleSave} class="space-y-4 text-xs">
        <div>
          <label class="block text-[var(--color-muted-foreground)] font-semibold mb-1.5">
            Nama Kategori <span class="text-[var(--color-primary)]">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            oninput={(e) => handleNameChange(e.currentTarget.value)}
            placeholder="Contoh: Kesehatan Ibu & Anak"
            required
            class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3.5 py-2.5 text-[var(--color-text)] placeholder-zinc-600 focus:outline-none focus:border-[var(--color-primary)]/50"
          />
        </div>

        <div>
          <label class="block text-[var(--color-muted-foreground)] font-semibold mb-1.5">
            URL Slug <span class="text-[var(--color-primary)]">*</span>
          </label>
          <input
            type="text"
            value={formData.slug}
            oninput={(e) => (formData = { ...formData, slug: e.currentTarget.value })}
            placeholder="kesehatan-ibu-anak"
            required
            class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3.5 py-2.5 text-[var(--color-primary)] font-mono placeholder-zinc-600 focus:outline-none focus:border-[var(--color-primary)]/50"
          />
        </div>

        <div>
          <label class="block text-[var(--color-muted-foreground)] font-semibold mb-1.5">
            Klaster Terkait (Opsional)
          </label>
          <select
            bind:value={formData.clusterId}
            class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3.5 py-2.5 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]/50"
          >
            <option value="">-- Pilih Klaster Pelayanan --</option>
            {#each clusters as cls (cls.id)}
              <option value={cls.id}>
                {cls.name} {cls.status !== 'active' ? '(Nonaktif)' : ''}
              </option>
            {/each}
          </select>
        </div>

        <div>
          <label class="block text-[var(--color-muted-foreground)] font-semibold mb-1.5">Deskripsi Singkat</label>
          <textarea
            rows={3}
            value={formData.description}
            oninput={(e) => (formData = { ...formData, description: e.currentTarget.value })}
            placeholder="Penjelasan cakupan jenis layanan dalam kategori ini..."
            class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3.5 py-2.5 text-[var(--color-text)] placeholder-zinc-600 focus:outline-none focus:border-[var(--color-primary)]/50 resize-none"
          ></textarea>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-[var(--color-muted-foreground)] font-semibold mb-1.5">Status</label>
            <select
              value={formData.status}
              onchange={(e) => (formData = { ...formData, status: e.currentTarget.value as ActiveStatus })}
              class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-2.5 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]/50"
            >
              <option value="active">Aktif</option>
              <option value="inactive">Nonaktif</option>
              <option value="archived">Diarsipkan</option>
            </select>
          </div>

          <div>
            <label class="block text-[var(--color-muted-foreground)] font-semibold mb-1.5">Urutan Tampilan</label>
            <input
              type="number"
              min={1}
              value={formData.displayOrder}
              oninput={(e) => (formData = { ...formData, displayOrder: parseInt(e.currentTarget.value) || 1 })}
              class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-2.5 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]/50"
            />
          </div>
        </div>

        <div class="pt-4 border-t border-[var(--color-border)] flex items-center justify-end gap-3">
          <button
            type="button"
            onclick={() => (modalOpen = false)}
            class="px-4 py-2 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:text-[var(--color-text)] transition font-semibold"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={saving}
            class="px-5 py-2 rounded-xl bg-[var(--color-primary)] hover:bg-amber-600 text-[var(--color-primary-foreground)] font-bold flex items-center gap-2 transition disabled:opacity-50"
          >
            {#if saving}
              <RefreshCw class="w-3.5 h-3.5 animate-spin" />
            {/if}
            <span>{editingCategory ? 'Simpan Perubahan' : 'Buat Kategori'}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- Delete Confirmation Modal -->
{#if deleteModalOpen && categoryToDelete}
  {#snippet deleteMessage()}
    {#if deleteError}
      <div class="text-red-400 font-semibold space-y-2">
        <p>{deleteError}</p>
        <p class="text-xs text-[var(--color-muted-foreground)]">
          Saran: Ubah status kategori menjadi <strong>Nonaktif</strong> atau pindahkan layanan ke kategori lain terlebih dahulu.
        </p>
      </div>
    {:else}
      Apakah Anda yakin ingin menghapus kategori "{categoryToDelete.name}"? Jika kategori masih digunakan oleh
      layanan, sistem akan memblokir penghapusan demi menjaga integritas data.
    {/if}
  {/snippet}
  <ConfirmModal
    isOpen={deleteModalOpen}
    onClose={() => (deleteModalOpen = false)}
    onConfirm={handleDeleteConfirm}
    title="Hapus Kategori Layanan"
    message={deleteMessage}
    confirmLabel="Hapus Permanen"
  />
{/if}
