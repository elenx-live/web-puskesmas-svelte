<!-- @component Detail layanan kesehatan publik — deskripsi, persyaratan, alur prosedur, produk, standar pelayanan, jadwal, tarif, dan konten terkait. Menerima prop slug dari rute /layanan/:slug. -->
<script lang="ts">
  import {
    serviceEngineService,
    calculateTodayOperationalStatus,
    DEFAULT_DAYS,
    type OperationalStatusResult
  } from '../../shared/services/serviceEngineService.js';
  import { siteSettingsService } from '../../shared/services/siteSettingsService.js';
  import { postService } from '../../shared/services/postService.js';
  import { navigate } from '../../app/router.svelte.js';
  import LoadingSkeleton from '../../shared/ui/LoadingSkeleton.svelte';
  import EmptyState from '../../shared/ui/EmptyState.svelte';
  import type {
    ServiceEntity,
    ServiceRequirementEntity,
    ServiceProcedureEntity,
    ServiceProductEntity,
    ServiceStandardEntity,
    ServiceScheduleEntity,
    ServiceScheduleExceptionEntity,
    ServicePricingEntity,
    PostEntity
  } from '../../shared/types/index.js';
  import { sanitizeHtml } from '../../shared/utils/sanitize.js';
  import { routerState } from '../../app/router.svelte.js';
  import Badge from '../../shared/ui/Badge.svelte';
  import {
    ArrowLeft,
    Clock,
    MapPin,
    Building2,
    FileCheck2,
    ListOrdered,
    Package,
    ShieldCheck,
    Calendar,
    Coins,
    AlertCircle,
    CheckCircle2,
    HelpCircle,
    CalendarOff,
    FileText,
    UserCheck,
    Newspaper,
    HeartPulse,
    ArrowUpRight
  } from 'lucide-svelte';

  interface Props {
    /** Slug layanan dari rute /layanan/:slug. */
    slug: string;
  }

  const { slug = '' }: Props = $props();

  let loading = $state(true);
  let service = $state<ServiceEntity | null>(null);
  let siteName = $state('Puskesmas');

  // Related Content State
  let relatedPosts = $state<PostEntity[]>([]);
  let otherServices = $state<ServiceEntity[]>([]);

  // Service Relations State
  let requirements = $state<ServiceRequirementEntity[]>([]);
  let procedures = $state<ServiceProcedureEntity[]>([]);
  let products = $state<ServiceProductEntity[]>([]);
  let standard = $state<ServiceStandardEntity | null>(null);
  let schedule = $state<ServiceScheduleEntity | null>(null);
  let exceptions = $state<ServiceScheduleExceptionEntity[]>([]);
  let pricingList = $state<ServicePricingEntity[]>([]);
  let statusResult = $state<OperationalStatusResult | null>(null);

  async function loadServiceDetail(currentSlug: string) {
    loading = true;
    try {
      const settings = await siteSettingsService.getSettings();
      if (settings?.siteName) {
        siteName = settings.siteName;
      }

      if (!currentSlug || currentSlug === 'layanan') {
        loading = false;
        return;
      }

      // Mode pratinjau via query hash, mis. #/layanan/:slug?preview=true
      const isPreview = routerState.query.preview === 'true';
      const srv = await serviceEngineService.getServiceBySlug(currentSlug);

      // Security check: Only published services are visible to public unless preview mode is active
      if (!srv || (srv.status !== 'published' && !isPreview)) {
        document.title = `Layanan Tidak Ditemukan | ${settings?.siteName || 'Puskesmas'}`;
        service = null;
        loading = false;
        return;
      }

      document.title = `${srv.name} | ${settings?.siteName || 'Puskesmas'}`;
      service = srv;

      // Load parallel relations
      const [reqs, procs, prods, stds, sch, excs, prcs] = await Promise.all([
        serviceEngineService.getRequirementsByServiceId(srv.id),
        serviceEngineService.getProceduresByServiceId(srv.id),
        serviceEngineService.getProductsByServiceId(srv.id),
        serviceEngineService.getServiceStandard(srv.id),
        serviceEngineService.getServiceSchedule(srv.id),
        serviceEngineService.getScheduleExceptionsByServiceId(srv.id, { includePast: false }),
        serviceEngineService.getPricingByServiceId(srv.id)
      ]);

      requirements = reqs.filter((r) => r.status === 'active');
      procedures = procs.filter((p) => p.status === 'active');
      products = prods.filter((p) => p.status === 'active');
      standard = stds;
      schedule = sch;
      exceptions = excs;
      pricingList = prcs.filter((p) => p.status === 'active');

      // Calculate today operational status
      const status = calculateTodayOperationalStatus(srv, sch, excs);
      statusResult = status;

      // Load related published posts & other services
      try {
        const posts = await postService.getPublishedPosts();
        relatedPosts = posts.slice(0, 3);

        const allServices = await serviceEngineService.getPublishedServices();
        otherServices = allServices.filter((s) => s.id !== srv.id).slice(0, 3);
      } catch (e) {
        console.error('Gagal memuat konten terkait:', e);
      }
    } catch (err) {
      console.error('Gagal memuat detail layanan:', err);
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    loadServiceDetail(slug);
  });

  function getStatusBadgeVariant(variant?: OperationalStatusResult['badgeVariant']): 'emerald' | 'rose' | 'amber' | 'purple' | 'zinc' {
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

  function formatCurrency(amount: number | null | undefined) {
    if (amount === null || amount === undefined) return '-';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(amount);
  }

  function getPricingTypeName(type: string) {
    switch (type) {
      case 'free':
        return 'Gratis / Tanpa Biaya';
      case 'fixed':
        return 'Tarif Tetap (Perda)';
      case 'variable':
        return 'Tarif Bervariasi';
      case 'bpjs_covered':
        return 'Ditanggung BPJS Kesehatan / JKN';
      case 'according_to_rules':
        return 'Sesuai Ketentuan / Perda';
      default:
        return type;
    }
  }
</script>

{#if loading}
  <div class="py-16 px-6 max-w-5xl mx-auto">
    <LoadingSkeleton variant="text" count={6} />
  </div>
{:else if !service}
  <div class="py-16 px-6 max-w-xl mx-auto">
    <EmptyState
      icon={AlertCircle}
      title="Layanan Tidak Ditemukan"
      description="Layanan kesehatan yang Anda cari tidak tersedia, dalam bentuk draf, atau telah dipindahkan."
      actionLabel="Kembali ke Direktori Layanan"
      onAction={() => navigate('/layanan')}
    />
  </div>
{:else}
  {#if service.status !== 'published'}
    <div class="bg-[var(--color-primary)] text-[var(--color-primary-foreground)] py-2.5 px-4 font-bold text-xs text-center border-b border-amber-600 flex items-center justify-center gap-2 sticky top-0 z-50 shadow-lg">
      <span class="bg-black text-[var(--color-primary)] px-2 py-0.5 rounded text-[10px] uppercase font-mono tracking-wider">
        PREVIEW — Belum Dipublikasikan
      </span>
      <span>
        Halaman ini ditampilkan dalam mode Pratinjau. Status Workflow: <strong>{service.status.toUpperCase()}</strong>
      </span>
    </div>
  {/if}
  <div class="py-12 px-4 sm:px-6 max-w-6xl mx-auto space-y-8">
    <!-- Navigation Breadcrumb -->
    <div>
      <a
        href="#/layanan"
        class="inline-flex items-center gap-2 text-xs font-medium text-[var(--color-primary)] hover:text-[var(--color-primary)] transition bg-[var(--color-primary)]/10 px-3 py-1.5 rounded-xl border border-[var(--color-primary)]/20"
      >
        <ArrowLeft class="w-3.5 h-3.5" />
        <span>Kembali ke Direktori Layanan</span>
      </a>
    </div>

    <!-- Hero Section -->
    <div class="bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl p-6 sm:p-8 space-y-6">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] pb-4">
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20">
            {service.categoryName || 'Layanan Kesehatan'}
          </span>
          {#if service.clusterName}
            <span class="text-xs text-[var(--color-muted-foreground)] bg-[var(--color-card)] px-3 py-1 rounded-xl">
              {service.clusterName}
            </span>
          {/if}
        </div>

        {#if statusResult}
          <Badge variant={getStatusBadgeVariant(statusResult.badgeVariant)}>
            {statusResult.label}
          </Badge>
        {/if}
      </div>

      <div class="space-y-3">
        <h1 class="text-2xl sm:text-3xl font-light text-[var(--color-text)] tracking-tight">
          {service.name}
        </h1>
        {#if service.shortDescription}
          <p class="text-sm text-[var(--color-text)] leading-relaxed font-normal">
            {service.shortDescription}
          </p>
        {/if}
      </div>

      <!-- Quick Info Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-[var(--color-border)]/80 text-xs">
        <div class="flex items-center gap-3 p-3 bg-[var(--color-bg)] rounded-2xl border border-[var(--color-border)]">
          <Clock class="w-5 h-5 text-[var(--color-primary)] shrink-0" />
          <div>
            <span class="text-[10px] uppercase text-[var(--color-muted-foreground)] font-bold tracking-wider block">Status Hari Ini</span>
            <span class="text-[var(--color-text)] font-medium">{statusResult?.detail || 'Beroperasi'}</span>
          </div>
        </div>

        <div class="flex items-center gap-3 p-3 bg-[var(--color-bg)] rounded-2xl border border-[var(--color-border)]">
          <Building2 class="w-5 h-5 text-[var(--color-primary)] shrink-0" />
          <div>
            <span class="text-[10px] uppercase text-[var(--color-muted-foreground)] font-bold tracking-wider block">Unit Pelayanan</span>
            <span class="text-[var(--color-text)] font-medium">{service.unitName || 'Poli Umum'}</span>
          </div>
        </div>

        <div class="flex items-center gap-3 p-3 bg-[var(--color-bg)] rounded-2xl border border-[var(--color-border)]">
          <MapPin class="w-5 h-5 text-sky-400 shrink-0" />
          <div>
            <span class="text-[10px] uppercase text-[var(--color-muted-foreground)] font-bold tracking-wider block">Lokasi / Gedung</span>
            <span class="text-[var(--color-text)] font-medium">{service.locationName || 'Gedung Utama'}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Content Layout Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Main Content Column -->
      <div class="lg:col-span-2 space-y-8">
        <!-- Detailed Overview -->
        {#if service.description}
          <div class="bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl p-6 sm:p-8 space-y-4">
            <div class="flex items-center gap-2 border-b border-[var(--color-border)] pb-3">
              <FileText class="w-5 h-5 text-[var(--color-primary)]" />
              <h2 class="text-lg font-bold text-[var(--color-text)]">Deskripsi Pelayanan</h2>
            </div>
            <div class="text-xs sm:text-sm text-[var(--color-text)] leading-relaxed prose prose-invert max-w-none space-y-3">
              {@html sanitizeHtml(service.description)}
            </div>
          </div>
        {/if}

        <!-- Persyaratan Pelayanan -->
        <div class="bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl p-6 sm:p-8 space-y-4">
          <div class="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
            <div class="flex items-center gap-2">
              <FileCheck2 class="w-5 h-5 text-[var(--color-primary)]" />
              <h2 class="text-lg font-bold text-[var(--color-text)]">Persyaratan Pelayanan</h2>
            </div>
            <span class="text-xs text-[var(--color-muted-foreground)]">
              {requirements.length} Persyaratan
            </span>
          </div>

          {#if requirements.length === 0}
            <p class="text-xs text-[var(--color-muted-foreground)] italic">
              Tidak ada persyaratan khusus yang dipublikasikan.
            </p>
          {:else}
            <div class="space-y-3">
              {#each requirements as req, index (req.id)}
                <div class="p-4 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl flex items-start gap-3">
                  <div class="w-6 h-6 rounded-xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 text-[var(--color-primary)] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    {index + 1}
                  </div>
                  <div class="space-y-1 flex-1">
                    <div class="flex items-center justify-between gap-2">
                      <h3 class="text-xs sm:text-sm font-bold text-[var(--color-text)]">{req.title}</h3>
                      {#if req.required}
                        <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          Wajib
                        </span>
                      {:else}
                        <span class="text-[10px] text-[var(--color-muted-foreground)] px-2 py-0.5 rounded-lg bg-[var(--color-surface)]">
                          Opsional
                        </span>
                      {/if}
                    </div>
                    {#if req.description}
                      <p class="text-xs text-[var(--color-muted-foreground)] leading-relaxed">{req.description}</p>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>

        <!-- Prosedur & Alur Pelayanan -->
        <div class="bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl p-6 sm:p-8 space-y-4">
          <div class="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
            <div class="flex items-center gap-2">
              <ListOrdered class="w-5 h-5 text-sky-400" />
              <h2 class="text-lg font-bold text-[var(--color-text)]">Alur Prosedur Pelayanan</h2>
            </div>
            <span class="text-xs text-[var(--color-muted-foreground)]">
              {procedures.length} Langkah
            </span>
          </div>

          {#if procedures.length === 0}
            <p class="text-xs text-[var(--color-muted-foreground)] italic">
              Informasi alur prosedur pelayanan belum dikonfigurasi.
            </p>
          {:else}
            <div class="relative pl-4 border-l-2 border-[var(--color-border)] space-y-6 my-2">
              {#each procedures as proc, index (proc.id)}
                <div class="relative group">
                  <!-- Circle Step Number -->
                  <div class="absolute -left-[25px] top-0 w-8 h-8 rounded-full bg-[var(--color-card)] border-2 border-sky-400 text-sky-400 font-bold text-xs flex items-center justify-center">
                    {proc.stepNumber || index + 1}
                  </div>

                  <div class="ml-4 p-4 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl space-y-1">
                    <h3 class="text-xs sm:text-sm font-bold text-[var(--color-text)]">{proc.title}</h3>
                    {#if proc.description}
                      <p class="text-xs text-[var(--color-muted-foreground)] leading-relaxed">{proc.description}</p>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>

        <!-- Produk / Hasil Pelayanan -->
        <div class="bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl p-6 sm:p-8 space-y-4">
          <div class="flex items-center gap-2 border-b border-[var(--color-border)] pb-3">
            <Package class="w-5 h-5 text-purple-400" />
            <h2 class="text-lg font-bold text-[var(--color-text)]">Produk / Output Pelayanan</h2>
          </div>

          {#if products.length === 0}
            <p class="text-xs text-[var(--color-muted-foreground)] italic">
              Produk keluaran pelayanan belum dikonfigurasi.
            </p>
          {:else}
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {#each products as prod (prod.id)}
                <div class="p-4 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl space-y-1">
                  <div class="flex items-center gap-2 text-xs font-bold text-[var(--color-text)]">
                    <CheckCircle2 class="w-4 h-4 text-purple-400 shrink-0" />
                    <span>{prod.name}</span>
                  </div>
                  {#if prod.description}
                    <p class="text-xs text-[var(--color-muted-foreground)] pl-6 leading-relaxed">{prod.description}</p>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
        </div>

        <!-- Standar Pelayanan Publik Section -->
        {#if standard}
          <div class="bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl p-6 sm:p-8 space-y-4">
            <div class="flex items-center gap-2 border-b border-[var(--color-border)] pb-3">
              <ShieldCheck class="w-5 h-5 text-[var(--color-primary)]" />
              <div>
                <h2 class="text-lg font-bold text-[var(--color-text)]">Komponen Standar Pelayanan Publik</h2>
                <p class="text-xs text-[var(--color-muted-foreground)]">Pernyataan komitmen mutu pelayanan sesuai UU No. 25 Tahun 2009</p>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {#if standard.complaintChannelSummary}
                <div class="p-4 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl space-y-1">
                  <span class="text-[10px] font-bold uppercase text-[var(--color-primary)] tracking-wider block">Penanganan Pengaduan</span>
                  <p class="text-[var(--color-text)] leading-relaxed">{standard.complaintChannelSummary}</p>
                </div>
              {/if}

              {#if standard.facilities}
                <div class="p-4 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl space-y-1">
                  <span class="text-[10px] font-bold uppercase text-[var(--color-primary)] tracking-wider block">Sarana &amp; Prasarana</span>
                  <p class="text-[var(--color-text)] leading-relaxed">{standard.facilities}</p>
                </div>
              {/if}

              {#if standard.executorCompetency}
                <div class="p-4 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl space-y-1">
                  <span class="text-[10px] font-bold uppercase text-[var(--color-primary)] tracking-wider block">Kompetensi Pelaksana</span>
                  <p class="text-[var(--color-text)] leading-relaxed">{standard.executorCompetency}</p>
                </div>
              {/if}

              {#if standard.evaluation}
                <div class="p-4 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl space-y-1">
                  <span class="text-[10px] font-bold uppercase text-[var(--color-primary)] tracking-wider block">Evaluasi Kinerja</span>
                  <p class="text-[var(--color-text)] leading-relaxed">{standard.evaluation}</p>
                </div>
              {/if}
            </div>
          </div>
        {/if}
      </div>

      <!-- Sidebar Column (Schedule & Pricing) -->
      <div class="space-y-6">
        <!-- Online Registration Card -->
        {#if service.onlineRegistrationEnabled}
          <div class="bg-[var(--color-card)] border border-[var(--color-primary)]/20 rounded-3xl p-6 space-y-4 shadow-lg shadow-emerald-500/5">
            <div class="flex items-center gap-2 border-b border-[var(--color-border)] pb-3">
              <UserCheck class="w-5 h-5 text-[var(--color-primary)]" />
              <h2 class="text-base font-bold text-[var(--color-text)]">Pendaftaran Online</h2>
            </div>
            <p class="text-xs text-[var(--color-muted-foreground)] leading-relaxed">
              Layanan ini mendukung Pendaftaran Mandiri secara online. Registrasikan kunjungan Anda dengan mudah untuk menghindari antrean di lokasi.
            </p>
            <a
              href={`#/pendaftaran?serviceId=${service.id}`}
              class="flex items-center justify-center gap-2 w-full py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary)] text-[var(--color-primary-foreground)] font-bold rounded-xl text-xs transition active:scale-98"
            >
              <span>Daftar Layanan Online</span>
              <ArrowUpRight class="w-4 h-4" />
            </a>
          </div>
        {/if}

        <!-- Schedule Card -->
        <div class="bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl p-6 space-y-4">
          <div class="flex items-center gap-2 border-b border-[var(--color-border)] pb-3">
            <Calendar class="w-5 h-5 text-[var(--color-primary)]" />
            <h2 class="text-base font-bold text-[var(--color-text)]">Jadwal Operasional</h2>
          </div>

          <!-- Weekly Schedule Table -->
          <div class="space-y-2">
            <span class="text-[11px] font-bold text-[var(--color-muted-foreground)] uppercase tracking-wider block">
              Jadwal Reguler Mingguan
            </span>
            <div class="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl divide-y divide-[var(--color-border)] overflow-hidden text-xs">
              {#each DEFAULT_DAYS as dayItem (dayItem.day)}
                {@const rule = schedule?.rules?.find((r) => r.dayOfWeek === dayItem.day)}
                {@const isOpen = rule?.isOpen}
                <div class="px-3 py-2.5 flex items-center justify-between">
                  <span class="font-medium text-[var(--color-text)]">{dayItem.label}</span>
                  {#if isOpen}
                    <div class="text-right">
                      <span class="text-[var(--color-primary)] font-bold block">
                        {rule?.openTime} – {rule?.closeTime}
                      </span>
                      {#if rule?.breakStart && rule?.breakEnd}
                        <span class="text-[10px] text-[var(--color-primary)] block">
                          Istirahat: {rule.breakStart} - {rule.breakEnd}
                        </span>
                      {/if}
                    </div>
                  {:else}
                    <span class="text-[var(--color-muted-foreground)] text-[11px]">Libur / Tutup</span>
                  {/if}
                </div>
              {/each}
            </div>
            <p class="text-[10px] text-[var(--color-muted-foreground)] text-right">Zona Waktu: {schedule?.timezone || 'Asia/Jakarta (WIB)'}</p>
          </div>

          <!-- Exceptions List if any -->
          {#if exceptions.length > 0}
            <div class="pt-3 border-t border-[var(--color-border)] space-y-2">
              <span class="text-[11px] font-bold text-[var(--color-primary)] uppercase tracking-wider flex items-center gap-1.5">
                <CalendarOff class="w-3.5 h-3.5" />
                <span>Jadwal Khusus &amp; Hari Libur</span>
              </span>
              <div class="space-y-2">
                {#each exceptions as exc (exc.id)}
                  <div class="p-3 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl text-xs space-y-1">
                    <div class="flex items-center justify-between font-bold">
                      <span class="text-[var(--color-text)]">{exc.date}</span>
                      <span class={exc.isOpen ? 'text-[var(--color-primary)]' : 'text-rose-400'}>
                        {exc.isOpen ? 'Jam Khusus' : 'Tutup'}
                      </span>
                    </div>
                    {#if exc.isOpen && exc.openTime && exc.closeTime}
                      <div class="text-[11px] text-[var(--color-text)]">
                        Jam Pelayanan: {exc.openTime} – {exc.closeTime}
                      </div>
                    {/if}
                    <p class="text-[11px] text-[var(--color-muted-foreground)] italic">{exc.reason}</p>
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        </div>

        <!-- Pricing Card -->
        <div class="bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl p-6 space-y-4">
          <div class="flex items-center gap-2 border-b border-[var(--color-border)] pb-3">
            <Coins class="w-5 h-5 text-[var(--color-primary)]" />
            <h2 class="text-base font-bold text-[var(--color-text)]">Tarif &amp; Biaya Pelayanan</h2>
          </div>

          {#if pricingList.length === 0}
            <div class="p-4 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl text-xs text-[var(--color-muted-foreground)]">
              <span class="font-bold text-[var(--color-text)] block mb-1">Berdasarkan Ketentuan BPJS / Gratis</span>
              Sesuai Peraturan Daerah yang berlaku, pasien BPJS/JKN aktif tidak dikenakan biaya (Gratis).
            </div>
          {:else}
            <div class="space-y-3">
              {#each pricingList as prc (prc.id)}
                <div class="p-4 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl space-y-2 text-xs">
                  <div class="flex items-center justify-between">
                    <span class="font-bold text-[var(--color-primary)]">
                      {getPricingTypeName(prc.pricingType)}
                    </span>
                    <span class="text-[10px] text-[var(--color-muted-foreground)]">{prc.unit || 'Per pelayanan'}</span>
                  </div>

                  <div class="text-base font-bold text-[var(--color-text)]">
                    {prc.pricingType === 'free'
                      ? 'Rp 0 (Gratis)'
                      : prc.amount !== null
                      ? formatCurrency(prc.amount)
                      : 'Sesuai Tindakan / Perda'}
                  </div>

                  {#if prc.description}
                    <p class="text-[11px] text-[var(--color-muted-foreground)] leading-relaxed pt-1 border-t border-[var(--color-border)]/60">
                      {prc.description}
                    </p>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
        </div>

        <!-- Help & Contact Banner -->
        <div class="bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl p-6 space-y-3 text-xs">
          <div class="flex items-center gap-2 text-[var(--color-text)] font-bold">
            <HelpCircle class="w-4 h-4 text-sky-400" />
            <span>Membutuhkan Informasi Lebih Lanjut?</span>
          </div>
          <p class="text-[var(--color-muted-foreground)] leading-relaxed">
            Silakan hubungi customer service atau kunjungi loket pendaftaran utama di {siteName}.
          </p>
          <a
            href="#/kontak"
            class="inline-block px-4 py-2 bg-[var(--color-card)] hover:bg-zinc-700 text-[var(--color-text)] font-medium rounded-xl transition"
          >
            Halaman Kontak
          </a>
        </div>
      </div>
    </div>

    <!-- Related Articles & Other Services -->
    <div class="mt-12 pt-8 border-t border-[var(--color-border)] space-y-8">
      <!-- Related Articles -->
      {#if relatedPosts.length > 0}
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-bold text-[var(--color-text)] flex items-center gap-2">
              <Newspaper class="w-5 h-5 text-[var(--color-primary)]" />
              <span>Artikel &amp; Berita Terkait Layanan</span>
            </h3>
            <a href="#/berita" class="text-xs text-[var(--color-primary)] hover:underline flex items-center gap-1">
              <span>Lihat Semua Berita</span>
              <ArrowUpRight class="w-3.5 h-3.5" />
            </a>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            {#each relatedPosts as p (p.id)}
              <a
                href={`#/berita/${p.slug}`}
                class="p-4 bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl space-y-2 hover:border-[var(--color-primary)]/50 transition block group"
              >
                <span class="text-[10px] text-[var(--color-primary)] font-mono bg-[var(--color-primary)]/10 px-2 py-0.5 rounded-lg border border-[var(--color-primary)]/20 inline-block">
                  {p.categoryName || 'Edukasi Kesehatan'}
                </span>
                <div class="font-bold text-[var(--color-text)] text-xs group-hover:text-[var(--color-primary)] transition line-clamp-1">{p.title}</div>
                <p class="text-[11px] text-[var(--color-muted-foreground)] line-clamp-2 leading-relaxed">{p.excerpt}</p>
              </a>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Other Services -->
      {#if otherServices.length > 0}
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-bold text-[var(--color-text)] flex items-center gap-2">
              <HeartPulse class="w-5 h-5 text-[var(--color-primary)]" />
              <span>Layanan Kesehatan Lainnya</span>
            </h3>
            <a href="#/layanan" class="text-xs text-[var(--color-primary)] hover:underline flex items-center gap-1">
              <span>Lihat Seluruh Katalog Layanan</span>
              <ArrowUpRight class="w-3.5 h-3.5" />
            </a>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            {#each otherServices as srv (srv.id)}
              <a
                href={`#/layanan/${srv.slug}`}
                class="p-4 bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl space-y-2 hover:border-[var(--color-primary)]/50 transition block group"
              >
                <span class="text-[10px] text-[var(--color-primary)] font-mono bg-[var(--color-primary)]/10 px-2 py-0.5 rounded-lg border border-[var(--color-primary)]/20 inline-block">
                  {srv.categoryName}
                </span>
                <div class="font-bold text-[var(--color-text)] text-xs group-hover:text-[var(--color-primary)] transition line-clamp-1">{srv.name}</div>
                <p class="text-[11px] text-[var(--color-muted-foreground)] line-clamp-2 leading-relaxed">{srv.shortDescription}</p>
              </a>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}
