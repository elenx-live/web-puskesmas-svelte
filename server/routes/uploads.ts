// TAHAP 3 — hasil pemecahan server.ts (perilaku endpoint TIDAK berubah).
import { Router } from "express";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { decodeBase64Image, detectUploadImageMime, safeUploadFileName, MAX_UPLOAD_BYTES } from "../lib/storage.js";
import { publicDir, uploadsDir } from "../lib/config.js";
const router = Router();

// Resolusi maksimal saat simpan (hemat storage VPS & bandwidth).
// Gambar diperkecil ke max 1280px sisi terpanjang, kualitas 80%.
const MAX_IMAGE_DIMENSION = 1280;
const IMAGE_QUALITY = 80;
// Ukuran file maksimal setelah kompres: 1MB
const MAX_OUTPUT_BYTES = 1024 * 1024;

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
router.post("/api/upload-image", async (req, res) => {
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

    // Kecilkan resolusi: max 1280px sisi terpanjang, lalu kompres hingga <= 1MB
    let processedBuffer: Buffer = buffer;
    try {
      const metadata = await sharp(buffer).metadata();
      const w = metadata.width || 0;
      const h = metadata.height || 0;

      // Iterasi: turunkan dimensi & kualitas hingga <= 1MB (maks 4x)
      let dim = MAX_IMAGE_DIMENSION;
      let quality = IMAGE_QUALITY;
      for (let attempt = 0; attempt < 4; attempt++) {
        let pipeline = sharp(buffer);
        if (w > dim || h > dim) {
          pipeline = pipeline.resize(dim, dim, { fit: 'inside', withoutEnlargement: true });
        }
        if (mimeType === 'image/jpeg') {
          processedBuffer = await pipeline.jpeg({ quality }).toBuffer();
        } else if (mimeType === 'image/webp') {
          processedBuffer = await pipeline.webp({ quality }).toBuffer();
        } else if (mimeType === 'image/png') {
          // PNG: konversi ke JPEG bila besar (foto), kecuali ada transparansi
          const hasAlpha = metadata.channels === 4;
          if (!hasAlpha && processedBuffer.length > MAX_OUTPUT_BYTES) {
            processedBuffer = await pipeline.jpeg({ quality }).toBuffer();
          } else {
            processedBuffer = await pipeline.png({ compressionLevel: 9 }).toBuffer();
          }
        } else {
          processedBuffer = await pipeline.toBuffer();
        }
        if (processedBuffer.length <= MAX_OUTPUT_BYTES) break;
        // Masih kebesaran: turunkan kualitas & dimensi untuk iterasi berikutnya
        quality = Math.max(40, quality - 20);
        dim = Math.floor(dim * 0.8);
      }
    } catch (e) {
      console.warn("Gagal kompres gambar, pakai original:", e);
      processedBuffer = buffer;
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

    fs.writeFileSync(targetFilePath, processedBuffer);

    if (fs.existsSync(distUploadsDir)) {
      try {
        fs.writeFileSync(path.join(distUploadsDir, fileName), processedBuffer);
      } catch {}
    }

    const publicUrl = `/uploads/${fileName}`;
    return res.json({
      success: true,
      url: publicUrl,
      fileName,
      sizeBytes: processedBuffer.length,
      originalSizeBytes: buffer.length,
      mimeType,
      message: "Gambar berhasil diunggah dan disimpan ke server."
    });
  } catch (err: unknown) {
    console.error("Error in /api/upload-image:", err);
    return res.status(500).json({ error: (err as { message?: string })?.message || "Gagal memproses unggah gambar" });
  }
});

export default router;
