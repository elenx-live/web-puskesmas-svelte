import type { FacilityEntity } from '../types/index.js';
import { auditService } from './auditService';
import { getCollectionData, saveDocumentData, deleteDocumentData, saveSingleDocument, getSingleDocument } from '../lib/firebase';

const FACILITY_STORAGE_KEY = 'puskesmas_facilities_data';
const FACILITY_CATEGORIES_KEY = 'puskesmas_facility_categories';
const FACILITY_LOCATIONS_KEY = 'puskesmas_facility_locations';
const FIRESTORE_COLLECTION = 'facilities';

const DEFAULT_CATEGORIES = [
  'Ruang Pelayanan',
  'Ruang Administrasi',
  'Ruang Tunggu',
  'Fasilitas Kesehatan',
  'Fasilitas Umum',
  'Fasilitas Aksesibilitas',
  'Area Parkir',
  'Sanitasi',
  'Fasilitas Darurat',
  'Lainnya'
];

const DEFAULT_LOCATIONS = [
  'Gedung Utama',
  'Gedung A',
  'Gedung B',
  'Lantai 1',
  'Lantai 2',
  'Area Parkir Utama',
  'Zona Penunjang'
];

const INITIAL_FACILITIES: FacilityEntity[] = [
  {
    id: 'fac-001',
    name: 'Ruang Pemeriksaan Poli Gigi & Mulut',
    category: 'Ruang Pelayanan',
    description: 'Ruangan steril dan modern dilengkapi dental unit elektrik, instrumen sterilisasi autoklaf, serta rujukan langsung ke tindakan bedah minor gigi.',
    photos: [
      'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&q=80&w=800'
    ],
    location: 'Gedung Utama',
    floor: 'Lantai 2',
    unitId: 'unit-gigi',
    unitName: 'Poli Gigi & Mulut',
    relatedServiceIds: ['srv-002', 'srv-gigi'],
    status: 'Available',
    showOnWebsite: true,
    order: 1,
    accessibility: {
      wheelchairAccessible: true,
      ramp: true,
      accessibleToilet: false,
      prioritySeating: true,
      disabledParking: false,
      brailleSignage: true
    },
    parkingInfo: {
      motorCapacity: '100 Slot',
      carCapacity: '25 Slot',
      notes: 'Tersedia jalur landai (ramp) khusus kursi roda langsung dari area drop-off.'
    },
    externalMapUrl: 'https://maps.google.com/?q=Puskesmas+Sehat+Gedung+Utama',
    seoTitle: 'Poli Gigi & Mulut - Fasilitas Puskesmas',
    seoDescription: 'Informasi fasilitas ruang pemeriksaan gigi lengkap dengan standar sterilisasi dan aksesibilitas ramah disabilitas.',
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    createdBy: { id: 'usr-superadmin-01', name: 'Administrator Utama' }
  },
  {
    id: 'fac-002',
    name: 'Ruang Tunggu Utama Pasien (Kenyamanan & Ramah Anak)',
    category: 'Ruang Tunggu',
    description: 'Ruangan tunggu ber-AC dilengkapi kursi prioritas lansia/disabilitas, pojok laktasi, area bermain anak, dan layar informasi antrean real-time.',
    photos: [
      'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=800'
    ],
    location: 'Gedung Utama',
    floor: 'Lantai 1',
    unitId: 'unit-pendaftaran',
    unitName: 'Loket Pendaftaran & Informasi',
    relatedServiceIds: ['srv-001', 'srv-002'],
    status: 'Available',
    showOnWebsite: true,
    order: 2,
    accessibility: {
      wheelchairAccessible: true,
      ramp: true,
      accessibleToilet: true,
      prioritySeating: true,
      disabledParking: true,
      brailleSignage: true
    },
    parkingInfo: {
      notes: 'Dekat dengan loket pendaftaran, toilet disabilitas, dan apotek.'
    },
    externalMapUrl: 'https://maps.google.com/?q=Puskesmas+Sehat+Lantai+1',
    seoTitle: 'Ruang Tunggu Utama - Puskesmas Sehat',
    seoDescription: 'Fasilitas ruang tunggu nyaman, ber-AC, ramah disabilitas, dan dilengkapi pojok bermain anak.',
    createdAt: new Date(Date.now() - 86400000 * 8).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    createdBy: { id: 'usr-adminweb-02', name: 'Budi Santoso' }
  },
  {
    id: 'fac-003',
    name: 'Unit Gawat Darurat (UGD) 24 Jam',
    category: 'Fasilitas Darurat',
    description: 'Layanan kegawatdaruratan medis siaga 24/7 dengan tenaga medis terlatih, ambulans siaga, tabung oksigen sentral, EKG, dan defibrilator.',
    photos: [
      'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&q=80&w=800'
    ],
    location: 'Gedung A',
    floor: 'Lantai 1',
    unitId: 'unit-ugd',
    unitName: 'Unit Gawat Darurat',
    relatedServiceIds: ['srv-ugd', 'srv-emergency'],
    status: 'Available',
    showOnWebsite: true,
    order: 3,
    accessibility: {
      wheelchairAccessible: true,
      ramp: true,
      accessibleToilet: true,
      prioritySeating: true,
      disabledParking: true,
      brailleSignage: true
    },
    parkingInfo: {
      carCapacity: '5 Ambulance Slot',
      notes: 'Akses khusus ambulans dan jalur darurat bebas hambatan.'
    },
    externalMapUrl: 'https://maps.google.com/?q=Puskesmas+UGD',
    seoTitle: 'UGD 24 Jam - Puskesmas Sehat',
    seoDescription: 'Fasilitas gawat darurat medis siaga 24 jam dengan peralatan lengkap dan penanganan cepat.',
    createdAt: new Date(Date.now() - 86400000 * 12).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    createdBy: { id: 'usr-superadmin-01', name: 'Administrator Utama' }
  },
  {
    id: 'fac-004',
    name: 'Toilet Ramah Disabilitas & Prioritas',
    category: 'Sanitasi',
    description: 'Fasilitas sanitasi bersih yang dirancang khusus dengan pegangan rambat (handrail), tombol darurat panggilan perawat, dan permukaan anti-slip.',
    photos: [
      'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=800'
    ],
    location: 'Gedung Utama',
    floor: 'Lantai 1',
    unitId: 'unit-umum',
    unitName: 'Sarana Umum',
    relatedServiceIds: [],
    status: 'Available',
    showOnWebsite: true,
    order: 4,
    accessibility: {
      wheelchairAccessible: true,
      ramp: true,
      accessibleToilet: true,
      prioritySeating: false,
      disabledParking: false,
      brailleSignage: true
    },
    createdAt: new Date(Date.now() - 86400000 * 6).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    createdBy: { id: 'usr-adminweb-02', name: 'Budi Santoso' }
  },
  {
    id: 'fac-005',
    name: 'Area Parkir Khusus Disabilitas & Kendaraan Bermotor',
    category: 'Area Parkir',
    description: 'Area parkir luas berkanopi dengan zonasi khusus kendaraan roda dua, roda empat, serta slot khusus penyandang disabilitas dekat pintu masuk utama.',
    photos: [
      'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&q=80&w=800'
    ],
    location: 'Area Parkir Utama',
    floor: 'Lantai Dasar',
    unitId: 'unit-umum',
    unitName: 'Sarana Umum',
    relatedServiceIds: [],
    status: 'Available',
    showOnWebsite: true,
    order: 5,
    accessibility: {
      wheelchairAccessible: true,
      ramp: true,
      accessibleToilet: false,
      prioritySeating: false,
      disabledParking: true,
      brailleSignage: true
    },
    parkingInfo: {
      motorCapacity: '150 Motor',
      carCapacity: '40 Mobil',
      notes: 'Petugas parkir siaga membantu pengunjung prioritas.'
    },
    externalMapUrl: 'https://maps.google.com/?q=Parkir+Puskesmas+Sehat',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    createdBy: { id: 'usr-superadmin-01', name: 'Administrator Utama' }
  },
  {
    id: 'fac-006',
    name: 'Ruang Perawatan Rawat Inap & Bersalin Terpadu',
    category: 'Ruang Rawat Inap',
    description: 'Fasilitas kamar rawat inap yang nyaman, bersih, dan higienis dengan bed perawatan medis elektrik, nurse call 24 jam, oksigen terpusat, AC, dan kamar mandi aksesibel.',
    photos: [
      'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=800'
    ],
    location: 'Gedung Rawat Inap',
    floor: 'Lantai 2',
    unitId: 'unit-inap',
    unitName: 'Ruang Rawat Inap & Bersalin',
    relatedServiceIds: ['srv-7'],
    status: 'Available',
    showOnWebsite: true,
    order: 6,
    accessibility: {
      wheelchairAccessible: true,
      ramp: true,
      accessibleToilet: true,
      prioritySeating: true,
      disabledParking: true,
      brailleSignage: true
    },
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    createdBy: { id: 'usr-superadmin-01', name: 'Administrator Utama' }
  }
];

