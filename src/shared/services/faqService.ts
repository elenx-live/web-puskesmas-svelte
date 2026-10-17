import type { FaqEntity, GuideEntity, FaqCategory, GuideCategory } from '../types/index.js';
import { auditService } from './auditService';
import { getCollectionData, saveDocumentData, deleteDocumentData } from '../lib/firebase';

const FAQ_STORAGE_KEY = 'puskesmas_faqs_v1';
const GUIDES_STORAGE_KEY = 'puskesmas_guides_v1';
const FAQ_CATEGORIES_KEY = 'puskesmas_faq_categories_v1';
const GUIDE_CATEGORIES_KEY = 'puskesmas_guide_categories_v1';
const VOTE_TRACKER_KEY = 'puskesmas_faq_votes_v1';
const FIRESTORE_FAQS = 'faqs';
const FIRESTORE_GUIDES = 'guides';

const DEFAULT_FAQ_CATEGORIES: FaqCategory[] = [
  { id: 'cat-1', name: 'Pendaftaran', description: 'Informasi pendaftaran online & offline pasien baru/lama', order: 1, icon: 'UserCheck' },
  { id: 'cat-2', name: 'Jadwal', description: 'Waktu pelayanan poliklinik dan jam operasional puskesmas', order: 2, icon: 'Clock' },
  { id: 'cat-3', name: 'Layanan', description: 'Jenis layanan kesehatan umum, gigi, KIA, lansia, dll', order: 3, icon: 'Activity' },
  { id: 'cat-4', name: 'Persyaratan', description: 'Syarat dokumen, kartu BPJS, KTP, KK, rujukan faskes tingkat 1', order: 4, icon: 'FileText' },
  { id: 'cat-5', name: 'Tarif', description: 'Informasi tarif gratis (BPJS) dan retribusi layanan umum', order: 5, icon: 'CreditCard' },
  { id: 'cat-6', name: 'Pengaduan', description: 'Cara menyampaikan kritik, saran, dan pengaduan layanan', order: 6, icon: 'MessageSquare' },
  { id: 'cat-7', name: 'Dokumen', description: 'Surat keterangan sehat, rujukan, surat sakit, dll', order: 7, icon: 'FileCheck' },
  { id: 'cat-8', name: 'Fasilitas', description: 'Fasilitas penunjang, parkir, apotek, IGD 24 jam', order: 8, icon: 'Building2' },
  { id: 'cat-9', name: 'Kontak', description: 'Nomor telepon darurat, WhatsApp, dan alamat', order: 9, icon: 'Phone' },
  { id: 'cat-10', name: 'Lainnya', description: 'Informasi umum lainnya', order: 10, icon: 'HelpCircle' },
];

const DEFAULT_GUIDE_CATEGORIES: GuideCategory[] = [
  { id: 'gcat-1', name: 'Sebelum Berkunjung', description: 'Persiapan dokumen & persyaratan sebelum datang ke puskesmas', order: 1 },
  { id: 'gcat-2', name: 'Saat Berkunjung', description: 'Alur pendaftaran, antrean, dan pemeriksaan di poli', order: 2 },
  { id: 'gcat-3', name: 'Setelah Pelayanan', description: 'Pengambilan resep obat & rujukan lanjutan', order: 3 },
  { id: 'gcat-4', name: 'Pendaftaran', description: 'Panduan pendaftaran online via web/WhatsApp', order: 4 },
  { id: 'gcat-5', name: 'Pengaduan', description: 'Tata cara pengajuan dan pelacakan pengaduan', order: 5 },
  { id: 'gcat-6', name: 'Informasi Publik', description: 'Akses data transparansi & informasi publik', order: 6 },
  { id: 'gcat-7', name: 'Layanan Digital', description: 'Panduan penggunaan antrean online & cek jadwal', order: 7 },
];

