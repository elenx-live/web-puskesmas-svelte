// TAHAP 3 — hasil pemecahan server.ts (perilaku endpoint TIDAK berubah).
import { Router } from "express";
import { logger } from "../lib/logger.js";
import { getWhatsAppConfig, saveWhatsAppConfig, getWhatsAppLogs, saveWhatsAppLogs, normalizePhoneNumber, maskPhoneNumber } from "../lib/storage.js";
import type { WhatsAppLog } from "../lib/storage.js";

/** Respons JSON generik dari Meta Graph API (WhatsApp). */
interface MetaApiResponse {
  id?: string;
  display_phone_number?: string;
  verified_name?: string;
  messages?: Array<{ id?: string }>;
  error?: { code?: unknown; message?: string };
}
const router = Router();

router.get("/api/whatsapp/config", (req, res) => {
  const config = getWhatsAppConfig();
  res.json({
    enabled: config.enabled,
    phone_number_id: config.phone_number_id,
    business_account_id: config.business_account_id,
    api_version: config.api_version,
    default_country_code: config.default_country_code,
    test_mode: config.test_mode,
    templates: config.templates,
    // secrets masked
    access_token: config.access_token ? "••••••••" : "",
    webhook_verify_token: config.webhook_verify_token ? "••••••••" : ""
  });
});

// 2. Save WhatsApp Config
router.post("/api/whatsapp/config", (req, res) => {
  const incoming = req.body;
  const current = getWhatsAppConfig();

  // If password field is still ••••••••, use current value
  const finalAccessToken = incoming.access_token === "••••••••" ? current.access_token : (incoming.access_token || "");
  const finalVerifyToken = incoming.webhook_verify_token === "••••••••" ? current.webhook_verify_token : (incoming.webhook_verify_token || "");

  // Validation
  if (incoming.enabled) {
    if (!incoming.phone_number_id) {
      return res.status(400).json({ message: "Phone Number ID is required to enable WhatsApp." });
    }
    if (!finalAccessToken) {
      return res.status(400).json({ message: "Access Token is required to enable WhatsApp." });
    }
  }

  const newConfig = {
    enabled: !!incoming.enabled,
    phone_number_id: incoming.phone_number_id || "",
    business_account_id: incoming.business_account_id || "",
    access_token: finalAccessToken,
    api_version: incoming.api_version || "v20.0",
    webhook_verify_token: finalVerifyToken,
    default_country_code: incoming.default_country_code || "62",
    test_mode: incoming.test_mode !== false,
    templates: {
      registration_submitted: incoming.templates?.registration_submitted || "registration_submitted",
      registration_confirmed: incoming.templates?.registration_confirmed || "registration_confirmed",
      registration_rejected: incoming.templates?.registration_rejected || "registration_rejected",
      queue_called: incoming.templates?.queue_called || "queue_called",
      service_completed: incoming.templates?.service_completed || "service_completed"
    }
  };

  const success = saveWhatsAppConfig(newConfig);
  if (success) {
    res.json({ message: "WhatsApp configuration saved successfully." });
  } else {
    res.status(500).json({ message: "Failed to write configuration file." });
  }
});

// 3. Test Connection
router.post("/api/whatsapp/test-connection", async (req, res) => {
  const incoming = req.body;
  const current = getWhatsAppConfig();

  const finalAccessToken = incoming.access_token === "••••••••" ? current.access_token : (incoming.access_token || "");
  const finalPhoneId = incoming.phone_number_id || current.phone_number_id;
  const apiVersion = incoming.api_version || current.api_version || "v20.0";

  if (!finalAccessToken) {
    return res.status(400).json({ message: "Access Token is required for testing connection." });
  }
  if (!finalPhoneId) {
    return res.status(400).json({ message: "Phone Number ID is required for testing connection." });
  }

  try {
    // Perform standard Meta API request to fetch phone number details (verifies both token and ID)
    const url = `https://graph.facebook.com/${apiVersion}/${finalPhoneId}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${finalAccessToken}`
      }
    });

    const data: MetaApiResponse = await response.json();

    if (response.ok) {
      res.json({
        success: true,
        message: "WhatsApp connection successful.",
        details: {
          id: data.id,
          display_phone_number: data.display_phone_number || "Test Account (Sandbox)",
          verified_name: data.verified_name || "Meta App Test"
        }
      });
    } else {
      const errorMsg = data.error?.message || "Invalid credentials or API error.";
      res.status(response.status).json({
        success: false,
        message: "WhatsApp connection failed.",
        error: errorMsg
      });
    }
  } catch (err: unknown) {
    res.status(500).json({
      success: false,
      message: "Connection test failed.",
      error: (err as { message?: string })?.message || "Network Timeout / DNS Error"
    });
  }
});

