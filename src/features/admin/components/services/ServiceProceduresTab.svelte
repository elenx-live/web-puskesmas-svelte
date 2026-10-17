<!-- @component Tab kelola alur prosedur layanan: daftar langkah berurutan dengan tambah/edit, toggle status, arsip, dan reorder. -->
<script lang="ts">
  import Button from '../../../../shared/ui/Button.svelte';
  import Input from '../../../../shared/ui/Input.svelte';
  import Badge from '../../../../shared/ui/Badge.svelte';
  import Modal from '../../../../shared/ui/Modal.svelte';
  import { authStore } from '../../../../shared/stores/auth.svelte.js';
  import { toastStore } from '../../../../shared/stores/toast.svelte.js';
  import { serviceEngineService } from '../../../../shared/services/serviceEngineService.js';
  import type { ServiceProcedureEntity, ActiveStatus } from '../../../../shared/types/index.js';
  import {
    Plus,
    Edit,
    Archive,
    ArrowUp,
    ArrowDown,
    ListOrdered,
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

  let procedures = $state<ServiceProcedureEntity[]>([]);
  let loading = $state(true);

  // Modal State
  let isModalOpen = $state(false);
  let editingProc = $state<Partial<ServiceProcedureEntity> | null>(null);
  let saving = $state(false);

  $effect(() => {
    if (serviceId) {
      loadProcedures();
    }
  });

  async function loadProcedures() {
    loading = true;
    try {
      const data = await serviceEngineService.getProceduresByServiceId(serviceId);
      procedures = data;
    } catch (err) {
      console.error('Failed to load procedures:', err);
      toastStore.showToast('Gagal memuat alur langkah prosedur', 'error');
    } finally {
      loading = false;
    }
  }

  function handleOpenCreate() {
    editingProc = {
      title: '',
      description: '',
      status: 'active',
      displayOrder: procedures.length + 1
    };
    isModalOpen = true;
  }

  function handleOpenEdit(proc: ServiceProcedureEntity) {
    editingProc = { ...proc };
    isModalOpen = true;
  }

  function updateEditingProc(patch: Partial<ServiceProcedureEntity>) {
    if (!editingProc) return;
    editingProc = { ...editingProc, ...patch };
  }

  async function handleSave(e: Event) {
    e.preventDefault();
    if (!editingProc || !user || !serviceId) return;

    if (!editingProc.title?.trim()) {
      toastStore.showToast('Judul langkah prosedur wajib diisi', 'error');
      return;
    }

    saving = true;
    try {
      const actor = { id: user.uid, email: user.email, name: user.displayName || 'Admin' };

      if (editingProc.id) {
        await serviceEngineService.updateProcedure(editingProc.id, editingProc, actor);
        toastStore.showToast(`Langkah prosedur "${editingProc.title}" berhasil diperbarui`, 'success');
      } else {
        await serviceEngineService.createProcedure(serviceId, editingProc, actor);
        toastStore.showToast(`Langkah prosedur "${editingProc.title}" berhasil ditambahkan`, 'success');
      }

      isModalOpen = false;
      editingProc = null;
      await loadProcedures();
    } catch (err: any) {
      console.error('Failed to save procedure:', err);
      toastStore.showToast(err.message || 'Gagal menyimpan langkah prosedur', 'error');
    } finally {
      saving = false;
    }
  }

  async function handleToggleStatus(proc: ServiceProcedureEntity) {
    if (!user) return;
    const nextStatus: ActiveStatus = proc.status === 'active' ? 'inactive' : 'active';
    try {
      const actor = { id: user.uid, email: user.email, name: user.displayName || 'Admin' };
      await serviceEngineService.updateProcedure(proc.id, { status: nextStatus }, actor);
      toastStore.showToast(`Status langkah prosedur diubah menjadi ${nextStatus}`, 'success');
      await loadProcedures();
    } catch (err) {
      toastStore.showToast('Gagal mengubah status', 'error');
    }
  }

  async function handleArchive(proc: ServiceProcedureEntity) {
    if (!user) return;
    try {
      const actor = { id: user.uid, email: user.email, name: user.displayName || 'Admin' };
      if (proc.status === 'archived') {
        await serviceEngineService.restoreProcedure(proc.id, actor);
        toastStore.showToast('Langkah prosedur dipulihkan', 'success');
      } else {
        await serviceEngineService.archiveProcedure(proc.id, actor);
        toastStore.showToast('Langkah prosedur diarsipkan', 'success');
      }
      await loadProcedures();
    } catch (err) {
      toastStore.showToast('Gagal mengarsipkan langkah prosedur', 'error');
    }
  }

  async function handleMove(index: number, direction: 'up' | 'down') {
    if (!user) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= procedures.length) return;

    const newProcs = [...procedures];
    const temp = newProcs[index];
    newProcs[index] = newProcs[targetIndex];
    newProcs[targetIndex] = temp;

    procedures = newProcs;

    try {
      const actor = { id: user.uid, email: user.email, name: user.displayName || 'Admin' };
      const orderedIds = newProcs.map((p) => p.id);
      await serviceEngineService.reorderProcedures(serviceId, orderedIds, actor);
      toastStore.showToast('Urutan langkah prosedur berhasil diperbarui', 'success');
    } catch (err) {
      toastStore.showToast('Gagal memperbarui urutan', 'error');
      await loadProcedures();
    }
  }
