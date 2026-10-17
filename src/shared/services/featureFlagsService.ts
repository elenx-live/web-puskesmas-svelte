import type { SiteFeatureFlags, MenuItem, MenuTreeItem } from '../types/index.js';
import { auditService } from './auditService';
import { siteSettingsService } from './siteSettingsService';

const FEATURE_FLAGS_STORAGE_KEY = 'puskesmas_feature_flags';

export const DEFAULT_FEATURE_FLAGS: SiteFeatureFlags = {
  onlineQueue: true,
  complaints: true,
  skm: true,
  microsite: true,
  publicInfoRequests: true,
  news: true,
  documents: true,
  gallery: true,
  faq: true,
  staffDirectory: true,
  orgStructure: true,
  facilities: true,
  notifications: true
};

export interface FeatureMetadata {
  key: keyof SiteFeatureFlags;
  label: string;
  category: 'Pelayanan Pasien' | 'Publikasi & Media' | 'Profil & Direktori';
  description: string;
  impactExplanation: string;
  affectedPaths: string[];
  disabledNotice: string;
  iconName: string;
  badge?: string;
  recommendedUse: string;
}

export const FEATURE_CATALOG: FeatureMetadata[] = [
  // 1. Pelayanan Pasien
  {
    key: 'onlineQueue',
    label: 'Pendaftaran & Antrean Online',
    category: 'Pelayanan Pasien',
    description: 'Pendaftaran mandiri pasien online dan pemantauan display antrean loket / poli secara live.',
    impactExplanation: 'Menyembunyikan tombol "Daftar Online" & "Antrean Live" di Beranda, menu Pendaftaran di dock bawah mobile, dan memblokir akses ke /pendaftaran dan /antrian.',
    affectedPaths: ['/pendaftaran', '/pendaftaran/cek', '/antrian', '/antrian/display', '/antrian-display', '/antrian-status'],
    disabledNotice: 'Pendaftaran dan pemantauan antrean online saat ini sedang dinonaktifkan sementara. Silakan datang langsung ke loket pendaftaran Puskesmas.',
    iconName: 'Activity',
    badge: 'Pasien Primer',
    recommendedUse: 'Nonaktifkan jika Puskesmas hanya melayani loket fisik / offline atau sedang transisi sistem antrean internal.'
  },
  {
    key: 'complaints',
    label: 'Pengaduan, Saran & Aduan Masyarakat',
    category: 'Pelayanan Pasien',
    description: 'Kanal formulir kritik, saran, pengaduan pelayanan, dan pengecekan tiket aduan masyarakat.',
    impactExplanation: 'Menyembunyikan kartu Quick Access "Pengaduan", blok kritik/saran di Beranda, menu pengaduan di footer dan drawer navigasi.',
    affectedPaths: ['/pengaduan', '/kritik-saran', '/pengaduan/cek'],
    disabledNotice: 'Kanal pengaduan online sedang dinonaktifkan. Anda dapat menyampaikan pengaduan langsung melalui kotak saran di Puskesmas atau WhatsApp resmi kami.',
    iconName: 'MessageSquare',
    badge: 'Akuntabilitas',
    recommendedUse: 'Nonaktifkan jika pengelolaan pengaduan dialihkan sepenuhnya ke SP4N-LAPOR! eksternal atau WhatsApp resmi.'
  },
  {
    key: 'skm',
    label: 'Survei Kepuasan Masyarakat (SKM)',
    category: 'Pelayanan Pasien',
    description: 'Kuesioner evaluasi kepuasan publik berdasarkan Permenpan RB untuk mengukur IKM (Indeks Kepuasan Masyarakat).',
    impactExplanation: 'Menyembunyikan tautan survei publik di menu, footer, dan banner SKM serta membatasi halaman /survei.',
    affectedPaths: ['/survei'],
    disabledNotice: 'Periode pengisian Survei Kepuasan Masyarakat (SKM) saat ini sedang ditutup atau belum dibuka oleh tim manajemen mutu.',
    iconName: 'HelpCircle',
    badge: 'Permenpan RB',
    recommendedUse: 'Nonaktifkan jika periode survei triwulan/semesteran telah berakhir atau rekapitulasi data sedang diproses.'
  },
  {
    key: 'publicInfoRequests',
    label: 'Permintaan Informasi Publik & PPID',
    category: 'Pelayanan Pasien',
    description: 'Layanan permohonan informasi publik dan pengajuan keberatan sesuai regulasi UU Keterbukaan Informasi Publik.',
    impactExplanation: 'Menyembunyikan menu PPID dan formulir permohonan informasi publik pada menu navigasi.',
    affectedPaths: ['/permintaan-informasi'],
    disabledNotice: 'Layanan permintaan informasi publik online sedang dinonaktifkan. Silakan mengajukan langsung ke meja PPID di kantor Puskesmas.',
    iconName: 'FileCheck',
    badge: 'PPID Resmi',
    recommendedUse: 'Nonaktifkan jika permohonan informasi wajib diajukan melalui portal PPID terpusat Dinas Kesehatan / Pemda.'
  },

  // 2. Publikasi & Media
  {
    key: 'microsite',
    label: 'Microsite & Portal Faskes Khusus',
    category: 'Publikasi & Media',
    description: 'Sistem sub-portal mandiri untuk Puskesmas Pembantu (Pustu), Poskesdes, Polindes, Posyandu Prima, atau program tematik.',
    impactExplanation: 'Menghilangkan menu "Microsite" dari header navigasi, mobile drawer, dan bagian direktori microsite di Beranda.',
    affectedPaths: ['/microsites', '/m/'],
    disabledNotice: 'Portal Microsite dan jejaring saat ini dinonaktifkan atau belum dikonfigurasi.',
    iconName: 'Globe',
    badge: 'Jejaring Faskes',
    recommendedUse: 'Nonaktifkan jika Puskesmas belum memiliki atau belum menggunakan portal turunan microsite.'
  },
  {
    key: 'news',
    label: 'Berita & Artikel Edukasi Kesehatan',
    category: 'Publikasi & Media',
    description: 'Publikasi berita terkini, edukasi promosi kesehatan (Promkes), dan dokumentasi kegiatan puskesmas.',
    impactExplanation: 'Menghilangkan section artikel di Beranda, menu Berita di navbar, dock, dan footer.',
    affectedPaths: ['/berita'],
    disabledNotice: 'Rubrik berita dan artikel saat ini sedang tidak ditampilkan.',
    iconName: 'Sparkles',
    badge: 'Promkes',
    recommendedUse: 'Nonaktifkan jika belum ada konten artikel yang siap dipublikasikan agar situs tetap terlihat ringkas.'
  },
  {
    key: 'documents',
    label: 'Dokumen Publik & Standar Pelayanan (SPP)',
    category: 'Publikasi & Media',
    description: 'Katalog unduhan dokumen SOP, Maklumat Pelayanan, SK Tarif, dan dokumen transparansi SPP.',
    impactExplanation: 'Menyembunyikan tombol "Dokumen & SPP" di Beranda & dock bawah, serta menu dokumen di navbar dan footer.',
    affectedPaths: ['/dokumen'],
    disabledNotice: 'Halaman unduhan dokumen publik sedang dinonaktifkan sementara.',
    iconName: 'FileText',
    badge: 'Transparansi',
    recommendedUse: 'Nonaktifkan saat berkas regulasi sedang dalam proses revisi atau pembaruan SK Kepala Puskesmas.'
  },
  {
    key: 'gallery',
    label: 'Galeri Foto & Dokumentasi Kegiatan',
    category: 'Publikasi & Media',
    description: 'Album foto kegiatan lapangan, posyandu keliling, penyuluhan kesehatan, dan fasilitas puskesmas.',
    impactExplanation: 'Menghilangkan menu "Galeri Foto" dari header dan footer website.',
    affectedPaths: ['/galeri'],
    disabledNotice: 'Galeri foto kegiatan sedang tidak aktif.',
    iconName: 'Image',
    badge: 'Dokumentasi',
    recommendedUse: 'Nonaktifkan jika foto dokumentasi belum diunggah atau masih dalam penyusunan.'
  },
  {
    key: 'faq',
    label: 'FAQ & Pusat Bantuan Interaktif',
    category: 'Publikasi & Media',
    description: 'Daftar pertanyaan yang sering diajukan masyarakat terkait syarat BPJS, jam faskes, rujukan, dsb.',
    impactExplanation: 'Menyembunyikan tautan FAQ & Bantuan pada menu dan footer.',
    affectedPaths: ['/faq', '/pusat-bantuan'],
    disabledNotice: 'Pusat Bantuan FAQ sedang dinonaktifkan sementara.',
    iconName: 'HelpCircle',
    badge: 'Bantuan Cepat',
    recommendedUse: 'Nonaktifkan jika informasi layanan telah terakomodasi lengkap di halaman profil/layanan primer.'
  },

  // 3. Profil & Direktori
  {
    key: 'staffDirectory',
    label: 'Direktori Pegawai & Jadwal Dokter',
    category: 'Profil & Direktori',
    description: 'Daftar tenaga kesehatan, dokter spesialis/umum, perawat, bidan, dan profil SDM kesehatan.',
    impactExplanation: 'Menyembunyikan tautan direktori petugas di dropdown Profil dan halaman terkait.',
    affectedPaths: ['/profil/petugas'],
    disabledNotice: 'Direktori pegawai dan tenaga medis sedang dalam proses pembaruan data kepegawaian.',
    iconName: 'Users',
    badge: 'SDMK',
    recommendedUse: 'Nonaktifkan bila data tenaga medis sedang dirolling atau dimutasi.'
  },
  {
    key: 'orgStructure',
    label: 'Bagan Struktur Organisasi',
    category: 'Profil & Direktori',
    description: 'Visualisasi hierarki kepemimpinan, tata usaha, dan penanggung jawab klaster Puskesmas.',
    impactExplanation: 'Menyembunyikan menu struktur organisasi di dropdown Profil.',
    affectedPaths: ['/profil/struktur-organisasi'],
    disabledNotice: 'Bagan struktur organisasi sedang dalam pemutakhiran.',
    iconName: 'GitBranch',
    badge: 'Tata Kelola',
    recommendedUse: 'Nonaktifkan jika terjadi restrukturisasi pejabat fungsional atau pelaksana.'
  },
  {
    key: 'facilities',
    label: 'Sarana & Fasilitas Puskesmas',
    category: 'Profil & Direktori',
    description: 'Daftar inventaris ruang tunggu, lab, ambulans, apotek, rawat inap, dan fasilitas penunjang.',
    impactExplanation: 'Menyembunyikan menu dan halaman sarana fasilitas publik.',
    affectedPaths: ['/fasilitas'],
    disabledNotice: 'Informasi sarana fasilitas sedang tidak ditampilkan.',
    iconName: 'Building2',
    badge: 'Sarpras',
    recommendedUse: 'Nonaktifkan bila inventaris fasilitas sedang diaudit atau direnovasi.'
  },
  {
    key: 'notifications',
    label: 'Lonceng Notifikasi & Pengumuman Pasien',
    category: 'Pelayanan Pasien',
    description: 'Ikon lonceng notifikasi di bilah atas untuk melihat pemberitahuan siaran dan update status.',
    impactExplanation: 'Menyembunyikan ikon lonceng notifikasi di header atas baik versi desktop maupun mobile.',
    affectedPaths: ['/notifications', '/aktivitas'],
    disabledNotice: 'Pusat notifikasi sedang dinonaktifkan.',
    iconName: 'Bell',
    badge: 'Interaktif',
    recommendedUse: 'Nonaktifkan jika Anda tidak menggunakan sistem broadcast notifikasi.'
  }
];

