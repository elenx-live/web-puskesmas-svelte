<!-- @component Halaman admin untuk mengelola dan memverifikasi pengajuan registrasi layanan online (pendaftaran mandiri). -->
<script lang="ts">
  import {
    Calendar, User, Clock, CheckCircle, XCircle, Search,
    Filter, Eye, Check, X, RefreshCw, MessageSquare, History, Phone
  } from 'lucide-svelte';
  import Card from '../../../shared/ui/Card.svelte';
  import Badge from '../../../shared/ui/Badge.svelte';
  import Select from '../../../shared/ui/Select.svelte';
  import Input from '../../../shared/ui/Input.svelte';
  import { registrationService } from '../../../shared/services/registrationService.js';
  import { serviceEngineService } from '../../../shared/services/serviceEngineService.js';
  import { authStore } from '../../../shared/stores/auth.svelte.js';
  import { toastStore } from '../../../shared/stores/toast.svelte.js';
  import type {
    ServiceRegistrationEntity, RegistrationStatus, ServiceEntity
  } from '../../../shared/types/index.js';

  type BadgeVariant = 'primary' | 'amber' | 'emerald' | 'red' | 'zinc' | 'blue' | 'rose' | 'sky' | 'slate' | 'purple';

  let loading = $state(false);
  let registrations = $state<ServiceRegistrationEntity[]>([]);
  let services = $state<ServiceEntity[]>([]);

  // Filter states
  let searchQuery = $state('');
  let statusFilter = $state('');
  let serviceFilter = $state('');
  let dateFilter = $state('');

  // Selected registration for detail drawer
  let selectedReg = $state<ServiceRegistrationEntity | null>(null);
  let adminNotesInput = $state('');
  let updatingStatus = $state(false);

  // Stats
  let summary = $state({
    total: 0,
    waiting: 0,
    confirmed: 0,
    rejected: 0,
    completed: 0,
    cancelled: 0
  });

  async function loadData() {
    loading = true;
    try {
      const [allRegs, allServices] = await Promise.all([
        registrationService.getRegistrations(),
        serviceEngineService.getPublishedServices()
      ]);
      registrations = allRegs;
      services = allServices;

      // Load stats summary
      summary = await registrationService.getDashboardSummary();
    } catch (error) {
      console.error(error);
      toastStore.showToast('Gagal memuat data pendaftaran online.', 'error');
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    loadData();
  });

  async function handleUpdateStatus(regId: string, nextStatus: RegistrationStatus) {
    const user = authStore.user;
    if (!user) return;

    updatingStatus = true;
    try {
      const actor = {
        id: user.uid,
        email: user.email || 'admin@puskesmas.go.id',
        name: user.displayName || 'Admin Petugas'
      };

      const updated = await registrationService.updateStatus(
        regId,
        nextStatus,
        actor,
        adminNotesInput.trim() || undefined
      );

      toastStore.showToast(`Pendaftaran ${updated.registrationNumber} berhasil diupdate ke ${nextStatus}`, 'success');

      // Update local states
      selectedReg = updated;
      adminNotesInput = '';
      await loadData();
    } catch (error: any) {
      toastStore.showToast(error.message || 'Gagal mengubah status pendaftaran.', 'error');
    } finally {
      updatingStatus = false;
    }
  }

  // Filter computation
  const filteredRegistrations = $derived(registrations.filter(reg => {
    const matchesSearch =
      reg.registrationNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reg.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reg.identityNumber.includes(searchQuery);

    const matchesStatus = statusFilter ? reg.status === statusFilter : true;
    const matchesService = serviceFilter ? reg.serviceId === serviceFilter : true;
    const matchesDate = dateFilter ? reg.visitDate === dateFilter : true;

    return matchesSearch && matchesStatus && matchesService && matchesDate;
  }));

  function getStatusInfo(status: RegistrationStatus): { variant: BadgeVariant; label: string } {
    switch (status) {
      case 'waiting': return { variant: 'amber', label: 'Menunggu' };
      case 'confirmed': return { variant: 'emerald', label: 'Dikonfirmasi' };
      case 'rejected': return { variant: 'rose', label: 'Ditolak' };
      case 'completed': return { variant: 'blue', label: 'Selesai' };
      case 'cancelled': return { variant: 'zinc', label: 'Batal Pasien' };
      default: return { variant: 'zinc', label: status };
    }
  }

  function getStatusLabelText(st: RegistrationStatus): string {
    switch (st) {
      case 'waiting': return 'Menunggu Konfirmasi';
      case 'confirmed': return 'Telah Disetujui / Terjadwal';
      case 'rejected': return 'Ditolak / Dibatalkan';
      case 'completed': return 'Selesai Dilayani';
      case 'cancelled': return 'Dibatalkan oleh Pasien';
      default: return st;
    }
  }

  function selectRegistration(reg: ServiceRegistrationEntity) {
    selectedReg = reg;
    adminNotesInput = reg.adminNotes || '';
  }