// 4. Send Message (Internal proxy)
router.post("/api/whatsapp/send", async (req, res) => {
  const { event, recipient, variables, notificationId, relatedEntity, relatedEntityId } = req.body;
  const config = getWhatsAppConfig();

  if (!config.enabled) {
    return res.json({ success: false, skipped: true, message: "WhatsApp channel is disabled." });
  }

  if (!recipient) {
    return res.status(400).json({ message: "Recipient number is required." });
  }

  // Idempotency: check if already sent successfully for this notificationId / eventId
  const logs = getWhatsAppLogs();
  if (notificationId) {
    const existing = logs.find((l: WhatsAppLog) => l.notificationId === notificationId && l.direction !== "inbound" && l.status !== "failed");
    if (existing) {
      return res.json({ success: true, duplicated: true, log: existing });
    }
  }

  const normalizedPhone = normalizePhoneNumber(recipient, config.default_country_code);
  const maskedPhone = maskPhoneNumber(normalizedPhone);

  // Map event to template name
  const templateName = config.templates[event] || event;

  // Render variables to body text for local logging and simulation
  let bodyText = "";
  if (event === "registration_submitted" || event === "registration_created") {
    bodyText = `Pendaftaran Berhasil Diajukan!\nNo: ${variables.registrationNumber}\nLayanan: ${variables.serviceName}\nSilakan pantau status pendaftaran Anda secara berkala.`;
  } else if (event === "registration_confirmed") {
    bodyText = `Pendaftaran Dikonfirmasi!\nNo: ${variables.registrationNumber}\nTanggal: ${variables.visitDate}\nNo Antrean: ${variables.queueNumber}\nSilakan datang tepat waktu.`;
  } else if (event === "registration_rejected") {
    bodyText = `Pendaftaran Ditolak.\nNo: ${variables.registrationNumber}\nAlasan: ${variables.rejectionReason || "Persyaratan tidak lengkap."}`;
  } else if (event === "queue_called" || event === "queue_recalled") {
    bodyText = `Panggilan Antrean!\nNo Antrean: ${variables.queueNumber}\nSilakan menuju Loket ${variables.counterNumber || "-"}\nLayanan: ${variables.serviceName || "-"}`;
  } else if (event === "service_completed" || event === "queue_completed") {
    bodyText = `Pelayanan Selesai!\nTerima kasih telah mengunjungi kami. No Antrean ${variables.queueNumber} di ${variables.serviceName} dinyatakan selesai.`;
  } else {
    // Generic fallback
    bodyText = `Notifikasi Puskesmas: Event ${event} dipicu.`;
  }

  const logId = `wa-log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const newLog: WhatsAppLog = {
    id: logId,
    notificationId: notificationId || "",
    recipient: normalizedPhone,
    recipientMasked: maskedPhone,
    event,
    template: templateName,
    status: "sending",
    messageText: bodyText,
    providerMessageId: "",
    errorCode: null,
    errorMessage: null,
    attempts: 1,
    direction: "outbound",
    relatedEntity: relatedEntity || "none",
    relatedEntityId: relatedEntityId || "",
    createdAt: now,
    updatedAt: now
  };

  logs.unshift(newLog);
  saveWhatsAppLogs(logs);

  if (config.test_mode) {
    // TEST MODE simulation
    setTimeout(() => {
      const updatedLogs = getWhatsAppLogs();
      const idx = updatedLogs.findIndex((l: WhatsAppLog) => l.id === logId);
      if (idx !== -1) {
        updatedLogs[idx].status = "sent";
        updatedLogs[idx].sentAt = new Date().toISOString();
        updatedLogs[idx].providerMessageId = `sim-wamid-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        updatedLogs[idx].updatedAt = new Date().toISOString();
        saveWhatsAppLogs(updatedLogs);
      }
    }, 500);

    return res.json({ success: true, simulated: true, logId });
  }

  // REAL SENDING
  try {
    const url = `https://graph.facebook.com/${config.api_version}/${config.phone_number_id}/messages`;

    // Construct Meta Template Parameters in standardized order
    const parameters: { type: string; text: unknown }[] = [];
    if (variables.fullName || variables.name) {
      parameters.push({ type: "text", text: variables.fullName || variables.name });
    }
    if (variables.registrationNumber) {
      parameters.push({ type: "text", text: variables.registrationNumber });
    }
    if (variables.serviceName) {
      parameters.push({ type: "text", text: variables.serviceName });
    }
    if (variables.visitDate) {
      parameters.push({ type: "text", text: variables.visitDate });
    }
    if (variables.queueNumber) {
      parameters.push({ type: "text", text: variables.queueNumber });
    }
    if (variables.counterNumber) {
      parameters.push({ type: "text", text: variables.counterNumber });
    }
    if (variables.rejectionReason) {
      parameters.push({ type: "text", text: variables.rejectionReason });
    }

    const payload = {
      messaging_product: "whatsapp",
      to: normalizedPhone,
      type: "template",
      template: {
        name: templateName,
        language: {
          code: "id"
        },
        components: [
          {
            type: "body",
            parameters
          }
        ]
      }
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.access_token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data: MetaApiResponse = await response.json();
    const updatedLogs = getWhatsAppLogs();
    const idx = updatedLogs.findIndex((l: WhatsAppLog) => l.id === logId);

    if (idx !== -1) {
      if (response.ok) {
        updatedLogs[idx].status = "sent";
        updatedLogs[idx].sentAt = new Date().toISOString();
        updatedLogs[idx].providerMessageId = data.messages?.[0]?.id || "";
      } else {
        updatedLogs[idx].status = "failed";
        updatedLogs[idx].errorCode = data.error?.code || response.status;
        updatedLogs[idx].errorMessage = data.error?.message || "Unknown Meta API error";
      }
      updatedLogs[idx].updatedAt = new Date().toISOString();
      saveWhatsAppLogs(updatedLogs);
    }

    if (response.ok) {
      res.json({ success: true, messageId: data.messages?.[0]?.id });
    } else {
      res.status(response.status).json({ success: false, error: data.error });
    }
  } catch (err: unknown) {
    const updatedLogs = getWhatsAppLogs();
    const idx = updatedLogs.findIndex((l: WhatsAppLog) => l.id === logId);
    if (idx !== -1) {
      updatedLogs[idx].status = "failed";
      updatedLogs[idx].errorMessage = (err as { message?: string })?.message || "Network Error";
      updatedLogs[idx].updatedAt = new Date().toISOString();
      saveWhatsAppLogs(updatedLogs);
    }
    res.status(500).json({ success: false, error: (err as { message?: string })?.message });
  }
});

