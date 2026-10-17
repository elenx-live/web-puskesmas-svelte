// TAHAP 3 — hasil pemecahan serviceEngineService.ts (perilaku TIDAK berubah).
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
} from '../../types/index.js';

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



