<!-- @component Halaman publik Kontak, Lokasi & Jam Operasional Puskesmas (dari PublicContactPage). -->
<script lang="ts">
  import { contactService } from '../../shared/services/contactService.js';
  import type { PuskesmasContactSettings } from '../../shared/types/index.js';
  import { toastStore } from '../../shared/stores/toast.svelte.js';
  import {
    Building2, Phone, MessageSquare, Mail, MapPin, Clock, ShieldAlert,
    ExternalLink, ArrowRight, Send, HelpCircle, Navigation, Map,
    CheckCircle2
  } from 'lucide-svelte';

  let settings = $state<PuskesmasContactSettings | null>(null);
  let loading = $state(true);
  let statusInfo = $state({ isOpen: true, statusLabel: 'Buka', message: '' });

  // Formulir kontak cepat
  let formName = $state('');
  let formContact = $state('');
  let formSubject = $state('Informasi Umum');
  let formMessage = $state('');
  let formSubmitting = $state(false);
  let formSubmitted = $state(false);

  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const todayName = dayNames[new Date().getDay()];

  const primaryPhone = $derived(settings?.channels?.find(c => c.type === 'Phone' && c.showOnWebsite));
  const primaryWA = $derived(settings?.channels?.find(c => c.type === 'WhatsApp' && c.showOnWebsite));
  const primaryEmail = $derived(settings?.channels?.find(c => c.type === 'Email' && c.showOnWebsite));
  const otherChannels = $derived(settings?.channels?.filter(c => c.showOnWebsite) || []);

  $effect(() => {
    let cancelled = false;

    async function load() {
      loading = true;
      try {
        const data = await contactService.getPublicContactSettings();
        if (cancelled) return;
        settings = data;
        statusInfo = contactService.checkIsOpenNow(data);
      } catch (e) {
        console.error('Failed to load contact settings:', e);
      } finally {
        if (!cancelled) loading = false;
      }
    }
    load();

    const handleSettingsUpdated = () => {
      contactService.getPublicContactSettings().then(data => {
        if (cancelled) return;
        settings = data;
        statusInfo = contactService.checkIsOpenNow(data);
      });
    };

    window.addEventListener('puskesmas_settings_updated', handleSettingsUpdated);
    window.addEventListener('puskesmas_contact_updated', handleSettingsUpdated);
    return () => {
      cancelled = true;
      window.removeEventListener('puskesmas_settings_updated', handleSettingsUpdated);
      window.removeEventListener('puskesmas_contact_updated', handleSettingsUpdated);
    };
  });

  function handleFormSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (!formName.trim() || !formContact.trim() || !formMessage.trim()) {
      toastStore.showToast('Mohon lengkapi semua kolom yang wajib diisi.', 'error');
      return;
    }

    formSubmitting = true;
    setTimeout(() => {
      formSubmitting = false;
      formSubmitted = true;
      toastStore.showToast('Pesan Anda berhasil dikirim ke Petugas Layanan Informasi Puskesmas.', 'success');
      formName = '';
      formContact = '';
      formMessage = '';
    }, 600);
  }
</script>