// 5. Get logs
router.get("/api/whatsapp/logs", (req, res) => {
  const logs = getWhatsAppLogs();
  res.json(logs);
});

// 6. Retry Failed Log (Limit to 3 attempts)
router.post("/api/whatsapp/logs/retry", async (req, res) => {
  const { id } = req.body;
  const logs = getWhatsAppLogs();
  const logIndex = logs.findIndex((l: WhatsAppLog) => l.id === id);

  if (logIndex === -1) {
    return res.status(404).json({ message: "Log not found." });
  }

  const log = logs[logIndex];
  if (log.status !== "failed") {
    return res.status(400).json({ message: "Only failed messages can be retried." });
  }

  if (log.attempts >= 3) {
    return res.status(400).json({ message: "Maximum retry limit (3 attempts) exceeded." });
  }

  const config = getWhatsAppConfig();
  log.attempts += 1;
  log.status = "sending";
  log.updatedAt = new Date().toISOString();
  saveWhatsAppLogs(logs);

  if (config.test_mode) {
    setTimeout(() => {
      const refreshed = getWhatsAppLogs();
      const idx = refreshed.findIndex((l: WhatsAppLog) => l.id === id);
      if (idx !== -1) {
        refreshed[idx].status = "sent";
        refreshed[idx].sentAt = new Date().toISOString();
        refreshed[idx].providerMessageId = `sim-retry-wamid-${Date.now()}`;
        refreshed[idx].updatedAt = new Date().toISOString();
        refreshed[idx].errorCode = null;
        refreshed[idx].errorMessage = null;
        saveWhatsAppLogs(refreshed);
      }
    }, 500);

    return res.json({ success: true, message: "Retry simulated successfully." });
  }

  try {
    const url = `https://graph.facebook.com/${config.api_version}/${config.phone_number_id}/messages`;
    // Meta API retry
    // Build parameters array again
    const payload = {
      messaging_product: "whatsapp",
      to: log.recipient,
      type: "template",
      template: {
        name: log.template,
        language: { code: "id" },
        components: [
          {
            type: "body",
            parameters: [{ type: "text", text: log.messageText }] // simple fallback parameters
          }
        ]
      }
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.access_token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data: MetaApiResponse = await response.json();
    const refreshed = getWhatsAppLogs();
    const idx = refreshed.findIndex((l: WhatsAppLog) => l.id === id);

    if (idx !== -1) {
      if (response.ok) {
        refreshed[idx].status = "sent";
        refreshed[idx].sentAt = new Date().toISOString();
        refreshed[idx].providerMessageId = data.messages?.[0]?.id || "";
        refreshed[idx].errorCode = null;
        refreshed[idx].errorMessage = null;
      } else {
        refreshed[idx].status = "failed";
        refreshed[idx].errorCode = data.error?.code || response.status;
        refreshed[idx].errorMessage = data.error?.message || "Meta API retry error";
      }
      refreshed[idx].updatedAt = new Date().toISOString();
      saveWhatsAppLogs(refreshed);
    }

    if (response.ok) {
      res.json({ success: true, messageId: data.messages?.[0]?.id });
    } else {
      res.status(response.status).json({ success: false, error: data.error });
    }
  } catch (err: unknown) {
    const refreshed = getWhatsAppLogs();
    const idx = refreshed.findIndex((l: WhatsAppLog) => l.id === id);
    if (idx !== -1) {
      refreshed[idx].status = "failed";
      refreshed[idx].errorMessage = (err as { message?: string })?.message || "Network Error during retry";
      refreshed[idx].updatedAt = new Date().toISOString();
      saveWhatsAppLogs(refreshed);
    }
    res.status(500).json({ success: false, error: (err as { message?: string })?.message });
  }
});

// 7. GET /api/webhooks/whatsapp (Webhook Verification)
router.get("/api/webhooks/whatsapp", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  const config = getWhatsAppConfig();
  // Double security: verify mode and token
  if (mode === "subscribe" && token && token === config.webhook_verify_token) {
    logger.info("WhatsApp Webhook successfully verified!");
    return res.status(200).send(challenge);
  } else {
    console.warn("Unauthorized Webhook verification attempt rejected.");
    return res.status(403).send("Forbidden");
  }
});

