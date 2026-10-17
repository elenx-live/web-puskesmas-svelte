<!-- @component Kartu pengaturan provider AI teks & gambar — preset, uji koneksi, dan simpan konfigurasi. -->
<script lang="ts">
  import Card from '../../../shared/ui/Card.svelte';
  import Button from '../../../shared/ui/Button.svelte';
  import Badge from '../../../shared/ui/Badge.svelte';
  import Select from '../../../shared/ui/Select.svelte';
  import { toastStore } from '../../../shared/stores/toast.svelte.js';
  import {
    aiProviderService,
    AI_PROVIDER_PRESETS,
    IMAGE_AI_PROVIDER_PRESETS
  } from '../../../shared/services/aiProviderService.js';
  import type {
    AIProviderType,
    ImageAIProviderType
  } from '../../../shared/types/index.js';
  import {
    Cpu,
    Sparkles,
    Key,
    Globe,
    CheckCircle2,
    AlertTriangle,
    Eye,
    EyeOff,
    Zap,
    Activity,
    Save,
    HelpCircle,
    RefreshCw,
    Edit3,
    ListFilter,
    FileText,
    Image as ImageIcon,
    Palette
  } from 'lucide-svelte';

  interface TestResult {
    status: 'success' | 'error' | 'idle';
    message: string;
    latencyMs?: number;
    reply?: string;
  }

  let activeTab = $state<'text' | 'image'>('text');
  let loading = $state(false);
  let saving = $state(false);
  let testing = $state(false);

  // TEXT AI STATE
  let showTextApiKey = $state(false);
  let textProvider = $state<AIProviderType>('gemini');
  let textProviderName = $state('Google Gemini');
  let textEndpointUrl = $state('https://generativelanguage.googleapis.com');
  let textApiKey = $state('');
  let textHasCustomKey = $state(false);
  let textModel = $state('gemini-3.8-flash');
  let textAvailableModels = $state<string[]>([]);
  let textFetchingModels = $state(false);
  let textModelInputMode = $state<'select' | 'manual'>('manual');
  let textTestResult = $state<TestResult>({ status: 'idle', message: '' });

  // IMAGE AI STATE
  let showImageApiKey = $state(false);
  let imageProvider = $state<ImageAIProviderType>('pollinations');
  let imageProviderName = $state('Pollinations AI (Flux)');
  let imageEndpointUrl = $state('https://image.pollinations.ai');
  let imageApiKey = $state('');
  let imageHasCustomKey = $state(false);
  let imageModel = $state('flux');
  let imageAspectRatio = $state('16:9');
  let imageAvailableModels = $state<string[]>([]);
  let imageFetchingModels = $state(false);
  let imageModelInputMode = $state<'select' | 'manual'>('manual');
  let imageTestResult = $state<TestResult>({ status: 'idle', message: '' });

  const currentTextPreset = $derived(AI_PROVIDER_PRESETS.find((p) => p.id === textProvider));
  const currentImagePreset = $derived(IMAGE_AI_PROVIDER_PRESETS.find((p) => p.id === imageProvider));

  async function loadConfig() {
    loading = true;
    try {
      const cfg = await aiProviderService.getConfig();

      // Populate Text Config — JANGAN tampilkan API key di input (keamanan).
      // Input selalu kosong; user ketik key baru untuk mengganti. Indikator "tersimpan" dari hasCustomKey.
      if (cfg.text) {
        textProvider = cfg.text.provider || 'gemini';
        textProviderName = cfg.text.providerName || 'Google Gemini';
        textEndpointUrl = cfg.text.endpointUrl || 'https://generativelanguage.googleapis.com';
        textApiKey = '';
        textHasCustomKey = Boolean(cfg.text.hasCustomKey);
        textModel = cfg.text.model || 'gemini-3.8-flash';
        textTestResult = {
          status: cfg.text.lastStatus === 'success' ? 'success' : cfg.text.lastStatus === 'failed' ? 'error' : 'idle',
          message: cfg.text.lastStatusMessage || ''
        };
      } else if (cfg.provider) {
        textProvider = cfg.provider;
        textProviderName = cfg.providerName || 'Google Gemini';
        textEndpointUrl = cfg.endpointUrl || 'https://generativelanguage.googleapis.com';
        textApiKey = '';
        textHasCustomKey = Boolean(cfg.hasCustomKey);
        textModel = cfg.model || 'gemini-3.8-flash';
        textTestResult = {
          status: cfg.lastStatus === 'success' ? 'success' : cfg.lastStatus === 'failed' ? 'error' : 'idle',
          message: cfg.lastStatusMessage || ''
        };
      }

      // Populate Image Config
      if (cfg.image) {
        imageProvider = cfg.image.provider || 'pollinations';
        imageProviderName = cfg.image.providerName || 'Pollinations AI (Flux)';
        imageEndpointUrl = cfg.image.endpointUrl || 'https://image.pollinations.ai';
        imageApiKey = '';
        imageHasCustomKey = Boolean(cfg.image.hasCustomKey);
        imageModel = cfg.image.model || 'flux';
        imageAspectRatio = cfg.image.aspectRatio || '16:9';
        imageTestResult = {
          status: cfg.image.lastStatus === 'success' ? 'success' : cfg.image.lastStatus === 'failed' ? 'error' : 'idle',
          message: cfg.image.lastStatusMessage || ''
        };
      }
    } catch {
      toastStore.showToast('Gagal memuat konfigurasi provider AI', 'error');
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    loadConfig();
  });

  function handleSelectTextPreset(presetId: AIProviderType) {
    const preset = AI_PROVIDER_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    textProvider = preset.id;
    textProviderName = preset.name;
    textEndpointUrl = preset.endpointUrl;
    textModel = preset.defaultModel;
    textTestResult = { status: 'idle', message: '' };

    if (preset.id === 'gemini' && textApiKey !== '••••••••') {
      textApiKey = '';
    }
  }

  function handleSelectImagePreset(presetId: ImageAIProviderType) {
    const preset = IMAGE_AI_PROVIDER_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    imageProvider = preset.id;
    imageProviderName = preset.name;
    imageEndpointUrl = preset.endpointUrl;
    imageModel = preset.defaultModel;
    imageTestResult = { status: 'idle', message: '' };

    if (preset.id === 'pollinations') {
      imageApiKey = '';
    } else if (preset.id === 'gemini' && textProvider === 'gemini' && textApiKey) {
      if (!imageApiKey) imageApiKey = textApiKey;
    }
  }

  async function handleFetchTextModels() {
    if (!textEndpointUrl && textProvider !== 'gemini') {
      toastStore.showToast('URL Endpoint API wajib diisi terlebih dahulu untuk mengambil model', 'error');
      return;
    }

    textFetchingModels = true;
    try {
      const res = await aiProviderService.fetchModels({
        category: 'text',
        provider: textProvider,
        endpointUrl: textEndpointUrl,
        // Jika input kosong tapi ada key tersimpan, kirim marker agar backend pakai key yang tersimpan
        apiKey: textApiKey || (textHasCustomKey ? '••••••••' : '')
      });

      if (res.models && res.models.length > 0) {
        textAvailableModels = res.models;
        textModelInputMode = 'select';
        if (!res.models.includes(textModel)) {
          textModel = res.models[0];
        }
        toastStore.showToast(`Berhasil mengambil ${res.models.length} model teks dari provider!`, 'success');
      } else {
        toastStore.showToast('Tidak ada model yang ditemukan dari server provider.', 'error');
      }
    } catch (err: any) {
      toastStore.showToast(err.message || 'Gagal mengambil daftar model dari provider', 'error');
    } finally {
      textFetchingModels = false;
    }
  }

  async function handleFetchImageModels() {
    imageFetchingModels = true;
    try {
      const res = await aiProviderService.fetchModels({
        category: 'image',
        provider: imageProvider,
        endpointUrl: imageEndpointUrl,
        apiKey: imageApiKey || (imageHasCustomKey ? '••••••••' : '')
      });

      if (res.models && res.models.length > 0) {
        imageAvailableModels = res.models;
        imageModelInputMode = 'select';
        if (!res.models.includes(imageModel)) {
          imageModel = res.models[0];
        }
        toastStore.showToast(`Berhasil mengambil ${res.models.length} model gambar!`, 'success');
      }
    } catch (err: any) {
      toastStore.showToast(err.message || 'Gagal mengambil model visual', 'error');
    } finally {
      imageFetchingModels = false;
    }
  }

  async function handleTestConnection() {
    testing = true;

    if (activeTab === 'text') {
      textTestResult = { status: 'idle', message: 'Menguji koneksi ke Provider AI Teks...' };
      try {
        const res = await aiProviderService.testProvider({
          category: 'text',
          provider: textProvider,
          endpointUrl: textEndpointUrl,
          apiKey: textApiKey,
          model: textModel
        });

        textTestResult = {
          status: 'success',
          message: `${res.message} (${res.latencyMs}ms)`,
          latencyMs: res.latencyMs,
          reply: res.reply
        };
        toastStore.showToast('Koneksi ke Provider Teks Berhasil!', 'success');
      } catch (err: any) {
        textTestResult = {
          status: 'error',
          message: err.message || 'Gagal tersambung ke provider teks.'
        };
        toastStore.showToast('Koneksi teks gagal: ' + err.message, 'error');
      } finally {
        testing = false;
      }
    } else {
      imageTestResult = { status: 'idle', message: 'Menguji koneksi ke Provider AI Gambar...' };
      try {
        const res = await aiProviderService.testProvider({
          category: 'image',
          provider: imageProvider,
          endpointUrl: imageEndpointUrl,
          apiKey: imageApiKey,
          model: imageModel
        });

        imageTestResult = {
          status: 'success',
          message: `${res.message} (${res.latencyMs}ms)`,
          latencyMs: res.latencyMs,
          reply: res.reply
        };
        toastStore.showToast('Koneksi ke Provider Gambar Berhasil!', 'success');
      } catch (err: any) {
        imageTestResult = {
          status: 'error',
          message: err.message || 'Gagal tersambung ke provider gambar.'
        };
        toastStore.showToast('Koneksi gambar gagal: ' + err.message, 'error');
      } finally {
        testing = false;
      }
    }
  }

  async function handleSave() {
    saving = true;
    try {
      await aiProviderService.saveConfig({
        text: {
          provider: textProvider,
          providerName: textProviderName,
          endpointUrl: textEndpointUrl,
          apiKey: textApiKey,
          model: textModel,
          enabled: true
        },
        image: {
          provider: imageProvider,
          providerName: imageProviderName,
          endpointUrl: imageEndpointUrl,
          apiKey: imageApiKey,
          model: imageModel,
          aspectRatio: imageAspectRatio,
          enabled: true
        }
      });

      toastStore.showToast('Konfigurasi Provider AI (Teks & Gambar) berhasil disimpan!', 'success');
      await loadConfig();
    } catch (err: any) {
      toastStore.showToast(err.message || 'Gagal menyimpan pengaturan AI', 'error');
    } finally {
      saving = false;
    }
  }
