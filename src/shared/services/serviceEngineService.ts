import type {
  ServiceEntity,
  ServiceStatus,
  ServiceCategoryEntity,
  ServiceClusterEntity,
  ServiceUnitEntity,
  ServiceLocationEntity,
  ServiceRequirementEntity,
  ServiceProcedureEntity,
  ServiceProductEntity,
  ServiceStandardEntity,
  DayOfWeek,
  ServiceScheduleRuleEntity,
  ServiceScheduleEntity,
  ScheduleExceptionType,
  ServiceScheduleExceptionEntity,
  PricingType,
  ServicePricingEntity,
  ActiveStatus
} from '../types/index.js';
import { auditService } from './auditService';
import { saveSingleDocument, getSingleDocument } from '../lib/firebase';

const SERVICES_STORAGE_KEY = 'puskesmas_services';
const CATEGORIES_STORAGE_KEY = 'puskesmas_service_categories';
const CLUSTERS_STORAGE_KEY = 'puskesmas_service_clusters';
const UNITS_STORAGE_KEY = 'puskesmas_service_units';
const LOCATIONS_STORAGE_KEY = 'puskesmas_service_locations';
const REQUIREMENTS_STORAGE_KEY = 'puskesmas_service_requirements';
const PROCEDURES_STORAGE_KEY = 'puskesmas_service_procedures';
const PRODUCTS_STORAGE_KEY = 'puskesmas_service_products';
const STANDARDS_STORAGE_KEY = 'puskesmas_service_standards';
const SCHEDULES_STORAGE_KEY = 'puskesmas_service_schedules';
const EXCEPTIONS_STORAGE_KEY = 'puskesmas_service_schedule_exceptions';
const PRICING_STORAGE_KEY = 'puskesmas_service_pricing';

export function sanitizeInput(input?: string): string {
  if (!input) return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
}

export const INITIAL_CLUSTERS: ServiceClusterEntity[] = [
  {
    id: 'cls-1',
    name: 'Klaster 1 — Manajemen',
    slug: 'klaster-1-manajemen',
    description: 'Pengelolaan manajemen internal, ketatausahaan, perencanaan, dan integrasi pelayanan Puskesmas.',
    status: 'active',
    displayOrder: 1,
    createdAt: new Date(Date.now() - 86400000 * 60).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 60).toISOString(),
    createdBy: { id: 'usr-superadmin-01', name: 'Administrator Utama' }
  },
  {
    id: 'cls-2',
    name: 'Klaster 2 — Ibu dan Anak',
    slug: 'klaster-2-ibu-dan-anak',
    description: 'Pelayanan kesehatan komprehensif ibu hamil, bersalin, nifas, bayi, balita, anak sekolah, dan remaja.',
    status: 'active',
    displayOrder: 2,
    createdAt: new Date(Date.now() - 86400000 * 60).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 60).toISOString(),
    createdBy: { id: 'usr-superadmin-01', name: 'Administrator Utama' }
  },
  {
    id: 'cls-3',
    name: 'Klaster 3 — Usia Dewasa & Lansia',
    slug: 'klaster-3-usia-dewasa-lansia',
    description: 'Pelayanan kesehatan promotif, preventif, kuratif, dan rehabilitatif bagi usia produktif dan lanjut usia.',
    status: 'active',
    displayOrder: 3,
    createdAt: new Date(Date.now() - 86400000 * 60).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 60).toISOString(),
    createdBy: { id: 'usr-superadmin-01', name: 'Administrator Utama' }
  },
  {
    id: 'cls-4',
    name: 'Klaster 4 — Penanggulangan Penyakit Menular',
    slug: 'klaster-4-penanggulangan-penyakit-menular',
    description: 'Pencegahan, surveilans, dan penanggulangan penyakit menular serta penyehatan lingkungan.',
    status: 'active',
    displayOrder: 4,
    createdAt: new Date(Date.now() - 86400000 * 60).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 60).toISOString(),
    createdBy: { id: 'usr-superadmin-01', name: 'Administrator Utama' }
  },
  {
    id: 'cls-lintas',
    name: 'Lintas Klaster',
    slug: 'lintas-klaster',
    description: 'Pelayanan gawat darurat, kefarmasian, laboratorium penunjang, dan rawat inap lintas usia.',
    status: 'active',
    displayOrder: 5,
    createdAt: new Date(Date.now() - 86400000 * 60).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 60).toISOString(),
    createdBy: { id: 'usr-superadmin-01', name: 'Administrator Utama' }
  }
];

export const INITIAL_CATEGORIES: ServiceCategoryEntity[] = [
  {
    id: 'cat-medis',
    name: 'Pelayanan Medis Umum',
    slug: 'pelayanan-medis-umum',
    description: 'Kategori layanan pemeriksaan fisik, konsultasi dokter umum, dan konseling kesehatan dasar.',
    clusterId: 'cls-3',
    clusterName: 'Klaster 3 — Usia Dewasa & Lansia',
    status: 'active',
    displayOrder: 1,
    createdAt: new Date(Date.now() - 86400000 * 50).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 50).toISOString(),
    createdBy: { id: 'usr-superadmin-01', name: 'Administrator Utama' }
  },
  {
    id: 'cat-kia',
    name: 'Kesehatan Ibu & Anak',
    slug: 'kesehatan-ibu-anak',
    description: 'Layanan kehamilan, imunisasi, KB, serta tumbuh kembang balita.',
    clusterId: 'cls-2',
    clusterName: 'Klaster 2 — Ibu dan Anak',
    status: 'active',
    displayOrder: 2,
    createdAt: new Date(Date.now() - 86400000 * 50).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 50).toISOString(),
    createdBy: { id: 'usr-superadmin-01', name: 'Administrator Utama' }
  },
  {
    id: 'cat-gigi',
    name: 'Pelayanan Gigi',
    slug: 'pelayanan-gigi',
    description: 'Layanan dokter gigi, perawatan karies, scaling, dan pencabutan gigi.',
    clusterId: 'cls-3',
    clusterName: 'Klaster 3 — Usia Dewasa & Lansia',
    status: 'active',
    displayOrder: 3,
    createdAt: new Date(Date.now() - 86400000 * 50).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 50).toISOString(),
    createdBy: { id: 'usr-superadmin-01', name: 'Administrator Utama' }
  },
  {
    id: 'cat-penunjang',
    name: 'Pelayanan Penunjang Diagnostic',
    slug: 'pelayanan-penunjang-diagnostic',
    description: 'Pemeriksaan sampel darah, urine, dahak, dan penyerahan obat kefarmasian.',
    clusterId: 'cls-lintas',
    clusterName: 'Lintas Klaster',
    status: 'active',
    displayOrder: 4,
    createdAt: new Date(Date.now() - 86400000 * 50).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 50).toISOString(),
    createdBy: { id: 'usr-superadmin-01', name: 'Administrator Utama' }
  },
  {
    id: 'cat-darurat',
    name: 'Pelayanan Darurat',
    slug: 'pelayanan-darurat',
    description: 'Pelayanan tindakan gawat darurat dan resusitasi medis 24 jam.',
    clusterId: 'cls-lintas',
    clusterName: 'Lintas Klaster',
    status: 'active',
    displayOrder: 5,
    createdAt: new Date(Date.now() - 86400000 * 50).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 50).toISOString(),
    createdBy: { id: 'usr-superadmin-01', name: 'Administrator Utama' }
  },
  {
    id: 'cat-inap',
    name: 'Pelayanan Rawat Inap & Persalinan',
    slug: 'pelayanan-rawat-inap-persalinan',
    description: 'Pelayanan rawat inap umum, observasi medis intensif, dan rawat inap persalinan 24 jam.',
    clusterId: 'cls-lintas',
    clusterName: 'Lintas Klaster',
    status: 'active',
    displayOrder: 6,
    createdAt: new Date(Date.now() - 86400000 * 50).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 50).toISOString(),
    createdBy: { id: 'usr-superadmin-01', name: 'Administrator Utama' }
  }
];

export const INITIAL_UNITS: ServiceUnitEntity[] = [
  {
    id: 'unit-poli-umum',
    name: 'Ruang Poli Umum',
    code: 'POLI-UMUM',
    description: 'Unit pelayanan pemeriksaan dokter umum dan pengobatan rawat jalan.',
    status: 'active',
    displayOrder: 1,
    createdAt: new Date(Date.now() - 86400000 * 40).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 40).toISOString(),
    createdBy: { id: 'usr-superadmin-01', name: 'Administrator Utama' }
  },
  {
    id: 'unit-kia',
    name: 'Ruang KIA & KB',
    code: 'KIA-KB',
    description: 'Unit pemeriksaan ibu hamil, imunisasi, KB, dan kesehatan anak.',
    status: 'active',
    displayOrder: 2,
    createdAt: new Date(Date.now() - 86400000 * 40).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 40).toISOString(),
    createdBy: { id: 'usr-superadmin-01', name: 'Administrator Utama' }
  },
  {
    id: 'unit-gigi',
    name: 'Ruang Poli Gigi',
    code: 'POLI-GIGI',
    description: 'Unit tindakan medis kesehatan gigi dan mulut.',
    status: 'active',
    displayOrder: 3,
    createdAt: new Date(Date.now() - 86400000 * 40).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 40).toISOString(),
    createdBy: { id: 'usr-superadmin-01', name: 'Administrator Utama' }
  },
  {
    id: 'unit-lab',
    name: 'Ruang Laboratorium',
    code: 'LAB',
    description: 'Unit pengujian laboratorium spesimen spesifik.',
    status: 'active',
    displayOrder: 4,
    createdAt: new Date(Date.now() - 86400000 * 40).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 40).toISOString(),
    createdBy: { id: 'usr-superadmin-01', name: 'Administrator Utama' }
  },
  {
    id: 'unit-farmasi',
    name: 'Ruang Farmasi / Apotek',
    code: 'FARMASI',
    description: 'Unit peracikan dan penyerahan obat resep dokter.',
    status: 'active',
    displayOrder: 5,
    createdAt: new Date(Date.now() - 86400000 * 40).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 40).toISOString(),
    createdBy: { id: 'usr-superadmin-01', name: 'Administrator Utama' }
  },
  {
    id: 'unit-ugd',
    name: 'Unit Gawat Darurat (UGD)',
    code: 'UGD-24H',
    description: 'Unit penanganan darurat kecelakaan dan kegawatdaruratan medis.',
    status: 'active',
    displayOrder: 6,
    createdAt: new Date(Date.now() - 86400000 * 40).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 40).toISOString(),
    createdBy: { id: 'usr-superadmin-01', name: 'Administrator Utama' }
  },
  {
    id: 'unit-inap',
    name: 'Ruang Rawat Inap & Bersalin',
    code: 'RAWAT-INAP-24H',
    description: 'Unit perawatan inap umum, ruang nifas/bersalin terpadu, dan ruang observasi intensif 24 jam.',
    status: 'active',
    displayOrder: 7,
    createdAt: new Date(Date.now() - 86400000 * 40).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 40).toISOString(),
    createdBy: { id: 'usr-superadmin-01', name: 'Administrator Utama' }
  }
];

export const INITIAL_LOCATIONS: ServiceLocationEntity[] = [
  {
    id: 'loc-lt1-r1',
    name: 'Poli Umum R101',
    building: 'Gedung Utama',
    floor: 'Lantai 1',
    room: 'Ruang 101',
    description: 'Samping ruang pendaftaran pendaftaran utama.',
    status: 'active',
    displayOrder: 1,
    createdAt: new Date(Date.now() - 86400000 * 40).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 40).toISOString(),
    createdBy: { id: 'usr-superadmin-01', name: 'Administrator Utama' }
  },
  {
    id: 'loc-lt1-r2',
    name: 'Poli KIA R103',
    building: 'Gedung Utama',
    floor: 'Lantai 1',
    room: 'Ruang 103',
    description: 'Dekat taman bermain anak.',
    status: 'active',
    displayOrder: 2,
    createdAt: new Date(Date.now() - 86400000 * 40).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 40).toISOString(),
    createdBy: { id: 'usr-superadmin-01', name: 'Administrator Utama' }
  },
  {
    id: 'loc-lt1-r3',
    name: 'Poli Gigi R105',
    building: 'Gedung Utama',
    floor: 'Lantai 1',
    room: 'Ruang 105',
    description: 'Koridor sayap kanan.',
    status: 'active',
    displayOrder: 3,
    createdAt: new Date(Date.now() - 86400000 * 40).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 40).toISOString(),
    createdBy: { id: 'usr-superadmin-01', name: 'Administrator Utama' }
  },
  {
    id: 'loc-lt1-r4',
    name: 'Lab Utama',
    building: 'Gedung Penunjang',
    floor: 'Lantai 1',
    room: 'Ruang Laboratorium',
    description: 'Akses khusus pengambilan spesimen.',
    status: 'active',
    displayOrder: 4,
    createdAt: new Date(Date.now() - 86400000 * 40).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 40).toISOString(),
    createdBy: { id: 'usr-superadmin-01', name: 'Administrator Utama' }
  },
  {
    id: 'loc-lt1-r5',
    name: 'Apotek Utama',
    building: 'Gedung Utama',
    floor: 'Lantai 1',
    room: 'Loket Apotek',
    description: 'Dekat pintu keluar utama.',
    status: 'active',
    displayOrder: 5,
    createdAt: new Date(Date.now() - 86400000 * 40).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 40).toISOString(),
    createdBy: { id: 'usr-superadmin-01', name: 'Administrator Utama' }
  },
  {
    id: 'loc-ugd-1',
    name: 'UGD Utama',
    building: 'Gedung UGD',
    floor: 'Lantai 1',
    room: 'Ruang UGD',
    description: 'Pintu masuk depan ambulans.',
    status: 'active',
    displayOrder: 6,
    createdAt: new Date(Date.now() - 86400000 * 40).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 40).toISOString(),
    createdBy: { id: 'usr-superadmin-01', name: 'Administrator Utama' }
  },
  {
    id: 'loc-lt2-inap',
    name: 'Gedung Rawat Inap Terpadu Lt. 2',
    building: 'Gedung Rawat Inap',
    floor: 'Lantai 2',
    room: 'Ruang Perawatan Rawat Inap',
    description: 'Akses lift ranjang pasien dan tangga darurat, dilengkapi nurse station terpadu 24 jam.',
    status: 'active',
    displayOrder: 7,
    createdAt: new Date(Date.now() - 86400000 * 40).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 40).toISOString(),
    createdBy: { id: 'usr-superadmin-01', name: 'Administrator Utama' }
  }
];

