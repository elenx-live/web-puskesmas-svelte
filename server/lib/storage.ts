// TAHAP 3 — hasil pemecahan server.ts (perilaku endpoint TIDAK berubah).
// Helper penyimpanan & util server (dipindah dari server.ts).
import fs from "fs";
import path from "path";
import express from "express";
import { GoogleGenAI } from "@google/genai";
import { Resvg } from "@resvg/resvg-js";
import {
  publicDir, uploadsDir,
  CONFIG_FILE, LOGS_FILE, AI_CONFIG_FILE,
  SITE_SETTINGS_FILE, MICROSITES_META_FILE, MICROSITES_DATA_FILE, MICROSITES_CATEGORIES_FILE,
  THEME_PUBLISHED_FILE, THEME_DRAFT_FILE, HOMEPAGE_PUBLISHED_FILE, HOMEPAGE_DRAFT_FILE,
  POSTS_META_FILE, CONTACT_SETTINGS_FILE, DATA_STORE_DIR,
  DEFAULT_MICROSITES, DEFAULT_POSTS, DEFAULT_THEME, DEFAULT_HOMEPAGE,
} from "./config.js";

/** Konfigurasi WhatsApp (JSON di disk). */
export interface WhatsAppConfig {
  enabled: boolean;
  phone_number_id: string;
  business_account_id: string;
  access_token: string;
  api_version: string;
  webhook_verify_token: string;
  default_country_code: string;
  test_mode: boolean;
  templates: Record<string, string>;
  [k: string]: unknown;
}

/** Satu entri log notifikasi WhatsApp. */
export interface WhatsAppLog {
  id: string;
  notificationId?: string;
  recipient?: string;
  recipientMasked?: string;
  event?: string;
  template?: string;
  status?: string;
  messageText?: string;
  providerMessageId?: string;
  errorCode?: string | null;
  errorMessage?: string | null;
  attempts?: number;
  direction?: string;
  relatedEntity?: string;
  relatedEntityId?: string;
  createdAt?: string;
  updatedAt?: string;
  [k: string]: unknown;
}

/** Pengaturan provider gambar AI. */
export interface ImageProviderSettings {
  provider?: string;
  providerName?: string;
  endpointUrl?: string;
  apiKey?: string;
  model?: string;
  aspectRatio?: string;
  size?: string;
  enabled?: boolean;
  lastStatus?: string;
  lastTestedAt?: string;
  lastStatusMessage?: string;
  [k: string]: unknown;
}

/** Pengaturan provider teks AI. */
export interface TextProviderSettings {
  provider?: string;
  providerName?: string;
  endpointUrl?: string;
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  enabled?: boolean;
  lastStatus?: string;
  lastTestedAt?: string;
  lastStatusMessage?: string;
  [k: string]: unknown;
}

/** Konfigurasi provider AI (JSON di disk). */
export interface AIProviderConfig {
  provider?: string;
  providerName?: string;
  endpointUrl?: string;
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  enabled?: boolean;
  lastStatus?: string;
  lastTestedAt?: string;
  lastStatusMessage?: string;
  text?: TextProviderSettings;
  image?: ImageProviderSettings;
  [k: string]: unknown;
}

/** Item CMS generik (microsite, kategori, post) yang disimpan sebagai JSON. */
export interface CmsItem {
  id?: string;
  slug?: string;
  [k: string]: unknown;
}

/** Channel kontak (telepon/WhatsApp/email). */
export interface ContactChannel {
  type?: string;
  value?: unknown;
  [k: string]: unknown;
}

/** Respons JSON generik dari API eksternal (Meta, OpenAI-compatible, dsb). */
export interface ExternalApiResponse {
  [k: string]: unknown;
}

// ---------- Upload hardening ----------
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB
const UPLOAD_IMAGE_ALLOWLIST: Record<string, { ext: string; magic: number[] }> = {
  "image/png": { ext: ".png", magic: [0x89, 0x50, 0x4e, 0x47] },
  "image/jpeg": { ext: ".jpg", magic: [0xff, 0xd8, 0xff] },
  "image/webp": { ext: ".webp", magic: [0x52, 0x49, 0x46, 0x46] }, // "RIFF....WEBP"
};

function detectUploadImageMime(buffer: Buffer): string | null {
  for (const [mime, spec] of Object.entries(UPLOAD_IMAGE_ALLOWLIST)) {
    const ok = spec.magic.every((byte, i) => buffer[i] === byte);
    if (!ok) continue;
    if (mime === "image/webp") {
      // WebP: bytes 8..11 harus "WEBP"
      if (!(buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50)) continue;
    }
    return mime;
  }
  return null;
}

function safeUploadFileName(ext: string): string {
  const rand = Math.random().toString(16).slice(2, 10).padEnd(8, "0");
  return `upload-${Date.now()}-${rand}${ext}`;
}

function decodeBase64Image(imageBase64: string): { buffer: Buffer; declaredMime: string | null } {
  const matches = imageBase64.match(/^data:([A-Za-z0-9+/.-]+);base64,(.+)$/);
  if (matches && matches.length === 3) {
    return { buffer: Buffer.from(matches[2], "base64"), declaredMime: matches[1].toLowerCase() };
  }
  return { buffer: Buffer.from(imageBase64, "base64"), declaredMime: null };
}
function getWhatsAppConfig() {
  const defaultTemplates = {
    registration_submitted: "registration_submitted",
    registration_confirmed: "registration_confirmed",
    registration_rejected: "registration_rejected",
    queue_called: "queue_called",
    service_completed: "service_completed"
  };

  const defaultConfig = {
    enabled: false,
    phone_number_id: process.env.WHATSAPP_PHONE_NUMBER_ID || "",
    business_account_id: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || "",
    access_token: process.env.WHATSAPP_ACCESS_TOKEN || "",
    api_version: process.env.WHATSAPP_API_VERSION || "v20.0",
    webhook_verify_token: process.env.WHATSAPP_VERIFY_TOKEN || "",
    default_country_code: process.env.WHATSAPP_DEFAULT_COUNTRY_CODE || "62",
    test_mode: process.env.WHATSAPP_TEST_MODE === "true" || true,
    templates: defaultTemplates
  };

  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const saved = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
      return {
        ...defaultConfig,
        ...saved,
        templates: {
          ...defaultTemplates,
          ...(saved.templates || {})
        }
      };
    }
  } catch (err) {
    console.error("Error reading WhatsApp config file, using defaults", err);
  }
  return defaultConfig;
}

// Helper to save config
function saveWhatsAppConfig(config: WhatsAppConfig) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("Failed to write WhatsApp config:", err);
    return false;
  }
}

// Helper to read logs
function getWhatsAppLogs(): WhatsAppLog[] {
  try {
    if (fs.existsSync(LOGS_FILE)) {
      return JSON.parse(fs.readFileSync(LOGS_FILE, "utf-8"));
    }
  } catch (err) {
    console.error("Error reading WhatsApp logs:", err);
  }
  return [];
}

