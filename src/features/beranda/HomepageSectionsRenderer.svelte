<!-- @component Perender section beranda modular (template "classic") dari Homepage Builder. -->
<script lang="ts">
  import {
    HeartPulse,
    Phone,
    ArrowRight,
    Activity,
    Clock,
    ShieldCheck,
    Users,
    Lock,
    Sparkles,
    MessageSquare,
    MapPin,
    FileText,
    AlertTriangle,
    Megaphone,
    Search,
    Globe,
    HelpCircle
  } from 'lucide-svelte';
  import type {
    HomepageSection,
    ServiceEntity,
    PostEntity,
    SiteSettings,
    AnnouncementEntity,
    MicrositeEntity
  } from '../../shared/types/index.js';
  import Button from '../../shared/ui/Button.svelte';
  import { featureFlagsService } from '../../shared/services/featureFlagsService.js';
  import { navigate } from '../../app/router.svelte.js';

  interface Props {
    sections: HomepageSection[];
    services: ServiceEntity[];
    posts: PostEntity[];
    settings: SiteSettings | null;
    announcements: AnnouncementEntity[];
    microsites?: MicrositeEntity[];
  }

  let { sections, services, posts, settings, announcements, microsites }: Props = $props();

  let flags = $state(featureFlagsService.getFlags());

  $effect(() => {
    const handleFeaturesUpdated = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      flags = detail ? detail : featureFlagsService.getFlags();
    };
    window.addEventListener('puskesmas_features_updated', handleFeaturesUpdated);
    window.addEventListener('storage', handleFeaturesUpdated);
    return () => {
      window.removeEventListener('puskesmas_features_updated', handleFeaturesUpdated);
      window.removeEventListener('storage', handleFeaturesUpdated);
    };
  });

  const sortedSections = $derived(
    [...sections].filter((s) => s.visible).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  );

  function handleSearchSubmit(e: SubmitEvent) {
    e.preventDefault();
    const formEl = e.currentTarget as HTMLFormElement;
    const input = formEl.elements.namedItem('q') as HTMLInputElement | null;
    if (input && input.value.trim()) {
      navigate(`/search?q=${encodeURIComponent(input.value.trim())}`);
    }
  }
</script>

