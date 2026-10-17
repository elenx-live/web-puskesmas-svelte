import type { PublicInfoEntity, InformationRequestEntity, PublicInfoCategory, PublicInfoStatus, InformationRequestStatus } from '../types/index.js';
import { auditService } from './auditService';
import { notificationService } from './notificationService';
import { getCollectionData, saveDocumentData, deleteDocumentData } from '../lib/firebase';

const PUBLIC_INFO_STORAGE_KEY = 'puskesmas_public_infos';
const INFO_REQUESTS_STORAGE_KEY = 'puskesmas_info_requests';
const FIRESTORE_PUBLIC_INFO = 'public_info';
const FIRESTORE_INFO_REQUESTS = 'info_requests';

const INITIAL_PUBLIC_INFOS: PublicInfoEntity[] = [
  {
    id: 'info-1',
    title: 'Profil & Maklumat Pelayanan Puskesmas Sehat Mandiri',
    slug: 'profil-maklumat-pelayanan',
    summary: 'Maklumat pelayanan dan komitmen Puskesmas Sehat Mandiri dalam memberikan pelayanan kesehatan masyarakat yang prima, transparan, dan akuntabel.',
    content: `<h3>Maklumat Pelayanan</h3><p>"Dengan ini, kami seluruh pimpinan dan pegawai Puskesmas Sehat Mandiri menyatakan sanggup menyelenggarakan pelayanan sesuai standar pelayanan yang telah ditetapkan dan sanggup menerima sanksi apabila pelayanan yang diberikan tidak sesuai standar serta melakukan perbaikan secara terus-menerus."</p><h3>Visi & Misi</h3><p><strong>Visi:</strong> Menjadi Puskesmas pilihan utama yang berorientasi pada mutu dan keselamatan pasien menuju kecamatan sehat mandiri.</p><p><strong>Misi:</strong><br/>1. Menyelenggarakan pelayanan kesehatan yang paripurna, merata, dan bermutu.<br/>2. Mendorong kemandirian masyarakat dalam berperilaku hidup bersih dan sehat (PHBS).<br/>3. Meningkatkan profesionalisme tenaga kesehatan dan fasilitas pelayanan.</p>`,
    category: 'Profil Puskesmas',
    publicationDate: new Date(Date.now() - 86400000 * 30).toISOString(),
    effectiveDate: new Date(Date.now() - 86400000 * 30).toISOString(),
    status: 'Published',
    infoStatus: 'Tersedia',
    updatePeriod: 'Tahunan',
    lastUpdatedDate: new Date(Date.now() - 86400000 * 5).toISOString(),
    nextReviewDate: new Date(Date.now() + 86400000 * 300).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    createdBy: { id: 'usr-superadmin-01', name: 'Administrator Utama' }
  },
  {
    id: 'info-2',
    title: 'Standar Pelayanan Poli Umum & Pemeriksaan Kesehatan',
    slug: 'standar-pelayanan-poli-umum',
    summary: 'Informasi lengkap mengenai dasar hukum, persyaratan, prosedur, waktu, dan tarif layanan di Poli Umum Puskesmas Sehat Mandiri.',
    content: `<h3>Dasar Hukum</h3><p>Peraturan Menteri Kesehatan Republik Indonesia Nomor 19 Tahun 2024 tentang Penyelenggaraan Pusat Kesehatan Masyarakat, serta Peraturan Daerah setempat.</p><h3>Persyaratan Pelayanan</h3><p>1. Membawa Kartu Identitas (KTP / KIA / Kartu Keluarga).<br/>2. Membawa Kartu BPJS Kesehatan / KIS (jika peserta JKN) atau kartu berobat Puskesmas.<br/>3. Mengambil nomor antrean pendaftaran online atau langsung di lobi.</p><h3>Prosedur Pelayanan</h3><p>1. Pasien datang mengambil nomor antrean atau menunjukkan tiket booking online.<br/>2. Verifikasi data rekam medis di loket pendaftaran.<br/>3. Menunggu pemanggilan di ruang tunggu Poli Umum.<br/>4. Pemeriksaan fisik, anamnesis, dan penegakan diagnosis oleh dokter.<br/>5. Pemberian resep obat atau rujukan ke fasilitas kesehatan tingkat lanjut (FKRTL) bila diperlukan.</p><h3>Waktu Pelayanan</h3><p>Senin s.d. Kamis: 08.00 - 13.00 WIB<br/>Jumat: 08.00 - 11.00 WIB<br/>Sabtu: 08.00 - 12.00 WIB</p>`,
    category: 'Standar Pelayanan',
    serviceId: 'srv-poli-umum',
    serviceName: 'Poli Umum & Pemeriksaan Kesehatan',
    publicationDate: new Date(Date.now() - 86400000 * 20).toISOString(),
    status: 'Published',
    infoStatus: 'Tersedia',
    updatePeriod: 'Bulanan',
    lastUpdatedDate: new Date(Date.now() - 86400000 * 2).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    createdBy: { id: 'usr-adminweb-02', name: 'Budi Santoso' }
  },
  {
    id: 'info-3',
    title: 'Informasi Berkala: Laporan Kunjungan & Layanan Kesehatan 2025',
    slug: 'laporan-kunjungan-2025',
    summary: 'Ringkasan statistik dan rekapitulasi data kunjungan pasien serta cakupan pelayanan kesehatan di wilayah kerja Puskesmas Sehat Mandiri tahun 2025.',
    content: `<p>Berdasarkan laporan rutin unit rekam medis dan sistem pelayanan digital Puskesmas Sehat Mandiri, berikut adalah ringkasan data statistik pelayanan kesehatan selama tahun 2025:</p><ul><li>Total Kunjungan Rawat Jalan: 48.250 pasien</li><li>Pelayanan Kesehatan Ibu & Anak (KIA): 12.400 kunjungan</li><li>Pemeriksaan Lansia & Posbindu: 8.120 kunjungan</li><li>Jumlah Rujukan Tepat Waktu: 94.8%</li></ul><p>Data ini diperbarui secara berkala setiap awal bulan guna menjamin transparansi informasi publik.</p>`,
    category: 'Informasi Berkala',
    publicationDate: new Date(Date.now() - 86400000 * 15).toISOString(),
    status: 'Published',
    infoStatus: 'Tersedia',
    updatePeriod: 'Tahunan',
    lastUpdatedDate: new Date(Date.now() - 86400000 * 10).toISOString(),
    nextReviewDate: new Date(Date.now() + 86400000 * 350).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 15).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    createdBy: { id: 'usr-superadmin-01', name: 'Administrator Utama' }
  },
  {
    id: 'info-4',
    title: 'Informasi Serta-Merta: Siaga Penanggulangan KLB DBD & Musim Hujan',
    slug: 'siaga-klb-dbd-musim-hujan',
    summary: 'Pemberitahuan darurat dan panduan pencegahan Demam Berdarah Dengue (DBD) seiring meningkatnya curah hujan di wilayah kecamatan.',
    content: `<p><strong>PENGUMUMAN PENTING & DARURAT KESEHATAN</strong></p><p>Mengingat curah hujan yang tinggi dan potensi penyebaran jentik nyamuk Aedes Aegypti, Puskesmas Sehat Mandiri menghimbau seluruh warga untuk melaksanakan Gerakan 3M Plus secara masif:</p><ol><li>Menguras tempat penampungan air secara berkala.</li><li>Menutup rapat wadah penampungan air.</li><li>Mengubur atau mendaur ulang barang bekas.</li><li>Melakukan larvasidasi (pemberian abate) dan memakai losion anti nyamuk.</li></ol><p>Segera kunjungi Poli Umum Puskesmas jika mengalami demam tinggi mendadak lebih dari 2 hari.</p>`,
    category: 'Informasi Serta-Merta',
    publicationDate: new Date(Date.now() - 86400000 * 3).toISOString(),
    status: 'Published',
    infoStatus: 'Tersedia',
    priority: 'urgent',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    createdBy: { id: 'usr-adminweb-02', name: 'Budi Santoso' }
  }
];

