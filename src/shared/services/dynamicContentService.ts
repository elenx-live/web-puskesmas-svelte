import type { DynamicContentEntity, ContentCategoryEntity, ContentTagEntity, ContentType, DynamicContentStatus, ContentRevision } from '../types/index.js';
import { auditService } from './auditService';
import { notificationService } from './notificationService';
import { sanitizeHtml, sanitizeText } from '../utils/sanitize';

const CONTENTS_STORAGE_KEY = 'puskesmas_dynamic_contents';
const CATEGORIES_STORAGE_KEY = 'puskesmas_content_categories';
const TAGS_STORAGE_KEY = 'puskesmas_content_tags';

const INITIAL_CATEGORIES: ContentCategoryEntity[] = [
  { id: 'cat-berita-1', name: 'Pelayanan Publik', slug: 'pelayanan-publik', contentType: 'berita', description: 'Berita seputar pengembangan mutu dan operasional layanan.', createdAt: new Date().toISOString() },
  { id: 'cat-berita-2', name: 'Kegiatan Puskesmas', slug: 'kegiatan-puskesmas', contentType: 'berita', description: 'Dokumentasi kegiatan dan kunjungan lapangan.', createdAt: new Date().toISOString() },
  { id: 'cat-artikel-1', name: 'Keluarga & Anak', slug: 'keluarga-anak', contentType: 'artikel', description: 'Artikel kesehatan ibu, anak, dan tumbuh kembang.', createdAt: new Date().toISOString() },
  { id: 'cat-artikel-2', name: 'Penyakit & Pencegahan', slug: 'penyakit-pencegahan', contentType: 'artikel', description: 'Edukasi pencegahan penyakit menular & tidak menular.', createdAt: new Date().toISOString() },
  { id: 'cat-pengumuman-1', name: 'Penting & Mendesak', slug: 'penting-mendesak', contentType: 'pengumuman', description: 'Pengumuman yang memerlukan perhatian segera dari masyarakat.', createdAt: new Date().toISOString() },
  { id: 'cat-agenda-1', name: 'Posyandu & Penyuluhan', slug: 'posyandu-penyuluhan', contentType: 'agenda', description: 'Jadwal kegiatan posyandu dan penyuluhan kesehatan.', createdAt: new Date().toISOString() },
  { id: 'cat-edukasi-1', name: 'Gizi & Stunting', slug: 'gizi-stunting', contentType: 'edukasi', description: 'Panduan gizi seimbang dan pencegahan stunting balita.', createdAt: new Date().toISOString() },
  { id: 'cat-prestasi-1', name: 'Penghargaan & Akreditasi', slug: 'penghargaan-akreditasi', contentType: 'prestasi', description: 'Sertifikasi paripurna dan penghargaan fasilitas kesehatan.', createdAt: new Date().toISOString() }
];

const INITIAL_TAGS: ContentTagEntity[] = [
  { id: 'tag-1', name: 'Posyandu', slug: 'posyandu', usageCount: 4, createdAt: new Date().toISOString() },
  { id: 'tag-2', name: 'Imunisasi', slug: 'imunisasi', usageCount: 3, createdAt: new Date().toISOString() },
  { id: 'tag-3', name: 'Lansia', slug: 'lansia', usageCount: 2, createdAt: new Date().toISOString() },
  { id: 'tag-4', name: 'Balita', slug: 'balita', usageCount: 5, createdAt: new Date().toISOString() },
  { id: 'tag-5', name: 'Promosi Kesehatan', slug: 'promosi-kesehatan', usageCount: 6, createdAt: new Date().toISOString() }
];