class FeatureFlagsService {
  private memoryFlags: SiteFeatureFlags | null = null;

  getFlags(): SiteFeatureFlags {
    if (this.memoryFlags) return this.memoryFlags;

    try {
      // 1. Check direct local storage
      const stored = localStorage.getItem(FEATURE_FLAGS_STORAGE_KEY);
      if (stored) {
        this.memoryFlags = { ...DEFAULT_FEATURE_FLAGS, ...JSON.parse(stored) };
        return this.memoryFlags!;
      }

      // 2. Check site settings
      const siteSettings = localStorage.getItem('puskesmas_site_settings');
      if (siteSettings) {
        const parsed = JSON.parse(siteSettings);
        if (parsed.featureFlags) {
          this.memoryFlags = { ...DEFAULT_FEATURE_FLAGS, ...parsed.featureFlags };
          return this.memoryFlags!;
        }
      }
    } catch {
      // ignore
    }

    this.memoryFlags = { ...DEFAULT_FEATURE_FLAGS };
    return this.memoryFlags;
  }

  isFeatureEnabled(key: keyof SiteFeatureFlags): boolean {
    const flags = this.getFlags();
    return flags[key] !== false;
  }

  async updateFlags(
    newFlags: Partial<SiteFeatureFlags>,
    user?: { id: string; email: string; name: string }
  ): Promise<SiteFeatureFlags> {
    const current = this.getFlags();
    const updated: SiteFeatureFlags = {
      ...current,
      ...newFlags
    };

    this.memoryFlags = updated;

    try {
      localStorage.setItem(FEATURE_FLAGS_STORAGE_KEY, JSON.stringify(updated));

      // Sync with SiteSettings
      const siteSettings = siteSettingsService.getCachedSettings();
      siteSettings.featureFlags = updated;
      if (typeof updated.microsite === 'boolean') {
        siteSettings.micrositeEnabled = updated.microsite;
      }
      await siteSettingsService.updateSettings(siteSettings, user);

      // Trigger global event so all components react immediately
      window.dispatchEvent(
        new CustomEvent('puskesmas_features_updated', {
          detail: updated
        })
      );

      // Audit log
      if (user) {
        auditService.recordLog({
          userId: user.id,
          userEmail: user.email,
          userName: user.name,
          action: 'SETTINGS_CHANGE',
          module: 'SETTINGS',
          targetId: 'feature_flags',
          targetName: 'Panel Kontrol Fitur Website',
          description: 'Memperbarui status aktif/nonaktif modul fitur website puskesmas',
          details: { updatedFlags: newFlags }
        });
      }
    } catch (err) {
      console.error('Failed to save feature flags:', err);
    }

    return updated;
  }