// Helper to save logs
function saveWhatsAppLogs(logs: WhatsAppLog[]) {
  try {
    fs.writeFileSync(LOGS_FILE, JSON.stringify(logs, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("Failed to write WhatsApp logs:", err);
    return false;
  }
}

// Phone Number Normalization
function normalizePhoneNumber(phone: string, defaultCode: string): string {
  let cleaned = phone.replace(/[^0-9]/g, "");
  if (cleaned.startsWith("0")) {
    cleaned = defaultCode + cleaned.substring(1);
  }
  if (!cleaned.startsWith(defaultCode) && !cleaned.startsWith("62")) {
    cleaned = defaultCode + cleaned;
  }
  return cleaned;
}

// Masking recipient phone number
function maskPhoneNumber(phone: string): string {
  if (phone.length <= 7) return phone;
  return phone.substring(0, 5) + "•••" + phone.substring(phone.length - 4);
}

// API Routes
function getAIProviderConfig() {
  const defaultTextConfig = {
    provider: "gemini",
    providerName: "Google Gemini (Google AI Studio)",
    endpointUrl: "https://generativelanguage.googleapis.com",
    apiKey: "",
    model: "gemini-3.8-flash",
    temperature: 0.3,
    maxTokens: 2048,
    enabled: true,
    lastStatus: "untested",
    lastTestedAt: "",
    lastStatusMessage: ""
  };

  const defaultImageConfig = {
    provider: "pollinations",
    providerName: "Pollinations AI (Flux / Open Source)",
    endpointUrl: "https://image.pollinations.ai",
    apiKey: "",
    model: "flux",
    aspectRatio: "16:9",
    size: "1024x1024",
    enabled: true,
    lastStatus: "untested",
    lastTestedAt: "",
    lastStatusMessage: ""
  };

  try {
    if (fs.existsSync(AI_CONFIG_FILE)) {
      const saved = JSON.parse(fs.readFileSync(AI_CONFIG_FILE, "utf-8"));
      
      let textConfig = { ...defaultTextConfig };
      if (saved.text) {
        textConfig = { ...defaultTextConfig, ...saved.text };
      } else if (saved.provider) {
        textConfig = {
          ...defaultTextConfig,
          provider: saved.provider,
          providerName: saved.providerName || "Google Gemini",
          endpointUrl: saved.endpointUrl || defaultTextConfig.endpointUrl,
          apiKey: saved.apiKey || "",
          model: saved.model || defaultTextConfig.model,
          temperature: typeof saved.temperature === 'number' ? saved.temperature : 0.3,
          maxTokens: saved.maxTokens || 2048,
          enabled: saved.enabled !== false,
          lastStatus: saved.lastStatus || "untested",
          lastTestedAt: saved.lastTestedAt || "",
          lastStatusMessage: saved.lastStatusMessage || ""
        };
      }

      let imageConfig = { ...defaultImageConfig };
      if (saved.image) {
        imageConfig = { ...defaultImageConfig, ...saved.image };
      } else {
        if (saved.provider === "openai" && saved.apiKey) {
          imageConfig = {
            provider: "openai",
            providerName: "OpenAI DALL-E 3",
            endpointUrl: "https://api.openai.com/v1",
            apiKey: saved.apiKey,
            model: "dall-e-3",
            aspectRatio: "16:9",
            size: "1024x1024",
            enabled: true,
            lastStatus: "untested",
            lastTestedAt: "",
            lastStatusMessage: ""
          };
        } else if (process.env.GEMINI_API_KEY) {
          imageConfig = {
            provider: "gemini",
            providerName: "Google Imagen 3 (Google AI Studio)",
            endpointUrl: "https://generativelanguage.googleapis.com",
            apiKey: process.env.GEMINI_API_KEY,
            model: "imagen-3.0-generate-002",
            aspectRatio: "16:9",
            size: "1024x1024",
            enabled: true,
            lastStatus: "untested",
            lastTestedAt: "",
            lastStatusMessage: ""
          };
        }
      }

      return {
        text: textConfig,
        image: imageConfig,
        // Flat aliases mirroring text config for backward compatibility
        provider: textConfig.provider,
        providerName: textConfig.providerName,
        endpointUrl: textConfig.endpointUrl,
        apiKey: textConfig.apiKey,
        model: textConfig.model,
        temperature: textConfig.temperature,
        maxTokens: textConfig.maxTokens,
        enabled: textConfig.enabled,
        lastStatus: textConfig.lastStatus,
        lastTestedAt: textConfig.lastTestedAt,
        lastStatusMessage: textConfig.lastStatusMessage
      };
    }
  } catch (err) {
    console.error("Error reading AI config file, using defaults", err);
  }

  return {
    text: defaultTextConfig,
    image: defaultImageConfig,
    ...defaultTextConfig
  };
}

function saveAIProviderConfig(config: AIProviderConfig) {
  try {
    fs.writeFileSync(AI_CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("Failed to write AI config:", err);
    return false;
  }
}

interface ExecuteAIParams {
  provider: string;
  endpointUrl?: string;
  apiKey?: string;
  model?: string;
  systemPrompt?: string;
  userPrompt: string;
  temperature?: number;
}

async function executeAICompletion(params: ExecuteAIParams): Promise<{ text: string; modelUsed: string; providerUsed: string }> {
  const provider = params.provider || "gemini";
  const model = params.model || (provider === "gemini" ? "gemini-3.8-flash" : "gpt-4o-mini");

  if (provider === "gemini") {
    const key = params.apiKey || getAIProviderConfig().apiKey || process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("Kunci API Gemini tidak ditemukan. Harap masukkan API key di pengaturan provider atau konfigurasi server.");
    }
    const ai = new GoogleGenAI({ apiKey: key });
    const fullContent = params.systemPrompt ? `${params.systemPrompt}\n\n${params.userPrompt}` : params.userPrompt;
    
    const candidateModels = Array.from(new Set([
      model,
      "gemini-2.5-flash",
      "gemini-3.1-flash-lite",
      "gemini-flash-latest"
    ]));

    let lastError: unknown = null;
    for (const m of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: m,
          contents: fullContent,
        });
        return {
          text: response.text || "",
          modelUsed: m,
          providerUsed: m === model ? "Google Gemini" : `Google Gemini (${m})`
        };
      } catch (err: unknown) {
        lastError = err;
        console.warn(`Gemini model ${m} failed (${(err as { message?: string })?.message?.substring(0, 80)}), trying next candidate...`);
      }
    }
    throw lastError || new Error("Semua kandidat model Gemini saat ini sedang sibuk atau tidak merespon.");
  }

  // OpenAI-Compatible Providers (Groq, DeepSeek, OpenAI, OpenRouter, Custom)
  let baseUrl = (params.endpointUrl || "").trim().replace(/\/+$/, '');
  if (!baseUrl) {
    const preset = AI_PROVIDER_PRESETS.find(p => p.id === provider);
    baseUrl = preset?.endpointUrl || "https://api.openai.com/v1";
  }

  let chatUrl = baseUrl;
  if (!chatUrl.endsWith('/chat/completions')) {
    chatUrl += '/chat/completions';
  }

  const key = params.apiKey || "";
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };

  if (key && key !== "••••••••") {
    headers["Authorization"] = `Bearer ${key}`;
  } else if (params.apiKey === "••••••••") {
    const savedConfig = getAIProviderConfig();
    if (savedConfig.apiKey) {
      headers["Authorization"] = `Bearer ${savedConfig.apiKey}`;
    }
  }

  if (provider === "openrouter") {
    headers["HTTP-Referer"] = "https://puskesmas.id";
    headers["X-Title"] = "Puskesmas Portal";
  }

  const messages: { role: string; content: string }[] = [];
  if (params.systemPrompt) {
    messages.push({ role: "system", content: params.systemPrompt });
  }
  messages.push({ role: "user", content: params.userPrompt });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  try {
    const res = await fetch(chatUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: params.temperature ?? 0.3
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const errText = await res.text();
      let errMsg = errText;
      try {
        const parsed = JSON.parse(errText);
        errMsg = parsed.error?.message || parsed.message || errText;
      } catch {}
      throw new Error(`Provider ${provider} gagal (HTTP ${res.status}): ${errMsg}`);
    }

    const data: ExternalApiResponse = await res.json();
    const outputText = (data.choices as { message?: { content?: string } }[] | undefined)?.[0]?.message?.content || "";
    return {
      text: outputText,
      modelUsed: model,
      providerUsed: provider
    };
  } catch (fetchErr: unknown) {
    clearTimeout(timeout);
    if ((fetchErr as { name?: unknown })?.name === 'AbortError') {
      throw new Error(`Koneksi ke endpoint ${chatUrl} waktu habis (timeout 25 detik).`);
    }
    throw fetchErr;
  }
}
function getServerThemePublished(): Record<string, any> {
  try {
    if (fs.existsSync(THEME_PUBLISHED_FILE)) {
      const content = fs.readFileSync(THEME_PUBLISHED_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === 'object') {
        return { ...DEFAULT_THEME, ...parsed, status: 'published' };
      }
    }
  } catch (e) {
    console.error("Error reading theme_published.json:", e);
  }
  return DEFAULT_THEME;
}

function saveServerThemePublished(theme: Record<string, any>): boolean {
  try {
    const merged = { ...DEFAULT_THEME, ...theme, status: 'published', updatedAt: new Date().toISOString() };
    fs.writeFileSync(THEME_PUBLISHED_FILE, JSON.stringify(merged, null, 2), "utf-8");
    return true;
  } catch (e) {
    console.error("Error saving theme_published.json:", e);
    return false;
  }
}

function getServerThemeDraft(): Record<string, any> {
  try {
    if (fs.existsSync(THEME_DRAFT_FILE)) {
      const content = fs.readFileSync(THEME_DRAFT_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === 'object') {
        return { ...DEFAULT_THEME, ...parsed, status: 'draft' };
      }
    }
  } catch (e) {
    console.error("Error reading theme_draft.json:", e);
  }
  return getServerThemePublished();
}

function saveServerThemeDraft(theme: Record<string, any>): boolean {
  try {
    const merged = { ...DEFAULT_THEME, ...theme, status: 'draft', updatedAt: new Date().toISOString() };
    fs.writeFileSync(THEME_DRAFT_FILE, JSON.stringify(merged, null, 2), "utf-8");
    return true;
  } catch (e) {
    console.error("Error saving theme_draft.json:", e);
    return false;
  }
}

function getServerHomepagePublished(): Record<string, any> {
  try {
    if (fs.existsSync(HOMEPAGE_PUBLISHED_FILE)) {
      const content = fs.readFileSync(HOMEPAGE_PUBLISHED_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === 'object' && Array.isArray(parsed.sections)) {
        return { ...DEFAULT_HOMEPAGE, ...parsed, status: 'published' };
      }
    }
  } catch (e) {
    console.error("Error reading homepage_published.json:", e);
  }
  return DEFAULT_HOMEPAGE;
}

function saveServerHomepagePublished(config: Record<string, any>): boolean {
  try {
    const merged = { ...DEFAULT_HOMEPAGE, ...config, status: 'published', updatedAt: new Date().toISOString() };
    fs.writeFileSync(HOMEPAGE_PUBLISHED_FILE, JSON.stringify(merged, null, 2), "utf-8");
    return true;
  } catch (e) {
    console.error("Error saving homepage_published.json:", e);
    return false;
  }
}

function getServerHomepageDraft(): Record<string, any> {
  try {
    if (fs.existsSync(HOMEPAGE_DRAFT_FILE)) {
      const content = fs.readFileSync(HOMEPAGE_DRAFT_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === 'object' && Array.isArray(parsed.sections)) {
        return { ...DEFAULT_HOMEPAGE, ...parsed, status: 'draft' };
      }
    }
  } catch (e) {
    console.error("Error reading homepage_draft.json:", e);
  }
  return getServerHomepagePublished();
}

function saveServerHomepageDraft(config: Record<string, any>): boolean {
  try {
    const merged = { ...DEFAULT_HOMEPAGE, ...config, status: 'draft', updatedAt: new Date().toISOString() };
    fs.writeFileSync(HOMEPAGE_DRAFT_FILE, JSON.stringify(merged, null, 2), "utf-8");
    return true;
  } catch (e) {
    console.error("Error saving homepage_draft.json:", e);
    return false;
  }
}

