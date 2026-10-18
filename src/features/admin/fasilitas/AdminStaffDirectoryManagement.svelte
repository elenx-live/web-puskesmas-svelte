<!-- @component Direktori petugas: profil publik, penugasan unit, layanan terkait, dan riwayat mutasi. -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { Plus, Edit3, Eye, EyeOff, Search, X, History } from 'lucide-svelte';
  import Modal from '../../../shared/ui/Modal.svelte';
  import { staffOrgService } from '../../../shared/services/staffOrgService.js';
  import { serviceEngineService } from '../../../shared/services/serviceEngineService.js';
  import type { StaffProfile, OrganizationNode, ServiceEntity, StaffAssignmentHistory } from '../../../shared/types/index.js';
  import { authStore } from '../../../shared/stores/auth.svelte.js';
  import { toastStore } from '../../../shared/stores/toast.svelte.js';
  import { debounce } from '../../../shared/utils/debounce.js';

  let staffList = $state<StaffProfile[]>([]);
  let orgNodes = $state<OrganizationNode[]>([]);
  let services = $state<ServiceEntity[]>([]);
  let historyList = $state<StaffAssignmentHistory[]>([]);
  let loading = $state(true);
  let searchQuery = $state('');
  let searchDebounced = $state('');
  let filterUnit = $state('');

  // Debounce search lokal 300ms — filter $derived hanya membaca searchDebounced
  const applySearchDebounced = debounce((v: string) => { searchDebounced = v; }, 300);
  $effect(() => {
    applySearchDebounced(searchQuery);
    return () => applySearchDebounced.cancel();
  });

  let isModalOpen = $state(false);
  let editingStaff = $state<Partial<StaffProfile> | null>(null);

  let isHistoryOpen = $state(false);
  let selectedStaffHistory = $state<StaffAssignmentHistory[]>([]);

  const actor = $derived({
    id: authStore.user?.uid || 'usr-admin',
    name: authStore.user?.displayName || 'Administrator',
    email: authStore.user?.email || 'admin@puskesmas.id'
  });

  const filteredStaff = $derived(
    staffList.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(searchDebounced.toLowerCase()) ||
        s.positionTitle.toLowerCase().includes(searchDebounced.toLowerCase());
      const matchesUnit = filterUnit ? s.unitId === filterUnit : true;
      return matchesSearch && matchesUnit;
    })
  );

  async function loadData() {
    loading = true;
    try {
      const [sData, oData, srvData, hData] = await Promise.all([
        staffOrgService.getAllStaffProfilesForAdmin(),
        staffOrgService.getOrgNodes(),
        serviceEngineService.getServices(),
        staffOrgService.getAssignmentHistory()
      ]);
      staffList = sData;
      orgNodes = oData;
      services = srvData;
      historyList = hData;
    } catch (e) {
      console.error(e);
      toastStore.showToast('Gagal memuat direktori petugas', 'error');
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    loadData();
  });

  function updateStaff(patch: Partial<StaffProfile>) {
    if (editingStaff) editingStaff = { ...editingStaff, ...patch };
  }

  function toggleService(srvId: string, checked: boolean) {
    if (!editingStaff) return;
    const current = editingStaff.serviceIds || [];
    const next = checked ? [...current, srvId] : current.filter((id) => id !== srvId);
    editingStaff = { ...editingStaff, serviceIds: next };
  }

  function handleOpenCreate() {
    editingStaff = {
      name: '',
      positionTitle: '',
      unitId: orgNodes[0]?.id || '',
      unitName: orgNodes[0]?.name || '',
      serviceIds: [],
      photoUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=600',
      bio: '',
      education: '',
      scheduleSummary: 'Senin - Jumat (08:00 - 14:00)',
      showOnWebsite: true,
      status: 'active',
      reviewStatus: 'approved'
    };
    isModalOpen = true;
  }

  function handleOpenEdit(staff: StaffProfile) {
    editingStaff = { ...staff };
    isModalOpen = true;
  }

  async function handleSave(e: Event) {
    e.preventDefault();
    if (!editingStaff || !editingStaff.name || !editingStaff.positionTitle) {
      toastStore.showToast('Nama dan jabatan wajib diisi', 'error');
      return;
    }
    try {
      const selectedUnit = orgNodes.find((n) => n.id === editingStaff!.unitId);
      const payload = {
        ...editingStaff,
        unitName: selectedUnit ? selectedUnit.name : editingStaff.unitName || ''
      };
      await staffOrgService.saveStaffProfile(payload, actor, true);
      toastStore.showToast('Profil petugas berhasil disimpan', 'success');
      isModalOpen = false;
      loadData();
    } catch (e: any) {
      toastStore.showToast(e.message || 'Gagal menyimpan profil', 'error');
    }
  }

  async function handleToggleStatus(id: string, currentStatus: StaffProfile['status']) {
    const nextStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      await staffOrgService.updateStaffStatus(id, nextStatus, actor);
      toastStore.showToast(`Status petugas diubah menjadi ${nextStatus}`, 'success');
      loadData();
    } catch (e) {
      toastStore.showToast('Gagal mengubah status', 'error');
    }
  }

  function handleShowHistory(staffId: string) {
    selectedStaffHistory = historyList.filter((h) => h.staffId === staffId);
    isHistoryOpen = true;
  }
