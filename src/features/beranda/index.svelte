<!-- @component Halaman beranda publik — memuat template artistik / section modular. -->
<script lang="ts">
  import type {
    HomepageSection,
    ServiceEntity,
    PostEntity,
    SiteSettings,
    AnnouncementEntity,
    MicrositeEntity,
    HomepageTemplateType,
    SiteFeatureFlags
  } from '../../shared/types/index.js';
  import HomepageSectionsRenderer from './HomepageSectionsRenderer.svelte';
  import GrandMajesticTemplate from './templates/GrandMajesticTemplate.svelte';
  import BioLuminescentArtTemplate from './templates/BioLuminescentArtTemplate.svelte';
  import AvantGardeCyberClinicTemplate from './templates/AvantGardeCyberClinicTemplate.svelte';
  import HarmoniNusantaraTemplate from './templates/HarmoniNusantaraTemplate.svelte';
  import MinimalistGalleryTemplate from './templates/MinimalistGalleryTemplate.svelte';
  import { homepageService } from '../../shared/services/homepageService.js';
  import { serviceEngineService } from '../../shared/services/serviceEngineService.js';
  import { postService } from '../../shared/services/postService.js';
  import { siteSettingsService } from '../../shared/services/siteSettingsService.js';
  import { announcementService } from '../../shared/services/announcementService.js';
  import { micrositeService } from '../../shared/services/micrositeService.js';
  import { featureFlagsService } from '../../shared/services/featureFlagsService.js';

  function readJson<T>(key: string, fallback: T): T {
    try {
      const c = localStorage.getItem(key);
      return c ? (JSON.parse(c) as T) : fallback;
    } catch {
      return fallback;
    }
  }

  let template = $state<HomepageTemplateType>(
    (() => {
      const published = readJson<{ template?: HomepageTemplateType } | null>(
        'puskesmas_homepage_published',
        null
      );
      return published?.template || 'modern_majestic';
    })()
  );
  let sections = $state<HomepageSection[]>(
    readJson<{ sections?: HomepageSection[] }>('puskesmas_homepage_config', { sections: [] }).sections ||
      []
  );
  let services = $state<ServiceEntity[]>(readJson('puskesmas_services', []));
  let posts = $state<PostEntity[]>(readJson('puskesmas_cms_posts', []));
  let settings = $state<SiteSettings | null>(readJson('puskesmas_site_settings', null));
  let announcements = $state<AnnouncementEntity[]>(readJson('puskesmas_announcements', []));
  let microsites = $state<MicrositeEntity[]>(readJson('puskesmas_microsites', []));
  let flags = $state<Partial<SiteFeatureFlags>>(featureFlagsService.getFlags());

  // Jika cache sudah ada, render langsung tanpa spinner pemblokir
  let loading = $state<boolean>(() => {
    try {
      return (
        !localStorage.getItem('puskesmas_site_settings') && !localStorage.getItem('puskesmas_services')
      );
    } catch {
      return true;
    }
  });

  let isMounted = true;

  async function loadData() {
    try {
      const [
        homeConfig,
        allServices,
        allPosts,
        siteSettings,
        publishedAnn,
        publishedMicrosites
      ] = await Promise.all([
        homepageService.getPublishedConfig(),
        serviceEngineService.getPublishedServices(),
        postService.getPublishedPosts(),
        siteSettingsService.getSettings(),
        announcementService.getPublishedAnnouncements(),
        micrositeService.getPublishedAndActiveMicrosites()
      ]);

      if (!isMounted) return;

      if (homeConfig.template) {
        template = homeConfig.template;
      }
      sections = homeConfig.sections;
      services = allServices;
      posts = allPosts;
      settings = siteSettings;
      announcements = publishedAnn;
      microsites = publishedMicrosites;
    } catch (err) {
      console.error('Error loading homepage data:', err);
    } finally {
      if (isMounted) loading = false;
    }
  }

  $effect(() => {
    isMounted = true;
    loadData();

    // Event listener untuk update instan lintas-tab / lintas-device
    const handleUpdate = () => {
      loadData();
    };

    window.addEventListener('puskesmas_homepage_updated', handleUpdate);
    window.addEventListener('puskesmas_theme_updated', handleUpdate);
    window.addEventListener('puskesmas_settings_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('focus', handleUpdate);

    // Sinkronisasi berkala tiap 20 detik agar data segar di semua perangkat
    const interval = setInterval(loadData, 20000);

    return () => {
      isMounted = false;
      window.removeEventListener('puskesmas_homepage_updated', handleUpdate);
      window.removeEventListener('puskesmas_theme_updated', handleUpdate);
      window.removeEventListener('puskesmas_settings_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('focus', handleUpdate);
      clearInterval(interval);
    };
  });
</script>

{#if loading}
  <div class="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
    <div
      class="w-10 h-10 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"
    ></div>
    <p class="text-xs text-[var(--color-muted-foreground)] font-medium font-mono uppercase tracking-widest">
      Memuat Tata Letak Portal...
    </p>
  </div>
{:else if template === 'modern_majestic'}
  <GrandMajesticTemplate {services} {posts} {settings} {announcements} {microsites} {flags} />
{:else if template === 'artistic_bio'}
  <BioLuminescentArtTemplate {services} {posts} {settings} {announcements} {microsites} {flags} />
{:else if template === 'avant_garde'}
  <AvantGardeCyberClinicTemplate {services} {posts} {settings} {announcements} {microsites} {flags} />
{:else if template === 'nusantara_art'}
  <HarmoniNusantaraTemplate {services} {posts} {settings} {announcements} {microsites} {flags} />
{:else if template === 'minimal_gallery'}
  <MinimalistGalleryTemplate {services} {posts} {settings} {announcements} {microsites} {flags} />
{:else}
  <HomepageSectionsRenderer {sections} {services} {posts} {settings} {announcements} {microsites} />
{/if}
