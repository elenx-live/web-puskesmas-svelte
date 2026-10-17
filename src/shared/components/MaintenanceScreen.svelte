<!--
  @component Layar pemeliharaan sistem — ditampilkan App.svelte saat
  maintenanceMode aktif untuk rute publik (dengan bypass untuk admin).
-->
<script lang="ts">
  import {
    HeartPulse, Globe, FileText, MessageSquare, Lock,
    Wrench, Clock, Phone, ChevronRight, RefreshCw,
  } from 'lucide-svelte';
  import Badge from '../../shared/ui/Badge.svelte';
  import { getMaintenanceBackgroundImage } from '../../shared/data/maintenancePresets.js';
  import type { SiteSettings } from '../../shared/types/index.js';

  interface Props {
    /** Pengaturan situs (untuk pesan & konfigurasi maintenance). */
    settings: SiteSettings | null;
  }

  const { settings }: Props = $props();

  const siteTitle = $derived(settings?.siteTitle || settings?.siteName || 'Puskesmas Manding');
  const orgName = $derived(settings?.orgName || 'Dinas Kesehatan Kabupaten Sejahtera');
  const message = $derived(
    settings?.maintenanceMessage ||
    'Mohon maaf atas ketidaknyamanannya. Portal publik Puskesmas sedang dalam pemeliharaan sistem berkala dan pemulihan data untuk meningkatkan keandalan pelayanan.'
  );
  const estCompletion = $derived(settings?.maintenanceEstimatedCompletion);
  const phone = $derived(settings?.phone || '(021) 555-0192');
  const whatsapp = $derived(settings?.whatsapp || '081234567890');
  const address = $derived(settings?.address || 'Jl. Kesehatan Raya No. 123, Kabupaten Sejahtera');

  const bgUrl = $derived(
    getMaintenanceBackgroundImage(settings?.maintenanceBackgroundPreset, settings?.maintenanceCustomBackgroundUrl)
  );

  const opacityPercent = $derived(settings?.maintenanceOverlayOpacity ?? 75);
  const overlayStyle = $derived(settings?.maintenanceOverlayStyle || 'blur');

  const showMicrosite = $derived(settings?.maintenanceShowMicrositeMenu !== false);
  const showAdmin = $derived(settings?.maintenanceShowAdminMenu !== false);
  const showEmergency = $derived(settings?.maintenanceShowEmergencyContact !== false);
  const showDokumen = $derived(settings?.maintenanceShowDokumenMenu !== false);
  const showPengaduan = $derived(settings?.maintenanceShowPengaduanMenu !== false);
</script>

<div
  class="min-h-screen w-full relative flex flex-col justify-between text-white overflow-x-hidden font-sans selection:bg-rose-500 selection:text-white"
