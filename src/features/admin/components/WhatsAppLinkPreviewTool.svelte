<!-- @component Generator tautan WhatsApp dengan pratinjau kartu + panduan Cloudflare Worker & Nginx. -->
<script lang="ts">
  import Card from '../../../shared/ui/Card.svelte';
  import Button from '../../../shared/ui/Button.svelte';
  import Input from '../../../shared/ui/Input.svelte';
  import Select from '../../../shared/ui/Select.svelte';
  import Badge from '../../../shared/ui/Badge.svelte';
  import { toastStore } from '../../../shared/stores/toast.svelte.js';
  import { micrositeService } from '../../../shared/services/micrositeService.js';
  import { siteSettingsService } from '../../../shared/services/siteSettingsService.js';
  import { postService } from '../../../shared/services/postService.js';
  import { serviceEngineService } from '../../../shared/services/serviceEngineService.js';
  import type { MicrositeEntity, PostEntity, ServiceEntity } from '../../../shared/types/index.js';
  import {
    Share2,
    Copy,
    Check,
    ExternalLink,
    MessageSquare,
    Globe,
    Terminal,
    AlertTriangle,
    Server,
    Sparkles,
    ShieldCheck,
    Send,
    Eye,
    Cloud,
    Zap,
    Image as ImageIcon,
    Camera,
    Layers,
    Newspaper,
    Stethoscope
  } from 'lucide-svelte';

  const PRESET_IMAGES = [
    { label: '📸 Screenshot Otomatis Halaman (Live Real-Page Mockup)', url: 'AUTO_SCREENSHOT' },
    { label: 'Posyandu Ibu & Balita', url: 'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&w=1200&h=630&q=75' },
    { label: 'Imunisasi Polio / Vaksin', url: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=1200&h=630&q=75' },
    { label: 'Posko Darurat & Ambulans', url: 'https://images.unsplash.com/photo-1587745416684-47953f16f02f?auto=format&fit=crop&w=1200&h=630&q=75' },
    { label: 'Layanan Poliklinik Dokter', url: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1200&h=630&q=75' },
    { label: 'Lansia Sehat & Posbindu', url: 'https://images.unsplash.com/photo-1576765608622-067973a79f53?auto=format&fit=crop&w=1200&h=630&q=75' },
    { label: 'Gizi & Balita Bebas Stunting', url: 'https://images.unsplash.com/photo-1490818387583-1baba5e638af?auto=format&fit=crop&w=1200&h=630&q=75' },
    { label: 'Logo Puskesmas Default', url: '/og-image.png' }
  ];

  type TargetType = 'microsite' | 'berita' | 'layanan' | 'pendaftaran' | 'home' | 'kontak' | 'pengaduan' | 'custom';

  const showToast = (msg: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') =>
    toastStore.showToast(msg, type);

  let microsites = $state<MicrositeEntity[]>([]);
  let posts = $state<PostEntity[]>([]);
  let services = $state<ServiceEntity[]>([]);

  let targetType = $state<TargetType>('microsite');
  let selectedMicrositeSlug = $state('');
  let selectedPostSlug = $state('');
  let selectedServiceSlug = $state('');

  let targetDomain = $state('https://puskesmas-mandiri.go.id');
  let title = $state('');
  let description = $state('');
  let imageUrl = $state('AUTO_SCREENSHOT');
  let customPath = $state('/m/posyandu');
  let siteName = $state('');

  let copiedSmart = $state(false);
  let copiedDirect = $state(false);
  let copiedWorker = $state(false);
  let activeTab = $state<'generator' | 'cloudflare' | 'vps_guide'>('generator');
  let previewDevice = $state<'mobile' | 'desktop'>('mobile');

  $effect(() => {
    const loadData = async () => {
      const [msList, postList, srvList] = await Promise.all([
        micrositeService.getMicrosites(),
        postService.getPosts(),
        serviceEngineService.getServices()
      ]);
      microsites = msList;
      posts = postList;
      services = srvList;

      const settings = siteSettingsService.getCachedSettings();
      const instansiName = settings.siteName || settings.shortName || 'Puskesmas Manding';
      siteName = instansiName;

      const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://puskesmas-mandiri.go.id';
      const customSiteUrl = (settings as any).siteUrl || (settings as any).canonicalUrl || '';
      const defaultDom = customSiteUrl && (customSiteUrl.startsWith('http://') || customSiteUrl.startsWith('https://'))
        ? customSiteUrl.replace(/\/+$/, '')
        : (currentOrigin.includes('localhost') ? 'https://puskesmas-mandiri.go.id' : currentOrigin);
      targetDomain = defaultDom;

      if (msList.length > 0) {
        const first = msList[0];
        selectedMicrositeSlug = first.slug;
        title = first.name;
        description = first.description || `Portal resmi informasi dan layanan ${first.name}.`;
        imageUrl = 'AUTO_SCREENSHOT';
      } else {
        title = settings.siteTitle || `${instansiName} - Pelayanan Kesehatan Terpadu`;
        description = settings.siteDescription || 'Portal informasi resmi dan pelayanan kesehatan primer.';
        imageUrl = 'AUTO_SCREENSHOT';
      }
    };
    loadData();
  });

  function handleTargetTypeChange(type: TargetType) {
    targetType = type;
    const settings = siteSettingsService.getCachedSettings();
    const instansiName = settings.siteName || settings.shortName || 'Puskesmas Manding';

    if (type === 'home') {
      title = settings.siteTitle || `${instansiName} - Portal Resmi`;
      description = settings.siteDescription || 'Pelayanan kesehatan primer terpadu, informasi dokter, jadwal poliklinik, dan pengaduan.';
      imageUrl = 'AUTO_SCREENSHOT';
    } else if (type === 'pendaftaran') {
      title = `Pendaftaran Online & Antrian Pasien - ${instansiName}`;
      description = 'Daftar rawat jalan, pilih klaster pelayanan primer, dan pantau nomor antrian transparan dari rumah.';
      imageUrl = 'AUTO_SCREENSHOT';
    } else if (type === 'kontak') {
      title = `Kontak Resmi & Jam Operasional - ${instansiName}`;
      description = 'Alamat lengkap, nomor darurat 24 Jam, WhatsApp layanan, dan petunjuk arah ke Puskesmas.';
      imageUrl = 'AUTO_SCREENSHOT';
    } else if (type === 'pengaduan') {
      title = `Layanan Pengaduan, Aspirasi & SKM - ${instansiName}`;
      description = 'Sampaikan masukan, apresiasi, dan pengaduan pelayanan publik secara mudah dan transparan.';
      imageUrl = 'AUTO_SCREENSHOT';
    } else if (type === 'berita') {
      if (posts.length > 0 && selectedPostSlug) {
        const p = posts.find((item) => item.slug === selectedPostSlug) || posts[0];
        title = p.title;
        description = p.excerpt || `Berita dan panduan kesehatan dari ${instansiName}.`;
        imageUrl = p.featuredImage || 'AUTO_SCREENSHOT';
      } else {
        title = `Pusat Berita & Informasi Kesehatan Terkini - ${instansiName}`;
        description = 'Rilis berita resmi, edukasi kesehatan masyarakat, dan program prioritas.';
        imageUrl = 'AUTO_SCREENSHOT';
      }
    } else if (type === 'layanan') {
      if (services.length > 0 && selectedServiceSlug) {
        const s = services.find((item) => item.slug === selectedServiceSlug) || services[0];
        title = `Layanan ${s.name} - ${instansiName}`;
        description = s.description || `Standar pelayanan medis poliklinik ${s.name} berbasis Klaster ILP.`;
        imageUrl = 'AUTO_SCREENSHOT';
      } else {
        title = `Standar Pelayanan Medis & Poliklinik - ${instansiName}`;
        description = 'Informasi lengkap seluruh unit layanan medis rawat jalan berbasis 5 Klaster ILP.';
        imageUrl = 'AUTO_SCREENSHOT';
      }
    } else if (type === 'microsite') {
      const ms = microsites.find((m) => m.slug === selectedMicrositeSlug) || microsites[0];
      if (ms) {
        title = ms.name;
        description = ms.description || `Akses layanan dan panduan terpadu ${ms.name}.`;
        imageUrl = 'AUTO_SCREENSHOT';
      }
    }
  }

  function handleSelectMicrosite(slug: string) {
    selectedMicrositeSlug = slug;
    const ms = microsites.find((m) => m.slug === slug);
    if (ms) {
      title = ms.name;
      description = ms.description || `Akses layanan dan panduan terpadu ${ms.name}.`;
      imageUrl = 'AUTO_SCREENSHOT';
    }
  }

  function handleSelectPost(slug: string) {
    selectedPostSlug = slug;
    const instansiName = siteName || 'Puskesmas Manding';
    if (!slug) {
      title = `Pusat Berita & Informasi Kesehatan - ${instansiName}`;
      description = 'Rilis berita resmi, edukasi kesehatan, dan jadwal kegiatan pelayanan primer.';
      imageUrl = 'AUTO_SCREENSHOT';
      return;
    }
    const p = posts.find((item) => item.slug === slug);
    if (p) {
      title = p.title;
      description = p.excerpt || `Berita dan edukasi kesehatan dari ${instansiName}.`;
      imageUrl = p.featuredImage || 'AUTO_SCREENSHOT';
    }
  }

  function handleSelectService(slug: string) {
    selectedServiceSlug = slug;
    const instansiName = siteName || 'Puskesmas Manding';
    if (!slug) {
      title = `Standar Pelayanan Medis - ${instansiName}`;
      description = 'Informasi lengkap seluruh unit pelayanan rawat jalan berbasis 5 Klaster ILP.';
      imageUrl = 'AUTO_SCREENSHOT';
      return;
    }
    const s = services.find((item) => item.slug === slug);
    if (s) {
      title = `Layanan ${s.name} - ${instansiName}`;
      description = s.description || `Informasi jadwal, persyaratan, dan alur pelayanan ${s.name}.`;
      imageUrl = 'AUTO_SCREENSHOT';
    }
  }

  function getResolvedTargetPath() {
    if (targetType === 'home') return '/';
    if (targetType === 'pendaftaran') return '/pendaftaran';
    if (targetType === 'kontak') return '/kontak';
    if (targetType === 'pengaduan') return '/pengaduan';
    if (targetType === 'microsite') return `/m/${selectedMicrositeSlug || 'portal'}`;
    if (targetType === 'berita') {
      return selectedPostSlug ? `/berita/${selectedPostSlug}` : '/berita';
    }
    if (targetType === 'layanan') {
      return selectedServiceSlug ? `/layanan/${selectedServiceSlug}` : '/layanan';
    }
    return customPath.startsWith('/') ? customPath : `/${customPath}`;
  }

  const resolvedPath = $derived(getResolvedTargetPath());
  const cleanDomain = $derived(targetDomain.replace(/\/+$/, ''));

  const isScreenshotMode = $derived(!imageUrl || imageUrl === 'AUTO_SCREENSHOT');

  const previewImageEndpoint = $derived(
    `/api/preview-image.png?title=${encodeURIComponent(title)}&desc=${encodeURIComponent(description)}&path=${encodeURIComponent(resolvedPath)}&type=${targetType}&slug=${encodeURIComponent(selectedMicrositeSlug || selectedPostSlug || selectedServiceSlug || '')}`
  );

  const resolvedPreviewImg = $derived(
    isScreenshotMode
      ? previewImageEndpoint
      : imageUrl.startsWith('data:image/') || imageUrl.startsWith('http')
        ? imageUrl
        : imageUrl.startsWith('/')
          ? `${cleanDomain}${imageUrl}`
          : imageUrl
  );

  function buildShareUrl() {
    const params = new URLSearchParams();
    if (title) params.set('t', title.trim());
    if (description) params.set('d', description.trim());
    if (!isScreenshotMode && imageUrl) {
      let img = imageUrl.trim();
      if (img.startsWith('data:image/')) {
        if (targetType === 'berita' && selectedPostSlug) {
          img = `${cleanDomain}/api/post-image/${encodeURIComponent(selectedPostSlug)}.png`;
        } else if (targetType === 'microsite' && selectedMicrositeSlug) {
          img = `${cleanDomain}/api/og-image/${encodeURIComponent(selectedMicrositeSlug)}.png`;
        } else {
          img = `${cleanDomain}/og-image.png`;
        }
      } else if (img.startsWith('/')) {
        img = `${cleanDomain}${img}`;
      }
      params.set('img', img);
    } else {
      params.set('screenshot', '1');
    }
    if (siteName) params.set('site', siteName.trim());
    params.set('to', resolvedPath);
    params.set('v', Date.now().toString(36));
    return `${cleanDomain}/share?${params.toString()}`;
  }

  const smartShareUrl = $derived(buildShareUrl());
  const directParamsUrl = $derived(
    `${cleanDomain}${resolvedPath}?t=${encodeURIComponent(title)}&d=${encodeURIComponent(description)}${!isScreenshotMode && imageUrl ? `&img=${encodeURIComponent(imageUrl)}` : '&screenshot=1'}&v=${Date.now().toString(36)}`
  );

  function handleCopySmart() {
    navigator.clipboard.writeText(smartShareUrl);
    copiedSmart = true;
    showToast('Smart Link WhatsApp (Bypass Cache & Screenshot Nyata) berhasil disalin!');
    setTimeout(() => (copiedSmart = false), 2500);
  }

  function handleCopyDirect() {
    navigator.clipboard.writeText(directParamsUrl);
    copiedDirect = true;
    showToast('Tautan langsung berparameter berhasil disalin!');
    setTimeout(() => (copiedDirect = false), 2500);
  }

  function handleOpenWhatsApp() {
    const text = `${title}\n${description ? description + '\n\n' : '\n'}${smartShareUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  }

  function handleOpenMetaDebugger() {
    window.open(`https://developers.facebook.com/tools/debug/sharing/?q=${encodeURIComponent(smartShareUrl)}`, '_blank', 'noopener,noreferrer');
  }

  function handleViewScreenshotFull() {
    window.open(previewImageEndpoint, '_blank');
  }

  const cloudflareWorkerCode = `/**
 * Cloudflare Worker: WhatsApp & Social Media Link Preview Injector
 * Berjalan di Cloudflare Edge Network terdekat dari crawler WhatsApp internasional (<10ms)
 * Route: puskesmas-mandiri.go.id/*
 */
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const userAgent = (request.headers.get("user-agent") || "").toLowerCase();
    const isBot = /whatsapp|facebookexternalhit|facebot|twitterbot|telegrambot|linkedinbot|slackbot|discordbot/i.test(userAgent);

    // Jika bukan bot WhatsApp / medsos, langsung teruskan ke VPS
    if (!isBot) {
      return fetch(request);
    }

    // Ambil response asli dari server VPS
    const response = await fetch(request);
    const contentType = response.headers.get("content-type") || "";

    // Hanya modifikasi jika bertipe text/html
    if (!contentType.includes("text/html")) {
      return response;
    }

    const query = url.searchParams;
    const siteName = query.get("site") || "BLUD Puskesmas Manding";
    let title = query.get("t") || query.get("title");
    let desc = query.get("d") || query.get("desc");
    let img = query.get("img") || query.get("image");

    // Jika rute /m/:slug tanpa parameter
    if (!title && url.pathname.startsWith("/m/")) {
      const slug = url.pathname.split("/")[2] || "";
      const formatted = slug.replace(/-/g, " ").replace(/\\b\\w/g, l => l.toUpperCase());
      title = \`Portal \${formatted} - \${siteName}\`;
      desc = \`Akses informasi, panduan, dan layanan terpadu \${formatted} di \${siteName}.\`;
    }

    if (!title && !desc && !img) {
      return response;
    }

    // Mengubah meta tag secara instan di Edge via Cloudflare HTMLRewriter
    const modified = new HTMLRewriter()
      .on("title", {
        element(e) { if (title) e.setInnerContent(title); }
      })
      .on('meta[property="og:title"]', {
        element(e) { if (title) e.setAttribute("content", title); }
      })
      .on('meta[property="og:description"]', {
        element(e) { if (desc) e.setAttribute("content", desc); }
      })
      .on('meta[name="description"]', {
        element(e) { if (desc) e.setAttribute("content", desc); }
      })
      .on('meta[property="og:image"]', {
        element(e) { if (img) e.setAttribute("content", img); }
      })
      .on('meta[property="og:image:secure_url"]', {
        element(e) { if (img) e.setAttribute("content", img); }
      })
      .on('meta[property="og:site_name"]', {
        element(e) { if (siteName) e.setAttribute("content", siteName); }
      })
      .transform(response);

    // Paksa browser/proxy agar tidak meng-cache respon bot
    const newHeaders = new Headers(modified.headers);
    newHeaders.set("Cache-Control", "no-cache, no-store, must-revalidate");
    return new Response(modified.body, {
      status: modified.status,
      statusText: modified.statusText,
      headers: newHeaders
    });
  }
};`;
</script>

<div class="space-y-6">
  <!-- Navigation Pills -->
  <div class="flex flex-wrap gap-2 p-1.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl w-fit">
    <button
      onclick={() => (activeTab = 'generator')}
      class={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
        activeTab === 'generator'
          ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow-sm'
          : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-text)]'
      }`}
    >
      <Sparkles class="w-3.5 h-3.5" />
      <span>Generator Tautan &amp; Pratinjau WhatsApp</span>
    </button>

    <button
      onclick={() => (activeTab = 'cloudflare')}
      class={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
        activeTab === 'cloudflare'
          ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow-sm'
          : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-text)]'
      }`}
    >
      <Cloud class="w-3.5 h-3.5 text-amber-400" />
      <span>Mekanisme Cloudflare Worker (Solusi Terbaik Luar Negeri)</span>
      <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-500 font-extrabold">
        Solusi Ampuh
      </span>
    </button>

    <button
      onclick={() => (activeTab = 'vps_guide')}
      class={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
        activeTab === 'vps_guide'
          ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow-sm'
          : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-text)]'
      }`}
    >
      <Server class="w-3.5 h-3.5" />
      <span>Panduan Nginx VPS</span>
    </button>
  </div>

  {#if activeTab === 'generator'}
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <!-- Left Column: Controls & Inputs (7 cols) -->
      <div class="lg:col-span-7 space-y-5">
        <Card class="p-5 border border-[var(--color-border)] rounded-3xl space-y-4 shadow-sm">
          <div class="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
            <div class="flex items-center gap-2.5">
              <div class="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                <MessageSquare class="w-4 h-4" />
              </div>
              <div>
                <h3 class="text-sm font-bold text-[var(--color-text)]">Konfigurasi Tautan WhatsApp</h3>
                <p class="text-[11px] text-[var(--color-muted-foreground)]">Pilih halaman yang ingin dibagikan atau sesuaikan teksnya</p>
              </div>
            </div>
            <Badge variant="emerald" size="sm">Bypass Cache Engine</Badge>
          </div>

          <!-- Domain Switcher -->
          <div class="space-y-1.5 p-3 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)]">
            <label class="text-xs font-bold text-[var(--color-text)] flex items-center gap-1.5" for="wa-domain">
              <Globe class="w-3.5 h-3.5 text-sky-400" />
              <span>Domain Publik Produksi (Untuk Crawler WhatsApp)</span>
            </label>
            <Input
              id="wa-domain"
              bind:value={targetDomain}
              placeholder="https://puskesmas-mandiri.go.id"
            />
            <p class="text-[10px] text-[var(--color-muted-foreground)]">
              WhatsApp dari luar negeri hanya bisa membaca domain publik resmi, bukan URL pratinjau dev container.
            </p>
          </div>

          <!-- Step 1: Destination Type -->
          <div class="space-y-2">
            <label class="text-xs font-bold text-[var(--color-text)] flex items-center justify-between">
              <span>1. Pilih Halaman Tujuan Link</span>
              <span class="text-[10px] text-emerald-500 font-semibold">Tersedia 8 Tipe Halaman</span>
            </label>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onclick={() => handleTargetTypeChange('microsite')}
                class={`p-2.5 rounded-xl border text-xs font-semibold text-left transition flex flex-col gap-1 ${
                  targetType === 'microsite'
                    ? 'border-emerald-500 bg-emerald-500/10 text-[var(--color-text)]'
                    : 'border-[var(--color-border)] bg-[var(--color-bg)] hover:bg-[var(--color-surface)] text-[var(--color-muted-foreground)]'
                }`}
              >
                <span class="font-bold flex items-center gap-1.5">
                  <Layers class="w-3.5 h-3.5 text-emerald-500" />
                  <span>Microsite</span>
                </span>
                <span class="text-[10px] opacity-75">Portal Program</span>
              </button>

              <button
                type="button"
                onclick={() => handleTargetTypeChange('berita')}
                class={`p-2.5 rounded-xl border text-xs font-semibold text-left transition flex flex-col gap-1 ${
                  targetType === 'berita'
                    ? 'border-emerald-500 bg-emerald-500/10 text-[var(--color-text)]'
                    : 'border-[var(--color-border)] bg-[var(--color-bg)] hover:bg-[var(--color-surface)] text-[var(--color-muted-foreground)]'
                }`}
              >
                <span class="font-bold flex items-center gap-1.5">
                  <Newspaper class="w-3.5 h-3.5 text-blue-500" />
                  <span>Berita</span>
                </span>
                <span class="text-[10px] opacity-75">Artikel &amp; Edukasi</span>
              </button>

              <button
                type="button"
                onclick={() => handleTargetTypeChange('layanan')}
                class={`p-2.5 rounded-xl border text-xs font-semibold text-left transition flex flex-col gap-1 ${
                  targetType === 'layanan'
                    ? 'border-emerald-500 bg-emerald-500/10 text-[var(--color-text)]'
                    : 'border-[var(--color-border)] bg-[var(--color-bg)] hover:bg-[var(--color-surface)] text-[var(--color-muted-foreground)]'
                }`}
              >
                <span class="font-bold flex items-center gap-1.5">
                  <Stethoscope class="w-3.5 h-3.5 text-rose-500" />
                  <span>Layanan</span>
                </span>
                <span class="text-[10px] opacity-75">Unit &amp; Poliklinik</span>
              </button>

              <button
                type="button"
                onclick={() => handleTargetTypeChange('pendaftaran')}
                class={`p-2.5 rounded-xl border text-xs font-semibold text-left transition flex flex-col gap-1 ${
                  targetType === 'pendaftaran'
                    ? 'border-emerald-500 bg-emerald-500/10 text-[var(--color-text)]'
                    : 'border-[var(--color-border)] bg-[var(--color-bg)] hover:bg-[var(--color-surface)] text-[var(--color-muted-foreground)]'
                }`}
              >
                <span class="font-bold">Pendaftaran</span>
                <span class="text-[10px] opacity-75">Antrian Online</span>
              </button>

              <button
                type="button"
                onclick={() => handleTargetTypeChange('home')}
                class={`p-2.5 rounded-xl border text-xs font-semibold text-left transition flex flex-col gap-1 ${
                  targetType === 'home'
                    ? 'border-emerald-500 bg-emerald-500/10 text-[var(--color-text)]'
                    : 'border-[var(--color-border)] bg-[var(--color-bg)] hover:bg-[var(--color-surface)] text-[var(--color-muted-foreground)]'
                }`}
              >
                <span class="font-bold">Beranda</span>
                <span class="text-[10px] opacity-75">Website Utama</span>
              </button>

              <button
                type="button"
                onclick={() => handleTargetTypeChange('kontak')}
                class={`p-2.5 rounded-xl border text-xs font-semibold text-left transition flex flex-col gap-1 ${
                  targetType === 'kontak'
                    ? 'border-emerald-500 bg-emerald-500/10 text-[var(--color-text)]'
                    : 'border-[var(--color-border)] bg-[var(--color-bg)] hover:bg-[var(--color-surface)] text-[var(--color-muted-foreground)]'
                }`}
              >
                <span class="font-bold">Kontak</span>
                <span class="text-[10px] opacity-75">Jam Buka &amp; Rute</span>
              </button>

              <button
                type="button"
                onclick={() => handleTargetTypeChange('pengaduan')}
                class={`p-2.5 rounded-xl border text-xs font-semibold text-left transition flex flex-col gap-1 ${
                  targetType === 'pengaduan'
                    ? 'border-emerald-500 bg-emerald-500/10 text-[var(--color-text)]'
                    : 'border-[var(--color-border)] bg-[var(--color-bg)] hover:bg-[var(--color-surface)] text-[var(--color-muted-foreground)]'
                }`}
              >
                <span class="font-bold">Pengaduan</span>
                <span class="text-[10px] opacity-75">Aspirasi Publik</span>
              </button>

              <button
                type="button"
                onclick={() => handleTargetTypeChange('custom')}
                class={`p-2.5 rounded-xl border text-xs font-semibold text-left transition flex flex-col gap-1 ${
                  targetType === 'custom'
                    ? 'border-emerald-500 bg-emerald-500/10 text-[var(--color-text)]'
                    : 'border-[var(--color-border)] bg-[var(--color-bg)] hover:bg-[var(--color-surface)] text-[var(--color-muted-foreground)]'
                }`}
              >
                <span class="font-bold">Kustom</span>
                <span class="text-[10px] opacity-75">Rute Bebas</span>
              </button>
            </div>
          </div>

          <!-- Microsite Selector Dropdown -->
          {#if targetType === 'microsite'}
            <div class="space-y-1.5 p-3 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)]">
              <label class="text-xs font-bold text-[var(--color-text)] flex items-center justify-between" for="wa-microsite">
                <span>Pilih Microsite Terdaftar</span>
                <span class="text-[10px] text-emerald-500">{microsites.length} microsite aktif</span>
              </label>
              <Select
                id="wa-microsite"
                bind:value={selectedMicrositeSlug}
                onchange={(e) => handleSelectMicrosite((e.currentTarget as HTMLSelectElement).value)}
                options={microsites.map((m) => ({
                  value: m.slug,
                  label: `${m.name} (/m/${m.slug})`
                }))}
              />
            </div>
          {/if}

          <!-- Berita Selector Dropdown -->
          {#if targetType === 'berita'}
            <div class="space-y-1.5 p-3 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)]">
              <label class="text-xs font-bold text-[var(--color-text)] flex items-center justify-between" for="wa-berita">
                <span>Pilih Berita / Artikel Spesifik</span>
                <span class="text-[10px] text-blue-500">{posts.length} berita tersedia</span>
              </label>
              <Select
                id="wa-berita"
                bind:value={selectedPostSlug}
                onchange={(e) => handleSelectPost((e.currentTarget as HTMLSelectElement).value)}
                options={[
                  { value: '', label: 'Semua Berita & Informasi Kesehatan (/berita)' },
                  ...posts.map((p) => ({
                    value: p.slug,
                    label: `${p.title} (/berita/${p.slug})`
                  }))
                ]}
              />
            </div>
          {/if}

          <!-- Layanan Selector Dropdown -->
          {#if targetType === 'layanan'}
            <div class="space-y-1.5 p-3 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)]">
              <label class="text-xs font-bold text-[var(--color-text)] flex items-center justify-between" for="wa-layanan">
                <span>Pilih Unit Layanan / Poliklinik Spesifik</span>
                <span class="text-[10px] text-rose-500">{services.length} unit layanan</span>
              </label>
              <Select
                id="wa-layanan"
                bind:value={selectedServiceSlug}
                onchange={(e) => handleSelectService((e.currentTarget as HTMLSelectElement).value)}
                options={[
                  { value: '', label: 'Standar Seluruh Layanan Medis (/layanan)' },
                  ...services.map((s) => ({
                    value: s.slug,
                    label: `${s.name} (/layanan/${s.slug})`
                  }))
                ]}
              />
            </div>
          {/if}

          <!-- Custom Path Input -->
          {#if targetType === 'custom'}
            <div class="space-y-1.5 p-3 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)]">
              <label class="text-xs font-bold text-[var(--color-text)]" for="wa-custom-path">Rute / Path Tujuan Bebas</label>
              <Input
                id="wa-custom-path"
                placeholder="/layanan/imunisasi-anak atau /kontak"
                bind:value={customPath}
              />
            </div>
          {/if}

          <!-- Step 2: Metadata Customization -->
          <div class="space-y-3 pt-2">
            <div class="space-y-1.5">
              <div class="flex justify-between items-center">
                <label class="text-xs font-bold text-[var(--color-text)]" for="wa-title">Judul Pratinjau (og:title)</label>
                <span class="text-[10px] text-[var(--color-muted-foreground)]">{title.length} karakter</span>
              </div>
              <Input
                id="wa-title"
                bind:value={title}
                placeholder="Judul yang tampil di WhatsApp"
              />
            </div>

            <div class="space-y-1.5">
              <div class="flex justify-between items-center">
                <label class="text-xs font-bold text-[var(--color-text)]" for="wa-desc">Deskripsi Pratinjau (og:description)</label>
                <span class="text-[10px] text-[var(--color-muted-foreground)]">{description.length} karakter</span>
              </div>
              <textarea
                id="wa-desc"
                rows={3}
                bind:value={description}
                placeholder="Deskripsi singkat yang tampil di bawah judul pratinjau"
                class="w-full px-3 py-2 text-xs rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-none"
              ></textarea>
            </div>

            <!-- Preset Images Selection -->
            <div class="space-y-1.5">
              <label class="text-xs font-bold text-[var(--color-text)] flex items-center gap-1.5">
                <ImageIcon class="w-3.5 h-3.5 text-emerald-500" />
                <span>Pilihan Cepat Gambar Thumbnail (Preset Kategori Medis)</span>
              </label>
              <div class="flex flex-wrap gap-1.5">
                {#each PRESET_IMAGES as preset, idx (idx)}
                  <button
                    type="button"
                    onclick={() => (imageUrl = preset.url)}
                    class={`px-2.5 py-1 rounded-xl text-[11px] font-medium border transition ${
                      imageUrl === preset.url
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold'
                        : 'bg-[var(--color-bg)] border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:text-[var(--color-text)]'
                    }`}
                  >
                    {preset.label}
                  </button>
                {/each}
              </div>
            </div>

            <div class="space-y-1.5">
              <label class="text-xs font-bold text-[var(--color-text)]" for="wa-image">URL Gambar Thumbnail Kustom (og:image)</label>
              <Input
                id="wa-image"
                bind:value={imageUrl}
                placeholder="https://... atau /og-image.png"
              />
            </div>
          </div>
        </Card>

        <!-- Generated Links Box -->
        <Card class="p-5 border border-[var(--color-border)] rounded-3xl space-y-4 bg-[var(--color-card)] shadow-sm">
          <div class="flex items-center gap-2">
            <Share2 class="w-4 h-4 text-[var(--color-primary)]" />
            <h4 class="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider">
              Hasil Tautan Siap Bagikan
            </h4>
          </div>

          <div class="space-y-3">
            <!-- 1. Smart Share URL (Best for WhatsApp) -->
            <div class="p-3 bg-[var(--color-bg)] rounded-2xl border border-[var(--color-border)] space-y-2">
              <div class="flex justify-between items-center">
                <div class="flex items-center gap-1.5">
                  <span class="text-xs font-bold text-emerald-500">Smart Link WhatsApp (Sangat Disarankan)</span>
                  <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-bold">
                    Bypass Cache WhatsApp
                  </span>
                </div>
                <button
                  onclick={handleCopySmart}
                  class="px-2.5 py-1 rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-foreground)] text-xs font-bold flex items-center gap-1 hover:opacity-90 transition"
                >
                  {#if copiedSmart}<Check class="w-3 h-3" />{:else}<Copy class="w-3 h-3" />{/if}
                  <span>{copiedSmart ? 'Tersalin' : 'Salin'}</span>
                </button>
              </div>
              <p class="text-[11px] text-[var(--color-muted-foreground)] font-mono break-all line-clamp-2">
                {smartShareUrl}
              </p>
              <div class="flex gap-2 pt-1">
                <Button
                  size="sm"
                  onclick={handleOpenWhatsApp}
                  class="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  <Send class="w-3.5 h-3.5 mr-1.5" />
                  Kirim Langsung ke WhatsApp
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onclick={handleOpenMetaDebugger}
                  class="text-xs"
                  title="Uji pratinjau melalui tool resmi Meta / Facebook Debugger"
                >
                  <ExternalLink class="w-3.5 h-3.5 mr-1" />
                  Uji di Meta Debugger
                </Button>
              </div>
            </div>

            <!-- 2. Direct Query URL -->
            <div class="p-3 bg-[var(--color-bg)] rounded-2xl border border-[var(--color-border)] space-y-1.5">
              <div class="flex justify-between items-center">
                <span class="text-xs font-bold text-[var(--color-text)]">Tautan Halaman Langsung</span>
                <button
                  onclick={handleCopyDirect}
                  class="px-2 py-0.5 rounded-lg border border-[var(--color-border)] text-[11px] font-semibold flex items-center gap-1 hover:bg-[var(--color-surface)]"
                >
                  {#if copiedDirect}<Check class="w-3 h-3 text-emerald-500" />{:else}<Copy class="w-3 h-3" />{/if}
                  <span>{copiedDirect ? 'Tersalin' : 'Salin'}</span>
                </button>
              </div>
              <p class="text-[10px] text-[var(--color-muted-foreground)] font-mono break-all line-clamp-2">
                {directParamsUrl}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <!-- Right Column: Interactive WhatsApp Phone Mockup (5 cols) -->
      <div class="lg:col-span-5 space-y-4">
        <Card class="p-5 border border-[var(--color-border)] rounded-3xl space-y-4 shadow-sm sticky top-6">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[var(--color-border)]">
            <div class="flex items-center gap-2">
              <Eye class="w-4 h-4 text-emerald-500" />
              <span class="text-xs font-bold text-[var(--color-text)]">
                Simulasi Kartu Tautan WhatsApp
              </span>
            </div>
            <!-- Mobile / Desktop view switcher -->
            <div class="flex items-center gap-1 bg-[var(--color-bg)] p-1 rounded-xl border border-[var(--color-border)]">
              <button
                type="button"
                onclick={() => (previewDevice = 'mobile')}
                class={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition ${
                  previewDevice === 'mobile'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-text)]'
                }`}
              >
                <span>📱 HP (Mobile)</span>
              </button>
              <button
                type="button"
                onclick={() => (previewDevice = 'desktop')}
                class={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition ${
                  previewDevice === 'desktop'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-text)]'
                }`}
              >
                <span>💻 Komputer</span>
              </button>
            </div>
          </div>

          <!-- WhatsApp Bubble Preview Container -->
          <div class={`p-4 rounded-2xl bg-[#efeae2] dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 transition-all ${
            previewDevice === 'mobile' ? 'max-w-[380px] mx-auto' : 'w-full'
          }`}>
            <!-- Mobile Header Bar Simulation -->
            {#if previewDevice === 'mobile'}
              <div class="flex items-center justify-between pb-2.5 mb-2 border-b border-black/10 dark:border-white/10 text-[#075e54] dark:text-emerald-400">
                <div class="flex items-center gap-2">
                  <div class="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[11px]">
                    W
                  </div>
                  <div>
                    <div class="text-xs font-bold text-slate-800 dark:text-slate-100">Grup Info Warga</div>
                    <div class="text-[9px] text-slate-500 dark:text-slate-400">online</div>
                  </div>
                </div>
                <span class="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-bold">
                  WhatsApp Mobile
                </span>
              </div>
            {/if}

            <!-- Simulated WhatsApp Chat Bubble -->
            <div class={`ml-auto bg-[#d9fdd3] dark:bg-[#005c4b] rounded-2xl rounded-tr-xs p-2 shadow-sm space-y-2 border border-black/5 ${
              previewDevice === 'mobile' ? 'w-full max-w-[320px]' : 'max-w-[420px]'
            }`}>
              <!-- The Preview Card Inside the Bubble -->
              <div class="rounded-xl overflow-hidden bg-[#e2f7cb] dark:bg-[#025142] border border-black/10">
                <!-- Image -->
                <div class="w-full h-44 bg-slate-200 dark:bg-slate-800 relative overflow-hidden flex items-center justify-center group">
                  {#key resolvedPreviewImg}
                    <img
                      src={resolvedPreviewImg}
                      alt="Preview Thumbnail"
                      class="w-full h-full object-cover"
                      onerror={(e) => {
                        (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=600&q=80';
                      }}
                    />
                  {/key}
                  {#if isScreenshotMode}
                    <div class="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-xs text-[9px] text-white font-medium flex items-center gap-1 shadow-xs">
                      <Camera class="w-3 h-3 text-emerald-400" />
                      <span>Screenshot Halaman Nyata</span>
                    </div>
                  {/if}
                </div>
                <!-- Content Box -->
                <div class="p-3 space-y-1">
                  <span class="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    {cleanDomain.replace(/^https?:\/\//, '')}
                  </span>
                  <h4 class="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-2 leading-tight">
                    {title || 'Judul Halaman'}
                  </h4>
                  <p class="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                    {description || 'Deskripsi informasi dan layanan publik...'}
                  </p>
                </div>
              </div>

              <!-- Bubble Message Text -->
              <div class="px-1 text-[11px] text-slate-800 dark:text-slate-100 space-y-1">
                <p class="font-semibold">{title}</p>
                <p class="text-emerald-700 dark:text-emerald-300 underline font-mono text-[10px] break-all">
                  {smartShareUrl}
                </p>
                <div class="flex justify-end pt-1">
                  <span class="text-[9px] text-slate-500 dark:text-slate-400 flex items-center gap-0.5">
                    10:45 <Check class="w-3 h-3 text-sky-500 inline" />
                  </span>
                </div>
              </div>
            </div>

            <!-- Screenshot Inspector Action -->
            <div class="flex items-center justify-between gap-2 px-1 pt-1">
              <div class="flex items-center gap-1.5 text-[11px] text-[var(--color-muted-foreground)]">
                <Camera class="w-3.5 h-3.5 text-emerald-500" />
                <span>Resolusi OG: <strong>1200 × 630 px</strong></span>
              </div>
              <button
                type="button"
                onclick={handleViewScreenshotFull}
                class="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                <ExternalLink class="w-3 h-3" />
                Buka PNG Screenshot Nyata
              </button>
            </div>
          </div>

          <!-- Tips Callout -->
          <div class="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2">
            <div class="flex items-center gap-2 text-xs font-bold text-amber-500">
              <AlertTriangle class="w-4 h-4 shrink-0" />
              <span>Mengapa Pratinjau Terkadang Lama Berubah di WhatsApp?</span>
            </div>
            <ul class="text-[11px] text-[var(--color-muted-foreground)] space-y-1 list-disc list-inside leading-relaxed">
              <li>WhatsApp menyimpan cache pratinjau di server pusat Meta.</li>
              <li>Jika Anda mengedit judul/foto, gunakan tombol <strong>"Salin" Smart Link</strong> karena otomatis menyertakan parameter pemutus cache (<code>?v=...</code>).</li>
              <li>Gunakan gambar berukuran di bawah 300KB (format PNG/JPG) agar crawler WhatsApp mau mengunduh gambarnya.</li>
            </ul>
          </div>
        </Card>
      </div>
    </div>
  {/if}

  <!-- CLOUDFLARE WORKER TAB (The ultimate mechanism for VPS abroad) -->
  {#if activeTab === 'cloudflare'}
    <Card class="p-6 border border-[var(--color-border)] rounded-3xl space-y-6 shadow-sm">
      <div class="flex items-start justify-between pb-4 border-b border-[var(--color-border)]">
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <div class="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <Cloud class="w-5 h-5" />
            </div>
            <div>
              <h3 class="text-base font-bold text-[var(--color-text)]">
                Mekanisme Cloudflare Worker: Solusi 100% Ampuh untuk VPS Luar Negeri
              </h3>
              <p class="text-xs text-[var(--color-muted-foreground)]">
                Mengabaikan kendala Nginx dan latensi VPS — meta tag WhatsApp diinjeksi seketika di Cloudflare Edge (&lt;10 milidetik).
              </p>
            </div>
          </div>
        </div>
        <Badge variant="emerald" size="sm">Rekomendasi Utama</Badge>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="p-4 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] space-y-1.5">
          <div class="flex items-center gap-2 text-xs font-bold text-emerald-500">
            <Zap class="w-4 h-4" />
            <span>Super Cepat di Edge Global</span>
          </div>
          <p class="text-[11px] text-[var(--color-muted-foreground)] leading-relaxed">
            Saat crawler WhatsApp (dari server California/Frankfurt) mengakses link, Cloudflare Worker langsung menyisipkan meta tag tanpa menunggu response penuh dari VPS Anda.
          </p>
        </div>

        <div class="p-4 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] space-y-1.5">
          <div class="flex items-center gap-2 text-xs font-bold text-sky-500">
            <ShieldCheck class="w-4 h-4" />
            <span>Bebas Masalah try_files Nginx</span>
          </div>
          <p class="text-[11px] text-[var(--color-muted-foreground)] leading-relaxed">
            Tidak perlu pusing membongkar konfigurasi Nginx di VPS. Cloudflare memproses HTML secara dinamis sebelum sampai ke pengguna maupun bot.
          </p>
        </div>

        <div class="p-4 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] space-y-1.5">
          <div class="flex items-center gap-2 text-xs font-bold text-amber-500">
            <Globe class="w-4 h-4" />
            <span>100% Gratis di Cloudflare</span>
          </div>
          <p class="text-[11px] text-[var(--color-muted-foreground)] leading-relaxed">
            Paket gratis Cloudflare Worker memberikan hingga 100.000 permintaan per hari, sangat lebih dari cukup untuk menangani semua crawler WhatsApp dan Facebook.
          </p>
        </div>
      </div>

      <!-- 3 Step Instructions -->
      <div class="space-y-3">
        <h4 class="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider">
          Langkah Pemasangan (Hanya Butuh 3 Menit di Cloudflare Dashboard):
        </h4>
        <div class="space-y-2 text-xs text-[var(--color-text)]">
          <div class="p-3 bg-[var(--color-bg)] rounded-xl border border-[var(--color-border)] flex items-start gap-3">
            <span class="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">1</span>
            <div>
              <p class="font-bold">Buka Dashboard Cloudflare &gt; Workers &amp; Pages</p>
              <p class="text-[11px] text-[var(--color-muted-foreground)]">
                Pilih <strong>Create Application</strong> &gt; <strong>Create Worker</strong> &gt; Beri nama misal <code>whatsapp-preview-injector</code> &gt; Klik <strong>Deploy</strong>.
              </p>
            </div>
          </div>

          <div class="p-3 bg-[var(--color-bg)] rounded-xl border border-[var(--color-border)] flex items-start gap-3">
            <span class="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">2</span>
            <div>
              <p class="font-bold">Klik &quot;Edit Code&quot; &amp; Tempelkan Kode di Bawah</p>
              <p class="text-[11px] text-[var(--color-muted-foreground)]">
                Hapus kode bawaan Cloudflare, tempelkan skrip Worker lengkap di bawah ini, lalu klik <strong>Deploy</strong>.
              </p>
            </div>
          </div>

          <div class="p-3 bg-[var(--color-bg)] rounded-xl border border-[var(--color-border)] flex items-start gap-3">
            <span class="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">3</span>
            <div>
              <p class="font-bold">Sambungkan ke Domain Anda via &quot;Routes&quot;</p>
              <p class="text-[11px] text-[var(--color-muted-foreground)]">
                Masuk ke menu <strong>Settings</strong> worker Anda &gt; <strong>Triggers</strong> &gt; <strong>Add Route</strong>. Masukkan: <code class="text-emerald-500 font-bold">puskesmas-mandiri.go.id/*</code> dan pilih Zone domain Anda.
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Copyable Worker Code -->
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-[var(--color-text)] flex items-center gap-1.5">
            <Terminal class="w-4 h-4 text-amber-400" />
            Skrip Cloudflare Worker (Tinggal Salin &amp; Tempel):
          </span>
          <Button
            size="sm"
            variant="secondary"
            onclick={() => {
              navigator.clipboard.writeText(cloudflareWorkerCode);
              copiedWorker = true;
              showToast('Skrip Cloudflare Worker berhasil disalin!');
              setTimeout(() => (copiedWorker = false), 2500);
            }}
            class="text-xs font-bold"
          >
            {#if copiedWorker}<Check class="w-3.5 h-3.5 mr-1 text-emerald-500" />{:else}<Copy class="w-3.5 h-3.5 mr-1" />{/if}
            <span>{copiedWorker ? 'Tersalin' : 'Salin Skrip Worker'}</span>
          </Button>
        </div>
        <div class="p-4 bg-slate-950 rounded-2xl border border-slate-800 font-mono text-[11px] text-emerald-400 overflow-x-auto max-h-[380px]">
          <pre>{cloudflareWorkerCode}</pre>
        </div>
      </div>
    </Card>
  {/if}

  <!-- VPS NGINX GUIDE TAB -->
  {#if activeTab === 'vps_guide'}
    <Card class="p-6 border border-[var(--color-border)] rounded-3xl space-y-6 shadow-sm">
      <div class="flex items-start justify-between pb-4 border-b border-[var(--color-border)]">
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <div class="p-2 rounded-xl bg-sky-500/10 text-sky-500">
              <Server class="w-5 h-5" />
            </div>
            <div>
              <h3 class="text-base font-bold text-[var(--color-text)]">
                Panduan Konfigurasi Nginx di VPS Luar Negeri
              </h3>
              <p class="text-xs text-[var(--color-muted-foreground)]">
                Memastikan Nginx meneruskan request HTML ke port 3000 Node.js agar meta tag SSR dinamis diproses.
              </p>
            </div>
          </div>
        </div>
        <Badge variant="blue" size="sm">Nginx Reverse Proxy</Badge>
      </div>

      <!-- Root Cause Explanations -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="p-4 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] space-y-2">
          <div class="flex items-center gap-2 text-xs font-bold text-amber-400">
            <span class="w-5 h-5 rounded-full bg-amber-500/10 flex items-center justify-center text-[10px]">1</span>
            <span>Nginx Menyajikan index.html Statis Tanpa Lewat Node.js</span>
          </div>
          <p class="text-[11px] text-[var(--color-muted-foreground)] leading-relaxed">
            Konfigurasi Nginx standar menggunakan <code class="text-amber-400 font-mono">try_files $uri /index.html;</code>. Akibatnya, saat bot WhatsApp meminta URL <code class="text-sky-400 font-mono">/m/nama-portal</code>, Nginx langsung menyajikan file <code class="font-mono">dist/index.html</code> mentah dari disk tanpa melewati Node.js (Port 3000). Sehingga Node.js tidak sempat menginjeksi meta tag dinamis!
          </p>
        </div>

        <div class="p-4 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] space-y-2">
          <div class="flex items-center gap-2 text-xs font-bold text-amber-400">
            <span class="w-5 h-5 rounded-full bg-amber-500/10 flex items-center justify-center text-[10px]">2</span>
            <span>Cache Agresif Server WhatsApp (Meta)</span>
          </div>
          <p class="text-[11px] text-[var(--color-muted-foreground)] leading-relaxed">
            WhatsApp menyimpan cache pratinjau di server pusat Meta. Begitu sebuah URL pernah ditempelkan di chat, Meta tidak akan mengambil ulang tag ke VPS Anda kecuali URL-nya memiliki parameter pemutus cache (seperti <code class="text-emerald-400 font-mono">?v=2</code>).
          </p>
        </div>
      </div>

      <!-- Solution: Copyable Nginx Configuration -->
      <div class="space-y-3 pt-3 border-t border-[var(--color-border)]">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <Terminal class="w-4 h-4 text-emerald-400" />
            <span class="text-xs font-bold text-[var(--color-text)]">
              Solusi Konfigurasi Nginx VPS (Agar Node.js Menangani SSR Meta Tag)
            </span>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onclick={() => {
              const nginxText = `location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 60s;
}`;
              navigator.clipboard.writeText(nginxText);
              showToast('Blok konfigurasi Nginx berhasil disalin!');
            }}
            class="text-xs"
          >
            <Copy class="w-3.5 h-3.5 mr-1" />
            Salin Blok Nginx
          </Button>
        </div>

        <div class="p-4 bg-slate-950 rounded-2xl border border-slate-800 font-mono text-[11px] text-slate-300 space-y-2 overflow-x-auto">
          <p class="text-slate-500"># Buka file Nginx di VPS Anda, misal: /etc/nginx/sites-available/default</p>
          <p class="text-slate-500"># Pastikan blok location / meneruskan permintaan ke port 3000 Node.js:</p>
          <pre class="text-emerald-400">{`location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 60s;
}`}</pre>
          <p class="text-slate-500"># Simpan lalu uji konfigurasi dan restart Nginx:</p>
          <p class="text-sky-300">sudo nginx -t &amp;&amp; sudo systemctl reload nginx</p>
        </div>
      </div>

      <!-- Test Command in VPS -->
      <div class="space-y-2 pt-2 border-t border-[var(--color-border)]">
        <span class="text-xs font-bold text-[var(--color-text)] flex items-center gap-1.5">
          <Server class="w-3.5 h-3.5 text-sky-400" />
          Cara Memverifikasi Hasil di Terminal VPS Anda:
        </span>
        <p class="text-[11px] text-[var(--color-muted-foreground)]">
          Jalankan perintah ini di terminal VPS Anda untuk menguji apakah bot WhatsApp menerima tag yang benar:
        </p>
        <div class="p-3 bg-slate-950 rounded-2xl border border-slate-800 font-mono text-[11px] text-sky-300 select-all">
          curl -A &quot;WhatsApp/2.21.12.21&quot; -s &quot;http://127.0.0.1:3000/share?t=Tes+Judul&amp;d=Tes+Deskripsi&quot; | grep -i &quot;og:&quot;
        </div>
      </div>
    </Card>
  {/if}
</div>
