<!-- @component Direktori layanan kesehatan publik — pencarian, filter status/klaster/kategori/unit/lokasi, dan kartu layanan. -->
<script lang="ts">
  import {
    serviceEngineService,
    calculateTodayOperationalStatus,
    type OperationalStatusResult
  } from '../../shared/services/serviceEngineService.js';
  import { siteSettingsService } from '../../shared/services/siteSettingsService.js';
  import type {
    ServiceEntity,
    ServiceCategoryEntity,
    ServiceClusterEntity,
    ServiceUnitEntity,
    ServiceLocationEntity,
    ServiceScheduleEntity,
    ServiceScheduleExceptionEntity
  } from '../../shared/types/index.js';
  import Badge from '../../shared/ui/Badge.svelte';
  import Button from '../../shared/ui/Button.svelte';
  import Select from '../../shared/ui/Select.svelte';
  import LoadingSkeleton from '../../shared/ui/LoadingSkeleton.svelte';
  import EmptyState from '../../shared/ui/EmptyState.svelte';
  import ErrorState from '../../shared/ui/ErrorState.svelte';
  import {
    Search,
    Filter,
    X,
    Clock,
    MapPin,
    Building2,
    Sparkles,
    Info,
    RefreshCw,
    SlidersHorizontal,
    ArrowRight
  } from 'lucide-svelte';

  interface ServiceWithMeta {
    service: ServiceEntity;
    schedule: ServiceScheduleEntity | null;
    exceptions: ServiceScheduleExceptionEntity[];
    statusResult: OperationalStatusResult;
  }

  let loading = $state(true);
  let loadError = $state<string | null>(null);
  let siteName = $state('Puskesmas');
  let servicesData = $state<ServiceWithMeta[]>([]);

  // Filter Options
  let categories = $state<ServiceCategoryEntity[]>([]);
  let clusters = $state<ServiceClusterEntity[]>([]);
  let units = $state<ServiceUnitEntity[]>([]);
  let locations = $state<ServiceLocationEntity[]>([]);

  // Filter States
  let searchTerm = $state('');
  let selectedCluster = $state('');
  let selectedCategory = $state('');
  let selectedUnit = $state('');
  let selectedLocation = $state('');
  let selectedStatusFilter = $state('');
  let showMobileFilters = $state(false);

  async function loadData() {
    loading = true;
    loadError = null;
    try {
      const settings = await siteSettingsService.getSettings();
      if (settings?.siteName) {
        siteName = settings.siteName;
        document.title = `Daftar Layanan Kesehatan | ${settings.siteName}`;
      } else {
        document.title = `Daftar Layanan Kesehatan | Puskesmas`;
      }

      // Fetch master options
      const [cats, cls, uns, locs, publishedServices, allExceptions] = await Promise.all([
        serviceEngineService.getCategories({ status: 'active' }),
        serviceEngineService.getClusters({ status: 'active' }),
        serviceEngineService.getUnits({ status: 'active' }),
        serviceEngineService.getLocations({ status: 'active' }),
        serviceEngineService.getPublishedServices(),
        serviceEngineService.getAllScheduleExceptions({ includePast: false })
      ]);

      categories = cats;
      clusters = cls;
      units = uns;
      locations = locs;

      // Fetch schedules and calculate operational status for each service
      const now = new Date();
      const enriched: ServiceWithMeta[] = await Promise.all(
        publishedServices.map(async (srv) => {
          const schedule = await serviceEngineService.getServiceSchedule(srv.id);
          const serviceExceptions = allExceptions.filter((e) => e.serviceId === srv.id);
          const statusResult = calculateTodayOperationalStatus(srv, schedule, serviceExceptions, now);

          return {
            service: srv,
            schedule,
            exceptions: serviceExceptions,
            statusResult
          };
        })
      );

      servicesData = enriched;
    } catch (err) {
      console.error('Gagal memuat data layanan publik:', err);
      loadError = 'Data layanan tidak dapat dimuat. Periksa koneksi internet Anda lalu coba lagi.';
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    loadData();
  });

  // Filter calculation
  const filteredServices = $derived.by(() =>
    servicesData.filter(({ service, statusResult }) => {
      // Search query match
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const nameMatch = service.name.toLowerCase().includes(q);
        const shortDescMatch = (service.shortDescription || '').toLowerCase().includes(q);
        const descMatch = (service.description || '').toLowerCase().includes(q);
        const catMatch = (service.categoryName || '').toLowerCase().includes(q);
        const unitMatch = (service.unitName || '').toLowerCase().includes(q);
        if (!nameMatch && !shortDescMatch && !descMatch && !catMatch && !unitMatch) {
          return false;
        }
      }

      // Cluster filter
      if (selectedCluster && service.clusterId !== selectedCluster) {
        return false;
      }

      // Category filter
      if (selectedCategory && service.categoryId !== selectedCategory) {
        return false;
      }

      // Unit filter
      if (selectedUnit && service.unitId !== selectedUnit) {
        return false;
      }

      // Location filter
      if (selectedLocation && service.locationId !== selectedLocation) {
        return false;
      }

      // Operational Status filter
      if (selectedStatusFilter) {
        if (selectedStatusFilter === 'open' && statusResult.code !== 'open') return false;
        if (selectedStatusFilter === 'closed' && statusResult.code !== 'closed' && statusResult.code !== 'outside_hours') return false;
        if (selectedStatusFilter === 'break' && statusResult.code !== 'break') return false;
      }

      return true;
    })
  );

  const hasActiveFilters = $derived(
    Boolean(searchTerm || selectedCluster || selectedCategory || selectedUnit || selectedLocation || selectedStatusFilter)
  );

  const clusterOptions = $derived([
    { value: '', label: 'Semua Klaster' },
    ...clusters.map((c) => ({ value: c.id, label: c.name }))
  ]);

  const categoryOptions = $derived([
    { value: '', label: 'Semua Kategori' },
    ...categories.map((cat) => ({ value: cat.id, label: cat.name }))
  ]);

  const unitOptions = $derived([
    { value: '', label: 'Semua Unit' },
    ...units.map((u) => ({ value: u.id, label: u.name }))
  ]);

  const locationOptions = $derived([
    { value: '', label: 'Semua Lokasi' },
    ...locations.map((loc) => ({ value: loc.id, label: `${loc.name} (${loc.building || 'Utama'})` }))
  ]);

  function resetFilters() {
    searchTerm = '';
    selectedCluster = '';
    selectedCategory = '';
    selectedUnit = '';
    selectedLocation = '';
    selectedStatusFilter = '';
  }

  function getStatusBadgeVariant(variant: OperationalStatusResult['badgeVariant']): 'emerald' | 'rose' | 'amber' | 'purple' | 'zinc' {
    switch (variant) {
      case 'emerald':
        return 'emerald';
      case 'red':
        return 'rose';
      case 'amber':
        return 'amber';
      case 'purple':
        return 'purple';
      default:
        return 'zinc';
    }
  }
