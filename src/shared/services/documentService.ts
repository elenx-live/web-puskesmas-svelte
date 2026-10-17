import type { DocumentEntity } from '../types/index.js';
import { auditService } from './auditService';
import { getCollectionData, saveDocumentData, deleteDocumentData } from '../lib/firebase';

const DOCUMENTS_STORAGE_KEY = 'puskesmas_cms_documents';
const FIRESTORE_COLLECTION = 'documents';

const INITIAL_DOCUMENTS: DocumentEntity[] = [
  {
    id: 'doc-1',
    title: 'Standar Pelayanan Publik (SPP) Puskesmas Manding Tahun 2026',
    description: 'Dokumen penetapan 11 Komponen Standar Pelayanan Publik resmi sesuai Permenpan RB No. 15/2014 dan Permenkes No. 19/2024.',
    category: 'Standar Pelayanan',
    fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    fileName: 'SPP_Puskesmas_2026.pdf',
    fileSize: 1850000,
    mimeType: 'application/pdf',
    publishedAt: new Date(Date.now() - 86400000 * 15).toISOString(),
    status: 'published',
    downloadCount: 142,
    createdBy: { id: 'usr-superadmin-01', name: 'Administrator Utama' },
    createdAt: new Date(Date.now() - 86400000 * 15).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 15).toISOString(),
    version: '1.0',
    isCurrentVersion: true,
    originalDocId: 'doc-1',
    visibility: 'public',
    isForm: false
  },
  {
    id: 'doc-2',
    title: 'Laporan Hasil Indeks Kepuasan Masyarakat (IKM) Semester II 2025',
    description: 'Hasil pengukuran tingkat kepuasan pasien terhadap pelayanan kesehatan dengan nilai Mutu Sangat Baik (A - Nilai 88.75).',
    category: 'Laporan Kinerja',
    fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    fileName: 'Laporan_IKM_Semester_2_2025.pdf',
    fileSize: 2400000,
    mimeType: 'application/pdf',
    publishedAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    status: 'published',
    downloadCount: 89,
    createdBy: { id: 'usr-adminweb-02', name: 'Budi Santoso' },
    createdAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    version: '1.0',
    isCurrentVersion: true,
    originalDocId: 'doc-2',
    visibility: 'public',
    isForm: false
  },
  {
    id: 'doc-3',
    title: 'Panduan Alur Skrining Klaster Integrasi Layanan Primer (ILP)',
    description: 'Panduan teknis bagi pengunjung dalam mengikuti tahapan pelayanan terpadu 5 Klaster siklus hidup.',
    category: 'Panduan',
    fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    fileName: 'Panduan_Alur_ILP.pdf',
    fileSize: 1200000,
    mimeType: 'application/pdf',
    publishedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    status: 'published',
    downloadCount: 215,
    createdBy: { id: 'usr-editor-03', name: 'Siti Rahmawati' },
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    version: '1.0',
    isCurrentVersion: true,
    originalDocId: 'doc-3',
    visibility: 'public',
    isForm: false
  },
  {
    id: 'doc-4',
    title: 'Maklumat Pelayanan dan Piagam Komitmen Mutu Puskesmas',
    description: 'Pernyataan kesanggupan dan janji seluruh jajaran tenaga medis dalam menyelenggarakan pelayanan prima dan akuntabel.',
    category: 'Maklumat & Kebijakan',
    fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    fileName: 'Maklumat_Pelayanan_2026.pdf',
    fileSize: 980000,
    mimeType: 'application/pdf',
    publishedAt: new Date(Date.now() - 86400000 * 25).toISOString(),
    status: 'published',
    downloadCount: 167,
    createdBy: { id: 'usr-superadmin-01', name: 'Administrator Utama' },
    createdAt: new Date(Date.now() - 86400000 * 25).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 25).toISOString(),
    version: '1.0',
    isCurrentVersion: true,
    originalDocId: 'doc-4',
    visibility: 'public',
    isForm: false
  },
  {
    id: 'doc-5',
    title: 'Peraturan Daerah & Keputusan Tarif Retribusi Pelayanan Kesehatan',
    description: 'Daftar resmi tarif tindakan medis, laboratorium, persalinan, dan pelayanan non-BPJS sesuai regulasi daerah yang berlaku.',
    category: 'Regulasi & SK',
    fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    fileName: 'Tarif_Retribusi_Layanan_Puskesmas.pdf',
    fileSize: 1450000,
    mimeType: 'application/pdf',
    publishedAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    status: 'published',
    downloadCount: 310,
    createdBy: { id: 'usr-superadmin-01', name: 'Administrator Utama' },
    createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    version: '1.0',
    isCurrentVersion: true,
    originalDocId: 'doc-5',
    visibility: 'public',
    isForm: false
  },
  {
    id: 'doc-6',
    title: 'Formulir Permohonan Informasi Publik PPID Puskesmas',
    description: 'Formulir resmi bagi masyarakat untuk pengajuan permintaan dokumen publik sesuai UU Keterbukaan Informasi Publik No. 14/2008.',
    category: 'Formulir',
    fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    fileName: 'Formulir_Permohonan_PPID.pdf',
    fileSize: 750000,
    mimeType: 'application/pdf',
    publishedAt: new Date(Date.now() - 86400000 * 12).toISOString(),
    status: 'published',
    downloadCount: 94,
    createdBy: { id: 'usr-adminweb-02', name: 'Budi Santoso' },
    createdAt: new Date(Date.now() - 86400000 * 12).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 12).toISOString(),
    version: '1.0',
    isCurrentVersion: true,
    originalDocId: 'doc-6',
    visibility: 'public',
    isForm: true
  }
];

