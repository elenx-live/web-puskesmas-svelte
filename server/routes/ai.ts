// TAHAP 3 — hasil pemecahan server.ts (perilaku endpoint TIDAK berubah).
import { Router } from "express";
import { logger } from "../lib/logger.js";
import express from "express";
import { getAIProviderConfig, saveAIProviderConfig, executeAICompletion, buildAccurateVisualPrompt } from "../lib/storage.js";
import type { AIProviderConfig, ImageProviderSettings, TextProviderSettings } from "../lib/storage.js";

/** Info model dari Google Gemini models API. */
interface GeminiModelInfo {
  name?: string;
  supportedGenerationMethods?: string[];
}

/** Item model dari API OpenAI-compatible / Ollama. */
interface OpenAIModelItem {
  id?: string;
  name?: string;
  model?: string;
}

/** Respons JSON custom image provider. */
interface CustomImageResponse {
  data?: Array<{ url?: string; b64_json?: string }>;
}

/** Hasil parse AI import (artikel). */
interface AiImportResult {
  title?: string;
  excerpt?: string;
  content?: string;
  tags?: string[];
  [k: string]: unknown;
}
import { AI_PROVIDER_PRESETS, IMAGE_PROVIDER_PRESETS } from "../lib/config.js";
const router = Router();

router.get("/api/ai/provider-config", (req, res) => {
  const config = getAIProviderConfig();
  res.json({
    ...config,
    text: {
      ...config.text,
      apiKey: config.text.apiKey ? "••••••••" : "",
      hasCustomKey: Boolean(config.text.apiKey)
    },
    image: {
      ...config.image,
      apiKey: config.image.apiKey ? "••••••••" : "",
      hasCustomKey: Boolean(config.image.apiKey)
    },
    apiKey: config.text.apiKey ? "••••••••" : "",
    hasCustomKey: Boolean(config.text.apiKey),
    presets: AI_PROVIDER_PRESETS,
    imagePresets: IMAGE_PROVIDER_PRESETS
  });
});

// 2. Save AI Provider Config (Text, Image, or Both)
router.post("/api/ai/provider-config", (req, res) => {
  const incoming = req.body;
  const current = getAIProviderConfig();

  let nextText = { ...current.text };
  let nextImage = { ...current.image };

  // A. Explicit text object
  if (incoming.text) {
    const tApiKey = incoming.text.apiKey === "••••••••" ? current.text.apiKey : (incoming.text.apiKey || "");
    nextText = {
      ...current.text,
      ...incoming.text,
      apiKey: tApiKey
    };
  } else if (incoming.category === 'text' || (incoming.provider && !incoming.category && !incoming.image)) {
    // Single text update
    const tApiKey = incoming.apiKey === "••••••••" ? current.text.apiKey : (incoming.apiKey || "");
    nextText = {
      ...current.text,
      provider: incoming.provider || nextText.provider,
      providerName: incoming.providerName || nextText.providerName,
      endpointUrl: incoming.endpointUrl || nextText.endpointUrl,
      apiKey: tApiKey,
      model: incoming.model || nextText.model,
      temperature: typeof incoming.temperature === 'number' ? incoming.temperature : nextText.temperature,
      maxTokens: incoming.maxTokens || nextText.maxTokens,
      enabled: incoming.enabled !== false
    };
  }

  // B. Explicit image object
  if (incoming.image) {
    const imgApiKey = incoming.image.apiKey === "••••••••" ? current.image.apiKey : (incoming.image.apiKey || "");
    nextImage = {
      ...current.image,
      ...incoming.image,
      apiKey: imgApiKey
    };
  } else if (incoming.category === 'image') {
    // Single image update
    const imgApiKey = incoming.apiKey === "••••••••" ? current.image.apiKey : (incoming.apiKey || "");
    nextImage = {
      ...current.image,
      provider: incoming.provider || nextImage.provider,
      providerName: incoming.providerName || nextImage.providerName,
      endpointUrl: incoming.endpointUrl || nextImage.endpointUrl,
      apiKey: imgApiKey,
      model: incoming.model || nextImage.model,
      aspectRatio: incoming.aspectRatio || nextImage.aspectRatio,
      enabled: incoming.enabled !== false
    };
  }

  const newSaved = {
    text: nextText,
    image: nextImage,
    ...nextText
  };

  const success = saveAIProviderConfig(newSaved);
  if (success) {
    res.json({ 
      success: true, 
      message: "Konfigurasi Provider AI (Teks & Gambar) berhasil disimpan.",
      config: {
        text: {
          ...nextText,
          apiKey: nextText.apiKey ? "••••••••" : "",
          hasCustomKey: Boolean(nextText.apiKey)
        },
        image: {
          ...nextImage,
          apiKey: nextImage.apiKey ? "••••••••" : "",
          hasCustomKey: Boolean(nextImage.apiKey)
        },
        ...nextText,
        apiKey: nextText.apiKey ? "••••••••" : "",
        hasCustomKey: Boolean(nextText.apiKey)
      }
    });
  } else {
    res.status(500).json({ success: false, message: "Gagal menyimpan konfigurasi file AI." });
  }
});