</script>

<div class="space-y-6 max-w-7xl mx-auto pb-12">
  <!-- Header Actions -->
  <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--color-card)] border border-[var(--color-border)] p-6 rounded-3xl">
    <div class="space-y-1">
      <span class="text-[10px] font-bold uppercase tracking-widest text-[var(--color-primary)]">PHASE 5K — Staff Directory</span>
      <h1 class="text-xl font-bold text-[var(--color-text)]">Direktori Petugas Puskesmas</h1>
      <p class="text-xs text-[var(--color-muted-foreground)]">Pemisahan akun sistem dengan profil publik. Kelola penugasan unit, layanan, dan status aktif.</p>
    </div>
    <div class="flex items-center gap-3">
      <button
        onclick={handleOpenCreate}
        class="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-[var(--color-primary)] text-[var(--color-primary-foreground)] text-xs font-semibold inline-flex items-center gap-2 shadow-lg transition"
      >
        <Plus class="w-4 h-4" /> Tambah Profil Petugas
      </button>
    </div>
  </div>

  <!-- Filters -->
  <div class="bg-[var(--color-card)] border border-[var(--color-border)] p-4 rounded-3xl flex flex-col md:flex-row gap-4 items-center justify-between">
    <div class="relative w-full md:w-80">
      <Search class="absolute left-3.5 top-3 w-4 h-4 text-[var(--color-muted-foreground)]" />
      <input
        type="text"
        placeholder="Cari nama atau jabatan..."
        value={searchQuery}
        oninput={(e) => (searchQuery = e.currentTarget.value)}
        class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none rounded-2xl pl-10 pr-4 py-2 text-xs text-[var(--color-text)]"
      />
    </div>

    <div class="flex items-center gap-3 w-full md:w-auto">
      <select
        value={filterUnit}
        onchange={(e) => (filterUnit = e.currentTarget.value)}
        class="w-full md:w-64 bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none rounded-2xl px-4 py-2 text-xs text-[var(--color-text)]"
      >
        <option value="">Semua Unit Kerja</option>
        {#each orgNodes as n (n.id)}
          <option value={n.id}>{n.name} ({n.title})</option>
        {/each}
      </select>
    </div>
  </div>

  <!-- Table -->
  {#if loading}
    <div class="p-12 text-center text-[var(--color-muted-foreground)] text-xs font-mono">Memuat direktori petugas...</div>
  {:else if filteredStaff.length === 0}
    <div class="p-12 text-center text-[var(--color-muted-foreground)] text-xs">Tidak ada profil petugas yang ditemukan.</div>
  {:else}
    <div class="bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl overflow-hidden shadow-xl">
      <div class="overflow-x-auto">
        <table class="w-full text-xs text-left text-[var(--color-text)]">
          <thead class="bg-[var(--color-bg)] text-[10px] font-bold uppercase text-[var(--color-muted-foreground)] border-b border-[var(--color-border)]">
            <tr>
              <th class="px-6 py-4">Petugas & Jabatan</th>
              <th class="px-6 py-4">Unit / Penugasan</th>
              <th class="px-6 py-4">Layanan Terkait</th>
              <th class="px-6 py-4">Status & Web</th>
              <th class="px-6 py-4">Review</th>
              <th class="px-6 py-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[var(--color-border)]">
            {#each filteredStaff as s (s.id)}
              {@const linkedUnit = orgNodes.find((n) => n.id === s.unitId)}
              <tr class="hover:bg-[var(--color-card)] transition">
                <td class="px-6 py-4 flex items-center gap-3">
                  <img src={s.photoUrl || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=200'} alt={s.name} class="w-9 h-9 rounded-2xl object-cover border border-[var(--color-border)]" />
                  <div class="space-y-0.5">
                    <div class="font-bold text-[var(--color-text)]">{s.name}</div>
                    <div class="text-[11px] text-[var(--color-primary)] font-mono">{s.positionTitle}</div>
                  </div>
                </td>
                <td class="px-6 py-4">
                  <div class="font-semibold text-[var(--color-text)]">{linkedUnit ? linkedUnit.name : s.unitName}</div>
                  <div class="text-[10px] text-[var(--color-muted-foreground)] font-mono">{linkedUnit?.title}</div>
                </td>
                <td class="px-6 py-4">
                  <div class="flex flex-wrap gap-1">
                    {#if s.serviceIds && s.serviceIds.length > 0}
                      {#each s.serviceIds as srvId (srvId)}
                        {@const srv = services.find((x) => x.id === srvId)}
                        <span class="px-2 py-0.5 rounded bg-[var(--color-bg)] border border-[var(--color-border)] text-[10px] text-[var(--color-text)]">
                          {srv ? srv.name : srvId}
                        </span>
                      {/each}
                    {:else}
                      <span class="text-zinc-600 italic">Tanpa layanan khusus</span>
                    {/if}
                  </div>
                </td>
                <td class="px-6 py-4 space-y-1">
                  <button
                    onclick={() => handleToggleStatus(s.id, s.status)}
                    class={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase transition ${
                      s.status === 'active' ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20' : 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
                    }`}
                  >
                    {s.status}
                  </button>
                  <div>
                    {#if s.showOnWebsite}
                      <span class="text-[var(--color-primary)] text-[10px] inline-flex items-center gap-1"><Eye class="w-3 h-3" /> Public</span>
                    {:else}
                      <span class="text-rose-400 text-[10px] inline-flex items-center gap-1"><EyeOff class="w-3 h-3" /> Hidden</span>
                    {/if}
                  </div>
                </td>
                <td class="px-6 py-4">
                  <span class={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                    s.reviewStatus === 'approved' ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' :
                    s.reviewStatus === 'pending_review' ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' : 'bg-rose-500/10 text-rose-400'
                  }`}>
                    {s.reviewStatus}
                  </span>
                </td>
                <td class="px-6 py-4 text-right space-x-2">
                  <button
                    onclick={() => handleShowHistory(s.id)}
                    title="Riwayat Mutasi Unit"
                    class="p-2 rounded-xl bg-[var(--color-bg)] text-[var(--color-muted-foreground)] hover:text-[var(--color-text)] transition"
                  >
                    <History class="w-3.5 h-3.5" />
                  </button>
                  <button
                    onclick={() => handleOpenEdit(s)}
                    class="p-2 rounded-xl bg-[var(--color-bg)] text-[var(--color-text)] hover:text-[var(--color-text)] transition"
                  >
                    <Edit3 class="w-3.5 h-3.5" />
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

<!-- Modal Create / Edit Staff -->
<Modal
  isOpen={isModalOpen && editingStaff !== null}
  onClose={() => (isModalOpen = false)}
  title={editingStaff?.id ? 'Edit Profil Publik Petugas' : 'Tambah Profil Petugas Baru'}
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
      form="staff-form"
      class="px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-[var(--color-primary)] text-[var(--color-primary-foreground)] font-semibold shadow-lg transition"
    >
      Simpan Profil Petugas
    </button>
  {/snippet}

  {#if editingStaff}
    {#key editingStaff.id || 'new'}
    <form id="staff-form" onsubmit={handleSave} class="space-y-4 text-xs">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="space-y-1.5">
          <label class="text-[var(--color-muted-foreground)] font-semibold">Nama Lengkap & Gelar *</label>
          <input
            type="text"
            required
            placeholder="Contoh: dr. Andi Pratama, Sp.A"
            defaultValue={editingStaff.name ?? ''}
            oninput={(e) => updateStaff({ name: e.currentTarget.value })}
            class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none rounded-2xl px-4 py-2.5 text-[var(--color-text)]"
          />
        </div>

        <div class="space-y-1.5">
          <label class="text-[var(--color-muted-foreground)] font-semibold">Jabatan / Posisi *</label>
          <input
            type="text"
            required
            placeholder="Contoh: Dokter Spesialis Anak"
            defaultValue={editingStaff.positionTitle ?? ''}
            oninput={(e) => updateStaff({ positionTitle: e.currentTarget.value })}
            class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none rounded-2xl px-4 py-2.5 text-[var(--color-text)]"
          />
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="space-y-1.5">
          <label class="text-[var(--color-muted-foreground)] font-semibold">Unit Organisasi *</label>
          <select
            value={editingStaff.unitId ?? ''}
            onchange={(e) => updateStaff({ unitId: e.currentTarget.value })}
            class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none rounded-2xl px-3 py-2.5 text-[var(--color-text)]"
          >
            {#each orgNodes as n (n.id)}
              <option value={n.id}>{n.name} ({n.title})</option>
            {/each}
          </select>
        </div>

        <div class="space-y-1.5">
          <label class="text-[var(--color-muted-foreground)] font-semibold">URL Foto Profil (Media Library / Unsplash)</label>
          <input
            type="text"
            defaultValue={editingStaff.photoUrl ?? ''}
            oninput={(e) => updateStaff({ photoUrl: e.currentTarget.value })}
            class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none rounded-2xl px-4 py-2.5 text-[var(--color-text)] font-mono"
          />
        </div>
      </div>

      <div class="space-y-1.5">
        <label class="text-[var(--color-muted-foreground)] font-semibold">Layanan Terkait (Multiple Assignment)</label>
        <div class="grid grid-cols-2 md:grid-cols-3 gap-2 bg-[var(--color-bg)] border border-[var(--color-border)] p-3 rounded-2xl max-h-36 overflow-y-auto">
          {#each services as srv (srv.id)}
            <label class="flex items-center gap-2 cursor-pointer text-[var(--color-text)] hover:text-[var(--color-text)]">
              <input
                type="checkbox"
                checked={!!editingStaff.serviceIds?.includes(srv.id)}
                onchange={(e) => toggleService(srv.id, e.currentTarget.checked)}
                class="rounded bg-[var(--color-card)] border-[var(--color-border)] text-[var(--color-primary)] focus:ring-0"
              />
              <span class="truncate">{srv.name}</span>
            </label>
          {/each}
        </div>
      </div>

      <div class="space-y-1.5">
        <label class="text-[var(--color-muted-foreground)] font-semibold">Pendidikan / Profesi</label>
        <input
          type="text"
          placeholder="Contoh: S1 Kedokteran & Profesi Dokter FK UI"
          defaultValue={editingStaff.education ?? ''}
          oninput={(e) => updateStaff({ education: e.currentTarget.value })}
          class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none rounded-2xl px-4 py-2 text-[var(--color-text)]"
        />
      </div>

      <div class="space-y-1.5">
        <label class="text-[var(--color-muted-foreground)] font-semibold">Biografi Singkat</label>
        <textarea
          rows={3}
          placeholder="Keterangan profesional atau latar belakang pelayanan..."
          oninput={(e) => updateStaff({ bio: e.currentTarget.value })}
          class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none rounded-2xl px-4 py-2 text-[var(--color-text)]"
        >{editingStaff.bio ?? ''}</textarea>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="space-y-1.5">
          <label class="text-[var(--color-muted-foreground)] font-semibold">Jadwal Publik</label>
          <input
            type="text"
            placeholder="Senin - Jumat (08:00 - 14:00)"
            defaultValue={editingStaff.scheduleSummary ?? ''}
            oninput={(e) => updateStaff({ scheduleSummary: e.currentTarget.value })}
            class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none rounded-2xl px-4 py-2 text-[var(--color-text)]"
          />
        </div>

        <div class="space-y-1.5 flex items-center pt-5">
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!!editingStaff.showOnWebsite}
              onchange={(e) => updateStaff({ showOnWebsite: e.currentTarget.checked })}
              class="rounded bg-[var(--color-bg)] border-[var(--color-border)] text-[var(--color-primary)] focus:ring-0"
            />
            <span class="text-[var(--color-text)] font-medium">Show on Website (Public)</span>
          </label>
        </div>

        <div class="space-y-1.5">
          <label class="text-[var(--color-muted-foreground)] font-semibold">Review Status</label>
          <select
            value={editingStaff.reviewStatus ?? 'approved'}
            onchange={(e) => updateStaff({ reviewStatus: e.currentTarget.value as StaffProfile['reviewStatus'] })}
            class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl px-3 py-2 text-[var(--color-text)]"
          >
            <option value="approved">Approved</option>
            <option value="pending_review">Pending Review</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>
    </form>
    {/key}
  {/if}
</Modal>

<!-- Modal History -->
<Modal
  isOpen={isHistoryOpen}
  onClose={() => (isHistoryOpen = false)}
  title="Riwayat Mutasi / Penugasan Unit"
  size="md"
>
  <div class="space-y-3 max-h-80 overflow-y-auto text-xs">
    {#if selectedStaffHistory.length === 0}
      <div class="text-[var(--color-muted-foreground)] text-center py-8">Belum ada riwayat mutasi unit tercatat.</div>
    {:else}
      {#each selectedStaffHistory as h (h.id)}
        <div class="bg-[var(--color-bg)] border border-[var(--color-border)] p-4 rounded-2xl space-y-1.5">
          <div class="flex items-center justify-between text-[var(--color-muted-foreground)] text-[10px]">
            <span>{new Date(h.changedAt).toLocaleDateString('id-ID', { dateStyle: 'medium' })}</span>
            <span>Oleh: {h.changedBy.name}</span>
          </div>
          <div class="text-[var(--color-text)] font-semibold">{h.staffName}</div>
          <div class="text-[var(--color-muted-foreground)] text-[11px]">
            Dari <span class="text-rose-400">{h.previousUnitName || 'Unit Awal'}</span> → Pindah ke <span class="text-[var(--color-primary)]">{h.newUnitName}</span>
          </div>
        </div>
      {/each}
    {/if}
  </div>
</Modal>