const INITIAL_CONTENTS: DynamicContentEntity[] = [
  {
    id: 'cnt-1',
    contentType: 'berita',
    title: 'Penerapan Integrasi Layanan Primer (ILP) Permenkes 19/2024 di Puskesmas Manding',
    slug: 'penerapan-integrasi-layanan-primer-ilp',
    excerpt: 'Puskesmas resmi menata ulang alur pelayanan berbasis 5 Klaster Kesehatan untuk pendekatan preventif yang lebih komprehensif.',
    content: '<p>Sesuai amanat Peraturan Menteri Kesehatan No. 19/2024, Puskesmas Manding telah mengimplementasikan <strong>Integrasi Layanan Primer (ILP)</strong>. Alur pelayanan kini dikelompokkan berdasarkan siklus hidup manusia menjadi 5 Klaster Utama untuk memastikan masyarakat mendapatkan skrining kesehatan yang proaktif.</p>',
    featuredImage: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=800',
    category: 'Pelayanan Publik',
    tags: ['Promosi Kesehatan', 'Lansia'],
    authorId: 'usr-adminweb-02',
    authorName: 'Budi Santoso',
    status: 'published',
    publishedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    publishedBy: { id: 'usr-superadmin-01', name: 'Administrator Utama' },
    seoTitle: 'Penerapan ILP Permenkes 19/2024 di Puskesmas Manding',
    seoDescription: 'Informasi resmi implementasi 5 Klaster Layanan Primer di Puskesmas Manding.',
    pinned: true,
    featured: true,
    viewCount: 342,
    version: 1,
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 3).toISOString()
  },
  {
    id: 'cnt-2',
    contentType: 'pengumuman',
    title: 'Penyesuaian Jadwal Pelayanan Poli Khusus Selama Libur Nasional',
    slug: 'penyesuaian-jadwal-pelayanan-poli-khusus',
    excerpt: 'Pelayanan poli rawat jalan libur pada tanggal merah, namun UGD dan persalinan tetap siaga 24 jam.',
    content: '<p>Diberitahukan kepada seluruh pasien dan masyarakat bahwa pelayanan rawat jalan poli spesialis dan umum diliburkan pada Hari Libur Nasional. Layanan Kegawatdaruratan (UGD) dan Persalinan tetap beroperasi 24 jam.</p>',
    featuredImage: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&q=80&w=800',
    category: 'Penting & Mendesak',
    tags: ['Promosi Kesehatan'],
    authorId: 'usr-adminweb-02',
    authorName: 'Budi Santoso',
    status: 'published',
    publishAt: new Date().toISOString(),
    expireAt: new Date(Date.now() + 86400000 * 30).toISOString(),
    publishedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    publishedBy: { id: 'usr-superadmin-01', name: 'Administrator Utama' },
    pinned: true,
    featured: false,
    viewCount: 512,
    version: 1,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString()
  },
  {
    id: 'cnt-3',
    contentType: 'agenda',
    title: 'Penyuluhan & Pemeriksaan Kesehatan Lansia Serentak (Posyandu Lansia)',
    slug: 'penyuluhan-pemeriksaan-kesehatan-lansia-serentak',
    excerpt: 'Pemeriksaan tensi, gula darah, asam urat gratis serta senam sehat lansia di Aula Puskesmas.',
    content: '<p>Mari hadir dan ikuti pemeriksaan kesehatan lansia rutin bulan ini. Fasilitas pemeriksaan gratis untuk tekanan darah, gula darah sewaktu, kolesterol, serta konsultasi gizi bersama dokter spesialis.</p>',
    featuredImage: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=800',
    category: 'Posyandu & Penyuluhan',
    tags: ['Lansia', 'Posyandu'],
    authorId: 'usr-adminweb-02',
    authorName: 'Budi Santoso',
    status: 'published',
    publishedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    featured: true,
    viewCount: 189,
    agendaDetails: {
      eventDate: '2026-08-20',
      startTime: '08:00',
      endTime: '11:30',
      location: 'Aula Gedung Utama Puskesmas Manding',
      organizer: 'Tim Klaster 3 & Promkes Puskesmas',
      registrationLink: '/pendaftaran'
    },
    version: 1,
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    id: 'cnt-4',
    contentType: 'artikel',
    title: 'Panduan Praktis Pencegahan Stunting Melalui Pemberian MPASI Kaya Protein Hewani',
    slug: 'panduan-praktis-pencegahan-stunting-mpasi',
    excerpt: 'Langkah mudah menyiapkan Makanan Pendamping ASI (MPASI) bergizi seimbang untuk tumbuh kembang optimal anak.',
    content: '<p>Stunting dapat dicegah sejak dini melalui pemenuhan gizi seimbang pada 1.000 Hari Pertama Kehidupan (HPK). Pemberian protein hewani seperti telur, ikan, dan ayam sangat penting untuk merangsang pertumbuhan anak balita.</p>',
    featuredImage: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&q=80&w=800',
    category: 'Keluarga & Anak',
    tags: ['Balita', 'Promosi Kesehatan'],
    authorId: 'usr-editor-03',
    authorName: 'Siti Rahmawati',
    status: 'published',
    publishedAt: new Date(Date.now() - 86400000 * 6).toISOString(),
    featured: false,
    viewCount: 275,
    version: 1,
    createdAt: new Date(Date.now() - 86400000 * 8).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 6).toISOString()
  },
  {
    id: 'cnt-5',
    contentType: 'edukasi',
    title: 'Kenali Tanda Bahaya Demam Berdarah Dengue (DBD) dan Pertolongan Pertama',
    slug: 'kenali-tanda-bahaya-demam-berdarah-dengue',
    excerpt: 'Waspadai penurunan trombosit drastis dan gejala syok pada fase kritis DBD.',
    content: '<p>Demam berdarah disebabkan oleh gigitan nyamuk Aedes aegypti. Segera bawa pasien ke UGD Puskesmas jika mengalami demam tinggi mendadak disertai bintik merah pada kulit, nyeri ulu hati, atau perdarahan gusi.</p>',
    featuredImage: 'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?auto=format&fit=crop&q=80&w=800',
    category: 'Penyakit & Pencegahan',
    tags: ['Promosi Kesehatan'],
    authorId: 'usr-editor-03',
    authorName: 'Siti Rahmawati',
    status: 'published',
    publishedAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    viewCount: 198,
    version: 1,
    createdAt: new Date(Date.now() - 86400000 * 12).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 10).toISOString()
  },
  {
    id: 'cnt-6',
    contentType: 'prestasi',
    title: 'Puskesmas Manding Meraih Penghargaan Fasilitas Kesehatan Berprestasi Tingkat Nasional',
    slug: 'puskesmas-meraih-penghargaan-tingkat-nasional',
    excerpt: 'Penghargaan diberikan atas inovasi pelayanan digital terintegrasi dan capaian akreditasi paripurna.',
    content: '<p>Berkat kerja keras seluruh tenaga kesehatan dan dukungan masyarakat, Puskesmas Manding berhasil dianugerahi predikat Puskesmas Inovatif Terbaik Nasional dalam bidang transformasi digital pelayanan kesehatan primer.</p>',
    featuredImage: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=800',
    category: 'Penghargaan & Akreditasi',
    tags: ['Promosi Kesehatan'],
    authorId: 'usr-adminweb-02',
    authorName: 'Budi Santoso',
    status: 'published',
    publishedAt: new Date(Date.now() - 86400000 * 15).toISOString(),
    featured: true,
    viewCount: 410,
    version: 1,
    createdAt: new Date(Date.now() - 86400000 * 16).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 15).toISOString()
  }
];