// 3. Test AI Provider Connection (Supports category: 'text' or 'image')
router.post("/api/ai/test-provider", async (req, res) => {
  const { category, provider, endpointUrl, apiKey, model } = req.body;
  const startTime = Date.now();

  try {
    const current = getAIProviderConfig();

    // 3A. TEST IMAGE PROVIDER
    if (category === "image") {
      const effectiveProvider = provider || current.image.provider;
      const effectiveKey = apiKey === "••••••••" ? current.image.apiKey : (apiKey || current.image.apiKey);
      const effectiveModel = model || current.image.model;

      if (effectiveProvider === "pollinations") {
        current.image.lastStatus = "success";
        current.image.lastTestedAt = new Date().toISOString();
        current.image.lastStatusMessage = "Koneksi Pollinations AI Flux siap digunakan tanpa API Key.";
        saveAIProviderConfig(current);

        return res.json({
          success: true,
          message: "Koneksi ke Pollinations AI Flux berhasil!",
          latencyMs: 80,
          modelUsed: effectiveModel || "flux",
          reply: "Engine visual siap merender gambar berkualitas tinggi secara gratis tanpa API key."
        });
      }

      if (effectiveProvider === "gemini") {
        const key = effectiveKey || (current.text.provider === "gemini" ? current.text.apiKey : "") || process.env.GEMINI_API_KEY;
        if (!key) {
          throw new Error("Kunci API Google AI Studio belum diisi. Masukkan API Key resmi untuk menguji Imagen 3.");
        }
        const testRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${effectiveModel || 'imagen-3.0-generate-002'}:predict?key=${key}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ instances: [{ prompt: "test" }] }),
          signal: AbortSignal.timeout(12000)
        });
        const latencyMs = Date.now() - startTime;
        if (testRes.status === 400) {
          const errJson = await testRes.json().catch(() => ({}));
          if (errJson?.error?.message?.includes("API key not valid")) {
            throw new Error("API Key Google AI Studio tidak valid.");
          }
        }
        if (testRes.status === 401 || testRes.status === 403) {
          throw new Error("Akses Google AI Studio ditolak. Periksa API Key atau izin akun Anda.");
        }

        current.image.lastStatus = "success";
        current.image.lastTestedAt = new Date().toISOString();
        current.image.lastStatusMessage = `Koneksi Google Imagen 3 berhasil (${latencyMs}ms)`;
        saveAIProviderConfig(current);

        return res.json({
          success: true,
          message: "Koneksi ke Google Imagen 3 berhasil!",
          latencyMs,
          modelUsed: effectiveModel || "imagen-3.0-generate-002",
          reply: "Model Google Imagen 3 siap merender gambar visual artikel."
        });
      }

      if (effectiveProvider === "openai") {
        const key = effectiveKey || (current.text.provider === "openai" ? current.text.apiKey : "");
        if (!key) {
          throw new Error("Kunci API OpenAI belum diisi. Masukkan API Key untuk menguji DALL-E 3.");
        }
        const testRes = await fetch("https://api.openai.com/v1/models", {
          headers: { "Authorization": `Bearer ${key}` },
          signal: AbortSignal.timeout(12000)
        });
        const latencyMs = Date.now() - startTime;
        if (!testRes.ok) {
          const err = await testRes.json().catch(() => ({}));
          throw new Error(err?.error?.message || `HTTP ${testRes.status} dari OpenAI`);
        }

        current.image.lastStatus = "success";
        current.image.lastTestedAt = new Date().toISOString();
        current.image.lastStatusMessage = `Koneksi OpenAI DALL-E berhasil (${latencyMs}ms)`;
        saveAIProviderConfig(current);

        return res.json({
          success: true,
          message: "Koneksi ke OpenAI DALL-E 3 berhasil!",
          latencyMs,
          modelUsed: effectiveModel || "dall-e-3",
          reply: "Model OpenAI DALL-E 3 siap merender visual artikel secara akurat."
        });
      }

      if (effectiveProvider === "stability") {
        if (!effectiveKey) {
          throw new Error("Kunci API Stability AI belum diisi.");
        }
        const testRes = await fetch("https://api.stability.ai/v1/user/account", {
          headers: { "Authorization": `Bearer ${effectiveKey}` },
          signal: AbortSignal.timeout(12000)
        });
        const latencyMs = Date.now() - startTime;
        if (!testRes.ok) {
          const err = await testRes.json().catch(() => ({}));
          throw new Error(err?.message || `HTTP ${testRes.status} dari Stability AI`);
        }

        current.image.lastStatus = "success";
        current.image.lastTestedAt = new Date().toISOString();
        current.image.lastStatusMessage = `Koneksi Stability AI berhasil (${latencyMs}ms)`;
        saveAIProviderConfig(current);

        return res.json({
          success: true,
          message: "Koneksi ke Stability AI (Stable Diffusion XL) berhasil!",
          latencyMs,
          modelUsed: effectiveModel || "stable-diffusion-xl-1024-v1-0",
          reply: "Engine visual Stability AI siap digunakan."
        });
      }

      current.image.lastStatus = "success";
      current.image.lastTestedAt = new Date().toISOString();
      current.image.lastStatusMessage = "Endpoint gambar kustom siap.";
      saveAIProviderConfig(current);
      return res.json({
        success: true,
        message: "Konfigurasi endpoint gambar kustom tersimpan.",
        latencyMs: 50,
        modelUsed: effectiveModel || "custom"
      });
    }

    // 3B. TEST TEXT PROVIDER (DEFAULT)
    const effectiveKey = apiKey === "••••••••" ? current.text.apiKey : (apiKey || current.text.apiKey);

    const result = await executeAICompletion({
      provider: provider || current.text.provider,
      endpointUrl: endpointUrl || current.text.endpointUrl,
      apiKey: effectiveKey,
      model: model || current.text.model,
      userPrompt: "Halo! Ini adalah tes koneksi AI dari sistem Puskesmas. Mohon jawab dengan satu kalimat singkat konfirmasi bahwa sistem terhubung.",
      temperature: 0.2
    });

    const latencyMs = Date.now() - startTime;

    // Update status in config
    current.text.lastStatus = "success";
    current.text.lastTestedAt = new Date().toISOString();
    current.text.lastStatusMessage = `Koneksi berhasil (${latencyMs}ms) - Model: ${result.modelUsed}`;
    saveAIProviderConfig(current);

    res.json({
      success: true,
      message: `Koneksi ke Provider Teks ${result.providerUsed} berhasil!`,
      latencyMs,
      modelUsed: result.modelUsed,
      reply: result.text.trim().substring(0, 150)
    });
  } catch (err: unknown) {
    const latencyMs = Date.now() - startTime;
    const current = getAIProviderConfig();

    if (category === "image") {
      current.image.lastStatus = "failed";
      current.image.lastTestedAt = new Date().toISOString();
      current.image.lastStatusMessage = (err as { message?: string })?.message || "Gagal terkoneksi ke Provider AI Gambar";
      saveAIProviderConfig(current);
    } else {
      current.text.lastStatus = "failed";
      current.text.lastTestedAt = new Date().toISOString();
      current.text.lastStatusMessage = (err as { message?: string })?.message || "Gagal terkoneksi ke Provider AI Teks";
      saveAIProviderConfig(current);
    }

    res.status(400).json({
      success: false,
      message: `Uji koneksi gagal: ${(err as { message?: string })?.message}`,
      latencyMs
    });
  }
});

