<!-- @component Template beranda "Avant-Garde Cyber-Clinic" — futuristik dengan telemetri radar antrean. -->
<script lang="ts">
  import { fly, scale } from 'svelte/transition';
  import { Zap, Radio, ArrowRight, Stethoscope, ChevronRight } from 'lucide-svelte';
  import type {
    ServiceEntity,
    PostEntity,
    SiteSettings,
    AnnouncementEntity,
    MicrositeEntity,
    SiteFeatureFlags
  } from '../../../shared/types/index.js';
  import ArtisticBackgroundCanvas from '../components/artistic/ArtisticBackgroundCanvas.svelte';

  interface Props {
    services?: ServiceEntity[];
    posts?: PostEntity[];
    settings: SiteSettings | null;
    announcements?: AnnouncementEntity[];
    microsites?: MicrositeEntity[];
    flags?: Partial<SiteFeatureFlags> | Record<string, boolean>;
  }

  let {
    services = [],
    posts = [],
    settings,
    announcements = [],
    microsites = [],
    flags = {}
  }: Props = $props();
</script>

<div class="relative w-full overflow-hidden bg-[var(--color-bg)]">
  <!-- HERO SECTION: AVANT-GARDE CYBER-CLINICAL (FUTURISTIK KONTEMPORER) -->
  <section class="relative min-h-[92vh] flex items-center justify-center pt-28 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden border-b border-[var(--color-border)]">
    <ArtisticBackgroundCanvas type="particle_mesh" intensity="vibrant" interactive={true} />

    <!-- Ambient Laser Neon Glows -->
    <div
      class="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none"
    ></div>

    <div class="relative max-w-7xl mx-auto w-full z-10 space-y-12">
      <!-- Cyber Status Ticker -->
      <div class="flex items-center justify-center">
        <div
          in:scale={{ duration: 500, start: 0.9 }}
          class="inline-flex items-center gap-3 px-5 py-2 rounded-2xl bg-[var(--color-card)]/90 backdrop-blur-xl border border-cyan-500/30 text-xs shadow-2xl"
        >
          <div class="flex items-center gap-2">
            <span class="relative flex h-2.5 w-2.5">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
            </span>
            <span class="font-mono font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-widest text-[10px]">
              TELEMETRI KLINIS REALTIME
            </span>
          </div>
          <span class="text-[var(--color-border)]">|</span>
          <span class="text-[var(--color-text)] font-semibold">UGD Siaga 24 Jam Aktif</span>
        </div>
      </div>

      <!-- Main Hero Header -->
      <div class="text-center max-w-4xl mx-auto space-y-6">
        <h1
          in:fly={{ y: 20, duration: 700 }}
          class="text-4xl sm:text-6xl lg:text-7xl font-black text-[var(--color-text)] tracking-tight leading-[1.05]"
        >
          Transformasi <br />
          <span class="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-400 to-indigo-500">
            Layanan Kesehatan Digital
          </span>
        </h1>

        <p
          in:fly={{ y: 20, duration: 700, delay: 100 }}
          class="text-sm sm:text-base text-[var(--color-muted-foreground)] max-w-2xl mx-auto leading-relaxed"
        >
          Integrasi rekam medis elektronik, antrean cerdas berbasis kuota poli, dan tata kelola 5
          Klaster terpadu untuk kecepatan dan kepastian diagnosis pasien.
        </p>

        <!-- Futuristic CTA Buttons -->
        <div
          in:fly={{ y: 20, duration: 700, delay: 200 }}
          class="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
        >
          {#if flags?.onlineQueue !== false}
            <a
              href="#/pendaftaran"
              class="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-teal-600 text-white font-extrabold text-sm shadow-xl hover:shadow-cyan-500/25 hover:scale-105 transition-all flex items-center justify-center gap-2"
            >
              <Zap class="w-4 h-4" />
              <span>Ambil Tiket Pendaftaran</span>
              <ArrowRight class="w-4 h-4" />
            </a>
          {/if}

          <a
            href="#/antrian-display"
            class="w-full sm:w-auto px-8 py-4 rounded-2xl bg-[var(--color-card)]/90 backdrop-blur-md border border-[var(--color-border)] text-[var(--color-text)] font-extrabold text-sm hover:border-cyan-500/50 hover:bg-[var(--color-card)] transition flex items-center justify-center gap-2 shadow-lg"
          >
            <Radio class="w-4 h-4 text-cyan-500 animate-pulse" />
            <span>Radar Antrean Poli</span>
          </a>
        </div>
      </div>

      <!-- Telemetry Dashboard Strip -->
      <div
        in:fly={{ y: 30, duration: 800, delay: 300 }}
        class="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto"
      >
        <div class="p-6 rounded-3xl bg-[var(--color-card)]/80 backdrop-blur-xl border border-[var(--color-border)] shadow-xl space-y-2">
          <span class="text-[10px] font-mono uppercase text-cyan-600 dark:text-cyan-400 font-bold">
            Rerata Waktu Tunggu
          </span>
          <div class="text-3xl font-black text-[var(--color-text)]">12 Menit</div>
          <p class="text-[11px] text-[var(--color-muted-foreground)]">Efisiensi sistem antrean digital</p>
        </div>

        <div class="p-6 rounded-3xl bg-[var(--color-card)]/80 backdrop-blur-xl border border-[var(--color-border)] shadow-xl space-y-2">
          <span class="text-[10px] font-mono uppercase text-teal-600 dark:text-teal-400 font-bold">
            Kepuasan Pasien SKM
          </span>
          <div class="text-3xl font-black text-[var(--color-text)]">99.4%</div>
          <p class="text-[11px] text-[var(--color-muted-foreground)]">Survei publik terverifikasi</p>
        </div>

        <div class="p-6 rounded-3xl bg-[var(--color-card)]/80 backdrop-blur-xl border border-[var(--color-border)] shadow-xl space-y-2">
          <span class="text-[10px] font-mono uppercase text-indigo-600 dark:text-indigo-400 font-bold">
            Standar Pelayanan
          </span>
          <div class="text-3xl font-black text-[var(--color-text)]">11 SPP</div>
          <p class="text-[11px] text-[var(--color-muted-foreground)]">Transparansi SOP pelayanan</p>
        </div>

        <div class="p-6 rounded-3xl bg-[var(--color-card)]/80 backdrop-blur-xl border border-[var(--color-border)] shadow-xl space-y-2">
          <span class="text-[10px] font-mono uppercase text-rose-600 dark:text-rose-400 font-bold">
            Respon Gawat Darurat
          </span>
          <div class="text-3xl font-black text-[var(--color-text)]">&lt; 3 Mnt</div>
          <p class="text-[11px] text-[var(--color-muted-foreground)]">UGD & Ambulans Terpadu</p>
        </div>
      </div>
    </div>
  </section>

  <!-- SERVICE CATALOG BENTO-GRID -->
  <section class="py-20 px-4 sm:px-6 lg:px-8 border-b border-[var(--color-border)]">
    <div class="max-w-7xl mx-auto space-y-12">
      <div class="flex items-center justify-between">
        <div>
          <span class="text-xs font-mono font-bold uppercase tracking-wider text-cyan-600">
            MODUL POLIKLINIK TERINTEGRASI
          </span>
          <h2 class="text-2xl sm:text-3xl font-black text-[var(--color-text)] mt-1">
            Katalog Pelayanan Rawat Jalan
          </h2>
        </div>
        <a href="#/layanan" class="text-xs font-bold text-cyan-600 hover:underline flex items-center gap-1">
          <span>Buka Seluruh Layanan</span>
          <ArrowRight class="w-3.5 h-3.5" />
        </a>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        {#each services.slice(0, 6) as srv (srv.id)}
          <div
            class="group p-6 rounded-3xl bg-[var(--color-card)] border border-[var(--color-border)] hover:border-cyan-500/50 hover:shadow-2xl transition-all space-y-4"
          >
            <div class="flex items-center justify-between">
              <div class="w-10 h-10 rounded-2xl bg-cyan-500/10 text-cyan-600 flex items-center justify-center font-bold">
                <Stethoscope class="w-5 h-5" />
              </div>
              <span class="font-mono text-[10px] px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-600 font-bold">
                ONLINE READY
              </span>
            </div>
            <h3 class="text-base font-bold text-[var(--color-text)] group-hover:text-cyan-500 transition">
              {srv.name}
            </h3>
            <p class="text-xs text-[var(--color-muted-foreground)] line-clamp-2">
              {srv.description || 'Pemeriksaan klinis berbasis standar pelayanan prima puskesmas.'}
            </p>
            <div class="pt-3 border-t border-[var(--color-border)] flex items-center justify-between text-xs">
              <span class="text-[var(--color-muted-foreground)]">Jadwal: Senin - Sabtu</span>
              <a
                href="#/layanan/{srv.slug || srv.id}"
                class="font-bold text-cyan-600 hover:underline flex items-center gap-1"
              >
                <span>Akses Poli</span>
                <ChevronRight class="w-3 h-3" />
              </a>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </section>
</div>
