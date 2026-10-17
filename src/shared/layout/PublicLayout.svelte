<!--
  @component Layout publik: banner pengumuman, topbar, header + nav dinamis,
  drawer mobile, bottom nav dock, dan footer.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import {
    HeartPulse, Menu, X, Phone, Mail, Clock, MapPin, Lock,
    ChevronRight, ChevronDown, Search, Megaphone, Home, FileText, Activity,
    Calendar, MessageSquare, HelpCircle, Image as ImageIcon,
    BarChart2, Users, ShieldCheck, ExternalLink, Sparkles, AlertTriangle, Globe
  } from 'lucide-svelte';
  import NotificationBell from '../../features/admin/NotificationBell.svelte';
  import { siteSettingsService } from '../../shared/services/siteSettingsService.js';
  import { menuService } from '../../shared/services/menuService.js';
  import { announcementService } from '../../shared/services/announcementService.js';
  import { featureFlagsService } from '../../shared/services/featureFlagsService.js';
  import type { SiteSettings, MenuTreeItem, AnnouncementEntity, SiteFeatureFlags } from '../../shared/types/index.js';
  import { routerState, navigate } from '../../app/router.svelte.js';

  interface Props {
    /** Konten halaman. */
    children: Snippet;
    /** Id menu aktif untuk highlight nav. */
    activeNav?: string;
  }

  const { children, activeNav = 'home' }: Props = $props();

  const DEFAULT_MENU_TREE: MenuTreeItem[] = [
    { id: 'home', label: 'Beranda', url: '#/', order: 1, type: 'custom', enabled: true, openInNewTab: false, visibility: 'all', createdAt: '2025-01-01T00:00:00Z' },
    {
      id: 'profil', label: 'Profil', url: '#/profil', order: 2, type: 'custom', enabled: true, openInNewTab: false, visibility: 'all', createdAt: '2025-01-01T00:00:00Z',
      children: [
        { id: 'profil-utama', label: 'Profil & Gambaran Umum', url: '#/profil', order: 1, type: 'custom', enabled: true, openInNewTab: false, visibility: 'all', parentId: 'profil', createdAt: '2025-01-01T00:00:00Z' },
        { id: 'sejarah', label: 'Sejarah & Perkembangan', url: '#/sejarah-puskesmas', order: 2, type: 'custom', enabled: true, openInNewTab: false, visibility: 'all', parentId: 'profil', createdAt: '2025-01-01T00:00:00Z' },
        { id: 'visimisi', label: 'Visi, Misi & Maklumat', url: '#/visi-misi', order: 3, type: 'custom', enabled: true, openInNewTab: false, visibility: 'all', parentId: 'profil', createdAt: '2025-01-01T00:00:00Z' },
        { id: 'struktur-organisasi', label: 'Struktur Organisasi', url: '#/struktur-organisasi', order: 4, type: 'custom', enabled: true, openInNewTab: false, visibility: 'all', parentId: 'profil', createdAt: '2025-01-01T00:00:00Z' },
        { id: 'daftar-tenaga-kesehatan', label: 'Daftar Tenaga Kesehatan', url: '#/tenaga-kesehatan', order: 5, type: 'custom', enabled: true, openInNewTab: false, visibility: 'all', parentId: 'profil', createdAt: '2025-01-01T00:00:00Z' },
        { id: 'sarana-prasarana', label: 'Sarana & Prasarana', url: '#/sarana-prasarana', order: 6, type: 'custom', enabled: true, openInNewTab: false, visibility: 'all', parentId: 'profil', createdAt: '2025-01-01T00:00:00Z' },
      ]
    },
    { id: 'layanan', label: 'Layanan', url: '#/layanan', order: 3, type: 'custom', enabled: true, openInNewTab: false, visibility: 'all', createdAt: '2025-01-01T00:00:00Z' },
    { id: 'dokumen', label: 'Dokumen & SPP', url: '#/dokumen', order: 4, type: 'custom', enabled: true, openInNewTab: false, visibility: 'all', createdAt: '2025-01-01T00:00:00Z' },
    { id: 'microsite', label: 'Microsite', url: '#/microsites', order: 5, type: 'custom', enabled: true, openInNewTab: false, visibility: 'all', createdAt: '2025-01-01T00:00:00Z' },
    { id: 'berita', label: 'Berita', url: '#/berita', order: 6, type: 'custom', enabled: true, openInNewTab: false, visibility: 'all', createdAt: '2025-01-01T00:00:00Z' },
    { id: 'galeri', label: 'Galeri', url: '#/galeri', order: 7, type: 'custom', enabled: true, openInNewTab: false, visibility: 'all', createdAt: '2025-01-01T00:00:00Z' },
    { id: 'survei', label: 'Survei', url: '#/survei', order: 8, type: 'custom', enabled: true, openInNewTab: false, visibility: 'all', createdAt: '2025-01-01T00:00:00Z' },
    { id: 'kritik-saran', label: 'Kritik & Saran', url: '#/kritik-saran', order: 9, type: 'custom', enabled: true, openInNewTab: false, visibility: 'all', createdAt: '2025-01-01T00:00:00Z' },
    { id: 'kontak', label: 'Kontak & Lokasi', url: '#/kontak', order: 10, type: 'custom', enabled: true, openInNewTab: false, visibility: 'all', createdAt: '2025-01-01T00:00:00Z' }
  ];

  let settings = $state<SiteSettings | null>(null);
  let menuTree = $state<MenuTreeItem[]>(DEFAULT_MENU_TREE);
  let announcements = $state<AnnouncementEntity[]>([]);
  let mobileDrawerOpen = $state(false);
  let searchQuery = $state('');
  let openMenuId = $state<string | null>(null);
  let openSubmenuId = $state<string | null>(null);
  let expandedMobileMenus = $state<Record<string, boolean>>({ profil: true });
  let flags = $state<SiteFeatureFlags>(featureFlagsService.getFlags());

  // Nilai awal dari localStorage (sebelum service selesai)
  try {
    const s = localStorage.getItem('puskesmas_site_settings');
    if (s) settings = JSON.parse(s);
  } catch { /* abaikan */ }
  try {
    const m = localStorage.getItem('puskesmas_menu_tree');
    if (m) menuTree = JSON.parse(m);
  } catch { /* abaikan */ }
  try {
    const a = localStorage.getItem('puskesmas_announcements');
    if (a) announcements = JSON.parse(a);
  } catch { /* abaikan */ }

  $effect(() => {
    siteSettingsService.getSettings().then((s) => { settings = s; });
    menuService.getMenuTree().then((tree) => {
      menuTree = tree && tree.length > 0 ? tree : DEFAULT_MENU_TREE;
    });
    announcementService.getPublishedAnnouncements().then((a) => { announcements = a; });

    const handleSettingsUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) settings = detail;
    };
    const handleFeaturesUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      flags = detail ? detail : featureFlagsService.getFlags();
    };
    window.addEventListener('puskesmas_settings_updated', handleSettingsUpdate);
    window.addEventListener('puskesmas_features_updated', handleFeaturesUpdate);
    window.addEventListener('storage', handleFeaturesUpdate);
    return () => {
      window.removeEventListener('puskesmas_settings_updated', handleSettingsUpdate);
      window.removeEventListener('puskesmas_features_updated', handleFeaturesUpdate);
      window.removeEventListener('storage', handleFeaturesUpdate);
    };
  });

  function toggleMobileMenu(id: string) {
    expandedMobileMenus = { ...expandedMobileMenus, [id]: !expandedMobileMenus[id] };
  }

  function handleSearchSubmit(e: Event) {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  }

  const rawMenus = $derived(menuTree.length > 0 ? menuTree : DEFAULT_MENU_TREE);
  const activeMenus = $derived(featureFlagsService.filterMenuItems(rawMenus, flags));
  const currentPath = $derived(routerState.path);

  const dockItems = $derived.by(() => {
    const items: Array<{ href: string; label: string; icon: typeof Home; active: boolean } | false> = [
      { href: '#/', label: 'Beranda', icon: Home, active: currentPath === '/' },
      { href: '#/layanan', label: 'Layanan', icon: HeartPulse, active: currentPath.startsWith('/layanan') },
      flags.documents !== false && { href: '#/dokumen', label: 'Dokumen', icon: FileText, active: currentPath.startsWith('/dokumen') },
      flags.onlineQueue !== false && { href: '#/pendaftaran', label: 'Daftar', icon: Activity, active: currentPath.startsWith('/pendaftaran') },
      ...((flags.documents === false || flags.onlineQueue === false)
        ? [
            flags.news !== false ? { href: '#/berita', label: 'Berita', icon: Sparkles, active: currentPath.startsWith('/berita') } : null,
            flags.complaints !== false ? { href: '#/kritik-saran', label: 'Aduan', icon: MessageSquare, active: currentPath.startsWith('/kritik-saran') } : null,
            flags.skm !== false ? { href: '#/survei', label: 'SKM', icon: BarChart2, active: currentPath.startsWith('/survei') } : null,
          ].filter(Boolean).slice(0, (flags.documents === false ? 1 : 0) + (flags.onlineQueue === false ? 1 : 0))
        : []),
    ];
    return items.filter(Boolean) as Array<{ href: string; label: string; icon: typeof Home; active: boolean }>;
  });
