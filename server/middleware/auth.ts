// TAHAP 3 — hasil pemecahan server.ts (perilaku endpoint TIDAK berubah).
// Berisi middleware keamanan TAHAP 1 (dipindah dari server.ts, tanpa perubahan logika).


declare function require(id: string): any;

// ---------- Firebase Admin (lazy; server tetap jalan tanpanya) ----------
let _firebaseAdmin: any = null;
let _firebaseAdminUnavailable = false;

function getFirebaseAdmin(): any | null {
  if (_firebaseAdmin) return _firebaseAdmin;
  if (_firebaseAdminUnavailable) return null;
  try {
    // Dynamic require: firebase-admin adalah dependensi opsional saat runtime.
    // Dibundel dengan esbuild --packages=external sehingga di-resolve saat jalan.
    const admin = require("firebase-admin");
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
  } catch (err: any) {
    _firebaseAdminUnavailable = true;
    console.warn("[security] firebase-admin tidak tersedia:", err && err.message);
    return null;
  }
}

async function verifyFirebaseIdToken(idToken: string): Promise<any> {
  const admin = getFirebaseAdmin();
  if (!admin) {
    const err: any = new Error("Layanan verifikasi token belum dikonfigurasi.");
    err.code = "auth/service-unavailable";
    throw err;
  }
  return admin.auth().verifyIdToken(idToken);
}

// ---------- Middleware: authenticate (butuh user login Firebase) ----------
async function authenticate(req: any, res: any, next: any) {
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
  } catch (err: any) {
    if (err && err.code === "auth/service-unavailable") {
      return res.status(503).json({ error: "Layanan autentikasi belum dikonfigurasi di server." });
    }
    console.warn("[security] token tidak valid:", (err && err.code) || (err && err.message));
    return res.status(401).json({ error: "Unauthorized: token tidak valid atau kedaluwarsa." });
  }
}

// ---------- Middleware: requireAdmin (klaim custom admin / ADMIN_UIDS) ----------
function requireAdmin(req: any, res: any, next: any) {
  authenticate(req, res, () => {
    const decoded = req.user || {};
    const adminUids = (process.env.ADMIN_UIDS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const isAdmin = decoded.admin === true || (decoded.uid && adminUids.includes(decoded.uid));
    if (!isAdmin) {
      console.warn(`[security] akses admin ditolak uid=${decoded.uid || "?"} path=${req.originalUrl || req.path}`);
      return res.status(403).json({ error: "Forbidden: butuh hak akses admin." });
    }
    return next();
  });
}

// ---------- Klasifikasi endpoint ----------
function isPublicApiRequest(req: any): boolean {
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

function isAdminOnlyApiRequest(req: any): boolean {
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

function apiAuthGuard(req: any, res: any, next: any) {
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
const _rateCleanup: any = setInterval(() => {
  const now = Date.now();
  for (const [k, b] of _rateBuckets) if (now > b.resetAt) _rateBuckets.delete(k);
}, 60_000);
if (typeof _rateCleanup?.unref === "function") _rateCleanup.unref();

function rateLimit(opts: { windowMs: number; max: number; message?: string }) {
  return (req: any, res: any, next: any) => {
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
