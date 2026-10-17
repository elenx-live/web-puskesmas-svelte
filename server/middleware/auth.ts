// TAHAP 3 — hasil pemecahan server.ts (perilaku endpoint TIDAK berubah).
// Berisi middleware keamanan TAHAP 1 (dipindah dari server.ts, tanpa perubahan logika).

import type { Request, Response, NextFunction } from "express";

declare function require(id: string): unknown;

/** Request Express yang sudah melewati authenticate (payload token di req.user). */
interface AuthedRequest extends Request {
  user?: { admin?: boolean; uid?: string; [k: string]: unknown } | null;
}

/** Bentuk minimal firebase-admin yang dipakai kode ini (modul opsional, di-require dinamis). */
interface FirebaseAdminLike {
  apps: unknown[];
  auth: () => { verifyIdToken: (idToken: string) => Promise<AuthedRequest["user"]> };
  credential: { cert: (serviceAccount: Record<string, unknown>) => unknown };
  initializeApp: (options?: Record<string, unknown>) => void;
}

// ---------- Firebase Admin (lazy; server tetap jalan tanpanya) ----------
let _firebaseAdmin: FirebaseAdminLike | null = null;
let _firebaseAdminUnavailable = false;

function getFirebaseAdmin(): FirebaseAdminLike | null {
  if (_firebaseAdmin) return _firebaseAdmin;
  if (_firebaseAdminUnavailable) return null;
  try {
    // Dynamic require: firebase-admin adalah dependensi opsional saat runtime.
    // Dibundel dengan esbuild --packages=external sehingga di-resolve saat jalan.
    const admin = require("firebase-admin") as FirebaseAdminLike;
    if (admin.apps.length === 0) {
      const saJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
      if (saJson) {
        admin.initializeApp({ credential: admin.credential.cert(JSON.parse(saJson)) });
      } else {
        admin.initializeApp();
      }
    }
    _firebaseAdmin = admin;
    return admin;
  } catch (err: unknown) {
    _firebaseAdminUnavailable = true;
    console.warn("[security] firebase-admin tidak tersedia:", (err as { message?: unknown } | null)?.message);
    return null;
  }
}

async function verifyFirebaseIdToken(idToken: string): Promise<AuthedRequest["user"]> {
  const admin = getFirebaseAdmin();
  if (!admin) {
    const err = new Error("Layanan verifikasi token belum dikonfigurasi.") as Error & { code?: string };
    err.code = "auth/service-unavailable";
    throw err;
  }
  return admin.auth().verifyIdToken(idToken);
}

// ---------- Middleware: authenticate (butuh user login Firebase) ----------
async function authenticate(req: AuthedRequest, res: Response, next: NextFunction) {
  const header: string = req.headers.authorization || "";
  const m = header.match(/^Bearer\s+(.+)$/i);
  if (!m) {
    return res.status(401).json({
      error: "Unauthorized: sertakan Firebase ID Token pada header Authorization: Bearer <token>.",
    });
  }
  try {
    const decoded = await verifyFirebaseIdToken(m[1].trim());
    req.user = decoded;
    return next();
  } catch (err: unknown) {
    const e = err as { code?: unknown; message?: unknown } | null | undefined;
    if (e?.code === "auth/service-unavailable") {
      return res.status(503).json({ error: "Layanan autentikasi belum dikonfigurasi di server." });
    }
    console.warn("[security] token tidak valid:", e?.code || e?.message);
    return res.status(401).json({ error: "Unauthorized: token tidak valid atau kedaluwarsa." });
  }
}

// ---------- Middleware: requireAdmin (klaim custom admin / ADMIN_UIDS) ----------
function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  authenticate(req, res, () => {
    const decoded = req.user || {};
    const adminUids = (process.env.ADMIN_UIDS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const isAdmin = decoded.admin === true || (decoded.uid != null && adminUids.includes(decoded.uid));
    if (!isAdmin) {
      console.warn(`[security] akses admin ditolak uid=${decoded.uid || "?"} path=${req.originalUrl || req.path}`);
      return res.status(403).json({ error: "Forbidden: butuh hak akses admin." });
    }
    return next();
  });
}

// ---------- Klasifikasi endpoint ----------
function isPublicApiRequest(req: Request): boolean {
  const p: string = req.path;
  if (req.method !== "GET") return false;
  if (p === "/health") return true; // GET /api/health
  if (p === "/webhooks/whatsapp") return true; // verifikasi webhook (GET)
  if (p === "/meta-preview") return true; // link preview publik
  const publicPrefixes = [
    "/theme/published",
    "/homepage/published",
    "/data/",
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
  // Webhook inbound WhatsApp: tanpa Firebase auth, validasi verify token
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

export { getFirebaseAdmin, verifyFirebaseIdToken, authenticate, requireAdmin, apiAuthGuard, rateLimit };
export type { AuthedRequest };