</script>

<Card class="p-6 space-y-6 animate-in fade-in">
  <!-- Header -->
  <div class="border-b border-[var(--color-border)] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
    <div>
      <h3 class="text-base font-bold text-[var(--color-text)] flex items-center gap-2">
        <Sparkles class="w-5 h-5 text-[var(--color-primary)]" />
        <span>Pengaturan Provider AI (Teks & Gambar)</span>
      </h3>
      <p class="text-xs text-[var(--color-muted-foreground)] mt-1">
        Pisahkan konfigurasi AI pengolah teks (impor berita/chat) dan AI pembuat visual (generate gambar sampul) secara mandiri.
      </p>
    </div>
    <div class="flex items-center gap-2">
      <Badge variant={textTestResult.status === 'success' ? 'emerald' : 'slate'}>
        Teks: {textProviderName.split('(')[0].trim()}
      </Badge>
      <Badge variant={imageTestResult.status === 'success' ? 'emerald' : 'slate'}>
        Gambar: {imageProviderName.split('(')[0].trim()}
      </Badge>
    </div>
  </div>

  <!-- Navigation Tabs -->
  <div class="flex items-center p-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl">
    <button
      type="button"
      onclick={() => (activeTab = 'text')}
      class={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-semibold transition text-xs ${
        activeTab === 'text'
          ? 'bg-[var(--color-primary)] text-white shadow-sm'
          : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-text)]'
      }`}
    >
      <FileText class="w-4 h-4" />
      <span>1. Provider AI Teks (Impor & Chat)</span>
      {#if textHasCustomKey}<span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>{/if}
    </button>

    <button
      type="button"
      onclick={() => (activeTab = 'image')}
      class={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-semibold transition text-xs ${
        activeTab === 'image'
          ? 'bg-[var(--color-primary)] text-white shadow-sm'
          : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-text)]'
      }`}
    >
      <ImageIcon class="w-4 h-4" />
      <span>2. Provider AI Gambar (Text-to-Image)</span>
      {#if imageProvider === 'pollinations'}
        <span class="text-[10px] px-1.5 py-0.2 bg-white/20 rounded-md">Bebas Kuota</span>
      {:else if imageHasCustomKey}
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
      {/if}
    </button>
  </div>

  <!-- ----------------- TAB 1: TEXT AI PROVIDER ----------------- -->
  {#if activeTab === 'text'}
    <div class="space-y-5">
      <!-- Info notice -->
      <div class="p-3.5 rounded-2xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 text-[var(--color-primary)] flex items-start gap-3 text-xs">
        <Zap class="w-4 h-4 shrink-0 mt-0.5" />
        <div class="space-y-1">
          <p class="font-bold">Provider AI Teks (Impor Berita & Edukasi)</p>
          <p class="text-[11px] opacity-90 leading-relaxed">
            Digunakan untuk mengekstrak artikel berita kesehatan dari tautan website / media sosial, penulisan konten otomatis, serta perbaikan struktur naskah.
          </p>
        </div>
      </div>

      <!-- Provider Selector -->
      <div>
        <label class="block text-xs font-semibold text-[var(--color-text)] mb-2.5">
          Pilih Engine Provider Teks
        </label>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {#each AI_PROVIDER_PRESETS as preset (preset.id)}
            {@const isSelected = textProvider === preset.id}
            <button
              type="button"
              onclick={() => handleSelectTextPreset(preset.id)}
              class={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between ${
                isSelected
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 shadow-xs ring-1 ring-[var(--color-primary)]'
                  : 'border-[var(--color-border)] bg-[var(--color-bg)] hover:border-[var(--color-primary)]/50'
              }`}
            >
              <div class="flex items-center justify-between mb-1">
                <span class="font-bold text-xs text-[var(--color-text)]">{preset.name.split('(')[0].trim()}</span>
                {#if isSelected}<CheckCircle2 class="w-4 h-4 text-[var(--color-primary)]" />{/if}
              </div>
              <span class="text-[10px] text-[var(--color-muted-foreground)] line-clamp-1 font-mono">
                {preset.defaultModel}
              </span>
            </button>
          {/each}
        </div>
      </div>

      <!-- Provider Tip -->
      {#if currentTextPreset}
        <div class="p-3 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl flex items-start gap-2 text-[11px] text-[var(--color-muted-foreground)]">
          <HelpCircle class="w-4 h-4 text-[var(--color-primary)] shrink-0 mt-0.5" />
          <p class="leading-relaxed">{currentTextPreset.helpText}</p>
        </div>
      {/if}

      <!-- Fields -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
        <!-- Endpoint URL -->
        <div class="md:col-span-2">
          <label class="block text-xs font-semibold text-[var(--color-text)] mb-1" for="text-endpoint">
            URL Endpoint API Teks *
          </label>
          <div class="relative">
            <Globe class="w-4 h-4 text-[var(--color-muted-foreground)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="text-endpoint"
              type="url"
              bind:value={textEndpointUrl}
              placeholder="https://api.groq.com/openai/v1"
              class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none rounded-2xl pl-9 pr-4 py-2.5 text-xs text-[var(--color-text)] font-mono"
              required
            />
          </div>
        </div>

        <!-- API Key -->
        <div>
          <div class="flex items-center justify-between mb-1">
            <label class="text-xs font-semibold text-[var(--color-text)]" for="text-apikey">
              Kunci API Teks (API Key)
            </label>
            {#if textHasCustomKey}
              <span class="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                ✓ Kunci API tersimpan
              </span>
            {/if}
          </div>
          <div class="relative">
            <Key class="w-4 h-4 text-[var(--color-muted-foreground)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="text-apikey"
              type={showTextApiKey ? 'text' : 'password'}
              bind:value={textApiKey}
              placeholder={currentTextPreset?.placeholderKey || 'Masukkan API Key Anda'}
              class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none rounded-2xl pl-9 pr-10 py-2.5 text-xs text-[var(--color-text)] font-mono"
            />
            <button
              type="button"
              onclick={() => (showTextApiKey = !showTextApiKey)}
              class="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)] hover:text-[var(--color-text)]"
            >
              {#if showTextApiKey}<EyeOff class="w-4 h-4" />{:else}<Eye class="w-4 h-4" />{/if}
            </button>
          </div>
        </div>

        <!-- Model Name & Dynamic Model Fetcher -->
        <div>
          <div class="flex items-center justify-between mb-1">
            <label class="text-xs font-semibold text-[var(--color-text)]" for="text-model">
              Nama Model AI Teks *
            </label>
            <div class="flex items-center gap-2">
              {#if textAvailableModels.length > 0}
                <button
                  type="button"
                  onclick={() => (textModelInputMode = textModelInputMode === 'select' ? 'manual' : 'select')}
                  class="text-[11px] text-[var(--color-muted-foreground)] hover:text-[var(--color-text)] flex items-center gap-1"
                >
                  {#if textModelInputMode === 'select'}<Edit3 class="w-3 h-3" />{:else}<ListFilter class="w-3 h-3" />{/if}
                  <span>{textModelInputMode === 'select' ? 'Ketik Manual' : 'Pilih Dropdown'}</span>
                </button>
              {/if}
              <button
                type="button"
                onclick={handleFetchTextModels}
                disabled={textFetchingModels}
                class="text-[11px] font-semibold text-[var(--color-primary)] hover:underline flex items-center gap-1 disabled:opacity-50"
                title="Ambil daftar model aktif dari server provider"
              >
                <RefreshCw class={`w-3 h-3 ${textFetchingModels ? 'animate-spin' : ''}`} />
                <span>{textFetchingModels ? 'Menghubungi...' : 'Tarik Model'}</span>
              </button>
            </div>
          </div>

          {#if textAvailableModels.length > 0 && textModelInputMode === 'select'}
            <div class="space-y-1.5">
              <Select
                value={textModel}
                onchange={(e) => {
                  const v = (e.currentTarget as HTMLSelectElement).value;
                  if (v === '__manual__') {
                    textModelInputMode = 'manual';
                  } else {
                    textModel = v;
                  }
                }}
                options={[
                  ...textAvailableModels.map((m) => ({ value: m, label: m })),
                  { value: '__manual__', label: '✏️ Ketik Manual Model Lainnya...' }
                ]}
              />
            </div>
          {:else}
            <div class="relative">
              <Cpu class="w-4 h-4 text-[var(--color-muted-foreground)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="text-model"
                type="text"
                bind:value={textModel}
                placeholder="Contoh: llama-3.3-70b-versatile, gemini-3.8-flash, gpt-4o-mini"
                class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none rounded-2xl pl-9 pr-4 py-2.5 text-xs text-[var(--color-text)] font-mono"
                required
              />
            </div>
          {/if}
        </div>
      </div>

      <!-- Text Test Result Alert -->
      {#if textTestResult.status !== 'idle'}
        <div class={`p-3.5 rounded-2xl border flex items-start gap-2.5 ${
          textTestResult.status === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
            : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-400'
        }`}>
          {#if textTestResult.status === 'success'}
            <CheckCircle2 class="w-4 h-4 shrink-0 mt-0.5" />
          {:else}
            <AlertTriangle class="w-4 h-4 shrink-0 mt-0.5" />
          {/if}
          <div class="space-y-1">
            <p class="font-bold text-xs">{textTestResult.message}</p>
            {#if textTestResult.reply}
              <p class="text-[11px] opacity-80 font-mono italic">
                Respon: "{textTestResult.reply}"
              </p>
            {/if}
          </div>
        </div>
      {/if}
    </div>
  {/if}

  <!-- ----------------- TAB 2: IMAGE AI PROVIDER ----------------- -->
  {#if activeTab === 'image'}
    <div class="space-y-5">
      <!-- Info notice -->
      <div class="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-700 dark:text-purple-300 flex items-start gap-3 text-xs">
        <Palette class="w-4 h-4 shrink-0 mt-0.5 text-purple-600 dark:text-purple-400" />
        <div class="space-y-1">
          <p class="font-bold">Provider AI Gambar (Text-to-Image Visual Generator)</p>
          <p class="text-[11px] opacity-90 leading-relaxed">
            Bertanggung jawab penuh untuk membuat visual, foto dokumentasi Puskesmas, dan poster edukasi kesehatan berdasarkan prompt teks Anda. Sistem hanya akan menggunakan provider yang Anda tentukan di sini.
          </p>
        </div>
      </div>

      <!-- Image Provider Presets -->
      <div>
        <label class="block text-xs font-semibold text-[var(--color-text)] mb-2.5">
          Pilih Engine Provider Gambar
        </label>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {#each IMAGE_AI_PROVIDER_PRESETS as preset (preset.id)}
            {@const isSelected = imageProvider === preset.id}
            <button
              type="button"
              onclick={() => handleSelectImagePreset(preset.id)}
              class={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between ${
                isSelected
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 shadow-xs ring-1 ring-[var(--color-primary)]'
                  : 'border-[var(--color-border)] bg-[var(--color-bg)] hover:border-[var(--color-primary)]/50'
              }`}
            >
              <div class="flex items-center justify-between mb-1">
                <span class="font-bold text-xs text-[var(--color-text)]">{preset.name}</span>
                {#if isSelected}<CheckCircle2 class="w-3.5 h-3.5 text-[var(--color-primary)]" />{/if}
              </div>
              <span class="text-[11px] text-[var(--color-muted-foreground)] line-clamp-1 mb-1">
                {preset.helpText}
              </span>
              <span class="text-[10px] font-mono text-[var(--color-primary)]">
                Default Model: {preset.defaultModel}
              </span>
            </button>
          {/each}
        </div>
      </div>

      <!-- Image Provider Tip -->
      {#if currentImagePreset}
        <div class="p-3 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl flex items-start gap-2 text-[11px] text-[var(--color-muted-foreground)]">
          <HelpCircle class="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
          <p class="leading-relaxed">{currentImagePreset.helpText}</p>
        </div>
      {/if}

      <!-- Form Fields for Image AI -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
        <div class="md:col-span-2">
          <label class="block text-xs font-semibold text-[var(--color-text)] mb-1" for="image-endpoint">
            URL Endpoint Gambar
          </label>
          <div class="relative">
            <Globe class="w-4 h-4 text-[var(--color-muted-foreground)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="image-endpoint"
              type="url"
              bind:value={imageEndpointUrl}
              placeholder="https://image.pollinations.ai"
              class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none rounded-2xl pl-9 pr-4 py-2.5 text-xs text-[var(--color-text)] font-mono"
            />
          </div>
        </div>

        <!-- API Key -->
        {#if imageProvider !== 'pollinations'}
          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="text-xs font-semibold text-[var(--color-text)]" for="image-apikey">
                Kunci API Gambar (API Key) *
              </label>
              {#if imageHasCustomKey}
                <span class="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                  ✓ Kunci API tersimpan
                </span>
              {/if}
            </div>
            <div class="relative">
              <Key class="w-4 h-4 text-[var(--color-muted-foreground)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="image-apikey"
                type={showImageApiKey ? 'text' : 'password'}
                bind:value={imageApiKey}
                placeholder={currentImagePreset?.placeholderKey || 'Masukkan API Key Anda'}
                class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none rounded-2xl pl-9 pr-10 py-2.5 text-xs text-[var(--color-text)] font-mono"
              />
              <button
                type="button"
                onclick={() => (showImageApiKey = !showImageApiKey)}
                class="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)] hover:text-[var(--color-text)]"
              >
                {#if showImageApiKey}<EyeOff class="w-4 h-4" />{:else}<Eye class="w-4 h-4" />{/if}
              </button>
            </div>
          </div>
        {:else}
          <div class="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-700 dark:text-emerald-300 flex items-center gap-2 text-xs">
            <CheckCircle2 class="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>Pollinations AI Flux gratis tanpa API key dan bebas kuota.</span>
          </div>
        {/if}

        <!-- Model & Aspect Ratio -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="text-xs font-semibold text-[var(--color-text)]" for="image-model">
                Model Gambar
              </label>
              <button
                type="button"
                onclick={handleFetchImageModels}
                disabled={imageFetchingModels}
                class="text-[11px] font-semibold text-[var(--color-primary)] hover:underline flex items-center gap-1"
              >
                <RefreshCw class={`w-3 h-3 ${imageFetchingModels ? 'animate-spin' : ''}`} />
                <span>{imageFetchingModels ? 'Memuat...' : 'Daftar Model'}</span>
              </button>
            </div>

            {#if imageAvailableModels.length > 0 && imageModelInputMode === 'select'}
              <Select
                bind:value={imageModel}
                options={imageAvailableModels.map((m) => ({ value: m, label: m }))}
              />
            {:else}
              <div class="relative">
                <Palette class="w-3.5 h-3.5 text-[var(--color-muted-foreground)] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="image-model"
                  type="text"
                  bind:value={imageModel}
                  placeholder="imagen-3.0-generate-002, dall-e-3, flux"
                  class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none rounded-2xl pl-9 pr-4 py-2.5 text-xs text-[var(--color-text)] font-mono"
                />
              </div>
            {/if}
          </div>

          <div>
            <label class="block text-xs font-semibold text-[var(--color-text)] mb-1" for="image-aspect">
              Rasio Aspek Default
            </label>
            <Select
              bind:value={imageAspectRatio}
              options={[
                { value: '16:9', label: '16:9 (Landscape - Sampul Berita)' },
                { value: '1:1', label: '1:1 (Persegi / Square)' },
                { value: '4:3', label: '4:3 (Landscape Klasik)' }
              ]}
            />
          </div>
        </div>
      </div>

      <!-- Image Test Result Alert -->
      {#if imageTestResult.status !== 'idle'}
        <div class={`p-3.5 rounded-2xl border flex items-start gap-2.5 ${
          imageTestResult.status === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
            : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-400'
        }`}>
          {#if imageTestResult.status === 'success'}
            <CheckCircle2 class="w-4 h-4 shrink-0 mt-0.5" />
          {:else}
            <AlertTriangle class="w-4 h-4 shrink-0 mt-0.5" />
          {/if}
          <div class="space-y-1">
            <p class="font-bold text-xs">{imageTestResult.message}</p>
            {#if imageTestResult.reply}
              <p class="text-[11px] opacity-80 font-mono italic">
                {imageTestResult.reply}
              </p>
            {/if}
          </div>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Action Footer -->
  <div class="flex items-center justify-between pt-3 border-t border-[var(--color-border)]">
    <Button
      type="button"
      variant="outline"
      onclick={handleTestConnection}
      isLoading={testing}
      disabled={saving || loading}
      class="gap-2 text-xs"
    >
      <Activity class="w-4 h-4 text-[var(--color-primary)]" />
      Uji Koneksi {activeTab === 'text' ? 'AI Teks' : 'AI Gambar'}
    </Button>

    <Button
      type="button"
      variant="primary"
      onclick={handleSave}
      isLoading={saving}
      disabled={testing || loading}
      class="gap-1.5 text-xs"
    >
      <Save class="w-4 h-4" />
      Simpan Semua Konfigurasi
    </Button>
  </div>
</Card>
