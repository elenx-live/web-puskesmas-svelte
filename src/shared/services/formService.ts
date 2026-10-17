import type { FormEntity, FormSubmissionEntity, FormField } from '../types/index.js';
import { auditService } from './auditService';
import { notificationService } from './notificationService';

const FORMS_STORAGE_KEY = 'puskesmas_digital_forms';
const SUBMISSIONS_STORAGE_KEY = 'puskesmas_form_submissions';

const INITIAL_FORMS: FormEntity[] = [
  {
    id: 'form-1',
    title: 'Formulir Pendaftaran Pasien Baru',
    description: 'Formulir untuk mendaftarkan rekam medis baru bagi warga yang belum pernah berobat ke Puskesmas.',
    version: '1.0',
    status: 'published',
    categoryName: 'Formulir',
    categoryId: 'cat-doc-formulir',
    fields: [
      { id: 'f1-nama', type: 'text', label: 'Nama Lengkap Pasien', placeholder: 'Sesuai KTP...', required: true, displayOrder: 1 },
      { id: 'f1-nik', type: 'number', label: 'Nomor Induk Kependudukan (NIK)', placeholder: '16 digit NIK...', required: true, displayOrder: 2 },
      { id: 'f1-tgllahir', type: 'date', label: 'Tanggal Lahir', required: true, displayOrder: 3 },
      { id: 'f1-jk', type: 'select', label: 'Jenis Kelamin', required: true, options: ['Laki-laki', 'Perempuan'], displayOrder: 4 },
      { id: 'f1-alamat', type: 'textarea', label: 'Alamat Rumah Lengkap', placeholder: 'RT/RW, Kelurahan, Kecamatan...', required: true, displayOrder: 5 },
      { id: 'f1-ktp', type: 'file', label: 'Unggah Foto/Scan KTP', helpText: 'Format yang didukung: JPG, PNG, PDF. Maks 2MB.', required: true, displayOrder: 6 }
    ],
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    createdBy: { id: 'usr-superadmin-01', name: 'Administrator Utama' }
  },
  {
    id: 'form-2',
    title: 'Formulir Permohonan Informasi Publik',
    description: 'Formulir permohonan informasi umum sesuai UU No. 14 Tahun 2008 tentang Keterbukaan Informasi Publik.',
    version: '1.1',
    status: 'published',
    categoryName: 'Informasi Publik',
    categoryId: 'cat-doc-informasi',
    fields: [
      { id: 'f2-nama', type: 'text', label: 'Nama Pemohon Informasi', placeholder: 'Nama lengkap...', required: true, displayOrder: 1 },
      { id: 'f2-kontak', type: 'text', label: 'Nomor WhatsApp / HP', placeholder: '0812...', required: true, displayOrder: 2 },
      { id: 'f2-rincian', type: 'textarea', label: 'Rincian Informasi yang Dibutuhkan', placeholder: 'Jelaskan data atau informasi apa saja yang Anda perlukan secara spesifik...', required: true, displayOrder: 3 },
      { id: 'f2-tujuan', type: 'textarea', label: 'Tujuan Penggunaan Informasi', placeholder: 'Untuk skripsi, riset, atau lainnya...', required: true, displayOrder: 4 },
      { id: 'f2-salinan', type: 'select', label: 'Cara Memperoleh Salinan Informasi', required: true, options: ['Email (PDF)', 'WhatsApp (Dokumen)', 'Ambil Langsung ke Puskesmas'], displayOrder: 5 }
    ],
    createdAt: new Date(Date.now() - 86400000 * 8).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 8).toISOString(),
    createdBy: { id: 'usr-superadmin-01', name: 'Administrator Utama' }
  }
];