const INITIAL_INFO_REQUESTS: InformationRequestEntity[] = [
  {
    id: 'req-1',
    trackingNumber: 'INFO-2026-104829',
    requesterName: 'Rian Hidayat',
    contact: '081298765432',
    informationRequested: 'Mohon diberikan rincian data jumlah tenaga kesehatan aktif (Dokter, Bidan, Perawat) per klaster pelayanan di Puskesmas Sehat Mandiri.',
    purpose: 'Untuk bahan kajian tugas kuliah ilmu kesehatan masyarakat.',
    desiredFormat: 'Email (PDF)',
    status: 'Diproses',
    assignedTo: 'usr-adminweb-02',
    assignedToName: 'Budi Santoso',
    internalNotes: [
      {
        id: 'note-1',
        authorId: 'usr-adminweb-02',
        authorName: 'Budi Santoso',
        note: 'Data sedang direkap dari unit kepegawaian tata usaha.',
        createdAt: new Date(Date.now() - 86400000 * 1).toISOString()
      }
    ],
    publicResponses: [],
    submittedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    slaTargetResponse: new Date(Date.now() + 86400000 * 1).toISOString(),
    slaTargetCompletion: new Date(Date.now() + 86400000 * 3).toISOString(),
    history: [
      {
        status: 'Diterima',
        updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        updatedBy: { id: 'system', name: 'Sistem Pelayanan Digital' },
        notes: 'Permohonan informasi berhasil disubmit secara online.'
      },
      {
        status: 'Diverifikasi',
        updatedAt: new Date(Date.now() - 86400000 * 1.5).toISOString(),
        updatedBy: { id: 'usr-superadmin-01', name: 'Administrator Utama' },
        notes: 'Kelengkapan identitas dan substansi permohonan disetujui.'
      },
      {
        status: 'Diproses',
        updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
        updatedBy: { id: 'usr-adminweb-02', name: 'Budi Santoso' },
        notes: 'Permintaan diserahkan ke bagian tata usaha untuk penyusunan rekap.'
      }
    ]
  }
];

