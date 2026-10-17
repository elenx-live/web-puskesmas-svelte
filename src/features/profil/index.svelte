<!--
  @component Halaman Profil resmi Puskesmas — identitas institusi, pimpinan,
  visi & misi, sejarah, serta lokasi & jam pelayanan. Dibungkus PublicLayout oleh App.svelte.
-->
<script lang="ts">
  import {
    ShieldCheck, HeartPulse, Building2, Target, Award,
    MapPin, Phone, Mail, Clock, FileText, CheckCircle2, UserCheck
  } from 'lucide-svelte';
  import { siteSettingsService } from '../../shared/services/siteSettingsService.js';
  import type { SiteSettings } from '../../shared/types/index.js';

  let settings = $state<SiteSettings>(siteSettingsService.getCachedSettings());
  let loading = $state(true);

  $effect(() => {
    let isMounted = true;
    siteSettingsService.getSettings().then(data => {
      if (isMounted) {
        settings = data;
        loading = false;
      }
    }).catch(() => {
      if (isMounted) loading = false;
    });

    const handleSettingsUpdated = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        settings = detail;
      }
    };

    window.addEventListener('puskesmas_settings_updated', handleSettingsUpdated);
    return () => {
      isMounted = false;
      window.removeEventListener('puskesmas_settings_updated', handleSettingsUpdated);
    };
  });

  const missionLines = $derived.by(() => {
    if (!settings.mission) {
      return [
        'Menyelenggarakan pelayanan kesehatan terjangkau, bermutu, dan berkeadilan.',
        'Mendorong kemandirian hidup sehat bagi keluarga dan komunitas di wilayah kerja.',
        'Memperkuat tata kelola puskesmas berbasis integrasi layanan primer (ILP).',
        'Meningkatkan komitmen transparansi dan integritas Standar Pelayanan Publik.'
      ];
    }
    return settings.mission
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => line.replace(/^[\d+.-]+\s*/, ''));
  });

  const addressLine = $derived(
    [settings.village, settings.district, settings.regency, settings.province, settings.postalCode]
      .filter(Boolean)
      .join(', ')
  );
</script>