function getStoredFacilities(): FacilityEntity[] {
  try {
    const data = localStorage.getItem(FACILITY_STORAGE_KEY);
    if (!data) {
      localStorage.setItem(FACILITY_STORAGE_KEY, JSON.stringify(INITIAL_FACILITIES));
      return INITIAL_FACILITIES;
    }
    const parsed: FacilityEntity[] = JSON.parse(data);
    let changed = false;
    for (const item of INITIAL_FACILITIES) {
      if (!parsed.some(p => p.id === item.id)) {
        parsed.push(item);
        changed = true;
      }
    }
    if (changed) {
      localStorage.setItem(FACILITY_STORAGE_KEY, JSON.stringify(parsed));
    }
    return parsed;
  } catch {
    return INITIAL_FACILITIES;
  }
}

function saveStoredFacilities(list: FacilityEntity[]) {
  try {
    localStorage.setItem(FACILITY_STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('Failed to save facilities:', err);
  }
}

export const facilityService = {
  async getFacilities(filters?: { category?: string; status?: string; search?: string; unitId?: string; serviceId?: string; publicOnly?: boolean }): Promise<FacilityEntity[]> {
    let list: FacilityEntity[] = [];
    try {
      const cloudData = await getCollectionData<FacilityEntity>(
        FIRESTORE_COLLECTION,
        FACILITY_STORAGE_KEY,
        INITIAL_FACILITIES
      );
      list = (cloudData && cloudData.length > 0) ? cloudData : getStoredFacilities();
    } catch {
      list = getStoredFacilities();
    }

    if (filters?.publicOnly) {
      list = list.filter(f => f.showOnWebsite && f.status !== 'Archived');
    }

    if (filters?.category) {
      list = list.filter(f => f.category === filters.category);
    }

    if (filters?.status) {
      list = list.filter(f => f.status === filters.status);
    }

    if (filters?.unitId) {
      list = list.filter(f => f.unitId === filters.unitId);
    }

    if (filters?.serviceId) {
      list = list.filter(f => f.relatedServiceIds.includes(filters.serviceId));
    }

    if (filters?.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(f => 
        f.name.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q) ||
        f.location.toLowerCase().includes(q) ||
        f.category.toLowerCase().includes(q)
      );
    }

    return list.sort((a, b) => a.order - b.order || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async getPublishedFacilities(): Promise<FacilityEntity[]> {
    return this.getFacilities({ publicOnly: true });
  },

  async getFacilityById(id: string): Promise<FacilityEntity | null> {
    const list = getStoredFacilities();
    return list.find(f => f.id === id) || null;
  },

  async createFacility(data: Partial<FacilityEntity>, actor: { id: string; email: string; name: string }): Promise<FacilityEntity> {
    const list = getStoredFacilities();
    const newFac: FacilityEntity = {
      id: `fac-${Date.now()}`,
      name: data.name || 'Fasilitas Baru',
      category: data.category || 'Ruang Pelayanan',
      description: data.description || '',
      photos: data.photos && data.photos.length > 0 ? data.photos : ['https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=800'],
      location: data.location || 'Gedung Utama',
      floor: data.floor || 'Lantai 1',
      unitId: data.unitId || '',
      unitName: data.unitName || '',
      relatedServiceIds: data.relatedServiceIds || [],
      status: data.status || 'Available',
      showOnWebsite: data.showOnWebsite !== undefined ? data.showOnWebsite : true,
      order: data.order || list.length + 1,
      accessibility: data.accessibility || {
        wheelchairAccessible: false,
        ramp: false,
        accessibleToilet: false,
        prioritySeating: false,
        disabledParking: false,
        brailleSignage: false
      },
      parkingInfo: data.parkingInfo,
      externalMapUrl: data.externalMapUrl || '',
      seoTitle: data.seoTitle || '',
      seoDescription: data.seoDescription || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: { id: actor.id, name: actor.name }
    };

    saveStoredFacilities([newFac, ...list]);
    saveDocumentData(FIRESTORE_COLLECTION, newFac.id, newFac, FACILITY_STORAGE_KEY).catch(() => {});

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'CREATE',
      module: 'SERVICES',
      targetId: newFac.id,
      targetName: newFac.name,
      description: `Membuat fasilitas baru: "${newFac.name}" (${newFac.category})`
    });

    return newFac;
  },

  async updateFacility(id: string, updates: Partial<FacilityEntity>, actor: { id: string; email: string; name: string }): Promise<FacilityEntity> {
    const list = getStoredFacilities();
    const index = list.findIndex(f => f.id === id);
    if (index === -1) throw new Error('Fasilitas tidak ditemukan');

    const old = list[index];
    const updated: FacilityEntity = {
      ...old,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    list[index] = updated;
    saveStoredFacilities(list);
    saveDocumentData(FIRESTORE_COLLECTION, updated.id, updated, FACILITY_STORAGE_KEY).catch(() => {});

    let actionType: any = 'UPDATE';
    if (updates.showOnWebsite !== undefined && updates.showOnWebsite !== old.showOnWebsite) {
      actionType = updates.showOnWebsite ? 'PUBLISH' : 'UNPUBLISH';
    } else if (updates.status === 'Archived' && old.status !== 'Archived') {
      actionType = 'ARCHIVE';
    }

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: actionType,
      module: 'SERVICES',
      targetId: updated.id,
      targetName: updated.name,
      description: `Memperbarui fasilitas "${updated.name}" [Status: ${updated.status}, Visible: ${updated.showOnWebsite}]`
    });

    return updated;
  },

  async deleteFacility(id: string, actor: { id: string; email: string; name: string }): Promise<void> {
    const list = getStoredFacilities();
    const target = list.find(f => f.id === id);
    if (!target) return;

    const filtered = list.filter(f => f.id !== id);
    saveStoredFacilities(filtered);
    deleteDocumentData(FIRESTORE_COLLECTION, id, FACILITY_STORAGE_KEY).catch(() => {});

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'DELETE',
      module: 'SERVICES',
      targetId: id,
      targetName: target.name,
      description: `Menghapus fasilitas: "${target.name}"`
    });
  },

  async getCategories(): Promise<string[]> {
    try {
      const data = localStorage.getItem(FACILITY_CATEGORIES_KEY);
      if (!data) {
        localStorage.setItem(FACILITY_CATEGORIES_KEY, JSON.stringify(DEFAULT_CATEGORIES));
        return DEFAULT_CATEGORIES;
      }
      return JSON.parse(data);
    } catch {
      return DEFAULT_CATEGORIES;
    }
  },

  async saveCategories(categories: string[], actor: { id: string; email: string; name: string }): Promise<void> {
    localStorage.setItem(FACILITY_CATEGORIES_KEY, JSON.stringify(categories));
    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'UPDATE',
      module: 'SERVICES',
      targetId: 'categories',
      targetName: 'Kategori Fasilitas',
      description: `Memperbarui daftar kategori fasilitas (${categories.length} kategori)`
    });
  },

  async getLocations(): Promise<string[]> {
    try {
      const data = localStorage.getItem(FACILITY_LOCATIONS_KEY);
      if (!data) {
        localStorage.setItem(FACILITY_LOCATIONS_KEY, JSON.stringify(DEFAULT_LOCATIONS));
        return DEFAULT_LOCATIONS;
      }
      return JSON.parse(data);
    } catch {
      return DEFAULT_LOCATIONS;
    }
  },

  async saveLocations(locations: string[], actor: { id: string; email: string; name: string }): Promise<void> {
    localStorage.setItem(FACILITY_LOCATIONS_KEY, JSON.stringify(locations));
    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'UPDATE',
      module: 'SERVICES',
      targetId: 'locations',
      targetName: 'Lokasi Fasilitas',
      description: `Memperbarui daftar lokasi fasilitas (${locations.length} lokasi)`
    });
  },

  async getFacilityStats() {
    const list = getStoredFacilities();
    const total = list.length;
    const active = list.filter(f => f.status === 'Available' || f.status === 'Limited').length;
    const unavailable = list.filter(f => f.status === 'Temporarily Unavailable' || f.status === 'Unavailable').length;
    const accessible = list.filter(f => f.accessibility.wheelchairAccessible || f.accessibility.accessibleToilet).length;
    const unpublished = list.filter(f => !f.showOnWebsite).length;
    return {
      total,
      active,
      unavailable,
      accessible,
      unpublished
    };
  }
};
