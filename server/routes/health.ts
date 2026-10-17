// TAHAP 3 — hasil pemecahan server.ts (perilaku endpoint TIDAK berubah).
import { Router } from "express";
import { getWhatsAppConfig } from "../lib/storage.js";
const router = Router();

// 0. Health Checks
router.get(["/api/health", "/health"], (req, res) => {
  res.status(200).json({ status: "ok", uptime: process.uptime(), timestamp: new Date().toISOString() });
});


// System Health Endpoints
router.get("/health", (req, res) => {
  res.send("OK");
});

router.get("/api/health", (req, res) => {
  const waConfig = getWhatsAppConfig();
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    services: {
      application: { status: "running", message: "Node.js Express backend operational" },
      database: { status: "connected", message: "Client and local storage sync operational", latencyMs: 12 },
      storage: { status: "available", message: "Local filesystem and storage vault accessible" },
      notification: { status: "operational", message: "Notification queue active" },
      whatsapp: { status: waConfig.enabled ? "connected" : "disabled", message: waConfig.enabled ? "WhatsApp Cloud API active" : "Disabled in settings" },
      email: { status: "configured", message: "SMTP relay configured" },
      backup: { status: "operational", message: "Automated backup scheduler active" },
      search: { status: "operational", message: "Global search index synchronized" },
      api: { status: "healthy", message: "REST API endpoints responsive", latencyMs: 24 }
    }
  });
});


export default router;
