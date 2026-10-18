import type { HomepageSection, HomepageBuilderConfig, HomepageTemplateType, BackgroundAnimationType } from '../types/index.js';
import { auditService } from './auditService';
import { saveSingleDocument } from '../lib/firebase';
import { apiFetch } from '../lib/api.js';
import { memStore } from '../lib/memStore';

const DRAFT_KEY = 'puskesmas_homepage_draft';
const PUBLISHED_KEY = 'puskesmas_homepage_published';
const FIRESTORE_COLLECTION = 'site_homepage';

export const INITIAL_HOMEPAGE_SECTIONS: HomepageSection[] = [
  {
    id: 'sec-hero',
    type: 'hero',
    title: 'Pelayanan Kesehatan Terpadu, Profesional & Ramah',
    visible: true,
    order: 0,
    settings: {
      subtitle: 'Puskesmas Manding memberikan pelayanan kesehatan komprehensif berbasis 5 Klaster Kesehatan (Permenkes RI No. 19/2024) dan Standar Pelayanan Minimal (Permenkes No. 6/2024).',
      buttonText: 'Lihat Layanan',
      buttonLink: '/layanan',
      buttonText2: 'Kontak & Pengaduan',
      buttonLink2: '/kontak',
      alignment: 'left',
      bgGradient: true
    }
  },
  {
    id: 'sec-search',
    type: 'search',
    title: 'Pencarian Cepat Informasi Puskesmas',
    visible: true,
    order: 1,
    settings: {
      placeholder: 'Cari layanan, jadwal poli, berita, atau persyaratan...',
      showSuggestions: true
    }
  },
  {
    id: 'sec-sambutan',
    type: 'sambutan',
    title: 'Sambutan Kepala Puskesmas',
    visible: true,
    order: 1,
    settings: {
      name: 'dr. H. Ahmad Fauzi, M.Kes',
      role: 'Kepala Puskesmas',
      text: 'Selamat datang di website resmi Puskesmas Manding. Kami berkomitmen untuk terus meningkatkan pelayanan kesehatan promotif, preventif, kuratif, dan rehabilitatif di wilayah kami sesuai dengan standar nasional, serta mewujudkan integrasi pelayanan kesehatan primer yang inklusif.',
      avatarUrl: ''
    }
  },
  {
    id: 'sec-info',
    type: 'info',
    title: 'Sekilas Puskesmas Kami',
    visible: true,
    order: 2,
    settings: {
      grid: [
        { title: '5 Klaster', desc: 'Penyelenggaraan Klaster Kesehatan Terintegrasi' },
        { title: '24 Jam', desc: 'Layanan UGD & Persalinan Darurat' },
        { title: '11 Komponen', desc: 'Standar Pelayanan Publik Terbuka' },
        { title: '12 SPM', desc: 'Cakupan Standar Pelayanan Minimal' }
      ]
    }
  },
  {
    id: 'sec-unggulan',
    type: 'unggulan',
    title: 'Layanan Unggulan & Inovasi',
    visible: true,
    order: 3,
    settings: {
      items: [
        { name: 'Skrining PTM Keliling', description: 'Pemeriksaan tensi, gula darah, dan kolesterol gratis di dusun-dusun.' },
        { name: 'Pojok Gizi & Konseling', description: 'Pelayanan konseling gizi terpadu untuk penanganan stunting.' },
        { name: 'UGD & Ambulans Siaga 24 Jam', description: 'Pelayanan gawat darurat respons cepat.' }
      ]
    }
  },
  {
    id: 'sec-layanan',
    type: 'layanan',
    title: 'Daftar Layanan Kesehatan',
    visible: true,
    order: 4,
    settings: {
      limit: 6,
      layout: 'grid',
      categoryFilter: 'all'
    }
  },
  {
    id: 'sec-jadwal',
    type: 'jadwal',
    title: 'Jadwal Layanan Poli',
    visible: true,
    order: 5,
    settings: {
      schedules: [
        { name: 'Poli Umum', days: 'Senin - Sabtu', hours: '08:00 - 14:00' },
        { name: 'Poli Gigi', days: 'Senin - Jumat', hours: '08:00 - 13:00' },
        { name: 'Poli KIA/KB', days: 'Selasa & Kamis', hours: '08:00 - 12:00' },
        { name: 'Poli Imunisasi', days: 'Rabu', hours: '08:00 - 11:30' }
      ]
    }
  },
  {
    id: 'sec-berita',
    type: 'berita',
    title: 'Berita & Artikel Kesehatan Terbaru',
    visible: true,
    order: 6,
    settings: {
      limit: 3,
      sortBy: 'latest'
    }
  },
  {
    id: 'sec-pengumuman',
    type: 'pengumuman',
    title: 'Pengumuman Penting',
    visible: true,
    order: 7,
    settings: {
      limit: 2
    }
  },
  {
    id: 'sec-statistik',
    type: 'statistik',
    title: 'Statistik Pelayanan Bulan Ini',
    visible: true,
    order: 8,
    settings: {
      items: [
        { label: 'Pasien Terlayani', value: '1,420+' },
        { label: 'Kepuasan Masyarakat', value: '94.8%' },
        { label: 'Kunjungan Pustu', value: '380' },
        { label: 'Kegiatan Posyandu', value: '24' }
      ]
    }
  },
  {
    id: 'sec-kritik',
    type: 'kritik_saran',
    title: 'Suara Anda, Layanan Kami',
    visible: true,
    order: 9,
    settings: {
      text: 'Bantu kami meningkatkan kualitas layanan dengan memberikan kritik, saran, atau pengaduan secara transparan.',
      buttonText: 'Kirim Kritik & Saran',
      buttonLink: '/kritik-saran'
    }
  },
  {
    id: 'sec-microsites',
    type: 'microsites',
    title: 'Microsite',
    visible: true,
    order: 10,
    settings: {
      subtitle: 'Akses cepat portal khusus, program kesehatan tematik, dan informasi kampanye puskesmas.'
    }
  },
  {
    id: 'sec-kontak',
    type: 'kontak',
    title: 'Hubungi Kami',
    visible: true,
    order: 10,
    settings: {
      showSocials: true
    }
  },
  {
    id: 'sec-lokasi',
    type: 'lokasi',
    title: 'Lokasi Puskesmas',
    visible: true,
    order: 11,
    settings: {
      height: '400px'
    }
  },
  {
    id: 'sec-cta',
    type: 'cta',
    title: 'Butuh Pelayanan Kesehatan Darurat?',
    visible: true,
    order: 12,
    settings: {
      subtitle: 'Layanan UGD dan Bersalin Puskesmas Manding buka 24 jam sehari, 7 hari seminggu.',
      buttonText: 'Telepon UGD Sekarang',
      buttonLink: 'tel:0215550199'
    }
  }
];