export const INITIAL_SERVICES: ServiceEntity[] = [
  {
    id: 'srv-1',
    name: 'Pelayanan Pemeriksaan Umum',
    slug: 'pelayanan-pemeriksaan-umum',
    shortDescription: 'Pemeriksaan kesehatan umum, konseling medis, dan pengobatan dasar bagi masyarakat usia dewasa dan lansia.',
    description: `
      <p>Pelayanan Pemeriksaan Umum memberikan pelayanan medis komprehensif berupa anamnesis, pemeriksaan fisik, diagnosis, hingga pemberian resep obat untuk berbagai keluhan kesehatan umum.</p>
      <p>Sesuai dengan penataan Integrasi Layanan Primer (ILP) Permenkes No. 19 Tahun 2024, pelayanan difokuskan pada pengkajian proaktif termasuk skrining penyakit tidak menular (hipertensi, diabetes, jantung).</p>
    `,
    status: 'published',
    categoryId: 'cat-medis',
    categoryName: 'Pelayanan Medis Umum',
    clusterId: 'cls-3',
    clusterName: 'Klaster 3 — Usia Dewasa & Lansia',
    unitId: 'unit-poli-umum',
    unitName: 'Ruang Poli Umum',
    locationId: 'loc-lt1-r1',
    locationName: 'Poli Umum R101',
    featured: true,
    displayOrder: 1,
    createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    createdBy: { id: 'usr-superadmin-01', name: 'Administrator Utama', email: 'admin@puskesmas.go.id' },
    publishedAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    publishedBy: { id: 'usr-superadmin-01', name: 'Administrator Utama' },
    seoTitle: 'Pelayanan Pemeriksaan Umum - Puskesmas',
    seoDescription: 'Layanan pemeriksaan umum dan skrining penyakit tidak menular di Puskesmas.'
  },
  {
    id: 'srv-2',
    name: 'Pelayanan Kesehatan Ibu, Anak & Keluarga Berencana (KIA-KB)',
    slug: 'pelayanan-kia-kb',
    shortDescription: 'Pemeriksaan kehamilan (ANC), pelayanan pascamelahirkan (PNC), imunisasi bayi, dan konseling Keluarga Berencana.',
    description: `
      <p>Pelayanan Kesehatan Ibu dan Anak (KIA) serta KB dirancang untuk memastikan kesehatan ibu hamil, ibu bersalin, bayi, dan balita terpantau secara optimal.</p>
      <p>Fasilitas mencakup USG kehamilan dasar oleh dokter terlatih, pemantauan tumbuh kembang anak (SDIDTK), imunisasi rutin, dan pelayanan akseptor KB.</p>
    `,
    status: 'published',
    categoryId: 'cat-kia',
    categoryName: 'Kesehatan Ibu & Anak',
    clusterId: 'cls-2',
    clusterName: 'Klaster 2 — Ibu dan Anak',
    unitId: 'unit-kia',
    unitName: 'Ruang KIA & KB',
    locationId: 'loc-lt1-r2',
    locationName: 'Poli KIA R103',
    featured: true,
    displayOrder: 2,
    createdAt: new Date(Date.now() - 86400000 * 25).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    createdBy: { id: 'usr-superadmin-01', name: 'Administrator Utama', email: 'admin@puskesmas.go.id' },
    publishedAt: new Date(Date.now() - 86400000 * 25).toISOString(),
    publishedBy: { id: 'usr-superadmin-01', name: 'Administrator Utama' },
    seoTitle: 'Pelayanan KIA & KB - Puskesmas',
    seoDescription: 'Layanan kesehatan ibu hamil, anak, imunisasi rutin, dan konseling Keluarga Berencana.'
  },
  {
    id: 'srv-3',
    name: 'Pelayanan Kesehatan Gigi dan Mulut',
    slug: 'pelayanan-kesehatan-gigi-mulut',
    shortDescription: 'Pemeriksaan kesehatan gigi, pencabutan gigi, penambalan, pembersihan karang gigi (scaling), dan edukasi kesehatan gigi.',
    description: `
      <p>Memberikan pelayanan perawatan dan penanganan masalah kesehatan gigi serta jaringan mulut bagi seluruh anggota keluarga.</p>
      <p>Dilengkapi dengan dental chair modern dan peralatan steril sesuai standar pencegahan dan pengendalian infeksi (PPI).</p>
    `,
    status: 'published',
    categoryId: 'cat-gigi',
    categoryName: 'Pelayanan Gigi',
    clusterId: 'cls-3',
    clusterName: 'Klaster 3 — Usia Dewasa & Lansia',
    unitId: 'unit-gigi',
    unitName: 'Ruang Poli Gigi',
    locationId: 'loc-lt1-r3',
    locationName: 'Poli Gigi R105',
    featured: true,
    displayOrder: 3,
    createdAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    createdBy: { id: 'usr-superadmin-01', name: 'Administrator Utama', email: 'admin@puskesmas.go.id' },
    publishedAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    publishedBy: { id: 'usr-superadmin-01', name: 'Administrator Utama' },
    seoTitle: 'Pelayanan Kesehatan Gigi dan Mulut - Puskesmas',
    seoDescription: 'Layanan dokter gigi, penambalan, pembersihan karang gigi, dan perawatan mulut.'
  },
  {
    id: 'srv-4',
    name: 'Pelayanan Laboratorium Klinik',
    slug: 'pelayanan-laboratorium-klinik',
    shortDescription: 'Pemeriksaan darah rutin, gula darah, kolesterol, asam urat, tes urine, dahak TB, dan rapid test kesehatan.',
    description: `
      <p>Pelayanan penunjang diagnostik laboratorium untuk mendukung penegakan diagnosis dokter dan evaluasi terapi pengobatan pasien.</p>
      <p>Hasil pemeriksaan ditangani oleh pranata laboratorium kesehatan berpengalaman dengan jaminan pemantauan mutu internal.</p>
    `,
    status: 'published',
    categoryId: 'cat-penunjang',
    categoryName: 'Pelayanan Penunjang Diagnostic',
    clusterId: 'cls-lintas',
    clusterName: 'Lintas Klaster',
    unitId: 'unit-lab',
    unitName: 'Ruang Laboratorium',
    locationId: 'loc-lt1-r4',
    locationName: 'Lab Utama',
    featured: false,
    displayOrder: 4,
    createdAt: new Date(Date.now() - 86400000 * 18).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    createdBy: { id: 'usr-superadmin-01', name: 'Administrator Utama', email: 'admin@puskesmas.go.id' },
    publishedAt: new Date(Date.now() - 86400000 * 18).toISOString(),
    publishedBy: { id: 'usr-superadmin-01', name: 'Administrator Utama' },
    seoTitle: 'Pelayanan Laboratorium Klinik - Puskesmas',
    seoDescription: 'Pemeriksaan sampel darah, urine, kolesterol, dan laboratorium medis cepat.'
  },
  {
    id: 'srv-5',
    name: 'Pelayanan Kefarmasian & Apotek',
    slug: 'pelayanan-kefarmasian-apotek',
    shortDescription: 'Penyerahan obat resep, resep puyer, konseling obat rasional, dan edukasi efek samping obat bagi pasien.',
    description: `
      <p>Pengelolaan sediaan farmasi dan pelayanan resep dokter secara aman, terukur, dan informatif oleh Apoteker dan Tenaga Vokasi Kefarmasian.</p>
    `,
    status: 'published',
    categoryId: 'cat-penunjang',
    categoryName: 'Pelayanan Penunjang Diagnostic',
    clusterId: 'cls-lintas',
    clusterName: 'Lintas Klaster',
    unitId: 'unit-farmasi',
    unitName: 'Ruang Farmasi / Apotek',
    locationId: 'loc-lt1-r5',
    locationName: 'Apotek Utama',
    featured: false,
    displayOrder: 5,
    createdAt: new Date(Date.now() - 86400000 * 15).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    createdBy: { id: 'usr-superadmin-01', name: 'Administrator Utama', email: 'admin@puskesmas.go.id' },
    publishedAt: new Date(Date.now() - 86400000 * 15).toISOString(),
    publishedBy: { id: 'usr-superadmin-01', name: 'Administrator Utama' }
  },
  {
    id: 'srv-6',
    name: 'Pelayanan Gawat Darurat (UGD) 24 Jam',
    slug: 'pelayanan-gawat-darurat-ugd-24-jam',
    shortDescription: 'Penanganan krisis medis darurat, pertolongan pertama kecelakaan, dan stabilisasi pasien 24 jam nonstop.',
    description: `
      <p>Unit Gawat Darurat bersiap 24 jam melayani situasi gawat darurat medis, kecelakaan kerja/lalu lintas, hingga perujukan darurat ke RS Rujukan.</p>
    `,
    status: 'published',
    categoryId: 'cat-darurat',
    categoryName: 'Pelayanan Darurat',
    clusterId: 'cls-lintas',
    clusterName: 'Lintas Klaster',
    unitId: 'unit-ugd',
    unitName: 'Unit Gawat Darurat (UGD)',
    locationId: 'loc-ugd-1',
    locationName: 'UGD Utama',
    featured: true,
    displayOrder: 6,
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    createdBy: { id: 'usr-superadmin-01', name: 'Administrator Utama', email: 'admin@puskesmas.go.id' },
    publishedAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    publishedBy: { id: 'usr-superadmin-01', name: 'Administrator Utama' }
  },
  {
    id: 'srv-7',
    name: 'Pelayanan Rawat Inap (Inpatient Care) 24 Jam',
    slug: 'pelayanan-rawat-inap-24-jam',
    shortDescription: 'Pelayanan rawat inap umum dan persalinan 24 jam dengan fasilitas bed perawatan medis, visite dokter rutin, asuhan keperawatan intensif, gizi klinis, dan laboratorium penunjang.',
    description: `
      <p><strong>Pelayanan Rawat Inap Puskesmas</strong> menyelenggarakan asuhan medis dan keperawatan paripurna 24 jam nonstop bagi pasien yang memerlukan observasi klinis, perawatan berkelanjutan, tindakan medis kebidanan, maupun stabilisasi yang tidak memungkinkan rawat jalan.</p>
      <p>Sesuai dengan penataan Integrasi Layanan Primer (ILP) Permenkes No. 19 Tahun 2024 dan Standar Pelayanan Publik Kemenkes RI, seluruh proses perawatan dipimpin oleh Dokter Penanggung Jawab Pelayanan (DPJP) didampingi perawat ber-STR dan bidan bersertifikat APN.</p>
      <h4>Fasilitas & Kapasitas Rawat Inap:</h4>
      <ul>
        <li><strong>Ruang Perawatan Pasien:</strong> Tempat tidur medis ergonomis, tiang infus, oksigen sentral/tabung, nebulizer, monitor tanda vital, dan tombol panggil perawat (nurse call) 24 jam.</li>
        <li><strong>Ruang Bersalin (VK) & Nifas:</strong> Ruang persalinan privat terstandar APN, fasilitas rooming-in (rawat gabung ibu dan bayi), serta konseling Inisiasi Menyusu Dini (IMD).</li>
        <li><strong>Instalasi Gizi & Dietetika:</strong> Menu makanan pasien 3x makan utama dan 2x snack sesuai indikasi diet medis (rendah garam, diet DM, lunak, tinggi kalori tinggi protein).</li>
        <li><strong>Nurse Station Siaga 24 Jam:</strong> Pemantauan tanda vital berkala, evaluasi cairan, dan pemberian terapi injeksi/oral secara aseptik.</li>
      </ul>
      <h4>Alur & Penjaminan:</h4>
      <p>Menerima rujukan internal dari Unit Gawat Darurat (UGD) 24 Jam dan Poli Rawat Jalan. Dilayani bagi peserta <strong>BPJS Kesehatan / KIS</strong> (bebas biaya sesuai hak kelas) serta pasien Umum sesuai Peraturan Daerah.</p>
    `,
    status: 'published',
    categoryId: 'cat-inap',
    categoryName: 'Pelayanan Rawat Inap & Persalinan',
    clusterId: 'cls-lintas',
    clusterName: 'Lintas Klaster',
    unitId: 'unit-inap',
    unitName: 'Ruang Rawat Inap & Bersalin',
    locationId: 'loc-lt2-inap',
    locationName: 'Gedung Rawat Inap Terpadu Lt. 2',
    featured: true,
    displayOrder: 7,
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    createdBy: { id: 'usr-superadmin-01', name: 'Administrator Utama', email: 'admin@puskesmas.go.id' },
    publishedAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    publishedBy: { id: 'usr-superadmin-01', name: 'Administrator Utama' },
    seoTitle: 'Pelayanan Rawat Inap 24 Jam - Puskesmas',
    seoDescription: 'Informasi lengkap pelayanan rawat inap 24 jam Puskesmas, fasilitas tempat tidur, visite dokter, asuhan keperawatan, dan BPJS Kesehatan.'
  }
];

export const INITIAL_REQUIREMENTS: ServiceRequirementEntity[] = [
  {
    id: 'req-101',
    serviceId: 'srv-1',
    title: 'Kartu Identitas (KTP / KK / KIA)',
    description: 'Dokumen identitas resmi atau salinan digital resmi untuk verifikasi NIK dan identitas pasien.',
    required: true,
    displayOrder: 1,
    status: 'active',
    createdAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    createdBy: { id: 'usr-superadmin-01', name: 'Administrator Utama' }
  },
  {
    id: 'req-102',
    serviceId: 'srv-1',
    title: 'Kartu Indonesia Sehat (KIS / BPJS Kesehatan)',
    description: 'Kartu kepesertaan aktif untuk penjaminan biaya pelayanan kesehatan FKTP.',
    required: false,
    displayOrder: 2,
    status: 'active',
    createdAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    createdBy: { id: 'usr-superadmin-01', name: 'Administrator Utama' }
  },
  {
    id: 'req-103',
    serviceId: 'srv-1',
    title: 'Kartu Berobat Puskesmas',
    description: 'Diperlukan untuk mempermudah pelacakan berkas rekam medis bagi pasien ulangan.',
    required: false,
    displayOrder: 3,
    status: 'active',
    createdAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    createdBy: { id: 'usr-superadmin-01', name: 'Administrator Utama' }
  },
  {
    id: 'req-201',
    serviceId: 'srv-2',
    title: 'Buku Kesehatan Ibu dan Anak (Buku KIA)',
    description: 'Wajib dibawa setiap kali kunjungan untuk pencatatan riwayat kehamilan dan imunisasi balita.',
    required: true,
    displayOrder: 1,
    status: 'active',
    createdAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    createdBy: { id: 'usr-superadmin-01', name: 'Administrator Utama' }
  },
  {
    id: 'req-202',
    serviceId: 'srv-2',
    title: 'KTP Ibu / Suami & Kartu Keluarga',
    description: 'Diperlukan untuk registrasi awal dan penerbitan surat keterangan pelayanan kesehatan.',
    required: true,
    displayOrder: 2,
    status: 'active',
    createdAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    createdBy: { id: 'usr-superadmin-01', name: 'Administrator Utama' }
  },
  {
    id: 'req-701',
    serviceId: 'srv-7',
    title: 'Surat Pengantar Rawat Inap (SPRI) dari Dokter UGD / Poli',
    description: 'Surat rekomendasi medis dari dokter pemeriksa yang menyatakan indikasi rawat inap.',
    required: true,
    displayOrder: 1,
    status: 'active',
    createdAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    createdBy: { id: 'usr-superadmin-01', name: 'Administrator Utama' }
  },
  {
    id: 'req-702',
    serviceId: 'srv-7',
    title: 'Identitas Diri Pasien & Penanggung Jawab (KTP / KK / KIA)',
    description: 'Dokumen identitas resmi atau digital untuk verifikasi administrasi dan rekam medis.',
    required: true,
    displayOrder: 2,
    status: 'active',
    createdAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    createdBy: { id: 'usr-superadmin-01', name: 'Administrator Utama' }
  },
  {
    id: 'req-703',
    serviceId: 'srv-7',
    title: 'Kartu BPJS Kesehatan / KIS / Asuransi Aktif',
    description: 'Kartu kepesertaan aktif untuk penjaminan bebas biaya seluruh fasilitas rawat inap sesuai hak kepesertaan.',
    required: false,
    displayOrder: 3,
    status: 'active',
    createdAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    createdBy: { id: 'usr-superadmin-01', name: 'Administrator Utama' }
  },
  {
    id: 'req-704',
    serviceId: 'srv-7',
    title: 'Surat Persetujuan Rawat Inap (General Consent)',
    description: 'Persetujuan tindakan medis dan rawat inap yang ditandatangani oleh pasien atau keluarga/wali yang sah.',
    required: true,
    displayOrder: 4,
    status: 'active',
    createdAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    createdBy: { id: 'usr-superadmin-01', name: 'Administrator Utama' }
  }
];

export const INITIAL_PROCEDURES: ServiceProcedureEntity[] = [
  {
    id: 'proc-101',
    serviceId: 'srv-1',
    stepNumber: 1,
    title: 'Pendaftaran & Pengambilan Nomor Antrean',
    description: 'Pasien mengambil nomor antrean di loket pendaftaran utama dan menyerahkan berkas identitas.',
    displayOrder: 1,
    status: 'active',
    createdAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    createdBy: { id: 'usr-superadmin-01', name: 'Administrator Utama' }
  },
  {
    id: 'proc-102',
    serviceId: 'srv-1',
    stepNumber: 2,
    title: 'Skrining Tanda Vital oleh Perawat',
    description: 'Pengukuran berat badan, tinggi badan, tekanan darah, suhu, dan riwayat keluhan medis.',
    displayOrder: 2,
    status: 'active',
    createdAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    createdBy: { id: 'usr-superadmin-01', name: 'Administrator Utama' }
  },
  {
    id: 'proc-103',
    serviceId: 'srv-1',
    stepNumber: 3,
    title: 'Pemeriksaan Medis & Konseling Dokter',
    description: 'Anamnesis detail, pemeriksaan fisik oleh Dokter Umum, serta penegakan diagnosis medis.',
    displayOrder: 3,
    status: 'active',
    createdAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    createdBy: { id: 'usr-superadmin-01', name: 'Administrator Utama' }
  },
  {
    id: 'proc-104',
    serviceId: 'srv-1',
    stepNumber: 4,
    title: 'Pelayanan Kebutuhan Lanjutan / Apotek',
    description: 'Pasien mengambil obat resep di Ruang Farmasi atau menerima surat rujukan bila membutuhkan penanganan spesialis.',
    displayOrder: 4,
    status: 'active',
    createdAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    createdBy: { id: 'usr-superadmin-01', name: 'Administrator Utama' }
  },
  {
    id: 'proc-701',
    serviceId: 'srv-7',
    stepNumber: 1,
    title: 'Pemeriksaan Awal & Indikasi Rawat Inap Dokter UGD / Poli',
    description: 'Pemeriksaan kondisi klinis, tanda vital, dan penetapan indikasi rawat inap oleh dokter penanggung jawab.',
    displayOrder: 1,
    status: 'active',
    createdAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    createdBy: { id: 'usr-superadmin-01', name: 'Administrator Utama' }
  },
  {
    id: 'proc-702',
    serviceId: 'srv-7',
    stepNumber: 2,
    title: 'Registrasi Administrasi & Persetujuan Perawatan (General Consent)',
    description: 'Keluarga pasien mengurus pendaftaran rawat inap, verifikasi BPJS/Umum, dan menandatangani lembar persetujuan.',
    displayOrder: 2,
    status: 'active',
    createdAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    createdBy: { id: 'usr-superadmin-01', name: 'Administrator Utama' }
  },
  {
    id: 'proc-703',
    serviceId: 'srv-7',
    stepNumber: 3,
    title: 'Transfer ke Ruang Perawatan & Asuhan Keperawatan 24 Jam',
    description: 'Pasien diantar ke bed rawat inap, pemasangan infus/terapi awal, dan observasi tanda vital berkala.',
    displayOrder: 3,
    status: 'active',
    createdAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    createdBy: { id: 'usr-superadmin-01', name: 'Administrator Utama' }
  },
  {
    id: 'proc-704',
    serviceId: 'srv-7',
    stepNumber: 4,
    title: 'Visite Harian Dokter, Asuhan Gizi, & Evaluasi Penunjang',
    description: 'Pemeriksaan visite harian oleh DPJP, pemberian menu gizi terstandar, dan evaluasi hasil laboratorium.',
    displayOrder: 4,
    status: 'active',
    createdAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    createdBy: { id: 'usr-superadmin-01', name: 'Administrator Utama' }
  },
  {
    id: 'proc-705',
    serviceId: 'srv-7',
    stepNumber: 5,
    title: 'Discharge Planning, Resume Medis, & Edukasi Obat Pulang',
    description: 'Setelah dokter menyatakan sembuh/stabil, pasien diberikan resume medis, edukasi minum obat di rumah, dan surat kontrol.',
    displayOrder: 5,
    status: 'active',
    createdAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    createdBy: { id: 'usr-superadmin-01', name: 'Administrator Utama' }
  }
];

