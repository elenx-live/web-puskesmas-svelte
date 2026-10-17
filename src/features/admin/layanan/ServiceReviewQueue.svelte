<!-- @component Antrean review & approval workflow layanan (Phase 4I): statistik status, inspeksi kelengkapan, setujui/kembalikan/publish. -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { authStore } from '../../../shared/stores/auth.svelte.js';
  import { toastStore } from '../../../shared/stores/toast.svelte.js';
  import type {
    ServiceEntity,
    ServiceStatus,
    ServiceRequirementEntity,
    ServiceProcedureEntity,
    ServiceProductEntity,
    ServiceStandardEntity,
    ServiceScheduleEntity,
    ServicePricingEntity,
  } from '../../../shared/types/index.js';
  import { serviceEngineService } from '../../../shared/services/serviceEngineService.js';
  import { sanitizeHtml } from '../../../shared/utils/sanitize.js';
  import Card from '../../../shared/ui/Card.svelte';
  import Badge from '../../../shared/ui/Badge.svelte';
  import Button from '../../../shared/ui/Button.svelte';
  import ConfirmModal from '../../../shared/components/ConfirmModal.svelte';
  import {
    Clock,
    CheckCircle2,
    XCircle,
    Globe,
    AlertTriangle,
    Search,
    Eye,
    Send,
    Building2,
    Sliders,
    RefreshCw,
    FileText,
    ShieldCheck,
    FileCheck2,
    ExternalLink,
    User,
  } from 'lucide-svelte';

  let loading = $state(true);
  let services = $state<ServiceEntity[]>([]);
  let filterStatus = $state('pending_review');
  let searchTerm = $state('');

  // Review Inspector Modal
  let inspectorOpen = $state(false);
  let selectedService = $state<ServiceEntity | null>(null);
  let loadingDetails = $state(false);

  // Inspection Relations
  let requirements = $state<ServiceRequirementEntity[]>([]);
  let procedures = $state<ServiceProcedureEntity[]>([]);
  let products = $state<ServiceProductEntity[]>([]);
  let standard = $state<ServiceStandardEntity | null>(null);
  let schedule = $state<ServiceScheduleEntity | null>(null);
  let pricingList = $state<ServicePricingEntity[]>([]);
  let validationResult = $state<{ valid: boolean; missingItems: string[] }>({
    valid: true,
    missingItems: [],
  });

  // Rejection Modal State
  let rejectionModalOpen = $state(false);
  let rejectionTarget = $state<ServiceEntity | null>(null);
  let rejectionReason = $state('');
  let rejecting = $state(false);

  // Approval / Publishing Confirm Modals
  let actionConfirmOpen = $state(false);
  let actionType = $state<'approve' | 'publish' | 'unpublish' | null>(null);
  let actionTarget = $state<ServiceEntity | null>(null);
  let processingAction = $state(false);

  const canApprove = $derived(
    authStore.hasPermission('approve_services') || authStore.hasPermission('manage_services_clusters')
  );
  const canReject = $derived(
    authStore.hasPermission('reject_services') || authStore.hasPermission('manage_services_clusters')
  );
  const canPublish = $derived(
    authStore.hasPermission('publish_services') || authStore.hasPermission('manage_services_clusters')
  );
  const canUnpublish = $derived(
    authStore.hasPermission('unpublish_services') || authStore.hasPermission('manage_services_clusters')
  );

  async function loadServices() {
    loading = true;
    try {
      const data = await serviceEngineService.getServices();
      services = data;
    } catch (error) {
      console.error('Failed to load services for review queue:', error);
      toastStore.showToast('Gagal memuat antrean review layanan', 'error');
    } finally {
      loading = false;
    }
  }

  async function handleOpenInspector(service: ServiceEntity) {
    selectedService = service;
    inspectorOpen = true;
    loadingDetails = true;

    try {
      const [reqs, procs, prods, std, sch, prcs, val] = await Promise.all([
        serviceEngineService.getRequirementsByServiceId(service.id),
        serviceEngineService.getProceduresByServiceId(service.id),
        serviceEngineService.getProductsByServiceId(service.id),
        serviceEngineService.getServiceStandard(service.id),
        serviceEngineService.getServiceSchedule(service.id),
        serviceEngineService.getPricingByServiceId(service.id),
        serviceEngineService.validateServiceForSubmit(service.id),
      ]);

      requirements = reqs;
      procedures = procs;
      products = prods;
      standard = std;
      schedule = sch;
      pricingList = prcs;
      validationResult = val;
    } catch (error) {
      console.error('Failed to load service details for review:', error);
      toastStore.showToast('Gagal memuat rincian kelengkapan layanan', 'error');
    } finally {
      loadingDetails = false;
    }
  }

  function handleTriggerAction(service: ServiceEntity, type: 'approve' | 'publish' | 'unpublish') {
    actionTarget = service;
    actionType = type;
    actionConfirmOpen = true;
  }

  async function handleExecuteAction() {
    const user = authStore.user;
    if (!actionTarget || !actionType || !user) return;
    processingAction = true;

    const actor = { id: user.uid, email: user.email, name: user.displayName || 'Reviewer' };

    try {
      if (actionType === 'approve') {
        await serviceEngineService.approveService(actionTarget.id, actor);
        toastStore.showToast(`Pengajuan layanan "${actionTarget.name}" telah disetujui`, 'success');
      } else if (actionType === 'publish') {
        await serviceEngineService.publishService(actionTarget.id, actor);
        toastStore.showToast(`Layanan "${actionTarget.name}" berhasil dipublikasikan ke publik`, 'success');
      } else if (actionType === 'unpublish') {
        await serviceEngineService.unpublishService(actionTarget.id, actor);
        toastStore.showToast(`Publikasi layanan "${actionTarget.name}" berhasil dibatalkan`, 'success');
      }

      actionConfirmOpen = false;
      actionTarget = null;
      actionType = null;
      if (inspectorOpen) inspectorOpen = false;
      await loadServices();
    } catch (error: any) {
      toastStore.showToast(error.message || 'Gagal memproses tindakan status', 'error');
    } finally {
      processingAction = false;
    }
  }

  function handleOpenRejectModal(service: ServiceEntity) {
    rejectionTarget = service;
    rejectionReason = '';
    rejectionModalOpen = true;
  }

  async function handleExecuteReject() {
    const user = authStore.user;
    if (!rejectionTarget || !user) return;
    if (!rejectionReason.trim()) {
      toastStore.showToast('Alasan pengembalian/penolakan wajib diisi', 'error');
      return;
    }

    rejecting = true;
    const actor = { id: user.uid, email: user.email, name: user.displayName || 'Reviewer' };

    try {
      await serviceEngineService.rejectService(rejectionTarget.id, rejectionReason, actor);
      toastStore.showToast(`Pengajuan layanan "${rejectionTarget.name}" telah dikembalikan untuk diperbaiki`, 'success');

      rejectionModalOpen = false;
      rejectionTarget = null;
      rejectionReason = '';
      if (inspectorOpen) inspectorOpen = false;
      await loadServices();
    } catch (error: any) {
      toastStore.showToast(error.message || 'Gagal mengembalikan pengajuan layanan', 'error');
    } finally {
      rejecting = false;
    }
  }

  // Status Filter Lists
  const filteredServices = $derived(
    services.filter((s) => {
      const matchesStatus = filterStatus === 'all' || s.status === filterStatus;
      const matchesSearch =
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.clusterName && s.clusterName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.unitName && s.unitName.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesStatus && matchesSearch;
    })
  );

  // Workflow Summary Counts
  const pendingCount = $derived(services.filter((s) => s.status === 'pending_review').length);
  const rejectedCount = $derived(services.filter((s) => s.status === 'rejected').length);
  const approvedCount = $derived(services.filter((s) => s.status === 'approved').length);
  const publishedCount = $derived(services.filter((s) => s.status === 'published').length);
  const draftCount = $derived(services.filter((s) => s.status === 'draft').length);

  const STATUS_TABS = $derived([
    { id: 'pending_review', label: `Menunggu Review (${pendingCount})` },
    { id: 'rejected', label: `Dikembalikan (${rejectedCount})` },
    { id: 'approved', label: `Disetujui (${approvedCount})` },
    { id: 'published', label: `Terbit (${publishedCount})` },
    { id: 'draft', label: `Draf (${draftCount})` },
    { id: 'all', label: `Semua Status (${services.length})` },
  ]);

  onMount(() => {
    loadServices();
  });
