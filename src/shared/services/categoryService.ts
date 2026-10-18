import type { CategoryEntity } from '../types/index.js';
import { auditService } from './auditService';
import { getCollectionData, saveDocumentData, deleteDocumentData } from '../lib/firebase';
import { memStore } from '../lib/memStore';

const CATEGORIES_STORAGE_KEY = 'puskesmas_cms_categories';
const FIRESTORE_COLLECTION = 'categories';

const INITIAL_CATEGORIES: CategoryEntity[] = [
  {
    id: 'cat-berita',
    name: 'Berita & Kegiatan',
    slug: 'berita-kegiatan',
    description: 'Informasi kegiatan operasional, sosialisasi, dan liputan lapangan Puskesmas.',
    type: 'post',
    order: 1,
    status: 'active',
    createdAt: new Date().toISOString()
  },
  {
    id: 'cat-kesehatan',
    name: 'Edukasi Kesehatan',
    slug: 'edukasi-kesehatan',
    description: 'Artikel, tips kesehatan, dan panduan pencegahan penyakit bagi masyarakat.',
    type: 'post',
    order: 2,
    status: 'active',
    createdAt: new Date().toISOString()
  },
  {
    id: 'cat-ilp',
    name: 'Klaster ILP',
    slug: 'klaster-ilp',
    description: 'Informasi penerapan 5 Klaster Integrasi Layanan Primer Permenkes 19/2024.',
    type: 'post',
    order: 3,
    status: 'active',
    createdAt: new Date().toISOString()
  },
  {
    id: 'cat-doc-regulasi',
    name: 'Regulasi & SK',
    slug: 'regulasi-sk',
    description: 'Surat Keputusan, Peraturan, dan Standar Operasional Prosedur.',
    type: 'document',
    order: 1,
    status: 'active',
    createdAt: new Date().toISOString()
  },
  {
    id: 'cat-doc-laporan',
    name: 'Laporan Publik',
    slug: 'laporan-publik',
    description: 'Laporan Kinerja, Laporan Keuangan, dan Hasil Survey Kepuasan Masyarakat.',
    type: 'document',
    order: 2,
    status: 'active',
    createdAt: new Date().toISOString()
  },
  {
    id: 'cat-doc-formulir',
    name: 'Formulir',
    slug: 'formulir',
    description: 'Formulir pelayanan publik yang dapat diunduh.',
    type: 'document',
    order: 3,
    status: 'active',
    createdAt: new Date().toISOString()
  },
  {
    id: 'cat-doc-persyaratan',
    name: 'Persyaratan',
    slug: 'persyaratan',
    description: 'Dokumen persyaratan pendaftaran dan pelayanan.',
    type: 'document',
    order: 4,
    status: 'active',
    createdAt: new Date().toISOString()
  },
  {
    id: 'cat-doc-sop',
    name: 'SOP',
    slug: 'sop',
    description: 'Standar Operasional Prosedur pelayanan kesehatan.',
    type: 'document',
    order: 5,
    status: 'active',
    createdAt: new Date().toISOString()
  },
  {
    id: 'cat-doc-standar',
    name: 'Standar Pelayanan',
    slug: 'standar-pelayanan',
    description: 'Dokumen standar kualitas pelayanan kesehatan resmi.',
    type: 'document',
    order: 6,
    status: 'active',
    createdAt: new Date().toISOString()
  },
  {
    id: 'cat-doc-maklumat',
    name: 'Maklumat Pelayanan',
    slug: 'maklumat-pelayanan',
    description: 'Pernyataan kesanggupan dan kewajiban memberikan pelayanan sesuai standar.',
    type: 'document',
    order: 7,
    status: 'active',
    createdAt: new Date().toISOString()
  },
  {
    id: 'cat-doc-informasi',
    name: 'Informasi Publik',
    slug: 'informasi-publik',
    description: 'Dokumen informasi layanan umum untuk transparansi publik.',
    type: 'document',
    order: 8,
    status: 'active',
    createdAt: new Date().toISOString()
  },
  {
    id: 'cat-doc-panduan',
    name: 'Panduan',
    slug: 'panduan',
    description: 'Buku panduan dan petunjuk teknis layanan bagi pasien.',
    type: 'document',
    order: 9,
    status: 'active',
    createdAt: new Date().toISOString()
  },
  {
    id: 'cat-doc-pengumuman',
    name: 'Pengumuman',
    slug: 'pengumuman',
    description: 'Surat pengumuman resmi dan maklumat penting.',
    type: 'document',
    order: 10,
    status: 'active',
    createdAt: new Date().toISOString()
  },
  {
    id: 'cat-doc-lainnya',
    name: 'Dokumen Lainnya',
    slug: 'dokumen-lainnya',
    description: 'Dokumen pendukung lainnya terkait administrasi dan pelayanan.',
    type: 'document',
    order: 11,
    status: 'active',
    createdAt: new Date().toISOString()
  }
];

