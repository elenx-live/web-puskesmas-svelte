<!-- @component Field upload gambar studio microsite — drag & drop, kompresi otomatis, URL manual, & galeri preset. -->
<script lang="ts">
  import {
    Upload,
    Image as ImageIcon,
    Trash2,
    Sparkles,
    Link as LinkIcon,
    Check,
    RefreshCw,
    Eye,
    AlertCircle
  } from 'lucide-svelte';
  import {
    compressAndConvertToBase64,
    type ImagePresetItem,
    LOGO_PRESETS,
    HEADER_BANNER_PRESETS,
    BACKGROUND_PRESETS
  } from '../../../shared/utils/imageUtils.js';

  let {
    label,
    description,
    value,
    onChange,
    presetType = 'banner',
    aspectRatio = 'banner',
    placeholder = 'https://...',
    id
  }: {
    label: string;
    description?: string;
    value?: string;
    onChange: (url: string) => void;
    presetType?: 'logo' | 'banner' | 'background';
    aspectRatio?: 'square' | 'banner' | 'background' | 'free';
    placeholder?: string;
    id?: string;
  } = $props();

  let isProcessing = $state(false);
  let errorMessage = $state<string | null>(null);
  let showUrlInput = $state(false);
  let showPresets = $state(false);
  let manualUrl = $state('');
  let isDragging = $state(false);

  let fileInput: HTMLInputElement | null = $state(null);

  const presets: ImagePresetItem[] =
    presetType === 'logo'
      ? LOGO_PRESETS
      : presetType === 'background'
      ? BACKGROUND_PRESETS
      : HEADER_BANNER_PRESETS;

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      errorMessage = 'Berkas harus berupa gambar (JPG, PNG, WebP, atau SVG).';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      errorMessage = 'Ukuran berkas maksimal 10MB.';
      return;
    }

    errorMessage = null;
    isProcessing = true;

    try {
      // Configure compression based on usage
      const maxWidth = presetType === 'logo' ? 600 : presetType === 'background' ? 1920 : 1400;
      const maxHeight = presetType === 'logo' ? 600 : presetType === 'background' ? 1200 : 800;
      const quality = presetType === 'logo' ? 0.9 : 0.85;

      const compressedBase64 = await compressAndConvertToBase64(file, {
        maxWidth,
        maxHeight,
        quality,
        format: 'image/webp'
      });

      onChange(compressedBase64);
    } catch (err: any) {
      errorMessage = err.message || 'Gagal memproses gambar';
    } finally {
      isProcessing = false;
    }
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    isDragging = false;
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      handleFile(file);
    }
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    isDragging = true;
  }

  function handleDragLeave() {
    isDragging = false;
  }

  function handleApplyManualUrl() {
    if (manualUrl.trim()) {
      onChange(manualUrl.trim());
      manualUrl = '';
      showUrlInput = false;
      errorMessage = null;
    }
  }
</script>

