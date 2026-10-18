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
    // Set httpOnly cookie untuk sesi — TIDAK simpan token di browser storage (localStorage/sessionStorage).
    res.cookie("puskesmas_session", credential, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
      path: "/",
    });
    return res.json({
      ok: true,
      user: { email: info.email, name: info.name, picture: info.picture },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn("[auth] verifikasi ID token Google gagal:", msg);
    return res.status(401).json({ ok: false, code: "INVALID_TOKEN", message: "Kredensial Google tidak valid. Coba masuk ulang." });
  }
});

/**
 * GET /api/auth/me — rehidrasi sesi dari httpOnly cookie.
 * Dipanggil frontend saat refresh untuk mendapatkan info user tanpa browser storage.
 */
router.get("/api/auth/me", async (req: Request, res: Response) => {
  const token = (req as any).cookies?.puskesmas_session || "";
  if (!token) {
    return res.status(401).json({ ok: false, code: "NO_SESSION" });
  }
  try {
    const info = await verifyGoogleCredential(token);
    return res.json({
      ok: true,
      user: { email: info.email, name: info.name, picture: info.picture },
    });
  } catch {
    res.clearCookie("puskesmas_session", { path: "/" });
    return res.status(401).json({ ok: false, code: "INVALID_SESSION" });
  }
});

/** POST /api/auth/logout — hapus cookie sesi. */
router.post("/api/auth/logout", (_req: Request, res: Response) => {
  res.clearCookie("puskesmas_session", { path: "/" });
  return res.json({ ok: true });
});

export default router;
