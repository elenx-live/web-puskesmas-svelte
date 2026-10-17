import type { CollectionSchema, RoleMatrixItem, DecisionLogItem, ChecklistItem } from '../types/blueprint.js';

export const SYSTEM_MODULES = [
  {
    id: 'core',
    name: '1. Core & Security Engine',
    description: 'Manajemen Pengguna, Peran, Izin Granular, Sesi Keamanan, dan Audit Log terdesentralisasi.',
    subModules: ['Authentication (Firebase Auth)', 'Authorization RBAC', 'User Management', 'Role & Permission Granular', 'Global Site Settings', 'Immutable Audit Logs'],
    keyRelations: ['Users -> Roles -> Permissions', 'Audit Logs tracks all CRUD & Auth events']
  },
  {
    id: 'health',
    name: '2. Health Service Engine (Permenkes 19/2024 & 6/2024)',
    description: 'Modul khusus pelayanan kesehatan berbasis 5 Klaster, Siklus Hidup, Standar Pelayanan Publik, Jejaring, & SPM.',
    subModules: ['Klaster Service Engine', 'Siklus Hidup (Life Stages)', 'Unit Pelayanan & Jadwal', 'Standar Pelayanan Publik (11 Komponen)', 'SPM (Permenkes 6/2024)', 'Legal References', 'Umpan Balik & Pengaduan'],
    keyRelations: ['Services -> Clusters & Life Stages', 'Services -> Service Standards', 'Services -> Legal References']
  },
  {
    id: 'content',
    name: '3. Content & Media Engine',
    description: 'Pengelolaan Konten Publik Dinamis, Berita, Pengumuman, Galeri, Dokumen, dan Terpusat Media Library.',
    subModules: ['Dynamic Pages Engine', 'Dynamic Menu Engine (Nested)', 'Posts & Categories (Berita/Artikel)', 'Announcements & Banner', 'Documents & Legal Downloads', 'Gallery (Foto/Video)', 'Centralized Media Library'],
    keyRelations: ['Media -> Pages/Posts/Services/Microsites', 'Menu -> Dynamic Pages/Services/External']
  },
  {
    id: 'design',
    name: '4. Design, Homepage & Theme Engine',
    description: 'Visual Page Builder berbasis Section, Custom Theme Token System, Header & Footer Builder.',
    subModules: ['Section-Based Homepage Builder', 'Component Registry Engine', 'Global Theme Tokens (Colors, Typography, Radius)', 'Theme Presets', 'Header Builder', 'Footer Builder'],
    keyRelations: ['Homepage Sections -> Data Sources (Services, Posts, Gallery)', 'Theme Tokens -> All Public Views']
  },
  {
    id: 'microsite',
    name: '5. Microsite & Portal Engine',
    description: 'Pembuat situs mini independen (e.g., Posyandu, Kampanye Stunting) dengan proteksi password aman server-side.',
    subModules: ['Microsite Builder & Sections', 'Microsite Custom/Global Theme', 'Server-Side Password Verification Engine', 'QR Code Generator', 'Privacy-Preserving Analytics', 'Access Control (Public/Password/Restricted)'],
    keyRelations: ['Microsite -> Reusable Component Registry', 'Microsite -> Central Media Library']
  }
];

