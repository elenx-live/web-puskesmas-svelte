import {
  LayoutDashboard,
  Activity,
  BarChart2,
  UserCheck,
  ListOrdered,
  HeartPulse,
  FileText,
  Layers,
  Bell,
  Menu,
  Sliders,
  Sparkles,
  ImageIcon,
  CheckCircle2,
  GitBranch,
  Building2,
  Globe,
  MessageSquare,
  HelpCircle,
  Phone,
  Clock,
  Users,
  Shield,
  Palette,
  HardDrive,
  ShieldAlert,
  History,
  Target,
  Share2,
  Calendar,
  Mail,
  Wrench,
  Search,
} from 'lucide-svelte';

import type { Component } from 'svelte';

/** Tipe ikon dari lucide-svelte (pengganti LucideIcon milik lucide-react). */
export type LucideIcon = Component;

export interface NavSubItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  href: string;
  permission?: string;
  badge?: string;
  keywords?: string[];
}

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
  permission?: string;
  badge?: string;
  subItems?: NavSubItem[];
  keywords?: string[];
}

export interface NavGroup {
  id: string;
  group: string;
  icon: LucideIcon;
  description?: string;
  items: NavItem[];
}

export const ADMIN_NAVIGATION: NavGroup[] = [
  // 1. DASHBOARD - Ringkasan & Analitik
  {
    id: 'dashboard-group',
    group: 'DASHBOARD',
    icon: LayoutDashboard,
    description: 'Ringkasan performa dan metrik operasional',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard Utama',
        icon: LayoutDashboard,
        href: '/admin',
        keywords: ['ringkasan', 'overview', 'statistik', 'home']
      },
      {
        id: 'operational-dashboard',
        label: 'Dashboard Operasional',
        icon: Activity,
        href: '/admin/operational-dashboard',
        permission: 'view_operational_dashboard',
        badge: 'Realtime',
        keywords: ['operasional', 'realtime', 'ruang periksa', 'beban kerja']
      },
      {
        id: 'services-dashboard',
        label: 'Dashboard Layanan',
        icon: BarChart2,
        href: '/admin/services/dashboard',
        permission: 'manage_services_clusters',
        keywords: ['layanan', 'analisis poli', 'kunjungan pasien', 'grafik']
      }
    ]
  },

  // 2. OPERASIONAL - Pelayanan Harian Petugas
  {
    id: 'operasional-group',
    group: 'OPERASIONAL',
    icon: UserCheck,
    description: 'Pekerjaan pelayanan pasien harian',
    items: [
      {
        id: 'pendaftaran',
        label: 'Pendaftaran Pasien',
        icon: UserCheck,
        href: '/admin/pendaftaran',
        permission: 'manage_services_clusters',
        badge: 'Online',
        keywords: ['pendaftaran', 'registrasi', 'pasien online', 'reservasi', 'bpjs']
      },
      {
        id: 'antrian',
        label: 'Antrean Pelayanan',
        icon: ListOrdered,
        href: '/admin/antrian',
        permission: 'manage_services_clusters',
        badge: 'Live',
        keywords: ['antrean', 'antrian', 'loket', 'pemanggilan', 'nomor antrean']
      },
      {
        id: 'layanan-aktif',
        label: 'Layanan Aktif',
        icon: HeartPulse,
        href: '/admin/services',
        permission: 'manage_services_clusters',
        keywords: ['layanan aktif', 'poli aktif', 'operasional layanan']
      }
    ]
  },

  // 3. WEBSITE & KONTEN - Pengelolaan Isi Website Publik
  {
    id: 'konten-group',
    group: 'WEBSITE & KONTEN',
    icon: Globe,
    description: 'Pengelolaan konten publik dan publikasi berita',
    items: [
      {
        id: 'posts',
        label: 'Berita & Artikel',
        icon: FileText,
        href: '/admin/posts',
        permission: 'manage_posts_categories',
        keywords: ['berita', 'artikel', 'post', 'publikasi', 'rilis']
      },
      {
        id: 'categories',
        label: 'Kategori Berita',
        icon: Layers,
        href: '/admin/categories',
        permission: 'manage_posts_categories',
        keywords: ['kategori berita', 'taksonomi', 'topik']
      },
      {
        id: 'announcements',
        label: 'Pengumuman Publik',
        icon: Bell,
        href: '/admin/announcements',
        permission: 'manage_pages_menus',
        keywords: ['pengumuman', 'broadcast', 'pemberitahuan', 'siaran']
      },
      {
        id: 'pages',
        label: 'Halaman Dinamis',
        icon: FileText,
        href: '/admin/pages',
        permission: 'manage_pages_menus',
        keywords: ['halaman', 'pages', 'profil', 'maklumat', 'sop']
      },
      {
        id: 'menus',
        label: 'Menu Navigasi',
        icon: Menu,
        href: '/admin/menus',
        permission: 'manage_pages_menus',
        keywords: ['menu navigasi', 'navbar', 'header', 'footer']
      },
      {
        id: 'dynamic-content',
        label: 'Konten Dinamis',
        icon: Sliders,
        href: '/admin/dynamic-content',
        permission: 'view_content',
        keywords: ['konten dinamis', 'banner', 'popup', 'widget']
      },
      {
        id: 'seo-search',
        label: 'SEO & Penelusuran',
        icon: Search,
        href: '/admin/seo',
        permission: 'manage_site_settings',
        badge: 'SEO',
        keywords: ['seo', 'meta tag', 'open graph', 'google search console', 'sitemap', 'penelusuran', 'whatsapp preview', 'audit seo']
      },
      {
        id: 'media',
        label: 'Media Library',
        icon: ImageIcon,
        href: '/admin/media',
        permission: 'manage_media',
        keywords: ['media', 'galeri foto', 'upload gambar', 'file']
      },
      {
        id: 'documents',
        label: 'Dokumen & Publikasi',
        icon: FileText,
        href: '/admin/documents',
        permission: 'manage_pages_menus',
        keywords: ['dokumen', 'unduhan', 'pdf', 'laporan', 'regulasi']
      },
      {
        id: 'gallery',
        label: 'Galeri Foto',
        icon: ImageIcon,
        href: '/admin/gallery',
        permission: 'manage_pages_menus',
        keywords: ['galeri', 'album foto', 'dokumentasi']
      }
    ]
  },

  // 4. LAYANAN PASIEN - Master & Konfigurasi Layanan Medis
  {
    id: 'layanan-group',
    group: 'LAYANAN PASIEN',
    icon: HeartPulse,
    description: 'Master data dan konfigurasi layanan medis',
    items: [
      {
        id: 'services',
        label: 'Daftar Layanan',
        icon: HeartPulse,
        href: '/admin/services',
        permission: 'manage_services_clusters',
        keywords: ['daftar layanan', 'katalog poli', 'tarif', 'syarat']
      },
      {
        id: 'services-review',
        label: 'Review & Persetujuan',
        icon: CheckCircle2,
        href: '/admin/services/review',
        permission: 'manage_services_clusters',
        badge: 'Approval',
        keywords: ['review', 'persetujuan', 'verifikasi layanan']
      },
      {
        id: 'services-categories',
        label: 'Kategori Layanan',
        icon: Layers,
        href: '/admin/services/categories',
        permission: 'manage_services_clusters',
        keywords: ['kategori layanan', 'klasifikasi poli']
      },
      {
        id: 'services-clusters',
        label: 'Klaster Layanan',
        icon: GitBranch,
        href: '/admin/services/clusters',
        permission: 'manage_services_clusters',
        badge: 'ILP',
        keywords: ['klaster ilp', 'integrasi layanan primer', 'siklus hidup']
      },
      {
        id: 'services-units',
        label: 'Unit Pelayanan',
        icon: Building2,
        href: '/admin/services/units',
        permission: 'manage_services_clusters',
        keywords: ['unit pelayanan', 'poli gigi', 'poli umum', 'igd', 'laboratorium']
      },
      {
        id: 'services-locations',
        label: 'Lokasi Pelayanan',
        icon: Globe,
        href: '/admin/services/locations',
        permission: 'manage_services_clusters',
        keywords: ['lokasi pelayanan', 'ruangan', 'lantai', 'denah']
      }
    ]
  },

  // 5. KOMUNIKASI & PPID - Interaksi Publik & Aspirasi
  {
    id: 'komunikasi-group',
    group: 'KOMUNIKASI & PPID',
    icon: MessageSquare,
    description: 'Aspirasi masyarakat dan informasi publik',
    items: [
      {
        id: 'pengaduan',
        label: 'Pengaduan & Feedback',
        icon: MessageSquare,
        href: '/admin/pengaduan',
        permission: 'view_complaints',
        badge: 'Aspirasi',
        keywords: ['pengaduan', 'saran', 'kritik', 'keluhan', 'aspirasi']
      },
      {
        id: 'info-requests',
        label: 'Permintaan Informasi',
        icon: FileText,
        href: '/admin/info-requests',
        permission: 'manage_information_requests',
        badge: 'PPID',
        keywords: ['ppid', 'permintaan informasi', 'permohonan dokumen']
      },
      {
        id: 'public-info',
        label: 'Informasi Publik',
        icon: Globe,
        href: '/admin/public-info',
        permission: 'view_public_information',
        keywords: ['informasi publik', 'daftar informasi berkala', 'serta merta']
      },
      {
        id: 'faq',
        label: 'FAQ & Pusat Bantuan',
        icon: HelpCircle,
        href: '/admin/faq',
        permission: 'view_faq',
        keywords: ['faq', 'tanya jawab', 'bantuan', 'pertanyaan umum']
      },
      {
        id: 'survei',
        label: 'Survei Kepuasan',
        icon: BarChart2,
        href: '/admin/survei',
        permission: 'view_surveys',
        badge: 'SKM',
        keywords: ['survei', 'skm', 'kepuasan masyarakat', 'ikm']
      }
    ]
  },

  // 6. PROFIL & FASILITAS - Identitas, Pegawai & Sarana
  {
    id: 'profil-group',
    group: 'PROFIL & FASILITAS',
    icon: Building2,
    description: 'Profil lembaga, staf, sarana, dan jam kerja',
    items: [
      {
        id: 'identitas-instansi',
        label: 'Identitas Puskesmas',
        icon: Building2,
        href: '/admin/settings?domain=identity',
        permission: 'manage_site_settings',
        badge: 'Profil',
        keywords: ['identitas', 'profil puskesmas', 'visi misi', 'sejarah', 'kontak instansi'],
        subItems: [
          {
            id: 'sec-profile',
            label: 'Profil & Identitas Utama',
            icon: Building2,
            href: '/admin/settings?domain=identity&sub=sec-profile'
          },
          {
            id: 'sec-vision',
            label: 'Visi, Misi & Sejarah',
            icon: Target,
            href: '/admin/settings?domain=identity&sub=sec-vision'
          },
          {
            id: 'sec-org',
            label: 'Instansi Induk & Wilayah',
            icon: Users,
            href: '/admin/settings?domain=identity&sub=sec-org'
          },
          {
            id: 'sec-contact',
            label: 'Kontak Resmi & Alamat',
            icon: Phone,
            href: '/admin/settings?domain=identity&sub=sec-contact'
          },
          {
            id: 'sec-social',
            label: 'Tautan Media Sosial',
            icon: Share2,
            href: '/admin/settings?domain=identity&sub=sec-social'
          }
        ]
      },
      {
        id: 'org-structure',
        label: 'Struktur Organisasi',
        icon: GitBranch,
        href: '/admin/org-structure',
        permission: 'view_staff_directory',
        keywords: ['struktur organisasi', 'bagan organisasi', 'pimpinan', 'tata usaha']
      },
      {
        id: 'staff-directory',
        label: 'Direktori Petugas',
        icon: Users,
        href: '/admin/staff-directory',
        permission: 'view_staff_directory',
        keywords: ['petugas', 'dokter', 'perawat', 'bidan', 'nakes', 'sdm']
      },
      {
        id: 'facilities',
        label: 'Sarana & Fasilitas',
        icon: Building2,
        href: '/admin/facilities',
        permission: 'view_facilities',
        keywords: ['sarana', 'fasilitas', 'gedung', 'ambulans', 'ruangan']
      },
      {
        id: 'contact-settings',
        label: 'Kontak & Darurat',
        icon: Phone,
        href: '/admin/contact-settings',
        permission: 'view_contact_settings',
        badge: '24 Jam',
        keywords: ['kontak darurat', 'hotline', '119', 'telepon', 'whatsapp darurat']
      },
      {
        id: 'operasional-puskesmas',
        label: 'Operasional Puskesmas',
        icon: Clock,
        href: '/admin/settings?domain=services_ops',
        permission: 'manage_site_settings',
        keywords: ['jam kerja', 'jadwal operasional', 'hari libur', 'aturan layanan'],
        subItems: [
          {
            id: 'sec-service-rules',
            label: 'Katalog & Aturan Layanan',
            icon: Layers,
            href: '/admin/settings?domain=services_ops&sub=sec-service-rules'
          },
          {
            id: 'sec-schedules',
            label: 'Jam Kerja & Hari Libur',
            icon: Calendar,
            href: '/admin/settings?domain=services_ops&sub=sec-schedules'
          },
          {
            id: 'sec-microsite',
            label: 'Integrasi Portal Microsite',
            icon: Globe,
            href: '/admin/settings?domain=services_ops&sub=sec-microsite'
          }
        ]
      }
    ]
  },

  // 7. MICROSITE - Sub-portal Puskesmas Pembantu / Poskesdes
  {
    id: 'microsite-group',
    group: 'MICROSITE',
    icon: Globe,
    description: 'Sub-portal mandiri Pustu, Poskesdes dan unit inovasi',
    items: [
      {
        id: 'microsites',
        label: 'Unit & Microsite',
        icon: Globe,
        href: '/admin/microsites',
        permission: 'manage_microsites',
        badge: 'Multi-Site',
        keywords: ['microsite', 'pustu', 'poskesdes', 'sub portal', 'satelit']
      }
    ]
  },

  // 8. PENGGUNA & HAK AKSES - Otoritas & Akun
  {
    id: 'pengguna-group',
    group: 'PENGGUNA & HAK AKSES',
    icon: Users,
    description: 'Manajemen akun petugas, peran dan perizinan',
    items: [
      {
        id: 'users',
        label: 'Kelola Pengguna',
        icon: Users,
        href: '/admin/users',
        permission: 'manage_users',
        keywords: ['pengguna', 'user', 'akun', 'petugas', 'tambah akun']
      },
      {
        id: 'roles',
        label: 'Peran & Hak Akses',
        icon: Shield,
        href: '/admin/roles',
        permission: 'manage_roles_permissions',
        badge: 'RBAC',
        keywords: ['peran', 'role', 'hak akses', 'permission', 'rbac']
      }
    ]
  },

  // 9. SISTEM & KONFIGURASI - Pengaturan Teknis
  {
    id: 'sistem-group',
    group: 'SISTEM & KONFIGURASI',
    icon: Wrench,
    description: 'Infrastruktur teknis, tema visual, dan integrasi',
    items: [
      {
        id: 'theme-appearance',
        label: 'Tema & Home Page Builder',
        icon: Palette,
        href: '/admin/theme',
        permission: 'manage_homepage_builder',
        badge: 'Studio',
        keywords: ['tema', 'tampilan', 'warna', 'home page builder', 'layout beranda', 'section', 'template', 'desain visual'],
        subItems: [
          {
            id: 'theme-designer',
            label: 'Palet Warna & Desain Visual',
            icon: Palette,
            href: '/admin/theme'
          },
          {
            id: 'homepage-sections',
            label: 'Tata Letak Section Beranda',
            icon: Sparkles,
            href: '/admin/theme'
          },
          {
            id: 'homepage-templates',
            label: 'Template & Efek Latar',
            icon: Sparkles,
            href: '/admin/theme'
          },
          {
            id: 'sec-regional',
            label: 'Format Portal & Regional',
            icon: Globe,
            href: '/admin/settings?domain=appearance&sub=sec-regional'
          }
        ]
      },
      {
        id: 'features-control',
        label: 'Panel Kontrol Fitur',
        icon: Sliders,
        href: '/admin/features',
        permission: 'manage_site_settings',
        badge: 'Master',
        keywords: ['fitur', 'saklar modul', 'enable disable', 'pengaturan fitur']
      },
      {
        id: 'ai-provider',
        label: 'Integrasi AI',
        icon: Sparkles,
        href: '/admin/settings/ai-provider',
        permission: 'manage_site_settings',
        badge: 'AI Engine',
        keywords: ['ai', 'kecerdasan buatan', 'gemini', 'kurasi berita', 'openai']
      },
      {
        id: 'integrasi-notifikasi',
        label: 'Integrasi & Notifikasi',
        icon: Bell,
        href: '/admin/settings?domain=communication',
        permission: 'manage_site_settings',
        keywords: ['whatsapp', 'email', 'smtp', 'notifikasi', 'api'],
        subItems: [
          {
            id: 'sec-wa',
            label: 'WhatsApp Cloud API',
            icon: MessageSquare,
            href: '/admin/settings?domain=communication&sub=sec-wa'
          },
          {
            id: 'sec-email',
            label: 'Email Pengirim & SMTP',
            icon: Mail,
            href: '/admin/settings?domain=communication&sub=sec-email'
          },
          {
            id: 'sec-notif',
            label: 'Pusat Notifikasi & Log',
            icon: Bell,
            href: '/admin/settings?domain=communication&sub=sec-notif'
          }
        ]
      },
      {
        id: 'keamanan-pemeliharaan',
        label: 'Keamanan & Pemeliharaan',
        icon: ShieldAlert,
        href: '/admin/settings?domain=security_system',
        permission: 'manage_site_settings',
        keywords: ['keamanan', 'maintenance', 'reset', 'session', 'timeout'],
        subItems: [
          {
            id: 'sec-security',
            label: 'Kebijakan Sesi & Keamanan',
            icon: Shield,
            href: '/admin/settings?domain=security_system&sub=sec-security'
          },
          {
            id: 'sec-maintenance',
            label: 'Mode Pemeliharaan',
            icon: Wrench,
            href: '/admin/settings?domain=security_system&sub=sec-maintenance'
          },
          {
            id: 'sec-danger',
            label: 'Zona Bahaya & Reset Pabrik',
            icon: ShieldAlert,
            href: '/admin/settings?domain=security_system&sub=sec-danger'
          }
        ]
      },
      {
        id: 'system-backup',
        label: 'Backup & Recovery',
        icon: HardDrive,
        href: '/admin/system/backup',
        permission: 'manage_backup',
        keywords: ['backup', 'restore', 'cadangan data', 'recovery', 'snapshot']
      }
    ]
  },

  // 10. MONITORING & LOGS - Pemantauan Teknis
  {
    id: 'monitoring-group',
    group: 'MONITORING & LOGS',
    icon: Activity,
    description: 'Status kesehatan server, latensi dan jejak audit aktivitas',
    items: [
      {
        id: 'system-health',
        label: 'Status Health Sistem',
        icon: Activity,
        href: '/admin/system/health',
        permission: 'manage_backup',
        badge: 'Realtime',
        keywords: ['health', 'server', 'database', 'uptime', 'latensi', 'monitoring']
      },
      {
        id: 'audit-log',
        label: 'Audit Log System',
        icon: History,
        href: '/admin/audit',
        permission: 'view_audit_logs',
        keywords: ['audit log', 'riwayat aktivitas', 'jejak forensik', 'log login']
      }
    ]
  }
];