  async toggleAll(enable: boolean, user?: { id: string; email: string; name: string }): Promise<SiteFeatureFlags> {
    const allFlags: Partial<SiteFeatureFlags> = {};
    for (const item of FEATURE_CATALOG) {
      allFlags[item.key] = enable;
    }
    return this.updateFlags(allFlags, user);
  }

  async resetToDefaults(user?: { id: string; email: string; name: string }): Promise<SiteFeatureFlags> {
    return this.updateFlags(DEFAULT_FEATURE_FLAGS, user);
  }

  /**
   * Check if a given path is currently accessible based on enabled features.
   */
  checkPathAccess(pathname: string): { allowed: boolean; featureMeta?: FeatureMetadata } {
    const normalized = pathname.toLowerCase();

    for (const item of FEATURE_CATALOG) {
      const isAffected = item.affectedPaths.some(path => {
        const normPath = path.toLowerCase();
        return normalized === normPath || normalized.startsWith(normPath + '/') || normalized.startsWith(normPath + '?');
      });

      if (isAffected) {
        const isEnabled = this.isFeatureEnabled(item.key);
        if (!isEnabled) {
          return { allowed: false, featureMeta: item };
        }
      }
    }

    return { allowed: true };
  }

  /**
   * Filter an array of navigation menu items so that disabled feature links are removed.
   */
  filterMenuItems(items: MenuTreeItem[], customFlags?: SiteFeatureFlags): MenuTreeItem[] {
    const flags = customFlags || this.getFlags();

    return items
      .filter(item => {
        const url = (item.url || '').toLowerCase();
        const id = (item.id || '').toLowerCase();

        // 1. Online Queue & Pendaftaran
        if (!flags.onlineQueue) {
          if (url.includes('/pendaftaran') || url.includes('/antrian')) return false;
        }

        // 2. Complaints
        if (!flags.complaints) {
          if (url.includes('/pengaduan') || url.includes('/kritik-saran')) return false;
        }

        // 3. SKM
        if (!flags.skm) {
          if (url.includes('/survei')) return false;
        }

        // 4. Microsite
        if (!flags.microsite) {
          if (url.includes('/microsites') || url.includes('/m/') || id === 'menu-microsites') return false;
        }

        // 5. Public info request
        if (!flags.publicInfoRequests) {
          if (url.includes('/permintaan-informasi')) return false;
        }

        // 6. News
        if (!flags.news) {
          if (url.includes('/berita')) return false;
        }

        // 7. Documents
        if (!flags.documents) {
          if (url.includes('/dokumen')) return false;
        }

        // 8. Gallery
        if (!flags.gallery) {
          if (url.includes('/galeri')) return false;
        }

        // 9. FAQ
        if (!flags.faq) {
          if (url.includes('/faq') || url.includes('/pusat-bantuan')) return false;
        }

        // 10. Staff Directory
        if (!flags.staffDirectory) {
          if (url.includes('/profil/petugas')) return false;
        }

        // 11. Org Structure
        if (!flags.orgStructure) {
          if (url.includes('/profil/struktur-organisasi')) return false;
        }

        // 12. Facilities
        if (!flags.facilities) {
          if (url.includes('/fasilitas')) return false;
        }

        return true;
      })
      .map(item => {
        if (item.children && item.children.length > 0) {
          return {
            ...item,
            children: this.filterMenuItems(item.children as MenuTreeItem[], flags)
          };
        }
        return item;
      });
  }
}

export const featureFlagsService = new FeatureFlagsService();
