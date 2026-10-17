<!--
  @component Direktori publik tenaga medis & staf — pencarian, filter unit/layanan,
  kartu petugas, dan modal detail profil. Dibungkus PublicLayout oleh App.svelte.
-->
<script lang="ts">
  import {
    Users, Search, Calendar, GraduationCap, ChevronRight
  } from 'lucide-svelte';
  import { staffOrgService } from '../../shared/services/staffOrgService.js';
  import { serviceEngineService } from '../../shared/services/serviceEngineService.js';
  import type { StaffProfile, OrganizationNode, ServiceEntity } from '../../shared/types/index.js';
  import Input from '../../shared/ui/Input.svelte';
  import Select from '../../shared/ui/Select.svelte';
  import Modal from '../../shared/ui/Modal.svelte';

  let staffList = $state<StaffProfile[]>([]);
  let orgNodes = $state<OrganizationNode[]>([]);
  let services = $state<ServiceEntity[]>([]);
  let loading = $state(true);

  // Filters & Search
  let searchQuery = $state('');
  let filterUnit = $state('');
  let filterService = $state('');

  // Selected Detail Modal
  let selectedStaff = $state<StaffProfile | null>(null);

  $effect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [sData, oData, srvData] = await Promise.all([
          staffOrgService.getStaffProfiles(false),
          staffOrgService.getOrgNodes(),
          serviceEngineService.getServices()
        ]);
        if (cancelled) return;
        staffList = sData;
        orgNodes = oData.filter(n => n.status === 'active' && n.showOnWebsite);
        services = srvData;
      } catch (e) {
        console.error('Failed to load staff directory:', e);
      } finally {
        if (!cancelled) loading = false;
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  });

  const filteredStaff = $derived(staffList.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.positionTitle.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesUnit = filterUnit ? s.unitId === filterUnit : true;
    const matchesService = filterService ? s.serviceIds?.includes(filterService) : true;
    return matchesSearch && matchesUnit && matchesService;
  }));

  const unitOptions = $derived([
    { value: '', label: 'Semua Unit Kerja / Poli' },
    ...orgNodes.map(n => ({ value: n.id, label: n.name }))
  ]);

  const serviceOptions = $derived([
    { value: '', label: 'Semua Layanan Terkait' },
    ...services.map(srv => ({ value: srv.id, label: srv.name }))
  ]);

  const FALLBACK_PHOTO = 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=400';

  function serviceName(srvId: string): string {
    return services.find(x => x.id === srvId)?.name ?? srvId;
  }
</script>

