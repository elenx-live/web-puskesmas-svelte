// Middleware keamanan — verifikasi Google ID Token via google-auth-library (pola PeSat).
// Menggantikan firebase-admin: tanpa Firebase sama sekali.

import type { Request, Response, NextFunction } from "express";
import { verifyGoogleCredential } from "../lib/googleAuth.js";

/** Request Express yang sudah melewati authenticate (payload token di req.user). */
interface AuthedRequest extends Request {
  user?: { admin?: boolean; uid?: string; email?: string; name?: string; picture?: string; [k: string]: unknown } | null;
}

/**
 * Verifikasi Bearer token (Google ID Token dari GIS).
 * Mapping ke format req.user yang kompatibel: sub → uid, email, name, picture.
 */
async function verifyBearerToken(idToken: string): Promise<AuthedRequest["user"]> {
  const info = await verifyGoogleCredential(idToken);
  return {
    uid: info.sub,
    email: info.email,
    name: info.name,
    picture: info.picture,
  };
}

// ---------- Middleware: authenticate (butuh login Google) ----------
async function authenticate(req: AuthedRequest, res: Response, next: NextFunction) {
  const header: string = req.headers.authorization || "";
  const m = header.match(/^Bearer\s+(.+)$/i);
  if (!m) {
    return res.status(401).json({
      error: "Unauthorized: sertakan Google ID Token pada header Authorization: Bearer <token>.",
    });
  }
  try {
    const user = await verifyBearerToken(m[1].trim());
    req.user = user;
    return next();
  } catch (err: unknown) {
    const e = err as { message?: unknown } | null | undefined;
    const msg = typeof e?.message === "string" ? e.message : "";
    if (msg.includes("GOOGLE_CLIENT_ID")) {
      return res.status(503).json({ error: "Layanan autentikasi belum dikonfigurasi di server." });
    }
    console.warn("[security] token tidak valid:", msg);
    return res.status(401).json({ error: "Unauthorized: token tidak valid atau kedaluwarsa." });
  }
}

// ---------- Middleware: requireAdmin (ADMIN_UIDS) ----------
// Admin = Google `sub` (uid) terdaftar di env ADMIN_UIDS.
// Catatan: custom claim Firebase tidak ada lagi; gunakan ADMIN_UIDS.
function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  authenticate(req, res, () => {
    const decoded = req.user || {};
    const adminUids = (process.env.ADMIN_UIDS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    // Kompatibilitas: izinkan juga pencocokan via email bila ADMIN_UIDS berisi email.
    const adminEmails = (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    const isAdmin =
      (decoded.uid != null && adminUids.includes(decoded.uid)) ||
      (decoded.email != null && adminEmails.includes(String(decoded.email).toLowerCase()));
    // Fallback lama: bila ADMIN_UIDS kosong, tolak (fail-closed). Jangan auto-admin.
    if (!isAdmin) {
      console.warn(`[security] akses admin ditolak uid=${decoded.uid || "?"} email=${decoded.email || "?"} path=${req.originalUrl || req.path}`);
      return res.status(403).json({ error: "Forbidden: butuh hak akses admin." });
    }
    return next();
  });
}

// ---------- Klasifikasi endpoint ----------
function isPublicApiRequest(req: Request): boolean {
  const p: string = req.path;
  // Endpoint auth Google selalu publik (login & config)
  if (p === "/auth/config" && req.method === "GET") return true;
  if (p === "/auth/google" && req.method === "POST") return true;
  // Form publik: pengaduan & pendaftaran boleh POST tanpa login
  if (req.method === "POST" && (p === "/data/complaints" || p === "/data/registrations")) return true;
  if (req.method !== "GET") return false;
  if (p === "/health") return true; // GET /api/health
  if (p === "/webhooks/whatsapp") return true; // verifikasi webhook (GET)
  if (p === "/meta-preview") return true; // link preview publik
  const publicPrefixes = [
    "/theme/published",
    "/homepage/published",
    "/data/",
    "/db/",
    "/posts",
    "/microsites",
    "/site-settings",
    "/contact-settings",
    "/og-image/",
    "/post-image/",
    "/post-og-image/",
    "/preview-image",
    "/screenshot",
    "/og-card",
  ];
  return publicPrefixes.some((prefix) => p === prefix || p.startsWith(prefix));
}

function isAdminOnlyApiRequest(req: Request): boolean {
  const p: string = req.path;
  const m: string = req.method;
  // Webhook inbound WhatsApp punya validasi token sendiri di handler-nya
  if (p === "/webhooks/whatsapp" && m === "POST") return false;
  // Endpoint login Google dikecualikan (publik)
  if (p === "/auth/google" && m === "POST") return false;
  // Semua operasi tulis butuh admin
  if (m === "POST" || m === "PUT" || m === "PATCH" || m === "DELETE") return true;
  // Baca config sensitif (draf, kredensial provider) butuh admin
  const adminOnlyGets = [
    "/theme/draft",
    "/homepage/draft",
    "/whatsapp/config",
    "/whatsapp/logs",
    "/ai/provider-config",
    "/ai/image-capability",
  ];
  if (m === "GET" && adminOnlyGets.includes(p)) return true;
  return false;
}

function apiAuthGuard(req: AuthedRequest, res: Response, next: NextFunction) {
  if (isPublicApiRequest(req)) return next();
  // Webhook inbound WhatsApp: tanpa auth Google, validasi verify token
  // dilakukan di handler-nya sendiri (+ pencatatan percobaan tak sah).
  if (req.path === "/webhooks/whatsapp" && req.method === "POST") return next();
  if (isAdminOnlyApiRequest(req)) return requireAdmin(req, res, next);
  return authenticate(req, res, next);
}

// ---------- Rate limit sederhana (in-memory, per IP+path) ----------
type RateBucket = { count: number; resetAt: number };
const _rateBuckets = new Map<string, RateBucket>();
const _rateCleanup: NodeJS.Timeout = setInterval(() => {
  const now = Date.now();
  for (const [k, b] of _rateBuckets) if (now > b.resetAt) _rateBuckets.delete(k);
}, 60_000);
if (typeof _rateCleanup?.unref === "function") _rateCleanup.unref();

function rateLimit(opts: { windowMs: number; max: number; message?: string }) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${req.ip || "?"}:${req.method}:${req.path}`;
    const now = Date.now();
    let b = _rateBuckets.get(key);
    if (!b || now > b.resetAt) {
      b = { count: 0, resetAt: now + opts.windowMs };
      _rateBuckets.set(key, b);
    }
    b.count += 1;
    if (b.count > opts.max) {
      res.setHeader("Retry-After", Math.max(1, Math.ceil((b.resetAt - now) / 1000)));
      return res.status(429).json({ error: opts.message || "Terlalu banyak permintaan. Coba lagi nanti." });
    }
    return next();
  };
}

export { verifyBearerToken, authenticate, requireAdmin, apiAuthGuard, rateLimit };
export type { AuthedRequest };