</script>

{#snippet statusBadge(status: ServiceStatus)}
  {#if status === 'published'}
    <Badge variant="emerald"><Globe class="w-3 h-3 inline mr-1" /> Terbit</Badge>
  {:else if status === 'approved'}
    <Badge variant="sky"><CheckCircle2 className="w-3 h-3 inline mr-1" /> Disetujui</Badge>
  {:else if status === 'pending_review'}
    <Badge variant="amber"><Clock class="w-3 h-3 inline mr-1" /> Menunggu Review</Badge>
  {:else if status === 'rejected'}
    <Badge variant="rose"><XCircle class="w-3 h-3 inline mr-1" /> Dikembalikan</Badge>
  {:else if status === 'draft'}
    <Badge variant="zinc">Draf</Badge>
  {:else if status === 'archived'}
    <Badge variant="zinc">Diarsipkan</Badge>
  {:else}
    <Badge variant="zinc">{status}</Badge>
  {/if}
{/snippet}

<div class="space-y-6">
  <!-- STATS OVERVIEW CARDS -->
  <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
    <button
      onclick={() => (filterStatus = 'pending_review')}
      class={`text-left p-4 rounded-3xl border transition ${
        filterStatus === 'pending_review'
          ? 'bg-[var(--color-primary)]/15 border-[var(--color-primary)]/40 ring-1 ring-[var(--color-primary)]/30'
          : 'bg-[var(--color-card)] border-[var(--color-border)] hover:border-[var(--color-primary)]/30'
      }`}
    >
      <div class="flex items-center justify-between mb-2">
        <span class="text-[10px] font-bold uppercase tracking-wider text-[var(--color-primary)]"
          >Menunggu Review</span
        >
        <Clock class="w-4 h-4 text-[var(--color-primary)]" />
      </div>
      <div class="text-2xl font-black text-[var(--color-text)]">{pendingCount}</div>
      <p class="text-[10px] text-[var(--color-muted-foreground)] mt-0.5">Memerlukan persetujuan</p>
    </button>

    <button
      onclick={() => (filterStatus = 'rejected')}
      class={`text-left p-4 rounded-3xl border transition ${
        filterStatus === 'rejected'
          ? 'bg-rose-500/15 border-rose-500/40 ring-1 ring-rose-500/30'
          : 'bg-[var(--color-card)] border-[var(--color-border)] hover:border-rose-500/30'
      }`}
    >
      <div class="flex items-center justify-between mb-2">
        <span class="text-[10px] font-bold uppercase tracking-wider text-rose-400">Dikembalikan</span>
        <XCircle class="w-4 h-4 text-rose-400" />
      </div>
      <div class="text-2xl font-black text-[var(--color-text)]">{rejectedCount}</div>
      <p class="text-[10px] text-[var(--color-muted-foreground)] mt-0.5">Perlu perbaikan editor</p>
    </button>

    <button
      onclick={() => (filterStatus = 'approved')}
      class={`text-left p-4 rounded-3xl border transition ${
        filterStatus === 'approved'
          ? 'bg-sky-500/15 border-sky-500/40 ring-1 ring-sky-500/30'
          : 'bg-[var(--color-card)] border-[var(--color-border)] hover:border-sky-500/30'
      }`}
    >
      <div class="flex items-center justify-between mb-2">
        <span class="text-[10px] font-bold uppercase tracking-wider text-sky-400">Disetujui</span>
        <CheckCircle2 class="w-4 h-4 text-sky-400" />
      </div>
      <div class="text-2xl font-black text-[var(--color-text)]">{approvedCount}</div>
      <p class="text-[10px] text-[var(--color-muted-foreground)] mt-0.5">Siap dipublikasikan</p>
    </button>

    <button
      onclick={() => (filterStatus = 'published')}
      class={`text-left p-4 rounded-3xl border transition ${
        filterStatus === 'published'
          ? 'bg-[var(--color-primary)]/15 border-[var(--color-primary)]/40 ring-1 ring-emerald-500/30'
          : 'bg-[var(--color-card)] border-[var(--color-border)] hover:border-[var(--color-primary)]/30'
      }`}
    >
      <div class="flex items-center justify-between mb-2">
        <span class="text-[10px] font-bold uppercase tracking-wider text-[var(--color-primary)]"
          >Dipublikasikan</span
        >
        <Globe class="w-4 h-4 text-[var(--color-primary)]" />
      </div>
      <div class="text-2xl font-black text-[var(--color-text)]">{publishedCount}</div>
      <p class="text-[10px] text-[var(--color-muted-foreground)] mt-0.5">Tayang di publik</p>
    </button>

    <button
      onclick={() => (filterStatus = 'draft')}
      class={`text-left p-4 rounded-3xl border transition ${
        filterStatus === 'draft'
          ? 'bg-[var(--color-surface)] border-zinc-600 ring-1 ring-zinc-500'
          : 'bg-[var(--color-card)] border-[var(--color-border)] hover:border-zinc-600'
      }`}
    >
      <div class="flex items-center justify-between mb-2">
        <span class="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted-foreground)]"
          >Draf Internal</span
        >
        <FileText class="w-4 h-4 text-[var(--color-muted-foreground)]" />
      </div>
      <div class="text-2xl font-black text-[var(--color-text)]">{draftCount}</div>
      <p class="text-[10px] text-[var(--color-muted-foreground)] mt-0.5">Proses penyusunan</p>
    </button>
  </div>

  <!-- SEARCH AND TAB BAR -->
  <Card class="p-4 border-[var(--color-border)] bg-[var(--color-card)] space-y-4">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
      <div class="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
        {#each STATUS_TABS as tab (tab.id)}
          <button
            onclick={() => (filterStatus = tab.id)}
            class={`px-3.5 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition ${
              filterStatus === tab.id
                ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/30'
                : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-text)] hover:bg-[var(--color-card)]'
            }`}
          >
            {tab.label}
          </button>
        {/each}
      </div>

      <div class="relative w-full md:w-64 shrink-0">
        <Search class="w-4 h-4 absolute left-3 top-2.5 text-[var(--color-muted-foreground)]" />
        <input
          type="text"
          value={searchTerm}
          oninput={(e) => (searchTerm = e.currentTarget.value)}
          placeholder="Cari layanan, unit, klaster..."
          class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl pl-9 pr-3 py-1.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
        />
      </div>
    </div>
  </Card>

  <!-- QUEUE TABLE / LIST -->
  <Card class="border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
    {#if loading}
      <div class="p-12 text-center text-[var(--color-muted-foreground)] space-y-2">
        <RefreshCw class="w-6 h-6 animate-spin mx-auto text-[var(--color-primary)]" />
        <p class="text-xs">Memuat antrean workflow layanan...</p>
      </div>
    {:else if filteredServices.length === 0}
      <div class="p-12 text-center text-[var(--color-muted-foreground)] space-y-3">
        <CheckCircle2 class="w-10 h-10 mx-auto text-[var(--color-primary)]/60" />
        <p class="text-sm font-medium text-[var(--color-text)]">Tidak Ada Layanan Ditemukan</p>
        <p class="text-xs text-[var(--color-muted-foreground)] max-w-sm mx-auto">
          {#if filterStatus === 'pending_review'}
            Semua pengajuan layanan telah diproses. Tidak ada item yang menunggu review.
          {:else}
            Tidak ada data layanan kesehatan yang cocok dengan kriteria filter.
          {/if}
        </p>
      </div>
    {:else}
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr
              class="border-b border-[var(--color-border)] bg-[var(--color-bg)]/50 text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted-foreground)]"
            >
              <th class="py-3 px-4">Layanan & Slug</th>
              <th class="py-3 px-4">Klaster & Unit</th>
              <th class="py-3 px-4">Pengusul & Waktu</th>
              <th class="py-3 px-4">Reviewer</th>
              <th class="py-3 px-4 text-center">Status Workflow</th>
              <th class="py-3 px-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[var(--color-border)] text-xs">
            {#each filteredServices as srv (srv.id)}
              <tr class="hover:bg-[var(--color-card)]/50 transition-colors">
                <td class="py-3.5 px-4 max-w-xs">
                  <div class="font-bold text-[var(--color-text)] hover:text-[var(--color-primary)] transition-colors">
                    {srv.name}
                  </div>
                  <div class="text-[10px] font-mono text-[var(--color-primary)]/80 line-clamp-1">
                    /layanan/{srv.slug}
                  </div>
                  {#if srv.rejectionReason}
                    <div
                      class="mt-1 p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-[10px] text-rose-300"
                    >
                      <strong>Alasan Dikembalikan:</strong>
                      {srv.rejectionReason}
                    </div>
                  {/if}
                </td>

                <td class="py-3.5 px-4 space-y-1">
                  <div class="flex items-center gap-1 text-[var(--color-text)] font-medium text-[11px]">
                    <Sliders class="w-3 h-3 text-[var(--color-primary)] shrink-0" />
                    <span class="truncate">{srv.clusterName || '—'}</span>
                  </div>
                  <div class="flex items-center gap-1 text-[var(--color-muted-foreground)] text-[10px]">
                    <Building2 class="w-3 h-3 text-blue-400 shrink-0" />
                    <span class="truncate">{srv.unitName || '—'}</span>
                  </div>
                </td>

                <td class="py-3.5 px-4 space-y-0.5 text-[11px]">
                  <div class="text-[var(--color-text)] font-medium flex items-center gap-1">
                    <User class="w-3 h-3 text-[var(--color-muted-foreground)]" />
                    {srv.submittedBy?.name || srv.createdBy?.name || 'Sistem'}
                  </div>
                  <div class="text-[10px] text-[var(--color-muted-foreground)] font-mono">
                    {srv.submittedAt
                      ? new Date(srv.submittedAt).toLocaleString('id-ID', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })
                      : new Date(srv.createdAt).toLocaleDateString('id-ID')}
                  </div>
                </td>

                <td class="py-3.5 px-4 space-y-0.5 text-[11px]">
                  {#if srv.reviewedBy}
                    <div class="text-sky-300 font-medium">{srv.reviewedBy.name}</div>
                    <div class="text-[10px] text-[var(--color-muted-foreground)] font-mono">
                      {srv.reviewedAt ? new Date(srv.reviewedAt).toLocaleDateString('id-ID') : '—'}
                    </div>
                  {:else}
                    <span class="text-zinc-600 text-[10px] italic">Belum Ditinjau</span>
                  {/if}
                </td>

                <td class="py-3.5 px-4 text-center">
                  {@render statusBadge(srv.status)}
                </td>

                <td class="py-3.5 px-4 text-right whitespace-nowrap space-x-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    onclick={() => handleOpenInspector(srv)}
                    class="h-8 text-[11px] gap-1 px-2.5"
                  >
                    <Eye class="w-3.5 h-3.5" /> Inspekti
                  </Button>

                  <!-- WORKFLOW ACTION BUTTONS -->
                  {#if srv.status === 'pending_review'}
                    {#if canApprove}
                      <Button
                        variant="primary"
                        size="sm"
                        onclick={() => handleTriggerAction(srv, 'approve')}
                        class="h-8 text-[11px] gap-1 px-2.5 bg-sky-600 hover:bg-sky-500 border-sky-500"
                      >
                        <CheckCircle2 class="w-3.5 h-3.5" /> Setujui
                      </Button>
                    {/if}

                    {#if canReject}
                      <Button
                        variant="danger"
                        size="sm"
                        onclick={() => handleOpenRejectModal(srv)}
                        class="h-8 text-[11px] gap-1 px-2.5"
                      >
                        <XCircle class="w-3.5 h-3.5" /> Kembalikan
                      </Button>
                    {/if}
                  {/if}

                  {#if srv.status === 'approved' && canPublish}
                    <Button
                      variant="primary"
                      size="sm"
                      onclick={() => handleTriggerAction(srv, 'publish')}
                      class="h-8 text-[11px] gap-1 px-2.5 bg-emerald-600 hover:bg-[var(--color-primary)] border-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                    >
                      <Globe class="w-3.5 h-3.5" /> Publish
                    </Button>
                  {/if}

                  {#if srv.status === 'published' && canUnpublish}
                    <Button
                      variant="ghost"
                      size="sm"
                      onclick={() => handleTriggerAction(srv, 'unpublish')}
                      title="Batal Publikasi (Kembali ke Draf)"
                      class="h-8 text-[11px] text-[var(--color-primary)] hover:text-[var(--color-primary)]"
                    >
                      <Clock class="w-3.5 h-3.5" /> Unpublish
                    </Button>
                  {/if}

                  <!-- PREVIEW BUTTON -->
                  <a
                    href={`#/layanan/${srv.slug}?preview=true`}
                    target="_blank"
                    rel="noreferrer"
                    class="inline-flex items-center gap-1 h-8 px-2.5 rounded-xl text-[11px] font-semibold bg-[var(--color-surface)] text-[var(--color-text)] hover:text-[var(--color-text)] hover:bg-zinc-700 transition"
                    title="Pratinjau Halaman Publik dengan Label Preview"
                  >
                    <ExternalLink class="w-3.5 h-3.5" /> Pratinjau
                  </a>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </Card>
</div>

<!-- REVIEW INSPECTOR MODAL -->
{#if inspectorOpen && selectedService}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
    <div
      class="bg-[var(--color-card)] border border-[var(--color-border)] w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
    >
      <!-- Modal Header -->
      <div
        class="p-6 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-bg)]/50"
      >
        <div class="flex items-center gap-3">
          <div
            class="w-10 h-10 rounded-2xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 flex items-center justify-center text-[var(--color-primary)] font-bold"
          >
            <ShieldCheck class="w-5 h-5" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-[10px] font-bold uppercase tracking-widest text-[var(--color-primary)]"
                >Inspeksi Review Layanan</span
              >
              {@render statusBadge(selectedService.status)}
            </div>
            <h2 class="text-lg font-bold text-[var(--color-text)]">{selectedService.name}</h2>
          </div>
        </div>

        <button
          onclick={() => (inspectorOpen = false)}
          class="p-2 text-[var(--color-muted-foreground)] hover:text-[var(--color-text)] rounded-xl hover:bg-[var(--color-surface)] transition"
        >
          ✕
        </button>
      </div>

      <!-- Modal Body -->
      <div class="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
        {#if loadingDetails}
          <div class="p-12 text-center text-[var(--color-muted-foreground)] space-y-2">
            <RefreshCw class="w-6 h-6 animate-spin mx-auto text-[var(--color-primary)]" />
            <p class="text-xs">Memuat rincian layanan...</p>
          </div>
        {:else}
          <!-- REJECTION HISTORY BANNER IF ANY -->
          {#if selectedService.rejectionReason}
            <div class="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 space-y-1">
              <div class="flex items-center gap-1.5 font-bold text-rose-400 text-xs">
                <AlertTriangle class="w-4 h-4" /> Catatan Pengembalian Sebelumnya:
              </div>
              <p class="text-xs pl-5">{selectedService.rejectionReason}</p>
            </div>
          {/if}

          <!-- COMPLETENESS AUDIT CHECKLIST -->
          <div class="p-4 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] space-y-3">
            <div class="flex items-center justify-between">
              <span
                class="font-bold text-[var(--color-text)] text-xs uppercase tracking-wider flex items-center gap-1.5"
              >
                <FileCheck2 class="w-4 h-4 text-[var(--color-primary)]" /> Hasil Audit Kelengkapan Data
              </span>
              {#if validationResult.valid}
                <Badge variant="emerald"><CheckCircle2 class="w-3 h-3 inline mr-1" /> Data Lengkap 100%</Badge>
              {:else}
                <Badge variant="rose"
                  ><AlertTriangle class="w-3 h-3 inline mr-1" />
                  {validationResult.missingItems.length} Item Belum Lengkap</Badge
                >
              {/if}
            </div>

            {#if !validationResult.valid}
              <ul
                class="grid grid-cols-1 md:grid-cols-2 gap-1.5 text-rose-400 text-[11px] pt-1 border-t border-[var(--color-border)]"
              >
                {#each validationResult.missingItems as item, idx (idx)}
                  <li class="flex items-center gap-1.5">
                    <XCircle class="w-3.5 h-3.5 shrink-0" /> {item}
                  </li>
                {/each}
              </ul>
            {/if}
          </div>

          <!-- SERVICE SUMMARY GRID -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="p-4 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] space-y-2">
              <div class="text-[10px] font-bold text-[var(--color-primary)] uppercase">Informasi Klasifikasi</div>
              <div class="space-y-1 text-[var(--color-text)]">
                <div><strong>Klaster:</strong> {selectedService.clusterName || '—'}</div>
                <div><strong>Kategori:</strong> {selectedService.categoryName || '—'}</div>
                <div><strong>Unit:</strong> {selectedService.unitName || '—'}</div>
                <div><strong>Lokasi:</strong> {selectedService.locationName || '—'}</div>
              </div>
            </div>

            <div class="p-4 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] space-y-2">
              <div class="text-[10px] font-bold text-[var(--color-primary)] uppercase">Riwayat Workflow</div>
              <div class="space-y-1 text-[var(--color-text)] text-[11px]">
                <div>
                  <strong>Pengusul:</strong>
                  {selectedService.submittedBy?.name || selectedService.createdBy?.name || '—'}
                </div>
                <div>
                  <strong>Waktu Pengajuan:</strong>
                  {selectedService.submittedAt
                    ? new Date(selectedService.submittedAt).toLocaleString('id-ID')
                    : '—'}
                </div>
                <div><strong>Ditinjau Oleh:</strong> {selectedService.reviewedBy?.name || '—'}</div>
                <div>
                  <strong>Dipublikasikan:</strong>
                  {selectedService.publishedAt
                    ? new Date(selectedService.publishedAt).toLocaleString('id-ID')
                    : 'Belum'}
                </div>
              </div>
            </div>
          </div>

          <!-- DESCRIPTIONS -->
          <div class="p-4 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] space-y-2">
            <div class="text-[10px] font-bold text-[var(--color-primary)] uppercase">
              Deskripsi Singkat & Lengkap
            </div>
            <p class="text-[var(--color-text)] italic">{selectedService.shortDescription || 'Tanpa deskripsi singkat'}</p>
            <div
              class="text-[var(--color-muted-foreground)] text-xs border-t border-[var(--color-border)] pt-2 prose prose-invert max-w-none"
            >
              {@html sanitizeHtml(selectedService.description || '<p>Tanpa deskripsi lengkap</p>')}
            </div>
          </div>

          <!-- TABS OF COMPONENT RELATIONS -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div class="p-3 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] space-y-1">
              <div class="font-bold text-[var(--color-text)] text-[11px] flex items-center justify-between">
                <span>Persyaratan</span>
                <Badge variant="zinc">{requirements.length}</Badge>
              </div>
              <ul class="space-y-1 text-[11px] text-[var(--color-muted-foreground)] pl-2">
                {#each requirements as r (r.id)}
                  <li class="line-clamp-1">• {r.title}</li>
                {/each}
              </ul>
            </div>

            <div class="p-3 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] space-y-1">
              <div class="font-bold text-[var(--color-text)] text-[11px] flex items-center justify-between">
                <span>Prosedur/Alur</span>
                <Badge variant="zinc">{procedures.length}</Badge>
              </div>
              <ul class="space-y-1 text-[11px] text-[var(--color-muted-foreground)] pl-2">
                {#each procedures as p (p.id)}
                  <li class="line-clamp-1">{p.stepNumber}. {p.title}</li>
                {/each}
              </ul>
            </div>

            <div class="p-3 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] space-y-1">
              <div class="font-bold text-[var(--color-text)] text-[11px] flex items-center justify-between">
                <span>Produk Output</span>
                <Badge variant="zinc">{products.length}</Badge>
              </div>
              <ul class="space-y-1 text-[11px] text-[var(--color-muted-foreground)] pl-2">
                {#each products as p (p.id)}
                  <li class="line-clamp-1">• {p.name}</li>
                {/each}
              </ul>
            </div>
          </div>
        {/if}
      </div>

      <!-- Modal Footer -->
      <div
        class="p-4 border-t border-[var(--color-border)] bg-[var(--color-bg)]/50 flex flex-wrap items-center justify-between gap-2"
      >
        <a
          href={`#/layanan/${selectedService.slug}?preview=true`}
          target="_blank"
          rel="noreferrer"
          class="px-3 py-2 rounded-xl text-xs font-semibold bg-[var(--color-surface)] hover:bg-zinc-700 text-[var(--color-text)] flex items-center gap-1.5 transition"
        >
          <ExternalLink class="w-3.5 h-3.5" /> Pratinjau Tampilan Publik
        </a>

        <div class="flex items-center gap-2">
          {#if selectedService.status === 'pending_review'}
            {#if canReject}
              <Button
                variant="danger"
                size="sm"
                onclick={() => handleOpenRejectModal(selectedService)}
              >
                <XCircle class="w-3.5 h-3.5" /> Kembalikan untuk Perbaikan
              </Button>
            {/if}

            {#if canApprove}
              <Button
                variant="primary"
                size="sm"
                onclick={() => handleTriggerAction(selectedService, 'approve')}
                class="bg-sky-600 hover:bg-sky-500 border-sky-500"
              >
                <CheckCircle2 class="w-3.5 h-3.5" /> Setujui Pengajuan
              </Button>
            {/if}
          {/if}

          {#if selectedService.status === 'approved' && canPublish}
            <Button
              variant="primary"
              size="sm"
              onclick={() => handleTriggerAction(selectedService, 'publish')}
              class="bg-emerald-600 hover:bg-[var(--color-primary)] border-[var(--color-primary)] text-[var(--color-primary-foreground)]"
            >
              <Globe class="w-3.5 h-3.5" /> Dipublikasikan
            </Button>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- REJECTION REASON MODAL -->
{#if rejectionModalOpen && rejectionTarget}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
    <div
      class="bg-[var(--color-card)] border border-rose-500/30 w-full max-w-md rounded-3xl p-6 space-y-4 shadow-2xl"
    >
      <div class="flex items-center gap-3">
        <div
          class="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400"
        >
          <XCircle class="w-5 h-5" />
        </div>
        <div>
          <h3 class="font-bold text-[var(--color-text)] text-sm">Kembalikan Pengajuan Layanan</h3>
          <p class="text-[11px] text-[var(--color-muted-foreground)]">{rejectionTarget.name}</p>
        </div>
      </div>

      <p class="text-xs text-[var(--color-text)]">
        Wajib memberikan alasan atau catatan perbaikan yang harus ditindaklanjuti oleh Editor Konten:
      </p>

      <textarea
        value={rejectionReason}
        oninput={(e) => (rejectionReason = e.currentTarget.value)}
        placeholder="Contoh: Deskripsi persyaratan kurang detail dan rincian tarif belum disesuaikan dengan Perda terbaru."
        rows={4}
        class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl p-3 text-xs text-[var(--color-text)] focus:outline-none focus:border-rose-500"
      ></textarea>

      <div class="flex items-center justify-end gap-2 pt-2 border-t border-[var(--color-border)]">
        <Button variant="ghost" size="sm" onclick={() => (rejectionModalOpen = false)} disabled={rejecting}>
          Batal
        </Button>
        <Button
          variant="danger"
          size="sm"
          onclick={handleExecuteReject}
          disabled={rejecting || !rejectionReason.trim()}
        >
          {#if rejecting}
            <RefreshCw class="w-3.5 h-3.5 animate-spin" />
          {:else}
            <Send class="w-3.5 h-3.5" />
          {/if}
          Kembalikan Berkas
        </Button>
      </div>
    </div>
  </div>
{/if}

<!-- CONFIRMATION MODAL -->
<ConfirmModal
  isOpen={actionConfirmOpen}
  onClose={() => {
    actionConfirmOpen = false;
    actionTarget = null;
    actionType = null;
  }}
  onConfirm={handleExecuteAction}
  title={actionType === 'approve'
    ? 'Konfirmasi Persetujuan Layanan'
    : actionType === 'publish'
      ? 'Konfirmasi Publikasi Layanan'
      : 'Konfirmasi Pembatalan Publikasi'}
  message={actionType === 'approve'
    ? `Apakah Anda yakin ingin menyetujui pengajuan layanan "${actionTarget?.name}"? Status akan berubah menjadi "Disetujui".`
    : actionType === 'publish'
      ? `Layanan "${actionTarget?.name}" akan diterbitkan dan tampil secara publik di direktori layanan. Lanjutkan?`
      : `Apakah Anda yakin ingin membatalkan publikasi layanan "${actionTarget?.name}"? Layanan akan ditarik dari tampilan publik.`}
  confirmLabel="Ya, Lanjutkan"
  isLoading={processingAction}
/>