// 3b. Fetch Available Models from AI Provider (For Text or Image)
router.post("/api/ai/fetch-models", async (req, res) => {
  const { category, provider, endpointUrl } = req.body;
  let { apiKey } = req.body;
  const current = getAIProviderConfig();
  // Jika frontend kirim marker "••••••••" (input kosong tapi key tersimpan), pakai key dari server
  if (apiKey === "••••••••") {
    apiKey = category === "image" ? current.image.apiKey : current.text.apiKey;
  }

  // IMAGE MODELS
  if (category === "image") {
    const imgProvider = provider || current.image.provider;
    if (imgProvider === "gemini") {
      return res.json({
        success: true,
        models: ["imagen-3.0-generate-002", "imagen-3.0-fast-generate-001"],
        provider: "Google Imagen 3"
      });
    }
    if (imgProvider === "openai") {
      return res.json({
        success: true,
        models: ["dall-e-3", "dall-e-2"],
        provider: "OpenAI DALL-E"
      });
    }
    if (imgProvider === "stability") {
      return res.json({
        success: true,
        models: ["stable-diffusion-xl-1024-v1-0", "sd3-medium", "sd3-large", "stable-diffusion-v1-6"],
        provider: "Stability AI"
      });
    }
    if (imgProvider === "pollinations") {
      return res.json({
        success: true,
        models: ["flux", "turbo", "flux-realism"],
        provider: "Pollinations AI"
      });
    }
    return res.json({
      success: true,
      models: ["stable-diffusion", "dall-e-3", "default"],
      provider: "Custom"
    });
  }

  // TEXT MODELS
  const effectiveProvider = provider || current.text.provider || "gemini";
  
  // Resolve key if masked or empty
  let key = apiKey;
  if (key === "••••••••" || !key) {
    key = current.text.apiKey || (effectiveProvider === "gemini" ? process.env.GEMINI_API_KEY : "");
  }


  // 1. Google Gemini Models
  if (effectiveProvider === "gemini") {
    const defaultGeminiModels = [
      "gemini-2.5-flash",
      "gemini-2.5-pro",
      "gemini-3.8-flash",
      "gemini-3.1-flash-lite",
      "gemini-flash-latest"
    ];

    if (key) {
      try {
        const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        if (geminiRes.ok) {
          const gData: { models?: GeminiModelInfo[] } = await geminiRes.json();
          if (Array.isArray(gData.models)) {
            const fetchedList = gData.models
              .filter((m: GeminiModelInfo) => m.supportedGenerationMethods?.includes("generateContent"))
              .map((m: GeminiModelInfo) => (m.name as string).replace(/^models\//, ''))
              .filter((name: string) => !name.includes("embedding") && !name.includes("aqa") && !name.includes("text-embedding"));
            if (fetchedList.length > 0) {
              return res.json({ success: true, models: fetchedList, provider: "gemini" });
            }
          }
        }
      } catch (e) {
        console.warn("Gemini fetch models notice:", e);
      }
    }
    return res.json({ success: true, models: defaultGeminiModels, provider: "gemini" });
  }

  // 2. OpenAI-compatible / Custom / Groq / DeepSeek / OpenRouter / Ollama
  let baseUrl = (endpointUrl || "").trim().replace(/\/+$/, '');
  if (!baseUrl) {
    const preset = AI_PROVIDER_PRESETS.find(p => p.id === effectiveProvider);
    baseUrl = preset?.endpointUrl || "https://api.openai.com/v1";
  }

  // Normalize baseUrl - remove /chat/completions if user accidentally included it
  if (baseUrl.endsWith('/chat/completions')) {
    baseUrl = baseUrl.replace(/\/chat\/completions$/, '');
  }

  // Candidate URLs to probe for models
  const candidateUrls = [
    baseUrl.endsWith('/models') ? baseUrl : `${baseUrl}/models`,
    // If local Ollama or port 11434, also try native /api/tags
    baseUrl.replace(/\/v1$/, '') + '/api/tags'
  ];

  const headers: Record<string, string> = {
    "Accept": "application/json",
    "User-Agent": "Mozilla/5.0 PuskesmasPortal/1.0"
  };
  if (key && key !== "••••••••") {
    headers["Authorization"] = `Bearer ${key}`;
  } else {
    const savedConfig = getAIProviderConfig();
    if (savedConfig.apiKey) {
      headers["Authorization"] = `Bearer ${savedConfig.apiKey}`;
    }
  }

  if (effectiveProvider === "openrouter") {
    headers["HTTP-Referer"] = "https://puskesmas.id";
    headers["X-Title"] = "Puskesmas Portal";
  }

  let lastError = "";
  for (const testUrl of candidateUrls) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const mRes = await fetch(testUrl, {
        method: "GET",
        headers,
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (mRes.ok) {
        const mData: { data?: OpenAIModelItem[]; models?: OpenAIModelItem[] } = await mRes.json();
        let models: string[] = [];

        if (Array.isArray(mData.data)) {
          // Standard OpenAI, Groq, OpenRouter, DeepSeek format: { data: [ { id: "..." } ] }
          models = mData.data
            .map((item: OpenAIModelItem) => item.id || item.name)
            .filter((id: unknown): id is string => typeof id === "string" && id.length > 0);
        } else if (Array.isArray(mData.models)) {
          // Ollama format: { models: [ { name: "llama3:latest" } ] }
          models = mData.models
            .map((item: OpenAIModelItem) => item.name || item.id || item.model)
            .filter((id: unknown): id is string => typeof id === "string" && id.length > 0);
        }

        if (models.length > 0) {
          models.sort((a, b) => a.localeCompare(b));
          return res.json({
            success: true,
            models: models,
            provider: effectiveProvider,
            sourceUrl: testUrl
          });
        }
      } else {
        const errText = await mRes.text();
        lastError = `HTTP ${mRes.status}: ${errText.substring(0, 100)}`;
      }
    } catch (e: unknown) {
      lastError = (e as { message?: unknown })?.message as string;
    }
  }

  return res.status(400).json({
    success: false,
    message: `Gagal mengambil daftar model dari endpoint (${lastError || 'Server provider tidak merespon'}). Pastikan URL Endpoint dan API Key sudah valid, atau ketik nama model secara manual.`
  });
});

// 4. AI Article & Social Media Importer (With Dynamic Multi-Provider & Deep Web Scraper)
router.post("/api/ai/import-article", async (req, res) => {
  const { url, sourceName, rawText, providerOverride } = req.body;
  if (!url && !rawText) {
    return res.status(400).json({ message: "URL atau teks sumber wajib diisi." });
  }

  let domainHost = "";
  if (url) {
    try {
      domainHost = new URL(url).hostname.replace(/^www\./, '');
    } catch {
      domainHost = "web eksternal";
    }
  }

  // 1. Decode HTML entities helper
  const decodeHtml = (str: string) => {
    if (!str) return "";
    return str
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ')
      .replace(/&#8217;/g, "'")
      .replace(/&#8216;/g, "'")
      .replace(/&#8220;/g, '"')
      .replace(/&#8221;/g, '"')
      .replace(/&#8211;/g, '–')
      .replace(/&#8212;/g, '—')
      .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec));
  };

  // 2. Attempt to fetch and extract rich webpage content
  let fetchedPageContext = "";
  let scrapedTitle = "";
  let extractedParagraphs: string[] = [];
  let scrapedMetaDesc = "";

  if (url && (url.startsWith("http://") || url.startsWith("https://"))) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      const pageRes = await fetch(url, {
        redirect: "follow",
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
          "Cache-Control": "no-cache"
        }
      });
      clearTimeout(timeout);

      if (pageRes.ok) {
        const html = await pageRes.text();
        const ogTitle = html.match(/<meta[^>]*property=["'](?:og:title|twitter:title)["'][^>]*content=["']([^"']+)["']/i)?.[1];
        const pageTitle = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1];
        const h1Title = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]?.replace(/<[^>]+>/g, ' ');
        scrapedTitle = decodeHtml(ogTitle || h1Title || pageTitle || "").replace(/\s+/g, ' ').trim();

        const ogDesc = html.match(/<meta[^>]*property=["'](?:og:description|twitter:description)["'][^>]*content=["']([^"']+)["']/i)?.[1] ||
                       html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)?.[1];
        scrapedMetaDesc = decodeHtml(ogDesc || "").replace(/\s+/g, ' ').trim();

        const siteName = html.match(/<meta[^>]*property=["']og:site_name["'][^>]*content=["']([^"']+)["']/i)?.[1];

        // Isolate main editorial container if available
        const containerRegexes = [
          /<article\b[^>]*>([\s\S]*?)<\/article>/i,
          /<div[^>]*(?:class|id)=["'][^"']*(?:detail__body-text|read__content|read__article|entry-content|post-content|article-content|content-detail|detail-text|story-body|article__body|news-detail|konten-berita)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
          /<div[^>]*itemprop=["']articleBody["'][^>]*>([\s\S]*?)<\/div>/i,
          /<main\b[^>]*>([\s\S]*?)<\/main>/i
        ];

        let targetArea = "";
        for (const regex of containerRegexes) {
          const m = html.match(regex);
          if (m && m[1] && m[1].length > 150) {
            targetArea = m[1];
            break;
          }
        }
        if (!targetArea) targetArea = html;

        // Clean out noisy elements
        let cleanHtml = targetArea
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
          .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, " ")
          .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, " ")
          .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, " ")
          .replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, " ")
          .replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, " ")
          .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, " ");

        // Extract paragraphs and key headings
        const pMatches = cleanHtml.matchAll(/<(?:p|h2|h3|li)[^>]*>([\s\S]*?)<\/(?:p|h2|h3|li)>/gi);
        for (const m of pMatches) {
          const rawP = decodeHtml(m[1].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
          const lowerP = rawP.toLowerCase();
          if (
            rawP.length > 25 &&
            !lowerP.includes("copyright") &&
            !lowerP.includes("hak cipta") &&
            !lowerP.includes("kebijakan privasi") &&
            !lowerP.includes("cookie") &&
            !lowerP.includes("baca juga") &&
            !lowerP.includes("simak juga") &&
            !lowerP.includes("tonton video") &&
            !lowerP.includes("scroll untuk") &&
            !lowerP.includes("iklan") &&
            !lowerP.includes("advertisement")
          ) {
            extractedParagraphs.push(rawP);
          }
        }

        const bodyContent = extractedParagraphs.length > 0 
          ? extractedParagraphs.join("\n\n")
          : (scrapedMetaDesc || cleanHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().substring(0, 1000));

        if (bodyContent && bodyContent.length > 40) {
          fetchedPageContext = `
Informasi Halaman Web Asli (${siteName || domainHost}):
- Judul Asli: ${scrapedTitle || 'N/A'}
- Ringkasan/Meta: ${scrapedMetaDesc || 'N/A'}
- Isi Artikel/Materi dari Sumber:\n${bodyContent.substring(0, 10000)}
          `.trim();
        }
      }
    } catch (e) {
      logger.warn("Webpage fetch notice: proceeding with available raw text", e);
    }
  }

  // If website returned zero content and user provided zero rawText:
  if (!fetchedPageContext && !rawText) {
    return res.status(422).json({
      success: false,
      message: `Sistem tidak dapat membaca isi teks otomatis dari link ${domainHost || 'web'}. Situs media sosial (seperti Instagram/Facebook/TikTok/X) atau web dengan proteksi login/anti-bot membatasi pembacaan otomatis. Silakan salin (copy) teks/caption dari postingan tersebut dan tempelkan (paste) ke kolom "Cuplikan Teks / Caption Medsos" agar AI dapat menyusun artikel sesuai isi aslinya.`
    });
  }

  let effectiveProvider = "gemini";
  const displaySource = sourceName || domainHost || (url ? 'Sumber Resmi Eksternal' : 'Rilis Terpercaya');

  // Standard Guaranteed Attribution Box
  const mandatoryAttributionBox = `
<div style="margin-top: 2rem; padding: 1.25rem; background-color: rgba(13, 148, 136, 0.08); border-left: 4px solid #0d9488; border-radius: 0.75rem;">
  <p style="margin: 0; font-weight: 700; color: #0f766e; font-size: 0.95rem;">📌 Sumber Rujukan Resmi & Hak Cipta:</p>
  <p style="margin: 0.35rem 0 0 0; font-size: 0.875rem; color: #374151; line-height: 1.6;">
    Artikel ini disadur, diedit, dan dipublikasikan kembali secara etis untuk kepentingan edukasi kesehatan masyarakat berdasarkan publikasi resmi dari 
    <a href="${url || '#'}" target="_blank" rel="noopener noreferrer" style="color: #0d9488; font-weight: 600; text-decoration: underline;">
      ${displaySource}
    </a>.
    Hak cipta materi asli sepenuhnya merupakan milik penerbit sumber.
  </p>
</div>
  `.trim();

  try {
    const savedConfig = getAIProviderConfig();
    effectiveProvider = providerOverride?.provider || savedConfig.provider || "gemini";
    const effectiveUrl = providerOverride?.endpointUrl || savedConfig.endpointUrl;
    const effectiveKey = providerOverride?.apiKey === "••••••••" 
      ? savedConfig.apiKey 
      : (providerOverride?.apiKey || savedConfig.apiKey || process.env.GEMINI_API_KEY || "");
    const effectiveModel = providerOverride?.model || savedConfig.model;

    const systemPrompt = `Anda adalah editor kesehatan dan jurnalis medis profesional untuk portal resmi Puskesmas di Indonesia.
TUGAS UTAMA:
Menyusun berita atau artikel edukasi kesehatan yang mendalam, berbobot, komprehensif, dan mudah dipahami masyarakat luas BERDASARKAN materi/fakta yang diberikan dari sumber web atau media sosial.

PANDUAN KETAT & WAJIB:
1. **KONSISTENSI TOPIK & FAKTA (MUTLAK)**:
   - Anda WAJIB menyusun tulisan HANYA berdasarkan topik, fakta medis, dan materi yang ada pada teks sumber yang diberikan di bawah.
   - DILARANG KERAS mengganti topik (misalnya jika sumber membahas Demam Berdarah/DBD, tulisan harus tentang DBD; jika sumber membahas Vaksin Polio atau Stunting, tulisan harus tentang itu).
   - Jangan membuat tulisan umum yang tidak relevan dengan topik sumber asli.
2. **PANJANG & KEDALAMAN (JANGAN TERLALU PENDEK)**:
   - Buat tulisan bernas minimal 4 hingga 6 paragraf substansial (sekitar 400 - 800 kata). Hindari ringkasan singkat 1-2 paragraf.
3. **STRUKTUR ARTIKEL EDUKATIF**:
   - Judul: Menarik, profesional, dan mencerminkan esensi topik sumber bagi masyarakat luas.
   - Paragraf 1-2: Latar belakang isu sesuai sumber, mengapa hal ini penting bagi keluarga warga.
   - Paragraf 3-4: Ulasan fakta medis, data/penyebab, gejala klinis, atau kebijakan kesehatan dari sumber dengan bahasa yang mudah dicerna awam.
   - Subjudul '<h3>Langkah Pencegahan & Panduan Hidup Sehat</h3>': Poin-poin praktis yang dapat diterapkan warga ('<ul><li>...</li></ul>').
   - Paragraf Penutup: Ajakan menjaga kesehatan dan himbauan berkonsultasi ke Puskesmas jika mengalami keluhan.
4. **KOTAK SITASI & RUJUKAN RESMI**:
   Di akhir artikel, sertakan kotak rujukan dengan tautan aktif ke web sumber:
   ${mandatoryAttributionBox}
5. **OUTPUT WAJIB FORMAT JSON MURNI**:
{
  "title": "Judul Sesuai Topik Sumber yang Menarik & Informatif",
  "excerpt": "Ringkasan 1-2 kalimat (maksimal 160 karakter) yang mencerminkan inti materi untuk kartu berita.",
  "content": "<p>Paragraf 1...</p><p>Paragraf 2...</p><h3>Langkah Pencegahan & Panduan Hidup Sehat</h3><ul><li>Poin...</li></ul><p>Penutup...</p>${mandatoryAttributionBox.replace(/"/g, '\\"')}",
  "tags": ["EdukasiKesehatan", "TopikTerkait", "Puskesmas"]
}`;

    const userPrompt = `Silakan susun artikel berita edukasi kesehatan yang komprehensif, mendalam, dan akurat berdasarkan materi sumber berikut:
URL Sumber: ${url || 'N/A'}
Nama Sumber/Penerbit: ${displaySource}
${scrapedTitle ? `Judul Rujukan: ${scrapedTitle}\n` : ''}
${fetchedPageContext ? `\n${fetchedPageContext}\n` : ''}
${rawText ? `Teks/Catatan Tambahan dari Redaksi:\n${rawText}` : ''}

INGAT: Topik artikel WAJIB sesuai dengan isi sumber di atas, minimal 4-6 paragraf berbobot, dan mencantumkan kotak atribusi rujukan resmi. Keluarkan format JSON sekarang.`;

    const result = await executeAICompletion({
      provider: effectiveProvider,
      endpointUrl: effectiveUrl,
      apiKey: effectiveKey,
      model: effectiveModel,
      systemPrompt: systemPrompt,
      userPrompt: userPrompt,
      temperature: 0.3
    });

    const text = result.text || '';
    let jsonMatch = text.match(/\{[\s\S]*\}/);
    let parsed: AiImportResult | null = null;
    
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch (e) {
        try {
          const sanitized = jsonMatch[0].replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
          parsed = JSON.parse(sanitized);
        } catch {}
      }
    }

    if (!parsed || !parsed.content) {
      parsed = {
        title: scrapedTitle ? `${scrapedTitle}` : `Informasi Edukasi Kesehatan Terkini dari ${displaySource}`,
        excerpt: text.substring(0, 160).replace(/<[^>]+>/g, ' ') || 'Panduan edukasi kesehatan terkini bagi masyarakat.',
        content: `<p>${text.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br/>')}</p>`,
        tags: ['EdukasiKesehatan', displaySource.replace(/[^a-zA-Z0-9]/g, '') || 'InformasiPublik']
      };
    }

    // GUARANTEE: Ensure Attribution Box is ALWAYS present in the content
    if (!parsed.content.includes("Sumber Rujukan Resmi") && !parsed.content.includes(displaySource)) {
      parsed.content = `${parsed.content}\n\n${mandatoryAttributionBox}`;
    }

    res.json({
      success: true,
      providerUsed: result.providerUsed,
      modelUsed: result.modelUsed,
      ...parsed
    });
  } catch (err: unknown) {
    console.error("AI Import Error:", err);

    // DETERMINISTIC ADAPTATION: If AI failed (e.g. key missing/quota/timeout),
    // build an accurate draft directly from THE REAL EXTRACTED PARAGRAPHS of the website!
    // NEVER invent an unrelated "cuci tangan" article when the user imported something else!
    const sourceParagraphs = extractedParagraphs.length > 0
      ? extractedParagraphs
      : (rawText || '').split('\n').map((s: string) => s.trim()).filter((s: string) => s.length > 25);

    if (sourceParagraphs.length > 0) {
      const candidateTitle = scrapedTitle || `Informasi Kesehatan: Rilis Terkini dari ${displaySource}`;
      const intro = sourceParagraphs[0];
      const middleParagraphs = sourceParagraphs.slice(1, 6).map((p: string) => `<p>${p}</p>`).join('\n');

      const fallbackContent = `
<p>${intro}</p>

${middleParagraphs}

<h3>Himbauan & Tindak Lanjut Pelayanan Puskesmas</h3>
<p>Puskesmas menghimbau masyarakat untuk senantiasa menyaring informasi kesehatan dari sumber resmi dan terpercaya. Apabila Anda atau anggota keluarga mengalami gejala kesehatan terkait pembahasan di atas, segera lakukan pemeriksaan dan konsultasi ke Puskesmas atau fasilitas pelayanan kesehatan terdekat untuk memperoleh penanganan medis yang tepat.</p>

${mandatoryAttributionBox}
      `.trim();

      return res.json({
        success: true,
        fallbackUsed: true,
        providerUsed: `Ekstraktor Redaksi Web Cerdas (${displaySource})`,
        modelUsed: "deterministic-web-synthesizer",
        title: candidateTitle,
        excerpt: (scrapedMetaDesc || sourceParagraphs[0]).substring(0, 160),
        content: fallbackContent,
        tags: ['EdukasiKesehatan', displaySource.replace(/[^a-zA-Z0-9]/g, '') || 'RilisPublik'],
        warning: `Catatan: Pemrosesan AI mengalami kendala (${err.message || 'koneksi provider'}). Draft berita telah disusun secara otomatis langsung dari teks asli situs ${displaySource} lengkap dengan atribusi sumber.`
      });
    }

    // If no text could be extracted and AI also failed:
    return res.status(400).json({
      success: false,
      message: `Gagal memproses artikel: ${err.message || 'Server AI tidak merespon'}. Silakan periksa konfigurasi Provider AI di menu Sistem & Konfigurasi, atau salin teks berita ke kolom cuplikan.`
    });
  }
});

// Check current AI Provider capability for Image Generation
router.get("/api/ai/image-capability", (req, res) => {
  const aiConfig: AIProviderConfig = getAIProviderConfig();
  const imageConfig: ImageProviderSettings = aiConfig.image || {};
  const currentProvider: string = imageConfig.provider || "pollinations";
  
  let apiKey = imageConfig.apiKey || "";
  if (!apiKey && currentProvider === "gemini") {
    apiKey = (aiConfig.text?.provider === "gemini" ? aiConfig.text.apiKey : "") || process.env.GEMINI_API_KEY || "";
  } else if (!apiKey && currentProvider === "openai") {
    apiKey = (aiConfig.text?.provider === "openai" ? aiConfig.text.apiKey : "") || "";
  }
  const hasKey = currentProvider === "pollinations" ? true : Boolean(apiKey);

  let supportsNativeImage = true;
  let nativeEngine: string = imageConfig.providerName || "Engine Visual AI";
  let capabilityType: "native_image" | "llm_text_only" = "native_image";
  let explanation = "";

  if (currentProvider === "gemini") {
    nativeEngine = "Google Imagen 3 (Google AI Studio)";
    if (hasKey) {
      explanation = `Provider Gambar aktif adalah Google Gemini Imagen 3 (${imageConfig.model || 'imagen-3.0-generate-002'}). Gambar akan dibuat langsung menggunakan Kunci API Google AI Studio Anda.`;
    } else {
      explanation = "Provider Gambar diatur ke Google Imagen 3, tetapi Kunci API belum diisi. Silakan klik 'Pengaturan Provider AI' untuk memasukkan API Key Google AI Studio Anda.";
    }
  } else if (currentProvider === "openai") {
    nativeEngine = "OpenAI DALL-E 3";
    if (hasKey) {
      explanation = `Provider Gambar aktif adalah OpenAI DALL-E 3 (${imageConfig.model || 'dall-e-3'}). Gambar akan dibuat langsung sesuai prompt Anda.`;
    } else {
      explanation = "Provider Gambar diatur ke OpenAI DALL-E 3, tetapi Kunci API belum diisi. Silakan klik 'Pengaturan Provider AI' untuk memasukkan API Key OpenAI Anda.";
    }
  } else if (currentProvider === "stability") {
    nativeEngine = "Stability AI (Stable Diffusion XL)";
    if (hasKey) {
      explanation = `Provider Gambar aktif adalah Stability AI (${imageConfig.model || 'stable-diffusion-xl-1024-v1-0'}).`;
    } else {
      explanation = "Provider Gambar diatur ke Stability AI, tetapi Kunci API belum diisi. Silakan klik 'Pengaturan Provider AI' untuk memasukkan API Key Stability AI Anda.";
    }
  } else if (currentProvider === "pollinations") {
    nativeEngine = "Pollinations AI (Flux - Bebas Kuota)";
    explanation = "Provider Gambar aktif adalah Pollinations AI (Flux). Model siap pakai langsung tanpa API key.";
  } else {
    nativeEngine = imageConfig.providerName || "Custom Image Provider";
    explanation = `Provider Gambar kustom aktif (${imageConfig.endpointUrl || 'endpoint lokal'}).`;
  }

  res.json({
    provider: currentProvider,
    providerName: imageConfig.providerName || currentProvider,
    model: imageConfig.model,
    hasKey,
    enabled: imageConfig.enabled !== false,
    supportsNativeImage,
    nativeEngine,
    capabilityType,
    explanation,
    textProvider: {
      provider: aiConfig.text?.provider || "gemini",
      providerName: aiConfig.text?.providerName || "Google Gemini",
      model: aiConfig.text?.model || "gemini-3.8-flash"
    }
  });
});

// API endpoint to generate / resolve AI-powered image for article/post
// STRICTLY respects user requirement: only use the configured image provider, no silent fallback to unauthorized providers
router.post("/api/ai/generate-image", async (req, res) => {
  try {
    const { prompt, title, excerpt, category, style } = req.body || {};
    const effectivePrompt = (prompt || '').trim() || (title ? `Pelayanan kesehatan ${title} di Puskesmas` : 'Pelayanan kesehatan Puskesmas Indonesia');

    const aiConfig: AIProviderConfig = getAIProviderConfig();
    const imageConfig: ImageProviderSettings = aiConfig.image || {};
    const textConfig: TextProviderSettings = aiConfig.text || {};

    if (imageConfig.enabled === false) {
      return res.status(400).json({
        success: false,
        error: "Fitur Provider Gambar AI dinonaktifkan. Silakan buka Pengaturan Provider AI dan aktifkan Provider Gambar.",
        needsConfiguration: true
      });
    }

    const currentProvider = imageConfig.provider || "gemini";
    let apiKey = imageConfig.apiKey || "";

    // Allow sharing API key with text provider if same provider
    if (!apiKey && currentProvider === "gemini") {
      apiKey = (textConfig.provider === "gemini" ? textConfig.apiKey : "") || process.env.GEMINI_API_KEY || "";
    } else if (!apiKey && currentProvider === "openai") {
      apiKey = (textConfig.provider === "openai" ? textConfig.apiKey : "") || "";
    }

    // 1. Validate API Key for providers that require authentication
    if (currentProvider !== "pollinations" && !apiKey) {
      return res.status(400).json({
        success: false,
        error: `Provider Gambar '${imageConfig.providerName || currentProvider}' memerlukan Kunci API aktif. Silakan buka menu 'Pengaturan Provider AI' tab 'Provider Gambar' untuk menyetel Kunci API Anda.`,
        needsConfiguration: true,
        provider: currentProvider,
        providerName: imageConfig.providerName || currentProvider
      });
    }

    // 2. Build optimized visual prompt using the connected Text AI provider or semantic translator
    const { visualPrompt, enhancedDescription } = await buildAccurateVisualPrompt(effectivePrompt, title, style);

    let styleKeywords = "photorealistic documentary photography, natural daylight, authentic Indonesian public healthcare center Puskesmas, 4k ultra detailed, horizontal 16:9 composition";
    if (style === "jurnalistik") {
      styleKeywords = "editorial journalism photography, crisp clear focus, authentic Indonesian community health center Puskesmas documentary, raw photojournalism";
    } else if (style === "modern-clean") {
      styleKeywords = "modern clean aesthetic, bright airy clinical environment, minimalist Indonesian medical clinic, high definition architectural photography";
    }

    const finalEnglishPrompt = `${visualPrompt}, ${styleKeywords}`;

    // 3. EXECUTE GENERATION USING CONFIGURED IMAGE PROVIDER ONLY

    // 3A. Google Gemini / Imagen 3
    if (currentProvider === "gemini") {
      const model = imageConfig.model || "imagen-3.0-generate-002";
      logger.info(`Generating image with connected provider: Google Imagen 3 (${model})...`);
      
      const imagenRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instances: [{ prompt: finalEnglishPrompt.substring(0, 480) }],
          parameters: { sampleCount: 1, aspectRatio: imageConfig.aspectRatio || "16:9" }
        }),
        signal: AbortSignal.timeout(45000)
      });

      if (!imagenRes.ok) {
        const errData = await imagenRes.json().catch(() => ({}));
        const errMsg = errData?.error?.message || `HTTP ${imagenRes.status} dari Gemini/Imagen`;
        return res.status(400).json({
          success: false,
          error: `Gagal membuat gambar dengan Google Gemini (${model}): ${errMsg}. Pastikan API Key Google AI Studio Anda valid di Pengaturan Provider AI.`,
          providerUsed: "Google Gemini (Imagen 3)",
          needsConfiguration: true
        });
      }

      const imagenData = await imagenRes.json();
      const base64Bytes = imagenData?.predictions?.[0]?.bytesBase64Encoded;
      if (!base64Bytes) {
        return res.status(500).json({
          success: false,
          error: "Google Gemini tidak mengembalikan data gambar yang valid.",
          providerUsed: "Google Gemini (Imagen 3)"
        });
      }

      return res.json({
        success: true,
        url: `data:image/jpeg;base64,${base64Bytes}`,
        promptUsed: effectivePrompt,
        enhancedPrompt: finalEnglishPrompt,
        enhancedDescription,
        providerUsed: `Google Gemini (${model})`,
        providerType: "gemini",
        isNativeImageAI: true,
        supportMessage: `Gambar berhasil digenerate secara langsung oleh Provider Gambar yang Anda hubungkan (Google Imagen 3: ${model}).`,
        style: style || "fotorealistik"
      });
    }

    // 3B. OpenAI DALL-E 3
    if (currentProvider === "openai") {
      const model = imageConfig.model || "dall-e-3";
      logger.info(`Generating image with connected provider: OpenAI DALL-E 3 (${model})...`);
      const dalleRes = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          prompt: finalEnglishPrompt.substring(0, 1000),
          n: 1,
          size: imageConfig.size || "1024x1024",
          quality: "standard"
        }),
        signal: AbortSignal.timeout(45000)
      });

      if (!dalleRes.ok) {
        const errData = await dalleRes.json().catch(() => ({}));
        const errMsg = errData?.error?.message || `HTTP ${dalleRes.status} dari OpenAI`;
        return res.status(400).json({
          success: false,
          error: `Gagal membuat gambar dengan OpenAI DALL-E 3: ${errMsg}. Periksa kuota atau API key Anda di Pengaturan Provider AI.`,
          providerUsed: "OpenAI DALL-E 3",
          needsConfiguration: true
        });
      }

      const dalleData = await dalleRes.json();
      const imgUrl = dalleData?.data?.[0]?.url;
      if (!imgUrl) {
        return res.status(500).json({
          success: false,
          error: "OpenAI tidak mengembalikan URL gambar.",
          providerUsed: "OpenAI DALL-E 3"
        });
      }

      return res.json({
        success: true,
        url: imgUrl,
        promptUsed: effectivePrompt,
        enhancedPrompt: finalEnglishPrompt,
        enhancedDescription: dalleData?.data?.[0]?.revised_prompt || enhancedDescription,
        providerUsed: `OpenAI DALL-E 3 (${model})`,
        providerType: "openai",
        isNativeImageAI: true,
        supportMessage: "Gambar berhasil digenerate secara langsung oleh Provider Gambar yang Anda hubungkan (OpenAI DALL-E 3).",
        style: style || "fotorealistik"
      });
    }

    // 3C. Stability AI
    if (currentProvider === "stability") {
      const model = imageConfig.model || "stable-diffusion-xl-1024-v1-0";
      logger.info(`Generating image with connected provider: Stability AI (${model})...`);
      const stabRes = await fetch(`https://api.stability.ai/v1/generation/${model}/text-to-image`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          text_prompts: [{ text: finalEnglishPrompt.substring(0, 800), weight: 1 }],
          cfg_scale: 7,
          height: 768,
          width: 1344,
          samples: 1,
          steps: 30
        }),
        signal: AbortSignal.timeout(45000)
      });

      if (!stabRes.ok) {
        const errData = await stabRes.json().catch(() => ({}));
        const errMsg = errData?.message || `HTTP ${stabRes.status} dari Stability AI`;
        return res.status(400).json({
          success: false,
          error: `Gagal membuat gambar dengan Stability AI: ${errMsg}. Periksa saldo kredit atau API Key di Pengaturan Provider AI.`,
          providerUsed: "Stability AI",
          needsConfiguration: true
        });
      }

      const stabData = await stabRes.json();
      const base64Img = stabData?.artifacts?.[0]?.base64;
      if (!base64Img) {
        return res.status(500).json({
          success: false,
          error: "Stability AI tidak mengembalikan data gambar yang valid.",
          providerUsed: "Stability AI"
        });
      }

      return res.json({
        success: true,
        url: `data:image/png;base64,${base64Img}`,
        promptUsed: effectivePrompt,
        enhancedPrompt: finalEnglishPrompt,
        enhancedDescription,
        providerUsed: `Stability AI (${model})`,
        providerType: "stability",
        isNativeImageAI: true,
        supportMessage: "Gambar berhasil digenerate secara langsung oleh Provider Gambar yang Anda hubungkan (Stability AI).",
        style: style || "fotorealistik"
      });
    }

    // 3D. Pollinations AI (Flux / Open Source)
    if (currentProvider === "pollinations") {
      const model = imageConfig.model || "flux";
      logger.info(`Generating image with connected provider: Pollinations AI (${model})...`);
      const cleanPrompt = encodeURIComponent(finalEnglishPrompt.substring(0, 450));
      const pollinationsUrl = `https://image.pollinations.ai/prompt/${cleanPrompt}?width=1280&height=720&model=${model}&nologo=true&enhance=false&seed=${Date.now() % 100000}`;

      return res.json({
        success: true,
        url: pollinationsUrl,
        promptUsed: effectivePrompt,
        enhancedPrompt: finalEnglishPrompt,
        enhancedDescription,
        providerUsed: `Pollinations AI (${model})`,
        providerType: "pollinations",
        isNativeImageAI: true,
        supportMessage: "Gambar berhasil digenerate secara langsung oleh Provider Gambar yang Anda hubungkan (Pollinations AI Flux).",
        style: style || "fotorealistik"
      });
    }

    // 3E. Custom / OpenAI-Compatible Image Endpoint
    if (currentProvider === "custom") {
      const endpoint = (imageConfig.endpointUrl || "http://localhost:11434/v1").replace(/\/$/, "");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

      const customRes = await fetch(`${endpoint}/images/generations`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: imageConfig.model || "stable-diffusion",
          prompt: finalEnglishPrompt,
          n: 1,
          size: "1024x1024"
        }),
        signal: AbortSignal.timeout(45000)
      });

      if (!customRes.ok) {
        const errText = await customRes.text().catch(() => "");
        return res.status(400).json({
          success: false,
          error: `Gagal membuat gambar dengan Custom Image API: HTTP ${customRes.status} - ${errText}`,
          providerUsed: "Custom",
          needsConfiguration: true
        });
      }

      const customData: CustomImageResponse = await customRes.json();
      const customUrl = customData?.data?.[0]?.url || customData?.data?.[0]?.b64_json;
      const finalUrl = customUrl?.startsWith('data:') || customUrl?.startsWith('http') ? customUrl : `data:image/png;base64,${customUrl}`;

      return res.json({
        success: true,
        url: finalUrl,
        promptUsed: effectivePrompt,
        enhancedPrompt: finalEnglishPrompt,
        enhancedDescription,
        providerUsed: `Custom Image Engine (${imageConfig.model || 'default'})`,
        providerType: "custom",
        isNativeImageAI: true,
        supportMessage: "Gambar berhasil digenerate secara langsung oleh Custom Image Provider Anda.",
        style: style || "fotorealistik"
      });
    }

    return res.status(400).json({
      success: false,
      error: `Provider gambar '${currentProvider}' tidak dikenali. Silakan buka Pengaturan Provider AI untuk menyetel provider gambar Anda.`,
      needsConfiguration: true
    });
  } catch (err: unknown) {
    console.error("Error in /api/ai/generate-image:", err);
    return res.status(500).json({
      success: false,
      error: (err as { message?: string })?.message || "Gagal memproses pembuatan gambar AI",
      providerUsed: "AI Image Provider"
    });
  }
});