function getStoredContents(): DynamicContentEntity[] {
  try {
    const data = localStorage.getItem(CONTENTS_STORAGE_KEY);
    if (!data) {
      localStorage.setItem(CONTENTS_STORAGE_KEY, JSON.stringify(INITIAL_CONTENTS));
      return INITIAL_CONTENTS;
    }
    const list: DynamicContentEntity[] = JSON.parse(data);
    // Check scheduled publishing & expiration on load
    const now = new Date();
    let updated = false;
    const processed = list.map(item => {
      let status = item.status;
      // Scheduled publishing check
      if (status === 'scheduled' && item.publishAt && new Date(item.publishAt) <= now) {
        status = 'published';
        item.publishedAt = item.publishAt;
        updated = true;
      }
      // Expiration check (especially for announcements)
      if (status === 'published' && item.expireAt && new Date(item.expireAt) <= now) {
        status = 'expired';
        updated = true;
      }
      if (status !== item.status) {
        return { ...item, status, updatedAt: now.toISOString() };
      }
      return item;
    });

    if (updated) {
      localStorage.setItem(CONTENTS_STORAGE_KEY, JSON.stringify(processed));
    }
    return processed;
  } catch {
    return INITIAL_CONTENTS;
  }
}

function saveStoredContents(items: DynamicContentEntity[]) {
  try {
    localStorage.setItem(CONTENTS_STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Failed to save contents:', e);
  }
}

export function getStoredCategories(): ContentCategoryEntity[] {
  try {
    const data = localStorage.getItem(CATEGORIES_STORAGE_KEY);
    if (!data) {
      localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(INITIAL_CATEGORIES));
      return INITIAL_CATEGORIES;
    }
    return JSON.parse(data);
  } catch {
    return INITIAL_CATEGORIES;
  }
}

function saveStoredCategories(cats: ContentCategoryEntity[]) {
  try {
    localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(cats));
  } catch (e) {
    console.error('Failed categories:', e);
  }
}

export function getStoredTags(): ContentTagEntity[] {
  try {
    const data = localStorage.getItem(TAGS_STORAGE_KEY);
    if (!data) {
      localStorage.setItem(TAGS_STORAGE_KEY, JSON.stringify(INITIAL_TAGS));
      return INITIAL_TAGS;
    }
    return JSON.parse(data);
  } catch {
    return INITIAL_TAGS;
  }
}