export const FIRESTORE_SCHEMAS: CollectionSchema[] = [
  {
    name: 'users',
    purpose: 'Menyimpan profil pengguna admin/operator dan referensi role.',
    keyFields: ['uid', 'email', 'displayName', 'roleId', 'status (active/suspended)', 'createdAt', 'updatedAt'],
    relations: 'References roles collection via roleId',
    indexes: ['status, roleId', 'email ASC']
  },
  {
    name: 'roles',
    purpose: 'Definisi peran dan daftar permissions granular.',
    keyFields: ['id', 'name', 'description', 'permissions: string[]', 'isSystemRole: boolean', 'updatedAt'],
    relations: 'Referenced by users collection',
    indexes: ['name ASC']
  },
  {
    name: 'services',
    purpose: 'Entitas utama Layanan Puskesmas berbasis Permenkes 19/2024.',
    keyFields: ['id', 'name', 'slug', 'clusterId', 'lifeStageIds: string[]', 'unitId', 'description', 'schedule', 'status', 'updatedBy'],
    relations: 'References serviceClusters, lifeStages, serviceUnits, serviceStandards',
    indexes: ['status, clusterId', 'slug UNIQUE']
  },
  {
    name: 'serviceStandards',
    purpose: '11 Komponen Standar Pelayanan Publik per layanan (Undang-Undang Pelayanan Publik).',
    keyFields: ['id', 'serviceId', 'requirements', 'procedure', 'duration', 'cost', 'product', 'personnel', 'complaintChannel', 'guarantees'],
    relations: '1-to-1 or 1-to-many with services',
    indexes: ['serviceId']
  },
  {
    name: 'homepageSections',
    purpose: 'Konfigurasi urutan dan tipe section pada Homepage Builder.',
    keyFields: ['id', 'type (hero, services_grid, news_grid, etc)', 'order: number', 'enabled: boolean', 'config: map', 'style: map'],
    relations: 'Binds dynamically to services, posts, galleries collections',
    indexes: ['enabled ASC, order ASC']
  },
  {
    name: 'microsites',
    purpose: 'Metadata dan konfigurasi Microsite terisolasi.',
    keyFields: ['id', 'name', 'slug', 'title', 'accessMode (public|password)', 'passwordHash', 'themeConfig', 'sections: map[]', 'status'],
    relations: 'References media for logo/cover, auditLogs for changes',
    indexes: ['slug UNIQUE', 'status ASC']
  },
  {
    name: 'auditLogs',
    purpose: 'Log jejak aktivitas sistem yang tidak dapat diubah (append-only).',
    keyFields: ['id', 'userId', 'userEmail', 'action', 'target', 'targetId', 'details', 'timestamp', 'ipAddress'],
    relations: 'References users',
    indexes: ['timestamp DESC', 'userId, timestamp DESC']
  }
];

export const ROLE_MATRIX: RoleMatrixItem[] = [
  { permission: 'manage_users', superAdmin: true, adminWebsite: false, editor: false, operator: false, viewer: false },
  { permission: 'manage_roles_permissions', superAdmin: true, adminWebsite: false, editor: false, operator: false, viewer: false },
  { permission: 'manage_pages_menus', superAdmin: true, adminWebsite: true, editor: true, operator: false, viewer: false },
  { permission: 'manage_posts_announcements', superAdmin: true, adminWebsite: true, editor: true, operator: false, viewer: false },
  { permission: 'manage_services_clusters', superAdmin: true, adminWebsite: true, editor: true, operator: true, viewer: false },
  { permission: 'manage_service_standards', superAdmin: true, adminWebsite: true, editor: true, operator: true, viewer: false },
  { permission: 'manage_homepage_builder', superAdmin: true, adminWebsite: true, editor: false, operator: false, viewer: false },
  { permission: 'publish_homepage', superAdmin: true, adminWebsite: true, editor: false, operator: false, viewer: false },
  { permission: 'manage_theme_header_footer', superAdmin: true, adminWebsite: true, editor: false, operator: false, viewer: false },
  { permission: 'manage_microsites', superAdmin: true, adminWebsite: true, editor: true, operator: true, viewer: false },
  { permission: 'manage_microsite_passwords', superAdmin: true, adminWebsite: true, editor: false, operator: false, viewer: false },
  { permission: 'view_audit_logs', superAdmin: true, adminWebsite: true, editor: false, operator: false, viewer: false },
  { permission: 'manage_site_settings', superAdmin: true, adminWebsite: true, editor: false, operator: false, viewer: false },
];