</script>

<div class="space-y-6">

  <!-- Header section -->
  <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-5">
    <div>
      <span class="text-xs font-bold uppercase tracking-widest text-[var(--color-primary)]">Pendaftaran Mandiri</span>
      <h1 class="text-2xl font-light text-[var(--color-text)]">Registrasi Layanan Online</h1>
      <p class="text-xs text-[var(--color-muted-foreground)]">Kelola dan verifikasi pengajuan jadwal kunjungan online dari warga.</p>
    </div>
    <button
      onclick={loadData}
      disabled={loading}
      class="self-start md:self-auto px-4 py-2 bg-[var(--color-card)] border border-[var(--color-border)] hover:border-zinc-400 transition text-xs font-bold text-[var(--color-text)] rounded-xl flex items-center gap-2"
    >
      <RefreshCw class={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
      <span>Refresh Data</span>
    </button>
  </div>

  <!-- Stats Bento Layout -->
  <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
    <Card class="p-4 flex flex-col justify-between border-[var(--color-border)] bg-[var(--color-card)]">
      <span class="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">Total Permohonan</span>
      <div class="text-2xl font-light text-[var(--color-text)] mt-1">{summary.total}</div>
    </Card>
    <Card class="p-4 flex flex-col justify-between border-[var(--color-border)] bg-[var(--color-card)]">
      <span class="text-[10px] font-bold uppercase tracking-wider text-[var(--color-primary)] flex items-center gap-1">
        <Clock class="w-3.5 h-3.5 shrink-0" />
        <span>Menunggu</span>
      </span>
      <div class="text-2xl font-light text-[var(--color-primary)] mt-1">{summary.waiting}</div>
    </Card>
    <Card class="p-4 flex flex-col justify-between border-[var(--color-border)] bg-[var(--color-card)]">
      <span class="text-[10px] font-bold uppercase tracking-wider text-[var(--color-primary)] flex items-center gap-1">
        <CheckCircle class="w-3.5 h-3.5 shrink-0" />
        <span>Dikonfirmasi</span>
      </span>
      <div class="text-2xl font-light text-[var(--color-primary)] mt-1">{summary.confirmed}</div>
    </Card>
    <Card class="p-4 flex flex-col justify-between border-[var(--color-border)] bg-[var(--color-card)]">
      <span class="text-[10px] font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1">
        <XCircle class="w-3.5 h-3.5 shrink-0" />
        <span>Ditolak</span>
      </span>
      <div class="text-2xl font-light text-rose-400 mt-1">{summary.rejected}</div>
    </Card>
    <Card class="p-4 flex flex-col justify-between border-[var(--color-border)] bg-[var(--color-card)]">
      <span class="text-[10px] font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1">
        <CheckCircle class="w-3.5 h-3.5 shrink-0" />
        <span>Selesai</span>
      </span>
      <div class="text-2xl font-light text-blue-400 mt-1">{summary.completed}</div>
    </Card>
  </div>

  <!-- Filter Toolbar -->
  <Card class="p-4 bg-[var(--color-card)] border border-[var(--color-border)] space-y-3">
    <div class="flex items-center gap-2 text-xs font-bold text-[var(--color-muted-foreground)] uppercase tracking-wider border-b border-[var(--color-border)]/50 pb-2">
      <Filter class="w-4 h-4 text-[var(--color-primary)]" />
      <span>Filter Kriteria</span>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
      <!-- Search Input -->
      <div class="space-y-1">
        <span class="text-[10px] uppercase text-[var(--color-muted-foreground)] font-bold tracking-wider">Cari Pasien / Kode</span>
        <div class="relative flex items-center">
          <Search class="absolute left-3 w-4 h-4 text-[var(--color-muted-foreground)]" />
          <Input
            placeholder="Kode, Nama, atau NIK..."
            bind:value={searchQuery}
            class="bg-[var(--color-bg)] border-[var(--color-border)] pl-9"
          />
        </div>
      </div>

      <!-- Status Selector -->
      <div class="space-y-1">
        <span class="text-[10px] uppercase text-[var(--color-muted-foreground)] font-bold tracking-wider">Status</span>
        <Select
          bind:value={statusFilter}
          options={[
            { value: '', label: 'Semua Status' },
            { value: 'waiting', label: 'Menunggu' },
            { value: 'confirmed', label: 'Dikonfirmasi' },
            { value: 'rejected', label: 'Ditolak' },
            { value: 'completed', label: 'Selesai' },
            { value: 'cancelled', label: 'Batal Pasien' }
          ]}
          class="bg-[var(--color-bg)] border-[var(--color-border)]"
        />
      </div>

      <!-- Service Selector -->
      <div class="space-y-1">
        <span class="text-[10px] uppercase text-[var(--color-muted-foreground)] font-bold tracking-wider">Layanan</span>
        <Select
          bind:value={serviceFilter}
          options={[
            { value: '', label: 'Semua Layanan' },
            ...services.map(s => ({ value: s.id, label: s.name }))
          ]}
          class="bg-[var(--color-bg)] border-[var(--color-border)]"
        />
      </div>

      <!-- Date Input -->
      <div class="space-y-1">
        <span class="text-[10px] uppercase text-[var(--color-muted-foreground)] font-bold tracking-wider">Tanggal Kunjungan</span>
        <input
          type="date"
          bind:value={dateFilter}
          class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-2.5 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] text-xs transition-colors"
        />
      </div>
    </div>
  </Card>

  <!-- Layout: Table list + Detail Drawer side-by-side -->
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

    <!-- Left Column: Data Grid List (takes 2 cols if drawer is active) -->
    <div class={selectedReg ? 'lg:col-span-2 space-y-4' : 'lg:col-span-3 space-y-4'}>
      <Card class="p-0 overflow-hidden border-[var(--color-border)] bg-[var(--color-card)]">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs text-[var(--color-text)]">
            <thead class="bg-[var(--color-bg)] text-[10px] font-bold uppercase text-[var(--color-muted-foreground)] border-b border-[var(--color-border)]">
              <tr>
                <th class="py-3 px-4">Kode / No. Reg</th>
                <th class="py-3 px-4">Nama Pasien & NIK</th>
                <th class="py-3 px-4">Layanan & Tanggal</th>
                <th class="py-3 px-4">Status</th>
                <th class="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[var(--color-border)]/60">
              {#if filteredRegistrations.length === 0}
                <tr>
                  <td colspan={5} class="py-8 text-center text-[var(--color-muted-foreground)] italic">
                    Tidak ditemukan data registrasi pendaftaran online.
                  </td>
                </tr>
              {:else}
                {#each filteredRegistrations as reg (reg.id)}
                  {@const info = getStatusInfo(reg.status)}
                  <tr
                    class={`hover:bg-[var(--color-card)] transition-colors cursor-pointer ${
                      selectedReg?.id === reg.id ? 'bg-[var(--color-card)]' : ''
                    }`}
                    onclick={() => selectRegistration(reg)}
                  >
                    <td class="py-3.5 px-4 font-mono font-bold text-[var(--color-text)] whitespace-nowrap">
                      {reg.registrationNumber}
                    </td>
                    <td class="py-3.5 px-4">
                      <div class="font-bold text-[var(--color-text)]">{reg.fullName}</div>
                      <div class="text-[10px] text-[var(--color-muted-foreground)] font-mono">{reg.identityNumber}</div>
                    </td>
                    <td class="py-3.5 px-4">
                      <div class="font-medium text-[var(--color-primary)]">{reg.serviceName}</div>
                      <div class="text-[10px] text-[var(--color-muted-foreground)] flex items-center gap-1 mt-0.5">
                        <Calendar class="w-3 h-3" />
                        <span>{reg.visitDate}</span>
                      </div>
                    </td>
                    <td class="py-3.5 px-4 whitespace-nowrap">
                      <Badge variant={info.variant}>{info.label}</Badge>
                    </td>
                    <td class="py-3.5 px-4 text-right" onclick={(e) => e.stopPropagation()}>
                      <button
                        onclick={() => selectRegistration(reg)}
                        class="p-2 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] hover:border-[var(--color-primary)] text-[var(--color-muted-foreground)] hover:text-[var(--color-primary)] transition"
                        title="Detail Pendaftaran"
                      >
                        <Eye class="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                {/each}
              {/if}
            </tbody>
          </table>
        </div>
      </Card>
    </div>

    <!-- Right Column: Detail Drawer (takes 1 col, slides in if selected) -->
    {#if selectedReg}
      {@const selInfo = getStatusInfo(selectedReg.status)}
      <div class="lg:col-span-1 animate-fadeIn">
        <Card class="p-5 border-[var(--color-primary)]/20 bg-[var(--color-card)] space-y-5 sticky top-6">

          <!-- Header: Close / Action bar -->
          <div class="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
            <div class="space-y-0.5">
              <span class="text-[10px] uppercase font-mono text-[var(--color-primary)] font-bold">Detail Pendaftaran</span>
              <h2 class="text-sm font-bold text-[var(--color-text)] font-mono">{selectedReg.registrationNumber}</h2>
            </div>
            <button
              onclick={() => (selectedReg = null)}
              class="p-1.5 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] hover:border-zinc-400 transition text-[var(--color-muted-foreground)] hover:text-[var(--color-text)]"
            >
              <X class="w-4 h-4" />
            </button>
          </div>

          <!-- Patient Information Box -->
          <div class="space-y-3 text-xs">
            <div class="p-3 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl space-y-2">
              <div class="flex items-center gap-2 border-b border-[var(--color-border)] pb-1.5">
                <User class="w-4 h-4 text-[var(--color-primary)] shrink-0" />
                <span class="font-bold text-[var(--color-text)] text-[11px] uppercase tracking-wider">Identitas Pasien</span>
              </div>
              <div class="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span class="text-[var(--color-muted-foreground)] block">Nama Lengkap</span>
                  <span class="text-[var(--color-text)] font-bold">{selectedReg.fullName}</span>
                </div>
                <div>
                  <span class="text-[var(--color-muted-foreground)] block">NIK</span>
                  <span class="text-[var(--color-text)] font-mono">{selectedReg.identityNumber}</span>
                </div>
                <div>
                  <span class="text-[var(--color-muted-foreground)] block">Tgl Lahir / Gender</span>
                  <span class="text-[var(--color-text)]">
                    {selectedReg.dateOfBirth} ({selectedReg.gender === 'L' ? 'Laki-laki' : 'Perempuan'})
                  </span>
                </div>
                <div>
                  <span class="text-[var(--color-muted-foreground)] block">Nomor HP / WA</span>
                  <span class="text-[var(--color-text)] font-semibold flex items-center gap-1 mt-0.5">
                    <Phone class="w-3.5 h-3.5 text-[var(--color-muted-foreground)]" />
                    <span>{selectedReg.phoneNumber}</span>
                  </span>
                </div>
              </div>
            </div>

            <!-- Visit details Box -->
            <div class="p-3 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl space-y-2">
              <div class="flex items-center gap-2 border-b border-[var(--color-border)] pb-1.5">
                <Calendar class="w-4 h-4 text-sky-400 shrink-0" />
                <span class="font-bold text-[var(--color-text)] text-[11px] uppercase tracking-wider">Detail Kunjungan</span>
              </div>
              <div>
                <span class="text-[var(--color-muted-foreground)] text-[10px] block">Layanan Tujuan</span>
                <span class="text-[var(--color-text)] font-bold text-[var(--color-primary)]">{selectedReg.serviceName}</span>
              </div>
              <div class="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span class="text-[var(--color-muted-foreground)] block">Rencana Tanggal</span>
                  <span class="text-[var(--color-text)] font-bold">{selectedReg.visitDate}</span>
                </div>
                <div>
                  <span class="text-[var(--color-muted-foreground)] block">Status Saat Ini</span>
                  <div class="mt-0.5"><Badge variant={selInfo.variant}>{selInfo.label}</Badge></div>
                </div>
              </div>
              <div>
                <span class="text-[var(--color-muted-foreground)] text-[10px] block">Catatan / Keluhan Pasien</span>
                <p class="text-[var(--color-text)] italic">{selectedReg.notes || 'Tidak ada keluhan tertulis.'}</p>
              </div>
            </div>

            <!-- Operational Notes field (Admin Input) -->
            <div class="space-y-1.5">
              <label class="text-[var(--color-muted-foreground)] font-semibold flex items-center gap-1">
                <MessageSquare class="w-3.5 h-3.5 text-[var(--color-muted-foreground)]" />
                <span>Catatan Petugas Admin</span>
              </label>
              <textarea
                rows={2}
                bind:value={adminNotesInput}
                placeholder="Masukkan instruksi khusus, alasan penolakan, atau nomor loket..."
                class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-2.5 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] text-[11px] font-sans transition-colors"
              ></textarea>
            </div>

            <!-- Interactive Status Transition Actions -->
            <div class="space-y-2 pt-2 border-t border-[var(--color-border)]">
              <span class="text-[10px] uppercase font-mono tracking-wider text-[var(--color-muted-foreground)] block">Ubah Status Alur Kerja</span>

              <div class="grid grid-cols-2 gap-2">
                <!-- Confirm button -->
                {#if selectedReg.status === 'waiting'}
                  <button
                    onclick={() => handleUpdateStatus(selectedReg.id, 'confirmed')}
                    disabled={updatingStatus}
                    class="px-3 py-2 bg-emerald-600 hover:bg-[var(--color-primary)] disabled:opacity-50 text-[var(--color-primary-foreground)] font-bold transition rounded-xl text-xs flex items-center justify-center gap-1"
                  >
                    <Check class="w-4 h-4" />
                    <span>Setujui</span>
                  </button>
                {/if}

                <!-- Reject button -->
                {#if selectedReg.status === 'waiting'}
                  <button
                    onclick={() => handleUpdateStatus(selectedReg.id, 'rejected')}
                    disabled={updatingStatus}
                    class="px-3 py-2 bg-rose-600/15 border border-rose-600/30 hover:bg-rose-600 hover:text-white disabled:opacity-50 text-rose-400 font-bold transition rounded-xl text-xs flex items-center justify-center gap-1"
                  >
                    <X class="w-4 h-4" />
                    <span>Tolak</span>
                  </button>
                {/if}

                <!-- Complete button -->
                {#if selectedReg.status === 'confirmed'}
                  <button
                    onclick={() => handleUpdateStatus(selectedReg.id, 'completed')}
                    disabled={updatingStatus}
                    class="col-span-2 px-3 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold transition rounded-xl text-xs flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle class="w-4 h-4" />
                    <span>Selesaikan Kunjungan</span>
                  </button>
                {/if}

                <!-- Cancel Admin button -->
                {#if selectedReg.status === 'waiting' || selectedReg.status === 'confirmed'}
                  <button
                    onclick={() => handleUpdateStatus(selectedReg.id, 'cancelled')}
                    disabled={updatingStatus}
                    class="col-span-2 px-3 py-2 bg-[var(--color-surface)] hover:bg-zinc-700 disabled:opacity-50 text-[var(--color-muted-foreground)] font-bold transition rounded-xl text-xs flex items-center justify-center gap-1"
                  >
                    <XCircle class="w-4 h-4" />
                    <span>Batalkan Permohonan</span>
                  </button>
                {/if}
              </div>
            </div>

            <!-- Audit History Timeline -->
            {#if selectedReg.history && selectedReg.history.length > 0}
              <div class="pt-3 border-t border-[var(--color-border)] space-y-2">
                <span class="text-[10px] uppercase font-mono tracking-wider text-[var(--color-muted-foreground)] block flex items-center gap-1">
                  <History class="w-3.5 h-3.5" />
                  <span>Riwayat Aktivitas & Log Audit</span>
                </span>
                <div class="space-y-2 border-l border-[var(--color-border)] pl-2 my-1 max-h-[160px] overflow-y-auto">
                  {#each selectedReg.history as h, i (i)}
                    <div class="relative text-[10px] space-y-0.5">
                      <div class="font-bold text-[var(--color-text)] flex items-center justify-between">
                        <span>{getStatusLabelText(h.status)}</span>
                        <span class="text-[var(--color-muted-foreground)] font-mono">{h.updatedAt.split('T')[0]}</span>
                      </div>
                      <p class="text-[var(--color-muted-foreground)]">Petugas: {h.updatedBy}</p>
                      {#if h.notes}
                        <p class="text-[var(--color-primary)] italic bg-[var(--color-bg)] px-1.5 py-0.5 rounded border border-[var(--color-border)]">
                          Catatan: {h.notes}
                        </p>
                      {/if}
                    </div>
                  {/each}
                </div>
              </div>
            {/if}

          </div>
        </Card>
      </div>
    {/if}

  </div>

</div>
