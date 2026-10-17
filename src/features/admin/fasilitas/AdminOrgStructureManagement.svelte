<!-- @component Kelola hierarki unit, posisi jabatan, dan alur organisasi Puskesmas (tree & card view). -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { Plus, Edit3, Trash2, Eye, EyeOff, Printer } from 'lucide-svelte';
  import Modal from '../../../shared/ui/Modal.svelte';
  import ConfirmModal from '../../../shared/components/ConfirmModal.svelte';
  import { staffOrgService } from '../../../shared/services/staffOrgService.js';
  import type { OrganizationNode, StaffProfile } from '../../../shared/types/index.js';
  import { authStore } from '../../../shared/stores/auth.svelte.js';
  import { toastStore } from '../../../shared/stores/toast.svelte.js';

  let nodes = $state<OrganizationNode[]>([]);
  let staffList = $state<StaffProfile[]>([]);
  let loading = $state(true);
  let viewMode = $state<'tree' | 'card'>('tree');

  let isModalOpen = $state(false);
  let editingNode = $state<Partial<OrganizationNode> | null>(null);

  let confirmState = $state<{ title: string; message: string; action: () => Promise<void> } | null>(null);

  const actor = $derived({
    id: authStore.user?.uid || 'usr-admin',
    name: authStore.user?.displayName || 'Administrator',
    email: authStore.user?.email || 'admin@puskesmas.id'
  });

  async function loadData() {
    loading = true;
    try {
      const [nData, sData] = await Promise.all([
        staffOrgService.getOrgNodes(),
        staffOrgService.getAllStaffProfilesForAdmin()
      ]);
      nodes = nData;
      staffList = sData;
    } catch (e) {
      console.error(e);
      toastStore.showToast('Gagal memuat struktur organisasi', 'error');
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    loadData();
  });

  function updateNode(patch: Partial<OrganizationNode>) {
    if (editingNode) editingNode = { ...editingNode, ...patch };
  }

  function handleOpenCreate() {
    editingNode = {
      name: '',
      title: '',
      parentId: '',
      order: nodes.length + 1,
      description: '',
      status: 'active',
      showOnWebsite: true
    };
    isModalOpen = true;
  }

  function handleOpenEdit(node: OrganizationNode) {
    editingNode = { ...node };
    isModalOpen = true;
  }

  async function handleSave(e: Event) {
    e.preventDefault();
    if (!editingNode || !editingNode.name || !editingNode.title) {
      toastStore.showToast('Nama unit dan jabatan wajib diisi', 'error');
      return;
    }
    try {
      await staffOrgService.saveOrgNode(editingNode, actor);
      toastStore.showToast('Struktur organisasi berhasil disimpan', 'success');
      isModalOpen = false;
      loadData();
    } catch (e: any) {
      toastStore.showToast(e.message || 'Gagal menyimpan struktur', 'error');
    }
  }

  function askDelete(id: string, name: string) {
    confirmState = {
      title: 'Hapus Unit Organisasi',
      message: `Hapus unit "${name}" beserta sub-unit di bawahnya?`,
      action: async () => {
        try {
          await staffOrgService.deleteOrgNode(id, actor);
          toastStore.showToast('Unit organisasi berhasil dihapus', 'success');
          loadData();
        } catch (e) {
          toastStore.showToast('Gagal menghapus unit', 'error');
        }
      }
    };
  }

  function confirmAction() {
    const s = confirmState;
    confirmState = null;
    s?.action();
  }

  function handlePrint() {
    window.print();
  }

  function assignedStaffFor(nodeId: string | undefined, userId: string | undefined) {
    return staffList.find((s) => s.unitId === nodeId || s.userId === userId);
  }
</script>

