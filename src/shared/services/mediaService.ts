import type { MediaItem } from '../types/index.js';
import { auditService } from './auditService';
import { getCollectionData, saveDocumentData, deleteDocumentData } from '../lib/firebase';

const FIRESTORE_COLLECTION = 'media';
const MEDIA_STORAGE_KEY = 'puskesmas_media_library';

const INITIAL_MEDIA: MediaItem[] = [
  {
    id: 'med-1',
    fileName: 'Gedung_Depan_Puskesmas.jpg',
    fileUrl: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=800',
    storagePath: '/media/Gedung_Depan_Puskesmas.jpg',
    mimeType: 'image/jpeg',
    size: 2450000,
    uploadedBy: 'usr-superadmin-01',
    uploadedByName: 'Administrator Utama',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    category: 'Gedung & Sarana'
  },
  {
    id: 'med-2',
    fileName: 'Logo_Resmi_Puskesmas.png',
    fileUrl: 'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?auto=format&fit=crop&q=80&w=800',
    storagePath: '/media/Logo_Resmi_Puskesmas.png',
    mimeType: 'image/png',
    size: 850000,
    uploadedBy: 'usr-superadmin-01',
    uploadedByName: 'Administrator Utama',
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    category: 'Identitas Visual'
  },
  {
    id: 'med-3',
    fileName: 'Pelayanan_Poli_KIA.jpg',
    fileUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=800',
    storagePath: '/media/Pelayanan_Poli_KIA.jpg',
    mimeType: 'image/jpeg',
    size: 3100000,
    uploadedBy: 'usr-editor-03',
    uploadedByName: 'Siti Rahmawati',
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    category: 'Pelayanan'
  }
];

export const mediaService = {
  async getMediaList(category?: string, search?: string): Promise<MediaItem[]> {
    let list = await getCollectionData<MediaItem>(FIRESTORE_COLLECTION, MEDIA_STORAGE_KEY, INITIAL_MEDIA);

    if (category) {
      list = list.filter(m => m.category === category);
    }

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(m => m.fileName.toLowerCase().includes(q));
    }

    // Attach Usage References
    return list.map(m => {
      const details: { type: string; title: string; id: string }[] = [];
      if (m.id === 'med-1' || m.fileName.includes('Gedung')) {
        details.push({ type: 'Halaman', title: 'Sejarah & Perkembangan Puskesmas', id: 'page-sejarah' });
        details.push({ type: 'Galeri Album', title: 'Gedung dan Sarana Prasarana', id: 'gal-1' });
      }
      if (m.id === 'med-3' || m.fileName.includes('Poli')) {
        details.push({ type: 'Berita', title: 'Penerapan Integrasi Layanan Primer (ILP)', id: 'post-1' });
      }
      return {
        ...m,
        usedInCount: details.length,
        usedInDetails: details
      };
    });
  },

  async addMedia(file: { name: string; url: string; mimeType: string; size: number; category?: string }, actor: { id: string; email: string; name: string }): Promise<MediaItem> {
    const newItem: MediaItem = {
      id: `med-${Date.now()}`,
      fileName: file.name,
      fileUrl: file.url,
      storagePath: `/media/${file.name}`,
      mimeType: file.mimeType,
      size: file.size,
      uploadedBy: actor.id,
      uploadedByName: actor.name,
      createdAt: new Date().toISOString(),
      category: file.category || 'Umum'
    };

    await saveDocumentData(FIRESTORE_COLLECTION, newItem.id, newItem, MEDIA_STORAGE_KEY);

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'CREATE',
      module: 'MEDIA',
      targetId: newItem.id,
      targetName: newItem.fileName,
      description: `Mengunggah berkas baru ke Media Library: ${newItem.fileName}`
    });

    return newItem;
  },

  async deleteMedia(id: string, actor: { id: string; email: string; name: string }): Promise<void> {
    const list = await this.getMediaList();
    const item = list.find(m => m.id === id);

    await deleteDocumentData(FIRESTORE_COLLECTION, id, MEDIA_STORAGE_KEY);

    if (item) {
      await auditService.recordLog({
        userId: actor.id,
        userEmail: actor.email,
        userName: actor.name,
        action: 'DELETE',
        module: 'MEDIA',
        targetId: item.id,
        targetName: item.fileName,
        description: `Menghapus berkas dari Media Library: ${item.fileName}`
      });
    }
  }
};
