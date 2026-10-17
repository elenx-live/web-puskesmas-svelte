<!-- @component Pusat pengaturan SEO & penelusuran: metadata on-page, Open Graph & WhatsApp preview, mesin penelusuran publik, sitemap & webmaster, audit kesehatan SEO. -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { authStore } from '../../../shared/stores/auth.svelte.js';
  import { toastStore } from '../../../shared/stores/toast.svelte.js';
  import { siteSettingsService } from '../../../shared/services/siteSettingsService.js';
  import type { SiteSettings } from '../../../shared/types/index.js';
  import Card from '../../../shared/ui/Card.svelte';
  import Button from '../../../shared/ui/Button.svelte';
  import Input from '../../../shared/ui/Input.svelte';
  import Badge from '../../../shared/ui/Badge.svelte';
  import WhatsAppLinkPreviewTool from '../components/WhatsAppLinkPreviewTool.svelte';
  import {
    Search,
    Share2,
    FileText,
    CheckCircle2,
    AlertTriangle,
    ExternalLink,
    Save,
    RotateCcw,
    ShieldCheck,
    Layers,
    Copy,
    Check,
    Eye,
    Compass,
    Info,
  } from 'lucide-svelte';

  type SeoTab = 'metadata' | 'social' | 'search_engine' | 'sitemap' | 'audit';

  let settings = $state<SiteSettings | null>(null);
  let loading = $state(true);
  let saving = $state(false);
  let activeTab = $state<SeoTab>('metadata');
  let copiedUrl = $state(false);

  async function loadSettings() {
    try {
      loading = true;
      const data = await siteSettingsService.getSettings();
      settings = data;
    } catch (err) {
      console.error('Error loading SEO settings:', err);
      toastStore.showToast('Gagal memuat pengaturan SEO & Penelusuran', 'error');
    } finally {
      loading = false;
    }
  }

  function handleFieldChange(field: keyof SiteSettings, value: any) {
    if (!settings) return;
    settings = { ...settings, [field]: value };
  }

  function handleToggleContentType(type: string) {
    if (!settings) return;
    const current = settings.searchContentTypes || ['posts', 'services', 'documents', 'faqs'];
    const updated = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type];
    handleFieldChange('searchContentTypes', updated);
  }

  async function handleSave() {
    const user = authStore.user;
    if (!settings || !user) return;
    try {
      saving = true;
      const updated = await siteSettingsService.updateSettings(settings, {
        id: user.uid || 'usr-admin',
        email: user.email || 'admin@puskesmas.go.id',
        name: user.displayName || 'Administrator',
      });
      settings = updated;
      toastStore.showToast('Pengaturan SEO & Penelusuran berhasil disimpan dan dipublikasikan!', 'success');
    } catch (err) {
      console.error('Error saving SEO settings:', err);
      toastStore.showToast('Gagal menyimpan pengaturan SEO', 'error');
    } finally {
      saving = false;
    }
  }

  function copySitemapUrl() {
    const url = `${window.location.origin}/sitemap.xml`;
    navigator.clipboard.writeText(url);
    copiedUrl = true;
    setTimeout(() => (copiedUrl = false), 2000);
    toastStore.showToast('Tautan Sitemap berhasil disalin!', 'success');
  }

  // SEO Quality Audit Calculations
  const hasValidTitle = $derived(Boolean(settings?.defaultSeoTitle && settings.defaultSeoTitle.length >= 10));
  const descLen = $derived(settings?.defaultSeoDescription?.length || 0);
  const isDescOptimal = $derived(descLen >= 50 && descLen <= 160);
  const hasOgImage = $derived(Boolean(settings?.ogImageUrl || settings?.logoUrl));
  const hasKeywords = $derived(Boolean(settings?.defaultKeywords && settings.defaultKeywords.length > 5));
  const totalScore = $derived(
    [hasValidTitle, isDescOptimal, hasOgImage, hasKeywords].filter(Boolean).length * 25
  );

  const SEARCHABLE_TYPES = [
    { id: 'posts', label: 'Berita & Artikel', desc: 'Artikel kesehatan, rilis berita' },
    { id: 'services', label: 'Layanan Poliklinik', desc: 'Syarat, tarif, alur poli' },
    { id: 'documents', label: 'Dokumen Publik', desc: 'SOP, regulasi, file PDF' },
    { id: 'faqs', label: 'FAQ & Bantuan', desc: 'Tanya jawab seputar puskesmas' },
  ];

  onMount(() => {
    loadSettings();
  });