export interface NavMatchResult {
  group: NavGroup;
  item: NavItem;
  subItem?: NavSubItem;
}

/**
 * Resolves current URL pathname & search parameters to the exact navigation item and breadcrumbs
 */
export function findNavigationEntry(pathname: string, search: string = ''): NavMatchResult | null {
  const currentFull = `${pathname}${search}`;

  // 1. First priority: Exact match with query params (e.g. /admin/settings?domain=identity&sub=sec-profile)
  for (const group of ADMIN_NAVIGATION) {
    for (const item of group.items) {
      if (item.subItems) {
        for (const sub of item.subItems) {
          if (sub.href === currentFull) {
            return { group, item, subItem: sub };
          }
        }
      }
    }
  }

  // 2. Second priority: Match with domain parameter if present
  if (search.includes('domain=')) {
    for (const group of ADMIN_NAVIGATION) {
      for (const item of group.items) {
        if (item.href.includes('?') && currentFull.startsWith(item.href)) {
          return { group, item };
        }
        if (item.subItems) {
          for (const sub of item.subItems) {
            if (sub.href.includes('?') && currentFull.startsWith(sub.href.split('&')[0])) {
              return { group, item, subItem: sub };
            }
          }
        }
      }
    }
  }

  // 3. Third priority: Exact pathname match
  for (const group of ADMIN_NAVIGATION) {
    for (const item of group.items) {
      if (item.href.split('?')[0] === pathname) {
        return { group, item };
      }
      if (item.subItems) {
        for (const sub of item.subItems) {
          if (sub.href.split('?')[0] === pathname) {
            return { group, item, subItem: sub };
          }
        }
      }
    }
  }

  // 4. Fallback for root admin
  if (pathname === '/admin') {
    const dashboardGroup = ADMIN_NAVIGATION[0];
    return { group: dashboardGroup, item: dashboardGroup.items[0] };
  }

  return null;
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: LucideIcon;
}

export function getAdminBreadcrumbs(pathname: string, search: string = '', fallbackTitle?: string): BreadcrumbItem[] {
  const match = findNavigationEntry(pathname, search);
  const crumbs: BreadcrumbItem[] = [
    { label: 'Admin', href: '/admin', icon: LayoutDashboard }
  ];

  if (!match) {
    if (fallbackTitle) {
      crumbs.push({ label: fallbackTitle });
    }
    return crumbs;
  }

  // Add Group
  crumbs.push({ label: match.group.group, icon: match.group.icon });

  // Add Item
  if (match.subItem) {
    crumbs.push({ label: match.item.label, href: match.item.href, icon: match.item.icon });
    crumbs.push({ label: match.subItem.label, href: match.subItem.href, icon: match.subItem.icon });
  } else {
    crumbs.push({ label: match.item.label, href: match.item.href, icon: match.item.icon });
  }

  return crumbs;
}
