<!-- @component Manajemen sarana, prasarana & fasilitas: daftar fasilitas, kategori, lokasi, dan editor aksesibilitas. -->
<script lang="ts">
  import { onMount } from 'svelte';
  import {
    Building2, Plus, Edit3, Trash2, Eye, EyeOff, Search,
    MapPin, Layers
  } from 'lucide-svelte';
  import Modal from '../../../shared/ui/Modal.svelte';
  import ConfirmModal from '../../../shared/components/ConfirmModal.svelte';
  import { facilityService } from '../../../shared/services/facilityService.js';
  import { serviceEngineService } from '../../../shared/services/serviceEngineService.js';
  import type { FacilityEntity, ServiceEntity } from '../../../shared/types/index.js';
  import { authStore } from '../../../shared/stores/auth.svelte.js';
  import { toastStore } from '../../../shared/stores/toast.svelte.js';

  let facilities = $state<FacilityEntity[]>([]);
  let categories = $state<string[]>([]);
  let locations = $state<string[]>([]);
  let services = $state<ServiceEntity[]>([]);
  let stats = $state({ total: 0, active: 0, unavailable: 0, accessible: 0, unpublished: 0 });
  let loading = $state(true);

  let activeTab = $state<'facilities' | 'categories' | 'locations'>('facilities');

  let searchQuery = $state('');
  let filterCategory = $state('');
  let filterStatus = $state('');

  let isModalOpen = $state(false);
  let editingFacility = $state<Partial<FacilityEntity> | null>(null);

  let newCatInput = $state('');
  let newLocInput = $state('');

  let confirmState = $state<{ title: string; message: string; action: () => Promise<void> } | null>(null);

  const actor = $derived({
    id: authStore.user?.uid || 'usr-admin',
    name: authStore.user?.displayName || 'Administrator',
    email: authStore.user?.email || 'admin@puskesmas.id'
  });

  async function loadData() {
    loading = true;
    try {
      const [facList, catList, locList, srvList, stData] = await Promise.all([
        facilityService.getFacilities({
          category: filterCategory || undefined,
          status: filterStatus || undefined,
          search: searchQuery || undefined
        }),
        facilityService.getCategories(),
        facilityService.getLocations(),
        serviceEngineService.getServices(),
        facilityService.getFacilityStats()
      ]);
      facilities = facList;
      categories = catList;
      locations = locList;
      services = srvList;
      stats = stData;
    } catch (e) {
      console.error(e);
      toastStore.showToast('Gagal memuat data fasilitas', 'error');
    } finally {
      loading = false;
    }
  }

  // Muat ulang saat filter berubah (menggantikan useEffect [filterCategory, filterStatus, searchQuery])
  $effect(() => {
    // baca state reaktif agar effect melacaknya
    void filterCategory;
    void filterStatus;
    void searchQuery;
    loadData();
  });

  onMount(() => {
    // load awal sudah ditangani $effect di atas
  });

  function updateFac(patch: Partial<FacilityEntity>) {
    if (editingFacility) editingFacility = { ...editingFacility, ...patch };
  }

  function setAccessibility(key: 'wheelchairAccessible' | 'ramp' | 'accessibleToilet' | 'prioritySeating' | 'disabledParking' | 'brailleSignage', value: boolean) {
    if (!editingFacility) return;
    const current = editingFacility.accessibility ?? {
      wheelchairAccessible: false,
      ramp: false,
      accessibleToilet: false,
      prioritySeating: false,
      disabledParking: false,
      brailleSignage: false
    };
    editingFacility = { ...editingFacility, accessibility: { ...current, [key]: value } };
  }

  function handleOpenCreate() {
    editingFacility = {
      name: '',
      category: categories[0] || 'Ruang Pelayanan',
      description: '',
      photos: ['https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=800'],
      location: locations[0] || 'Gedung Utama',
      floor: 'Lantai 1',
      unitName: '',
      relatedServiceIds: [],
      status: 'Available',
      showOnWebsite: true,
      order: facilities.length + 1,
      accessibility: {
        wheelchairAccessible: true,
        ramp: true,
        accessibleToilet: false,
        prioritySeating: true,
        disabledParking: false,
        brailleSignage: true
      },
      parkingInfo: {
        motorCapacity: '',
        carCapacity: '',
        notes: ''
      },
      externalMapUrl: '',
      seoTitle: '',
      seoDescription: ''
    };
    isModalOpen = true;
  }

  function handleOpenEdit(fac: FacilityEntity) {
    editingFacility = { ...fac };
    isModalOpen = true;
  }

  async function handleSaveFacility(e: Event) {
    e.preventDefault();
    if (!editingFacility || !editingFacility.name || !editingFacility.category || !editingFacility.location) {
      toastStore.showToast('Nama, kategori, dan lokasi fasilitas wajib diisi', 'error');
      return;
    }
    try {
      if (editingFacility.id) {
        await facilityService.updateFacility(editingFacility.id, editingFacility, actor);
        toastStore.showToast('Fasilitas berhasil diperbarui', 'success');
      } else {
        await facilityService.createFacility(editingFacility, actor);
        toastStore.showToast('Fasilitas baru berhasil ditambahkan', 'success');
      }
      isModalOpen = false;
      loadData();
    } catch (e) {
      console.error(e);
      toastStore.showToast('Gagal menyimpan fasilitas', 'error');
    }
  }

  function askDelete(id: string, name: string) {
    confirmState = {
      title: 'Hapus Fasilitas',
      message: `Hapus fasilitas "${name}" dari sistem?`,
      action: async () => {
        try {
          await facilityService.deleteFacility(id, actor);
          toastStore.showToast('Fasilitas berhasil dihapus', 'success');
          loadData();
        } catch (e) {
          console.error(e);
          toastStore.showToast('Gagal menghapus fasilitas', 'error');
        }
      }
    };
  }

  async function handleToggleVisibility(fac: FacilityEntity) {
    try {
      await facilityService.updateFacility(fac.id, { showOnWebsite: !fac.showOnWebsite }, actor);
      toastStore.showToast(`Visibilitas "${fac.name}" diperbarui`, 'success');
      loadData();
    } catch (e) {
      console.error(e);
      toastStore.showToast('Gagal mengubah visibilitas', 'error');
    }
  }

  async function handleAddCategory() {
    if (!newCatInput.trim()) return;
    if (categories.includes(newCatInput.trim())) {
      toastStore.showToast('Kategori sudah ada', 'error');
      return;
    }
    const updated = [...categories, newCatInput.trim()];
    await facilityService.saveCategories(updated, actor);
    categories = updated;
    newCatInput = '';
    toastStore.showToast('Kategori berhasil ditambahkan', 'success');
  }

  function askDeleteCategory(cat: string) {
    confirmState = {
      title: 'Hapus Kategori',
      message: `Hapus kategori "${cat}"?`,
      action: async () => {
        const updated = categories.filter((c) => c !== cat);
        await facilityService.saveCategories(updated, actor);
        categories = updated;
        toastStore.showToast('Kategori dihapus', 'success');
      }
    };
  }

  async function handleAddLocation() {
    if (!newLocInput.trim()) return;
    if (locations.includes(newLocInput.trim())) {
      toastStore.showToast('Lokasi sudah ada', 'error');
      return;
    }
    const updated = [...locations, newLocInput.trim()];
    await facilityService.saveLocations(updated, actor);
    locations = updated;
    newLocInput = '';
    toastStore.showToast('Lokasi berhasil ditambahkan', 'success');
  }

  function askDeleteLocation(loc: string) {
    confirmState = {
      title: 'Hapus Lokasi',
      message: `Hapus lokasi "${loc}"?`,
      action: async () => {
        const updated = locations.filter((l) => l !== loc);
        await facilityService.saveLocations(updated, actor);
        locations = updated;
        toastStore.showToast('Lokasi dihapus', 'success');
      }
    };
  }

  function confirmAction() {
    const s = confirmState;
    confirmState = null;
    s?.action();
  }
