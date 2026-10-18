<!-- @component Tab kelola persyaratan layanan: daftar persyaratan berurutan dengan deteksi judul duplikat, tambah/edit, toggle status, arsip, dan reorder. -->
<script lang="ts">
  import Button from '../../../../shared/ui/Button.svelte';
  import Input from '../../../../shared/ui/Input.svelte';
  import Badge from '../../../../shared/ui/Badge.svelte';
  import Modal from '../../../../shared/ui/Modal.svelte';
  import { authStore } from '../../../../shared/stores/auth.svelte.js';
  import { toastStore } from '../../../../shared/stores/toast.svelte.js';
  import { serviceEngineService } from '../../../../shared/services/serviceEngineService.js';
  import type { ServiceRequirementEntity, ActiveStatus } from '../../../../shared/types/index.js';
  import {
    Plus,
    Edit,
    Archive,
    ArrowUp,
    ArrowDown,
    AlertTriangle,
    FileText,
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

  let requirements = $state<ServiceRequirementEntity[]>([]);
  let loading = $state(true);

  // Modal State
  let isModalOpen = $state(false);
  let editingReq = $state<Partial<ServiceRequirementEntity> | null>(null);
  let saving = $state(false);

  // Duplicate Warning Alert
  let duplicateWarning = $state<string | null>(null);

  $effect(() => {
    if (serviceId) {
      loadRequirements();
    }
  });

  async function loadRequirements() {
    loading = true;
    try {
      const data = await serviceEngineService.getRequirementsByServiceId(serviceId);
      requirements = data;
    } catch (err) {
      console.error('Failed to load requirements:', err);
      toastStore.showToast('Gagal memuat daftar persyaratan', 'error');
    } finally {
      loading = false;
    }
  }

  function handleOpenCreate() {
    editingReq = {
      title: '',
      description: '',
      required: true,
      status: 'active',
      displayOrder: requirements.length + 1
    };
    duplicateWarning = null;
    isModalOpen = true;
  }

  function handleOpenEdit(req: ServiceRequirementEntity) {
    editingReq = { ...req };
    duplicateWarning = null;
    isModalOpen = true;
  }

  function updateEditingReq(patch: Partial<ServiceRequirementEntity>) {
    if (!editingReq) return;
    editingReq = { ...editingReq, ...patch };
  }

  async function handleTitleChange(title: string) {
    if (!editingReq) return;
    editingReq = { ...editingReq, title };

    if (title.trim()) {
      const isDup = await serviceEngineService.checkDuplicateRequirementTitle(
        serviceId,
        title,
        editingReq.id
      );
      if (isDup) {
        duplicateWarning = `Peringatan: Persyaratan dengan judul "${title}" sudah terdaftar untuk layanan ini.`;
      } else {
        duplicateWarning = null;
      }
    } else {
      duplicateWarning = null;
    }
  }

  async function handleSave(e: Event) {
    e.preventDefault();
    if (!editingReq || !user || !serviceId) return;

    if (!editingReq.title?.trim()) {
      toastStore.showToast('Judul persyaratan wajib diisi', 'error');
      return;
    }

    saving = true;
    try {
      const actor = { id: user.uid, email: user.email, name: user.displayName || 'Admin' };

      if (editingReq.id) {
        await serviceEngineService.updateRequirement(editingReq.id, editingReq, actor);
        toastStore.showToast(`Persyaratan "${editingReq.title}" berhasil diperbarui`, 'success');
      } else {
        await serviceEngineService.createRequirement(serviceId, editingReq, actor);
        toastStore.showToast(`Persyaratan "${editingReq.title}" berhasil ditambahkan`, 'success');
      }

      isModalOpen = false;
      editingReq = null;
      await loadRequirements();
    } catch (err: any) {
      console.error('Failed to save requirement:', err);
      toastStore.showToast(err.message || 'Gagal menyimpan persyaratan', 'error');
    } finally {
      saving = false;
    }
  }

  async function handleToggleStatus(req: ServiceRequirementEntity) {
    if (!user) return;
    const nextStatus: ActiveStatus = req.status === 'active' ? 'inactive' : 'active';
    try {
      const actor = { id: user.uid, email: user.email, name: user.displayName || 'Admin' };
      await serviceEngineService.updateRequirement(req.id, { status: nextStatus }, actor);
      toastStore.showToast(`Status persyaratan diubah menjadi ${nextStatus}`, 'success');
      await loadRequirements();
    } catch (err) {
      toastStore.showToast('Gagal mengubah status', 'error');
    }
  }

  async function handleArchive(req: ServiceRequirementEntity) {
    if (!user) return;
    try {
      const actor = { id: user.uid, email: user.email, name: user.displayName || 'Admin' };
      if (req.status === 'archived') {
        await serviceEngineService.restoreRequirement(req.id, actor);
        toastStore.showToast('Persyaratan dipulihkan', 'success');
      } else {
        await serviceEngineService.archiveRequirement(req.id, actor);
        toastStore.showToast('Persyaratan diarsipkan', 'success');
      }
      await loadRequirements();
    } catch (err) {
      toastStore.showToast('Gagal mengarsipkan persyaratan', 'error');
    }
  }

  async function handleMove(index: number, direction: 'up' | 'down') {
    if (!user) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= requirements.length) return;

    const newReqs = [...requirements];
    const temp = newReqs[index];
    newReqs[index] = newReqs[targetIndex];
    newReqs[targetIndex] = temp;

    requirements = newReqs;

    try {
      const actor = { id: user.uid, email: user.email, name: user.displayName || 'Admin' };
      const orderedIds = newReqs.map((r) => r.id);
      await serviceEngineService.reorderRequirements(serviceId, orderedIds, actor);
      toastStore.showToast('Urutan persyaratan berhasil diperbarui', 'success');
    } catch (err) {
      toastStore.showToast('Gagal memperbarui urutan', 'error');
      await loadRequirements();
    }
  }
