import type { GalleryAlbum } from '../types/index.js';
import { auditService } from './auditService';
import { getCollectionData, saveDocumentData, deleteDocumentData } from '../lib/firebase';

const GALLERY_STORAGE_KEY = 'puskesmas_cms_gallery';
const FIRESTORE_COLLECTION = 'gallery';

const INITIAL_GALLERY: GalleryAlbum[] = [
  {
    id: 'gal-1',
    title: 'Gedung dan Sarana Prasarana Layanan Utama',
    slug: 'gedung-dan-sarana-prasarana',
    description: 'Dokumentasi area pendaftaran, ruang pemeriksaan klaster, laboratorium, dan apotek terpadu.',
    coverImage: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=800',
    images: [
      { id: 'img-1', url: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=800', caption: 'Gedung Tampak Depan Puskesmas' },
      { id: 'img-2', url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=800', caption: 'Ruang Pemeriksaan Klaster KIA' },
      { id: 'img-3', url: 'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?auto=format&fit=crop&q=80&w=800', caption: 'Fasilitas Laboratorium Klinik' }
    ],
    status: 'published',
    publishedAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    createdBy: { id: 'usr-superadmin-01', name: 'Administrator Utama' },
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 10).toISOString()
  },
  {
    id: 'gal-2',
    title: 'Kegiatan Imunisasi PIN Polio & Posyandu Lansia',
    slug: 'kegiatan-imunisasi-pin-polio',
    description: 'Foto dokumentasi pelaksanaan kegiatan lapangan kader kesehatan dan petugas medis.',
    coverImage: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&q=80&w=800',
    images: [
      { id: 'img-4', url: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&q=80&w=800', caption: 'Pemberian Tetes Imunisasi' },
      { id: 'img-5', url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=800', caption: 'Pemeriksaan Tekanan Darah Lansia' }
    ],
    status: 'published',
    publishedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    createdBy: { id: 'usr-editor-03', name: 'Siti Rahmawati' },
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 5).toISOString()
  }
];

export const galleryService = {
  async getAlbums(statusFilter?: string): Promise<GalleryAlbum[]> {
    let list = await getCollectionData<GalleryAlbum>(FIRESTORE_COLLECTION, GALLERY_STORAGE_KEY, INITIAL_GALLERY);
    if (statusFilter) {
      list = list.filter(a => a.status === statusFilter);
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async getPublishedAlbums(): Promise<GalleryAlbum[]> {
    return this.getAlbums('published');
  },

  async getAlbumBySlug(slug: string): Promise<GalleryAlbum | null> {
    const albums = await this.getAlbums();
    const clean = slug.toLowerCase();
    return albums.find(a => a.slug.toLowerCase() === clean) || null;
  },

  async createAlbum(data: Partial<GalleryAlbum>, actor: { id: string; email: string; name: string }): Promise<GalleryAlbum> {
    const slug = (data.title || 'Album Baru')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-');

    const newAlbum: GalleryAlbum = {
      id: `gal-${Date.now()}`,
      title: data.title || 'Album Galeri Baru',
      slug,
      description: data.description || '',
      coverImage: data.coverImage || 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=800',
      images: data.images || [],
      status: data.status || 'published',
      publishedAt: data.status === 'published' ? new Date().toISOString() : undefined,
      createdBy: { id: actor.id, name: actor.name },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await saveDocumentData(FIRESTORE_COLLECTION, newAlbum.id, newAlbum, GALLERY_STORAGE_KEY);

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'CREATE',
      module: 'PAGES',
      targetId: newAlbum.id,
      targetName: newAlbum.title,
      description: `Membuat album galeri baru: "${newAlbum.title}"`
    });

    return newAlbum;
  },

  async updateAlbum(id: string, data: Partial<GalleryAlbum>, actor: { id: string; email: string; name: string }): Promise<GalleryAlbum> {
    const albums = await this.getAlbums();
    const idx = albums.findIndex((a) => a.id === id);
    if (idx === -1) throw new Error('Album tidak ditemukan');

    const updated: GalleryAlbum = {
      ...albums[idx],
      ...data,
      id,
      updatedAt: new Date().toISOString()
    };

    await saveDocumentData(FIRESTORE_COLLECTION, id, updated, GALLERY_STORAGE_KEY);

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'UPDATE',
      module: 'PAGES',
      targetId: id,
      targetName: updated.title,
      description: `Memperbarui album galeri: "${updated.title}"`
    });

    return updated;
  },

  async deleteAlbum(id: string, actor: { id: string; email: string; name: string }): Promise<void> {
    const albums = await this.getAlbums();
    const target = albums.find(a => a.id === id);
    if (!target) return;

    await deleteDocumentData(FIRESTORE_COLLECTION, id, GALLERY_STORAGE_KEY);

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'DELETE',
      module: 'PAGES',
      targetId: target.id,
      targetName: target.title,
      description: `Menghapus album galeri: "${target.title}"`
    });
  }
};
