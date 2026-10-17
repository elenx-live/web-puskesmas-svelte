<!-- @component Template beranda "Harmoni Nusantara Modern" — hangat batik geometris + maklumat pelayanan. -->
<script lang="ts">
  import { fade, fly, scale } from 'svelte/transition';
  import { HeartPulse, Activity, ArrowRight, ChevronRight, Users, Crown } from 'lucide-svelte';
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
  <!-- HERO SECTION: HARMONI NUSANTARA ART & CULTURE MODERN -->
  <section class="relative min-h-[90vh] flex items-center justify-center pt-28 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden border-b border-[var(--color-border)]">
    <ArtisticBackgroundCanvas type="golden_radiance" intensity="vibrant" interactive={true} />

    <div class="relative max-w-7xl mx-auto w-full z-10 space-y-12">
      <!-- Royal Heritage Badge -->
      <div class="text-center">
        <div
          in:scale={{ duration: 500, start: 0.9 }}
          class="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-bold shadow-md"
        >
          <Crown class="w-4 h-4 text-amber-600 animate-pulse" />
          <span>Harmoni Pelayanan Kesehatan Berkarakter Nusantara</span>
        </div>
      </div>

      <!-- Main Title & Editorial Headline -->
      <div class="text-center max-w-4xl mx-auto space-y-6">
        <h1
          in:fly={{ y: 20, duration: 700 }}
          class="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-[var(--color-text)] tracking-tight leading-[1.15]"
        >
          Mengabdi dengan Hati, <br />
          <span class="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 via-emerald-600 to-teal-600">
            Merawat Sepenuh Jiwa
          </span>
        </h1>

        <p
          in:fly={{ y: 20, duration: 700, delay: 100 }}
          class="text-sm sm:text-base text-[var(--color-muted-foreground)] max-w-2xl mx-auto leading-relaxed"
        >
          Kearifan lokal berpadu dengan inovasi kedokteran modern. Puskesmas Manding hadir
          mendampingi kesehatan keluarga di setiap langkah kehidupan.
        </p>

        <!-- Nusantara Action CTAs -->
        <div
          in:fly={{ y: 20, duration: 700, delay: 200 }}
          class="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2"
        >
          {#if flags?.onlineQueue !== false}
            <a
              href="#/pendaftaran"
              class="w-full sm:w-auto px-8 py-4 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-sm shadow-xl hover:shadow-amber-600/25 hover:scale-105 transition-all flex items-center justify-center gap-2"
            >
              <Activity class="w-4 h-4" />
              <span>Daftar Pelayanan Online</span>
              <ArrowRight class="w-4 h-4" />
            </a>
          {/if}
          <a
            href="#/layanan"
            class="w-full sm:w-auto px-7 py-4 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text)] font-bold text-sm hover:border-amber-500/50 transition flex items-center justify-center gap-2"
          >
            <HeartPulse class="w-4 h-4 text-amber-600" />
            <span>Lihat Fasilitas & Poli</span>
          </a>
        </div>
      </div>

      <!-- Majestic Indonesian Warmth Stats Card -->
      <div
        in:fly={{ y: 30, duration: 800, delay: 300 }}
        class="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto"
      >
        <div class="p-6 rounded-3xl bg-[var(--color-card)]/90 backdrop-blur-md border border-amber-500/20 shadow-xl text-center space-y-2">
          <span class="text-3xl font-black text-amber-600 dark:text-amber-400 block">5 Klaster</span>
          <p class="text-xs font-semibold text-[var(--color-text)]">Integrasi Layanan Primer</p>
        </div>
        <div class="p-6 rounded-3xl bg-[var(--color-card)]/90 backdrop-blur-md border border-emerald-500/20 shadow-xl text-center space-y-2">
          <span class="text-3xl font-black text-emerald-600 dark:text-emerald-400 block">24 Jam</span>
          <p class="text-xs font-semibold text-[var(--color-text)]">UGD & Bersalin Siaga</p>
        </div>
        <div class="p-6 rounded-3xl bg-[var(--color-card)]/90 backdrop-blur-md border border-teal-500/20 shadow-xl text-center space-y-2">
          <span class="text-3xl font-black text-teal-600 dark:text-teal-400 block">11 SPP</span>
          <p class="text-xs font-semibold text-[var(--color-text)]">Standar Pelayanan Terbuka</p>
        </div>
        <div class="p-6 rounded-3xl bg-[var(--color-card)]/90 backdrop-blur-md border border-amber-500/20 shadow-xl text-center space-y-2">
          <span class="text-3xl font-black text-amber-600 dark:text-amber-400 block">100%</span>
          <p class="text-xs font-semibold text-[var(--color-text)]">Gratis Peserta BPJS</p>
        </div>
      </div>
    </div>
  </section>

  <!-- SAMBUTAN KEPALA PUSKESMAS RESMI -->
  <section in:fade={{ duration: 600 }} class="py-20 px-4 sm:px-6 lg:px-8 border-b border-[var(--color-border)] bg-[var(--color-card)]/40">
    <div class="max-w-5xl mx-auto p-8 rounded-3xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-xl grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
      <div class="md:col-span-4 flex flex-col items-center text-center space-y-3">
        <div class="w-32 h-32 rounded-3xl bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center text-amber-600 font-bold shadow-inner">
          <Users class="w-14 h-14" />
        </div>
        <div>
          <div class="text-sm font-bold text-[var(--color-text)]">
            {settings?.headOfPuskesmas || 'dr. H. Ahmad Fauzi, M.Kes'}
          </div>
          <div class="text-xs text-[var(--color-muted-foreground)]">Kepala Puskesmas</div>
        </div>
      </div>
      <div class="md:col-span-8 space-y-4">
        <span class="text-xs font-bold uppercase tracking-widest text-amber-600">Maklumat Pelayanan</span>
        <h3 class="text-xl font-bold text-[var(--color-text)]">
          "Kesehatan Anda adalah Amanah dan Kehormatan Pengabdian Kami"
        </h3>
        <p class="text-xs sm:text-sm text-[var(--color-muted-foreground)] leading-relaxed italic">
          "Kami berikrar memberikan pelayanan yang mudah, cepat, dan bermartabat tanpa
          membeda-bedakan status sosial, demi mewujudkan masyarakat yang mandiri dan sejahtera."
        </p>
        <div class="flex gap-3 pt-2">
          <a
            href="#/maklumat-pelayanan"
            class="text-xs font-bold text-amber-600 hover:underline flex items-center gap-1"
          >
            <span>Baca Maklumat Selengkapnya</span>
            <ChevronRight class="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  </section>
</div>
