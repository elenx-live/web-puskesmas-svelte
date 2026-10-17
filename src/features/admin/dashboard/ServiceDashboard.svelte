<!-- @component Dashboard & Monitoring Layanan — ketersediaan layanan, kelengkapan data SPP (7 aspek), antrean real-time, dan eskalasi pengaduan. (Ekspor default ini setara dengan ServiceDashboardContent pada source React.) -->
<script lang="ts">
  import Card from '../../../shared/ui/Card.svelte';
  import Badge from '../../../shared/ui/Badge.svelte';
  import Button from '../../../shared/ui/Button.svelte';
  import Input from '../../../shared/ui/Input.svelte';
  import Select from '../../../shared/ui/Select.svelte';
  import { serviceEngineService } from '../../../shared/services/serviceEngineService.js';
  import { complaintService } from '../../../shared/services/complaintService.js';
  import { navigate } from '../../../app/router.svelte.js';
  import type {
    ServiceEntity,
    ServiceCategoryEntity,
    ServiceClusterEntity,
    ServiceLocationEntity,
    ComplaintEntity,
    ServiceRequirementEntity,
    ServiceProcedureEntity,
    ServiceScheduleEntity,
    ServicePricingEntity
  } from '../../../shared/types/index.js';
  import {
    HeartPulse, Activity, Clock, AlertCircle, CheckCircle2, XCircle, Search, ArrowRight,
    FileText, MapPin, DollarSign, MessageSquare, ShieldAlert, RefreshCw, ChevronRight,
    Check, BarChart2, Info, CheckSquare
  } from 'lucide-svelte';

  const go = (path: string) => navigate(path);

  export interface ServiceCompletenessDetail {
    service: ServiceEntity;
    categoryName: string;
    clusterName: string;
    locationName: string;
    hasDescription: boolean;
    hasCategory: boolean;
    hasLocation: boolean;
    hasRequirements: boolean;
    hasProcedures: boolean;
    hasSchedule: boolean;
    hasPricing: boolean;
    presentCount: number;
    totalCount: number; // 7
    percentage: number;
    missingItems: string[];
  }

  let loading = $state(true);
  let refreshing = $state(false);
  let lastUpdated = $state(new Date());

  // Data Collections
  let services = $state<ServiceEntity[]>([]);
  let categories = $state<ServiceCategoryEntity[]>([]);
  let clusters = $state<ServiceClusterEntity[]>([]);
  let locations = $state<ServiceLocationEntity[]>([]);
  let complaints = $state<ComplaintEntity[]>([]);

  // Detailed Component Stores
  let requirements = $state<ServiceRequirementEntity[]>([]);
  let procedures = $state<ServiceProcedureEntity[]>([]);
  let schedules = $state<ServiceScheduleEntity[]>([]);
  let pricings = $state<ServicePricingEntity[]>([]);
  let registrations = $state<any[]>([]);

  // Filters for Completeness Table
  let completenessSearch = $state('');
  let completenessFilter = $state<'all' | 'incomplete' | 'complete'>('all');
  let statusFilter = $state<string>('');
  let clusterFilter = $state<string>('');

  async function loadAllDashboardData() {
    loading = true;
    try {
      const [srvList, catList, clsList, locList, cmpList] = await Promise.all([
        serviceEngineService.getServices(),
        serviceEngineService.getCategories(),
        serviceEngineService.getClusters(),
        serviceEngineService.getLocations(),
        complaintService.getComplaints()
      ]);

      services = srvList;
      categories = catList;
      clusters = clsList;
      locations = locList;
      complaints = cmpList;

      // Single-pass direct batch reading from local stores for related entities
      try {
        const rawReqs = localStorage.getItem('puskesmas_service_requirements');
        requirements = rawReqs ? JSON.parse(rawReqs) : [];

        const rawProcs = localStorage.getItem('puskesmas_service_procedures');
        procedures = rawProcs ? JSON.parse(rawProcs) : [];

        const rawSchedules = localStorage.getItem('puskesmas_service_schedules');
        schedules = rawSchedules ? JSON.parse(rawSchedules) : [];

        const rawPricing = localStorage.getItem('puskesmas_service_pricing');
        pricings = rawPricing ? JSON.parse(rawPricing) : [];

        const rawRegs = localStorage.getItem('puskesmas_service_registrations');
        registrations = rawRegs ? JSON.parse(rawRegs) : [];
      } catch (e) {
        console.error('Failed to read supplementary service details from local store:', e);
      }

      lastUpdated = new Date();
    } catch (err) {
      console.error('Failed to load service dashboard metrics:', err);
    } finally {
      loading = false;
      refreshing = false;
    }
  }

  $effect(() => {
    loadAllDashboardData();
  });

  async function handleManualRefresh() {
    refreshing = true;
    await loadAllDashboardData();
  }

  // ==========================================
  // METRICS COMPUTATION (ACTUAL DATABASE DATA)
  // ==========================================
  const totalServices = $derived(services.length);
  const activeServices = $derived(services.filter((s) => s.status === 'published').length);
  const draftServices = $derived(services.filter((s) => s.status === 'draft').length);
  const archivedServices = $derived(services.filter((s) => s.status === 'archived').length);

  // Services with vs without schedule
  const servicesWithScheduleList = $derived(
    services.filter((s) => {
      const sch = schedules.find((sc) => sc.serviceId === s.id);
      return sch && sch.rules && sch.rules.some((r) => r.isOpen);
    })
  );

  const servicesWithScheduleCount = $derived(servicesWithScheduleList.length);
  const servicesWithoutScheduleCount = $derived(totalServices - servicesWithScheduleCount);

  // Complaints Summary Metrics
  const totalComplaints = $derived(complaints.length);
  const newComplaints = $derived(complaints.filter((c) => c.status === 'new').length);
  const processingComplaints = $derived(
    complaints.filter((c) => c.status === 'processing' || c.status === 'verified').length
  );
  const completedComplaints = $derived(complaints.filter((c) => c.status === 'completed').length);
  const rejectedComplaints = $derived(complaints.filter((c) => c.status === 'rejected').length);

  // Queue system stats computation
  const todayStr = new Date().toISOString().split('T')[0];
  const todayRegs = $derived(registrations.filter((r) => r.visitDate === todayStr && r.queueNumber));

  const queueStats = $derived({
    total: todayRegs.length,
    waiting: todayRegs.filter((r) => r.queueStatus === 'waiting').length,
    calling: todayRegs.filter((r) => r.queueStatus === 'calling').length,
    serving: todayRegs.filter((r) => r.queueStatus === 'serving').length,
    completed: todayRegs.filter((r) => r.queueStatus === 'completed').length,
    skipped: todayRegs.filter((r) => r.queueStatus === 'skipped').length,
    cancelled: todayRegs.filter((r) => r.queueStatus === 'cancelled').length
  });

  // Urgent / High priority pending complaints
  const urgentPriorityComplaints = $derived(
    complaints.filter(
      (c) =>
        (c.priority === 'urgent' || c.priority === 'high') &&
        (c.status === 'new' || c.status === 'verified' || c.status === 'processing')
    )
  );

  // ==========================================
  // COMPLETENESS ENGINE COMPUTATION (7 ASPEK)
  // ==========================================
  const completenessDetails = $derived.by((): ServiceCompletenessDetail[] => {
    return services.map((s) => {
      const cat = categories.find((c) => c.id === s.categoryId);
      const cls = clusters.find((cl) => cl.id === (s.clusterId || cat?.clusterId));
      const loc = locations.find((l) => l.id === s.locationId);

      const hasDescription = Boolean(s.description && s.description.trim().length > 0);
      const hasCategory = Boolean(s.categoryId && s.categoryId.trim().length > 0);
      const hasLocation = Boolean(s.locationId && s.locationId.trim().length > 0);

      const hasRequirements = requirements.some((r) => r.serviceId === s.id && r.status !== 'archived');
      const hasProcedures = procedures.some((p) => p.serviceId === s.id && p.status !== 'archived');

      const sch = schedules.find((sc) => sc.serviceId === s.id);
      const hasSchedule = Boolean(sch && sch.rules && sch.rules.some((r) => r.isOpen));

      const hasPricing = pricings.some((pr) => pr.serviceId === s.id && pr.status !== 'archived');

      const items = [
        { name: 'Deskripsi', present: hasDescription },
        { name: 'Kategori', present: hasCategory },
        { name: 'Lokasi', present: hasLocation },
        { name: 'Persyaratan', present: hasRequirements },
        { name: 'Prosedur', present: hasProcedures },
        { name: 'Jadwal', present: hasSchedule },
        { name: 'Tarif', present: hasPricing }
      ];

      const presentCount = items.filter((i) => i.present).length;
      const totalCount = 7;
      const percentage = Math.round((presentCount / totalCount) * 100);
      const missingItems = items.filter((i) => !i.present).map((i) => i.name);

      return {
        service: s,
        categoryName: cat?.name || 'Tanpa Kategori',
        clusterName: cls?.name || 'Tanpa Klaster',
        locationName: loc?.name || 'Tanpa Lokasi',
        hasDescription,
        hasCategory,
        hasLocation,
        hasRequirements,
        hasProcedures,
        hasSchedule,
        hasPricing,
        presentCount,
        totalCount,
        percentage,
        missingItems
      };
    });
  });

  // Filtered Completeness Items
  const filteredCompleteness = $derived(
    completenessDetails.filter((item) => {
      const s = item.service;

      // Search term match
      if (completenessSearch) {
        const query = completenessSearch.toLowerCase();
        const nameMatch = s.name.toLowerCase().includes(query);
        const codeMatch = s.id?.toLowerCase().includes(query) || false;
        const catMatch = item.categoryName.toLowerCase().includes(query);
        if (!nameMatch && !codeMatch && !catMatch) return false;
      }

      // Completeness status filter
      if (completenessFilter === 'complete' && item.percentage < 100) return false;
      if (completenessFilter === 'incomplete' && item.percentage === 100) return false;

      // Service status filter
      if (statusFilter && s.status !== statusFilter) return false;

      // Cluster filter
      if (clusterFilter && s.clusterId !== clusterFilter) return false;

      return true;
    })
  );

  // Overall completeness stats
  const averageCompleteness = $derived(
    completenessDetails.length === 0
      ? 0
      : Math.round(completenessDetails.reduce((acc, curr) => acc + curr.percentage, 0) / completenessDetails.length)
  );

  const complete100Count = $derived(completenessDetails.filter((i) => i.percentage === 100).length);
  const incompleteCount = $derived(completenessDetails.length - complete100Count);

  // Recent Complaints for Monitoring Section
  const recentComplaints = $derived(
    [...complaints]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
  );

  const queueStatCards = $derived([
    { label: 'Total Hari Ini', value: queueStats.total, cls: 'text-[var(--color-text)]' },
    { label: 'Menunggu', value: queueStats.waiting, cls: 'text-[var(--color-primary)]' },
    { label: 'Dipanggil', value: queueStats.calling, cls: 'text-[var(--color-primary)]' },
    { label: 'Dilayani', value: queueStats.serving, cls: 'text-[var(--color-text)]' },
    { label: 'Selesai', value: queueStats.completed, cls: 'text-[var(--color-primary)]' },
    { label: 'Dilewati/Batal', value: queueStats.skipped + queueStats.cancelled, cls: 'text-[var(--color-primary)]' }
  ]);