async function fetchDocuments(): Promise<DocumentEntity[]> {
  const docs = await getCollectionData<DocumentEntity>(
    FIRESTORE_COLLECTION,
    DOCUMENTS_STORAGE_KEY,
    INITIAL_DOCUMENTS
  );
  return docs.map(d => ({
    ...d,
    version: d.version || '1.0',
    isCurrentVersion: d.isCurrentVersion !== undefined ? d.isCurrentVersion : true,
    originalDocId: d.originalDocId || d.id,
    visibility: d.visibility || 'public',
    isForm: d.isForm !== undefined ? d.isForm : (d.category === 'Formulir')
  }));
}

export const documentService = {
  async getDocuments(category?: string, search?: string, statusFilter?: string, serviceId?: string, unitId?: string): Promise<DocumentEntity[]> {
    let list = await fetchDocuments();

    if (statusFilter) {
      list = list.filter(d => d.status === statusFilter);
    }

    if (category) {
      list = list.filter(d => d.category === category);
    }

    if (serviceId) {
      list = list.filter(d => d.serviceId === serviceId);
    }

    if (unitId) {
      list = list.filter(d => d.unitId === unitId);
    }

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(d => 
        d.title.toLowerCase().includes(q) || 
        d.fileName.toLowerCase().includes(q) ||
        (d.documentNumber && d.documentNumber.toLowerCase().includes(q))
      );
    }

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async getPublishedDocuments(category?: string, search?: string, serviceId?: string): Promise<DocumentEntity[]> {
    let list = await this.getDocuments(category, search, 'published', serviceId);
    // Public only sees: visibility === 'public' AND isCurrentVersion === true
    list = list.filter(d => d.visibility === 'public' && d.isCurrentVersion);
    return list;
  },

  async getDocumentHistory(originalDocId: string): Promise<DocumentEntity[]> {
    const list = await fetchDocuments();
    return list
      .filter(d => d.originalDocId === originalDocId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async incrementDownloadCount(id: string): Promise<void> {
    const docs = await fetchDocuments();
    const doc = docs.find(d => d.id === id);
    if (doc) {
      doc.downloadCount = (doc.downloadCount || 0) + 1;
      await saveDocumentData(FIRESTORE_COLLECTION, doc.id, doc, DOCUMENTS_STORAGE_KEY);
    }
  },

  async addDocument(data: Partial<DocumentEntity>, actor: { id: string; email: string; name: string }): Promise<DocumentEntity> {
    const docs = await fetchDocuments();

    // MIME and File validation safeguard
    const allowedMime = [
      'application/pdf', 
      'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
      'application/vnd.ms-excel', 
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
      'image/jpeg', 
      'image/png'
    ];
    const mime = data.mimeType || 'application/pdf';
    if (!allowedMime.includes(mime)) {
      throw new Error('Format berkas tidak didukung! Format yang diizinkan: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG');
    }

    const docId = `doc-${Date.now()}`;
    const originalDocId = data.originalDocId || docId;

    const isCurrent = data.isCurrentVersion !== false; // default to true

    if (isCurrent) {
      for (const d of docs) {
        if (d.originalDocId === originalDocId && d.isCurrentVersion) {
          d.isCurrentVersion = false;
          await saveDocumentData(FIRESTORE_COLLECTION, d.id, d, DOCUMENTS_STORAGE_KEY);
        }
      }
    }

    const newDoc: DocumentEntity = {
      id: docId,
      title: data.title || 'Dokumen Tanpa Judul',
      description: data.description || '',
      category: data.category || 'Umum',
      fileUrl: data.fileUrl || 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      fileName: data.fileName || 'berkas_dokumen.pdf',
      fileSize: data.fileSize || 1000000,
      mimeType: mime,
      publishedAt: data.status === 'published' ? new Date().toISOString() : undefined,
      status: data.status || 'published',
      downloadCount: 0,
      createdBy: { id: actor.id, name: actor.name },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      
      serviceId: data.serviceId,
      serviceName: data.serviceName,
      unitId: data.unitId,
      unitName: data.unitName,
      documentNumber: data.documentNumber,
      version: data.version || '1.0',
      isCurrentVersion: isCurrent,
      originalDocId: originalDocId,
      validFrom: data.validFrom,
      visibility: data.visibility || 'public',
      isForm: data.isForm || (data.category === 'Formulir')
    };

    await saveDocumentData(FIRESTORE_COLLECTION, newDoc.id, newDoc, DOCUMENTS_STORAGE_KEY);

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'CREATE',
      module: 'PAGES',
      targetId: newDoc.id,
      targetName: newDoc.title,
      description: `Mengunggah dokumen pelayanan baru (Versi ${newDoc.version}): "${newDoc.title}"`
    });

    return newDoc;
  },

  async updateDocument(id: string, data: Partial<DocumentEntity>, actor: { id: string; email: string; name: string }): Promise<DocumentEntity> {
    const docs = await fetchDocuments();
    const index = docs.findIndex(d => d.id === id);
    if (index === -1) {
      throw new Error('Dokumen tidak ditemukan.');
    }

    const existing = docs[index];

    // If making current version
    if (data.isCurrentVersion === true && !existing.isCurrentVersion) {
      for (const d of docs) {
        if (d.originalDocId === existing.originalDocId && d.isCurrentVersion && d.id !== id) {
          d.isCurrentVersion = false;
          await saveDocumentData(FIRESTORE_COLLECTION, d.id, d, DOCUMENTS_STORAGE_KEY);
        }
      }
    }

    const updatedDoc: DocumentEntity = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString()
    };

    // Update publishedAt if state becomes published and wasn't before
    if (data.status === 'published' && existing.status !== 'published') {
      updatedDoc.publishedAt = new Date().toISOString();
    }

    await saveDocumentData(FIRESTORE_COLLECTION, updatedDoc.id, updatedDoc, DOCUMENTS_STORAGE_KEY);

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'UPDATE',
      module: 'PAGES',
      targetId: updatedDoc.id,
      targetName: updatedDoc.title,
      description: `Memperbarui info dokumen (Versi ${updatedDoc.version}): "${updatedDoc.title}"`
    });

    return updatedDoc;
  },

  async deleteDocument(id: string, actor: { id: string; email: string; name: string }): Promise<void> {
    const docs = await fetchDocuments();
    const target = docs.find(d => d.id === id);
    if (!target) return;

    await deleteDocumentData(FIRESTORE_COLLECTION, id, DOCUMENTS_STORAGE_KEY);

    // If we deleted the current active version, mark the latest remaining version as active
    if (target.isCurrentVersion) {
      const remaining = docs.filter(d => d.id !== id && d.originalDocId === target.originalDocId);
      if (remaining.length > 0) {
        remaining.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        remaining[0].isCurrentVersion = true;
        await saveDocumentData(FIRESTORE_COLLECTION, remaining[0].id, remaining[0], DOCUMENTS_STORAGE_KEY);
      }
    }

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'DELETE',
      module: 'PAGES',
      targetId: target.id,
      targetName: target.title,
      description: `Menghapus dokumen: "${target.title}" (Versi ${target.version})`
    });
  }
};

