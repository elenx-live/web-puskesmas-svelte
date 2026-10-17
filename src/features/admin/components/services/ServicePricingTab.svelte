<!-- @component Tab kelola skema tarif & biaya layanan: daftar tarif, tambah/edit dengan validasi overlap periode, dan arsip. -->
<script lang="ts">
  import Modal from '../../../../shared/ui/Modal.svelte';
  import Button from '../../../../shared/ui/Button.svelte';
  import Card from '../../../../shared/ui/Card.svelte';
  import Badge from '../../../../shared/ui/Badge.svelte';
  import ConfirmModal from '../../../../shared/components/ConfirmModal.svelte';
  import type { ServicePricingEntity, PricingType } from '../../../../shared/types/index.js';
  import {
    DollarSign, Plus, Edit2, Trash2, AlertTriangle, Info, Calendar, CheckCircle2
  } from 'lucide-svelte';
  import { authStore } from '../../../../shared/stores/auth.svelte.js';
  import { toastStore } from '../../../../shared/stores/toast.svelte.js';
  import { serviceEngineService, checkPricingRangeOverlap } from '../../../../shared/services/serviceEngineService.js';

  interface Props {
    serviceId: string;
    serviceName: string;
  }

  let { serviceId, serviceName }: Props = $props();

  const user = $derived(authStore.user);

  let pricingList = $state<ServicePricingEntity[]>([]);
  let loading = $state(true);

  // Modal & Form State
  let isModalOpen = $state(false);
  let editingPricing = $state<ServicePricingEntity | null>(null);

  interface PricingForm {
    pricingType: PricingType;
    amount: string;
    currency: string;
    unit: string;
    description: string;
    effectiveFrom: string;
    effectiveUntil: string;
    status: 'active' | 'inactive';
  }

  const emptyForm = (): PricingForm => ({
    pricingType: 'free',
    amount: '',
    currency: 'IDR',
    unit: 'per pelayanan',
    description: '',
    effectiveFrom: new Date().toISOString().split('T')[0],
    effectiveUntil: '',
    status: 'active'
  });

  let formData = $state<PricingForm>(emptyForm());

  let modalError = $state<string | null>(null);
  let overlapWarning = $state<string | null>(null);
  let saving = $state(false);

  // Delete/Archive State
  let deletingId = $state<string | null>(null);
  let isDeleting = $state(false);

  $effect(() => {
    if (serviceId) {
      loadPricing();
    }
  });

  async function loadPricing() {
    loading = true;
    try {
      const data = await serviceEngineService.getPricingByServiceId(serviceId, { includeArchived: true });
      pricingList = data;
    } catch (err: any) {
      toastStore.showToast(err.message || 'Gagal memuat tarif layanan', 'error');
    } finally {
      loading = false;
    }
  }

  function handleOpenModal(pricingToEdit?: ServicePricingEntity) {
    modalError = null;
    overlapWarning = null;

    if (pricingToEdit) {
      editingPricing = pricingToEdit;
      formData = {
        pricingType: pricingToEdit.pricingType,
        amount: pricingToEdit.amount !== null && pricingToEdit.amount !== undefined ? String(pricingToEdit.amount) : '',
        currency: pricingToEdit.currency || 'IDR',
        unit: pricingToEdit.unit || 'per pelayanan',
        description: pricingToEdit.description || '',
        effectiveFrom: pricingToEdit.effectiveFrom || new Date().toISOString().split('T')[0],
        effectiveUntil: pricingToEdit.effectiveUntil || '',
        status: pricingToEdit.status === 'archived' ? 'inactive' : (pricingToEdit.status as 'active' | 'inactive')
      };
    } else {
      editingPricing = null;
      formData = emptyForm();
    }
    isModalOpen = true;
  }

  function handleFormChange<K extends keyof PricingForm>(field: K, value: PricingForm[K]) {
    modalError = null;
    overlapWarning = null;

    formData = { ...formData, [field]: value };

    // Check overlap warning dynamically
    if (field === 'effectiveFrom' || field === 'effectiveUntil') {
      const warning = checkPricingRangeOverlap(
        serviceId,
        editingPricing?.id,
        formData.effectiveFrom,
        formData.effectiveUntil || undefined,
        pricingList
      );
      overlapWarning = warning;
    }
  }

  async function handleSavePricing(e: Event) {
    e.preventDefault();
    modalError = null;

    if (!formData.effectiveFrom) {
      modalError = 'Tanggal mulai berlaku tarif wajib diisi.';
      return;
    }

    if (formData.effectiveUntil && formData.effectiveUntil < formData.effectiveFrom) {
      modalError = 'Tanggal akhir berlaku tidak boleh lebih awal dari tanggal mulai.';
      return;
    }

    if (formData.pricingType === 'fixed') {
      if (!formData.amount || isNaN(Number(formData.amount))) {
        modalError = 'Nominal tarif wajib diisi untuk jenis tarif tetap.';
        return;
      }
      if (Number(formData.amount) < 0) {
        modalError = 'Nominal tarif tidak boleh bernilai negatif.';
        return;
      }
    }

    saving = true;
    try {
      const actor = {
        id: user?.uid || 'usr-admin',
        email: user?.email || 'admin@puskesmas.go.id',
        name: user?.displayName || 'Administrator'
      };

      const payload = {
        pricingType: formData.pricingType,
        amount: formData.pricingType === 'fixed' ? Number(formData.amount) : (formData.pricingType === 'free' ? 0 : null),
        currency: formData.currency,
        unit: formData.unit,
        description: formData.description,
        effectiveFrom: formData.effectiveFrom,
        effectiveUntil: formData.effectiveUntil || undefined,
        status: formData.status
      };

      if (editingPricing) {
        await serviceEngineService.updatePricing(editingPricing.id, payload, actor);
        toastStore.showToast('Informasi tarif berhasil diperbarui!', 'success');
      } else {
        await serviceEngineService.createPricing(serviceId, payload, actor);
        toastStore.showToast('Informasi tarif baru berhasil ditambahkan!', 'success');
      }

      isModalOpen = false;
      loadPricing();
    } catch (err: any) {
      modalError = err.message || 'Gagal menyimpan informasi tarif.';
    } finally {
      saving = false;
    }
  }

  async function handleDeletePricing() {
    if (!deletingId) return;
    isDeleting = true;
    try {
      const actor = {
        id: user?.uid || 'usr-admin',
        email: user?.email || 'admin@puskesmas.go.id',
        name: user?.displayName || 'Administrator'
      };

      await serviceEngineService.archivePricing(deletingId, actor);
      toastStore.showToast('Informasi tarif berhasil diarsipkan.', 'success');
      deletingId = null;
      loadPricing();
    } catch (err: any) {
      toastStore.showToast(err.message || 'Gagal mengarsipkan tarif', 'error');
    } finally {
      isDeleting = false;
    }
  }

  function pricingTypeBadge(type: PricingType): { variant: 'emerald' | 'amber' | 'blue' | 'purple' | 'sky' | 'zinc'; label: string } {
    switch (type) {
      case 'free':
        return { variant: 'emerald', label: 'Gratis' };
      case 'fixed':
        return { variant: 'amber', label: 'Tarif Tetap (Fixed)' };
      case 'variable':
        return { variant: 'blue', label: 'Tarif Bervariasi' };
      case 'according_to_regulation':
        return { variant: 'purple', label: 'Sesuai Peraturan' };
      case 'insurance_covered':
        return { variant: 'sky', label: 'Ditanggung BPJS / Asuransi' };
      case 'not_available':
        return { variant: 'zinc', label: 'Belum Tersedia' };
      default:
        return { variant: 'zinc', label: type };
    }
  }

  function formatAmountText(item: ServicePricingEntity): string {
    if (item.pricingType === 'free') return 'Gratis (Rp 0)';
    if (item.pricingType === 'fixed' && item.amount !== null && item.amount !== undefined) {
      return `Rp ${item.amount.toLocaleString('id-ID')}`;
    }
    if (item.pricingType === 'variable') return 'Bervariasi (Sesuai Tindakan)';
    if (item.pricingType === 'according_to_regulation') return 'Sesuai Ketentuan Berlaku';
    if (item.pricingType === 'insurance_covered') return 'Ditanggung Kepesertaan';
    return 'Informasi Belum Tersedia';
  }
