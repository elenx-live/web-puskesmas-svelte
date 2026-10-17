<!-- @component Manajemen katalog layanan kesehatan (Service Engine Phase 4A & 4B): daftar, filter, editor tab, aksi massal, import/export, review workflow. -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { authStore } from '../../../shared/stores/auth.svelte.js';
  import { toastStore } from '../../../shared/stores/toast.svelte.js';
  import { navigate, routerState } from '../../../app/router.svelte.js';
  import { serviceEngineService, generateSlug } from '../../../shared/services/serviceEngineService.js';
  import type {
    ServiceEntity,
    ServiceStatus,
    ServiceCategoryEntity,
    ServiceClusterEntity,
    ServiceUnitEntity,
    ServiceLocationEntity,
  } from '../../../shared/types/index.js';
  import Card from '../../../shared/ui/Card.svelte';
  import Button from '../../../shared/ui/Button.svelte';
  import Input from '../../../shared/ui/Input.svelte';
  import Select from '../../../shared/ui/Select.svelte';
  import Badge from '../../../shared/ui/Badge.svelte';
  import Modal from '../../../shared/ui/Modal.svelte';
  import ConfirmModal from '../../../shared/components/ConfirmModal.svelte';
  import ServiceImportModal from '../components/services/ServiceImportModal.svelte';
  import ServiceExportModal from '../components/services/ServiceExportModal.svelte';
  import BulkUpdateModal from '../components/services/BulkUpdateModal.svelte';
  import ServiceDataQualityPanel from '../components/services/ServiceDataQualityPanel.svelte';
  import ServiceRequirementsTab from '../components/services/ServiceRequirementsTab.svelte';
  import ServiceProceduresTab from '../components/services/ServiceProceduresTab.svelte';
  import ServiceProductsTab from '../components/services/ServiceProductsTab.svelte';
  import ServiceStandardsTab from '../components/services/ServiceStandardsTab.svelte';
  import ServiceSchedulesTab from '../components/services/ServiceSchedulesTab.svelte';
  import ServicePricingTab from '../components/services/ServicePricingTab.svelte';
  import {
    Layers,
    Plus,
    Search,
    Edit,
    Trash2,
    Star,
    CheckCircle2,
    Clock,
    Archive,
    Globe,
    Sliders,
    Building2,
    MapPin,
    ChevronRight,
    RefreshCw,
    Save,
    FileText,
    ListOrdered,
    Package,
    ShieldCheck,
    Info,
    Upload,
    Download,
    CheckSquare,
    Sparkles,
    Send,
    XCircle,
    AlertTriangle,
    DollarSign,
  } from 'lucide-svelte';

  type EditorTab = 'info' | 'requirements' | 'procedures' | 'products' | 'standards' | 'schedules' | 'pricing';

  let services = $state<ServiceEntity[]>([]);
  let loading = $state(true);

  // Entities for Dropdowns and Filters
  let clusters = $state<ServiceClusterEntity[]>([]);
  let categories = $state<ServiceCategoryEntity[]>([]);
  let units = $state<ServiceUnitEntity[]>([]);
  let locations = $state<ServiceLocationEntity[]>([]);

  // Filter States
  let search = $state('');
  let statusFilter = $state('');
  let featuredFilter = $state('');
  let clusterFilter = $state('');
  let categoryFilter = $state('');
  let unitFilter = $state('');
  let locationFilter = $state('');

  // Editor Modal State
  let isEditorOpen = $state(false);
  let editingService = $state<Partial<ServiceEntity> | null>(null);
  let saving = $state(false);
  let autoSlug = $state(true);
  let editorTab = $state<EditorTab>('info');

  // Delete Confirm Modal State
  let deleteModalOpen = $state(false);
  let serviceToDelete = $state<ServiceEntity | null>(null);

  // Phase 4H: View Mode & Bulk Operations States
  let activeViewTab = $state<'services' | 'quality'>('services');
  let selectedServiceIds = $state<string[]>([]);
  let isBulkUpdateModalOpen = $state(false);
  let isImportModalOpen = $state(false);
  let isExportModalOpen = $state(false);
  let bulkActionConfirmOpen = $state(false);
  let bulkActionStatus = $state<ServiceStatus | null>(null);
  let bulkActionLoading = $state(false);

  // Phase 4I: Approval Workflow States
  let incompleteModalOpen = $state(false);
  let missingItemsList = $state<string[]>([]);
  let submittingReview = $state(false);

  // Check RBAC Permissions
  const user = $derived(authStore.user);
  const canBulkEdit = $derived(
    (user?.permissions?.includes('bulk_edit_services') ?? false) || user?.roleId === 'role-superadmin'
  );
  const canImport = $derived(
    (user?.permissions?.includes('import_services') ?? false) || user?.roleId === 'role-superadmin'
  );
  const canExport = $derived(
    (user?.permissions?.includes('export_services') ?? false) || user?.roleId === 'role-superadmin'
  );

  const filteredCategoriesForEditor = $derived(
    editingService?.clusterId
      ? categories.filter((c) => c.clusterId === editingService?.clusterId || c.id === editingService?.categoryId)
      : categories
  );

  const totalServices = $derived(services.length);
  const publishedServices = $derived(services.filter((s) => s.status === 'published').length);
  const draftServices = $derived(services.filter((s) => s.status === 'draft').length);
  const featuredServices = $derived(services.filter((s) => s.featured).length);

  // Multi-select Handlers
  function handleSelectAll() {
    if (selectedServiceIds.length === services.length) {
      selectedServiceIds = [];
    } else {
      selectedServiceIds = services.map((s) => s.id);
    }
  }

  function handleSelectRow(id: string) {
    if (selectedServiceIds.includes(id)) {
      selectedServiceIds = selectedServiceIds.filter((item) => item !== id);
    } else {
      selectedServiceIds = [...selectedServiceIds, id];
    }
  }

  function handleTriggerBulkStatus(status: ServiceStatus) {
    if (!canBulkEdit) {
      toastStore.showToast('Anda tidak memiliki izin untuk melakukan aksi massal.', 'error');
      return;
    }
    if (selectedServiceIds.length === 0) {
      toastStore.showToast('Pilih minimal satu layanan.', 'warning');
      return;
    }
    bulkActionStatus = status;
    bulkActionConfirmOpen = true;
  }

  async function handleExecuteBulkStatus() {
    const currentUser = authStore.user;
    if (!bulkActionStatus || !currentUser || selectedServiceIds.length === 0) return;
    bulkActionLoading = true;

    try {
      await serviceEngineService.bulkUpdateServices(
        selectedServiceIds,
        { status: bulkActionStatus },
        { id: currentUser.uid, email: currentUser.email, name: currentUser.displayName }
      );

      toastStore.showToast(
        `Berhasil mengubah status ${selectedServiceIds.length} layanan menjadi ${bulkActionStatus.toUpperCase()}.`,
        'success'
      );
      selectedServiceIds = [];
      bulkActionConfirmOpen = false;
      bulkActionStatus = null;
      await loadServices();
    } catch (err) {
      console.error('Failed bulk status change:', err);
      toastStore.showToast('Gagal melakukan perubahan status massal.', 'error');
    } finally {
      bulkActionLoading = false;
    }
  }

  async function loadEntities() {
    try {
      const [cls, cats, u, locs] = await Promise.all([
        serviceEngineService.getClusters(),
        serviceEngineService.getCategories(),
        serviceEngineService.getUnits(),
        serviceEngineService.getLocations(),
      ]);
      clusters = cls;
      categories = cats;
      units = u;
      locations = locs;
    } catch (err) {
      console.error('Failed to load metadata entities:', err);
    }
  }

  async function loadServices() {
    loading = true;
    try {
      const data = await serviceEngineService.getServices({
        search,
        status: statusFilter || undefined,
        clusterId: clusterFilter || undefined,
        categoryId: categoryFilter || undefined,
        unitId: unitFilter || undefined,
        locationId: locationFilter || undefined,
        featured:
          featuredFilter === 'true' ? true : featuredFilter === 'false' ? false : undefined,
      });
      services = data;
    } catch (error) {
      console.error('Failed to load services:', error);
      toastStore.showToast('Gagal memuat daftar layanan kesehatan', 'error');
    } finally {
      loading = false;
    }
  }

  function handleOpenCreate() {
    editingService = {
      name: '',
      slug: '',
      clusterId: '',
      categoryId: '',
      unitId: '',
      locationId: '',
      shortDescription: '',
      description: '',
      status: 'draft',
      featured: false,
      onlineRegistrationEnabled: false,
      queueEnabled: false,
      queuePrefix: 'A',
      displayOrder: services.length + 1,
      seoTitle: '',
      seoDescription: '',
    };
    autoSlug = true;
    editorTab = 'info';
    isEditorOpen = true;
  }

  function handleOpenEdit(service: ServiceEntity) {
    editingService = { ...service };
    autoSlug = false;
    editorTab = 'info';
    isEditorOpen = true;
  }

  function handleNameChange(name: string) {
    if (!editingService) return;
    const updated = { ...editingService, name };
    if (autoSlug) {
      updated.slug = generateSlug(name, editingService.id, services);
    }
    editingService = updated;
  }

  function updateEditing(patch: Partial<ServiceEntity>) {
    if (!editingService) return;
    editingService = { ...editingService, ...patch };
  }

  async function handleSave(e: SubmitEvent) {
    e.preventDefault();
    const currentUser = authStore.user;
    if (!editingService || !currentUser) return;

    if (!editingService.name?.trim()) {
      toastStore.showToast('Nama layanan wajib diisi', 'error');
      return;
    }

    if (!editingService.shortDescription?.trim() && editingService.status === 'published') {
      toastStore.showToast('Deskripsi singkat wajib diisi sebelum menerbitkan layanan', 'error');
      return;
    }

    saving = true;
    try {
      const actor = {
        id: currentUser.uid,
        email: currentUser.email,
        name: currentUser.displayName || 'Admin',
      };

      if (editingService.id) {
        await serviceEngineService.updateService(editingService.id, editingService, actor);
        toastStore.showToast(`Layanan "${editingService.name}" berhasil diperbarui`, 'success');
      } else {
        await serviceEngineService.createService(editingService, actor);
        toastStore.showToast(`Layanan "${editingService.name}" berhasil dibuat`, 'success');
      }

      isEditorOpen = false;
      editingService = null;
      await loadServices();
    } catch (error: any) {
      console.error('Failed to save service:', error);
      toastStore.showToast(error.message || 'Gagal menyimpan layanan', 'error');
    } finally {
      saving = false;
    }
  }

  async function handleSubmitForReview() {
    const currentUser = authStore.user;
    if (!editingService?.id || !currentUser) return;

    submittingReview = true;
    try {
      const actor = { id: currentUser.uid, email: currentUser.email, name: currentUser.displayName || 'Editor' };
      // First save current form changes
      if (editingService.name) {
        await serviceEngineService.updateService(editingService.id, editingService, actor);
      }

      // Check completeness
      const val = await serviceEngineService.validateServiceForSubmit(editingService.id);
      if (!val.valid) {
        missingItemsList = val.missingItems;
        incompleteModalOpen = true;
        submittingReview = false;
        return;
      }

      await serviceEngineService.submitForReview(editingService.id, actor);
      toastStore.showToast(`Layanan "${editingService.name}" telah berhasil dikirim untuk review.`, 'success');
      isEditorOpen = false;
      editingService = null;
      await loadServices();
    } catch (error: any) {
      toastStore.showToast(error.message || 'Gagal mengajukan review layanan', 'error');
    } finally {
      submittingReview = false;
    }
  }

  async function handleToggleFeatured(service: ServiceEntity) {
    const currentUser = authStore.user;
    if (!currentUser) return;
    try {
      const actor = { id: currentUser.uid, email: currentUser.email, name: currentUser.displayName || 'Admin' };
      const updated = await serviceEngineService.updateService(
        service.id,
        { featured: !service.featured },
        actor
      );
      toastStore.showToast(
        `Layanan "${service.name}" ${updated.featured ? 'dijadikan unggulan' : 'dihapus dari unggulan'}`,
        'success'
      );
      await loadServices();
    } catch (error) {
      toastStore.showToast('Gagal memperbarui status unggulan', 'error');
    }
  }

  async function handleStatusChange(service: ServiceEntity, newStatus: ServiceStatus) {
    const currentUser = authStore.user;
    if (!currentUser) return;
    try {
      const actor = { id: currentUser.uid, email: currentUser.email, name: currentUser.displayName || 'Admin' };
      await serviceEngineService.updateService(service.id, { status: newStatus }, actor);
      toastStore.showToast(`Status layanan "${service.name}" diubah menjadi ${newStatus}`, 'success');
      await loadServices();
    } catch (error) {
      toastStore.showToast('Gagal mengubah status layanan', 'error');
    }
  }

  async function handleDeleteConfirm() {
    const currentUser = authStore.user;
    if (!serviceToDelete || !currentUser) return;
    try {
      const actor = { id: currentUser.uid, email: currentUser.email, name: currentUser.displayName || 'Admin' };
      await serviceEngineService.deleteService(serviceToDelete.id, actor);
      toastStore.showToast(`Layanan "${serviceToDelete.name}" berhasil dihapus permanen`, 'success');
      deleteModalOpen = false;
      serviceToDelete = null;
      await loadServices();
    } catch (error) {
      toastStore.showToast('Gagal menghapus layanan', 'error');
    }
  }

  function closeBanner() {
    navigate('/admin/services');
  }

  const EDITOR_TABS: { id: EditorTab; label: string }[] = [
    { id: 'info', label: 'Informasi Utama' },
    { id: 'requirements', label: 'Persyaratan' },
    { id: 'procedures', label: 'Prosedur & Alur' },
    { id: 'products', label: 'Produk Output' },
    { id: 'standards', label: 'Standar Pelayanan' },
    { id: 'schedules', label: 'Jadwal Pelayanan' },
    { id: 'pricing', label: 'Biaya / Tarif' },
  ];

  onMount(() => {
    loadEntities();

    // Handle incoming URL parameters (e.g. from Dashboard clicks)
    const query = routerState.query;
    const statusParam = query.status;
    if (statusParam) statusFilter = statusParam;

    const editParam = query.edit;
    const tabParam = query.tab;

    if (tabParam) {
      if (['info', 'requirements', 'procedures', 'products', 'standards', 'schedules', 'pricing'].includes(tabParam)) {
        editorTab = tabParam as EditorTab;
      }
    }

    if (editParam) {
      serviceEngineService
        .getServiceById(editParam)
        .then((srv) => {
          if (srv) {
            editingService = srv;
            isEditorOpen = true;
          }
        })
        .catch(console.error);
    }
  });

  $effect(() => {
    // Track filter states for reactivity
    const s = search;
    const st = statusFilter;
    const f = featuredFilter;
    const cl = clusterFilter;
    const ca = categoryFilter;
    const u = unitFilter;
    const l = locationFilter;
    void s; void st; void f; void cl; void ca; void u; void l;
    loadServices();
  });
