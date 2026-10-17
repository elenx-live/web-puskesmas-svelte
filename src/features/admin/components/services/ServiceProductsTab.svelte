<!-- @component Tab kelola produk/hasil keluaran layanan: daftar produk berurutan dengan tambah/edit, toggle status, arsip, dan reorder. -->
<script lang="ts">
  import Button from '../../../../shared/ui/Button.svelte';
  import Input from '../../../../shared/ui/Input.svelte';
  import Badge from '../../../../shared/ui/Badge.svelte';
  import Modal from '../../../../shared/ui/Modal.svelte';
  import { authStore } from '../../../../shared/stores/auth.svelte.js';
  import { toastStore } from '../../../../shared/stores/toast.svelte.js';
  import { serviceEngineService } from '../../../../shared/services/serviceEngineService.js';
  import type { ServiceProductEntity, ActiveStatus } from '../../../../shared/types/index.js';
  import {
    Plus,
    Edit,
    Archive,
    ArrowUp,
    ArrowDown,
    Package,
    Check,
    RefreshCw,
    RotateCcw
  } from 'lucide-svelte';

  interface Props {
    serviceId: string;
    serviceName: string;
  }

  let { serviceId, serviceName }: Props = $props();

  const user = $derived(authStore.user);

  let products = $state<ServiceProductEntity[]>([]);
  let loading = $state(true);

  // Modal State
  let isModalOpen = $state(false);
  let editingProd = $state<Partial<ServiceProductEntity> | null>(null);
  let saving = $state(false);

  $effect(() => {
    if (serviceId) {
      loadProducts();
    }
  });

  async function loadProducts() {
    loading = true;
    try {
      const data = await serviceEngineService.getProductsByServiceId(serviceId);
      products = data;
    } catch (err) {
      console.error('Failed to load service products:', err);
      toastStore.showToast('Gagal memuat produk hasil layanan', 'error');
    } finally {
      loading = false;
    }
  }

  function handleOpenCreate() {
    editingProd = {
      name: '',
      description: '',
      status: 'active',
      displayOrder: products.length + 1
    };
    isModalOpen = true;
  }

  function handleOpenEdit(prod: ServiceProductEntity) {
    editingProd = { ...prod };
    isModalOpen = true;
  }

  function updateEditingProd(patch: Partial<ServiceProductEntity>) {
    if (!editingProd) return;
    editingProd = { ...editingProd, ...patch };
  }

  async function handleSave(e: Event) {
    e.preventDefault();
    if (!editingProd || !user || !serviceId) return;

    if (!editingProd.name?.trim()) {
      toastStore.showToast('Nama produk layanan wajib diisi', 'error');
      return;
    }

    saving = true;
    try {
      const actor = { id: user.uid, email: user.email, name: user.displayName || 'Admin' };

      if (editingProd.id) {
        await serviceEngineService.updateProduct(editingProd.id, editingProd, actor);
        toastStore.showToast(`Produk "${editingProd.name}" berhasil diperbarui`, 'success');
      } else {
        await serviceEngineService.createProduct(serviceId, editingProd, actor);
        toastStore.showToast(`Produk "${editingProd.name}" berhasil ditambahkan`, 'success');
      }

      isModalOpen = false;
      editingProd = null;
      await loadProducts();
    } catch (err: any) {
      console.error('Failed to save product:', err);
      toastStore.showToast(err.message || 'Gagal menyimpan produk layanan', 'error');
    } finally {
      saving = false;
    }
  }

  async function handleToggleStatus(prod: ServiceProductEntity) {
    if (!user) return;
    const nextStatus: ActiveStatus = prod.status === 'active' ? 'inactive' : 'active';
    try {
      const actor = { id: user.uid, email: user.email, name: user.displayName || 'Admin' };
      await serviceEngineService.updateProduct(prod.id, { status: nextStatus }, actor);
      toastStore.showToast(`Status produk diubah menjadi ${nextStatus}`, 'success');
      await loadProducts();
    } catch (err) {
      toastStore.showToast('Gagal mengubah status', 'error');
    }
  }

  async function handleArchive(prod: ServiceProductEntity) {
    if (!user) return;
    try {
      const actor = { id: user.uid, email: user.email, name: user.displayName || 'Admin' };
      if (prod.status === 'archived') {
        await serviceEngineService.restoreProduct(prod.id, actor);
        toastStore.showToast('Produk layanan dipulihkan', 'success');
      } else {
        await serviceEngineService.archiveProduct(prod.id, actor);
        toastStore.showToast('Produk layanan diarsipkan', 'success');
      }
      await loadProducts();
    } catch (err) {
      toastStore.showToast('Gagal mengarsipkan produk layanan', 'error');
    }
  }

  async function handleMove(index: number, direction: 'up' | 'down') {
    if (!user) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= products.length) return;

    const newProds = [...products];
    const temp = newProds[index];
    newProds[index] = newProds[targetIndex];
    newProds[targetIndex] = temp;

    products = newProds;

    try {
      const actor = { id: user.uid, email: user.email, name: user.displayName || 'Admin' };
      const orderedIds = newProds.map((p) => p.id);
      await serviceEngineService.reorderProducts(serviceId, orderedIds, actor);
      toastStore.showToast('Urutan produk berhasil diperbarui', 'success');
    } catch (err) {
      toastStore.showToast('Gagal memperbarui urutan', 'error');
      await loadProducts();
    }
  }
