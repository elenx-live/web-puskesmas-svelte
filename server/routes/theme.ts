// TAHAP 3 — hasil pemecahan server.ts (perilaku endpoint TIDAK berubah).
import { Router } from "express";
import { getServerThemePublished, saveServerThemePublished, getServerThemeDraft, saveServerThemeDraft } from "../lib/storage.js";
import { DEFAULT_THEME } from "../lib/config.js";
const router = Router();


// ==========================================
// CENTRAL THEME API ENDPOINTS
// ==========================================
router.get("/api/theme/published", (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.json({ success: true, theme: getServerThemePublished() });
});

router.get("/api/theme/draft", (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.json({ success: true, theme: getServerThemeDraft() });
});

router.post("/api/theme/publish", (req, res) => {
  const theme = req.body;
  if (!theme || typeof theme !== 'object') {
    return res.status(400).json({ error: "Invalid theme payload" });
  }
  const published = { ...theme, status: 'published', updatedAt: new Date().toISOString() };
  saveServerThemePublished(published);
  saveServerThemeDraft(published);
  res.json({ success: true, theme: published });
});

router.post("/api/theme/draft", (req, res) => {
  const theme = req.body;
  if (!theme || typeof theme !== 'object') {
    return res.status(400).json({ error: "Invalid theme payload" });
  }
  const draft = { ...theme, status: 'draft', updatedAt: new Date().toISOString() };
  saveServerThemeDraft(draft);
  res.json({ success: true, theme: draft });
});

router.post("/api/theme/reset", (req, res) => {
  saveServerThemePublished(DEFAULT_THEME);
  saveServerThemeDraft(DEFAULT_THEME);
  res.json({ success: true, theme: DEFAULT_THEME });
});

// ==========================================
// CENTRAL HOMEPAGE BUILDER API ENDPOINTS
// ==========================================

export default router;
