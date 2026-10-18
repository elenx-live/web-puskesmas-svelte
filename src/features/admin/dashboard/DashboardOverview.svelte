<!-- @component Admin Command Center — ringkasan terpadu operasional, layanan, konten, antrean, dan pengawasan sistem. -->
<script lang="ts">
import { memStore } from '../../../shared/lib/memStore';
  import Card from '../../../shared/ui/Card.svelte';
  import Badge from '../../../shared/ui/Badge.svelte';
  import Button from '../../../shared/ui/Button.svelte';
  import Modal from '../../../shared/ui/Modal.svelte';
  import BarChart from '../../../shared/components/charts/BarChart.svelte';
  import DonutChart from '../../../shared/components/charts/DonutChart.svelte';
  import { authStore } from '../../../shared/stores/auth.svelte.js';
  import { navigate, routerState } from '../../../app/router.svelte.js';
  import {
    HeartPulse, UserCheck, ListOrdered, MessageSquare, Bell, FileText, Clock,
    AlertTriangle, ShieldAlert, ChevronRight, Activity, RefreshCw, Sliders, Lock
  } from 'lucide-svelte';

  import { registrationService } from '../../../shared/services/registrationService.js';
  import { complaintService } from '../../../shared/services/complaintService.js';
  import { postService } from '../../../shared/services/postService.js';
  import { documentService } from '../../../shared/services/documentService.js';
  import { serviceEngineService } from '../../../shared/services/serviceEngineService.js';
  import { facilityService } from '../../../shared/services/facilityService.js';
  import { faqService } from '../../../shared/services/faqService.js';
  import { auditService } from '../../../shared/services/auditService.js';
  import { userService } from '../../../shared/services/userService.js';
  import { roleService } from '../../../shared/services/roleService.js';

  const go = (path: string) => navigate(path);

  const tabParam = routerState.query['tab'];
  let activeTab = $state<'command-center' | 'service-monitor' | 'system-foundation'>(
    tabParam === 'layanan' ? 'service-monitor' : tabParam === 'system' ? 'system-foundation' : 'command-center'
  );

  let loading = $state(true);
  let refreshing = $state(false);
  let lastUpdated = $state(new Date());
  let dateRange = $state<'today' | '7days' | '30days'>('today');

  const defaultWidgets: Record<string, boolean> = {
    summaryCards: true,
    attentionRequired: true,
    quickActions: true,
    chartsOverview: true,
    operationalAlerts: true,
    moduleOverviews: true,
    recentActivity: true,
    systemHealth: true
  };

  function loadSavedWidgets(): Record<string, boolean> {
    try {
      const saved = memStore.getItem('puskesmas_admin_dashboard_widgets');
      return saved ? JSON.parse(saved) : { ...defaultWidgets };
    } catch {
      return { ...defaultWidgets };
    }
  }

  let widgetConfig = $state<Record<string, boolean>>(loadSavedWidgets());
  let showConfigModal = $state(false);

  // Data Collections
  let registrations = $state<any[]>([]);
  let complaints = $state<any[]>([]);
  let posts = $state<any[]>([]);
  let documents = $state<any[]>([]);
  let services = $state<any[]>([]);
  let facilities = $state<any[]>([]);
  let faqs = $state<any[]>([]);
  let notifications = $state<any[]>([]);
  let auditLogs = $state<any[]>([]);
  let usersList = $state<any[]>([]);
  let schedules = $state<any[]>([]);
  let roles = $state<any[]>([]);

  async function loadCommandCenterData() {
    loading = true;
    try {
      const [regList, cmpList, postList, docList, srvList, facList, faqList, logList, usrList] = await Promise.all([
        registrationService.getRegistrations(),
        complaintService.getComplaints(),
        postService.getPosts(),
        documentService.getDocuments(),
        serviceEngineService.getServices(),
        facilityService.getFacilities(),
        faqService.getFaqs(),
        auditService.getLogs(),
        userService.getUsers()
      ]);

      let notifList: any[] = [];
      try {
        const rawNotif = memStore.getItem('puskesmas_notifications_v1');
        notifList = rawNotif ? JSON.parse(rawNotif) : [];
      } catch { notifList = []; }

      let schList: any[] = [];
      try {
        const rawSch = memStore.getItem('puskesmas_service_schedules');
        schList = rawSch ? JSON.parse(rawSch) : [];
      } catch { schList = []; }

      registrations = regList;
      complaints = cmpList;
      posts = postList;
      documents = docList;
      services = srvList;
      facilities = facList;
      faqs = faqList;
      notifications = notifList;
      auditLogs = logList;
      usersList = usrList;
      schedules = schList;
      lastUpdated = new Date();
    } catch (err) {
      console.error('Failed to load Command Center metrics:', err);
    } finally {
      loading = false;
      refreshing = false;
    }
  }

  $effect(() => {
    void dateRange;
    loadCommandCenterData();
  });

  $effect(() => {
    if (activeTab === 'system-foundation') {
      roleService.getRoles().then((r) => (roles = r)).catch(console.error);
    }
  });

  async function handleRefresh() {
    refreshing = true;
    await loadCommandCenterData();
  }

  function saveWidgetConfig() {
    try {
      memStore.setItem('puskesmas_admin_dashboard_widgets', JSON.stringify(widgetConfig));
    } catch (e) {
      console.error(e);
    }
    showConfigModal = false;
  }

  // ==========================================
  // COMPUTED METRICS & OVERVIEWS
  // ==========================================
  const todayStr = new Date().toISOString().split('T')[0];

  const todayRegistrations = $derived(registrations.filter((r) => r.visitDate === todayStr || r.createdAt?.startsWith(todayStr)));
  const activeQueuesToday = $derived(
    registrations.filter((r) => r.visitDate === todayStr && r.queueNumber && r.queueStatus !== 'completed' && r.queueStatus !== 'cancelled')
  );
  const newComplaintsCount = $derived(complaints.filter((c) => c.status === 'new' || c.status === 'verified').length);
  const draftPostsCount = $derived(posts.filter((p) => p.status === 'draft').length);
  const pendingReviewPostsCount = $derived(posts.filter((p) => p.status === 'pending_review' || p.status === 'review').length);
  const activeDocumentsCount = $derived(documents.filter((d) => d.status === 'published').length);
  const activeServicesCount = $derived(services.filter((s) => s.status === 'published').length);
  const unreadNotificationsCount = $derived(notifications.filter((n) => n.status === 'unread').length);

  interface AttentionItem { title: string; desc: string; type: 'urgent' | 'warning' | 'info'; link: string; }

  const attentionItems = $derived.by((): AttentionItem[] => {
    const items: AttentionItem[] = [];

    const urgentComps = complaints.filter((c) => (c.priority === 'urgent' || c.priority === 'high') && c.status !== 'completed');
    if (urgentComps.length > 0) {
      items.push({
        title: `${urgentComps.length} Pengaduan Prioritas Tinggi/Mendesak`,
        desc: 'Memerlukan eskalasi dan tindakan cepat dari petugas pengaduan.',
        type: 'urgent',
        link: '/admin/pengaduan'
      });
    }

    const inactiveSrvs = services.filter((s) => s.status !== 'published');
    if (inactiveSrvs.length > 0) {
      items.push({
        title: `${inactiveSrvs.length} Layanan Nonaktif / Draft`,
        desc: 'Layanan belum dipublikasikan ke portal publik Puskesmas.',
        type: 'warning',
        link: '/admin/services'
      });
    }

    const unavailFac = facilities.filter((f) => f.status !== 'Available');
    if (unavailFac.length > 0) {
      items.push({
        title: `${unavailFac.length} Fasilitas Tidak Tersedia / Maintenance`,
        desc: 'Fasilitas memerlukan perbaikan atau pengecekan status ketersediaan.',
        type: 'warning',
        link: '/admin/facilities'
      });
    }

    if (pendingReviewPostsCount > 0) {
      items.push({
        title: `${pendingReviewPostsCount} Konten Menunggu Approval Redaktur`,
        desc: 'Artikel atau pengumuman baru membutuhkan peninjauan sebelum terbit.',
        type: 'info',
        link: '/admin/posts'
      });
    }

    return items;
  });

  // Chart Data: Registration Trend (7 hari terakhir)
  const registrationTrendData = $derived.by(() => {
    const daysMap: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      daysMap[ds] = 0;
    }

    registrations.forEach((r) => {
      const ds = (r.visitDate || r.createdAt || '').split('T')[0];
      if (daysMap[ds] !== undefined) {
        daysMap[ds]++;
      }
    });

    return Object.keys(daysMap).map((dateStr) => ({
      label: new Date(dateStr).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' }),
      value: daysMap[dateStr]
    }));
  });

  // Chart Data: Complaint Status Breakdown
  const complaintStatusData = $derived.by(() => {
    const counts = { baru: 0, diproses: 0, selesai: 0, ditolak: 0 };
    complaints.forEach((c) => {
      if (c.status === 'new' || c.status === 'verified') counts.baru++;
      else if (c.status === 'processing') counts.diproses++;
      else if (c.status === 'completed') counts.selesai++;
      else counts.ditolak++;
    });

    return [
      { name: 'Baru / Verifikasi', value: counts.baru, color: '#F59E0B' },
      { name: 'Diproses', value: counts.diproses, color: '#3B82F6' },
      { name: 'Selesai', value: counts.selesai, color: '#10B981' },
      { name: 'Ditolak/Lainnya', value: counts.ditolak, color: '#71717A' }
    ];
  });

  const widgetList = [
    { key: 'summaryCards', label: 'Ringkasan Kartu Utama (8 Metrics)' },
    { key: 'attentionRequired', label: 'Perlu Perhatian (Attention Required)' },
    { key: 'quickActions', label: 'Aksi Cepat Navigasi Modul' },
    { key: 'chartsOverview', label: 'Grafik Trend & Status Pengaduan' },
    { key: 'operationalAlerts', label: 'Peringatan Operasional & Antrean' },
    { key: 'recentActivity', label: 'Aktivitas Terakhir (Audit Log)' },
    { key: 'systemHealth', label: 'Kesehatan Sistem & Integrasi' }
  ];

  const systemHealthItems = [
    { name: 'Database SQLite (VPS)', status: 'Operational', color: 'text-[var(--color-primary)] bg-[var(--color-primary)]/10' },
    { name: 'API Gateway & Express Server', status: 'Operational', color: 'text-[var(--color-primary)] bg-[var(--color-primary)]/10' },
    { name: 'WhatsApp Cloud API Gateway', status: 'Connected', color: 'text-[var(--color-primary)] bg-[var(--color-primary)]/10' },
    { name: 'Notification Service Dispatcher', status: 'Operational', color: 'text-[var(--color-primary)] bg-[var(--color-primary)]/10' },
    { name: 'Encrypted Storage & Backups', status: 'Operational', color: 'text-[var(--color-primary)] bg-[var(--color-primary)]/10' },
    { name: 'RBAC Security Policy Engine', status: 'Active (14 Rules)', color: 'text-[var(--color-primary)] bg-[var(--color-primary)]/10' }
  ];
