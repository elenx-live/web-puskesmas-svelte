<!-- @component Manajemen permohonan informasi publik (PPID): daftar, filter status, detail & proses, perbarui status, tanggapan publik, catatan internal. -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { authStore } from '../../../shared/stores/auth.svelte.js';
  import { toastStore } from '../../../shared/stores/toast.svelte.js';
  import { publicInfoService } from '../../../shared/services/publicInfoService.js';
  import type { InformationRequestEntity, InformationRequestStatus } from '../../../shared/types/index.js';
  import Card from '../../../shared/ui/Card.svelte';
  import { Search, Eye, X } from 'lucide-svelte';

  let requests = $state<InformationRequestEntity[]>([]);
  let loading = $state(true);
  let search = $state('');
  let statusFilter = $state('');

  // Selected Detail Modal
  let selectedReq = $state<InformationRequestEntity | null>(null);
  let newStatus = $state<InformationRequestStatus>('Diproses');
  let statusNote = $state('');
  let internalNoteText = $state('');
  let publicResponseText = $state('');

  function getActor() {
    const user = authStore.user;
    return {
      id: user?.uid || 'usr-admin',
      name: user?.displayName || 'Administrator',
      email: user?.email || 'admin@puskesmas.id',
    };
  }

  async function loadData() {
    loading = true;
    try {
      const data = await publicInfoService.getInfoRequests(statusFilter || undefined, search);
      requests = data;
    } catch (e) {
      console.error(e);
      toastStore.showToast('Gagal memuat permohonan informasi', 'error');
    } finally {
      loading = false;
    }
  }

  async function handleUpdateStatus(e: SubmitEvent) {
    e.preventDefault();
    if (!selectedReq) return;
    try {
      const updated = await publicInfoService.updateInfoRequestStatus(
        selectedReq.id,
        newStatus,
        statusNote || `Status diperbarui menjadi ${newStatus}`,
        getActor()
      );
      selectedReq = updated;
      statusNote = '';
      toastStore.showToast('Status permohonan berhasil diperbarui', 'success');
      loadData();
    } catch (e: any) {
      toastStore.showToast(e.message || 'Gagal memperbarui status', 'error');
    }
  }

  async function handleAddInternalNote(e: SubmitEvent) {
    e.preventDefault();
    if (!selectedReq || !internalNoteText.trim()) return;
    try {
      const updated = await publicInfoService.addInternalNote(
        selectedReq.id,
        internalNoteText,
        getActor()
      );
      selectedReq = updated;
      internalNoteText = '';
      toastStore.showToast('Catatan internal berhasil ditambahkan', 'success');
      loadData();
    } catch (e) {
      toastStore.showToast('Gagal menambahkan catatan', 'error');
    }
  }

  async function handleAddPublicResponse(e: SubmitEvent) {
    e.preventDefault();
    if (!selectedReq || !publicResponseText.trim()) return;
    try {
      const updated = await publicInfoService.addPublicResponse(
        selectedReq.id,
        publicResponseText,
        getActor()
      );
      selectedReq = updated;
      publicResponseText = '';
      toastStore.showToast('Tanggapan publik berhasil dikirim', 'success');
      loadData();
    } catch (e) {
      toastStore.showToast('Gagal mengirim tanggapan', 'error');
    }
  }

  function handleOpenDetail(req: InformationRequestEntity) {
    selectedReq = req;
    newStatus = 'Diproses';
    statusNote = '';
    internalNoteText = '';
    publicResponseText = '';
  }

  onMount(() => {
    loadData();
  });

  $effect(() => {
    const s = search;
    const st = statusFilter;
    void s;
    void st;
    loadData();
  });
</script>

