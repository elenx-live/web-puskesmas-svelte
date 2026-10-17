<!-- @component Modal ubah massal relasi data layanan (klaster, kategori, unit, lokasi, status) dengan RBAC. -->
<script lang="ts">
  import Modal from '../../../../shared/ui/Modal.svelte';
  import Button from '../../../../shared/ui/Button.svelte';
  import Select from '../../../../shared/ui/Select.svelte';
  import Badge from '../../../../shared/ui/Badge.svelte';
  import type {
    ServiceCategoryEntity,
    ServiceClusterEntity,
    ServiceUnitEntity,
    ServiceLocationEntity,
    ServiceStatus
  } from '../../../../shared/types/index.js';
  import { AlertCircle, Layers, CheckCircle2, ShieldAlert } from 'lucide-svelte';
  import { authStore } from '../../../../shared/stores/auth.svelte.js';
  import { toastStore } from '../../../../shared/stores/toast.svelte.js';
  import { serviceEngineService } from '../../../../shared/services/serviceEngineService.js';

  interface Props {
    isOpen: boolean;
    onClose: () => void;
    selectedIds: string[];
    selectedCount: number;
    clusters: ServiceClusterEntity[];
    categories: ServiceCategoryEntity[];
    units: ServiceUnitEntity[];
    locations: ServiceLocationEntity[];
    onSuccess: () => void;
  }

  let {
    isOpen,
    onClose,
    selectedIds,
    selectedCount,
    clusters,
    categories,
    units,
    locations,
    onSuccess
  }: Props = $props();

  let targetCluster = $state('');
  let targetCategory = $state('');
  let targetUnit = $state('');
  let targetLocation = $state('');
  let targetStatus = $state('');

  let saving = $state(false);
  let confirmed = $state(false);

  const user = $derived(authStore.user);

  // Check RBAC permission
  const canBulkEdit = $derived(user?.permissions?.includes('bulk_edit_services') || user?.roleId === 'role-superadmin');

  async function handleApplyBulk() {
    if (!canBulkEdit) {
      toastStore.showToast('Anda tidak memiliki izin untuk melakukan aksi massal.', 'error');
      return;
    }

    if (!targetCluster && !targetCategory && !targetUnit && !targetLocation && !targetStatus) {
      toastStore.showToast('Pilih minimal satu atribut data atau status yang ingin diperbarui.', 'warning');
      return;
    }

    if (!confirmed) {
      confirmed = true;
      return;
    }

    saving = true;

    try {
      if (!user) return;

      await serviceEngineService.bulkUpdateServices(
        selectedIds,
        {
          ...(targetStatus ? { status: targetStatus as ServiceStatus } : {}),
          ...(targetCluster ? { clusterId: targetCluster } : {}),
          ...(targetCategory ? { categoryId: targetCategory } : {}),
          ...(targetUnit ? { unitId: targetUnit } : {}),
          ...(targetLocation ? { locationId: targetLocation } : {})
        },
        { id: user.uid, email: user.email, name: user.displayName }
      );

      toastStore.showToast(`Berhasil memperbarui data secara massal untuk ${selectedCount} layanan.`, 'success');
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed bulk update:', err);
      toastStore.showToast('Gagal memperbarui data secara massal.', 'error');
    } finally {
      saving = false;
      confirmed = false;
    }
  }
</script>

<Modal
  {isOpen}
  {onClose}
  title="Ubah Relasi Data Layanan Secara Massal"
  size="md"
>
  <div class="space-y-4">
    {#if !canBulkEdit}
      <div class="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
        <ShieldAlert class="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />
        <div>
          <p class="text-xs font-semibold text-rose-800">Akses Dibatasi (RBAC)</p>
          <p class="text-xs text-rose-700 mt-0.5">
            Akun Anda tidak memiliki hak akses <code class="bg-rose-100 px-1 py-0.5 rounded font-mono text-[11px]">bulk_edit_services</code>.
          </p>
        </div>
      </div>
    {:else}
      <div class="p-3.5 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-between">
        <span class="text-xs font-semibold text-blue-900 flex items-center gap-1.5">
          <Layers class="w-4 h-4 text-blue-600" /> Target Layanan Terpilih
        </span>
        <Badge variant="blue">{selectedCount} Layanan</Badge>
      </div>

      <p class="text-xs text-[var(--color-muted-foreground)]">
        Pilih field di bawah ini yang ingin diubah nilainya secara bersamaan untuk semua layanan terpilih. Biarkan opsi <span class="font-semibold text-zinc-700">"-- Jangan Ubah --"</span> jika tidak ingin mengubah field tersebut.
      </p>

      <div class="space-y-3">
        <Select
          label="Status Publikasi"
          bind:value={targetStatus}
          onchange={() => (confirmed = false)}
          options={[
            { value: '', label: '-- Jangan Ubah Status --' },
            { value: 'published', label: 'Publikasikan (Published)' },
            { value: 'draft', label: 'Simpan Sebagai Draft' },
            { value: 'archived', label: 'Arsipkan Layanan' }
          ]}
        />

        <Select
          label="Ubah Klaster Layanan (ILP)"
          bind:value={targetCluster}
          onchange={() => (confirmed = false)}
          options={[
            { value: '', label: '-- Jangan Ubah Klaster --' },
            ...clusters.map((c) => ({ value: c.id, label: c.name }))
          ]}
        />

        <Select
          label="Ubah Kategori Layanan"
          bind:value={targetCategory}
          onchange={() => (confirmed = false)}
          options={[
            { value: '', label: '-- Jangan Ubah Kategori --' },
            ...categories.map((c) => ({ value: c.id, label: c.name }))
          ]}
        />

        <Select
          label="Ubah Unit Pelayanan"
          bind:value={targetUnit}
          onchange={() => (confirmed = false)}
          options={[
            { value: '', label: '-- Jangan Ubah Unit --' },
            ...units.map((u) => ({ value: u.id, label: `${u.name} (${u.code || 'Tanpa Kode'})` }))
          ]}
        />

        <Select
          label="Ubah Lokasi Pelayanan"
          bind:value={targetLocation}
          onchange={() => (confirmed = false)}
          options={[
            { value: '', label: '-- Jangan Ubah Lokasi --' },
            ...locations.map((l) => ({ value: l.id, label: `${l.name} - ${l.building} ${l.room}` }))
          ]}
        />
      </div>

      <!-- Confirmation Box -->
      {#if confirmed}
        <div class="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 animate-fadeIn">
          <AlertCircle class="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <h5 class="text-xs font-bold text-amber-900">Konfirmasi Perubahan Massal</h5>
            <p class="text-xs text-amber-800 mt-0.5">
              Anda akan mengubah data dari <span class="font-bold">{selectedCount} layanan</span> terpilih. Apakah Anda yakin ingin melanjutkan?
            </p>
          </div>
        </div>
      {/if}
    {/if}

    <div class="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
      <Button variant="ghost" size="sm" onclick={onClose}>
        Batal
      </Button>
      {#if canBulkEdit}
        <Button
          variant="primary"
          size="sm"
          onclick={handleApplyBulk}
          disabled={saving}
          class="gap-1.5"
        >
          <CheckCircle2 class="w-3.5 h-3.5" />
          {saving ? 'Memproses...' : confirmed ? 'Ya, Terapkan Sekarang' : 'Terapkan Perubahan'}
        </Button>
      {/if}
    </div>
  </div>
</Modal>
