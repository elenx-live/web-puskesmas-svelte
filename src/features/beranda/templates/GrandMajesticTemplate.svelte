<!-- @component Template beranda "Kemegahan Mahakarya Sovereign" — aurora megah dengan 5 klaster ILP. -->
<script lang="ts">
  import { fly, scale } from 'svelte/transition';
  import {
    HeartPulse,
    Activity,
    Clock,
    ShieldCheck,
    Users,
    Sparkles,
    Phone,
    ArrowRight,
    Calendar,
    FileText,
    Megaphone,
    ChevronRight,
    Award,
    Stethoscope,
    Building2,
    CheckCircle2
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

  let activeClusterTab = $state(0);

  // 5 Klaster Kesehatan (Permenkes 19/2024)
  const healthClusters = [
    {
      id: 1,
      title: 'Klaster 1: Manajemen & Tata Kelola',
      subtitle: 'Ketatausahaan, Perencanaan & Mutu',
      desc: 'Koordinasi operasional, administrasi digital, dan pemantauan standar mutu pelayanan puskesmas.',
      icon: Building2,
      badge: 'Tata Kelola',
      color: 'emerald'
    },
    {
      id: 2,
      title: 'Klaster 2: Ibu & Anak',
      subtitle: 'Kesehatan Ibu, Balita & Remaja',
      desc: 'Pemeriksaan kehamilan (ANC Terpadu), imunisasi rutin, tumbuh kembang balita, dan pencegahan stunting.',
      icon: Users,
      badge: 'Prioritas Nasional',
      color: 'amber'
    },
    {
      id: 3,
      title: 'Klaster 3: Dewasa & Lansia',
      subtitle: 'Usia Produktif & Geriatri',
      desc: 'Skrining berkala Penyakit Tidak Menular (PTM), hipertensi, diabetes melitus, dan kebugaran lansia.',
      icon: HeartPulse,
      badge: 'Skrining Dini',
      color: 'rose'
    },
    {
      id: 4,
      title: 'Klaster 4: Penanggulangan P2P',
      subtitle: 'Pencegahan & Pengendalian Penyakit',
      desc: 'Surveilans epidemiologi, imunisasi khusus, pengendalian DBD, TB, dan sanitasi kesehatan lingkungan.',
      icon: ShieldCheck,
      badge: 'Surveilans 24 Jam',
      color: 'cyan'
    },
    {
      id: 5,
      title: 'Lintas Klaster: UGD & Farmasi',
      subtitle: 'Gawat Darurat, Rawat Inap & Lab',
      desc: 'Respon cepat medis darurat 24 jam, ambulans siaga, apotek terintegrasi, dan laboratorium darah.',
      icon: Activity,
      badge: 'Siaga 24/7',
      color: 'indigo'
    }
  ];

  const filteredServices = $derived(services.slice(0, 6));
  const featuredPosts = $derived(posts.slice(0, 3));
  const latestAnnouncement = $derived(announcements[0]);
</script>

<div class="relative w-full overflow-hidden bg-[var(--color-bg)]">
  <!-- HERO SECTION: GRAND SOVEREIGN MAJESTIC (SENI ARSITEKTUR KESEHATAN) -->
  <section class="relative min-h-[92vh] flex items-center justify-center pt-24 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden border-b border-[var(--color-border)]">
    <ArtisticBackgroundCanvas type="aurora_flow" intensity="vibrant" interactive={true} />

    <!-- Ambient Gradient Overlay & Noise -->
    <div class="absolute inset-0 bg-gradient-to-b from-[var(--color-primary)]/5 via-transparent to-[var(--color-bg)] pointer-events-none"></div>

    <div class="relative max-w-7xl mx-auto w-full z-10 space-y-12">
      <!-- Announcement Ticker Bar (if exists) -->
      {#if latestAnnouncement}
        <div in:fly={{ y: -12, duration: 600 }} class="max-w-4xl mx-auto">
          <div class="flex items-center gap-3 p-2.5 sm:p-3 rounded-2xl bg-[var(--color-card)]/80 backdrop-blur-md border border-[var(--color-primary)]/30 shadow-lg text-xs">
            <span class="px-2.5 py-1 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5 shrink-0">
              <Megaphone class="w-3.5 h-3.5" />
              Warta Resmi
            </span>
            <span class="font-semibold text-[var(--color-text)] truncate flex-1">
              {latestAnnouncement.title}
            </span>
            <a
              href="#/informasi"
              class="text-[var(--color-primary)] font-bold hover:underline shrink-0 flex items-center gap-1 text-[11px]"
            >
              <span>Lihat</span>
              <ChevronRight class="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      {/if}

      <!-- Majestic Hero Header & Value Proposition -->
      <div class="text-center max-w-4xl mx-auto space-y-6">
        <div
          in:scale={{ duration: 600, delay: 100, start: 0.95 }}
          class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/40 text-[var(--color-primary)] text-xs font-bold uppercase tracking-widest shadow-inner"
        >
          <Sparkles class="w-4 h-4 animate-pulse text-[var(--color-primary)]" />
          <span>{settings?.tagline || 'Pusat Pelayanan Primer Terintegrasi & Ramah'}</span>
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
        </div>

        <h1
          in:fly={{ y: 15, duration: 700, delay: 200 }}
          class="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-[var(--color-text)] tracking-tight leading-[1.15]"
        >
          {settings?.siteName || 'Puskesmas Manding'}
          <span class="block text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-primary)] via-teal-500 to-amber-500 mt-2">
            Kesehatan Berkualitas untuk Semua
          </span>
        </h1>

        <p
          in:fly={{ y: 15, duration: 700, delay: 300 }}
          class="text-sm sm:text-base text-[var(--color-muted-foreground)] max-w-2xl mx-auto leading-relaxed"
        >
          Penyelenggaraan transformasi pelayanan kesehatan primer terintegrasi 5 Klaster berbasis
          digital, standar mutu nasional (Permenkes 19/2024), dan komitmen sepenuh hati.
        </p>

        <!-- Action Buttons & Fast Direct Search -->
        <div
          in:fly={{ y: 15, duration: 700, delay: 400 }}
          class="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2"
        >
          {#if flags?.onlineQueue !== false}
            <a
              href="#/pendaftaran"
              class="w-full sm:w-auto px-7 py-4 rounded-2xl bg-[var(--color-primary)] text-[var(--color-primary-foreground)] font-bold text-sm hover:opacity-95 shadow-xl hover:shadow-[var(--color-primary)]/25 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
            >
              <Activity class="w-4 h-4" />
              <span>Daftar Pasien Online</span>
              <ArrowRight class="w-4 h-4" />
            </a>
          {/if}

          <a
            href="#/layanan"
            class="w-full sm:w-auto px-7 py-4 rounded-2xl bg-[var(--color-card)]/90 backdrop-blur-md border border-[var(--color-border)] text-[var(--color-text)] font-bold text-sm hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-card)] transition flex items-center justify-center gap-2 shadow-md"
          >
            <HeartPulse class="w-4 h-4 text-[var(--color-primary)]" />
            <span>Katalog Layanan & Poli</span>
          </a>

          <a
            href="tel:0215550199"
            class="w-full sm:w-auto px-5 py-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 font-bold text-sm hover:bg-rose-500/20 transition flex items-center justify-center gap-2"
          >
            <Phone class="w-4 h-4 text-rose-500" />
            <span>UGD 24 Jam</span>
          </a>
        </div>
      </div>

      <!-- Dynamic Quick Access Pill Cards (Mobile & Desktop) -->
      <div
        in:fly={{ y: 20, duration: 800, delay: 500 }}
        class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 max-w-6xl mx-auto"
      >
        {#each [
          { title: 'Daftar Online', subtitle: 'Tanpa Antre', icon: Activity, href: '/pendaftaran', color: 'emerald' },
          { title: 'Antrean Live', subtitle: 'Radar Poli', icon: Clock, href: '/antrian-display', color: 'sky' },
          { title: 'Jadwal Dokter', subtitle: 'Poli Spesifik', icon: Calendar, href: '/layanan', color: 'amber' },
          { title: 'Pengaduan', subtitle: 'Respon Cepat', icon: ShieldCheck, href: '/pengaduan', color: 'rose' },
          { title: 'Dokumen SPP', subtitle: 'Standar Mutu', icon: FileText, href: '/dokumen', color: 'indigo' },
          { title: 'Survei SKM', subtitle: 'Indeks Kepuasan', icon: Award, href: '/survei', color: 'teal' }
        ] as item, idx (idx)}
          {@const Icon = item.icon}
          <a
            href="#{item.href}"
            class="group relative p-4 rounded-3xl bg-[var(--color-card)]/85 backdrop-blur-md border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:shadow-xl hover:scale-[1.03] transition-all duration-300 flex flex-col items-center text-center space-y-2"
          >
            <div class="w-11 h-11 rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center group-hover:scale-110 group-hover:bg-[var(--color-primary)] group-hover:text-[var(--color-primary-foreground)] transition duration-300 shadow-sm">
              <Icon class="w-5 h-5" />
            </div>
            <div>
              <div class="text-xs font-bold text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition">
                {item.title}
              </div>
              <div class="text-[10px] text-[var(--color-muted-foreground)]">{item.subtitle}</div>
            </div>
          </a>
        {/each}
      </div>
    </div>
  </section>

  <!-- 5-KLASTER HEALTH INTEGRATION SHOWCASE (ARSITEKTUR MEDIS MODERN) -->
  <section class="py-20 px-4 sm:px-6 lg:px-8 border-b border-[var(--color-border)] bg-[var(--color-card)]/50 relative">
    <div class="max-w-7xl mx-auto space-y-12">
      <div class="text-center max-w-3xl mx-auto space-y-3">
        <span class="text-xs font-extrabold uppercase tracking-widest text-[var(--color-primary)]">
          Integrasi Pelayanan Primer (ILP)
        </span>
        <h2 class="text-2xl sm:text-4xl font-extrabold text-[var(--color-text)]">
          Penyelenggaraan Berbasis 5 Klaster Terpadu
        </h2>
        <p class="text-xs sm:text-sm text-[var(--color-muted-foreground)] leading-relaxed">
          Sesuai amanat Permenkes RI No. 19 Tahun 2024, seluruh layanan dikelompokkan menurut
          siklus hidup manusia untuk menjamin perawatan holistik.
        </p>
      </div>

      <!-- Cluster Selector Tabs -->
      <div class="grid grid-cols-1 md:grid-cols-5 gap-3">
        {#each healthClusters as cluster, idx (cluster.id)}
          {@const Icon = cluster.icon}
          {@const isSelected = activeClusterTab === idx}
          <button
            type="button"
            onclick={() => (activeClusterTab = idx)}
            class="p-4 rounded-3xl text-left border transition-all duration-300 {isSelected
              ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] border-[var(--color-primary)] shadow-xl scale-[1.02]'
              : 'bg-[var(--color-card)] text-[var(--color-text)] border-[var(--color-border)] hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-bg)]'}"
          >
            <div class="flex items-center justify-between mb-3">
              <div
                class="p-2.5 rounded-2xl {isSelected
                  ? 'bg-black/20 text-white'
                  : 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'}"
              >
                <Icon class="w-5 h-5" />
              </div>
              <span
                class="text-[10px] px-2 py-0.5 rounded-full font-bold {isSelected
                  ? 'bg-white/20 text-white'
                  : 'bg-[var(--color-bg)] text-[var(--color-muted-foreground)] border border-[var(--color-border)]'}"
              >
                {cluster.badge}
              </span>
            </div>
            <div class="text-xs font-bold line-clamp-1">{cluster.title}</div>
            <div class="text-[11px] mt-1 {isSelected ? 'text-white/80' : 'text-[var(--color-muted-foreground)]'}">
              {cluster.subtitle}
            </div>
          </button>
        {/each}
      </div>

      <!-- Active Cluster Details Box -->
      <div class="p-6 sm:p-8 rounded-3xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div class="lg:col-span-8 space-y-4">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-xs font-bold">
            <CheckCircle2 class="w-4 h-4" />
            <span>Klaster Terpilih: {healthClusters[activeClusterTab].title}</span>
          </div>
          <h3 class="text-xl sm:text-2xl font-bold text-[var(--color-text)]">
            {healthClusters[activeClusterTab].subtitle}
          </h3>
          <p class="text-xs sm:text-sm text-[var(--color-muted-foreground)] leading-relaxed">
            {healthClusters[activeClusterTab].desc}
          </p>
          <div class="flex flex-wrap gap-3 pt-2">
            <a
              href="#/layanan"
              class="px-5 py-2.5 rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-foreground)] text-xs font-bold hover:opacity-90 transition flex items-center gap-1.5"
            >
              <span>Buka Layanan Terkait</span>
              <ArrowRight class="w-3.5 h-3.5" />
            </a>
            <a
              href="#/dokumen"
              class="px-5 py-2.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-xs font-bold text-[var(--color-text)] hover:border-[var(--color-primary)] transition"
            >
              Lihat Standar Pelayanan (SPP)
            </a>
          </div>
        </div>

        <div class="lg:col-span-4 bg-[var(--color-bg)] p-5 rounded-2xl border border-[var(--color-border)] space-y-3">
          <span class="text-[11px] font-bold text-[var(--color-muted-foreground)] uppercase tracking-wider block">
            Status Operasional Klaster
          </span>
          <div class="space-y-2 text-xs">
            <div class="flex items-center justify-between p-2 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)]">
              <span class="text-[var(--color-muted-foreground)]">Dokter Penanggung Jawab</span>
              <span class="font-bold text-[var(--color-text)]">Tersedia Siaga</span>
            </div>
            <div class="flex items-center justify-between p-2 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)]">
              <span class="text-[var(--color-muted-foreground)]">Pendaftaran Online</span>
              <span class="font-bold text-emerald-600 dark:text-emerald-400">Buka 07:30 - 13:00</span>
            </div>
            <div class="flex items-center justify-between p-2 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)]">
              <span class="text-[var(--color-muted-foreground)]">Ketersediaan Obat</span>
              <span class="font-bold text-[var(--color-primary)]">Lengkap (100%)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- POPULAR SERVICES CATALOG GRID -->
  <section class="py-20 px-4 sm:px-6 lg:px-8 border-b border-[var(--color-border)]">
    <div class="max-w-7xl mx-auto space-y-12">
      <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span class="text-xs font-extrabold uppercase tracking-widest text-[var(--color-primary)]">
            Katalog Pelayanan
          </span>
          <h2 class="text-2xl sm:text-3xl font-extrabold text-[var(--color-text)] mt-1">
            Layanan & Poliklinik Rawat Jalan
          </h2>
        </div>
        <a
          href="#/layanan"
          class="text-xs font-bold text-[var(--color-primary)] hover:underline flex items-center gap-1"
        >
          <span>Lihat Seluruh Layanan ({services.length})</span>
          <ArrowRight class="w-3.5 h-3.5" />
        </a>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {#each filteredServices as srv (srv.id)}
          <div
            class="group p-6 rounded-3xl bg-[var(--color-card)] border border-[var(--color-border)] hover:border-[var(--color-primary)]/50 hover:shadow-xl transition-all duration-300 space-y-4 flex flex-col justify-between"
          >
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <div class="w-12 h-12 rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center font-bold">
                  <Stethoscope class="w-6 h-6" />
                </div>
                <span class="text-[10px] px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                  Aktif
                </span>
              </div>
              <h3 class="text-base font-bold text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition">
                {srv.name}
              </h3>
              <p class="text-xs text-[var(--color-muted-foreground)] line-clamp-2 leading-relaxed">
                {srv.description || 'Pelayanan medis terpadu dengan standar operasional prosedur terbuka.'}
              </p>
            </div>

            <div class="pt-3 border-t border-[var(--color-border)] flex items-center justify-between">
              <span class="text-[11px] text-[var(--color-muted-foreground)]">
                {srv.clusterName || srv.categoryName || srv.categoryId || 'Umum & BPJS'}
              </span>
              <a
                href="#/layanan/{srv.slug || srv.id}"
                class="text-xs font-bold text-[var(--color-primary)] hover:underline flex items-center gap-1"
              >
                <span>Rincian</span>
                <ChevronRight class="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- BERITA & EDUKASI KESEHATAN TERKINI -->
  {#if featuredPosts.length > 0}
    <section class="py-20 px-4 sm:px-6 lg:px-8 border-b border-[var(--color-border)] bg-[var(--color-card)]/40">
      <div class="max-w-7xl mx-auto space-y-10">
        <div class="flex items-center justify-between">
          <div>
            <span class="text-xs font-extrabold uppercase tracking-widest text-[var(--color-primary)]">
              Warta & Edukasi
            </span>
            <h2 class="text-2xl sm:text-3xl font-extrabold text-[var(--color-text)] mt-1">
              Kabar Puskesmas & Tips Sehat
            </h2>
          </div>
          <a
            href="#/berita"
            class="text-xs font-bold text-[var(--color-primary)] hover:underline flex items-center gap-1"
          >
            <span>Semua Berita</span>
            <ArrowRight class="w-3.5 h-3.5" />
          </a>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          {#each featuredPosts as post (post.id)}
            <a
              href="#/berita/{post.slug || post.id}"
              class="group rounded-3xl bg-[var(--color-card)] border border-[var(--color-border)] hover:border-[var(--color-primary)]/40 hover:shadow-xl transition-all overflow-hidden flex flex-col"
            >
              <div class="h-48 bg-[var(--color-bg)] relative overflow-hidden flex items-center justify-center text-[var(--color-muted-foreground)]">
                {#if post.featuredImage}
                  <img
                    src={post.featuredImage}
                    alt={post.title}
                    class="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  />
                {:else}
                  <FileText class="w-12 h-12 opacity-30" />
                {/if}
                <span class="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-bold">
                  {post.categoryName || post.categoryId || 'Kesehatan'}
                </span>
              </div>
              <div class="p-6 space-y-2 flex-1 flex flex-col justify-between">
                <div>
                  <span class="text-[10px] text-[var(--color-muted-foreground)]">
                    {new Date(post.publishedAt || post.createdAt).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </span>
                  <h3 class="text-sm font-bold text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition mt-1 line-clamp-2">
                    {post.title}
                  </h3>
                  <p class="text-xs text-[var(--color-muted-foreground)] line-clamp-2 mt-1">
                    {post.excerpt || 'Klik untuk membaca artikel selengkapnya...'}
                  </p>
                </div>
                <div class="pt-4 border-t border-[var(--color-border)] flex items-center gap-1 text-xs font-bold text-[var(--color-primary)]">
                  <span>Baca Selengkapnya</span>
                  <ChevronRight class="w-3.5 h-3.5" />
                </div>
              </div>
            </a>
          {/each}
        </div>
      </div>
    </section>
  {/if}

  <!-- EMERGENCY & FAST CONTACT BANNER (MAJESTIC CLOSING) -->
  <section class="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-[var(--color-primary)] to-teal-700 text-white relative overflow-hidden">
    <div class="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-8 relative z-10">
      <div class="space-y-2 text-center lg:text-left">
        <span class="px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold uppercase tracking-wider inline-block">
          UGD & Bersalin Siaga 24 Jam
        </span>
        <h2 class="text-2xl sm:text-3xl font-extrabold tracking-tight">
          Butuh Penanganan Medis Cepat atau Ambulans?
        </h2>
        <p class="text-xs sm:text-sm text-white/80 max-w-2xl">
          Tim gawat darurat dan ambulans Puskesmas Manding selalu siaga 24/7 untuk melayani
          kondisi darurat Anda.
        </p>
      </div>

      <div class="flex flex-wrap items-center justify-center gap-3">
        <a
          href="tel:0215550199"
          class="px-6 py-3.5 rounded-2xl bg-white text-emerald-900 font-extrabold text-xs shadow-xl hover:bg-emerald-50 transition flex items-center gap-2"
        >
          <Phone class="w-4 h-4 text-emerald-700" />
          <span>Hubungi UGD (0328) 667123</span>
        </a>
        <a
          href="#/kontak"
          class="px-6 py-3.5 rounded-2xl bg-black/20 backdrop-blur-md border border-white/30 text-white font-bold text-xs hover:bg-black/30 transition flex items-center gap-2"
        >
          <span>Lokasi & Kontak Detail</span>
          <ArrowRight class="w-4 h-4" />
        </a>
      </div>
    </div>
  </section>
</div>