<div class="space-y-6 max-w-7xl mx-auto">
  <!-- Header -->
  <div
    class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--color-card)] border border-[var(--color-border)] p-6 rounded-3xl"
  >
    <div class="space-y-1">
      <span class="text-[10px] font-bold uppercase tracking-widest text-[var(--color-primary)]"
        >Modul 5I — PPID</span
      >
      <h1 class="text-xl font-bold text-[var(--color-text)]">Kelola Permintaan Informasi Publik</h1>
      <p class="text-xs text-[var(--color-muted-foreground)]">
        Verifikasi, proses, dan tanggapi permohonan informasi dari masyarakat secara akuntabel.
      </p>
    </div>
  </div>

  <!-- Filters -->
  <div class="flex flex-col md:flex-row gap-4 items-center justify-between">
    <div class="relative w-full md:w-80">
      <Search class="w-4 h-4 text-[var(--color-muted-foreground)] absolute left-3 top-1/2 -translate-y-1/2" />
      <input
        type="text"
        placeholder="Cari nomor tiket, pemohon..."
        bind:value={search}
        class="w-full bg-[var(--color-card)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none rounded-2xl pl-9 pr-4 py-2.5 text-xs text-[var(--color-text)] placeholder-zinc-500"
      />
    </div>

    <select
      bind:value={statusFilter}
      class="w-full md:w-auto bg-[var(--color-card)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none rounded-2xl px-4 py-2.5 text-xs text-[var(--color-text)]"
    >
      <option value="">Semua Status</option>
      <option value="Diterima">Diterima</option>
      <option value="Diverifikasi">Diverifikasi</option>
      <option value="Diproses">Diproses</option>
      <option value="Perlu Klarifikasi">Perlu Klarifikasi</option>
      <option value="Selesai">Selesai</option>
      <option value="Ditolak">Ditolak</option>
    </select>
  </div>

  <!-- Table -->
  <Card class="border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden shadow-xl">
    {#if loading}
      <div class="p-12 text-center text-[var(--color-muted-foreground)] font-mono text-xs">
        Memuat permohonan...
      </div>
    {:else if requests.length === 0}
      <div class="p-12 text-center text-[var(--color-muted-foreground)] text-xs">
        Tidak ada permohonan informasi publik.
      </div>
    {:else}
      <div class="overflow-x-auto">
        <table class="w-full text-xs text-left text-[var(--color-text)]">
          <thead
            class="bg-[var(--color-bg)] text-[10px] font-bold uppercase text-[var(--color-muted-foreground)] border-b border-[var(--color-border)]"
          >
            <tr>
              <th class="px-6 py-4">Tiket / Tanggal</th>
              <th class="px-6 py-4">Pemohon & Kontak</th>
              <th class="px-6 py-4">Informasi yang Diminta</th>
              <th class="px-6 py-4">Status</th>
              <th class="px-6 py-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[var(--color-border)]">
            {#each requests as req (req.id)}
              <tr class="hover:bg-[var(--color-card)] transition">
                <td class="px-6 py-4 space-y-1">
                  <div class="font-mono font-bold text-[var(--color-text)]">{req.trackingNumber}</div>
                  <div class="text-[var(--color-muted-foreground)] text-[10px] font-mono">
                    {new Date(req.submittedAt).toLocaleDateString('id-ID')}
                  </div>
                </td>
                <td class="px-6 py-4 space-y-0.5">
                  <div class="font-medium text-[var(--color-text)]">{req.requesterName}</div>
                  <div class="text-[var(--color-muted-foreground)] text-[11px] font-mono">{req.contact}</div>
                </td>
                <td class="px-6 py-4 max-w-xs">
                  <p class="text-[var(--color-text)] line-clamp-2">{req.informationRequested}</p>
                </td>
                <td class="px-6 py-4">
                  <span
                    class={`px-2.5 py-1 rounded-lg text-[10px] font-semibold ${
                      req.status === 'Selesai'
                        ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20'
                        : req.status === 'Ditolak'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20'
                    }`}
                  >
                    {req.status}
                  </span>
                </td>
                <td class="px-6 py-4 text-right">
                  <button
                    onclick={() => handleOpenDetail(req)}
                    class="px-4 py-2 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20 font-semibold inline-flex items-center gap-1.5 transition"
                  >
                    <Eye class="w-3.5 h-3.5" /> Proses
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </Card>

  <!-- Detail & Process Modal -->
  {#if selectedReq}
    <div class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        class="bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl max-w-3xl w-full p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div class="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
          <div>
            <span class="text-[10px] text-[var(--color-muted-foreground)] font-mono uppercase"
              >Kelola Permintaan</span
            >
            <h3 class="text-lg font-mono font-bold text-[var(--color-text)]">
              {selectedReq.trackingNumber}
            </h3>
          </div>
          <button
            onclick={() => (selectedReq = null)}
            class="text-[var(--color-muted-foreground)] hover:text-[var(--color-text)]"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <div
          class="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[var(--color-bg)] p-4 rounded-2xl border border-[var(--color-border)] text-xs"
        >
          <div>
            <span class="text-[var(--color-muted-foreground)]">Pemohon:</span>
            <strong class="text-[var(--color-text)]">{selectedReq.requesterName}</strong>
          </div>
          <div>
            <span class="text-[var(--color-muted-foreground)]">Kontak:</span>
            <strong class="text-[var(--color-text)] font-mono">{selectedReq.contact}</strong>
          </div>
          <div>
            <span class="text-[var(--color-muted-foreground)]">Format:</span>
            <strong class="text-[var(--color-text)]">{selectedReq.desiredFormat}</strong>
          </div>
          <div>
            <span class="text-[var(--color-muted-foreground)]">Tujuan:</span>
            <strong class="text-[var(--color-text)]">{selectedReq.purpose || '-'}</strong>
          </div>
        </div>

        <div class="space-y-2">
          <h4 class="text-xs font-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">
            Informasi yang Diminta
          </h4>
          <p
            class="text-sm text-[var(--color-text)] bg-[var(--color-bg)] p-4 rounded-2xl border border-[var(--color-border)]"
          >
            {selectedReq.informationRequested}
          </p>
        </div>

        <!-- Status Update Form -->
        <form
          onsubmit={handleUpdateStatus}
          class="bg-[var(--color-bg)] p-4 rounded-2xl border border-[var(--color-border)] space-y-3"
        >
          <h4 class="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)]">
            Perbarui Status Permohonan
          </h4>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select
              bind:value={newStatus}
              class="w-full bg-[var(--color-card)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none rounded-xl px-3 py-2 text-xs text-[var(--color-text)]"
            >
              <option value="Diterima">Diterima</option>
              <option value="Diverifikasi">Diverifikasi</option>
              <option value="Diproses">Diproses</option>
              <option value="Perlu Klarifikasi">Perlu Klarifikasi</option>
              <option value="Selesai">Selesai</option>
              <option value="Ditolak">Ditolak</option>
            </select>
            <input
              type="text"
              placeholder="Catatan perubahan status..."
              bind:value={statusNote}
              class="w-full bg-[var(--color-card)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none rounded-xl px-3 py-2 text-xs text-[var(--color-text)]"
            />
          </div>
          <button
            type="submit"
            class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-[var(--color-primary)] text-[var(--color-primary-foreground)] text-xs font-semibold shadow transition"
          >
            Simpan Status Baru
          </button>
        </form>

        <!-- Public Responses -->
        <div class="space-y-3">
          <h4 class="text-xs font-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">
            Tanggapan Publik Resmi
          </h4>
          {#if selectedReq.publicResponses}
            {#each selectedReq.publicResponses as resp (resp.id)}
              <div
                class="bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/20 rounded-2xl p-3 text-xs space-y-1"
              >
                <p class="font-semibold text-[var(--color-primary)]">{resp.authorName}</p>
                <p class="text-[var(--color-text)]">{resp.response}</p>
              </div>
            {/each}
          {/if}
          <form onsubmit={handleAddPublicResponse} class="flex gap-2">
            <input
              type="text"
              placeholder="Kirim tanggapan resmi ke publik/pemohon..."
              bind:value={publicResponseText}
              class="flex-1 bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none rounded-xl px-3 py-2 text-xs text-[var(--color-text)]"
            />
            <button
              type="submit"
              class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-[var(--color-primary)] text-[var(--color-primary-foreground)] text-xs font-semibold"
            >
              Kirim
            </button>
          </form>
        </div>

        <!-- Internal Notes -->
        <div class="space-y-3">
          <h4 class="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)]">
            Catatan Internal Petugas
          </h4>
          {#if selectedReq.internalNotes}
            {#each selectedReq.internalNotes as note (note.id)}
              <div
                class="bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/20 rounded-2xl p-3 text-xs space-y-1"
              >
                <div class="flex justify-between text-[var(--color-primary)] font-semibold">
                  <span>{note.authorName}</span>
                  <span class="text-[10px] text-[var(--color-muted-foreground)] font-mono"
                    >{new Date(note.createdAt).toLocaleString('id-ID')}</span
                  >
                </div>
                <p class="text-[var(--color-text)]">{note.note}</p>
              </div>
            {/each}
          {/if}
          <form onsubmit={handleAddInternalNote} class="flex gap-2">
            <input
              type="text"
              placeholder="Tambah catatan internal (tidak dilihat publik)..."
              bind:value={internalNoteText}
              class="flex-1 bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none rounded-xl px-3 py-2 text-xs text-[var(--color-text)]"
            />
            <button
              type="submit"
              class="px-4 py-2 rounded-xl bg-amber-600 hover:bg-[var(--color-primary)] text-[var(--color-primary-foreground)] text-xs font-semibold"
            >
              Tambah Catatan
            </button>
          </form>
        </div>
      </div>
    </div>
  {/if}
</div>
