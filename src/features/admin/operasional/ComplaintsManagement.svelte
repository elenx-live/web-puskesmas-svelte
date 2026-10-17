<!-- @component Pusat kendali pengaduan & aspirasi masyarakat (SkaDuan): direktori laporan, statistik SLA, dan konfigurasi kategori/SLA. -->
<script lang="ts">
  import {
    MessageSquare, Search, Filter, RotateCcw, Eye, UserCheck,
    Clock, AlertTriangle, CheckCircle2, XCircle, Paperclip,
    ShieldCheck, FileText, User, Download, Plus, Trash2, Shield,
    Settings, Layers, Sliders, Link, Star, BarChart3, HelpCircle, Activity
  } from 'lucide-svelte';
  import Card from '../../../shared/ui/Card.svelte';
  import Badge from '../../../shared/ui/Badge.svelte';
  import Modal from '../../../shared/ui/Modal.svelte';
  import LoadingSkeleton from '../../../shared/ui/LoadingSkeleton.svelte';
  import ConfirmModal from '../../../shared/components/ConfirmModal.svelte';
  import { complaintService } from '../../../shared/services/complaintService.js';
  import { serviceEngineService } from '../../../shared/services/serviceEngineService.js';
  import { errorMessage } from '../../../shared/lib/logger.js';
  import { userService } from '../../../shared/services/userService.js';
  import { auditService } from '../../../shared/services/auditService.js';
  import { authStore } from '../../../shared/stores/auth.svelte.js';
  import { routerState } from '../../../app/router.svelte.js';
  import type {
    ComplaintEntity, ComplaintType, ComplaintStatus, ComplaintPriority,
    ServiceEntity, AppUser, AuditLog, PublicResponseItem, InternalNoteItem
  } from '../../../shared/types/index.js';

  type BadgeTone = 'primary' | 'amber' | 'emerald' | 'red' | 'zinc' | 'blue' | 'rose' | 'sky' | 'slate' | 'purple';

  // Primary Workspace Tabs
  let activeTab = $state<'directory' | 'settings'>('directory');

  // Data States
  let complaints = $state<ComplaintEntity[]>([]);
  let services = $state<ServiceEntity[]>([]);
  let staffUsers = $state<AppUser[]>([]);
  let categories = $state<string[]>([]);
  let enabledTypes = $state<ComplaintType[]>([]);
  let slaSettings = $state({ responseDays: 1, resolutionDays: 5 });
  let loading = $state(true);

  // Filter States
  let search = $state('');
  let statusFilter = $state<ComplaintStatus | ''>('');
  let typeFilter = $state<ComplaintType | ''>('');
  let priorityFilter = $state<ComplaintPriority | ''>('');
  let categoryFilter = $state('');
  let serviceFilter = $state('');
  let assignedFilter = $state('');
  let slaFilter = $state<'all' | 'overdue' | 'ontrack'>('all');
  let startDate = $state('');
  let endDate = $state('');

  // Pagination State
  let currentPage = $state(1);
  const itemsPerPage = 10;

  // Selected Complaint Modal View
  let selectedComplaint = $state<ComplaintEntity | null>(null);
  let modalOpen = $state(false);
  let complaintAuditLogs = $state<AuditLog[]>([]);

  // Action States inside Modal
  let newNoteText = $state('');
  let newPublicText = $state('');
  let duplicateTicketCode = $state('');
  let isDuplicateChecked = $state(false);
  let isAddingNote = $state(false);
  let isAddingPublic = $state(false);
  let actionSuccessMsg = $state('');
  let actionErrorMsg = $state('');

  // Settings Configuration Panel State
  let newCategoryName = $state('');
  let settingsSuccessMsg = $state('');
  let settingsErrorMsg = $state('');

  // Konfirmasi hapus (ConfirmModal)
  let deleteComplaintTarget = $state<{ id: string; ticketNumber: string } | null>(null);
  let deleteCategoryTarget = $state<string | null>(null);
  let isDeleting = $state(false);

  // URL parameters → initial filters
  $effect(() => {
    const q = routerState.query;
    if (q.status) statusFilter = q.status as ComplaintStatus;
    if (q.priority) priorityFilter = q.priority as ComplaintPriority;
  });

  $effect(() => {
    loadAllDependencies();
  });

  $effect(() => {
    // Synchronous reads so Svelte tracks the filter dependencies
    // (loadComplaints reads them again after an await).
    void search; void statusFilter; void typeFilter; void priorityFilter;
    void categoryFilter; void serviceFilter; void assignedFilter; void slaFilter;
    void startDate; void endDate; void activeTab;
    loadComplaints();
  });

  async function loadAllDependencies() {
    loading = true;
    try {
      const [srvList, usrList] = await Promise.all([
        serviceEngineService.getServices(),
        userService.getUsers()
      ]);
      services = srvList;
      staffUsers = usrList;

      // Load configuration values from complaintService
      categories = complaintService.getCategories();
      slaSettings = complaintService.getSLASettings();
      enabledTypes = complaintService.getEnabledTypes();

      await loadComplaints();
    } catch (err) {
      console.error('Failed to load complaint dependencies:', err);
    } finally {
      loading = false;
    }
  }

  async function loadComplaints() {
    try {
      let raw = await complaintService.getComplaints();

      // Implement client-side filtering matching standard parameters
      if (search) {
        const q = search.toLowerCase().trim();
        raw = raw.filter(c =>
          c.ticketNumber.toLowerCase().includes(q) ||
          c.title?.toLowerCase().includes(q) ||
          c.content.toLowerCase().includes(q) ||
          c.senderName?.toLowerCase().includes(q) ||
          c.senderEmail?.toLowerCase().includes(q)
        );
      }

      if (statusFilter) {
        raw = raw.filter(c => c.status === statusFilter);
      }

      if (typeFilter) {
        raw = raw.filter(c => c.type === typeFilter);
      }

      if (priorityFilter) {
        raw = raw.filter(c => c.priority === priorityFilter);
      }

      if (categoryFilter) {
        raw = raw.filter(c => c.category === categoryFilter);
      }

      if (serviceFilter) {
        raw = raw.filter(c => c.serviceId === serviceFilter);
      }

      if (assignedFilter) {
        raw = raw.filter(c => c.assignedTo === assignedFilter);
      }

      if (startDate) {
        const start = new Date(startDate).getTime();
        raw = raw.filter(c => new Date(c.createdAt).getTime() >= start);
      }

      if (endDate) {
        const end = new Date(endDate).setHours(23, 59, 59, 999);
        raw = raw.filter(c => new Date(c.createdAt).getTime() <= end);
      }

      // SLA filter checking
      if (slaFilter !== 'all') {
        raw = raw.filter(c => {
          const isResolved = c.status === 'completed' || c.status === 'closed' || c.status === 'rejected';
          if (isResolved) return slaFilter === 'ontrack'; // resolved is considered finished
          if (!c.targetResolutionTime) return slaFilter === 'ontrack';
          const isOverdue = new Date().getTime() > new Date(c.targetResolutionTime).getTime();
          return slaFilter === 'overdue' ? isOverdue : !isOverdue;
        });
      }

      complaints = raw;
    } catch (err) {
      console.error('Failed to fetch complaints:', err);
    }
  }

  function handleResetFilter() {
    search = '';
    statusFilter = '';
    typeFilter = '';
    priorityFilter = '';
    categoryFilter = '';
    serviceFilter = '';
    assignedFilter = '';
    slaFilter = 'all';
    startDate = '';
    endDate = '';
  }

  function buildActor() {
    const user = authStore.user;
    return {
      id: user?.uid || 'system',
      email: user?.email || 'system',
      name: user?.displayName || 'System Admin'
    };
  }

  async function openDetailModal(c: ComplaintEntity) {
    selectedComplaint = c;
    duplicateTicketCode = c.duplicateOfTicket || '';
    isDuplicateChecked = Boolean(c.isDuplicate);
    modalOpen = true;
    actionSuccessMsg = '';
    actionErrorMsg = '';
    newNoteText = '';
    newPublicText = '';

    // Load audit logs matching this ticket
    try {
      complaintAuditLogs = await auditService.getLogs({ module: 'COMPLAINTS', search: c.ticketNumber });
    } catch {
      complaintAuditLogs = [];
    }
  }

  async function refreshCurrentComplaint(id: string) {
    try {
      const updated = await complaintService.getComplaintById(id);
      if (updated) {
        selectedComplaint = updated;
        duplicateTicketCode = updated.duplicateOfTicket || '';
        isDuplicateChecked = Boolean(updated.isDuplicate);
        await loadComplaints();
        complaintAuditLogs = await auditService.getLogs({ module: 'COMPLAINTS', search: updated.ticketNumber });
      }
    } catch (err) {
      console.error('Failed to refresh complaint detail:', err);
    }
  }

  async function handleUpdateStatus(newStatus: ComplaintStatus) {
    const user = authStore.user;
    if (!selectedComplaint || !user) return;
    actionErrorMsg = '';
    actionSuccessMsg = '';

    try {
      await complaintService.updateComplaintStatus(selectedComplaint.id, newStatus, {
        id: user.uid,
        email: user.email,
        name: user.displayName
      });
      actionSuccessMsg = `Status sukses diperbarui menjadi '${getStatusLabel(newStatus)}'`;
      await refreshCurrentComplaint(selectedComplaint.id);
    } catch (err: unknown) {
      actionErrorMsg = errorMessage(err, 'Gagal mengubah status.');
    }
  }

  async function handleUpdatePriority(newPriority: ComplaintPriority) {
    const user = authStore.user;
    if (!selectedComplaint || !user) return;
    actionErrorMsg = '';
    actionSuccessMsg = '';

    try {
      await complaintService.updateComplaintPriority(selectedComplaint.id, newPriority, {
        id: user.uid,
        email: user.email,
        name: user.displayName
      });
      actionSuccessMsg = `Prioritas diubah menjadi '${getPriorityLabel(newPriority)}'`;
      await refreshCurrentComplaint(selectedComplaint.id);
    } catch (err: unknown) {
      actionErrorMsg = errorMessage(err, 'Gagal mengubah prioritas.');
    }
  }

  async function handleAssignStaff(staffUid: string) {
    const user = authStore.user;
    if (!selectedComplaint || !user) return;
    actionErrorMsg = '';
    actionSuccessMsg = '';

    const staffObj = staffUsers.find(u => u.uid === staffUid);
    const staffName = staffObj ? staffObj.displayName : '';

    try {
      await complaintService.assignComplaint(selectedComplaint.id, staffUid, staffName, {
        id: user.uid,
        email: user.email,
        name: user.displayName
      });
      actionSuccessMsg = staffUid ? `Ditugaskan kepada ${staffName}` : 'Penugasan dibatalkan';
      await refreshCurrentComplaint(selectedComplaint.id);
    } catch (err: unknown) {
      actionErrorMsg = errorMessage(err, 'Gagal menugaskan.');
    }
  }

  async function handleAddNote(e: SubmitEvent) {
    e.preventDefault();
    const user = authStore.user;
    if (!selectedComplaint || !user || !newNoteText.trim()) return;
    isAddingNote = true;
    actionErrorMsg = '';
    actionSuccessMsg = '';

    try {
      await complaintService.addInternalNote(selectedComplaint.id, newNoteText.trim(), {
        id: user.uid,
        email: user.email,
        name: user.displayName
      });
      newNoteText = '';
      actionSuccessMsg = 'Catatan internal (rahasia) berhasil disimpan.';
      await refreshCurrentComplaint(selectedComplaint.id);
    } catch (err: unknown) {
      actionErrorMsg = errorMessage(err, 'Gagal menyimpan catatan.');
    } finally {
      isAddingNote = false;
    }
  }

  async function handleAddPublicResponse(e: SubmitEvent) {
    e.preventDefault();
    const user = authStore.user;
    if (!selectedComplaint || !user || !newPublicText.trim()) return;
    isAddingPublic = true;
    actionErrorMsg = '';
    actionSuccessMsg = '';

    try {
      await complaintService.addPublicResponse(selectedComplaint.id, newPublicText.trim(), {
        id: user.uid,
        email: user.email,
        name: user.displayName
      });
      newPublicText = '';
      actionSuccessMsg = 'Tanggapan resmi dipublikasikan dan dapat diakses pelapor.';
      await refreshCurrentComplaint(selectedComplaint.id);
    } catch (err: unknown) {
      actionErrorMsg = errorMessage(err, 'Gagal mengirim tanggapan.');
    } finally {
      isAddingPublic = false;
    }
  }

  async function handleToggleDuplicate() {
    const user = authStore.user;
    if (!selectedComplaint || !user) return;
    actionErrorMsg = '';
    actionSuccessMsg = '';

    const targetCode = isDuplicateChecked ? '' : duplicateTicketCode.trim();
    if (!isDuplicateChecked && !targetCode) {
      actionErrorMsg = 'Masukkan nomor tiket rujukan utama untuk menandai duplikat.';
      return;
    }

    try {
      await complaintService.markAsDuplicate(selectedComplaint.id, targetCode || undefined, {
        id: user.uid,
        email: user.email,
        name: user.displayName
      });
      actionSuccessMsg = targetCode ? `Ditandai duplikat dari tiket ${targetCode}` : 'Batal tandai duplikat';
      await refreshCurrentComplaint(selectedComplaint.id);
    } catch (err: unknown) {
      actionErrorMsg = errorMessage(err, 'Gagal memproses link duplikat.');
    }
  }

  function requestDeleteComplaint(id: string, ticketNumber: string) {
    deleteComplaintTarget = { id, ticketNumber };
  }

  async function confirmDeleteComplaint() {
    const target = deleteComplaintTarget;
    const user = authStore.user;
    if (!target || !user) return;
    isDeleting = true;
    try {
      await complaintService.deleteComplaint(target.id, {
        id: user.uid,
        email: user.email,
        name: user.displayName
      });
      deleteComplaintTarget = null;
      modalOpen = false;
      selectedComplaint = null;
      await loadComplaints();
    } catch (err: unknown) {
      actionErrorMsg = errorMessage(err, 'Gagal menghapus pengaduan.');
    } finally {
      isDeleting = false;
    }
  }

  // --- CONFIGURATION SETTINGS ACTIONS ---
  function handleAddCategory() {
    settingsSuccessMsg = '';
    settingsErrorMsg = '';
    const name = newCategoryName.trim();
    if (!name) return;

    if (categories.includes(name)) {
      settingsErrorMsg = 'Kategori sudah terdaftar.';
      return;
    }

    const updated = [...categories, name];
    try {
      complaintService.saveCategories(updated);
      categories = updated;
      newCategoryName = '';
      settingsSuccessMsg = `Kategori '${name}' berhasil ditambahkan.`;

      // log to audit
      const user = authStore.user;
      auditService.recordLog({
        userId: user?.uid || 'system',
        userEmail: user?.email || 'system',
        userName: user?.displayName || 'System Admin',
        action: 'UPDATE',
        module: 'COMPLAINTS',
        targetId: 'categories-settings',
        targetName: 'Categories',
        description: `Menambahkan kategori pengaduan baru: ${name}`
      });
    } catch (err: unknown) {
      settingsErrorMsg = errorMessage(err, 'Gagal menyimpan kategori.');
    }
  }

  function requestDeleteCategory(catToDelete: string) {
    settingsSuccessMsg = '';
    settingsErrorMsg = '';
    deleteCategoryTarget = catToDelete;
  }

  function confirmDeleteCategory() {
    const catToDelete = deleteCategoryTarget;
    if (!catToDelete) return;

    const updated = categories.filter(c => c !== catToDelete);
    try {
      complaintService.saveCategories(updated);
      categories = updated;
      settingsSuccessMsg = `Kategori '${catToDelete}' berhasil dihapus.`;

      const user = authStore.user;
      auditService.recordLog({
        userId: user?.uid || 'system',
        userEmail: user?.email || 'system',
        userName: user?.displayName || 'System Admin',
        action: 'UPDATE',
        module: 'COMPLAINTS',
        targetId: 'categories-settings',
        targetName: 'Categories',
        description: `Menghapus kategori pengaduan: ${catToDelete}`
      });
    } catch (err: unknown) {
      settingsErrorMsg = errorMessage(err, 'Gagal menghapus kategori.');
    } finally {
      deleteCategoryTarget = null;
    }
  }

  function handleSaveSLA(responseDays: number, resolutionDays: number) {
    settingsSuccessMsg = '';
    settingsErrorMsg = '';
    if (responseDays < 1 || resolutionDays < 1) {
      settingsErrorMsg = 'Batas waktu SLA harus minimal 1 hari.';
      return;
    }

    try {
      complaintService.saveSLASettings({ responseDays, resolutionDays });
      slaSettings = { responseDays, resolutionDays };
      settingsSuccessMsg = 'Standar parameter SLA berhasil disimpan.';

      const user = authStore.user;
      auditService.recordLog({
        userId: user?.uid || 'system',
        userEmail: user?.email || 'system',
        userName: user?.displayName || 'System Admin',
        action: 'UPDATE',
        module: 'COMPLAINTS',
        targetId: 'sla-settings',
        targetName: 'SLA',
        description: `Mengubah SLA Pengaduan: Respons ${responseDays} hari, Resolusi ${resolutionDays} hari`
      });
    } catch (err: unknown) {
      settingsErrorMsg = errorMessage(err, 'Gagal menyimpan SLA.');
    }
  }

  function handleSaveSLAClick() {
    const resp = parseInt((document.getElementById('responseDaysInput') as HTMLInputElement).value) || 1;
    const reso = parseInt((document.getElementById('resolutionDaysInput') as HTMLInputElement).value) || 5;
    handleSaveSLA(resp, reso);
  }

  function handleToggleTypeEnabled(t: ComplaintType) {
    settingsSuccessMsg = '';
    settingsErrorMsg = '';
    let updated: ComplaintType[] = [];
    if (enabledTypes.includes(t)) {
      if (enabledTypes.length <= 1) {
        settingsErrorMsg = 'Minimal satu tipe penyampaian harus tetap aktif.';
        return;
      }
      updated = enabledTypes.filter(x => x !== t);
    } else {
      updated = [...enabledTypes, t];
    }

    try {
      complaintService.saveEnabledTypes(updated);
      enabledTypes = updated;
      settingsSuccessMsg = 'Pengaturan tipe penyampaian berhasil diubah.';

      const user = authStore.user;
      auditService.recordLog({
        userId: user?.uid || 'system',
        userEmail: user?.email || 'system',
        userName: user?.displayName || 'System Admin',
        action: 'UPDATE',
        module: 'COMPLAINTS',
        targetId: 'types-settings',
        targetName: 'Submission Types',
        description: `Mengubah ketersediaan tipe pengaduan publik menjadi: ${updated.join(', ')}`
      });
    } catch (err: unknown) {
      settingsErrorMsg = errorMessage(err, 'Gagal menyimpan konfigurasi tipe.');
    }
  }

  // --- STATS CALCULATIONS ---
  const countByStatus = (st: ComplaintStatus) => complaints.filter(c => c.status === st).length;
  const totalCount = $derived(complaints.length);

  const getOverdueComplaintsCount = () => {
    return complaints.filter(c => {
      const isResolved = c.status === 'completed' || c.status === 'closed' || c.status === 'rejected';
      if (isResolved) return false;
      if (!c.targetResolutionTime) return false;
      return new Date().getTime() > new Date(c.targetResolutionTime).getTime();
    }).length;
  };

  // Chart data (converted from JSX IIFEs)
  const slaChartData = $derived((() => {
    const overdue = getOverdueComplaintsCount();
    const resolved = countByStatus('completed') + countByStatus('closed') + countByStatus('rejected');
    const activeOnTrack = totalCount - overdue - resolved;

    const totalActive = overdue + activeOnTrack;
    const onTrackPct = totalActive > 0 ? Math.round((activeOnTrack / totalActive) * 100) : 100;
    const overduePct = totalActive > 0 ? 100 - onTrackPct : 0;

    return { overdue, activeOnTrack, onTrackPct, overduePct };
  })());

  const ratingData = $derived((() => {
    const ratedComplaints = complaints.filter(c => typeof c.satisfactionRating === 'number');
    const avgRating = ratedComplaints.length > 0
      ? (ratedComplaints.reduce((acc, c) => acc + (c.satisfactionRating || 0), 0) / ratedComplaints.length).toFixed(1)
      : 'N/A';
    return { ratedComplaints, avgRating };
  })());

  const typeDistributionItems = [
    { type: 'pengaduan', label: 'Pengaduan', color: 'bg-rose-500' },
    { type: 'kritik', label: 'Kritik', color: 'bg-[var(--color-primary)]' },
    { type: 'saran', label: 'Saran', color: 'bg-sky-400' },
    { type: 'apresiasi', label: 'Apresiasi', color: 'bg-[var(--color-primary)]' },
    { type: 'informasi', label: 'Informasi', color: 'bg-purple-500' }
  ];

  const typeToggleItems = [
    { id: 'pengaduan', label: 'Pengaduan (Keluhan Pelayanan)', desc: 'Menuntut tindak lanjut perbaikan formal' },
    { id: 'kritik', label: 'Kritik Konstruktif', desc: 'Evaluasi kritis terhadap personil / prosedur' },
    { id: 'saran', label: 'Saran & Masukan', desc: 'Ide / usul inovatif peningkatan mutu' },
    { id: 'apresiasi', label: 'Apresiasi & Terima Kasih', desc: 'Umpan balik positif bagi motivasi tim' },
    { id: 'informasi', label: 'Permintaan Informasi Publik', desc: 'Pertanyaan terkait alur, jadwal, atau berkas' }
  ];

  // --- RENDERING HELPERS ---
  function getTypeInfo(t: ComplaintType): { variant: BadgeTone; label: string } {
    switch (t) {
      case 'pengaduan': return { variant: 'rose', label: 'Pengaduan' };
      case 'kritik': return { variant: 'amber', label: 'Kritik' };
      case 'saran': return { variant: 'sky', label: 'Saran' };
      case 'apresiasi': return { variant: 'emerald', label: 'Apresiasi' };
      case 'informasi': return { variant: 'purple', label: 'Informasi' };
      default: return { variant: 'zinc', label: t };
    }
  }

  function getStatusInfo(st: ComplaintStatus): { variant: BadgeTone; label: string } {
    switch (st) {
      case 'new': return { variant: 'sky', label: 'Diterima' };
      case 'verified': return { variant: 'purple', label: 'Diverifikasi' };
      case 'assigned': return { variant: 'blue', label: 'Ditugaskan' };
      case 'processing': return { variant: 'amber', label: 'Diproses' };
      case 'pending_info': return { variant: 'zinc', label: 'Butuh Info' };
      case 'completed': return { variant: 'emerald', label: 'Selesai' };
      case 'closed': return { variant: 'zinc', label: 'Ditutup' };
      case 'rejected': return { variant: 'rose', label: 'Ditolak' };
      default: return { variant: 'zinc', label: st };
    }
  }

  function getStatusLabel(st: ComplaintStatus): string {
    return getStatusInfo(st).label;
  }

  function getPriorityInfo(p: ComplaintPriority): { variant: BadgeTone; label: string } {
    switch (p) {
      case 'urgent': return { variant: 'rose', label: 'Mendesak' };
      case 'high': return { variant: 'amber', label: 'Tinggi' };
      case 'normal': return { variant: 'slate', label: 'Normal' };
      case 'low': return { variant: 'zinc', label: 'Rendah' };
      default: return { variant: 'zinc', label: p };
    }
  }

  function getPriorityLabel(p: ComplaintPriority): string {
    return getPriorityInfo(p).label;
  }

  // Pagination calculation
  const totalPages = $derived(Math.ceil(complaints.length / itemsPerPage));
  const paginatedComplaints = $derived(complaints.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  ));
