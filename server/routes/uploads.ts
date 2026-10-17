// TAHAP 3 — hasil pemecahan server.ts (perilaku endpoint TIDAK berubah).
import { Router } from "express";
import fs from "fs";
import path from "path";
import { decodeBase64Image, detectUploadImageMime, safeUploadFileName, MAX_UPLOAD_BYTES } from "../lib/storage.js";
import { publicDir, uploadsDir } from "../lib/config.js";
const router = Router();

router.post("/api/upload-logo", (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64 || typeof imageBase64 !== "string") {
      return res.status(400).json({ error: "Missing or invalid imageBase64 data" });
    }

    // Decode + validasi tipe file dari magic bytes (bukan dari klaim client)
    const { buffer } = decodeBase64Image(imageBase64);
    const detectedLogoMime = detectUploadImageMime(buffer);
    if (!detectedLogoMime) {
      return res.status(400).json({ error: "Format berkas tidak didukung. Gunakan PNG, JPG, atau WebP." });
    }

    if (buffer.length > MAX_UPLOAD_BYTES) {
      return res.status(400).json({ error: "Ukuran berkas logo melebihi batas 5MB" });
    }

    const publicDir = path.join(process.cwd(), "public");
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    const customLogoPath = path.join(publicDir, "logo-custom.png");
    fs.writeFileSync(customLogoPath, buffer);

    // Also update public/logo.png for default fallbacks
    try {
      fs.writeFileSync(path.join(publicDir, "logo.png"), buffer);
    } catch {}

    const timestamp = Date.now();
    return res.json({
      success: true,
      url: `/logo-custom.png?v=${timestamp}`,
      message: "Logo Puskesmas berhasil diunggah dan disimpan ke server."
    });
  } catch (err: unknown) {
    console.error("Error uploading logo:", err);
    return res.status(500).json({ error: (err as { message?: string })?.message || "Gagal mengunggah logo ke server" });
  }
});

// API endpoint to upload custom Favicon
router.post("/api/upload-favicon", (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64 || typeof imageBase64 !== "string") {
      return res.status(400).json({ error: "Missing or invalid imageBase64 data" });
    }

    // Decode + validasi tipe file dari magic bytes (bukan dari klaim client)
    const { buffer } = decodeBase64Image(imageBase64);
    const detectedFavMime = detectUploadImageMime(buffer);
    if (!detectedFavMime) {
      return res.status(400).json({ error: "Format berkas tidak didukung. Gunakan PNG, JPG, atau WebP." });
    }

    if (buffer.length > MAX_UPLOAD_BYTES) {
      return res.status(400).json({ error: "Ukuran berkas favicon melebihi batas 5MB" });
    }

    const publicDir = path.join(process.cwd(), "public");
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    const customFaviconPath = path.join(publicDir, "favicon-custom.png");
    fs.writeFileSync(customFaviconPath, buffer);

    const timestamp = Date.now();
    return res.json({
      success: true,
      url: `/favicon-custom.png?v=${timestamp}`,
      message: "Favicon browser berhasil diunggah dan disimpan ke server."
    });
  } catch (err: unknown) {
    console.error("Error uploading favicon:", err);
    return res.status(500).json({ error: (err as { message?: string })?.message || "Gagal mengunggah favicon ke server" });
  }
});

// API endpoint to upload general post / featured image
// Hardening: whitelist PNG/JPG/WebP (validasi magic bytes), maks 5MB,
// nama file dibuat server (tidak memakai input user).
router.post("/api/upload-image", (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64 || typeof imageBase64 !== "string") {
      return res.status(400).json({ error: "Data gambar imageBase64 wajib diisi" });
    }

    const { buffer } = decodeBase64Image(imageBase64);
    const mimeType = detectUploadImageMime(buffer);
    if (!mimeType) {
      return res.status(400).json({ error: "Format berkas tidak didukung. Gunakan PNG, JPG, atau WebP." });
    }
    const ext = UPLOAD_IMAGE_ALLOWLIST[mimeType].ext;

    if (buffer.length > MAX_UPLOAD_BYTES) {
      return res.status(400).json({ error: "Ukuran berkas melebihi batas 5MB" });
    }

    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Also mirror to dist/uploads if dist exists
    const distUploadsDir = path.join(process.cwd(), "dist", "uploads");
    if (fs.existsSync(path.join(process.cwd(), "dist"))) {
      if (!fs.existsSync(distUploadsDir)) {
        fs.mkdirSync(distUploadsDir, { recursive: true });
      }
    }

    const fileName = safeUploadFileName(ext);
    const targetFilePath = path.join(uploadsDir, fileName);

    fs.writeFileSync(targetFilePath, buffer);

    if (fs.existsSync(distUploadsDir)) {
      try {
        fs.writeFileSync(path.join(distUploadsDir, fileName), buffer);
      } catch {}
    }

    const publicUrl = `/uploads/${fileName}`;
    return res.json({
      success: true,
      url: publicUrl,
      fileName,
      sizeBytes: buffer.length,
      mimeType,
      message: "Gambar berhasil diunggah dan disimpan ke server."
    });
  } catch (err: unknown) {
    console.error("Error in /api/upload-image:", err);
    return res.status(500).json({ error: (err as { message?: string })?.message || "Gagal memproses unggah gambar" });
  }
});

export default router;
