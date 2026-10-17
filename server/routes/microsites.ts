// TAHAP 3 — hasil pemecahan server.ts (perilaku endpoint TIDAK berubah).
import { Router } from "express";
import fs from "fs";
import path from "path";
import { getServerMicrosites, saveServerMicrosites, getServerMicrositeCategories, saveServerMicrositeCategories, saveServerMicrositeMeta } from "../lib/storage.js";
const router = Router();

router.get("/api/microsites", (req, res) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.json({ success: true, microsites: getServerMicrosites() });
});

router.post("/api/microsites", (req, res) => {
  const item = req.body;
  if (!item || (!item.id && !item.slug)) {
    return res.status(400).json({ error: "Invalid microsite payload (missing id or slug)" });
  }
  const current = getServerMicrosites();
  const idx = current.findIndex((m: any) => (item.id && m.id === item.id) || (item.slug && m.slug === item.slug));
  let savedItem: any;
  if (idx >= 0) {
    savedItem = { ...current[idx], ...item, updatedAt: new Date().toISOString() };
    current[idx] = savedItem;
  } else {
    savedItem = { ...item, id: item.id || `m-${Date.now()}`, createdAt: item.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
    current.unshift(savedItem);
  }
  saveServerMicrosites(current);
  res.json({ success: true, microsite: savedItem });
});

router.post("/api/microsites/sync-all", (req, res) => {
  const { microsites } = req.body || {};
  if (!Array.isArray(microsites)) {
    return res.status(400).json({ error: "Expected array of microsites" });
  }
  saveServerMicrosites(microsites);
  res.json({ success: true, microsites: getServerMicrosites() });
});

router.delete("/api/microsites/:id", (req, res) => {
  const { id } = req.params;
  const current = getServerMicrosites();
  const filtered = current.filter((m: any) => m.id !== id && m.slug !== id);
  saveServerMicrosites(filtered);
  // Also delete from data_store/microsites.json
  const dataStoreMicrositesPath = path.join(process.cwd(), "data_store", "microsites.json");
  try {
    fs.writeFileSync(dataStoreMicrositesPath, JSON.stringify(filtered, null, 2), "utf-8");
  } catch {}
  res.json({ success: true, message: `Microsite ${id} deleted`, microsites: filtered });
});

router.get("/api/microsites/categories", (req, res) => {
  res.json({ success: true, categories: getServerMicrositeCategories() });
});

router.post("/api/microsites/categories", (req, res) => {
  const categories = req.body;
  if (!Array.isArray(categories)) {
    return res.status(400).json({ error: "Expected array of categories" });
  }
  saveServerMicrositeCategories(categories);
  res.json({ success: true, categories: getServerMicrositeCategories() });
});

// ==========================================
// CENTRAL POSTS API ENDPOINTS
// ==========================================

router.post("/api/microsites/sync-item", (req, res) => {
  const { slug, name, description, profileImageUrl, logoUrl, ogImageUrl } = req.body || {};
  if (!slug) {
    return res.status(400).json({ error: "Missing microsite slug" });
  }
  saveServerMicrositeMeta(slug, { name, description, profileImageUrl, logoUrl, ogImageUrl });
  return res.json({ success: true, message: "Microsite meta saved" });
});

// API endpoint to sync a single post / news article item

export default router;