</script>

{#snippet tabButton(id: SeoTab, Icon: any, label: string)}
  <button
    onclick={() => (activeTab = id)}
    class={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
      activeTab === id ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
    }`}
  >
    <Icon class="w-4 h-4" />
    {label}
  </button>
{/snippet}

{#if loading || !settings}
  <div class="flex items-center justify-center min-h-[400px]">
    <div class="w-8 h-8 border-3 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
  </div>
{:else}
  <div class="space-y-6 max-w-6xl mx-auto pb-16">
    <!-- Header Banner & Save Action -->
    <div
      class="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
    >
      <div class="flex items-center gap-4">
        <div
          class="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center flex-shrink-0"
        >
          <Compass class="w-7 h-7 text-emerald-200" />
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-xl font-bold tracking-tight">Pusat Pengaturan SEO & Penelusuran</h1>
            <Badge variant="primary" class="bg-white/15 text-white border-white/30 text-xs">
              Website & Konten
            </Badge>
          </div>
          <p class="text-sm text-emerald-100/90 mt-1 max-w-2xl">
            Optimalkan keterlihatan portal Puskesmas di Google, Bing, pratinjau tautan media sosial
            (WhatsApp & Facebook), serta konfigurasi mesin pencari cepat.
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2.5 w-full md:w-auto">
        <Button
          variant="outline"
          onclick={loadSettings}
          class="bg-white/10 border-white/30 text-white hover:bg-white/20 text-xs flex items-center gap-1.5"
        >
          <RotateCcw class="w-3.5 h-3.5" />
          Reset
        </Button>
        <Button
          onclick={handleSave}
          disabled={saving}
          class="bg-emerald-500 hover:bg-emerald-400 text-white shadow-md text-xs font-semibold px-4 flex items-center gap-1.5 flex-1 md:flex-none justify-center"
        >
          <Save class="w-3.5 h-3.5" />
          {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
        </Button>
      </div>
    </div>

    <!-- Tab Navigation -->
    <div class="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-2 scrollbar-none">
      {@render tabButton('metadata', FileText, 'Metadata On-Page (Google)')}
      {@render tabButton('social', Share2, 'Open Graph & WhatsApp Preview')}
      {@render tabButton('search_engine', Search, 'Penelusuran Publik')}
      {@render tabButton('sitemap', Layers, 'Sitemap & Webmaster')}
      {@render tabButton('audit', ShieldCheck, `Audit Kesehatan SEO (${totalScore}%)`)}
    </div>

    <!-- TAB 1: METADATA ON-PAGE -->
    {#if activeTab === 'metadata'}
      <div class="space-y-6">
        <Card class="p-6 border border-slate-200 space-y-5">
          <div>
            <h3 class="text-base font-bold text-slate-800 flex items-center gap-2">
              <FileText class="w-4 h-4 text-emerald-600" />
              Konfigurasi Judul & Deskripsi Pencarian Mesin Pencari
            </h3>
            <p class="text-xs text-slate-500 mt-1">
              Tag ini akan dibaca oleh robot perayap Google, Bing, Yahoo, dan ditampilkan pada hasil
              pencarian (SERP).
            </p>
          </div>

          <div class="space-y-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Judul Utama SEO (Meta Title)
              </label>
              <Input
                value={settings.defaultSeoTitle || ''}
                oninput={(e) => handleFieldChange('defaultSeoTitle', e.currentTarget.value)}
                placeholder="Contoh: Puskesmas Manding — Layanan Kesehatan Prima & Terintegrasi"
                class="text-sm font-medium"
              />
              <div class="flex items-center justify-between mt-1 text-[11px] text-slate-400">
                <span>Disarankan: 50 - 60 karakter</span>
                <span>Panjang: {settings.defaultSeoTitle?.length || 0} karakter</span>
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Deskripsi Meta Ringkasan (Meta Description)
              </label>
              <textarea
                value={settings.defaultSeoDescription || ''}
                oninput={(e) => handleFieldChange('defaultSeoDescription', e.currentTarget.value)}
                rows={3}
                placeholder="Portal resmi Puskesmas Manding. Menyediakan pendaftaran online, informasi jadwal poli, UGD 24 jam, dan pengaduan masyarakat."
                class="w-full text-sm rounded-xl border border-slate-200 p-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              ></textarea>
              <div class="flex items-center justify-between mt-1 text-[11px]">
                <span class={isDescOptimal ? 'text-emerald-600 font-semibold' : 'text-amber-600'}>
                  {isDescOptimal
                    ? '✓ Panjang optimal untuk Google (150-160 karakter)'
                    : 'Disarankan: 140 - 160 karakter'}
                </span>
                <span class="text-slate-400">Panjang: {descLen} karakter</span>
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Kata Kunci Pencarian (Keywords / Tags)
              </label>
              <Input
                value={settings.defaultKeywords || ''}
                oninput={(e) => handleFieldChange('defaultKeywords', e.currentTarget.value)}
                placeholder="puskesmas, kesehatan primer, bpjs, pendaftaran online, poli umum, posyandu, ugd 24 jam"
                class="text-sm"
              />
              <p class="text-[11px] text-slate-400 mt-1">Pisahkan setiap kata kunci dengan tanda koma (,).</p>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Instruksi Robot Perayap (Robots Meta Tag)
              </label>
              <select
                value={settings.robotsConfig || 'index, follow'}
                onchange={(e) => handleFieldChange('robotsConfig', e.currentTarget.value)}
                class="w-full rounded-xl border border-slate-200 p-2.5 text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="index, follow"
                  >index, follow (Disarankan: Izinkan Google mengindeks dan menelusuri seluruh tautan)</option
                >
                <option value="noindex, follow"
                  >noindex, follow (Sembunyikan dari Google tetapi telusuri tautan internal)</option
                >
                <option value="noindex, nofollow">noindex, nofollow (Blokir total perayapan mesin pencari)</option>
              </select>
            </div>
          </div>
        </Card>

        <!-- Google SERP Simulator -->
        <Card class="p-6 border border-slate-200 space-y-3 bg-slate-50/50">
          <div class="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <Eye class="w-4 h-4 text-emerald-600" />
            Simulasi Tampilan di Hasil Pencarian Google (SERP Preview)
          </div>
          <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-1">
            <div class="text-xs text-slate-600 flex items-center gap-1.5">
              <div
                class="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center text-[9px] text-emerald-700 font-bold"
              >
                P
              </div>
              <span>{window.location.origin || 'https://puskesmas-mandiri.go.id'}</span>
              <span class="text-slate-400">› portal</span>
            </div>
            <h4
              class="text-base text-blue-700 hover:underline cursor-pointer font-medium line-clamp-1"
            >
              {settings.defaultSeoTitle || settings.siteTitle || 'Puskesmas Manding — Layanan Kesehatan Prima'}
            </h4>
            <p class="text-xs text-slate-600 line-clamp-2 leading-relaxed">
              {settings.defaultSeoDescription ||
                settings.siteDescription ||
                'Portal resmi Puskesmas melayani pendaftaran online, informasi jadwal poli, UGD 24 jam, dan pengaduan masyarakat terpadu.'}
            </p>
          </div>
        </Card>
      </div>
    {/if}

    <!-- TAB 2: SOCIAL & WHATSAPP PREVIEW -->
    {#if activeTab === 'social'}
      <div class="space-y-6">
        <Card class="p-6 border border-slate-200 space-y-5">
          <div>
            <h3 class="text-base font-bold text-slate-800 flex items-center gap-2">
              <Share2 class="w-4 h-4 text-emerald-600" />
              Konfigurasi Open Graph (OG Tag) & Banner Pratinjau Tautan
            </h3>
            <p class="text-xs text-slate-500 mt-1">
              Ketika tautan website dibagikan ke WhatsApp, Telegram, Facebook, atau Twitter, banner dan
              teks ini yang akan muncul.
            </p>
          </div>

          <div class="space-y-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                URL Gambar Banner Open Graph (OG Image)
              </label>
              <Input
                value={settings.ogImageUrl || ''}
                oninput={(e) => handleFieldChange('ogImageUrl', e.currentTarget.value)}
                placeholder="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1200&q=80"
                class="text-sm"
              />
              <p class="text-[11px] text-slate-400 mt-1">
                Disarankan gambar rasio 1.91:1 (resolusi 1200 x 630 piksel) dengan format JPG / PNG.
              </p>
            </div>

            {#if settings.ogImageUrl}
              <div class="border border-slate-200 rounded-xl p-2 bg-slate-50 max-w-sm">
                <p class="text-[11px] font-semibold text-slate-500 mb-1.5">Pratinjau Banner:</p>
                <img
                  src={settings.ogImageUrl}
                  alt="Open Graph Preview"
                  class="w-full h-36 object-cover rounded-lg"
                  onerror={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
            {/if}
          </div>
        </Card>

        <!-- Live WhatsApp Link Simulator -->
        <WhatsAppLinkPreviewTool />
      </div>
    {/if}

    <!-- TAB 3: PENELUSURAN PUBLIK -->
    {#if activeTab === 'search_engine'}
      <div class="space-y-6">
        <Card class="p-6 border border-slate-200 space-y-5">
          <div>
            <h3 class="text-base font-bold text-slate-800 flex items-center gap-2">
              <Search class="w-4 h-4 text-emerald-600" />
              Konfigurasi Mesin Penelusuran Cepat (Global Search)
            </h3>
            <p class="text-xs text-slate-500 mt-1">
              Atur cakupan modul yang dapat dicari oleh masyarakat pada bilah pencarian header dan halaman /search.
            </p>
          </div>

          <div class="space-y-5">
            <div
              class="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50/50"
            >
              <div>
                <h4 class="text-sm font-semibold text-slate-800">
                  Saran Pencarian Otomatis (Search Suggestions)
                </h4>
                <p class="text-xs text-slate-500 mt-0.5">
                  Tampilkan rekomendasi cepat kata kunci dan tautan saat pengunjung mengetik di kotak
                  pencarian.
                </p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.searchSuggestionEnabled !== false}
                  onchange={(e) => handleFieldChange('searchSuggestionEnabled', e.currentTarget.checked)}
                  class="sr-only peer"
                />
                <div
                  class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"
                ></div>
              </label>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Tipe Konten yang Terindeks dalam Pencarian
              </label>
              <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {#each SEARCHABLE_TYPES as item (item.id)}
                  {@const isSelected = (
                    settings.searchContentTypes || ['posts', 'services', 'documents', 'faqs']
                  ).includes(item.id)}
                  <div
                    onclick={() => handleToggleContentType(item.id)}
                    class={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/60 text-emerald-900 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <div class="flex items-center justify-between">
                      <span class="text-xs font-bold">{item.label}</span>
                      <div
                        class={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                          isSelected ? 'bg-emerald-600 text-white' : 'border border-slate-300'
                        }`}
                      >
                        {#if isSelected}<Check class="w-2.5 h-2.5 stroke-[3]" />{/if}
                      </div>
                    </div>
                    <p class="text-[11px] text-slate-500 mt-1">{item.desc}</p>
                  </div>
                {/each}
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Batas Maksimal Hasil per Kategori
                </label>
                <select
                  value={settings.searchMaxResults || 10}
                  onchange={(e) => handleFieldChange('searchMaxResults', parseInt(e.currentTarget.value))}
                  class="w-full rounded-xl border border-slate-200 p-2.5 text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value={5}>5 Hasil per kategori</option>
                  <option value={10}>10 Hasil per kategori (Standar)</option>
                  <option value={20}>20 Hasil per kategori</option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Pengurutan Hasil Pencarian
                </label>
                <select
                  value={settings.searchResultOrdering || 'relevance'}
                  onchange={(e) => handleFieldChange('searchResultOrdering', e.currentTarget.value)}
                  class="w-full rounded-xl border border-slate-200 p-2.5 text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="relevance">Tingkat Relevansi Kata Kunci</option>
                  <option value="latest">Tanggal Publikasi Terbaru</option>
                  <option value="popular">Tingkat Popularitas / Kunjungan</option>
                </select>
              </div>
            </div>
          </div>
        </Card>
      </div>
    {/if}

    <!-- TAB 4: SITEMAP & WEBMASTER -->
    {#if activeTab === 'sitemap'}
      <div class="space-y-6">
        <Card class="p-6 border border-slate-200 space-y-5">
          <div>
            <h3 class="text-base font-bold text-slate-800 flex items-center gap-2">
              <Layers class="w-4 h-4 text-emerald-600" />
              Peta Situs (XML Sitemap) & Verifikasi Webmaster
            </h3>
            <p class="text-xs text-slate-500 mt-1">
              Daftarkan peta situs ke Google Search Console agar halaman baru langsung terindeks secara
              otomatis.
            </p>
          </div>

          <div
            class="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
          >
            <div>
              <div class="flex items-center gap-2">
                <CheckCircle2 class="w-4 h-4 text-emerald-600" />
                <span class="text-xs font-bold text-emerald-900">Sitemap XML Aktif & Otomatis Terbarui</span>
              </div>
              <p class="text-xs text-emerald-700 font-mono mt-1">{window.location.origin}/sitemap.xml</p>
            </div>
            <div class="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onclick={copySitemapUrl}
                class="text-xs bg-white border-emerald-300 text-emerald-800 hover:bg-emerald-100 flex items-center gap-1.5"
              >
                {#if copiedUrl}<Check class="w-3.5 h-3.5 text-emerald-600" />{:else}<Copy
                    class="w-3.5 h-3.5"
                  />{/if}
                {copiedUrl ? 'Tersalin' : 'Salin URL'}
              </Button>
              <a
                href="/sitemap.xml"
                target="_blank"
                rel="noreferrer"
                class="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline px-3 py-1.5"
              >
                Buka File <ExternalLink class="w-3 h-3" />
              </a>
            </div>
          </div>

          <div class="space-y-4 pt-2">
            <h4 class="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Panduan Pengiriman ke Google Search Console:
            </h4>
            <ol
              class="list-decimal list-inside space-y-2 text-xs text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200"
            >
              <li>Buka <strong>Google Search Console</strong> di browser Anda.</li>
              <li>Pilih properti domain Puskesmas Anda.</li>
              <li>Di menu sebelah kiri, klik menu <strong>Sitemaps (Peta Situs)</strong>.</li>
              <li>
                Masukkan
                <code class="bg-slate-200 px-1.5 py-0.5 rounded text-emerald-800 font-mono font-bold"
                  >sitemap.xml</code
                >
                pada kolom formulir lalu klik <strong>Kirim (Submit)</strong>.
              </li>
              <li>
                Google akan mulai menjadwalkan perayapan seluruh berita, layanan, dan dokumen Anda.
              </li>
            </ol>
          </div>
        </Card>
      </div>
    {/if}

    <!-- TAB 5: AUDIT KESEHATAN SEO -->
    {#if activeTab === 'audit'}
      <div class="space-y-6">
        <Card class="p-6 border border-slate-200 space-y-5">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-base font-bold text-slate-800 flex items-center gap-2">
                <ShieldCheck class="w-4 h-4 text-emerald-600" />
                Audit Skor Kesiapan SEO & Visibilitas Digital
              </h3>
              <p class="text-xs text-slate-500 mt-1">
                Pemeriksaan otomatis standar kepatuhan SEO modern untuk website instansi kesehatan publik.
              </p>
            </div>
            <div class="text-right">
              <div class="text-2xl font-black text-emerald-600">{totalScore}%</div>
              <div class="text-[11px] font-semibold text-slate-400">Skor Kesiapan</div>
            </div>
          </div>

          <div class="space-y-3">
            <div
              class={`p-3.5 rounded-xl border flex items-center justify-between ${
                hasValidTitle
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              <div class="flex items-center gap-3">
                {#if hasValidTitle}<CheckCircle2 class="w-5 h-5 text-emerald-600" />{:else}<AlertTriangle
                    class="w-5 h-5 text-rose-600"
                  />{/if}
                <div>
                  <h5 class="text-xs font-bold">Meta Title Utama Terdefinisi</h5>
                  <p class="text-[11px] opacity-80">{settings.defaultSeoTitle || 'Belum diisi'}</p>
                </div>
              </div>
              <Badge variant={hasValidTitle ? 'emerald' : 'red'} class="text-[10px]">
                {hasValidTitle ? 'Lulus' : 'Perlu Diisi'}
              </Badge>
            </div>

            <div
              class={`p-3.5 rounded-xl border flex items-center justify-between ${
                isDescOptimal
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              <div class="flex items-center gap-3">
                {#if isDescOptimal}<CheckCircle2 class="w-5 h-5 text-emerald-600" />{:else}<Info
                    class="w-5 h-5 text-amber-600"
                  />{/if}
                <div>
                  <h5 class="text-xs font-bold">Panjang Meta Description Optimal (140-160 char)</h5>
                  <p class="text-[11px] opacity-80">Saat ini: {descLen} karakter</p>
                </div>
              </div>
              <Badge variant={isDescOptimal ? 'emerald' : 'amber'} class="text-[10px]">
                {isDescOptimal ? 'Optimal' : 'Dapat Dioptimalkan'}
              </Badge>
            </div>

            <div
              class={`p-3.5 rounded-xl border flex items-center justify-between ${
                hasOgImage
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              <div class="flex items-center gap-3">
                {#if hasOgImage}<CheckCircle2 class="w-5 h-5 text-emerald-600" />{:else}<AlertTriangle
                    class="w-5 h-5 text-amber-600"
                  />{/if}
                <div>
                  <h5 class="text-xs font-bold">Banner Pratinjau Tautan (Open Graph Image)</h5>
                  <p class="text-[11px] opacity-80">
                    {settings.ogImageUrl ? 'Gambar banner terpasang' : 'Menggunakan logo default'}
                  </p>
                </div>
              </div>
              <Badge variant={hasOgImage ? 'emerald' : 'amber'} class="text-[10px]">
                {hasOgImage ? 'Siap Bagikan' : 'Gunakan Banner HD'}
              </Badge>
            </div>

            <div
              class={`p-3.5 rounded-xl border flex items-center justify-between ${
                hasKeywords
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                  : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <div class="flex items-center gap-3">
                {#if hasKeywords}<CheckCircle2 class="w-5 h-5 text-emerald-600" />{:else}<Info
                    class="w-5 h-5 text-slate-500"
                  />{/if}
                <div>
                  <h5 class="text-xs font-bold">Kata Kunci & Indeks Layanan</h5>
                  <p class="text-[11px] opacity-80">{settings.defaultKeywords || 'Belum ada kata kunci'}</p>
                </div>
              </div>
              <Badge variant={hasKeywords ? 'emerald' : 'slate'} class="text-[10px]">
                {hasKeywords ? 'Lengkap' : 'Disarankan'}
              </Badge>
            </div>
          </div>
        </Card>
      </div>
    {/if}
  </div>
{/if}