function getStoredCategories(): CategoryEntity[] {
  try {
    const data = memStore.getItem(CATEGORIES_STORAGE_KEY);
    if (!data) {
      memStore.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(INITIAL_CATEGORIES));
      return INITIAL_CATEGORIES;
    }
    const parsed: CategoryEntity[] = JSON.parse(data);
    if (!Array.isArray(parsed)) {
      memStore.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(INITIAL_CATEGORIES));
      return INITIAL_CATEGORIES;
    }
    return parsed;
  } catch {
    return INITIAL_CATEGORIES;
  }
}

function saveStoredCategories(categories: CategoryEntity[]) {
  try {
    memStore.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
  } catch (err) {
    console.error('Failed to save categories:', err);
  }
}

export const categoryService = {
  async getCategories(type?: string): Promise<CategoryEntity[]> {
    try {
      const cloudData = await getCollectionData<CategoryEntity>(
        FIRESTORE_COLLECTION, 
        CATEGORIES_STORAGE_KEY, 
        INITIAL_CATEGORIES
      );
      let list = (cloudData && cloudData.length > 0 ? cloudData : getStoredCategories()).filter(c => c.status === 'active');
      if (type) {
        list = list.filter(c => c.type === type);
      }
      return list.sort((a, b) => a.order - b.order);
    } catch {
      let list = getStoredCategories().filter(c => c.status === 'active');
      if (type) {
        list = list.filter(c => c.type === type);
      }
      return list.sort((a, b) => a.order - b.order);
    }
  },

  async getCategoryById(id: string): Promise<CategoryEntity | null> {
    const list = getStoredCategories();
    return list.find(c => c.id === id) || null;
  },

  async addCategory(data: Partial<CategoryEntity>): Promise<CategoryEntity> {
    const list = getStoredCategories();
    const slug = (data.slug || data.name || 'kategori-baru')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-');

    const newCat: CategoryEntity = {
      id: data.id || `cat-${Date.now()}`,
      name: data.name || 'Kategori Baru',
      slug,
      description: data.description || '',
      type: data.type || 'post',
      order: typeof data.order === 'number' ? data.order : list.length + 1,
      status: 'active',
      createdAt: new Date().toISOString()
    };

    const updated = [...list, newCat];
    saveStoredCategories(updated);
    await saveDocumentData(FIRESTORE_COLLECTION, newCat.id, newCat, CATEGORIES_STORAGE_KEY);

    auditService.recordLog({
      userId: 'system',
      userName: 'Administrator',
      userEmail: 'admin@puskesmas.go.id',
      action: 'CREATE',
      module: 'CMS_CATEGORY',
      description: `Menambahkan kategori "${newCat.name}" (Tipe: ${newCat.type})`,
      details: { categoryId: newCat.id, name: newCat.name, type: newCat.type }
    }).catch(err => console.warn('Failed to record category audit log:', err));

    return newCat;
  },

  async updateCategory(id: string, data: Partial<CategoryEntity>): Promise<CategoryEntity> {
    const list = getStoredCategories();
    const index = list.findIndex(c => c.id === id);
    if (index === -1) {
      throw new Error(`Kategori dengan ID "${id}" tidak ditemukan.`);
    }

    const existing = list[index];
    const slug = data.slug || (data.name 
      ? data.name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-')
      : existing.slug);

    const updatedCat: CategoryEntity = {
      ...existing,
      ...data,
      id: existing.id,
      slug,
      updatedAt: new Date().toISOString()
    };

    list[index] = updatedCat;
    saveStoredCategories(list);
    await saveDocumentData(FIRESTORE_COLLECTION, updatedCat.id, updatedCat, CATEGORIES_STORAGE_KEY);

    auditService.recordLog({
      userId: 'system',
      userName: 'Administrator',
      userEmail: 'admin@puskesmas.go.id',
      action: 'UPDATE',
      module: 'CMS_CATEGORY',
      description: `Memperbarui kategori "${updatedCat.name}"`,
      details: { categoryId: updatedCat.id, name: updatedCat.name, type: updatedCat.type }
    }).catch(err => console.warn('Failed to record category audit log:', err));

    return updatedCat;
  },

  async deleteCategory(id: string): Promise<void> {
    const list = getStoredCategories();
    const target = list.find(c => c.id === id);
    const updated = list.filter(c => c.id !== id);
    saveStoredCategories(updated);
    await deleteDocumentData(FIRESTORE_COLLECTION, id, CATEGORIES_STORAGE_KEY);

    if (target) {
      auditService.recordLog({
        userId: 'system',
        userName: 'Administrator',
        userEmail: 'admin@puskesmas.go.id',
        action: 'DELETE',
        module: 'CMS_CATEGORY',
        description: `Menghapus kategori "${target.name}" (${target.type})`,
        details: { categoryId: id, name: target.name }
      }).catch(err => console.warn('Failed to record category audit log:', err));
    }
  }
};