</script>

<div class="space-y-6">
  <Card class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--color-border)]">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-2xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-center text-[var(--color-primary)]">
          <DollarSign class="w-5 h-5" />
        </div>
        <div>
          <h3 class="text-base font-bold text-[var(--color-text)]">Informasi Biaya & Tarif Pelayanan</h3>
          <p class="text-xs text-[var(--color-muted-foreground)]">Skema tarif resmi, unit biaya, dan periode keberlakuan untuk {serviceName}</p>
        </div>
      </div>

      <Button onclick={() => handleOpenModal()} variant="primary">
        <Plus class="w-4 h-4" />
        Tambah Informasi Tarif
      </Button>
    </div>

    <!-- Informational Banner -->
    <div class="p-4 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] text-xs text-[var(--color-text)] space-y-1">
      <div class="flex items-center gap-2 font-semibold text-[var(--color-text)]">
        <Info class="w-4 h-4 text-[var(--color-primary)]" />
        <span>Ketentuan Informasi Tarif Resmi:</span>
      </div>
      <p class="text-[var(--color-muted-foreground)] text-[11px] leading-relaxed">
        Semua nominal tarif harus berupa angka bersih (tanpa formatting string). Tarif dengan skema "Sesuai Peraturan" atau "BPJS" dapat dilengkapi keterangan nomor peraturan atau syarat kepesertaan. Tarif lama akan tersimpan sebagai histori.
      </p>
    </div>

    <!-- Pricing Table / Cards -->
    {#if loading}
      <div class="p-8 text-center text-[var(--color-muted-foreground)] text-xs animate-pulse">
        Memuat informasi tarif pelayanan...
      </div>
    {:else if pricingList.length === 0}
      <div class="p-8 text-center border border-dashed border-[var(--color-border)] rounded-2xl space-y-2">
        <DollarSign class="w-8 h-8 mx-auto text-zinc-600" />
        <p class="text-xs text-[var(--color-muted-foreground)]">Informasi tarif belum tersedia untuk layanan ini.</p>
      </div>
    {:else}
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="border-b border-[var(--color-border)] text-[var(--color-muted-foreground)] font-semibold bg-[var(--color-bg)]">
              <th class="py-3 px-4">Kategori Tarif</th>
              <th class="py-3 px-4">Nominal / Skema</th>
              <th class="py-3 px-4">Satuan</th>
              <th class="py-3 px-4">Periode Berlaku</th>
              <th class="py-3 px-4">Status</th>
              <th class="py-3 px-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[var(--color-border)]">
            {#each pricingList as item (item.id)}
              {@const isArchived = item.status === 'archived'}
              {@const badge = pricingTypeBadge(item.pricingType)}
              <tr class={`hover:bg-[var(--color-card)] transition ${isArchived ? 'opacity-50' : ''}`}>
                <td class="py-3 px-4">
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                </td>
                <td class="py-3 px-4 font-mono font-bold text-[var(--color-text)]">
                  {formatAmountText(item)}
                </td>
                <td class="py-3 px-4 text-[var(--color-text)]">
                  {item.unit || 'per pelayanan'}
                </td>
                <td class="py-3 px-4 font-mono text-[var(--color-text)]">
                  <div class="flex items-center gap-1.5">
                    <Calendar class="w-3.5 h-3.5 text-[var(--color-muted-foreground)]" />
                    <span>{item.effectiveFrom}</span>
                    <span class="text-[var(--color-muted-foreground)]">s.d</span>
                    <span>{item.effectiveUntil || 'Seterusnya'}</span>
                  </div>
                </td>
                <td class="py-3 px-4">
                  {#if item.status === 'active'}
                    <Badge variant="emerald">Aktif</Badge>
                  {:else if item.status === 'inactive'}
                    <Badge variant="amber">Nonaktif</Badge>
                  {:else}
                    <Badge variant="zinc">Diarsipkan</Badge>
                  {/if}
                </td>
                <td class="py-3 px-4 text-right">
                  <div class="flex items-center justify-end gap-2">
                    <button
                      onclick={() => handleOpenModal(item)}
                      class="p-1.5 rounded-lg hover:bg-[var(--color-surface)] text-[var(--color-muted-foreground)] hover:text-[var(--color-text)] transition"
                      title="Edit"
                    >
                      <Edit2 class="w-3.5 h-3.5" />
                    </button>
                    {#if item.status !== 'archived'}
                      <button
                        onclick={() => (deletingId = item.id)}
                        class="p-1.5 rounded-lg hover:bg-red-500/20 text-[var(--color-muted-foreground)] hover:text-red-400 transition"
                        title="Arsipkan"
                      >
                        <Trash2 class="w-3.5 h-3.5" />
                      </button>
                    {/if}
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </Card>

  <!-- MODAL ADD / EDIT PRICING -->
  <Modal
    isOpen={isModalOpen}
    onClose={() => (isModalOpen = false)}
    title={editingPricing ? 'Edit Informasi Tarif' : 'Tambah Informasi Tarif Layanan'}
  >
    <form onsubmit={handleSavePricing} class="space-y-4">
      {#if modalError}
        <div class="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
          <AlertTriangle class="w-4 h-4 shrink-0" />
          <span>{modalError}</span>
        </div>
      {/if}

      {#if overlapWarning}
        <div class="p-3 rounded-xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 text-[var(--color-primary)] text-xs flex items-center gap-2">
          <AlertTriangle class="w-4 h-4 shrink-0 text-[var(--color-primary)]" />
          <span>Peringatan Overlap: {overlapWarning}</span>
        </div>
      {/if}

      <div class="space-y-1">
        <label class="text-xs font-semibold text-[var(--color-text)] block">
          Kategori / Skema Tarif <span class="text-red-400">*</span>
        </label>
        <select
          value={formData.pricingType}
          onchange={(e) => handleFormChange('pricingType', e.currentTarget.value as PricingType)}
          class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
        >
          <option value="free">Gratis (Free)</option>
          <option value="fixed">Tarif Tetap (Fixed Amount)</option>
          <option value="variable">Tarif Bervariasi (Tergantung Tindakan)</option>
          <option value="according_to_regulation">Sesuai Peraturan / Ketentuan Resmi</option>
          <option value="insurance_covered">Ditanggung BPJS / Asuransi</option>
          <option value="not_available">Informasi Tarif Belum Tersedia</option>
        </select>
      </div>

      {#if formData.pricingType === 'fixed'}
        <div class="grid grid-cols-3 gap-3">
          <div class="col-span-2 space-y-1">
            <label class="text-xs font-semibold text-[var(--color-text)] block">
              Nominal Angka (Rp) <span class="text-red-400">*</span>
            </label>
            <input
              type="number"
              min="0"
              required
              placeholder="Contoh: 15000"
              value={formData.amount}
              oninput={(e) => handleFormChange('amount', e.currentTarget.value)}
              class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs text-[var(--color-text)] font-mono focus:outline-none focus:border-[var(--color-primary)]"
            />
          </div>

          <div class="space-y-1">
            <label class="text-xs font-semibold text-[var(--color-text)] block">Mata Uang</label>
            <input
              type="text"
              readonly
              value={formData.currency}
              class="w-full bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs text-[var(--color-muted-foreground)] font-mono"
            />
          </div>
        </div>
      {/if}

      <div class="space-y-1">
        <label class="text-xs font-semibold text-[var(--color-text)] block">
          Satuan Biaya (Unit) <span class="text-red-400">*</span>
        </label>
        <input
          type="text"
          required
          placeholder="Contoh: per pelayanan, per tindakan, per pemeriksaan"
          value={formData.unit}
          oninput={(e) => handleFormChange('unit', e.currentTarget.value)}
          class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
        />
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div class="space-y-1">
          <label class="text-xs font-semibold text-[var(--color-text)] block">
            Berlaku Mulai (Effective From) <span class="text-red-400">*</span>
          </label>
          <input
            type="date"
            required
            value={formData.effectiveFrom}
            onchange={(e) => handleFormChange('effectiveFrom', e.currentTarget.value)}
            class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
          />
        </div>

        <div class="space-y-1">
          <label class="text-xs font-semibold text-[var(--color-text)] block">
            Berlaku Sampai (Effective Until)
          </label>
          <input
            type="date"
            value={formData.effectiveUntil}
            onchange={(e) => handleFormChange('effectiveUntil', e.currentTarget.value)}
            placeholder="Kosongkan untuk seterusnya"
            class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
          />
        </div>
      </div>

      <div class="space-y-1">
        <label class="text-xs font-semibold text-[var(--color-text)] block">
          Catatan / Keterangan Tarif
        </label>
        <textarea
          rows={2}
          placeholder="Contoh: Gratis untuk peserta BPJS Kesehatan aktif. Tarif pasien umum sesuai Perwali No. 12 Tahun 2024."
          value={formData.description}
          oninput={(e) => handleFormChange('description', e.currentTarget.value)}
          class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
        ></textarea>
      </div>

      <div class="space-y-1">
        <label class="text-xs font-semibold text-[var(--color-text)] block">Status Record</label>
        <select
          value={formData.status}
          onchange={(e) => handleFormChange('status', e.currentTarget.value as 'active' | 'inactive')}
          class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
        >
          <option value="active">Aktif</option>
          <option value="inactive">Nonaktif</option>
        </select>
      </div>

      <div class="flex justify-end gap-2 pt-4 border-t border-[var(--color-border)]">
        <Button
          type="button"
          variant="secondary"
          onclick={() => (isModalOpen = false)}
        >
          Batal
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={saving}
        >
          {saving ? 'Menyimpan...' : 'Simpan Informasi Tarif'}
        </Button>
      </div>
    </form>
  </Modal>

  <!-- CONFIRMATION DIALOG -->
  <ConfirmModal
    isOpen={Boolean(deletingId)}
    onClose={() => (deletingId = null)}
    onConfirm={handleDeletePricing}
    title="Arsipkan Informasi Tarif"
    message="Apakah Anda yakin ingin mengarsipkan informasi tarif ini?"
    confirmLabel="Arsipkan"
    isLoading={isDeleting}
  />
</div>