</script>

{#snippet statusBadge(status: ServiceStatus)}
  {#if status === 'published'}
    <Badge variant="emerald"><Globe class="w-3 h-3 inline mr-1" /> Terbit</Badge>
  {:else if status === 'approved'}
    <Badge variant="sky"><CheckCircle2 className="w-3 h-3 inline mr-1" /> Disetujui</Badge>
  {:else if status === 'pending_review'}
    <Badge variant="amber"><Clock className="w-3 h-3 inline mr-1" /> Menunggu Review</Badge>
  {:else if status === 'rejected'}
    <Badge variant="rose"><XCircle className="w-3 h-3 inline mr-1" /> Dikembalikan</Badge>
  {:else if status === 'draft'}
    <Badge variant="amber">Draf</Badge>
  {:else if status === 'archived'}
    <Badge variant="zinc">Diarsipkan</Badge>
  {:else if status === 'inactive'}
    <Badge variant="red">Nonaktif</Badge>
  {:else}
    <Badge variant="zinc">{status}</Badge>
  {/if}
{/snippet}

{#snippet editorTabButton(id: EditorTab, Icon: any)}
  <button
    type="button"
    onclick={() => (editorTab = id)}
    class={`px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 transition ${
      editorTab === id
        ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow'
        : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-text)] hover:bg-[var(--color-card)]'
    }`}
  >
    <Icon class="w-3.5 h-3.5" />
    <span>{EDITOR_TABS.find((t) => t.id === id)?.label}</span>
  </button>
{/snippet}

{#snippet notSavedNotice(text: string)}
  <div class="p-8 text-center bg-[var(--color-bg)] border border-dashed border-[var(--color-border)] rounded-2xl space-y-2 text-xs">
    <Info class="w-8 h-8 text-[var(--color-primary)] mx-auto" />
    <p class="text-[var(--color-text)] font-medium">Layanan Belum Disimpan</p>
    <p class="text-[var(--color-muted-foreground)]">{text}</p>
  </div>
{/snippet}

<div class="space-y-6">
  {#if routerState.query.tab && !isEditorOpen}
    {@const tabParam = routerState.query.tab}
    {@const label =
      tabParam === 'schedules' ? 'Jadwal Operasional' : tabParam === 'pricing' ? 'Tarif & Retribusi' : 'Data'}
    <div
      class="bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row sm:items-center gap-3 text-[var(--color-primary)]"
    >
      <Info class="w-5 h-5 shrink-0" />
      <div class="text-sm font-medium">
        Silakan <strong>pilih layanan dari tabel di bawah</strong> lalu klik "Edit" untuk mengatur <strong
          >{label}</strong
        > layanan tersebut.
      </div>
      <Button variant="ghost" size="sm" onclick={closeBanner} class="sm:ml-auto mt-2 sm:mt-0">
        Tutup
      </Button>
    </div>
  {/if}

  <!-- Header Title & Subnavigation Bar -->
  <div
    class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--color-card)] p-6 rounded-3xl border border-[var(--color-border)]"
  >
    <div>
      <div
        class="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-primary)] mb-1"
      >
        <span>Service Engine</span>
        <ChevronRight class="w-3 h-3 text-zinc-600" />
        <span>Phase 4A & 4B</span>
      </div>
      <h2 class="text-xl font-bold text-[var(--color-text)] tracking-tight flex items-center gap-2">
        <Layers class="w-6 h-6 text-[var(--color-primary)]" />
        <span>Katalog Layanan Kesehatan</span>
      </h2>
      <p class="text-xs text-[var(--color-muted-foreground)] mt-1">
        Kelola daftar layanan, integrasi klaster ILP, kategori medis, unit pelayanan, dan lokasi fisik.
      </p>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <!-- View Mode Selector -->
      <div
        class="bg-[var(--color-bg)] border border-[var(--color-border)] p-1 rounded-2xl flex items-center gap-1"
      >
        <button
          onclick={() => (activeViewTab = 'services')}
          class={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            activeViewTab === 'services'
              ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow'
              : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-text)]'
          }`}
        >
          <Layers class="w-3.5 h-3.5" />
          <span>Katalog Layanan</span>
        </button>
        <button
          onclick={() => (activeViewTab = 'quality')}
          class={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            activeViewTab === 'quality'
              ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow'
              : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-text)]'
          }`}
        >
          <Sparkles class="w-3.5 h-3.5" />
          <span>Kualitas Data</span>
        </button>
      </div>

      <button
        onclick={() => {
          loadEntities();
          loadServices();
        }}
        class="p-2.5 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:text-[var(--color-text)] transition"
        title="Refresh Data"
      >
        <RefreshCw class={`w-4 h-4 ${loading ? 'animate-spin text-[var(--color-primary)]' : ''}`} />
      </button>

      {#if canImport}
        <button
          onclick={() => (isImportModalOpen = true)}
          class="px-3.5 py-2.5 rounded-2xl bg-[var(--color-bg)] hover:bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text)] hover:text-[var(--color-text)] font-semibold text-xs flex items-center gap-1.5 transition"
          title="Import Data Layanan (CSV)"
        >
          <Upload class="w-3.5 h-3.5 text-blue-400" />
          <span>Import CSV</span>
        </button>
      {/if}

      {#if canExport}
        <button
          onclick={() => (isExportModalOpen = true)}
          class="px-3.5 py-2.5 rounded-2xl bg-[var(--color-bg)] hover:bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text)] hover:text-[var(--color-text)] font-semibold text-xs flex items-center gap-1.5 transition"
          title="Export Data Katalog (CSV)"
        >
          <Download class="w-3.5 h-3.5 text-[var(--color-primary)]" />
          <span>Export CSV</span>
        </button>
      {/if}

      <button
        onclick={handleOpenCreate}
        class="px-4 py-2.5 rounded-2xl bg-[var(--color-primary)] hover:bg-amber-600 text-[var(--color-primary-foreground)] font-bold text-xs flex items-center gap-2 transition shadow-lg shadow-[var(--color-primary)]/20"
      >
        <Plus class="w-4 h-4 stroke-[3]" />
        <span>Tambah Layanan Baru</span>
      </button>
    </div>
  </div>

  <!-- STATS HEADER -->
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    <Card class="p-5 flex items-center justify-between border-[var(--color-border)] bg-[var(--color-card)]">
      <div class="space-y-1">
        <span class="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]"
          >Total Layanan</span
        >
        <div class="text-2xl font-light text-[var(--color-text)]">{totalServices}</div>
      </div>
      <div
        class="w-12 h-12 rounded-2xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-center text-[var(--color-primary)]"
      >
        <Layers class="w-6 h-6" />
      </div>
    </Card>

    <Card class="p-5 flex items-center justify-between border-[var(--color-border)] bg-[var(--color-card)]">
      <div class="space-y-1">
        <span class="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]"
          >Diterbitkan</span
        >
        <div class="text-2xl font-light text-[var(--color-primary)]">{publishedServices}</div>
      </div>
      <div
        class="w-12 h-12 rounded-2xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-center text-[var(--color-primary)]"
      >
        <CheckCircle2 class="w-6 h-6" />
      </div>
    </Card>

    <Card class="p-5 flex items-center justify-between border-[var(--color-border)] bg-[var(--color-card)]">
      <div class="space-y-1">
        <span class="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]"
          >Draf & Review</span
        >
        <div class="text-2xl font-light text-[var(--color-primary)]">{draftServices}</div>
      </div>
      <div
        class="w-12 h-12 rounded-2xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-center text-[var(--color-primary)]"
      >
        <Clock class="w-6 h-6" />
      </div>
    </Card>

    <Card class="p-5 flex items-center justify-between border-[var(--color-border)] bg-[var(--color-card)]">
      <div class="space-y-1">
        <span class="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]"
          >Unggulan</span
        >
        <div class="text-2xl font-light text-[var(--color-primary)]">{featuredServices}</div>
      </div>
      <div
        class="w-12 h-12 rounded-2xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-center text-[var(--color-primary)]"
      >
        <Star class="w-6 h-6 fill-amber-300/20" />
      </div>
    </Card>
  </div>

  <!-- TOOLBAR & DYNAMIC FILTERS -->
  <Card class="p-4 border-[var(--color-border)] bg-[var(--color-card)]">
    <div class="space-y-3">
      <div class="flex flex-col md:flex-row items-center justify-between gap-3">
        <div class="relative w-full md:w-80">
          <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-muted-foreground)]" />
          <Input
            placeholder="Cari layanan kesehatan..."
            bind:value={search}
            class="pl-9 bg-[var(--color-bg)] border-[var(--color-border)] text-xs"
          />
        </div>

        <div class="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
          <Select
            bind:value={statusFilter}
            options={[
              { value: '', label: 'Semua Status' },
              { value: 'published', label: 'Terbit' },
              { value: 'approved', label: 'Disetujui' },
              { value: 'pending_review', label: 'Menunggu Review' },
              { value: 'rejected', label: 'Dikembalikan' },
              { value: 'draft', label: 'Draf' },
              { value: 'archived', label: 'Diarsipkan' },
              { value: 'inactive', label: 'Nonaktif' },
            ]}
            class="bg-[var(--color-bg)] border-[var(--color-border)] text-xs min-w-[120px]"
          />

          <Select
            bind:value={featuredFilter}
            options={[
              { value: '', label: 'Semua Tipe' },
              { value: 'true', label: 'Unggulan' },
              { value: 'false', label: 'Reguler' },
            ]}
            class="bg-[var(--color-bg)] border-[var(--color-border)] text-xs min-w-[120px]"
          />
        </div>
      </div>

      <!-- Sub-Filters Phase 4B -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[var(--color-border)]">
        <select
          bind:value={clusterFilter}
          class="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-1.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]/50"
        >
          <option value="">Semua Klaster</option>
          {#each clusters as c (c.id)}
            <option value={c.id}>{c.name}</option>
          {/each}
        </select>

        <select
          bind:value={categoryFilter}
          class="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-1.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]/50"
        >
          <option value="">Semua Kategori</option>
          {#each categories as cat (cat.id)}
            <option value={cat.id}>{cat.name}</option>
          {/each}
        </select>

        <select
          bind:value={unitFilter}
          class="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-1.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]/50"
        >
          <option value="">Semua Unit</option>
          {#each units as u (u.id)}
            <option value={u.id}>{u.name}</option>
          {/each}
        </select>

        <select
          bind:value={locationFilter}
          class="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-1.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]/50"
        >
          <option value="">Semua Lokasi</option>
          {#each locations as loc (loc.id)}
            <option value={loc.id}>{loc.name}</option>
          {/each}
        </select>
      </div>
    </div>
  </Card>

  <!-- VIEW TAB 2: DATA QUALITY REPORT (PHASE 4H) -->
  {#if activeViewTab === 'quality'}
    <ServiceDataQualityPanel
      onOpenFixEditor={(service: ServiceEntity, tab: string) => {
        editingService = service;
        editorTab = tab as EditorTab;
        isEditorOpen = true;
      }}
    />
  {:else}
    <!-- BULK ACTION FLOATING TOOLBAR -->
    {#if selectedServiceIds.length > 0}
      <div
        class="bg-[var(--color-primary)] text-[var(--color-primary-foreground)] p-3.5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl animate-fadeIn"
      >
        <div class="flex items-center gap-2 text-xs font-bold">
          <CheckSquare class="w-4 h-4" />
          <span>{selectedServiceIds.length} Layanan Kesehatan Terpilih</span>
        </div>

        <div class="flex flex-wrap items-center gap-1.5">
          <button
            onclick={() => handleTriggerBulkStatus('published')}
            class="px-2.5 py-1.5 bg-black/80 hover:bg-black text-[var(--color-text)] text-[11px] font-semibold rounded-xl transition flex items-center gap-1"
          >
            <Globe class="w-3 h-3 text-[var(--color-primary)]" /> Terbitkan
          </button>

          <button
            onclick={() => handleTriggerBulkStatus('draft')}
            class="px-2.5 py-1.5 bg-black/80 hover:bg-black text-[var(--color-text)] text-[11px] font-semibold rounded-xl transition flex items-center gap-1"
          >
            <Clock class="w-3 h-3 text-[var(--color-primary)]" /> Jadikan Draf
          </button>

          <button
            onclick={() => handleTriggerBulkStatus('archived')}
            class="px-2.5 py-1.5 bg-black/80 hover:bg-black text-[var(--color-text)] text-[11px] font-semibold rounded-xl transition flex items-center gap-1"
          >
            <Archive class="w-3 h-3 text-[var(--color-muted-foreground)]" /> Arsipkan
          </button>

          <button
            onclick={() => (isBulkUpdateModalOpen = true)}
            class="px-2.5 py-1.5 bg-black text-[var(--color-primary)] hover:text-[var(--color-text)] text-[11px] font-semibold rounded-xl transition flex items-center gap-1 border border-[var(--color-primary)]/40"
          >
            <Sliders class="w-3 h-3" /> Ubah Data Massal
          </button>

          <button
            onclick={() => (selectedServiceIds = [])}
            class="px-2.5 py-1.5 bg-black/20 hover:bg-black/30 text-[var(--color-primary-foreground)] text-[11px] font-bold rounded-xl transition ml-1"
          >
            Batal Pilih
          </button>
        </div>
      </div>
    {/if}

    <!-- SERVICES TABLE -->
    <Card class="border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
      {#if loading}
        <div class="p-12 text-center text-[var(--color-muted-foreground)] space-y-2">
          <RefreshCw class="w-6 h-6 animate-spin mx-auto text-[var(--color-primary)]" />
          <p class="text-xs">Memuat daftar layanan kesehatan...</p>
        </div>
      {:else if services.length === 0}
        <div class="p-12 text-center text-[var(--color-muted-foreground)] space-y-3">
          <Layers class="w-10 h-10 mx-auto text-zinc-600" />
          <p class="text-sm font-medium text-[var(--color-text)]">Tidak Ada Layanan Ditemukan</p>
          <p class="text-xs text-[var(--color-muted-foreground)] max-w-sm mx-auto">
            Silakan ubah kata kunci pencarian atau filter yang digunakan.
          </p>
          <Button onclick={handleOpenCreate} variant="secondary" size="sm" class="mt-2">
            <Plus class="w-4 h-4 mr-1" /> Buat Layanan
          </Button>
        </div>
      {:else}
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr
                class="border-b border-[var(--color-border)] bg-[var(--color-bg)]/50 text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted-foreground)]"
              >
                {#if canBulkEdit}
                  <th class="py-3 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={services.length > 0 && selectedServiceIds.length === services.length}
                      onchange={handleSelectAll}
                      class="rounded border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]/20 cursor-pointer"
                      title="Pilih Semua Layanan"
                    />
                  </th>
                {/if}
                <th class="py-3 px-4 w-12 text-center">Urutan</th>
                <th class="py-3 px-4 w-10 text-center">Unggulan</th>
                <th class="py-3 px-4">Nama Layanan & Slug</th>
                <th class="py-3 px-4">Klaster & Kategori</th>
                <th class="py-3 px-4">Unit & Lokasi</th>
                <th class="py-3 px-4">Status</th>
                <th class="py-3 px-4">Diperbarui</th>
                <th class="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[var(--color-border)] text-xs">
              {#each services as service (service.id)}
                {@const isSelected = selectedServiceIds.includes(service.id)}
                <tr
                  class={`transition-colors ${isSelected ? 'bg-[var(--color-primary)]/10' : 'hover:bg-[var(--color-card)]/50'}`}
                >
                  {#if canBulkEdit}
                    <td class="py-3 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onchange={() => handleSelectRow(service.id)}
                        class="rounded border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]/20 cursor-pointer"
                      />
                    </td>
                  {/if}

                  <td class="py-3 px-4 text-center font-mono text-[var(--color-muted-foreground)]">
                    #{service.displayOrder}
                  </td>

                  <td class="py-3 px-4 text-center">
                    <button
                      onclick={() => handleToggleFeatured(service)}
                      title={service.featured ? 'Hapus dari Unggulan' : 'Jadikan Unggulan'}
                      class={`p-1 rounded-lg transition-colors ${
                        service.featured
                          ? 'text-[var(--color-primary)] hover:text-[var(--color-primary)]'
                          : 'text-zinc-600 hover:text-[var(--color-muted-foreground)]'
                      }`}
                    >
                      <Star class={`w-4 h-4 ${service.featured ? 'fill-amber-400' : ''}`} />
                    </button>
                  </td>

                  <td class="py-3 px-4 max-w-xs">
                    <div
                      class="font-bold text-[var(--color-text)] hover:text-[var(--color-primary)] transition-colors line-clamp-1"
                    >
                      {service.name}
                    </div>
                    <div class="text-[10px] font-mono text-[var(--color-primary)]/80 line-clamp-1">
                      /layanan/{service.slug}
                    </div>
                  </td>

                  <td class="py-3 px-4 space-y-1">
                    <div class="flex items-center gap-1 text-[var(--color-text)] font-medium text-[11px]">
                      <Sliders class="w-3 h-3 text-[var(--color-primary)] shrink-0" />
                      <span class="truncate">{service.clusterName || '—'}</span>
                    </div>
                    <div class="flex items-center gap-1 text-[var(--color-muted-foreground)] text-[10px]">
                      <Layers class="w-3 h-3 text-[var(--color-muted-foreground)] shrink-0" />
                      <span class="truncate">{service.categoryName || '—'}</span>
                    </div>
                  </td>

                  <td class="py-3 px-4 space-y-1">
                    <div class="flex items-center gap-1 text-[var(--color-text)] text-[11px]">
                      <Building2 class="w-3 h-3 text-blue-400 shrink-0" />
                      <span class="truncate">{service.unitName || '—'}</span>
                    </div>
                    <div class="flex items-center gap-1 text-[var(--color-muted-foreground)] text-[10px]">
                      <MapPin class="w-3 h-3 text-[var(--color-primary)] shrink-0" />
                      <span class="truncate">{service.locationName || '—'}</span>
                    </div>
                  </td>

                  <td class="py-3 px-4">
                    {@render statusBadge(service.status)}
                  </td>

                  <td class="py-3 px-4 text-[var(--color-muted-foreground)] text-[11px]">
                    {new Date(service.updatedAt).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>

                  <td class="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                    <Button
                      variant="ghost"
                      size="sm"
                      onclick={() => handleOpenEdit(service)}
                      title="Edit Layanan"
                      class="h-8 w-8 p-0 text-[var(--color-primary)] hover:text-[var(--color-text)]"
                    >
                      <Edit class="w-3.5 h-3.5" />
                    </Button>

                    {#if service.status === 'published'}
                      <Button
                        variant="ghost"
                        size="sm"
                        onclick={() => handleStatusChange(service, 'draft')}
                        title="Kembalikan ke Draf"
                        class="h-8 w-8 p-0 text-[var(--color-primary)] hover:text-[var(--color-primary)]"
                      >
                        <Clock class="w-3.5 h-3.5" />
                      </Button>
                    {:else}
                      <Button
                        variant="ghost"
                        size="sm"
                        onclick={() => handleStatusChange(service, 'published')}
                        title="Terbitkan Layanan"
                        class="h-8 w-8 p-0 text-[var(--color-primary)] hover:text-emerald-300"
                      >
                        <Globe class="w-3.5 h-3.5" />
                      </Button>
                    {/if}

                    {#if service.status !== 'archived'}
                      <Button
                        variant="ghost"
                        size="sm"
                        onclick={() => handleStatusChange(service, 'archived')}
                        title="Arsipkan Layanan"
                        class="h-8 w-8 p-0 text-[var(--color-muted-foreground)] hover:text-[var(--color-text)]"
                      >
                        <Archive class="w-3.5 h-3.5" />
                      </Button>
                    {:else}
                      <Button
                        variant="ghost"
                        size="sm"
                        onclick={() => handleStatusChange(service, 'draft')}
                        title="Pulihkan ke Draf"
                        class="h-8 w-8 p-0 text-sky-400 hover:text-sky-300"
                      >
                        <CheckCircle2 class="w-3.5 h-3.5" />
                      </Button>
                    {/if}

                    <Button
                      variant="ghost"
                      size="sm"
                      onclick={() => {
                        serviceToDelete = service;
                        deleteModalOpen = true;
                      }}
                      title="Hapus Layanan"
                      class="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                    >
                      <Trash2 class="w-3.5 h-3.5" />
                    </Button>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </Card>
  {/if}
</div>

<!-- EDITOR MODAL WITH PHASE 4B & 4C TABS -->
<Modal
  isOpen={isEditorOpen}
  onClose={() => (isEditorOpen = false)}
  title={editingService?.id ? `Kelola Layanan: ${editingService.name}` : 'Tambah Layanan Kesehatan Baru'}
  size="2xl"
>
  {#if editingService}
    <div class="space-y-4">
      <!-- TABS NAVIGATION -->
      <div class="flex items-center gap-1.5 border-b border-[var(--color-border)] pb-2 overflow-x-auto text-xs">
        {@render editorTabButton('info', Sliders)}
        {@render editorTabButton('requirements', FileText)}
        {@render editorTabButton('procedures', ListOrdered)}
        {@render editorTabButton('products', Package)}
        {@render editorTabButton('standards', ShieldCheck)}
        {@render editorTabButton('schedules', Clock)}
        {@render editorTabButton('pricing', DollarSign)}
      </div>

      <!-- TAB CONTENT: INFORMASI UTAMA -->
      {#if editorTab === 'info'}
        <form onsubmit={handleSave} class="space-y-4 text-xs">
          <!-- REJECTION NOTICE BANNER -->
          {#if editingService.rejectionReason}
            <div
              class="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between"
            >
              <div class="space-y-0.5">
                <strong class="text-rose-400 block font-bold flex items-center gap-1.5">
                  <AlertTriangle class="w-4 h-4" /> Catatan Pengembalian Reviewer:
                </strong>
                <p class="text-[var(--color-text)]">{editingService.rejectionReason}</p>
              </div>
              <Badge variant="rose">Dikembalikan</Badge>
            </div>
          {/if}
          <!-- INFORMASI DASAR -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="md:col-span-2 space-y-1">
              <label class="font-semibold text-[var(--color-text)]">Nama Layanan *</label>
              <Input
                value={editingService.name || ''}
                oninput={(e) => handleNameChange(e.currentTarget.value)}
                placeholder="Contoh: Pelayanan Pemeriksaan Umum"
                class="bg-[var(--color-bg)] border-[var(--color-border)]"
                required
              />
            </div>

            <div class="space-y-1">
              <label class="font-semibold text-[var(--color-text)]">Urutan Tampilan</label>
              <Input
                type="number"
                value={editingService.displayOrder || 1}
                oninput={(e) =>
                  updateEditing({ displayOrder: parseInt(e.currentTarget.value) || 1 })}
                class="bg-[var(--color-bg)] border-[var(--color-border)]"
              />
            </div>
          </div>

          <div class="space-y-1">
            <div class="flex items-center justify-between">
              <label class="font-semibold text-[var(--color-text)]">URL Slug *</label>
              <button
                type="button"
                onclick={() => {
                  autoSlug = !autoSlug;
                  if (!autoSlug && editingService.name) {
                    updateEditing({
                      slug: generateSlug(editingService.name, editingService.id, services),
                    });
                  }
                }}
                class="text-[10px] text-[var(--color-primary)] hover:underline"
              >
                {autoSlug ? 'Edit Manual' : 'Otomatis dari Nama'}
              </button>
            </div>
            <div
              class="flex items-center gap-1 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-[var(--color-muted-foreground)]"
            >
              <span class="text-[var(--color-muted-foreground)] font-mono">/layanan/</span>
              <input
                type="text"
                value={editingService.slug || ''}
                readonly={autoSlug}
                oninput={(e) => updateEditing({ slug: e.currentTarget.value })}
                placeholder="pelayanan-pemeriksaan-umum"
                class="bg-transparent border-none focus:outline-none text-[var(--color-primary)] font-mono w-full text-xs"
                required
              />
            </div>
          </div>

          <!-- PHASE 4B: KLASIFIKASI LAYANAN -->
          <div class="pt-3 border-t border-[var(--color-border)] space-y-3">
            <span
              class="text-[11px] font-bold uppercase tracking-wider text-[var(--color-primary)] block"
            >
              Klasifikasi & Struktur Pelayanan (Permenkes 19/2024)
            </span>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- KLASTER DROPDOWN -->
              <div class="space-y-1">
                <label class="font-semibold text-[var(--color-text)]">Klaster Pelayanan</label>
                <select
                  value={editingService.clusterId || ''}
                  onchange={(e) => {
                    const selectedCluster = clusters.find((c) => c.id === e.currentTarget.value);
                    updateEditing({
                      clusterId: e.currentTarget.value,
                      clusterName: selectedCluster?.name || '',
                      categoryId: '',
                      categoryName: '',
                    });
                  }}
                  class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-[var(--color-text)] text-xs focus:outline-none focus:border-[var(--color-primary)]/50"
                >
                  <option value="">-- Pilih Klaster Pelayanan --</option>
                  {#each clusters as cls (cls.id)}
                    <option value={cls.id}>
                      {cls.name} {cls.status !== 'active' ? '(Nonaktif)' : ''}
                    </option>
                  {/each}
                </select>
              </div>

              <!-- KATEGORI DROPDOWN (CASCADING) -->
              <div class="space-y-1">
                <label class="font-semibold text-[var(--color-text)]">Kategori Layanan</label>
                <select
                  value={editingService.categoryId || ''}
                  onchange={(e) => {
                    const selectedCategory = categories.find((c) => c.id === e.currentTarget.value);
                    updateEditing({
                      categoryId: e.currentTarget.value,
                      categoryName: selectedCategory?.name || '',
                    });
                  }}
                  class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-[var(--color-text)] text-xs focus:outline-none focus:border-[var(--color-primary)]/50"
                >
                  <option value="">-- Pilih Kategori Layanan --</option>
                  {#each filteredCategoriesForEditor as cat (cat.id)}
                    <option value={cat.id}>
                      {cat.name} {cat.status !== 'active' ? '(Nonaktif)' : ''}
                    </option>
                  {/each}
                </select>
              </div>

              <!-- UNIT DROPDOWN -->
              <div class="space-y-1">
                <label class="font-semibold text-[var(--color-text)]">Unit Pelayanan</label>
                <select
                  value={editingService.unitId || ''}
                  onchange={(e) => {
                    const selectedUnit = units.find((u) => u.id === e.currentTarget.value);
                    updateEditing({
                      unitId: e.currentTarget.value,
                      unitName: selectedUnit?.name || '',
                    });
                  }}
                  class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-[var(--color-text)] text-xs focus:outline-none focus:border-[var(--color-primary)]/50"
                >
                  <option value="">-- Pilih Unit Pelayanan --</option>
                  {#each units as u (u.id)}
                    <option value={u.id}>
                      {u.name} {u.code ? `(${u.code})` : ''} {u.status !== 'active' ? '(Nonaktif)' : ''}
                    </option>
                  {/each}
                </select>
              </div>

              <!-- LOKASI DROPDOWN -->
              <div class="space-y-1">
                <label class="font-semibold text-[var(--color-text)]">Lokasi Pelayanan</label>
                <select
                  value={editingService.locationId || ''}
                  onchange={(e) => {
                    const selectedLoc = locations.find((l) => l.id === e.currentTarget.value);
                    updateEditing({
                      locationId: e.currentTarget.value,
                      locationName: selectedLoc?.name || '',
                    });
                  }}
                  class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-[var(--color-text)] text-xs focus:outline-none focus:border-[var(--color-primary)]/50"
                >
                  <option value="">-- Pilih Lokasi Pelayanan --</option>
                  {#each locations as loc (loc.id)}
                    <option value={loc.id}>
                      {loc.name} {loc.building ? `[${loc.building}]` : ''}
                      {loc.status !== 'active' ? '(Nonaktif)' : ''}
                    </option>
                  {/each}
                </select>
              </div>
            </div>
          </div>

          <div class="space-y-1 pt-2">
            <label class="font-semibold text-[var(--color-text)]">Deskripsi Singkat (Ringkasan Publik)</label>
            <textarea
              rows={2}
              value={editingService.shortDescription || ''}
              oninput={(e) => updateEditing({ shortDescription: e.currentTarget.value })}
              placeholder="Penjelasan ringkas jenis layanan kesehatan..."
              class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-3 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
            ></textarea>
          </div>

          <div class="space-y-1">
            <label class="font-semibold text-[var(--color-text)]">Deskripsi Detail & Informasi Utama</label>
            <textarea
              rows={4}
              value={editingService.description || ''}
              oninput={(e) => updateEditing({ description: e.currentTarget.value })}
              placeholder="Rincian komprehensif cakupan pelayanan medis..."
              class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-3 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] font-mono text-[11px] transition-colors"
            ></textarea>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-1">
              <label class="font-semibold text-[var(--color-text)]">Status Publikasi</label>
              <Select
                value={editingService.status || 'draft'}
                options={[
                  { value: 'draft', label: 'Draf (Sembunyi)' },
                  { value: 'published', label: 'Terbit (Publik)' },
                  { value: 'archived', label: 'Diarsipkan' },
                  { value: 'inactive', label: 'Nonaktif' },
                ]}
                onchange={(e) => updateEditing({ status: e.currentTarget.value as ServiceStatus })}
                class="bg-[var(--color-bg)] border-[var(--color-border)]"
              />
            </div>

            <div class="space-y-3 pt-4 md:pt-6">
              <div class="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="featured-check"
                  checked={Boolean(editingService.featured)}
                  onchange={(e) => updateEditing({ featured: e.currentTarget.checked })}
                  class="w-4 h-4 rounded border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]/20"
                />
                <label
                  for="featured-check"
                  class="font-medium text-[var(--color-text)] cursor-pointer select-none"
                >
                  Tampilkan sebagai Layanan Unggulan
                </label>
              </div>

              <div class="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="online-reg-check"
                  checked={Boolean(editingService.onlineRegistrationEnabled)}
                  onchange={(e) => updateEditing({ onlineRegistrationEnabled: e.currentTarget.checked })}
                  class="w-4 h-4 rounded border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-primary)] focus:ring-emerald-500/20"
                />
                <label
                  for="online-reg-check"
                  class="font-medium text-[var(--color-text)] cursor-pointer select-none"
                >
                  Aktifkan Pendaftaran Online (Pendaftaran Mandiri)
                </label>
              </div>

              <div class="pt-2 border-t border-[var(--color-border)]/50 space-y-3">
                <div class="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="queue-enabled-check"
                    checked={Boolean(editingService.queueEnabled)}
                    onchange={(e) => updateEditing({ queueEnabled: e.currentTarget.checked })}
                    class="w-4 h-4 rounded border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]/20"
                  />
                  <label
                    for="queue-enabled-check"
                    class="font-medium text-[var(--color-text)] cursor-pointer select-none"
                  >
                    Aktifkan Sistem Antrean Digital (Layanan ini menggunakan Antrean Digital)
                  </label>
                </div>

                {#if editingService.queueEnabled}
                  <div class="pl-7 space-y-1">
                    <label
                      for="queue-prefix-input"
                      class="text-xs text-[var(--color-muted-foreground)] font-medium block"
                    >
                      Prefix Nomor Antrean (Contoh: UM, GIG, A)
                    </label>
                    <input
                      type="text"
                      id="queue-prefix-input"
                      value={editingService.queuePrefix || ''}
                      oninput={(e) =>
                        updateEditing({ queuePrefix: e.currentTarget.value.toUpperCase().trim() })}
                      placeholder="A"
                      maxlength={5}
                      class="w-24 px-2.5 py-1.5 text-xs font-mono font-bold text-[var(--color-text)] bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-primary)]"
                    />
                  </div>
                {/if}
              </div>
            </div>
          </div>

          <!-- SEO OPTIMIZATION -->
          <div class="pt-3 border-t border-[var(--color-border)] space-y-3">
            <span
              class="text-[11px] font-bold uppercase tracking-wider text-[var(--color-muted-foreground)] block"
              >Optimasi SEO & Pencarian</span
            >
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div class="space-y-1">
                <label class="text-[var(--color-muted-foreground)]">SEO Title</label>
                <Input
                  value={editingService.seoTitle || ''}
                  oninput={(e) => updateEditing({ seoTitle: e.currentTarget.value })}
                  placeholder="Judul untuk Google Search..."
                  class="bg-[var(--color-bg)] border-[var(--color-border)]"
                />
              </div>
              <div class="space-y-1">
                <label class="text-[var(--color-muted-foreground)]">SEO Description</label>
                <Input
                  value={editingService.seoDescription || ''}
                  oninput={(e) => updateEditing({ seoDescription: e.currentTarget.value })}
                  placeholder="Meta deskripsi untuk Google Search..."
                  class="bg-[var(--color-bg)] border-[var(--color-border)]"
                />
              </div>
            </div>
          </div>

          <div class="pt-4 border-t border-[var(--color-border)] flex items-center justify-between">
            <div>
              {#if editingService.id && (editingService.status === 'draft' || editingService.status === 'rejected')}
                <Button
                  type="button"
                  variant="secondary"
                  onclick={handleSubmitForReview}
                  disabled={submittingReview || saving}
                  class="bg-[var(--color-primary)]/10 hover:bg-[var(--color-primary)]/20 text-[var(--color-primary)] border border-[var(--color-primary)]/30 text-xs font-semibold gap-1.5"
                >
                  <Send class="w-3.5 h-3.5" />
                  {submittingReview ? 'Mengirim...' : 'Kirim untuk Review'}
                </Button>
              {/if}
            </div>

            <div class="flex items-center space-x-3">
              <Button type="button" variant="ghost" onclick={() => (isEditorOpen = false)}>
                Batal
              </Button>
              <Button
                type="submit"
                disabled={saving}
                class="bg-[var(--color-primary)] hover:bg-amber-600 text-[var(--color-primary-foreground)] font-bold"
              >
                <Save class="w-4 h-4 mr-1.5" />
                {saving ? 'Menyimpan...' : 'Simpan Layanan'}
              </Button>
            </div>
          </div>
        </form>
      {/if}

      <!-- TAB CONTENT: PERSYARATAN -->
      {#if editorTab === 'requirements'}
        {#if editingService.id}
          <ServiceRequirementsTab serviceId={editingService.id} serviceName={editingService.name || ''} />
        {:else}
          {@render notSavedNotice(
            'Silakan simpan Informasi Utama layanan terlebih dahulu untuk mulai mengelola daftar persyaratan.'
          )}
        {/if}
      {/if}

      <!-- TAB CONTENT: PROSEDUR -->
      {#if editorTab === 'procedures'}
        {#if editingService.id}
          <ServiceProceduresTab serviceId={editingService.id} serviceName={editingService.name || ''} />
        {:else}
          {@render notSavedNotice(
            'Silakan simpan Informasi Utama layanan terlebih dahulu untuk mulai menyusun alur prosedur pelayanan.'
          )}
        {/if}
      {/if}

      <!-- TAB CONTENT: PRODUK OUTPUT -->
      {#if editorTab === 'products'}
        {#if editingService.id}
          <ServiceProductsTab serviceId={editingService.id} serviceName={editingService.name || ''} />
        {:else}
          {@render notSavedNotice(
            'Silakan simpan Informasi Utama layanan terlebih dahulu untuk mulai mendaftarkan produk output pelayanan.'
          )}
        {/if}
      {/if}

      <!-- TAB CONTENT: STANDAR PELAYANAN -->
      {#if editorTab === 'standards'}
        {#if editingService.id}
          <ServiceStandardsTab serviceId={editingService.id} serviceName={editingService.name || ''} />
        {:else}
          {@render notSavedNotice(
            'Silakan simpan Informasi Utama layanan terlebih dahulu untuk mulai mengisi Standar Pelayanan Publik.'
          )}
        {/if}
      {/if}

      <!-- TAB CONTENT: JADWAL PELAYANAN -->
      {#if editorTab === 'schedules'}
        {#if editingService.id}
          <ServiceSchedulesTab serviceId={editingService.id} serviceName={editingService.name || ''} />
        {:else}
          {@render notSavedNotice(
            'Silakan simpan Informasi Utama layanan terlebih dahulu untuk mengelola Jadwal Operasional Mingguan dan Jadwal Khusus.'
          )}
        {/if}
      {/if}

      <!-- TAB CONTENT: BIAYA / TARIF -->
      {#if editorTab === 'pricing'}
        {#if editingService.id}
          <ServicePricingTab serviceId={editingService.id} serviceName={editingService.name || ''} />
        {:else}
          {@render notSavedNotice(
            'Silakan simpan Informasi Utama layanan terlebih dahulu untuk mengelola Informasi Biaya dan Tarif.'
          )}
        {/if}
      {/if}
    </div>
  {/if}
</Modal>

<!-- CONFIRM DELETE MODAL -->
<ConfirmModal
  isOpen={deleteModalOpen}
  onClose={() => (deleteModalOpen = false)}
  onConfirm={handleDeleteConfirm}
  title="Hapus Layanan Kesehatan"
  message={`Apakah Anda yakin ingin menghapus layanan "${serviceToDelete?.name}" secara permanen? Langkah ini tidak dapat dibatalkan.`}
  confirmLabel="Hapus Permanen"
/>

<!-- PHASE 4H: BULK STATUS CONFIRM MODAL -->
<ConfirmModal
  isOpen={bulkActionConfirmOpen}
  onClose={() => {
    bulkActionConfirmOpen = false;
    bulkActionStatus = null;
  }}
  onConfirm={handleExecuteBulkStatus}
  title={`Konfirmasi Perubahan Status Massal`}
  message={`Anda akan mengubah status ${selectedServiceIds.length} layanan terpilih menjadi "${bulkActionStatus?.toUpperCase()}". Lanjutkan?`}
  confirmLabel="Ya, Lanjutkan Perubahan"
  isLoading={bulkActionLoading}
/>

<!-- PHASE 4H: BULK UPDATE METADATA MODAL -->
<BulkUpdateModal
  isOpen={isBulkUpdateModalOpen}
  onClose={() => (isBulkUpdateModalOpen = false)}
  selectedIds={selectedServiceIds}
  selectedCount={selectedServiceIds.length}
  {clusters}
  {categories}
  {units}
  {locations}
  onSuccess={() => {
    selectedServiceIds = [];
    loadServices();
  }}
/>

<!-- PHASE 4H: IMPORT CSV MODAL -->
<ServiceImportModal
  isOpen={isImportModalOpen}
  onClose={() => (isImportModalOpen = false)}
  onSuccess={() => {
    loadServices();
  }}
/>

<!-- PHASE 4H: EXPORT CSV MODAL -->
<ServiceExportModal
  isOpen={isExportModalOpen}
  onClose={() => (isExportModalOpen = false)}
  allServices={services}
  filteredServices={services}
/>

<!-- PHASE 4I: INCOMPLETE DATA MODAL BEFORE SUBMIT -->
{#if incompleteModalOpen}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
    <div
      class="bg-[var(--color-card)] border border-[var(--color-primary)]/30 w-full max-w-md rounded-3xl p-6 space-y-4 shadow-2xl"
    >
      <div class="flex items-center gap-3">
        <div
          class="w-10 h-10 rounded-2xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 flex items-center justify-center text-[var(--color-primary)]"
        >
          <AlertTriangle class="w-5 h-5" />
        </div>
        <div>
          <h3 class="font-bold text-[var(--color-text)] text-sm">Pengajuan Review Belum Memenuhi Syarat</h3>
          <p class="text-[11px] text-[var(--color-muted-foreground)]">Layanan tidak dapat dikirim untuk review</p>
        </div>
      </div>

      <p class="text-xs text-[var(--color-text)]">
        Lengkapi butir data berikut di tab penyuntingan sebelum mengajukan ke reviewer:
      </p>

      <ul
        class="space-y-2 text-xs text-[var(--color-primary)] bg-[var(--color-bg)] p-3.5 rounded-2xl border border-[var(--color-border)]"
      >
        {#each missingItemsList as item, idx (idx)}
          <li class="flex items-start gap-2">
            <XCircle class="w-4 h-4 text-[var(--color-primary)] shrink-0 mt-0.5" />
            <span>{item}</span>
          </li>
        {/each}
      </ul>

      <div class="flex justify-end pt-2 border-t border-[var(--color-border)]">
        <Button
          variant="primary"
          size="sm"
          onclick={() => (incompleteModalOpen = false)}
          class="bg-[var(--color-primary)] hover:bg-amber-600 text-[var(--color-primary-foreground)] font-bold"
        >
          Saya Mengerti, Perbaiki Data
        </Button>
      </div>
    </div>
  </div>
{/if}
