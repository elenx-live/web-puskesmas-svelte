<!-- @component Manajemen lokasi pelayanan (Service Engine Phase 4B): daftar, filter status, formulir gedung/lantai/ruangan, toggle status, hapus. -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { authStore } from '../../../shared/stores/auth.svelte.js';
  import { toastStore } from '../../../shared/stores/toast.svelte.js';
  import { serviceEngineService } from '../../../shared/services/serviceEngineService.js';
  import type { ServiceLocationEntity, ActiveStatus } from '../../../shared/types/index.js';
  import Card from '../../../shared/ui/Card.svelte';
  import Button from '../../../shared/ui/Button.svelte';
  import Input from '../../../shared/ui/Input.svelte';
  import Select from '../../../shared/ui/Select.svelte';
  import Modal from '../../../shared/ui/Modal.svelte';
  import ConfirmModal from '../../../shared/components/ConfirmModal.svelte';
  import {
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
    MapPin,
    HeartPulse,
  } from 'lucide-svelte';

  let locations = $state<ServiceLocationEntity[]>([]);
  let loading = $state(true);
  let searchQuery = $state('');
  let statusFilter = $state('all');

  // Modal Form State
  let modalOpen = $state(false);
  let editingLocation = $state<ServiceLocationEntity | null>(null);
  let formData = $state({
    name: '',
    building: '',
    floor: '',
    room: '',
    description: '',
    status: 'active' as ActiveStatus,
    displayOrder: 1,
  });
  let formError = $state('');
  let saving = $state(false);

  // Delete State
  let deleteModalOpen = $state(false);
  let locationToDelete = $state<ServiceLocationEntity | null>(null);
  let deleteError = $state('');

  function getActor() {
    const user = authStore.user;
    return {
      id: user?.uid || 'usr-admin',
      email: user?.email || 'admin@puskesmas.go.id',
      name: user?.displayName || 'Administrator',
    };
  }

  async function loadData() {
    loading = true;
    try {
      const locs = await serviceEngineService.getLocations({
        search: searchQuery,
        status: statusFilter === 'all' ? undefined : statusFilter,
      });
      locations = locs;
    } catch (err) {
      console.error('Error loading locations:', err);
      toastStore.showToast('Gagal memuat data lokasi pelayanan', 'error');
    } finally {
      loading = false;
    }
  }

  function handleOpenCreateModal() {
    editingLocation = null;
    formData = {
      name: '',
      building: '',
      floor: '',
      room: '',
      description: '',
      status: 'active',
      displayOrder: locations.length + 1,
    };
    formError = '';
    modalOpen = true;
  }

  function handleOpenEditModal(loc: ServiceLocationEntity) {
    editingLocation = loc;
    formData = {
      name: loc.name,
      building: loc.building || '',
      floor: loc.floor || '',
      room: loc.room || '',
      description: loc.description || '',
      status: loc.status,
      displayOrder: loc.displayOrder,
    };
    formError = '';
    modalOpen = true;
  }

  async function handleSave(e: SubmitEvent) {
    e.preventDefault();
    if (!formData.name.trim()) {
      formError = 'Nama lokasi pelayanan wajib diisi.';
      return;
    }

    saving = true;
    formError = '';
    try {
      const actor = getActor();

      if (editingLocation) {
        await serviceEngineService.updateLocation(
          editingLocation.id,
          {
            name: formData.name.trim(),
            building: formData.building.trim(),
            floor: formData.floor.trim(),
            room: formData.room.trim(),
            description: formData.description.trim(),
            status: formData.status,
            displayOrder: Number(formData.displayOrder) || 1,
          },
          actor
        );
        toastStore.showToast(`Lokasi "${formData.name}" berhasil diperbarui`, 'success');
      } else {
        await serviceEngineService.createLocation(
          {
            name: formData.name.trim(),
            building: formData.building.trim(),
            floor: formData.floor.trim(),
            room: formData.room.trim(),
            description: formData.description.trim(),
            status: formData.status,
            displayOrder: Number(formData.displayOrder) || 1,
          },
          actor
        );
        toastStore.showToast(`Lokasi "${formData.name}" berhasil dibuat`, 'success');
      }

      modalOpen = false;
      loadData();
    } catch (err: any) {
      formError = err.message || 'Gagal menyimpan lokasi pelayanan';
    } finally {
      saving = false;
    }
  }

  async function handleToggleStatus(loc: ServiceLocationEntity) {
    try {
      const actor = getActor();
      const newStatus: ActiveStatus = loc.status === 'active' ? 'inactive' : 'active';
      await serviceEngineService.updateLocation(loc.id, { status: newStatus }, actor);
      toastStore.showToast(`Status lokasi "${loc.name}" diubah menjadi ${newStatus}`, 'success');
      loadData();
    } catch (err: any) {
      toastStore.showToast(err.message || 'Gagal mengubah status lokasi', 'error');
    }
  }

  function handleDeleteClick(loc: ServiceLocationEntity) {
    locationToDelete = loc;
    deleteError = '';
    deleteModalOpen = true;
  }

  async function handleDeleteConfirm() {
    if (!locationToDelete) return;
    try {
      const actor = getActor();
      await serviceEngineService.deleteLocation(locationToDelete.id, actor);
      toastStore.showToast(`Lokasi "${locationToDelete.name}" berhasil dihapus permanen`, 'success');
      deleteModalOpen = false;
      locationToDelete = null;
      loadData();
    } catch (err: any) {
      deleteError = err.message || 'Gagal menghapus lokasi pelayanan';
    }
  }

  onMount(() => {
    loadData();
  });

  $effect(() => {
    const s = searchQuery;
    const st = statusFilter;
    void s;
    void st;
    loadData();
  });