const INITIAL_SUBMISSIONS: FormSubmissionEntity[] = [
  {
    id: 'sub-1',
    trackingNumber: 'FORM-2026-193852',
    formId: 'form-1',
    formTitle: 'Formulir Pendaftaran Pasien Baru',
    formVersion: '1.0',
    submittedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    status: 'received',
    response: {
      'f1-nama': 'Ahmad Fauzi',
      'f1-nik': '3171021405920003',
      'f1-tgllahir': '1992-05-14',
      'f1-jk': 'Laki-laki',
      'f1-alamat': 'Jl. Kemuning Raya No. 42, RT 05/RW 03, Kel. Merdeka, Kec. Makmur',
      'f1-ktp': 'dummy_ktp_ahmad.pdf'
    },
    attachments: [
      {
        fieldId: 'f1-ktp',
        fileName: 'dummy_ktp_ahmad.pdf',
        fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        fileSize: 450000,
        mimeType: 'application/pdf'
      }
    ],
    history: [
      {
        status: 'received',
        updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
        updatedBy: { id: 'system', name: 'Sistem Pelayanan Digital' },
        notes: 'Formulir pendaftaran berhasil diterima secara online.'
      }
    ]
  },
  {
    id: 'sub-2',
    trackingNumber: 'FORM-2026-884029',
    formId: 'form-2',
    formTitle: 'Formulir Permohonan Informasi Publik',
    formVersion: '1.1',
    submittedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    status: 'completed',
    response: {
      'f2-nama': 'Ratih Kumalasari',
      'f2-kontak': '081234567890',
      'f2-rincian': 'Data jumlah kunjungan pasien DBD selama tahun 2025.',
      'f2-tujuan': 'Untuk bahan penelitian skripsi mahasiswa Universitas Indonesia.',
      'f2-salinan': 'Email (PDF)'
    },
    processedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    processedBy: { id: 'usr-adminweb-02', name: 'Budi Santoso' },
    notes: 'Laporan DBD 2025 telah dikirimkan ke email ratih.k@example.com pada tanggal 10 Februari 2026.',
    history: [
      {
        status: 'received',
        updatedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
        updatedBy: { id: 'system', name: 'Sistem Pelayanan Digital' },
        notes: 'Permohonan informasi publik diterima.'
      },
      {
        status: 'processing',
        updatedAt: new Date(Date.now() - 86400000 * 4.5).toISOString(),
        updatedBy: { id: 'usr-adminweb-02', name: 'Budi Santoso' },
        notes: 'Sedang merekap data kunjungan DBD dari Klaster 4.'
      },
      {
        status: 'completed',
        updatedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
        updatedBy: { id: 'usr-adminweb-02', name: 'Budi Santoso' },
        notes: 'Laporan DBD 2025 telah dikirimkan ke email ratih.k@example.com.'
      }
    ]
  }
];

function getStoredForms(): FormEntity[] {
  try {
    const data = localStorage.getItem(FORMS_STORAGE_KEY);
    if (!data) {
      localStorage.setItem(FORMS_STORAGE_KEY, JSON.stringify(INITIAL_FORMS));
      return INITIAL_FORMS;
    }
    return JSON.parse(data);
  } catch {
    return INITIAL_FORMS;
  }
}

function saveStoredForms(forms: FormEntity[]) {
  try {
    localStorage.setItem(FORMS_STORAGE_KEY, JSON.stringify(forms));
  } catch (err) {
    console.error('Failed to save forms:', err);
  }
}

function getStoredSubmissions(): FormSubmissionEntity[] {
  try {
    const data = localStorage.getItem(SUBMISSIONS_STORAGE_KEY);
    if (!data) {
      localStorage.setItem(SUBMISSIONS_STORAGE_KEY, JSON.stringify(INITIAL_SUBMISSIONS));
      return INITIAL_SUBMISSIONS;
    }
    return JSON.parse(data);
  } catch {
    return INITIAL_SUBMISSIONS;
  }
}

function saveStoredSubmissions(submissions: FormSubmissionEntity[]) {
  try {
    localStorage.setItem(SUBMISSIONS_STORAGE_KEY, JSON.stringify(submissions));
  } catch (err) {
    console.error('Failed to save submissions:', err);
  }
}