</script>

<div class="py-12 px-4 sm:px-6 max-w-7xl mx-auto space-y-8">
  <!-- Header Title Section -->
  <div class="space-y-3 border-b border-[var(--color-border)] pb-8">
    <div class="flex items-center gap-2">
      <span class="text-xs font-bold uppercase tracking-widest text-[var(--color-primary)]">
        Standar Pelayanan Publik
      </span>
      <span class="text-xs text-zinc-600">•</span>
      <span class="text-xs text-[var(--color-muted-foreground)]">UU No. 25/2009 &amp; Permenkes 19/2024</span>
    </div>
    <h1 class="text-3xl sm:text-4xl font-light text-[var(--color-text)] tracking-tight">
      Direktori Layanan Kesehatan
    </h1>
    <p class="text-xs sm:text-sm text-[var(--color-muted-foreground)] max-w-3xl leading-relaxed">
      Temukan informasi lengkap mengenai jenis pelayanan kesehatan, jadwal operasional, persyaratan pendaftaran, alur prosedur, dan informasi tarif resmi di {siteName}.
    </p>
  </div>

  <!-- Search & Filter Bar -->
  <div class="space-y-4">
    <div class="flex flex-col lg:flex-row gap-3 items-stretch">
      <!-- Search Input -->
      <div class="relative flex-1">
        <Search class="w-4 h-4 text-[var(--color-muted-foreground)] absolute left-4 top-3.5 pointer-events-none" />
        <input
          type="text"
          placeholder="Cari layanan kesehatan (misal: KIA, Poli Umum, UGD, Laboratorium)..."
          bind:value={searchTerm}
          class="w-full bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl pl-11 pr-10 py-3 text-xs sm:text-sm text-[var(--color-text)] placeholder-zinc-500 focus:outline-none focus:border-[var(--color-primary)]/50 transition"
        />
        {#if searchTerm}
          <button
            onclick={() => (searchTerm = '')}
            class="absolute right-3.5 top-3.5 text-[var(--color-muted-foreground)] hover:text-[var(--color-text)]"
          >
            <X class="w-4 h-4" />
          </button>
        {/if}
      </div>

      <!-- Mobile Filter Toggle Button -->
      <button
        onclick={() => (showMobileFilters = !showMobileFilters)}
        class="lg:hidden flex items-center justify-center gap-2 px-4 py-3 bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl text-xs text-[var(--color-text)] font-medium hover:bg-[var(--color-card)]"
      >
        <SlidersHorizontal class="w-4 h-4 text-[var(--color-primary)]" />
        <span>Filter Layanan</span>
        {#if hasActiveFilters}
          <span class="w-2 h-2 rounded-full bg-[var(--color-primary)]"></span>
        {/if}
      </button>

      <!-- Quick Status Filter Pills (Desktop & Mobile) -->
      <div class="hidden lg:flex items-center gap-2">
        <button
          onclick={() => (selectedStatusFilter = selectedStatusFilter === 'open' ? '' : 'open')}
          class={`px-3 py-2.5 rounded-xl text-xs font-medium border transition flex items-center gap-1.5 ${
            selectedStatusFilter === 'open'
              ? 'bg-[var(--color-primary)]/20 text-emerald-300 border-[var(--color-primary)]/40'
              : 'bg-[var(--color-card)] text-[var(--color-muted-foreground)] border-[var(--color-border)] hover:text-[var(--color-text)]'
          }`}
        >
          <span class="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-pulse"></span>
          <span>Sedang Buka</span>
        </button>
        <button
          onclick={() => (selectedStatusFilter = selectedStatusFilter === 'break' ? '' : 'break')}
          class={`px-3 py-2.5 rounded-xl text-xs font-medium border transition flex items-center gap-1.5 ${
            selectedStatusFilter === 'break'
              ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)] border-[var(--color-primary)]/40'
              : 'bg-[var(--color-card)] text-[var(--color-muted-foreground)] border-[var(--color-border)] hover:text-[var(--color-text)]'
          }`}
        >
          <span class="w-2 h-2 rounded-full bg-[var(--color-primary)]"></span>
          <span>Istirahat</span>
        </button>
      </div>
    </div>

    <!-- Detailed Filters Panel (Desktop permanent / Mobile toggleable) -->
    <div class={`${showMobileFilters ? 'block' : 'hidden'} lg:block bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl p-4 space-y-3`}>
      <div class="flex items-center justify-between pb-2 border-b border-[var(--color-border)]/60 text-xs text-[var(--color-muted-foreground)]">
        <div class="flex items-center gap-2 font-medium text-[var(--color-text)]">
          <Filter class="w-3.5 h-3.5 text-[var(--color-primary)]" />
          <span>Filter Kategori &amp; Lokasi</span>
        </div>
        {#if hasActiveFilters}
          <button
            onclick={resetFilters}
            class="text-[var(--color-primary)] hover:text-[var(--color-primary)] transition flex items-center gap-1"
          >
            <RefreshCw class="w-3 h-3" />
            <span>Reset Filter</span>
          </button>
        {/if}
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <Select label="Klaster Integrasi" options={clusterOptions} bind:value={selectedCluster} />
        <Select label="Kategori Layanan" options={categoryOptions} bind:value={selectedCategory} />
        <Select label="Unit Pelayanan" options={unitOptions} bind:value={selectedUnit} />
        <Select label="Lokasi / Gedung" options={locationOptions} bind:value={selectedLocation} />
      </div>
    </div>
  </div>

  <!-- Results Counter Bar -->
  <div class="flex items-center justify-between text-xs text-[var(--color-muted-foreground)] px-1">
    <div>
      Menampilkan <strong class="text-[var(--color-text)]">{filteredServices.length}</strong> dari{' '}
      <span class="text-[var(--color-text)]">{servicesData.length}</span> layanan publik
    </div>
    {#if hasActiveFilters}
      <div class="text-[var(--color-primary)]/90 font-medium">Filter Aktif</div>
    {/if}
  </div>

  <!-- Services List Content -->
  {#if loading}
    <LoadingSkeleton variant="card" count={6} />
  {:else if loadError}
    <ErrorState message={loadError} onRetry={loadData} retrying={loading} />
  {:else if filteredServices.length === 0}
    <EmptyState
      icon={Info}
      title="Layanan tidak ditemukan"
      description="Tidak ada layanan kesehatan yang sesuai dengan kata kunci pencarian atau kombinasi filter yang Anda pilih."
      actionLabel={hasActiveFilters ? 'Reset Semua Filter' : ''}
      onAction={hasActiveFilters ? resetFilters : undefined}
    />
  {:else}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {#each filteredServices as { service, statusResult } (service.id)}
        <a
          href={`#/layanan/${service.slug}`}
          class="bg-[var(--color-card)] hover:bg-[var(--color-card)] border border-[var(--color-border)] hover:border-[var(--color-primary)]/40 rounded-3xl p-6 transition group flex flex-col justify-between space-y-5"
        >
          <div class="space-y-3">
            <!-- Category & Status Row -->
            <div class="flex items-start justify-between gap-2">
              <span class="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20 truncate max-w-[180px]">
                {service.categoryName || 'Layanan Medis'}
              </span>
              <Badge variant={getStatusBadgeVariant(statusResult.badgeVariant)}>
                {statusResult.label}
              </Badge>
            </div>

            <!-- Service Title & Featured indicator -->
            <div>
              <div class="flex items-center gap-1.5">
                {#if service.featured}
                  <Sparkles class="w-3.5 h-3.5 text-[var(--color-primary)] shrink-0" />
                {/if}
                <h3 class="text-base font-bold text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition leading-snug">
                  {service.name}
                </h3>
              </div>
              {#if service.shortDescription}
                <p class="text-xs text-[var(--color-muted-foreground)] mt-2 line-clamp-2 leading-relaxed">
                  {service.shortDescription}
                </p>
              {/if}
            </div>

            <!-- Meta Details List -->
            <div class="space-y-2 pt-2 border-t border-[var(--color-border)]/60 text-xs text-[var(--color-text)]">
              <!-- Schedule status detail -->
              <div class="flex items-start gap-2">
                <Clock class="w-4 h-4 text-[var(--color-primary)] shrink-0 mt-0.5" />
                <span class="text-[11px] text-[var(--color-text)]">
                  {statusResult.detail}
                </span>
              </div>

              <!-- Unit -->
              {#if service.unitName}
                <div class="flex items-center gap-2">
                  <Building2 class="w-4 h-4 text-[var(--color-muted-foreground)] shrink-0" />
                  <span class="text-[11px] text-[var(--color-text)] truncate">
                    {service.unitName}
                  </span>
                </div>
              {/if}

              <!-- Location -->
              {#if service.locationName}
                <div class="flex items-center gap-2">
                  <MapPin class="w-4 h-4 text-[var(--color-muted-foreground)] shrink-0" />
                  <span class="text-[11px] text-[var(--color-text)] truncate">
                    {service.locationName}
                  </span>
                </div>
              {/if}
            </div>
          </div>

          <!-- Card Action Footer -->
          <div class="pt-3 border-t border-[var(--color-border)] flex items-center justify-between text-xs">
            <span class="text-[var(--color-muted-foreground)] text-[11px] group-hover:text-[var(--color-text)] transition">
              Lihat Rincian Layanan
            </span>
            <div class="w-7 h-7 rounded-xl bg-[var(--color-card)] group-hover:bg-[var(--color-primary)] group-hover:text-[var(--color-primary-foreground)] text-[var(--color-primary-foreground)] flex items-center justify-center transition">
              <ArrowRight class="w-3.5 h-3.5" />
            </div>
          </div>
        </a>
      {/each}
    </div>
  {/if}
</div>