</script>

<div class="space-y-6">
  <!-- Header & Subnavigation -->
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
        <MapPin class="w-6 h-6 text-[var(--color-primary)]" />
        <span>Lokasi Pelayanan Puskesmas</span>
      </h2>
      <p class="text-xs text-[var(--color-muted-foreground)] mt-1">
        Data gedung, lantai, dan ruangan tempat pasien mengakses pelayanan kesehatan secara langsung.
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
        <span>Tambah Lokasi</span>
      </button>
    </div>
  </div>

  <!-- Search & Status Filter -->
  <Card class="p-4 border-[var(--color-border)] bg-[var(--color-card)]">
    <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
      <div class="relative w-full sm:w-80">
        <Search class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
        <Input
          placeholder="Cari nama, gedung, atau ruangan..."
          bind:value={searchQuery}
          class="pl-9 bg-[var(--color-bg)] border-[var(--color-border)] text-xs"
        />
      </div>

      <div class="flex items-center gap-2 bg-[var(--color-bg)] border border-[var(--color-border)] px-3 py-1.5 rounded-xl text-xs">
        <Filter class="w-3.5 h-3.5 text-[var(--color-muted-foreground)]" />
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
  </Card>

  <!-- Locations Table -->
  <Card class="border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
    {#if loading}
      <div class="p-12 text-center text-[var(--color-muted-foreground)] text-sm">
        <RefreshCw class="w-6 h-6 animate-spin mx-auto mb-2 text-[var(--color-primary)]" />
        <span>Memuat data lokasi pelayanan...</span>
      </div>
    {:else if locations.length === 0}
      <div class="p-12 text-center text-[var(--color-muted-foreground)] text-sm">
        <MapPin class="w-10 h-10 mx-auto mb-3 text-zinc-600 stroke-1" />
        <p class="font-semibold text-[var(--color-muted-foreground)]">Belum ada lokasi pelayanan.</p>
      </div>
    {:else}
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr
              class="border-b border-[var(--color-border)] bg-[var(--color-bg)]/50 text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted-foreground)]"
            >
              <th class="py-4 px-6">Urutan</th>
              <th class="py-4 px-6">Nama Lokasi</th>
              <th class="py-4 px-6">Gedung / Lantai / Ruang</th>
              <th class="py-4 px-6 text-center">Jumlah Layanan</th>
              <th class="py-4 px-6">Status</th>
              <th class="py-4 px-6">Terakhir Diperbarui</th>
              <th class="py-4 px-6 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[var(--color-border)] text-xs">
            {#each locations as loc (loc.id)}
              <tr class="hover:bg-[var(--color-card)]/50 transition">
                <td class="py-4 px-6 text-[var(--color-muted-foreground)] font-mono font-bold">
                  #{loc.displayOrder}
                </td>

                <td class="py-4 px-6">
                  <div class="font-bold text-[var(--color-text)] flex items-center gap-1.5">
                    <MapPin class="w-3.5 h-3.5 text-[var(--color-primary)] shrink-0" />
                    <span>{loc.name}</span>
                  </div>
                  {#if loc.description}
                    <p class="text-[11px] text-[var(--color-muted-foreground)] truncate max-w-xs mt-0.5 ml-5">
                      {loc.description}
                    </p>
                  {/if}
                </td>

                <td class="py-4 px-6">
                  <div class="text-[var(--color-text)] font-medium">
                    {loc.building || 'Gedung —'}
                  </div>
                  <div class="text-[10px] text-[var(--color-muted-foreground)]">
                    {[loc.floor, loc.room].filter(Boolean).join(' • ') || '—'}
                  </div>
                </td>

                <td class="py-4 px-6 text-center">
                  <span
                    class="inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-bold border border-[var(--color-primary)]/20 text-xs"
                  >
                    <HeartPulse class="w-3 h-3" />
                    <span>{loc.serviceCount || 0} layanan</span>
                  </span>
                </td>

                <td class="py-4 px-6">
                  <span
                    class={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold capitalize ${
                      loc.status === 'active'
                        ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20'
                        : loc.status === 'inactive'
                          ? 'bg-[var(--color-surface)] text-[var(--color-muted-foreground)] border border-[var(--color-border)]'
                          : 'bg-rose-950/40 text-rose-400 border border-rose-800/30'
                    }`}
                  >
                    <span
                      class={`w-1.5 h-1.5 rounded-full ${
                        loc.status === 'active'
                          ? 'bg-[var(--color-primary)]'
                          : loc.status === 'inactive'
                            ? 'bg-[var(--color-card)]'
                            : 'bg-rose-400'
                      }`}
                    ></span>
                    {loc.status === 'active' ? 'Aktif' : loc.status === 'inactive' ? 'Nonaktif' : 'Diarsipkan'}
                  </span>
                </td>

                <td class="py-4 px-6 text-[var(--color-muted-foreground)] text-[11px]">
                  {new Date(loc.updatedAt).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </td>

                <td class="py-4 px-6 text-right space-x-1 whitespace-nowrap">
                  <button
                    onclick={() => handleToggleStatus(loc)}
                    title={loc.status === 'active' ? 'Nonaktifkan Lokasi' : 'Aktifkan Lokasi'}
                    class="p-1.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] hover:border-[var(--color-primary)]/40 text-[var(--color-muted-foreground)] hover:text-[var(--color-text)] transition"
                  >
                    {#if loc.status === 'active'}
                      <XCircle class="w-3.5 h-3.5 text-[var(--color-muted-foreground)]" />
                    {:else}
                      <CheckCircle2 class="w-3.5 h-3.5 text-[var(--color-primary)]" />
                    {/if}
                  </button>

                  <button
                    onclick={() => handleOpenEditModal(loc)}
                    title="Edit Lokasi"
                    class="p-1.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] hover:border-[var(--color-primary)]/40 text-[var(--color-primary)] transition"
                  >
                    <Edit class="w-3.5 h-3.5" />
                  </button>

                  <button
                    onclick={() => handleDeleteClick(loc)}
                    title="Hapus Lokasi"
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
  </Card>
</div>

<!-- Form Modal -->
<Modal
  isOpen={modalOpen}
  onClose={() => (modalOpen = false)}
  title={editingLocation ? 'Edit Lokasi Pelayanan' : 'Tambah Lokasi Pelayanan'}
>
  {#if formError}
    <div
      class="p-3.5 rounded-2xl bg-red-950/50 border border-red-500/30 text-red-300 text-xs flex items-center gap-2 mb-4"
    >
      <AlertCircle class="w-4 h-4 text-red-400 shrink-0" />
      <span>{formError}</span>
    </div>
  {/if}

  <form id="location-form" onsubmit={handleSave} class="space-y-4 text-xs">
    <div class="space-y-1">
      <label class="block font-semibold text-[var(--color-text)]">
        Nama Lokasi <span class="text-[var(--color-primary)]">*</span>
      </label>
      <Input
        placeholder="Contoh: Poli Umum R101"
        bind:value={formData.name}
        class="bg-[var(--color-bg)] border-[var(--color-border)]"
        required
      />
    </div>

    <div class="grid grid-cols-3 gap-3">
      <div class="space-y-1">
        <label class="block font-semibold text-[var(--color-text)]">Gedung</label>
        <Input placeholder="Gedung Utama" bind:value={formData.building} class="bg-[var(--color-bg)] border-[var(--color-border)]" />
      </div>

      <div class="space-y-1">
        <label class="block font-semibold text-[var(--color-text)]">Lantai</label>
        <Input placeholder="Lantai 1" bind:value={formData.floor} class="bg-[var(--color-bg)] border-[var(--color-border)]" />
      </div>

      <div class="space-y-1">
        <label class="block font-semibold text-[var(--color-text)]">Ruangan</label>
        <Input placeholder="Ruang 101" bind:value={formData.room} class="bg-[var(--color-bg)] border-[var(--color-border)]" />
      </div>
    </div>

    <div class="space-y-1">
      <label class="block font-semibold text-[var(--color-text)]">Petunjuk / Keterangan Lokasi</label>
      <textarea
        rows={2}
        bind:value={formData.description}
        placeholder="Petunjuk navigasi bagi pengunjung/pasien..."
        class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3.5 py-2.5 text-[var(--color-text)] placeholder-zinc-600 focus:outline-none focus:border-[var(--color-primary)]/50 resize-none"
      ></textarea>
    </div>

    <div class="grid grid-cols-2 gap-4">
      <div class="space-y-1">
        <label class="block font-semibold text-[var(--color-text)]">Status</label>
        <Select
          bind:value={formData.status}
          options={[
            { value: 'active', label: 'Aktif' },
            { value: 'inactive', label: 'Nonaktif' },
            { value: 'archived', label: 'Diarsipkan' },
          ]}
          class="bg-[var(--color-bg)] border-[var(--color-border)]"
        />
      </div>

      <div class="space-y-1">
        <label class="block font-semibold text-[var(--color-text)]">Urutan Tampilan</label>
        <Input
          type="number"
          min={1}
          bind:value={formData.displayOrder}
          class="bg-[var(--color-bg)] border-[var(--color-border)]"
        />
      </div>
    </div>
  </form>

  {#snippet footer()}
    <button
      type="button"
      onclick={() => (modalOpen = false)}
      class="px-4 py-2 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:text-[var(--color-text)] transition font-semibold"
    >
      Batal
    </button>
    <button
      type="submit"
      form="location-form"
      disabled={saving}
      class="px-5 py-2 rounded-xl bg-[var(--color-primary)] hover:bg-amber-600 text-[var(--color-primary-foreground)] font-bold flex items-center gap-2 transition disabled:opacity-50"
    >
      {#if saving}<RefreshCw class="w-3.5 h-3.5 animate-spin" />{/if}
      <span>{editingLocation ? 'Simpan Perubahan' : 'Buat Lokasi'}</span>
    </button>
  {/snippet}
</Modal>

{#if deleteModalOpen && locationToDelete}
  <ConfirmModal
    isOpen={deleteModalOpen}
    onClose={() => (deleteModalOpen = false)}
    onConfirm={handleDeleteConfirm}
    title="Hapus Lokasi Pelayanan"
    confirmLabel="Hapus Permanen"
  >
    {#if deleteError}
      <div class="text-red-400 font-semibold space-y-2 text-xs">
        <p>{deleteError}</p>
        <p class="text-xs text-[var(--color-muted-foreground)]">
          Saran: Ubah status lokasi menjadi <strong>Nonaktif</strong> atau pindahkan layanan ke lokasi lain
          terlebih dahulu.
        </p>
      </div>
    {:else}
      <p class="text-xs text-[var(--color-text)]">
        Apakah Anda yakin ingin menghapus lokasi pelayanan "{locationToDelete.name}"?
      </p>
    {/if}
  </ConfirmModal>
{/if}
