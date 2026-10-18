import type { PageEntity, PageRevision, ContentStatus } from '../types/index.js';
import { auditService } from './auditService';
import { sanitizeHtml, sanitizeText } from '../utils/sanitize';
import { getCollectionData, saveDocumentData, deleteDocumentData } from '../lib/firebase';
import { memStore } from '../lib/memStore';

const PAGES_STORAGE_KEY = 'puskesmas_cms_pages';
const REVISIONS_STORAGE_KEY = 'puskesmas_cms_page_revisions';

const INITIAL_PAGES: PageEntity[] = [
  {
    id: 'page-sejarah',
    title: 'Sejarah & Perkembangan Puskesmas',
    slug: 'sejarah-puskesmas',
    excerpt: 'Latar belakang pendirian dan rekam jejak pengabdian Puskesmas dalam memberikan pelayanan kesehatan masyarakat.',
    content: `
      <h2>Latar Belakang Pendirian</h2>
      <p>Puskesmas Manding didirikan pada tahun 1985 sebagai bentuk komitmen pemerintah daerah dalam memperluas jangkauan pelayanan kesehatan primer bagi masyarakat.</p>
      <p>Berawal dari fasilitas balai pengobatan sederhana dengan 5 tenaga kesehatan, kini Puskesmas telah berkembang menjadi fasilitas kesehatan tingkat pertama (FKTP) terakreditasi Paripurna.</p>
      <h2>Transformasi Layanan Primer (Permenkes No. 19/2024)</h2>
      <p>Sejak tahun 2024, Puskesmas menerapkan integrasi pelayanan kesehatan primer (ILP) yang berfokus pada 5 klaster utama pelayanan berdasarkan siklus hidup manusia.</p>
    `,
    featuredImage: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=800',
    status: 'published',
    visibility: 'public',
    seoTitle: 'Sejarah Puskesmas Manding - FKTP Terpadu',
    seoDescription: 'Informasi lengkap sejarah dan perkembangan pelayanan kesehatan di Puskesmas Manding.',
    createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    createdBy: { id: 'usr-superadmin-01', name: 'Administrator Utama', email: 'admin@puskesmas.go.id' },
    updatedBy: { id: 'usr-superadmin-01', name: 'Administrator Utama', email: 'admin@puskesmas.go.id' },
    publishedAt: new Date(Date.now() - 86400000 * 25).toISOString(),
    publishedBy: { id: 'usr-superadmin-01', name: 'Administrator Utama' },
    version: 1
  },
  {
    id: 'page-visi-misi',
    title: 'Visi, Misi & Maklumat Pelayanan',
    slug: 'visi-misi',
    excerpt: 'Visi, Misi, Tata Nilai, dan Maklumat Pelayanan Resmi Puskesmas Manding.',
    content: `
      <h2>Visi</h2>
      <p><strong>"Terwujudnya Masyarakat Sehat, Mandiri, dan Berkeadilan Melalui Pelayanan Kesehatan Primer yang Berkualitas."</strong></p>
      <h2>Misi</h2>
      <ul>
        <li>Menyelenggarakan pelayanan kesehatan terpadu dan bermutu berfokus pada keselamatan pasien.</li>
        <li>Meningkatkan tata kelola manajemen Puskesmas yang akuntabel dan transparan.</li>
        <li>Mendorong kemandirian masyarakat hidup sehat melalui pemberdayaan Posyandu dan Kader Kesehatan.</li>
      </ul>
      <h2>Maklumat Pelayanan</h2>
      <p><em>"Kami seluruh pimpinan dan staf Puskesmas Manding menyatakan sanggup menyelenggarakan pelayanan sesuai standar pelayanan yang telah ditetapkan dan apabila tidak menepati janji, kami siap menerima sanksi sesuai peraturan yang berlaku."</em></p>
    `,
    featuredImage: 'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?auto=format&fit=crop&q=80&w=800',
    status: 'published',
    visibility: 'public',
    seoTitle: 'Visi & Misi Puskesmas Manding',
    seoDescription: 'Visi, Misi, dan Janji Maklumat Pelayanan Puskesmas.',
    createdAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    createdBy: { id: 'usr-superadmin-01', name: 'Administrator Utama', email: 'admin@puskesmas.go.id' },
    updatedBy: { id: 'usr-superadmin-01', name: 'Administrator Utama', email: 'admin@puskesmas.go.id' },
    publishedAt: new Date(Date.now() - 86400000 * 18).toISOString(),
    publishedBy: { id: 'usr-superadmin-01', name: 'Administrator Utama' },
    version: 1
  },
  {
    id: 'page-struktur-org',
    title: 'Struktur Organisasi & Sumber Daya Manusia',
    slug: 'struktur-organisasi',
    excerpt: 'Bagan organisasi kepemimpinan dan peta sebaran tenaga medis di Puskesmas.',
    content: `
      <h2>Kepemimpinan Puskesmas</h2>
      <p>Puskesmas dipimpin oleh Kepala Puskesmas yang membawahi Kepala Sub Bagian Tata Usaha dan Penanggung Jawab Klaster Pelayanan.</p>
      <h2>Peta Sebaran SDM Kesehatan</h2>
      <p>Saat ini Puskesmas didukung oleh 4 Dokter Umum, 2 Dokter Gigi, 12 Perawat, 10 Bidan, 2 Apoteker, 3 Petugas Laboratorium, dan 8 Tenaga Kestrad & Administrasi.</p>
    `,
    featuredImage: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=800',
    status: 'published',
    visibility: 'public',
    seoTitle: 'Struktur Organisasi Puskesmas',
    seoDescription: 'Bagan tata kelola dan SDM kesehatan Puskesmas Manding.',
    createdAt: new Date(Date.now() - 86400000 * 15).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    createdBy: { id: 'usr-adminweb-02', name: 'Budi Santoso', email: 'budi@puskesmas.go.id' },
    updatedBy: { id: 'usr-adminweb-02', name: 'Budi Santoso', email: 'budi@puskesmas.go.id' },
    publishedAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    publishedBy: { id: 'usr-superadmin-01', name: 'Administrator Utama' },
    version: 1
  }
];