<div class="py-10 md:py-14 px-4 sm:px-6 max-w-7xl mx-auto space-y-10 animate-in fade-in duration-300">

  <!-- Header Breadcrumb & Section Title -->
  <div class="border-b border-[var(--color-border)] pb-8 space-y-4">
    <div class="flex flex-wrap items-center gap-2 text-xs text-[var(--color-muted-foreground)]">
      <a href="#/" class="hover:text-[var(--color-primary)] transition">Beranda</a>
      <span>/</span>
      <a href="#/profil" class="hover:text-[var(--color-primary)] transition">Profil</a>
      <span>/</span>
      <span class="text-[var(--color-primary)] font-semibold">Tenaga Medis & Petugas</span>
    </div>

    <div class="space-y-2">
      <span class="inline-flex items-center gap-1.5 px-3 py-1 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-full text-xs font-bold uppercase tracking-wider">
        <Users class="w-3.5 h-3.5" /> Direktori Tenaga Medis & Staf
      </span>
      <h1 class="text-2xl sm:text-3xl md:text-4xl font-light text-[var(--color-text)] tracking-tight">
        Profil Tenaga Medis & Dokter
      </h1>
      <p class="text-xs sm:text-sm text-[var(--color-muted-foreground)] max-w-2xl">
        Kenali para dokter, dokter gigi, perawat, bidan, dan staf profesional yang siap melayani Anda di Puskesmas Manding.
      </p>
    </div>

    <!-- Search & Filters -->
    <div class="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div class="relative">
        <Search class="absolute left-3.5 top-3 w-4 h-4 text-[var(--color-muted-foreground)] pointer-events-none z-10" />
        <Input
          type="text"
          placeholder="Cari nama dokter atau staf..."
          bind:value={searchQuery}
          class="pl-10 rounded-2xl bg-[var(--color-card)]"
        />
      </div>

      <Select
        bind:value={filterUnit}
        options={unitOptions}
        class="rounded-2xl bg-[var(--color-card)]"
        aria-label="Filter unit kerja"
      />

      <Select
        bind:value={filterService}
        options={serviceOptions}
        class="rounded-2xl bg-[var(--color-card)]"
        aria-label="Filter layanan terkait"
      />
    </div>
  </div>

  <!-- Staff Grid -->
  {#if loading}
    <div class="min-h-[40vh] flex flex-col items-center justify-center space-y-3">
      <div class="w-8 h-8 border-3 border-[var(--color-primary)]/20 border-t-[var(--color-primary)] rounded-full animate-spin"></div>
      <p class="text-xs text-[var(--color-muted-foreground)]">Memuat direktori tenaga medis...</p>
    </div>
  {:else if filteredStaff.length === 0}
    <div class="p-12 rounded-3xl bg-[var(--color-card)] border border-[var(--color-border)] text-center space-y-3">
      <Users class="w-12 h-12 text-[var(--color-muted-foreground)] mx-auto opacity-40" />
      <h3 class="text-sm font-bold text-[var(--color-text)]">Tidak Ada Petugas Ditemukan</h3>
      <p class="text-xs text-[var(--color-muted-foreground)]">Silakan ubah kata kunci atau bersihkan filter pencarian Anda.</p>
    </div>
  {:else}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {#each filteredStaff as staff (staff.id)}
        <div
          onclick={() => selectedStaff = staff}
          onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') selectedStaff = staff; }}
          role="button"
          tabindex="0"
          class="p-6 rounded-3xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-xs hover:shadow-md hover:border-[var(--color-primary)]/40 transition cursor-pointer flex flex-col justify-between space-y-4 group"
        >
          <div class="space-y-4">
            <div class="flex items-center gap-4">
              <img
                src={staff.photoUrl || FALLBACK_PHOTO}
                alt={staff.name}
                class="w-16 h-16 rounded-2xl object-cover border border-[var(--color-border)] shrink-0 group-hover:scale-105 transition"
              />
              <div class="space-y-1 min-w-0">
                <span class="px-2 py-0.5 rounded-md bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-[10px] font-mono font-bold uppercase truncate block">
                  {staff.unitName}
                </span>
                <h3 class="text-sm font-bold text-[var(--color-text)] leading-snug group-hover:text-[var(--color-primary)] transition truncate">
                  {staff.name}
                </h3>
                <p class="text-xs text-[var(--color-muted-foreground)] truncate">{staff.positionTitle}</p>
              </div>
            </div>

            {#if staff.scheduleSummary}
              <div class="flex items-center gap-2 text-xs text-[var(--color-text)] bg-[var(--color-bg)] border border-[var(--color-border)] px-3 py-2 rounded-xl">
                <Calendar class="w-3.5 h-3.5 text-[var(--color-primary)] shrink-0" />
                <span class="truncate text-[11px]">{staff.scheduleSummary}</span>
              </div>
            {/if}

            {#if staff.serviceIds && staff.serviceIds.length > 0}
              <div class="flex flex-wrap gap-1.5">
                {#each staff.serviceIds.slice(0, 3) as srvId (srvId)}
                  <span class="px-2 py-0.5 rounded-md bg-[var(--color-bg)] border border-[var(--color-border)] text-[10px] text-[var(--color-text)]">
                    {serviceName(srvId)}
                  </span>
                {/each}
                {#if staff.serviceIds.length > 3}
                  <span class="px-2 py-0.5 rounded-md bg-[var(--color-bg)] border border-[var(--color-border)] text-[10px] text-[var(--color-muted-foreground)]">
                    +{staff.serviceIds.length - 3}
                  </span>
                {/if}
              </div>
            {/if}
          </div>

          <div class="pt-3 border-t border-[var(--color-border)] flex items-center justify-between text-xs font-bold text-[var(--color-primary)]">
            <span>Lihat Jadwal & Profil</span>
            <ChevronRight class="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      {/each}
    </div>
  {/if}

  <!-- Staff Detail Modal -->
  <Modal
    isOpen={selectedStaff !== null}
    onClose={() => selectedStaff = null}
    title={selectedStaff?.name ?? 'Profil Petugas'}
    size="md"
  >
    {#if selectedStaff}
      <div class="flex flex-col sm:flex-row items-center sm:items-start gap-4 border-b border-[var(--color-border)] pb-6">
        <img
          src={selectedStaff.photoUrl || FALLBACK_PHOTO}
          alt={selectedStaff.name}
          class="w-20 h-20 rounded-2xl object-cover border border-[var(--color-border)] shadow-md"
        />
        <div class="space-y-1 text-center sm:text-left">
          <span class="px-2.5 py-0.5 rounded-md bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-[10px] font-mono font-bold uppercase">
            {selectedStaff.unitName}
          </span>
          <h2 class="text-lg font-bold text-[var(--color-text)]">{selectedStaff.name}</h2>
          <p class="text-xs text-[var(--color-primary)] font-medium">{selectedStaff.positionTitle}</p>
        </div>
      </div>

      <div class="space-y-3 text-xs">
        {#if selectedStaff.education}
          <div class="space-y-1 bg-[var(--color-bg)] border border-[var(--color-border)] p-3.5 rounded-2xl">
            <div class="text-[var(--color-muted-foreground)] font-semibold uppercase tracking-wider text-[10px] flex items-center gap-1.5">
              <GraduationCap class="w-3.5 h-3.5 text-[var(--color-primary)]" />
              <span>Pendidikan / Spesialisasi</span>
            </div>
            <div class="text-[var(--color-text)]">{selectedStaff.education}</div>
          </div>
        {/if}

        {#if selectedStaff.bio}
          <div class="space-y-1 bg-[var(--color-bg)] border border-[var(--color-border)] p-3.5 rounded-2xl">
            <div class="text-[var(--color-muted-foreground)] font-semibold uppercase tracking-wider text-[10px]">
              Biografi / Pengalaman
            </div>
            <div class="text-[var(--color-text)] leading-relaxed">{selectedStaff.bio}</div>
          </div>
        {/if}

        {#if selectedStaff.scheduleSummary}
          <div class="space-y-1 bg-[var(--color-bg)] border border-[var(--color-border)] p-3.5 rounded-2xl">
            <div class="text-[var(--color-muted-foreground)] font-semibold uppercase tracking-wider text-[10px] flex items-center gap-1.5">
              <Calendar class="w-3.5 h-3.5 text-[var(--color-primary)]" />
              <span>Jadwal Pelayanan Poli</span>
            </div>
            <div class="text-[var(--color-text)] font-semibold">{selectedStaff.scheduleSummary}</div>
          </div>
        {/if}

        {#if selectedStaff.serviceIds && selectedStaff.serviceIds.length > 0}
          <div class="space-y-2 bg-[var(--color-bg)] border border-[var(--color-border)] p-3.5 rounded-2xl">
            <div class="text-[var(--color-muted-foreground)] font-semibold uppercase tracking-wider text-[10px]">
              Layanan Pelayanan Terkait
            </div>
            <div class="flex flex-wrap gap-1.5">
              {#each selectedStaff.serviceIds as srvId (srvId)}
                <span class="px-2.5 py-1 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] text-[11px] text-[var(--color-primary)] font-medium">
                  {serviceName(srvId)}
                </span>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    {/if}

    {#snippet footer()}
      <button
        onclick={() => selectedStaff = null}
        class="w-full py-2.5 rounded-xl bg-[var(--color-primary)] text-white font-bold transition text-xs hover:opacity-90 shadow-xs"
      >
        Tutup Profil
      </button>
    {/snippet}
  </Modal>

</div>