<div class="space-y-6 max-w-7xl mx-auto pb-12">
  <!-- Header Actions -->
  <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--color-card)] border border-[var(--color-border)] p-6 rounded-3xl">
    <div class="space-y-1">
      <span class="text-[10px] font-bold uppercase tracking-widest text-[var(--color-primary)]">PHASE 5K — Organization Tree</span>
      <h1 class="text-xl font-bold text-[var(--color-text)]">Struktur Hierarki Puskesmas</h1>
      <p class="text-xs text-[var(--color-muted-foreground)]">Tampilan hierarki unit kerja dan penanggung jawab jabatan struktural maupun fungsional.</p>
    </div>
    <div class="flex items-center gap-3">
      <div class="flex bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl p-1 text-xs">
        <button
          onclick={() => (viewMode = 'tree')}
          class={`px-3 py-1.5 rounded-xl font-medium transition ${viewMode === 'tree' ? 'bg-emerald-600 text-[var(--color-text)]' : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-text)]'}`}
        >
          Tree View
        </button>
        <button
          onclick={() => (viewMode = 'card')}
          class={`px-3 py-1.5 rounded-xl font-medium transition ${viewMode === 'card' ? 'bg-emerald-600 text-[var(--color-text)]' : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-text)]'}`}
        >
          Card List
        </button>
      </div>

      <button
        onclick={handlePrint}
        class="px-4 py-2.5 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] hover:text-[var(--color-text)] text-xs font-semibold inline-flex items-center gap-2 transition"
      >
        <Printer class="w-4 h-4 text-[var(--color-primary)]" /> Print Struktur
      </button>

      <button
        onclick={handleOpenCreate}
        class="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-[var(--color-primary)] text-[var(--color-primary-foreground)] text-xs font-semibold inline-flex items-center gap-2 shadow-lg transition"
      >
        <Plus class="w-4 h-4" /> Tambah Posisi / Unit
      </button>
    </div>
  </div>

  <!-- Content View -->
  {#if loading}
    <div class="p-12 text-center text-[var(--color-muted-foreground)] font-mono text-xs">Memuat struktur organisasi...</div>
  {:else if nodes.length === 0}
    <div class="p-12 text-center text-[var(--color-muted-foreground)] text-xs">Belum ada struktur unit yang ditambahkan.</div>
  {:else if viewMode === 'tree'}
    <div class="bg-[var(--color-card)] border border-[var(--color-border)] p-8 rounded-3xl space-y-6">
      <div class="text-xs font-bold uppercase tracking-wider text-[var(--color-muted-foreground)] border-b border-[var(--color-border)] pb-3">Hierarki Organisasi Puskesmas Manding</div>

      <!-- Root / Parent nodes -->
      <div class="space-y-4">
        {#each nodes.filter((n) => !n.parentId) as root (root.id)}
          {@const children = nodes.filter((n) => n.parentId === root.id)}
          {@const assignedStaff = assignedStaffFor(root.id, root.userId)}
          <div class="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl p-5 space-y-4 shadow-md">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div class="space-y-1">
                <div class="flex items-center gap-2">
                  <span class="px-2 py-0.5 rounded bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-mono text-[10px] font-bold uppercase border border-[var(--color-primary)]/20">{root.title}</span>
                  {#if !root.showOnWebsite}
                    <span class="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 text-[10px] inline-flex items-center gap-1"><EyeOff class="w-3 h-3" /> Hidden</span>
                  {/if}
                </div>
                <h3 class="text-base font-bold text-[var(--color-text)]">{root.name}</h3>
                <p class="text-xs text-[var(--color-muted-foreground)]">{root.description}</p>
              </div>

              <div class="flex items-center gap-3">
                {#if assignedStaff}
                  <div class="flex items-center gap-2 bg-[var(--color-card)] px-3 py-1.5 rounded-xl border border-[var(--color-border)]">
                    <img src={assignedStaff.photoUrl} alt={assignedStaff.name} class="w-7 h-7 rounded-full object-cover" />
                    <div class="text-xs">
                      <div class="font-semibold text-[var(--color-text)]">{assignedStaff.name}</div>
                      <div class="text-[10px] text-[var(--color-muted-foreground)] font-mono">{assignedStaff.positionTitle}</div>
                    </div>
                  </div>
                {:else}
                  <span class="px-3 py-1.5 rounded-xl bg-[var(--color-surface)] text-[var(--color-muted-foreground)] text-xs italic">Belum ditetapkan</span>
                {/if}

                <div class="flex items-center gap-1 border-l border-[var(--color-border)] pl-3">
                  <button onclick={() => handleOpenEdit(root)} class="p-2 rounded-xl bg-[var(--color-card)] text-[var(--color-text)] hover:text-[var(--color-text)] transition">
                    <Edit3 class="w-3.5 h-3.5" />
                  </button>
                  <button onclick={() => askDelete(root.id, root.name)} class="p-2 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition">
                    <Trash2 class="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <!-- Children Sub-units -->
            {#if children.length > 0}
              <div class="pl-6 border-l-2 border-[var(--color-primary)]/20 space-y-3 pt-2">
                {#each children as child (child.id)}
                  {@const childStaff = assignedStaffFor(child.id, child.userId)}
                  <div class="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div class="space-y-1">
                      <div class="flex items-center gap-2">
                        <span class="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-mono text-[9px] font-bold uppercase">{child.title}</span>
                      </div>
                      <h4 class="text-sm font-bold text-[var(--color-text)]">{child.name}</h4>
                      <p class="text-[11px] text-[var(--color-muted-foreground)]">{child.description}</p>
                    </div>

                    <div class="flex items-center gap-3">
                      {#if childStaff}
                        <div class="flex items-center gap-2 bg-[var(--color-bg)] px-3 py-1.5 rounded-xl border border-[var(--color-border)]">
                          <img src={childStaff.photoUrl} alt={childStaff.name} class="w-6 h-6 rounded-full object-cover" />
                          <div class="text-xs">
                            <div class="font-semibold text-[var(--color-text)]">{childStaff.name}</div>
                          </div>
                        </div>
                      {:else}
                        <span class="text-[var(--color-muted-foreground)] text-xs italic">Belum ditetapkan</span>
                      {/if}

                      <div class="flex items-center gap-1 border-l border-[var(--color-border)] pl-2">
                        <button onclick={() => handleOpenEdit(child)} class="p-1.5 rounded-lg bg-[var(--color-bg)] text-[var(--color-text)] hover:text-[var(--color-text)] transition">
                          <Edit3 class="w-3 h-3" />
                        </button>
                        <button onclick={() => askDelete(child.id, child.name)} class="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 transition">
                          <Trash2 class="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {:else}
    <div class="bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl overflow-hidden shadow-xl">
      <div class="overflow-x-auto">
        <table class="w-full text-xs text-left text-[var(--color-text)]">
          <thead class="bg-[var(--color-bg)] text-[10px] font-bold uppercase text-[var(--color-muted-foreground)] border-b border-[var(--color-border)]">
            <tr>
              <th class="px-6 py-4">Nama Unit & Posisi</th>
              <th class="px-6 py-4">Atasan / Parent</th>
              <th class="px-6 py-4">Petugas Tertugas</th>
              <th class="px-6 py-4">Status & Website</th>
              <th class="px-6 py-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[var(--color-border)]">
            {#each nodes as n (n.id)}
              {@const parentNode = nodes.find((p) => p.id === n.parentId)}
              {@const assigned = assignedStaffFor(n.id, n.userId)}
              <tr class="hover:bg-[var(--color-card)] transition">
                <td class="px-6 py-4 space-y-1">
                  <div class="font-bold text-[var(--color-text)]">{n.name}</div>
                  <div class="text-[11px] text-[var(--color-primary)] font-mono">{n.title}</div>
                </td>
                <td class="px-6 py-4 text-[var(--color-muted-foreground)]">
                  {#if parentNode}
                    {parentNode.name}
                  {:else}
                    <span class="italic text-zinc-600">Root (Puskesmas)</span>
                  {/if}
                </td>
                <td class="px-6 py-4">
                  {#if assigned}
                    <div class="flex items-center gap-2">
                      <img src={assigned.photoUrl} alt={assigned.name} class="w-6 h-6 rounded-full object-cover" />
                      <span class="font-semibold text-[var(--color-text)]">{assigned.name}</span>
                    </div>
                  {:else}
                    <span class="text-[var(--color-muted-foreground)] italic">Belum ditetapkan</span>
                  {/if}
                </td>
                <td class="px-6 py-4">
                  <div class="flex items-center gap-2">
                    <span class={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${n.status === 'active' ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' : 'bg-[var(--color-card)]0/10 text-[var(--color-muted-foreground)]'}`}>
                      {n.status}
                    </span>
                    {#if n.showOnWebsite}
                      <span class="text-[var(--color-primary)] text-[10px] inline-flex items-center gap-1"><Eye class="w-3 h-3" /> Public</span>
                    {:else}
                      <span class="text-rose-400 text-[10px] inline-flex items-center gap-1"><EyeOff class="w-3 h-3" /> Hidden</span>
                    {/if}
                  </div>
                </td>
                <td class="px-6 py-4 text-right space-x-2">
                  <button onclick={() => handleOpenEdit(n)} class="p-2 rounded-xl bg-[var(--color-bg)] text-[var(--color-text)] hover:text-[var(--color-text)] transition">
                    <Edit3 class="w-3.5 h-3.5" />
                  </button>
                  <button onclick={() => askDelete(n.id, n.name)} class="p-2 rounded-xl bg-rose-500/10 text-rose-400 transition">
                    <Trash2 class="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}
</div>

<!-- Modal Create / Edit Node -->
<Modal
  isOpen={isModalOpen && editingNode !== null}
  onClose={() => (isModalOpen = false)}
  title={editingNode?.id ? 'Edit Posisi / Unit Organisasi' : 'Tambah Posisi / Unit Baru'}
  size="lg"
>
  {#snippet footer()}
    <button
      type="button"
      onclick={() => (isModalOpen = false)}
      class="px-5 py-2.5 rounded-2xl bg-[var(--color-bg)] text-[var(--color-muted-foreground)] hover:text-[var(--color-text)] font-semibold transition"
    >
      Batal
    </button>
    <button
      type="submit"
      form="org-node-form"
      class="px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-[var(--color-primary)] text-[var(--color-primary-foreground)] font-semibold shadow-lg transition"
    >
      Simpan Unit
    </button>
  {/snippet}

  {#if editingNode}
    <form id="org-node-form" onsubmit={handleSave} class="space-y-4 text-xs">
      <div class="space-y-1.5">
        <label class="text-[var(--color-muted-foreground)] font-semibold">Nama Unit / Bagian *</label>
        <input
          type="text"
          required
          placeholder="Contoh: Klaster 1: Manajemen, Ibu & Anak"
          value={editingNode.name ?? ''}
          oninput={(e) => updateNode({ name: e.currentTarget.value })}
          class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none rounded-2xl px-4 py-2.5 text-[var(--color-text)]"
        />
      </div>

      <div class="space-y-1.5">
        <label class="text-[var(--color-muted-foreground)] font-semibold">Jabatan / Titel Pimpinan *</label>
        <input
          type="text"
          required
          placeholder="Contoh: Penanggung Jawab Klaster 1"
          value={editingNode.title ?? ''}
          oninput={(e) => updateNode({ title: e.currentTarget.value })}
          class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none rounded-2xl px-4 py-2.5 text-[var(--color-text)]"
        />
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="space-y-1.5">
          <label class="text-[var(--color-muted-foreground)] font-semibold">Atasan (Parent Unit)</label>
          <select
            value={editingNode.parentId ?? ''}
            onchange={(e) => updateNode({ parentId: e.currentTarget.value || undefined })}
            class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none rounded-2xl px-3 py-2.5 text-[var(--color-text)]"
          >
            <option value="">-- Root (Puskesmas) --</option>
            {#each nodes.filter((n) => n.id !== editingNode.id) as n (n.id)}
              <option value={n.id}>{n.name} ({n.title})</option>
            {/each}
          </select>
        </div>

        <div class="space-y-1.5">
          <label class="text-[var(--color-muted-foreground)] font-semibold">Urutan (Sort Order)</label>
          <input
            type="number"
            value={editingNode.order ?? 1}
            oninput={(e) => updateNode({ order: parseInt(e.currentTarget.value) || 1 })}
            class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none rounded-2xl px-4 py-2 text-[var(--color-text)] font-mono"
          />
        </div>
      </div>

      <div class="space-y-1.5">
        <label class="text-[var(--color-muted-foreground)] font-semibold">Deskripsi Tugas / Unit</label>
        <textarea
          rows={3}
          placeholder="Uraian tugas singkat unit ini..."
          value={editingNode.description ?? ''}
          oninput={(e) => updateNode({ description: e.currentTarget.value })}
          class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none rounded-2xl px-4 py-2 text-[var(--color-text)]"
        ></textarea>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="space-y-1.5">
          <label class="text-[var(--color-muted-foreground)] font-semibold">Status Unit</label>
          <select
            value={editingNode.status ?? 'active'}
            onchange={(e) => updateNode({ status: e.currentTarget.value as OrganizationNode['status'] })}
            class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl px-3 py-2 text-[var(--color-text)]"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div class="space-y-1.5 flex items-center pt-5">
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!!editingNode.showOnWebsite}
              onchange={(e) => updateNode({ showOnWebsite: e.currentTarget.checked })}
              class="rounded bg-[var(--color-bg)] border-[var(--color-border)] text-[var(--color-primary)] focus:ring-0"
            />
            <span class="text-[var(--color-text)] font-medium">Tampilkan di Website Publik</span>
          </label>
        </div>
      </div>
    </form>
  {/if}
</Modal>

<ConfirmModal
  isOpen={confirmState !== null}
  onClose={() => (confirmState = null)}
  onConfirm={confirmAction}
  title={confirmState?.title ?? 'Konfirmasi'}
  message={confirmState?.message ?? ''}
  confirmLabel="Ya, Hapus"
/>
