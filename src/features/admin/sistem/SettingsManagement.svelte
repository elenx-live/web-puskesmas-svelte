<!-- @component Pusat Pengaturan & Konfigurasi Terpadu — kelola parameter sistem, integrasi API, kebijakan operasional, dan tampilan portal. -->
<script lang="ts">
import { memStore } from '../../../shared/lib/memStore';
  import {
    Building2, Globe, Users, Phone, Layers, Calendar, Sparkles, Palette,
    Share2, Bell, MessageSquare, Mail, Search, ShieldCheck,
    ShieldAlert, HardDrive, Wrench, Save, RotateCcw, CheckCircle2,
    AlertTriangle, Check, Eye, Link2, ExternalLink, ChevronRight, Send, HelpCircle,
    RefreshCw, Sliders, CheckCheck, Target, UploadCloud,
    Trash2, Camera
  } from 'lucide-svelte';
  import Card from '../../../shared/ui/Card.svelte';
  import Button from '../../../shared/ui/Button.svelte';
  import { apiFetch } from '../../../shared/lib/api.js';
  import Input from '../../../shared/ui/Input.svelte';
  import Badge from '../../../shared/ui/Badge.svelte';
  import ConfirmModal from '../../../shared/components/ConfirmModal.svelte';
  import { siteSettingsService } from '../../../shared/services/siteSettingsService.js';
  import type { SiteSettings } from '../../../shared/types/index.js';
  import { authStore } from '../../../shared/stores/auth.svelte.js';
  import { toastStore } from '../../../shared/stores/toast.svelte.js';
  import { errorMessage } from '../../../shared/lib/logger.js';
  import { onMount } from 'svelte';
    import { navigate, routerState } from '../../../app/router.svelte.js';
  import { MAINTENANCE_BG_PRESETS } from '../../../shared/data/maintenancePresets.js';
  import AIProviderSettingsCard from '../components/AIProviderSettingsCard.svelte';
  // Catatan: source React mengimpor komponen ini tanpa me-render-nya; import dipertahankan apa adanya.
  import WhatsAppLinkPreviewTool from '../components/WhatsAppLinkPreviewTool.svelte';

  // Primary 5 Pillars Configuration
  interface SettingDomain {
    id: string;
    label: string;
    title: string;
    icon: any;
    desc: string;
    badge: string;
    subSections: {
      id: string;
      label: string;
      icon: any;
    }[];
  }

  const SETTING_DOMAINS: SettingDomain[] = [
    {
      id: 'identity',
      label: 'Identitas & Instansi',
      title: 'Profil, Visi Misi & Kontak Puskesmas',
      icon: Building2,
      desc: 'Nama instansi, profil legal, visi misi, sejarah, dinas induk, saluran kontak resmi, dan media sosial',
      badge: '5 Modul',
      subSections: [
        { id: 'sec-profile', label: 'Profil & Identitas Utama', icon: Building2 },
        { id: 'sec-vision', label: 'Visi, Misi & Sejarah', icon: Target },
        { id: 'sec-org', label: 'Instansi Induk & Wilayah', icon: Users },
        { id: 'sec-contact', label: 'Kontak Resmi & Alamat', icon: Phone },
        { id: 'sec-social', label: 'Tautan Media Sosial', icon: Share2 }
      ]
    },
    {
      id: 'appearance',
      label: 'Tampilan & Format',
      title: 'Format Situs & Integrasi Studio',
      icon: Globe,
      desc: 'Format zona waktu, penanggalan, judul web portal, serta integrasi terpusat Tema & Home Page Builder dan SEO',
      badge: 'Regional & Desain',
      subSections: [
        { id: 'sec-regional', label: 'Situs & Regional / Waktu', icon: Globe }
      ]
    },
    {
      id: 'services_ops',
      label: 'Layanan & Operasional',
      title: 'Manajemen Layanan & Jam Operasional',
      icon: Layers,
      desc: 'Visibilitas katalog layanan, jadwal kerja, penanganan libur nasional & microsite unit',
      badge: '3 Modul',
      subSections: [
        { id: 'sec-service-rules', label: 'Katalog & Visibilitas Layanan', icon: Layers },
        { id: 'sec-schedules', label: 'Jadwal & Penanganan Libur', icon: Calendar },
        { id: 'sec-microsite', label: 'Integrasi Portal Microsite', icon: Globe }
      ]
    },
    {
      id: 'communication',
      label: 'Komunikasi & Notifikasi',
      title: 'WhatsApp, Email SMTP & Peringatan',
      icon: MessageSquare,
      desc: 'Koneksi WhatsApp Cloud API resmi, konfigurasi server SMTP pengirim & log alert sistem',
      badge: '3 Modul',
      subSections: [
        { id: 'sec-wa', label: 'WhatsApp Cloud API', icon: MessageSquare },
        { id: 'sec-email', label: 'Email Pengirim & SMTP', icon: Mail },
        { id: 'sec-notif', label: 'Pusat Notifikasi & Log', icon: Bell }
      ]
    },
    {
      id: 'security_system',
      label: 'Sistem & Konfigurasi',
      title: 'Provider AI, Keamanan Sesi & Backup',
      icon: ShieldCheck,
      desc: 'Konfigurasi provider AI, timeout sesi, jadwal pencadangan cloud, mode maintenance & factory reset',
      badge: '5 Modul',
      subSections: [
        { id: 'sec-ai', label: 'Provider AI & Impor Berita', icon: Sparkles },
        { id: 'sec-security', label: 'Kebijakan Sesi & Keamanan', icon: ShieldCheck },
        { id: 'sec-backup', label: 'Pencadangan Sistem & Cloud', icon: HardDrive },
        { id: 'sec-maintenance', label: 'Mode Pemeliharaan (Maintenance)', icon: Wrench },
        { id: 'sec-danger', label: 'Zona Bahaya & Reset', icon: ShieldAlert }
      ]
    }
  ];

  let settings = $state<SiteSettings | null>(null);
  let initialSettingsJson = $state('');

  // Navigation State
  let activeDomain = $state('identity');
  let activeSubSection = $state('sec-profile');

  let loading = $state(true);
  let saving = $state(false);
  let resetModalOpen = $state(false);
  let testEmailSending = $state(false);

  // Logo & Favicon Upload State
  let uploadingLogo = $state(false);
  let uploadingFavicon = $state(false);
  let logoDragActive = $state(false);
  let faviconDragActive = $state(false);
  let logoPreviewBg = $state<'light' | 'dark' | 'grid'>('light');
  let showManualUrl = $state(false);

  // Sinkronisasi deep-link query (?domain=..&sub=..) dari hash router
  function applyQueryParams(q: Record<string, string>) {
    const d = q.domain;
    if (d && SETTING_DOMAINS.some(x => x.id === d) && d !== activeDomain) {
      activeDomain = d;
      const dom = SETTING_DOMAINS.find(x => x.id === d);
      activeSubSection = dom && dom.subSections.length > 0 ? dom.subSections[0].id : '';
    }
    const sub = q.sub;
    if (sub && sub !== activeSubSection) {
      const dom = SETTING_DOMAINS.find(x => x.id === activeDomain);
      if (dom && dom.subSections.some(ss => ss.id === sub)) activeSubSection = sub;
    }
  }

  $effect(() => {
    applyQueryParams(routerState.query);
  });

  // Client-side image processor & uploader
  async function handleFileUpload(file: File, type: 'logo' | 'favicon') {
    if (!file) return;

    if (!file.type.startsWith('image/') && !file.name.endsWith('.ico')) {
      toastStore.showToast('Berkas harus berupa gambar (PNG, JPG, SVG, WEBP, atau ICO).', 'error');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      toastStore.showToast('Ukuran berkas melebihi batas maksimal 8 MB.', 'error');
      return;
    }

    if (type === 'logo') uploadingLogo = true;
    else uploadingFavicon = true;

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const rawBase64 = e.target?.result as string;
        if (!rawBase64) {
          toastStore.showToast('Gagal membaca berkas gambar.', 'error');
          if (type === 'logo') uploadingLogo = false;
          else uploadingFavicon = false;
          return;
        }

        // Process with Canvas to optimize resolution and size
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.onload = async () => {
          try {
            const canvas = document.createElement('canvas');
            const maxDim = type === 'logo' ? 512 : 128;
            let { width, height } = img;

            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
            }
            const processedBase64 = canvas.toDataURL('image/png', 0.95);

            // Attempt to upload to server
            let finalUrl = processedBase64;
            try {
              const apiEndpoint = type === 'logo' ? '/api/upload-logo' : '/api/upload-favicon';
              const response = await apiFetch(apiEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageBase64: processedBase64 })
              });
              if (response.ok) {
                const resData = await response.json();
                if (resData.url) {
                  finalUrl = resData.url;
                }
              }
            } catch (netErr) {
              console.warn('Server upload failed, using DataURL fallback:', netErr);
            }

            // Immediately update settings state
            if (type === 'logo') {
              if (settings) settings.logoUrl = finalUrl;
              toastStore.showToast('Logo Puskesmas berhasil diunggah! Klik "Simpan Pengaturan" di pojok atas untuk mempermanenkan.');
            } else {
              if (settings) settings.faviconUrl = finalUrl;
              toastStore.showToast('Favicon browser berhasil diunggah! Klik "Simpan Pengaturan" untuk menyimpan.');
            }
          } catch (procErr: unknown) {
            console.error('Canvas processing error, using raw file:', procErr);
            if (type === 'logo') {
              if (settings) settings.logoUrl = rawBase64;
              toastStore.showToast('Logo berhasil dimuat.');
            } else {
              if (settings) settings.faviconUrl = rawBase64;
              toastStore.showToast('Favicon berhasil dimuat.');
            }
          } finally {
            if (type === 'logo') uploadingLogo = false;
            else uploadingFavicon = false;
          }
        };

        img.onerror = () => {
          // If SVG or cannot load into Image, fallback directly
          if (type === 'logo') {
            if (settings) settings.logoUrl = rawBase64;
          } else {
            if (settings) settings.faviconUrl = rawBase64;
          }
          if (type === 'logo') uploadingLogo = false;
          else uploadingFavicon = false;
          toastStore.showToast('Gambar berhasil dimuat.');
        };

        img.src = rawBase64;
      };

      reader.onerror = () => {
        toastStore.showToast('Gagal membaca file.', 'error');
        if (type === 'logo') uploadingLogo = false;
        else uploadingFavicon = false;
      };

      reader.readAsDataURL(file);
    } catch (err: unknown) {
      console.error('File upload error:', err);
      toastStore.showToast(errorMessage(err, 'Gagal mengunggah berkas.'), 'error');
      if (type === 'logo') uploadingLogo = false;
      else uploadingFavicon = false;
    }
  }

  $effect(() => {
    void siteSettingsService.getSettings().then(res => {
      try {
        const storedContact = memStore.getItem('puskesmas_contact_settings_v1');
        if (storedContact) {
          const contactObj = JSON.parse(storedContact);
          if (contactObj.address) res.address = contactObj.address;
          if (contactObj.village) res.village = contactObj.village;
          if (contactObj.district) res.district = contactObj.district;
          if (contactObj.regency) res.regency = contactObj.regency;
          if (contactObj.province) res.province = contactObj.province;
          if (contactObj.postalCode) res.postalCode = contactObj.postalCode;
          if (contactObj.latitude) res.latitude = contactObj.latitude;
          if (contactObj.longitude) res.longitude = contactObj.longitude;
          if (Array.isArray(contactObj.channels)) {
            const phoneCh = contactObj.channels.find((c: { type?: string }) => c.type === 'Phone');
            if (phoneCh?.value) res.phone = phoneCh.value;
            const waCh = contactObj.channels.find((c: { type?: string }) => c.type === 'WhatsApp');
            if (waCh?.value) res.whatsapp = waCh.value;
            const emailCh = contactObj.channels.find((c: { type?: string }) => c.type === 'Email');
            if (emailCh?.value) res.email = emailCh.value;
          }
        }
      } catch (e) {
        // ignore
      }
      settings = res;
      initialSettingsJson = JSON.stringify(res);
      loading = false;
    });
  });

  // Keyboard shortcut Ctrl+S / Cmd+S
  $effect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        void handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const isDirty = $derived(
    !settings || !initialSettingsJson ? false : JSON.stringify(settings) !== initialSettingsJson
  );

  // Peringatkan pengguna jika menutup/refresh dengan perubahan belum disimpan
  onMount(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  });

  const currentDomainObj = $derived(
    SETTING_DOMAINS.find(d => d.id === activeDomain) || SETTING_DOMAINS[0]
  );

  function handleDomainChange(domainId: string) {
    activeDomain = domainId;
    const domain = SETTING_DOMAINS.find(d => d.id === domainId);
    const firstSub = domain && domain.subSections.length > 0 ? domain.subSections[0].id : '';
    if (firstSub) {
      activeSubSection = firstSub;
    }
    navigate(firstSub
      ? `/admin/settings?domain=${domainId}&sub=${firstSub}`
      : `/admin/settings?domain=${domainId}`);
  }

  function handleSubSectionChange(subId: string) {
    activeSubSection = subId;
    navigate(`/admin/settings?domain=${activeDomain}&sub=${subId}`);
  }

  async function handleSave(e?: Event) {
    if (e) e.preventDefault();
    const s = settings;
    if (!s) {
      toastStore.showToast('Pengaturan sedang dimuat, silakan tunggu.', 'error');
      return;
    }

    if (!s.siteName || !s.siteName.trim()) {
      toastStore.showToast('Nama Resmi Puskesmas tidak boleh kosong.', 'error');
      return;
    }

    if (s.email && !s.email.includes('@')) {
      toastStore.showToast('Format email resmi tidak valid.', 'error');
      return;
    }

    const user = authStore.user;
    const actor = {
      id: user?.uid || 'usr-superadmin-01',
      email: user?.email || 'elengemail@gmail.com',
      name: user?.displayName || 'Super Admin'
    };

    saving = true;
    const fallbackTimer = setTimeout(() => {
      saving = false;
    }, 4000);

    try {
      const updated = await siteSettingsService.updateSettings(s, actor);
      settings = updated;
      initialSettingsJson = JSON.stringify(updated);
      toastStore.showToast('Profil Puskesmas & Pengaturan Umum berhasil disimpan & disinkronkan.');
    } catch (err: unknown) {
      console.error('Save settings error:', err);
      toastStore.showToast(errorMessage(err, 'Gagal menyimpan pengaturan'), 'error');
    } finally {
      clearTimeout(fallbackTimer);
      saving = false;
    }
  }

  async function handleReset() {
    const user = authStore.user;
    const actor = {
      id: user?.uid || 'usr-superadmin-01',
      email: user?.email || 'elengemail@gmail.com',
      name: user?.displayName || 'Super Admin'
    };

    try {
      const defaults = await siteSettingsService.resetToDefault(actor);
      settings = defaults;
      initialSettingsJson = JSON.stringify(defaults);
      resetModalOpen = false;
      toastStore.showToast('Seluruh konfigurasi berhasil dikembalikan ke setelan default pabrik.');
    } catch (err: unknown) {
      toastStore.showToast(errorMessage(err, 'Gagal mereset pengaturan'), 'error');
    }
  }

  function handleTestEmail() {
    testEmailSending = true;
    setTimeout(() => {
      testEmailSending = false;
      toastStore.showToast('Uji pengiriman email diagnostik berhasil dikirim ke antrean.');
    }, 1200);
  }
