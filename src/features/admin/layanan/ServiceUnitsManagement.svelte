<!-- @component Manajemen unit/ruang pelayanan operasional Puskesmas (Phase 4B): cari, filter status, CRUD, toggle status, hapus. -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { authStore } from '../../../shared/stores/auth.svelte.js';
  import { toastStore } from '../../../shared/stores/toast.svelte.js';
  import { serviceEngineService } from '../../../shared/services/serviceEngineService.js';
  import type { ServiceUnitEntity, ActiveStatus } from '../../../shared/types/index.js';
  import ConfirmModal from '../../../shared/components/ConfirmModal.svelte';
  import {
    HeartPulse,
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
    Building2,
  } from 'lucide-svelte';

  let units = $state<ServiceUnitEntity[]>([]);
  let loading = $state(true);
  let searchQuery = $state('');
  let statusFilter = $state('all');

  // Modal Form State
  let modalOpen = $state(false);
  let editingUnit = $state<ServiceUnitEntity | null>(null);
  let formData = $state({
    name: '',
    code: '',
    description: '',
    status: 'active' as ActiveStatus,
    displayOrder: 1,
  });
  let formError = $state('');
  let saving = $state(false);

  // Delete State
  let deleteModalOpen = $state(false);
  let unitToDelete = $state<ServiceUnitEntity | null>(null);
  let deleteError = $state('');

  async function loadData() {
    loading = true;
    try {
      const u = await serviceEngineService.getUnits({
        search: searchQuery,
        status: statusFilter === 'all' ? undefined : statusFilter,
      });
      units = u;
    } catch (err: any) {
      console.error('Error loading units:', err);
      toastStore.showToast('Gagal memuat data unit pelayanan', 'error');
    } finally {
      loading = false;
    }
  }

  function handleOpenCreateModal() {
    editingUnit = null;
    formData = {
      name: '',
      code: '',
      description: '',
      status: 'active',
      displayOrder: units.length + 1,
    };
    formError = '';
    modalOpen = true;
  }

  function handleOpenEditModal(u: ServiceUnitEntity) {
    editingUnit = u;
    formData = {
      name: u.name,
      code: u.code || '',
      description: u.description || '',
      status: u.status,
      displayOrder: u.displayOrder,
    };
    formError = '';
    modalOpen = true;
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
      formError = 'Nama unit pelayanan wajib diisi.';
      return;
    }

    saving = true;
    formError = '';
    try {
      const actor = getActor();

      if (editingUnit) {
        await serviceEngineService.updateUnit(
          editingUnit.id,
          {
            name: formData.name.trim(),
            code: formData.code.trim().toUpperCase(),
            description: formData.description.trim(),
            status: formData.status,
            displayOrder: Number(formData.displayOrder) || 1,
          },
          actor
        );
        toastStore.showToast(`Unit "${formData.name}" berhasil diperbarui`, 'success');
      } else {
        await serviceEngineService.createUnit(
          {
            name: formData.name.trim(),
            code: formData.code.trim().toUpperCase(),
            description: formData.description.trim(),
            status: formData.status,
            displayOrder: Number(formData.displayOrder) || 1,
          },
          actor
        );
        toastStore.showToast(`Unit "${formData.name}" berhasil dibuat`, 'success');
      }

      modalOpen = false;
      loadData();
    } catch (err: any) {
      formError = err.message || 'Gagal menyimpan unit pelayanan';
    } finally {
      saving = false;
    }
  }

  async function handleToggleStatus(u: ServiceUnitEntity) {
    try {
      const actor = getActor();
      const newStatus: ActiveStatus = u.status === 'active' ? 'inactive' : 'active';
      await serviceEngineService.updateUnit(u.id, { status: newStatus }, actor);
      toastStore.showToast(`Status unit "${u.name}" diubah menjadi ${newStatus}`, 'success');
      loadData();
    } catch (err: any) {
      toastStore.showToast(err.message || 'Gagal mengubah status unit', 'error');
    }
  }

  function handleDeleteClick(u: ServiceUnitEntity) {
    unitToDelete = u;
    deleteError = '';
    deleteModalOpen = true;
  }

  async function handleDeleteConfirm() {
    if (!unitToDelete) return;
    try {
      const actor = getActor();

      await serviceEngineService.deleteUnit(unitToDelete.id, actor);
      toastStore.showToast(`Unit "${unitToDelete.name}" berhasil dihapus permanen`, 'success');
      deleteModalOpen = false;
      unitToDelete = null;
      loadData();
    } catch (err: any) {
      deleteError = err.message || 'Gagal menghapus unit pelayanan';
    }
  }

  onMount(() => {
    loadData();
  });

  $effect(() => {
    const s = searchQuery;
    const st = statusFilter;
    void s; void st;
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
        <Building2 class="w-6 h-6 text-[var(--color-primary)]" />
        <span>Unit Pelayanan Puskesmas</span>
      </h2>
      <p class="text-xs text-[var(--color-muted-foreground)] mt-1">
        Daftar unit, poli, laboratorium, farmasi, dan UGD penanggung jawab layanan kesehatan.
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
        <span>Tambah Unit</span>
      </button>
    </div>
  </div>

  <!-- Search & Status Filter -->
  <div
    class="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[var(--color-card)] p-4 rounded-2xl border border-[var(--color-border)]"
  >
    <div class="relative w-full sm:w-80">
      <Search class="w-4 h-4 absolute left-3.5 top-3 text-[var(--color-muted-foreground)]" />
      <input
        type="text"
        value={searchQuery}
        oninput={(e) => (searchQuery = e.currentTarget.value)}
        placeholder="Cari unit atau kode..."
        class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl pl-10 pr-4 py-2 text-xs text-[var(--color-text)] placeholder-zinc-500 focus:outline-none focus:border-[var(--color-primary)]/50"
      />
    </div>

    <div
      class="flex items-center gap-2 bg-[var(--color-bg)] border border-[var(--color-border)] px-3 py-1.5 rounded-xl text-xs"
    >
      <Filter class="w-3.5 h-3.5 text-[var(--color-muted-foreground)]" />
      <select bind:value={statusFilter} class="bg-transparent text-[var(--color-text)] focus:outline-none">
        <option value="all" class="bg-[var(--color-card)]">Semua Status</option>
        <option value="active" class="bg-[var(--color-card)]">Aktif</option>
        <option value="inactive" class="bg-[var(--color-card)]">Nonaktif</option>
        <option value="archived" class="bg-[var(--color-card)]">Diarsipkan</option>
      </select>
    </div>
  </div>

  <!-- Units Table -->
  <div class="bg-[var(--color-card)] rounded-3xl border border-[var(--color-border)] overflow-hidden">
    {#if loading}
      <div class="p-12 text-center text-[var(--color-muted-foreground)] text-sm">
        <RefreshCw class="w-6 h-6 animate-spin mx-auto mb-2 text-[var(--color-primary)]" />
        <span>Memuat data unit pelayanan...</span>
      </div>
    {:else if units.length === 0}
      <div class="p-12 text-center text-[var(--color-muted-foreground)] text-sm">
        <Building2 class="w-10 h-10 mx-auto mb-3 text-zinc-600 stroke-1" />
        <p class="font-semibold text-[var(--color-muted-foreground)]">Belum ada unit pelayanan.</p>
      </div>
    {:else}
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr
              class="border-b border-[var(--color-border)] bg-[var(--color-bg)]/50 text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted-foreground)]"
            >
              <th class="py-4 px-6">Urutan</th>
              <th class="py-4 px-6">Nama Unit</th>
              <th class="py-4 px-6">Kode Unit</th>
              <th class="py-4 px-6 text-center">Jumlah Layanan</th>
              <th class="py-4 px-6">Status</th>
              <th class="py-4 px-6">Terakhir Diperbarui</th>
              <th class="py-4 px-6 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[var(--color-border)] text-xs">
            {#each units as u (u.id)}
              <tr class="hover:bg-[var(--color-card)]/50 transition">
                <td class="py-4 px-6 text-[var(--color-muted-foreground)] font-mono font-bold">
                  #{u.displayOrder}
                </td>

                <td class="py-4 px-6">
                  <div class="font-bold text-[var(--color-text)]">{u.name}</div>
                  {#if u.description}
                    <p class="text-[11px] text-[var(--color-muted-foreground)] truncate max-w-xs mt-0.5">
                      {u.description}
                    </p>
                  {/if}
                </td>

                <td class="py-4 px-6">
                  {#if u.code}
                    <span
                      class="px-2 py-1 rounded-md bg-[var(--color-surface)] text-[var(--color-primary)] font-mono font-bold text-[11px] border border-[var(--color-border)]"
                    >
                      {u.code}
                    </span>
                  {:else}
                    <span class="text-zinc-600">—</span>
                  {/if}
                </td>

                <td class="py-4 px-6 text-center">
                  <span
                    class="inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-bold border border-[var(--color-primary)]/20 text-xs"
                  >
                    <HeartPulse class="w-3 h-3" />
                    <span>{u.serviceCount || 0} layanan</span>
                  </span>
                </td>

                <td class="py-4 px-6">
                  <span
                    class={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold capitalize ${
                      u.status === 'active'
                        ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20'
                        : u.status === 'inactive'
                          ? 'bg-[var(--color-surface)] text-[var(--color-muted-foreground)] border border-[var(--color-border)]'
                          : 'bg-rose-950/40 text-rose-400 border border-rose-800/30'
                    }`}
                  >
                    <span
                      class={`w-1.5 h-1.5 rounded-full ${
                        u.status === 'active'
                          ? 'bg-[var(--color-primary)]'
                          : u.status === 'inactive'
                            ? 'bg-[var(--color-card)]0'
                            : 'bg-rose-400'
                      }`}
                    />
                    {u.status === 'active' ? 'Aktif' : u.status === 'inactive' ? 'Nonaktif' : 'Diarsipkan'}
                  </span>
                </td>

                <td class="py-4 px-6 text-[var(--color-muted-foreground)] text-[11px]">
                  {new Date(u.updatedAt).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </td>

                <td class="py-4 px-6 text-right space-x-1">
                  <button
                    onclick={() => handleToggleStatus(u)}
                    title={u.status === 'active' ? 'Nonaktifkan Unit' : 'Aktifkan Unit'}
                    class="p-1.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] hover:border-[var(--color-primary)]/40 text-[var(--color-muted-foreground)] hover:text-[var(--color-text)] transition"
                  >
                    {#if u.status === 'active'}
                      <XCircle class="w-3.5 h-3.5 text-[var(--color-muted-foreground)]" />
                    {:else}
                      <CheckCircle2 class="w-3.5 h-3.5 text-[var(--color-primary)]" />
                    {/if}
                  </button>

                  <button
                    onclick={() => handleOpenEditModal(u)}
                    title="Edit Unit"
                    class="p-1.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] hover:border-[var(--color-primary)]/40 text-[var(--color-primary)] transition"
                  >
                    <Edit class="w-3.5 h-3.5" />
                  </button>

                  <button
                    onclick={() => handleDeleteClick(u)}
                    title="Hapus Unit"
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

<!-- Form Modal -->
{#if modalOpen}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
    <div
      class="bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl w-full max-w-lg p-6 space-y-5 shadow-2xl"
    >
      <div class="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
        <h3 class="text-lg font-bold text-[var(--color-text)] flex items-center gap-2">
          <Building2 class="w-5 h-5 text-[var(--color-primary)]" />
          <span>{editingUnit ? 'Edit Unit Pelayanan' : 'Tambah Unit Pelayanan'}</span>
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
            Nama Unit Pelayanan <span class="text-[var(--color-primary)]">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            oninput={(e) => (formData = { ...formData, name: e.currentTarget.value })}
            placeholder="Contoh: Ruang Poli Umum"
            required
            class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3.5 py-2.5 text-[var(--color-text)] placeholder-zinc-600 focus:outline-none focus:border-[var(--color-primary)]/50"
          />
        </div>

        <div>
          <label class="block text-[var(--color-muted-foreground)] font-semibold mb-1.5">Kode Unit (Unik)</label>
          <input
            type="text"
            value={formData.code}
            oninput={(e) => (formData = { ...formData, code: e.currentTarget.value })}
            placeholder="Contoh: POLI-UMUM"
            class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3.5 py-2.5 text-[var(--color-primary)] font-mono uppercase placeholder-zinc-600 focus:outline-none focus:border-[var(--color-primary)]/50"
          />
        </div>

        <div>
          <label class="block text-[var(--color-muted-foreground)] font-semibold mb-1.5">Deskripsi Singkat</label>
          <textarea
            rows={3}
            value={formData.description}
            oninput={(e) => (formData = { ...formData, description: e.currentTarget.value })}
            placeholder="Penjelasan fungsi operasional unit..."
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
            <span>{editingUnit ? 'Simpan Perubahan' : 'Buat Unit'}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- Delete Confirmation Modal -->
{#if deleteModalOpen && unitToDelete}
  {#snippet deleteMessage()}
    {#if deleteError}
      <div class="text-red-400 font-semibold space-y-2">
        <p>{deleteError}</p>
        <p class="text-xs text-[var(--color-muted-foreground)]">
          Saran: Ubah status unit menjadi <strong>Nonaktif</strong> atau pindahkan layanan ke unit lain terlebih dahulu.
        </p>
      </div>
    {:else}
      Apakah Anda yakin ingin menghapus unit pelayanan "{unitToDelete.name}"?
    {/if}
  {/snippet}
  <ConfirmModal
    isOpen={deleteModalOpen}
    onClose={() => (deleteModalOpen = false)}
    onConfirm={handleDeleteConfirm}
    title="Hapus Unit Pelayanan"
    message={deleteMessage}
    confirmLabel="Hapus Permanen"
  />
{/if}