</script>

<div class="space-y-4 text-xs">
  <!-- Header Toolbar -->
  <div class="flex items-center justify-between bg-[var(--color-bg)] p-3 rounded-2xl border border-[var(--color-border)]">
    <div class="flex items-center gap-2">
      <ListOrdered class="w-4 h-4 text-[var(--color-primary)]" />
      <span class="font-bold text-[var(--color-text)]">Alur Prosedur & Langkah Pelayanan</span>
      <span class="text-[var(--color-muted-foreground)] font-normal">({procedures.length} langkah)</span>
    </div>

    <Button
      type="button"
      onclick={handleOpenCreate}
      class="bg-[var(--color-primary)] hover:bg-amber-600 text-[var(--color-primary-foreground)] font-bold h-8 text-[11px] px-3 flex items-center gap-1.5"
    >
      <Plus class="w-3.5 h-3.5 stroke-[3]" />
      <span>+ Tambah Langkah Prosedur</span>
    </Button>
  </div>

  <!-- List / Table -->
  {#if loading}
    <div class="p-8 text-center text-[var(--color-muted-foreground)] flex items-center justify-center gap-2">
      <RefreshCw class="w-4 h-4 animate-spin text-[var(--color-primary)]" />
      <span>Memuat alur prosedur...</span>
    </div>
  {:else if procedures.length === 0}
    <div class="p-8 text-center bg-[var(--color-bg)] border border-dashed border-[var(--color-border)] rounded-2xl space-y-2">
      <ListOrdered class="w-8 h-8 text-zinc-600 mx-auto" />
      <p class="text-[var(--color-muted-foreground)] font-medium">Belum ada alur prosedur pelayanan.</p>
      <p class="text-[var(--color-muted-foreground)] text-[11px]">
        Susun langkah-langkah alur pelayanan dari pendaftaran, skrining, pemeriksaan, hingga selesai.
      </p>
    </div>
  {:else}
    <div class="overflow-x-auto border border-[var(--color-border)] rounded-2xl bg-[var(--color-bg)]">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="border-b border-[var(--color-border)] text-[var(--color-muted-foreground)] text-[11px] bg-[var(--color-card)]/50 uppercase tracking-wider font-semibold">
            <th class="py-2.5 px-3 w-16 text-center">Langkah</th>
            <th class="py-2.5 px-3">Nama Langkah Prosedur</th>
            <th class="py-2.5 px-3">Penjelasan & Instruksi Alur</th>
            <th class="py-2.5 px-3">Status</th>
            <th class="py-2.5 px-3 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-[var(--color-border)]">
          {#each procedures as proc, idx (proc.id)}
            <tr class="hover:bg-[var(--color-card)]/40 transition">
              <td class="py-2.5 px-3 text-center">
                <span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 text-[var(--color-primary)] font-bold font-mono text-[11px]">
                  {idx + 1}
                </span>
              </td>
              <td class="py-2.5 px-3">
                <div class="font-medium text-[var(--color-text)]">{proc.title}</div>
              </td>
              <td class="py-2.5 px-3 max-w-xs">
                <div class="text-[11px] text-[var(--color-muted-foreground)] line-clamp-2">{proc.description || '-'}</div>
              </td>
              <td class="py-2.5 px-3">
                {#if proc.status === 'active'}<Badge variant="emerald">Aktif</Badge>{/if}
                {#if proc.status === 'inactive'}<Badge variant="red">Nonaktif</Badge>{/if}
                {#if proc.status === 'archived'}<Badge variant="zinc">Arsip</Badge>{/if}
              </td>
              <td class="py-2.5 px-3 text-right space-x-1">
                <!-- Reorder Buttons -->
                <button
                  type="button"
                  disabled={idx === 0}
                  onclick={() => handleMove(idx, 'up')}
                  class="p-1 rounded text-[var(--color-muted-foreground)] hover:text-[var(--color-text)] disabled:opacity-30 disabled:hover:text-[var(--color-muted-foreground)]"
                  title="Naikkan Langkah"
                >
                  <ArrowUp class="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={idx === procedures.length - 1}
                  onclick={() => handleMove(idx, 'down')}
                  class="p-1 rounded text-[var(--color-muted-foreground)] hover:text-[var(--color-text)] disabled:opacity-30 disabled:hover:text-[var(--color-muted-foreground)]"
                  title="Turunkan Langkah"
                >
                  <ArrowDown class="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onclick={() => handleOpenEdit(proc)}
                  class="p-1 text-[var(--color-primary)] hover:text-[var(--color-primary)] rounded ml-1"
                  title="Edit Prosedur"
                >
                  <Edit class="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onclick={() => handleToggleStatus(proc)}
                  class={`p-1 rounded ${proc.status === 'active' ? 'text-[var(--color-muted-foreground)] hover:text-[var(--color-text)]' : 'text-[var(--color-primary)] hover:text-emerald-300'}`}
                  title={proc.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}
                >
                  <Check class="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onclick={() => handleArchive(proc)}
                  class="p-1 text-red-400 hover:text-red-300 rounded"
                  title={proc.status === 'archived' ? 'Pulihkan' : 'Arsipkan'}
                >
                  {#if proc.status === 'archived'}
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
    title={editingProc?.id ? 'Edit Langkah Prosedur' : 'Tambah Langkah Prosedur Baru'}
    size="md"
  >
    {#if editingProc}
      <form onsubmit={handleSave} class="space-y-4 text-xs">
        <Input
          label="Nama Langkah Prosedur *"
          value={editingProc.title || ''}
          oninput={(e) => updateEditingProc({ title: e.currentTarget.value })}
          placeholder="Contoh: Skrining Tanda Vital oleh Perawat"
          required
        />

        <div class="space-y-1">
          <label class="font-semibold text-[var(--color-text)]">Instruksi / Rincian Penjelasan Langkah</label>
          <textarea
            rows={4}
            value={editingProc.description || ''}
            oninput={(e) => updateEditingProc({ description: e.currentTarget.value })}
            placeholder="Contoh: Petugas melakukan pengukuran tensi darah, suhu, dan pencatatan keluhan awal pasien..."
            class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-2.5 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
          ></textarea>
        </div>

        <div class="space-y-1">
          <label class="font-semibold text-[var(--color-text)]">Status Status Prosedur</label>
          <select
            value={editingProc.status || 'active'}
            onchange={(e) => updateEditingProc({ status: e.currentTarget.value as ActiveStatus })}
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
            {saving ? 'Menyimpan...' : 'Simpan Prosedur'}
          </Button>
        </div>
      </form>
    {/if}
  </Modal>
</div>