function getStoredPages(): PageEntity[] {
  try {
    const data = memStore.getItem(PAGES_STORAGE_KEY);
    if (!data) {
      memStore.setItem(PAGES_STORAGE_KEY, JSON.stringify(INITIAL_PAGES));
      return INITIAL_PAGES;
    }
    return JSON.parse(data);
  } catch {
    return INITIAL_PAGES;
  }
}

function saveStoredPages(pages: PageEntity[]) {
  try {
    memStore.setItem(PAGES_STORAGE_KEY, JSON.stringify(pages));
  } catch (err) {
    console.error('Failed to save pages:', err);
  }
}

function getStoredRevisions(): PageRevision[] {
  try {
    const data = memStore.getItem(REVISIONS_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveStoredRevisions(revisions: PageRevision[]) {
  try {
    memStore.setItem(REVISIONS_STORAGE_KEY, JSON.stringify(revisions));
  } catch (err) {
    console.error('Failed to save revisions:', err);
  }
}

export const pageService = {
  async getPages(statusFilter?: string, search?: string): Promise<PageEntity[]> {
    let pages = await getCollectionData<PageEntity>('pages', PAGES_STORAGE_KEY, INITIAL_PAGES);

    if (statusFilter) {
      pages = pages.filter(p => p.status === statusFilter);
    }

    if (search) {
      const q = search.toLowerCase();
      pages = pages.filter(p => p.title.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q));
    }

    return pages;
  },

  async getPublishedPages(): Promise<PageEntity[]> {
    const pages = await this.getPages();
    return pages.filter(p => p.status === 'published' && p.visibility === 'public');
  },

  async getPageBySlug(slug: string): Promise<PageEntity | null> {
    const pages = await this.getPages();
    const cleanSlug = slug.replace(/^\//, '').toLowerCase();
    const found = pages.find(p => p.slug.toLowerCase() === cleanSlug);
    return found || null;
  },

  async getPageById(id: string): Promise<PageEntity | null> {
    const pages = await this.getPages();
    return pages.find(p => p.id === id) || null;
  },

  async generateUniqueSlug(title: string, currentId?: string): Promise<string> {
    const baseSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');

    let slug = baseSlug || 'halaman-baru';
    const pages = await this.getPages();

    let counter = 1;
    while (pages.some(p => p.slug === slug && p.id !== currentId)) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  },

  async createPage(data: Partial<PageEntity>, actor: { id: string; email: string; name: string }): Promise<PageEntity> {
    const pages = await this.getPages();

    const cleanTitle = sanitizeText(data.title || 'Halaman Baru');
    const slug = data.slug || (await this.generateUniqueSlug(cleanTitle));

    const newPage: PageEntity = {
      id: `page-${Date.now()}`,
      title: cleanTitle,
      slug,
      excerpt: sanitizeText(data.excerpt || ''),
      content: sanitizeHtml(data.content || ''),
      featuredImage: data.featuredImage || '',
      status: data.status || 'draft',
      visibility: data.visibility || 'public',
      seoTitle: sanitizeText(data.seoTitle || data.title || ''),
      seoDescription: sanitizeText(data.seoDescription || data.excerpt || ''),
      ogImage: data.ogImage || data.featuredImage,
      canonicalUrl: data.canonicalUrl || '',
      noIndex: !!data.noIndex,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: { id: actor.id, name: actor.name, email: actor.email },
      updatedBy: { id: actor.id, name: actor.name, email: actor.email },
      publishedAt: data.status === 'published' ? new Date().toISOString() : undefined,
      publishedBy: data.status === 'published' ? { id: actor.id, name: actor.name } : undefined,
      version: 1
    };

    saveStoredPages([newPage, ...pages]);
    saveDocumentData('pages', newPage.id, newPage, PAGES_STORAGE_KEY).catch(() => {});

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'CREATE',
      module: 'PAGES',
      targetId: newPage.id,
      targetName: newPage.title,
      description: `Membuat halaman baru: "${newPage.title}" (${newPage.status})`
    });

    return newPage;
  },

  async updatePage(id: string, updates: Partial<PageEntity>, actor: { id: string; email: string; name: string }): Promise<PageEntity> {
    const pages = getStoredPages();
    const index = pages.findIndex(p => p.id === id);
    if (index === -1) throw new Error('Halaman tidak ditemukan');

    const existing = pages[index];

    // Record revision before updating
    const revisions = getStoredRevisions();
    const newRevision: PageRevision = {
      id: `rev-${Date.now()}`,
      pageId: existing.id,
      title: existing.title,
      content: existing.content,
      excerpt: existing.excerpt,
      modifiedBy: { id: actor.id, name: actor.name },
      modifiedAt: new Date().toISOString(),
      version: existing.version
    };
    saveStoredRevisions([newRevision, ...revisions]);

    // Sanitize updates
    const sanitizedUpdates: Partial<PageEntity> = {
      ...updates,
      ...(updates.title !== undefined ? { title: sanitizeText(updates.title) } : {}),
      ...(updates.excerpt !== undefined ? { excerpt: sanitizeText(updates.excerpt) } : {}),
      ...(updates.content !== undefined ? { content: sanitizeHtml(updates.content) } : {}),
      ...(updates.seoTitle !== undefined ? { seoTitle: sanitizeText(updates.seoTitle) } : {}),
      ...(updates.seoDescription !== undefined ? { seoDescription: sanitizeText(updates.seoDescription) } : {}),
    };

    let slug = existing.slug;
    if (sanitizedUpdates.slug && sanitizedUpdates.slug !== existing.slug) {
      slug = await this.generateUniqueSlug(sanitizedUpdates.slug, id);
    } else if (sanitizedUpdates.title && !sanitizedUpdates.slug) {
      slug = await this.generateUniqueSlug(sanitizedUpdates.title, id);
    }

    const updatedPage: PageEntity = {
      ...existing,
      ...sanitizedUpdates,
      slug,
      updatedAt: new Date().toISOString(),
      updatedBy: { id: actor.id, name: actor.name, email: actor.email },
      version: existing.version + 1,
      publishedAt: updates.status === 'published' && existing.status !== 'published' ? new Date().toISOString() : existing.publishedAt,
      publishedBy: updates.status === 'published' && existing.status !== 'published' ? { id: actor.id, name: actor.name } : existing.publishedBy
    };

    pages[index] = updatedPage;
    saveStoredPages(pages);
    saveDocumentData('pages', updatedPage.id, updatedPage, PAGES_STORAGE_KEY).catch(() => {});

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: updates.status === 'published' ? 'PUBLISH' : 'UPDATE',
      module: 'PAGES',
      targetId: updatedPage.id,
      targetName: updatedPage.title,
      description: `Memperbarui halaman: "${updatedPage.title}" (Status: ${updatedPage.status})`
    });

    return updatedPage;
  },

  async deletePage(id: string, actor: { id: string; email: string; name: string }): Promise<void> {
    const pages = getStoredPages();
    const target = pages.find(p => p.id === id);
    if (!target) return;

    const filtered = pages.filter(p => p.id !== id);
    saveStoredPages(filtered);
    deleteDocumentData('pages', id, PAGES_STORAGE_KEY).catch(() => {});

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'DELETE',
      module: 'PAGES',
      targetId: target.id,
      targetName: target.title,
      description: `Menghapus halaman: "${target.title}"`
    });
  },

  async getRevisions(pageId: string): Promise<PageRevision[]> {
    const revisions = getStoredRevisions();
    return revisions.filter(r => r.pageId === pageId).sort((a, b) => b.version - a.version);
  }
};
