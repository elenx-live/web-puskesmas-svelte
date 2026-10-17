// Endpoint autentikasi Google (pola PeSat) — publik, tidak terkena gerbang admin.
import { Router } from "express";
import type { Request, Response } from "express";
import { getGoogleClientId, verifyGoogleCredential } from "../lib/googleAuth.js";

const router = Router();

/** Config publik untuk frontend: Google Client ID. */
router.get("/api/auth/config", (_req: Request, res: Response) => {
  res.json({ ok: true, googleClientId: getGoogleClientId() });
});

/**
 * Login dengan Google Identity Services.
 * Body: { credential: string } — ID token dari GIS callback.
 * Verifikasi token, kembalikan info user terverifikasi.
 * Pengecekan user terdaftar dilakukan di frontend (atau tambahkan di sini bila perlu).
 */
router.post("/api/auth/google", async (req: Request, res: Response) => {
  const body = (req.body || {}) as Record<string, unknown>;
  const credential = typeof body.credential === "string" ? body.credential.trim() : "";
  if (!credential) {
    return res.status(401).json({ ok: false, code: "INVALID_TOKEN", message: "Kredensial Google tidak dikirim." });
  }
  if (!getGoogleClientId()) {
    return res.status(400).json({
      ok: false,
      code: "AUTH_NOT_CONFIGURED",
      message: "Login Google belum dikonfigurasi di server (GOOGLE_CLIENT_ID kosong).",
    });
  }
  try {
    const info = await verifyGoogleCredential(credential);
    // Kembalikan info user + credential agar frontend bisa pakai sebagai Bearer token.
    // Backend memverifikasi ulang token ini di setiap request via middleware authenticate.
    return res.json({
      ok: true,
      user: { email: info.email, name: info.name, picture: info.picture },
      credential,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn("[auth] verifikasi ID token Google gagal:", msg);
    return res.status(401).json({ ok: false, code: "INVALID_TOKEN", message: "Kredensial Google tidak valid. Coba masuk ulang." });
  }
});

export default router;