</script>

<div
  class="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] font-sans flex flex-col selection:bg-[var(--color-primary)] selection:text-[var(--color-primary-foreground)]"
>
  <a
    href="#konten-utama"
    class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:bg-[var(--color-primary)] focus:text-white focus:px-4 focus:py-2 focus:rounded-xl focus:font-semibold"
  >
    Lewati ke konten utama
  </a>
  {#if announcements.length > 0}
    <div
      class="bg-[var(--color-primary)] text-white px-3 sm:px-6 py-2 text-xs font-semibold flex items-center gap-2 sm:gap-3 overflow-hidden z-30 select-none group"
      title="Arahkan kursor atau sentuh untuk menjeda teks pengumuman"
    >
      <div
        class="flex items-center gap-1.5 shrink-0 bg-white text-[var(--color-primary)] px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider shadow-sm"
      >
        <Megaphone class="w-3 h-3" />
        <span class="hidden xs:inline">Info</span>
      </div>
      <div class="flex-1 overflow-hidden relative flex items-center h-full">
        <div
          class="whitespace-nowrap animate-marquee inline-block text-[11px] sm:text-xs group-hover:[animation-play-state:paused] cursor-default"
        >
          {#each announcements as a (a.id)}
            <span class="mx-6 sm:mx-8"><strong>{a.title}:</strong> {a.content}</span>
          {/each}
        </div>
      </div>
    </div>
  {/if}

  <div
    class="hidden md:block bg-[var(--color-card)] border-b border-[var(--color-border)] py-2 px-6 text-xs text-[var(--color-muted-foreground)]"
  >
    <div class="max-w-7xl mx-auto flex items-center justify-between gap-4">
      <div class="flex items-center gap-4 flex-wrap text-[11px]">
        <span class="flex items-center gap-1.5 text-[var(--color-primary)] font-semibold">
          <Clock class="w-3.5 h-3.5" />
          {typeof settings?.operatingHours === 'string'
            ? settings.operatingHours
            : Array.isArray(settings?.operatingHours)
              ? 'Senin - Sabtu: 07.30 - 14.00 WIB | UGD: 24 Jam'
              : 'Senin - Sabtu: 07.30 - 16.00 WIB'}
        </span>
        <span class="text-[var(--color-muted-foreground)]">•</span>
        <span class="flex items-center gap-1.5 text-[var(--color-text)]">
          <Phone class="w-3.5 h-3.5 text-[var(--color-primary)]" />
          {settings?.phone || '(0328) 667123'}
        </span>
        <span class="text-[var(--color-muted-foreground)]">•</span>
        <span
          class="text-[10px] text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-md font-semibold border border-emerald-500/20"
        >
          UGD 24 Jam Buka
        </span>
      </div>

      <div class="flex items-center gap-3">
        <form onsubmit={handleSearchSubmit} class="relative">
          <Search
            class="w-3.5 h-3.5 text-[var(--color-muted-foreground)] absolute left-2.5 top-1/2 -translate-y-1/2"
          />
          <input
            type="text"
            aria-label="Cari Informasi"
            bind:value={searchQuery}
            placeholder="Cari layanan, SPP, regulasi..."
            class="bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)]/70 focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] rounded-xl pl-7 pr-3 py-1 text-[11px] text-[var(--color-text)] w-48 focus:w-60 transition-all"
          />
        </form>

        <a
          href="#/login"
          title="Portal CMS Admin"
          aria-label="Portal CMS Admin"
          class="p-1.5 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white transition-all flex items-center justify-center"
        >
          <Lock class="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  </div>

  <header
    class="sticky top-0 z-40 bg-[var(--color-bg)]/95 backdrop-blur-md border-b border-[var(--color-border)] px-4 sm:px-6 py-3 sm:py-4"
  >
    <div class="max-w-7xl mx-auto flex items-center justify-between gap-3">
      <a href="#/" class="flex items-center gap-2.5 sm:gap-3 group min-w-0">
        {#if settings?.logoUrl}
          <img
            src={settings.logoUrl}
            alt={settings?.siteName || 'Logo Puskesmas'}
            class="w-9 h-9 sm:w-10 sm:h-10 object-contain rounded-xl p-0.5 bg-white/10 group-hover:scale-105 transition shrink-0"
            onerror={(e) => { (e.target as HTMLImageElement).src = '/logo.png'; }}
          />
        {:else}
          <div
            class="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white font-bold shadow-md shadow-amber-500/20 group-hover:scale-105 transition shrink-0"
          >
            <HeartPulse class="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
          </div>
        {/if}
        <div class="min-w-0">
          <span
            class="text-sm sm:text-base font-medium text-[var(--color-text)] tracking-tight block truncate group-hover:text-[var(--color-primary)] transition"
          >
            {settings?.siteName || 'Puskesmas Manding'}
          </span>
          <span
            class="text-[9px] sm:text-[10px] text-[var(--color-muted-foreground)] tracking-wider uppercase font-semibold block truncate"
          >
            {settings?.tagline || 'Integrasi Layanan Primer • ILP'}
          </span>
        </div>
      </a>

      <nav class="hidden lg:flex items-center gap-1" aria-label="Navigasi Utama">
        {#each activeMenus as item (item.id)}
          {@const hasChildren = Boolean(item.children && item.children.length > 0)}
          {@const isMenuOpen = openMenuId === item.id}
          {@const isRootActive = activeNav === item.id || (item.url && currentPath === item.url)}
          <div
            class="relative group py-1"
            onmouseenter={() => (openMenuId = item.id)}
            onmouseleave={() => { openMenuId = null; openSubmenuId = null; }}
            role="menuitem"
          >
            <a
              href={item.url || '#'}
              target={item.openInNewTab ? '_blank' : '_self'}
              rel="noopener noreferrer"
              class="px-3 py-2 rounded-2xl text-xs font-semibold tracking-wider transition-all flex items-center gap-1.5 {isRootActive || isMenuOpen
                ? 'text-[var(--color-primary)] bg-[var(--color-card)] shadow-xs'
                : 'text-[var(--color-text)] hover:text-[var(--color-primary)] hover:bg-[var(--color-card)]'}"
            >
              <span>{item.label}</span>
              {#if hasChildren}
                <ChevronDown
                  class="w-3.5 h-3.5 transition-transform duration-200 {isMenuOpen
                    ? 'rotate-180 text-[var(--color-primary)]'
                    : 'opacity-60 group-hover:rotate-180 group-hover:text-[var(--color-primary)]'}"
                />
              {/if}
            </a>

            {#if hasChildren}
              <div
                class="absolute top-full left-0 pt-1.5 min-w-[240px] z-50 transition-all duration-200 origin-top-left {isMenuOpen
                  ? 'opacity-100 visible translate-y-0 pointer-events-auto'
                  : 'opacity-0 invisible translate-y-1 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:pointer-events-auto pointer-events-none'}"
              >
                <div
                  class="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl p-2 shadow-2xl backdrop-blur-md space-y-1 ring-1 ring-black/5"
                >
                  {#each item.children! as child (child.id)}
                    {@const hasSubChildren = Boolean(child.children && child.children.length > 0)}
                    {@const isSubmenuOpen = openSubmenuId === child.id}
                    <div
                      class="relative group/sub"
                      onmouseenter={() => (openSubmenuId = child.id)}
                      onmouseleave={() => (openSubmenuId = null)}
                      role="menuitem"
                    >
                      <a
                        href={child.url || '#'}
                        target={child.openInNewTab ? '_blank' : '_self'}
                        rel="noopener noreferrer"
                        class="flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all {isSubmenuOpen
                          ? 'text-[var(--color-primary)] bg-[var(--color-bg)]'
                          : 'text-[var(--color-text)] hover:text-[var(--color-primary)] hover:bg-[var(--color-bg)]'}"
                      >
                        <span class="truncate">{child.label}</span>
                        <div class="flex items-center gap-1 shrink-0">
                          {#if child.openInNewTab}
                            <ExternalLink class="w-3 h-3 text-[var(--color-muted-foreground)] opacity-60" />
                          {/if}
                          {#if hasSubChildren}
                            <ChevronRight
                              class="w-3.5 h-3.5 text-[var(--color-muted-foreground)] transition-transform {isSubmenuOpen
                                ? 'text-[var(--color-primary)] translate-x-0.5'
                                : 'group-hover/sub:text-[var(--color-primary)] group-hover/sub:translate-x-0.5'}"
                            />
                          {/if}
                        </div>
                      </a>

                      {#if hasSubChildren}
                        <div
                          class="absolute left-full top-0 pl-1.5 -mt-1 min-w-[220px] z-50 transition-all duration-200 origin-top-left {isSubmenuOpen
                            ? 'opacity-100 visible translate-x-0 pointer-events-auto'
                            : 'opacity-0 invisible translate-x-1 group-hover/sub:opacity-100 group-hover/sub:visible group-hover/sub:translate-x-0 group-hover/sub:pointer-events-auto pointer-events-none'}"
                        >
                          <div
                            class="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl p-2 shadow-2xl backdrop-blur-md space-y-1 ring-1 ring-black/5"
                          >
                            {#each child.children! as subChild (subChild.id)}
                              <a
                                href={subChild.url || '#'}
                                target={subChild.openInNewTab ? '_blank' : '_self'}
                                rel="noopener noreferrer"
                                class="flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-medium text-[var(--color-text)] hover:text-[var(--color-primary)] hover:bg-[var(--color-bg)] transition-all"
                              >
                                <span class="truncate">{subChild.label}</span>
                                {#if subChild.openInNewTab}
                                  <ExternalLink
                                    class="w-3 h-3 text-[var(--color-muted-foreground)] opacity-60 shrink-0"
                                  />
                                {/if}
                              </a>
                            {/each}
                          </div>
                        </div>
                      {/if}
                    </div>
                  {/each}
                </div>
              </div>
            {/if}
          </div>
        {/each}

        <a
          href="#/search"
          aria-label="Cari Informasi"
          class="p-2 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:text-[var(--color-primary)] transition ml-2"
          title="Cari Informasi"
        >
          <Search class="w-4 h-4" />
        </a>
        {#if flags.notifications !== false}
          <div class="ml-1">
            <NotificationBell />
          </div>
        {/if}
      </nav>

      <div class="flex items-center gap-1.5 lg:hidden">
        <a
          href="#/search"
          aria-label="Cari Informasi"
          class="p-2 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:text-[var(--color-text)] transition"
        >
          <Search class="w-4 h-4" />
        </a>

        <button
          type="button"
          onclick={() => (mobileDrawerOpen = !mobileDrawerOpen)}
          aria-label={mobileDrawerOpen ? 'Tutup Menu' : 'Buka Menu Lengkap'}
          class="p-2 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface)] transition flex items-center gap-1"
        >
          {#if mobileDrawerOpen}<X class="w-4 h-4" />{:else}<Menu class="w-4 h-4" />{/if}
        </button>
      </div>
    </div>
  </header>

  {#if mobileDrawerOpen}
    <div class="fixed inset-0 z-50 lg:hidden flex justify-end animate-in fade-in duration-200">
      <button
        type="button"
        aria-label="Tutup menu"
        class="absolute inset-0 bg-black/60 backdrop-blur-xs cursor-default"
        onclick={() => (mobileDrawerOpen = false)}
      ></button>

      <div
        class="relative w-full max-w-xs sm:max-w-sm bg-[var(--color-card)] border-l border-[var(--color-border)] h-full flex flex-col justify-between overflow-y-auto shadow-2xl p-5 space-y-6 animate-in slide-in-from-right duration-300"
      >
        <div class="space-y-5">
          <div class="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
            <div class="flex items-center gap-2">
              {#if settings?.logoUrl}
                <img
                  src={settings.logoUrl}
                  alt="Logo"
                  class="w-8 h-8 object-contain rounded-lg shrink-0 p-0.5 bg-white/10"
                  onerror={(e) => { (e.target as HTMLImageElement).src = '/logo.png'; }}
                />
              {:else}
                <div
                  class="w-8 h-8 rounded-xl bg-[var(--color-primary)] text-white flex items-center justify-center font-bold"
                >
                  <HeartPulse class="w-5 h-5" />
                </div>
              {/if}
              <div class="min-w-0">
                <h3 class="text-xs font-bold text-[var(--color-text)] truncate">{settings?.siteName || 'Menu Utama'}</h3>
                <p class="text-[10px] text-[var(--color-muted-foreground)] truncate">
                  {settings?.tagline || 'Puskesmas Manding'}
                </p>
              </div>
            </div>
            <button
              onclick={() => (mobileDrawerOpen = false)}
              class="p-1.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:text-[var(--color-text)]"
              aria-label="Tutup menu"
            >
              <X class="w-4 h-4" />
            </button>
          </div>

          <form onsubmit={handleSearchSubmit} class="relative">
            <Search class="w-4 h-4 text-[var(--color-muted-foreground)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari layanan, SPP, dokter..."
              bind:value={searchQuery}
              class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)]/70 focus:outline-none rounded-xl pl-9 pr-3 py-2 text-xs text-[var(--color-text)]"
            />
          </form>

          <div class="space-y-4 text-xs">
            <div class="space-y-1.5">
              <span class="text-[10px] font-bold text-[var(--color-primary)] uppercase tracking-wider block px-2">
                Pelayanan Pasien
              </span>
              {#if flags.onlineQueue !== false}
                <a
                  href="#/pendaftaran"
                  class="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[var(--color-text)] hover:bg-[var(--color-bg)] transition"
                >
                  <Activity class="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Pendaftaran Pasien Online</span>
                </a>
                <a
                  href="#/antrian/display"
                  class="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[var(--color-text)] hover:bg-[var(--color-bg)] transition"
                >
                  <Clock class="w-4 h-4 text-sky-500 shrink-0" />
                  <span>Live Display Antrean Poli</span>
                </a>
              {/if}
              <a
                href="#/layanan"
                class="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[var(--color-text)] hover:bg-[var(--color-bg)] transition"
              >
                <HeartPulse class="w-4 h-4 text-amber-500 shrink-0" />
                <span>Layanan & 5 Klaster ILP</span>
              </a>
            </div>

            <div class="space-y-1.5 pt-2 border-t border-[var(--color-border)]/60">
              <span class="text-[10px] font-bold text-[var(--color-primary)] uppercase tracking-wider block px-2">
                Dokumentasi & Regulasi
              </span>
              {#if flags.documents !== false}
                <a
                  href="#/dokumen"
                  class="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[var(--color-text)] hover:bg-[var(--color-bg)] transition font-medium"
                >
                  <FileText class="w-4 h-4 text-purple-500 shrink-0" />
                  <span>Dokumen & SPP Publik</span>
                </a>
              {/if}
              {#if flags.news !== false}
                <a
                  href="#/berita"
                  class="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[var(--color-text)] hover:bg-[var(--color-bg)] transition"
                >
                  <Sparkles class="w-4 h-4 text-blue-500 shrink-0" />
                  <span>Kabar Berita & Edukasi</span>
                </a>
              {/if}
              {#if flags.gallery !== false}
                <a
                  href="#/galeri"
                  class="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[var(--color-text)] hover:bg-[var(--color-bg)] transition"
                >
                  <ImageIcon class="w-4 h-4 text-pink-500 shrink-0" />
                  <span>Galeri Foto Kegiatan</span>
                </a>
              {/if}
              <a
                href="#/maklumat-pelayanan"
                class="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[var(--color-text)] hover:bg-[var(--color-bg)] transition"
              >
                <ShieldCheck class="w-4 h-4 text-teal-500 shrink-0" />
                <span>Maklumat Pelayanan</span>
              </a>
              {#if flags.microsite !== false}
                <a
                  href="#/microsites"
                  class="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[var(--color-text)] hover:bg-[var(--color-bg)] transition font-medium"
                >
                  <Globe class="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Microsite</span>
                </a>
              {/if}
            </div>

            <div class="space-y-1.5 pt-2 border-t border-[var(--color-border)]/60">
              <span class="text-[10px] font-bold text-[var(--color-primary)] uppercase tracking-wider block px-2">
                Aspirasi & Bantuan
              </span>
              {#if flags.skm !== false}
                <a
                  href="#/survei"
                  class="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[var(--color-text)] hover:bg-[var(--color-bg)] transition"
                >
                  <BarChart2 class="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Survei Kepuasan (SKM)</span>
                </a>
              {/if}
              {#if flags.complaints !== false}
                <a
                  href="#/kritik-saran"
                  class="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[var(--color-text)] hover:bg-[var(--color-bg)] transition"
                >
                  <MessageSquare class="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Kritik & Pengaduan Pasien</span>
                </a>
              {/if}
              <a
                href="#/faq"
                class="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[var(--color-text)] hover:bg-[var(--color-bg)] transition"
              >
                <HelpCircle class="w-4 h-4 text-cyan-500 shrink-0" />
                <span>Pusat Bantuan & FAQ</span>
              </a>
              <a
                href="#/kontak"
                class="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[var(--color-text)] hover:bg-[var(--color-bg)] transition"
              >
                <Phone class="w-4 h-4 text-indigo-500 shrink-0" />
                <span>Hubungi Kami</span>
              </a>
            </div>

            <div class="space-y-1.5 pt-2 border-t border-[var(--color-border)]/60">
              <span class="text-[10px] font-bold text-[var(--color-primary)] uppercase tracking-wider block px-2">
                Navigasi Halaman & Menu
              </span>
              {#each activeMenus as m (m.id)}
                {@const hasChildren = Boolean(m.children && m.children.length > 0)}
                {@const isExpanded = !!expandedMobileMenus[m.id]}
                <div class="space-y-1">
                  <div class="flex items-center justify-between rounded-xl hover:bg-[var(--color-bg)] transition pr-1">
                    <a
                      href={m.url || '#'}
                      target={m.openInNewTab ? '_blank' : '_self'}
                      class="flex-1 px-3 py-2 text-xs font-medium text-[var(--color-text)] hover:text-[var(--color-primary)] flex items-center justify-between"
                    >
                      <span>{m.label}</span>
                      {#if m.openInNewTab}<ExternalLink class="w-3 h-3 text-[var(--color-muted-foreground)] ml-1" />{/if}
                    </a>
                    {#if hasChildren}
                      <button
                        type="button"
                        onclick={() => toggleMobileMenu(m.id)}
                        class="p-1.5 rounded-lg text-[var(--color-muted-foreground)] hover:text-[var(--color-primary)] hover:bg-[var(--color-bg)] transition"
                        aria-label="Buka Submenu {m.label}"
                      >
                        <ChevronDown
                          class="w-3.5 h-3.5 transition-transform duration-200 {isExpanded ? 'rotate-180 text-[var(--color-primary)]' : ''}"
                        />
                      </button>
                    {/if}
                  </div>

                  {#if hasChildren && isExpanded}
                    <div class="pl-4 pr-1 space-y-1 border-l-2 border-[var(--color-primary)]/20 ml-3">
                      {#each m.children! as child (child.id)}
                        {@const hasSubChildren = Boolean(child.children && child.children.length > 0)}
                        {@const isSubExpanded = !!expandedMobileMenus[child.id]}
                        <div class="space-y-1">
                          <div class="flex items-center justify-between rounded-xl hover:bg-[var(--color-bg)] transition pr-1">
                            <a
                              href={child.url || '#'}
                              target={child.openInNewTab ? '_blank' : '_self'}
                              class="flex-1 px-2.5 py-1.5 text-xs text-[var(--color-text)] hover:text-[var(--color-primary)] flex items-center justify-between"
                            >
                              <span>{child.label}</span>
                              {#if child.openInNewTab}<ExternalLink class="w-3 h-3 text-[var(--color-muted-foreground)] ml-1" />{/if}
                            </a>
                            {#if hasSubChildren}
                              <button
                                type="button"
                                onclick={() => toggleMobileMenu(child.id)}
                                class="p-1 rounded-lg text-[var(--color-muted-foreground)] hover:text-[var(--color-primary)] hover:bg-[var(--color-bg)] transition"
                                aria-label="Buka Sub Child {child.label}"
                              >
                                <ChevronDown
                                  class="w-3 h-3 transition-transform duration-200 {isSubExpanded ? 'rotate-180 text-[var(--color-primary)]' : ''}"
                                />
                              </button>
                            {/if}
                          </div>

                          {#if hasSubChildren && isSubExpanded}
                            <div class="pl-3 space-y-1 border-l-2 border-[var(--color-primary)]/10 ml-2">
                              {#each child.children! as subChild (subChild.id)}
                                <a
                                  href={subChild.url || '#'}
                                  target={subChild.openInNewTab ? '_blank' : '_self'}
                                  class="block px-2.5 py-1.5 text-[11px] text-[var(--color-muted-foreground)] hover:text-[var(--color-primary)] hover:bg-[var(--color-bg)] rounded-lg transition"
                                >
                                  {subChild.label}
                                </a>
                              {/each}
                            </div>
                          {/if}
                        </div>
                      {/each}
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        </div>

        <div class="pt-4 border-t border-[var(--color-border)] space-y-3">
          <a
            href="#/login"
            class="w-full py-2.5 px-4 rounded-xl bg-[var(--color-primary)] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition"
          >
            <Lock class="w-3.5 h-3.5" />
            <span>Portal Login Admin CMS</span>
          </a>
          <div class="text-[10px] text-[var(--color-muted-foreground)] text-center">
            © {new Date().getFullYear()} {settings?.siteName || 'Puskesmas Manding'}
          </div>
        </div>
      </div>
    </div>
  {/if}

  <main id="konten-utama" tabindex="-1" class="flex-1 pb-20 sm:pb-8">
    {@render children()}
  </main>

  <div
    class="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--color-card)]/95 backdrop-blur-lg border-t border-[var(--color-border)] px-2 py-1.5 shadow-lg"
  >
    <div
      class="grid gap-1 items-center max-w-md mx-auto"
      style="grid-template-columns: repeat({dockItems.length + 1}, minmax(0, 1fr));"
    >
      {#each dockItems as item, idx (idx)}
        {@const IconComponent = item.icon}
        <a
          href={item.href}
          class="flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition {item.active
            ? 'text-[var(--color-primary)] font-bold'
            : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-text)]'}"
        >
          <IconComponent class="w-4 h-4 mb-1" />
          <span class="text-[10px] tracking-tight">{item.label}</span>
        </a>
      {/each}

      <button
        type="button"
        onclick={() => (mobileDrawerOpen = true)}
        class="flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-[var(--color-muted-foreground)] hover:text-[var(--color-text)] transition cursor-pointer"
      >
        <Menu class="w-4 h-4 mb-1" />
        <span class="text-[10px] tracking-tight">Menu</span>
      </button>
    </div>
  </div>

  <footer
    class="bg-[var(--color-card)] border-t border-[var(--color-border)] pt-12 pb-8 px-6 text-xs text-[var(--color-muted-foreground)]"
  >
    <div class="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
      <div class="space-y-3">
        <div class="flex items-center gap-2">
          {#if settings?.logoUrl}
            <img
              src={settings.logoUrl}
              alt="Logo"
              class="w-8 h-8 object-contain rounded-lg shrink-0 p-0.5 bg-white/10"
              onerror={(e) => { (e.target as HTMLImageElement).src = '/logo.png'; }}
            />
          {:else}
            <div
              class="w-8 h-8 rounded-xl bg-[var(--color-primary)] text-white flex items-center justify-center font-bold"
            >
              <HeartPulse class="w-5 h-5" />
            </div>
          {/if}
          <span class="text-sm font-bold text-[var(--color-text)]">{settings?.siteName || 'Puskesmas Manding'}</span>
        </div>
        <p class="text-xs text-[var(--color-muted-foreground)] leading-relaxed">
          {settings?.tagline || 'Pelayanan Kesehatan Profesional, Ramah, dan Terjangkau untuk Seluruh Masyarakat.'}
        </p>
      </div>

      <div>
        <h4 class="text-xs font-bold text-[var(--color-text)] uppercase tracking-widest mb-4">Navigasi Utama</h4>
        <ul class="space-y-2">
          <li><a href="#/" class="text-[var(--color-muted-foreground)] hover:text-[var(--color-primary)] transition">Beranda</a></li>
          <li><a href="#/layanan" class="text-[var(--color-muted-foreground)] hover:text-[var(--color-primary)] transition">Layanan Kesehatan</a></li>
          {#if flags.documents !== false}<li><a href="#/dokumen" class="text-[var(--color-muted-foreground)] hover:text-[var(--color-primary)] transition">Dokumen & Regulasi SPP</a></li>{/if}
          {#if flags.news !== false}<li><a href="#/berita" class="text-[var(--color-muted-foreground)] hover:text-[var(--color-primary)] transition">Berita & Informasi</a></li>{/if}
          {#if flags.gallery !== false}<li><a href="#/galeri" class="text-[var(--color-muted-foreground)] hover:text-[var(--color-primary)] transition">Galeri Foto Kegiatan</a></li>{/if}
          {#if flags.skm !== false}<li><a href="#/survei" class="text-[var(--color-muted-foreground)] hover:text-[var(--color-primary)] transition">Survei Kepuasan (SKM)</a></li>{/if}
          {#if flags.complaints !== false}<li><a href="#/kritik-saran" class="text-[var(--color-muted-foreground)] hover:text-[var(--color-primary)] transition">Pengaduan & Saran</a></li>{/if}
          <li><a href="#/kontak" class="text-[var(--color-muted-foreground)] hover:text-[var(--color-primary)] transition">Hubungi Kami</a></li>
        </ul>
      </div>

      <div>
        <h4 class="text-xs font-bold text-[var(--color-text)] uppercase tracking-widest mb-4">Integrasi Layanan Primer</h4>
        <ul class="space-y-2 text-[var(--color-muted-foreground)]">
          <li>Klaster 1: Manajemen & Mutu</li>
          <li>Klaster 2: Ibu, Anak & Remaja</li>
          <li>Klaster 3: Usia Dewasa & Lansia</li>
          <li>Klaster 4: Penanggulangan Menular</li>
          <li>Lintas Klaster: UGD & Persalinan 24 Jam</li>
        </ul>
      </div>

      <div>
        <h4 class="text-xs font-bold text-[var(--color-text)] uppercase tracking-widest mb-4">Kontak & Operasional</h4>
        <ul class="space-y-2.5 text-[var(--color-muted-foreground)]">
          <li class="flex items-start gap-2">
            <MapPin class="w-4 h-4 text-[var(--color-primary)] shrink-0 mt-0.5" />
            <span>{settings?.address || 'Jl. Kesehatan No. 123, Kelurahan Sejahtera'}</span>
          </li>
          <li class="flex items-center gap-2">
            <Phone class="w-4 h-4 text-[var(--color-primary)] shrink-0" />
            <span>{settings?.phone || '(0328) 667123'}</span>
          </li>
          <li class="flex items-center gap-2">
            <Mail class="w-4 h-4 text-[var(--color-primary)] shrink-0" />
            <span>{settings?.email || 'puskesmas.manding@gmail.com'}</span>
          </li>
          <li
            class="flex items-start gap-2 pt-1 border-t border-[var(--color-border)]/60 text-[11px] text-[var(--color-primary)]"
          >
            <Clock class="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              {typeof settings?.operatingHours === 'string'
                ? settings.operatingHours
                : Array.isArray(settings?.operatingHours)
                  ? 'Senin - Sabtu: 07.30 - 14.00 WIB | UGD: 24 Jam'
                  : 'Senin - Sabtu: 07.30 - 16.00 WIB'}
            </span>
          </li>
        </ul>
      </div>
    </div>

    <div
      class="max-w-7xl mx-auto pt-8 border-t border-[var(--color-border)] flex flex-col md:flex-row items-center justify-between gap-4 text-[var(--color-muted-foreground)] text-[11px]"
    >
      <div>© {new Date().getFullYear()} {settings?.siteName || 'Puskesmas Manding'}. Seluruh Hak Cipta Dilindungi.</div>
      <div>Dikelola secara dinamis via CMS Puskesmas Terpadu (Permenkes No. 19/2024 & Permenkes No. 6/2024)</div>
    </div>
  </footer>
</div>
