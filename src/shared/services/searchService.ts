import type { SearchResultItem } from '../types/index.js';
import { pageService } from './pageService';
import { postService } from './postService';
import { announcementService } from './announcementService';
import { documentService } from './documentService';
import { serviceEngineService } from './serviceEngineService';
import { faqService } from './faqService';
import { facilityService } from './facilityService';
import { staffOrgService } from './staffOrgService';
import { publicInfoService } from './publicInfoService';

export const searchService = {
  async searchAll(query: string, filterType?: string): Promise<SearchResultItem[]> {
    if (!query || query.trim().length === 0) return [];

    const q = query.toLowerCase().trim();
    const results: SearchResultItem[] = [];

    const calculateScore = (title: string, category?: string, excerpt?: string): number => {
      const t = title.toLowerCase();
      const c = (category || '').toLowerCase();
      const e = (excerpt || '').toLowerCase();

      if (t === q) return 100;
      if (t.includes(q)) return 80;
      if (c.includes(q)) return 50;
      if (e.includes(q)) return 30;
      return 10;
    };

    // 1. Services
    try {
      const services = await serviceEngineService.getPublishedServices();
      services.forEach(s => {
        if (
          s.name.toLowerCase().includes(q) ||
          s.shortDescription.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          (s.categoryName && s.categoryName.toLowerCase().includes(q))
        ) {
          results.push({
            id: s.id,
            title: s.name,
            excerpt: s.shortDescription || s.name,
            type: 'service',
            url: `/layanan/${s.slug}`,
            publishedAt: s.publishedAt || s.createdAt,
            category: s.categoryName,
            image: s.ogImage,
            badge: 'Layanan',
            relevanceScore: calculateScore(s.name, s.categoryName, s.shortDescription)
          });
        }
      });
    } catch (e) {
      console.error('Error searching services:', e);
    }

    // 2. News & Articles (Posts)
    try {
      const posts = await postService.getPublishedPosts();
      posts.forEach(post => {
        if (
          post.title.toLowerCase().includes(q) ||
          post.excerpt.toLowerCase().includes(q) ||
          post.content.toLowerCase().includes(q) ||
          (post.categoryName && post.categoryName.toLowerCase().includes(q))
        ) {
          const isNews = post.categoryName?.toLowerCase().includes('berita') || post.categoryName?.toLowerCase().includes('kegiatan');
          const type = isNews ? 'news' : 'article';
          results.push({
            id: post.id,
            title: post.title,
            excerpt: post.excerpt || post.title,
            type,
            url: `/berita/${post.slug}`,
            publishedAt: post.publishedAt || post.createdAt,
            category: post.categoryName,
            image: post.featuredImage,
            badge: isNews ? 'Berita' : 'Artikel',
            relevanceScore: calculateScore(post.title, post.categoryName, post.excerpt)
          });
        }
      });
    } catch (e) {
      console.error('Error searching posts:', e);
    }

    // 3. Announcements
    try {
      const anns = await announcementService.getPublishedAnnouncements();
      anns.forEach(a => {
        if (a.title.toLowerCase().includes(q) || a.content.toLowerCase().includes(q)) {
          results.push({
            id: a.id,
            title: a.title,
            excerpt: a.content.substring(0, 150) + '...',
            type: 'announcement',
            url: '/#pengumuman',
            publishedAt: a.createdAt,
            badge: 'Pengumuman',
            relevanceScore: calculateScore(a.title, 'Pengumuman', a.content)
          });
        }
      });
    } catch (e) {
      console.error('Error searching announcements:', e);
    }

    // 4. FAQ
    try {
      const faqs = await faqService.getFaqs();
      faqs.filter(f => f.status === 'Published').forEach(faq => {
        if (
          faq.question.toLowerCase().includes(q) ||
          faq.answer.toLowerCase().includes(q) ||
          faq.category.toLowerCase().includes(q) ||
          faq.tags.some(t => t.toLowerCase().includes(q))
        ) {
          results.push({
            id: faq.id,
            title: faq.question,
            excerpt: faq.answer.substring(0, 150) + '...',
            type: 'faq',
            url: `/faq`,
            publishedAt: faq.createdAt,
            category: faq.category,
            badge: 'FAQ',
            relevanceScore: calculateScore(faq.question, faq.category, faq.answer)
          });
        }
      });
    } catch (e) {
      console.error('Error searching FAQs:', e);
    }

    // 5. Guides
    try {
      const guides = await faqService.getGuides();
      guides.filter(g => g.status === 'Published').forEach(g => {
        if (
          g.title.toLowerCase().includes(q) ||
          g.summary.toLowerCase().includes(q) ||
          g.content.toLowerCase().includes(q)
        ) {
          results.push({
            id: g.id,
            title: g.title,
            excerpt: g.summary || g.title,
            type: 'guide',
            url: `/faq`,
            publishedAt: g.createdAt,
            category: g.category,
            badge: 'Panduan',
            relevanceScore: calculateScore(g.title, g.category, g.summary)
          });
        }
      });
    } catch (e) {
      console.error('Error searching guides:', e);
    }

    // 6. Documents (Public only)
    try {
      const docs = await documentService.getPublishedDocuments();
      docs.filter(d => d.visibility === 'public' && d.status === 'published').forEach(d => {
        if (
          d.title.toLowerCase().includes(q) ||
          (d.description && d.description.toLowerCase().includes(q)) ||
          d.fileName.toLowerCase().includes(q) ||
          d.category.toLowerCase().includes(q)
        ) {
          results.push({
            id: d.id,
            title: d.title,
            excerpt: d.description || `Dokumen publik: ${d.fileName}`,
            type: 'document',
            url: `/dokumen`,
            publishedAt: d.publishedAt || d.createdAt,
            category: d.category,
            badge: 'Dokumen',
            relevanceScore: calculateScore(d.title, d.category, d.description)
          });
        }
      });
    } catch (e) {
      console.error('Error searching documents:', e);
    }

    // 7. Facilities
    try {
      const facilities = await facilityService.getPublishedFacilities();
      facilities.forEach(f => {
        if (
          f.name.toLowerCase().includes(q) ||
          f.description.toLowerCase().includes(q) ||
          f.category.toLowerCase().includes(q) ||
          f.location.toLowerCase().includes(q)
        ) {
          results.push({
            id: f.id,
            title: f.name,
            excerpt: f.description,
            type: 'facility',
            url: `/fasilitas`,
            publishedAt: f.createdAt,
            category: f.category,
            image: f.photos?.[0],
            badge: 'Fasilitas',
            relevanceScore: calculateScore(f.name, f.category, f.description)
          });
        }
      });
    } catch (e) {
      console.error('Error searching facilities:', e);
    }

    // 8. Staff (Active & Public)
    try {
      const staffList = await staffOrgService.getStaffProfiles(false);
      staffList.forEach(s => {
        if (
          s.name.toLowerCase().includes(q) ||
          s.positionTitle.toLowerCase().includes(q) ||
          s.unitName.toLowerCase().includes(q) ||
          s.bio.toLowerCase().includes(q)
        ) {
          results.push({
            id: s.id,
            title: s.name,
            excerpt: `${s.positionTitle} - ${s.unitName}. ${s.bio}`,
            type: 'staff',
            url: `/kontak`,
            publishedAt: s.createdAt,
            category: s.unitName,
            image: s.photoUrl,
            badge: 'Petugas',
            relevanceScore: calculateScore(s.name, s.unitName, s.positionTitle)
          });
        }
      });
    } catch (e) {
      console.error('Error searching staff:', e);
    }

    // 9. Public Information
    try {
      const publicInfos = await publicInfoService.getPublishedPublicInfos();
      publicInfos.forEach(info => {
        if (
          info.title.toLowerCase().includes(q) ||
          info.summary.toLowerCase().includes(q) ||
          info.category.toLowerCase().includes(q)
        ) {
          results.push({
            id: info.id,
            title: info.title,
            excerpt: info.summary,
            type: 'public-info',
            url: `/informasi-publik/${info.slug}`,
            publishedAt: info.publicationDate || info.createdAt,
            category: info.category,
            badge: 'Informasi Publik',
            relevanceScore: calculateScore(info.title, info.category, info.summary)
          });
        }
      });
    } catch (e) {
      console.error('Error searching public information:', e);
    }

    // 10. Pages
    try {
      const pages = await pageService.getPublishedPages();
      pages.forEach(p => {
        if (p.title.toLowerCase().includes(q) || p.excerpt.toLowerCase().includes(q) || p.content.toLowerCase().includes(q)) {
          results.push({
            id: p.id,
            title: p.title,
            excerpt: p.excerpt || p.title,
            type: 'page',
            url: `/${p.slug}`,
            publishedAt: p.publishedAt || p.createdAt,
            badge: 'Halaman',
            relevanceScore: calculateScore(p.title, 'Halaman', p.excerpt)
          });
        }
      });
    } catch (e) {
      console.error('Error searching pages:', e);
    }

    // Sort by relevance score descending, then published date descending
    results.sort((a, b) => {
      const scoreDiff = (b.relevanceScore || 0) - (a.relevanceScore || 0);
      if (scoreDiff !== 0) return scoreDiff;
      const dateA = new Date(a.publishedAt || 0).getTime();
      const dateB = new Date(b.publishedAt || 0).getTime();
      return dateB - dateA;
    });

    if (filterType && filterType !== 'all') {
      return results.filter(r => r.type === filterType);
    }

    return results;
  },

  getRecentSearches(): string[] {
    try {
      const stored = localStorage.getItem('puskesmas_recent_searches');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  addRecentSearch(keyword: string) {
    if (!keyword || !keyword.trim()) return;
    try {
      const clean = keyword.trim();
      let recent = this.getRecentSearches();
      recent = [clean, ...recent.filter(item => item.toLowerCase() !== clean.toLowerCase())].slice(0, 5);
      localStorage.setItem('puskesmas_recent_searches', JSON.stringify(recent));
    } catch (e) {
      console.error('Failed to save recent search:', e);
    }
  },

  clearRecentSearches() {
    try {
      localStorage.removeItem('puskesmas_recent_searches');
    } catch (e) {
      console.error('Failed to clear recent searches:', e);
    }
  }
};
