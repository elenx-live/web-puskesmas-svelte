<!-- @component Template beranda "Seni Organik Bio-Luminescence" — holistik alami dengan 4 pilar perawatan. -->
<script lang="ts">
  import { fly, scale } from 'svelte/transition';
  import {
    HeartPulse,
    Activity,
    Clock,
    ShieldCheck,
    Leaf,
    Droplets,
    Award,
    Users,
    Stethoscope,
    ArrowRight,
    ChevronRight
  } from 'lucide-svelte';
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

  const carePillars = [
    {
      title: 'Kesehatan Preventif & Edukasi',
      icon: Leaf,
      desc: 'Pemberdayaan masyarakat, posyandu terpadu, dan pendampingan nutrisi seimbang untuk keluarga sehat.',
      badge: 'Preventif',
      count: '14 Program'
    },
    {
      title: 'Pemeriksaan Rutin & Skrining',
      icon: Activity,
      desc: 'Deteksi dini diabetes, hipertensi, kanker serviks, serta pemeriksaan berkala kesehatan balita dan lansia.',
      badge: 'Skrining Dini',
      count: '9 Paket'
    },
    {
      title: 'Klinik Kuratif & Poliklinik',
      icon: Stethoscope,
      desc: 'Penanganan medis umum, poli gigi, KIA, KB, serta konsultasi dokter umum dengan rekam medis digital.',
      badge: 'Pelayanan Poli',
      count: '8 Poliklinik'
    },
    {
      title: 'UGD & Rehabilitatif 24 Jam',
      icon: Droplets,
      desc: 'Penanganan kegawatdaruratan, persalinan siaga 24 jam, fisioterapi dasar, dan pemulihan kesehatan.',
      badge: 'Siaga 24/7',
      count: '24 Jam Penuh'
    }
  ];
</script>