<div class="py-12 md:py-16 px-4 md:px-6 max-w-7xl mx-auto space-y-12 animate-in fade-in">

  <!-- Header Profil -->
  <div class="border-b border-[var(--color-border)] pb-8 space-y-4">
    <div class="flex flex-wrap items-center gap-2.5">
      <span class="text-xs font-bold uppercase tracking-widest text-[var(--color-primary)]">
        Profil Resmi Institusi
      </span>
      {#if settings.accreditationStatus}
        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1">
          <Award class="w-3 h-3" />
          <span>Akreditasi: {settings.accreditationStatus}</span>
        </span>
      {/if}
      {#if settings.puskesmasCode}
        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20">
          Kode Faskes: {settings.puskesmasCode}
        </span>
      {/if}
    </div>

    <div class="space-y-2">
      <h1 class="text-3xl md:text-4xl font-light text-[var(--color-text)]">
        {settings.siteName || 'Puskesmas Mandiri'}
      </h1>
      <p class="text-base text-[var(--color-primary)] font-medium">
        {settings.tagline || 'Melayani dengan Sepenuh Hati, Sehat untuk Semua'}
      </p>
    </div>

    <p class="text-sm text-[var(--color-muted-foreground)] max-w-3xl leading-relaxed">
      {settings.siteDescription || 'Pusat Kesehatan Masyarakat yang berkomitmen menyediakan layanan kesehatan komprehensif, promotif, preventif, kuratif, dan rehabilitatif bagi seluruh lapisan masyarakat.'}
    </p>

    {#if settings.orgName}
      <div class="pt-2 flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-[var(--color-muted-foreground)]">
        <span class="flex items-center gap-1.5">
          <Building2 class="w-3.5 h-3.5 text-[var(--color-primary)]" />
          <span>Instansi Induk: <strong>{settings.orgName}</strong></span>
        </span>
        {#if settings.orgRegion}
          <span>• Wilayah Pembina: <strong>{settings.orgRegion}</strong></span>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Pimpinan & Maklumat Singkat -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
    {#if settings.headOfPuskesmas}
      <div class="bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl p-6 space-y-3">
        <div class="w-10 h-10 rounded-2xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-center text-[var(--color-primary)]">
          <UserCheck class="w-5 h-5" />
        </div>
        <div>
          <span class="text-[10px] uppercase font-bold tracking-widest text-[var(--color-muted-foreground)]">Kepala Puskesmas</span>
          <h3 class="text-base font-bold text-[var(--color-text)] mt-0.5">{settings.headOfPuskesmas}</h3>
          {#if settings.nipHeadOfPuskesmas}
            <p class="text-xs text-[var(--color-muted-foreground)]">NIP. {settings.nipHeadOfPuskesmas}</p>
          {/if}
        </div>
      </div>
    {/if}

    <div class="bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl p-6 space-y-3 md:col-span-2">
      <div class="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
        <ShieldCheck class="w-5 h-5" />
      </div>
      <div>
        <span class="text-[10px] uppercase font-bold tracking-widest text-amber-500">Maklumat & Motto Pelayanan</span>
        <p class="text-sm font-semibold text-[var(--color-text)] italic mt-1">
          "{settings.motto || settings.tagline || 'Kesehatan Anda, Prioritas Utama Pelayanan Kami'}"
        </p>
        <p class="text-xs text-[var(--color-muted-foreground)] mt-2 leading-relaxed">
          {settings.servicePromise || 'Dengan ini kami berjanji dan menyatakan sanggup menyelenggarakan pelayanan kesehatan sesuai dengan standar pelayanan yang telah ditetapkan serta siap menerima evaluasi demi kepuasan publik.'}
        </p>
      </div>
    </div>
  </div>

  <!-- Visi & Misi -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
    <div class="bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl p-8 space-y-4 flex flex-col justify-between">
      <div class="space-y-4">
        <div class="w-12 h-12 rounded-2xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-center text-[var(--color-primary)]">
          <Target class="w-6 h-6" />
        </div>
        <h2 class="text-2xl font-bold text-[var(--color-text)]">Visi</h2>
        <p class="text-sm text-[var(--color-text)] leading-relaxed">
          {settings.vision || 'Terwujudnya masyarakat yang mandiri, sehat paripurna, dan berkeadilan melalui sistem pelayanan kesehatan primer yang tangguh dan terintegrasi.'}
        </p>
      </div>
      <div class="pt-4 border-t border-[var(--color-border)] flex items-center gap-2 text-xs text-[var(--color-muted-foreground)]">
        <CheckCircle2 class="w-4 h-4 text-emerald-500" />
        <span>Arah Kebijakan Terpadu Pelayanan Kesehatan</span>
      </div>
    </div>

    <div class="bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl p-8 space-y-4">
      <div class="w-12 h-12 rounded-2xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-center text-[var(--color-primary)]">
        <HeartPulse class="w-6 h-6" />
      </div>
      <h2 class="text-2xl font-bold text-[var(--color-text)]">Misi</h2>
      <ul class="text-xs md:text-sm text-[var(--color-text)] space-y-3 leading-relaxed">
        {#each missionLines as mission, idx}
          <li class="flex items-start gap-3">
            <span class="w-5 h-5 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
              {idx + 1}
            </span>
            <span>{mission}</span>
          </li>
        {/each}
      </ul>
    </div>
  </div>

  <!-- Sejarah Lembaga jika ada -->
  {#if settings.history}
    <div class="bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl p-8 space-y-4">
      <div class="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
        <FileText class="w-5 h-5" />
      </div>
      <h2 class="text-xl font-bold text-[var(--color-text)]">Sejarah & Gambaran Singkat Puskesmas</h2>
      <p class="text-xs md:text-sm text-[var(--color-muted-foreground)] leading-relaxed whitespace-pre-line">
        {settings.history}
      </p>
    </div>
  {/if}

  <!-- Kontak & Lokasi -->
  <div class="bg-gradient-to-br from-[var(--color-card)] to-[var(--color-bg)] border border-[var(--color-border)] rounded-3xl p-8 space-y-6">
    <div class="border-b border-[var(--color-border)] pb-4 flex items-center justify-between">
      <h2 class="text-lg font-bold text-[var(--color-text)] flex items-center gap-2">
        <MapPin class="w-5 h-5 text-[var(--color-primary)]" />
        <span>Lokasi & Jam Pelayanan</span>
      </h2>
      <span class="text-xs text-[var(--color-muted-foreground)]">Informasi Kontak Resmi</span>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-[var(--color-text)]">
      <div class="space-y-1.5">
        <span class="font-bold text-[var(--color-muted-foreground)] uppercase text-[10px] tracking-widest block">Alamat Kantor</span>
        <p class="leading-relaxed">{settings.address || 'Alamat kantor puskesmas'}</p>
        {#if settings.district || settings.regency}
          <p class="text-[var(--color-muted-foreground)]">{addressLine}</p>
        {/if}
      </div>

      <div class="space-y-1.5">
        <span class="font-bold text-[var(--color-muted-foreground)] uppercase text-[10px] tracking-widest block">Kontak & WhatsApp</span>
        <p class="flex items-center gap-1.5"><Phone class="w-3.5 h-3.5 text-[var(--color-primary)]" /> {settings.phone}</p>
        <p class="flex items-center gap-1.5"><Mail class="w-3.5 h-3.5 text-[var(--color-primary)]" /> {settings.email}</p>
        {#if settings.whatsapp}
          <p class="text-emerald-500 font-medium">WA Layanan: {settings.whatsapp}</p>
        {/if}
      </div>

      <div class="space-y-1.5">
        <span class="font-bold text-[var(--color-muted-foreground)] uppercase text-[10px] tracking-widest block">Waktu Operasional</span>
        <p class="flex items-center gap-1.5">
          <Clock class="w-3.5 h-3.5 text-amber-500" />
          {#if typeof settings.operatingHours === 'string'}
            {settings.operatingHours}
          {:else if Array.isArray(settings.operatingHours)}
            Senin - Sabtu: 07.30 - 14.00 WIB | UGD: 24 Jam
          {:else}
            Senin - Sabtu: 07.30 - 16.00 WIB
          {/if}
        </p>
        <p class="text-[10px] text-[var(--color-muted-foreground)]">Unit Gawat Darurat (UGD) & Persalinan melayani 24 jam setiap hari.</p>
      </div>
    </div>
  </div>

</div>