function saveStoredTags(tags: ContentTagEntity[]) {
  try {
    localStorage.setItem(TAGS_STORAGE_KEY, JSON.stringify(tags));
  } catch (e) {
    console.error('Failed tags:', e);
  }
}

export const dynamicContentService = {
  async getContents(contentType?: ContentType, statusFilter?: string, category?: string, search?: string): Promise<DynamicContentEntity[]> {
    let items = getStoredContents();

    if (contentType) {
      items = items.filter(i => i.contentType === contentType);
    }
    if (statusFilter) {
      items = items.filter(i => i.status === statusFilter);
    }
    if (category) {
      items = items.filter(i => i.category === category);
    }
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(i => i.title.toLowerCase().includes(q) || i.excerpt.toLowerCase().includes(q) || i.tags.some(t => t.toLowerCase().includes(q)));
    }

    return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async getPublishedContent(contentType?: ContentType, category?: string, tag?: string, search?: string): Promise<DynamicContentEntity[]> {
    let items = getStoredContents().filter(i => i.status === 'published');

    if (contentType) {
      items = items.filter(i => i.contentType === contentType);
    }
    if (category) {
      items = items.filter(i => i.category.toLowerCase() === category.toLowerCase());
    }
    if (tag) {
      items = items.filter(i => i.tags.some(t => t.toLowerCase() === tag.toLowerCase()));
    }
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(i => i.title.toLowerCase().includes(q) || i.excerpt.toLowerCase().includes(q));
    }

    return items.sort((a, b) => new Date(b.publishedAt || b.createdAt).getTime() - new Date(a.publishedAt || a.createdAt).getTime());
  },

  async getContentBySlug(slug: string): Promise<DynamicContentEntity | null> {
    const items = getStoredContents();
    const cleanSlug = slug.toLowerCase().trim();
    const found = items.find(i => i.slug.toLowerCase() === cleanSlug);
    if (!found) return null;

    // Do not return draft/unpublished via public view unless authorized (or preview token)
    return found;
  },

  async incrementViewCount(id: string): Promise<void> {
    const items = getStoredContents();
    const index = items.findIndex(i => i.id === id);
    if (index !== -1) {
      items[index].viewCount = (items[index].viewCount || 0) + 1;
      saveStoredContents(items);
    }
  },

  async getRelatedContent(currentId: string, contentType: ContentType, category: string, tags: string[], limit: number = 3): Promise<DynamicContentEntity[]> {
    const items = getStoredContents().filter(i => i.status === 'published' && i.id !== currentId);
    
    // Score matches
    const scored = items.map(item => {
      let score = 0;
      if (item.category === category) score += 3;
      if (item.contentType === contentType) score += 2;
      const sharedTags = item.tags.filter(t => tags.includes(t));
      score += sharedTags.length;
      return { item, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map(s => s.item);
  },

  async createContent(data: Partial<DynamicContentEntity>, actor: { id: string; email: string; name: string }): Promise<DynamicContentEntity> {
    const items = getStoredContents();
    const title = sanitizeText(data.title || 'Judul Konten Baru');
    const slug = (data.slug ? sanitizeText(data.slug) : title)
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');

    const now = new Date().toISOString();
    const isScheduled = data.status === 'scheduled';
    const isPublished = data.status === 'published';

    const newEntity: DynamicContentEntity = {
      id: `cnt-${Date.now()}`,
      contentType: data.contentType || 'berita',
      title,
      slug,
      excerpt: sanitizeText(data.excerpt || ''),
      content: sanitizeHtml(data.content || ''),
      featuredImage: data.featuredImage || 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=800',
      category: data.category || 'Umum',
      tags: data.tags || [],
      authorId: actor.id,
      authorName: actor.name,
      status: data.status || 'draft',
      publishAt: data.publishAt,
      expireAt: data.expireAt,
      createdAt: now,
      updatedAt: now,
      publishedAt: isPublished ? now : (isScheduled ? data.publishAt : undefined),
      publishedBy: isPublished ? { id: actor.id, name: actor.name } : undefined,
      seoTitle: sanitizeText(data.seoTitle || title),
      seoDescription: sanitizeText(data.seoDescription || data.excerpt || ''),
      pinned: !!data.pinned,
      featured: !!data.featured,
      relatedServiceId: data.relatedServiceId,
      relatedDocumentIds: data.relatedDocumentIds || [],
      viewCount: 0,
      agendaDetails: data.agendaDetails,
      version: 1,
      revisions: [
        {
          id: `rev-${Date.now()}`,
          title,
          content: sanitizeHtml(data.content || ''),
          excerpt: sanitizeText(data.excerpt || ''),
          modifiedBy: { id: actor.id, name: actor.name },
          modifiedAt: now,
          version: 1
        }
      ]
    };

    saveStoredContents([newEntity, ...items]);

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'CREATE',
      module: 'PAGES',
      targetId: newEntity.id,
      targetName: newEntity.title,
      description: `Membuat konten baru (${newEntity.contentType}): "${newEntity.title}" [Status: ${newEntity.status}]`
    });

    if (newEntity.status === 'pending_review') {
      // Pending review recorded in audit
    }

    return newEntity;
  },

  async updateContent(id: string, updates: Partial<DynamicContentEntity>, actor: { id: string; email: string; name: string }): Promise<DynamicContentEntity> {
    const items = getStoredContents();
    const index = items.findIndex(i => i.id === id);
    if (index === -1) throw new Error('Konten tidak ditemukan');

    const existing = items[index];
    const now = new Date().toISOString();

    const title = updates.title !== undefined ? sanitizeText(updates.title) : existing.title;
    const content = updates.content !== undefined ? sanitizeHtml(updates.content) : existing.content;
    const excerpt = updates.excerpt !== undefined ? sanitizeText(updates.excerpt) : existing.excerpt;

    const newVersion = existing.version + 1;
    const newRevision: ContentRevision = {
      id: `rev-${Date.now()}`,
      title,
      content,
      excerpt,
      modifiedBy: { id: actor.id, name: actor.name },
      modifiedAt: now,
      version: newVersion
    };

    const isNowPublished = updates.status === 'published' && existing.status !== 'published';

    const updatedEntity: DynamicContentEntity = {
      ...existing,
      ...updates,
      title,
      content,
      excerpt,
      updatedAt: now,
      publishedAt: isNowPublished ? now : (updates.status === 'published' ? existing.publishedAt : existing.publishedAt),
      publishedBy: isNowPublished ? { id: actor.id, name: actor.name } : existing.publishedBy,
      version: newVersion,
      revisions: [newRevision, ...(existing.revisions || []).slice(0, 9)] // keep last 10 revisions
    };

    items[index] = updatedEntity;
    saveStoredContents(items);

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: isNowPublished ? 'PUBLISH' : 'UPDATE',
      module: 'PAGES',
      targetId: updatedEntity.id,
      targetName: updatedEntity.title,
      description: `Memperbarui konten (${updatedEntity.contentType}): "${updatedEntity.title}" (Status: ${updatedEntity.status})`
    });


    return updatedEntity;
  },

  async deleteContent(id: string, actor: { id: string; email: string; name: string }): Promise<void> {
    const items = getStoredContents();
    const target = items.find(i => i.id === id);
    if (!target) return;

    saveStoredContents(items.filter(i => i.id !== id));

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'DELETE',
      module: 'PAGES',
      targetId: target.id,
      targetName: target.title,
      description: `Menghapus konten (${target.contentType}): "${target.title}"`
    });
  },

  // Categories & Tags management
  async getCategories(): Promise<ContentCategoryEntity[]> {
    return getStoredCategories();
  },

  async createCategory(cat: Omit<ContentCategoryEntity, 'id' | 'createdAt'>, actor: { id: string; email: string; name: string }): Promise<ContentCategoryEntity> {
    const cats = getStoredCategories();
    const newCat: ContentCategoryEntity = {
      ...cat,
      id: `cat-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    saveStoredCategories([...cats, newCat]);
    return newCat;
  },

  async getTags(): Promise<ContentTagEntity[]> {
    return getStoredTags();
  },

  async createTag(tagName: string, actor: { id: string; email: string; name: string }): Promise<ContentTagEntity> {
    const tags = getStoredTags();
    const existing = tags.find(t => t.name.toLowerCase() === tagName.toLowerCase());
    if (existing) return existing;

    const newTag: ContentTagEntity = {
      id: `tag-${Date.now()}`,
      name: sanitizeText(tagName),
      slug: sanitizeText(tagName).toLowerCase().replace(/[^a-z0-9]/g, '-'),
      usageCount: 1,
      createdAt: new Date().toISOString()
    };
    saveStoredTags([...tags, newTag]);
    return newTag;
  }
};