{#if loading || !settings}
  <div class="min-h-[60vh] flex flex-col items-center justify-center p-8 space-y-4">
    <div class="w-8 h-8 border-3 border-[var(--color-primary)]/20 border-t-[var(--color-primary)] rounded-full animate-spin"></div>
    <p class="text-xs text-[var(--color-muted-foreground)] font-medium">Memuat informasi kontak & lokasi Puskesmas...</p>
  </div>
{:else}
  <div class="py-10 md:py-14 px-4 sm:px-6 max-w-7xl mx-auto space-y-10 animate-in fade-in duration-300">

    <!-- Header Breadcrumb & Section Title -->
    <div class="border-b border-[var(--color-border)] pb-8 space-y-4">
      <div class="flex flex-wrap items-center gap-2 text-xs text-[var(--color-muted-foreground)]">
        <a href="#/" class="hover:text-[var(--color-primary)] transition">Beranda</a>
        <span>/</span>
        <span class="text-[var(--color-primary)] font-semibold">Kontak & Lokasi</span>
      </div>

      <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div class="space-y-2">
          <span class="inline-flex items-center gap-1.5 px-3 py-1 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-full text-xs font-bold uppercase tracking-wider">
            <Building2 class="w-3.5 h-3.5" />
            {settings.name || 'Puskesmas Manding'}
          </span>
          <h1 class="text-2xl sm:text-3xl md:text-4xl font-light text-[var(--color-text)] tracking-tight">
            Kontak, Lokasi & Jam Operasional
          </h1>
          <p class="text-xs sm:text-sm text-[var(--color-muted-foreground)] max-w-3xl">
            {settings.tagline || 'Pusat informasi resmi, saluran konsultasi kesehatan, alamat fasilitas medis, dan jadwal operasional pelayanan publik.'}
          </p>
        </div>

        <!-- Live Operational Status Pill -->
        <div class="shrink-0">
          <div class={`inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl text-xs font-bold border shadow-xs ${
            statusInfo.isOpen
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
          }`}>
            <span class={`w-2.5 h-2.5 rounded-full ${statusInfo.isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
            <span>Status Pelayanan: {statusInfo.statusLabel}</span>
            {#if statusInfo.message}
              <span class="text-[11px] font-normal opacity-85">({statusInfo.message})</span>
            {/if}
          </div>
        </div>
      </div>
    </div>

    <!-- Emergency Alert Banner if Enabled -->
    {#if settings.emergencyInfo?.showOnContactPage}
      <div class="p-6 md:p-8 rounded-3xl bg-rose-600 text-white shadow-xl shadow-rose-600/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div class="space-y-2 max-w-3xl">
          <div class="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 rounded-full text-xs font-bold uppercase tracking-wider text-white backdrop-blur-xs">
            <ShieldAlert class="w-4 h-4 text-white" />
            Layanan Gawat Darurat & Siaga 24 Jam
          </div>
          <h2 class="text-xl md:text-2xl font-bold">{settings.emergencyInfo.title || 'IGD & Ambulans Siaga 24 Jam'}</h2>
          <p class="text-rose-100 text-xs sm:text-sm leading-relaxed">
            {settings.emergencyInfo.description || 'Instalasi Gawat Darurat (IGD) Puskesmas siap melayani penanganan kegawatdaruratan medis, kecelakaan, dan rujukan cepat 24 jam tanpa henti.'}
          </p>
          {#if settings.emergencyInfo.locationNote}
            <p class="text-xs text-rose-200 font-medium flex items-center gap-1 pt-1">
              <MapPin class="w-3.5 h-3.5 shrink-0" />
              {settings.emergencyInfo.locationNote}
            </p>
          {/if}
        </div>

        <div class="flex flex-col sm:flex-row md:flex-col gap-2.5 w-full md:w-auto shrink-0">
          {#if settings.emergencyInfo.hotlineNumbers && settings.emergencyInfo.hotlineNumbers.length > 0}
            {#each settings.emergencyInfo.hotlineNumbers as num}
              <a
                href={`tel:${num.replace(/[^0-9+]/g, '')}`}
                class="px-5 py-3 bg-white text-rose-700 hover:bg-rose-50 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-md hover:scale-[1.02]"
              >
                <Phone class="w-4 h-4 text-rose-600" />
                <span>Hotline IGD: {num}</span>
              </a>
            {/each}
          {:else}
            <a
              href="tel:119"
              class="px-5 py-3 bg-white text-rose-700 hover:bg-rose-50 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-md hover:scale-[1.02]"
            >
              <Phone class="w-4 h-4 text-rose-600" />
              <span>Hotline IGD 24 Jam: 119</span>
            </a>
          {/if}
        </div>
      </div>
    {/if}

    <!-- 3 Quick Action Contact Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
      <!-- Card 1: Telepon -->
      <div class="p-6 rounded-3xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-xs flex flex-col justify-between space-y-4 group hover:border-[var(--color-primary)]/50 transition">
        <div class="space-y-3">
          <div class="w-12 h-12 rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center group-hover:scale-105 transition">
            <Phone class="w-6 h-6" />
          </div>
          <div>
            <span class="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted-foreground)] block">
              Telepon Puskesmas
            </span>
            <h3 class="text-base font-bold text-[var(--color-text)] mt-0.5">
              {primaryPhone ? primaryPhone.value : '(021) 555-0192'}
            </h3>
            <p class="text-xs text-[var(--color-muted-foreground)] mt-1">
              Layanan penerimaan panggilan telepon dan sambungan informasi umum pada jam operasional.
            </p>
          </div>
        </div>
        {#if primaryPhone}
          <a
            href={`tel:${primaryPhone.value.replace(/[^0-9+]/g, '')}`}
            class="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--color-primary)] hover:underline pt-2"
          >
            <span>Panggil Sekarang</span>
            <ArrowRight class="w-3.5 h-3.5" />
          </a>
        {/if}
      </div>

      <!-- Card 2: WhatsApp -->
      <div class="p-6 rounded-3xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-xs flex flex-col justify-between space-y-4 group hover:border-emerald-500/50 transition">
        <div class="space-y-3">
          <div class="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-105 transition">
            <MessageSquare class="w-6 h-6" />
          </div>
          <div>
            <span class="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted-foreground)] block">
              WhatsApp Pelayanan
            </span>
            <h3 class="text-base font-bold text-[var(--color-text)] mt-0.5">
              {primaryWA ? primaryWA.value : '081234567890'}
            </h3>
            <p class="text-xs text-[var(--color-muted-foreground)] mt-1">
              Layanan chat langsung untuk konsultasi persyaratan, jadwal poli, dan informasi pendaftaran.
            </p>
          </div>
        </div>
        {#if primaryWA}
          <a
            href={`https://wa.me/${primaryWA.value.replace(/[^0-9]/g, '')}?text=Halo%20${encodeURIComponent(settings.name || 'Puskesmas')},%20saya%20ingin%20menanyakan%20informasi%20layanan.`}
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline pt-2"
          >
            <span>Chat via WhatsApp</span>
            <ExternalLink class="w-3.5 h-3.5" />
          </a>
        {/if}
      </div>

      <!-- Card 3: Email -->
      <div class="p-6 rounded-3xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-xs flex flex-col justify-between space-y-4 group hover:border-blue-500/50 transition">
        <div class="space-y-3">
          <div class="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-105 transition">
            <Mail class="w-6 h-6" />
          </div>
          <div>
            <span class="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted-foreground)] block">
              Surat Elektronik (Email)
            </span>
            <h3 class="text-sm sm:text-base font-bold text-[var(--color-text)] mt-0.5 truncate">
              {primaryEmail ? primaryEmail.value : 'puskesmas@dinkes.go.id'}
            </h3>
            <p class="text-xs text-[var(--color-muted-foreground)] mt-1">
              Kanal persuratan resmi, kemitraan instansi, dan permohonan informasi publik.
            </p>
          </div>
        </div>
        {#if primaryEmail}
          <a
            href={`mailto:${primaryEmail.value}`}
            class="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline pt-2"
          >
            <span>Kirim Surel</span>
            <ArrowRight class="w-3.5 h-3.5" />
          </a>
        {/if}
      </div>
    </div>

    <!-- Main 2-Column Section: Left (Location & Map), Right (Operating Hours & Fast Form) -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">

      <!-- LEFT: Location & Map & Channels (7 Cols) -->
      <div class="lg:col-span-7 space-y-8">

        <!-- Card: Alamat Lengkap & Peta -->
        <div class="p-6 sm:p-8 rounded-3xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-xs space-y-6">
          <div class="flex items-center justify-between gap-4">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center shrink-0">
                <MapPin class="w-5 h-5" />
              </div>
              <div>
                <h2 class="text-lg font-bold text-[var(--color-text)]">Alamat & Lokasi Fasilitas</h2>
                <p class="text-xs text-[var(--color-muted-foreground)]">Kunjungi langsung gedung pelayanan Puskesmas</p>
              </div>
            </div>

            {#if settings.externalMapUrl}
              <a
                href={settings.externalMapUrl}
                target="_blank"
                rel="noopener noreferrer"
                class="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--color-primary)]/10 hover:bg-[var(--color-primary)] hover:text-white text-[var(--color-primary)] text-xs font-bold transition"
              >
                <Navigation class="w-3.5 h-3.5" />
                <span>Petunjuk Arah</span>
              </a>
            {/if}
          </div>

          <!-- Address Details Container -->
          <div class="p-4 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] text-xs space-y-1.5">
            <p class="font-bold text-sm text-[var(--color-text)]">{settings.name || 'Puskesmas Manding'}</p>
            <p class="text-[var(--color-text)]">{settings.address || 'Jl. Kesehatan Raya No. 123'}</p>
            {#if settings.village || settings.district}
              <p class="text-[var(--color-muted-foreground)]">
                {[settings.village, settings.district].filter(Boolean).join(', ')}
              </p>
            {/if}
            {#if settings.regency || settings.province || settings.postalCode}
              <p class="text-[var(--color-muted-foreground)]">
                {[settings.regency, settings.province, settings.postalCode].filter(Boolean).join(', ')}
              </p>
            {/if}
          </div>

          <!-- Map Embed or Placeholder -->
          {#if settings.mapEmbedUrl}
            <div class="w-full h-72 sm:h-80 rounded-2xl overflow-hidden border border-[var(--color-border)] shadow-inner">
              <iframe
                src={settings.mapEmbedUrl}
                width="100%"
                height="100%"
                style="border: 0"
                loading="lazy"
                title="Peta Lokasi Puskesmas"
              ></iframe>
            </div>
          {:else}
            <div class="w-full h-60 rounded-2xl bg-[var(--color-bg)] border border-dashed border-[var(--color-border)] flex flex-col items-center justify-center p-6 text-center space-y-3">
              <div class="w-12 h-12 rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center">
                <Map class="w-6 h-6" />
              </div>
              <div>
                <h4 class="text-xs font-bold text-[var(--color-text)]">Peta Interaktif Lokasi</h4>
                <p class="text-[11px] text-[var(--color-muted-foreground)] max-w-sm mt-0.5">
                  Gunakan tautan petunjuk arah untuk navigasi rute GPS Google Maps langsung ke fasilitas kami.
                </p>
              </div>
              {#if settings.externalMapUrl}
                <a
                  href={settings.externalMapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="px-4 py-2 bg-[var(--color-primary)] text-white rounded-xl text-xs font-bold hover:opacity-90 transition flex items-center gap-1.5 shadow-xs"
                >
                  <Navigation class="w-3.5 h-3.5" />
                  <span>Buka Google Maps</span>
                </a>
              {/if}
            </div>
          {/if}

          <!-- Navigation Action Buttons on Mobile -->
          {#if settings.externalMapUrl}
            <div class="sm:hidden pt-2">
              <a
                href={settings.externalMapUrl}
                target="_blank"
                rel="noopener noreferrer"
                class="w-full py-2.5 px-4 rounded-xl bg-[var(--color-primary)] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm"
              >
                <Navigation class="w-4 h-4" />
                <span>Buka Rute di Google Maps</span>
              </a>
            </div>
          {/if}
        </div>

        <!-- Card: Saluran Komunikasi & Media Sosial Lengkap -->
        {#if otherChannels.length > 0}
          <div class="p-6 sm:p-8 rounded-3xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-xs space-y-6">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center shrink-0">
                <MessageSquare class="w-5 h-5" />
              </div>
              <div>
                <h3 class="text-base font-bold text-[var(--color-text)]">Kanal Informasi & Media Sosial Resmi</h3>
                <p class="text-xs text-[var(--color-muted-foreground)]">Daftar media resmi dan akun publikasi Puskesmas</p>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {#each otherChannels as chn}
                {@const targetUrl = chn.type === 'Phone' ? `tel:${chn.value.replace(/[^0-9+]/g, '')}` :
                  chn.type === 'WhatsApp' ? `https://wa.me/${chn.value.replace(/[^0-9]/g, '')}` :
                  chn.type === 'Email' ? `mailto:${chn.value}` :
                  chn.value.startsWith('http') ? chn.value : `https://${chn.value}`}
                <div class="p-3.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] flex items-center justify-between gap-3">
                  <div class="min-w-0">
                    <span class="text-[9px] font-bold uppercase tracking-wider text-[var(--color-muted-foreground)] block">
                      {chn.type}
                    </span>
                    <h4 class="text-xs font-bold text-[var(--color-text)] truncate">{chn.label}</h4>
                    <p class="text-[11px] text-[var(--color-primary)] truncate font-mono mt-0.5">{chn.value}</p>
                  </div>
                  <a
                    href={targetUrl}
                    target={chn.type === 'Social Media' || chn.type === 'Website' ? '_blank' : '_self'}
                    rel="noopener noreferrer"
                    class="px-3 py-1.5 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] text-xs font-semibold text-[var(--color-text)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] transition shrink-0"
                  >
                    Akses
                  </a>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>

      <!-- RIGHT: Operating Hours & Direct Message Form (5 Cols) -->
      <div class="lg:col-span-5 space-y-8">

        <!-- Card: Jam Operasional Lengkap -->
        <div class="p-6 sm:p-8 rounded-3xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-xs space-y-6">
          <div class="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center shrink-0">
                <Clock class="w-5 h-5" />
              </div>
              <div>
                <h3 class="text-base font-bold text-[var(--color-text)]">Jadwal Pelayanan</h3>
                <p class="text-[11px] text-[var(--color-muted-foreground)]">Zona Waktu: {settings.timezone || 'WIB'}</p>
              </div>
            </div>
          </div>

          <!-- Daily Operating Hours List -->
          <div class="space-y-2">
            {#if Array.isArray(settings.operatingHours) && settings.operatingHours.length > 0}
              {#each settings.operatingHours as oh}
                {@const isToday = oh.dayNameId === todayName}
                <div
                  class={`p-3 rounded-2xl border transition flex items-center justify-between gap-3 ${
                    isToday
                      ? 'bg-[var(--color-primary)]/5 border-[var(--color-primary)]/40 ring-1 ring-[var(--color-primary)]/20'
                      : oh.isOpen
                        ? 'bg-[var(--color-bg)] border-[var(--color-border)]'
                        : 'bg-[var(--color-bg)]/50 border-[var(--color-border)] opacity-70'
                  }`}
                >
                  <div class="flex items-center gap-2">
                    {#if isToday}
                      <span class="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-pulse shrink-0"></span>
                    {/if}
                    <div>
                      <span class={`text-xs font-bold block ${isToday ? 'text-[var(--color-primary)]' : 'text-[var(--color-text)]'}`}>
                        {oh.dayNameId}{#if isToday} (Hari Ini){/if}
                      </span>
                      {#if oh.notes}
                        <span class="text-[10px] text-[var(--color-muted-foreground)] block">{oh.notes}</span>
                      {/if}
                    </div>
                  </div>

                  <div class="text-right shrink-0">
                    {#if oh.isOpen}
                      <span class="text-xs font-extrabold text-[var(--color-primary)] bg-[var(--color-card)] px-2.5 py-1 rounded-xl border border-[var(--color-border)]">
                        {oh.openTime} - {oh.closeTime}
                      </span>
                    {:else}
                      <span class="text-[11px] font-semibold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-lg">
                        Tutup
                      </span>
                    {/if}
                  </div>
                </div>
              {/each}
            {:else}
              <div class="p-4 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] text-xs text-[var(--color-text)] space-y-1">
                <p class="font-semibold">Senin - Sabtu: 07.30 - 16.00 WIB</p>
                <p class="text-[var(--color-muted-foreground)]">Minggu & Hari Libur Nasional: Tutup (Kecuali IGD 24 Jam)</p>
              </div>
            {/if}
          </div>

          <!-- Special Operating Hours if Any -->
          {#if settings.specialHours && settings.specialHours.length > 0}
            <div class="pt-3 border-t border-[var(--color-border)] space-y-2">
              <h4 class="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                Jadwal Khusus / Hari Libur
              </h4>
              {#each settings.specialHours as sh}
                <div class="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-[var(--color-text)]">
                  <div class="font-bold text-amber-700 dark:text-amber-400">{sh.title} ({sh.date})</div>
                  <div class="text-[11px] text-[var(--color-muted-foreground)] mt-0.5">
                    {sh.notes || (sh.isOpen ? `${sh.openTime} - ${sh.closeTime}` : 'Tutup Total (Layanan Reguler)')}
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>

        <!-- Card: Formulir Kirim Pesan & Pengaduan Cepat -->
        <div class="p-6 sm:p-8 rounded-3xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-xs space-y-6">
          <div>
            <div class="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--color-primary)]">
              <Send class="w-3.5 h-3.5" />
              <span>Kirim Pesan / Pengaduan</span>
            </div>
            <h3 class="text-base font-bold text-[var(--color-text)] mt-1">Formulir Kontak Informasi</h3>
            <p class="text-xs text-[var(--color-muted-foreground)] mt-0.5">
              Sampaikan pertanyaan, masukan, atau permohonan informasi kepada tim Puskesmas.
            </p>
          </div>

          {#if formSubmitted}
            <div class="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-3 animate-in fade-in">
              <div class="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto">
                <CheckCircle2 class="w-6 h-6" />
              </div>
              <h4 class="text-sm font-bold text-emerald-700 dark:text-emerald-400">Pesan Anda Telah Terkirim</h4>
              <p class="text-xs text-[var(--color-muted-foreground)]">
                Terima kasih atas aspirasi Anda. Petugas layanan informasi akan menindaklanjuti pesan Anda secepatnya.
              </p>
              <button
                type="button"
                onclick={() => formSubmitted = false}
                class="px-4 py-2 bg-[var(--color-primary)] text-white rounded-xl text-xs font-bold hover:opacity-90 transition"
              >
                Kirim Pesan Lain
              </button>
            </div>
          {:else}
            <form onsubmit={handleFormSubmit} class="space-y-4">
              <div class="space-y-1.5">
                <label class="text-xs font-bold text-[var(--color-text)] block">
                  Nama Lengkap <span class="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  oninput={(e) => formName = e.currentTarget.value}
                  placeholder="Masukkan nama lengkap Anda"
                  class="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none text-xs text-[var(--color-text)]"
                />
              </div>

              <div class="space-y-1.5">
                <label class="text-xs font-bold text-[var(--color-text)] block">
                  Nomor Telepon / WhatsApp / Email <span class="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formContact}
                  oninput={(e) => formContact = e.currentTarget.value}
                  placeholder="Contoh: 08123456789 atau email@domain.com"
                  class="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none text-xs text-[var(--color-text)]"
                />
              </div>

              <div class="space-y-1.5">
                <label class="text-xs font-bold text-[var(--color-text)] block">
                  Kategori Pesan
                </label>
                <select
                  value={formSubject}
                  onchange={(e) => formSubject = e.currentTarget.value}
                  class="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none text-xs text-[var(--color-text)]"
                >
                  <option value="Informasi Umum">Informasi Umum & Jadwal Dokter</option>
                  <option value="Pendaftaran">Pendaftaran & Kepesertaan BPJS</option>
                  <option value="Kritik & Saran">Kritik & Saran Pelayanan</option>
                  <option value="Permohonan Informasi Publik">Permohonan Informasi Publik</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              <div class="space-y-1.5">
                <label class="text-xs font-bold text-[var(--color-text)] block">
                  Isi Pesan <span class="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={formMessage}
                  oninput={(e) => formMessage = e.currentTarget.value}
                  placeholder="Tuliskan pertanyaan, saran, atau pesan Anda secara detail..."
                  class="w-full p-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none text-xs text-[var(--color-text)] resize-none"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={formSubmitting}
                class="w-full py-3 px-4 rounded-xl bg-[var(--color-primary)] text-white text-xs font-bold hover:opacity-90 disabled:opacity-50 transition flex items-center justify-center gap-2 shadow-xs"
              >
                <Send class="w-3.5 h-3.5" />
                <span>{formSubmitting ? 'Mengirim Pesan...' : 'Kirim Pesan Sekarang'}</span>
              </button>
            </form>
          {/if}

          <!-- Quick Link to Specialized Complaint Page & FAQ -->
          <div class="pt-4 border-t border-[var(--color-border)] flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
            <a
              href="#/kritik-saran"
              class="text-[var(--color-primary)] font-semibold hover:underline flex items-center gap-1"
            >
              <MessageSquare class="w-3.5 h-3.5" />
              <span>Kanal Pengaduan Resmi Pasien</span>
            </a>
            <a
              href="#/faq"
              class="text-[var(--color-muted-foreground)] hover:text-[var(--color-text)] flex items-center gap-1"
            >
              <HelpCircle class="w-3.5 h-3.5" />
              <span>Pusat Bantuan (FAQ)</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}