>
  <div class="fixed inset-0 z-0 overflow-hidden pointer-events-none">
    <img
      src={bgUrl}
      alt="Maintenance Fullscreen Background"
      class="w-full h-full object-cover object-center transform scale-105 transition-transform duration-1000"
      referrerpolicy="no-referrer"
    />

    <div
      class="absolute inset-0 transition-all duration-300 {overlayStyle === 'gradient'
        ? 'bg-gradient-to-b from-slate-950/90 via-slate-950/75 to-slate-950/95 backdrop-blur-md'
        : overlayStyle === 'dark'
          ? 'bg-slate-950/90'
          : 'bg-slate-950/80 backdrop-blur-lg'}"
      style="background-color: rgba(10, 15, 29, {opacityPercent / 100});"
    />

    <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-rose-500/20 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
    <div class="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
  </div>

  <header
    class="relative z-20 w-full border-b border-white/10 bg-black/40 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4"
  >
    <div class="flex items-center gap-3">
      <div
        class="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center shadow-lg shadow-rose-500/20 shrink-0"
      >
        <HeartPulse class="w-5 h-5" />
      </div>
      <div>
        <div class="text-sm font-extrabold tracking-tight text-white flex items-center gap-2">
          <span>{siteTitle}</span>
          <span
            class="hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold uppercase tracking-wider"
          >
            Maintenance
          </span>
        </div>
        <p class="text-[11px] text-zinc-400 font-medium truncate max-w-xs sm:max-w-md">{orgName}</p>
      </div>
    </div>

    <div class="flex items-center gap-2 sm:gap-3 shrink-0">
      {#if showMicrosite}
        <a
          href="#/microsites"
          class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-semibold text-white backdrop-blur-md transition shadow-xs"
          title="Microsite"
        >
          <Globe class="w-3.5 h-3.5 text-cyan-400" />
          <span>Microsite</span>
        </a>
      {/if}

      {#if showDokumen}
        <a
          href="#/dokumen"
          class="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-semibold text-white backdrop-blur-md transition"
          title="Lihat Dokumen Standar Pelayanan"
        >
          <FileText class="w-3.5 h-3.5 text-amber-400" />
          <span>Dokumen SPP</span>
        </a>
      {/if}

      {#if showPengaduan}
        <a
          href="#/pengaduan/cek"
          class="hidden lg:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-semibold text-white backdrop-blur-md transition"
          title="Cek Status Tiket Pengaduan"
        >
          <MessageSquare class="w-3.5 h-3.5 text-emerald-400" />
          <span>Cek Pengaduan</span>
        </a>
      {/if}

      {#if showAdmin}
        <a
          href="#/login"
          class="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition transform hover:scale-[1.02]"
          title="Masuk ke Panel Administrator & Staf"
        >
          <Lock class="w-3.5 h-3.5" />
          <span>Menu Admin</span>
        </a>
      {/if}
    </div>
  </header>

  <main class="relative z-20 max-w-3xl w-full mx-auto px-4 py-8 sm:py-12 my-auto space-y-6">
    <div
      class="bg-slate-900/85 border border-white/15 rounded-3xl p-6 sm:p-10 text-center space-y-6 shadow-2xl backdrop-blur-xl relative overflow-hidden"
    >
      <div class="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-rose-500 to-transparent"></div>

      <div class="relative mx-auto w-20 h-20 flex items-center justify-center">
        <div class="absolute inset-0 rounded-3xl bg-rose-500/25 animate-ping opacity-50"></div>
        <div
          class="w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-600 to-rose-400 border border-rose-300/40 text-white flex items-center justify-center relative shadow-xl shadow-rose-600/40"
        >
          <Wrench class="w-8 h-8 animate-bounce-slow" />
        </div>
      </div>

      <div
        class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-inner"
      >
        <span class="w-2 h-2 rounded-full bg-rose-400 animate-pulse"></span>
        Mode Pemeliharaan Sistem Aktif
      </div>

      <div class="space-y-2">
        <h1 class="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Situs Sedang Dalam Pemeliharaan Berkala
        </h1>
        <p class="text-xs sm:text-sm font-semibold text-rose-300">{siteTitle} — {orgName}</p>
      </div>

      <div
        class="p-5 rounded-2xl bg-slate-950/70 border border-white/10 text-xs sm:text-sm text-zinc-300 leading-relaxed text-left space-y-3 shadow-inner"
      >
        <p class="text-zinc-200">{message}</p>
        {#if estCompletion}
          <div class="pt-3 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <span class="text-zinc-400 flex items-center gap-1.5">
              <Clock class="w-3.5 h-3.5 text-amber-400" />
              <span>Estimasi Selesai Pemeliharaan:</span>
            </span>
            <span class="font-bold text-amber-300 bg-amber-500/20 px-3 py-1 rounded-xl border border-amber-500/30">
              {estCompletion}
            </span>
          </div>
        {/if}
      </div>

      <div class="space-y-3 pt-2">
        <div class="text-[11px] font-bold uppercase tracking-wider text-zinc-400 text-left">
          Menu & Layanan Yang Dapat Diakses:
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
          {#if showMicrosite}
            <a
              href="#/microsites"
              class="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-400/40 transition group flex items-start gap-3.5"
            >
              <div
                class="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform"
              >
                <Globe class="w-5 h-5" />
              </div>
              <div class="space-y-0.5 flex-1 min-w-0">
                <span class="text-xs font-bold text-white group-hover:text-cyan-300 transition block truncate">Microsite</span>
                <p class="text-[11px] text-zinc-400 line-clamp-2">Akses direktori dan informasi microsite.</p>
              </div>
              <ChevronRight class="w-4 h-4 text-zinc-500 group-hover:text-cyan-400 shrink-0 mt-2" />
            </a>
          {/if}

          {#if showAdmin}
            <a
              href="#/login"
              class="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-rose-400/40 transition group flex items-start gap-3.5"
            >
              <div
                class="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform"
              >
                <Lock class="w-5 h-5" />
              </div>
              <div class="space-y-0.5 flex-1 min-w-0">
                <span class="text-xs font-bold text-white group-hover:text-rose-300 transition block truncate">
                  Menu Login Administrator
                </span>
                <p class="text-[11px] text-zinc-400 line-clamp-2">
                  Masuk ke panel manajemen data, verifikasi registrasi, dan pengaturan sistem.
                </p>
              </div>
              <ChevronRight class="w-4 h-4 text-zinc-500 group-hover:text-rose-400 shrink-0 mt-2" />
            </a>
          {/if}

          {#if showEmergency}
            <div class="p-4 rounded-2xl bg-white/5 border border-white/10 sm:col-span-2 space-y-3">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div
                    class="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center"
                  >
                    <Phone class="w-4 h-4" />
                  </div>
                  <span class="text-xs font-bold text-white">Layanan Gawat Darurat (UGD) & Ambulans 24 Jam</span>
                </div>
                <Badge variant="emerald" size="sm">SIAGA 24 JAM</Badge>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {#if phone}
                  <a
                    href="tel:{phone}"
                    class="p-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-semibold flex items-center justify-center gap-2 transition"
                  >
                    <Phone class="w-3.5 h-3.5" />
                    <span>Hotline: {phone}</span>
                  </a>
                {/if}
                {#if whatsapp}
                  <a
                    href="https://wa.me/{whatsapp.replace(/[^0-9]/g, '')}"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="p-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-200 font-semibold flex items-center justify-center gap-2 transition"
                  >
                    <MessageSquare class="w-3.5 h-3.5 text-emerald-400" />
                    <span>WhatsApp UGD: {whatsapp}</span>
                  </a>
                {/if}
              </div>
            </div>
          {/if}
        </div>
      </div>

      <div class="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <button
          onclick={() => window.location.reload()}
          class="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-semibold text-white transition flex items-center justify-center gap-2 shadow-md"
        >
          <RefreshCw class="w-3.5 h-3.5" />
          <span>Muat Ulang Halaman</span>
        </button>

        {#if showAdmin}
          <a
            href="#/login"
            class="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30"
          >
            <Lock class="w-3.5 h-3.5" />
            <span>Masuk Sebagai Administrator</span>
          </a>
        {/if}
      </div>
    </div>
  </main>

  <footer class="relative z-20 w-full border-t border-white/10 bg-black/50 backdrop-blur-md px-4 py-4 text-center space-y-1">
    <p class="text-[11px] text-zinc-300">
      Pelayanan Medis Langsung di Instalasi Gawat Darurat (IGD) Puskesmas tetap beroperasi penuh 24 Jam setiap hari.
    </p>
    <p class="text-[10px] text-zinc-500">
      {address} • &copy; {new Date().getFullYear()} {siteTitle}. Hak Cipta Dilindungi.
    </p>
  </footer>
</div>