<div class="relative w-full overflow-hidden bg-[var(--color-bg)]">
  <!-- HERO SECTION: BIOLUMINESCENT ORGANIC ARTISTRY -->
  <section class="relative min-h-[90vh] flex items-center justify-center pt-28 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden border-b border-[var(--color-border)]">
    <ArtisticBackgroundCanvas type="bioluminescent" intensity="vibrant" interactive={true} />

    <!-- Natural Ambient Lighting -->
    <div class="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
    <div class="absolute bottom-10 left-10 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>

    <div class="relative max-w-7xl mx-auto w-full z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
      <!-- Left Column: Flowing Editorial Typography -->
      <div class="lg:col-span-7 space-y-8 text-left">
        <div
          in:fly={{ x: -20, duration: 600 }}
          class="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold"
        >
          <Leaf class="w-4 h-4 text-emerald-600 animate-bounce" />
          <span>Seni Perawatan Kesehatan Alami & Terintegrasi</span>
        </div>

        <div in:fly={{ y: 20, duration: 700, delay: 100 }} class="space-y-4">
          <h1 class="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-[var(--color-text)] tracking-tight leading-[1.12]">
            Menjaga Harmoni <br />
            <span class="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500">
              Kesehatan Keluarga
            </span>
          </h1>
          <p class="text-sm sm:text-base text-[var(--color-muted-foreground)] leading-relaxed max-w-xl">
            {settings?.tagline ||
              'Pelayanan kesehatan holistik dengan sentuhan kasih, berbasis transformasi digital 5 Klaster terpadu untuk kualitas hidup yang lebih prima.'}
          </p>
        </div>

        <!-- Interactive Search Bar & Actions -->
        <div in:fly={{ y: 20, duration: 700, delay: 200 }} class="space-y-4">
          <div class="flex flex-wrap items-center gap-3">
            {#if flags?.onlineQueue !== false}
              <a
                href="#/pendaftaran"
                class="px-7 py-4 rounded-3xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-xl hover:shadow-emerald-500/20 hover:scale-[1.02] transition-all flex items-center gap-2"
              >
                <Activity class="w-4 h-4" />
                <span>Ambil Antrean Online</span>
                <ArrowRight class="w-4 h-4" />
              </a>
            {/if}
            <a
              href="#/layanan"
              class="px-6 py-4 rounded-3xl bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text)] font-bold text-sm hover:border-emerald-500/50 transition flex items-center gap-2"
            >
              <HeartPulse class="w-4 h-4 text-emerald-600" />
              <span>Jelajahi Poliklinik</span>
            </a>
          </div>

          <div class="flex items-center gap-4 text-xs text-[var(--color-muted-foreground)] pt-2">
            <span class="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
              <Clock class="w-3.5 h-3.5" /> Buka Setiap Hari (24 Jam UGD)
            </span>
            <span>•</span>
            <span class="flex items-center gap-1.5 font-semibold text-[var(--color-text)]">
              <ShieldCheck class="w-3.5 h-3.5 text-teal-600" /> Akreditasi Paripurna
            </span>
          </div>
        </div>
      </div>

      <!-- Right Column: Organic Floating Visual Matrix -->
      <div
        in:scale={{ duration: 800, delay: 300, start: 0.95 }}
        class="lg:col-span-5 grid grid-cols-2 gap-4"
      >
        <div class="p-6 rounded-3xl bg-[var(--color-card)]/90 backdrop-blur-md border border-[var(--color-border)] shadow-xl space-y-3">
          <div class="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center font-bold">
            <Users class="w-6 h-6" />
          </div>
          <div class="text-2xl font-black text-[var(--color-text)]">5 Klaster</div>
          <p class="text-xs text-[var(--color-muted-foreground)]">Integrasi Layanan Primer Siklus Hidup</p>
        </div>

        <div class="p-6 rounded-3xl bg-[var(--color-card)]/90 backdrop-blur-md border border-[var(--color-border)] shadow-xl space-y-3 mt-6">
          <div class="w-12 h-12 rounded-2xl bg-teal-500/15 text-teal-600 flex items-center justify-center font-bold">
            <Droplets class="w-6 h-6" />
          </div>
          <div class="text-2xl font-black text-[var(--color-text)]">24 Jam</div>
          <p class="text-xs text-[var(--color-muted-foreground)]">UGD & Persalinan Respon Darurat</p>
        </div>

        <div class="p-6 rounded-3xl bg-[var(--color-card)]/90 backdrop-blur-md border border-[var(--color-border)] shadow-xl space-y-3">
          <div class="w-12 h-12 rounded-2xl bg-cyan-500/15 text-cyan-600 flex items-center justify-center font-bold">
            <ShieldCheck class="w-6 h-6" />
          </div>
          <div class="text-2xl font-black text-[var(--color-text)]">11 Standar</div>
          <p class="text-xs text-[var(--color-muted-foreground)]">SPP Terbuka & Kepuasan Publik</p>
        </div>

        <div class="p-6 rounded-3xl bg-[var(--color-card)]/90 backdrop-blur-md border border-[var(--color-border)] shadow-xl space-y-3 mt-6">
          <div class="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-600 flex items-center justify-center font-bold">
            <Award class="w-6 h-6" />
          </div>
          <div class="text-2xl font-black text-[var(--color-text)]">99.2%</div>
          <p class="text-xs text-[var(--color-muted-foreground)]">Indeks Kepuasan Masyarakat (SKM)</p>
        </div>
      </div>
    </div>
  </section>

  <!-- 4 PILLARS OF CARE (SENI HOLISTIK) -->
  <section class="py-20 px-4 sm:px-6 lg:px-8 border-b border-[var(--color-border)]">
    <div class="max-w-7xl mx-auto space-y-12">
      <div class="text-center max-w-3xl mx-auto space-y-3">
        <span class="text-xs font-extrabold uppercase tracking-widest text-emerald-600">
          Pilar Pelayanan Berkelanjutan
        </span>
        <h2 class="text-2xl sm:text-4xl font-extrabold text-[var(--color-text)]">
          Perawatan Komprehensif di Setiap Fase Usia
        </h2>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {#each carePillars as pillar, idx (idx)}
          {@const Icon = pillar.icon}
          <div
            class="p-7 rounded-3xl bg-[var(--color-card)] border border-[var(--color-border)] hover:border-emerald-500/50 hover:shadow-2xl transition-all duration-300 space-y-4 flex flex-col justify-between"
          >
            <div class="space-y-3">
              <div class="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <Icon class="w-6 h-6" />
              </div>
              <span class="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                {pillar.badge}
              </span>
              <h3 class="text-base font-bold text-[var(--color-text)]">{pillar.title}</h3>
              <p class="text-xs text-[var(--color-muted-foreground)] leading-relaxed">{pillar.desc}</p>
            </div>
            <div class="pt-4 border-t border-[var(--color-border)] text-[11px] font-bold text-[var(--color-text)]">
              {pillar.count}
            </div>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- POPULAR CLINICS & SERVICES -->
  <section class="py-20 px-4 sm:px-6 lg:px-8 border-b border-[var(--color-border)] bg-[var(--color-card)]/40">
    <div class="max-w-7xl mx-auto space-y-10">
      <div class="flex items-center justify-between">
        <div>
          <span class="text-xs font-bold uppercase tracking-wider text-emerald-600">
            Poli & Pelayanan Rawat Jalan
          </span>
          <h2 class="text-2xl sm:text-3xl font-extrabold text-[var(--color-text)] mt-1">
            Layanan Kesehatan Terdepan
          </h2>
        </div>
        <a href="#/layanan" class="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1">
          <span>Semua Layanan</span>
          <ArrowRight class="w-3.5 h-3.5" />
        </a>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        {#each services.slice(0, 6) as srv (srv.id)}
          <div
            class="p-6 rounded-3xl bg-[var(--color-card)] border border-[var(--color-border)] hover:border-emerald-500/40 hover:shadow-lg transition space-y-3"
          >
            <div class="flex items-center justify-between">
              <div class="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                <Stethoscope class="w-5 h-5" />
              </div>
              <span class="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                Poli Aktif
              </span>
            </div>
            <h3 class="text-sm font-bold text-[var(--color-text)]">{srv.name}</h3>
            <p class="text-xs text-[var(--color-muted-foreground)] line-clamp-2">{srv.description}</p>
            <a
              href="#/layanan/{srv.slug || srv.id}"
              class="pt-2 text-xs font-bold text-emerald-600 hover:underline inline-flex items-center gap-1"
            >
              <span>Lihat Jadwal & Alur</span>
              <ChevronRight class="w-3.5 h-3.5" />
            </a>
          </div>
        {/each}
      </div>
    </div>
  </section>
</div>