</script>

<div class="space-y-4 text-xs">
  <!-- Header Toolbar -->
  <div class="flex items-center justify-between bg-[var(--color-bg)] p-3 rounded-2xl border border-[var(--color-border)]">
    <div class="flex items-center gap-2">
      <Package class="w-4 h-4 text-[var(--color-primary)]" />
      <span class="font-bold text-[var(--color-text)]">Produk / Hasil Keluaran Pelayanan</span>
      <span class="text-[var(--color-muted-foreground)] font-normal">({products.length} item)</span>
    </div>

    <Button
      type="button"
      onclick={handleOpenCreate}
      class="bg-[var(--color-primary)] hover:bg-amber-600 text-[var(--color-primary-foreground)] font-bold h-8 text-[11px] px-3 flex items-center gap-1.5"
    >
      <Plus class="w-3.5 h-3.5 stroke-[3]" />
      <span>+ Tambah Produk Layanan</span>
    </Button>
  </div>

  <!-- List / Table -->
  {#if loading}
    <div class="p-8 text-center text-[var(--color-muted-foreground)] flex items-center justify-center gap-2">
      <RefreshCw class="w-4 h-4 animate-spin text-[var(--color-primary)]" />
      <span>Memuat produk layanan...</span>
    </div>
  {:else if products.length === 0}
    <div class="p-8 text-center bg-[var(--color-bg)] border border-dashed border-[var(--color-border)] rounded-2xl space-y-2">
      <Package class="w-8 h-8 text-zinc-600 mx-auto" />
      <p class="text-[var(--color-muted-foreground)] font-medium">Belum ada produk layanan.</p>
      <p class="text-[var(--color-muted-foreground)] text-[11px]">
        Daftarkan produk hasil akhir pelayanan seperti Resep Obat, Surat Keterangan Dokter, atau Kartu Pemeriksaan.
      </p>
    </div>
  {:else}
    <div class="overflow-x-auto border border-[var(--color-border)] rounded-2xl bg-[var(--color-bg)]">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="border-b border-[var(--color-border)] text-[var(--color-muted-foreground)] text-[11px] bg-[var(--color-card)]/50 uppercase tracking-wider font-semibold">
            <th class="py-2.5 px-3 w-12 text-center">No</th>
            <th class="py-2.5 px-3">Nama Produk Output</th>
            <th class="py-2.5 px-3">Penjelasan & Keterangan</th>
            <th class="py-2.5 px-3">Status</th>
            <th class="py-2.5 px-3 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-[var(--color-border)]">
          {#each products as prod, idx (prod.id)}
            <tr class="hover:bg-[var(--color-card)]/40 transition">
              <td class="py-2.5 px-3 text-center text-[var(--color-muted-foreground)] font-mono text-[11px]">{idx + 1}</td>
              <td class="py-2.5 px-3">
                <div class="font-medium text-[var(--color-text)]">{prod.name}</div>
              </td>
              <td class="py-2.5 px-3 max-w-xs">
                <div class="text-[11px] text-[var(--color-muted-foreground)] line-clamp-2">{prod.description || '-'}</div>
              </td>
              <td class="py-2.5 px-3">
                {#if prod.status === 'active'}<Badge variant="emerald">Aktif</Badge>{/if}
                {#if prod.status === 'inactive'}<Badge variant="red">Nonaktif</Badge>{/if}
                {#if prod.status === 'archived'}<Badge variant="zinc">Arsip</Badge>{/if}
              </td>
              <td class="py-2.5 px-3 text-right space-x-1">
                <!-- Reorder Buttons -->
                <button
                  type="button"
                  disabled={idx === 0}
                  onclick={() => handleMove(idx, 'up')}
                  class="p-1 rounded text-[var(--color-muted-foreground)] hover:text-[var(--color-text)] disabled:opacity-30 disabled:hover:text-[var(--color-muted-foreground)]"
                  title="Naikkan Urutan"
                >
                  <ArrowUp class="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={idx === products.length - 1}
                  onclick={() => handleMove(idx, 'down')}
                  class="p-1 rounded text-[var(--color-muted-foreground)] hover:text-[var(--color-text)] disabled:opacity-30 disabled:hover:text-[var(--color-muted-foreground)]"
                  title="Turunkan Urutan"
                >
                  <ArrowDown class="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onclick={() => handleOpenEdit(prod)}
                  class="p-1 text-[var(--color-primary)] hover:text-[var(--color-primary)] rounded ml-1"
                  title="Edit Produk"
                >
                  <Edit class="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onclick={() => handleToggleStatus(prod)}
                  class={`p-1 rounded ${prod.status === 'active' ? 'text-[var(--color-muted-foreground)] hover:text-[var(--color-text)]' : 'text-[var(--color-primary)] hover:text-emerald-300'}`}
                  title={prod.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}
                >
                  <Check class="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onclick={() => handleArchive(prod)}
                  class="p-1 text-red-400 hover:text-red-300 rounded"
                  title={prod.status === 'archived' ? 'Pulihkan' : 'Arsipkan'}
                >
                  {#if prod.status === 'archived'}
                    <RotateCcw class="w-3.5 h-3.5" />
                  {:else}
                    <Archive class="w-3.5 h-3.5" />
                  {/if}
                </button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}

  <!-- MODAL FORM -->
  <Modal
    isOpen={isModalOpen}
    onClose={() => (isModalOpen = false)}
    title={editingProd?.id ? 'Edit Produk Layanan' : 'Tambah Produk Layanan Baru'}
    size="md"
  >
    {#if editingProd}
      <form onsubmit={handleSave} class="space-y-4 text-xs">
        <Input
          label="Nama Produk / Hasil Output *"
          value={editingProd.name || ''}
          oninput={(e) => updateEditingProd({ name: e.currentTarget.value })}
          placeholder="Contoh: Resep Obat & Paket Terapi Obat Dasar"
          required
        />

        <div class="space-y-1">
          <label class="font-semibold text-[var(--color-text)]">Deskripsi / Penjelasan Produk</label>
          <textarea
            rows={4}
            value={editingProd.description || ''}
            oninput={(e) => updateEditingProd({ description: e.currentTarget.value })}
            placeholder="Contoh: Pemberian obat resep yang disesuaikan dengan hasil diagnosis dokter umum..."
            class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-2.5 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
          ></textarea>
        </div>

        <div class="space-y-1">
          <label class="font-semibold text-[var(--color-text)]">Status Produk</label>
          <select
            value={editingProd.status || 'active'}
            onchange={(e) => updateEditingProd({ status: e.currentTarget.value as ActiveStatus })}
            class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-[var(--color-text)] text-xs focus:outline-none focus:border-[var(--color-primary)]"
          >
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
            <option value="archived">Arsip</option>
          </select>
        </div>

        <div class="pt-3 border-t border-[var(--color-border)] flex justify-end space-x-2">
          <Button type="button" variant="ghost" onclick={() => (isModalOpen = false)}>
            Batal
          </Button>
          <Button type="submit" disabled={saving} class="bg-[var(--color-primary)] hover:bg-amber-600 text-[var(--color-primary-foreground)] font-bold">
            {saving ? 'Menyimpan...' : 'Simpan Produk'}
          </Button>
        </div>
      </form>
    {/if}
  </Modal>
</div>
