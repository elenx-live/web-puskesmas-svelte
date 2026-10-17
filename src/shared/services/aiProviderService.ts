import type { 
  AIProviderConfig, 
  AIProviderPreset, 
  AIProviderType, 
  ImageAIConfig, 
  ImageAIProviderPreset, 
  ImageAIProviderType, 
  TextAIConfig 
} from '../types/index.js';

export interface ImportArticleParams {
  url: string;
  sourceName?: string;
  rawText?: string;
  providerOverride?: Partial<AIProviderConfig>;
}

export interface ImportArticleResult {
  success: boolean;
  title: string;
  excerpt: string;
  content: string;
  tags: string[];
  providerUsed?: string;
  modelUsed?: string;
  fallback?: boolean;
  message?: string;
}

export interface TestProviderResult {
  success: boolean;
  message: string;
  latencyMs?: number;
  modelUsed?: string;
  reply?: string;
}

export const AI_PROVIDER_PRESETS: AIProviderPreset[] = [
  {
    id: 'gemini',
    name: 'Google Gemini (Google AI Studio)',
    endpointUrl: 'https://generativelanguage.googleapis.com',
    defaultModel: 'gemini-3.8-flash',
    placeholderKey: 'AIzaSy...',
    helpText: 'Dapatkan API key resmi di aistudio.google.com. Jika dikosongkan, server otomatis memakai default GEMINI_API_KEY.'
  },
  {
    id: 'groq',
    name: 'Groq Cloud (Llama 3.3 70B - Sangat Cepat & Kuota Luas)',
    endpointUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    placeholderKey: 'gsk_...',
    helpText: 'Dapatkan API key di console.groq.com. Sangat cepat, hemat, dan format kompatibel OpenAI.'
  },
  {
    id: 'deepseek',
    name: 'DeepSeek AI (DeepSeek Chat V3)',
    endpointUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    placeholderKey: 'sk-...',
    helpText: 'Dapatkan API key di platform.deepseek.com. Sangat ekonomis dan cerdas untuk bahasa Indonesia.'
  },
  {
    id: 'openai',
    name: 'OpenAI ChatGPT (GPT-4o-mini / GPT-4o)',
    endpointUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    placeholderKey: 'sk-proj-...',
    helpText: 'Dapatkan API key di platform.openai.com. Mendukung GPT-4o-mini, GPT-4o, dan model lainnya.'
  },
  {
    id: 'openrouter',
    name: 'OpenRouter (Multi-Provider Aggregator)',
    endpointUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'meta-llama/llama-3.3-70b-instruct',
    placeholderKey: 'sk-or-...',
    helpText: 'Dapatkan API key di openrouter.ai untuk mengakses Claude, Llama, Mistral, dan ratusan model lainnya.'
  },
  {
    id: 'custom',
    name: 'Kustom / OpenAI-Compatible (Ollama / Local / Proxy)',
    endpointUrl: 'http://localhost:11434/v1',
    defaultModel: 'llama3',
    placeholderKey: 'Kunci API (opsional jika server lokal)',
    helpText: 'Mendukung semua server AI dengan format endpoint OpenAI /chat/completions standar.'
  }
];

export const IMAGE_AI_PROVIDER_PRESETS: ImageAIProviderPreset[] = [
  {
    id: 'gemini',
    name: 'Google Imagen 3 (Google AI Studio)',
    endpointUrl: 'https://generativelanguage.googleapis.com',
    defaultModel: 'imagen-3.0-generate-002',
    placeholderKey: 'AIzaSy...',
    helpText: 'Generasi gambar fotorealistik berkualitas tinggi dari Google. Menggunakan kuota API Key Google AI Studio.'
  },
  {
    id: 'openai',
    name: 'OpenAI DALL-E 3',
    endpointUrl: 'https://api.openai.com/v1',
    defaultModel: 'dall-e-3',
    placeholderKey: 'sk-proj-...',
    helpText: 'Model generasi visual DALL-E 3 dari OpenAI dengan ketelitian visual tinggi.'
  },
  {
    id: 'stability',
    name: 'Stability AI (Stable Diffusion XL)',
    endpointUrl: 'https://api.stability.ai/v1',
    defaultModel: 'stable-diffusion-xl-1024-v1-0',
    placeholderKey: 'sk-...',
    helpText: 'Engine text-to-image Stable Diffusion XL dari Stability AI dengan kontrol artistik mendalam.'
  },
  {
    id: 'pollinations',
    name: 'Pollinations AI (Flux / Open Source)',
    endpointUrl: 'https://image.pollinations.ai',
    defaultModel: 'flux',
    placeholderKey: 'Tidak butuh API key (Gratis)',
    helpText: 'Model visual Flux bebas kuota dan tanpa registrasi API key. Siap pakai langsung.'
  },
  {
    id: 'custom',
    name: 'Custom Image API (OpenAI Compatible / Local)',
    endpointUrl: 'http://localhost:11434/v1',
    defaultModel: 'stable-diffusion',
    placeholderKey: 'Kunci API (opsional)',
    helpText: 'Endpoint custom text-to-image dengan format OpenAI /images/generations atau server lokal.'
  }
];