</script>

<div class="space-y-6">
  <!-- Top Header -->
  <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
    <div>
      <h1 class="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
        <Building2 class="w-7 h-7 text-teal-600" />
        Manajemen Sarana, Prasarana & Fasilitas
      </h1>
      <p class="text-sm text-slate-600 mt-1">
        Kelola informasi fasilitas pelayanan, aksesibilitas, parkir, dan integrasi peta lokasi puskesmas.
      </p>
    </div>
    <div class="flex items-center gap-3">
      <button
        onclick={handleOpenCreate}
        class="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-[var(--color-text)] rounded-xl font-medium text-sm hover:bg-teal-700 transition-colors shadow-sm"
      >
        <Plus class="w-4 h-4" />
        Tambah Fasilitas
      </button>
    </div>
  </div>

  <!-- Stats Grid -->
  <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
    <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
      <p class="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Fasilitas</p>
      <p class="text-2xl font-bold text-slate-900 mt-1">{stats.total}</p>
    </div>
    <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
      <p class="text-xs font-semibold uppercase tracking-wider text-emerald-600">Aktif / Tersedia</p>
      <p class="text-2xl font-bold text-emerald-700 mt-1">{stats.active}</p>
    </div>
    <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
      <p class="text-xs font-semibold uppercase tracking-wider text-amber-600">Tidak Tersedia</p>
      <p class="text-2xl font-bold text-amber-700 mt-1">{stats.unavailable}</p>
    </div>
    <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
      <p class="text-xs font-semibold uppercase tracking-wider text-blue-600">Ramah Disabilitas</p>
      <p class="text-2xl font-bold text-blue-700 mt-1">{stats.accessible}</p>
    </div>
    <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-xs col-span-2 md:col-span-1">
      <p class="text-xs font-semibold uppercase tracking-wider text-slate-400">Disembunyikan</p>
      <p class="text-2xl font-bold text-slate-600 mt-1">{stats.unpublished}</p>
    </div>
  </div>

  <!-- Navigation Tabs -->
  <div class="flex border-b border-slate-200 bg-white px-6 rounded-t-2xl">
    <button
      onclick={() => (activeTab = 'facilities')}
      class={`py-3.5 px-4 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${
        activeTab === 'facilities'
          ? 'border-teal-600 text-teal-700'
          : 'border-transparent text-slate-500 hover:text-slate-700'
      }`}
    >
      <Building2 class="w-4 h-4" />
      Daftar Fasilitas ({facilities.length})
    </button>
    <button
      onclick={() => (activeTab = 'categories')}
      class={`py-3.5 px-4 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${
        activeTab === 'categories'
          ? 'border-teal-600 text-teal-700'
          : 'border-transparent text-slate-500 hover:text-slate-700'
      }`}
    >
      <Layers class="w-4 h-4" />
      Kategori ({categories.length})
    </button>
    <button
      onclick={() => (activeTab = 'locations')}
      class={`py-3.5 px-4 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${
        activeTab === 'locations'
          ? 'border-teal-600 text-teal-700'
          : 'border-transparent text-slate-500 hover:text-slate-700'
      }`}
    >
      <MapPin class="w-4 h-4" />
      Lokasi / Gedung ({locations.length})
    </button>
  </div>

  <!-- Tab 1: Facilities List -->
  {#if activeTab === 'facilities'}
    <div class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      <!-- Filter Toolbar -->
      <div class="p-4 border-b border-slate-200 flex flex-col md:flex-row gap-3 items-center justify-between bg-slate-50">
        <div class="relative w-full md:w-80">
          <Search class="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari fasilitas, lokasi..."
            value={searchQuery}
            oninput={(e) => (searchQuery = e.currentTarget.value)}
            class="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <div class="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            value={filterCategory}
            onchange={(e) => (filterCategory = e.currentTarget.value)}
            class="px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">Semua Kategori</option>
            {#each categories as c (c)}
              <option value={c}>{c}</option>
            {/each}
          </select>
          <select
            value={filterStatus}
            onchange={(e) => (filterStatus = e.currentTarget.value)}
            class="px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">Semua Status</option>
            <option value="Available">Available (Tersedia)</option>
            <option value="Limited">Limited (Terbatas)</option>
            <option value="Temporarily Unavailable">Temporarily Unavailable</option>
            <option value="Unavailable">Unavailable</option>
            <option value="Archived">Archived</option>
          </select>
        </div>
      </div>

      <!-- Table -->
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-slate-200 bg-slate-100 text-xs font-semibold text-slate-600 uppercase tracking-wider">
              <th class="py-3 px-4">Fasilitas</th>
              <th class="py-3 px-4">Kategori & Lokasi</th>
              <th class="py-3 px-4">Aksesibilitas</th>
              <th class="py-3 px-4">Status</th>
              <th class="py-3 px-4">Website</th>
              <th class="py-3 px-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200 text-sm">
            {#if loading}
              <tr>
                <td colspan={6} class="py-8 text-center text-slate-500">Memuat data fasilitas...</td>
              </tr>
            {:else if facilities.length === 0}
              <tr>
                <td colspan={6} class="py-8 text-center text-slate-500">
                  Tidak ada fasilitas yang ditemukan.
                </td>
              </tr>
            {:else}
              {#each facilities as fac (fac.id)}
                <tr class="hover:bg-slate-50 transition-colors">
                  <td class="py-4 px-4">
                    <div class="flex items-center gap-3">
                      <img
                        src={fac.photos?.[0] || 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=200'}
                        alt={fac.name}
                        class="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0"
                      />
                      <div>
                        <p class="font-semibold text-slate-900">{fac.name}</p>
                        <p class="text-xs text-slate-500 line-clamp-1">{fac.description || 'Tidak ada deskripsi'}</p>
                      </div>
                    </div>
                  </td>
                  <td class="py-4 px-4">
                    <span class="inline-block px-2.5 py-1 bg-teal-50 text-teal-800 text-xs font-medium rounded-md mb-1">
                      {fac.category}
                    </span>
                    <p class="text-xs text-slate-600 flex items-center gap-1">
                      <MapPin class="w-3 h-3 text-slate-400" />
                      {fac.location} {fac.floor ? `(${fac.floor})` : ''}
                    </p>
                  </td>
                  <td class="py-4 px-4">
                    <div class="flex items-center gap-1.5 text-xs text-slate-600">
                      {#if fac.accessibility.wheelchairAccessible}
                        <span title="Akses Kursi Roda" class="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded font-bold">Roda</span>
                      {/if}
                      {#if fac.accessibility.accessibleToilet}
                        <span title="Toilet Aksesibel" class="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded font-bold">Toilet</span>
                      {/if}
                      {#if fac.accessibility.prioritySeating}
                        <span title="Kursi Prioritas" class="px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded font-bold">Prioritas</span>
                      {/if}
                    </div>
                  </td>
                  <td class="py-4 px-4">
                    <span class={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                      fac.status === 'Available' ? 'bg-emerald-100 text-emerald-800' :
                      fac.status === 'Limited' ? 'bg-blue-100 text-blue-800' :
                      fac.status === 'Temporarily Unavailable' ? 'bg-amber-100 text-amber-800' :
                      'bg-rose-100 text-rose-800'
                    }`}>
                      {fac.status}
                    </span>
                  </td>
                  <td class="py-4 px-4">
                    <button
                      onclick={() => handleToggleVisibility(fac)}
                      class={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                        fac.showOnWebsite
                          ? 'bg-teal-100 text-teal-800 hover:bg-teal-200'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {#if fac.showOnWebsite}
                        <Eye class="w-3.5 h-3.5" />
                      {:else}
                        <EyeOff class="w-3.5 h-3.5" />
                      {/if}
                      {fac.showOnWebsite ? 'Public' : 'Hidden'}
                    </button>
                  </td>
                  <td class="py-4 px-4 text-right">
                    <div class="flex items-center justify-end gap-2">
                      <button
                        onclick={() => handleOpenEdit(fac)}
                        class="p-1.5 text-slate-600 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                        title="Edit Fasilitas"
                      >
                        <Edit3 class="w-4 h-4" />
                      </button>
                      <button
                        onclick={() => askDelete(fac.id, fac.name)}
                        class="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Hapus Fasilitas"
                      >
                        <Trash2 class="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              {/each}
            {/if}
          </tbody>
        </table>
      </div>
    </div>
  {/if}

  <!-- Tab 2: Categories -->
  {#if activeTab === 'categories'}
    <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs max-w-2xl">
      <h3 class="text-lg font-bold text-slate-900 mb-2">Kelola Kategori Fasilitas</h3>
      <p class="text-sm text-slate-600 mb-4">Tambahkan atau hapus kategori klasifikasi sarana dan prasarana puskesmas.</p>

      <div class="flex gap-2 mb-6">
        <input
          type="text"
          placeholder="Nama kategori baru..."
          value={newCatInput}
          oninput={(e) => (newCatInput = e.currentTarget.value)}
          class="flex-1 px-4 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
        <button
          onclick={handleAddCategory}
          class="px-4 py-2 bg-teal-600 text-[var(--color-text)] rounded-xl text-sm font-medium hover:bg-teal-700 transition-colors"
        >
          Tambah Kategori
        </button>
      </div>

      <div class="space-y-2">
        {#each categories as cat (cat)}
          <div class="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span class="text-sm font-semibold text-slate-800">{cat}</span>
            <button
              onclick={() => askDeleteCategory(cat)}
              class="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition-colors"
              title="Hapus kategori"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Tab 3: Locations -->
  {#if activeTab === 'locations'}
    <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs max-w-2xl">
      <h3 class="text-lg font-bold text-slate-900 mb-2">Kelola Lokasi / Gedung Puskesmas</h3>
      <p class="text-sm text-slate-600 mb-4">Atur titik gedung, lantai, dan zona lokasi internal puskesmas.</p>

      <div class="flex gap-2 mb-6">
        <input
          type="text"
          placeholder="Nama lokasi / gedung baru..."
          value={newLocInput}
          oninput={(e) => (newLocInput = e.currentTarget.value)}
          class="flex-1 px-4 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
        <button
          onclick={handleAddLocation}
          class="px-4 py-2 bg-teal-600 text-[var(--color-text)] rounded-xl text-sm font-medium hover:bg-teal-700 transition-colors"
        >
          Tambah Lokasi
        </button>
      </div>

      <div class="space-y-2">
        {#each locations as loc (loc)}
          <div class="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span class="text-sm font-semibold text-slate-800">{loc}</span>
            <button
              onclick={() => askDeleteLocation(loc)}
              class="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition-colors"
              title="Hapus lokasi"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>

<!-- Create / Edit Modal -->
<Modal
  isOpen={isModalOpen && editingFacility !== null}
  onClose={() => (isModalOpen = false)}
  title={editingFacility?.id ? 'Edit Fasilitas & Sarana' : 'Tambah Fasilitas Baru'}
  size="lg"
>
  {#snippet footer()}
    <button
      type="button"
      onclick={() => (isModalOpen = false)}
      class="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
    >
      Batal
    </button>
    <button
      type="submit"
      form="facility-form"
      class="px-4 py-2 bg-teal-600 text-[var(--color-text)] rounded-xl text-sm font-medium hover:bg-teal-700 transition-colors shadow-sm"
    >
      Simpan Fasilitas
    </button>
  {/snippet}

  {#if editingFacility}
    <form id="facility-form" onsubmit={handleSaveFacility} class="space-y-4">
      <div>
        <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Nama Fasilitas *</label>
        <input
          type="text"
          required
          value={editingFacility.name ?? ''}
          oninput={(e) => updateFac({ name: e.currentTarget.value })}
          class="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          placeholder="Contoh: Ruang Pemeriksaan Poli Gigi & Mulut"
        />
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Kategori *</label>
          <select
            value={editingFacility.category ?? ''}
            onchange={(e) => updateFac({ category: e.currentTarget.value })}
            class="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            {#each categories as c (c)}
              <option value={c}>{c}</option>
            {/each}
          </select>
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Status Ketersediaan *</label>
          <select
            value={editingFacility.status ?? 'Available'}
            onchange={(e) => updateFac({ status: e.currentTarget.value as FacilityEntity['status'] })}
            class="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="Available">Available (Tersedia Normal)</option>
            <option value="Limited">Limited (Kapasitas Terbatas)</option>
            <option value="Temporarily Unavailable">Temporarily Unavailable (Sementara Tutup)</option>
            <option value="Unavailable">Unavailable (Tidak Tersedia)</option>
            <option value="Archived">Archived (Diarsipkan)</option>
          </select>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Lokasi / Gedung *</label>
          <select
            value={editingFacility.location ?? ''}
            onchange={(e) => updateFac({ location: e.currentTarget.value })}
            class="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            {#each locations as l (l)}
              <option value={l}>{l}</option>
            {/each}
          </select>
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Lantai / Zona</label>
          <input
            type="text"
            value={editingFacility.floor ?? ''}
            oninput={(e) => updateFac({ floor: e.currentTarget.value })}
            class="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            placeholder="Contoh: Lantai 2"
          />
        </div>
      </div>

      <div>
        <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">URL Foto (Media Library)</label>
        <input
          type="url"
          value={editingFacility.photos?.[0] ?? ''}
          oninput={(e) => updateFac({ photos: [e.currentTarget.value] })}
          class="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          placeholder="https://images.unsplash.com/..."
        />
      </div>

      <div>
        <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Deskripsi Fasilitas</label>
        <textarea
          rows={3}
          value={editingFacility.description ?? ''}
          oninput={(e) => updateFac({ description: e.currentTarget.value })}
          class="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          placeholder="Jelaskan fasilitas dan peralatan utama..."
        ></textarea>
      </div>

      <!-- Accessibility Attributes -->
      <div class="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
        <p class="text-xs font-bold uppercase tracking-wider text-slate-700">Atribut Aksesibilitas (Centang jika tersedia)</p>
        <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
          <label class="flex items-center gap-2 text-xs font-medium text-slate-700">
            <input
              type="checkbox"
              checked={editingFacility.accessibility?.wheelchairAccessible ?? false}
              onchange={(e) => setAccessibility('wheelchairAccessible', e.currentTarget.checked)}
              class="rounded text-teal-600 focus:ring-teal-500"
            />
            Akses Kursi Roda
          </label>
          <label class="flex items-center gap-2 text-xs font-medium text-slate-700">
            <input
              type="checkbox"
              checked={editingFacility.accessibility?.ramp ?? false}
              onchange={(e) => setAccessibility('ramp', e.currentTarget.checked)}
              class="rounded text-teal-600 focus:ring-teal-500"
            />
            Jalur Ramp
          </label>
          <label class="flex items-center gap-2 text-xs font-medium text-slate-700">
            <input
              type="checkbox"
              checked={editingFacility.accessibility?.accessibleToilet ?? false}
              onchange={(e) => setAccessibility('accessibleToilet', e.currentTarget.checked)}
              class="rounded text-teal-600 focus:ring-teal-500"
            />
            Toilet Aksesibel
          </label>
          <label class="flex items-center gap-2 text-xs font-medium text-slate-700">
            <input
              type="checkbox"
              checked={editingFacility.accessibility?.prioritySeating ?? false}
              onchange={(e) => setAccessibility('prioritySeating', e.currentTarget.checked)}
              class="rounded text-teal-600 focus:ring-teal-500"
            />
            Kursi Prioritas
          </label>
          <label class="flex items-center gap-2 text-xs font-medium text-slate-700">
            <input
              type="checkbox"
              checked={editingFacility.accessibility?.disabledParking ?? false}
              onchange={(e) => setAccessibility('disabledParking', e.currentTarget.checked)}
              class="rounded text-teal-600 focus:ring-teal-500"
            />
            Parkir Disabilitas
          </label>
          <label class="flex items-center gap-2 text-xs font-medium text-slate-700">
            <input
              type="checkbox"
              checked={editingFacility.accessibility?.brailleSignage ?? false}
              onchange={(e) => setAccessibility('brailleSignage', e.currentTarget.checked)}
              class="rounded text-teal-600 focus:ring-teal-500"
            />
            Signage / Braille
          </label>
        </div>
      </div>

      <!-- External Map Link -->
      <div>
        <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Link Peta Eksternal (Google Maps URL)</label>
        <input
          type="url"
          value={editingFacility.externalMapUrl ?? ''}
          oninput={(e) => updateFac({ externalMapUrl: e.currentTarget.value })}
          class="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          placeholder="https://maps.google.com/?q=..."
        />
      </div>

      <div class="flex items-center pt-2">
        <label class="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={editingFacility.showOnWebsite ?? true}
            onchange={(e) => updateFac({ showOnWebsite: e.currentTarget.checked })}
            class="rounded text-teal-600 focus:ring-teal-500 w-4 h-4"
          />
          Tampilkan di Website Publik (Show on Website)
        </label>
      </div>
    </form>
  {/if}
</Modal>

<ConfirmModal
  isOpen={confirmState !== null}
  onClose={() => (confirmState = null)}
  onConfirm={confirmAction}
  title={confirmState?.title ?? 'Konfirmasi'}
  message={confirmState?.message ?? ''}
  confirmLabel="Ya, Hapus"
/>
