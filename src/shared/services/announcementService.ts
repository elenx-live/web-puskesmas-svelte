import type { AnnouncementEntity } from '../types/index.js';
import { auditService } from './auditService';
import { getCollectionData, saveDocumentData, deleteDocumentData } from '../lib/firebase';

const ANNOUNCEMENTS_STORAGE_KEY = 'puskesmas_cms_announcements';
const FIRESTORE_COLLECTION = 'announcements';

const INITIAL_ANNOUNCEMENTS: AnnouncementEntity[] = [
  {
    id: 'ann-1',
    title: 'Penyesuaian Jam Operasional Pelayanan Poli Spesialis Terpadu',
    content: 'Sehubungan dengan rapat evaluasi mutu pelayanan bulanan, jam pelayanan Pendaftaran Pasien pada Hari Jumat, 15 Agustus 2026 dibuka sampai pukul 11.00 WIB.',
    priority: 'high',
    startDate: new Date().toISOString(),
    status: 'published',
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    createdBy: { id: 'usr-superadmin-01', name: 'Administrator Utama' },
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString()
  },
  {
    id: 'ann-2',
    title: 'Himbauan Kewaspadaan Dini Kasus ISPA Bagi Lansia & Anak',
    content: 'Masyarakat dihimbau menggenakan masker saat beraktivitas luar ruangan dan memanfaatkan fasilitas Konsultasi Kesehatan Gratis di Poli Klaster 2 & 3.',
    priority: 'normal',
    status: 'published',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    createdBy: { id: 'usr-adminweb-02', name: 'Budi Santoso' },
    updatedAt: new Date(Date.now() - 86400000 * 3).toISOString()
  }
];

export const announcementService = {
  async getAnnouncements(statusFilter?: string): Promise<AnnouncementEntity[]> {
    let list = await getCollectionData<AnnouncementEntity>(
      FIRESTORE_COLLECTION,
      ANNOUNCEMENTS_STORAGE_KEY,
      INITIAL_ANNOUNCEMENTS
    );
    if (statusFilter) {
      list = list.filter(a => a.status === statusFilter);
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async getPublishedAnnouncements(): Promise<AnnouncementEntity[]> {
    return (await this.getAnnouncements('published')).filter(a => {
      if (a.endDate && new Date(a.endDate) < new Date()) return false;
      return true;
    });
  },

  async createAnnouncement(data: Partial<AnnouncementEntity>, actor: { id: string; email: string; name: string }): Promise<AnnouncementEntity> {
    const newAnn: AnnouncementEntity = {
      id: `ann-${Date.now()}`,
      title: data.title || 'Pengumuman Baru',
      content: data.content || '',
      priority: data.priority || 'normal',
      startDate: data.startDate,
      endDate: data.endDate,
      status: data.status || 'published',
      createdAt: new Date().toISOString(),
      createdBy: { id: actor.id, name: actor.name },
      updatedAt: new Date().toISOString()
    };

    await saveDocumentData(FIRESTORE_COLLECTION, newAnn.id, newAnn, ANNOUNCEMENTS_STORAGE_KEY);

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'CREATE',
      module: 'PAGES',
      targetId: newAnn.id,
      targetName: newAnn.title,
      description: `Membuat pengumuman publik baru: "${newAnn.title}"`
    });

    return newAnn;
  },

  async deleteAnnouncement(id: string, actor: { id: string; email: string; name: string }): Promise<void> {
    const list = await this.getAnnouncements();
    const target = list.find(a => a.id === id);
    if (!target) return;

    await deleteDocumentData(FIRESTORE_COLLECTION, id, ANNOUNCEMENTS_STORAGE_KEY);

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'DELETE',
      module: 'PAGES',
      targetId: target.id,
      targetName: target.title,
      description: `Menghapus pengumuman: "${target.title}"`
    });
  }
};