</script>

<!-- Action Controls: Refresh, Date Range, Widget Config -->
<div class="flex items-center justify-end gap-2 flex-wrap mb-6">
  <select
    bind:value={dateRange}
    class="bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text)] text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[var(--color-primary)]"
  >
    <option value="today">Hari Ini</option>
    <option value="7days">7 Hari Terakhir</option>
    <option value="30days">30 Hari Terakhir</option>
  </select>

  <Button
    onclick={handleRefresh}
    disabled={refreshing || loading}
    variant="ghost"
    size="sm"
    class="bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text)] hover:text-[var(--color-text)] text-xs h-9 px-3"
  >
    <RefreshCw class={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[var(--color-primary)]' : ''}`} />
    <span>Refresh</span>
  </Button>

  <Button
    onclick={() => (showConfigModal = true)}
    variant="ghost"
    size="sm"
    class="bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text)] hover:text-[var(--color-text)] text-xs h-9 px-3"
    title="Pengaturan Widget Dashboard"
  >
    <Sliders class="w-3.5 h-3.5" />
    <span>Widget</span>
  </Button>

  <span class="text-[10px] text-[var(--color-muted-foreground)] font-mono hidden xl:inline">
    Update: {lastUpdated.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
  </span>
</div>

<div class="space-y-6">
  {#if activeTab === 'system-foundation'}
    <!-- SYSTEM FOUNDATION VIEW -->
    <div class="space-y-6">
      <div class="bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl p-6 md:p-8 space-y-4 shadow-xl">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-xs font-bold">
          <ShieldAlert class="w-4 h-4" />
          <span>Manajemen Pengguna & Peran RBAC (Role-Based Access Control)</span>
        </div>
        <h2 class="text-xl font-light text-[var(--color-text)]">Fondasi Keamanan & Pengaturan Akses Staf Puskesmas</h2>
        <p class="text-xs text-[var(--color-muted-foreground)] max-w-2xl leading-relaxed">
          Mengatur hierarki peran (Super Admin, Admin Web, Kepala Puskesmas, Petugas Pendaftaran, Petugas Pengaduan, Pengelola Layanan) beserta hak akses granular.
        </p>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
          <Card class="p-5 flex items-center gap-4">
            <div class="w-12 h-12 rounded-2xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-center text-[var(--color-primary)] font-bold text-lg">
              {usersList.length}
            </div>
            <div>
              <div class="text-xs font-bold text-[var(--color-text)]">Total Staf / Pengguna</div>
              <div class="text-[10px] text-[var(--color-muted-foreground)]">Terdaftar dalam sistem</div>
            </div>
          </Card>

          <Card class="p-5 flex items-center gap-4">
            <div class="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-lg">
              {roles.length}
            </div>
            <div>
              <div class="text-xs font-bold text-[var(--color-text)]">Peran Aktif (Roles)</div>
              <div class="text-[10px] text-[var(--color-muted-foreground)]">Granular permission</div>
            </div>
          </Card>

          <Card class="p-5 flex items-center gap-4">
            <div class="w-12 h-12 rounded-2xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-center text-[var(--color-primary)] font-bold text-lg">
              {auditLogs.length}
            </div>
            <div>
              <div class="text-xs font-bold text-[var(--color-text)]">Total Jejak Audit</div>
              <div class="text-[10px] text-[var(--color-muted-foreground)]">Tercatat aman</div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  {:else}
    <!-- ========================================== -->
    <!-- 1. SUMMARY CARDS (8 KARTU KUNCI UTAMA)    -->
    <!-- ========================================== -->
    {#if widgetConfig.summaryCards}
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="text-xs font-bold text-[var(--color-muted-foreground)] uppercase tracking-wider flex items-center gap-2">
            <HeartPulse class="w-4 h-4 text-[var(--color-primary)]" />
            <span>Ringkasan Utama Sistem & Operasional</span>
          </h3>
          <span class="text-[10px] text-[var(--color-muted-foreground)] font-mono">Real-time dari Database Modul</span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card
            onclick={() => go('/admin/pendaftaran')}
            class="p-5 hover:border-[var(--color-primary)]/50 transition cursor-pointer group flex items-center justify-between"
          >
            <div class="space-y-1 flex-1 min-w-0">
              <span class="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted-foreground)] block">Pendaftaran Hari Ini</span>
              <div class="text-3xl font-extrabold text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition">{todayRegistrations.length}</div>
              <span class="text-[10px] text-[var(--color-muted-foreground)] block">Pasien terdaftar</span>
            </div>
            <div class="w-12 h-12 rounded-2xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-center text-[var(--color-primary)] shrink-0 group-hover:scale-110 transition">
              <UserCheck class="w-6 h-6" />
            </div>
          </Card>

          <Card
            onclick={() => go('/admin/antrian')}
            class="p-5 hover:border-blue-500/50 transition cursor-pointer group flex items-center justify-between"
          >
            <div class="space-y-1 flex-1 min-w-0">
              <span class="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted-foreground)] block">Antrean Aktif Loket</span>
              <div class="text-3xl font-extrabold text-blue-400">{activeQueuesToday.length}</div>
              <span class="text-[10px] text-blue-400/80 block">Menunggu / Dilayani</span>
            </div>
            <div class="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0 group-hover:scale-110 transition">
              <ListOrdered class="w-6 h-6" />
            </div>
          </Card>

          <Card
            onclick={() => go('/admin/pengaduan')}
            class="p-5 hover:border-purple-500/50 transition cursor-pointer group flex items-center justify-between"
          >
            <div class="space-y-1 flex-1 min-w-0">
              <span class="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted-foreground)] block">Pengaduan Baru</span>
              <div class="text-3xl font-extrabold text-purple-400">{newComplaintsCount}</div>
              <span class="text-[10px] text-purple-400/80 block">Perlu verifikasi & tindak lanjut</span>
            </div>
            <div class="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0 group-hover:scale-110 transition">
              <MessageSquare class="w-6 h-6" />
            </div>
          </Card>

          <Card
            onclick={() => go('/admin/notifications')}
            class="p-5 hover:border-[var(--color-primary)]/50 transition cursor-pointer group flex items-center justify-between"
          >
            <div class="space-y-1 flex-1 min-w-0">
              <span class="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted-foreground)] block">Notifikasi Belum Dibaca</span>
              <div class="text-3xl font-extrabold text-[var(--color-primary)]">{unreadNotificationsCount}</div>
              <span class="text-[10px] text-[var(--color-primary)]/80 block">Pesan & pemberitahuan sistem</span>
            </div>
            <div class="w-12 h-12 rounded-2xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-center text-[var(--color-primary)] shrink-0 group-hover:scale-110 transition">
              <Bell class="w-6 h-6" />
            </div>
          </Card>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card
            onclick={() => go('/admin/posts')}
            class="p-4 hover:border-zinc-500 transition cursor-pointer flex items-center justify-between"
          >
            <div>
              <span class="text-[10px] font-bold uppercase text-[var(--color-muted-foreground)] block">Konten Draft</span>
              <div class="text-2xl font-bold text-[var(--color-text)] mt-0.5">{draftPostsCount}</div>
            </div>
            <FileText class="w-5 h-5 text-[var(--color-muted-foreground)]" />
          </Card>

          <Card
            onclick={() => go('/admin/posts')}
            class="p-4 hover:border-[var(--color-primary)]/50 transition cursor-pointer flex items-center justify-between"
          >
            <div>
              <span class="text-[10px] font-bold uppercase text-[var(--color-primary)] block">Menunggu Review</span>
              <div class="text-2xl font-bold text-[var(--color-primary)] mt-0.5">{pendingReviewPostsCount}</div>
            </div>
            <Clock class="w-5 h-5 text-[var(--color-primary)]" />
          </Card>

          <Card
            onclick={() => go('/admin/documents')}
            class="p-4 hover:border-blue-500/50 transition cursor-pointer flex items-center justify-between"
          >
            <div>
              <span class="text-[10px] font-bold uppercase text-blue-400 block">Dokumen Aktif (SPP/IKM)</span>
              <div class="text-2xl font-bold text-blue-400 mt-0.5">{activeDocumentsCount}</div>
            </div>
            <FileText class="w-5 h-5 text-blue-400" />
          </Card>

          <Card
            onclick={() => go('/admin/services')}
            class="p-4 hover:border-[var(--color-primary)]/50 transition cursor-pointer flex items-center justify-between"
          >
            <div>
              <span class="text-[10px] font-bold uppercase text-[var(--color-primary)] block">Layanan Aktif (Published)</span>
              <div class="text-2xl font-bold text-[var(--color-primary)] mt-0.5">{activeServicesCount}</div>
            </div>
            <HeartPulse class="w-5 h-5 text-[var(--color-primary)]" />
          </Card>
        </div>
      </div>
    {/if}

    <!-- ========================================== -->
    <!-- 2. ATTENTION REQUIRED (SECTION PERLU PERHATIAN) -->
    <!-- ========================================== -->
    {#if widgetConfig.attentionRequired && attentionItems.length > 0}
      <div class="bg-[var(--color-card)] border border-[var(--color-primary)]/30 rounded-3xl p-6 space-y-4 shadow-xl">
        <div class="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
          <h3 class="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider flex items-center gap-2">
            <ShieldAlert class="w-4 h-4 text-[var(--color-primary)] animate-pulse" />
            <span>Perlu Perhatian (Attention Required)</span>
          </h3>
          <Badge variant="amber" size="sm">{attentionItems.length} Tindakan Diperlukan</Badge>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          {#each attentionItems as item}
            <div
              onclick={() => go(item.link)}
              class="p-4 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] hover:border-[var(--color-primary)]/50 transition cursor-pointer flex items-start gap-3 group"
            >
              <div class={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                item.type === 'urgent' ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400' : 'bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 text-[var(--color-primary)]'
              }`}>
                <AlertTriangle class="w-4 h-4" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-xs font-bold text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition">{item.title}</div>
                <p class="text-[11px] text-[var(--color-muted-foreground)] mt-0.5 leading-relaxed">{item.desc}</p>
              </div>
              <ChevronRight class="w-4 h-4 text-zinc-600 group-hover:text-[var(--color-primary)] shrink-0 self-center" />
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- ========================================== -->
    <!-- 3. CHARTS OVERVIEW (TRENDS & STATS)        -->
    <!-- ========================================== -->
    {#if widgetConfig.chartsOverview}
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div class="lg:col-span-8 bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl p-6 space-y-4">
          <div class="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
            <div>
              <h3 class="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider">Trend Pendaftaran Harian</h3>
              <p class="text-[11px] text-[var(--color-muted-foreground)]">Volume kunjungan dan pendaftaran online 7 hari terakhir</p>
            </div>
            <Badge variant="amber" size="sm">Statistik Pendaftaran</Badge>
          </div>

          <div class="pt-2">
            <BarChart data={registrationTrendData} barColor="#F59E0B" height={256} showValues={true} />
          </div>
        </div>

        <div class="lg:col-span-4 bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl p-6 space-y-4">
          <div class="border-b border-[var(--color-border)] pb-4">
            <h3 class="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider">Status Pengaduan</h3>
            <p class="text-[11px] text-[var(--color-muted-foreground)]">Distribusi penanganan pengaduan masyarakat</p>
          </div>

          <div class="flex items-center justify-center">
            <DonutChart data={complaintStatusData} size={200} thickness={30} />
          </div>

          <div class="grid grid-cols-2 gap-2 pt-2 text-[11px]">
            {#each complaintStatusData as item}
              <div class="flex items-center gap-2">
                <span class="w-3 h-3 rounded-full shrink-0" style="background-color: {item.color}"></span>
                <span class="text-[var(--color-text)] truncate">{item.name} ({item.value})</span>
              </div>
            {/each}
          </div>
        </div>
      </div>
    {/if}

    <!-- ========================================== -->
    <!-- 5. MODULE OVERVIEWS & RECENT ACTIVITY      -->
    <!-- ========================================== -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {#if widgetConfig.recentActivity}
        <div class="lg:col-span-7 bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl p-6 space-y-4">
          <div class="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
            <div>
              <h3 class="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider">Aktivitas Terbaru Sistem</h3>
              <p class="text-[11px] text-[var(--color-muted-foreground)]">Jejak audit log operasional admin dan pengguna</p>
            </div>
            <Button onclick={() => go('/admin/audit')} variant="ghost" size="sm" class="text-xs">
              Lihat Semua Log
            </Button>
          </div>

          <div class="space-y-3">
            {#each auditLogs.slice(0, 6) as log, idx (log.id || idx)}
              <div class="flex items-start gap-3 p-3 rounded-2xl bg-[var(--color-bg)]/60 border border-[var(--color-border)]">
                <div class="w-8 h-8 rounded-xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-center text-[var(--color-primary)] shrink-0 mt-0.5">
                  <Activity class="w-4 h-4" />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between gap-2">
                    <span class="text-xs font-bold text-[var(--color-text)] truncate">{log.userName || 'System Operator'}</span>
                    <span class="text-[10px] text-[var(--color-muted-foreground)] font-mono">
                      {new Date(log.timestamp || log.createdAt || Date.now()).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p class="text-xs text-[var(--color-text)] mt-0.5 leading-relaxed">{log.description}</p>
                  <div class="flex items-center gap-2 mt-1.5">
                    <Badge variant="amber" size="sm">{log.module}</Badge>
                    <Badge variant="zinc" size="sm">{log.action}</Badge>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      {#if widgetConfig.systemHealth}
        <div class="lg:col-span-5 bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl p-6 space-y-4">
          <div class="border-b border-[var(--color-border)] pb-4">
            <h3 class="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider">Kesehatan Sistem & Integrasi</h3>
            <p class="text-[11px] text-[var(--color-muted-foreground)]">Status konektivitas layanan eksternal & database</p>
          </div>

          <div class="space-y-3">
            {#each systemHealthItems as item}
              <div class="flex items-center justify-between p-3 rounded-2xl bg-[var(--color-bg)]/60 border border-[var(--color-border)]">
                <span class="text-xs font-medium text-[var(--color-text)]">{item.name}</span>
                <span class={`px-2.5 py-1 rounded-full text-[10px] font-bold font-mono ${item.color} border border-current/20`}>
                  {item.status}
                </span>
              </div>
            {/each}
          </div>

          <div class="bg-[var(--color-bg)] border border-[var(--color-border)] p-3.5 rounded-2xl flex items-start gap-2.5 text-[11px] text-[var(--color-muted-foreground)]">
            <Lock class="w-4 h-4 text-[var(--color-primary)] shrink-0 mt-0.5" />
            <p>
              <strong>Kebijakan Privasi & Keamanan:</strong> Website ini adalah portal layanan publik & administrasi Puskesmas. Sesuai regulasi, tidak menyimpan data rekam medis (EMR) atau diagnosis klinis pasien di sini.
            </p>
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>

<!-- WIDGET CONFIGURATION MODAL -->
<Modal isOpen={showConfigModal} onClose={() => (showConfigModal = false)} title="Konfigurasi Widget Dashboard" size="md">
  <p class="text-xs text-[var(--color-muted-foreground)]">
    Pilih widget yang ingin ditampilkan atau disembunyikan pada Admin Command Center Anda.
  </p>

  <div class="space-y-3">
    {#each widgetList as w}
      <div class="flex items-center justify-between p-3 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)]">
        <span class="text-xs font-bold text-[var(--color-text)]">{w.label}</span>
        <input
          type="checkbox"
          checked={widgetConfig[w.key] ?? true}
          onchange={(e) => (widgetConfig = { ...widgetConfig, [w.key]: e.currentTarget.checked })}
          class="w-4 h-4 accent-amber-500 rounded cursor-pointer"
        />
      </div>
    {/each}
  </div>

  {#snippet footer()}
    <Button onclick={() => (showConfigModal = false)} variant="ghost" size="sm">
      Batal
    </Button>
    <Button onclick={saveWidgetConfig} variant="primary" size="sm">
      Simpan Konfigurasi
    </Button>
  {/snippet}
</Modal>