class AIProviderService {
  /**
   * Fetch current AI Provider configuration (Both Text and Image)
   */
  async getConfig(): Promise<AIProviderConfig & { presets: AIProviderPreset[]; imagePresets: ImageAIProviderPreset[] }> {
    try {
      const res = await fetch('/api/ai/provider-config');
      if (!res.ok) throw new Error('Gagal mengambil konfigurasi AI');
      const data = await res.json();
      return data;
    } catch (err) {
      console.warn('Using local fallback for AI config:', err);
      const defaultText: TextAIConfig = {
        provider: 'gemini',
        providerName: 'Google Gemini (Google AI Studio)',
        endpointUrl: 'https://generativelanguage.googleapis.com',
        apiKey: '',
        model: 'gemini-3.8-flash',
        temperature: 0.3,
        maxTokens: 2048,
        enabled: true
      };
      const defaultImage: ImageAIConfig = {
        provider: 'pollinations',
        providerName: 'Pollinations AI (Flux / Open Source)',
        endpointUrl: 'https://image.pollinations.ai',
        apiKey: '',
        model: 'flux',
        aspectRatio: '16:9',
        size: '1024x1024',
        enabled: true
      };
      return {
        text: defaultText,
        image: defaultImage,
        provider: 'gemini',
        providerName: 'Google Gemini (Google AI Studio)',
        endpointUrl: 'https://generativelanguage.googleapis.com',
        apiKey: '',
        model: 'gemini-3.8-flash',
        temperature: 0.3,
        enabled: true,
        presets: AI_PROVIDER_PRESETS,
        imagePresets: IMAGE_AI_PROVIDER_PRESETS
      };
    }
  }

  /**
   * Save updated AI Provider configuration (Text, Image, or Both)
   */
  async saveConfig(config: Partial<AIProviderConfig> | { category?: 'text' | 'image'; [key: string]: any }): Promise<{ success: boolean; message: string; config?: AIProviderConfig }> {
    const res = await fetch('/api/ai/provider-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Gagal menyimpan konfigurasi provider AI');
    }
    return data;
  }

  /**
   * Test connection to a specific provider or current settings (Text or Image)
   */
  async testProvider(params: {
    category?: 'text' | 'image';
    provider: string;
    endpointUrl?: string;
    apiKey?: string;
    model?: string;
  }): Promise<TestProviderResult> {
    const res = await fetch('/api/ai/test-provider', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Koneksi ke provider AI gagal');
    }
    return data;
  }

  /**
   * Fetch available models from provider
   */
  async fetchModels(params: {
    category?: 'text' | 'image';
    provider: string;
    endpointUrl?: string;
    apiKey?: string;
  }): Promise<{ success: boolean; models: string[]; provider?: string; sourceUrl?: string }> {
    const res = await fetch('/api/ai/fetch-models', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Gagal mengambil daftar model dari provider');
    }
    return data;
  }

  /**
   * Import news/article from web or social media
   */
  async importArticle(params: ImportArticleParams): Promise<ImportArticleResult> {
    const res = await fetch('/api/ai/import-article', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Gagal mengimpor artikel dengan AI');
    }
    return data;
  }

  /**
   * Check image generation capability of current AI provider
   */
  async getImageCapability(): Promise<{
    provider: string;
    providerName: string;
    model: string;
    hasKey: boolean;
    enabled?: boolean;
    supportsNativeImage: boolean;
    nativeEngine?: string | null;
    capabilityType: 'native_image' | 'llm_text_only';
    explanation: string;
    textProvider?: {
      provider: string;
      providerName: string;
      model: string;
    };
  }> {
    try {
      const res = await fetch('/api/ai/image-capability');
      if (!res.ok) throw new Error('Gagal memeriksa kapabilitas AI');
      return await res.json();
    } catch (err) {
      return {
        provider: 'gemini',
        providerName: 'Google Gemini Imagen 3',
        model: 'imagen-3.0-generate-002',
        hasKey: false,
        enabled: true,
        supportsNativeImage: true,
        nativeEngine: 'Google Imagen 3 (Gemini)',
        capabilityType: 'native_image',
        explanation: 'Provider Gemini memerlukan Kunci API resmi Google AI Studio untuk membuat gambar.'
      };
    }
  }

  /**
   * Generate AI image for article using configured image provider only
   */
  async generateImage(params: {
    prompt: string;
    title?: string;
    excerpt?: string;
    category?: string;
    style?: string;
  }): Promise<{
    success: boolean;
    url: string;
    promptUsed: string;
    enhancedPrompt?: string;
    enhancedDescription?: string;
    providerUsed: string;
    providerType: string;
    isNativeImageAI: boolean;
    supportMessage: string;
    style: string;
    needsConfiguration?: boolean;
  }> {
    const res = await fetch('/api/ai/generate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      const err: any = new Error(data.error || data.message || 'Gagal menghasilkan gambar AI');
      err.needsConfiguration = Boolean(data.needsConfiguration);
      err.provider = data.provider;
      throw err;
    }
    return data;
  }
}

export const aiProviderService = new AIProviderService();