<div class="space-y-0">
  {#each sortedSections as sec (sec.id)}
    {@const key = sec.id}
    {@const title = sec.title}
    {@const config = sec.settings || {}}

    {#if sec.type === 'search'}
      {@const searchPlaceholder =
        config.placeholder || 'Cari layanan, jadwal poli, berita, atau persyaratan...'}
      <section id={key} class="py-12 px-6 bg-[var(--color-card)] border-b theme-border">
        <div class="max-w-4xl mx-auto space-y-4 text-center">
          <h3 class="text-xl font-light text-[var(--color-text)] tracking-tight">{title}</h3>
          <form onsubmit={handleSearchSubmit} class="flex gap-3 max-w-2xl mx-auto">
            <div class="relative flex-1">
              <Search class="w-4 h-4 text-[var(--color-muted-foreground)] absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                name="q"
                placeholder={searchPlaceholder}
                class="w-full bg-[var(--color-bg)] border theme-border focus:border-[var(--color-primary)] focus:outline-none rounded-2xl pl-11 pr-4 py-3.5 text-sm text-[var(--color-text)] placeholder-[var(--color-muted-foreground)] transition shadow-inner"
              />
            </div>
            <button
              type="submit"
              class="px-6 py-3.5 rounded-2xl btn-theme-primary font-bold text-xs transition flex items-center gap-2 shrink-0"
            >
              <Search class="w-4 h-4" />
              <span>Cari</span>
            </button>
          </form>
        </div>
      </section>
    {:else if sec.type === 'hero'}
      {@const subtitle = config.subtitle || 'Penyelenggaraan pelayanan primer terintegrasi.'}
      {@const buttonText = config.buttonText || 'Lihat Layanan'}
      {@const buttonLink = config.buttonLink || '/layanan'}
      {@const buttonText2 = config.buttonText2 || 'Kontak'}
      {@const buttonLink2 = config.buttonLink2 || '/kontak'}
      {@const alignment = config.alignment || 'left'}
      {@const bgGradient = config.bgGradient !== false}
      <section
        id={key}
        class="relative py-12 sm:py-20 px-4 sm:px-6 overflow-hidden border-b theme-border {bgGradient
          ? 'bg-gradient-to-b from-[var(--color-card)] to-[var(--color-bg)]'
          : 'theme-bg'}"
      >
        <div class="max-w-7xl mx-auto space-y-8 sm:space-y-12">
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            <div
              class="lg:col-span-8 space-y-4 sm:space-y-6 {alignment === 'center'
                ? 'text-center lg:col-span-12 max-w-4xl mx-auto'
                : ''}"
            >
              <div
                class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 text-[var(--color-primary)] text-xs font-bold uppercase tracking-widest {alignment ===
                'center'
                  ? 'mx-auto'
                  : ''}"
              >
                <Sparkles class="w-4 h-4 text-[var(--color-primary)] animate-pulse" />
                <span>{settings?.tagline || 'Integrasi Layanan Primer'}</span>
              </div>

              <h1 class="text-3xl sm:text-4xl lg:text-5xl font-light text-[var(--color-text)] leading-tight tracking-tight">
                {title}
              </h1>

              <p class="text-xs sm:text-sm text-[var(--color-text)] leading-relaxed max-w-3xl">
                {subtitle}
              </p>

              <div
                class="flex flex-wrap items-center gap-3 pt-2 {alignment === 'center'
                  ? 'justify-center'
                  : ''}"
              >
                <Button
                  onclick={() => {
                    navigate(buttonLink);
                  }}
                  class="btn-theme-primary px-6 py-3 text-xs w-full sm:w-auto"
                >
                  {buttonText}
                  <ArrowRight class="w-4 h-4" />
                </Button>
                <Button
                  onclick={() => {
                    navigate(buttonLink2);
                  }}
                  variant="secondary"
                  class="btn-theme-secondary px-6 py-3 text-xs w-full sm:w-auto"
                >
                  <Phone class="w-4 h-4 text-[var(--color-primary)]" />
                  {buttonText2}
                </Button>
              </div>
            </div>

            {#if alignment !== 'center'}
              <div class="lg:col-span-4 grid grid-cols-2 gap-3 sm:gap-4">
                <div class="theme-bg-card border theme-border p-4 sm:p-6 theme-radius space-y-1.5 hover:border-[var(--color-primary)]/40 transition duration-200">
                  <Activity class="w-6 h-6 sm:w-8 sm:h-8 text-[var(--color-primary)]" />
                  <div class="text-lg sm:text-xl font-bold text-[var(--color-text)]">5 Klaster</div>
                  <p class="text-[10px] text-[var(--color-muted-foreground)]">Klaster Kesehatan Terintegrasi</p>
                </div>
                <div class="theme-bg-card border theme-border p-4 sm:p-6 theme-radius space-y-1.5 hover:border-[var(--color-primary)]/40 transition duration-200">
                  <Clock class="w-6 h-6 sm:w-8 sm:h-8 text-[var(--color-primary)]" />
                  <div class="text-lg sm:text-xl font-bold text-[var(--color-text)]">24 Jam</div>
                  <p class="text-[10px] text-[var(--color-muted-foreground)]">Layanan UGD & Persalinan</p>
                </div>
                <div class="theme-bg-card border theme-border p-4 sm:p-6 theme-radius space-y-1.5 hover:border-[var(--color-primary)]/40 transition duration-200">
                  <ShieldCheck class="w-6 h-6 sm:w-8 sm:h-8 text-[var(--color-primary)]" />
                  <div class="text-lg sm:text-xl font-bold text-[var(--color-text)]">11 SPP</div>
                  <p class="text-[10px] text-[var(--color-muted-foreground)]">Standar Pelayanan Terbuka</p>
                </div>
                <div class="theme-bg-card border theme-border p-4 sm:p-6 theme-radius space-y-1.5 hover:border-[var(--color-primary)]/40 transition duration-200">
                  <Users class="w-6 h-6 sm:w-8 sm:h-8 text-[var(--color-primary)]" />
                  <div class="text-lg sm:text-xl font-bold text-[var(--color-text)]">12 SPM</div>
                  <p class="text-[10px] text-[var(--color-muted-foreground)]">Cakupan Pelayanan Minimal</p>
                </div>
              </div>
            {/if}
          </div>

          <!-- Mobile-First Quick Access Hub (Filtered by Feature Flags) -->
          <div class="pt-4 border-t theme-border">
            <div class="flex items-center justify-between mb-3">
              <span class="text-[11px] font-bold text-[var(--color-primary)] uppercase tracking-wider">
                Akses Cepat Pelayanan & Dokumentasi
              </span>
              <span class="text-[10px] text-[var(--color-muted-foreground)]">Ketuk untuk membuka</span>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
              {#if flags.onlineQueue !== false}
                <a
                  href="#/pendaftaran"
                  class="theme-bg-card border theme-border p-3.5 rounded-2xl hover:border-[var(--color-primary)] transition flex flex-col items-center text-center space-y-2 group shadow-xs"
                >
                  <div class="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition">
                    <Activity class="w-5 h-5" />
                  </div>
                  <span class="text-xs font-bold text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition">
                    Daftar Online
                  </span>
                </a>
              {/if}

              {#if flags.onlineQueue !== false}
                <a
                  href="#/antrian-display"
                  class="theme-bg-card border theme-border p-3.5 rounded-2xl hover:border-[var(--color-primary)] transition flex flex-col items-center text-center space-y-2 group shadow-xs"
                >
                  <div class="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center group-hover:scale-110 transition">
                    <Clock class="w-5 h-5" />
                  </div>
                  <span class="text-xs font-bold text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition">
                    Antrean Live
                  </span>
                </a>
              {/if}

              <a
                href="#/layanan"
                class="theme-bg-card border theme-border p-3.5 rounded-2xl hover:border-[var(--color-primary)] transition flex flex-col items-center text-center space-y-2 group shadow-xs"
              >
                <div class="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center group-hover:scale-110 transition">
                  <HeartPulse class="w-5 h-5" />
                </div>
                <span class="text-xs font-bold text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition">
                  Layanan & Poli
                </span>
              </a>

              {#if flags.documents !== false}
                <a
                  href="#/dokumen"
                  class="theme-bg-card border theme-border p-3.5 rounded-2xl hover:border-[var(--color-primary)] transition flex flex-col items-center text-center space-y-2 group shadow-xs bg-[var(--color-primary)]/5"
                >
                  <div class="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center group-hover:scale-110 transition">
                    <FileText class="w-5 h-5" />
                  </div>
                  <span class="text-xs font-bold text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition">
                    Dokumen & SPP
                  </span>
                </a>
              {/if}

              {#if flags.news !== false}
                <a
                  href="#/berita"
                  class="theme-bg-card border theme-border p-3.5 rounded-2xl hover:border-[var(--color-primary)] transition flex flex-col items-center text-center space-y-2 group shadow-xs"
                >
                  <div class="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center group-hover:scale-110 transition">
                    <Sparkles class="w-5 h-5" />
                  </div>
                  <span class="text-xs font-bold text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition">
                    Kabar Berita
                  </span>
                </a>
              {/if}

              {#if flags.complaints !== false}
                <a
                  href="#/kritik-saran"
                  class="theme-bg-card border theme-border p-3.5 rounded-2xl hover:border-[var(--color-primary)] transition flex flex-col items-center text-center space-y-2 group shadow-xs"
                >
                  <div class="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center group-hover:scale-110 transition">
                    <MessageSquare class="w-5 h-5" />
                  </div>
                  <span class="text-xs font-bold text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition">
                    Pengaduan
                  </span>
                </a>
              {/if}

              {#if flags.skm !== false}
                <a
                  href="#/survei"
                  class="theme-bg-card border theme-border p-3.5 rounded-2xl hover:border-[var(--color-primary)] transition flex flex-col items-center text-center space-y-2 group shadow-xs"
                >
                  <div class="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition">
                    <HelpCircle class="w-5 h-5" />
                  </div>
                  <span class="text-xs font-bold text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition">
                    Survei SKM
                  </span>
                </a>
              {/if}
            </div>
          </div>
        </div>
      </section>
    {:else if sec.type === 'sambutan'}
      {@const name = config.name || 'dr. H. Ahmad Fauzi, M.Kes'}
      {@const role = config.role || 'Kepala Puskesmas'}
      {@const text = config.text || 'Selamat datang di website kami.'}
      <section id={key} class="py-20 px-6 max-w-7xl mx-auto border-b theme-border">
        <div class="grid grid-cols-1 md:grid-cols-12 gap-12 items-center">
          <div class="md:col-span-4 flex justify-center">
            <div class="relative group">
              <div class="absolute -inset-1.5 bg-gradient-to-tr from-[var(--color-primary)] to-[var(--color-secondary)] rounded-3xl blur opacity-30 group-hover:opacity-50 transition duration-200"></div>
              <div class="relative w-64 h-64 bg-[var(--color-surface)] rounded-3xl overflow-hidden border theme-border">
                {#if config.avatarUrl}
                  <img
                    src={config.avatarUrl}
                    alt={name}
                    class="w-full h-full object-cover"
                    referrerpolicy="no-referrer"
                  />
                {:else}
                  <div class="w-full h-full flex flex-col items-center justify-center text-[var(--color-muted-foreground)] bg-[var(--color-surface)]">
                    <HeartPulse class="w-16 h-16 text-[var(--color-primary)]/30 mb-2" />
                    <span class="text-[10px] uppercase tracking-wider font-mono">Puskesmas Mandiri</span>
                  </div>
                {/if}
              </div>
            </div>
          </div>

          <div class="md:col-span-8 space-y-4">
            <span class="text-xs font-bold uppercase tracking-widest text-[var(--color-primary)]">
              {role}
            </span>
            <h2 class="text-3xl font-light text-[var(--color-text)] tracking-tight">{title}</h2>
            <p class="text-sm text-[var(--color-text)] leading-relaxed italic">"{text}"</p>
            <div class="pt-4">
              <div class="text-sm font-bold text-[var(--color-text)]">{name}</div>
              <div class="text-xs text-[var(--color-muted-foreground)]">{role} Mandiri Sejahtera</div>
            </div>
          </div>
        </div>
      </section>
    {:else if sec.type === 'info'}
      {@const grids = config.grid || []}
      <section id={key} class="py-20 px-6 max-w-7xl mx-auto border-b theme-border space-y-8">
        <div class="text-center max-w-2xl mx-auto space-y-2">
          <span class="text-xs font-bold uppercase tracking-widest text-[var(--color-primary)]">
            Informasi Umum
          </span>
          <h2 class="text-2xl font-light text-[var(--color-text)]">{title}</h2>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
          {#each grids as g, i (i)}
            <div
              class="theme-bg-card border theme-border p-6 theme-radius hover:border-[var(--color-primary)]/30 transition text-center"
            >
              <h3 class="text-xl font-bold text-[var(--color-primary)] mb-1">{g.title}</h3>
              <p class="text-xs text-[var(--color-text)] leading-relaxed">{g.desc}</p>
            </div>
          {/each}
        </div>
      </section>
    {:else if sec.type === 'unggulan'}
      {@const items = config.items || []}
      <section id={key} class="py-20 px-6 max-w-7xl mx-auto border-b theme-border space-y-8">
        <div class="text-center max-w-2xl mx-auto space-y-2">
          <span class="text-xs font-bold uppercase tracking-widest text-[var(--color-primary)]">
            Inovasi Pelayanan
          </span>
          <h2 class="text-2xl font-light text-[var(--color-text)]">{title}</h2>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          {#each items as it, i (i)}
            <div
              class="theme-bg-card border theme-border p-6 theme-radius hover:border-[var(--color-primary)]/40 transition duration-200 flex flex-col justify-between h-48"
            >
              <div>
                <div class="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center mb-4">
                  <Sparkles class="w-5 h-5 text-[var(--color-primary)]" />
                </div>
                <h3 class="text-sm font-bold text-[var(--color-text)] mb-2">{it.name}</h3>
                <p class="text-xs text-[var(--color-muted-foreground)] leading-relaxed line-clamp-3">
                  {it.description}
                </p>
              </div>
            </div>
          {/each}
        </div>
      </section>
    {:else if sec.type === 'layanan'}
      {@const limit = config.limit || 6}
      {@const filteredServices = services
        .filter((s) => s.status === 'published' || s.status === 'approved')
        .slice(0, limit)}
      <section id={key} class="py-20 px-6 max-w-7xl mx-auto border-b theme-border space-y-8">
        <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div class="space-y-1.5 text-center sm:text-left">
            <span class="text-xs font-bold uppercase tracking-widest text-[var(--color-primary)]">
              Portal Informasi
            </span>
            <h2 class="text-2xl font-light text-[var(--color-text)]">{title}</h2>
          </div>
          <Button
            onclick={() => {
              navigate('/layanan');
            }}
            variant="secondary"
            size="sm"
            class="btn-theme-secondary text-[11px]"
          >
            Semua Layanan <ArrowRight class="w-3.5 h-3.5" />
          </Button>
        </div>

        {#if filteredServices.length === 0}
          <div class="text-center py-12 theme-bg-card border theme-border theme-radius text-[var(--color-muted-foreground)] text-xs">
            Belum ada layanan yang ditambahkan atau dipublikasikan.
          </div>
        {:else}
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            {#each filteredServices as s (s.id)}
              <div
                class="theme-bg-card border theme-border p-6 theme-radius hover:border-[var(--color-primary)]/40 transition duration-200 flex flex-col justify-between group cursor-pointer"
                onclick={() => {
                  navigate(`/layanan/${s.slug || s.id}`);
                }}
                role="link"
                tabindex="0"
                onkeydown={(e) => {
                  if (e.key === 'Enter') navigate(`/layanan/${s.slug || s.id}`);
                }}
              >
                <div>
                  <div class="flex items-center justify-between gap-2 mb-3">
                    <span class="text-[9px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20">
                      {s.clusterName || 'Umum'}
                    </span>
                    <span class="text-[10px] text-[var(--color-muted-foreground)] font-mono">
                      {s.unitName || ''}
                    </span>
                  </div>
                  <h3 class="text-sm font-bold text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition mb-2">
                    {s.name}
                  </h3>
                  <p class="text-xs text-[var(--color-muted-foreground)] leading-relaxed line-clamp-3">
                    {s.description || 'Pelayanan kesehatan terpadu ramah dan profesional.'}
                  </p>
                </div>
                <div class="pt-4 flex items-center gap-1.5 text-xs text-[var(--color-primary)] font-bold group-hover:gap-2 transition-all">
                  <span>Detail Layanan</span>
                  <ArrowRight class="w-3.5 h-3.5" />
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </section>
    {:else if sec.type === 'jadwal'}
      {@const schedules = config.schedules || []}
      <section id={key} class="py-20 px-6 max-w-7xl mx-auto border-b theme-border space-y-8">
        <div class="text-center max-w-2xl mx-auto space-y-2">
          <span class="text-xs font-bold uppercase tracking-widest text-[var(--color-primary)]">
            Waktu Operasional
          </span>
          <h2 class="text-2xl font-light text-[var(--color-text)]">{title}</h2>
        </div>

        <div class="max-w-4xl mx-auto theme-bg-card border theme-border theme-radius overflow-hidden shadow-xl">
          <div class="divide-y theme-border">
            {#each schedules as sch, i (i)}
              <div
                class="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 gap-3 hover:bg-[var(--color-primary)]/5 transition"
              >
                <div class="flex items-center gap-3">
                  <div class="w-2.5 h-2.5 rounded-full bg-[var(--color-primary)]"></div>
                  <span class="text-sm font-bold text-[var(--color-text)]">{sch.name}</span>
                </div>
                <div class="flex flex-wrap items-center gap-4 text-xs font-mono">
                  <span class="px-3 py-1 rounded-full bg-[var(--color-surface)] text-[var(--color-text)] border theme-border">
                    {sch.days}
                  </span>
                  <span class="px-3 py-1 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20 font-bold">
                    {sch.hours}
                  </span>
                </div>
              </div>
            {/each}
          </div>
        </div>
      </section>
    {:else if sec.type === 'berita'}
      {#if flags.news !== false}
        {@const bLimit = config.limit || 3}
        {@const filteredPosts = posts.slice(0, bLimit)}
        <section id={key} class="py-20 px-6 max-w-7xl mx-auto border-b theme-border space-y-8">
          <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div class="space-y-1.5 text-center sm:text-left">
              <span class="text-xs font-bold uppercase tracking-widest text-[var(--color-primary)]">
                Kabar Sehat
              </span>
              <h2 class="text-2xl font-light text-[var(--color-text)]">{title}</h2>
            </div>
            <Button
              onclick={() => {
                navigate('/berita');
              }}
              variant="secondary"
              size="sm"
              class="btn-theme-secondary text-[11px]"
            >
              Semua Berita <ArrowRight class="w-3.5 h-3.5" />
            </Button>
          </div>

          {#if filteredPosts.length === 0}
            <div class="text-center py-12 theme-bg-card border theme-border theme-radius text-[var(--color-muted-foreground)] text-xs">
              Belum ada artikel berita yang dipublikasikan.
            </div>
          {:else}
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              {#each filteredPosts as p (p.id)}
                <article
                  class="theme-bg-card border theme-border theme-radius overflow-hidden hover:border-[var(--color-primary)]/40 transition duration-200 cursor-pointer flex flex-col justify-between"
                  onclick={() => {
                    navigate(`/berita/${p.slug || p.id}`);
                  }}
                >
                  <div>
                    <div class="h-44 bg-[var(--color-surface)] relative overflow-hidden">
                      {#if p.featuredImage}
                        <img
                          src={p.featuredImage}
                          alt={p.title}
                          class="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          referrerpolicy="no-referrer"
                        />
                      {:else}
                        <div class="w-full h-full flex items-center justify-center text-[var(--color-muted-foreground)] bg-[var(--color-surface)]">
                          <FileText class="w-12 h-12 text-[var(--color-primary)]/20" />
                        </div>
                      {/if}
                    </div>
                    <div class="p-6 space-y-3">
                      <div class="flex items-center gap-3 text-[10px] text-[var(--color-muted-foreground)] font-mono">
                        <span>{p.categoryName || 'Berita'}</span>
                        <span>•</span>
                        <span>
                          {p.publishedAt ? new Date(p.publishedAt).toLocaleDateString('id-ID') : ''}
                        </span>
                      </div>
                      <h3 class="text-sm font-bold text-[var(--color-text)] line-clamp-2 hover:text-[var(--color-primary)] transition">
                        {p.title}
                      </h3>
                      <p class="text-xs text-[var(--color-muted-foreground)] line-clamp-3 leading-relaxed">
                        {p.excerpt || p.title}
                      </p>
                    </div>
                  </div>
                  <div class="px-6 pb-6 pt-2 flex items-center gap-1.5 text-xs text-[var(--color-primary)] font-bold">
                    <span>Baca Selengkapnya</span>
                    <ArrowRight class="w-3.5 h-3.5" />
                  </div>
                </article>
              {/each}
            </div>
          {/if}
        </section>
      {/if}
    {:else if sec.type === 'pengumuman'}
      {#if flags.notifications !== false}
        {@const pLimit = config.limit || 2}
        {@const filteredAnn = announcements.slice(0, pLimit)}
        <section id={key} class="py-20 px-6 max-w-4xl mx-auto border-b theme-border space-y-8">
          <div class="text-center space-y-1.5">
            <span class="text-xs font-bold uppercase tracking-widest text-[var(--color-primary)]">
              Sinyal Darurat & Pengumuman
            </span>
            <h2 class="text-2xl font-light text-[var(--color-text)]">{title}</h2>
          </div>

          {#if filteredAnn.length === 0}
            <div class="text-center py-8 theme-bg-card border theme-border theme-radius text-[var(--color-muted-foreground)] text-xs">
              Tidak ada pengumuman aktif saat ini.
            </div>
          {:else}
            <div class="space-y-4">
              {#each filteredAnn as ann (ann.id)}
                <div
                  class="p-6 border theme-radius flex gap-4 {ann.priority === 'urgent'
                    ? 'bg-red-500/5 border-red-500/20'
                    : ann.priority === 'high'
                      ? 'bg-[var(--color-primary)]/5 border-[var(--color-primary)]/20'
                      : 'theme-bg-card border-[var(--color-border)]'}"
                >
                  <div
                    class="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center {ann.priority ===
                    'urgent'
                      ? 'bg-red-500/10 text-red-400'
                      : 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'}"
                  >
                    <Megaphone class="w-5 h-5" />
                  </div>
                  <div class="space-y-1">
                    <div class="flex items-center gap-2">
                      <span class="text-xs font-bold text-[var(--color-text)]">{ann.title}</span>
                      {#if ann.priority !== 'normal'}
                        <span
                          class="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full {ann.priority ===
                          'urgent'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]'}"
                        >
                          {ann.priority}
                        </span>
                      {/if}
                    </div>
                    <p class="text-xs text-[var(--color-muted-foreground)] leading-relaxed">
                      {ann.content}
                    </p>
                    <div class="text-[9px] text-[var(--color-muted-foreground)] font-mono pt-1">
                      Dibuat: {new Date(ann.createdAt).toLocaleDateString('id-ID')}
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </section>
      {/if}
    {:else if sec.type === 'statistik'}
      {@const statItems = config.items || []}
      <section id={key} class="py-20 px-6 max-w-7xl mx-auto border-b theme-border space-y-8">
        <div class="text-center max-w-2xl mx-auto space-y-2">
          <span class="text-xs font-bold uppercase tracking-widest text-[var(--color-primary)]">
            Kinerja Layanan
          </span>
          <h2 class="text-2xl font-light text-[var(--color-text)]">{title}</h2>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
          {#each statItems as st, i (i)}
            <div
              class="theme-bg-card border theme-border p-8 theme-radius text-center space-y-1 hover:border-[var(--color-primary)]/30 transition"
            >
              <div class="text-3xl font-black text-[var(--color-primary)] tracking-tight">
                {st.value}
              </div>
              <div class="text-[10px] uppercase font-mono tracking-wider text-[var(--color-muted-foreground)]">
                {st.label}
              </div>
            </div>
          {/each}
        </div>
      </section>
    {:else if sec.type === 'kritik_saran'}
      {#if flags.complaints !== false}
        {@const ksText = config.text || 'Bantu kami meningkatkan kualitas pelayanan.'}
        {@const ksBtnText = config.buttonText || 'Kirim Kritik & Saran'}
        {@const ksBtnLink = config.buttonLink || '/kritik-saran'}
        <section id={key} class="py-16 px-6 max-w-5xl mx-auto border-b theme-border">
          <div class="theme-bg-card border theme-border p-10 theme-radius text-center space-y-6">
            <div class="w-12 h-12 bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center rounded-2xl mx-auto">
              <MessageSquare class="w-6 h-6 text-[var(--color-primary)]" />
            </div>
            <div class="space-y-2 max-w-2xl mx-auto">
              <h2 class="text-2xl font-light text-[var(--color-text)]">{title}</h2>
              <p class="text-xs text-[var(--color-muted-foreground)] leading-relaxed">{ksText}</p>
            </div>
            <Button
              onclick={() => {
                navigate(ksBtnLink);
              }}
              class="btn-theme-primary px-8 py-3 text-xs mx-auto"
            >
              {ksBtnText}
              <ArrowRight class="w-4 h-4" />
            </Button>
          </div>
        </section>
      {/if}
    {:else if sec.type === 'microsites'}
      {#if flags.microsite !== false}
        {@const sub = config.subtitle || 'Akses cepat portal khusus dan program kesehatan tematik.'}
        {@const micrositeList = microsites || []}
        {#if micrositeList.length > 0}
          <section id={key} class="py-20 px-6 max-w-7xl mx-auto border-b theme-border space-y-8">
            <div class="text-center max-w-2xl mx-auto space-y-2">
              <span class="text-xs font-bold uppercase tracking-widest text-[var(--color-primary)]">
                Microsite
              </span>
              <h2 class="text-2xl font-light text-[var(--color-text)]">{title || 'Microsite'}</h2>
              <p class="text-xs text-[var(--color-muted-foreground)]">{sub}</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {#each micrositeList as m (m.id)}
                <div
                  class="theme-bg-card border theme-border p-6 theme-radius space-y-4 hover:border-[var(--color-primary)]/40 transition flex flex-col justify-between shadow-sm"
                >
                  <div class="space-y-3">
                    <div class="flex items-center justify-between">
                      <div class="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center">
                        <Globe class="w-5 h-5" />
                      </div>
                      {#if m.passwordProtected}
                        <span class="inline-flex items-center gap-1 text-[10px] font-mono bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full">
                          <Lock class="w-3 h-3" />
                          Terproteksi
                        </span>
                      {/if}
                    </div>
                    <h3 class="text-sm font-bold text-[var(--color-text)] leading-tight">{m.name}</h3>
                    <p class="text-xs text-[var(--color-muted-foreground)] line-clamp-2 leading-relaxed">
                      {m.description || 'Portal informasi dan layanan khusus.'}
                    </p>
                  </div>

                  <div class="pt-4 border-t theme-border flex items-center justify-between">
                    <span class="text-[10px] font-mono text-[var(--color-muted-foreground)]">
                      {(m.links || []).length} Tautan Tersedia
                    </span>
                    <a
                      href="#/m/{m.slug}"
                      class="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--color-primary)] hover:underline"
                    >
                      <span>Kunjungi</span>
                      <ArrowRight class="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              {/each}
            </div>
          </section>
        {/if}
      {/if}
    {:else if sec.type === 'kontak'}
      <section id={key} class="py-20 px-6 max-w-7xl mx-auto border-b theme-border space-y-8">
        <div class="text-center max-w-2xl mx-auto space-y-2">
          <span class="text-xs font-bold uppercase tracking-widest text-[var(--color-primary)]">
            Hubungi Petugas
          </span>
          <h2 class="text-2xl font-light text-[var(--color-text)]">{title}</h2>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="theme-bg-card border theme-border p-6 theme-radius space-y-3">
            <MapPin class="w-5 h-5 text-[var(--color-primary)]" />
            <h3 class="text-xs font-bold uppercase tracking-wider text-[var(--color-text)]">
              Alamat Kantor
            </h3>
            <p class="text-xs text-[var(--color-muted-foreground)] leading-relaxed">
              {settings?.address || 'Jl. Kesehatan Raya No. 45'}
            </p>
          </div>

          <div class="theme-bg-card border theme-border p-6 theme-radius space-y-3">
            <Phone class="w-5 h-5 text-[var(--color-primary)]" />
            <h3 class="text-xs font-bold uppercase tracking-wider text-[var(--color-text)]">
              Telepon / WA
            </h3>
            <p class="text-xs text-[var(--color-muted-foreground)] leading-relaxed">
              Layanan Informasi: {settings?.phone || ''} <br />
              Saran & Aduan WA: {settings?.whatsapp || ''}
            </p>
          </div>

          <div class="theme-bg-card border theme-border p-6 theme-radius space-y-3">
            <Clock class="w-5 h-5 text-[var(--color-primary)]" />
            <h3 class="text-xs font-bold uppercase tracking-wider text-[var(--color-text)]">
              Jam Operasional
            </h3>
            <p class="text-xs text-[var(--color-muted-foreground)] leading-relaxed">
              {typeof settings?.operatingHours === 'string'
                ? settings.operatingHours
                : Array.isArray(settings?.operatingHours)
                  ? 'Senin - Sabtu: 07.30 - 14.00 WIB | UGD: 24 Jam'
                  : 'Senin - Sabtu: 07.30 - 16.00 WIB'}
            </p>
          </div>
        </div>
      </section>
    {:else if sec.type === 'lokasi'}
      {@const defaultLat = settings?.latitude || -6.2088}
      {@const defaultLng = settings?.longitude || 106.8456}
      {@const mapUrl = settings?.googleMapsUrl || 'https://maps.google.com'}
      <section id={key} class="py-20 px-6 max-w-7xl mx-auto border-b theme-border space-y-8">
        <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div class="space-y-1.5 text-center sm:text-left">
            <span class="text-xs font-bold uppercase tracking-widest text-[var(--color-primary)]">
              Navigasi Peta
            </span>
            <h2 class="text-2xl font-light text-[var(--color-text)]">{title}</h2>
          </div>
          <Button
            onclick={() => {
              window.open(mapUrl, '_blank');
            }}
            variant="secondary"
            size="sm"
            class="btn-theme-secondary text-[11px]"
          >
            Buka Google Maps <ArrowRight class="w-3.5 h-3.5" />
          </Button>
        </div>

        <div class="theme-bg-card border theme-border theme-radius overflow-hidden h-[350px] relative flex flex-col items-center justify-center text-center p-6">
          <div
            class="absolute inset-0 bg-[radial-gradient(var(--color-border)_1px,transparent_1px)] [background-size:16px_16px] opacity-40"
          ></div>
          <div class="relative space-y-4 max-w-md">
            <div class="w-12 h-12 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center mx-auto border border-[var(--color-primary)]/20 shadow-lg shadow-[var(--color-primary)]/10">
              <MapPin class="w-6 h-6" />
            </div>
            <div class="space-y-1.5">
              <h4 class="text-sm font-bold text-[var(--color-text)]">Peta GIS Terintegrasi</h4>
              <p class="text-xs text-[var(--color-muted-foreground)]">
                Puskesmas berlokasi secara resmi pada koordinat: <br />
                <span class="font-mono text-[var(--color-primary)]">{defaultLat}, {defaultLng}</span>
              </p>
            </div>
            <Button
              onclick={() => {
                window.open(mapUrl, '_blank');
              }}
              class="btn-theme-primary px-6 py-2.5 text-xs mx-auto"
            >
              Dapatkan Petunjuk Arah
            </Button>
          </div>
        </div>
      </section>
    {:else if sec.type === 'cta'}
      {@const ctaSubtitle = config.subtitle || 'UGD dan Bersalin buka 24 jam.'}
      {@const ctaBtnText = config.buttonText || 'Telepon Sekarang'}
      {@const ctaBtnLink = config.buttonLink || 'tel:119'}
      <section id={key} class="py-20 px-6 max-w-7xl mx-auto">
        <div class="relative overflow-hidden bg-gradient-to-r from-red-500/10 via-amber-500/10 to-transparent border border-red-500/20 p-12 theme-radius flex flex-col lg:flex-row items-center justify-between gap-8">
          <div class="space-y-3 text-center lg:text-left max-w-2xl">
            <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 text-[10px] font-bold uppercase tracking-wider border border-red-500/20">
              <AlertTriangle class="w-3.5 h-3.5 animate-bounce" />
              Gawat Darurat 24 Jam
            </div>
            <h2 class="text-2xl font-light text-[var(--color-text)] leading-tight">{title}</h2>
            <p class="text-xs text-[var(--color-muted-foreground)] leading-relaxed">{ctaSubtitle}</p>
          </div>
          <Button
            onclick={() => {
              window.location.href = ctaBtnLink;
            }}
            class="bg-red-500 hover:bg-red-400 text-[var(--color-text)] border border-red-500 px-8 py-3 text-xs uppercase tracking-wider rounded-2xl shrink-0 font-bold shadow-lg shadow-red-500/10"
          >
            <Phone class="w-4 h-4 shrink-0" />
            {ctaBtnText}
          </Button>
        </div>
      </section>
    {/if}
  {/each}
</div>