export const DECISION_LOG: DecisionLogItem[] = [
  {
    id: 'ADR-01',
    topic: 'Verifikasi Password Microsite Server-Side',
    options: ['Frontend Hash Check (Insecure)', 'Firestore Rule Plaintext (Insecure)', 'Serverless/Cloud Function Session Verification (Secure)'],
    selected: 'Serverless / Cloud Function Verification dengan HttpOnly Cookie / Signed Token Session',
    rationale: 'Menghindari kebocoran password hash atau logic pemeriksaan di browser client. Mencegah manipulasi DOM untuk memintas akses.',
    impact: 'Keamanan 100% terjamin untuk microsite terproteksi password.'
  },
  {
    id: 'ADR-02',
    topic: 'Section-Based Homepage Builder vs Rich Text Freeform Page',
    options: ['Hardcoded JSX Template', 'Rich Text HTML Editor', 'Section-Based Configurable Builder dengan Component Registry'],
    selected: 'Section-Based Configurable Builder dengan Component Registry',
    rationale: 'Administrator non-teknis dapat menyusun urutan section, mengubah tata letak, dan mengaktifkan/nonaktifkan modul tanpa merusak desain & responsiveness.',
    impact: 'Fleksibilitas penuh tanpa mengorbankan konsistensi UI/UX & performance.'
  },
  {
    id: 'ADR-03',
    topic: 'Pemisahan Standar Pelayanan Publik, SPM, dan SOP Internal',
    options: ['Menggabungkan dalam 1 Dokumen Service', 'Pemisahan Entitas Konseptual & Database Terstruktur'],
    selected: 'Pemisahan Entitas Konseptual (Services -> Service Standards -> SPM References)',
    rationale: 'Permenkes 19/2024 (Tata Kelola Puskesmas & Klaster), UU Pelayanan Publik (11 Komponen Publik), dan Permenkes 6/2024 (SPM 12 Indikator) memiliki fungsi hukum dan audiens yang berbeda.',
    impact: 'Mencegah kerancuan hukum & mempermudah audit pelayanan publik.'
  },
  {
    id: 'ADR-04',
    topic: 'Arsitektur Tema & Design Tokens (Geometric Balance Theme)',
    options: ['CSS File terpisah per halaman', 'Tailwind Utility Direct Hardcode', 'CSS Custom Variables System + Design Tokens'],
    selected: 'CSS Custom Variables System + Design Tokens (Geometric Balance Accent)',
    rationale: 'Memungkinkan perubahan warna primer, radius, font, dan mode gelap/terang secara global dari CMS tanpa re-compile source code.',
    impact: 'Dukungan Multi-Theme & Microsite Custom Theme secara instan.'
  }
];

export const APPROVAL_CHECKLIST: ChecklistItem[] = [
  { id: 'chk-1', category: 'Architecture', title: 'Single Source of Truth & Modular Architecture', description: 'Memastikan data layanan, berita, media, dan tema dikelola di satu tempat dan tidak diduplikasi.', status: 'approved' },
  { id: 'chk-2', category: 'Health Model', title: 'Permenkes 19/2024 (5 Klaster & Siklus Hidup)', description: 'Penerapan struktur Klaster 1-4 + Lintas Klaster dan kategori Siklus Hidup pada Health Service Engine.', status: 'approved' },
  { id: 'chk-3', category: 'Legal Standard', title: '11 Komponen Standar Pelayanan & SPM (Permenkes 6/2024)', description: 'Pemisahan entitas Standar Pelayanan Publik dengan SPM dan SOP Internal.', status: 'approved' },
  { id: 'chk-4', category: 'Design System', title: 'Section-Based Homepage & Geometric Balance Design System', description: 'Arsitektur Homepage Builder berbasis Component Registry dan tema visual modern beraksen geometri.', status: 'approved' },
  { id: 'chk-5', category: 'Microsite', title: 'Microsite Engine & Server-Side Password Security', description: 'Microsite independen dengan sistem verifikasi password aman via backend/Cloud Function.', status: 'approved' },
  { id: 'chk-6', category: 'Security & Auth', title: 'RBAC Granular & Immutable Audit Log', description: 'Pemeriksaan izin berlapis (UI, App, Security Rules) dan pencatatan riwayat audit lengkap.', status: 'approved' },
  { id: 'chk-7', category: 'Database Schema', title: 'Model Koleksi & Indeks Firestore Phase 1', description: 'Skema Firestore lengkap untuk Core, Content, Health, Design, dan Microsite.', status: 'approved' },
  { id: 'chk-8', category: 'Roadmap', title: 'Roadmap Pengembangan Phase 2-5', description: 'Rencana bertahap dari Fondasi (Phase 2), Engine Utama (Phase 3), Builder & Microsite (Phase 4), hingga Polish & Deployment (Phase 5).', status: 'approved' },
];