<div class="space-y-2" id={id}>
  <div class="flex items-center justify-between">
    <div>
      <label class="text-[11px] font-bold text-slate-300 block">{label}</label>
      {#if description}<p class="text-[10px] text-slate-500">{description}</p>{/if}
    </div>
    <div class="flex items-center gap-1.5">
      <button
        type="button"
        onclick={() => (showPresets = !showPresets)}
        class={`px-2 py-1 rounded-lg text-[10px] font-semibold flex items-center gap-1 transition ${
          showPresets
            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
            : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800'
        }`}
      >
        <Sparkles class="w-3 h-3 text-amber-400" />
        <span>Preset Galeri</span>
      </button>
      <button
        type="button"
        onclick={() => (showUrlInput = !showUrlInput)}
        class={`px-2 py-1 rounded-lg text-[10px] font-semibold flex items-center gap-1 transition ${
          showUrlInput
            ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
            : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800'
        }`}
      >
        <LinkIcon class="w-3 h-3" />
        <span>Tautan URL</span>
      </button>
    </div>
  </div>

  <!-- Hidden File Input -->
  <input
    bind:this={fileInput}
    type="file"
    accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
    class="hidden"
    onchange={(e) => {
      const file = e.currentTarget.files?.[0];
      if (file) handleFile(file);
      e.currentTarget.value = '';
    }}
  />

  <!-- Current Preview or Upload Dropzone -->
  {#if value}
    <div class="relative group rounded-2xl overflow-hidden border border-slate-800 bg-slate-950/80 p-2 flex items-center gap-3">
      <!-- Thumbnail preview -->
      <div
        class={`shrink-0 overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center ${
          aspectRatio === 'square'
            ? 'w-16 h-16 rounded-xl'
            : aspectRatio === 'banner'
            ? 'w-24 h-14 rounded-lg'
            : 'w-20 h-14 rounded-lg'
        }`}
      >
        <img
          src={value}
          alt="Preview"
          referrerPolicy="no-referrer"
          class="w-full h-full object-cover"
        />
      </div>

      <!-- Info & Actions -->
      <div class="flex-1 min-w-0">
        <span class="text-[11px] font-semibold text-slate-300 block truncate">
          {value.startsWith('data:') ? 'Berkas Gambar Lokal (Tersimpan)' : value}
        </span>
        <span class="text-[9px] text-emerald-400 font-mono flex items-center gap-1 mt-0.5">
          <Check class="w-3 h-3" />
          <span>Gambar Aktif Terpasang</span>
        </span>
      </div>

      <div class="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onclick={() => fileInput?.click()}
          disabled={isProcessing}
          class="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          title="Ganti Gambar"
        >
          <RefreshCw class={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin text-emerald-400' : ''}`} />
        </button>
        <button
          type="button"
          onclick={() => onChange('')}
          class="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition"
          title="Hapus Gambar"
        >
          <Trash2 class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  {:else}
    <div
      ondrop={handleDrop}
      ondragover={handleDragOver}
      ondragleave={handleDragLeave}
      onclick={() => fileInput?.click()}
      onkeydown={(e) => e.key === 'Enter' && fileInput?.click()}
      role="button"
      tabindex="0"
      class={`p-4 rounded-2xl border-2 border-dashed cursor-pointer text-center transition flex flex-col items-center justify-center gap-2 ${
        isDragging
          ? 'border-emerald-500 bg-emerald-950/20'
          : 'border-slate-800 hover:border-slate-700 bg-slate-950/50 hover:bg-slate-950/80'
      }`}
    >
      {#if isProcessing}
        <div class="py-2 flex items-center gap-2 text-emerald-400 text-xs font-semibold">
          <RefreshCw class="w-4 h-4 animate-spin" />
          <span>Mengompresi & Memuat Gambar...</span>
        </div>
      {:else}
        <div class="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 group-hover:text-emerald-400 transition">
          <Upload class="w-4 h-4" />
        </div>
        <div class="space-y-0.5">
          <p class="text-xs font-semibold text-slate-300">
            <span class="text-emerald-400 hover:underline">Unggah dari Perangkat</span> atau seret gambar ke sini
          </p>
          <p class="text-[10px] text-slate-500">
            PNG, JPG, WebP, SVG • Otomatis dikompresi ringan & tajam
          </p>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Manual URL Input dropdown -->
  {#if showUrlInput}
    <div class="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2">
      <input
        type="text"
        bind:value={manualUrl}
        onkeydown={(e) => e.key === 'Enter' && handleApplyManualUrl()}
        placeholder={placeholder}
        class="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs font-mono focus:border-emerald-500 focus:outline-none"
      />
      <button
        type="button"
        onclick={handleApplyManualUrl}
        class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shrink-0"
      >
        Terapkan
      </button>
    </div>
  {/if}

  <!-- Preset Gallery Grid -->
  {#if showPresets}
    <div class="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
      <div class="flex items-center justify-between">
        <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Pilihan Preset Resmi Kesehatan
        </span>
        <span class="text-[9px] text-slate-500">Klik untuk langsung memasang</span>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {#each presets as item (item.id)}
          <div
            onclick={() => {
              onChange(item.url);
              showPresets = false;
            }}
            onkeydown={(e) => {
              if (e.key === 'Enter') {
                onChange(item.url);
                showPresets = false;
              }
            }}
            role="button"
            tabindex="0"
            class={`group relative rounded-xl overflow-hidden border cursor-pointer transition ${
              value === item.url
                ? 'border-emerald-500 ring-1 ring-emerald-500/40'
                : 'border-slate-800 hover:border-slate-700 bg-slate-900'
            }`}
          >
            <div class="h-16 w-full bg-slate-950 overflow-hidden">
              <img
                src={item.previewUrl}
                alt={item.name}
                referrerPolicy="no-referrer"
                class="w-full h-full object-cover group-hover:scale-105 transition duration-300"
              />
            </div>
            <div class="p-1.5 bg-slate-900/90 backdrop-blur-sm">
              <span class="text-[10px] font-semibold text-slate-300 block truncate">
                {item.name}
              </span>
              <span class="text-[8px] text-slate-500">{item.category}</span>
            </div>
            {#if value === item.url}
              <div class="absolute top-1 right-1 p-0.5 rounded-full bg-emerald-500 text-white shadow">
                <Check class="w-2.5 h-2.5" />
              </div>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Error Message -->
  {#if errorMessage}
    <div class="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] flex items-center gap-1.5">
      <AlertCircle class="w-3.5 h-3.5 shrink-0" />
      <span>{errorMessage}</span>
    </div>
  {/if}
</div>
