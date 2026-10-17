<!-- @component Daftar fasilitas & sarana prasarana publik — pencarian, filter kategori & aksesibilitas, kartu fasilitas, dan modal detail. -->
<script lang="ts">
  import { facilityService } from '../../shared/services/facilityService.js';
  import type { FacilityEntity } from '../../shared/types/index.js';
  import Modal from '../../shared/ui/Modal.svelte';
  import {
    Building2,
    Search,
    MapPin,
    CheckCircle2,
    X,
    Accessibility,
    ParkingSquare,
    ArrowRight,
    Navigation
  } from 'lucide-svelte';

  const FALLBACK_PHOTO = 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=800';

  let facilities = $state<FacilityEntity[]>([]);
  let categories = $state<string[]>([]);
  let loading = $state(true);

  // Search & Filters
  let searchQuery = $state('');
  let selectedCategory = $state('');
  let selectedAccessibility = $state('');

  // Selected Detail Modal
  let selectedFacility = $state<FacilityEntity | null>(null);

  async function load() {
    loading = true;
    try {
      const [facList, catList] = await Promise.all([
        facilityService.getPublishedFacilities(),
        facilityService.getCategories()
      ]);
      facilities = facList;
      categories = catList;
    } catch (e) {
      console.error('Failed to load facilities:', e);
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    load();
  });

  const filteredFacilities = $derived.by(() =>
    facilities.filter((f) => {
      if (selectedCategory && f.category !== selectedCategory) return false;
      if (selectedAccessibility === 'wheelchair' && !f.accessibility.wheelchairAccessible) return false;
      if (selectedAccessibility === 'toilet' && !f.accessibility.accessibleToilet) return false;
      if (selectedAccessibility === 'parking' && !f.accessibility.disabledParking) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match =
          f.name.toLowerCase().includes(q) ||
          f.description.toLowerCase().includes(q) ||
          f.location.toLowerCase().includes(q) ||
          f.category.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    })
  );
</script>