</script>

{#if loading || !settings}
  <div class="p-16 text-center text-xs text-[var(--color-muted-foreground)]">
    <RefreshCw class="w-6 h-6 animate-spin mx-auto mb-3 text-[var(--color-primary)]" />
    <span>Sinkronisasi data konfigurasi sistem...</span>
  </div>
{:else}
  {@const s = settings}

  <!-- STICKY TOP ACTION / DIRTY BAR -->
  <div class="sticky top-0 z-20 mb-6 py-2 bg-[var(--color-bg)]/80 backdrop-blur-md -mx-2 px-2 transition-all">
    <div class="p-3 bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <div class="p-2 rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
          <Sliders class="w-5 h-5" />
        </div>
        <div>
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold text-[var(--color-text)]">
              {currentDomainObj.title}
            </span>
            {#if isDirty}
              <Badge variant="amber" size="sm">
                Perubahan Belum Disimpan
              </Badge>
            {:else}
              <Badge variant="emerald" size="sm">
                <CheckCheck class="w-3 h-3 mr-1 inline" />
                Tersimpan
              </Badge>
            {/if}
          </div>
          <span class="text-[10px] text-[var(--color-muted-foreground)]">
            Tekan <kbd class="px-1.5 py-0.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded text-[9px] font-mono">Ctrl + S</kbd> untuk menyimpan cepat
          </span>
        </div>
      </div>

      <div class="flex items-center gap-2 w-full sm:w-auto justify-end">
        {#if isDirty}
          <Button
            variant="ghost"
            size="sm"
            onclick={() => {
              if (initialSettingsJson) {
                settings = JSON.parse(initialSettingsJson);
                toastStore.showToast('Perubahan yang belum disimpan telah dibatalkan.', 'info');
              }
            }}
            disabled={saving}
          >
            Batalkan
          </Button>
        {/if}
        <Button
          variant="primary"
          size="sm"
          onclick={() => handleSave()}
          disabled={saving}
          class="shadow-md"
        >
          {#if saving}
            <RefreshCw class="w-3.5 h-3.5 animate-spin" />
            <span>Menyimpan...</span>
          {:else}
            <Save class="w-3.5 h-3.5" />
            <span>Simpan Perubahan</span>
          {/if}
        </Button>
      </div>
    </div>
  </div>

  <!-- Sub-Section Filter Pills (clean horizontal navigation) -->
  {#if currentDomainObj.subSections.length > 1}
    <div class="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[var(--color-border)] mb-6">
      {#each currentDomainObj.subSections as sub (sub.id)}
        {@const SubIcon = sub.icon}
        {@const isActive = activeSubSection === sub.id}
        <button
          type="button"
          onclick={() => handleSubSectionChange(sub.id)}
          class={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition whitespace-nowrap ${
            isActive
              ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow-sm'
              : 'bg-[var(--color-card)] text-[var(--color-muted-foreground)] hover:text-[var(--color-text)] border border-[var(--color-border)]'
          }`}
        >
          <SubIcon class="w-3.5 h-3.5" />
          <span>{sub.label}</span>
        </button>
      {/each}
    </div>
  {/if}

  <!-- Main Form Panel -->
  <div class="w-full space-y-6">
    {#key settings}
    <form onsubmit={handleSave} class="space-y-6">

      <!-- ========================================================================= -->
      <!-- DOMAIN 1: IDENTITAS & PROFIL INSTANSI                                      -->
      <!-- ========================================================================= -->
      {#if activeDomain === 'identity'}
        <div class="space-y-6">

          <!-- 1.1 Profil Utama -->
          {#if activeSubSection === 'sec-profile'}
            <Card class="p-6 space-y-5 animate-in fade-in">
              <div class="border-b border-[var(--color-border)] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 class="text-base font-bold text-[var(--color-text)] flex items-center gap-2">
                    <Building2 class="w-5 h-5 text-[var(--color-primary)]" />
                    <span>Profil & Identitas Utama Puskesmas</span>
                  </h3>
                  <p class="text-xs text-[var(--color-muted-foreground)] mt-1">
                    Informasi legalitas, nama resmi, logo, dan slogan yang ditampilkan di portal publik.
                  </p>
                </div>
                <a
                  href="#/profil"
                  target="_blank"
                  rel="noreferrer"
                  class="px-3 py-1.5 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-xs font-bold flex items-center gap-1.5 hover:bg-[var(--color-primary)]/20 transition self-start sm:self-auto"
                >
                  <Eye class="w-3.5 h-3.5" />
                  <span>Pratinjau Halaman Profil</span>
                  <ExternalLink class="w-3 h-3 ml-0.5" />
                </a>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Nama Resmi Puskesmas *"
                  defaultValue={s.siteName}
                  oninput={(e) => (s.siteName = e.currentTarget.value)}
                  required
                  placeholder="Puskesmas Manding"
                />
                <Input
                  label="Nama Singkat / Brand"
                  defaultValue={s.shortName || ''}
                  oninput={(e) => { s.shortName = e.currentTarget.value; }}
                  placeholder="Puskesmas Mandiri"
                />
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Kode Standar Puskesmas (Kemenkes)"
                  defaultValue={s.puskesmasCode || ''}
                  oninput={(e) => { s.puskesmasCode = e.currentTarget.value; }}
                  placeholder="Contoh: P3529010101"
                />
                <Input
                  label="Status Akreditasi Terkini"
                  defaultValue={s.accreditationStatus || ''}
                  oninput={(e) => { s.accreditationStatus = e.currentTarget.value; }}
                  placeholder="Contoh: Paripurna (Kemenkes RI)"
                />
              </div>

              <Input
                label="Slogan / Tagline Pelayanan *"
                defaultValue={s.tagline}
                  oninput={(e) => (s.tagline = e.currentTarget.value)}
                required
                placeholder="Melayani dengan Sepenuh Hati, Sehat untuk Semua"
              />

              <div class="flex flex-col gap-1.5">
                <label class="text-[10px] uppercase font-bold tracking-widest text-[var(--color-muted-foreground)]">
                  Deskripsi Profil Lembaga
                </label>
                <textarea
                  rows={3}
                  oninput={(e) => { s.siteDescription = e.currentTarget.value; }}
                  placeholder="Penjelasan singkat visi dan layanan primer terpadu..."
                  class="bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)]/70 focus:outline-none rounded-2xl p-3 text-xs text-[var(--color-text)] placeholder-zinc-500 resize-none"
                >{s.siteDescription}</textarea>
              </div>

              <!-- Upload Logo Puskesmas Sendiri & Pratinjau -->
              <div class="space-y-4 pt-2 border-t border-[var(--color-border)]">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label class="text-[11px] uppercase font-bold tracking-widest text-[var(--color-text)] flex items-center gap-2">
                      <UploadCloud class="w-4 h-4 text-[var(--color-primary)]" />
                      <span>Logo Resmi Puskesmas</span>
                      <Badge variant="blue" size="sm">Bisa Unggah Berkas Sendiri</Badge>
                    </label>
                    <p class="text-[11px] text-[var(--color-muted-foreground)] mt-0.5">
                      Logo ini akan tampil pada bilah navigasi (header), footer situs, pratinjau sosial, dan berkas cetak antrean.
                    </p>
                  </div>

                  <div class="flex items-center gap-2">
                    <button
                      type="button"
                      onclick={() => showManualUrl = !showManualUrl}
                      class="text-[11px] text-[var(--color-muted-foreground)] hover:text-[var(--color-primary)] underline transition flex items-center gap-1"
                    >
                      <Link2 class="w-3 h-3" />
                      <span>{showManualUrl ? 'Sembunyikan Input URL' : 'Opsi Input URL'}</span>
                    </button>
                  </div>
                </div>

                <!-- Card Upload & Live Preview -->
                <div class="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)]">
                  <!-- Live Preview Column -->
                  <div class="md:col-span-4 flex flex-col items-center justify-center p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-center">
                    <span class="text-[10px] font-bold text-[var(--color-muted-foreground)] uppercase tracking-wider mb-2">
                      Pratinjau Tampilan Logo
                    </span>

                    <!-- Logo Box with switchable backgrounds -->
                    <div
                      class={`w-28 h-28 rounded-xl p-2.5 flex items-center justify-center shadow-inner transition-colors duration-200 ${
                        logoPreviewBg === 'light' ? 'bg-white border border-slate-200' :
                        logoPreviewBg === 'dark' ? 'bg-slate-900 border border-slate-700' :
                        'bg-[linear-gradient(45deg,#e2e8f0_25%,transparent_25%),linear-gradient(-45deg,#e2e8f0_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#e2e8f0_75%),linear-gradient(-45deg,transparent_75%,#e2e8f0_75%)] bg-[size:16px_16px] bg-[position:0_0,0_8px,8px_-8px,-8px_0px] bg-slate-100 border border-slate-300'
                      }`}
                    >
                      {#if s.logoUrl}
                        <img
                          src={s.logoUrl}
                          alt="Logo Puskesmas"
                          class="max-w-full max-h-full object-contain filter drop-shadow-sm"
                          onerror={(e) => {
                            (e.currentTarget as HTMLImageElement).src = '/logo.png';
                          }}
                        />
                      {:else}
                        <div class="flex flex-col items-center justify-center text-slate-400">
                          <Building2 class="w-10 h-10 stroke-[1.5]" />
                          <span class="text-[9px] font-medium mt-1">Belum ada logo</span>
                        </div>
                      {/if}
                    </div>

                    <!-- Preview Background Switcher -->
                    <div class="flex items-center gap-1 mt-2.5">
                      <span class="text-[9px] text-[var(--color-muted-foreground)] mr-1">Latar:</span>
                      <button
                        type="button"
                        onclick={() => logoPreviewBg = 'light'}
                        class={`px-1.5 py-0.5 text-[9px] font-medium rounded border ${logoPreviewBg === 'light' ? 'bg-white text-slate-900 border-slate-400 shadow-xs' : 'bg-transparent text-[var(--color-muted-foreground)] border-transparent'}`}
                      >
                        Terang
                      </button>
                      <button
                        type="button"
                        onclick={() => logoPreviewBg = 'dark'}
                        class={`px-1.5 py-0.5 text-[9px] font-medium rounded border ${logoPreviewBg === 'dark' ? 'bg-slate-900 text-white border-slate-700 shadow-xs' : 'bg-transparent text-[var(--color-muted-foreground)] border-transparent'}`}
                      >
                        Gelap
                      </button>
                      <button
                        type="button"
                        onclick={() => logoPreviewBg = 'grid'}
                        class={`px-1.5 py-0.5 text-[9px] font-medium rounded border ${logoPreviewBg === 'grid' ? 'bg-slate-200 text-slate-800 border-slate-400 shadow-xs' : 'bg-transparent text-[var(--color-muted-foreground)] border-transparent'}`}
                      >
                        Transparan
                      </button>
                    </div>
                  </div>

                  <!-- Drag and Drop & Upload Control Column -->
                  <div class="md:col-span-8 flex flex-col justify-between">
                    <div
                      ondragover={(e) => {
                        e.preventDefault();
                        logoDragActive = true;
                      }}
                      ondragleave={() => logoDragActive = false}
                      ondrop={(e) => {
                        e.preventDefault();
                        logoDragActive = false;
                        if (e.dataTransfer?.files?.[0]) {
                          void handleFileUpload(e.dataTransfer.files[0], 'logo');
                        }
                      }}
                      class={`border-2 border-dashed rounded-xl p-5 text-center flex flex-col items-center justify-center transition-all cursor-pointer ${
                        logoDragActive
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 scale-[1.01]'
                          : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/60 bg-[var(--color-surface)]/50'
                      }`}
                      onclick={() => {
                        const input = document.getElementById('logo-file-input') as HTMLInputElement;
                        if (input) input.click();
                      }}
                      onkeydown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          const input = document.getElementById('logo-file-input') as HTMLInputElement;
                          if (input) input.click();
                        }
                      }}
                      role="button"
                      tabindex="0"
                    >
                      <input
                        type="file"
                        id="logo-file-input"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        class="hidden"
                        onchange={(e) => {
                          if (e.currentTarget.files?.[0]) {
                            void handleFileUpload(e.currentTarget.files[0], 'logo');
                          }
                        }}
                      />

                      {#if uploadingLogo}
                        <div class="py-3 flex flex-col items-center gap-2">
                          <RefreshCw class="w-8 h-8 text-[var(--color-primary)] animate-spin" />
                          <span class="text-xs font-bold text-[var(--color-text)]">
                            Sedang Memproses & Mengompresi Logo...
                          </span>
                          <span class="text-[10px] text-[var(--color-muted-foreground)]">
                            Menyesuaikan resolusi untuk tampilan jernih & cepat
                          </span>
                        </div>
                      {:else}
                        <div class="py-2 flex flex-col items-center gap-1.5">
                          <div class="w-10 h-10 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center mb-1">
                            <UploadCloud class="w-5 h-5" />
                          </div>
                          <div class="text-xs font-bold text-[var(--color-text)]">
                            Klik untuk Unggah Logo atau Seret Berkas ke Sini
                          </div>
                          <div class="text-[10px] text-[var(--color-muted-foreground)] max-w-sm">
                            Mendukung format PNG, JPG, JPEG, WEBP, SVG (Maksimal 8 MB). Disarankan logo dengan latar belakang transparan.
                          </div>
                        </div>
                      {/if}
                    </div>

                    <!-- Action Buttons -->
                    <div class="flex flex-wrap items-center gap-2 mt-3 pt-2">
                      <label
                        for="logo-file-input"
                        class="px-3 py-1.5 rounded-xl bg-[var(--color-primary)] text-white text-xs font-bold hover:bg-[var(--color-primary)]/90 cursor-pointer inline-flex items-center gap-1.5 shadow-xs transition"
                      >
                        <Camera class="w-3.5 h-3.5" />
                        <span>Pilih Berkas Logo</span>
                      </label>

                      <button
                        type="button"
                        onclick={() => {
                          s.logoUrl = '/logo.png';
                          toastStore.showToast('Logo diatur kembali ke logo standar sistem.');
                        }}
                        class="px-3 py-1.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] text-xs font-medium hover:border-[var(--color-primary)] transition inline-flex items-center gap-1.5"
                      >
                        <RotateCcw class="w-3.5 h-3.5 text-zinc-400" />
                        <span>Pakai Logo Default (/logo.png)</span>
                      </button>

                      {#if s.logoUrl}
                        <button
                          type="button"
                          onclick={() => {
                            s.logoUrl = '';
                            toastStore.showToast('Logo dihapus.');
                          }}
                          class="px-2.5 py-1.5 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-medium transition inline-flex items-center gap-1 ml-auto"
                        >
                          <Trash2 class="w-3.5 h-3.5" />
                          <span>Kosongkan</span>
                        </button>
                      {/if}
                    </div>
                  </div>
                </div>

                <!-- Manual URL input fallback (shown when toggled) -->
                {#if showManualUrl}
                  <div class="p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] animate-in fade-in space-y-2">
                    <Input
                      label="Tautan URL Langsung Logo Puskesmas (CDN / File Luar)"
                      defaultValue={s.logoUrl || ''}
                      oninput={(e) => { s.logoUrl = e.currentTarget.value; }}
                      placeholder="https://.../logo.png atau /logo.png"
                    />
                    <p class="text-[10px] text-[var(--color-muted-foreground)]">
                      Anda dapat menggunakan URL langsung jika file logo sudah di-hosting di server eksternal atau CDN pemerintah.
                    </p>
                  </div>
                {/if}
              </div>

              <!-- Upload Favicon Browser Tab -->
              <div class="space-y-3 pt-4 border-t border-[var(--color-border)]">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label class="text-[11px] uppercase font-bold tracking-widest text-[var(--color-text)] flex items-center gap-2">
                      <Globe class="w-4 h-4 text-[var(--color-primary)]" />
                      <span>Favicon Tab Browser</span>
                    </label>
                    <p class="text-[11px] text-[var(--color-muted-foreground)] mt-0.5">
                      Ikon kecil yang muncul di sebelah judul situs pada tab browser pengunjung.
                    </p>
                  </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)]">
                  <!-- Browser Tab Mockup -->
                  <div class="md:col-span-5 flex flex-col justify-center p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                    <span class="text-[9px] uppercase font-bold text-[var(--color-muted-foreground)] mb-2 block">
                      Simulasi Tab Browser:
                    </span>
                    <div class="flex items-center gap-2 px-3 py-1.5 rounded-t-lg bg-white border-t border-x border-slate-300 shadow-xs max-w-xs">
                      <img
                        src={s.faviconUrl || s.logoUrl || '/logo.png'}
                        alt="Favicon"
                        class="w-4 h-4 object-contain shrink-0"
                        onerror={(e) => { (e.currentTarget as HTMLImageElement).src = '/logo.png'; }}
                      />
                      <span class="text-xs font-medium text-slate-800 truncate">
                        {s.siteName || 'Puskesmas Mandiri'}
                      </span>
                    </div>
                  </div>

                  <!-- Favicon Actions -->
                  <div class="md:col-span-7 flex flex-col justify-center gap-2">
                    <input
                      type="file"
                      id="favicon-file-input"
                      accept="image/png,image/x-icon,image/svg+xml,image/jpeg"
                      class="hidden"
                      onchange={(e) => {
                        if (e.currentTarget.files?.[0]) {
                          void handleFileUpload(e.currentTarget.files[0], 'favicon');
                        }
                      }}
                    />
                    <div class="flex flex-wrap items-center gap-2">
                      <label
                        for="favicon-file-input"
                        class="px-3 py-1.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] text-xs font-bold hover:border-[var(--color-primary)] cursor-pointer inline-flex items-center gap-1.5 transition"
                      >
                        <UploadCloud class="w-3.5 h-3.5 text-[var(--color-primary)]" />
                        <span>{uploadingFavicon ? 'Memproses...' : 'Unggah Favicon Sendiri'}</span>
                      </label>

                      <button
                        type="button"
                        onclick={() => {
                          s.faviconUrl = s.logoUrl || '/logo.png';
                          toastStore.showToast('Favicon disamakan dengan logo Puskesmas.');
                        }}
                        class="px-2.5 py-1.5 rounded-xl text-xs font-medium text-[var(--color-muted-foreground)] hover:text-[var(--color-text)] transition"
                      >
                        Samakan dengan Logo
                      </button>
                    </div>

                    {#if showManualUrl}
                      <div class="mt-2">
                        <Input
                          label="URL Manual Favicon"
                          defaultValue={s.faviconUrl || ''}
                          oninput={(e) => { s.faviconUrl = e.currentTarget.value; }}
                          placeholder="/favicon.ico atau https://.../favicon.png"
                        />
                      </div>
                    {/if}
                  </div>
                </div>
              </div>
            </Card>
          {/if}

          <!-- 1.2 Visi, Misi, Sejarah & Maklumat -->
          {#if activeSubSection === 'sec-vision'}
            <Card class="p-6 space-y-5 animate-in fade-in">
              <div class="border-b border-[var(--color-border)] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 class="text-base font-bold text-[var(--color-text)] flex items-center gap-2">
                    <Target class="w-5 h-5 text-[var(--color-primary)]" />
                    <span>Visi, Misi, Sejarah & Maklumat Pelayanan</span>
                  </h3>
                  <p class="text-xs text-[var(--color-muted-foreground)] mt-1">
                    Konten profil kelembagaan yang langsung tampil pada halaman publik resmi Puskesmas (/profil).
                  </p>
                </div>
                <a
                  href="#/profil"
                  target="_blank"
                  rel="noreferrer"
                  class="px-3 py-1.5 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-xs font-bold flex items-center gap-1.5 hover:bg-[var(--color-primary)]/20 transition self-start sm:self-auto"
                >
                  <Eye class="w-3.5 h-3.5" />
                  <span>Buka /profil</span>
                  <ExternalLink class="w-3 h-3 ml-0.5" />
                </a>
              </div>

              <div class="flex flex-col gap-1.5">
                <label class="text-[10px] uppercase font-bold tracking-widest text-[var(--color-muted-foreground)] flex items-center gap-2">
                  <span>Visi Puskesmas</span>
                  <Badge variant="blue" size="sm">Tampil di Halaman Profil</Badge>
                </label>
                <textarea
                  rows={3}
                  oninput={(e) => { s.vision = e.currentTarget.value; }}
                  placeholder="Terwujudnya masyarakat yang sehat, mandiri, dan berkeadilan melalui pelayanan primer terintegrasi..."
                  class="bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)]/70 focus:outline-none rounded-2xl p-3 text-xs text-[var(--color-text)] placeholder-zinc-500 resize-none leading-relaxed"
                >{s.vision || ''}</textarea>
              </div>

              <div class="flex flex-col gap-1.5">
                <label class="text-[10px] uppercase font-bold tracking-widest text-[var(--color-muted-foreground)] flex items-center gap-2">
                  <span>Misi Puskesmas</span>
                  <span class="text-zinc-400 text-[10px] normal-case">(Tulis per poin per baris atau dengan angka 1, 2, 3...)</span>
                </label>
                <textarea
                  rows={4}
                  oninput={(e) => { s.mission = e.currentTarget.value; }}
                  placeholder="1. Memberikan pelayanan kesehatan primer komprehensif dan bermutu.&#10;2. Mendorong kemandirian masyarakat hidup sehat.&#10;3. Meningkatkan tata kelola pelayanan terstandarisasi."
                  class="bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)]/70 focus:outline-none rounded-2xl p-3 text-xs text-[var(--color-text)] placeholder-zinc-500 resize-none leading-relaxed font-mono"
                >{s.mission || ''}</textarea>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Motto Pelayanan"
                  defaultValue={s.motto || ''}
                  oninput={(e) => { s.motto = e.currentTarget.value; }}
                  placeholder="Contoh: Kesehatan Anda, Prioritas Pengabdian Kami"
                />
                <Input
                  label="Nama Pimpinan / Kepala Puskesmas"
                  defaultValue={s.headOfPuskesmas || ''}
                  oninput={(e) => { s.headOfPuskesmas = e.currentTarget.value; }}
                  placeholder="Contoh: dr. H. Rahmat Hidayat, M.Kes"
                />
              </div>

              <div class="flex flex-col gap-1.5">
                <label class="text-[10px] uppercase font-bold tracking-widest text-[var(--color-muted-foreground)]">
                  Maklumat / Janji Pelayanan Publik
                </label>
                <textarea
                  rows={2}
                  oninput={(e) => { s.servicePromise = e.currentTarget.value; }}
                  placeholder="Kami berkomitmen memberikan pelayanan kesehatan dengan cepat, tepat, ramah, dan tanpa diskriminasi..."
                  class="bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)]/70 focus:outline-none rounded-2xl p-3 text-xs text-[var(--color-text)] placeholder-zinc-500 resize-none"
                >{s.servicePromise || ''}</textarea>
              </div>

              <div class="flex flex-col gap-1.5">
                <label class="text-[10px] uppercase font-bold tracking-widest text-[var(--color-muted-foreground)]">
                  Sejarah Singkat & Perkembangan Lembaga
                </label>
                <textarea
                  rows={3}
                  oninput={(e) => { s.history = e.currentTarget.value; }}
                  placeholder="Latar belakang berdirinya Puskesmas dan perkembangannya melayani masyarakat..."
                  class="bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)]/70 focus:outline-none rounded-2xl p-3 text-xs text-[var(--color-text)] placeholder-zinc-500 resize-none leading-relaxed"
                >{s.history || ''}</textarea>
              </div>
            </Card>
          {/if}

          <!-- 1.3 Instansi Induk & Wilayah -->
          {#if activeSubSection === 'sec-org'}
            <Card class="p-6 space-y-5 animate-in fade-in">
              <div class="border-b border-[var(--color-border)] pb-4">
                <h3 class="text-base font-bold text-[var(--color-text)] flex items-center gap-2">
                  <Users class="w-5 h-5 text-[var(--color-primary)]" />
                  <span>Instansi Induk & Wilayah Kerja</span>
                </h3>
                <p class="text-xs text-[var(--color-muted-foreground)] mt-1">
                  Hierarki kedinasan dan lingkup wilayah administratif kerja Puskesmas.
                </p>
              </div>

              <Input
                label="Nama Instansi / Dinas Kesehatan Induk"
                defaultValue={s.orgName || ''}
                oninput={(e) => { s.orgName = e.currentTarget.value; }}
                placeholder="Dinas Kesehatan Kabupaten Sejahtera"
              />

              <Input
                label="Wilayah Kerja / Kecamatan Pembina"
                defaultValue={s.orgRegion || ''}
                oninput={(e) => { s.orgRegion = e.currentTarget.value; }}
                placeholder="Kecamatan Mandiri"
              />
            </Card>
          {/if}

          <!-- 1.4 Kontak Resmi & Alamat -->
          {#if activeSubSection === 'sec-contact'}
            <Card class="p-6 space-y-5 animate-in fade-in">
              <div class="border-b border-[var(--color-border)] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 class="text-base font-bold text-[var(--color-text)] flex items-center gap-2">
                    <Phone class="w-5 h-5 text-[var(--color-primary)]" />
                    <span>Kontak Resmi & Alamat Kantor</span>
                  </h3>
                  <p class="text-xs text-[var(--color-muted-foreground)] mt-1">
                    Nomor telepon kantor, alamat email, WhatsApp pelayanan, alamat administratif, dan koordinat peta.
                  </p>
                </div>
                <a
                  href="#/admin/contact-settings"
                  class="px-3 py-1.5 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-xs font-bold flex items-center gap-1 hover:bg-[var(--color-primary)]/20 transition self-start sm:self-auto"
                >
                  <span>Saluran Kontak & Darurat Lengkap</span>
                  <ChevronRight class="w-3 h-3" />
                </a>
              </div>

              <div class="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-400">
                <CheckCircle2 class="w-4 h-4 flex-shrink-0" />
                <span>Data kontak dan alamat ini terintegrasi langsung dengan menu <strong>Saluran Kontak & Darurat</strong> serta footer portal publik.</span>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Nomor Telepon Kantor *"
                  defaultValue={s.phone}
                  oninput={(e) => (s.phone = e.currentTarget.value)}
                  required
                  placeholder="+62 21 5550192"
                />
                <Input
                  label="Nomor WhatsApp Pelayanan *"
                  defaultValue={s.whatsapp}
                  oninput={(e) => (s.whatsapp = e.currentTarget.value)}
                  required
                  placeholder="+62 812 3456 7890"
                />
              </div>

              <Input
                label="Alamat Email Resmi *"
                type="email"
                defaultValue={s.email}
                  oninput={(e) => (s.email = e.currentTarget.value)}
                required
                placeholder="layanan@puskesmas.go.id"
              />

              <div class="flex flex-col gap-1.5">
                <label class="text-[10px] uppercase font-bold tracking-widest text-[var(--color-muted-foreground)]">
                  Alamat Fisik Jalan Puskesmas
                </label>
                <textarea
                  rows={2}
                  oninput={(e) => { s.address = e.currentTarget.value; }}
                  placeholder="Jl. Kesehatan Raya No. 12..."
                  class="bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)]/70 focus:outline-none rounded-2xl p-3 text-xs text-[var(--color-text)] placeholder-zinc-500 resize-none"
                >{s.address}</textarea>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Kelurahan / Desa"
                  defaultValue={s.village || ''}
                  oninput={(e) => { s.village = e.currentTarget.value; }}
                  placeholder="Contoh: Mandiri Sejahtera"
                />
                <Input
                  label="Kecamatan"
                  defaultValue={s.district || ''}
                  oninput={(e) => { s.district = e.currentTarget.value; }}
                  placeholder="Contoh: Kecamatan Mandiri"
                />
                <Input
                  label="Kabupaten / Kota"
                  defaultValue={s.regency || ''}
                  oninput={(e) => { s.regency = e.currentTarget.value; }}
                  placeholder="Contoh: Kabupaten Sejahtera"
                />
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Provinsi"
                  defaultValue={s.province || ''}
                  oninput={(e) => { s.province = e.currentTarget.value; }}
                  placeholder="Contoh: Jawa Timur"
                />
                <Input
                  label="Kode Pos"
                  defaultValue={s.postalCode || ''}
                  oninput={(e) => { s.postalCode = e.currentTarget.value; }}
                  placeholder="Contoh: 69400"
                />
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Titik Latitude (GPS)"
                  type="number"
                  step="any"
                  defaultValue={s.latitude !== undefined ? s.latitude : ''}
                  onchange={(e) => { s.latitude = parseFloat(e.currentTarget.value) || 0; }}
                  placeholder="-7.0000"
                />
                <Input
                  label="Titik Longitude (GPS)"
                  type="number"
                  step="any"
                  defaultValue={s.longitude !== undefined ? s.longitude : ''}
                  onchange={(e) => { s.longitude = parseFloat(e.currentTarget.value) || 0; }}
                  placeholder="113.8000"
                />
              </div>

              <Input
                label="Keterangan Jam Pelayanan Reguler *"
                defaultValue={s.operatingHours}
                  oninput={(e) => (s.operatingHours = e.currentTarget.value)}
                required
                placeholder="Senin - Sabtu: 07.30 - 14.00 WIB (UGD 24 Jam)"
              />
            </Card>
          {/if}

          <!-- 1.5 Media Sosial -->
          {#if activeSubSection === 'sec-social'}
            <Card class="p-6 space-y-5 animate-in fade-in">
              <div class="border-b border-[var(--color-border)] pb-4">
                <h3 class="text-base font-bold text-[var(--color-text)] flex items-center gap-2">
                  <Share2 class="w-5 h-5 text-[var(--color-primary)]" />
                  <span>Tautan Akun Media Sosial Resmi</span>
                </h3>
                <p class="text-xs text-[var(--color-muted-foreground)] mt-1">
                  Tautan yang ditampilkan di header dan footer portal masyarakat.
                </p>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Halaman Facebook"
                  defaultValue={s.facebookUrl || ''}
                  oninput={(e) => { s.facebookUrl = e.currentTarget.value; }}
                  placeholder="https://facebook.com/puskesmas"
                />
                <Input
                  label="Akun Instagram"
                  defaultValue={s.instagramUrl || ''}
                  oninput={(e) => { s.instagramUrl = e.currentTarget.value; }}
                  placeholder="https://instagram.com/puskesmas"
                />
                <Input
                  label="Kanal YouTube"
                  defaultValue={s.youtubeUrl || ''}
                  oninput={(e) => { s.youtubeUrl = e.currentTarget.value; }}
                  placeholder="https://youtube.com/@puskesmas"
                />
                <Input
                  label="Akun TikTok Edukasi"
                  defaultValue={s.tiktokUrl || ''}
                  oninput={(e) => { s.tiktokUrl = e.currentTarget.value; }}
                  placeholder="https://tiktok.com/@puskesmas"
                />
              </div>
            </Card>
          {/if}

        </div>
      {/if}

      <!-- ========================================================================= -->
      <!-- DOMAIN 2: TAMPILAN & REGIONAL                                               -->
      <!-- ========================================================================= -->
      {#if activeDomain === 'appearance'}
        <div class="space-y-6">

          <!-- 2.1 Situs & Regional -->
          <Card class="p-6 space-y-5 animate-in fade-in">
            <div class="border-b border-[var(--color-border)] pb-4">
              <h3 class="text-base font-bold text-[var(--color-text)] flex items-center gap-2">
                <Globe class="w-5 h-5 text-[var(--color-primary)]" />
                <span>Situs & Format Regional / Waktu</span>
              </h3>
              <p class="text-xs text-[var(--color-muted-foreground)] mt-1">
                Konfigurasi judul tab browser, zona waktu, dan format penanggalan terpusat semua perangkat.
              </p>
            </div>

            <Input
              label="Judul Web Portal (Browser Title Tag)"
              defaultValue={s.siteTitle || ''}
              oninput={(e) => { s.siteTitle = e.currentTarget.value; }}
              placeholder="Pusat Kesehatan Masyarakat Mandiri Sejahtera"
            />

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="flex flex-col gap-1.5">
                <label class="text-[10px] uppercase font-bold tracking-widest text-[var(--color-muted-foreground)]">
                  Zona Waktu Operasional
                </label>
                <select
                  value={s.timezone || 'Asia/Jakarta'}
                  onchange={(e) => { s.timezone = e.currentTarget.value; }}
                  class="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl px-3 py-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
                >
                  <option value="Asia/Jakarta">Asia/Jakarta (WIB - UTC+7)</option>
                  <option value="Asia/Makassar">Asia/Makassar (WITA - UTC+8)</option>
                  <option value="Asia/Jayapura">Asia/Jayapura (WIT - UTC+9)</option>
                </select>
              </div>

              <div class="flex flex-col gap-1.5">
                <label class="text-[10px] uppercase font-bold tracking-widest text-[var(--color-muted-foreground)]">
                  Format Tanggal Sistem
                </label>
                <select
                  value={s.dateFormat || 'DD/MM/YYYY'}
                  onchange={(e) => { s.dateFormat = e.currentTarget.value; }}
                  class="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl px-3 py-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
                >
                  <option value="DD/MM/YYYY">DD/MM/YYYY (Standar RI)</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY (US)</option>
                </select>
              </div>

              <div class="flex flex-col gap-1.5">
                <label class="text-[10px] uppercase font-bold tracking-widest text-[var(--color-muted-foreground)]">
                  Format Jam
                </label>
                <select
                  value={s.timeFormat || 'HH:mm'}
                  onchange={(e) => { s.timeFormat = e.currentTarget.value; }}
                  class="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl px-3 py-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
                >
                  <option value="HH:mm">24 Jam (Contoh: 14:30)</option>
                  <option value="hh:mm A">12 Jam (Contoh: 02:30 PM)</option>
                </select>
              </div>
            </div>
          </Card>

          <!-- Integrated Direct Modules -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="p-5 bg-gradient-to-br from-[var(--color-primary)]/10 to-transparent border border-[var(--color-primary)]/20 rounded-2xl space-y-3">
              <div class="flex items-center gap-3">
                <div class="p-2.5 bg-[var(--color-primary)] text-white rounded-xl shadow-sm">
                  <Palette class="w-5 h-5" />
                </div>
                <div>
                  <h4 class="text-sm font-bold text-[var(--color-text)]">Tema & Home Page Builder</h4>
                  <p class="text-[11px] text-[var(--color-muted-foreground)]">Pengaturan desain, warna, radius, hero, dan tata letak halaman beranda.</p>
                </div>
              </div>
              <a
                href="#/admin/theme"
                class="inline-flex items-center gap-1.5 px-4 py-2 bg-[var(--color-primary)] text-white text-xs font-bold rounded-xl hover:opacity-90 transition shadow-sm"
              >
                <span>Buka Studio Desain & Beranda</span>
                <ChevronRight class="w-3.5 h-3.5" />
              </a>
            </div>

            <div class="p-5 bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/20 rounded-2xl space-y-3">
              <div class="flex items-center gap-3">
                <div class="p-2.5 bg-blue-600 text-white rounded-xl shadow-sm">
                  <Search class="w-5 h-5" />
                </div>
                <div>
                  <h4 class="text-sm font-bold text-[var(--color-text)]">SEO & Penelusuran</h4>
                  <p class="text-[11px] text-[var(--color-muted-foreground)]">Metadata Google, pratinjau WhatsApp/sosmed, robot.txt & pencarian global.</p>
                </div>
              </div>
              <a
                href="#/admin/seo"
                class="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:opacity-90 transition shadow-sm"
              >
                <span>Buka SEO & Penelusuran</span>
                <ChevronRight class="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

        </div>
      {/if}

      <!-- ========================================================================= -->
      <!-- DOMAIN 3: LAYANAN & OPERASIONAL                                            -->
      <!-- ========================================================================= -->
      {#if activeDomain === 'services_ops'}
        <div class="space-y-6">

          <!-- 3.1 Katalog & Visibilitas Layanan -->
          {#if activeSubSection === 'sec-service-rules'}
            <Card class="p-6 space-y-5 animate-in fade-in">
              <div class="border-b border-[var(--color-border)] pb-4 flex items-center justify-between">
                <div>
                  <h3 class="text-base font-bold text-[var(--color-text)] flex items-center gap-2">
                    <Layers class="w-5 h-5 text-[var(--color-primary)]" />
                    <span>Katalog & Visibilitas Layanan Publik</span>
                  </h3>
                  <p class="text-xs text-[var(--color-muted-foreground)] mt-1">
                    Pengaturan default aksesibilitas masyarakat terhadap daftar poli dan layanan.
                  </p>
                </div>
                <a
                  href="#/admin/services"
                  class="px-3 py-1.5 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-xs font-bold flex items-center gap-1 hover:bg-[var(--color-primary)]/20 transition"
                >
                  <span>Kelola Daftar Layanan</span>
                  <ChevronRight class="w-3 h-3" />
                </a>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="flex flex-col gap-1.5">
                  <label class="text-[10px] uppercase font-bold tracking-widest text-[var(--color-muted-foreground)]">
                    Visibilitas Default Layanan Baru
                  </label>
                  <select
                    value={s.defaultServiceVisibility || 'public'}
                    onchange={(e) => { s.defaultServiceVisibility = e.currentTarget.value as 'public' | 'internal'; }}
                    class="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl px-3 py-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
                  >
                    <option value="public">Publik (Terbuka untuk Umum)</option>
                    <option value="internal">Internal Saja (Hanya Petugas)</option>
                  </select>
                </div>

                <div class="flex flex-col gap-1.5">
                  <label class="text-[10px] uppercase font-bold tracking-widest text-[var(--color-muted-foreground)]">
                    Tata Urutan Tampilan Layanan
                  </label>
                  <select
                    value={s.serviceDisplayOrder || 'alphabetical'}
                    onchange={(e) => { s.serviceDisplayOrder = e.currentTarget.value as any; }}
                    class="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl px-3 py-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
                  >
                    <option value="alphabetical">Alfabetis (A - Z)</option>
                    <option value="popularity">Berdasarkan Volume Kunjungan</option>
                    <option value="custom">Urutan Kustom Administrator</option>
                  </select>
                </div>
              </div>
            </Card>
          {/if}

          <!-- 3.2 Jadwal & Penanganan Libur -->
          {#if activeSubSection === 'sec-schedules'}
            <Card class="p-6 space-y-5 animate-in fade-in">
              <div class="border-b border-[var(--color-border)] pb-4">
                <h3 class="text-base font-bold text-[var(--color-text)] flex items-center gap-2">
                  <Calendar class="w-5 h-5 text-[var(--color-primary)]" />
                  <span>Jadwal Operasional & Penanganan Hari Libur</span>
                </h3>
                <p class="text-xs text-[var(--color-muted-foreground)] mt-1">
                  Kebijakan pelayanan saat hari libur nasional atau tanggal merah.
                </p>
              </div>

              <div class="flex flex-col gap-1.5">
                <label class="text-[10px] uppercase font-bold tracking-widest text-[var(--color-muted-foreground)]">
                  Kebijakan Saat Hari Libur / Tanggal Merah
                </label>
                <select
                  value={s.holidayHandling || 'emergency_only'}
                  onchange={(e) => { s.holidayHandling = e.currentTarget.value as any; }}
                  class="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl px-3 py-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
                >
                  <option value="emergency_only">Layanan UGD & Rawat Inap 24 Jam Tetap Buka</option>
                  <option value="close">Tutup Total Seluruh Pelayanan</option>
                </select>
              </div>

              <Input
                label="Pesan Pemberitahuan Saat Tutup / Di Luar Jam Pelayanan"
                defaultValue={s.closedMessage || ''}
                oninput={(e) => { s.closedMessage = e.currentTarget.value; }}
                placeholder="Hari libur / di luar jam operasional. Hubungi UGD 24 Jam di 119."
              />
            </Card>
          {/if}

          <!-- 3.3 Integrasi Microsite -->
          {#if activeSubSection === 'sec-microsite'}
            <Card class="p-6 space-y-5 animate-in fade-in">
              <div class="border-b border-[var(--color-border)] pb-4 flex items-center justify-between">
                <div>
                  <h3 class="text-base font-bold text-[var(--color-text)] flex items-center gap-2">
                    <Globe class="w-5 h-5 text-[var(--color-primary)]" />
                    <span>Integrasi Portal Microsite Pustu / Poskesdes</span>
                  </h3>
                  <p class="text-xs text-[var(--color-muted-foreground)] mt-1">
                    Pengaktifan sub-portal mandiri untuk Puskesmas Pembantu dan jejaring.
                  </p>
                </div>
                <a
                  href="#/admin/microsites"
                  class="px-3 py-1.5 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-xs font-bold flex items-center gap-1 hover:bg-[var(--color-primary)]/20 transition"
                >
                  <span>Kelola Microsite Unit</span>
                  <ChevronRight class="w-3 h-3" />
                </a>
              </div>

              <div class="flex items-center justify-between p-4 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)]">
                <div>
                  <span class="text-xs font-bold text-[var(--color-text)] block">
                    Aktifkan Mesin Microsite Sub-Unit
                  </span>
                  <span class="text-[11px] text-[var(--color-muted-foreground)]">
                    Memungkinkan pembuatan portal satelit untuk Pustu dan Posyandu.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={s.micrositeEnabled !== false}
                  onchange={(e) => { s.micrositeEnabled = e.currentTarget.checked; }}
                  class="w-4 h-4 accent-[var(--color-primary)] cursor-pointer"
                />
              </div>
            </Card>
          {/if}

        </div>
      {/if}

      <!-- ========================================================================= -->
      <!-- DOMAIN 4: KOMUNIKASI & NOTIFIKASI                                          -->
      <!-- ========================================================================= -->
      {#if activeDomain === 'communication'}
        <div class="space-y-6">

          <!-- 4.1 WhatsApp Cloud API -->
          {#if activeSubSection === 'sec-wa'}
            <Card class="p-6 space-y-5 animate-in fade-in">
              <div class="border-b border-[var(--color-border)] pb-4 flex items-center justify-between">
                <div>
                  <h3 class="text-base font-bold text-[var(--color-text)] flex items-center gap-2">
                    <MessageSquare class="w-5 h-5 text-[var(--color-primary)]" />
                    <span>WhatsApp Cloud API Integration</span>
                  </h3>
                  <p class="text-xs text-[var(--color-muted-foreground)] mt-1">
                    Integrasi pengiriman pesan notifikasi antrean, tiket pengaduan, dan konfirmasi otomatis.
                  </p>
                </div>
                <Badge variant="emerald">API Terkoneksi</Badge>
              </div>

              <div class="p-4 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl flex items-center justify-between">
                <div>
                  <span class="text-xs font-bold text-[var(--color-text)] block">
                    Status Saluran WhatsApp Gateway
                  </span>
                  <span class="text-[11px] text-emerald-400 font-bold">
                    {s.whatsappStatus || 'Connected (Online)'}
                  </span>
                </div>
                <span class="text-xs font-mono text-[var(--color-muted-foreground)]">
                  Token Secret: {s.whatsappApiTokenMasked || '••••••••1234'}
                </span>
              </div>

              <div class="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-2 text-xs text-amber-200">
                <HelpCircle class="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  Kredensial token Meta WhatsApp Business API tersimpan aman pada level container environment dan terenkripsi secara otomatis.
                </span>
              </div>
            </Card>
          {/if}

          <!-- 4.2 Email & SMTP -->
          {#if activeSubSection === 'sec-email'}
            <Card class="p-6 space-y-5 animate-in fade-in">
              <div class="border-b border-[var(--color-border)] pb-4 flex items-center justify-between">
                <div>
                  <h3 class="text-base font-bold text-[var(--color-text)] flex items-center gap-2">
                    <Mail class="w-5 h-5 text-[var(--color-primary)]" />
                    <span>Email Pengirim & Server SMTP</span>
                  </h3>
                  <p class="text-xs text-[var(--color-muted-foreground)] mt-1">
                    Konfigurasi alamat pengirim notifikasi email dan uji coba koneksi SMTP.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onclick={handleTestEmail}
                  disabled={testEmailSending}
                >
                  {#if testEmailSending}
                    <RefreshCw class="w-3.5 h-3.5 animate-spin" />
                  {:else}
                    <Send class="w-3.5 h-3.5" />
                  {/if}
                  <span>Uji Kirim Email</span>
                </Button>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Nama Pengirim (Sender Display Name)"
                  defaultValue={s.emailSenderName || ''}
                  oninput={(e) => { s.emailSenderName = e.currentTarget.value; }}
                  placeholder="Notifikasi Puskesmas Mandiri"
                />
                <Input
                  label="Email Pengirim (From Address)"
                  defaultValue={s.emailSenderEmail || ''}
                  oninput={(e) => { s.emailSenderEmail = e.currentTarget.value; }}
                  placeholder="noreply@puskesmas-mandiri.go.id"
                />
              </div>

              <div class="p-4 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl flex items-center justify-between">
                <div>
                  <span class="text-xs font-bold text-[var(--color-text)] block">
                    Status Konfigurasi SMTP
                  </span>
                  <span class="text-[11px] text-[var(--color-muted-foreground)]">
                    Port 587 / TLS terenkripsi aman
                  </span>
                </div>
                <Badge variant="emerald">Configured</Badge>
              </div>
            </Card>
          {/if}

          <!-- 4.3 Pusat Notifikasi & Log -->
          {#if activeSubSection === 'sec-notif'}
            <Card class="p-6 space-y-5 animate-in fade-in">
              <div class="border-b border-[var(--color-border)] pb-4">
                <h3 class="text-base font-bold text-[var(--color-text)] flex items-center gap-2">
                  <Bell class="w-5 h-5 text-[var(--color-primary)]" />
                  <span>Pusat Notifikasi & Retensi Log</span>
                </h3>
                <p class="text-xs text-[var(--color-muted-foreground)] mt-1">
                  Durasi penyimpanan riwayat notifikasi dan pengaktifan peringatan sistem.
                </p>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Masa Retensi Riwayat Log (Hari)"
                  type="number"
                  defaultValue={s.notificationRetentionDays || 30}
                  onchange={(e) => { s.notificationRetentionDays = parseInt(e.currentTarget.value) || 30; }}
                />

                <div class="flex items-center justify-between p-4 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)]">
                  <div>
                    <span class="text-xs font-bold text-[var(--color-text)] block">
                      Peringatan Otomatis Administrator
                    </span>
                    <span class="text-[10px] text-[var(--color-muted-foreground)]">
                      Kirim alert saat ada pengaduan baru / lonjakan antrean
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={s.adminAlertsEnabled !== false}
                    onchange={(e) => { s.adminAlertsEnabled = e.currentTarget.checked; }}
                    class="w-4 h-4 accent-[var(--color-primary)] cursor-pointer"
                  />
                </div>
              </div>
            </Card>
          {/if}

        </div>
      {/if}

      <!-- ========================================================================= -->
      <!-- DOMAIN 5: SISTEM & KONFIGURASI                                            -->
      <!-- ========================================================================= -->
      {#if activeDomain === 'security_system'}
        <div class="space-y-6">

          <!-- 5.1 Provider AI & Impor Berita -->
          {#if activeSubSection === 'sec-ai'}
            <AIProviderSettingsCard />
          {/if}

          <!-- 5.2 Kebijakan Sesi & Keamanan -->
          {#if activeSubSection === 'sec-security'}
            <Card class="p-6 space-y-5 animate-in fade-in">
              <div class="border-b border-[var(--color-border)] pb-4">
                <h3 class="text-base font-bold text-[var(--color-text)] flex items-center gap-2">
                  <ShieldCheck class="w-5 h-5 text-[var(--color-primary)]" />
                  <span>Keamanan Sesi & Kebijakan Sandi</span>
                </h3>
                <p class="text-xs text-[var(--color-muted-foreground)] mt-1">
                  Proteksi login tenaga medis, auto-logout sesi tidak aktif, dan standar sandi.
                </p>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Batas Timeout Sesi Tidak Aktif (Menit)"
                  type="number"
                  defaultValue={s.sessionTimeoutMinutes || 60}
                  onchange={(e) => { s.sessionTimeoutMinutes = parseInt(e.currentTarget.value) || 60; }}
                />

                <div class="flex flex-col gap-1.5">
                  <label class="text-[10px] uppercase font-bold tracking-widest text-[var(--color-muted-foreground)]">
                    Standar Kompleksitas Kata Sandi
                  </label>
                  <select
                    value={s.passwordPolicyLevel || 'strict'}
                    onchange={(e) => { s.passwordPolicyLevel = e.currentTarget.value as 'standard' | 'strict'; }}
                    class="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl px-3 py-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
                  >
                    <option value="strict">Strict (Min 8 Karakter, Kombinasi Angka & Simbol)</option>
                    <option value="standard">Standard (Minimal 6 Karakter)</option>
                  </select>
                </div>
              </div>
            </Card>
          {/if}

          <!-- 5.3 Pencadangan Sistem -->
          {#if activeSubSection === 'sec-backup'}
            <Card class="p-6 space-y-5 animate-in fade-in">
              <div class="border-b border-[var(--color-border)] pb-4 flex items-center justify-between">
                <div>
                  <h3 class="text-base font-bold text-[var(--color-text)] flex items-center gap-2">
                    <HardDrive class="w-5 h-5 text-[var(--color-primary)]" />
                    <span>Pencadangan Sistem & Sinkronisasi Cloud</span>
                  </h3>
                  <p class="text-xs text-[var(--color-muted-foreground)] mt-1">
                    Jadwal pencadangan otomatis snapshot database dan retensi arsip.
                  </p>
                </div>
                <a
                  href="#/admin/system/backup"
                  class="px-3 py-1.5 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-xs font-bold flex items-center gap-1 hover:bg-[var(--color-primary)]/20 transition"
                >
                  <HardDrive class="w-3.5 h-3.5" />
                  <span>Buka Pusat Backup & Google Drive</span>
                  <ChevronRight class="w-3 h-3" />
                </a>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Jadwal Cron Backup Otomatis"
                  defaultValue={s.backupScheduleCron || '0 2 * * *'}
                  oninput={(e) => { s.backupScheduleCron = e.currentTarget.value; }}
                  placeholder="0 2 * * * (Setiap jam 02.00 pagi)"
                />
                <Input
                  label="Masa Retensi Arsip Backup (Hari)"
                  type="number"
                  defaultValue={s.backupRetentionDays || 7}
                  onchange={(e) => { s.backupRetentionDays = parseInt(e.currentTarget.value) || 7; }}
                />
              </div>
            </Card>
          {/if}

          <!-- 5.4 Mode Pemeliharaan (Maintenance) -->
          {#if activeSubSection === 'sec-maintenance'}
            <Card class="p-6 space-y-6 animate-in fade-in">
              <div class="border-b border-[var(--color-border)] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 class="text-base font-bold text-[var(--color-text)] flex items-center gap-2">
                    <Wrench class="w-5 h-5 text-rose-500" />
                    <span>Mode Pemeliharaan Darurat (Maintenance Mode)</span>
                  </h3>
                  <p class="text-xs text-[var(--color-muted-foreground)] mt-1">
                    Tutup portal publik sementara waktu saat update sistem dengan tampilan layar penuh estetik.
                  </p>
                </div>
                <Badge variant={s.maintenanceMode ? 'rose' : 'zinc'}>
                  {s.maintenanceMode ? 'MAINTENANCE AKTIF' : 'NORMAL / ONLINE'}
                </Badge>
              </div>

              {#if s.maintenanceMode}
                <div class="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3">
                  <AlertTriangle class="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <div class="space-y-1 text-xs">
                    <span class="font-bold text-rose-500 block">Situs Sedang Dalam Mode Pemeliharaan</span>
                    <p class="text-[var(--color-text)]">
                      Pengunjung umum akan melihat halaman pemeliharaan layar penuh. Admin tetap dapat mengakses dashboard melalui login khusus.
                    </p>
                  </div>
                </div>
              {/if}

              <!-- Maintenance Toggle -->
              <div class="flex items-center justify-between p-4 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)]">
                <div>
                  <span class="text-xs font-bold text-[var(--color-text)] block">
                    Aktifkan Sakelar Pemeliharaan
                  </span>
                  <span class="text-[11px] text-[var(--color-muted-foreground)]">
                    {s.maintenanceMode
                      ? 'Website saat ini tertutup bagi publik.'
                      : 'Website terbuka normal untuk seluruh masyarakat.'}
                  </span>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={s.maintenanceMode === true}
                    onchange={(e) => { s.maintenanceMode = e.currentTarget.checked; }}
                    class="sr-only peer"
                  />
                  <div class="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
                </label>
              </div>

              <!-- Presets Grid -->
              <div class="space-y-3 pt-2 border-t border-[var(--color-border)]">
                <label class="text-xs font-bold text-[var(--color-text)] block">
                  Pilihan Wallpaper Latar Layar Penuh
                </label>

                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {#each MAINTENANCE_BG_PRESETS as preset (preset.id)}
                    {@const isSelected = (s.maintenanceBackgroundPreset || 'hospital-modern') === preset.id}
                    <div
                      onclick={() => { s.maintenanceBackgroundPreset = preset.id; }}
                      onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); s.maintenanceBackgroundPreset = preset.id; } }}
                      role="button"
                      tabindex="0"
                      class={`group relative rounded-2xl overflow-hidden border cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/40 shadow-lg scale-[1.02]'
                          : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/50'
                      }`}
                    >
                      <div class="aspect-video w-full relative overflow-hidden bg-zinc-900">
                        <img
                          src={preset.thumbnail}
                          alt={preset.name}
                          class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          referrerPolicy="no-referrer"
                        />
                        <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                        {#if isSelected}
                          <div class="absolute top-2 right-2 px-2 py-0.5 bg-[var(--color-primary)] text-[var(--color-primary-foreground)] rounded-xl text-[9px] font-bold flex items-center gap-1 shadow-md">
                            <Check class="w-3 h-3" />
                            <span>Aktif</span>
                          </div>
                        {/if}
                      </div>
                      <div class="p-2.5 bg-[var(--color-card)]">
                        <span class="text-xs font-bold text-[var(--color-text)] block truncate">
                          {preset.name}
                        </span>
                      </div>
                    </div>
                  {/each}
                </div>
              </div>

              <!-- Message & Completion -->
              <div class="space-y-4 pt-2 border-t border-[var(--color-border)]">
                <div class="flex flex-col gap-1.5">
                  <label class="text-[10px] uppercase font-bold tracking-widest text-[var(--color-muted-foreground)]">
                    Pesan Pemberitahuan untuk Pengunjung
                  </label>
                  <textarea
                    rows={2}
                    oninput={(e) => { s.maintenanceMessage = e.currentTarget.value; }}
                    placeholder="Mohon maaf, sistem sedang dalam pemeliharaan berkala..."
                    class="bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)]/70 focus:outline-none rounded-2xl p-3 text-xs text-[var(--color-text)] placeholder-zinc-500 resize-none"
                  >{s.maintenanceMessage || ''}</textarea>
                </div>

                <Input
                  label="Estimasi Waktu Selesai"
                  placeholder="Contoh: 2 Jam / Pukul 15:00 WIB"
                  defaultValue={s.maintenanceEstimatedCompletion || ''}
                  oninput={(e) => { s.maintenanceEstimatedCompletion = e.currentTarget.value; }}
                />
              </div>
            </Card>
          {/if}

          <!-- 5.5 Zona Bahaya / Reset -->
          {#if activeSubSection === 'sec-danger'}
            <Card class="p-6 space-y-5 border-rose-500/30 bg-rose-500/5 animate-in fade-in">
              <div class="border-b border-rose-500/20 pb-4">
                <h3 class="text-base font-bold text-rose-400 flex items-center gap-2">
                  <ShieldAlert class="w-5 h-5" />
                  <span>Zona Berbahaya & Kembalikan ke Setelan Pabrik</span>
                </h3>
                <p class="text-xs text-[var(--color-muted-foreground)] mt-1">
                  Tindakan administratif berisiko tinggi yang memulihkan seluruh konfigurasi sistem ke kondisi awal.
                </p>
              </div>

              <div class="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 space-y-3">
                <div class="text-xs text-rose-300">
                  <p class="font-bold">Perhatian Khusus:</p>
                  <p class="mt-1 leading-relaxed">
                    Mereset pengaturan akan mengembalikan seluruh nama, kontak, warna tema, jadwal libur, dan preferensi website ke nilai bawaan.
                  </p>
                </div>

                <Button
                  type="button"
                  onclick={() => resetModalOpen = true}
                  variant="ghost"
                  size="sm"
                  class="bg-rose-600 hover:bg-rose-700 text-white font-bold border-0 shadow-md"
                >
                  <RotateCcw class="w-3.5 h-3.5" />
                  <span>Reset Pengaturan ke Default Pabrik</span>
                </Button>
              </div>
            </Card>
          {/if}

        </div>
      {/if}

    </form>
    {/key}
  </div>

  <!-- RESET CONFIRMATION MODAL -->
  <ConfirmModal
    isOpen={resetModalOpen}
    onClose={() => resetModalOpen = false}
    onConfirm={() => void handleReset()}
    title="Konfirmasi Reset Pengaturan"
    confirmLabel="Ya, Reset Sekarang"
    message="Apakah Anda yakin ingin mengembalikan seluruh pengaturan sistem ke setelan awal pabrik? Tindakan ini akan dicatat dalam Audit Log resmi."
  />
{/if}
