<!-- @component Template beranda "Studio Seni Kontemporer" — galeri minimalis Swiss. -->
<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import { ArrowRight, Stethoscope } from 'lucide-svelte';
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
  <!-- HERO SECTION: MINIMALIST CONTEMPORARY GALLERY (STUDIO SENI) -->
  <section class="relative min-h-[92vh] flex items-center justify-center pt-32 pb-24 px-4 sm:px-6 lg:px-12 overflow-hidden border-b border-[var(--color-border)]">
    <ArtisticBackgroundCanvas type="geometric_waves" intensity="subtle" interactive={true} />

    <div class="relative max-w-7xl mx-auto w-full z-10 space-y-16">
      <div class="space-y-6 max-w-4xl">
        <div
          in:fly={{ x: -10, duration: 600 }}
          class="text-xs font-mono uppercase tracking-[0.25em] text-[var(--color-primary)] font-bold"
        >
          // PUSAT KESEHATAN MASYARAKAT MANDIRI SEJAHTERA
        </div>

        <h1
          in:fly={{ y: 20, duration: 800 }}
          class="text-4xl sm:text-6xl lg:text-7xl font-light text-[var(--color-text)] tracking-tighter leading-[1.08]"
        >
          Kesehatan adalah <br />
          <span class="font-extrabold text-[var(--color-text)]">Karya Kehidupan.</span>
        </h1>

        <p
          in:fly={{ y: 20, duration: 800, delay: 100 }}
          class="text-base sm:text-lg text-[var(--color-muted-foreground)] max-w-2xl font-light leading-relaxed"
        >
          {settings?.tagline ||
            'Menghadirkan pelayanan medis presisi dengan ruang yang tenang, ramah, dan transparan bagi seluruh warga.'}
        </p>

        <div
          in:fly={{ y: 20, duration: 800, delay: 200 }}
          class="flex flex-wrap items-center gap-4 pt-4"
        >
          {#if flags?.onlineQueue !== false}
            <a
              href="#/pendaftaran"
              class="px-8 py-4 rounded-full bg-[var(--color-primary)] text-[var(--color-primary-foreground)] font-bold text-xs uppercase tracking-widest hover:opacity-90 transition flex items-center gap-3 shadow-lg"
            >
              <span>Pendaftaran Pasien</span>
              <ArrowRight class="w-3.5 h-3.5" />
            </a>
          {/if}
          <a
            href="#/layanan"
            class="px-8 py-4 rounded-full bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text)] font-bold text-xs uppercase tracking-widest hover:border-[var(--color-primary)] transition"
          >
            Katalog Layanan
          </a>
        </div>
      </div>

      <!-- Architectural Statistics Line -->
      <div in:fade={{ duration: 800 }} class="grid grid-cols-2 md:grid-cols-4 gap-8 pt-12 border-t border-[var(--color-border)]">
        <div class="space-y-1">
          <div class="text-4xl font-light text-[var(--color-text)]">05</div>
          <div class="text-xs uppercase tracking-widest text-[var(--color-muted-foreground)]">Klaster Terpadu</div>
        </div>
        <div class="space-y-1">
          <div class="text-4xl font-light text-[var(--color-text)]">24h</div>
          <div class="text-xs uppercase tracking-widest text-[var(--color-muted-foreground)]">UGD & Bersalin</div>
        </div>
        <div class="space-y-1">
          <div class="text-4xl font-light text-[var(--color-text)]">11</div>
          <div class="text-xs uppercase tracking-widest text-[var(--color-muted-foreground)]">Standar Pelayanan</div>
        </div>
        <div class="space-y-1">
          <div class="text-4xl font-light text-[var(--color-text)]">99%</div>
          <div class="text-xs uppercase tracking-widest text-[var(--color-muted-foreground)]">Indeks Kepuasan</div>
        </div>
      </div>
    </div>
  </section>

  <!-- GALLERY OF CLINICAL SERVICES -->
  <section class="py-24 px-4 sm:px-6 lg:px-12 border-b border-[var(--color-border)]">
    <div class="max-w-7xl mx-auto space-y-12">
      <div class="flex items-end justify-between">
        <div class="space-y-2">
          <span class="text-xs font-mono uppercase tracking-[0.2em] text-[var(--color-primary)]">// POLIKLINIK</span>
          <h2 class="text-3xl font-bold text-[var(--color-text)]">Layanan Rawat Jalan</h2>
        </div>
        <a href="#/layanan" class="text-xs font-bold text-[var(--color-primary)] hover:underline">
          Lihat Seluruh Katalog →
        </a>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        {#each services.slice(0, 6) as srv (srv.id)}
          <a
            href="#/layanan/{srv.slug || srv.id}"
            class="group p-8 rounded-3xl bg-[var(--color-card)] border border-[var(--color-border)] hover:border-[var(--color-primary)] transition-all duration-300 space-y-4"
          >
            <div class="w-10 h-10 rounded-full border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text)] group-hover:bg-[var(--color-primary)] group-hover:text-white transition">
              <Stethoscope class="w-4 h-4" />
            </div>
            <h3 class="text-lg font-bold text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition">
              {srv.name}
            </h3>
            <p class="text-xs text-[var(--color-muted-foreground)] line-clamp-3 leading-relaxed">
              {srv.description || 'Pemeriksaan klinis berbasis standar operasional prima.'}
            </p>
            <div class="pt-2 text-xs font-mono text-[var(--color-primary)]">Jadwal: Senin - Sabtu →</div>
          </a>
        {/each}
      </div>
    </div>
  </section>
</div>
