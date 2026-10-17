// TAHAP 3 — hasil pemecahan server.ts (perilaku endpoint TIDAK berubah).
import { Router } from "express";
import fs from "fs";
import path from "path";
import express from "express";
import {
  getServerPosts, getServerPostsList, saveServerPostsList, saveServerPostMeta,
  getServerSiteSettings, saveServerSiteSettings,
  getServerContactSettings, saveServerContactSettings,
  getServerMicrosites, saveServerMicrosites, getServerMicrositesMeta,
  getDataStoreFilePath, renderHtmlWithMeta, generateShareHtml,
  generatePageScreenshotSvg, renderScreenshotPng, handlePostImageRequest,
} from "../lib/storage.js";
import { SINGLE_DOCUMENT_COLLECTIONS, DATA_STORE_DIR } from "../lib/config.js";
const router = Router();

router.get("/api/meta-preview", (req, res) => {
  const reqPath = (req.query.path as string) || "/";
  const mockReq = { ...req, path: reqPath, originalUrl: reqPath } as express.Request;
  const dummyHtml = `<title></title><meta name="description" content="" /><meta property="og:title" content="" /><meta property="og:description" content="" /><meta property="og:image" content="" /><meta property="og:url" content="" /><meta property="og:type" content="" /><meta name="twitter:title" content="" /><meta name="twitter:description" content="" /><meta name="twitter:image" content="" />`;
  const rendered = renderHtmlWithMeta(mockReq, dummyHtml);
  res.json({ success: true, path: reqPath, rawHtml: rendered });
});

// Default datasets for Open Graph Meta tags

router.get("/api/posts", (req, res) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.json({ success: true, posts: getServerPostsList() });
});

router.post("/api/posts", (req, res) => {
  const item = req.body;
  if (!item || (!item.id && !item.slug)) {
    return res.status(400).json({ error: "Invalid post payload" });
  }
  const current = getServerPostsList();
  const idx = current.findIndex((p: any) => (item.id && p.id === item.id) || (item.slug && p.slug === item.slug));
  let savedItem: any;
  if (idx >= 0) {
    savedItem = { ...current[idx], ...item, updatedAt: new Date().toISOString() };
    current[idx] = savedItem;
  } else {
    savedItem = { ...item, id: item.id || `post-${Date.now()}`, createdAt: item.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
    current.unshift(savedItem);
  }
  saveServerPostsList(current);
  res.json({ success: true, post: savedItem, posts: current });
});

router.delete("/api/posts/:id", (req, res) => {
  const { id } = req.params;
  const current = getServerPostsList();
  const filtered = current.filter((p: any) => p.id !== id && p.slug !== id);
  saveServerPostsList(filtered);
  res.json({ success: true, message: `Post ${id} deleted`, posts: filtered });
});

// API endpoint to read site settings

router.get("/api/site-settings", (req, res) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.json({ success: true, settings: getServerSiteSettings() });
});

// API endpoint to update site settings directly
router.post("/api/site-settings", (req, res) => {
  const settings = req.body;
  if (!settings || typeof settings !== 'object') {
    return res.status(400).json({ error: "Invalid settings payload" });
  }
  saveServerSiteSettings(settings);
  res.json({ success: true, settings: getServerSiteSettings() });
});

// ==========================================
// CENTRAL CONTACT SETTINGS API ENDPOINTS
// ==========================================
router.get("/api/contact-settings", (req, res) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  const data = getServerContactSettings();
  res.json({ success: true, contactSettings: data });
});

router.post("/api/contact-settings", (req, res) => {
  const data = req.body;
  if (!data || typeof data !== 'object') {
    return res.status(400).json({ error: "Invalid contact settings payload" });
  }
  saveServerContactSettings(data);
  res.json({ success: true, contactSettings: getServerContactSettings() });
});

// ==========================================
// UNIVERSAL DATA STORE API (MULTI-BROWSER & MULTI-ACCOUNT SYNC)
// ==========================================


