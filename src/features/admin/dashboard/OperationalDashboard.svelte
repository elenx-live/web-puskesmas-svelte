<!-- @component Dashboard Operasional — monitoring kondisi pelayanan & alur antrean real-time dengan auto-polling, threshold alert, dan retry notifikasi WhatsApp. -->
<script lang="ts">
  import Card from '../../../shared/ui/Card.svelte';
  import Button from '../../../shared/ui/Button.svelte';
  import Modal from '../../../shared/ui/Modal.svelte';
  import { authStore } from '../../../shared/stores/auth.svelte.js';
  import { toastStore } from '../../../shared/stores/toast.svelte.js';
  import { navigate } from '../../../app/router.svelte.js';
  import { registrationService } from '../../../shared/services/registrationService.js';
  import { serviceEngineService } from '../../../shared/services/serviceEngineService.js';
  import { complaintService } from '../../../shared/services/complaintService.js';
  import type {
    ServiceRegistrationEntity,
    ServiceEntity,
    ServiceUnitEntity,
    ServiceLocationEntity,
    ComplaintEntity
  } from '../../../shared/types/index.js';
  import {
    Activity, RefreshCw, ShieldAlert, CheckCircle2, SlidersHorizontal, Download, Clock, UserCheck,
    ListOrdered, MessageSquare, Phone, Send, XCircle, ChevronRight, Building, Settings, Check, Sparkles
  } from 'lucide-svelte';

  interface OperationalSettings {
    waitingQueueLimit: number;
    failedWhatsappLimit: number;
    unresolvedComplaintLimit: number;
    pollingInterval: number; // in seconds
  }

  const DEFAULT_SETTINGS: OperationalSettings = {
    waitingQueueLimit: 5,
    failedWhatsappLimit: 3,
    unresolvedComplaintLimit: 2,
    pollingInterval: 15
  };

  const go = (path: string) => navigate(path);

  // Filter States
  let selectedDate = $state<string>(new Date().toISOString().split('T')[0]);
  let selectedServiceId = $state<string>('all');
  let selectedUnitId = $state<string>('all');
  let selectedLocationId = $state<string>('all');

  // Master Data States
  let services = $state<ServiceEntity[]>([]);
  let units = $state<ServiceUnitEntity[]>([]);
  let locations = $state<ServiceLocationEntity[]>([]);

  // Core Operational States
  let registrations = $state<ServiceRegistrationEntity[]>([]);
  let complaints = $state<ComplaintEntity[]>([]);
  let whatsAppLogs = $state<any[]>([]);

  // Interactive UI States
  let loading = $state<boolean>(true);
  let refreshing = $state<boolean>(false);
  let countdown = $state<number>(DEFAULT_SETTINGS.pollingInterval);
  let activeTab = $state<'pasien' | 'pengaduan' | 'whatsapp'>('pasien');
  let showSettingsModal = $state<boolean>(false);
  let retryingLogId = $state<string | null>(null);

  // Focus Unit (My Work) Helper
  let myFocusUnitId = $state<string>('all');

  // Operational Threshold Settings (persisted in localStorage)
  function loadOpSettings(): OperationalSettings {
    try {
      const stored = localStorage.getItem('puskesmas_operational_settings');
      return stored ? JSON.parse(stored) : { ...DEFAULT_SETTINGS };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }
  let opSettings = $state<OperationalSettings>(loadOpSettings());

  // Fetch live operational states
  async function fetchOperationalData(isManual = false) {
    if (isManual) refreshing = true;
    try {
      // 1. Fetch Registrations
      const fetchedRegs = await registrationService.getRegistrations();
      registrations = fetchedRegs || [];

      // 2. Fetch active complaints
      const fetchedComplaints = await complaintService.getComplaints();
      complaints = fetchedComplaints || [];

      // 3. Fetch WhatsApp outbound logs
      const waRes = await fetch('/api/whatsapp/logs');
      if (waRes.ok) {
        const waData = await waRes.json();
        whatsAppLogs = waData || [];
      }
    } catch (err) {
      console.error('Failed to load operational data:', err);
    } finally {
      loading = false;
      refreshing = false;
      countdown = opSettings.pollingInterval;
    }
  }

  // Initialize master data
  $effect(() => {
    (async () => {
      try {
        const [fetchedServices, fetchedUnits, fetchedLocations] = await Promise.all([
          serviceEngineService.getServices(),
          serviceEngineService.getUnits(),
          serviceEngineService.getLocations()
        ]);
        services = fetchedServices || [];
        units = fetchedUnits || [];
        locations = fetchedLocations || [];
      } catch (err) {
        console.error('Failed to load master data:', err);
      }
    })();
  });

  // Setup live auto polling countdown (re-runs when interval or date changes)
  $effect(() => {
    const interval = opSettings.pollingInterval;
    const date = selectedDate; // track for re-fetch on date change
    void date;

    countdown = interval;
    fetchOperationalData();

    const timer = setInterval(() => {
      if (countdown <= 1) {
        fetchOperationalData();
      } else {
        countdown = countdown - 1;
      }
    }, 1000);

    return () => clearInterval(timer);
  });

  // Handle saving operational alerts settings
  function handleSaveSettings(e: SubmitEvent) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const updated: OperationalSettings = {
      waitingQueueLimit: Number(formData.get('waitingQueueLimit') || DEFAULT_SETTINGS.waitingQueueLimit),
      failedWhatsappLimit: Number(formData.get('failedWhatsappLimit') || DEFAULT_SETTINGS.failedWhatsappLimit),
      unresolvedComplaintLimit: Number(formData.get('unresolvedComplaintLimit') || DEFAULT_SETTINGS.unresolvedComplaintLimit),
      pollingInterval: Number(formData.get('pollingInterval') || DEFAULT_SETTINGS.pollingInterval)
    };

    try {
      localStorage.setItem('puskesmas_operational_settings', JSON.stringify(updated));
      opSettings = updated;
      countdown = updated.pollingInterval;
      showSettingsModal = false;
      toastStore.showToast('Pengaturan alert operasional berhasil disimpan.', 'success');
    } catch {
      toastStore.showToast('Gagal menyimpan pengaturan.', 'error');
    }
  }

  // Retry Failed WhatsApp Outbound Message
  async function handleRetryWhatsAppMessage(logId: string) {
    retryingLogId = logId;
    try {
      const res = await fetch('/api/whatsapp/logs/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: logId })
      });

      if (res.ok) {
        toastStore.showToast('Pesan WhatsApp berhasil dimasukkan ke antrean kirim ulang.', 'success');
        fetchOperationalData();
      } else {
        const data = await res.json();
        toastStore.showToast(data.message || 'Gagal mengirim ulang pesan.', 'error');
      }
    } catch {
      toastStore.showToast('Terjadi kesalahan koneksi server.', 'error');
    } finally {
      retryingLogId = null;
    }
  }

  // Helper mapping: maps registration serviceId to service entity to obtain its Unit or Location
  const getRegServiceEntity = (serviceId: string): ServiceEntity | undefined => {
    return services.find((s) => s.id === serviceId);
  };

  // Primary filtering logic
  const filteredRegistrations = $derived(
    registrations.filter((reg) => {
      // 1. Visit Date Filter (Default: today)
      if (reg.visitDate !== selectedDate) return false;

      // 2. Service Filter
      if (selectedServiceId !== 'all' && reg.serviceId !== selectedServiceId) return false;

      // 3. Resolve parent service entity to check Unit and Location
      const serviceEntity = getRegServiceEntity(reg.serviceId);

      // 4. Unit Filter
      if (selectedUnitId !== 'all') {
        if (!serviceEntity || serviceEntity.unitId !== selectedUnitId) return false;
      }

      // 5. Location Filter
      if (selectedLocationId !== 'all') {
        if (!serviceEntity || serviceEntity.locationId !== selectedLocationId) return false;
      }

      // 6. Focus Unit (My Work filter)
      if (myFocusUnitId !== 'all') {
        if (!serviceEntity || serviceEntity.unitId !== myFocusUnitId) return false;
      }

      return true;
    })
  );

  // Calculate Metrics from current filtered registrations
  const totalRegistrationsToday = $derived(filteredRegistrations.length);
  const waitingVerificationsCount = $derived(filteredRegistrations.filter((r) => r.status === 'waiting').length);
  const confirmedRegistrationsCount = $derived(filteredRegistrations.filter((r) => r.status === 'confirmed').length);
  const cancelledRejectedCount = $derived(
    filteredRegistrations.filter((r) => r.status === 'cancelled' || r.status === 'rejected').length
  );

  // Queues derived metrics
  const activeQueues = $derived(filteredRegistrations.filter((r) => r.queueNumber));
  const waitingQueuesCount = $derived(activeQueues.filter((r) => r.queueStatus === 'waiting').length);
  const callingServingCount = $derived(
    activeQueues.filter((r) => r.queueStatus === 'calling' || r.queueStatus === 'serving').length
  );
  const completedQueuesCount = $derived(activeQueues.filter((r) => r.queueStatus === 'completed').length);

  // Active callers (Current serving queue numbers)
  const currentlyServingList = $derived(
    activeQueues.filter((r) => r.queueStatus === 'serving' || r.queueStatus === 'calling')
  );

  // WhatsApp outbound job metrics matching currently filtered services/registrations
  const filteredWhatsAppLogs = $derived(
    whatsAppLogs.filter((log) => {
      // Match today's logs
      const logDate = log.createdAt ? log.createdAt.split('T')[0] : '';
      if (logDate !== selectedDate) return false;

      // Filter by registration context
      if (selectedServiceId !== 'all' || selectedUnitId !== 'all' || selectedLocationId !== 'all') {
        // Find original registration to check filters
        const relatedReg = registrations.find((r) => r.id === log.relatedEntityId);
        if (!relatedReg) return false;

        const serviceEntity = getRegServiceEntity(relatedReg.serviceId);
        if (selectedServiceId !== 'all' && relatedReg.serviceId !== selectedServiceId) return false;
        if (selectedUnitId !== 'all' && (!serviceEntity || serviceEntity.unitId !== selectedUnitId)) return false;
        if (selectedLocationId !== 'all' && (!serviceEntity || serviceEntity.locationId !== selectedLocationId)) return false;
      }

      return true;
    })
  );

  const totalWhatsAppCount = $derived(filteredWhatsAppLogs.length);
  const failedWhatsAppCount = $derived(filteredWhatsAppLogs.filter((l) => l.status === 'failed').length);
  const sentWhatsAppCount = $derived(
    filteredWhatsAppLogs.filter((l) => ['sent', 'delivered', 'read'].includes(l.status)).length
  );

  // Complaints metrics matching filters (if serviceId selected)
  const filteredComplaints = $derived(
    complaints.filter((cmp) => {
      if (cmp.status === 'completed' || cmp.status === 'rejected') return false; // active/unresolved only
      if (selectedServiceId !== 'all' && cmp.serviceId && cmp.serviceId !== selectedServiceId) return false;
      return true;
    })
  );

  const unresolvedComplaintsCount = $derived(filteredComplaints.length);

  // Check alert conditions based on active thresholds
  const alerts = $derived.by((): string[] => {
    const list: string[] = [];
    if (waitingQueuesCount >= opSettings.waitingQueueLimit) {
      list.push(`Antrean Menunggu (${waitingQueuesCount} orang) telah menyentuh/melebihi ambang batas aman standar pelayanan (${opSettings.waitingQueueLimit} orang).`);
    }
    if (failedWhatsAppCount >= opSettings.failedWhatsappLimit) {
      list.push(`Terdapat ${failedWhatsAppCount} pesan notifikasi WhatsApp gagal terkirim (batas toleransi: ${opSettings.failedWhatsappLimit} gagal). Mohon lakukan pengecekan koneksi/kredensial dan retry pesan.`);
    }
    if (unresolvedComplaintsCount >= opSettings.unresolvedComplaintLimit) {
      list.push(`Terdapat ${unresolvedComplaintsCount} pengaduan/keluhan pasien aktif yang belum selesai ditangani petugas (threshold: ${opSettings.unresolvedComplaintLimit} pengaduan).`);
    }
    return list;
  });

  // Handle Export to CSV
  function handleExportCSV() {
    if (!authStore.hasPermission('export_service_reports')) {
      toastStore.showToast('Anda tidak memiliki izin untuk mengekspor laporan pelayanan.', 'error');
      return;
    }

    if (filteredRegistrations.length === 0) {
      toastStore.showToast('Tidak ada data registrasi pada filter terpilih untuk diekspor.', 'error');
      return;
    }

    try {
      // Secure layout fields: Registration Number, Name, Service, Queue Number, Status, Visit Date, Phone, Whatsapp Status, Created At
      // Note: No diagnostics, medical records, or sensitive patient notes are exported.
      const csvHeaders = [
        'Nomor Registrasi',
        'Nama Lengkap Pasien',
        'Layanan Kesehatan',
        'Unit Pelayanan',
        'Lokasi Ruang',
        'Tanggal Kunjungan',
        'Status Verifikasi',
        'Nomor Antrean',
        'Status Antrean',
        'No Telepon',
        'Waktu Registrasi'
      ];

      const csvRows = filteredRegistrations.map((r) => {
        const s = getRegServiceEntity(r.serviceId);
        return [
          `"${r.registrationNumber}"`,
          `"${r.fullName.replace(/"/g, '""')}"`,
          `"${r.serviceName.replace(/"/g, '""')}"`,
          `"${(s?.unitName || '-').replace(/"/g, '""')}"`,
          `"${(s?.locationName || '-').replace(/"/g, '""')}"`,
          `"${r.visitDate}"`,
          `"${r.status.toUpperCase()}"`,
          `"${r.queueNumber || '-'}"`,
          `"${(r.queueStatus || '-').toUpperCase()}"`,
          `"${r.phoneNumber}"`,
          `"${r.createdAt}"`
        ];
      });

      const csvContent = '﻿' + [csvHeaders.join(','), ...csvRows.map((row) => row.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Laporan_Pelayanan_Puskesmas_${selectedDate}_${selectedServiceId}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toastStore.showToast('Laporan pelayanan berhasil diekspor.', 'success');
    } catch {
      toastStore.showToast('Gagal mengekspor laporan.', 'error');
    }
  }

  // Tab definitions — labels are reactive on live counts
  const tabDefs = $derived([
    { id: 'pasien' as const, label: `Pasien & Antrean Realtime (${totalRegistrationsToday})`, icon: UserCheck },
    { id: 'pengaduan' as const, label: `Pengaduan & Feedback Pasien (${unresolvedComplaintsCount})`, icon: MessageSquare },
    { id: 'whatsapp' as const, label: `Log & Keberhasilan Notifikasi WhatsApp (${totalWhatsAppCount})`, icon: Phone }
  ]);
</script>

<div class="space-y-6 max-w-7xl mx-auto" id="operational-dashboard-root">
  {#if alerts.length > 0}
    <div class="bg-red-50 border border-red-200 rounded-2xl p-4 flex gap-4 animate-pulse" id="alert-banner-exceeded">
      <ShieldAlert class="w-6 h-6 text-red-600 shrink-0" />
      <div class="space-y-1">
        <h4 class="text-sm font-bold text-red-800">PERHATIAN: Indikator Operasional Melebihi Threshold Standar Pelayanan</h4>
        <ul class="list-disc pl-5 text-xs text-red-700 space-y-1">
          {#each alerts as alert}
            <li>{alert}</li>
          {/each}
        </ul>
      </div>
    </div>
  {:else}
    <div class="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex gap-4 items-center" id="alert-banner-normal">
      <div class="bg-[var(--color-primary)] text-[var(--color-primary-foreground)] rounded-full p-1 shrink-0">
        <Check class="w-5 h-5" />
      </div>
      <div>
        <h4 class="text-sm font-bold text-emerald-800">Layanan Berjalan Aman & Kondusif</h4>
        <p class="text-xs text-emerald-600">Seluruh indikator operasional, antrean loket, pengaduan aktif, dan notifikasi WhatsApp berada di bawah batas kritis threshold.</p>
      </div>
    </div>
  {/if}

  <!-- Header Action Row with Auto-polling Info -->
  <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[var(--color-card)] p-4 theme-radius border border-[var(--color-border)] shadow-sm" id="header-status-bar">
    <div class="flex items-center gap-3">
      <span class="relative flex h-3 w-3">
        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-primary)] opacity-75"></span>
        <span class="relative inline-flex rounded-full h-3 w-3 bg-[var(--color-primary)]"></span>
      </span>
      <div>
        <p class="text-xs text-[var(--color-muted-foreground)] font-medium">Status Monitoring</p>
        <p class="text-xs font-bold text-[var(--color-text)]">
          Auto-update dalam <span class="text-amber-600 font-mono text-sm">{countdown}s</span>
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onclick={() => fetchOperationalData(true)}
        disabled={refreshing}
        class="ml-2 gap-1.5 h-8 rounded-xl text-xs"
        id="btn-refresh-manual"
      >
        <RefreshCw class={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
        Sinkronisasi
      </Button>
    </div>

    <div class="flex flex-wrap gap-2 w-full sm:w-auto">
      <div class="flex items-center bg-[var(--color-card)] rounded-xl px-2.5 py-1 border border-[var(--color-border)]">
        <Building class="w-3.5 h-3.5 text-[var(--color-muted-foreground)] mr-1.5" />
        <select
          bind:value={myFocusUnitId}
          class="bg-transparent border-none text-xs font-semibold text-[var(--color-text)] outline-none focus:ring-0 py-0.5 cursor-pointer"
          id="select-my-work-focus"
        >
          <option value="all">Fokus Kerja: Semua Unit</option>
          {#each units as u (u.id)}
            <option value={u.id}>Unit: {u.name}</option>
          {/each}
        </select>
      </div>

      {#if authStore.hasPermission('manage_operational_settings')}
        <Button
          variant="outline"
          size="sm"
          onclick={() => (showSettingsModal = true)}
          class="gap-1.5 h-8 rounded-xl text-xs border-[var(--color-border)] text-[var(--color-text)]"
          id="btn-settings-alert"
        >
          <Settings class="w-3.5 h-3.5 text-[var(--color-muted-foreground)]" />
          Atur Alert
        </Button>
      {/if}

      {#if authStore.hasPermission('export_service_reports')}
        <Button
          variant="primary"
          size="sm"
          onclick={handleExportCSV}
          class="gap-1.5 h-8 rounded-xl text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
          id="btn-export-csv"
        >
          <Download class="w-3.5 h-3.5" />
          Ekspor Laporan
        </Button>
      {/if}
    </div>
  </div>

  <!-- Dashboard Filters Bar -->
  <div class="bg-[var(--color-card)] p-4 theme-radius border border-[var(--color-border)] shadow-sm space-y-4" id="dashboard-filters-card">
    <div class="flex items-center gap-2 pb-2 border-b border-[var(--color-border)]">
      <SlidersHorizontal class="w-4 h-4 text-[var(--color-muted-foreground)]" />
      <h3 class="text-xs font-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">Filter Analitis Layanan</h3>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
      <div class="space-y-1">
        <label class="text-[10px] font-bold text-[var(--color-muted-foreground)] uppercase">Tanggal Kunjungan</label>
        <input
          type="date"
          bind:value={selectedDate}
          class="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]"
          id="filter-date"
        />
      </div>

      <div class="space-y-1">
        <label class="text-[10px] font-bold text-[var(--color-muted-foreground)] uppercase">Layanan Kesehatan</label>
        <select
          bind:value={selectedServiceId}
          class="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]"
          id="filter-service"
        >
          <option value="all">Semua Layanan</option>
          {#each services.filter((s) => s.status === 'published') as s (s.id)}
            <option value={s.id}>{s.name}</option>
          {/each}
        </select>
      </div>

      <div class="space-y-1">
        <label class="text-[10px] font-bold text-[var(--color-muted-foreground)] uppercase">Unit Pelayanan</label>
        <select
          bind:value={selectedUnitId}
          class="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]"
          id="filter-unit"
        >
          <option value="all">Semua Unit</option>
          {#each units.filter((u) => u.status === 'active') as u (u.id)}
            <option value={u.id}>{u.name}</option>
          {/each}
        </select>
      </div>

      <div class="space-y-1">
        <label class="text-[10px] font-bold text-[var(--color-muted-foreground)] uppercase">Lokasi / Ruang</label>
        <select
          bind:value={selectedLocationId}
          class="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]"
          id="filter-location"
        >
          <option value="all">Semua Lokasi</option>
          {#each locations.filter((l) => l.status === 'active') as l (l.id)}
            <option value={l.id}>{l.name}</option>
          {/each}
        </select>
      </div>
    </div>
  </div>

  <!-- METRICS BENTO GRID -->
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="metrics-grid">
    <Card class="p-4 flex flex-col justify-between h-36 shadow-sm" id="metric-card-registrations">
      <div class="flex justify-between items-start">
        <div>
          <p class="text-[10px] font-bold text-[var(--color-muted-foreground)] uppercase tracking-wide">Pendaftaran Hari Ini</p>
          <h2 class="text-3xl font-black text-[var(--color-text)] mt-1">{totalRegistrationsToday}</h2>
        </div>
        <div class="p-2.5 bg-[var(--color-primary)]/10 text-amber-600 rounded-xl">
          <UserCheck class="w-5 h-5" />
        </div>
      </div>
      <div class="flex gap-2 text-[10px] font-bold border-t border-[var(--color-border)] pt-2.5">
        <span class="text-[var(--color-primary)] bg-amber-50 px-1.5 py-0.5 rounded-lg">Wait: {waitingVerificationsCount}</span>
        <span class="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-lg">Ok: {confirmedRegistrationsCount}</span>
        <span class="text-[var(--color-muted-foreground)] bg-[var(--color-card)] px-1.5 py-0.5 rounded-lg">Batal: {cancelledRejectedCount}</span>
      </div>
    </Card>

    <Card class="p-4 flex flex-col justify-between h-36 shadow-sm" id="metric-card-queues">
      <div class="flex justify-between items-start">
        <div>
          <p class="text-[10px] font-bold text-[var(--color-muted-foreground)] uppercase tracking-wide">Antrean Tunggu</p>
          <h2 class="text-3xl font-black text-[var(--color-text)] mt-1">{waitingQueuesCount}</h2>
        </div>
        <div class="p-2.5 bg-sky-500/10 text-sky-600 rounded-xl">
          <ListOrdered class="w-5 h-5" />
        </div>
      </div>
      <div class="flex gap-2 text-[10px] font-bold border-t border-[var(--color-border)] pt-2.5">
        <span class="text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded-lg">Menunggu: {waitingQueuesCount}</span>
        <span class="text-[var(--color-primary)] bg-amber-50 px-1.5 py-0.5 rounded-lg">Dilayani: {callingServingCount}</span>
        <span class="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-lg">Selesai: {completedQueuesCount}</span>
      </div>
    </Card>

    <Card class="p-4 flex flex-col justify-between h-36 shadow-sm" id="metric-card-serving">
      <div class="flex justify-between items-start">
        <div class="flex-1 min-w-0">
          <p class="text-[10px] font-bold text-[var(--color-muted-foreground)] uppercase tracking-wide">Sedang Dilayani</p>
          {#if currentlyServingList.length > 0}
            <div class="mt-1 flex items-baseline gap-1.5 min-w-0">
              <span class="text-2xl font-black text-[var(--color-text)] truncate font-mono">
                {currentlyServingList[currentlyServingList.length - 1].queueNumber}
              </span>
              <span class="text-[10px] text-[var(--color-muted-foreground)] truncate block max-w-[120px]">
                {currentlyServingList[currentlyServingList.length - 1].fullName}
              </span>
            </div>
          {:else}
            <h2 class="text-lg font-bold text-[var(--color-muted-foreground)] mt-2">Tidak ada panggilan</h2>
          {/if}
        </div>
        <div class="p-2.5 bg-[var(--color-primary)]/10 text-emerald-600 rounded-xl">
          <Activity class="w-5 h-5" />
        </div>
      </div>
      <div class="border-t border-[var(--color-border)] pt-2.5">
        {#if currentlyServingList.length > 0}
          <p class="text-[10px] font-bold text-amber-600 truncate bg-amber-50/50 px-2 py-0.5 rounded-lg">
            Layanan: {currentlyServingList[currentlyServingList.length - 1].serviceName}
          </p>
        {:else}
          <p class="text-[10px] text-[var(--color-muted-foreground)] truncate">Semua loket / pelayanan stand-by.</p>
        {/if}
      </div>
    </Card>

    <Card class="p-4 flex flex-col justify-between h-36 shadow-sm" id="metric-card-whatsapp">
      <div class="flex justify-between items-start">
        <div>
          <p class="text-[10px] font-bold text-[var(--color-muted-foreground)] uppercase tracking-wide">Notifikasi WhatsApp (Hari Ini)</p>
          <h2 class="text-3xl font-black text-[var(--color-text)] mt-1">{totalWhatsAppCount}</h2>
        </div>
        <div class="p-2.5 bg-[var(--color-primary)]/10 text-emerald-600 rounded-xl">
          <Phone class="w-5 h-5" />
        </div>
      </div>
      <div class="flex gap-2 text-[10px] font-bold border-t border-[var(--color-border)] pt-2.5">
        <span class="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-lg">Terkirim: {sentWhatsAppCount}</span>
        <span class={`px-1.5 py-0.5 rounded-lg ${failedWhatsAppCount > 0 ? 'text-red-600 bg-red-50 font-extrabold animate-pulse' : 'text-[var(--color-muted-foreground)] bg-[var(--color-card)]'}`}>
          Gagal: {failedWhatsAppCount}
        </span>
      </div>
    </Card>
  </div>

  <!-- QUICK SERVICE ACTIONS -->
  <Card class="p-4 shadow-sm" id="quick-actions-bar">
    <div class="flex items-center gap-2 pb-3 border-b border-[var(--color-border)] mb-3">
      <Sparkles class="w-4 h-4 text-[var(--color-primary)]" />
      <h3 class="text-xs font-bold uppercase tracking-wider text-[var(--color-muted-foreground)] font-mono">Tindakan Cepat Petugas</h3>
    </div>
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <button
        onclick={() => go('/admin/pendaftaran')}
        disabled={!authStore.hasPermission('manage_services_clusters')}
        class="flex flex-col items-center justify-center p-3 rounded-xl bg-[var(--color-card)] border border-zinc-100 text-zinc-700 hover:bg-[var(--color-primary)]/5 hover:border-[var(--color-primary)]/30 transition disabled:opacity-50 disabled:hover:bg-[var(--color-card)]"
        id="action-verifikasi-pendaftaran"
      >
        <UserCheck class="w-5 h-5 text-[var(--color-primary)] mb-1.5" />
        <span class="text-[10px] font-extrabold text-center">Registrasi & Verifikasi</span>
      </button>

      <button
        onclick={() => go('/admin/antrian')}
        disabled={!authStore.hasPermission('manage_services_clusters')}
        class="flex flex-col items-center justify-center p-3 rounded-xl bg-[var(--color-card)] border border-zinc-100 text-zinc-700 hover:bg-sky-500/5 hover:border-sky-500/30 transition disabled:opacity-50 disabled:hover:bg-[var(--color-card)]"
        id="action-panggil-antrean"
      >
        <ListOrdered class="w-5 h-5 text-sky-500 mb-1.5" />
        <span class="text-[10px] font-extrabold text-center">Panggil & Atur Antrean</span>
      </button>

      <button
        onclick={() => go('/admin/pengaduan')}
        disabled={!authStore.hasPermission('view_complaints')}
        class="flex flex-col items-center justify-center p-3 rounded-xl bg-[var(--color-card)] border border-zinc-100 text-zinc-700 hover:bg-red-500/5 hover:border-red-500/30 transition disabled:opacity-50 disabled:hover:bg-[var(--color-card)]"
        id="action-lihat-pengaduan"
      >
        <MessageSquare class="w-5 h-5 text-red-500 mb-1.5" />
        <span class="text-[10px] font-extrabold text-center">Tindak Pengaduan ({unresolvedComplaintsCount})</span>
      </button>

      <button
        onclick={() => go('/admin/services?tab=schedules')}
        disabled={!authStore.hasPermission('manage_services_clusters')}
        class="flex flex-col items-center justify-center p-3 rounded-xl bg-[var(--color-card)] border border-zinc-100 text-zinc-700 hover:bg-indigo-500/5 hover:border-indigo-500/30 transition disabled:opacity-50 disabled:hover:bg-[var(--color-card)]"
        id="action-atur-jadwal"
      >
        <Clock class="w-5 h-5 text-indigo-500 mb-1.5" />
        <span class="text-[10px] font-extrabold text-center">Atur Jadwal Layanan</span>
      </button>

      <button
        onclick={() => go('/admin/settings/whatsapp')}
        disabled={!authStore.hasPermission('manage_site_settings')}
        class="flex flex-col items-center justify-center p-3 rounded-xl bg-[var(--color-card)] border border-zinc-100 text-zinc-700 hover:bg-[var(--color-primary)]/5 hover:border-[var(--color-primary)]/30 transition disabled:opacity-50 disabled:hover:bg-[var(--color-card)]"
        id="action-settings-whatsapp"
      >
        <Phone class="w-5 h-5 text-[var(--color-primary)] mb-1.5" />
        <span class="text-[10px] font-extrabold text-center">WhatsApp Config</span>
      </button>

      <button
        onclick={handleExportCSV}
        disabled={!authStore.hasPermission('export_service_reports')}
        class="flex flex-col items-center justify-center p-3 rounded-xl bg-[var(--color-card)] border border-zinc-100 text-zinc-700 hover:bg-teal-500/5 hover:border-teal-500/30 transition disabled:opacity-50 disabled:hover:bg-[var(--color-card)]"
        id="action-export-report"
      >
        <Download class="w-5 h-5 text-teal-500 mb-1.5" />
        <span class="text-[10px] font-extrabold text-center">Download Laporan CSV</span>
      </button>
    </div>
  </Card>

  <!-- TABS SELECTOR -->
  <div class="flex border-b border-[var(--color-border)]" id="tabs-navigation">
    {#each tabDefs as tab (tab.id)}
      {@const Icon = tab.icon}
      <button
        onclick={() => (activeTab = tab.id)}
        class={`flex items-center gap-2 px-6 py-3 text-xs font-bold border-b-2 transition -mb-px whitespace-nowrap ${
          activeTab === tab.id
            ? 'border-[var(--color-primary)] text-amber-600 font-extrabold'
            : 'border-transparent text-[var(--color-muted-foreground)] hover:text-zinc-600 hover:border-[var(--color-border)]'
        }`}
        id={`tab-btn-${tab.id}`}
      >
        <Icon class="w-4 h-4" />
        {tab.label}
      </button>
    {/each}
  </div>

  {#if activeTab === 'pasien'}
    <Card class="p-0 overflow-hidden shadow-sm" id="tab-content-patients">
      <div class="overflow-x-auto">
        <table class="w-full text-xs text-left" id="table-patients">
          <thead class="bg-[var(--color-card)] text-[var(--color-muted-foreground)] font-bold uppercase text-[10px] border-b border-[var(--color-border)]">
            <tr>
              <th class="p-4">No. Registrasi</th>
              <th class="p-4">Pasien</th>
              <th class="p-4">Layanan / Unit</th>
              <th class="p-4">Nomor Antrean</th>
              <th class="p-4 text-center">Status Verif</th>
              <th class="p-4 text-center">Status Antrean</th>
              <th class="p-4 text-right">Tindakan</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[var(--color-border)]">
            {#if filteredRegistrations.length === 0}
              <tr>
                <td colspan={7} class="p-8 text-center text-[var(--color-muted-foreground)]">
                  Tidak ada data registrasi pasien yang cocok untuk kriteria filter dan tanggal kunjungan saat ini.
                </td>
              </tr>
            {:else}
              {#each filteredRegistrations as reg (reg.id)}
                {@const serviceInfo = getRegServiceEntity(reg.serviceId)}
                <tr class="hover:bg-[var(--color-card)]/50 transition">
                  <td class="p-4 font-mono font-bold text-[var(--color-text)]">{reg.registrationNumber}</td>
                  <td class="p-4">
                    <div class="font-semibold text-[var(--color-text)]">{reg.fullName}</div>
                    <div class="text-[10px] text-[var(--color-muted-foreground)]">{reg.phoneNumber} | {reg.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</div>
                  </td>
                  <td class="p-4">
                    <div class="font-semibold text-[var(--color-text)]">{reg.serviceName}</div>
                    <div class="text-[10px] text-[var(--color-muted-foreground)]">{serviceInfo?.unitName || '-'} | {serviceInfo?.locationName || '-'}</div>
                  </td>
                  <td class="p-4">
                    {#if reg.queueNumber}
                      <span class="font-mono font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        {reg.queueNumber}
                      </span>
                    {:else}
                      <span class="text-[var(--color-muted-foreground)] italic">Antrean Mati / Belum Ada</span>
                    {/if}
                  </td>
                  <td class="p-4 text-center">
                    <span class={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                      reg.status === 'confirmed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                      reg.status === 'rejected' ? 'bg-red-50 text-red-600 border border-red-100' :
                      reg.status === 'cancelled' ? 'bg-[var(--color-card)] text-[var(--color-muted-foreground)]' :
                      'bg-amber-50 text-amber-600 border border-amber-100 animate-pulse'
                    }`}>
                      {reg.status === 'confirmed' ? 'DIKONFIRMASI' :
                       reg.status === 'rejected' ? 'DITOLAK' :
                       reg.status === 'cancelled' ? 'BATAL' : 'MENUNGGU VERIF'}
                    </span>
                  </td>
                  <td class="p-4 text-center">
                    <span class={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                      reg.queueStatus === 'serving' ? 'bg-[var(--color-primary)] text-[var(--color-text)] animate-pulse' :
                      reg.queueStatus === 'calling' ? 'bg-[var(--color-primary)] text-[var(--color-text)] animate-pulse' :
                      reg.queueStatus === 'completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                      reg.queueStatus === 'skipped' ? 'bg-red-50 text-red-500 border border-red-100' :
                      reg.queueStatus === 'waiting' ? 'bg-sky-50 text-sky-600 border border-sky-100' :
                      'bg-[var(--color-card)] text-[var(--color-muted-foreground)]'
                    }`}>
                      {reg.queueStatus || 'BELUM ANTRI'}
                    </span>
                  </td>
                  <td class="p-4 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onclick={() => go(reg.queueNumber ? '/admin/antrian' : '/admin/pendaftaran')}
                      class="text-[10px] px-2.5 py-1 rounded-lg font-bold border-[var(--color-border)] text-[var(--color-text)]"
                      id={`btn-act-${reg.id}`}
                    >
                      Detail & Panggil
                      <ChevronRight class="w-3 h-3 ml-1" />
                    </Button>
                  </td>
                </tr>
              {/each}
            {/if}
          </tbody>
        </table>
      </div>
    </Card>
  {/if}

  {#if activeTab === 'pengaduan'}
    <Card class="p-0 overflow-hidden shadow-sm" id="tab-content-complaints">
      <div class="overflow-x-auto">
        <table class="w-full text-xs text-left" id="table-complaints">
          <thead class="bg-[var(--color-card)] text-[var(--color-muted-foreground)] font-bold uppercase text-[10px] border-b border-[var(--color-border)]">
            <tr>
              <th class="p-4">No. Tiket</th>
              <th class="p-4">Pengirim</th>
              <th class="p-4">Jenis</th>
              <th class="p-4">Kaitan Layanan</th>
              <th class="p-4">Isi Keluhan</th>
              <th class="p-4 text-center">Prioritas</th>
              <th class="p-4 text-center">Status</th>
              <th class="p-4 text-right">Tindakan</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[var(--color-border)]">
            {#if filteredComplaints.length === 0}
              <tr>
                <td colspan={8} class="p-8 text-center text-[var(--color-muted-foreground)]">
                  Tidak ada pengaduan aktif atau keluhan belum selesai yang terdaftar saat ini.
                </td>
              </tr>
            {:else}
              {#each filteredComplaints as cmp (cmp.id)}
                <tr class="hover:bg-[var(--color-card)]/50 transition">
                  <td class="p-4 font-mono font-bold text-red-600">{cmp.ticketNumber}</td>
                  <td class="p-4">
                    <div class="font-semibold text-[var(--color-text)]">{cmp.isAnonymous ? 'Anonim (Pasien)' : cmp.senderName}</div>
                    <div class="text-[10px] text-[var(--color-muted-foreground)]">{cmp.isAnonymous ? '-' : cmp.senderPhone}</div>
                  </td>
                  <td class="p-4">
                    <span class={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                      cmp.type === 'pengaduan' ? 'bg-red-50 text-red-600 border border-red-100' :
                      cmp.type === 'kritik' ? 'bg-amber-50 text-amber-600' :
                      cmp.type === 'saran' ? 'bg-sky-50 text-sky-600' : 'bg-emerald-50 text-emerald-600'
                    }`}>
                      {cmp.type}
                    </span>
                  </td>
                  <td class="p-4 text-[var(--color-text)] font-medium">{cmp.serviceName || 'Layanan Umum'}</td>
                  <td class="p-4 max-w-xs truncate text-[var(--color-muted-foreground)]" title={cmp.content}>{cmp.content}</td>
                  <td class="p-4 text-center">
                    <span class={`px-2 py-0.5 rounded-md text-[9px] font-extrabold ${
                      cmp.priority === 'urgent' ? 'bg-red-600 text-white animate-bounce' :
                      cmp.priority === 'high' ? 'bg-red-100 text-red-600' :
                      cmp.priority === 'normal' ? 'bg-amber-50 text-amber-600' : 'bg-[var(--color-card)] text-[var(--color-muted-foreground)]'
                    }`}>
                      {cmp.priority.toUpperCase()}
                    </span>
                  </td>
                  <td class="p-4 text-center">
                    <span class={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                      cmp.status === 'new' ? 'bg-red-50 text-red-600 border border-red-200 animate-pulse' : 'bg-amber-50 text-amber-600 border border-amber-200'
                    }`}>
                      {cmp.status === 'new' ? 'BARU' : 'DIPROSES'}
                    </span>
                  </td>
                  <td class="p-4 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onclick={() => go('/admin/pengaduan')}
                      class="text-[10px] px-2.5 py-1 rounded-lg font-bold border-[var(--color-border)] text-[var(--color-text)]"
                      id={`btn-act-cmp-${cmp.id}`}
                    >
                      Respon Pengaduan
                      <ChevronRight class="w-3 h-3 ml-1" />
                    </Button>
                  </td>
                </tr>
              {/each}
            {/if}
          </tbody>
        </table>
      </div>
    </Card>
  {/if}

  {#if activeTab === 'whatsapp'}
    <Card class="p-0 overflow-hidden shadow-sm" id="tab-content-whatsapp">
      <div class="p-4 bg-[var(--color-card)] border-b border-[var(--color-border)] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h4 class="text-xs font-bold text-[var(--color-text)]">Integrasi WhatsApp Cloud API (Outbound Notification Logs)</h4>
          <p class="text-[10px] text-[var(--color-muted-foreground)]">Memantau status pesan notifikasi pasien yang dipicu event pendaftaran, konfirmasi, dan antrean.</p>
        </div>
        <div class="flex gap-2">
          <span class="text-xs bg-[var(--color-card)] px-2.5 py-1 rounded-xl border border-[var(--color-border)] font-bold text-[var(--color-text)]">Total Outbound Hari Ini: {totalWhatsAppCount}</span>
          <span class="text-xs bg-red-50 px-2.5 py-1 rounded-xl border border-red-100 font-bold text-red-600">Gagal: {failedWhatsAppCount}</span>
        </div>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-xs text-left" id="table-whatsapp-logs">
          <thead class="bg-[var(--color-card)] text-[var(--color-muted-foreground)] font-bold uppercase text-[10px] border-b border-[var(--color-border)]">
            <tr>
              <th class="p-4">ID Log</th>
              <th class="p-4">Nomor WhatsApp</th>
              <th class="p-4">Konteks Trigger</th>
              <th class="p-4">Isi Pesan</th>
              <th class="p-4 text-center">Status Kirim</th>
              <th class="p-4">Info Error</th>
              <th class="p-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-zinc-50">
            {#if filteredWhatsAppLogs.length === 0}
              <tr>
                <td colspan={7} class="p-8 text-center text-[var(--color-muted-foreground)]">
                  Tidak ada catatan pengiriman pesan WhatsApp untuk tanggal {selectedDate} dengan filter layanan yang dipilih.
                </td>
              </tr>
            {:else}
              {#each filteredWhatsAppLogs as log (log.id)}
                <tr class="hover:bg-[var(--color-card)]/50 transition">
                  <td class="p-4 font-mono font-bold text-[var(--color-muted-foreground)] text-[10px]">{log.id}</td>
                  <td class="p-4">
                    <div class="font-semibold text-zinc-800">{log.recipientMasked || log.recipient}</div>
                    <div class="text-[10px] text-[var(--color-muted-foreground)]">{log.direction?.toUpperCase() || 'OUTBOUND'}</div>
                  </td>
                  <td class="p-4">
                    <span class="px-1.5 py-0.5 bg-zinc-100 rounded text-[9px] font-bold uppercase text-zinc-600">
                      {log.event}
                    </span>
                  </td>
                  <td class="p-4 max-w-xs truncate text-zinc-600 text-[11px]" title={log.messageText}>
                    {log.messageText}
                  </td>
                  <td class="p-4 text-center">
                    <span class={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                      ['sent', 'delivered', 'read'].includes(log.status) ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                      log.status === 'failed' ? 'bg-red-50 text-red-600 border border-red-100 font-extrabold animate-pulse' :
                      'bg-zinc-100 text-[var(--color-muted-foreground)]'
                    }`}>
                      {log.status?.toUpperCase() || 'PENDING'}
                    </span>
                  </td>
                  <td class="p-4 text-[10px] text-red-500 font-medium max-w-xs truncate">
                    {log.errorMessage ? `${log.errorCode || ''}: ${log.errorMessage}` : '-'}
                  </td>
                  <td class="p-4 text-right">
                    {#if log.status === 'failed'}
                      <Button
                        variant="outline"
                        size="sm"
                        onclick={() => handleRetryWhatsAppMessage(log.id)}
                        disabled={retryingLogId === log.id}
                        class="text-[9px] font-bold bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-700 rounded-lg h-7"
                        id={`btn-retry-wa-${log.id}`}
                      >
                        <Send class="w-3 h-3 mr-1" />
                        {retryingLogId === log.id ? 'Mengirim...' : 'Kirim Ulang'}
                      </Button>
                    {:else}
                      <span class="text-[10px] text-emerald-600 font-semibold flex items-center justify-end">
                        <CheckCircle2 class="w-3.5 h-3.5 text-[var(--color-primary)] mr-1 shrink-0" />
                        Sukses
                      </span>
                    {/if}
                  </td>
                </tr>
              {/each}
            {/if}
          </tbody>
        </table>
      </div>
    </Card>
  {/if}
</div>

<!-- SETTINGS MODAL: ALERT THRESHOLDS -->
<Modal isOpen={showSettingsModal} onClose={() => (showSettingsModal = false)} title="Threshold & Pengaturan Alert" size="md">
  <div class="flex items-center gap-2 mb-4">
    <Settings class="w-5 h-5 text-[var(--color-primary)]" />
    <h3 class="text-base font-bold text-zinc-800">Threshold & Pengaturan Alert</h3>
  </div>

  <form onsubmit={handleSaveSettings} class="space-y-4">
    <div class="space-y-1">
      <label class="text-xs font-bold text-zinc-600">Ambang Batas Antrean Menunggu (Limit)</label>
      <input
        type="number"
        name="waitingQueueLimit"
        value={opSettings.waitingQueueLimit}
        min={1}
        class="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]"
      />
      <p class="text-[10px] text-[var(--color-muted-foreground)]">Trigger alert jika antrean dengan status "menunggu" menyentuh/melebihi batas ini.</p>
    </div>

    <div class="space-y-1">
      <label class="text-xs font-bold text-zinc-600">Ambang Batas Gagal Kirim WhatsApp (Limit)</label>
      <input
        type="number"
        name="failedWhatsappLimit"
        value={opSettings.failedWhatsappLimit}
        min={1}
        class="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]"
      />
      <p class="text-[10px] text-[var(--color-muted-foreground)]">Trigger alert jika jumlah kegagalan notifikasi WhatsApp mencapai/melebihi batas toleransi ini.</p>
    </div>

    <div class="space-y-1">
      <label class="text-xs font-bold text-zinc-600">Ambang Batas Pengaduan Aktif (Limit)</label>
      <input
        type="number"
        name="unresolvedComplaintLimit"
        value={opSettings.unresolvedComplaintLimit}
        min={1}
        class="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]"
      />
      <p class="text-[10px] text-[var(--color-muted-foreground)]">Trigger alert jika jumlah pengaduan pasien aktif belum selesai ditindaklanjuti mencapai batas ini.</p>
    </div>

    <div class="space-y-1">
      <label class="text-xs font-bold text-zinc-600">Interval Auto Polling Sinkronisasi (Detik)</label>
      <input
        type="number"
        name="pollingInterval"
        value={opSettings.pollingInterval}
        min={5}
        max={300}
        class="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]"
      />
      <p class="text-[10px] text-[var(--color-muted-foreground)]">Waktu interval sinkronisasi data dashboard otomatis (minimal 5 detik).</p>
    </div>

    <div class="flex gap-2 justify-end pt-3">
      <Button
        type="button"
        variant="outline"
        onclick={() => (showSettingsModal = false)}
        class="rounded-xl text-xs h-9 border-[var(--color-border)]"
      >
        Batal
      </Button>
      <Button
        type="submit"
        variant="primary"
        class="rounded-xl text-xs h-9 bg-[var(--color-primary)] hover:bg-amber-600 text-[var(--color-primary-foreground)] font-semibold"
      >
        Simpan Batas Threshold
      </Button>
    </div>
  </form>
</Modal>