function getServerMicrosites(): CmsItem[] {
  try {
    if (fs.existsSync(MICROSITES_DATA_FILE)) {
      const content = fs.readFileSync(MICROSITES_DATA_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Error reading microsites_data.json:", e);
  }
  return [];
}

function saveServerMicrosites(microsites: CmsItem[]): boolean {
  try {
    fs.writeFileSync(MICROSITES_DATA_FILE, JSON.stringify(microsites, null, 2), "utf-8");
    // Rebuild metaList solely from remaining microsites to prevent ghost resurrection
    const metaList: Record<string, any> = {};
    for (const m of microsites) {
      if (m && m.slug) {
        metaList[m.slug] = {
          name: m.name || m.title || '',
          description: m.description || '',
          category: m.category || 'Umum',
          profileImageUrl: m.profileImageUrl || m.coverImageUrl || '',
          logoUrl: m.logoUrl || '',
          ogImageUrl: m.ogImageUrl || m.profileImageUrl || '',
          slug: m.slug
        };
      }
    }
    fs.writeFileSync(MICROSITES_META_FILE, JSON.stringify(metaList, null, 2), "utf-8");
    return true;
  } catch (e) {
    console.error("Error saving microsites_data.json:", e);
    return false;
  }
}

function getServerMicrositeCategories(): CmsItem[] {
  try {
    if (fs.existsSync(MICROSITES_CATEGORIES_FILE)) {
      const content = fs.readFileSync(MICROSITES_CATEGORIES_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Error reading microsites_categories.json:", e);
  }
  return DEFAULT_CATEGORIES;
}

function saveServerMicrositeCategories(categories: CmsItem[]): boolean {
  try {
    fs.writeFileSync(MICROSITES_CATEGORIES_FILE, JSON.stringify(categories, null, 2), "utf-8");
    return true;
  } catch (e) {
    console.error("Error saving microsites_categories.json:", e);
    return false;
  }
}

function getServerSiteSettings(): Record<string, any> {
  const defaultSettings: Record<string, any> = {
    siteName: "Puskesmas Manding",
    shortName: "Puskesmas Manding",
    siteTitle: "Puskesmas Manding - Portal Resmi & Pelayanan Terpadu",
    siteDescription: "Portal informasi dan pelayanan kesehatan resmi Puskesmas Manding: Layanan kesehatan primer, pendaftaran online, berita kesehatan, jadwal dokter, microsite, dan pengaduan masyarakat.",
    tagline: "Bismillah Melayani, Anda Sehat Kami Puas",
    motto: "Bismillah Melayani, Anda Sehat Kami Puas",
    logoUrl: "/logo-custom.png",
    ogImageUrl: "/og-image.png",
    address: "Jl. Raya Manding, Kec. Manding, Kab. Sumenep, Jawa Timur",
    phone: "(0328) 667123",
    email: "puskesmasmanding@gmail.com",
    whatsapp: "081234567890",
    operatingHours: "Senin - Sabtu: 07.30 - 14.00 WIB | UGD & Rawat Inap: 24 Jam"
  };

  try {
    if (fs.existsSync(SITE_SETTINGS_FILE)) {
      const content = fs.readFileSync(SITE_SETTINGS_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === 'object') {
        return { ...defaultSettings, ...parsed };
      }
    }
  } catch (e) {
    console.error("Error reading site_settings.json:", e);
  }
  return defaultSettings;
}

function saveServerSiteSettings(settings: Record<string, any>): boolean {
  try {
    const current = getServerSiteSettings();
    let opHours = settings.operatingHours !== undefined ? settings.operatingHours : current.operatingHours;
    if (Array.isArray(opHours)) {
      opHours = "Senin - Sabtu: 07.30 - 14.00 WIB | UGD & Rawat Inap: 24 Jam";
    }
    const merged: Record<string, any> = { 
      ...current, 
      ...settings, 
      operatingHours: typeof opHours === 'string' && opHours.trim() ? opHours : "Senin - Sabtu: 07.30 - 14.00 WIB | UGD & Rawat Inap: 24 Jam",
      updatedAt: new Date().toISOString() 
    };
    fs.writeFileSync(SITE_SETTINGS_FILE, JSON.stringify(merged, null, 2), "utf-8");

    // Also synchronize to contact settings file if it exists
    try {
      if (fs.existsSync(CONTACT_SETTINGS_FILE)) {
        const contact = JSON.parse(fs.readFileSync(CONTACT_SETTINGS_FILE, "utf-8"));
        if (merged.siteName) contact.name = merged.siteName;
        if (merged.tagline) contact.tagline = merged.tagline;
        if (merged.address) contact.address = merged.address;
        if (merged.village) contact.village = merged.village;
        if (merged.district) contact.district = merged.district;
        if (merged.regency) contact.regency = merged.regency;
        if (merged.province) contact.province = merged.province;
        if (merged.postalCode) contact.postalCode = merged.postalCode;
        if (merged.latitude) contact.latitude = merged.latitude;
        if (merged.longitude) contact.longitude = merged.longitude;
        if (merged.timezone) contact.timezone = merged.timezone;

        if (Array.isArray(contact.channels)) {
          if (merged.phone) {
            const ch = contact.channels.find((c: ContactChannel) => c.type === 'Phone');
            if (ch) ch.value = merged.phone;
          }
          if (merged.whatsapp) {
            const ch = contact.channels.find((c: ContactChannel) => c.type === 'WhatsApp');
            if (ch) ch.value = merged.whatsapp;
          }
          if (merged.email) {
            const ch = contact.channels.find((c: ContactChannel) => c.type === 'Email');
            if (ch) ch.value = merged.email;
          }
        }
        contact.updatedAt = new Date().toISOString();
        fs.writeFileSync(CONTACT_SETTINGS_FILE, JSON.stringify(contact, null, 2), "utf-8");
      }
    } catch {}

    return true;
  } catch (e) {
    console.error("Error saving site_settings.json:", e);
    return false;
  }
}

function getServerMicrositesMeta(): Record<string, any> {
  const defaultList: Record<string, any> = { ...DEFAULT_MICROSITES };
  try {
    if (fs.existsSync(MICROSITES_META_FILE)) {
      const content = fs.readFileSync(MICROSITES_META_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (typeof parsed === 'object' && parsed !== null) {
        Object.assign(defaultList, parsed);
      }
    }
  } catch (e) {
    console.error("Error reading microsites_meta.json:", e);
  }

  // Also read from MICROSITES_DATA_FILE to ensure live sync with all microsites
  try {
    if (fs.existsSync(MICROSITES_DATA_FILE)) {
      const content = fs.readFileSync(MICROSITES_DATA_FILE, "utf-8");
      const items = JSON.parse(content);
      if (Array.isArray(items)) {
        for (const item of items) {
          if (item && item.slug) {
            defaultList[item.slug] = {
              name: item.name || item.title || '',
              description: item.description || '',
              category: item.category || 'Umum',
              links: Array.isArray(item.links) ? item.links : [],
              profileImageUrl: item.profileImageUrl || item.coverImageUrl || '',
              logoUrl: item.logoUrl || '',
              ogImageUrl: item.ogImageUrl || item.profileImageUrl || '',
              slug: item.slug
            };
          }
        }
      }
    }
  } catch (e) {
    console.error("Error reading microsites_data.json into meta:", e);
  }

  return defaultList;
}

function saveServerMicrositeMeta(slug: string, meta: Record<string, any>): boolean {
  try {
    const current = getServerMicrositesMeta();
    current[slug] = { ...(current[slug] || {}), ...meta, slug };
    fs.writeFileSync(MICROSITES_META_FILE, JSON.stringify(current, null, 2), "utf-8");
    return true;
  } catch (e) {
    console.error("Error saving microsites_meta.json:", e);
    return false;
  }
}

function saveServerPostMeta(slug: string, meta: Record<string, any>): boolean {
  try {
    const current = getServerPosts();
    current[slug] = { ...(current[slug] || {}), ...meta, slug };
    fs.writeFileSync(POSTS_META_FILE, JSON.stringify(current, null, 2), "utf-8");
    return true;
  } catch (e) {
    console.error("Error saving posts_meta.json:", e);
    return false;
  }
}

function getServerPosts(): Record<string, any> {
  const postsMap: Record<string, any> = {};
  try {
    if (fs.existsSync(POSTS_META_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(POSTS_META_FILE, "utf-8"));
      if (parsed && typeof parsed === 'object') {
        Object.assign(postsMap, parsed);
      }
    }
  } catch (e) {
    console.error("Error reading posts_meta.json:", e);
  }

  // Also check data_store/posts.json
  try {
    const dataStorePostsPath = path.join(process.cwd(), "data_store", "posts.json");
    if (fs.existsSync(dataStorePostsPath)) {
      const parsed = JSON.parse(fs.readFileSync(dataStorePostsPath, "utf-8"));
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item && item.slug) {
            postsMap[item.slug] = {
              title: item.title || '',
              excerpt: item.excerpt || item.summary || '',
              featuredImage: item.featuredImage || item.coverImage || item.imageUrl || '',
              category: item.category || 'Berita & Informasi',
              publishedAt: item.publishedAt || item.date || ''
            };
          }
        }
      }
    }
  } catch (e) {
    console.error("Error reading data_store/posts.json:", e);
  }

  return postsMap;
}

function getServerServices(): Record<string, any> {
  return {
    'pemeriksaan-umum': {
      name: 'Poli Pemeriksaan Umum & Skrining Dewasa',
      description: 'Pelayanan pemeriksaan kesehatan umum, konsultasi medis dokter, pengobatan penyakit dasar, serta skrining terintegrasi Klaster 3.',
      cluster: 'Klaster 3 (Dewasa & Lansia)',
      schedule: 'Senin - Sabtu: 07.30 - 14.00 WIB'
    },
    'kesehatan-gigi-dan-mulut': {
      name: 'Poli Kesehatan Gigi dan Mulut',
      description: 'Pemeriksaan gigi, penambalan, pembersihan karang gigi (scaling), pencabutan gigi susu dan dewasa, serta konsultasi kesehatan mulut.',
      cluster: 'Klaster Lintas',
      schedule: 'Senin - Kamis: 08.00 - 12.30 WIB'
    },
    'kesehatan-ibu-dan-anak-kia': {
      name: 'Poli Kesehatan Ibu dan Anak (KIA) & KB',
      description: 'Pemeriksaan kehamilan (ANC Terpadu), USG dasar kebidanan, imunisasi TT, nifas, persalinan 24 jam, dan konseling keluarga berencana.',
      cluster: 'Klaster 2 (Ibu & Anak)',
      schedule: 'Senin - Sabtu: 07.30 - 14.00 WIB'
    },
    'imunisasi-anak': {
      name: 'Pelayanan Imunisasi Dasar & Tambahan',
      description: 'Vaksinasi lengkap bayi dan balita (BCG, Polio, DPT-HB-Hib, Campak/MR, PCV, Rotavirus) guna mencegah penyakit PD3I.',
      cluster: 'Klaster 2 (Ibu & Anak)',
      schedule: 'Selasa & Kamis: 08.00 - 12.00 WIB'
    },
    'unit-gawat-darurat-ugd': {
      name: 'Unit Gawat Darurat (UGD) & Ambulans 24 Jam',
      description: 'Penanganan kegawatdaruratan medis, resusitasi, trauma/luka, stabilisasi rujukan, dan layanan evakuasi medis darurat siap siaga 24 jam.',
      cluster: 'Lintas Klaster',
      schedule: 'Buka 24 Jam Setiap Hari (Non-Stop)'
    },
    'laboratorium-klinik': {
      name: 'Laboratorium Klinik Sederhana',
      description: 'Pemeriksaan darah lengkap, glukosa, kolesterol, asam urat, urine rutin, tes cepat tuberkulosis (TCM), malaria, dan tes kehamilan.',
      cluster: 'Lintas Klaster',
      schedule: 'Senin - Sabtu: 07.30 - 13.30 WIB'
    },
    'farmasi-dan-obat': {
      name: 'Pelayanan Farmasi & Konseling Obat',
      description: 'Penyediaan dan penyerahan obat sesuai resep dokter, verifikasi dosis, edukasi kepatuhan minum obat, dan informasi efek samping.',
      cluster: 'Lintas Klaster',
      schedule: 'Senin - Sabtu: 07.30 - 14.00 WIB'
    },
    'konsultasi-gizi': {
      name: 'Klinik Konsultasi Gizi & Pencegahan Stunting',
      description: 'Konseling pola makan sehat, tata laksana balita gizi kurang/stunting, edukasi gizi penderita diabetes dan hipertensi.',
      cluster: 'Klaster 2 & 3',
      schedule: 'Rabu & Jumat: 08.30 - 12.00 WIB'
    }
  };
}
function escapeXmlStr(str: string): string {
  return String(str || '').replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

function wrapSvgLines(text: string, maxCharsPerLine: number, maxLines: number): string[] {
  const words = String(text || '').trim().split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if (!cur) {
      cur = w;
    } else if ((cur + ' ' + w).length <= maxCharsPerLine) {
      cur += ' ' + w;
    } else {
      lines.push(cur);
      cur = w;
      if (lines.length >= maxLines) break;
    }
  }
  if (cur && lines.length < maxLines) {
    lines.push(cur);
  }
  return lines;
}

function generatePageScreenshotSvg(options: {
  siteName: string;
  title: string;
  description: string;
  category?: string;
  pageType?: string;
  fullUrl: string;
  metaInfo?: string;
  links?: Array<{ label: string; url?: string }>;
  cluster?: string;
  schedule?: string;
}): string {
  const publishedTheme = getServerThemePublished();
  const primaryColor = publishedTheme.colorPrimary || "#059669";
  const headerBgColor = publishedTheme.colorHeaderBg || "#022c22";
  const themeName = publishedTheme.name || "Default Healthcare";

  const site = options.siteName || publishedTheme.siteName || "Puskesmas Mandiri Sejahtera";
  const title = options.title || "Portal Resmi Pelayanan Kesehatan";
  const desc = options.description || "Informasi resmi dan pelayanan terpadu masyarakat.";
  const fullUrl = options.fullUrl || "https://puskesmas-mandiri.go.id";
  const pageType = options.pageType || "home";
  const category = options.category || (pageType === "berita" ? "Berita & Informasi" : pageType === "microsite" ? "Microsite & Portal" : pageType === "layanan" ? "Layanan Medis" : "Portal Resmi");

  const titleLines = wrapSvgLines(title, 34, 2);
  const descLines = wrapSvgLines(desc, 50, 3);
  const mobileTitleLines = wrapSvgLines(title, 26, 2);
  const mobileDescLines = wrapSvgLines(desc, 36, 2);

  // Badge configuration
  let badgeBorder = primaryColor;
  let badgeBg = "rgba(16, 185, 129, 0.2)";
  let badgeColor = "#34d399";
  let badgeText = `${category.toUpperCase()}`;
  let typeIcon = "🏥";

  if (pageType === "berita") {
    badgeBorder = "#0284c7";
    badgeBg = "rgba(14, 165, 233, 0.2)";
    badgeColor = "#38bdf8";
    badgeText = `📰 BERITA &amp; EDUKASI KESEHATAN`;
    typeIcon = "📰";
  } else if (pageType === "microsite") {
    badgeBorder = "#8b5cf6";
    badgeBg = "rgba(139, 92, 246, 0.2)";
    badgeColor = "#a78bfa";
    badgeText = `🌐 MICROSITE &amp; PROGRAM DIGITAL`;
    typeIcon = "🌐";
  } else if (pageType === "pendaftaran") {
    badgeBorder = "#10b981";
    badgeBg = "rgba(16, 185, 129, 0.2)";
    badgeColor = "#34d399";
    badgeText = `📱 PENDAFTARAN ONLINE &amp; ANTREAN`;
    typeIcon = "📱";
  } else if (pageType === "layanan") {
    badgeBorder = "#f59e0b";
    badgeBg = "rgba(245, 158, 11, 0.2)";
    badgeColor = "#fbbf24";
    badgeText = `🏥 STANDAR PELAYANAN POLIKLINIK`;
    typeIcon = "🏥";
  } else if (pageType === "kontak") {
    badgeBorder = "#059669";
    badgeBg = "rgba(5, 150, 105, 0.2)";
    badgeColor = "#34d399";
    badgeText = `📞 KONTAK RESMI &amp; OPERASIONAL`;
    typeIcon = "📞";
  } else if (pageType === "pengaduan") {
    badgeBorder = "#f43f5e";
    badgeBg = "rgba(244, 63, 94, 0.2)";
    badgeColor = "#fb7185";
    badgeText = `📢 SALURAN ASPIRASI &amp; PENGADUAN`;
    typeIcon = "📢";
  }

  // Inside Mobile Screen UI depending on page type
  let mobileBodySvg = '';

  if (pageType === "berita") {
    mobileBodySvg = `
      <!-- Featured Banner Image Area -->
      <rect x="86" y="174" width="328" height="110" rx="14" fill="#0369a1" />
      <circle cx="360" cy="210" r="45" fill="#38bdf8" opacity="0.3" />
      <rect x="100" y="188" width="120" height="22" rx="11" fill="rgba(0,0,0,0.5)" />
      <text x="112" y="203" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="700" fill="#38bdf8">📰 ${escapeXmlStr(category.slice(0, 16))}</text>
      <text x="100" y="260" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="800" fill="#ffffff">Publikasi Resmi Puskesmas</text>

      <!-- Headline -->
      ${mobileTitleLines.map((line, i) => `<text x="86" y="${310 + (i * 18)}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="800" fill="#f8fafc">${escapeXmlStr(line)}</text>`).join('')}

      <!-- Author and Meta -->
      <rect x="86" y="354" width="328" height="26" rx="6" fill="#1e293b" />
      <text x="96" y="371" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="600" fill="#94a3b8">👤 Tim Publikasi • 🕒 Waktu Baca: ~3 Menit</text>

      <!-- Excerpt -->
      ${mobileDescLines.map((line, i) => `<text x="86" y="${402 + (i * 16)}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" fill="#cbd5e1">${escapeXmlStr(line)}</text>`).join('')}

      <!-- Mobile Button -->
      <rect x="86" y="446" width="328" height="38" rx="12" fill="${primaryColor}" />
      <text x="250" y="470" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="700" fill="#ffffff">Baca Artikel Selengkapnya ➔</text>
    `;
  } else if (pageType === "microsite") {
    const firstLink = (options.links && options.links[0]?.label) || "Akses Panduan & Layanan";
    const secondLink = (options.links && options.links[1]?.label) || "Lokasi & Jadwal Kegiatan";
    mobileBodySvg = `
      <!-- Microsite Profile Header -->
      <circle cx="250" cy="214" r="28" fill="${primaryColor}" />
      <text x="250" y="222" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="20">🌐</text>
      <circle cx="270" cy="234" r="8" fill="#10b981" stroke="#0f172a" stroke-width="2" />
      
      <text x="250" y="258" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="800" fill="#ffffff">${escapeXmlStr(title.slice(0, 30))}</text>
      <text x="250" y="276" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" fill="#94a3b8">Portal Digital Terpadu • ${escapeXmlStr(site.slice(0, 24))}</text>

      <!-- Microsite Mobile Link Buttons -->
      <rect x="86" y="296" width="328" height="42" rx="12" fill="${primaryColor}" />
      <text x="104" y="322" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="700" fill="#ffffff">📄 ${escapeXmlStr(firstLink.slice(0, 28))}</text>
      <text x="396" y="322" text-anchor="end" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" fill="#ffffff">➔</text>

      <rect x="86" y="348" width="328" height="42" rx="12" fill="#1e293b" stroke="${primaryColor}" stroke-width="1.5" />
      <text x="104" y="374" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="700" fill="#e2e8f0">📍 ${escapeXmlStr(secondLink.slice(0, 28))}</text>
      <text x="396" y="374" text-anchor="end" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" fill="#e2e8f0">➔</text>

      <rect x="86" y="400" width="328" height="42" rx="12" fill="#1e293b" stroke="#334155" stroke-width="1" />
      <text x="104" y="426" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="700" fill="#cbd5e1">💬 Konsultasi &amp; Info WhatsApp</text>
      <text x="396" y="426" text-anchor="end" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" fill="#cbd5e1">➔</text>

      <!-- Verified Security Footer -->
      <rect x="86" y="454" width="328" height="28" rx="8" fill="rgba(16, 185, 129, 0.15)" stroke="#10b981" stroke-width="1" />
      <text x="250" y="472" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="700" fill="#34d399">🔒 Tautan Resmi Terverifikasi Puskesmas</text>
    `;
  } else if (pageType === "layanan") {
    const srvCluster = options.cluster || "Integrasi Layanan Primer (ILP)";
    const srvSchedule = options.schedule || "Senin - Sabtu: 07.30 - 14.00 WIB";
    mobileBodySvg = `
      <rect x="86" y="174" width="328" height="80" rx="14" fill="#78350f" />
      <circle cx="360" cy="205" r="40" fill="#f59e0b" opacity="0.3" />
      <text x="100" y="200" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="700" fill="#fbbf24">🏥 ${escapeXmlStr(srvCluster.slice(0, 32))}</text>
      <text x="100" y="226" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="800" fill="#ffffff">${escapeXmlStr(title.slice(0, 24))}</text>

      <rect x="86" y="266" width="328" height="52" rx="10" fill="#1e293b" />
      <text x="100" y="286" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="700" fill="#fbbf24">🕒 JADWAL OPERASIONAL</text>
      <text x="100" y="306" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="600" fill="#e2e8f0">${escapeXmlStr(srvSchedule.slice(0, 36))}</text>

      <rect x="86" y="328" width="328" height="106" rx="12" fill="#0f172a" stroke="#334155" stroke-width="1" />
      <text x="100" y="350" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="700" fill="#34d399">✓ Melayani Pasien BPJS &amp; Pasien Umum</text>
      <text x="100" y="374" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="600" fill="#cbd5e1">✓ Tenaga Medis Dokter &amp; Perawat Terlatih</text>
      <text x="100" y="398" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="600" fill="#cbd5e1">✓ Terintegrasi Farmasi &amp; Laboratorium</text>
      <text x="100" y="422" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="600" fill="#cbd5e1">✓ Pelayanan Berstandar Kemenkes RI</text>

      <rect x="86" y="446" width="328" height="38" rx="12" fill="${primaryColor}" />
      <text x="250" y="470" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="700" fill="#ffffff">Daftar Antrean Poli Ini Online ➔</text>
    `;
  } else if (pageType === "pendaftaran") {
    mobileBodySvg = `
      <rect x="86" y="174" width="328" height="65" rx="14" fill="${headerBgColor}" stroke="${primaryColor}" stroke-width="1" />
      <text x="100" y="198" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="800" fill="#34d399">📱 LOKET PENDAFTARAN ONLINE</text>
      <text x="100" y="222" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" fill="#e2e8f0">Ambil Nomor Antrean Tanpa Menunggu Lama</text>

      <rect x="86" y="250" width="328" height="42" rx="10" fill="#0f172a" stroke="#334155" stroke-width="1" />
      <text x="100" y="266" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="9" font-weight="700" fill="#94a3b8">1. NOMOR NIK KTP / BPJS</text>
      <text x="100" y="282" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="600" fill="#ffffff">352901xxxxxxxxxx</text>

      <rect x="86" y="302" width="328" height="42" rx="10" fill="#0f172a" stroke="#334155" stroke-width="1" />
      <text x="100" y="318" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="9" font-weight="700" fill="#94a3b8">2. PILIH KLASTER / POLIKLINIK</text>
      <text x="100" y="334" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="600" fill="#ffffff">Poli Pemeriksaan Umum (Klaster 3)</text>

      <rect x="86" y="354" width="328" height="80" rx="12" fill="#064e3b" stroke="#10b981" stroke-width="1" />
      <text x="100" y="374" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="700" fill="#34d399">STATUS NOMOR ANTREAN REAL-TIME</text>
      <text x="100" y="404" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="24" font-weight="800" fill="#ffffff">A-014</text>
      <text x="190" y="400" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" fill="#a7f3d0">Estimasi Pelayanan: ~10 Menit</text>
      <text x="190" y="416" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="700" fill="#34d399">✓ Loket Sedang Melayani</text>

      <rect x="86" y="446" width="328" height="38" rx="12" fill="${primaryColor}" />
      <text x="250" y="470" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="700" fill="#ffffff">Ambil Tiket QR Antrean ➔</text>
    `;
  } else {
    mobileBodySvg = `
      <rect x="86" y="174" width="328" height="100" rx="14" fill="${headerBgColor}" stroke="${primaryColor}" stroke-width="1" />
      <circle cx="360" cy="210" r="45" fill="${primaryColor}" opacity="0.3" />
      <text x="100" y="200" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="700" fill="#34d399">🏛️ PORTAL KESEHATAN TERPADU</text>
      <text x="100" y="226" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="800" fill="#ffffff">${escapeXmlStr(site.slice(0, 24))}</text>
      <text x="100" y="250" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" fill="#cbd5e1">5 Klaster Integrasi Layanan Primer (ILP)</text>

      <!-- 4 Service Grid Cards -->
      <rect x="86" y="286" width="158" height="66" rx="10" fill="#0f172a" stroke="#10b981" stroke-width="1" />
      <text x="96" y="306" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="700" fill="#34d399">Klaster 2</text>
      <text x="96" y="324" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="700" fill="#ffffff">Ibu &amp; Anak</text>
      <text x="96" y="340" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="9" fill="#94a3b8">KIA, KB, Imunisasi</text>

      <rect x="256" y="286" width="158" height="66" rx="10" fill="#0f172a" stroke="#10b981" stroke-width="1" />
      <text x="266" y="306" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="700" fill="#34d399">Klaster 3</text>
      <text x="266" y="324" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="700" fill="#ffffff">Dewasa &amp; Lansia</text>
      <text x="266" y="340" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="9" fill="#94a3b8">Poli Umum &amp; PTM</text>

      <rect x="86" y="362" width="158" height="66" rx="10" fill="#0f172a" stroke="#10b981" stroke-width="1" />
      <text x="96" y="382" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="700" fill="#34d399">Klaster 4</text>
      <text x="96" y="400" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="700" fill="#ffffff">P2P &amp; Kesling</text>
      <text x="96" y="416" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="9" fill="#94a3b8">Surveilans &amp; Sanitasi</text>

      <rect x="256" y="362" width="158" height="66" rx="10" fill="#064e3b" stroke="#10b981" stroke-width="1" />
      <text x="266" y="382" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="700" fill="#34d399">24 Jam</text>
      <text x="266" y="400" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="700" fill="#ffffff">🚑 UGD &amp; Ambulans</text>
      <text x="266" y="416" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="9" fill="#a7f3d0">Siaga Gawat Darurat</text>

      <rect x="86" y="446" width="328" height="38" rx="12" fill="${primaryColor}" />
      <text x="250" y="470" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="700" fill="#ffffff">Buka Seluruh Layanan &amp; Pendaftaran ➔</text>
    `;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <defs>
      <!-- Background Gradients using Active Theme Colors -->
      <linearGradient id="canvasBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${headerBgColor}" />
        <stop offset="40%" stop-color="#091c15" />
        <stop offset="100%" stop-color="#020d09" />
      </linearGradient>
      <linearGradient id="phoneBezel" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#334155" />
        <stop offset="100%" stop-color="#0f172a" />
      </linearGradient>
      <linearGradient id="phoneScreen" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#0b1e17" />
        <stop offset="100%" stop-color="#040e0b" />
      </linearGradient>
      <linearGradient id="accentGlow" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${primaryColor}" stop-opacity="0.8" />
        <stop offset="100%" stop-color="#3b82f6" stop-opacity="0.2" />
      </linearGradient>
      <filter id="phoneShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="16" stdDeviation="24" flood-color="#000000" flood-opacity="0.65" />
      </filter>
    </defs>

    <!-- Canvas Background -->
    <rect width="1200" height="630" fill="url(#canvasBg)" />
    
    <!-- Ambient Healthcare Light Circles -->
    <circle cx="260" cy="180" r="280" fill="${primaryColor}" opacity="0.15" />
    <circle cx="1080" cy="100" r="320" fill="${primaryColor}" opacity="0.12" />
    <circle cx="950" cy="540" r="220" fill="#0284c7" opacity="0.10" />

    <!-- Subtle Dot Grid Pattern on Canvas -->
    <g opacity="0.08" fill="#ffffff">
      ${Array.from({ length: 12 }).map((_, r) =>
        Array.from({ length: 24 }).map((_, c) =>
          `<circle cx="${50 + c * 48}" cy="${30 + r * 48}" r="1.5" />`
        ).join('')
      ).join('')}
    </g>

    <!-- ============================================== -->
    <!-- SMARTPHONE DEVICE MOCKUP (FORMAT MOBILE ASLI)  -->
    <!-- ============================================== -->
    <g filter="url(#phoneShadow)">
      <!-- Outer Smartphone Frame -->
      <rect x="64" y="24" width="372" height="582" rx="44" fill="url(#phoneBezel)" stroke="${primaryColor}" stroke-width="2" stroke-opacity="0.5" />
      <!-- Inner Smartphone Bezel -->
      <rect x="70" y="30" width="360" height="570" rx="40" fill="#020617" />
      <!-- Glass Screen Canvas -->
      <rect x="74" y="34" width="352" height="562" rx="36" fill="url(#phoneScreen)" />

      <!-- Dynamic Island / Top Camera Notch -->
      <rect x="195" y="44" width="110" height="24" rx="12" fill="#000000" stroke="#1e293b" stroke-width="1" />
      <circle cx="288" cy="56" r="4.5" fill="#0284c7" opacity="0.8" />
      <circle cx="216" cy="56" r="3" fill="#1e293b" />

      <!-- Status Bar Elements -->
      <text x="100" y="60" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="700" fill="#e2e8f0">09:41</text>
      <!-- Signal 5G Icon -->
      <rect x="360" y="52" width="3" height="4" rx="1" fill="#e2e8f0" />
      <rect x="365" y="50" width="3" height="6" rx="1" fill="#e2e8f0" />
      <rect x="370" y="48" width="3" height="8" rx="1" fill="#e2e8f0" />
      <rect x="375" y="46" width="3" height="10" rx="1" fill="#e2e8f0" />
      <!-- Battery Icon -->
      <rect x="388" y="50" width="18" height="9" rx="2.5" fill="none" stroke="#e2e8f0" stroke-width="1.2" />
      <rect x="390" y="52" width="13" height="5" rx="1.5" fill="#10b981" />
      <path d="M407 53.5 C407.5 53.5 408 54 408 54.5 L408 55.5 C408 56 407.5 56.5 407 56.5 Z" fill="#e2e8f0" />

      <!-- Mobile Web Navbar Header (Matching Active Puskesmas Theme) -->
      <rect x="74" y="76" width="352" height="52" fill="${headerBgColor}" stroke="${primaryColor}" stroke-width="1" stroke-opacity="0.3" />
      <circle cx="102" cy="102" r="14" fill="${primaryColor}" />
      <text x="102" y="107" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="bold" fill="#ffffff">✚</text>
      <text x="124" y="98" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="800" fill="#ffffff">${escapeXmlStr(site.slice(0, 20).toUpperCase())}</text>
      <text x="124" y="112" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="8.5" font-weight="600" fill="#34d399">Portal Resmi Terverifikasi</text>

      <!-- Hamburger Menu Icon -->
      <line x1="392" y1="96" x2="408" y2="96" stroke="#ffffff" stroke-width="2" stroke-linecap="round" />
      <line x1="392" y1="102" x2="408" y2="102" stroke="#ffffff" stroke-width="2" stroke-linecap="round" />
      <line x1="392" y1="108" x2="408" y2="108" stroke="#ffffff" stroke-width="2" stroke-linecap="round" />

      <!-- Mobile URL Address Bar -->
      <rect x="86" y="136" width="328" height="26" rx="8" fill="#0f172a" stroke="#334155" stroke-width="1" />
      <text x="98" y="153" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" fill="#10b981">🔒</text>
      <text x="114" y="153" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="9.5" font-weight="500" fill="#94a3b8">${escapeXmlStr(fullUrl.replace(/^https?:\/\//, '').slice(0, 36))}</text>
      <text x="398" y="153" text-anchor="end" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="8.5" font-weight="700" fill="#34d399">SSL</text>

      <!-- Dynamic Page Body Content (Format Mobile) -->
      ${mobileBodySvg}

      <!-- Bottom Home Indicator Bar -->
      <rect x="190" y="582" width="120" height="4" rx="2" fill="#94a3b8" opacity="0.6" />
    </g>

    <!-- ============================================== -->
    <!-- RIGHT SIDE INFO & BRANDING SHOWCASE PANEL      -->
    <!-- ============================================== -->
    <g transform="translate(475, 0)">
      <!-- Government Accreditation Pill -->
      <rect x="0" y="38" width="410" height="34" rx="17" fill="${badgeBg}" stroke="${badgeBorder}" stroke-width="1.5" />
      <text x="18" y="60" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="800" fill="${badgeColor}" letter-spacing="0.5">
        ✓ ${badgeText}
      </text>

      <!-- Live Domain & SSL Banner -->
      <rect x="0" y="86" width="675" height="36" rx="10" fill="#0f172a" stroke="#334155" stroke-width="1" />
      <text x="18" y="109" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" fill="#10b981" font-weight="bold">🔒</text>
      <text x="40" y="109" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12.5" font-weight="600" fill="#e2e8f0">${escapeXmlStr(fullUrl)}</text>
      <rect x="580" y="93" width="80" height="22" rx="6" fill="#065f46" />
      <text x="620" y="108" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="700" fill="#a7f3d0">AKTIF SSL</text>

      <!-- Main Headline in Showcase Panel -->
      ${titleLines.map((line, i) => `<text x="0" y="${172 + (i * 44)}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="34" font-weight="800" fill="#ffffff">${escapeXmlStr(line)}</text>`).join('')}

      <!-- Description in Showcase Panel -->
      ${descLines.map((line, i) => `<text x="0" y="${268 + (i * 26)}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="400" fill="#cbd5e1">${escapeXmlStr(line)}</text>`).join('')}

      <!-- 3 Feature Highlight Badges Grid -->
      <g transform="translate(0, 365)">
        <rect x="0" y="0" width="215" height="76" rx="14" fill="#0f172a" stroke="#1e293b" stroke-width="1.5" />
        <circle cx="28" cy="28" r="14" fill="${primaryColor}" opacity="0.2" />
        <text x="28" y="33" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13">📱</text>
        <text x="50" y="32" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11.5" font-weight="700" fill="#ffffff">Format Mobile Asli</text>
        <text x="14" y="58" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" fill="#94a3b8">Sesuai tampilan live aplikasi</text>

        <rect x="230" y="0" width="215" height="76" rx="14" fill="#0f172a" stroke="#1e293b" stroke-width="1.5" />
        <circle cx="258" cy="28" r="14" fill="${primaryColor}" opacity="0.2" />
        <text x="258" y="33" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13">🎨</text>
        <text x="280" y="32" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11.5" font-weight="700" fill="#ffffff">Tema ${escapeXmlStr(themeName.slice(0, 10))}</text>
        <text x="244" y="58" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" fill="#94a3b8">Warna &amp; gaya identik sistem</text>

        <rect x="460" y="0" width="215" height="76" rx="14" fill="#0f172a" stroke="#1e293b" stroke-width="1.5" />
        <circle cx="488" cy="28" r="14" fill="#10b981" opacity="0.2" />
        <text x="488" y="33" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13">🏛️</text>
        <text x="510" y="32" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11.5" font-weight="700" fill="#ffffff">5 Klaster ILP</text>
        <text x="474" y="58" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" fill="#94a3b8">Permenkes RI No. 19/2024</text>
      </g>

      <!-- Bottom Watermark & Verification Line -->
      <line x1="0" y1="475" x2="675" y2="475" stroke="#334155" stroke-width="1" />
      <text x="0" y="515" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="800" fill="#10b981">
        ✓ ${escapeXmlStr(site.toUpperCase())}
      </text>
      <text x="0" y="540" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="500" fill="#94a3b8">
        Standar Pelayanan Minimal (SPM) • Terakreditasi Paripurna Kemenkes RI
      </text>
      
      <rect x="525" y="495" width="150" height="52" rx="10" fill="#064e3b" stroke="#10b981" stroke-width="1" />
      <text x="600" y="517" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="700" fill="#a7f3d0">PORTAL RESMI</text>
      <text x="600" y="535" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="800" fill="#ffffff">KEMENKES RI</text>
    </g>
  </svg>`;
}

function renderScreenshotPng(svg: string): Buffer {
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } });
  return resvg.render().asPng();
}
function getServerPostsList(): CmsItem[] {
  const dataStorePostsPath = path.join(process.cwd(), "data_store", "posts.json");
  try {
    if (fs.existsSync(dataStorePostsPath)) {
      const parsed = JSON.parse(fs.readFileSync(dataStorePostsPath, "utf-8"));
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error("Error reading data_store/posts.json:", err);
  }
  return [];
}

function saveServerPostsList(posts: CmsItem[]): boolean {
  try {
    const dataStorePostsPath = path.join(process.cwd(), "data_store", "posts.json");
    const dataStoreDir = path.join(process.cwd(), "data_store");
    if (!fs.existsSync(dataStoreDir)) fs.mkdirSync(dataStoreDir, { recursive: true });
    fs.writeFileSync(dataStorePostsPath, JSON.stringify(posts, null, 2), "utf-8");

    // Also sync to posts_meta.json
    const metaMap: Record<string, any> = {};
    for (const p of posts) {
      if (p && p.slug) {
        metaMap[p.slug] = {
          title: p.title || '',
          excerpt: p.excerpt || p.summary || '',
          featuredImage: p.featuredImage || p.coverImage || p.imageUrl || '',
          category: p.categoryName || p.category || 'Berita & Informasi',
          publishedAt: p.publishedAt || p.createdAt || ''
        };
      }
    }
    fs.writeFileSync(POSTS_META_FILE, JSON.stringify(metaMap, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("Error saving posts list:", err);
    return false;
  }
}
function getServerContactSettings() {
  try {
    if (fs.existsSync(CONTACT_SETTINGS_FILE)) {
      return JSON.parse(fs.readFileSync(CONTACT_SETTINGS_FILE, "utf-8"));
    }
  } catch (err) {
    console.error("Error reading contact settings file:", err);
  }
  
  // If contact settings file doesn't exist, generate default from site settings
  const site = getServerSiteSettings();
  const defaultContact = {
    name: site.siteName || "Puskesmas Mandiri Sejahtera",
    tagline: site.tagline || "Pelayanan Kesehatan Profesional, Ramah, dan Terjangkau",
    address: site.address || "Jl. Kesehatan Raya No. 45, Kecamatan Mandiri, Kabupaten Sejahtera",
    village: site.village || "Kelurahan Mandiri Sejahtera",
    district: site.district || "Kecamatan Mandiri",
    regency: site.regency || "Kabupaten Sejahtera",
    province: site.province || "Jawa Timur",
    postalCode: site.postalCode || "69400",
    latitude: site.latitude || -6.2088,
    longitude: site.longitude || 106.8456,
    mapEmbedUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3966.521260322283!2d106.81956137475038!3d-6.208763393792019!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e69f3e705b630fb%3A0xf51fae2db4bf7d1b!2sMonumen%20Nasional!5e0!3m2!1sid!2sid!4v1700000000000!5m2!1sid!2sid",
    externalMapUrl: "https://maps.google.com/?q=-6.2088,106.8456",
    timezone: site.timezone || "Asia/Jakarta",
    channels: [
      { id: "chn-1", label: "Telepon Puskesmas (Utama)", type: "Phone", value: site.phone || "(021) 555-0199", isPrimary: true, showOnWebsite: true, order: 1, icon: "Phone" },
      { id: "chn-2", label: "WhatsApp Pelayanan & Pendaftaran", type: "WhatsApp", value: site.whatsapp || "0812-3456-7890", isPrimary: true, showOnWebsite: true, order: 2, icon: "MessageSquare" },
      { id: "chn-3", label: "Email Layanan Pengaduan & Informasi", type: "Email", value: site.email || "info@puskesmas-mandiri.go.id", isPrimary: true, showOnWebsite: true, order: 3, icon: "Mail" },
      { id: "chn-4", label: "Website Resmi", type: "Website", value: "https://puskesmas-mandiri.go.id", isPrimary: false, showOnWebsite: true, order: 4, icon: "Globe" },
      { id: "chn-5", label: "Instagram Resmi", type: "Social Media", value: site.instagramUrl || "https://instagram.com/puskesmas_mandiri", isPrimary: false, showOnWebsite: true, order: 5, icon: "Instagram" },
      { id: "chn-6", label: "Facebook Page", type: "Social Media", value: site.facebookUrl || "https://facebook.com/puskesmas.mandiri", isPrimary: false, showOnWebsite: true, order: 6, icon: "Facebook" }
    ],
    operatingHours: [
      { day: "Monday", dayNameId: "Senin", isOpen: true, openTime: "07:30", closeTime: "16:00", notes: "Pendaftaran 07:30 - 14:00" },
      { day: "Tuesday", dayNameId: "Selasa", isOpen: true, openTime: "07:30", closeTime: "16:00", notes: "Pendaftaran 07:30 - 14:00" },
      { day: "Wednesday", dayNameId: "Rabu", isOpen: true, openTime: "07:30", closeTime: "16:00", notes: "Pendaftaran 07:30 - 14:00" },
      { day: "Thursday", dayNameId: "Kamis", isOpen: true, openTime: "07:30", closeTime: "16:00", notes: "Pendaftaran 07:30 - 14:00" },
      { day: "Friday", dayNameId: "Jumat", isOpen: true, openTime: "07:30", closeTime: "11:30", notes: "Istirahat Sholat Jumat" },
      { day: "Saturday", dayNameId: "Sabtu", isOpen: true, openTime: "07:30", closeTime: "13:00", notes: "Layanan Poliklinik & PONED" },
      { day: "Sunday", dayNameId: "Minggu", isOpen: false, openTime: "00:00", closeTime: "00:00", notes: "Tutup (UGD & Rawat Inap Buka 24 Jam)" }
    ],
    specialHours: [
      { id: "sp-1", date: "2026-08-17", title: "Hari Kemerdekaan RI", isOpen: false, notes: "Puskesmas Libur Nasional. Layanan Darurat UGD & Bersalin tetap buka 24 jam." }
    ],
    emergencyInfo: {
      title: "Layanan Darurat & UGD 24 Jam",
      description: "Untuk keadaan darurat medis mendesak, silakan langsung menuju Instalasi Gawat Darurat (UGD) Puskesmas atau hubungi hotline siaga darurat kami.",
      hotlineNumbers: ["(021) 555-0199", "0812-3456-7890"],
      locationNote: "Gedung Utama Sayap Timur (Akses Khusus Ambulans & Pasien Darurat)",
      showOnHomepage: true,
      showOnContactPage: true,
      showOnServicePages: true
    },
    updatedAt: new Date().toISOString()
  };

  try {
    fs.writeFileSync(CONTACT_SETTINGS_FILE, JSON.stringify(defaultContact, null, 2), "utf-8");
  } catch {}
  return defaultContact;
}

function saveServerContactSettings(data: Record<string, unknown>) {
  try {
    fs.writeFileSync(CONTACT_SETTINGS_FILE, JSON.stringify(data, null, 2), "utf-8");
    
    // Also synchronize back to site_settings.json
    try {
      if (fs.existsSync(SITE_SETTINGS_FILE)) {
        const site = JSON.parse(fs.readFileSync(SITE_SETTINGS_FILE, "utf-8"));
        if (data.name) site.siteName = data.name;
        if (data.tagline) site.tagline = data.tagline;
        if (data.address) site.address = data.address;
        if (data.village) site.village = data.village;
        if (data.district) site.district = data.district;
        if (data.regency) site.regency = data.regency;
        if (data.province) site.province = data.province;
        if (data.postalCode) site.postalCode = data.postalCode;
        if (data.latitude) site.latitude = data.latitude;
        if (data.longitude) site.longitude = data.longitude;
        if (data.timezone) site.timezone = data.timezone;

        if (Array.isArray(data.channels)) {
          const phoneCh = data.channels.find((c: ContactChannel) => c.type === 'Phone');
          if (phoneCh?.value) site.phone = phoneCh.value;
          const waCh = data.channels.find((c: ContactChannel) => c.type === 'WhatsApp');
          if (waCh?.value) site.whatsapp = waCh.value;
          const emailCh = data.channels.find((c: ContactChannel) => c.type === 'Email');
          if (emailCh?.value) site.email = emailCh.value;
        }
        site.updatedAt = new Date().toISOString();
        fs.writeFileSync(SITE_SETTINGS_FILE, JSON.stringify(site, null, 2), "utf-8");
      }
    } catch {}

    return true;
  } catch (err) {
    console.error("Error writing contact settings file:", err);
    return false;
  }
}

function getDataStoreFilePath(collectionName: string) {
  const sanitized = collectionName.replace(/[^a-zA-Z0-9_-]/g, "_");
  return path.join(DATA_STORE_DIR, `${sanitized}.json`);
}
async function buildAccurateVisualPrompt(prompt: string, title?: string, style?: string): Promise<{
  visualPrompt: string;
  enhancedDescription: string;
  source: string;
}> {
  let rawPrompt = (prompt || '').trim();
  if (!rawPrompt && title) {
    rawPrompt = `Pelayanan kesehatan ${title} di Puskesmas Indonesia`;
  }
  if (!rawPrompt) {
    rawPrompt = "Pelayanan kesehatan Puskesmas Indonesia ramah dan profesional";
  }

  // 1. First, try using the configured AI Provider (Gemini, Groq, DeepSeek, OpenAI, etc.)
  const aiConfig = getAIProviderConfig();
  const apiKey = aiConfig.apiKey || (aiConfig.provider === "gemini" ? process.env.GEMINI_API_KEY : "");
  
  if (apiKey) {
    try {
      const aiRes = await executeAICompletion({
        provider: aiConfig.provider || "gemini",
        endpointUrl: aiConfig.endpointUrl,
        apiKey,
        model: aiConfig.model || (aiConfig.provider === "gemini" ? "gemini-2.5-flash" : "gpt-4o-mini"),
        systemPrompt: "You are a professional visual prompt engineer for Indonesian healthcare centers (Puskesmas). Your job is to translate Indonesian descriptions into precise, realistic photographic English prompts for AI image generation. Never add cartoon elements or irrelevant fantasy items. Always preserve Indonesian local context like hijab, batik cadre uniform, hanging dacin scale, or modern Puskesmas clinic rooms.",
        userPrompt: `Translate and expand this Indonesian user description into a detailed photorealistic 16:9 English prompt: "${rawPrompt}". Requirements: authentic Indonesian people, natural lighting, documentary photography style, clean healthcare setting. Output ONLY the English prompt.`,
        temperature: 0.2
      });

      if (aiRes.text && aiRes.text.trim().length > 15) {
        const cleaned = aiRes.text.trim().replace(/^["']|["']$/g, '');
        return {
          visualPrompt: cleaned,
          enhancedDescription: cleaned,
          source: aiConfig.providerName || aiConfig.provider
        };
      }
    } catch (e: unknown) {
      console.warn("AI prompt enhancement failed, using semantic dictionary fallback:", (e as { message?: unknown })?.message || e);
    }
  }

  // 2. Fallback: Healthcare Context Semantic Translation + Online Translator
  const lower = rawPrompt.toLowerCase();
  const matchedTerms: string[] = [];
  for (const [idTerm, enTerm] of Object.entries(HEALTH_TERMS_MAP)) {
    if (lower.includes(idTerm)) {
      matchedTerms.push(enTerm);
    }
  }

  let baseTranslation = "";
  try {
    const transRes = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(rawPrompt)}&langpair=id|en`, {
      signal: AbortSignal.timeout(3500)
    });
    if (transRes.ok) {
      const transData = await transRes.json();
      const txt = transData?.responseData?.translatedText;
      if (txt && !txt.toLowerCase().includes("warning:") && txt.length > 3) {
        baseTranslation = txt;
      }
    }
  } catch {}

  const combinedPieces: string[] = [];
  if (baseTranslation) {
    combinedPieces.push(baseTranslation);
  }
  if (matchedTerms.length > 0) {
    combinedPieces.push(matchedTerms.join(", "));
  }
  if (combinedPieces.length === 0) {
    combinedPieces.push("Indonesian community healthcare center Puskesmas clinical service");
  }

  const resultEnglish = `Authentic Indonesian healthcare scene: ${combinedPieces.join(". Specifically featuring: ")}`;
  return {
    visualPrompt: resultEnglish,
    enhancedDescription: resultEnglish,
    source: "Kamus Kontekstual Kesehatan & Penerjemah Semantik"
  };
}
function replaceOrInsertMetaTag(html: string, attr: 'property' | 'name', key: string, content: string): string {
  const escapeAttr = (str: string) => String(str || '').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const regex = new RegExp(`<meta\\s+[^>]*${attr}=["']${key}["'][^>]*>`, 'i');
  const newTag = `<meta ${attr}="${key}" content="${escapeAttr(content)}" />`;
  if (regex.test(html)) {
    return html.replace(regex, newTag);
  }
  return html.replace('</head>', `  ${newTag}\n</head>`);
}

function generateShareHtml(options: {
  title: string;
  description: string;
  image: string;
  siteName: string;
  fullUrl: string;
  targetUrl: string;
  isSocialCrawler: boolean;
}): string {
  const escapeAttr = (str: string) => String(str || '').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeAttr(options.title)}</title>
  <meta name="description" content="${escapeAttr(options.description)}">
  
  <!-- Open Graph / WhatsApp Preview Meta Tags -->
  <meta property="og:site_name" content="${escapeAttr(options.siteName)}" />
  <meta property="og:title" content="${escapeAttr(options.title)}" />
  <meta property="og:description" content="${escapeAttr(options.description)}" />
  <meta property="og:image" content="${escapeAttr(options.image)}" />
  <meta property="og:image:secure_url" content="${escapeAttr(options.image)}" />
  <meta property="og:image:type" content="image/png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="${escapeAttr(options.title)}" />
  <meta property="og:url" content="${escapeAttr(options.fullUrl)}" />
  <meta property="og:type" content="website" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeAttr(options.title)}" />
  <meta name="twitter:description" content="${escapeAttr(options.description)}" />
  <meta name="twitter:image" content="${escapeAttr(options.image)}" />

  <!-- Automatic Client Redirection for Real Users (No meta-refresh to avoid crawler hijacking) -->
  <script>
    if (!/whatsapp|facebookexternalhit|facebot|twitterbot|telegrambot|linkedinbot|slackbot|discordbot/i.test(navigator.userAgent)) {
      window.location.replace(${JSON.stringify(options.targetUrl)});
    }
  </script>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; color: #1e293b; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
    .card { background: #ffffff; border-radius: 16px; padding: 32px 24px; max-width: 440px; width: 100%; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05); text-align: center; border: 1px solid #e2e8f0; }
    .badge { display: inline-block; background: #ecfdf5; color: #059669; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 9999px; margin-bottom: 14px; text-transform: uppercase; letter-spacing: 0.05em; }
    h1 { font-size: 18px; font-weight: 700; margin: 0 0 8px 0; color: #0f172a; line-height: 1.4; }
    p { font-size: 13px; color: #64748b; margin: 0 0 24px 0; line-height: 1.5; }
    .btn { display: inline-block; background: #059669; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 12px; font-size: 14px; font-weight: 600; transition: background 0.2s; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.2); }
    .btn:hover { background: #047857; }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">${escapeAttr(options.siteName)}</span>
    <h1>${escapeAttr(options.title)}</h1>
    <p>${escapeAttr(options.description)}</p>
    <a href="${escapeAttr(options.targetUrl)}" class="btn">Lanjutkan Membuka Halaman &rarr;</a>
  </div>
</body>
</html>`;
}

function renderHtmlWithMeta(req: express.Request, rawHtml: string): string {
  const headers = req?.headers || {};
  let proto = (headers['x-forwarded-proto'] as string) || req?.protocol || 'https';
  const host = (headers['x-forwarded-host'] as string) || (headers.host as string) || 'sumenep.puskesmasmanding.com';
  if (!host.includes('localhost') && !host.includes('127.0.0.1')) {
    proto = 'https';
  }
  const fullUrl = `${proto}://${host}${req?.originalUrl || req?.url || '/'}`;

  const query = req?.query || {};
  const queryTitle = (query.t || query.title || query.og_title || query.judul) as string;
  const queryDesc = (query.d || query.desc || query.description || query.og_desc || query.deskripsi) as string;
  const queryImage = (query.img || query.image || query.og_image || query.gambar) as string;
  const querySite = (query.site || query.site_name || query.instansi) as string;

  const settings = getServerSiteSettings();
  let siteName = querySite || settings.siteName || settings.shortName || 'Puskesmas Mandiri Sejahtera';
  const siteDesc = settings.siteDescription || settings.defaultSeoDescription || `Portal informasi dan pelayanan kesehatan resmi ${siteName}. Layanan kesehatan primer, pendaftaran online, berita kesehatan, jadwal dokter, microsite, dan pengaduan masyarakat.`;

  let defaultOgImg = settings.ogImageUrl || settings.logoUrl || '/og-image.png';
  if (defaultOgImg.startsWith('/')) {
    defaultOgImg = `${proto}://${host}${defaultOgImg}`;
  }

  let title = settings.siteTitle || `${siteName} - Portal Resmi & Pelayanan Terpadu`;
  let description = siteDesc;
  let image = `${proto}://${host}/api/preview-image.png?type=home&path=${encodeURIComponent(req.path || '/')}`;
  let type = "website";
  let pageType = "home";
  let targetSlug = "";

  const urlPath = req.path || '/';

  // 1. Microsites matching /m/:slug
  const micrositeMatch = urlPath.match(/^\/m\/([^\/]+)/);
  if (micrositeMatch) {
    pageType = "microsite";
    targetSlug = decodeURIComponent(micrositeMatch[1]);
    const microsites = getServerMicrositesMeta();
    const ms = microsites[targetSlug];
    if (ms && ms.name) {
      title = `${ms.name} - ${siteName}`;
      description = ms.description || `Portal resmi ${ms.name} pada ${siteName}. Akses informasi, panduan, dan layanan terpadu.`;
      if (ms.ogImageUrl && !query.screenshot) {
        let img = ms.ogImageUrl;
        if (img.startsWith('data:image/')) {
          image = `${proto}://${host}/api/og-image/${encodeURIComponent(targetSlug)}.png`;
        } else if (img.startsWith('/')) {
          image = `${proto}://${host}${img}`;
        } else {
          image = img;
        }
      } else {
        // High-fidelity screenshot card of this microsite
        image = `${proto}://${host}/api/preview-image.png?type=microsite&slug=${encodeURIComponent(targetSlug)}&path=${encodeURIComponent(urlPath)}`;
      }
    } else {
      const formattedSlug = targetSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      title = `Portal ${formattedSlug} - ${siteName}`;
      description = `Akses portal informasi dan layanan cepat ${formattedSlug} ${siteName}.`;
      image = `${proto}://${host}/api/preview-image.png?type=microsite&slug=${encodeURIComponent(targetSlug)}&path=${encodeURIComponent(urlPath)}`;
    }
  } 
  // 2. Berita matching /berita/:slug
  else if (urlPath.match(/^\/berita\/([^\/]+)/)) {
    pageType = "berita";
    const postMatch = urlPath.match(/^\/berita\/([^\/]+)/);
    if (postMatch) {
      targetSlug = decodeURIComponent(postMatch[1]);
      const posts = getServerPosts();
      const post = posts[targetSlug];
      if (post && post.title) {
        title = `${post.title} - ${siteName}`;
        description = post.excerpt || description;
        if (post.featuredImage && !query.screenshot) {
          let img = post.featuredImage;
          if (img.startsWith('data:image/')) {
            image = `${proto}://${host}/api/post-image/${encodeURIComponent(targetSlug)}.png`;
          } else if (img.startsWith('/')) {
            image = `${proto}://${host}${img}`;
          } else {
            image = img;
          }
        } else {
          image = `${proto}://${host}/api/post-image/${encodeURIComponent(targetSlug)}.png`;
        }
        type = "article";
      } else {
        const formattedTitle = targetSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        title = `${formattedTitle} - ${siteName}`;
        description = `Artikel dan publikasi informasi kesehatan masyarakat dari ${siteName}.`;
        image = `${proto}://${host}/api/post-image/${encodeURIComponent(targetSlug)}.png`;
        type = "article";
      }
    }
  }
  // 3. Layanan matching /layanan/:slug
  else if (urlPath.match(/^\/layanan\/([^\/]+)/)) {
    pageType = "layanan";
    const srvMatch = urlPath.match(/^\/layanan\/([^\/]+)/);
    if (srvMatch) {
      targetSlug = decodeURIComponent(srvMatch[1]);
      const services = getServerServices();
      const srv = services[targetSlug];
      if (srv) {
        title = `Layanan ${srv.name} - ${siteName}`;
        description = srv.description;
      } else {
        const formattedSrv = targetSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        title = `Layanan ${formattedSrv} - ${siteName}`;
        description = `Informasi persyaratan, prosedur, jadwal, dan ketentuan layanan ${formattedSrv} ${siteName}.`;
      }
      image = `${proto}://${host}/api/preview-image.png?type=layanan&slug=${encodeURIComponent(targetSlug)}&path=${encodeURIComponent(urlPath)}`;
    }
  }
  // 4. Layanan list /layanan
  else if (urlPath === '/layanan') {
    pageType = "layanan";
    title = `Standar Pelayanan Medis & Poliklinik - ${siteName}`;
    description = `Informasi lengkap seluruh poli dan unit rawat jalan berbasis 5 Klaster ILP di ${siteName}.`;
    image = `${proto}://${host}/api/preview-image.png?type=layanan&path=${encodeURIComponent(urlPath)}`;
  }
  // 5. Berita list /berita
  else if (urlPath === '/berita') {
    pageType = "berita";
    title = `Pusat Berita & Informasi Kesehatan Terkini - ${siteName}`;
    description = `Dapatkan informasi resmi seputar program kesehatan masyarakat, pekan imunisasi, edukasi pencegahan penyakit, dan kegiatan pelayanan ${siteName}.`;
    image = `${proto}://${host}/api/preview-image.png?type=berita&path=${encodeURIComponent(urlPath)}`;
  }
  // 6. Login Page /login
  else if (urlPath === '/login') {
    title = `Login Administrator - ${siteName}`;
    description = `Portal manajemen dan sistem kontrol terpadu ${siteName}.`;
    image = `${proto}://${host}/api/preview-image.png?type=login&path=${encodeURIComponent(urlPath)}`;
  }
  // 7. Profil /profil
  else if (urlPath === '/profil' || urlPath === '/visi-misi' || urlPath === '/struktur-organisasi' || urlPath === '/maklumat-pelayanan') {
    pageType = "profil";
    title = `Profil Instansi, Visi Misi & Maklumat - ${siteName}`;
    description = `Informasi profil kelembagaan, visi misi, sejarah, struktur organisasi, dan maklumat pelayanan resmi ${siteName}.`;
    image = `${proto}://${host}/api/preview-image.png?type=profil&path=${encodeURIComponent(urlPath)}`;
  }
  // 8. Kontak /kontak
  else if (urlPath === '/kontak') {
    pageType = "kontak";
    title = `Kontak Resmi, Jam Operasional & Lokasi - ${siteName}`;
    description = `Alamat lengkap, nomor telepon darurat 24 Jam, WhatsApp resmi, dan rute navigasi ke ${siteName}.`;
    image = `${proto}://${host}/api/preview-image.png?type=kontak&path=${encodeURIComponent(urlPath)}`;
  }
  // 9. Pengaduan /pengaduan
  else if (urlPath.startsWith('/pengaduan') || urlPath.startsWith('/kritik-saran') || urlPath.startsWith('/skm')) {
    pageType = "pengaduan";
    title = `Layanan Aspirasi, Pengaduan Masyarakat & SKM - ${siteName}`;
    description = `Sampaikan kritik, saran, apresiasi, dan pengaduan pelayanan publik ${siteName} melalui saluran resmi SP4N-LAPOR!.`;
    image = `${proto}://${host}/api/preview-image.png?type=pengaduan&path=${encodeURIComponent(urlPath)}`;
  }
  // 10. Pendaftaran Online /pendaftaran
  else if (urlPath.startsWith('/pendaftaran') || urlPath.startsWith('/antrian') || urlPath.startsWith('/antrian-display')) {
    pageType = "pendaftaran";
    title = `Pendaftaran Online & Antrean Pasien - ${siteName}`;
    description = `Daftar rawat jalan, pilih klaster pelayanan primer, dan pantau status nomor antrian real-time di ${siteName}.`;
    image = `${proto}://${host}/api/preview-image.png?type=pendaftaran&path=${encodeURIComponent(urlPath)}`;
  }
  // 11. Dokumen /dokumen
  else if (urlPath.startsWith('/dokumen')) {
    pageType = "dokumen";
    title = `Standar Pelayanan & Dokumen Publik - ${siteName}`;
    description = `Unduh dan baca standar operasional prosedur, maklumat pelayanan, serta dokumen regulasi publik ${siteName}.`;
    image = `${proto}://${host}/api/preview-image.png?type=dokumen&path=${encodeURIComponent(urlPath)}`;
  }
  // 12. Direktori Microsite /microsites
  else if (urlPath === '/microsites' || urlPath === '/m') {
    pageType = "microsite";
    title = `Direktori Portal & Microsite Terpadu - ${siteName}`;
    description = `Pusat tautan cepat program kesehatan masyarakat, posko informasi, dan layanan digital ${siteName}.`;
    image = `${proto}://${host}/api/preview-image.png?type=microsite&path=${encodeURIComponent(urlPath)}`;
  }

  // =========================================================================
  // UNIVERSAL DYNAMIC OVERRIDE:
  // If query parameters (?t=...&d=...&img=...) are present, they ALWAYS
  // take highest precedence! This ensures ANY link created on the fly
  // displays its exact custom title, description, and preview image!
  // =========================================================================
  if (queryTitle) {
    title = queryTitle.includes(siteName) ? queryTitle : `${queryTitle} - ${siteName}`;
  }
  if (queryDesc) {
    description = queryDesc;
  }
  if (queryImage) {
    let img = queryImage;
    if (img.startsWith('data:image/')) {
      if (pageType === 'berita' && targetSlug) {
        image = `${proto}://${host}/api/post-image/${encodeURIComponent(targetSlug)}.png`;
      } else if (pageType === 'microsite' && targetSlug) {
        image = `${proto}://${host}/api/og-image/${encodeURIComponent(targetSlug)}.png`;
      } else {
        image = defaultOgImg;
      }
    } else if (img.startsWith('/')) {
      image = `${proto}://${host}${img}`;
    } else {
      image = img;
    }
  }

  // Optimize Unsplash image URLs for WhatsApp (< 300KB limit)
  if (image.includes('images.unsplash.com') && !image.includes('w=')) {
    image = `${image}&w=600&h=315&q=75&fit=crop`;
  }

  const imageType = image.endsWith('.jpg') || image.endsWith('.jpeg') ? 'image/jpeg' : image.endsWith('.webp') ? 'image/webp' : 'image/png';
  const escapeAttr = (str: string) => String(str || '').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  let html = rawHtml;
  html = html.replace(/<title>.*?<\/title>/i, `<title>${escapeAttr(title)}</title>`);
  html = replaceOrInsertMetaTag(html, 'name', 'description', description);
  html = replaceOrInsertMetaTag(html, 'property', 'og:site_name', siteName);
  html = replaceOrInsertMetaTag(html, 'property', 'og:title', title);
  html = replaceOrInsertMetaTag(html, 'property', 'og:description', description);
  html = replaceOrInsertMetaTag(html, 'property', 'og:image', image);
  html = replaceOrInsertMetaTag(html, 'property', 'og:image:secure_url', image);
  html = replaceOrInsertMetaTag(html, 'property', 'og:image:type', imageType);
  html = replaceOrInsertMetaTag(html, 'property', 'og:image:width', '1200');
  html = replaceOrInsertMetaTag(html, 'property', 'og:image:height', '630');
  html = replaceOrInsertMetaTag(html, 'property', 'og:image:alt', title);
  html = replaceOrInsertMetaTag(html, 'property', 'og:url', fullUrl);
  html = replaceOrInsertMetaTag(html, 'property', 'og:type', type);
  html = replaceOrInsertMetaTag(html, 'name', 'twitter:card', 'summary_large_image');
  html = replaceOrInsertMetaTag(html, 'name', 'twitter:title', title);
  html = replaceOrInsertMetaTag(html, 'name', 'twitter:description', description);
  html = replaceOrInsertMetaTag(html, 'name', 'twitter:image', image);

  // Link image_src for scrapers
  if (!html.includes('rel="image_src"')) {
    html = html.replace('</head>', `  <link rel="image_src" href="${escapeAttr(image)}" />\n</head>`);
  } else {
    html = html.replace(/<link\s+rel=["']image_src["'][^>]*>/i, `<link rel="image_src" href="${escapeAttr(image)}" />`);
  }

  // Inject central server published theme CSS variables so that all browsers get identical theme instantly
  try {
    const publishedTheme = getServerThemePublished();
    const radiusValue = publishedTheme.radius === 'sharp' ? '0px' : publishedTheme.radius === 'pill' ? '24px' : '16px';
    const buttonRadiusValue = publishedTheme.buttonStyle === 'sharp' ? '0px' : publishedTheme.buttonStyle === 'pill' ? '9999px' : '12px';
    const themeStyleTag = `
<style id="server-theme-vars">
:root {
  --color-primary: ${publishedTheme.colorPrimary || '#18A878'};
  --color-primary-foreground: ${publishedTheme.colorPrimaryForeground || '#FFFFFF'};
  --color-secondary: ${publishedTheme.colorSecondary || '#DDF5EA'};
  --color-secondary-foreground: ${publishedTheme.colorSecondaryForeground || '#145A3B'};
  --color-accent: ${publishedTheme.colorAccent || '#27C7A5'};
  --color-accent-foreground: ${publishedTheme.colorAccentForeground || '#FFFFFF'};
  --color-bg: ${publishedTheme.colorBg || '#F8FCFA'};
  --color-text: ${publishedTheme.colorText || '#18332A'};
  --color-card: ${publishedTheme.colorCard || '#FFFFFF'};
  --color-surface: ${publishedTheme.colorSurface || publishedTheme.colorCard || '#FFFFFF'};
  --color-surface-foreground: ${publishedTheme.colorSurfaceForeground || publishedTheme.colorText || '#18332A'};
  --color-muted: ${publishedTheme.colorMuted || '#EEF6F2'};
  --color-muted-foreground: ${publishedTheme.colorMutedForeground || '#60756C'};
  --color-border: ${publishedTheme.colorBorder || '#D9E9E1'};
  --color-input: ${publishedTheme.colorInput || publishedTheme.colorBorder || '#D9E9E1'};
  --color-ring: ${publishedTheme.colorRing || publishedTheme.colorPrimary || '#18A878'};
  --color-success: ${publishedTheme.colorSuccess || '#16A34A'};
  --color-warning: ${publishedTheme.colorWarning || '#D97706'};
  --color-danger: ${publishedTheme.colorDanger || '#DC2626'};
  --color-info: ${publishedTheme.colorInfo || '#0284C7'};
  --theme-radius: ${radiusValue};
  --button-radius: ${buttonRadiusValue};
}
</style>
`;
    if (html.includes('</head>')) {
      html = html.replace('</head>', `${themeStyleTag}\n</head>`);
    }
  } catch (err) {
    console.error("Error injecting server theme:", err);
  }

  return html;
}

// Dedicated Smart Share Route for Instant Dynamic WhatsApp Preview and Smooth Human Redirection

export {
  MAX_UPLOAD_BYTES, UPLOAD_IMAGE_ALLOWLIST, detectUploadImageMime, safeUploadFileName, decodeBase64Image,
  getWhatsAppConfig, saveWhatsAppConfig, getWhatsAppLogs, saveWhatsAppLogs, normalizePhoneNumber, maskPhoneNumber,
  getAIProviderConfig, saveAIProviderConfig, executeAICompletion,
  getServerThemePublished, saveServerThemePublished, getServerThemeDraft, saveServerThemeDraft,
  getServerHomepagePublished, saveServerHomepagePublished, getServerHomepageDraft, saveServerHomepageDraft,
  getServerMicrosites, saveServerMicrosites, getServerMicrositeCategories, saveServerMicrositeCategories,
  getServerSiteSettings, saveServerSiteSettings, getServerMicrositesMeta, saveServerMicrositeMeta,
  saveServerPostMeta, getServerPosts, getServerServices,
  getServerPostsList, saveServerPostsList,
  getServerContactSettings, saveServerContactSettings, getDataStoreFilePath,
  escapeXmlStr, wrapSvgLines, generatePageScreenshotSvg, renderScreenshotPng,
  buildAccurateVisualPrompt,
  replaceOrInsertMetaTag, generateShareHtml, renderHtmlWithMeta, handlePostImageRequest,
};
export type { ExecuteAIParams };