export const formService = {
  // Forms CRUD
  async getForms(statusFilter?: string, search?: string, serviceId?: string): Promise<FormEntity[]> {
    let list = getStoredForms();
    if (statusFilter) {
      list = list.filter(f => f.status === statusFilter);
    }
    if (serviceId) {
      list = list.filter(f => f.serviceId === serviceId);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(f => f.title.toLowerCase().includes(q) || (f.description && f.description.toLowerCase().includes(q)));
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async getPublishedForms(serviceId?: string): Promise<FormEntity[]> {
    return this.getForms('published', undefined, serviceId);
  },

  async getFormById(id: string): Promise<FormEntity | null> {
    const list = getStoredForms();
    return list.find(f => f.id === id) || null;
  },

  async addForm(data: Partial<FormEntity>, actor: { id: string; name: string; email: string }): Promise<FormEntity> {
    const list = getStoredForms();
    const newForm: FormEntity = {
      id: `form-${Date.now()}`,
      title: data.title || 'Formulir Digital Baru',
      description: data.description || '',
      version: data.version || '1.0',
      status: data.status || 'draft',
      serviceId: data.serviceId,
      serviceName: data.serviceName,
      categoryId: data.categoryId,
      categoryName: data.categoryName,
      unitId: data.unitId,
      unitName: data.unitName,
      locationId: data.locationId,
      locationName: data.locationName,
      fields: data.fields || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: { id: actor.id, name: actor.name }
    };

    saveStoredForms([newForm, ...list]);

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'CREATE',
      module: 'PAGES',
      targetId: newForm.id,
      targetName: newForm.title,
      description: `Membuat template formulir digital baru: "${newForm.title}"`
    });

    return newForm;
  },

  async updateForm(id: string, data: Partial<FormEntity>, actor: { id: string; name: string; email: string }): Promise<FormEntity> {
    const list = getStoredForms();
    const idx = list.findIndex(f => f.id === id);
    if (idx === -1) throw new Error('Formulir tidak ditemukan');

    const updated: FormEntity = {
      ...list[idx],
      ...data,
      updatedAt: new Date().toISOString()
    };

    list[idx] = updated;
    saveStoredForms(list);

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'UPDATE',
      module: 'PAGES',
      targetId: updated.id,
      targetName: updated.title,
      description: `Memperbarui konfigurasi formulir digital: "${updated.title}"`
    });

    return updated;
  },

  async deleteForm(id: string, actor: { id: string; name: string; email: string }): Promise<void> {
    const list = getStoredForms();
    const target = list.find(f => f.id === id);
    if (!target) return;

    saveStoredForms(list.filter(f => f.id !== id));

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'DELETE',
      module: 'PAGES',
      targetId: target.id,
      targetName: target.title,
      description: `Menghapus template formulir digital: "${target.title}"`
    });
  },

  // Submissions operations
  async getSubmissions(formId?: string, statusFilter?: string, search?: string): Promise<FormSubmissionEntity[]> {
    let list = getStoredSubmissions();
    if (formId) {
      list = list.filter(s => s.formId === formId);
    }
    if (statusFilter) {
      list = list.filter(s => s.status === statusFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(s => 
        s.trackingNumber.toLowerCase().includes(q) || 
        s.formTitle.toLowerCase().includes(q) ||
        Object.values(s.response).some(val => String(val).toLowerCase().includes(q))
      );
    }
    return list.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  },

  async getSubmissionByTracking(trackingNumber: string): Promise<FormSubmissionEntity | null> {
    const list = getStoredSubmissions();
    return list.find(s => s.trackingNumber.toUpperCase().trim() === trackingNumber.toUpperCase().trim()) || null;
  },

  async getSubmissionById(id: string): Promise<FormSubmissionEntity | null> {
    const list = getStoredSubmissions();
    return list.find(s => s.id === id) || null;
  },

  async addSubmission(formId: string, response: Record<string, any>, files?: { fieldId: string; file: File; url?: string }[]): Promise<FormSubmissionEntity> {
    const form = await this.getFormById(formId);
    if (!form) throw new Error('Formulir tidak ditemukan.');
    if (form.status !== 'published') throw new Error('Formulir saat ini sedang tidak menerima tanggapan.');

    const subId = `sub-${Date.now()}`;
    const trackingNumber = `FORM-2026-${String(Math.floor(Math.random() * 900000 + 100000))}`;

    const attachments: FormSubmissionEntity['attachments'] = [];
    if (files && files.length > 0) {
      for (const item of files) {
        attachments.push({
          fieldId: item.fieldId,
          fileName: item.file.name,
          fileUrl: item.url || 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
          fileSize: item.file.size,
          mimeType: item.file.type || 'application/octet-stream'
        });
      }
    }

    const newSub: FormSubmissionEntity = {
      id: subId,
      trackingNumber,
      formId: form.id,
      formTitle: form.title,
      formVersion: form.version,
      submittedAt: new Date().toISOString(),
      status: 'received',
      response,
      attachments,
      history: [
        {
          status: 'received',
          updatedAt: new Date().toISOString(),
          updatedBy: { id: 'system', name: 'Sistem Pelayanan Digital' },
          notes: 'Isi formulir online berhasil dikirimkan oleh pasien.'
        }
      ]
    };

    const list = getStoredSubmissions();
    saveStoredSubmissions([newSub, ...list]);

    // Send in-app notification to patient if applicable (e.g. system notification block)
    // Send in-app alert notification to system administrators
    try {
      await notificationService.triggerEvent(
        'complaint_received', // reuse existing received event if convenient, or custom
        'usr-superadmin-01',
        { ticketNumber: trackingNumber },
        'none'
      );
    } catch (e) {
      console.warn('Failed to dispatch notification:', e);
    }

    return newSub;
  },

  async updateSubmissionStatus(
    id: string, 
    status: FormSubmissionEntity['status'], 
    notes: string, 
    actor: { id: string; name: string; email: string }
  ): Promise<FormSubmissionEntity> {
    const list = getStoredSubmissions();
    const idx = list.findIndex(s => s.id === id);
    if (idx === -1) throw new Error('Tanggapan tidak ditemukan.');

    const sub = list[idx];
    const now = new Date().toISOString();

    const historyEntry = {
      status,
      updatedAt: now,
      updatedBy: { id: actor.id, name: actor.name },
      notes
    };

    const updated: FormSubmissionEntity = {
      ...sub,
      status,
      notes,
      processedAt: now,
      processedBy: { id: actor.id, name: actor.name },
      history: [...sub.history, historyEntry]
    };

    list[idx] = updated;
    saveStoredSubmissions(list);

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'UPDATE',
      module: 'PAGES',
      targetId: updated.id,
      targetName: updated.trackingNumber,
      description: `Mengubah status tanggapan ${updated.trackingNumber} menjadi: ${status.toUpperCase()}. Catatan: "${notes}"`
    });

    return updated;
  }
};