export const INITIAL_PRODUCTS: ServiceProductEntity[] = [
  {
    id: 'prod-101',
    serviceId: 'srv-1',
    name: 'Resep Obat & Paket Terapi Obat Dasar',
    description: 'Pemberian paket terapi obat sesuai diagnosis dan indikasi dokter umum.',
    displayOrder: 1,
    status: 'active',
    createdAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    createdBy: { id: 'usr-superadmin-01', name: 'Administrator Utama' }
  },
  {
    id: 'prod-102',
    serviceId: 'srv-1',
    name: 'Surat Keterangan Berobat / Surat Rujukan FKTP',
    description: 'Diterbitkan apabila pasien memerlukan tindak lanjut perawatan spesialis di Rumah Sakit.',
    displayOrder: 2,
    status: 'active',
    createdAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    createdBy: { id: 'usr-superadmin-01', name: 'Administrator Utama' }
  },
  {
    id: 'prod-701',
    serviceId: 'srv-7',
    name: 'Asuhan Medis & Visite Dokter Penanggung Jawab Pelayanan (DPJP)',
    description: 'Pemeriksaan klinis komprehensif dan monitoring perkembangan kesehatan pasien setiap hari.',
    displayOrder: 1,
    status: 'active',
    createdAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    createdBy: { id: 'usr-superadmin-01', name: 'Administrator Utama' }
  },
  {
    id: 'prod-702',
    serviceId: 'srv-7',
    name: 'Asuhan Keperawatan & Kebidanan 24 Jam Nonstop',
    description: 'Pelayanan keperawatan intensif, pemantauan tanda vital, perawatan luka, dan pemberian obat injeksi/infus.',
    displayOrder: 2,
    status: 'active',
    createdAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    createdBy: { id: 'usr-superadmin-01', name: 'Administrator Utama' }
  },
  {
    id: 'prod-703',
    serviceId: 'srv-7',
    name: 'Pelayanan Gizi Rawat Inap (3x Makan Utama & 2x Snack)',
    description: 'Menu makanan bernutrisi terhitung sesuai preskripsi diet dokter dan ahli gizi klinis.',
    displayOrder: 3,
    status: 'active',
    createdAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    createdBy: { id: 'usr-superadmin-01', name: 'Administrator Utama' }
  },
  {
    id: 'prod-704',
    serviceId: 'srv-7',
    name: 'Resume Medis Pasien Pulang & Surat Keterangan Rawat',
    description: 'Dokumen rekam medis ringkas untuk arsip pasien, klaim asuransi, dan jadwal kontrol rawat jalan.',
    displayOrder: 4,
    status: 'active',
    createdAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    createdBy: { id: 'usr-superadmin-01', name: 'Administrator Utama' }
  }
];

export const INITIAL_STANDARDS: ServiceStandardEntity[] = [
  {
    id: 'std-101',
    serviceId: 'srv-1',
    requirementsSummary: 'Membawa identitas resmi KTP/KK dan kartu BPJS Kesehatan bila ada.',
    procedureSummary: 'Pendaftaran -> Skrining Tanda Vital -> Pemeriksaan Dokter -> Ambil Obat / Rujukan.',
    serviceTime: '15 - 30 Menit per Pasien',
    serviceProductSummary: 'Resep Obat, Catatan Rekam Medis, Surat Keterangan / Rujukan.',
    facilities: 'Stetoskop, Tensimeter Digital, Bed Pemeriksaan, Termometer Non-Kontak, Oksimeter',
    executorCompetency: 'Dokter Umum Terregistrasi SIP Aktif & Perawat Terlatih BerSTR',
    supervision: 'Pengawasan berkala Kepala Puskesmas & Tim Mutu Internal',
    complaintChannelSummary: 'Kotak Saran, WhatsApp Pengaduan Resmi, atau Website Puskesmas',
    evaluation: 'Survei Kepuasan Masyarakat (SKM) berkala per triwulan',
    additionalInformation: 'Pelayanan berbasis standar Integrasi Layanan Primer (ILP) Permenkes No. 19 Tahun 2024.',
    createdAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    createdBy: { id: 'usr-superadmin-01', name: 'Administrator Utama' }
  },
  {
    id: 'std-701',
    serviceId: 'srv-7',
    requirementsSummary: 'SPRI dokter pemeriksa, KTP/KK, kartu BPJS Kesehatan/KIS aktif, serta persetujuan wali pasien.',
    procedureSummary: 'Pemeriksaan UGD/Poli -> Pendaftaran Rawat Inap -> Asuhan 24 Jam & Visite DPJP -> Konsultasi Gizi -> Resume Medis & Pemulangan.',
    serviceTime: '24 Jam Standby (Lama rawat rata-rata / ALOS: 2 - 4 hari sesuai indikasi klinis).',
    serviceProductSummary: 'Asuhan Medis Visite DPJP, Asuhan Keperawatan 24 Jam, Paket Terapi Obat, Makanan Pasien 3x Sehari, Resume Medis.',
    facilities: 'Tempat tidur medis elektrik/manual, oksigen central/tabung, monitor tanda vital, nebulizer, suction, nurse station 24 jam, kamar mandi dalam, AC/kipas, instalasi gizi.',
    executorCompetency: 'Dokter Umum bersertifikat ATLS/ACLS, Perawat bersertifikat PPGD/BTCLS dengan STR aktif, Bidan APN, dan Nutrisionis/Dietisien terlisensi.',
    supervision: 'Supervisi Kepala Puskesmas, Tim Mutu & Keselamatan Pasien, serta Audit Klinis Berkala.',
    complaintChannelSummary: 'Kotak Saran Ruang Rawat Inap, WhatsApp Resmi Puskesmas, Petugas Layanan Informasi & Pengaduan, atau Form Online.',
    evaluation: 'Survei Kepuasan Pasien Rawat Inap berkala, Angka Keselamatan Pasien (Patient Safety), dan Audit Lama Hari Rawat (ALOS).',
    additionalInformation: 'Sesuai Standar Akreditasi Puskesmas Kemenkes RI dan Integrasi Layanan Primer (ILP) Permenkes No. 19 Tahun 2024.',
    createdAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    createdBy: { id: 'usr-superadmin-01', name: 'Administrator Utama' }
  }
];