router.get("/api/data/:collection", (req, res) => {
  try {
    const { collection } = req.params;
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

    if (collection === 'posts') {
      return res.json({ success: true, data: getServerPostsList() });
    }

    if (collection === 'microsites') {
      return res.json({ success: true, data: getServerMicrosites() });
    }

    if (collection === 'site_settings') {
      return res.json({ success: true, data: getServerSiteSettings() });
    }

    if (collection === 'contact_settings') {
      return res.json({ success: true, data: getServerContactSettings() });
    }

    const filePath = getDataStoreFilePath(collection);
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      return res.json({ success: true, data });
    }
    return res.json({ success: true, data: null });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/api/data/:collection", (req, res) => {
  try {
    const { collection } = req.params;
    const body = req.body;
    const filePath = getDataStoreFilePath(collection);
    const isSingleDoc = SINGLE_DOCUMENT_COLLECTIONS.has(collection);

    if (Array.isArray(body)) {
      // Full collection replace
      fs.writeFileSync(filePath, JSON.stringify(body, null, 2), "utf-8");
      if (collection === 'posts') {
        saveServerPostsList(body);
      } else if (collection === 'microsites') {
        saveServerMicrosites(body);
      }
      return res.json({ success: true, data: body });
    }

    if (body && typeof body === 'object') {
      if (isSingleDoc) {
        let existingData: any = null;
        if (fs.existsSync(filePath)) {
          try {
            existingData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
          } catch {}
        }
        const merged = { ...(existingData || {}), ...body, updatedAt: new Date().toISOString() };
        fs.writeFileSync(filePath, JSON.stringify(merged, null, 2), "utf-8");
        if (collection === 'site_settings') {
          saveServerSiteSettings(merged);
        } else if (collection === 'contact_settings') {
          saveServerContactSettings(merged);
        }
        return res.json({ success: true, data: merged });
      } else {
        // Array collection item insert / update
        const docId = body.id || body.uid || body.docId;
        let existingData: any[] = [];
        if (collection === 'posts') {
          existingData = getServerPostsList();
        } else if (collection === 'microsites') {
          existingData = getServerMicrosites();
        } else if (fs.existsSync(filePath)) {
          try {
            const parsed = JSON.parse(fs.readFileSync(filePath, "utf-8"));
            if (Array.isArray(parsed)) existingData = parsed;
          } catch {}
        }

        const payload = { ...body, id: docId || `item-${Date.now()}` };
        if (docId) {
          const idx = existingData.findIndex((i: any) => i.id === docId || i.uid === docId || (payload.slug && i.slug === payload.slug));
          if (idx >= 0) {
            existingData[idx] = { ...existingData[idx], ...payload, updatedAt: new Date().toISOString() };
          } else {
            existingData.unshift({ ...payload, createdAt: payload.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() });
          }
        } else {
          existingData.unshift({ ...payload, createdAt: payload.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() });
        }

        fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2), "utf-8");
        if (collection === 'posts') {
          saveServerPostsList(existingData);
        } else if (collection === 'microsites') {
          saveServerMicrosites(existingData);
        }
        return res.json({ success: true, data: existingData });
      }
    }

    return res.status(400).json({ success: false, error: "Invalid payload format" });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.delete("/api/data/:collection/:id", (req, res) => {
  try {
    const { collection, id } = req.params;
    const filePath = getDataStoreFilePath(collection);

    if (collection === 'posts') {
      const current = getServerPostsList();
      const filtered = current.filter((p: any) => p.id !== id && p.slug !== id);
      saveServerPostsList(filtered);
      return res.json({ success: true, data: filtered });
    }

    if (collection === 'microsites') {
      const current = getServerMicrosites();
      const filtered = current.filter((m: any) => m.id !== id && m.slug !== id);
      saveServerMicrosites(filtered);
      return res.json({ success: true, data: filtered });
    }

    if (fs.existsSync(filePath)) {
      const existingData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      if (Array.isArray(existingData)) {
        const filtered = existingData.filter((i: any) => i.id !== id && i.uid !== id && i.slug !== id);
        fs.writeFileSync(filePath, JSON.stringify(filtered, null, 2), "utf-8");
        return res.json({ success: true, data: filtered });
      }
    }
    return res.json({ success: true, message: "Item deleted" });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// API endpoint to sync full metadata from panel (settings, microsites, posts)
router.post("/api/sync-metadata", (req, res) => {
  try {
    const { settings, microsites, posts } = req.body || {};
    if (settings && typeof settings === 'object') {
      saveServerSiteSettings(settings);
    }
    if (Array.isArray(microsites)) {
      const current = getServerMicrositesMeta();
      for (const m of microsites) {
        if (m.slug) {
          current[m.slug] = {
            name: m.name || m.title || '',
            description: m.description || '',
            profileImageUrl: m.profileImageUrl || m.coverImageUrl || '',
            logoUrl: m.logoUrl || '',
            ogImageUrl: m.ogImageUrl || m.profileImageUrl || '',
            slug: m.slug
          };
        }
      }
      fs.writeFileSync(MICROSITES_META_FILE, JSON.stringify(current, null, 2), "utf-8");
    }
    if (Array.isArray(posts)) {
      const currentPosts: Record<string, any> = {};
      try {
        if (fs.existsSync(POSTS_META_FILE)) {
          Object.assign(currentPosts, JSON.parse(fs.readFileSync(POSTS_META_FILE, "utf-8")));
        }
      } catch {}
      for (const p of posts) {
        if (p.slug) {
          currentPosts[p.slug] = {
            title: p.title || '',
            excerpt: p.excerpt || p.summary || '',
            featuredImage: p.featuredImage || ''
          };
        }
      }
      fs.writeFileSync(POSTS_META_FILE, JSON.stringify(currentPosts, null, 2), "utf-8");
    }
    return res.json({ success: true, message: "Metadata synchronized successfully" });
  } catch (err: any) {
    console.error("Error in /api/sync-metadata:", err);
    return res.status(500).json({ error: err.message });
  }
});

// API endpoint to sync a single microsite item

router.post("/api/posts/sync-item", (req, res) => {
  const { slug, title, excerpt, featuredImage, category } = req.body || {};
  if (!slug) {
    return res.status(400).json({ error: "Missing post slug" });
  }
  saveServerPostMeta(slug, { title, excerpt, featuredImage, category });
  return res.json({ success: true, message: "Post meta saved" });
});

// Static OG Image & Logo endpoints to ensure WhatsApp, Telegram & Facebook crawlers get fast, non-redirected image responses
router.get(["/og-image.png", "/og-preview.png"], (req, res) => {
  const filePath = path.join(process.cwd(), "public", "og-image.png");
  if (fs.existsSync(filePath)) {
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400");
    return res.sendFile(filePath);
  }
  res.status(404).send("Not found");
});

router.get(["/logo.png", "/logo-puskesmas.png", "/logo-custom.png"], (req, res) => {
  const customPath = path.join(process.cwd(), "public", "logo-custom.png");
  if (fs.existsSync(customPath)) {
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=3600");
    return res.sendFile(customPath);
  }
  const defaultPath = path.join(process.cwd(), "public", "logo.png");
  if (fs.existsSync(defaultPath)) {
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400");
    return res.sendFile(defaultPath);
  }
  res.status(404).send("Not found");
});

router.get(["/favicon.ico", "/favicon-custom.png", "/favicon.png"], (req, res) => {
  const customFavicon = path.join(process.cwd(), "public", "favicon-custom.png");
  if (fs.existsSync(customFavicon)) {
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=3600");
    return res.sendFile(customFavicon);
  }
  const defaultLogo = path.join(process.cwd(), "public", "logo.png");
  if (fs.existsSync(defaultLogo)) {
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400");
    return res.sendFile(defaultLogo);
  }
  res.status(404).send("Not found");
});

// API endpoint to upload custom Puskesmas Logo

router.get("/share", (req, res) => {
  const headers = req?.headers || {};
  let proto = (headers['x-forwarded-proto'] as string) || req?.protocol || 'https';
  const host = (headers['x-forwarded-host'] as string) || (headers.host as string) || 'sumenep.puskesmasmanding.com';
  if (!host.includes('localhost') && !host.includes('127.0.0.1')) {
    proto = 'https';
  }
  const userAgent = (headers["user-agent"] || "").toLowerCase();
  const isSocialCrawler = /whatsapp|facebookexternalhit|facebot|twitterbot|telegrambot|linkedinbot|slackbot|discordbot/i.test(userAgent);

  const query = req.query || {};
  const settings = getServerSiteSettings();
  const siteName = (query.site || query.site_name || settings.siteName || settings.shortName || 'Puskesmas Mandiri Sejahtera') as string;

  let title = (query.t || query.title || query.og_title || query.judul || settings.siteTitle || `${siteName} - Portal Resmi`) as string;
  if (!title.includes(siteName) && title !== siteName) {
    title = `${title} - ${siteName}`;
  }

  let description = (query.d || query.desc || query.description || query.og_desc || query.deskripsi || settings.siteDescription || `Portal resmi informasi dan pelayanan kesehatan ${siteName}.`) as string;

  let targetUrl = (query.to || query.url || query.redirect || query.target || '/') as string;
  if (!targetUrl.startsWith('/') && !targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    targetUrl = `/${targetUrl}`;
  }

  let image = (query.img || query.image || query.og_image || query.gambar || '') as string;
  const postMatch = targetUrl.match(/^\/berita\/([^\/]+)/);
  const msMatch = targetUrl.match(/^\/m\/([^\/]+)/);
  if (!image || image.startsWith('data:image/')) {
    if (postMatch) {
      image = `${proto}://${host}/api/post-image/${encodeURIComponent(postMatch[1])}.png`;
    } else if (msMatch) {
      image = `${proto}://${host}/api/og-image/${encodeURIComponent(msMatch[1])}.png`;
    } else {
      // Default to dynamic screenshot preview image
      image = `${proto}://${host}/api/preview-image.png?title=${encodeURIComponent(title)}&desc=${encodeURIComponent(description)}&path=${encodeURIComponent(targetUrl)}`;
    }
  } else if (image.startsWith('/')) {
    image = `${proto}://${host}${image}`;
  }

  const fullUrl = `${proto}://${host}${req.originalUrl || req.url}`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=120, stale-while-revalidate=600");
  return res.send(generateShareHtml({
    title,
    description,
    image,
    siteName,
    fullUrl,
    targetUrl,
    isSocialCrawler
  }));
});

// Dedicated Shortlink & Smart Redirection for Berita / Articles: /b/:slug
router.get("/b/:slug", (req, res) => {
  const slug = decodeURIComponent(req.params.slug || '');
  const headers = req?.headers || {};
  let proto = (headers['x-forwarded-proto'] as string) || req?.protocol || 'https';
  const host = (headers['x-forwarded-host'] as string) || (headers.host as string) || 'puskesmas-mandiri.go.id';
  if (!host.includes('localhost') && !host.includes('127.0.0.1')) {
    proto = 'https';
  }
  const userAgent = (headers["user-agent"] || "").toLowerCase();
  const isSocialCrawler = /whatsapp|facebookexternalhit|facebot|twitterbot|telegrambot|linkedinbot|slackbot|discordbot/i.test(userAgent);

  const query = req.query || {};
  const settings = getServerSiteSettings();
  const siteName = (query.site || query.site_name || settings.siteName || settings.shortName || 'Puskesmas Mandiri Sejahtera') as string;

  const posts = getServerPosts();
  const post = posts[slug];

  let title = (query.t || query.title || (post && post.title ? `${post.title} - ${siteName}` : `${slug.replace(/-/g, ' ')} - ${siteName}`)) as string;
  let description = (query.d || query.desc || (post && post.excerpt ? post.excerpt : `Dapatkan artikel dan informasi kesehatan resmi dari ${siteName}.`)) as string;
  
  let image = (query.img || query.image || '') as string;
  if (!image || image.startsWith('data:image/')) {
    image = `${proto}://${host}/api/post-image/${encodeURIComponent(slug)}.png`;
  } else if (image.startsWith('/')) {
    image = `${proto}://${host}${image}`;
  }

  const targetUrl = `/berita/${slug}`;
  const fullUrl = `${proto}://${host}${req.originalUrl || req.url}`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=120, stale-while-revalidate=600");
  return res.send(generateShareHtml({
    title,
    description,
    image,
    siteName,
    fullUrl,
    targetUrl,
    isSocialCrawler
  }));
});

// Dedicated Shortlink & Smart Redirection for Microsites: /s/:slug and /l/:slug
router.get(["/s/:slug", "/l/:slug"], (req, res) => {
  const slug = decodeURIComponent(req.params.slug || '');
  const headers = req?.headers || {};
  let proto = (headers['x-forwarded-proto'] as string) || req?.protocol || 'https';
  const host = (headers['x-forwarded-host'] as string) || (headers.host as string) || 'puskesmas-mandiri.go.id';
  if (!host.includes('localhost') && !host.includes('127.0.0.1')) {
    proto = 'https';
  }
  const userAgent = (headers["user-agent"] || "").toLowerCase();
  const isSocialCrawler = /whatsapp|facebookexternalhit|facebot|twitterbot|telegrambot|linkedinbot|slackbot|discordbot/i.test(userAgent);

  const query = req.query || {};
  const settings = getServerSiteSettings();
  const siteName = (query.site || query.site_name || settings.siteName || settings.shortName || 'Puskesmas Mandiri Sejahtera') as string;

  const microsites = getServerMicrositesMeta();
  const ms = microsites[slug];

  let title = (query.t || query.title || (ms && ms.name ? `${ms.name} - ${siteName}` : `Portal ${slug} - ${siteName}`)) as string;
  let description = (query.d || query.desc || (ms && ms.description ? ms.description : `Akses informasi dan layanan portal ${slug} di ${siteName}.`)) as string;
  
  let image = (query.img || query.image || '') as string;
  if (image) {
    if (image.startsWith('/')) {
      image = `${proto}://${host}${image}`;
    }
  } else if (ms && ms.ogImageUrl && !query.screenshot) {
    let img = ms.ogImageUrl;
    if (img.startsWith('data:image/')) {
      image = `${proto}://${host}/api/og-image/${encodeURIComponent(slug)}.png`;
    } else if (img.startsWith('/')) {
      image = `${proto}://${host}${img}`;
    } else {
      image = img;
    }
  } else {
    // Generate crisp page screenshot preview
    image = `${proto}://${host}/api/preview-image.png?type=microsite&slug=${encodeURIComponent(slug)}&path=${encodeURIComponent('/m/' + slug)}`;
  }

  const targetUrl = `/m/${slug}`;
  const fullUrl = `${proto}://${host}${req.originalUrl || req.url}`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=120, stale-while-revalidate=600");
  return res.send(generateShareHtml({
    title,
    description,
    image,
    siteName,
    fullUrl,
    targetUrl,
    isSocialCrawler
  }));
});

// Dedicated Dynamic OG Image Endpoint for Microsites (/api/og-image/:slug.png)
router.get(["/api/og-image/:slug.png", "/api/og-image/:slug"], (req, res) => {
  const rawSlug = req.params.slug || '';
  const slug = decodeURIComponent(rawSlug.replace(/\.png$/i, ''));
  const microsites = getServerMicrositesMeta();
  const ms = microsites[slug];

  const img = ms?.ogImageUrl || ms?.profileImageUrl || ms?.logoUrl || '';

  // 1. If base64 data url, decode to binary and return as real image/png
  if (img.startsWith('data:image/')) {
    const match = img.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
    if (match) {
      const mime = match[1];
      const buffer = Buffer.from(match[2], 'base64');
      res.setHeader("Content-Type", mime);
      res.setHeader("Content-Length", buffer.length);
      res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400");
      return res.end(buffer);
    }
  }

  // 2. If it's a relative path on local filesystem
  if (img.startsWith('/') && !img.startsWith('//')) {
    const localFile = path.join(process.cwd(), 'public', img.replace(/^\//, ''));
    if (fs.existsSync(localFile)) {
      res.setHeader("Content-Type", "image/png");
      res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400");
      return res.sendFile(localFile);
    }
  }

  // 3. If it's an external URL
  if (img.startsWith('http://') || img.startsWith('https://')) {
    return res.redirect(302, img);
  }

  // 4. Default category match
  const slugLower = slug.toLowerCase();
  for (const [catKey, catImg] of Object.entries(CATEGORY_DEFAULT_IMAGES)) {
    if (slugLower.includes(catKey)) {
      return res.redirect(302, catImg);
    }
  }

  // 5. Fallback to /og-image.png
  const defaultOg = path.join(process.cwd(), 'public', 'og-image.png');
  if (fs.existsSync(defaultOg)) {
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400");
    return res.sendFile(defaultOg);
  }
  return res.status(404).send("Image not found");
});

// Dedicated Dynamic OG Image Endpoint for News Articles & Berita (/api/post-image/:slug)
const handlePostImageRequest = (req: express.Request, res: express.Response) => {
  const rawSlug = req.params.slug || '';
  const cleanSlug = decodeURIComponent(rawSlug).replace(/\.(png|jpg|jpeg|webp|gif|svg)$/i, '').trim();
  const slugLower = cleanSlug.toLowerCase();
  
  const posts = getServerPosts();
  let post = posts[cleanSlug] || posts[slugLower];

  if (!post) {
    // Try fuzzy match on keys
    const matchKey = Object.keys(posts).find(k => k.toLowerCase() === slugLower || k.toLowerCase().replace(/[^a-z0-9]/g, '-') === slugLower.replace(/[^a-z0-9]/g, '-'));
    if (matchKey) {
      post = posts[matchKey];
    }
  }

  // Also search directly in data_store/posts.json if not found
  if (!post) {
    try {
      const dataStorePostsPath = path.join(process.cwd(), "data_store", "posts.json");
      if (fs.existsSync(dataStorePostsPath)) {
        const parsed = JSON.parse(fs.readFileSync(dataStorePostsPath, "utf-8"));
        if (Array.isArray(parsed)) {
          const found = parsed.find((p: any) => 
            (p.slug && p.slug.toLowerCase() === slugLower) || 
            (p.id && p.id.toLowerCase() === slugLower) ||
            (p.title && p.title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-') === slugLower)
          );
          if (found) {
            post = {
              title: found.title || '',
              excerpt: found.excerpt || found.summary || found.seoDescription || '',
              featuredImage: found.featuredImage || found.imageUrl || found.coverImage || '',
              category: found.category || found.categoryName || 'Berita & Informasi'
            };
          }
        }
      }
    } catch (e) {
      console.error("Error reading data_store/posts.json in handlePostImageRequest:", e);
    }
  }

  const img = post?.featuredImage || post?.imageUrl || post?.coverImage || '';

  // 1. If base64 data url (e.g. AI generated image or uploaded base64 data URI)
  if (img && img.startsWith('data:image/')) {
    try {
      const commaIdx = img.indexOf(',');
      if (commaIdx !== -1) {
        const header = img.substring(0, commaIdx);
        const base64Data = img.substring(commaIdx + 1).replace(/\s+/g, '');
        const mimeMatch = header.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64/);
        const mime = mimeMatch ? mimeMatch[1] : 'image/png';
        const buffer = Buffer.from(base64Data, 'base64');
        
        res.setHeader("Content-Type", mime);
        res.setHeader("Content-Length", buffer.length);
        res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400");
        return res.end(buffer);
      }
    } catch (err) {
      console.error("Error decoding base64 post image:", err);
    }
  }

  // 2. If it's a relative path in /uploads/ or /public/
  if (img && img.startsWith('/') && !img.startsWith('//')) {
    const cleanPath = img.replace(/^\//, '');
    const uploadFile = path.join(process.cwd(), cleanPath);
    if (fs.existsSync(uploadFile)) {
      const ext = path.extname(uploadFile).toLowerCase();
      const mimeType = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : ext === '.webp' ? 'image/webp' : ext === '.svg' ? 'image/svg+xml' : 'image/png';
      res.setHeader("Content-Type", mimeType);
      res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400");
      return res.sendFile(uploadFile);
    }
    const publicFile = path.join(process.cwd(), 'public', cleanPath);
    if (fs.existsSync(publicFile)) {
      res.setHeader("Content-Type", "image/png");
      res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400");
      return res.sendFile(publicFile);
    }
  }

  // 3. If it's an external URL
  if (img && (img.startsWith('http://') || img.startsWith('https://'))) {
    return res.redirect(302, img);
  }

  // 4. If no featured image or post not found, generate high-resolution Open Graph article card
  try {
    const settings = getServerSiteSettings();
    const site = settings.siteName || "Puskesmas Mandiri Sejahtera";
    const title = post?.title || cleanSlug.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
    const desc = post?.excerpt || `Dapatkan informasi dan panduan kesehatan resmi dari ${site}.`;
    const category = post?.category || "Berita & Edukasi";

    const headers = req.headers || {};
    let proto = (headers['x-forwarded-proto'] as string) || req.protocol || 'https';
    const host = (headers['x-forwarded-host'] as string) || (headers.host as string) || 'sumenep.puskesmasmanding.com';
    if (!host.includes('localhost') && !host.includes('127.0.0.1')) {
      proto = 'https';
    }

    const svg = generatePageScreenshotSvg({
      siteName: site,
      title,
      description: desc,
      category,
      pageType: "berita",
      fullUrl: `${proto}://${host}/berita/${encodeURIComponent(cleanSlug)}`
    });

    const pngBuffer = renderScreenshotPng(svg);
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Length", pngBuffer.length);
    res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400");
    return res.end(pngBuffer);
  } catch (err) {
    const defaultOg = path.join(process.cwd(), 'public', 'og-image.png');
    if (fs.existsSync(defaultOg)) {
      res.setHeader("Content-Type", "image/png");
      return res.sendFile(defaultOg);
    }
    return res.status(404).send("Article image not found");
  }
};

router.get("/api/post-image/:slug", handlePostImageRequest);
router.get("/api/post-og-image/:slug", handlePostImageRequest);

// Dynamic High-Fidelity Page Screenshot / Open Graph Image Generator
router.get(["/api/preview-image.png", "/api/screenshot.png", "/api/preview-image", "/api/screenshot"], (req, res) => {
  try {
    const query = req.query || {};
    const settings = getServerSiteSettings();
    const site = String(query.site || settings.siteName || "Puskesmas Mandiri Sejahtera");
    const rawPath = String(query.path || query.to || "/");
    const pageType = String(query.type || (rawPath.startsWith('/m/') ? 'microsite' : rawPath.startsWith('/berita') ? 'berita' : rawPath.startsWith('/layanan') ? 'layanan' : rawPath.startsWith('/pendaftaran') ? 'pendaftaran' : rawPath.startsWith('/kontak') ? 'kontak' : rawPath.startsWith('/pengaduan') ? 'pengaduan' : rawPath.startsWith('/dokumen') ? 'dokumen' : rawPath.startsWith('/profil') ? 'profil' : 'home'));
    const slug = String(query.slug || '').toLowerCase();

    const headers = req.headers || {};
    let proto = (headers['x-forwarded-proto'] as string) || req.protocol || 'https';
    const host = (headers['x-forwarded-host'] as string) || (headers.host as string) || 'sumenep.puskesmasmanding.com';
    if (!host.includes('localhost') && !host.includes('127.0.0.1')) {
      proto = 'https';
    }
    const fullUrl = `${proto}://${host}${rawPath}`;

    let title = String(query.title || query.t || "");
    let desc = String(query.desc || query.d || "");
    let category = String(query.category || query.cat || "");
    let links: Array<{ label: string; url?: string }> = [];
    let cluster: string | undefined = undefined;
    let schedule: string | undefined = undefined;

    if (pageType === "microsite") {
      const targetSlug = slug || rawPath.replace(/^\/m\//, '').split(/[?#]/)[0];
      const microsites = getServerMicrositesMeta();
      const ms = microsites[targetSlug];
      if (ms) {
        if (!title) title = ms.name;
        if (!desc) desc = ms.description || `Portal resmi informasi dan layanan cepat ${ms.name}.`;
        if (!category) category = ms.category || "Microsite & Portal";
        if (Array.isArray(ms.links) && ms.links.length > 0) {
          links = ms.links;
        }
      } else if (!title) {
        const formatted = targetSlug.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
        title = `Portal ${formatted}`;
        desc = `Akses informasi dan layanan terpadu ${formatted} ${site}.`;
      }
    } else if (pageType === "berita") {
      const targetSlug = slug || rawPath.replace(/^\/berita\//, '').split(/[?#]/)[0];
      const posts = getServerPosts();
      const post = posts[targetSlug];
      if (post) {
        if (!title) title = post.title;
        if (!desc) desc = post.excerpt || `Dapatkan informasi dan panduan kesehatan resmi dari ${site}.`;
        if (!category) category = post.category || "Berita & Edukasi";
      } else if (!title) {
        title = rawPath === '/berita' ? "Pusat Berita & Informasi Kesehatan Terkini" : "Berita Kesehatan Masyarakat";
        desc = `Dapatkan rilis berita resmi, edukasi kesehatan, dan program prioritas ${site}.`;
      }
    } else if (pageType === "layanan") {
      const targetSlug = slug || rawPath.replace(/^\/layanan\//, '').split(/[?#]/)[0];
      const services = getServerServices();
      const srv = services[targetSlug];
      if (srv) {
        if (!title) title = `Layanan ${srv.name}`;
        if (!desc) desc = srv.description;
        cluster = srv.cluster;
        schedule = srv.schedule;
        category = "Layanan Medis";
      } else if (!title) {
        title = "Standar Pelayanan Medis & Poliklinik Terpadu";
        desc = `Informasi lengkap seluruh unit layanan medis rawat jalan berbasis 5 Klaster ILP di ${site}.`;
      }
    } else if (pageType === "pendaftaran") {
      if (!title) title = `Pendaftaran Online & Antrean Pasien`;
      if (!desc) desc = `Daftar rawat jalan, pilih klaster pelayanan primer, dan pantau status nomor antrian secara transparan di ${site}.`;
    } else if (pageType === "kontak") {
      if (!title) title = `Kontak Resmi & Jam Operasional`;
      if (!desc) desc = `Alamat lengkap, nomor telepon darurat 24 Jam, WhatsApp resmi, dan rute navigasi ke ${site}.`;
    } else if (pageType === "pengaduan") {
      if (!title) title = `Layanan Aspirasi, Pengaduan Masyarakat & SKM`;
      if (!desc) desc = `Sampaikan kritik, saran, apresiasi, dan pengaduan pelayanan publik ${site} melalui saluran resmi SP4N-LAPOR!.`;
    } else if (pageType === "dokumen") {
      if (!title) title = `Standar Pelayanan & Dokumen Publik`;
      if (!desc) desc = `Unduh dan baca standar operasional prosedur, maklumat pelayanan, serta dokumen publik resmi ${site}.`;
    } else if (pageType === "profil") {
      if (!title) title = `Profil Instansi, Visi Misi & Maklumat`;
      if (!desc) desc = `Profil kelembagaan, visi misi, tata nilai budaya kerja, dan maklumat pelayanan resmi ${site}.`;
    } else {
      if (!title) title = settings.siteTitle || `${site} - Portal Resmi & Pelayanan Terpadu`;
      if (!desc) desc = settings.siteDescription || `Portal informasi dan pelayanan kesehatan primer terpadu berbasis 5 Klaster ILP.`;
    }

    const svg = generatePageScreenshotSvg({
      siteName: site,
      title,
      description: desc,
      category,
      pageType,
      fullUrl,
      links,
      cluster,
      schedule
    });

    const pngBuffer = renderScreenshotPng(svg);

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Length", pngBuffer.length);
    res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400");
    return res.end(pngBuffer);
  } catch (err: any) {
    console.error("Error generating screenshot PNG:", err);
    return res.status(500).send("Error generating screenshot");
  }
});

// Dynamic Open Graph Card Banner Generator (/api/og-card)
router.get(["/api/og-card.png", "/api/og-card"], (req, res) => {

  try {
    const query = req.query || {};
    const settings = getServerSiteSettings();
    const site = String(query.site || settings.siteName || "Puskesmas Mandiri Sejahtera");
    const title = String(query.title || query.t || settings.siteTitle || "Pelayanan Kesehatan Primer Terintegrasi");
    const desc = String(query.desc || query.d || settings.siteDescription || "Portal Informasi & Pelayanan Publik");
    
    const headers = req.headers || {};
    let proto = (headers['x-forwarded-proto'] as string) || req.protocol || 'https';
    const host = (headers['x-forwarded-host'] as string) || (headers.host as string) || 'sumenep.puskesmasmanding.com';
    if (!host.includes('localhost') && !host.includes('127.0.0.1')) {
      proto = 'https';
    }

    const svg = generatePageScreenshotSvg({
      siteName: site,
      title,
      description: desc,
      pageType: String(query.type || 'home'),
      fullUrl: `${proto}://${host}${query.path || '/'}`
    });

    const wantsSvg = req.path.endsWith('.svg') || req.query.format === 'svg';
    if (wantsSvg) {
      res.setHeader("Content-Type", "image/svg+xml");
      res.setHeader("Cache-Control", "public, max-age=86400");
      return res.send(svg);
    }

    const pngBuffer = renderScreenshotPng(svg);
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Length", pngBuffer.length);
    res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400");
    return res.end(pngBuffer);
  } catch (err: any) {
    console.error("Error in /api/og-card:", err);
    return res.status(500).send("Error generating card");
  }
});

export default router;