export const homepageService = {
  async getDraftConfig(): Promise<HomepageBuilderConfig> {
    const defaultDraft: HomepageBuilderConfig = {
      id: 'homepage-builder-config',
      template: 'modern_majestic',
      backgroundAnimation: 'aurora_flow',
      sections: [...INITIAL_HOMEPAGE_SECTIONS],
      status: 'draft',
      updatedAt: new Date().toISOString()
    };

    let cachedDraft = defaultDraft;

    // 1. Read local cache for immediate reactivity
    try {
      const data = memStore.getItem(DRAFT_KEY);
      if (data) {
        cachedDraft = JSON.parse(data);
      }
    } catch {}

    // 2. Fetch latest draft from server
    try {
      const res = await apiFetch('/api/homepage/draft?_t=' + Date.now(), {
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (res.ok) {
        const json = await res.json();
        if (json && json.config && Array.isArray(json.config.sections)) {
          memStore.setItem(DRAFT_KEY, JSON.stringify(json.config));
          return json.config;
        }
      }
    } catch {}

    return cachedDraft;
  },

  async getPublishedConfig(): Promise<HomepageBuilderConfig> {
    const defaultPublished: HomepageBuilderConfig = {
      id: 'homepage-builder-config',
      template: 'modern_majestic',
      backgroundAnimation: 'aurora_flow',
      sections: [...INITIAL_HOMEPAGE_SECTIONS],
      status: 'published',
      updatedAt: new Date().toISOString()
    };

    let cachedPublished = defaultPublished;

    // 1. Read local storage for instant zero-latency paint
    try {
      const data = memStore.getItem(PUBLISHED_KEY);
      if (data) {
        cachedPublished = JSON.parse(data);
      }
    } catch {}

    // 2. Fetch server-authoritative published configuration
    try {
      const res = await fetch('/api/homepage/published?_t=' + Date.now(), {
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (res.ok) {
        const json = await res.json();
        if (json && json.config && Array.isArray(json.config.sections)) {
          const serverConfig: HomepageBuilderConfig = {
            ...defaultPublished,
            ...json.config,
            status: 'published'
          };
          const serverStr = JSON.stringify(serverConfig);
          const cachedStr = JSON.stringify(cachedPublished);
          if (serverStr !== cachedStr) {
            memStore.setItem(PUBLISHED_KEY, serverStr);
            window.dispatchEvent(new Event('puskesmas_homepage_updated'));
          }
          return serverConfig;
        }
      }
    } catch (e) {
      console.warn('Server homepage fetch failed:', e);
    }

    return cachedPublished;
  },

  async saveDraft(
    sections: HomepageSection[],
    updatedBy: { id: string; email: string; name: string },
    template?: HomepageTemplateType,
    backgroundAnimation?: BackgroundAnimationType
  ): Promise<HomepageBuilderConfig> {
    const existing = await this.getDraftConfig();
    const config: HomepageBuilderConfig = {
      id: 'homepage-builder-config',
      template: template || existing.template || 'modern_majestic',
      backgroundAnimation: backgroundAnimation || existing.backgroundAnimation || 'aurora_flow',
      sections,
      status: 'draft',
      updatedAt: new Date().toISOString(),
      updatedBy: updatedBy.id
    };

    // 1. Local Cache
    memStore.setItem(DRAFT_KEY, JSON.stringify(config));

    // 2. Persist to Node.js backend
    try {
      await apiFetch('/api/homepage/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
    } catch (err) {
      console.warn('Server homepage draft save failed:', err);
    }

    // 3. Persist to VPS database via /api/db/*
    saveSingleDocument(FIRESTORE_COLLECTION, 'draft', config, DRAFT_KEY).catch(() => {});

    await auditService.recordLog({
      userId: updatedBy.id,
      userEmail: updatedBy.email,
      userName: updatedBy.name,
      action: 'UPDATE',
      module: 'HOMEPAGE',
      targetId: 'homepage-builder-config',
      targetName: 'Beranda Layout (Draft)',
      description: 'Menyimpan draft susunan/konfigurasi template dan section beranda.'
    });

    return config;
  },

  async publish(
    sections: HomepageSection[],
    updatedBy: { id: string; email: string; name: string },
    template?: HomepageTemplateType,
    backgroundAnimation?: BackgroundAnimationType
  ): Promise<HomepageBuilderConfig> {
    await this.saveDraft(sections, updatedBy, template, backgroundAnimation);

    const existing = await this.getDraftConfig();
    const config: HomepageBuilderConfig = {
      id: 'homepage-builder-config',
      template: template || existing.template || 'modern_majestic',
      backgroundAnimation: backgroundAnimation || existing.backgroundAnimation || 'aurora_flow',
      sections,
      status: 'published',
      updatedAt: new Date().toISOString(),
      updatedBy: updatedBy.id
    };

    // 1. Local Cache & Trigger Instant App Refresh
    memStore.setItem(PUBLISHED_KEY, JSON.stringify(config));
    window.dispatchEvent(new Event('puskesmas_homepage_updated'));

    // 2. Persist to Node.js backend for all other devices
    try {
      await apiFetch('/api/homepage/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
    } catch (err) {
      console.warn('Server homepage publish failed:', err);
    }

    // 3. Persist to VPS database via /api/db/*
    saveSingleDocument(FIRESTORE_COLLECTION, 'published', config, PUBLISHED_KEY).catch(() => {});

    await auditService.recordLog({
      userId: updatedBy.id,
      userEmail: updatedBy.email,
      userName: updatedBy.name,
      action: 'PUBLISH',
      module: 'HOMEPAGE',
      targetId: 'homepage-builder-config',
      targetName: 'Beranda Layout (Published)',
      description: 'Mempublikasikan susunan/konfigurasi template dan section beranda ke website publik.'
    });

    return config;
  },

  async resetToDefault(updatedBy: { id: string; email: string; name: string }): Promise<HomepageBuilderConfig> {
    const initialSections = [...INITIAL_HOMEPAGE_SECTIONS].map((s, idx) => ({ ...s, order: idx }));
    
    const resetConfig: HomepageBuilderConfig = {
      id: 'homepage-builder-config',
      template: 'modern_majestic',
      backgroundAnimation: 'aurora_flow',
      sections: initialSections,
      status: 'published',
      updatedAt: new Date().toISOString(),
      updatedBy: updatedBy.id
    };

    // 1. Local Reset & Dispatch
    memStore.setItem(DRAFT_KEY, JSON.stringify({ ...resetConfig, status: 'draft' }));
    memStore.setItem(PUBLISHED_KEY, JSON.stringify(resetConfig));
    window.dispatchEvent(new Event('puskesmas_homepage_updated'));

    // 2. Reset on Server
    try {
      await apiFetch('/api/homepage/reset', { method: 'POST' });
    } catch (err) {
      console.warn('Server homepage reset failed:', err);
    }

    // 3. Reset in VPS database via /api/db/*
    saveSingleDocument(FIRESTORE_COLLECTION, 'published', resetConfig, PUBLISHED_KEY).catch(() => {});
    saveSingleDocument(FIRESTORE_COLLECTION, 'draft', { ...resetConfig, status: 'draft' }, DRAFT_KEY).catch(() => {});

    await auditService.recordLog({
      userId: updatedBy.id,
      userEmail: updatedBy.email,
      userName: updatedBy.name,
      action: 'UPDATE',
      module: 'HOMEPAGE',
      targetId: 'homepage-builder-config',
      targetName: 'Beranda Layout (Reset)',
      description: 'Mereset susunan section beranda ke konfigurasi bawaan.'
    });

    return resetConfig;
  }
};