// Storage & Synchronization Helpers
function getStoredRequirements(): ServiceRequirementEntity[] {
  try {
    const data = localStorage.getItem(REQUIREMENTS_STORAGE_KEY);
    if (!data) {
      fetch('/api/db/service_requirements').then(r => r.json()).then(res => {
        const arrData = Array.isArray(res) ? res : (res && Array.isArray(res.docs) ? res.docs : (res && res.success && Array.isArray(res.data) ? res.data : null)); if (arrData) {
          localStorage.setItem(REQUIREMENTS_STORAGE_KEY, JSON.stringify(arrData));
        }
      }).catch(() => {});
      return [];
    }
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function saveStoredRequirements(items: ServiceRequirementEntity[]) {
  try {
    localStorage.setItem(REQUIREMENTS_STORAGE_KEY, JSON.stringify(items));
    saveSingleDocument('service_engine', 'requirements', items, REQUIREMENTS_STORAGE_KEY).catch(() => {});
    fetch('/api/db/service_requirements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(items)
    }).catch(() => {});
  } catch (err) {
    console.error('Failed to save requirements:', err);
  }
}

function getStoredProcedures(): ServiceProcedureEntity[] {
  try {
    const data = localStorage.getItem(PROCEDURES_STORAGE_KEY);
    if (!data) {
      fetch('/api/db/service_procedures').then(r => r.json()).then(res => {
        const arrData = Array.isArray(res) ? res : (res && Array.isArray(res.docs) ? res.docs : (res && res.success && Array.isArray(res.data) ? res.data : null)); if (arrData) {
          localStorage.setItem(PROCEDURES_STORAGE_KEY, JSON.stringify(arrData));
        }
      }).catch(() => {});
      return [];
    }
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function saveStoredProcedures(items: ServiceProcedureEntity[]) {
  try {
    localStorage.setItem(PROCEDURES_STORAGE_KEY, JSON.stringify(items));
    saveSingleDocument('service_engine', 'procedures', items, PROCEDURES_STORAGE_KEY).catch(() => {});
    fetch('/api/db/service_procedures', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(items)
    }).catch(() => {});
  } catch (err) {
    console.error('Failed to save procedures:', err);
  }
}

function getStoredProducts(): ServiceProductEntity[] {
  try {
    const data = localStorage.getItem(PRODUCTS_STORAGE_KEY);
    if (!data) {
      fetch('/api/db/service_products').then(r => r.json()).then(res => {
        const arrData = Array.isArray(res) ? res : (res && Array.isArray(res.docs) ? res.docs : (res && res.success && Array.isArray(res.data) ? res.data : null)); if (arrData) {
          localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(arrData));
        }
      }).catch(() => {});
      return [];
    }
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function saveStoredProducts(items: ServiceProductEntity[]) {
  try {
    localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(items));
    saveSingleDocument('service_engine', 'products', items, PRODUCTS_STORAGE_KEY).catch(() => {});
    fetch('/api/db/service_products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(items)
    }).catch(() => {});
  } catch (err) {
    console.error('Failed to save products:', err);
  }
}

function getStoredStandards(): ServiceStandardEntity[] {
  try {
    const data = localStorage.getItem(STANDARDS_STORAGE_KEY);
    if (!data) {
      fetch('/api/db/service_standards').then(r => r.json()).then(res => {
        const arrData = Array.isArray(res) ? res : (res && Array.isArray(res.docs) ? res.docs : (res && res.success && Array.isArray(res.data) ? res.data : null)); if (arrData) {
          localStorage.setItem(STANDARDS_STORAGE_KEY, JSON.stringify(arrData));
        }
      }).catch(() => {});
      return [];
    }
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function saveStoredStandards(items: ServiceStandardEntity[]) {
  try {
    localStorage.setItem(STANDARDS_STORAGE_KEY, JSON.stringify(items));
    saveSingleDocument('service_engine', 'standards', items, STANDARDS_STORAGE_KEY).catch(() => {});
    fetch('/api/db/service_standards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(items)
    }).catch(() => {});
  } catch (err) {
    console.error('Failed to save standards:', err);
  }
}

function getStoredServices(): ServiceEntity[] {
  try {
    const data = localStorage.getItem(SERVICES_STORAGE_KEY);
    if (!data) {
      fetch('/api/db/services').then(r => r.json()).then(res => {
        const arrData = Array.isArray(res) ? res : (res && Array.isArray(res.docs) ? res.docs : (res && res.success && Array.isArray(res.data) ? res.data : null)); if (arrData) {
          localStorage.setItem(SERVICES_STORAGE_KEY, JSON.stringify(arrData));
        }
      }).catch(() => {});
      return [];
    }
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function saveStoredServices(services: ServiceEntity[]) {
  try {
    localStorage.setItem(SERVICES_STORAGE_KEY, JSON.stringify(services));
    saveSingleDocument('service_engine', 'services', services, SERVICES_STORAGE_KEY).catch(() => {});
    fetch('/api/db/services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(services)
    }).catch(() => {});
  } catch (err) {
    console.error('Failed to save services:', err);
  }
}

function getStoredCategories(): ServiceCategoryEntity[] {
  try {
    const data = localStorage.getItem(CATEGORIES_STORAGE_KEY);
    if (!data) {
      fetch('/api/db/service_categories').then(r => r.json()).then(res => {
        const arrData = Array.isArray(res) ? res : (res && Array.isArray(res.docs) ? res.docs : (res && res.success && Array.isArray(res.data) ? res.data : null)); if (arrData) {
          localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(arrData));
        }
      }).catch(() => {});
      return [];
    }
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function saveStoredCategories(categories: ServiceCategoryEntity[]) {
  try {
    localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
    saveSingleDocument('service_engine', 'categories', categories, CATEGORIES_STORAGE_KEY).catch(() => {});
    fetch('/api/db/service_categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(categories)
    }).catch(() => {});
  } catch (err) {
    console.error('Failed to save categories:', err);
  }
}

function getStoredClusters(): ServiceClusterEntity[] {
  try {
    const data = localStorage.getItem(CLUSTERS_STORAGE_KEY);
    if (!data) {
      fetch('/api/db/service_clusters').then(r => r.json()).then(res => {
        const arrData = Array.isArray(res) ? res : (res && Array.isArray(res.docs) ? res.docs : (res && res.success && Array.isArray(res.data) ? res.data : null)); if (arrData) {
          localStorage.setItem(CLUSTERS_STORAGE_KEY, JSON.stringify(arrData));
        }
      }).catch(() => {});
      return [];
    }
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function saveStoredClusters(clusters: ServiceClusterEntity[]) {
  try {
    localStorage.setItem(CLUSTERS_STORAGE_KEY, JSON.stringify(clusters));
    saveSingleDocument('service_engine', 'clusters', clusters, CLUSTERS_STORAGE_KEY).catch(() => {});
    fetch('/api/db/service_clusters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(clusters)
    }).catch(() => {});
  } catch (err) {
    console.error('Failed to save clusters:', err);
  }
}

function getStoredUnits(): ServiceUnitEntity[] {
  try {
    const data = localStorage.getItem(UNITS_STORAGE_KEY);
    if (!data) {
      fetch('/api/db/service_units').then(r => r.json()).then(res => {
        const arrData = Array.isArray(res) ? res : (res && Array.isArray(res.docs) ? res.docs : (res && res.success && Array.isArray(res.data) ? res.data : null)); if (arrData) {
          localStorage.setItem(UNITS_STORAGE_KEY, JSON.stringify(arrData));
        }
      }).catch(() => {});
      return [];
    }
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function saveStoredUnits(units: ServiceUnitEntity[]) {
  try {
    localStorage.setItem(UNITS_STORAGE_KEY, JSON.stringify(units));
    saveSingleDocument('service_engine', 'units', units, UNITS_STORAGE_KEY).catch(() => {});
    fetch('/api/db/service_units', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(units)
    }).catch(() => {});
  } catch (err) {
    console.error('Failed to save units:', err);
  }
}

function getStoredLocations(): ServiceLocationEntity[] {
  try {
    const data = localStorage.getItem(LOCATIONS_STORAGE_KEY);
    if (!data) {
      fetch('/api/db/service_locations').then(r => r.json()).then(res => {
        const arrData = Array.isArray(res) ? res : (res && Array.isArray(res.docs) ? res.docs : (res && res.success && Array.isArray(res.data) ? res.data : null)); if (arrData) {
          localStorage.setItem(LOCATIONS_STORAGE_KEY, JSON.stringify(arrData));
        }
      }).catch(() => {});
      return [];
    }
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function saveStoredLocations(locations: ServiceLocationEntity[]) {
  try {
    localStorage.setItem(LOCATIONS_STORAGE_KEY, JSON.stringify(locations));
    saveSingleDocument('service_engine', 'locations', locations, LOCATIONS_STORAGE_KEY).catch(() => {});
    fetch('/api/db/service_locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(locations)
    }).catch(() => {});
  } catch (err) {
    console.error('Failed to save locations:', err);
  }
}

export function generateSlug(text: string, currentId?: string, existingItems: { id: string; slug: string }[] = []): string {
  let baseSlug = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');

  if (!baseSlug) baseSlug = 'item-baru';

  let uniqueSlug = baseSlug;
  let counter = 1;

  while (existingItems.some(item => item.slug === uniqueSlug && item.id !== currentId)) {
    uniqueSlug = `${baseSlug}-${counter}`;
    counter++;
  }

  return uniqueSlug;
}

export const serviceEngineService = {
  // ==================== CLUSTERS CRUD ====================
  async getClusters(filter?: { search?: string; status?: string }): Promise<ServiceClusterEntity[]> {
    let clusters = getStoredClusters();
    const services = getStoredServices();
    const categories = getStoredCategories();

    if (filter) {
      if (filter.status) {
        clusters = clusters.filter(c => c.status === filter.status);
      }
      if (filter.search) {
        const q = filter.search.toLowerCase();
        clusters = clusters.filter(
          c => c.name.toLowerCase().includes(q) || (c.description && c.description.toLowerCase().includes(q))
        );
      }
    }

    return clusters
      .map(c => ({
        ...c,
        categoryCount: categories.filter(cat => cat.clusterId === c.id && cat.status !== 'archived').length,
        serviceCount: services.filter(s => s.clusterId === c.id && s.status !== 'archived').length
      }))
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  },

  async getClusterById(id: string): Promise<ServiceClusterEntity | null> {
    const clusters = await this.getClusters();
    return clusters.find(c => c.id === id) || null;
  },

  async createCluster(
    data: Partial<ServiceClusterEntity>,
    actor: { id: string; email: string; name: string }
  ): Promise<ServiceClusterEntity> {
    const clusters = getStoredClusters();
    const name = data.name?.trim();
    if (!name) throw new Error('Nama klaster wajib diisi');

    const slug = data.slug
      ? generateSlug(data.slug, undefined, clusters)
      : generateSlug(name, undefined, clusters);

    const newCluster: ServiceClusterEntity = {
      id: `cls-${Date.now()}`,
      name,
      slug,
      description: data.description || '',
      status: data.status || 'active',
      displayOrder: typeof data.displayOrder === 'number' ? data.displayOrder : clusters.length + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: { id: actor.id, name: actor.name, email: actor.email }
    };

    saveStoredClusters([...clusters, newCluster]);

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'CREATE',
      module: 'SERVICE_CLUSTERS',
      targetId: newCluster.id,
      targetName: newCluster.name,
      description: `Membuat klaster pelayanan baru: "${newCluster.name}"`
    });

    return newCluster;
  },

  async updateCluster(
    id: string,
    updates: Partial<ServiceClusterEntity>,
    actor: { id: string; email: string; name: string }
  ): Promise<ServiceClusterEntity> {
    const clusters = getStoredClusters();
    const index = clusters.findIndex(c => c.id === id);
    if (index === -1) throw new Error('Klaster tidak ditemukan');

    const existing = clusters[index];
    let slug = existing.slug;
    if (updates.slug && updates.slug !== existing.slug) {
      slug = generateSlug(updates.slug, id, clusters);
    } else if (updates.name && updates.name !== existing.name && !updates.slug) {
      slug = generateSlug(updates.name, id, clusters);
    }

    const updatedCluster: ServiceClusterEntity = {
      ...existing,
      ...updates,
      slug,
      updatedAt: new Date().toISOString(),
      updatedBy: { id: actor.id, name: actor.name, email: actor.email }
    };

    clusters[index] = updatedCluster;
    saveStoredClusters(clusters);

    // Sync cluster name in categories and services
    if (updatedCluster.name !== existing.name) {
      const categories = getStoredCategories().map(cat =>
        cat.clusterId === id ? { ...cat, clusterName: updatedCluster.name } : cat
      );
      saveStoredCategories(categories);

      const services = getStoredServices().map(s =>
        s.clusterId === id ? { ...s, clusterName: updatedCluster.name } : s
      );
      saveStoredServices(services);
    }

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'UPDATE',
      module: 'SERVICE_CLUSTERS',
      targetId: updatedCluster.id,
      targetName: updatedCluster.name,
      description: `Memperbarui klaster pelayanan: "${updatedCluster.name}" (Status: ${updatedCluster.status})`
    });

    return updatedCluster;
  },

  async archiveCluster(id: string, actor: { id: string; email: string; name: string }): Promise<ServiceClusterEntity> {
    return this.updateCluster(id, { status: 'archived' }, actor);
  },

  async deleteCluster(id: string, actor: { id: string; email: string; name: string }): Promise<void> {
    const clusters = getStoredClusters();
    const target = clusters.find(c => c.id === id);
    if (!target) return;

    // Check usage
    const services = getStoredServices();
    const categories = getStoredCategories();
    const usedByServices = services.filter(s => s.clusterId === id && s.status !== 'archived').length;
    const usedByCategories = categories.filter(cat => cat.clusterId === id && cat.status !== 'archived').length;

    if (usedByServices > 0 || usedByCategories > 0) {
      throw new Error(`Klaster tidak dapat dihapus permanen karena masih digunakan oleh ${usedByServices} layanan dan ${usedByCategories} kategori.`);
    }

    saveStoredClusters(clusters.filter(c => c.id !== id));

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'DELETE',
      module: 'SERVICE_CLUSTERS',
      targetId: target.id,
      targetName: target.name,
      description: `Menghapus klaster pelayanan permanen: "${target.name}"`
    });
  },

  // ==================== CATEGORIES CRUD ====================
  async getCategories(filter?: { search?: string; status?: string; clusterId?: string }): Promise<ServiceCategoryEntity[]> {
    let categories = getStoredCategories();
    const services = getStoredServices();
    const clusters = getStoredClusters();

    if (filter) {
      if (filter.status) {
        categories = categories.filter(c => c.status === filter.status);
      }
      if (filter.clusterId) {
        categories = categories.filter(c => c.clusterId === filter.clusterId);
      }
      if (filter.search) {
        const q = filter.search.toLowerCase();
        categories = categories.filter(
          c => c.name.toLowerCase().includes(q) || (c.description && c.description.toLowerCase().includes(q))
        );
      }
    }

    return categories
      .map(c => {
        const parentCluster = clusters.find(cls => cls.id === c.clusterId);
        return {
          ...c,
          clusterName: parentCluster ? parentCluster.name : c.clusterName,
          serviceCount: services.filter(s => s.categoryId === c.id && s.status !== 'archived').length
        };
      })
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  },

  async getCategoryById(id: string): Promise<ServiceCategoryEntity | null> {
    const categories = await this.getCategories();
    return categories.find(c => c.id === id) || null;
  },

  async createCategory(
    data: Partial<ServiceCategoryEntity>,
    actor: { id: string; email: string; name: string }
  ): Promise<ServiceCategoryEntity> {
    const categories = getStoredCategories();
    const name = data.name?.trim();
    if (!name) throw new Error('Nama kategori wajib diisi');

    const slug = data.slug
      ? generateSlug(data.slug, undefined, categories)
      : generateSlug(name, undefined, categories);

    let clusterName = '';
    if (data.clusterId) {
      const cluster = getStoredClusters().find(cls => cls.id === data.clusterId);
      if (cluster) clusterName = cluster.name;
    }

    const newCategory: ServiceCategoryEntity = {
      id: `cat-${Date.now()}`,
      name,
      slug,
      description: data.description || '',
      clusterId: data.clusterId || '',
      clusterName,
      status: data.status || 'active',
      displayOrder: typeof data.displayOrder === 'number' ? data.displayOrder : categories.length + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: { id: actor.id, name: actor.name, email: actor.email }
    };

    saveStoredCategories([...categories, newCategory]);

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'CREATE',
      module: 'SERVICE_CATEGORIES',
      targetId: newCategory.id,
      targetName: newCategory.name,
      description: `Membuat kategori layanan baru: "${newCategory.name}"`
    });

    return newCategory;
  },

  async updateCategory(
    id: string,
    updates: Partial<ServiceCategoryEntity>,
    actor: { id: string; email: string; name: string }
  ): Promise<ServiceCategoryEntity> {
    const categories = getStoredCategories();
    const index = categories.findIndex(c => c.id === id);
    if (index === -1) throw new Error('Kategori tidak ditemukan');

    const existing = categories[index];
    let slug = existing.slug;
    if (updates.slug && updates.slug !== existing.slug) {
      slug = generateSlug(updates.slug, id, categories);
    } else if (updates.name && updates.name !== existing.name && !updates.slug) {
      slug = generateSlug(updates.name, id, categories);
    }

    let clusterName = existing.clusterName;
    if (updates.clusterId !== undefined) {
      const cluster = getStoredClusters().find(cls => cls.id === updates.clusterId);
      clusterName = cluster ? cluster.name : '';
    }

    const updatedCategory: ServiceCategoryEntity = {
      ...existing,
      ...updates,
      slug,
      clusterName,
      updatedAt: new Date().toISOString(),
      updatedBy: { id: actor.id, name: actor.name, email: actor.email }
    };

    categories[index] = updatedCategory;
    saveStoredCategories(categories);

    // Sync category name in services
    if (updatedCategory.name !== existing.name) {
      const services = getStoredServices().map(s =>
        s.categoryId === id ? { ...s, categoryName: updatedCategory.name } : s
      );
      saveStoredServices(services);
    }

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'UPDATE',
      module: 'SERVICE_CATEGORIES',
      targetId: updatedCategory.id,
      targetName: updatedCategory.name,
      description: `Memperbarui kategori layanan: "${updatedCategory.name}" (Status: ${updatedCategory.status})`
    });

    return updatedCategory;
  },

  async archiveCategory(id: string, actor: { id: string; email: string; name: string }): Promise<ServiceCategoryEntity> {
    return this.updateCategory(id, { status: 'archived' }, actor);
  },

  async deleteCategory(id: string, actor: { id: string; email: string; name: string }): Promise<void> {
    const categories = getStoredCategories();
    const target = categories.find(c => c.id === id);
    if (!target) return;

    // Check usage
    const services = getStoredServices();
    const usedByServices = services.filter(s => s.categoryId === id && s.status !== 'archived').length;

    if (usedByServices > 0) {
      throw new Error(`Kategori tidak dapat dihapus permanen karena masih digunakan oleh ${usedByServices} layanan.`);
    }

    saveStoredCategories(categories.filter(c => c.id !== id));

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'DELETE',
      module: 'SERVICE_CATEGORIES',
      targetId: target.id,
      targetName: target.name,
      description: `Menghapus kategori layanan permanen: "${target.name}"`
    });
  },

  // ==================== UNITS CRUD ====================
  async getUnits(filter?: { search?: string; status?: string }): Promise<ServiceUnitEntity[]> {
    let units = getStoredUnits();
    const services = getStoredServices();

    if (filter) {
      if (filter.status) {
        units = units.filter(u => u.status === filter.status);
      }
      if (filter.search) {
        const q = filter.search.toLowerCase();
        units = units.filter(
          u =>
            u.name.toLowerCase().includes(q) ||
            (u.code && u.code.toLowerCase().includes(q)) ||
            (u.description && u.description.toLowerCase().includes(q))
        );
      }
    }

    return units
      .map(u => ({
        ...u,
        serviceCount: services.filter(s => s.unitId === u.id && s.status !== 'archived').length
      }))
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  },

  async getUnitById(id: string): Promise<ServiceUnitEntity | null> {
    const units = await this.getUnits();
    return units.find(u => u.id === id) || null;
  },

  async createUnit(
    data: Partial<ServiceUnitEntity>,
    actor: { id: string; email: string; name: string }
  ): Promise<ServiceUnitEntity> {
    const units = getStoredUnits();
    const name = data.name?.trim();
    if (!name) throw new Error('Nama unit pelayanan wajib diisi');

    const code = data.code?.trim().toUpperCase() || '';
    if (code && units.some(u => u.code?.toUpperCase() === code)) {
      throw new Error(`Kode unit "${code}" sudah digunakan.`);
    }

    const newUnit: ServiceUnitEntity = {
      id: `unit-${Date.now()}`,
      name,
      code,
      description: data.description || '',
      status: data.status || 'active',
      displayOrder: typeof data.displayOrder === 'number' ? data.displayOrder : units.length + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: { id: actor.id, name: actor.name, email: actor.email }
    };

    saveStoredUnits([...units, newUnit]);

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'CREATE',
      module: 'SERVICE_UNITS',
      targetId: newUnit.id,
      targetName: newUnit.name,
      description: `Membuat unit pelayanan baru: "${newUnit.name}" (${newUnit.code || 'Tanpa Kode'})`
    });

    return newUnit;
  },

  async updateUnit(
    id: string,
    updates: Partial<ServiceUnitEntity>,
    actor: { id: string; email: string; name: string }
  ): Promise<ServiceUnitEntity> {
    const units = getStoredUnits();
    const index = units.findIndex(u => u.id === id);
    if (index === -1) throw new Error('Unit pelayanan tidak ditemukan');

    const existing = units[index];

    const code = updates.code !== undefined ? updates.code.trim().toUpperCase() : existing.code;
    if (code && units.some(u => u.code?.toUpperCase() === code && u.id !== id)) {
      throw new Error(`Kode unit "${code}" sudah digunakan.`);
    }

    const updatedUnit: ServiceUnitEntity = {
      ...existing,
      ...updates,
      code,
      updatedAt: new Date().toISOString(),
      updatedBy: { id: actor.id, name: actor.name, email: actor.email }
    };

    units[index] = updatedUnit;
    saveStoredUnits(units);

    // Sync unit name in services
    if (updatedUnit.name !== existing.name) {
      const services = getStoredServices().map(s =>
        s.unitId === id ? { ...s, unitName: updatedUnit.name } : s
      );
      saveStoredServices(services);
    }

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'UPDATE',
      module: 'SERVICE_UNITS',
      targetId: updatedUnit.id,
      targetName: updatedUnit.name,
      description: `Memperbarui unit pelayanan: "${updatedUnit.name}" (Status: ${updatedUnit.status})`
    });

    return updatedUnit;
  },

  async archiveUnit(id: string, actor: { id: string; email: string; name: string }): Promise<ServiceUnitEntity> {
    return this.updateUnit(id, { status: 'archived' }, actor);
  },

  async deleteUnit(id: string, actor: { id: string; email: string; name: string }): Promise<void> {
    const units = getStoredUnits();
    const target = units.find(u => u.id === id);
    if (!target) return;

    // Check usage
    const services = getStoredServices();
    const usedByServices = services.filter(s => s.unitId === id && s.status !== 'archived').length;

    if (usedByServices > 0) {
      throw new Error(`Unit pelayanan tidak dapat dihapus permanen karena masih digunakan oleh ${usedByServices} layanan.`);
    }

    saveStoredUnits(units.filter(u => u.id !== id));

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'DELETE',
      module: 'SERVICE_UNITS',
      targetId: target.id,
      targetName: target.name,
      description: `Menghapus unit pelayanan permanen: "${target.name}"`
    });
  },

  // ==================== LOCATIONS CRUD ====================
  async getLocations(filter?: { search?: string; status?: string }): Promise<ServiceLocationEntity[]> {
    let locations = getStoredLocations();
    const services = getStoredServices();

    if (filter) {
      if (filter.status) {
        locations = locations.filter(l => l.status === filter.status);
      }
      if (filter.search) {
        const q = filter.search.toLowerCase();
        locations = locations.filter(
          l =>
            l.name.toLowerCase().includes(q) ||
            (l.building && l.building.toLowerCase().includes(q)) ||
            (l.room && l.room.toLowerCase().includes(q)) ||
            (l.description && l.description.toLowerCase().includes(q))
        );
      }
    }

    return locations
      .map(l => ({
        ...l,
        serviceCount: services.filter(s => s.locationId === l.id && s.status !== 'archived').length
      }))
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  },

  async getLocationById(id: string): Promise<ServiceLocationEntity | null> {
    const locations = await this.getLocations();
    return locations.find(l => l.id === id) || null;
  },

  async createLocation(
    data: Partial<ServiceLocationEntity>,
    actor: { id: string; email: string; name: string }
  ): Promise<ServiceLocationEntity> {
    const locations = getStoredLocations();
    const name = data.name?.trim();
    if (!name) throw new Error('Nama lokasi layanan wajib diisi');

    const newLocation: ServiceLocationEntity = {
      id: `loc-${Date.now()}`,
      name,
      building: data.building || '',
      floor: data.floor || '',
      room: data.room || '',
      description: data.description || '',
      status: data.status || 'active',
      displayOrder: typeof data.displayOrder === 'number' ? data.displayOrder : locations.length + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: { id: actor.id, name: actor.name, email: actor.email }
    };

    saveStoredLocations([...locations, newLocation]);

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'CREATE',
      module: 'SERVICE_LOCATIONS',
      targetId: newLocation.id,
      targetName: newLocation.name,
      description: `Membuat lokasi pelayanan baru: "${newLocation.name}" (${newLocation.building || ''} ${newLocation.room || ''})`
    });

    return newLocation;
  },

  async updateLocation(
    id: string,
    updates: Partial<ServiceLocationEntity>,
    actor: { id: string; email: string; name: string }
  ): Promise<ServiceLocationEntity> {
    const locations = getStoredLocations();
    const index = locations.findIndex(l => l.id === id);
    if (index === -1) throw new Error('Lokasi pelayanan tidak ditemukan');

    const existing = locations[index];

    const updatedLocation: ServiceLocationEntity = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
      updatedBy: { id: actor.id, name: actor.name, email: actor.email }
    };

    locations[index] = updatedLocation;
    saveStoredLocations(locations);

    // Sync location name in services
    if (updatedLocation.name !== existing.name) {
      const services = getStoredServices().map(s =>
        s.locationId === id ? { ...s, locationName: updatedLocation.name } : s
      );
      saveStoredServices(services);
    }

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'UPDATE',
      module: 'SERVICE_LOCATIONS',
      targetId: updatedLocation.id,
      targetName: updatedLocation.name,
      description: `Memperbarui lokasi pelayanan: "${updatedLocation.name}" (Status: ${updatedLocation.status})`
    });

    return updatedLocation;
  },

  async archiveLocation(id: string, actor: { id: string; email: string; name: string }): Promise<ServiceLocationEntity> {
    return this.updateLocation(id, { status: 'archived' }, actor);
  },

  async deleteLocation(id: string, actor: { id: string; email: string; name: string }): Promise<void> {
    const locations = getStoredLocations();
    const target = locations.find(l => l.id === id);
    if (!target) return;

    // Check usage
    const services = getStoredServices();
    const usedByServices = services.filter(s => s.locationId === id && s.status !== 'archived').length;

    if (usedByServices > 0) {
      throw new Error(`Lokasi pelayanan tidak dapat dihapus permanen karena masih digunakan oleh ${usedByServices} layanan.`);
    }

    saveStoredLocations(locations.filter(l => l.id !== id));

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'DELETE',
      module: 'SERVICE_LOCATIONS',
      targetId: target.id,
      targetName: target.name,
      description: `Menghapus lokasi pelayanan permanen: "${target.name}"`
    });
  },

  // ==================== SERVICES CORE (Phase 4A) ====================
  async getServices(filter?: {
    search?: string;
    status?: string;
    categoryId?: string;
    clusterId?: string;
    unitId?: string;
    locationId?: string;
    featured?: boolean;
  }): Promise<ServiceEntity[]> {
    let services = getStoredServices();
    const categories = getStoredCategories();
    const clusters = getStoredClusters();
    const units = getStoredUnits();
    const locations = getStoredLocations();

    if (filter) {
      if (filter.status) {
        services = services.filter(s => s.status === filter.status);
      }
      if (filter.categoryId) {
        services = services.filter(s => s.categoryId === filter.categoryId);
      }
      if (filter.clusterId) {
        services = services.filter(s => s.clusterId === filter.clusterId);
      }
      if (filter.unitId) {
        services = services.filter(s => s.unitId === filter.unitId);
      }
      if (filter.locationId) {
        services = services.filter(s => s.locationId === filter.locationId);
      }
      if (filter.featured !== undefined) {
        services = services.filter(s => s.featured === filter.featured);
      }
      if (filter.search) {
        const q = filter.search.toLowerCase();
        services = services.filter(
          s =>
            s.name.toLowerCase().includes(q) ||
            s.shortDescription.toLowerCase().includes(q) ||
            s.description.toLowerCase().includes(q)
        );
      }
    }

    // Resolve relation names dynamically
    return services
      .map(s => {
        const cat = categories.find(c => c.id === s.categoryId);
        const cls = clusters.find(c => c.id === s.clusterId);
        const unit = units.find(u => u.id === s.unitId);
        const loc = locations.find(l => l.id === s.locationId);

        return {
          ...s,
          categoryName: cat ? cat.name : s.categoryName,
          clusterName: cls ? cls.name : s.clusterName,
          unitName: unit ? unit.name : s.unitName,
          locationName: loc ? loc.name : s.locationName
        };
      })
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  },

  async getPublishedServices(): Promise<ServiceEntity[]> {
    const services = await this.getServices({ status: 'published' });
    return services.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  },

  async getServiceById(id: string): Promise<ServiceEntity | null> {
    const services = await this.getServices();
    return services.find(s => s.id === id) || null;
  },

  async getServiceBySlug(slug: string): Promise<ServiceEntity | null> {
    const services = await this.getServices();
    const cleanSlug = slug.toLowerCase();
    return services.find(s => s.slug.toLowerCase() === cleanSlug) || null;
  },

  async createService(
    data: Partial<ServiceEntity>,
    actor: { id: string; email: string; name: string }
  ): Promise<ServiceEntity> {
    const services = getStoredServices();

    const name = data.name?.trim() || 'Layanan Baru';
    const slug = data.slug
      ? generateSlug(data.slug, undefined, services)
      : generateSlug(name, undefined, services);

    let categoryName = '';
    if (data.categoryId) {
      const cat = getStoredCategories().find(c => c.id === data.categoryId);
      if (cat) categoryName = cat.name;
    }

    let clusterName = '';
    if (data.clusterId) {
      const cls = getStoredClusters().find(c => c.id === data.clusterId);
      if (cls) clusterName = cls.name;
    }

    let unitName = '';
    if (data.unitId) {
      const u = getStoredUnits().find(unit => unit.id === data.unitId);
      if (u) unitName = u.name;
    }

    let locationName = '';
    if (data.locationId) {
      const loc = getStoredLocations().find(l => l.id === data.locationId);
      if (loc) locationName = loc.name;
    }

    const newService: ServiceEntity = {
      id: `srv-${Date.now()}`,
      name,
      slug,
      shortDescription: data.shortDescription || '',
      description: data.description || '',
      status: data.status || 'draft',
      categoryId: data.categoryId || '',
      categoryName,
      clusterId: data.clusterId || '',
      clusterName,
      unitId: data.unitId || '',
      unitName,
      locationId: data.locationId || '',
      locationName,
      featured: Boolean(data.featured),
      displayOrder: typeof data.displayOrder === 'number' ? data.displayOrder : services.length + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: { id: actor.id, name: actor.name, email: actor.email },
      publishedAt: data.status === 'published' ? new Date().toISOString() : undefined,
      publishedBy: data.status === 'published' ? { id: actor.id, name: actor.name } : undefined,
      seoTitle: data.seoTitle || name,
      seoDescription: data.seoDescription || data.shortDescription || ''
    };

    const updated = [...services, newService];
    saveStoredServices(updated);

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'CREATE',
      module: 'SERVICES',
      targetId: newService.id,
      targetName: newService.name,
      description: `Membuat layanan kesehatan baru: "${newService.name}" (Status: ${newService.status})`
    });

    return newService;
  },

  async updateService(
    id: string,
    updates: Partial<ServiceEntity>,
    actor: { id: string; email: string; name: string }
  ): Promise<ServiceEntity> {
    const services = getStoredServices();
    const index = services.findIndex(s => s.id === id);
    if (index === -1) throw new Error('Layanan tidak ditemukan');

    const existing = services[index];

    let slug = existing.slug;
    if (updates.slug && updates.slug !== existing.slug) {
      slug = generateSlug(updates.slug, id, services);
    }

    let categoryName = existing.categoryName;
    if (updates.categoryId !== undefined) {
      const cat = getStoredCategories().find(c => c.id === updates.categoryId);
      categoryName = cat ? cat.name : '';
    }

    let clusterName = existing.clusterName;
    if (updates.clusterId !== undefined) {
      const cls = getStoredClusters().find(c => c.id === updates.clusterId);
      clusterName = cls ? cls.name : '';
    }

    let unitName = existing.unitName;
    if (updates.unitId !== undefined) {
      const u = getStoredUnits().find(unit => unit.id === updates.unitId);
      unitName = u ? u.name : '';
    }

    let locationName = existing.locationName;
    if (updates.locationId !== undefined) {
      const loc = getStoredLocations().find(l => l.id === updates.locationId);
      locationName = loc ? loc.name : '';
    }

    const isNowPublishing = updates.status === 'published' && existing.status !== 'published';

    const updatedService: ServiceEntity = {
      ...existing,
      ...updates,
      slug,
      categoryName,
      clusterName,
      unitName,
      locationName,
      updatedAt: new Date().toISOString(),
      updatedBy: { id: actor.id, name: actor.name, email: actor.email },
      publishedAt: isNowPublishing ? new Date().toISOString() : existing.publishedAt,
      publishedBy: isNowPublishing ? { id: actor.id, name: actor.name } : existing.publishedBy
    };

    services[index] = updatedService;
    saveStoredServices(services);

    let actionName: 'UPDATE' | 'PUBLISH' | 'UNPUBLISH' = 'UPDATE';
    if (isNowPublishing) actionName = 'PUBLISH';
    else if (updates.status === 'draft' && existing.status === 'published') actionName = 'UNPUBLISH';

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: actionName,
      module: 'SERVICES',
      targetId: updatedService.id,
      targetName: updatedService.name,
      description: `Memperbarui layanan kesehatan: "${updatedService.name}" (Status: ${updatedService.status})`
    });

    return updatedService;
  },

  // ==================== PHASE 4I: APPROVAL & WORKFLOW ENGINE ====================
  async validateServiceForSubmit(id: string): Promise<{ valid: boolean; missingItems: string[] }> {
    const service = await this.getServiceById(id);
    if (!service) return { valid: false, missingItems: ['Layanan tidak ditemukan'] };

    const missingItems: string[] = [];

    if (!service.name?.trim()) missingItems.push('Nama Layanan belum diisi');
    if (!service.shortDescription || service.shortDescription.trim().length < 20) {
      missingItems.push('Deskripsi Singkat minimal 20 karakter');
    }
    if (!service.description || service.description.trim().length < 50) {
      missingItems.push('Deskripsi Lengkap minimal 50 karakter');
    }
    if (!service.categoryId) missingItems.push('Kategori Layanan belum dipilih');
    if (!service.clusterId) missingItems.push('Klaster Layanan belum dipilih');
    if (!service.unitId) missingItems.push('Unit Pelayanan belum dipilih');
    if (!service.locationId) missingItems.push('Lokasi Pelayanan belum dipilih');

    const [reqs, procs, prods, sch] = await Promise.all([
      this.getRequirementsByServiceId(id),
      this.getProceduresByServiceId(id),
      this.getProductsByServiceId(id),
      this.getServiceSchedule(id)
    ]);

    if (reqs.length === 0) missingItems.push('Persyaratan Layanan minimal 1 butir');
    if (procs.length === 0) missingItems.push('Prosedur/Alur Pelayanan minimal 1 langkah');
    if (prods.length === 0) missingItems.push('Produk/Output Pelayanan minimal 1 item');
    if (!sch || sch.weeklyRules.length === 0) missingItems.push('Jadwal Operasional Belum Dikonfigurasi');

    return {
      valid: missingItems.length === 0,
      missingItems
    };
  },

  async submitForReview(id: string, actor: { id: string; email: string; name: string }): Promise<ServiceEntity> {
    const validation = await this.validateServiceForSubmit(id);
    if (!validation.valid) {
      throw new Error(`Pengajuan gagal. Data belum lengkap:\n- ${validation.missingItems.join('\n- ')}`);
    }

    const services = getStoredServices();
    const index = services.findIndex(s => s.id === id);
    if (index === -1) throw new Error('Layanan tidak ditemukan');

    const existing = services[index];
    const now = new Date().toISOString();

    const updatedService: ServiceEntity = {
      ...existing,
      status: 'pending_review',
      submittedAt: now,
      submittedBy: { id: actor.id, name: actor.name, email: actor.email },
      rejectionReason: undefined,
      updatedAt: now,
      updatedBy: { id: actor.id, name: actor.name, email: actor.email }
    };

    services[index] = updatedService;
    saveStoredServices(services);

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'UPDATE',
      module: 'SERVICES',
      targetId: updatedService.id,
      targetName: updatedService.name,
      description: `Mengajukan layanan kesehatan "${updatedService.name}" untuk ditinjau (Pending Review)`
    });

    return updatedService;
  },

  async approveService(id: string, actor: { id: string; email: string; name: string }): Promise<ServiceEntity> {
    const services = getStoredServices();
    const index = services.findIndex(s => s.id === id);
    if (index === -1) throw new Error('Layanan tidak ditemukan');

    const existing = services[index];
    const now = new Date().toISOString();

    const updatedService: ServiceEntity = {
      ...existing,
      status: 'approved',
      reviewedAt: now,
      reviewedBy: { id: actor.id, name: actor.name, email: actor.email },
      updatedAt: now,
      updatedBy: { id: actor.id, name: actor.name, email: actor.email }
    };

    services[index] = updatedService;
    saveStoredServices(services);

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'UPDATE',
      module: 'SERVICES',
      targetId: updatedService.id,
      targetName: updatedService.name,
      description: `Menyetujui pengajuan layanan kesehatan "${updatedService.name}" (Status: Disetujui)`
    });

    return updatedService;
  },

  async rejectService(
    id: string,
    reason: string,
    actor: { id: string; email: string; name: string }
  ): Promise<ServiceEntity> {
    const cleanReason = reason.trim();
    if (!cleanReason) {
      throw new Error('Alasan penolakan / pengembalian pengajuan wajib diisi.');
    }

    const services = getStoredServices();
    const index = services.findIndex(s => s.id === id);
    if (index === -1) throw new Error('Layanan tidak ditemukan');

    const existing = services[index];
    const now = new Date().toISOString();

    const updatedService: ServiceEntity = {
      ...existing,
      status: 'rejected',
      rejectionReason: cleanReason,
      reviewedAt: now,
      reviewedBy: { id: actor.id, name: actor.name, email: actor.email },
      updatedAt: now,
      updatedBy: { id: actor.id, name: actor.name, email: actor.email }
    };

    services[index] = updatedService;
    saveStoredServices(services);

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'UPDATE',
      module: 'SERVICES',
      targetId: updatedService.id,
      targetName: updatedService.name,
      description: `Mengembalikan pengajuan layanan "${updatedService.name}" untuk diperbaiki. Alasan: "${cleanReason}"`
    });

    return updatedService;
  },

  async publishService(id: string, actor: { id: string; email: string; name: string }): Promise<ServiceEntity> {
    const services = getStoredServices();
    const index = services.findIndex(s => s.id === id);
    if (index === -1) throw new Error('Layanan tidak ditemukan');

    const existing = services[index];
    const now = new Date().toISOString();

    const updatedService: ServiceEntity = {
      ...existing,
      status: 'published',
      publishedAt: now,
      publishedBy: { id: actor.id, name: actor.name },
      updatedAt: now,
      updatedBy: { id: actor.id, name: actor.name, email: actor.email }
    };

    services[index] = updatedService;
    saveStoredServices(services);

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'PUBLISH',
      module: 'SERVICES',
      targetId: updatedService.id,
      targetName: updatedService.name,
      description: `Mempublikasikan layanan kesehatan "${updatedService.name}" ke direktori publik`
    });

    return updatedService;
  },

  async unpublishService(id: string, actor: { id: string; email: string; name: string }): Promise<ServiceEntity> {
    const services = getStoredServices();
    const index = services.findIndex(s => s.id === id);
    if (index === -1) throw new Error('Layanan tidak ditemukan');

    const existing = services[index];
    const now = new Date().toISOString();

    const updatedService: ServiceEntity = {
      ...existing,
      status: 'draft',
      updatedAt: now,
      updatedBy: { id: actor.id, name: actor.name, email: actor.email }
    };

    services[index] = updatedService;
    saveStoredServices(services);

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'UNPUBLISH',
      module: 'SERVICES',
      targetId: updatedService.id,
      targetName: updatedService.name,
      description: `Membatalkan publikasi layanan kesehatan "${updatedService.name}" (Kembali ke Draf)`
    });

    return updatedService;
  },

  async archiveService(id: string, actor: { id: string; email: string; name: string }): Promise<ServiceEntity> {
    const service = await this.updateService(id, { status: 'archived' }, actor);

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'UPDATE',
      module: 'SERVICES',
      targetId: service.id,
      targetName: service.name,
      description: `Mengarsipkan layanan kesehatan: "${service.name}"`
    });

    return service;
  },

  async deleteService(id: string, actor: { id: string; email: string; name: string }): Promise<void> {
    const services = getStoredServices();
    const target = services.find(s => s.id === id);
    if (!target) return;

    saveStoredServices(services.filter(s => s.id !== id));

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'DELETE',
      module: 'SERVICES',
      targetId: target.id,
      targetName: target.name,
      description: `Menghapus layanan kesehatan permanen: "${target.name}"`
    });
  },

  // ==========================================
  // SERVICE REQUIREMENTS (PHASE 4C)
  // ==========================================
  async getRequirementsByServiceId(serviceId: string): Promise<ServiceRequirementEntity[]> {
    const all = getStoredRequirements();
    return all
      .filter(r => r.serviceId === serviceId)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  },

  async checkDuplicateRequirementTitle(serviceId: string, title: string, excludeId?: string): Promise<boolean> {
    const all = getStoredRequirements();
    const cleanTitle = title.trim().toLowerCase();
    return all.some(r => 
      r.serviceId === serviceId && 
      r.status !== 'archived' && 
      r.id !== excludeId && 
      r.title.trim().toLowerCase() === cleanTitle
    );
  },

  async createRequirement(
    serviceId: string,
    data: Partial<ServiceRequirementEntity>,
    actor: { id: string; email: string; name: string }
  ): Promise<ServiceRequirementEntity> {
    const all = getStoredRequirements();
    const existingForService = all.filter(r => r.serviceId === serviceId);

    const title = sanitizeInput(data.title?.trim() || 'Persyaratan Baru');
    const description = sanitizeInput(data.description);

    const newReq: ServiceRequirementEntity = {
      id: `req-${Date.now()}`,
      serviceId,
      title,
      description,
      required: data.required !== undefined ? Boolean(data.required) : true,
      displayOrder: typeof data.displayOrder === 'number' ? data.displayOrder : existingForService.length + 1,
      status: data.status || 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: { id: actor.id, name: actor.name, email: actor.email }
    };

    saveStoredRequirements([...all, newReq]);

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'CREATE',
      module: 'SERVICE_REQUIREMENTS',
      targetId: newReq.id,
      targetName: newReq.title,
      description: `Membuat persyaratan baru: "${newReq.title}" untuk layanan (ID: ${serviceId})`
    });

    return newReq;
  },

  async updateRequirement(
    id: string,
    updates: Partial<ServiceRequirementEntity>,
    actor: { id: string; email: string; name: string }
  ): Promise<ServiceRequirementEntity> {
    const all = getStoredRequirements();
    const idx = all.findIndex(r => r.id === id);
    if (idx === -1) throw new Error('Persyaratan tidak ditemukan');

    const existing = all[idx];
    const updated: ServiceRequirementEntity = {
      ...existing,
      ...updates,
      title: updates.title !== undefined ? sanitizeInput(updates.title.trim()) : existing.title,
      description: updates.description !== undefined ? sanitizeInput(updates.description) : existing.description,
      updatedAt: new Date().toISOString(),
      updatedBy: { id: actor.id, name: actor.name, email: actor.email }
    };

    all[idx] = updated;
    saveStoredRequirements(all);

    let action: 'UPDATE' | 'DELETE' = 'UPDATE';
    if (updates.status === 'archived' && existing.status !== 'archived') action = 'DELETE';

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action,
      module: 'SERVICE_REQUIREMENTS',
      targetId: updated.id,
      targetName: updated.title,
      description: `Memperbarui persyaratan: "${updated.title}" (Status: ${updated.status})`
    });

    return updated;
  },

  async archiveRequirement(id: string, actor: { id: string; email: string; name: string }): Promise<ServiceRequirementEntity> {
    return this.updateRequirement(id, { status: 'archived' }, actor);
  },

  async restoreRequirement(id: string, actor: { id: string; email: string; name: string }): Promise<ServiceRequirementEntity> {
    return this.updateRequirement(id, { status: 'active' }, actor);
  },

  async reorderRequirements(
    serviceId: string,
    orderedIds: string[],
    actor: { id: string; email: string; name: string }
  ): Promise<ServiceRequirementEntity[]> {
    const all = getStoredRequirements();
    
    orderedIds.forEach((id, index) => {
      const idx = all.findIndex(r => r.id === id && r.serviceId === serviceId);
      if (idx !== -1) {
        all[idx].displayOrder = index + 1;
        all[idx].updatedAt = new Date().toISOString();
      }
    });

    saveStoredRequirements(all);

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'UPDATE',
      module: 'SERVICE_REQUIREMENTS',
      targetId: serviceId,
      description: `Menyusun ulang (reorder) persyaratan pelayanan.`
    });

    return this.getRequirementsByServiceId(serviceId);
  },

  // ==========================================
  // SERVICE PROCEDURES (PHASE 4C)
  // ==========================================
  async getProceduresByServiceId(serviceId: string): Promise<ServiceProcedureEntity[]> {
    const all = getStoredProcedures();
    const serviceProcs = all
      .filter(p => p.serviceId === serviceId)
      .sort((a, b) => a.displayOrder - b.displayOrder);

    return serviceProcs.map((p, idx) => ({
      ...p,
      stepNumber: idx + 1
    }));
  },

  async createProcedure(
    serviceId: string,
    data: Partial<ServiceProcedureEntity>,
    actor: { id: string; email: string; name: string }
  ): Promise<ServiceProcedureEntity> {
    const all = getStoredProcedures();
    const existingForService = all.filter(p => p.serviceId === serviceId);

    const title = sanitizeInput(data.title?.trim() || 'Langkah Prosedur Baru');
    const description = sanitizeInput(data.description);

    const newProc: ServiceProcedureEntity = {
      id: `proc-${Date.now()}`,
      serviceId,
      stepNumber: existingForService.length + 1,
      title,
      description,
      displayOrder: typeof data.displayOrder === 'number' ? data.displayOrder : existingForService.length + 1,
      status: data.status || 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: { id: actor.id, name: actor.name, email: actor.email }
    };

    saveStoredProcedures([...all, newProc]);

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'CREATE',
      module: 'SERVICE_PROCEDURES',
      targetId: newProc.id,
      targetName: newProc.title,
      description: `Membuat langkah prosedur baru: "${newProc.title}" untuk layanan (ID: ${serviceId})`
    });

    return newProc;
  },

  async updateProcedure(
    id: string,
    updates: Partial<ServiceProcedureEntity>,
    actor: { id: string; email: string; name: string }
  ): Promise<ServiceProcedureEntity> {
    const all = getStoredProcedures();
    const idx = all.findIndex(p => p.id === id);
    if (idx === -1) throw new Error('Prosedur tidak ditemukan');

    const existing = all[idx];
    const updated: ServiceProcedureEntity = {
      ...existing,
      ...updates,
      title: updates.title !== undefined ? sanitizeInput(updates.title.trim()) : existing.title,
      description: updates.description !== undefined ? sanitizeInput(updates.description) : existing.description,
      updatedAt: new Date().toISOString(),
      updatedBy: { id: actor.id, name: actor.name, email: actor.email }
    };

    all[idx] = updated;
    saveStoredProcedures(all);

    let action: 'UPDATE' | 'DELETE' = 'UPDATE';
    if (updates.status === 'archived' && existing.status !== 'archived') action = 'DELETE';

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action,
      module: 'SERVICE_PROCEDURES',
      targetId: updated.id,
      targetName: updated.title,
      description: `Memperbarui langkah prosedur: "${updated.title}" (Status: ${updated.status})`
    });

    return updated;
  },

  async archiveProcedure(id: string, actor: { id: string; email: string; name: string }): Promise<ServiceProcedureEntity> {
    return this.updateProcedure(id, { status: 'archived' }, actor);
  },

  async restoreProcedure(id: string, actor: { id: string; email: string; name: string }): Promise<ServiceProcedureEntity> {
    return this.updateProcedure(id, { status: 'active' }, actor);
  },

  async reorderProcedures(
    serviceId: string,
    orderedIds: string[],
    actor: { id: string; email: string; name: string }
  ): Promise<ServiceProcedureEntity[]> {
    const all = getStoredProcedures();
    
    orderedIds.forEach((id, index) => {
      const idx = all.findIndex(p => p.id === id && p.serviceId === serviceId);
      if (idx !== -1) {
        all[idx].displayOrder = index + 1;
        all[idx].stepNumber = index + 1;
        all[idx].updatedAt = new Date().toISOString();
      }
    });

    saveStoredProcedures(all);

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'UPDATE',
      module: 'SERVICE_PROCEDURES',
      targetId: serviceId,
      description: `Menyusun ulang (reorder) alur langkah prosedur pelayanan.`
    });

    return this.getProceduresByServiceId(serviceId);
  },

  // ==========================================
  // SERVICE PRODUCTS (PHASE 4C)
  // ==========================================
  async getProductsByServiceId(serviceId: string): Promise<ServiceProductEntity[]> {
    const all = getStoredProducts();
    return all
      .filter(p => p.serviceId === serviceId)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  },

  async createProduct(
    serviceId: string,
    data: Partial<ServiceProductEntity>,
    actor: { id: string; email: string; name: string }
  ): Promise<ServiceProductEntity> {
    const all = getStoredProducts();
    const existingForService = all.filter(p => p.serviceId === serviceId);

    const name = sanitizeInput(data.name?.trim() || 'Produk Layanan Baru');
    const description = sanitizeInput(data.description);

    const newProd: ServiceProductEntity = {
      id: `prod-${Date.now()}`,
      serviceId,
      name,
      description,
      displayOrder: typeof data.displayOrder === 'number' ? data.displayOrder : existingForService.length + 1,
      status: data.status || 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: { id: actor.id, name: actor.name, email: actor.email }
    };

    saveStoredProducts([...all, newProd]);

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'CREATE',
      module: 'SERVICE_PRODUCTS',
      targetId: newProd.id,
      targetName: newProd.name,
      description: `Membuat produk layanan baru: "${newProd.name}" untuk layanan (ID: ${serviceId})`
    });

    return newProd;
  },

  async updateProduct(
    id: string,
    updates: Partial<ServiceProductEntity>,
    actor: { id: string; email: string; name: string }
  ): Promise<ServiceProductEntity> {
    const all = getStoredProducts();
    const idx = all.findIndex(p => p.id === id);
    if (idx === -1) throw new Error('Produk layanan tidak ditemukan');

    const existing = all[idx];
    const updated: ServiceProductEntity = {
      ...existing,
      ...updates,
      name: updates.name !== undefined ? sanitizeInput(updates.name.trim()) : existing.name,
      description: updates.description !== undefined ? sanitizeInput(updates.description) : existing.description,
      updatedAt: new Date().toISOString(),
      updatedBy: { id: actor.id, name: actor.name, email: actor.email }
    };

    all[idx] = updated;
    saveStoredProducts(all);

    let action: 'UPDATE' | 'DELETE' = 'UPDATE';
    if (updates.status === 'archived' && existing.status !== 'archived') action = 'DELETE';

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action,
      module: 'SERVICE_PRODUCTS',
      targetId: updated.id,
      targetName: updated.name,
      description: `Memperbarui produk layanan: "${updated.name}" (Status: ${updated.status})`
    });

    return updated;
  },

  async archiveProduct(id: string, actor: { id: string; email: string; name: string }): Promise<ServiceProductEntity> {
    return this.updateProduct(id, { status: 'archived' }, actor);
  },

  async restoreProduct(id: string, actor: { id: string; email: string; name: string }): Promise<ServiceProductEntity> {
    return this.updateProduct(id, { status: 'active' }, actor);
  },

  async reorderProducts(
    serviceId: string,
    orderedIds: string[],
    actor: { id: string; email: string; name: string }
  ): Promise<ServiceProductEntity[]> {
    const all = getStoredProducts();
    
    orderedIds.forEach((id, index) => {
      const idx = all.findIndex(p => p.id === id && p.serviceId === serviceId);
      if (idx !== -1) {
        all[idx].displayOrder = index + 1;
        all[idx].updatedAt = new Date().toISOString();
      }
    });

    saveStoredProducts(all);

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'UPDATE',
      module: 'SERVICE_PRODUCTS',
      targetId: serviceId,
      description: `Menyusun ulang (reorder) produk output pelayanan.`
    });

    return this.getProductsByServiceId(serviceId);
  },

  // ==========================================
  // SERVICE STANDARDS (PHASE 4C)
  // ==========================================
  async getServiceStandard(serviceId: string): Promise<ServiceStandardEntity | null> {
    const all = getStoredStandards();
    return all.find(s => s.serviceId === serviceId) || null;
  },

  async saveServiceStandard(
    serviceId: string,
    data: Partial<ServiceStandardEntity>,
    actor: { id: string; email: string; name: string }
  ): Promise<ServiceStandardEntity> {
    const all = getStoredStandards();
    const idx = all.findIndex(s => s.serviceId === serviceId);

    const sanitizedData = {
      requirementsSummary: sanitizeInput(data.requirementsSummary),
      procedureSummary: sanitizeInput(data.procedureSummary),
      serviceTime: sanitizeInput(data.serviceTime),
      serviceProductSummary: sanitizeInput(data.serviceProductSummary),
      facilities: sanitizeInput(data.facilities),
      executorCompetency: sanitizeInput(data.executorCompetency),
      supervision: sanitizeInput(data.supervision),
      complaintChannelSummary: sanitizeInput(data.complaintChannelSummary),
      evaluation: sanitizeInput(data.evaluation),
      additionalInformation: sanitizeInput(data.additionalInformation)
    };

    let result: ServiceStandardEntity;

    if (idx !== -1) {
      result = {
        ...all[idx],
        ...sanitizedData,
        updatedAt: new Date().toISOString(),
        updatedBy: { id: actor.id, name: actor.name, email: actor.email }
      };
      all[idx] = result;
    } else {
      result = {
        id: `std-${Date.now()}`,
        serviceId,
        ...sanitizedData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: { id: actor.id, name: actor.name, email: actor.email }
      };
      all.push(result);
    }

    saveStoredStandards(all);

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'UPDATE',
      module: 'SERVICE_STANDARDS',
      targetId: result.id,
      targetName: `Standar Pelayanan ${serviceId}`,
      description: `Memperbarui komponen Standar Pelayanan Publik untuk layanan ID ${serviceId}`
    });

    return result;
  },

  // ==========================================
  // PHASE 4D: SERVICE SCHEDULE ENGINE
  // ==========================================
  async getServiceSchedule(serviceId: string): Promise<ServiceScheduleEntity> {
    const all = getStoredSchedules();
    let schedule = all.find(s => s.serviceId === serviceId);

    if (!schedule) {
      // Create default schedule rules for new / unconfigured service
      const defaultRules = createDefaultScheduleRules(serviceId);
      schedule = {
        id: `sch-${serviceId}`,
        serviceId,
        timezone: 'Asia/Jakarta',
        status: 'active',
        rules: defaultRules,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      all.push(schedule);
      saveStoredSchedules(all);
    }

    return schedule;
  },

  async saveServiceSchedule(
    serviceId: string,
    rules: ServiceScheduleRuleEntity[],
    timezone: string = 'Asia/Jakarta',
    actor: { id: string; email: string; name: string }
  ): Promise<ServiceScheduleEntity> {
    // Validate every rule
    for (const rule of rules) {
      if (rule.isOpen) {
        const err = validateTimeRule(rule);
        if (err) {
          throw new Error(`Validasi Jadwal (${rule.dayOfWeek}): ${err}`);
        }
      }
    }

    const all = getStoredSchedules();
    const idx = all.findIndex(s => s.serviceId === serviceId);

    const updatedSchedule: ServiceScheduleEntity = {
      id: idx !== -1 ? all[idx].id : `sch-${serviceId}`,
      serviceId,
      timezone: sanitizeInput(timezone) || 'Asia/Jakarta',
      status: 'active',
      rules,
      createdAt: idx !== -1 ? all[idx].createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: idx !== -1 ? all[idx].createdBy : { id: actor.id, name: actor.name, email: actor.email },
      updatedBy: { id: actor.id, name: actor.name, email: actor.email }
    };

    if (idx !== -1) {
      all[idx] = updatedSchedule;
    } else {
      all.push(updatedSchedule);
    }

    saveStoredSchedules(all);

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'UPDATE',
      module: 'SERVICE_SCHEDULES',
      targetId: updatedSchedule.id,
      targetName: `Jadwal Pelayanan ${serviceId}`,
      description: `Memperbarui jam operasional mingguan untuk layanan ID ${serviceId}`
    });

    return updatedSchedule;
  },

  // ==========================================
  // PHASE 4D: SCHEDULE EXCEPTIONS & SPECIAL DATES
  // ==========================================
  async getScheduleExceptionsByServiceId(
    serviceId: string,
    options: { includePast?: boolean; includeArchived?: boolean } = {}
  ): Promise<ServiceScheduleExceptionEntity[]> {
    let all = getStoredExceptions().filter(e => e.serviceId === serviceId);

    if (!options.includeArchived) {
      all = all.filter(e => e.status !== 'archived');
    }

    if (options.includePast === false) {
      const todayStr = new Date().toISOString().split('T')[0];
      all = all.filter(e => e.date >= todayStr);
    }

    return all.sort((a, b) => b.date.localeCompare(a.date));
  },

  async getAllScheduleExceptions(
    options: { includePast?: boolean; includeArchived?: boolean } = {}
  ): Promise<ServiceScheduleExceptionEntity[]> {
    let all = getStoredExceptions();

    if (!options.includeArchived) {
      all = all.filter(e => e.status !== 'archived');
    }

    if (options.includePast === false) {
      const todayStr = new Date().toISOString().split('T')[0];
      all = all.filter(e => e.date >= todayStr);
    }

    return all.sort((a, b) => b.date.localeCompare(a.date));
  },

  async createScheduleException(
    serviceId: string,
    data: Partial<ServiceScheduleExceptionEntity>,
    actor: { id: string; email: string; name: string }
  ): Promise<ServiceScheduleExceptionEntity> {
    if (!data.date) {
      throw new Error('Tanggal jadwal khusus wajib diisi.');
    }

    if (!data.reason || !data.reason.trim()) {
      throw new Error('Alasan perubahan/jadwal khusus wajib diisi.');
    }

    // Check duplicate active exception for same serviceId and date
    const all = getStoredExceptions();
    const duplicate = all.find(
      e => e.serviceId === serviceId && e.date === data.date && e.status !== 'archived'
    );

    if (duplicate) {
      throw new Error(`Jadwal khusus/pengecualian untuk tanggal ${data.date} sudah ada. Silakan edit atau hapus jadwal yang sudah ada.`);
    }

    const type = data.type || 'closed';
    const isOpen = type === 'closed' ? false : Boolean(data.isOpen);

    if (isOpen) {
      const err = validateTimeRule({
        isOpen: true,
        openTime: data.openTime,
        closeTime: data.closeTime,
        breakStart: data.breakStart,
        breakEnd: data.breakEnd
      });
      if (err) {
        throw new Error(`Validasi Jam Operasional Khusus: ${err}`);
      }
    }

    const newException: ServiceScheduleExceptionEntity = {
      id: `exc-${Date.now()}`,
      serviceId,
      date: data.date,
      type,
      isOpen,
      openTime: isOpen ? data.openTime : undefined,
      closeTime: isOpen ? data.closeTime : undefined,
      breakStart: isOpen ? data.breakStart : undefined,
      breakEnd: isOpen ? data.breakEnd : undefined,
      reason: sanitizeInput(data.reason),
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: { id: actor.id, name: actor.name, email: actor.email }
    };

    all.push(newException);
    saveStoredExceptions(all);

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'CREATE',
      module: 'SERVICE_EXCEPTIONS',
      targetId: newException.id,
      targetName: `Jadwal Khusus ${data.date}`,
      description: `Menambahkan jadwal khusus/pengecualian pada tanggal ${data.date} (${type}): "${data.reason}"`
    });

    return newException;
  },

  async updateScheduleException(
    id: string,
    updates: Partial<ServiceScheduleExceptionEntity>,
    actor: { id: string; email: string; name: string }
  ): Promise<ServiceScheduleExceptionEntity> {
    const all = getStoredExceptions();
    const idx = all.findIndex(e => e.id === id);

    if (idx === -1) {
      throw new Error('Jadwal khusus tidak ditemukan.');
    }

    const existing = all[idx];

    if (updates.date && updates.date !== existing.date) {
      const duplicate = all.find(
        e => e.id !== id && e.serviceId === existing.serviceId && e.date === updates.date && e.status !== 'archived'
      );
      if (duplicate) {
        throw new Error(`Jadwal khusus/pengecualian untuk tanggal ${updates.date} sudah ada.`);
      }
    }

    const type = updates.type !== undefined ? updates.type : existing.type;
    const isOpen = type === 'closed' ? false : (updates.isOpen !== undefined ? updates.isOpen : existing.isOpen);

    if (isOpen) {
      const err = validateTimeRule({
        isOpen: true,
        openTime: updates.openTime !== undefined ? updates.openTime : existing.openTime,
        closeTime: updates.closeTime !== undefined ? updates.closeTime : existing.closeTime,
        breakStart: updates.breakStart !== undefined ? updates.breakStart : existing.breakStart,
        breakEnd: updates.breakEnd !== undefined ? updates.breakEnd : existing.breakEnd
      });
      if (err) {
        throw new Error(`Validasi Jam Operasional Khusus: ${err}`);
      }
    }

    const updated: ServiceScheduleExceptionEntity = {
      ...existing,
      ...updates,
      type,
      isOpen,
      reason: updates.reason !== undefined ? sanitizeInput(updates.reason) : existing.reason,
      updatedAt: new Date().toISOString(),
      updatedBy: { id: actor.id, name: actor.name, email: actor.email }
    };

    all[idx] = updated;
    saveStoredExceptions(all);

    let action: 'UPDATE' | 'DELETE' = 'UPDATE';
    if (updates.status === 'archived' && existing.status !== 'archived') action = 'DELETE';

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action,
      module: 'SERVICE_EXCEPTIONS',
      targetId: updated.id,
      targetName: `Jadwal Khusus ${updated.date}`,
      description: `Memperbarui jadwal khusus/pengecualian tanggal ${updated.date} (Status: ${updated.status})`
    });

    return updated;
  },

  async archiveScheduleException(id: string, actor: { id: string; email: string; name: string }): Promise<ServiceScheduleExceptionEntity> {
    return this.updateScheduleException(id, { status: 'archived' }, actor);
  },

  async restoreScheduleException(id: string, actor: { id: string; email: string; name: string }): Promise<ServiceScheduleExceptionEntity> {
    return this.updateScheduleException(id, { status: 'active' }, actor);
  },

  // ==========================================
  // PHASE 4D: SERVICE PRICING
  // ==========================================
  async getPricingByServiceId(
    serviceId: string,
    options: { includeArchived?: boolean } = {}
  ): Promise<ServicePricingEntity[]> {
    let all = getStoredPricing().filter(p => p.serviceId === serviceId);

    if (!options.includeArchived) {
      all = all.filter(p => p.status !== 'archived');
    }

    return all.sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
  },

  async getAllPricing(
    options: { includeArchived?: boolean } = {}
  ): Promise<ServicePricingEntity[]> {
    let all = getStoredPricing();

    if (!options.includeArchived) {
      all = all.filter(p => p.status !== 'archived');
    }

    return all.sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
  },

  async createPricing(
    serviceId: string,
    data: Partial<ServicePricingEntity>,
    actor: { id: string; email: string; name: string }
  ): Promise<ServicePricingEntity> {
    const pricingType = data.pricingType || 'free';

    if (!data.effectiveFrom) {
      throw new Error('Tanggal mulai berlaku tarif (Effective From) wajib diisi.');
    }

    if (data.effectiveUntil && data.effectiveUntil < data.effectiveFrom) {
      throw new Error('Tanggal akhir berlaku tidak boleh lebih awal dari tanggal mulai.');
    }

    if (pricingType === 'fixed') {
      if (data.amount === undefined || data.amount === null || isNaN(Number(data.amount))) {
        throw new Error('Nominal tarif wajib diisi untuk jenis tarif tetap.');
      }
      if (Number(data.amount) < 0) {
        throw new Error('Nominal tarif tidak boleh bernilai negatif.');
      }
    }

    // Check overlapping pricing ranges
    const all = getStoredPricing();
    const overlapWarning = checkPricingRangeOverlap(
      serviceId,
      undefined,
      data.effectiveFrom,
      data.effectiveUntil,
      all
    );

    if (overlapWarning) {
      console.warn('Pricing Range Overlap Notice:', overlapWarning);
    }

    const newPricing: ServicePricingEntity = {
      id: `prc-${Date.now()}`,
      serviceId,
      pricingType,
      amount: pricingType === 'fixed' ? Number(data.amount) : (pricingType === 'free' ? 0 : null),
      currency: data.currency || 'IDR',
      unit: sanitizeInput(data.unit) || 'per pelayanan',
      description: sanitizeInput(data.description),
      status: 'active',
      effectiveFrom: data.effectiveFrom,
      effectiveUntil: data.effectiveUntil || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: { id: actor.id, name: actor.name, email: actor.email }
    };

    all.push(newPricing);
    saveStoredPricing(all);

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'CREATE',
      module: 'SERVICE_PRICING',
      targetId: newPricing.id,
      targetName: `Tarif Layanan ${serviceId}`,
      description: `Menambahkan tarif (${pricingType}): ${newPricing.amount !== null ? 'Rp ' + newPricing.amount : 'Tanpa Nominal Fixed'} (Berlaku: ${data.effectiveFrom})`
    });

    return newPricing;
  },

  async updatePricing(
    id: string,
    updates: Partial<ServicePricingEntity>,
    actor: { id: string; email: string; name: string }
  ): Promise<ServicePricingEntity> {
    const all = getStoredPricing();
    const idx = all.findIndex(p => p.id === id);

    if (idx === -1) {
      throw new Error('Informasi tarif tidak ditemukan.');
    }

    const existing = all[idx];
    const pricingType = updates.pricingType !== undefined ? updates.pricingType : existing.pricingType;
    const effectiveFrom = updates.effectiveFrom !== undefined ? updates.effectiveFrom : existing.effectiveFrom;
    const effectiveUntil = updates.effectiveUntil !== undefined ? updates.effectiveUntil : existing.effectiveUntil;

    if (effectiveUntil && effectiveUntil < effectiveFrom) {
      throw new Error('Tanggal akhir berlaku tidak boleh lebih awal dari tanggal mulai.');
    }

    if (pricingType === 'fixed') {
      const amountVal = updates.amount !== undefined ? updates.amount : existing.amount;
      if (amountVal === undefined || amountVal === null || isNaN(Number(amountVal))) {
        throw new Error('Nominal tarif wajib diisi untuk jenis tarif tetap.');
      }
      if (Number(amountVal) < 0) {
        throw new Error('Nominal tarif tidak boleh bernilai negatif.');
      }
    }

    const updated: ServicePricingEntity = {
      ...existing,
      ...updates,
      pricingType,
      amount: pricingType === 'fixed' ? Number(updates.amount !== undefined ? updates.amount : existing.amount) : (pricingType === 'free' ? 0 : null),
      currency: updates.currency || existing.currency || 'IDR',
      unit: updates.unit !== undefined ? sanitizeInput(updates.unit) : existing.unit,
      description: updates.description !== undefined ? sanitizeInput(updates.description) : existing.description,
      effectiveFrom,
      effectiveUntil: effectiveUntil || undefined,
      updatedAt: new Date().toISOString(),
      updatedBy: { id: actor.id, name: actor.name, email: actor.email }
    };

    all[idx] = updated;
    saveStoredPricing(all);

    let action: 'UPDATE' | 'DELETE' = 'UPDATE';
    if (updates.status === 'archived' && existing.status !== 'archived') action = 'DELETE';

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action,
      module: 'SERVICE_PRICING',
      targetId: updated.id,
      targetName: `Tarif Layanan ${existing.serviceId}`,
      description: `Memperbarui informasi tarif ID ${updated.id} (${pricingType}) (Status: ${updated.status})`
    });

    return updated;
  },

  async archivePricing(id: string, actor: { id: string; email: string; name: string }): Promise<ServicePricingEntity> {
    return this.updatePricing(id, { status: 'archived' }, actor);
  },

  async restorePricing(id: string, actor: { id: string; email: string; name: string }): Promise<ServicePricingEntity> {
    return this.updatePricing(id, { status: 'active' }, actor);
  },

  // ==========================================
  // PHASE 4H: BULK OPERATIONS & DATA MANAGEMENT
  // ==========================================
  async bulkUpdateServices(
    serviceIds: string[],
    updates: {
      status?: ServiceStatus;
      categoryId?: string;
      clusterId?: string;
      unitId?: string;
      locationId?: string;
    },
    actor: { id: string; email: string; name: string }
  ): Promise<{ updatedCount: number }> {
    if (!serviceIds || serviceIds.length === 0) return { updatedCount: 0 };

    const services = getStoredServices();
    const categories = getStoredCategories();
    const clusters = getStoredClusters();
    const units = getStoredUnits();
    const locations = getStoredLocations();

    let categoryName: string | undefined;
    if (updates.categoryId) {
      const cat = categories.find(c => c.id === updates.categoryId);
      categoryName = cat ? cat.name : '';
    }

    let clusterName: string | undefined;
    if (updates.clusterId) {
      const cls = clusters.find(c => c.id === updates.clusterId);
      clusterName = cls ? cls.name : '';
    }

    let unitName: string | undefined;
    if (updates.unitId) {
      const u = units.find(unit => unit.id === updates.unitId);
      unitName = u ? u.name : '';
    }

    let locationName: string | undefined;
    if (updates.locationId) {
      const loc = locations.find(l => l.id === updates.locationId);
      locationName = loc ? loc.name : '';
    }

    let count = 0;
    const updatedServices = services.map(s => {
      if (!serviceIds.includes(s.id)) return s;

      count++;
      const isNowPublishing = updates.status === 'published' && s.status !== 'published';

      return {
        ...s,
        ...(updates.status ? { status: updates.status } : {}),
        ...(updates.categoryId ? { categoryId: updates.categoryId, categoryName } : {}),
        ...(updates.clusterId ? { clusterId: updates.clusterId, clusterName } : {}),
        ...(updates.unitId ? { unitId: updates.unitId, unitName } : {}),
        ...(updates.locationId ? { locationId: updates.locationId, locationName } : {}),
        updatedAt: new Date().toISOString(),
        updatedBy: { id: actor.id, name: actor.name, email: actor.email },
        ...(isNowPublishing ? {
          publishedAt: new Date().toISOString(),
          publishedBy: { id: actor.id, name: actor.name }
        } : {})
      };
    });

    saveStoredServices(updatedServices);

    const actionDesc = updates.status 
      ? `Aksi massal status (${updates.status.toUpperCase()})` 
      : 'Aksi massal relasi data (kategori/klaster/unit/lokasi)';

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'UPDATE',
      module: 'SERVICES',
      description: `${actionDesc} berhasil diperbarui untuk ${count} layanan kesehatan.`
    });

    return { updatedCount: count };
  },

  async getServiceDataQualityReport(): Promise<Array<{
    service: ServiceEntity;
    score: number;
    qualityStatus: 'complete' | 'partial' | 'incomplete';
    missingItems: string[];
    primaryMissingTab: 'info' | 'requirements' | 'procedures' | 'products' | 'standards' | 'schedules' | 'pricing';
  }>> {
    const services = await this.getServices();
    const allReqs = getStoredRequirements();
    const allProcs = getStoredProcedures();
    const allProds = getStoredProducts();
    const allStds = getStoredStandards();
    const allSchedules = getStoredSchedules();
    const allPricings = getStoredPricing();

    return services.map(s => {
      const missingItems: string[] = [];
      let missingTab: 'info' | 'requirements' | 'procedures' | 'products' | 'standards' | 'schedules' | 'pricing' = 'info';

      // Criteria 1: Name & Short Desc
      if (!s.name || !s.shortDescription) {
        missingItems.push('Informasi Umum (Deskripsi Singkat)');
      }

      // Criteria 2: Category
      if (!s.categoryId) {
        missingItems.push('Kategori Layanan');
      }

      // Criteria 3: Unit
      if (!s.unitId) {
        missingItems.push('Unit Pelayanan');
      }

      // Criteria 4: Location
      if (!s.locationId) {
        missingItems.push('Lokasi Pelayanan');
      }

      // Criteria 5: Requirements
      const hasReqs = allReqs.some(r => r.serviceId === s.id && r.status !== 'archived');
      if (!hasReqs) {
        missingItems.push('Persyaratan Layanan');
        if (missingItems.length === 1) missingTab = 'requirements';
      }

      // Criteria 6: Procedures
      const hasProcs = allProcs.some(p => p.serviceId === s.id && p.status !== 'archived');
      if (!hasProcs) {
        missingItems.push('Prosedur & Alur Pelayanan');
        if (missingItems.length === 1) missingTab = 'procedures';
      }

      // Criteria 7: Schedule
      const hasSchedule = allSchedules.some(sch => sch.serviceId === s.id && sch.rules && sch.rules.some(r => r.isOpen));
      if (!hasSchedule) {
        missingItems.push('Jadwal Operasional');
        if (missingItems.length === 1) missingTab = 'schedules';
      }

      // Criteria 8: Pricing
      const hasPricing = allPricings.some(pr => pr.serviceId === s.id && pr.status !== 'archived');
      if (!hasPricing) {
        missingItems.push('Informasi Tarif');
        if (missingItems.length === 1) missingTab = 'pricing';
      }

      const totalCriteria = 8;
      const metCriteria = totalCriteria - missingItems.length;
      const score = Math.round((metCriteria / totalCriteria) * 100);

      let qualityStatus: 'complete' | 'partial' | 'incomplete' = 'complete';
      if (score < 50) {
        qualityStatus = 'incomplete';
      } else if (score < 100) {
        qualityStatus = 'partial';
      }

      return {
        service: s,
        score,
        qualityStatus,
        missingItems,
        primaryMissingTab: missingTab
      };
    });
  },

  async importServicesBatch(
    rows: Array<{
      name: string;
      description?: string;
      shortDescription?: string;
      category?: string;
      cluster?: string;
      unit?: string;
      location?: string;
      status?: string;
    }>,
    actor: { id: string; email: string; name: string },
    options: { skipDuplicates?: boolean } = { skipDuplicates: true }
  ): Promise<{
    totalProcessed: number;
    successCount: number;
    failedCount: number;
    errors: string[];
  }> {
    const existingServices = getStoredServices();
    const categories = getStoredCategories();
    const clusters = getStoredClusters();
    const units = getStoredUnits();
    const locations = getStoredLocations();

    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];
    const newServices: ServiceEntity[] = [...existingServices];

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      const rowNum = index + 1;

      const name = row.name?.trim();
      if (!name) {
        errors.push(`Baris ${rowNum}: Nama layanan kosong.`);
        failedCount++;
        continue;
      }

      // Duplicate check
      const isDuplicate = newServices.some(
        s => s.name.toLowerCase() === name.toLowerCase() || s.slug === generateSlug(name)
      );

      if (isDuplicate) {
        if (options.skipDuplicates) {
          errors.push(`Baris ${rowNum}: Layanan "${name}" dilewati karena duplikat.`);
          failedCount++;
          continue;
        }
      }

      // Match relations
      let categoryId = '';
      let categoryName = '';
      if (row.category) {
        const catQuery = row.category.trim().toLowerCase();
        const cat = categories.find(
          c => c.name.toLowerCase() === catQuery || c.id.toLowerCase() === catQuery || c.slug.toLowerCase() === catQuery
        );
        if (cat) {
          categoryId = cat.id;
          categoryName = cat.name;
        } else {
          errors.push(`Baris ${rowNum}: Kategori "${row.category}" tidak ditemukan.`);
          failedCount++;
          continue;
        }
      }

      let clusterId = '';
      let clusterName = '';
      if (row.cluster) {
        const clsQuery = row.cluster.trim().toLowerCase();
        const cls = clusters.find(
          c => c.name.toLowerCase() === clsQuery || c.id.toLowerCase() === clsQuery || c.slug.toLowerCase() === clsQuery
        );
        if (cls) {
          clusterId = cls.id;
          clusterName = cls.name;
        }
      }

      let unitId = '';
      let unitName = '';
      if (row.unit) {
        const unitQuery = row.unit.trim().toLowerCase();
        const u = units.find(
          unit => unit.name.toLowerCase() === unitQuery || unit.id.toLowerCase() === unitQuery || unit.code?.toLowerCase() === unitQuery
        );
        if (u) {
          unitId = u.id;
          unitName = u.name;
        }
      }

      let locationId = '';
      let locationName = '';
      if (row.location) {
        const locQuery = row.location.trim().toLowerCase();
        const loc = locations.find(
          l => l.name.toLowerCase() === locQuery || l.id.toLowerCase() === locQuery
        );
        if (loc) {
          locationId = loc.id;
          locationName = loc.name;
        }
      }

      const status: ServiceStatus = (row.status?.trim().toLowerCase() as ServiceStatus) || 'draft';
      const validStatus: ServiceStatus = ['draft', 'published', 'archived'].includes(status) ? status : 'draft';

      const createdService: ServiceEntity = {
        id: `srv-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name,
        slug: generateSlug(name, undefined, newServices),
        shortDescription: row.shortDescription || row.description?.slice(0, 150) || '',
        description: row.description || '',
        status: validStatus,
        categoryId,
        categoryName,
        clusterId,
        clusterName,
        unitId,
        unitName,
        locationId,
        locationName,
        featured: false,
        displayOrder: newServices.length + 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: { id: actor.id, name: actor.name, email: actor.email },
        publishedAt: validStatus === 'published' ? new Date().toISOString() : undefined,
        publishedBy: validStatus === 'published' ? { id: actor.id, name: actor.name } : undefined,
        seoTitle: name,
        seoDescription: row.shortDescription || ''
      };

      newServices.push(createdService);
      successCount++;
    }

    if (successCount > 0) {
      saveStoredServices(newServices);
    }

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'CREATE',
      module: 'SERVICES',
      description: `Import massal data layanan dari file CSV. Total baris: ${rows.length}, Berhasil: ${successCount}, Gagal/Dilewati: ${failedCount}.`
    });

    return {
      totalProcessed: rows.length,
      successCount,
      failedCount,
      errors
    };
  }
};

// ==========================================
// HELPER STORAGE & VALIDATION FUNCTIONS (PHASE 4D)
// ==========================================
export const DEFAULT_DAYS: { day: DayOfWeek; label: string }[] = [
  { day: 'monday', label: 'Senin' },
  { day: 'tuesday', label: 'Selasa' },
  { day: 'wednesday', label: 'Rabu' },
  { day: 'thursday', label: 'Kamis' },
  { day: 'friday', label: 'Jumat' },
  { day: 'saturday', label: 'Sabtu' },
  { day: 'sunday', label: 'Minggu' }
];

export function createDefaultScheduleRules(serviceId: string): ServiceScheduleRuleEntity[] {
  return DEFAULT_DAYS.map((d, index) => {
    const isWeekend = d.day === 'sunday';
    return {
      id: `rule-${serviceId}-${d.day}`,
      serviceId,
      dayOfWeek: d.day,
      isOpen: !isWeekend,
      openTime: !isWeekend ? '08:00' : undefined,
      closeTime: !isWeekend ? '15:00' : undefined,
      breakStart: !isWeekend ? '12:00' : undefined,
      breakEnd: !isWeekend ? '13:00' : undefined,
      displayOrder: index + 1,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  });
}

function getStoredSchedules(): ServiceScheduleEntity[] {
  try {
    const raw = localStorage.getItem(SCHEDULES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredSchedules(data: ServiceScheduleEntity[]) {
  try {
    localStorage.setItem(SCHEDULES_STORAGE_KEY, JSON.stringify(data));
    saveSingleDocument('service_engine', 'schedules', data, SCHEDULES_STORAGE_KEY).catch(() => {});
    fetch('/api/db/service_schedules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).catch(() => {});
  } catch (err) {
    console.error('Failed to save schedules:', err);
  }
}

function getStoredExceptions(): ServiceScheduleExceptionEntity[] {
  try {
    const raw = localStorage.getItem(EXCEPTIONS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredExceptions(data: ServiceScheduleExceptionEntity[]) {
  try {
    localStorage.setItem(EXCEPTIONS_STORAGE_KEY, JSON.stringify(data));
    saveSingleDocument('service_engine', 'schedule_exceptions', data, EXCEPTIONS_STORAGE_KEY).catch(() => {});
    fetch('/api/db/service_schedule_exceptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).catch(() => {});
  } catch (err) {
    console.error('Failed to save exceptions:', err);
  }
}

export const INITIAL_PRICING: ServicePricingEntity[] = [
  {
    id: 'prc-inap-bpjs',
    serviceId: 'srv-7',
    pricingType: 'free',
    amount: 0,
    currency: 'IDR',
    unit: 'Pasien BPJS / KIS',
    description: 'Bebas biaya 100% ditanggung BPJS Kesehatan sesuai hak kepesertaan FKTP.',
    status: 'active',
    effectiveFrom: '2024-01-01',
    createdAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    createdBy: { id: 'usr-superadmin-01', name: 'Administrator Utama', email: 'admin@puskesmas.go.id' }
  },
  {
    id: 'prc-inap-umum',
    serviceId: 'srv-7',
    pricingType: 'fixed',
    amount: 120000,
    currency: 'IDR',
    unit: 'per hari rawat inap',
    description: 'Tarif retribusi rawat inap umum (kamar perawatan, visite dokter rutin, dan asuhan keperawatan 24 jam) sesuai Perda.',
    status: 'active',
    effectiveFrom: '2024-01-01',
    createdAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    createdBy: { id: 'usr-superadmin-01', name: 'Administrator Utama', email: 'admin@puskesmas.go.id' }
  }
];

function getStoredPricing(): ServicePricingEntity[] {
  try {
    const raw = localStorage.getItem(PRICING_STORAGE_KEY);
    if (!raw) {
      fetch('/api/db/service_pricing').then(r => r.json()).then(res => {
        const arrData = Array.isArray(res) ? res : (res && Array.isArray(res.docs) ? res.docs : (res && res.success && Array.isArray(res.data) ? res.data : null)); if (arrData) {
          localStorage.setItem(PRICING_STORAGE_KEY, JSON.stringify(arrData));
        }
      }).catch(() => {});
      return [];
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveStoredPricing(data: ServicePricingEntity[]) {
  try {
    localStorage.setItem(PRICING_STORAGE_KEY, JSON.stringify(data));
    saveSingleDocument('service_engine', 'pricing', data, PRICING_STORAGE_KEY).catch(() => {});
    fetch('/api/db/service_pricing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).catch(() => {});
  } catch (err) {
    console.error('Failed to save pricing:', err);
  }
}

export function validateTimeRule(rule: Partial<ServiceScheduleRuleEntity>): string | null {
  if (!rule.isOpen) return null;

  if (!rule.openTime || !rule.closeTime) {
    return 'Jam buka dan jam tutup wajib diisi jika layanan dibuka.';
  }

  if (rule.openTime >= rule.closeTime) {
    return `Jam buka (${rule.openTime}) harus lebih awal dari jam tutup (${rule.closeTime}).`;
  }

  if (rule.breakStart || rule.breakEnd) {
    if (!rule.breakStart || !rule.breakEnd) {
      return 'Jam mulai dan jam selesai istirahat harus diisi secara lengkap.';
    }

    if (rule.breakStart >= rule.breakEnd) {
      return `Jam mulai istirahat (${rule.breakStart}) harus lebih awal dari jam selesai istirahat (${rule.breakEnd}).`;
    }

    if (rule.breakStart < rule.openTime) {
      return `Jam istirahat (${rule.breakStart}) tidak boleh dimulai sebelum jam buka (${rule.openTime}).`;
    }

    if (rule.breakEnd > rule.closeTime) {
      return `Jam istirahat (${rule.breakEnd}) tidak boleh selesai setelah jam tutup (${rule.closeTime}).`;
    }
  }

  return null;
}

export function checkPricingRangeOverlap(
  serviceId: string,
  excludeId: string | undefined,
  effectiveFrom: string,
  effectiveUntil: string | undefined,
  allPricing: ServicePricingEntity[]
): string | null {
  const activePricing = allPricing.filter(
    p => p.serviceId === serviceId && p.status === 'active' && p.id !== excludeId
  );

  for (const p of activePricing) {
    const startA = effectiveFrom;
    const endA = effectiveUntil || '9999-12-31';
    const startB = p.effectiveFrom;
    const endB = p.effectiveUntil || '9999-12-31';

    if (startA <= endB && startB <= endA) {
      return `Periode berlaku (${effectiveFrom} s.d ${effectiveUntil || 'Seterusnya'}) bertabrakan dengan tarif aktif ID ${p.id} (${p.effectiveFrom} s.d ${p.effectiveUntil || 'Seterusnya'}).`;
    }
  }

  return null;
}

export interface OperationalStatusResult {
  code: 'open' | 'closed' | 'break' | 'outside_hours' | 'special_schedule';
  label: string;
  badgeVariant: 'emerald' | 'red' | 'amber' | 'secondary' | 'purple';
  detail: string;
  isSpecialSchedule: boolean;
}

export function calculateTodayOperationalStatus(
  service: ServiceEntity,
  schedule: ServiceScheduleEntity | null,
  exceptions: ServiceScheduleExceptionEntity[],
  now: Date = new Date()
): OperationalStatusResult {
  if (service.status !== 'published') {
    return {
      code: 'closed',
      label: 'Tutup',
      badgeVariant: 'red',
      detail: 'Layanan saat ini tidak dipublikasikan',
      isSpecialSchedule: false
    };
  }

  const tz = schedule?.timezone || 'Asia/Jakarta';

  let todayStr = '';
  let currentTimeStr = '';
  let currentDayName = '';

  try {
    const formatterDate = new Intl.DateTimeFormat('sv-SE', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
    todayStr = formatterDate.format(now);

    const formatterTime = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false });
    currentTimeStr = formatterTime.format(now);

    const formatterDay = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'long' });
    currentDayName = formatterDay.format(now).toLowerCase();
  } catch {
    todayStr = now.toISOString().split('T')[0];
    currentTimeStr = now.toTimeString().slice(0, 5);
    const dayNames: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    currentDayName = dayNames[now.getDay()];
  }

  // 1. Check Schedule Exception
  const activeExceptions = exceptions.filter(e => e.status !== 'archived' && e.date === todayStr);
  const todayException = activeExceptions[0];

  if (todayException) {
    if (todayException.type === 'closed' || !todayException.isOpen) {
      return {
        code: 'closed',
        label: 'Tutup (Jadwal Khusus)',
        badgeVariant: 'red',
        detail: todayException.reason || 'Libur / Jadwal Khusus Hari Ini',
        isSpecialSchedule: true
      };
    }

    const openTime = todayException.openTime || '08:00';
    const closeTime = todayException.closeTime || '12:00';

    if (currentTimeStr < openTime || currentTimeStr >= closeTime) {
      return {
        code: 'outside_hours',
        label: 'Di luar Jam Pelayanan',
        badgeVariant: 'secondary',
        detail: `Jadwal khusus hari ini: ${openTime} – ${closeTime} (${todayException.reason})`,
        isSpecialSchedule: true
      };
    }

    if (todayException.breakStart && todayException.breakEnd) {
      if (currentTimeStr >= todayException.breakStart && currentTimeStr < todayException.breakEnd) {
        return {
          code: 'break',
          label: 'Sedang Istirahat',
          badgeVariant: 'amber',
          detail: `Waktu istirahat khusus: ${todayException.breakStart} – ${todayException.breakEnd}`,
          isSpecialSchedule: true
        };
      }
    }

    return {
      code: 'open',
      label: 'Buka (Jadwal Khusus)',
      badgeVariant: 'emerald',
      detail: `Jadwal khusus hari ini s.d ${closeTime} (${todayException.reason})`,
      isSpecialSchedule: true
    };
  }

  // 2. Weekly Schedule Rules
  if (!schedule || !schedule.rules || schedule.rules.length === 0) {
    return {
      code: 'closed',
      label: 'Tutup',
      badgeVariant: 'red',
      detail: 'Jadwal operasional belum diatur',
      isSpecialSchedule: false
    };
  }

  const dayRule = schedule.rules.find(r => r.dayOfWeek === currentDayName);

  if (!dayRule || !dayRule.isOpen) {
    return {
      code: 'closed',
      label: 'Tutup',
      badgeVariant: 'red',
      detail: 'Tidak ada jadwal pelayanan pada hari ini',
      isSpecialSchedule: false
    };
  }

  const openTime = dayRule.openTime || '08:00';
  const closeTime = dayRule.closeTime || '15:00';

  if (currentTimeStr < openTime || currentTimeStr >= closeTime) {
    return {
      code: 'outside_hours',
      label: 'Di luar Jam Pelayanan',
      badgeVariant: 'secondary',
      detail: `Jam operasional reguler hari ini: ${openTime} – ${closeTime}`,
      isSpecialSchedule: false
    };
  }

  if (dayRule.breakStart && dayRule.breakEnd) {
    if (currentTimeStr >= dayRule.breakStart && currentTimeStr < dayRule.breakEnd) {
      return {
        code: 'break',
        label: 'Sedang Istirahat',
        badgeVariant: 'amber',
        detail: `Waktu istirahat pelayanan: ${dayRule.breakStart} – ${dayRule.breakEnd}`,
        isSpecialSchedule: false
      };
    }
  }

  return {
    code: 'open',
    label: 'Buka',
    badgeVariant: 'emerald',
    detail: `Layanan beroperasi reguler s.d ${closeTime}`,
    isSpecialSchedule: false
  };
}

