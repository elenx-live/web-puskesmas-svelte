<!-- @component Status antrean publik — cek posisi antrean mandiri, statistik real-time, dan daftar perkembangan antrean per unit. -->
<script lang="ts">
  import { untrack } from 'svelte';
  import { registrationService } from '../../shared/services/registrationService.js';
  import { serviceEngineService } from '../../shared/services/serviceEngineService.js';
  import type { ServiceRegistrationEntity, ServiceEntity } from '../../shared/types/index.js';
  import Badge from '../../shared/ui/Badge.svelte';
  import {
    Users, Search, AlertCircle, Sparkles, ListOrdered, Calendar, ArrowLeft,
  } from 'lucide-svelte';

  let services = $state<ServiceEntity[]>([]);
  let selectedServiceId = $state('');
  let visitDate = $state(new Date().toISOString().split('T')[0]);

  // Data state
  let registrations = $state<ServiceRegistrationEntity[]>([]);
  let stats = $state({
    todayCount: 0,
    waitingCount: 0,
    callingCount: 0,
    servingCount: 0,
    completedCount: 0,
  });

  // Check my position state
  let searchQuery = $state('');
  let searchResult = $state<{
    registration: ServiceRegistrationEntity;
    positionAhead: number;
  } | null>(null);
  let searchError = $state('');

  $effect(() => {
    void loadServices();
  });

  $effect(() => {
    const sid = selectedServiceId; // tracked deps
    const vdate = visitDate;
    untrack(() => {
      void loadStatusData();
    });
    const interval = setInterval(loadStatusData, 10000); // 10s polling for public status
    return () => clearInterval(interval);
  });

  async function loadServices() {
    try {
      const all = await serviceEngineService.getServices();
      const queueServices = all.filter((s) => s.status === 'published' && s.queueEnabled);
      services = queueServices;
      if (queueServices.length > 0) {
        selectedServiceId = queueServices[0].id;
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function loadStatusData() {
    if (document.hidden) return;
    try {
      const filters: { visitDate: string; serviceId?: string } = { visitDate };
      if (selectedServiceId) {
        filters.serviceId = selectedServiceId;
      }

      const all = await registrationService.getRegistrations(filters);
      // Only keep records with valid queue numbers
      const queueList = all.filter((r) => r.queueNumber);
      registrations = queueList;

      // Load stats
      const summary = await registrationService.getQueueDashboardSummary({
        visitDate,
        serviceId: selectedServiceId,
      });

      stats = {
        todayCount: summary.todayCount,
        waitingCount: summary.waitingCount,
        callingCount: summary.callingCount,
        servingCount: summary.servingCount,
        completedCount: summary.completedCount,
      };
    } catch (err) {
      console.error(err);
    }
  }

  function handleCheckPosition() {
    searchError = '';
    searchResult = null;

    if (!searchQuery.trim()) {
      searchError = 'Masukkan nomor pendaftaran (REG-xxx) atau NIK Anda.';
      return;
    }

    const query = searchQuery.trim().toLowerCase();

    // Find inside registrations
    const found = registrations.find(
      (r) =>
        r.registrationNumber.toLowerCase() === query ||
        r.identityNumber.toLowerCase() === query,
    );

    if (!found) {
      searchError = 'Nomor pendaftaran tidak ditemukan untuk hari ini. Pastikan tanggal kunjungan benar dan pendaftaran Anda sudah dikonfirmasi.';
      return;
    }

    if (!found.queueNumber) {
      searchError = 'Pendaftaran Anda belum memperoleh nomor antrean.';
      return;
    }

    // Calculate queue position ahead of this user
    // Only count 'waiting' status with lower sequence number for the same service
    const mySeq = parseInt(found.queueNumber.split('-')[1] || '0', 10);
    const serviceWaitingList = registrations.filter(
      (r) =>
        r.serviceId === found.serviceId &&
        r.queueStatus === 'waiting' &&
        r.id !== found.id,
    );

    let positionAhead = 0;
    for (const other of serviceWaitingList) {
      const otherSeq = parseInt(other.queueNumber?.split('-')[1] || '0', 10);
      if (otherSeq < mySeq) {
        positionAhead++;
      }
    }

    searchResult = {
      registration: found,
      positionAhead,
    };
  }

  // Obscure name for privacy (e.g. "Budi Setiawan" -> "B*** S***")
  function obscureName(name: string): string {
    const words = name.trim().split(' ');
    return words
      .map((w) => {
        if (w.length <= 1) return w;
        return w[0] + '*'.repeat(Math.min(w.length - 1, 4)) + (w.length > 2 ? w[w.length - 1] : '');
      })
      .join(' ');
  }

  // Find currently calling/serving queue on display
  const activeQueues = $derived(
    registrations
      .filter((r) => r.queueStatus === 'calling' || r.queueStatus === 'serving')
      .sort((a, b) => {
        // Prioritize calling over serving, then sort by latest called
        if (a.queueStatus === 'calling' && b.queueStatus !== 'calling') return -1;
        if (a.queueStatus !== 'calling' && b.queueStatus === 'calling') return 1;
        const dateA = new Date(a.queueCalledAt || 0).getTime();
        const dateB = new Date(b.queueCalledAt || 0).getTime();
        return dateB - dateA;
      }),
  );

  const activeOnDisplay = $derived(activeQueues[0] || null);

  function queueBadge(status?: string): { variant: 'emerald' | 'amber' | 'purple' | 'blue' | 'red' | 'zinc'; label: string } {
    if (status === 'waiting') return { variant: 'blue', label: 'Menunggu' };
    if (status === 'calling') return { variant: 'amber', label: 'Dipanggil' };
    if (status === 'serving') return { variant: 'purple', label: 'Dilayani' };
    if (status === 'completed') return { variant: 'emerald', label: 'Selesai' };
    if (status === 'skipped') return { variant: 'red', label: 'Dilewati' };
    if (status === 'cancelled') return { variant: 'red', label: 'Batal' };
    return { variant: 'zinc', label: status || 'waiting' };
  }
</script>

<div class="max-w-4xl mx-auto px-4 py-8 space-y-8">

  <!-- Breadcrumb / Back button -->
  <div>
    <a
      href="#/pendaftaran/cek"
      class="inline-flex items-center gap-2 text-xs font-medium text-[var(--color-primary)] hover:text-[var(--color-primary)] transition bg-[var(--color-primary)]/10 px-3 py-1.5 rounded-xl border border-[var(--color-primary)]/20"
    >
      <ArrowLeft class="w-3.5 h-3.5" />
      <span>Cek Status Pendaftaran</span>
    </a>
  </div>

  <!-- Page title -->
  <div class="text-center space-y-2">
    <div class="inline-flex items-center gap-1.5 px-3 py-1 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-full text-[10px] font-bold uppercase tracking-widest border border-[var(--color-primary)]/20">
      <Sparkles class="w-3.5 h-3.5 animate-pulse" />
      <span>Pantauan Real-time</span>
    </div>
    <h1 class="text-3xl font-light text-[var(--color-text)] tracking-tight">Status Antrean Puskesmas</h1>
    <p class="text-xs text-[var(--color-muted-foreground)] max-w-md mx-auto leading-relaxed">
      Pantau pergerakan nomor antrean poliklinik secara langsung dari ponsel Anda tanpa harus berkerumun di ruang tunggu.
    </p>
  </div>

  <!-- Search Check My Queue Box -->
  <div class="bg-[var(--color-card)] border border-[var(--color-primary)]/20 rounded-3xl p-6 space-y-4 shadow-xl shadow-[var(--color-primary)]/20">
    <div class="space-y-1">
      <h2 class="text-sm font-bold text-[var(--color-text)] flex items-center gap-2">
        <Search class="w-4 h-4 text-[var(--color-primary)]" />
        <span>Cek Posisi Antrean Saya</span>
      </h2>
      <p class="text-xs text-[var(--color-muted-foreground)]">Masukkan Kode Pendaftaran (e.g. REG-2026-000001) atau NIK Anda untuk melihat posisi sisa antrean Anda.</p>
    </div>

    <div class="flex gap-2">
      <input
        type="text"
        value={searchQuery}
        oninput={(e) => { searchQuery = (e.currentTarget as HTMLInputElement).value; }}
        placeholder="e.g. REG-2026-000001 atau NIK Anda..."
        class="flex-1 px-3.5 py-2.5 bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] rounded-xl text-xs font-mono focus:outline-none focus:border-[var(--color-primary)]"
      />
      <button
        onclick={handleCheckPosition}
        class="px-5 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary)] text-[var(--color-primary-foreground)] font-bold rounded-xl text-xs transition flex items-center gap-1.5"
      >
        <span>Cek Antrean</span>
      </button>
    </div>

    {#if searchError}
      <p class="text-xs text-red-400 flex items-center gap-1.5 font-medium">
        <AlertCircle class="w-3.5 h-3.5" />
        <span>{searchError}</span>
      </p>
    {/if}

    {#if searchResult}
      <div class="p-4 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-4 items-center animate-fadeIn">
        <div class="space-y-1">
          <span class="text-[9px] text-[var(--color-muted-foreground)] font-bold uppercase tracking-wider block">Nomor Antrean Anda</span>
          <div class="text-3xl font-bold font-mono text-[var(--color-primary)]">{searchResult.registration.queueNumber}</div>
          <div class="text-[10px] text-[var(--color-muted-foreground)]">Unit: {searchResult.registration.serviceName}</div>
        </div>

        <div class="space-y-1">
          <span class="text-[9px] text-[var(--color-muted-foreground)] font-bold uppercase tracking-wider block">Status Saat Ini</span>
          <div class="flex items-center gap-1.5">
            <Badge variant={
              searchResult.registration.queueStatus === 'calling' ? 'amber' :
              searchResult.registration.queueStatus === 'serving' ? 'purple' :
              searchResult.registration.queueStatus === 'completed' ? 'emerald' :
              'blue'
            }>
              {searchResult.registration.queueStatus === 'waiting' ? 'Menunggu' :
               searchResult.registration.queueStatus === 'calling' ? 'Dipanggil' :
               searchResult.registration.queueStatus === 'serving' ? 'Sedang Dilayani' :
               searchResult.registration.queueStatus === 'completed' ? 'Selesai' :
               searchResult.registration.queueStatus === 'skipped' ? 'Dilewati' :
               'Batal'}
            </Badge>
            {#if searchResult.registration.counterNumber}
              <span class="text-xs text-[var(--color-muted-foreground)] font-semibold">(Loket {searchResult.registration.counterNumber})</span>
            {/if}
          </div>
        </div>

        <div class="space-y-1">
          <span class="text-[9px] text-[var(--color-muted-foreground)] font-bold uppercase tracking-wider block">Sisa Antrean Di Depan Anda</span>
          {#if searchResult.registration.queueStatus === 'waiting'}
            <div class="text-xl font-bold text-[var(--color-text)] flex items-baseline gap-1">
              <span>{searchResult.positionAhead}</span>
              <span class="text-xs font-normal text-[var(--color-muted-foreground)]">orang lagi</span>
            </div>
          {:else}
            <p class="text-xs text-[var(--color-primary)] font-medium">Anda sedang diproses / selesai dipanggil.</p>
          {/if}
        </div>
      </div>
    {/if}
  </div>

  <!-- Filter Controls -->
  <div class="bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
    <div class="space-y-1.5">
      <label class="text-xs text-[var(--color-muted-foreground)] font-medium flex items-center gap-1.5">
        <ListOrdered class="w-3.5 h-3.5 text-[var(--color-muted-foreground)]" />
        <span>Unit / Layanan Kesehatan</span>
      </label>
      <select
        value={selectedServiceId}
        onchange={(e) => { selectedServiceId = (e.currentTarget as HTMLSelectElement).value; }}
        class="w-full px-3 py-2.5 bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] rounded-xl text-xs focus:outline-none focus:border-[var(--color-primary)] font-semibold"
      >
        <option value="">-- Semua Layanan/Unit --</option>
        {#each services as s (s.id)}
          <option value={s.id}>{s.name}</option>
        {/each}
      </select>
    </div>

    <div class="space-y-1.5">
      <label class="text-xs text-[var(--color-muted-foreground)] font-medium flex items-center gap-1.5">
        <Calendar class="w-3.5 h-3.5 text-[var(--color-muted-foreground)]" />
        <span>Tanggal Pelayanan</span>
      </label>
      <input
        type="date"
        value={visitDate}
        onchange={(e) => { visitDate = (e.currentTarget as HTMLInputElement).value; }}
        class="w-full px-3 py-2.5 bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] rounded-xl text-xs focus:outline-none focus:border-[var(--color-primary)] font-semibold"
      />
    </div>
  </div>

  <!-- Display Panel -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-6">

    <!-- Active Called Card -->
    <div class="bg-gradient-to-br from-[var(--color-primary)]/10 to-transparent border border-[var(--color-primary)]/20 rounded-3xl p-6 text-center space-y-4">
      <span class="text-[10px] text-[var(--color-primary)] font-bold uppercase tracking-widest block">SEDANG DIPANGGIL</span>
      {#if activeOnDisplay}
        <div class="space-y-2">
          <div class="text-5xl font-extrabold font-mono text-[var(--color-text)] tracking-tighter">{activeOnDisplay.queueNumber}</div>
          <div class="text-xs text-[var(--color-muted-foreground)] font-semibold">{activeOnDisplay.serviceName}</div>
          <div class="text-xs font-bold text-[var(--color-primary)]">Loket / Poli {activeOnDisplay.counterNumber || 1}</div>
        </div>
      {:else}
        <p class="text-sm text-[var(--color-muted-foreground)] py-6 italic">Tidak ada panggilan aktif</p>
      {/if}
    </div>

    <!-- Stats Waiting -->
    <div class="bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl p-6 text-center space-y-4">
      <span class="text-[10px] text-blue-400 font-bold uppercase tracking-widest block">SISA ANTRIAN TUNGGU</span>
      <div class="space-y-1">
        <div class="text-5xl font-extrabold font-mono text-[var(--color-text)]">{stats.waitingCount}</div>
        <p class="text-xs text-[var(--color-muted-foreground)]">Pasien masih dalam daftar tunggu</p>
      </div>
    </div>

    <!-- Stats Total Today -->
    <div class="bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl p-6 text-center space-y-4">
      <span class="text-[10px] text-[var(--color-muted-foreground)] font-bold uppercase tracking-widest block">TOTAL ANTREAN HARI INI</span>
      <div class="space-y-1">
        <div class="text-5xl font-extrabold font-mono text-[var(--color-text)]">{stats.todayCount}</div>
        <p class="text-xs text-[var(--color-muted-foreground)]">Jumlah pendaftaran terkonfirmasi</p>
      </div>
    </div>

  </div>

  <!-- Queue Progress List Table -->
  <div class="bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl overflow-hidden">
    <div class="p-5 border-b border-[var(--color-border)]">
      <h3 class="text-sm font-bold text-[var(--color-text)] flex items-center gap-2">
        <Users class="w-4 h-4 text-[var(--color-muted-foreground)]" />
        <span>Daftar Perkembangan Antrean</span>
      </h3>
    </div>

    {#if registrations.length === 0}
      <div class="p-12 text-center text-zinc-600 italic text-xs">
        Belum ada antrean untuk filter terpilih hari ini.
      </div>
    {:else}
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="text-[var(--color-muted-foreground)] bg-[var(--color-bg)]/30 border-b border-[var(--color-border)]">
              <th class="p-4">Nomor Antrean</th>
              <th class="p-4">Pasien (Samaran)</th>
              <th class="p-4">Unit Layanan</th>
              <th class="p-4 text-right">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[var(--color-border)]/30">
            {#each registrations as r (r.id)}
              {@const badge = queueBadge(r.queueStatus)}
              <tr class="hover:bg-[var(--color-card)]/20 transition">
                <td class="p-4 font-mono font-bold text-[var(--color-text)] text-sm">{r.queueNumber}</td>
                <td class="p-4 text-[var(--color-text)] font-semibold">{obscureName(r.fullName)}</td>
                <td class="p-4 text-[var(--color-muted-foreground)]">{r.serviceName}</td>
                <td class="p-4 text-right">
                  <Badge variant={badge.variant}>
                    {badge.label} {r.queueStatus === 'calling' ? `(Loket ${r.counterNumber || 1})` : ''}
                  </Badge>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>

</div>