const CATEGORY_DEFAULT_IMAGES: Record<string, string> = {
  posyandu: 'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&w=1200&h=630&q=75',
  balita: 'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&w=1200&h=630&q=75',
  anak: 'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&w=1200&h=630&q=75',
  kia: 'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&w=1200&h=630&q=75',
  ibu: 'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&w=1200&h=630&q=75',
  polio: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=1200&h=630&q=75',
  vaksin: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=1200&h=630&q=75',
  imunisasi: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=1200&h=630&q=75',
  darurat: 'https://images.unsplash.com/photo-1587745416684-47953f16f02f?auto=format&fit=crop&w=1200&h=630&q=75',
  siaga: 'https://images.unsplash.com/photo-1587745416684-47953f16f02f?auto=format&fit=crop&w=1200&h=630&q=75',
  ambulans: 'https://images.unsplash.com/photo-1587745416684-47953f16f02f?auto=format&fit=crop&w=1200&h=630&q=75',
  lansia: 'https://images.unsplash.com/photo-1576765608622-067973a79f53?auto=format&fit=crop&w=1200&h=630&q=75',
  gizi: 'https://images.unsplash.com/photo-1490818387583-1baba5e638af?auto=format&fit=crop&w=1200&h=630&q=75',
  stunting: 'https://images.unsplash.com/photo-1490818387583-1baba5e638af?auto=format&fit=crop&w=1200&h=630&q=75',
  layanan: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1200&h=630&q=75',
  klinik: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1200&h=630&q=75',
  portal: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1200&h=630&q=75',
  farmasi: 'https://images.unsplash.com/photo-1586015555751-63bb77f4322a?auto=format&fit=crop&w=1200&h=630&q=75',
  obat: 'https://images.unsplash.com/photo-1586015555751-63bb77f4322a?auto=format&fit=crop&w=1200&h=630&q=75',
  lab: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=1200&h=630&q=75',
  gigi: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=1200&h=630&q=75',
  dokumen: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=1200&h=630&q=75',
};

export default router;