const DEFAULT_FAQS: FaqEntity[] = [
  {
    id: 'faq-1',
    question: 'Bagaimana cara mendaftar berobat di Poli Umum?',
    answer: 'Pasien dapat mendaftar secara online melalui menu Pendaftaran di website ini atau melalui WhatsApp resmi Puskesmas. Pasien BPJS wajib membawa Kartu BPJS (KIS) aktif, KTP asli, dan rujukan dari Faskes 1 (jika dari FKTP lain).',
    category: 'Pendaftaran',
    serviceId: 'srv-poli-umum',
    tags: ['pendaftaran', 'poli umum', 'bpjs', 'syarat'],
    status: 'Published',
    order: 1,
    featured: true,
    helpfulCount: 142,
    notHelpfulCount: 5,
    needsReview: false,
    slug: 'cara-mendaftar-poli-umum',
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: 'faq-2',
    question: 'Berapa jam operasional layanan pendaftaran loket?',
    answer: 'Jam pelayanan pendaftaran loket dibuka setiap Hari Senin s.d. Kamis pukul 08.00 - 12.00 WIB, Jumat pukul 08.00 - 11.00 WIB, dan Sabtu pukul 08.00 - 11.30 WIB. Untuk IGD dan persalinan melayani 24 Jam.',
    category: 'Jadwal',
    tags: ['jam operasional', 'loket', 'pendaftaran', 'jadwal'],
    status: 'Published',
    order: 2,
    featured: true,
    helpfulCount: 98,
    notHelpfulCount: 2,
    needsReview: false,
    slug: 'jam-operasional-pendaftaran',
    createdAt: new Date(Date.now() - 28 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 'faq-3',
    question: 'Apa saja persyaratan untuk membuat Surat Keterangan Sehat?',
    answer: 'Syarat pembuatan Surat Keterangan Sehat meliputi: membawa KTP asli dan fotokopi 1 lembar, pas foto 3x4 (1 lembar), melakukan pemeriksaan fisik & tensi di Poli Umum, serta membayar retribusi sesuai Perda (bagi pasien umum non-BPJS).',
    category: 'Persyaratan',
    serviceId: 'srv-surat-sehat',
    documentId: 'doc-surat-sehat',
    tags: ['surat sehat', 'syarat', 'keterangan sehat'],
    status: 'Published',
    order: 3,
    featured: false,
    helpfulCount: 76,
    notHelpfulCount: 12,
    needsReview: false,
    slug: 'syarat-surat-keterangan-sehat',
    createdAt: new Date(Date.now() - 25 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
  {
    id: 'faq-4',
    question: 'Bagaimana cara mengajukan pengaduan atau kritik dan saran?',
    answer: 'Anda dapat menyampaikan pengaduan melalui menu Pengaduan di website ini, mengirim email ke layanan@puskesmassehat.id, atau menghubungi nomor WhatsApp layanan pengaduan resmi Puskesmas.',
    category: 'Pengaduan',
    tags: ['pengaduan', 'kritik', 'saran', 'aduan'],
    status: 'Published',
    order: 4,
    featured: false,
    helpfulCount: 54,
    notHelpfulCount: 1,
    needsReview: false,
    slug: 'cara-mengajukan-pengaduan',
    createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: 'faq-5',
    question: 'Apakah layanan Puskesmas gratis bagi pemegang BPJS Kesehatan?',
    answer: 'Ya, seluruh pelayanan kesehatan yang sesuai dengan indikasi medis dan prosedur rujukan di Puskesmas adalah gratis / tidak dipungut biaya bagi peserta BPJS Kesehatan yang status kepesertaannya aktif.',
    category: 'Tarif',
    tags: ['tarif', 'gratis', 'bpjs', 'biaya'],
    status: 'Published',
    order: 5,
    featured: true,
    helpfulCount: 210,
    notHelpfulCount: 4,
    needsReview: false,
    slug: 'apakah-layanan-gratis-bpjs',
    createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
];

const DEFAULT_GUIDES: GuideEntity[] = [
  {
    id: 'guide-1',
    title: 'Panduan Lengkap Pendaftaran Berobat Online',
    summary: 'Langkah-langkah mudah melakukan pendaftaran nomor antrean poli dari rumah sebelum berkunjung ke Puskesmas.',
    content: 'Pendaftaran online membantu pasien mendapatkan kepastian estimasi waktu pelayanan dan mengurangi antrean panjang di loket pendaftaran fisik.',
    category: 'Pendaftaran',
    relatedServiceId: 'srv-poli-umum',
    status: 'Published',
    slug: 'panduan-pendaftaran-berobat-online',
    steps: [
      { id: 's-1', stepNumber: 1, title: 'Buka Halaman Pendaftaran', description: 'Akses menu Pendaftaran pada website resmi Puskesmas.' },
      { id: 's-2', stepNumber: 2, title: 'Masukkan Nomor Rekam Medis atau NIK', description: 'Masukkan data identitas pasien untuk verifikasi data kunjungan.' },
      { id: 's-3', stepNumber: 3, title: 'Pilih Poliklinik & Tanggal Kunjungan', description: 'Pilih poli tujuan (Poli Umum, Gigi, KIA, dll) serta tanggal berobat yang diinginkan.' },
      { id: 's-4', stepNumber: 4, title: 'Konfirmasi & Dapatkan Nomor Antrean', description: 'Simpan bukti pendaftaran digital atau nomor antrean yang muncul di layar.' },
    ],
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: 'guide-2',
    title: 'Alur Pelayanan Pasien Saat Berkunjung ke Puskesmas',
    summary: 'Tahapan pelayanan dari saat tiba di loket pendaftaran, pemeriksaan dokter, hingga pengambilan obat di apotek.',
    content: 'Ikuti alur pelayanan berikut untuk memastikan proses pemeriksaan berjalan lancar dan tertib.',
    category: 'Saat Berkunjung',
    status: 'Published',
    slug: 'alur-pelayanan-pasien-di-puskesmas',
    steps: [
      { id: 'gs-1', stepNumber: 1, title: 'Registrasi & Cek Berkas', description: 'Datang ke loket pendaftaran atau scan barcode check-in mandiri dengan menunjukkan KTP/BPJS.' },
      { id: 'gs-2', stepNumber: 2, title: 'Pemeriksaan Tensi & Timbang Berat Badan', description: 'Petugas melakukan pemeriksaan awal tanda vital di ruang triase/pemeriksaan awal.' },
      { id: 'gs-3', stepNumber: 3, title: 'Pemeriksaan oleh Dokter Poli', description: 'Menunggu panggilan nomor antrean masuk ke ruang pemeriksaan poli tujuan.' },
      { id: 'gs-4', stepNumber: 4, title: 'Pengambilan Resep di Apotek', description: 'Menyerahkan resep dokter ke apotek Puskesmas dan menunggu penyerahan obat.' },
    ],
    createdAt: new Date(Date.now() - 25 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
  },
];

export const faqService = {
  // FAQs
  async getFaqs(): Promise<FaqEntity[]> {
    return getCollectionData<FaqEntity>(FIRESTORE_FAQS, FAQ_STORAGE_KEY, DEFAULT_FAQS);
  },

  async saveFaq(faq: FaqEntity, user?: { id: string; name: string }): Promise<void> {
    const isNew = !faq.id || faq.id.startsWith('new-');
    const faqId = isNew ? `faq-${Date.now()}` : faq.id;
    const toSave: FaqEntity = {
      ...faq,
      id: faqId,
      updatedAt: new Date().toISOString()
    };

    await saveDocumentData(FIRESTORE_FAQS, toSave.id, toSave, FAQ_STORAGE_KEY);

    await auditService.recordLog({
      action: isNew ? 'CREATE' : 'UPDATE',
      module: 'SETTINGS',
      description: `${isNew ? 'Menambahkan' : 'Memperbarui'} FAQ: "${faq.question}"`,
      userId: user?.id || 'admin',
      userName: user?.name || 'Admin',
      userEmail: 'admin@puskesmas.id',
      targetId: toSave.id,
      targetName: toSave.question
    });
  },

  async deleteFaq(id: string, user?: { id: string; name: string }): Promise<void> {
    const faqs = await this.getFaqs();
    const target = faqs.find(f => f.id === id);

    await deleteDocumentData(FIRESTORE_FAQS, id, FAQ_STORAGE_KEY);

    await auditService.recordLog({
      action: 'DELETE',
      module: 'SETTINGS',
      description: `Menghapus FAQ: "${target?.question || id}"`,
      userId: user?.id || 'admin',
      userName: user?.name || 'Admin',
      userEmail: 'admin@puskesmas.id',
      targetId: id,
      targetName: target?.question
    });
  },

  async setFaqStatus(id: string, status: FaqEntity['status'], user?: { id: string; name: string }): Promise<void> {
    const faqs = await this.getFaqs();
    const target = faqs.find(f => f.id === id);
    if (target) {
      target.status = status;
      target.updatedAt = new Date().toISOString();
      await saveDocumentData(FIRESTORE_FAQS, target.id, target, FAQ_STORAGE_KEY);

      await auditService.recordLog({
        action: status === 'Published' ? 'PUBLISH' : 'UNPUBLISH',
        module: 'SETTINGS',
        description: `Mengubah status FAQ "${target.question}" menjadi ${status}`,
        userId: user?.id || 'admin',
        userName: user?.name || 'Admin',
        userEmail: 'admin@puskesmas.id',
        targetId: id,
        targetName: target.question
      });
    }
  },

  async voteFaq(id: string, isHelpful: boolean): Promise<{ helpfulCount: number; notHelpfulCount: number }> {
    const faqs = await this.getFaqs();
    const target = faqs.find(f => f.id === id);
    if (!target) throw new Error('FAQ not found');

    // Prevent duplicate voting in same session storage
    const votedMap = JSON.parse(localStorage.getItem(VOTE_TRACKER_KEY) || '{}');
    if (votedMap[id]) {
      return { helpfulCount: target.helpfulCount, notHelpfulCount: target.notHelpfulCount };
    }

    if (isHelpful) {
      target.helpfulCount += 1;
    } else {
      target.notHelpfulCount += 1;
      // If notHelpful exceeds threshold, mark needsReview
      if (target.notHelpfulCount >= 5 && target.helpfulCount < target.notHelpfulCount * 2) {
        target.needsReview = true;
      }
    }

    votedMap[id] = isHelpful ? 'helpful' : 'not_helpful';
    localStorage.setItem(VOTE_TRACKER_KEY, JSON.stringify(votedMap));
    await saveDocumentData(FIRESTORE_FAQS, target.id, target, FAQ_STORAGE_KEY);

    return { helpfulCount: target.helpfulCount, notHelpfulCount: target.notHelpfulCount };
  },

  // Guides
  async getGuides(): Promise<GuideEntity[]> {
    return getCollectionData<GuideEntity>(FIRESTORE_GUIDES, GUIDES_STORAGE_KEY, DEFAULT_GUIDES);
  },

  async saveGuide(guide: GuideEntity, user?: { id: string; name: string }): Promise<void> {
    const isNew = !guide.id || guide.id.startsWith('new-');
    const guideId = isNew ? `guide-${Date.now()}` : guide.id;
    const toSave: GuideEntity = {
      ...guide,
      id: guideId,
      updatedAt: new Date().toISOString()
    };

    await saveDocumentData(FIRESTORE_GUIDES, toSave.id, toSave, GUIDES_STORAGE_KEY);

    await auditService.recordLog({
      action: isNew ? 'CREATE' : 'UPDATE',
      module: 'SETTINGS',
      description: `${isNew ? 'Menambahkan' : 'Memperbarui'} Panduan Knowledge Base: "${guide.title}"`,
      userId: user?.id || 'admin',
      userName: user?.name || 'Admin',
      userEmail: 'admin@puskesmas.id',
      targetId: toSave.id,
      targetName: toSave.title
    });
  },

  async deleteGuide(id: string, user?: { id: string; name: string }): Promise<void> {
    const guides = await this.getGuides();
    const target = guides.find(g => g.id === id);

    await deleteDocumentData(FIRESTORE_GUIDES, id, GUIDES_STORAGE_KEY);

    await auditService.recordLog({
      action: 'DELETE',
      module: 'SETTINGS',
      description: `Menghapus Panduan: "${target?.title || id}"`,
      userId: user?.id || 'admin',
      userName: user?.name || 'Admin',
      userEmail: 'admin@puskesmas.id',
      targetId: id,
      targetName: target?.title
    });
  },

  // Categories
  async getFaqCategories(): Promise<FaqCategory[]> {
    try {
      const stored = localStorage.getItem(FAQ_CATEGORIES_KEY);
      if (!stored) {
        localStorage.setItem(FAQ_CATEGORIES_KEY, JSON.stringify(DEFAULT_FAQ_CATEGORIES));
        return DEFAULT_FAQ_CATEGORIES;
      }
      return JSON.parse(stored);
    } catch {
      return DEFAULT_FAQ_CATEGORIES;
    }
  },

  async saveFaqCategory(cat: FaqCategory): Promise<void> {
    const cats = await this.getFaqCategories();
    const idx = cats.findIndex(c => c.id === cat.id);
    if (idx >= 0) cats[idx] = cat;
    else cats.push(cat);
    localStorage.setItem(FAQ_CATEGORIES_KEY, JSON.stringify(cats));
  },

  async getGuideCategories(): Promise<GuideCategory[]> {
    try {
      const stored = localStorage.getItem(GUIDE_CATEGORIES_KEY);
      if (!stored) {
        localStorage.setItem(GUIDE_CATEGORIES_KEY, JSON.stringify(DEFAULT_GUIDE_CATEGORIES));
        return DEFAULT_GUIDE_CATEGORIES;
      }
      return JSON.parse(stored);
    } catch {
      return DEFAULT_GUIDE_CATEGORIES;
    }
  },

  // Analytics
  async getFaqAnalytics() {
    const faqs = await this.getFaqs();
    const totalFaqs = faqs.length;
    const publishedCount = faqs.filter(f => f.status === 'Published').length;
    const needsReviewCount = faqs.filter(f => f.needsReview).length;
    
    const sortedByHelpful = [...faqs].sort((a, b) => b.helpfulCount - a.helpfulCount);
    const sortedByNotHelpful = [...faqs].sort((a, b) => b.notHelpfulCount - a.notHelpfulCount);
    const featuredFaqs = faqs.filter(f => f.featured && f.status === 'Published');

    return {
      totalFaqs,
      publishedCount,
      needsReviewCount,
      mostHelpful: sortedByHelpful.slice(0, 5),
      mostNotHelpful: sortedByNotHelpful.slice(0, 5),
      featuredFaqs,
    };
  }
};