</script>

<div class="space-y-6">

  <!-- Header Block -->
  <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-5">
    <div>
      <span class="text-[10px] font-bold uppercase tracking-widest text-[var(--color-primary)]">Masyarakat & Kehumasan</span>
      <h1 class="text-2xl font-light text-[var(--color-text)] tracking-tight">Pengelolaan Pengaduan & Aspirasi (SkaDuan)</h1>
    </div>

    <div class="flex items-center gap-2">
      <button
        onclick={() => (activeTab = 'directory')}
        class={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
          activeTab === 'directory'
            ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow-lg shadow-[var(--color-primary)]/20'
            : 'bg-[var(--color-card)] text-[var(--color-muted-foreground)] hover:text-[var(--color-text)] border border-[var(--color-border)]'
        }`}
      >
        <BarChart3 class="w-4 h-4" />
        <span>Daftar Laporan & Statistik</span>
      </button>
      {#if authStore.hasPermission('manage_site_settings')}
        <button
          onclick={() => (activeTab = 'settings')}
          class={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            activeTab === 'settings'
              ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow-lg shadow-[var(--color-primary)]/20'
              : 'bg-[var(--color-card)] text-[var(--color-muted-foreground)] hover:text-[var(--color-text)] border border-[var(--color-border)]'
          }`}
        >
          <Settings class="w-4 h-4" />
          <span>Konfigurasi SLA & Kategori</span>
        </button>
      {/if}
    </div>
  </div>

  {#if activeTab === 'directory'}
    <!-- WORKSPACE 1: DIRECTORY & ANALYTICS WORKSPACE -->
    <div class="space-y-6 animate-fadeIn">

      <!-- Telemetry Indicator Cards - 2 Rows -->
      <div class="space-y-4">
        <!-- Row 1: 4 Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        <!-- Card 1: Total -->
        <Card class="p-4 flex flex-col justify-between h-32 hover:border-[var(--color-primary)]/50 transition group shadow-sm" id="metric-card-total">
          <div class="flex justify-between items-start gap-2">
            <div class="min-w-0">
              <p class="text-[10px] font-bold text-[var(--color-muted-foreground)] uppercase tracking-wide truncate">Total Masukan</p>
              <h2 class="text-2xl font-black text-[var(--color-text)] font-mono mt-1 group-hover:text-[var(--color-primary)] transition">{totalCount}</h2>
            </div>
            <div class="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center shrink-0 group-hover:scale-105 transition">
              <MessageSquare class="w-5 h-5" />
            </div>
          </div>
          <div class="text-[10px] font-bold border-t border-[var(--color-border)] pt-2 text-[var(--color-muted-foreground)]">
            <span class="bg-[var(--color-card)] px-2 py-0.5 rounded-lg border border-[var(--color-border)]">Kumulatif</span>
          </div>
        </Card>

        <!-- Card 2: New -->
        <Card class="p-4 flex flex-col justify-between h-32 hover:border-sky-500/50 transition group shadow-sm" id="metric-card-new">
          <div class="flex justify-between items-start gap-2">
            <div class="min-w-0">
              <p class="text-[10px] font-bold text-[var(--color-muted-foreground)] uppercase tracking-wide truncate">Baru (Antrean)</p>
              <h2 class="text-2xl font-black text-sky-500 font-mono mt-1">{countByStatus('new')}</h2>
            </div>
            <div class="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
              <Clock class="w-5 h-5" />
            </div>
          </div>
          <div class="text-[10px] font-bold border-t border-[var(--color-border)] pt-2 text-sky-600">
            <span class="bg-sky-50 px-2 py-0.5 rounded-lg border border-sky-100">Verifikasi</span>
          </div>
        </Card>

        <!-- Card 3: Verified -->
        <Card class="p-4 flex flex-col justify-between h-32 hover:border-purple-500/50 transition group shadow-sm" id="metric-card-verified">
          <div class="flex justify-between items-start gap-2">
            <div class="min-w-0">
              <p class="text-[10px] font-bold text-[var(--color-muted-foreground)] uppercase tracking-wide truncate">Diverifikasi</p>
              <h2 class="text-2xl font-black text-purple-500 font-mono mt-1">{countByStatus('verified')}</h2>
            </div>
            <div class="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
              <ShieldCheck class="w-5 h-5" />
            </div>
          </div>
          <div class="text-[10px] font-bold border-t border-[var(--color-border)] pt-2 text-purple-600">
            <span class="bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-100">Delegasi</span>
          </div>
        </Card>

        <!-- Card 4: Processing -->
        <Card class="p-4 flex flex-col justify-between h-32 hover:border-[var(--color-primary)]/50 transition group shadow-sm" id="metric-card-processing">
          <div class="flex justify-between items-start gap-2">
            <div class="min-w-0">
              <p class="text-[10px] font-bold text-[var(--color-muted-foreground)] uppercase tracking-wide truncate">Diproses</p>
              <h2 class="text-2xl font-black text-[var(--color-primary)] font-mono mt-1">
                {countByStatus('assigned') + countByStatus('processing')}
              </h2>
            </div>
            <div class="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center shrink-0 group-hover:scale-105 transition">
              <Activity class="w-5 h-5" />
            </div>
          </div>
          <div class="text-[10px] font-bold border-t border-[var(--color-border)] pt-2 text-[var(--color-primary)]">
            <span class="bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100">Aktif</span>
          </div>
        </Card>

        </div>

        <!-- Row 2: 3 Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-4">

        <!-- Card 5: Pending Info -->
        <Card class="p-4 flex flex-col justify-between h-32 hover:border-zinc-500/50 transition group shadow-sm" id="metric-card-pending">
          <div class="flex justify-between items-start gap-2">
            <div class="min-w-0">
              <p class="text-[10px] font-bold text-[var(--color-muted-foreground)] uppercase tracking-wide truncate">Butuh Info</p>
              <h2 class="text-2xl font-black text-[var(--color-muted-foreground)] font-mono mt-1">{countByStatus('pending_info')}</h2>
            </div>
            <div class="w-10 h-10 rounded-xl bg-zinc-500/10 text-[var(--color-muted-foreground)] flex items-center justify-center shrink-0 group-hover:scale-105 transition">
              <HelpCircle class="w-5 h-5" />
            </div>
          </div>
          <div class="text-[10px] font-bold border-t border-[var(--color-border)] pt-2 text-[var(--color-muted-foreground)]">
            <span class="bg-[var(--color-card)] px-2 py-0.5 rounded-lg border border-[var(--color-border)]">Menanti</span>
          </div>
        </Card>

        <!-- Card 6: Completed/Closed -->
        <Card class="p-4 flex flex-col justify-between h-32 hover:border-emerald-500/50 transition group shadow-sm" id="metric-card-completed">
          <div class="flex justify-between items-start gap-2">
            <div class="min-w-0">
              <p class="text-[10px] font-bold text-[var(--color-muted-foreground)] uppercase tracking-wide truncate">Selesai / Tutup</p>
              <h2 class="text-2xl font-black text-emerald-600 font-mono mt-1">
                {countByStatus('completed') + countByStatus('closed')}
              </h2>
            </div>
            <div class="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
              <CheckCircle2 class="w-5 h-5" />
            </div>
          </div>
          <div class="text-[10px] font-bold border-t border-[var(--color-border)] pt-2 text-emerald-600">
            <span class="bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">Solusi</span>
          </div>
        </Card>

        <!-- Card 7: Overdue SLA -->
        <Card class="p-4 flex flex-col justify-between h-32 hover:border-rose-500/50 transition group shadow-sm" id="metric-card-overdue">
          <div class="flex justify-between items-start gap-2">
            <div class="min-w-0">
              <p class="text-[10px] font-bold text-rose-500 uppercase tracking-wide truncate">Melewati SLA</p>
              <h2 class="text-2xl font-black text-rose-600 font-mono mt-1">{getOverdueComplaintsCount()}</h2>
            </div>
            <div class="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition animate-pulse">
              <AlertTriangle class="w-5 h-5" />
            </div>
          </div>
          <div class="text-[10px] font-bold border-t border-[var(--color-border)] pt-2 text-rose-600">
            <span class="bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-100 animate-pulse">Terlampaui</span>
          </div>
        </Card>

        </div>
      </div>

      <!-- EXPANDABLE TELEMETRY CHARTS (SVG BASED) -->
      <Card class="p-6">
        <div class="flex items-center justify-between border-b border-[var(--color-border)] pb-3 mb-4">
          <h3 class="text-sm font-bold text-[var(--color-text)] flex items-center gap-1.5">
            <BarChart3 class="text-[var(--color-primary)] w-4 h-4" /> Visualisasi Distribusi Pengaduan & SLA
          </h3>
          <span class="text-[10px] text-[var(--color-muted-foreground)] italic">Interaktif & Terkini</span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">

          <!-- Chart 1: SLA Compliance -->
          <div class="space-y-2">
            <span class="text-[11px] font-bold uppercase text-[var(--color-muted-foreground)] block text-center">Ketepatan Batas Waktu (SLA)</span>
            <div class="h-44 bg-[var(--color-bg)] rounded-2xl p-4 border border-[var(--color-border)] flex flex-col justify-center space-y-4">
              <div class="space-y-3">
                <div class="flex items-center justify-between text-xs font-semibold text-[var(--color-text)]">
                  <span>Sesuai SLA ({slaChartData.activeOnTrack} Tiket)</span>
                  <span class="text-[var(--color-primary)]">{slaChartData.onTrackPct}%</span>
                </div>
                <div class="w-full h-3 bg-[var(--color-surface)] rounded-full overflow-hidden flex">
                  <div class="bg-[var(--color-primary)] h-full" style={`width: ${slaChartData.onTrackPct}%`}></div>
                  <div class="bg-rose-500 h-full" style={`width: ${slaChartData.overduePct}%`}></div>
                </div>
                <div class="flex items-center justify-between text-xs font-semibold text-[var(--color-text)]">
                  <span>Melewati SLA ({slaChartData.overdue} Tiket)</span>
                  <span class="text-rose-400">{slaChartData.overduePct}%</span>
                </div>
                <p class="text-[10px] text-[var(--color-muted-foreground)] text-center italic">Perhitungan berdasarkan target estimasi hari kerja.</p>
              </div>
            </div>
          </div>

          <!-- Chart 2: Distribution by Type -->
          <div class="space-y-2">
            <span class="text-[11px] font-bold uppercase text-[var(--color-muted-foreground)] block text-center">Distribusi Tipe Masukan</span>
            <div class="h-44 bg-[var(--color-bg)] rounded-2xl p-4 border border-[var(--color-border)] flex flex-col justify-center space-y-3 text-xs">
              {#each typeDistributionItems as item (item.type)}
                {@const count = complaints.filter(c => c.type === item.type).length}
                {@const pct = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0}
                <div class="space-y-1">
                  <div class="flex justify-between text-[10px] text-[var(--color-muted-foreground)]">
                    <span class="font-medium">{item.label} ({count})</span>
                    <span class="font-mono">{pct}%</span>
                  </div>
                  <div class="w-full h-1.5 bg-[var(--color-surface)] rounded-full overflow-hidden">
                    <div class={`${item.color} h-full`} style={`width: ${pct}%`}></div>
                  </div>
                </div>
              {/each}
            </div>
          </div>

          <!-- Chart 3: Average Rating (Evaluasi) -->
          <div class="space-y-2">
            <span class="text-[11px] font-bold uppercase text-[var(--color-muted-foreground)] block text-center">Hasil Penilaian Masyarakat (Survey)</span>
            <div class="h-44 bg-[var(--color-bg)] rounded-2xl p-4 border border-[var(--color-border)] flex flex-col justify-center items-center space-y-2">
              <div class="text-center space-y-1">
                <div class="text-3xl font-light font-mono text-[var(--color-primary)]">{ratingData.avgRating}</div>
                <div class="flex items-center justify-center gap-0.5">
                  {#each [1, 2, 3, 4, 5] as star (star)}
                    {@const score = Number(ratingData.avgRating) || 0}
                    <Star class={`w-4 h-4 ${star <= score ? 'text-[var(--color-primary)] fill-[var(--color-primary)]' : 'text-zinc-700'}`} />
                  {/each}
                </div>
                <p class="text-[11px] text-[var(--color-muted-foreground)] font-medium">Dari {ratingData.ratedComplaints.length} ulasan pelapor</p>
                <p class="text-[9px] text-[var(--color-muted-foreground)]">Terhitung pasca status tiket diselesaikan.</p>
              </div>
            </div>
          </div>

        </div>
      </Card>

      <!-- FILTER CONSOLE -->
      <Card class="p-6 space-y-4">
        <div class="flex items-center gap-2 border-b border-[var(--color-border)] pb-3">
          <Filter class="w-4 h-4 text-[var(--color-primary)]" />
          <h3 class="text-xs font-bold uppercase tracking-wider text-[var(--color-text)]">Konsol Penyaringan Laporan</h3>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">

          <!-- Filter Search keyword -->
          <div class="space-y-1">
            <label class="text-[10px] font-bold uppercase text-[var(--color-muted-foreground)]">Kata Kunci</label>
            <div class="relative">
              <Search class="absolute left-3 top-2.5 w-3.5 h-3.5 text-[var(--color-muted-foreground)]" />
              <input
                type="text"
                bind:value={search}
                placeholder="Cari tiket, judul, nama..."
                class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)]/70 focus:outline-none rounded-xl pl-9 pr-3 py-2 text-xs text-[var(--color-text)]"
              />
            </div>
          </div>

          <!-- Filter Status -->
          <div class="space-y-1">
            <label class="text-[10px] font-bold uppercase text-[var(--color-muted-foreground)]">Status Tindak Lanjut</label>
            <select
              bind:value={statusFilter}
              class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)]/70 focus:outline-none rounded-xl p-2 text-xs text-[var(--color-text)]"
            >
              <option value="">-- Semua Status --</option>
              <option value="new">Diterima (Baru)</option>
              <option value="verified">Diverifikasi</option>
              <option value="assigned">Ditugaskan</option>
              <option value="processing">Diproses</option>
              <option value="pending_info">Butuh Info</option>
              <option value="completed">Selesai</option>
              <option value="closed">Ditutup</option>
              <option value="rejected">Ditolak</option>
            </select>
          </div>

          <!-- Filter Type -->
          <div class="space-y-1">
            <label class="text-[10px] font-bold uppercase text-[var(--color-muted-foreground)]">Tipe Masukan</label>
            <select
              bind:value={typeFilter}
              class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)]/70 focus:outline-none rounded-xl p-2 text-xs text-[var(--color-text)]"
            >
              <option value="">-- Semua Tipe --</option>
              <option value="pengaduan">Pengaduan</option>
              <option value="kritik">Kritik</option>
              <option value="saran">Saran</option>
              <option value="apresiasi">Apresiasi</option>
              <option value="informasi">Informasi</option>
            </select>
          </div>

          <!-- Filter Priority -->
          <div class="space-y-1">
            <label class="text-[10px] font-bold uppercase text-[var(--color-muted-foreground)]">Derajat Prioritas</label>
            <select
              bind:value={priorityFilter}
              class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)]/70 focus:outline-none rounded-xl p-2 text-xs text-[var(--color-text)]"
            >
              <option value="">-- Semua Prioritas --</option>
              <option value="urgent">Mendesak (Urgent)</option>
              <option value="high">Tinggi</option>
              <option value="normal">Normal</option>
              <option value="low">Rendah</option>
            </select>
          </div>

          <!-- Filter Category -->
          <div class="space-y-1">
            <label class="text-[10px] font-bold uppercase text-[var(--color-muted-foreground)]">Kategori Topik</label>
            <select
              bind:value={categoryFilter}
              class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)]/70 focus:outline-none rounded-xl p-2 text-xs text-[var(--color-text)]"
            >
              <option value="">-- Semua Kategori --</option>
              {#each categories as cat (cat)}
                <option value={cat}>{cat}</option>
              {/each}
            </select>
          </div>

          <!-- Filter Unit / Poli -->
          <div class="space-y-1">
            <label class="text-[10px] font-bold uppercase text-[var(--color-muted-foreground)]">Unit / Poli Terkait</label>
            <select
              bind:value={serviceFilter}
              class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)]/70 focus:outline-none rounded-xl p-2 text-xs text-[var(--color-text)]"
            >
              <option value="">-- Semua Unit --</option>
              {#each services as srv (srv.id)}
                <option value={srv.id}>{srv.name}</option>
              {/each}
            </select>
          </div>

          <!-- Filter SLA Overdue status -->
          <div class="space-y-1">
            <label class="text-[10px] font-bold uppercase text-[var(--color-muted-foreground)]">Status SLA Layanan</label>
            <select
              bind:value={slaFilter}
              class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)]/70 focus:outline-none rounded-xl p-2 text-xs text-[var(--color-text)]"
            >
              <option value="all">Semua SLA</option>
              <option value="overdue">MELEWATI SLA (Terlambat)</option>
              <option value="ontrack">Sesuai SLA / On Track</option>
            </select>
          </div>

          <!-- Filter Tanggal Mulai -->
          <div class="space-y-1">
            <label class="text-[10px] font-bold uppercase text-[var(--color-muted-foreground)]">Mulai Tanggal</label>
            <input
              type="date"
              bind:value={startDate}
              class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)]/70 focus:outline-none rounded-xl p-1.5 text-xs text-[var(--color-text)]"
            />
          </div>

          <!-- Filter Tanggal Akhir -->
          <div class="space-y-1">
            <label class="text-[10px] font-bold uppercase text-[var(--color-muted-foreground)]">Sampai Tanggal</label>
            <input
              type="date"
              bind:value={endDate}
              class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)]/70 focus:outline-none rounded-xl p-1.5 text-xs text-[var(--color-text)]"
            />
          </div>

          <!-- Reset Filters -->
          <div class="flex items-end">
            <button
              type="button"
              onclick={handleResetFilter}
              class="w-full py-2.5 border border-[var(--color-border)] hover:border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-muted-foreground)] hover:text-[var(--color-text)] rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5"
            >
              <RotateCcw class="w-3.5 h-3.5" />
              <span>Reset Filter</span>
            </button>
          </div>

        </div>
      </Card>

      <!-- MAIN DIRECTORY DATA TABLE -->
      <Card class="overflow-hidden border border-[var(--color-border)]">
        {#if loading}
          <LoadingSkeleton variant="list" count={6} />
        {:else}
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="bg-[var(--color-card)] border-b border-[var(--color-border)] text-[var(--color-muted-foreground)] text-[10px] uppercase font-bold tracking-wider">
                <th class="py-4 px-5">Kode Tiket</th>
                <th class="py-4 px-4">Tipe & Kategori</th>
                <th class="py-4 px-4">Judul & Unit</th>
                <th class="py-4 px-4">Pengirim</th>
                <th class="py-4 px-4">Kondisi SLA</th>
                <th class="py-4 px-4">Status</th>
                <th class="py-4 px-5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[var(--color-border)]">
              {#if paginatedComplaints.length === 0}
                <tr>
                  <td colspan={7} class="py-12 text-center text-[var(--color-muted-foreground)] italic">
                    Tidak ada data laporan masyarakat yang cocok dengan kriteria filter.
                  </td>
                </tr>
              {:else}
                {#each paginatedComplaints as c (c.id)}
                  {@const typeInfo = getTypeInfo(c.type)}
                  {@const statusInfo = getStatusInfo(c.status)}
                  {@const isResolved = c.status === 'completed' || c.status === 'closed' || c.status === 'rejected'}
                  {@const isOverdue = !isResolved && !!c.targetResolutionTime && new Date().getTime() > new Date(c.targetResolutionTime).getTime()}
                  <tr class="hover:bg-[var(--color-card)]/30 transition">
                    <td class="py-4 px-5 font-mono font-bold text-[var(--color-primary)] text-sm">{c.ticketNumber}</td>
                    <td class="py-4 px-4 space-y-1">
                      <div><Badge variant={typeInfo.variant}>{typeInfo.label}</Badge></div>
                      <span class="text-[10px] font-semibold text-[var(--color-muted-foreground)] block">{c.category || 'Lainnya'}</span>
                    </td>
                    <td class="py-4 px-4 max-w-[220px]">
                      <div class="font-bold text-[var(--color-text)] truncate text-xs" title={c.title}>
                        {c.title || (c.content.substring(0, 30) + '...')}
                      </div>
                      <span class="text-[10px] text-[var(--color-muted-foreground)] truncate block">
                        {c.serviceName || 'Tidak terkait layanan'}
                      </span>
                    </td>
                    <td class="py-4 px-4 space-y-0.5">
                      {#if c.isAnonymous}
                        <span class="text-rose-400 font-semibold flex items-center gap-1 text-[10px]">
                          <User class="w-3 h-3" /> Anonim
                        </span>
                      {:else}
                        <div class="space-y-0.5">
                          <span class="font-bold text-[var(--color-text)] block truncate max-w-[120px]">{c.senderName || 'Warga'}</span>
                          {#if c.senderPhone}
                            <span class="text-[9px] text-[var(--color-muted-foreground)] block font-mono">{c.senderPhone}</span>
                          {/if}
                        </div>
                      {/if}
                    </td>
                    <td class="py-4 px-4">
                      {#if isResolved}
                        <span class="text-[var(--color-muted-foreground)] text-[10px]">Terselesaikan</span>
                      {:else if c.targetResolutionTime}
                        <div class="space-y-0.5">
                          {#if isOverdue}
                            <span class="text-rose-400 font-bold text-[10px] flex items-center gap-1 uppercase tracking-wider animate-pulse">
                              <AlertTriangle class="w-3.5 h-3.5" /> MELEWATI SLA
                            </span>
                          {:else}
                            <span class="text-[var(--color-primary)] font-semibold text-[10px] flex items-center gap-1">
                              <Clock class="w-3 h-3" /> Sesuai SLA
                            </span>
                          {/if}
                          <span class="text-[9px] text-[var(--color-muted-foreground)] block">
                            Batas: {new Date(c.targetResolutionTime).toLocaleDateString('id-ID', {
                              day: 'numeric', month: 'short'
                            })}
                          </span>
                        </div>
                      {:else}
                        <span class="text-[var(--color-muted-foreground)]">-</span>
                      {/if}
                    </td>
                    <td class="py-4 px-4"><Badge variant={statusInfo.variant}>{statusInfo.label}</Badge></td>
                    <td class="py-4 px-5 text-right">
                      <button
                        onclick={() => openDetailModal(c)}
                        class="p-2 bg-[var(--color-card)] border border-[var(--color-border)] hover:border-[var(--color-primary)]/50 hover:text-[var(--color-text)] rounded-xl text-[var(--color-muted-foreground)] transition"
                        title="Detail Laporan & Proses Tindak Lanjut"
                      >
                        <Eye class="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                {/each}
              {/if}
            </tbody>
          </table>
        </div>

        <!-- Pagination Controls -->
        {#if totalPages > 1}
          <div class="p-4 bg-[var(--color-card)] border-t border-[var(--color-border)] flex items-center justify-between">
            <span class="text-[10px] text-[var(--color-muted-foreground)]">
              Menampilkan <strong>{paginatedComplaints.length}</strong> dari <strong>{complaints.length}</strong> laporan
            </span>
            <div class="flex gap-1">
              <button
                disabled={currentPage === 1}
                onclick={() => (currentPage = currentPage - 1)}
                class="px-3 py-1.5 bg-[var(--color-bg)] border border-[var(--color-border)] hover:border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:text-[var(--color-text)] disabled:opacity-30 disabled:pointer-events-none rounded-lg text-xs font-semibold transition"
              >
                Sebelumnya
              </button>
              <button
                disabled={currentPage === totalPages}
                onclick={() => (currentPage = currentPage + 1)}
                class="px-3 py-1.5 bg-[var(--color-bg)] border border-[var(--color-border)] hover:border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:text-[var(--color-text)] disabled:opacity-30 disabled:pointer-events-none rounded-lg text-xs font-semibold transition"
              >
                Berikutnya
              </button>
            </div>
          </div>
        {/if}
        {/if}
      </Card>

    </div>
  {:else}
    <!-- WORKSPACE 2: SETTINGS PANEL CONFIGURATION -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">

      <!-- Left Box: Categories list management -->
      <Card class="p-6 space-y-6">
        <div>
          <h3 class="text-sm font-bold text-[var(--color-text)] flex items-center gap-1.5">
            <Layers class="text-[var(--color-primary)] w-4 h-4" /> Pengelolaan Kategori Topik Laporan
          </h3>
          <p class="text-xs text-[var(--color-muted-foreground)] mt-1">
            Kategori pengaduan digunakan oleh masyarakat saat mengirimkan keluhan untuk membantu klasifikasi otomatis.
          </p>
        </div>

        <!-- Status Indicator -->
        {#if settingsSuccessMsg}
          <div class="p-3.5 bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 rounded-xl text-emerald-300 text-xs">
            {settingsSuccessMsg}
          </div>
        {/if}
        {#if settingsErrorMsg}
          <div class="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs">
            {settingsErrorMsg}
          </div>
        {/if}

        <div class="flex gap-2">
          <input
            type="text"
            bind:value={newCategoryName}
            placeholder="Kategori baru (contoh: Sarana & Prasarana)"
            class="flex-1 bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)]/70 focus:outline-none rounded-xl px-3 py-2 text-xs text-[var(--color-text)]"
          />
          <button
            type="button"
            onclick={handleAddCategory}
            disabled={!newCategoryName.trim()}
            class="px-4 py-2 bg-[var(--color-primary)] text-[var(--color-primary-foreground)] font-bold text-xs rounded-xl hover:bg-[var(--color-primary)] disabled:opacity-50 transition flex items-center gap-1"
          >
            <Plus class="w-4 h-4" />
            <span>Tambah</span>
          </button>
        </div>

        <div class="space-y-2 max-h-[250px] overflow-y-auto pr-1">
          {#each categories as cat (cat)}
            <div class="p-3 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl flex items-center justify-between">
              <span class="text-xs font-semibold text-[var(--color-text)]">{cat}</span>
              <button
                onclick={() => requestDeleteCategory(cat)}
                class="p-1.5 hover:bg-rose-500/10 text-[var(--color-muted-foreground)] hover:text-rose-400 rounded-lg transition"
                title="Hapus Kategori"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          {/each}
        </div>
      </Card>

      <!-- Right Box: SLA Settings and enabled types -->
      <div class="space-y-6">

        <!-- SLA Target parameters -->
        <Card class="p-6 space-y-4">
          <div>
            <h3 class="text-sm font-bold text-[var(--color-text)] flex items-center gap-1.5">
              <Clock class="text-[var(--color-primary)] w-4 h-4" /> Parameter Durasi Penyelesaian (SLA)
            </h3>
            <p class="text-xs text-[var(--color-muted-foreground)] mt-1">
              Durasi estimasi standar operasional penanganan (dalam hari kalender) untuk tanggapan awal dan solusi.
            </p>
          </div>

          <div class="grid grid-cols-2 gap-4 pt-2">
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-[var(--color-muted-foreground)] uppercase tracking-wider block">Batas Tanggapan Awal (Hari)</label>
              <input
                type="number"
                min={1}
                value={slaSettings.responseDays}
                id="responseDaysInput"
                class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)]/70 focus:outline-none rounded-xl p-2.5 text-xs text-[var(--color-text)]"
              />
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-[var(--color-muted-foreground)] uppercase tracking-wider block">Batas Solusi Akhir (Hari)</label>
              <input
                type="number"
                min={1}
                value={slaSettings.resolutionDays}
                id="resolutionDaysInput"
                class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)]/70 focus:outline-none rounded-xl p-2.5 text-xs text-[var(--color-text)]"
              />
            </div>
          </div>

          <button
            type="button"
            onclick={handleSaveSLAClick}
            class="px-4 py-2 bg-[var(--color-primary)] text-[var(--color-primary-foreground)] font-bold text-xs rounded-xl hover:bg-[var(--color-primary)] transition"
          >
            Simpan Batas SLA
          </button>
        </Card>

        <!-- Submission Type Activation switches -->
        <Card class="p-6 space-y-4">
          <div>
            <h3 class="text-sm font-bold text-[var(--color-text)] flex items-center gap-1.5">
              <Sliders class="text-[var(--color-primary)] w-4 h-4" /> Aktivasi Tipe Penyampaian Publik
            </h3>
            <p class="text-xs text-[var(--color-muted-foreground)] mt-1">
              Atur jenis atau tipe masukan yang diizinkan untuk dikirim oleh masyarakat umum melalui portal publik.
            </p>
          </div>

          <div class="space-y-3 pt-2">
            {#each typeToggleItems as item (item.id)}
              {@const isActive = enabledTypes.includes(item.id as ComplaintType)}
              <label class="flex items-start gap-3 p-3 bg-[var(--color-bg)] border border-[var(--color-border)] hover:border-[var(--color-border)] rounded-xl cursor-pointer select-none transition">
                <input
                  type="checkbox"
                  checked={isActive}
                  onchange={() => handleToggleTypeEnabled(item.id as ComplaintType)}
                  class="w-4 h-4 rounded border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] focus:ring-offset-0 mt-0.5 animate-none"
                />
                <div class="space-y-0.5">
                  <span class="text-xs font-bold text-[var(--color-text)] block">{item.label}</span>
                  <span class="text-[10px] text-[var(--color-muted-foreground)] block">{item.desc}</span>
                </div>
              </label>
            {/each}
          </div>
        </Card>

      </div>

    </div>
  {/if}

</div>

<!-- DETAIL VIEW & WORKFLOW EXECUTION MODAL -->
{#if selectedComplaint}
  {@const selTypeInfo = getTypeInfo(selectedComplaint.type)}
  {@const selStatusInfo = getStatusInfo(selectedComplaint.status)}
  <Modal
    isOpen={modalOpen}
    onClose={() => (modalOpen = false)}
    title={`Detail Penanganan Tiket: ${selectedComplaint.ticketNumber}`}
    size="xl"
  >
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 max-h-[80vh] overflow-y-auto p-1 font-sans">

      <!-- Modal Left side - Ticket metadata details and communications -->
      <div class="lg:col-span-8 space-y-6">

        <!-- Core metadata card -->
        <div class="p-5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl space-y-4">

          <!-- Header title -->
          <div class="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] pb-3">
            <div>
              <span class="text-[10px] text-[var(--color-muted-foreground)] uppercase font-bold">Judul Penyampaian</span>
              <h3 class="text-base font-bold text-[var(--color-text)]">{selectedComplaint.title || 'Laporan Tanpa Judul'}</h3>
            </div>
            <div class="flex items-center gap-1.5">
              <Badge variant={selTypeInfo.variant}>{selTypeInfo.label}</Badge>
              <Badge variant={selStatusInfo.variant}>{selStatusInfo.label}</Badge>
            </div>
          </div>

          <!-- Grid details -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span class="text-[var(--color-muted-foreground)] block text-[10px] uppercase font-bold">Kategori</span>
              <span class="text-[var(--color-text)] font-semibold">{selectedComplaint.category || 'Lainnya'}</span>
            </div>

            <div>
              <span class="text-[var(--color-muted-foreground)] block text-[10px] uppercase font-bold">Waktu Masuk</span>
              <span class="text-[var(--color-text)] font-medium">
                {new Date(selectedComplaint.createdAt).toLocaleDateString('id-ID', {
                  day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                })} WIB
              </span>
            </div>

            <div>
              <span class="text-[var(--color-muted-foreground)] block text-[10px] uppercase font-bold">Layanan Terkait</span>
              <span class="text-[var(--color-text)] font-medium">{selectedComplaint.serviceName || 'Tidak terkait layanan tertentu'}</span>
            </div>

            <div>
              <span class="text-[var(--color-muted-foreground)] block text-[10px] uppercase font-bold">Unit / Poliklinik</span>
              <span class="text-[var(--color-text)] font-medium">{selectedComplaint.unitName || '-'}</span>
            </div>

            <div>
              <span class="text-[var(--color-muted-foreground)] block text-[10px] uppercase font-bold">Lokasi / Ruangan</span>
              <span class="text-[var(--color-text)] font-medium">{selectedComplaint.locationName || '-'}</span>
            </div>

            <div>
              <span class="text-[var(--color-muted-foreground)] block text-[10px] uppercase font-bold">Tanggal Kejadian</span>
              <span class="text-[var(--color-text)] font-medium">
                {selectedComplaint.occurrenceDate ? new Date(selectedComplaint.occurrenceDate).toLocaleDateString('id-ID', {
                  day: 'numeric', month: 'long', year: 'numeric'
                }) : '-'}
              </span>
            </div>
          </div>

          <!-- Content text -->
          <div class="space-y-1.5 pt-3 border-t border-[var(--color-border)]">
            <span class="text-[var(--color-muted-foreground)] block text-[10px] uppercase font-bold">Isi Penyampaian</span>
            <div class="p-4 bg-[var(--color-card)] rounded-xl text-[var(--color-text)] leading-relaxed italic border border-[var(--color-border)] whitespace-pre-line text-xs">
              "{selectedComplaint.content}"
            </div>
          </div>

          <!-- Attachment files -->
          {#if selectedComplaint.attachment}
            <div class="space-y-1.5 pt-2">
              <span class="text-[var(--color-muted-foreground)] block text-[10px] uppercase font-bold">Lampiran Berkas Pendukung</span>
              <div class="flex items-center justify-between p-3 bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl text-xs max-w-sm">
                <div class="flex items-center gap-2.5 truncate">
                  <Paperclip class="w-4 h-4 text-[var(--color-primary)] shrink-0" />
                  <span class="text-[var(--color-text)] font-mono truncate" title={selectedComplaint.attachment.fileName}>
                    {selectedComplaint.attachment.fileName}
                  </span>
                </div>
                <a
                  href={selectedComplaint.attachment.fileUrl}
                  download={selectedComplaint.attachment.fileName}
                  target="_blank"
                  rel="noreferrer"
                  class="text-[var(--color-primary)] hover:text-[var(--color-primary)] font-bold shrink-0 flex items-center gap-1 ml-4"
                >
                  <Download class="w-3.5 h-3.5" />
                  <span>Unduh</span>
                </a>
              </div>
            </div>
          {/if}
        </div>

        <!-- PUBLIC DISCLOSURES / LOG RESPONSES -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <h4 class="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)] flex items-center gap-1.5">
              <ShieldCheck class="w-4 h-4" /> Tanggapan Publik (Terbuka untuk Pelapor)
            </h4>
            <span class="text-[10px] text-[var(--color-muted-foreground)]">Tanggapan Resmi Instansi</span>
          </div>

          <div class="space-y-3">
            {#if !selectedComplaint.publicResponses || selectedComplaint.publicResponses.length === 0}
              <div class="p-4 bg-[var(--color-primary)]/5 border border-dashed border-[var(--color-primary)]/20 rounded-xl text-center text-[var(--color-muted-foreground)] text-xs italic">
                Belum ada tanggapan publik resmi yang dikirimkan.
              </div>
            {:else}
              {#each selectedComplaint.publicResponses as res (res.id)}
                <div class="p-4 bg-[var(--color-bg)] border-l-2 border-[var(--color-primary)] rounded-r-xl space-y-1 text-xs">
                  <div class="flex items-center justify-between text-[10px]">
                    <span class="font-bold text-[var(--color-primary)]">{res.authorName} (Petugas)</span>
                    <span class="text-[var(--color-muted-foreground)] font-mono">
                      {new Date(res.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <p class="text-[var(--color-text)] leading-relaxed font-sans">{res.response}</p>
                </div>
              {/each}
            {/if}
          </div>

          <!-- Form to submit public response -->
          <form onsubmit={handleAddPublicResponse} class="space-y-2 pt-1.5">
            <textarea
              rows={3}
              bind:value={newPublicText}
              placeholder="Tulis tanggapan atau solusi resmi yang akan dipublikasikan ke pelapor..."
              class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)]/70 focus:outline-none rounded-xl p-3 text-xs text-[var(--color-text)]"
            ></textarea>
            <div class="flex justify-end">
              <button
                type="submit"
                disabled={isAddingPublic || !newPublicText.trim()}
                class="px-4 py-2 bg-[var(--color-primary)] text-[var(--color-primary-foreground)] font-bold text-xs rounded-xl hover:bg-[var(--color-primary)] disabled:opacity-45 transition flex items-center gap-1.5"
              >
                <span>{isAddingPublic ? 'Mengirim...' : 'Kirim Tanggapan Publik'}</span>
              </button>
            </div>
          </form>
        </div>

        <!-- STRICTLY SECURE INTERNAL NOTES (PRIVATE STAFF SCRATCHPAD) -->
        <div class="space-y-3 p-5 bg-rose-500/5 border border-rose-500/10 rounded-2xl">
          <div class="flex items-center justify-between">
            <h4 class="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
              <Shield class="w-4 h-4" /> Catatan Internal (Rahasia Pelaksana)
            </h4>
            <span class="text-[9px] font-bold text-rose-400 uppercase tracking-widest bg-rose-500/20 px-2 py-0.5 rounded">PRIVATE / STAFF ONLY</span>
          </div>

          <div class="space-y-2.5">
            {#if !selectedComplaint.internalNotes || selectedComplaint.internalNotes.length === 0}
              <div class="p-4 bg-rose-950/10 border border-dashed border-rose-500/10 rounded-xl text-center text-[var(--color-muted-foreground)] text-xs italic">
                Belum ada catatan internal rahasia untuk laporan ini.
              </div>
            {:else}
              {#each selectedComplaint.internalNotes as note (note.id)}
                <div class="p-3 bg-[var(--color-bg)] border border-rose-500/15 rounded-xl space-y-1 text-xs">
                  <div class="flex items-center justify-between text-[10px]">
                    <span class="font-bold text-rose-300">{note.authorName}</span>
                    <span class="text-[var(--color-muted-foreground)] font-mono">
                      {new Date(note.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <p class="text-[var(--color-text)] leading-relaxed italic">"{note.note}"</p>
                </div>
              {/each}
            {/if}
          </div>

          <!-- Form to submit internal note -->
          <form onsubmit={handleAddNote} class="space-y-2 pt-1.5">
            <textarea
              rows={2}
              bind:value={newNoteText}
              placeholder="Tulis catatan internal rahasia (contoh: Menunggu konfirmasi dari Kepala Bidang)..."
              class="w-full bg-[var(--color-bg)] border border-rose-500/15 focus:border-rose-500/50 focus:outline-none rounded-xl p-3 text-xs text-[var(--color-text)]"
            ></textarea>
            <div class="flex justify-end">
              <button
                type="submit"
                disabled={isAddingNote || !newNoteText.trim()}
                class="px-4 py-2 bg-rose-500 text-[var(--color-primary-foreground)] font-bold text-xs rounded-xl hover:bg-rose-400 disabled:opacity-45 transition flex items-center gap-1.5"
              >
                <span>{isAddingNote ? 'Menyimpan...' : 'Simpan Catatan Internal'}</span>
              </button>
            </div>
          </form>
        </div>

        <!-- TIMELINE OF EVENTS / AUDIT LOG -->
        <div class="space-y-3">
          <h4 class="text-xs font-bold uppercase tracking-wider text-[var(--color-muted-foreground)] flex items-center gap-1.5">
            <FileText class="w-4 h-4" /> Log Perjalanan Audit (System Audit Trail)
          </h4>
          <div class="space-y-2 max-h-[140px] overflow-y-auto bg-[var(--color-bg)] border border-[var(--color-border)] p-4 rounded-xl text-[11px]">
            {#if complaintAuditLogs.length === 0}
              <p class="text-[var(--color-muted-foreground)] italic text-center py-2">Belum ada catatan log aktivitas audit.</p>
            {:else}
              {#each complaintAuditLogs as log (log.id)}
                <div class="flex justify-between gap-4 py-1.5 border-b border-[var(--color-border)] last:border-0">
                  <span class="text-[var(--color-muted-foreground)]">{log.description}</span>
                  <span class="text-[var(--color-muted-foreground)] shrink-0 font-mono">
                    {new Date(log.timestamp).toLocaleDateString('id-ID', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                    })}
                  </span>
                </div>
              {/each}
            {/if}
          </div>
        </div>

      </div>

      <!-- Modal Right side - Management Workflow & Actions -->
      <div class="lg:col-span-4 space-y-6">

        <!-- Messages Feedback inside Modal -->
        {#if actionSuccessMsg}
          <div class="p-3 bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 rounded-xl text-emerald-300 text-xs">
            {actionSuccessMsg}
          </div>
        {/if}
        {#if actionErrorMsg}
          <div class="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs">
            {actionErrorMsg}
          </div>
        {/if}

        <!-- SLA Deadlines Indicator Box -->
        {#if selectedComplaint.targetResolutionTime}
          <div class="p-4 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl space-y-3">
            <span class="text-[10px] font-bold uppercase text-[var(--color-muted-foreground)] flex items-center gap-1.5 tracking-wider">
              <Clock class="w-3.5 h-3.5 text-[var(--color-primary)]" /> Pemantauan SLA & Eskalasi
            </span>

            <div class="space-y-2 text-xs">
              <div>
                <span class="text-[var(--color-muted-foreground)] text-[10px] uppercase block font-bold">Target Response Time</span>
                <span class="text-[var(--color-text)]">
                  {new Date(selectedComplaint.targetResponseTime!).toLocaleDateString('id-ID', {
                    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                  })}
                </span>
              </div>

              <div>
                <span class="text-[var(--color-muted-foreground)] text-[10px] uppercase block font-bold">Target Resolution Time</span>
                <span class="text-[var(--color-text)]">
                  {new Date(selectedComplaint.targetResolutionTime).toLocaleDateString('id-ID', {
                    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                  })}
                </span>
              </div>

              <!-- Check if resolved -->
              {#if ['completed', 'closed', 'rejected'].includes(selectedComplaint.status)}
                <div class="pt-1.5 flex items-center gap-1.5 text-[var(--color-primary)] font-bold text-[11px]">
                  <CheckCircle2 class="w-4 h-4 shrink-0" />
                  <span>Selesai sesuai target waktu operasional.</span>
                </div>
              {:else if new Date().getTime() > new Date(selectedComplaint.targetResolutionTime).getTime()}
                <div class="pt-1.5 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl space-y-1 text-rose-400 font-bold text-[11px]">
                  <div class="flex items-center gap-1.5">
                    <AlertTriangle class="w-4 h-4 shrink-0" />
                    <span>ALARM: MELEWATI SLA!</span>
                  </div>
                  <p class="text-[10px] text-[var(--color-muted-foreground)] font-normal leading-relaxed">
                    Tiket belum diselesaikan melebihi durasi estimasi standar operasional penanganan.
                  </p>
                </div>
              {:else}
                <div class="pt-1.5 flex items-center gap-1.5 text-[var(--color-primary)] font-bold text-[11px]">
                  <Clock class="w-4 h-4 shrink-0" />
                  <span>SLA Terpenuhi (On Track)</span>
                </div>
              {/if}
            </div>
          </div>
        {/if}

        <!-- Action 1: Verification Workflow -->
        <div class="p-4 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl space-y-3">
          <span class="text-[10px] font-bold uppercase text-[var(--color-muted-foreground)] tracking-wider block">
            1. Verifikasi Awal (Tim Admisi)
          </span>

          <div class="flex gap-2">
            <button
              type="button"
              disabled={selectedComplaint.status !== 'new'}
              onclick={() => handleUpdateStatus('verified')}
              class="flex-1 py-2 bg-purple-500 hover:bg-purple-400 disabled:opacity-30 disabled:pointer-events-none text-[var(--color-primary-foreground)] font-bold text-xs rounded-xl transition flex items-center justify-center gap-1"
            >
              <UserCheck class="w-3.5 h-3.5" />
              <span>Verifikasi</span>
            </button>
            <button
              type="button"
              disabled={selectedComplaint.status !== 'new' && selectedComplaint.status !== 'verified'}
              onclick={() => handleUpdateStatus('rejected')}
              class="flex-1 py-2 bg-rose-500 hover:bg-rose-400 disabled:opacity-30 disabled:pointer-events-none text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1"
            >
              <XCircle class="w-3.5 h-3.5" />
              <span>Tolak</span>
            </button>
          </div>
        </div>

        <!-- Action 2: Staff Assignment -->
        <div class="p-4 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl space-y-3">
          <span class="text-[10px] font-bold uppercase text-[var(--color-muted-foreground)] tracking-wider block">
            2. Delegasi & Penugasan Petugas
          </span>

          <select
            value={selectedComplaint.assignedTo || ''}
            onchange={(e) => handleAssignStaff(e.currentTarget.value)}
            class="w-full bg-[var(--color-card)] border border-[var(--color-border)] focus:border-[var(--color-primary)]/70 focus:outline-none rounded-xl p-2 text-xs text-[var(--color-text)]"
          >
            <option value="">-- Batalkan / Pilih Petugas --</option>
            {#each staffUsers as st (st.uid)}
              <option value={st.uid}>
                {st.displayName} ({st.roleName || st.roleId})
              </option>
            {/each}
          </select>
          <p class="text-[9px] text-[var(--color-muted-foreground)]">Menugaskan petugas otomatis mengubah status tiket ke 'Ditugaskan'.</p>
        </div>

        <!-- Action 3: Final Resolution Status -->
        <div class="p-4 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl space-y-3">
          <span class="text-[10px] font-bold uppercase text-[var(--color-muted-foreground)] tracking-wider block">
            3. Eksekusi Progres & Solusi Akhir
          </span>

          <div class="grid grid-cols-2 gap-2 text-xs font-semibold">
            <button
              type="button"
              onclick={() => handleUpdateStatus('processing')}
              class={`py-2 border rounded-xl transition ${
                selectedComplaint.status === 'processing'
                  ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)] text-[var(--color-primary)] font-bold'
                  : 'border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-muted-foreground)] hover:text-[var(--color-text)]'
              }`}
            >
              Mulai Proses
            </button>
            <button
              type="button"
              onclick={() => handleUpdateStatus('pending_info')}
              class={`py-2 border rounded-xl transition ${
                selectedComplaint.status === 'pending_info'
                  ? 'bg-[var(--color-surface)] border-zinc-600 text-[var(--color-text)] font-bold'
                  : 'border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-muted-foreground)] hover:text-[var(--color-text)]'
              }`}
            >
              Butuh Informasi
            </button>
            <button
              type="button"
              onclick={() => handleUpdateStatus('completed')}
              class="py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary)] text-[var(--color-primary-foreground)] font-bold rounded-xl col-span-2 transition flex items-center justify-center gap-1"
            >
              <CheckCircle2 class="w-4 h-4" />
              <span>Selesaikan Laporan</span>
            </button>
            <button
              type="button"
              onclick={() => handleUpdateStatus('closed')}
              class="py-2 border border-[var(--color-border)] hover:border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-muted-foreground)] hover:text-[var(--color-text)] rounded-xl col-span-2 transition flex items-center justify-center gap-1"
            >
              <span>Tutup Tiket Secara Resmi</span>
            </button>
          </div>
        </div>

        <!-- Action 4: Change priority -->
        <div class="p-4 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl space-y-3">
          <span class="text-[10px] font-bold uppercase text-[var(--color-muted-foreground)] tracking-wider block">
            4. Penyetelan Derajat Prioritas
          </span>

          <div class="grid grid-cols-2 gap-2">
            {#each [
              { id: 'urgent', label: 'Mendesak (Urgent)', color: 'border-rose-500 text-rose-400 bg-rose-500/5' },
              { id: 'high', label: 'Tinggi', color: 'border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary)]/5' },
              { id: 'normal', label: 'Normal', color: 'border-[var(--color-border)] text-[var(--color-muted-foreground)] bg-[var(--color-surface)]' },
              { id: 'low', label: 'Rendah', color: 'border-[var(--color-border)] text-[var(--color-muted-foreground)] bg-[var(--color-surface)]' }
            ] as p (p.id)}
              <button
                type="button"
                onclick={() => handleUpdatePriority(p.id as ComplaintPriority)}
                class={`px-2 py-1.5 border text-[10px] font-bold rounded-xl transition ${
                  selectedComplaint.priority === p.id
                    ? p.color
                    : 'border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-muted-foreground)] hover:text-[var(--color-text)]'
                }`}
              >
                {p.label}
              </button>
            {/each}
          </div>
        </div>

        <!-- Action 5: Link Duplicate tickets -->
        <div class="p-4 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl space-y-3">
          <span class="text-[10px] font-bold uppercase text-[var(--color-muted-foreground)] tracking-wider block">
            5. Penggabungan Laporan Duplikat
          </span>

          <div class="space-y-2">
            <div class="flex items-center gap-2">
              <input
                type="checkbox"
                id="dupCheckbox"
                bind:checked={isDuplicateChecked}
                class="w-4 h-4 rounded border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
              />
              <label for="dupCheckbox" class="text-xs text-[var(--color-text)] cursor-pointer">Tandai sebagai Duplikat</label>
            </div>

            {#if isDuplicateChecked}
              <div class="space-y-2">
                <input
                  type="text"
                  bind:value={duplicateTicketCode}
                  placeholder="Nomor Tiket Utama (PSM-2026-XXXXXX)"
                  class="w-full bg-[var(--color-card)] border border-[var(--color-border)] focus:border-[var(--color-primary)]/70 focus:outline-none rounded-xl p-2 text-xs text-[var(--color-text)] uppercase font-mono tracking-wider text-center"
                />
              </div>
            {/if}

            <button
              type="button"
              onclick={handleToggleDuplicate}
              class="w-full py-2 border border-[var(--color-border)] hover:border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text)] hover:text-[var(--color-text)] rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1"
            >
              <Link class="w-3.5 h-3.5" />
              <span>Perbarui Tautan Duplikat</span>
            </button>
          </div>
        </div>

        <!-- Action 6: Permanent Deletion (Admins only) -->
        {#if authStore.hasPermission('manage_site_settings')}
          <div class="pt-2">
            <button
              type="button"
              onclick={() => selectedComplaint && requestDeleteComplaint(selectedComplaint.id, selectedComplaint.ticketNumber)}
              class="w-full py-2.5 bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
            >
              <Trash2 class="w-4 h-4" />
              <span>Hapus / Arsipkan Tiket</span>
            </button>
          </div>
        {/if}

      </div>

    </div>
  </Modal>
{/if}

<!-- Konfirmasi hapus pengaduan -->
<ConfirmModal
  isOpen={deleteComplaintTarget !== null}
  onClose={() => (deleteComplaintTarget = null)}
  onConfirm={confirmDeleteComplaint}
  title="Hapus Pengaduan"
  message={deleteComplaintTarget
    ? `Apakah Anda yakin ingin menghapus pengaduan ${deleteComplaintTarget.ticketNumber} secara permanen dari database? Tindakan ini dicatat di Audit Log.`
    : ''}
  confirmLabel="Ya, Hapus"
  isLoading={isDeleting}
/>

<!-- Konfirmasi hapus kategori -->
<ConfirmModal
  isOpen={deleteCategoryTarget !== null}
  onClose={() => (deleteCategoryTarget = null)}
  onConfirm={confirmDeleteCategory}
  title="Hapus Kategori"
  message={deleteCategoryTarget
    ? `Hapus kategori '${deleteCategoryTarget}'? Ini tidak menghapus laporan lama, tapi laporan baru tidak bisa memilih kategori ini.`
    : ''}
  confirmLabel="Ya, Hapus"
/>
