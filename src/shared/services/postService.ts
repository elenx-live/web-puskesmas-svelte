import type { PostEntity } from '../types/index.js';
import { auditService } from './auditService';
import { sanitizeHtml, sanitizeText } from '../utils/sanitize';
import { getCollectionData, saveDocumentData, deleteDocumentData } from '../lib/firebase';
import { syncMetadataToServer, syncPostItemToServer } from '../utils/metaSync';
import { memStore } from '../lib/memStore';

const POSTS_STORAGE_KEY = 'puskesmas_cms_posts';
const FIRESTORE_COLLECTION = 'posts';

const INITIAL_POSTS: PostEntity[] = [
  {
    id: 'post-1',
    title: 'Penerapan Integrasi Layanan Primer (ILP) di Puskesmas Manding',
    slug: 'penerapan-integrasi-layanan-primer-ilp',
    excerpt: 'Sesuai Keputusan Menteri Kesehatan RI No. 19/2024, Puskesmas resmi menata ulang alur pelayanan berbasis 5 Klaster Kesehatan.',
    content: `
      <p>Sesuai amanat Peraturan Menteri Kesehatan No. 19/2024, Puskesmas Manding telah secara resmi mengimplementasikan <strong>Integrasi Layanan Primer (ILP)</strong>.</p>
      <p>Perubahan utama mencakup penataan alur pelayanan yang tidak lagi berbasis poli penyakit, melainkan dikelompokkan berdasarkan siklus hidup manusia menjadi 5 Klaster Utama:</p>
      <ul>
        <li><strong>Klaster 1:</strong> Manajemen Puskesmas</li>
        <li><strong>Klaster 2:</strong> Ibu dan Anak</li>
        <li><strong>Klaster 3:</strong> Usia Dewasa dan Lansia</li>
        <li><strong>Klaster 4:</strong> Penanggulangan Penyakit Menular & Kesling</li>
        <li><strong>Lintas Klaster:</strong> Pelayanan Gawat Darurat & Rawat Inap</li>
      </ul>
      <p>Masyarakat yang berkunjung kini akan langsung diarahkan ke skrining klaster sesuai usia untuk penanganan yang lebih proaktif dan komprehensif.</p>
    `,
    featuredImage: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=800',
    categoryId: 'cat-ilp',
    categoryName: 'Klaster ILP',
    tagIds: ['tag-3'],
    tagNames: ['Posyandu'],
    authorId: 'usr-adminweb-02',
    authorName: 'Budi Santoso',
    status: 'published',
    publishedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    publishedBy: { id: 'usr-superadmin-01', name: 'Administrator Utama' },
    seoTitle: 'Penerapan ILP Permenkes 19/2024 di Puskesmas',
    seoDescription: 'Informasi penerapan 5 Klaster Integrasi Layanan Primer di Puskesmas Manding.',
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    createdBy: { id: 'usr-adminweb-02', name: 'Budi Santoso', email: 'budi@puskesmas.go.id' }
  },
  {
    id: 'post-2',
    title: 'Pelaksanaan Pekan Imunisasi Nasional (PIN) Polio Serentak',
    slug: 'pelaksanaan-pekan-imunisasi-nasional-pin-polio',
    excerpt: 'Ribuan balita di wilayah kerja Puskesmas berhasil mendapatkan penetesan vaksin polio dosis tambahan gratis.',
    content: `
      <p>Puskesmas Manding bersama Posyandu binaan telah menyelesaikan tahap pertama Pekan Imunisasi Nasional (PIN) Polio secara serentak.</p>
      <p>Cakupan imunisasi mencapai 96,8% dari total target sasaran 3.200 balita. Kegiatan ini bertujuan untuk menghentikan transmisi virus polio di tingkat komunitas.</p>
    `,
    featuredImage: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&q=80&w=800',
    categoryId: 'cat-berita',
    categoryName: 'Berita & Kegiatan',
    tagIds: ['tag-2'],
    tagNames: ['Vaksinasi'],
    authorId: 'usr-editor-03',
    authorName: 'Siti Rahmawati',
    status: 'published',
    publishedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    publishedBy: { id: 'usr-superadmin-01', name: 'Administrator Utama' },
    seoTitle: 'PIN Polio Serentak di Puskesmas',
    seoDescription: 'Liputan pelaksanaan Pekan Imunisasi Nasional Polio bagi balita.',
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    createdBy: { id: 'usr-editor-03', name: 'Siti Rahmawati', email: 'siti@puskesmas.go.id' }
  },
  {
    id: 'post-3',
    title: 'Tips Mencegah Demam Berdarah Dengue (DBD) dengan Gerakan 3M Plus',
    slug: 'tips-mencegah-demam-berdarah-dengue-dbd',
    excerpt: 'Langkah taktis membasmi jentik nyamuk Aedes aegypti selama musim penghujan tiba.',
    content: `
      <p>Memasuki musim penghujan, potensi berkembang biaknya nyamuk Aedes aegypti meningkat pesat. Puskesmas mengimbau masyarakat menerapkan 3M Plus:</p>
      <ol>
        <li>Menguras tempat penampungan air secara rutin.</li>
        <li>Menutup rapat tempat-tempat penyimpanan air.</li>
        <li>Mendaur ulang barang bekas yang berpotensi menampung air hujan.</li>
      </ol>
      <p>Gunakan pula abate pada genangan air bersih yang sulit dikuras.</p>
    `,
    featuredImage: 'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?auto=format&fit=crop&q=80&w=800',
    categoryId: 'cat-kesehatan',
    categoryName: 'Edukasi Kesehatan',
    tagIds: ['tag-4'],
    tagNames: ['Demam Berdarah'],
    authorId: 'usr-editor-03',
    authorName: 'Siti Rahmawati',
    status: 'published',
    publishedAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    publishedBy: { id: 'usr-superadmin-01', name: 'Administrator Utama' },
    seoTitle: 'Panduan Pencegahan DBD 3M Plus',
    seoDescription: 'Langkah-langkah 3M Plus untuk pencegahan penyakit DBD.',
    createdAt: new Date(Date.now() - 86400000 * 12).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    createdBy: { id: 'usr-editor-03', name: 'Siti Rahmawati', email: 'siti@puskesmas.go.id' }
  }
];

