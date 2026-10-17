// TAHAP 3 — hasil pemecahan server.ts (perilaku endpoint TIDAK berubah).
import { Router } from "express";
import { getServerHomepagePublished, saveServerHomepagePublished, getServerHomepageDraft, saveServerHomepageDraft } from "../lib/storage.js";
import { DEFAULT_HOMEPAGE } from "../lib/config.js";
const router = Router();

router.get("/api/homepage/published", (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.json({ success: true, config: getServerHomepagePublished() });
});

router.get("/api/homepage/draft", (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.json({ success: true, config: getServerHomepageDraft() });
});

router.post("/api/homepage/publish", (req, res) => {
  const payload = req.body;
  if (!payload || typeof payload !== 'object') {
    return res.status(400).json({ error: "Invalid homepage builder payload" });
  }
  const published = {
    ...payload,
    status: 'published',
    updatedAt: new Date().toISOString()
  };
  saveServerHomepagePublished(published);
  saveServerHomepageDraft(published);
  res.json({ success: true, config: published });
});

router.post("/api/homepage/draft", (req, res) => {
  const payload = req.body;
  if (!payload || typeof payload !== 'object') {
    return res.status(400).json({ error: "Invalid homepage builder payload" });
  }
  const draft = {
    ...payload,
    status: 'draft',
    updatedAt: new Date().toISOString()
  };
  saveServerHomepageDraft(draft);
  res.json({ success: true, config: draft });
});

router.post("/api/homepage/reset", (req, res) => {
  saveServerHomepagePublished(DEFAULT_HOMEPAGE);
  saveServerHomepageDraft(DEFAULT_HOMEPAGE);
  res.json({ success: true, config: DEFAULT_HOMEPAGE });
});

// ==========================================
// ==========================================
// CENTRAL MICROSITES API ENDPOINTS
// ==========================================

export default router;