</script>

<div class="space-y-6">
  <!-- Header Banner & Live Refresh -->
  <div class="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm">
    <div class="space-y-2">
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 text-[var(--color-primary)] text-[10px] font-bold uppercase tracking-widest">
        <BarChart2 class="w-3.5 h-3.5" />
        Phase 4G — Service Engine Monitoring Active
      </div>
      <h2 class="text-2xl font-light text-[var(--color-text)]">
        Monitoring Kualitas & Kesiapan <span class="font-bold text-[var(--color-primary)]">Pelayanan Publik</span>
      </h2>
      <p class="text-xs text-[var(--color-muted-foreground)] max-w-3xl leading-relaxed">
        Pantau ketersediaan layanan kesehatan, tingkat kelengkapan data (SPP), status jadwal operasional, dan eskalasi pengaduan masyarakat secara real-time dari database utama.
      </p>
    </div>

    <div class="flex items-center gap-3 shrink-0">
      <Button
        onclick={handleManualRefresh}
        disabled={refreshing || loading}
        variant="ghost"
        size="sm"
        class="text-[var(--color-text)] hover:text-[var(--color-text)]"
      >
        <RefreshCw class={`w-4 h-4 ${refreshing ? 'animate-spin text-[var(--color-primary)]' : ''}`} />
        Perbarui Data
      </Button>
      <span class="text-[10px] text-[var(--color-muted-foreground)] font-mono">
        {lastUpdated.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </span>
    </div>
  </div>

  <!-- ========================================== -->
  <!-- 1. SERVICE SUMMARY CARDS (STATISTIK KUNCI) -->
  <!-- ========================================== -->
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <h3 class="text-xs font-bold text-[var(--color-muted-foreground)] uppercase tracking-wider flex items-center gap-2">
        <HeartPulse class="w-4 h-4 text-[var(--color-primary)]" />
        Ringkasan Status Service Engine
      </h3>
      <span class="text-[11px] text-[var(--color-muted-foreground)]">Klik kartu statistik untuk melihat rincian</span>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card
        onclick={() => go('/admin/services')}
        class="flex items-center justify-between p-5 hover:border-[var(--color-primary)]/50 transition cursor-pointer group"
      >
        <div class="space-y-1 flex-1 min-w-0">
          <span class="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted-foreground)] block">Total Layanan</span>
          <div class="text-3xl font-extrabold text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition">{totalServices}</div>
          <span class="text-[10px] text-[var(--color-muted-foreground)] block">Seluruh layanan terdaftar</span>
        </div>
        <div class="w-12 h-12 rounded-2xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-center text-[var(--color-primary)] shrink-0 group-hover:scale-110 transition">
          <HeartPulse class="w-6 h-6" />
        </div>
      </Card>

      <Card
        onclick={() => go('/admin/services?status=published')}
        class="flex items-center justify-between p-5 hover:border-[var(--color-primary)]/50 transition cursor-pointer group"
      >
        <div class="space-y-1 flex-1 min-w-0">
          <span class="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted-foreground)] block">Layanan Aktif</span>
          <div class="text-3xl font-extrabold text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition">{activeServices}</div>
          <span class="text-[10px] text-[var(--color-primary)]/80 block">Public / Terpublikasi</span>
        </div>
        <div class="w-12 h-12 rounded-2xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-center text-[var(--color-primary)] shrink-0 group-hover:scale-110 transition">
          <CheckCircle2 class="w-6 h-6" />
        </div>
      </Card>

      <Card
        onclick={() => go('/admin/services?status=draft')}
        class="flex items-center justify-between p-5 hover:border-[var(--color-primary)]/50 transition cursor-pointer group"
      >
        <div class="space-y-1 flex-1 min-w-0">
          <span class="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted-foreground)] block">Konsep (Draft)</span>
          <div class="text-3xl font-extrabold text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition">{draftServices}</div>
          <span class="text-[10px] text-[var(--color-primary)]/80 block">Belum dipublikasikan</span>
        </div>
        <div class="w-12 h-12 rounded-2xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-center text-[var(--color-primary)] shrink-0 group-hover:scale-110 transition">
          <FileText class="w-6 h-6" />
        </div>
      </Card>

      <Card
        onclick={() => go('/admin/services?status=archived')}
        class="flex items-center justify-between p-5 hover:border-zinc-500/50 transition cursor-pointer group"
      >
        <div class="space-y-1 flex-1 min-w-0">
          <span class="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted-foreground)] block">Diarsipkan</span>
          <div class="text-3xl font-extrabold text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition">{archivedServices}</div>
          <span class="text-[10px] text-[var(--color-muted-foreground)] block">Layanan dinonaktifkan</span>
        </div>
        <div class="w-12 h-12 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-muted-foreground)] shrink-0 group-hover:scale-110 transition">
          <XCircle class="w-6 h-6" />
        </div>
      </Card>
    </div>

    <!-- Secondary Metric Grid (Schedules & Complaints) -->
    <div class="grid grid-cols-2 md:grid-cols-5 gap-3 pt-2">
      <div class="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl p-4 flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-center text-[var(--color-text)] shrink-0">
          <Clock class="w-4 h-4" />
        </div>
        <div>
          <div class="text-lg font-bold text-[var(--color-text)]">{servicesWithScheduleCount}</div>
          <div class="text-[10px] text-[var(--color-muted-foreground)]">Memiliki Jadwal</div>
        </div>
      </div>

      <div class="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl p-4 flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-center text-[var(--color-primary)] shrink-0">
          <AlertCircle class="w-4 h-4" />
        </div>
        <div>
          <div class="text-lg font-bold text-[var(--color-text)]">{servicesWithoutScheduleCount}</div>
          <div class="text-[10px] text-[var(--color-muted-foreground)]">Tanpa Jadwal</div>
        </div>
      </div>

      <div
        onclick={() => go('/admin/pengaduan')}
        class="bg-[var(--color-card)] border border-[var(--color-border)] hover:border-[var(--color-primary)]/40 rounded-2xl p-4 flex items-center gap-3 cursor-pointer transition"
      >
        <div class="w-9 h-9 rounded-xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-center text-[var(--color-primary)] shrink-0">
          <MessageSquare class="w-4 h-4" />
        </div>
        <div>
          <div class="text-lg font-bold text-[var(--color-text)]">{newComplaints}</div>
          <div class="text-[10px] text-[var(--color-muted-foreground)]">Pengaduan Baru</div>
        </div>
      </div>

      <div
        onclick={() => go('/admin/pengaduan')}
        class="bg-[var(--color-card)] border border-[var(--color-border)] hover:border-[var(--color-primary)]/40 rounded-2xl p-4 flex items-center gap-3 cursor-pointer transition"
      >
        <div class="w-9 h-9 rounded-xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-center text-[var(--color-primary)] shrink-0">
          <RefreshCw class="w-4 h-4" />
        </div>
        <div>
          <div class="text-lg font-bold text-[var(--color-text)]">{processingComplaints}</div>
          <div class="text-[10px] text-[var(--color-muted-foreground)]">Sedang Diproses</div>
        </div>
      </div>

      <div
        onclick={() => go('/admin/pengaduan')}
        class="bg-[var(--color-card)] border border-[var(--color-border)] hover:border-[var(--color-primary)]/40 rounded-2xl p-4 flex items-center justify-center sm:justify-start gap-3 cursor-pointer transition col-span-2 md:col-span-1"
      >
        <div class="w-9 h-9 rounded-xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-center text-[var(--color-primary)] shrink-0">
          <CheckCircle2 class="w-4 h-4" />
        </div>
        <div>
          <div class="text-lg font-bold text-[var(--color-text)]">{completedComplaints}</div>
          <div class="text-[10px] text-[var(--color-muted-foreground)]">Pengaduan Selesai</div>
        </div>
      </div>
    </div>
  </div>

  <!-- ========================================== -->
  <!-- QUEUE SYSTEM REAL-TIME DASHBOARD STATISTICS -->
  <!-- ========================================== -->
  <div class="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl p-6 space-y-4 shadow-sm">
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-4">
      <div>
        <h4 class="text-sm font-bold text-[var(--color-text)] flex items-center gap-2">
          <Activity class="w-4 h-4 text-[var(--color-primary)] animate-pulse" />
          <span>Pantauan Real-time Antrean Hari Ini</span>
        </h4>
        <p class="text-[11px] text-[var(--color-muted-foreground)]">Statistik transaksi loket pelayanan kesehatan Puskesmas ter-update otomatis.</p>
      </div>
      <Button
        onclick={() => go('/admin/services')}
        variant="secondary"
        size="sm"
        class="text-xs shrink-0 flex items-center gap-1.5"
      >
        <span>Buka Loket Panggilan</span>
        <ChevronRight class="w-3.5 h-3.5" />
      </Button>
    </div>

    <div class="grid grid-cols-2 md:grid-cols-6 gap-4">
      {#each queueStatCards as qc}
        <div class="bg-[var(--color-bg)]/60 border border-[var(--color-border)] p-4 rounded-2xl text-center space-y-1">
          <span class="text-[9px] font-bold text-[var(--color-muted-foreground)] uppercase block">{qc.label}</span>
          <div class={`text-2xl font-extrabold ${qc.cls}`}>{qc.value}</div>
        </div>
      {/each}
    </div>
  </div>

  <!-- ========================================== -->
  <!-- 2. SERVICE DATA COMPLETENESS (7 ASPEK)     -->
  <!-- ========================================== -->
  <div class="bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl p-6 space-y-6">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-6">
      <div>
        <div class="inline-flex items-center gap-2 text-xs font-bold text-[var(--color-primary)] uppercase tracking-wider mb-1">
          <CheckSquare class="w-4 h-4" />
          Kelengkapan Data Layanan (Service Data Completeness)
        </div>
        <h3 class="text-lg font-light text-[var(--color-text)]">
          Evaluasi 7 Komponen Standar Pelayanan Publik (Permenpan RB)
        </h3>
        <p class="text-xs text-[var(--color-muted-foreground)] mt-1">
          Setiap layanan wajib melengkapi 7 aspek: Deskripsi, Kategori, Lokasi, Persyaratan, Prosedur, Jadwal, & Tarif.
        </p>
      </div>

      <div class="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl p-4 flex items-center gap-6 shrink-0">
        <div>
          <div class="text-[10px] text-[var(--color-muted-foreground)] uppercase tracking-wider font-bold">Rata-Rata Kelengkapan</div>
          <div class="text-2xl font-extrabold text-[var(--color-primary)] mt-0.5">{averageCompleteness}%</div>
        </div>
        <div class="h-8 w-px bg-[var(--color-card)]"></div>
        <div class="space-y-1 text-xs">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-[var(--color-primary)]"></span>
            <span class="text-[var(--color-text)] font-bold">{complete100Count}</span>
            <span class="text-[var(--color-muted-foreground)] text-[11px]">Lengkap 100%</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-[var(--color-primary)]"></span>
            <span class="text-[var(--color-primary)] font-bold">{incompleteCount}</span>
            <span class="text-[var(--color-muted-foreground)] text-[11px]">Perlu Lengkap</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters Bar -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <div class="relative">
        <Search class="w-4 h-4 absolute left-3 top-3 text-[var(--color-muted-foreground)]" />
        <Input
          placeholder="Cari nama layanan / kode..."
          bind:value={completenessSearch}
          class="pl-9 bg-[var(--color-bg)] border-[var(--color-border)] text-xs"
        />
      </div>

      <Select
        bind:value={completenessFilter}
        options={[
          { value: 'all', label: 'Semua Kelengkapan Data' },
          { value: 'incomplete', label: 'Perlu Dilengkapi (< 100%)' },
          { value: 'complete', label: 'Lengkap 100%' }
        ]}
        class="bg-[var(--color-bg)] border-[var(--color-border)] text-xs"
      />

      <Select
        bind:value={statusFilter}
        options={[
          { value: '', label: 'Semua Status Publikasi' },
          { value: 'published', label: 'Published' },
          { value: 'draft', label: 'Draft' },
          { value: 'archived', label: 'Archived' }
        ]}
        class="bg-[var(--color-bg)] border-[var(--color-border)] text-xs"
      />

      <Select
        bind:value={clusterFilter}
        options={[
          { value: '', label: 'Semua Klaster Layanan' },
          ...clusters.map((cls) => ({ value: cls.id, label: cls.name }))
        ]}
        class="bg-[var(--color-bg)] border-[var(--color-border)] text-xs"
      />
    </div>

    <!-- Completeness Table -->
    <div class="overflow-x-auto rounded-2xl border border-[var(--color-border)]">
      <table class="w-full text-xs text-left text-[var(--color-text)]">
        <thead class="bg-[var(--color-bg)] text-[10px] font-bold uppercase text-[var(--color-muted-foreground)] border-b border-[var(--color-border)]">
          <tr>
            <th class="p-4">Layanan Kesehatan</th>
            <th class="p-4">Klaster & Kategori</th>
            <th class="p-4 text-center">Status</th>
            <th class="p-4 w-48">Skor Kelengkapan</th>
            <th class="p-4">Komponen Data (7 Aspek)</th>
            <th class="p-4 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-[var(--color-border)] bg-[var(--color-card)]/40">
          {#if filteredCompleteness.length === 0}
            <tr>
              <td colspan={6} class="p-8 text-center text-[var(--color-muted-foreground)]">
                Tidak ada data layanan yang sesuai dengan filter pencarian.
              </td>
            </tr>
          {:else}
            {#each filteredCompleteness as item (item.service.id)}
              {@const s = item.service}
              <tr class="hover:bg-[var(--color-card)]/50 transition">
                <td class="p-4 font-medium">
                  <div class="font-bold text-[var(--color-text)] text-xs">{s.name}</div>
                  <div class="text-[10px] text-[var(--color-primary)] font-mono mt-0.5">{s.id}</div>
                </td>

                <td class="p-4">
                  <div class="text-xs text-[var(--color-text)]">{item.categoryName}</div>
                  <div class="text-[10px] text-[var(--color-muted-foreground)]">{item.clusterName}</div>
                </td>

                <td class="p-4 text-center">
                  {#if s.status === 'published'}<Badge variant="emerald" size="sm">Published</Badge>{/if}
                  {#if s.status === 'draft'}<Badge variant="blue" size="sm">Draft</Badge>{/if}
                  {#if s.status === 'archived'}<Badge variant="zinc" size="sm">Archived</Badge>{/if}
                </td>

                <td class="p-4">
                  <div class="flex items-center justify-between gap-2 mb-1">
                    <span class={`text-[11px] font-bold ${
                      item.percentage === 100 ? 'text-[var(--color-primary)]' : item.percentage >= 50 ? 'text-[var(--color-primary)]' : 'text-[var(--color-text)]'
                    }`}>
                      {item.percentage}% ({item.presentCount}/7)
                    </span>
                    <span class="text-[9px] text-[var(--color-muted-foreground)]">
                      {item.percentage === 100 ? 'Lengkap' : 'Perlu Dilengkapi'}
                    </span>
                  </div>
                  <div class="w-full h-2 bg-[var(--color-bg)] rounded-full overflow-hidden border border-[var(--color-border)]">
                    <div
                      class={`h-full transition-all duration-500 ${
                        item.percentage === 100
                          ? 'bg-[var(--color-primary)]'
                          : item.percentage >= 50
                            ? 'bg-[var(--color-primary)]'
                            : 'bg-rose-500'
                      }`}
                      style={`width: ${item.percentage}%`}
                    ></div>
                  </div>
                </td>

                <td class="p-4">
                  <div class="flex flex-wrap gap-1">
                    {#each [
                      { key: 'Deskripsi', ok: item.hasDescription },
                      { key: 'Kategori', ok: item.hasCategory },
                      { key: 'Lokasi', ok: item.hasLocation },
                      { key: 'Persyaratan', ok: item.hasRequirements },
                      { key: 'Prosedur', ok: item.hasProcedures },
                      { key: 'Jadwal', ok: item.hasSchedule },
                      { key: 'Tarif', ok: item.hasPricing }
                    ] as comp}
                      <span
                        title={`${comp.key}: ${comp.ok ? 'Ada' : 'Belum Ada'}`}
                        class={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono border ${
                          comp.ok
                            ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30 text-[var(--color-primary)]'
                            : 'bg-[var(--color-primary)]/10 border-rose-500/30 text-[var(--color-text)]'
                        }`}
                      >
                        {#if comp.ok}<Check class="w-2.5 h-2.5" />{:else}<XCircle class="w-2.5 h-2.5" />{/if}
                        {comp.key}
                      </span>
                    {/each}
                  </div>
                </td>

                <td class="p-4 text-right">
                  <Button
                    onclick={() => go(`/admin/services?edit=${s.id}`)}
                    variant="ghost"
                    size="sm"
                    class="text-[var(--color-primary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10"
                  >
                    Lengkapi Data
                    <ChevronRight class="w-3.5 h-3.5" />
                  </Button>
                </td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>
  </div>

  <!-- ========================================== -->
  <!-- 3. COMPLAINT MONITORING & PRIORITY ALERTS  -->
  <!-- ========================================== -->
  <div class="bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl p-6 space-y-6">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-4">
      <div>
        <div class="inline-flex items-center gap-2 text-xs font-bold text-[var(--color-primary)] uppercase tracking-wider mb-1">
          <MessageSquare class="w-4 h-4" />
          Pemantauan Pengaduan & Feedback Publik
        </div>
        <h3 class="text-lg font-light text-[var(--color-text)]">
          Sistem Eskalasi & Pengawasan Respons Layanan
        </h3>
        <p class="text-xs text-[var(--color-muted-foreground)] mt-1">
          Memantau kritik, saran, pengaduan, dan apresiasi dari masyarakat beserta tingkat prioritas penanganan.
        </p>
      </div>

      <Button
        onclick={() => go('/admin/pengaduan')}
        variant="primary"
        size="sm"
      >
        Buka Kelola Pengaduan
        <ArrowRight class="w-4 h-4" />
      </Button>
    </div>

    {#if urgentPriorityComplaints.length > 0}
      <div class="bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 rounded-2xl p-4 flex items-center justify-between gap-4 text-[var(--color-primary)]">
        <div class="flex items-center gap-3">
          <ShieldAlert class="w-6 h-6 shrink-0 text-[var(--color-primary)] animate-pulse" />
          <div>
            <div class="text-sm font-bold text-[var(--color-primary)]">
              Perhatian: Terdapat {urgentPriorityComplaints.length} Pengaduan Prioritas Tinggi / Mendesak
            </div>
            <div class="text-xs text-[var(--color-primary)]/80 mt-0.5">
              Tiket memerlukan tindakan dan respon cepat dari petugas terkait untuk menjaga kualitas standar pelayanan.
            </div>
          </div>
        </div>
        <Button
          onclick={() => go('/admin/pengaduan')}
          variant="secondary"
          size="sm"
          class="shrink-0 bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary)] border-none font-bold"
        >
          Tindak Lanjuti ({urgentPriorityComplaints.length})
        </Button>
      </div>
    {/if}

    <!-- Recent Complaints Table -->
    <div class="overflow-x-auto rounded-2xl border border-[var(--color-border)]">
      <table class="w-full text-xs text-left text-[var(--color-text)]">
        <thead class="bg-[var(--color-bg)] text-[10px] font-bold uppercase text-[var(--color-muted-foreground)] border-b border-[var(--color-border)]">
          <tr>
            <th class="p-4">No. Tiket</th>
            <th class="p-4">Jenis</th>
            <th class="p-4">Layanan Terkait</th>
            <th class="p-4">Pengirim</th>
            <th class="p-4 text-center">Prioritas</th>
            <th class="p-4 text-center">Status</th>
            <th class="p-4">Tanggal</th>
            <th class="p-4 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-[var(--color-border)] bg-[var(--color-card)]/40">
          {#if recentComplaints.length === 0}
            <tr>
              <td colspan={8} class="p-8 text-center text-[var(--color-muted-foreground)]">
                Belum ada pengaduan publik yang masuk ke sistem.
              </td>
            </tr>
          {:else}
            {#each recentComplaints as c (c.id)}
              <tr class="hover:bg-[var(--color-card)]/50 transition">
                <td class="p-4 font-mono font-bold text-[var(--color-primary)] text-xs">
                  {c.ticketNumber}
                </td>

                <td class="p-4">
                  {#if c.type === 'kritik'}<Badge variant="rose" size="sm">Kritik</Badge>{/if}
                  {#if c.type === 'saran'}<Badge variant="blue" size="sm">Saran</Badge>{/if}
                  {#if c.type === 'pengaduan'}<Badge variant="amber" size="sm">Pengaduan</Badge>{/if}
                  {#if c.type === 'apresiasi'}<Badge variant="emerald" size="sm">Apresiasi</Badge>{/if}
                </td>

                <td class="p-4 text-[var(--color-text)] font-medium">
                  {c.serviceName || 'Layanan Umum'}
                </td>

                <td class="p-4">
                  {#if c.isAnonymous}
                    <span class="text-[var(--color-muted-foreground)] italic flex items-center gap-1">
                      <Info class="w-3 h-3" /> Anonim
                    </span>
                  {:else}
                    <span class="text-[var(--color-text)] font-medium">{c.senderName || 'Warga'}</span>
                  {/if}
                </td>

                <td class="p-4 text-center">
                  {#if c.priority === 'urgent'}<Badge variant="rose" size="sm">Mendesak</Badge>{/if}
                  {#if c.priority === 'high'}<Badge variant="amber" size="sm">Tinggi</Badge>{/if}
                  {#if c.priority === 'normal'}<Badge variant="blue" size="sm">Normal</Badge>{/if}
                  {#if c.priority === 'low'}<Badge variant="zinc" size="sm">Rendah</Badge>{/if}
                </td>

                <td class="p-4 text-center">
                  {#if c.status === 'new'}<Badge variant="amber" size="sm">Baru</Badge>{/if}
                  {#if c.status === 'verified'}<Badge variant="blue" size="sm">Terverifikasi</Badge>{/if}
                  {#if c.status === 'processing'}<Badge variant="blue" size="sm">Diproses</Badge>{/if}
                  {#if c.status === 'completed'}<Badge variant="emerald" size="sm">Selesai</Badge>{/if}
                  {#if c.status === 'rejected'}<Badge variant="zinc" size="sm">Ditolak</Badge>{/if}
                </td>

                <td class="p-4 text-[var(--color-muted-foreground)] text-[11px]">
                  {new Date(c.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>

                <td class="p-4 text-right">
                  <Button
                    onclick={() => go('/admin/pengaduan')}
                    variant="ghost"
                    size="sm"
                    class="text-[var(--color-primary)] hover:text-[var(--color-primary)]"
                  >
                    Tindak Lanjuti
                  </Button>
                </td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>
  </div>
</div>