async function fetchPosts(): Promise<PostEntity[]> {
  return getCollectionData<PostEntity>(FIRESTORE_COLLECTION, POSTS_STORAGE_KEY, INITIAL_POSTS);
}

function getStoredPosts(): PostEntity[] {
  try {
    const data = memStore.getItem(POSTS_STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed;
    }
    return [];
  } catch {
    return [];
  }
}

export const postService = {
  async getPosts(categoryId?: string, tagId?: string, search?: string, statusFilter?: string): Promise<PostEntity[]> {
    let posts = await fetchPosts();

    if (statusFilter) {
      posts = posts.filter(p => p.status === statusFilter);
    }

    if (categoryId) {
      posts = posts.filter(p => p.categoryId === categoryId);
    }

    if (tagId) {
      posts = posts.filter(p => p.tagIds.includes(tagId));
    }

    if (search) {
      const q = search.toLowerCase();
      posts = posts.filter(p => p.title.toLowerCase().includes(q) || p.excerpt.toLowerCase().includes(q));
    }

    return posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async getPublishedPosts(categoryId?: string, search?: string): Promise<PostEntity[]> {
    const allPosts = await fetchPosts();
    let posts = allPosts.filter(p => p.status === 'published');

    if (categoryId) {
      posts = posts.filter(p => p.categoryId === categoryId);
    }

    if (search) {
      const q = search.toLowerCase();
      posts = posts.filter(p => p.title.toLowerCase().includes(q) || p.excerpt.toLowerCase().includes(q));
    }

    return posts.sort((a, b) => new Date(b.publishedAt || b.createdAt).getTime() - new Date(a.publishedAt || a.createdAt).getTime());
  },

  async getPostBySlug(slug: string): Promise<PostEntity | null> {
    const posts = await fetchPosts();
    const cleanSlug = slug.toLowerCase();
    return posts.find(p => (p.slug && p.slug.toLowerCase() === cleanSlug) || p.id.toLowerCase() === cleanSlug) || null;
  },

  async getRelatedPosts(currentId: string, categoryId: string, limit: number = 3): Promise<PostEntity[]> {
    const allPosts = await fetchPosts();
    const posts = allPosts.filter(p => p.status === 'published' && p.id !== currentId);
    const inSameCategory = posts.filter(p => p.categoryId === categoryId);
    if (inSameCategory.length >= limit) return inSameCategory.slice(0, limit);
    return posts.slice(0, limit);
  },

  async createPost(data: Partial<PostEntity>, actor: { id: string; email: string; name: string }): Promise<PostEntity> {
    const cleanTitle = sanitizeText(data.title || 'Judul Berita');
    const slug = cleanTitle
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');

    const newPost: PostEntity = {
      id: `post-${Date.now()}`,
      title: cleanTitle,
      slug,
      excerpt: sanitizeText(data.excerpt || ''),
      content: sanitizeHtml(data.content || ''),
      featuredImage: data.featuredImage || 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=800',
      categoryId: data.categoryId || 'cat-berita',
      categoryName: data.categoryName || 'Berita & Kegiatan',
      tagIds: data.tagIds || [],
      tagNames: data.tagNames || [],
      authorId: actor.id,
      authorName: actor.name,
      status: data.status || 'draft',
      publishedAt: data.status === 'published' ? new Date().toISOString() : undefined,
      publishedBy: data.status === 'published' ? { id: actor.id, name: actor.name } : undefined,
      seoTitle: sanitizeText(data.seoTitle || data.title || ''),
      seoDescription: sanitizeText(data.seoDescription || data.excerpt || ''),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: { id: actor.id, name: actor.name, email: actor.email }
    };

    await saveDocumentData(FIRESTORE_COLLECTION, newPost.id, newPost, POSTS_STORAGE_KEY);

    // Sync to server for instant Open Graph & WhatsApp Link Preview
    syncPostItemToServer({
      slug: newPost.slug,
      title: newPost.title,
      excerpt: newPost.excerpt,
      featuredImage: newPost.featuredImage,
      category: newPost.categoryName
    }).catch(() => {});
    syncMetadataToServer().catch(() => {});

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'CREATE',
      module: 'PAGES',
      targetId: newPost.id,
      targetName: newPost.title,
      description: `Membuat postingan berita baru: "${newPost.title}" (${newPost.status})`
    });

    return newPost;
  },

  async updatePost(id: string, updates: Partial<PostEntity>, actor: { id: string; email: string; name: string }): Promise<PostEntity> {
    const posts = await fetchPosts();
    const index = posts.findIndex(p => p.id === id);
    if (index === -1) throw new Error('Post tidak ditemukan');

    const existing = posts[index];
    
    // Sanitize any updated string field safely
    const sanitizedUpdates: Partial<PostEntity> = {
      ...updates,
      ...(updates.title !== undefined ? { title: sanitizeText(updates.title) } : {}),
      ...(updates.excerpt !== undefined ? { excerpt: sanitizeText(updates.excerpt) } : {}),
      ...(updates.content !== undefined ? { content: sanitizeHtml(updates.content) } : {}),
      ...(updates.seoTitle !== undefined ? { seoTitle: sanitizeText(updates.seoTitle) } : {}),
      ...(updates.seoDescription !== undefined ? { seoDescription: sanitizeText(updates.seoDescription) } : {}),
    };

    const updatedPost: PostEntity = {
      ...existing,
      ...sanitizedUpdates,
      updatedAt: new Date().toISOString(),
      publishedAt: updates.status === 'published' && existing.status !== 'published' ? new Date().toISOString() : existing.publishedAt,
      publishedBy: updates.status === 'published' && existing.status !== 'published' ? { id: actor.id, name: actor.name } : existing.publishedBy
    };

    await saveDocumentData(FIRESTORE_COLLECTION, updatedPost.id, updatedPost, POSTS_STORAGE_KEY);

    // Sync updated post to server
    syncPostItemToServer({
      slug: updatedPost.slug,
      title: updatedPost.title,
      excerpt: updatedPost.excerpt,
      featuredImage: updatedPost.featuredImage,
      category: updatedPost.categoryName
    }).catch(() => {});
    syncMetadataToServer().catch(() => {});

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: updates.status === 'published' ? 'PUBLISH' : 'UPDATE',
      module: 'PAGES',
      targetId: updatedPost.id,
      targetName: updatedPost.title,
      description: `Memperbarui postingan berita: "${updatedPost.title}" (Status: ${updatedPost.status})`
    });

    return updatedPost;
  },

  async deletePost(id: string, actor: { id: string; email: string; name: string }): Promise<void> {
    const posts = await fetchPosts();
    const target = posts.find(p => p.id === id);
    if (!target) return;

    await deleteDocumentData(FIRESTORE_COLLECTION, id, POSTS_STORAGE_KEY);

    // Sync deletion to server metadata
    syncMetadataToServer().catch(() => {});

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'DELETE',
      module: 'PAGES',
      targetId: target.id,
      targetName: target.title,
      description: `Menghapus berita: "${target.title}"`
    });
  }
};