</script>

<div class="space-y-4 text-xs">
  <!-- Header Toolbar -->
  <div class="flex items-center justify-between bg-[var(--color-bg)] p-3 rounded-2xl border border-[var(--color-border)]">
    <div class="flex items-center gap-2">
      <FileText class="w-4 h-4 text-[var(--color-primary)]" />
      <span class="font-bold text-[var(--color-text)]">Daftar Persyaratan Pelayanan</span>
      <span class="text-[var(--color-muted-foreground)] font-normal">({requirements.length} item)</span>
    </div>

    <Button
      type="button"
      onclick={handleOpenCreate}
      class="bg-[var(--color-primary)] hover:bg-amber-600 text-[var(--color-primary-foreground)] font-bold h-8 text-[11px] px-3 flex items-center gap-1.5"
    >
      <Plus class="w-3.5 h-3.5 stroke-[3]" />
      <span>+ Tambah Persyaratan</span>
    </Button>
  </div>

  <!-- List / Table -->
  {#if loading}
    <div class="p-8 text-center text-[var(--color-muted-foreground)] flex items-center justify-center gap-2">
      <RefreshCw class="w-4 h-4 animate-spin text-[var(--color-primary)]" />
      <span>Memuat persyaratan...</span>
    </div>
  {:else if requirements.length === 0}
    <div class="p-8 text-center bg-[var(--color-bg)] border border-dashed border-[var(--color-border)] rounded-2xl space-y-2">
      <FileText class="w-8 h-8 text-zinc-600 mx-auto" />
      <p class="text-[var(--color-muted-foreground)] font-medium">Belum ada persyaratan pelayanan.</p>
      <p class="text-[var(--color-muted-foreground)] text-[11px]">
        Tambahkan dokumen identitas, kartu BPJS, atau persyaratan lain yang dibutuhkan pasien.
      </p>
    </div>
  {:else}
    <div class="overflow-x-auto border border-[var(--color-border)] rounded-2xl bg-[var(--color-bg)]">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="border-b border-[var(--color-border)] text-[var(--color-muted-foreground)] text-[11px] bg-[var(--color-card)]/50 uppercase tracking-wider font-semibold">
            <th class="py-2.5 px-3 w-12 text-center">No</th>
            <th class="py-2.5 px-3">Persyaratan</th>
            <th class="py-2.5 px-3">Kewajiban</th>
            <th class="py-2.5 px-3">Status</th>
            <th class="py-2.5 px-3 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-[var(--color-border)]">
          {#each requirements as req, idx (req.id)}
            <tr class="hover:bg-[var(--color-card)]/40 transition">
              <td class="py-2.5 px-3 text-center text-[var(--color-muted-foreground)] font-mono text-[11px]">{idx + 1}</td>
              <td class="py-2.5 px-3">
                <div class="font-medium text-[var(--color-text)]">{req.title}</div>
                {#if req.description}
                  <div class="text-[11px] text-[var(--color-muted-foreground)] mt-0.5 line-clamp-1">{req.description}</div>
                {/if}
              </td>
              <td class="py-2.5 px-3">
                {#if req.required}
                  <Badge variant="amber">Wajib</Badge>
                {:else}
                  <Badge variant="zinc">Jika diperlukan</Badge>
                {/if}
              </td>
              <td class="py-2.5 px-3">
                {#if req.status === 'active'}<Badge variant="emerald">Aktif</Badge>{/if}
                {#if req.status === 'inactive'}<Badge variant="red">Nonaktif</Badge>{/if}
                {#if req.status === 'archived'}<Badge variant="zinc">Arsip</Badge>{/if}
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
                  disabled={idx === requirements.length - 1}
                  onclick={() => handleMove(idx, 'down')}
                  class="p-1 rounded text-[var(--color-muted-foreground)] hover:text-[var(--color-text)] disabled:opacity-30 disabled:hover:text-[var(--color-muted-foreground)]"
                  title="Turunkan Urutan"
                >
                  <ArrowDown class="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onclick={() => handleOpenEdit(req)}
                  class="p-1 text-[var(--color-primary)] hover:text-[var(--color-primary)] rounded ml-1"
                  title="Edit Persyaratan"
                >
                  <Edit class="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onclick={() => handleToggleStatus(req)}
                  class={`p-1 rounded ${req.status === 'active' ? 'text-[var(--color-muted-foreground)] hover:text-[var(--color-text)]' : 'text-[var(--color-primary)] hover:text-emerald-300'}`}
                  title={req.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}
                >
                  <Check class="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onclick={() => handleArchive(req)}
                  class="p-1 text-red-400 hover:text-red-300 rounded"
                  title={req.status === 'archived' ? 'Pulihkan' : 'Arsipkan'}
                >
                  {#if req.status === 'archived'}
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
    title={editingReq?.id ? 'Edit Persyaratan' : 'Tambah Persyaratan Baru'}
    size="md"
  >
    {#if editingReq}
      {#key editingReq?.id || 'new'}
      <form onsubmit={handleSave} class="space-y-4 text-xs">
        {#if duplicateWarning}
          <div class="p-3 bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 rounded-xl text-[var(--color-primary)] flex items-start gap-2">
            <AlertTriangle class="w-4 h-4 shrink-0 mt-0.5" />
            <span class="leading-relaxed">{duplicateWarning}</span>
          </div>
        {/if}

        <Input
          label="Judul Persyaratan *"
          defaultValue={editingReq.title || ''}
          oninput={(e) => handleTitleChange(e.currentTarget.value)}
          placeholder="Contoh: KTP / Kartu Keluarga / Kartu BPJS"
          required
        />

        <div class="space-y-1">
          <label class="font-semibold text-[var(--color-text)]">Deskripsi / Penjelasan Tambahan</label>
          <textarea
            rows={3}
            oninput={(e) => updateEditingReq({ description: e.currentTarget.value })}
            placeholder="Contoh: Dokumen asli atau salinan digital yang masih berlaku..."
            class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-2.5 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
          >{editingReq.description || ''}</textarea>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1">
            <label class="font-semibold text-[var(--color-text)]">Sifat Kewajiban</label>
            <div class="flex items-center space-x-2 pt-2">
              <input
                type="checkbox"
                id="req-is-mandatory"
                checked={Boolean(editingReq.required)}
                onchange={(e) => updateEditingReq({ required: e.currentTarget.checked })}
                class="w-4 h-4 rounded border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]/20"
              />
              <label for="req-is-mandatory" class="text-[var(--color-text)] cursor-pointer select-none">
                Wajib Diserahkan Pasien
              </label>
            </div>
          </div>

          <div class="space-y-1">
            <label class="font-semibold text-[var(--color-text)]">Status</label>
            <select
              value={editingReq.status || 'active'}
              onchange={(e) => updateEditingReq({ status: e.currentTarget.value as ActiveStatus })}
              class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-[var(--color-text)] text-xs focus:outline-none focus:border-[var(--color-primary)]"
            >
              <option value="active">Aktif</option>
              <option value="inactive">Nonaktif</option>
              <option value="archived">Arsip</option>
            </select>
          </div>
        </div>

        <div class="pt-3 border-t border-[var(--color-border)] flex justify-end space-x-2">
          <Button type="button" variant="ghost" onclick={() => (isModalOpen = false)}>
            Batal
          </Button>
          <Button type="submit" disabled={saving} class="bg-[var(--color-primary)] hover:bg-amber-600 text-[var(--color-primary-foreground)] font-bold">
            {saving ? 'Menyimpan...' : 'Simpan Persyaratan'}
          </Button>
        </div>
      </form>
      {/key}
    {/if}
  </Modal>
</div>