// 8. POST /api/webhooks/whatsapp (Inbound & Webhook status callback)
// Validasi: cocokkan verify token bila disertakan (query/hub.verify_token atau
// header x-webhook-verify-token); percobaan tak sah dicatat di log.
router.post("/api/webhooks/whatsapp", (req, res) => {
  const payload = req.body;
  const config = getWhatsAppConfig();
  const providedToken =
    (req.query && (req.query["hub.verify_token"] as string)) ||
    (req.headers["x-webhook-verify-token"] as string) ||
    "";
  if (providedToken && config.webhook_verify_token && providedToken !== config.webhook_verify_token) {
    console.warn(`[security] webhook WhatsApp: verify token tidak cocok dari ${req.ip}`);
    return res.sendStatus(403);
  }
  if (!providedToken) {
    console.warn(`[security] webhook WhatsApp tanpa verify token dari ${req.ip}`);
  }

  // Real API webhook signature validation is simulated here (safeguarding payload)
  if (payload.object !== "whatsapp_business_account") {
    return res.sendStatus(400);
  }

  try {
    const entry = payload.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;

    if (!value) return res.sendStatus(200);

    const logs = getWhatsAppLogs();
    let updated = false;

    // 1. Process Status updates (sent, delivered, read, failed)
    if (value.statuses && Array.isArray(value.statuses)) {
      for (const statusObj of value.statuses) {
        const messageId = statusObj.id;
        const newStatus = statusObj.status; // delivered, read, etc.
        const error = statusObj.errors?.[0];

        const logIdx = logs.findIndex((l: WhatsAppLog) => l.providerMessageId === messageId);
        if (logIdx !== -1) {
          logs[logIdx].status = newStatus; // e.g. delivered, read
          if (error) {
            logs[logIdx].errorCode = error.code;
            logs[logIdx].errorMessage = error.message;
          }
          logs[logIdx].updatedAt = new Date().toISOString();
          updated = true;
        }
      }
    }

    // 2. Process Inbound Messages (chatbot deferred - logging only)
    if (value.messages && Array.isArray(value.messages)) {
      for (const msg of value.messages) {
        const sender = msg.from;
        const msgId = msg.id;
        const textBody = msg.text?.body || `[Pesan media tipe: ${msg.type}]`;
        
        // Log inbound message
        const inboundLog = {
          id: `wa-in-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          notificationId: "",
          recipient: sender,
          recipientMasked: maskPhoneNumber(sender),
          event: "inbound_message",
          template: "N/A",
          status: "received",
          messageText: textBody,
          providerMessageId: msgId,
          errorCode: null,
          errorMessage: null,
          attempts: 1,
          direction: "inbound",
          relatedEntity: "none",
          relatedEntityId: "",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        logs.unshift(inboundLog);
        updated = true;
      }
    }

    if (updated) {
      saveWhatsAppLogs(logs);
    }

    // Always respond with 200 to acknowledge Meta's delivery
    res.sendStatus(200);
  } catch (err) {
    console.error("Failed to process WhatsApp webhook payload:", err);
    res.sendStatus(500);
  }
});

export default router;