function getStoredPublicInfos(): PublicInfoEntity[] {
  try {
    const data = localStorage.getItem(PUBLIC_INFO_STORAGE_KEY);
    if (!data) {
      localStorage.setItem(PUBLIC_INFO_STORAGE_KEY, JSON.stringify(INITIAL_PUBLIC_INFOS));
      return INITIAL_PUBLIC_INFOS;
    }
    return JSON.parse(data);
  } catch {
    return INITIAL_PUBLIC_INFOS;
  }
}

function saveStoredPublicInfos(list: PublicInfoEntity[]) {
  try {
    localStorage.setItem(PUBLIC_INFO_STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('Failed to save public infos:', err);
  }
}

function getStoredInfoRequests(): InformationRequestEntity[] {
  try {
    const data = localStorage.getItem(INFO_REQUESTS_STORAGE_KEY);
    if (!data) {
      localStorage.setItem(INFO_REQUESTS_STORAGE_KEY, JSON.stringify(INITIAL_INFO_REQUESTS));
      return INITIAL_INFO_REQUESTS;
    }
    return JSON.parse(data);
  } catch {
    return INITIAL_INFO_REQUESTS;
  }
}

function saveStoredInfoRequests(list: InformationRequestEntity[]) {
  try {
    localStorage.setItem(INFO_REQUESTS_STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('Failed to save info requests:', err);
  }
}

export const publicInfoService = {
  // Public Infos CRUD
  async getPublicInfos(category?: string, status?: string, search?: string, serviceId?: string, unitId?: string): Promise<PublicInfoEntity[]> {
    let list = await getCollectionData<PublicInfoEntity>(FIRESTORE_PUBLIC_INFO, PUBLIC_INFO_STORAGE_KEY, INITIAL_PUBLIC_INFOS);
    if (category) {
      list = list.filter(i => i.category === category);
    }
    if (status) {
      list = list.filter(i => i.status === status);
    }
    if (serviceId) {
      list = list.filter(i => i.serviceId === serviceId);
    }
    if (unitId) {
      list = list.filter(i => i.unitId === unitId);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(i => i.title.toLowerCase().includes(q) || i.summary.toLowerCase().includes(q) || i.content.toLowerCase().includes(q));
    }
    return list.sort((a, b) => new Date(b.publicationDate).getTime() - new Date(a.publicationDate).getTime());
  },

  async getPublishedPublicInfos(category?: string, search?: string, serviceId?: string): Promise<PublicInfoEntity[]> {
    let list = await this.getPublicInfos(category, 'Published', search, serviceId);
    return list;
  },

  async getPublicInfoBySlug(slug: string): Promise<PublicInfoEntity | null> {
    const list = await this.getPublicInfos();
    return list.find(i => i.slug === slug && i.status === 'Published') || null;
  },

  async getPublicInfoById(id: string): Promise<PublicInfoEntity | null> {
    const list = await this.getPublicInfos();
    return list.find(i => i.id === id) || null;
  },

  async addPublicInfo(data: Partial<PublicInfoEntity>, actor: { id: string; name: string; email: string }): Promise<PublicInfoEntity> {
    const slug = data.slug || (data.title ? data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : `info-${Date.now()}`);
    
    const newItem: PublicInfoEntity = {
      id: `info-${Date.now()}`,
      title: data.title || 'Informasi Publik Baru',
      slug,
      summary: data.summary || '',
      content: data.content || '',
      category: data.category || 'Informasi Publik Lainnya',
      serviceId: data.serviceId,
      serviceName: data.serviceName,
      unitId: data.unitId,
      unitName: data.unitName,
      locationId: data.locationId,
      locationName: data.locationName,
      publicationDate: data.publicationDate || new Date().toISOString(),
      effectiveDate: data.effectiveDate,
      status: data.status || 'Draft',
      infoStatus: data.infoStatus || 'Tersedia',
      attachment: data.attachment,
      updatePeriod: data.updatePeriod,
      lastUpdatedDate: new Date().toISOString(),
      nextReviewDate: data.nextReviewDate,
      priority: data.priority || 'normal',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: { id: actor.id, name: actor.name }
    };

    await saveDocumentData(FIRESTORE_PUBLIC_INFO, newItem.id, newItem, PUBLIC_INFO_STORAGE_KEY);

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'CREATE',
      module: 'PUBLIC_INFO',
      targetId: newItem.id,
      targetName: newItem.title,
      description: `Membuat informasi publik baru: "${newItem.title}"`
    });

    return newItem;
  },

  async updatePublicInfo(id: string, data: Partial<PublicInfoEntity>, actor: { id: string; name: string; email: string }): Promise<PublicInfoEntity> {
    const list = await this.getPublicInfos();
    const idx = list.findIndex(i => i.id === id);
    if (idx === -1) throw new Error('Informasi publik tidak ditemukan.');

    const existing = list[idx];
    const updated: PublicInfoEntity = {
      ...existing,
      ...data,
      lastUpdatedDate: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      updatedBy: { id: actor.id, name: actor.name }
    };

    await saveDocumentData(FIRESTORE_PUBLIC_INFO, updated.id, updated, PUBLIC_INFO_STORAGE_KEY);

    const actionType = data.status === 'Published' && existing.status !== 'Published' ? 'PUBLISH' : data.status === 'Unpublished' && existing.status === 'Published' ? 'UNPUBLISH' : 'UPDATE';

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: actionType as any,
      module: 'PUBLIC_INFO',
      targetId: updated.id,
      targetName: updated.title,
      description: `Memperbarui informasi publik: "${updated.title}" (Status: ${updated.status})`
    });

    return updated;
  },

  async deletePublicInfo(id: string, actor: { id: string; name: string; email: string }): Promise<void> {
    const list = await this.getPublicInfos();
    const target = list.find(i => i.id === id);
    if (!target) return;

    await deleteDocumentData(FIRESTORE_PUBLIC_INFO, id, PUBLIC_INFO_STORAGE_KEY);

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'DELETE',
      module: 'PUBLIC_INFO',
      targetId: target.id,
      targetName: target.title,
      description: `Menghapus informasi publik: "${target.title}"`
    });
  },

  // Information Requests (Permintaan Informasi) CRUD
  async getInfoRequests(statusFilter?: string, search?: string): Promise<InformationRequestEntity[]> {
    let list = await getCollectionData<InformationRequestEntity>(FIRESTORE_INFO_REQUESTS, INFO_REQUESTS_STORAGE_KEY, INITIAL_INFO_REQUESTS);
    if (statusFilter) {
      list = list.filter(r => r.status === statusFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(r => 
        r.trackingNumber.toLowerCase().includes(q) || 
        r.informationRequested.toLowerCase().includes(q) ||
        (r.requesterName && r.requesterName.toLowerCase().includes(q)) ||
        r.contact.toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  },

  async getInfoRequestByTracking(trackingNumber: string): Promise<InformationRequestEntity | null> {
    const list = getStoredInfoRequests();
    return list.find(r => r.trackingNumber.toUpperCase().trim() === trackingNumber.toUpperCase().trim()) || null;
  },

  async addInfoRequest(data: { requesterName?: string; contact: string; informationRequested: string; purpose?: string; desiredFormat: any; attachment?: any }): Promise<InformationRequestEntity> {
    const trackingNumber = `INFO-2026-${String(Math.floor(Math.random() * 900000 + 100000))}`;
    const now = new Date().toISOString();

    const newReq: InformationRequestEntity = {
      id: `req-${Date.now()}`,
      trackingNumber,
      requesterName: data.requesterName || 'Pemohon Anonim',
      contact: data.contact,
      informationRequested: data.informationRequested,
      purpose: data.purpose,
      desiredFormat: data.desiredFormat || 'Email (PDF)',
      attachment: data.attachment,
      status: 'Diterima',
      internalNotes: [],
      publicResponses: [],
      submittedAt: now,
      updatedAt: now,
      slaTargetResponse: new Date(Date.now() + 86400000 * 1).toISOString(),
      slaTargetCompletion: new Date(Date.now() + 86400000 * 3).toISOString(),
      history: [
        {
          status: 'Diterima',
          updatedAt: now,
          updatedBy: { id: 'system', name: 'Sistem Pelayanan Digital' },
          notes: 'Permohonan informasi publik berhasil diajukan.'
        }
      ]
    };

    await saveDocumentData(FIRESTORE_INFO_REQUESTS, newReq.id, newReq, INFO_REQUESTS_STORAGE_KEY);

    try {
      await notificationService.triggerEvent(
        'complaint_received',
        'usr-superadmin-01',
        { ticketNumber: trackingNumber },
        'none'
      );
    } catch {}

    return newReq;
  },

  async updateInfoRequestStatus(
    id: string, 
    status: InformationRequestStatus, 
    notes: string, 
    actor: { id: string; name: string; email: string },
    rejectionReason?: string
  ): Promise<InformationRequestEntity> {
    const list = await this.getInfoRequests();
    const idx = list.findIndex(r => r.id === id);
    if (idx === -1) throw new Error('Permohonan informasi tidak ditemukan.');

    const req = list[idx];
    const now = new Date().toISOString();

    const historyEntry = {
      status,
      updatedAt: now,
      updatedBy: { id: actor.id, name: actor.name },
      notes
    };

    const updated: InformationRequestEntity = {
      ...req,
      status,
      rejectionReason: status === 'Ditolak' ? (rejectionReason || notes) : req.rejectionReason,
      updatedAt: now,
      resolvedAt: status === 'Selesai' || status === 'Ditolak' ? now : req.resolvedAt,
      resolvedBy: status === 'Selesai' || status === 'Ditolak' ? actor.name : req.resolvedBy,
      history: [...req.history, historyEntry]
    };

    await saveDocumentData(FIRESTORE_INFO_REQUESTS, updated.id, updated, INFO_REQUESTS_STORAGE_KEY);

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'UPDATE',
      module: 'INFORMATION_REQUESTS',
      targetId: updated.id,
      targetName: updated.trackingNumber,
      description: `Mengubah status permohonan ${updated.trackingNumber} menjadi ${status}. Catatan: "${notes}"`
    });

    return updated;
  },

  async addInternalNote(
    id: string, 
    noteText: string, 
    actor: { id: string; name: string; email: string }
  ): Promise<InformationRequestEntity> {
    const list = await this.getInfoRequests();
    const idx = list.findIndex(r => r.id === id);
    if (idx === -1) throw new Error('Permohonan informasi tidak ditemukan.');

    const req = list[idx];
    const newNote = {
      id: `note-${Date.now()}`,
      authorId: actor.id,
      authorName: actor.name,
      note: noteText,
      createdAt: new Date().toISOString()
    };

    const updated: InformationRequestEntity = {
      ...req,
      internalNotes: [...(req.internalNotes || []), newNote],
      updatedAt: new Date().toISOString()
    };

    await saveDocumentData(FIRESTORE_INFO_REQUESTS, updated.id, updated, INFO_REQUESTS_STORAGE_KEY);

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'UPDATE',
      module: 'INFORMATION_REQUESTS',
      targetId: updated.id,
      targetName: updated.trackingNumber,
      description: `Menambahkan catatan internal pada permohonan ${updated.trackingNumber}`
    });

    return updated;
  },

  async addPublicResponse(
    id: string, 
    responseText: string, 
    actor: { id: string; name: string; email: string }
  ): Promise<InformationRequestEntity> {
    const list = await this.getInfoRequests();
    const idx = list.findIndex(r => r.id === id);
    if (idx === -1) throw new Error('Permohonan informasi tidak ditemukan.');

    const req = list[idx];
    const newResp = {
      id: `resp-${Date.now()}`,
      authorName: actor.name,
      response: responseText,
      createdAt: new Date().toISOString()
    };

    const updated: InformationRequestEntity = {
      ...req,
      publicResponses: [...(req.publicResponses || []), newResp],
      updatedAt: new Date().toISOString()
    };

    await saveDocumentData(FIRESTORE_INFO_REQUESTS, updated.id, updated, INFO_REQUESTS_STORAGE_KEY);

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'UPDATE',
      module: 'INFORMATION_REQUESTS',
      targetId: updated.id,
      targetName: updated.trackingNumber,
      description: `Memberikan tanggapan publik pada permohonan ${updated.trackingNumber}`
    });

    return updated;
  },

  async assignRequest(
    id: string, 
    assignedToId: string, 
    assignedToName: string, 
    actor: { id: string; name: string; email: string }
  ): Promise<InformationRequestEntity> {
    const list = await this.getInfoRequests();
    const idx = list.findIndex(r => r.id === id);
    if (idx === -1) throw new Error('Permohonan informasi tidak ditemukan.');

    const req = list[idx];
    const updated: InformationRequestEntity = {
      ...req,
      assignedTo: assignedToId,
      assignedToName,
      updatedAt: new Date().toISOString()
    };

    await saveDocumentData(FIRESTORE_INFO_REQUESTS, updated.id, updated, INFO_REQUESTS_STORAGE_KEY);

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'UPDATE',
      module: 'INFORMATION_REQUESTS',
      targetId: updated.id,
      targetName: updated.trackingNumber,
      description: `Menugaskan permohonan ${updated.trackingNumber} kepada ${assignedToName}`
    });

    return updated;
  }
};
