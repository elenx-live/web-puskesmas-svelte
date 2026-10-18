// TAHAP 3 — server.ts ramping: hanya setup Express, mount router, static, listen.
// Seluruh logika endpoint dipindah ke server/routes/*, server/lib/*, server/middleware/*.
// Perilaku endpoint TIDAK berubah (path, payload, respons sama persis).
import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { apiAuthGuard, rateLimit } from "./server/middleware/auth.js";
import { publicDir, uploadsDir } from "./server/lib/config.js";
import { renderHtmlWithMeta } from "./server/lib/storage.js";
import healthRouter from "./server/routes/health.js";
import whatsappRouter from "./server/routes/whatsapp.js";
import aiRouter from "./server/routes/ai.js";
import themeRouter from "./server/routes/theme.js";
import homepageRouter from "./server/routes/homepage.js";
import micrositesRouter from "./server/routes/microsites.js";
import uploadsRouter from "./server/routes/uploads.js";
import miscRouter from "./server/routes/misc.js";
import authRouter from "./server/routes/auth.js";

// Load environment variables
dotenv.config();

// Global process error guards to prevent server exits on third-party SDK failures
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception thrown:", err);
});

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Security & Hardening Headers
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.removeHeader("X-Powered-By");
  next();
});

import cookieParser from "cookie-parser";

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
app.use(cookieParser());

// Guard auth untuk semua /api/* — dipasang SEBELUM semua registrasi route /api/*
// (whitelist publik + webhook WhatsApp dikecualikan di dalam guard)
app.use("/api", apiAuthGuard);
// Rate limit untuk endpoint AI (biaya/latensi tinggi)
app.use("/api/ai", rateLimit({ windowMs: 60_000, max: 30 }));

// 1. High-priority static server for user uploads
app.use("/uploads", express.static(uploadsDir, {
  maxAge: "30d",
  etag: true,
  lastModified: true
}));

// 2. Direct streaming fallback for /uploads to ensure reliable image serving in both dev and prod
app.get("/uploads/*", (req, res) => {
  const relPath = req.params[0] || "";
  const safePath = path.join(uploadsDir, path.normalize(relPath).replace(/^(\.\.[\/\\])+/, ""));
  if (fs.existsSync(safePath) && fs.statSync(safePath).isFile()) {
    return res.sendFile(safePath);
  }
  // Check in dist/uploads as well if running in production
  const distFilePath = path.join(process.cwd(), "dist", "uploads", path.normalize(relPath).replace(/^(\.\.[\/\\])+/, ""));
  if (fs.existsSync(distFilePath) && fs.statSync(distFilePath).isFile()) {
    return res.sendFile(distFilePath);
  }
  return res.status(404).send("Berkas gambar tidak ditemukan");
});

// 3. Serve root public directory (logos, favicons, etc.)
app.use(express.static(publicDir));


// Mount routers — urutan sama dengan registrasi route di server.ts asli
// (urutan penting: Express mencocokkan route yang didaftarkan lebih dulu)
app.use(healthRouter);
app.use(whatsappRouter);
app.use(aiRouter);
app.use(themeRouter);
app.use(homepageRouter);
app.use(micrositesRouter);
app.use(uploadsRouter);
// Alias /api/db/* -> /api/data/* (frontend firebase.ts memakai /api/db/)
app.use((req, _res, next) => {
  if (req.path.startsWith("/api/db/")) {
    req.url = req.url.replace("/api/db/", "/api/data/");
  }
  next();
});
app.use(miscRouter);
app.use(authRouter);

// Vite middleware for development
async function startViteMiddleware() {
  let viteDevServer: any = null;

  if (process.env.NODE_ENV !== "production") {
    viteDevServer = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
  }

  // Intercept HTML navigation requests to inject dynamic Open Graph / WhatsApp Preview Meta tags
  app.get("*", async (req, res, next) => {
    // Pass API, health, uploads, static files, and Vite internal requests
    if (
      req.path.startsWith("/api") ||
      req.path.startsWith("/health") ||
      req.path.startsWith("/uploads") ||
      req.path.startsWith("/@") ||
      req.path.startsWith("/src") ||
      req.path.startsWith("/node_modules") ||
      req.path.startsWith("/.vite") ||
      /\.(js|ts|tsx|jsx|css|scss|json|png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|eot|pdf)$/i.test(req.path)
    ) {
      if (viteDevServer && process.env.NODE_ENV !== "production") {
        return viteDevServer.middlewares(req, res, next);
      }
      if (/\.(png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|eot|pdf|map)$/i.test(req.path)) {
        return res.status(404).send("Asset not found");
      }
      return next();
    }

    // Never send HTML template for asset or image requests
    if (/\.(png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|eot|pdf|map)$/i.test(req.path)) {
      return res.status(404).send("Asset not found");
    }

    try {
      const templatePath = process.env.NODE_ENV === "production"
        ? path.join(process.cwd(), "dist", "index.html")
        : path.join(process.cwd(), "index.html");

      if (!fs.existsSync(templatePath)) {
        if (viteDevServer) return viteDevServer.middlewares(req, res, next);
        return next();
      }

      let rawHtml = fs.readFileSync(templatePath, "utf-8");

      if (viteDevServer) {
        rawHtml = await viteDevServer.transformIndexHtml(req.originalUrl, rawHtml);
      }

      const html = renderHtmlWithMeta(req, rawHtml);
      return res.status(200).set({ "Content-Type": "text/html; charset=utf-8" }).send(html);
    } catch (err) {
      console.error("HTML Meta Handler Error:", err);
      if (viteDevServer) return viteDevServer.middlewares(req, res, next);
      return next();
    }
  });

  if (process.env.NODE_ENV !== "production") {
    app.use(viteDevServer.middlewares);
    console.log("Vite dev middleware & WhatsApp Link Preview handler initialized.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    console.log("Serving static assets in production mode with WhatsApp Link Preview support.");
  }
}

startViteMiddleware().then(() => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
});