<div class="py-10 md:py-14 px-4 sm:px-6 max-w-7xl mx-auto space-y-10 animate-in fade-in duration-300">

  <!-- Header Breadcrumb & Section Title -->
  <div class="border-b border-[var(--color-border)] pb-8 space-y-4">
    <div class="flex flex-wrap items-center gap-2 text-xs text-[var(--color-muted-foreground)]">
      <a href="#/" class="hover:text-[var(--color-primary)] transition">Beranda</a>
      <span>/</span>
      <a href="#/profil" class="hover:text-[var(--color-primary)] transition">Profil</a>
      <span>/</span>
      <span class="text-[var(--color-primary)] font-semibold">Sarana &amp; Prasarana</span>
    </div>

    <div class="space-y-2">
      <span class="inline-flex items-center gap-1.5 px-3 py-1 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-full text-xs font-bold uppercase tracking-wider">
        <Building2 class="w-3.5 h-3.5" />
        Sarana, Prasarana &amp; Denah Ruang
      </span>
      <h1 class="text-2xl sm:text-3xl md:text-4xl font-light text-[var(--color-text)] tracking-tight">
        Fasilitas &amp; Sarana Pelayanan Medis
      </h1>
      <p class="text-xs sm:text-sm text-[var(--color-muted-foreground)] max-w-3xl">
        Jelajahi informasi ruang poli pelayanan, sarana penunjang medis, fasilitas ramah disabilitas, dan area parkir untuk kenyamanan kunjungan Anda.
      </p>
    </div>

    <!-- Search bar -->
    <div class="pt-2 max-w-2xl">
      <div class="relative flex items-center">
        <Search class="w-4 h-4 text-[var(--color-muted-foreground)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          placeholder="Cari ruang poli, laboratorium, apotek, atau lokasi lantai..."
          bind:value={searchQuery}
          class="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none text-xs sm:text-sm text-[var(--color-text)] shadow-xs"
        />
        {#if searchQuery}
          <button
            onclick={() => (searchQuery = '')}
            class="absolute right-3 text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-text)]"
          >
            <X class="w-4 h-4" />
          </button>
        {/if}
      </div>
    </div>
  </div>

  <!-- Category Pills & Accessibility Filters -->
  <div class="space-y-4">
    <div class="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
      <button
        onclick={() => (selectedCategory = '')}
        class={`px-4 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition shadow-xs ${
          selectedCategory === ''
            ? 'bg-[var(--color-primary)] text-white'
            : 'bg-[var(--color-card)] text-[var(--color-text)] border border-[var(--color-border)] hover:bg-[var(--color-bg)]'
        }`}
      >
        Semua Fasilitas ({facilities.length})
      </button>
      {#each categories as cat (cat)}
        {@const count = facilities.filter((f) => f.category === cat).length}
        {#if count > 0 || selectedCategory === cat}
          <button
            onclick={() => (selectedCategory = cat)}
            class={`px-4 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition shadow-xs ${
              selectedCategory === cat
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-[var(--color-card)] text-[var(--color-text)] border border-[var(--color-border)] hover:bg-[var(--color-bg)]'
            }`}
          >
            {cat} ({count})
          </button>
        {/if}
      {/each}
    </div>

    <!-- Accessibility Quick Filter Bar -->
    <div class="flex flex-wrap items-center gap-2.5 p-3 sm:p-4 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] text-xs">
      <span class="font-bold uppercase tracking-wider text-[var(--color-muted-foreground)] flex items-center gap-1.5 mr-1">
        <Accessibility class="w-3.5 h-3.5 text-[var(--color-primary)]" />
        <span>Aksesibilitas:</span>
      </span>
      <button
        onclick={() => (selectedAccessibility = selectedAccessibility === 'wheelchair' ? '' : 'wheelchair')}
        class={`px-3 py-1.5 rounded-xl font-medium transition ${
          selectedAccessibility === 'wheelchair'
            ? 'bg-[var(--color-primary)] text-white'
            : 'bg-[var(--color-bg)] text-[var(--color-text)] border border-[var(--color-border)] hover:border-[var(--color-primary)]'
        }`}
      >
        ✓ Kursi Roda
      </button>
      <button
        onclick={() => (selectedAccessibility = selectedAccessibility === 'toilet' ? '' : 'toilet')}
        class={`px-3 py-1.5 rounded-xl font-medium transition ${
          selectedAccessibility === 'toilet'
            ? 'bg-[var(--color-primary)] text-white'
            : 'bg-[var(--color-bg)] text-[var(--color-text)] border border-[var(--color-border)] hover:border-[var(--color-primary)]'
        }`}
      >
        ✓ Toilet Khusus Disabilitas
      </button>
      <button
        onclick={() => (selectedAccessibility = selectedAccessibility === 'parking' ? '' : 'parking')}
        class={`px-3 py-1.5 rounded-xl font-medium transition ${
          selectedAccessibility === 'parking'
            ? 'bg-[var(--color-primary)] text-white'
            : 'bg-[var(--color-bg)] text-[var(--color-text)] border border-[var(--color-border)] hover:border-[var(--color-primary)]'
        }`}
      >
        ✓ Parkir Khusus
      </button>

      {#if selectedAccessibility}
        <button
          onclick={() => (selectedAccessibility = '')}
          class="text-xs text-rose-500 font-semibold underline hover:text-rose-600 ml-auto"
        >
          Reset Filter
        </button>
      {/if}
    </div>
  </div>

  <!-- Facility Cards Grid -->
  {#if loading}
    <div class="min-h-[40vh] flex flex-col items-center justify-center space-y-3">
      <div class="w-8 h-8 border-3 border-[var(--color-primary)]/20 border-t-[var(--color-primary)] rounded-full animate-spin"></div>
      <p class="text-xs text-[var(--color-muted-foreground)]">Memuat data sarana &amp; prasarana...</p>
    </div>
  {:else if filteredFacilities.length === 0}
    <div class="p-12 rounded-3xl bg-[var(--color-card)] border border-[var(--color-border)] text-center space-y-3">
      <Building2 class="w-12 h-12 text-[var(--color-muted-foreground)] mx-auto opacity-40" />
      <h3 class="text-sm font-bold text-[var(--color-text)]">Tidak Ada Fasilitas Ditemukan</h3>
      <p class="text-xs text-[var(--color-muted-foreground)] max-w-sm mx-auto">
        Silakan periksa kata kunci pencarian atau bersihkan filter kategori Anda.
      </p>
    </div>
  {:else}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {#each filteredFacilities as fac (fac.id)}
        <div
          onclick={() => (selectedFacility = fac)}
          onkeydown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              selectedFacility = fac;
            }
          }}
          role="button"
          tabindex="0"
          class="p-4 rounded-3xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-xs hover:shadow-md hover:border-[var(--color-primary)]/40 transition flex flex-col justify-between space-y-4 group cursor-pointer"
        >
          <div class="space-y-3">
            <div class="relative h-44 rounded-2xl overflow-hidden bg-[var(--color-bg)]">
              <img
                src={fac.photos?.[0] || FALLBACK_PHOTO}
                alt={fac.name}
                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
              <div class="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-xs text-white px-2.5 py-1 rounded-xl text-[10px] font-bold">
                {fac.category}
              </div>
              <div class={`absolute top-2.5 right-2.5 px-2.5 py-1 rounded-xl text-[10px] font-bold ${
                fac.status === 'Available'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-amber-600 text-white'
              }`}>
                {fac.status === 'Available' ? 'Tersedia' : fac.status}
              </div>
            </div>

            <div>
              <h3 class="text-sm font-bold text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition line-clamp-1">
                {fac.name}
              </h3>
              <p class="text-[11px] text-[var(--color-muted-foreground)] flex items-center gap-1 mt-1">
                <MapPin class="w-3.5 h-3.5 text-[var(--color-primary)] shrink-0" />
                <span>{fac.location}</span>
                {#if fac.floor}<span>• {fac.floor}</span>{/if}
              </p>
              <p class="text-xs text-[var(--color-muted-foreground)] mt-2 line-clamp-2">
                {fac.description}
              </p>
            </div>
          </div>

          <div class="pt-3 border-t border-[var(--color-border)] flex items-center justify-between">
            <div class="flex items-center gap-1.5 text-[10px] font-medium text-[var(--color-muted-foreground)]">
              {#if fac.accessibility?.wheelchairAccessible}
                <span class="px-2 py-0.5 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-md">
                  ✓ Kursi Roda
                </span>
              {/if}
              {#if fac.accessibility?.accessibleToilet}
                <span class="px-2 py-0.5 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-md">
                  ✓ Toilet
                </span>
              {/if}
            </div>
            <span class="text-xs font-bold text-[var(--color-primary)] flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
              <span>Detail</span>
              <ArrowRight class="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      {/each}
    </div>
  {/if}

  <!-- Modal Detail Fasilitas -->
  <Modal
    isOpen={selectedFacility !== null}
    onClose={() => (selectedFacility = null)}
    title={selectedFacility?.name ?? 'Detail Fasilitas'}
    size="lg"
  >
    {#if selectedFacility}
      {@const fac = selectedFacility}
      <div class="relative h-60 sm:h-72 rounded-2xl overflow-hidden bg-[var(--color-bg)]">
        <img
          src={fac.photos?.[0] || FALLBACK_PHOTO}
          alt={fac.name}
          class="w-full h-full object-cover"
        />
        <div class="absolute bottom-4 left-4 bg-black/70 backdrop-blur-xs text-white px-3 py-1 rounded-xl text-xs font-bold">
          {fac.category}
        </div>
      </div>

      <div class="space-y-6">
        <div>
          <div class="flex items-center justify-between gap-4">
            <h2 class="text-xl font-bold text-[var(--color-text)]">{fac.name}</h2>
            <span class={`px-3 py-1 rounded-xl text-xs font-bold ${
              fac.status === 'Available' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
            }`}>
              {fac.status === 'Available' ? 'Tersedia' : fac.status}
            </span>
          </div>
          <p class="text-xs text-[var(--color-primary)] font-semibold flex items-center gap-1 mt-1.5">
            <MapPin class="w-3.5 h-3.5" />
            Lokasi: {fac.location} {fac.floor && `(${fac.floor})`}
          </p>
        </div>

        <div class="space-y-1.5">
          <h4 class="text-xs font-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">
            Deskripsi &amp; Sarana
          </h4>
          <p class="text-xs sm:text-sm text-[var(--color-text)] leading-relaxed">{fac.description}</p>
        </div>

        <!-- Checklist Aksesibilitas -->
        <div class="p-4 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] space-y-2.5">
          <h4 class="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)] flex items-center gap-1.5">
            <Accessibility class="w-4 h-4" />
            <span>Fitur Aksesibilitas &amp; Ramah Disabilitas</span>
          </h4>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[var(--color-text)]">
            <div class="flex items-center gap-2">
              <CheckCircle2 class={`w-4 h-4 ${fac.accessibility?.wheelchairAccessible ? 'text-emerald-500' : 'text-[var(--color-muted-foreground)] opacity-40'}`} />
              <span>Akses Kursi Roda</span>
            </div>
            <div class="flex items-center gap-2">
              <CheckCircle2 class={`w-4 h-4 ${fac.accessibility?.ramp ? 'text-emerald-500' : 'text-[var(--color-muted-foreground)] opacity-40'}`} />
              <span>Jalur Ramp Landai</span>
            </div>
            <div class="flex items-center gap-2">
              <CheckCircle2 class={`w-4 h-4 ${fac.accessibility?.accessibleToilet ? 'text-emerald-500' : 'text-[var(--color-muted-foreground)] opacity-40'}`} />
              <span>Toilet Aksesibel</span>
            </div>
            <div class="flex items-center gap-2">
              <CheckCircle2 class={`w-4 h-4 ${fac.accessibility?.prioritySeating ? 'text-emerald-500' : 'text-[var(--color-muted-foreground)] opacity-40'}`} />
              <span>Kursi Prioritas Lansia / Hamil</span>
            </div>
            <div class="flex items-center gap-2">
              <CheckCircle2 class={`w-4 h-4 ${fac.accessibility?.disabledParking ? 'text-emerald-500' : 'text-[var(--color-muted-foreground)] opacity-40'}`} />
              <span>Parkir Khusus Disabilitas</span>
            </div>
            <div class="flex items-center gap-2">
              <CheckCircle2 class={`w-4 h-4 ${fac.accessibility?.brailleSignage ? 'text-emerald-500' : 'text-[var(--color-muted-foreground)] opacity-40'}`} />
              <span>Petunjuk Braille &amp; Visual</span>
            </div>
          </div>
        </div>

        <!-- Parking info -->
        {#if fac.parkingInfo && (fac.parkingInfo.motorCapacity || fac.parkingInfo.carCapacity || fac.parkingInfo.notes)}
          <div class="p-4 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] space-y-1.5 text-xs">
            <h4 class="font-bold uppercase tracking-wider text-[var(--color-muted-foreground)] flex items-center gap-1.5">
              <ParkingSquare class="w-4 h-4 text-[var(--color-primary)]" />
              <span>Informasi Parkir &amp; Kendaraan</span>
            </h4>
            <div class="flex flex-wrap gap-4 font-semibold text-[var(--color-text)] pt-1">
              {#if fac.parkingInfo.motorCapacity}
                <span>Kapasitas Motor: {fac.parkingInfo.motorCapacity}</span>
              {/if}
              {#if fac.parkingInfo.carCapacity}
                <span>Kapasitas Mobil: {fac.parkingInfo.carCapacity}</span>
              {/if}
            </div>
            {#if fac.parkingInfo.notes}
              <p class="text-[var(--color-muted-foreground)]">{fac.parkingInfo.notes}</p>
            {/if}
          </div>
        {/if}
      </div>
    {/if}

    {#snippet footer()}
      {#if selectedFacility?.externalMapUrl}
        <a
          href={selectedFacility.externalMapUrl}
          target="_blank"
          rel="noopener noreferrer"
          class="px-4 py-2 bg-[var(--color-primary)] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 hover:opacity-90 transition"
        >
          <Navigation class="w-3.5 h-3.5" />
          <span>Petunjuk Arah</span>
        </a>
      {/if}
      <button
        onclick={() => (selectedFacility = null)}
        class="px-4 py-2 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-xs font-semibold text-[var(--color-text)] hover:bg-[var(--color-card)] transition"
      >
        Tutup
      </button>
    {/snippet}
  </Modal>
</div>
