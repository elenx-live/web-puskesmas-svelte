<!-- @component Halaman Pendaftaran Layanan Kesehatan mandiri online — pilih layanan & tanggal (divalidasi jadwal), isi data pasien, kirim pendaftaran. -->
<script lang="ts">
  import { untrack } from 'svelte';
  import { routerState } from '../../app/router.svelte.js';
  import Card from '../../shared/ui/Card.svelte';
  import Badge from '../../shared/ui/Badge.svelte';
  import { registrationService } from '../../shared/services/registrationService.js';
  import { toastStore } from '../../shared/stores/toast.svelte.js';
  import { serviceEngineService } from '../../shared/services/serviceEngineService.js';
  import type {
    ServiceEntity,
    ServiceRegistrationEntity,
    ServiceScheduleEntity,
    ServiceScheduleExceptionEntity,
  } from '../../shared/types/index.js';
  import {
    Calendar, User, CreditCard, Phone, FileText, CheckCircle,
    Copy, AlertCircle, Clock, MapPin, Building, ArrowRight, RefreshCw, Eye,
    ShieldCheck,
  } from 'lucide-svelte';

  let services = $state<ServiceEntity[]>([]);
  let selectedService = $state<ServiceEntity | null>(null);

  // Schedule state for selected service
  let schedule = $state<ServiceScheduleEntity | null>(null);
  let exceptions = $state<ServiceScheduleExceptionEntity[]>([]);

  // Form Fields
  let serviceId = $state('');
  let fullName = $state('');
  let identityNumber = $state('');
  let dateOfBirth = $state('');
  let gender = $state<'L' | 'P'>('L');
  let phoneNumber = $state('');
  let whatsappConsent = $state(true);
  let visitDate = $state('');
  let notes = $state('');

  // UI state
  let loading = $state(false);
  let isSubmitting = $state(false);
  let errorMessage = $state('');
  let scheduleError = $state('');
  let submittedData = $state<ServiceRegistrationEntity | null>(null);
  let copied = $state(false);

  // Muat daftar layanan (hanya yang mengaktifkan pendaftaran online)
  $effect(() => {
    loading = true;
    serviceEngineService
      .getPublishedServices()
      .then((list) => {
        const activeRegServices = list.filter((s) => s.onlineRegistrationEnabled && s.status === 'published');
        services = activeRegServices;
      })
      .catch((err) => console.error(err))
      .finally(() => {
        loading = false;
      });
  });

  // Terapkan serviceId dari query string bila cocok
  $effect(() => {
    const queryServiceId = routerState.query.serviceId;
    const svcList = services;
    if (queryServiceId && svcList.length > 0) {
      const matched = svcList.find((s) => s.id === queryServiceId);
      if (matched && serviceId !== queryServiceId) {
        serviceId = queryServiceId;
        selectedService = matched;
      }
    }
  });

  // Fetch schedule and exceptions when service selection changes
  $effect(() => {
    const sid = serviceId;
    const svcList = services;
    if (!sid) {
      selectedService = null;
      schedule = null;
      exceptions = [];
      scheduleError = '';
      return;
    }

    const matched = svcList.find((s) => s.id === sid);
    if (matched) {
      selectedService = matched;

      Promise.all([
        serviceEngineService.getServiceSchedule(matched.id),
        serviceEngineService.getScheduleExceptionsByServiceId(matched.id),
      ])
        .then(([sch, excs]) => {
          schedule = sch;
          exceptions = excs;

          // Re-validate if date was already chosen
          if (visitDate) {
            untrack(() => validateDate(visitDate, sch, excs));
          }
        })
        .catch((err) => console.error('Failed to load schedule:', err));
    }
  });

  // Validate chosen date
  function validateDate(
    dateStr: string,
    currentSchedule: ServiceScheduleEntity | null,
    currentExceptions: ServiceScheduleExceptionEntity[],
  ) {
    scheduleError = '';
    if (!dateStr) return;

    // 1. past date check
    const todayStr = new Date().toISOString().split('T')[0];
    if (dateStr < todayStr) {
      scheduleError = 'Tanggal kunjungan tidak boleh di masa lampau.';
      return;
    }

    // 2. day of week check
    const dateObj = new Date(dateStr);
    const days: ('sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday')[] = [
      'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday',
    ];
    const dayName = days[dateObj.getDay()];

    // 3. exceptions check
    const activeException = currentExceptions.find((e) => e.status !== 'archived' && e.date === dateStr);
    if (activeException) {
      if (activeException.type === 'closed' || !activeException.isOpen) {
        scheduleError = `Tutup: ${activeException.reason || 'Sebab Khusus / Hari Libur'}`;
        return;
      }
    } else {
      // Regular weekly check
      const rule = currentSchedule?.rules?.find((r) => r.dayOfWeek === dayName);
      if (!rule || !rule.isOpen || rule.status === 'inactive') {
        const indonesianDays = {
          sunday: 'Minggu',
          monday: 'Senin',
          tuesday: 'Selasa',
          wednesday: 'Rabu',
          thursday: 'Kamis',
          friday: 'Jumat',
          saturday: 'Sabtu',
        };
        scheduleError = `Layanan ini tidak beroperasi pada hari ${indonesianDays[dayName]}.`;
      }
    }
  }

  function handleDateChange(e: Event) {
    const val = (e.currentTarget as HTMLInputElement).value;
    visitDate = val;
    validateDate(val, schedule, exceptions);
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    errorMessage = '';

    if (!serviceId) {
      errorMessage = 'Silakan pilih layanan kesehatan.';
      return;
    }

    if (!visitDate) {
      errorMessage = 'Silakan pilih tanggal kunjungan.';
      return;
    }

    if (scheduleError) {
      errorMessage = `Jadwal tidak valid: ${scheduleError}`;
      return;
    }

    if (!fullName.trim()) {
      errorMessage = 'Nama lengkap wajib diisi.';
      return;
    }

    if (!identityNumber.trim() || identityNumber.trim().length < 10) {
      errorMessage = 'Nomor Identitas (NIK) wajib diisi dengan benar (min. 10 digit).';
      return;
    }

    if (!phoneNumber.trim() || phoneNumber.trim().length < 9) {
      errorMessage = 'Nomor HP aktif wajib diisi dengan benar.';
      return;
    }

    if (!dateOfBirth) {
      errorMessage = 'Tanggal lahir wajib diisi.';
      return;
    }

    isSubmitting = true;

    try {
      const payload = {
        fullName: fullName.trim(),
        identityNumber: identityNumber.trim(),
        dateOfBirth,
        gender,
        phoneNumber: phoneNumber.trim(),
        whatsappConsent,
        serviceId,
        serviceName: selectedService?.name || '',
        visitDate,
        notes: notes.trim(),
      };

      const res = await registrationService.createRegistration(payload);
      submittedData = res;
      toastStore.success('Pendaftaran berhasil dikirim. Simpan kode pendaftaran Anda.');
    } catch (err) {
      errorMessage = (err as Error).message || 'Gagal mengirim pendaftaran online. Silakan periksa kembali data Anda.';
      toastStore.error(errorMessage);
    } finally {
      isSubmitting = false;
    }
  }

  function handleCopyRegNumber(num: string) {
    navigator.clipboard.writeText(num);
    copied = true;
    setTimeout(() => {
      copied = false;
    }, 2000);
  }

  function handleReset() {
    submittedData = null;
    fullName = '';
    identityNumber = '';
    dateOfBirth = '';
    phoneNumber = '';
    visitDate = '';
    notes = '';
    gender = 'L';
    serviceId = '';
    scheduleError = '';
    errorMessage = '';
  }
</script>

<div class="py-12 px-4 sm:px-6 max-w-4xl mx-auto space-y-8">

  <!-- Banner Section -->
  <div class="space-y-2 text-center">
    <div class="flex justify-center">
      <Badge variant="amber">PENDAFTARAN MANDIRI ONLINE</Badge>
    </div>
    <h1 class="text-3xl sm:text-4xl font-light text-[var(--color-text)] tracking-tight">
      Pendaftaran Layanan Kesehatan
    </h1>
    <p class="text-sm text-[var(--color-muted-foreground)] max-w-lg mx-auto">
      Gunakan form online ini untuk mendaftarkan jadwal kunjungan Anda ke Puskesmas secara praktis.
    </p>
  </div>

  {#if submittedData}
    <!-- SUCCESS CONFIRMATION COMPONENT -->
    <div class="space-y-6">
      <div class="bg-[var(--color-card)] border border-[var(--color-primary)]/30 rounded-3xl p-6 sm:p-8 text-center space-y-4">
        <div class="w-16 h-16 rounded-full bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-center text-[var(--color-primary)] mx-auto">
          <CheckCircle class="w-10 h-10" />
        </div>
        <div class="space-y-1">
          <h2 class="text-xl sm:text-2xl font-bold text-[var(--color-text)]">Pendaftaran Berhasil Dikirim!</h2>
          <p class="text-xs text-[var(--color-muted-foreground)]">Silakan simpan nomor pendaftaran di bawah ini untuk pemeriksaan status.</p>
        </div>

        <!-- Unique Number Callout -->
        <div class="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl p-4 max-w-md mx-auto flex items-center justify-between">
          <div class="text-left space-y-0.5">
            <span class="text-[10px] uppercase font-mono tracking-wider text-[var(--color-muted-foreground)] block">Nomor Pendaftaran</span>
            <span class="text-lg sm:text-xl font-bold text-[var(--color-primary)] tracking-wider font-mono">
              {submittedData.registrationNumber}
            </span>
          </div>
          <button
            onclick={() => handleCopyRegNumber(submittedData.registrationNumber)}
            class="px-3.5 py-2 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition text-xs font-bold flex items-center gap-1 text-[var(--color-text)]"
          >
            <Copy class="w-3.5 h-3.5" />
            <span>{copied ? 'Tersalin' : 'Salin'}</span>
          </button>
        </div>

        <div class="border-t border-[var(--color-border)] pt-4 max-w-md mx-auto grid grid-cols-2 gap-4 text-left text-xs">
          <div>
            <span class="text-[var(--color-muted-foreground)] block">Layanan Terpilih</span>
            <span class="text-[var(--color-text)] font-bold">{submittedData.serviceName}</span>
          </div>
          <div>
            <span class="text-[var(--color-muted-foreground)] block">Tanggal Kunjungan</span>
            <span class="text-[var(--color-text)] font-bold">{submittedData.visitDate}</span>
          </div>
          <div>
            <span class="text-[var(--color-muted-foreground)] block">Nama Pasien</span>
            <span class="text-[var(--color-text)] font-bold">{submittedData.fullName}</span>
          </div>
          <div>
            <span class="text-[var(--color-muted-foreground)] block">Status Registrasi</span>
            <span class="text-[var(--color-primary)] font-bold flex items-center gap-1 mt-0.5">
              <Clock class="w-3.5 h-3.5 shrink-0" />
              <span>Menunggu Konfirmasi</span>
            </span>
          </div>
        </div>
      </div>

      <div class="flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          onclick={handleReset}
          class="w-full sm:w-auto px-5 py-2.5 bg-[var(--color-card)] border border-[var(--color-border)] hover:border-zinc-400 transition rounded-xl text-xs font-bold text-[var(--color-text)] flex items-center justify-center gap-1.5"
        >
          <RefreshCw class="w-4 h-4" />
          <span>Buat Pendaftaran Baru</span>
        </button>
        <a
          href={`#/pendaftaran/cek?reg=${submittedData.registrationNumber}`}
          class="w-full sm:w-auto px-5 py-2.5 bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary)] transition rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
        >
          <Eye class="w-4 h-4" />
          <span>Cek Status Pendaftaran</span>
        </a>
      </div>
    </div>
  {:else}
    <!-- REGISTRATION FORM COMPONENT -->
    <Card class="p-6 sm:p-8 space-y-6">
      <form onsubmit={handleSubmit} class="space-y-6">

        {#if errorMessage}
          <div class="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex gap-3 text-xs text-rose-400">
            <AlertCircle class="w-5 h-5 shrink-0" />
            <div class="space-y-0.5">
              <span class="font-bold">Terjadi Kesalahan</span>
              <p>{errorMessage}</p>
            </div>
          </div>
        {/if}

        <!-- FLOW SECTION 1: PILIH LAYANAN -->
        <div class="space-y-3">
          <div class="flex items-center gap-2">
            <div class="w-6 h-6 rounded-lg bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 text-[var(--color-primary)] flex items-center justify-center text-xs font-bold">
              1
            </div>
            <h3 class="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider">Pilih Layanan & Tanggal</h3>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Service Dropdown -->
            <div class="space-y-1">
              <label class="text-[var(--color-muted-foreground)] text-xs font-medium">Layanan Medis <span class="text-rose-500">*</span></label>
              <select aria-label="Layanan Medis"
                value={serviceId}
                onchange={(e) => { serviceId = (e.currentTarget as HTMLSelectElement).value; }}
                class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-3 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] text-xs transition-colors"
                required
              >
                <option value="">-- Pilih Layanan --</option>
                {#each services as s (s.id)}
                  <option value={s.id}>{s.name}</option>
                {/each}
              </select>
            </div>

            <!-- Visit Date -->
            <div class="space-y-1">
              <label class="text-[var(--color-muted-foreground)] text-xs font-medium">Tanggal Kunjungan <span class="text-rose-500">*</span></label>
              <div class="relative">
                <input aria-label="Tanggal Kunjungan"
                  type="date"
                  value={visitDate}
                  onchange={handleDateChange}
                  disabled={!serviceId}
                  class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-3 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  required
                />
              </div>
              {#if scheduleError}
                <span class="text-[11px] font-bold text-rose-400 block mt-1 flex items-center gap-1">
                  <AlertCircle class="w-3.5 h-3.5" />
                  <span>{scheduleError}</span>
                </span>
              {:else if visitDate}
                <span class="text-[11px] font-bold text-[var(--color-primary)] block mt-1 flex items-center gap-1">
                  <CheckCircle class="w-3.5 h-3.5" />
                  <span>Jadwal tersedia untuk pelayanan.</span>
                </span>
              {/if}
            </div>
          </div>

          <!-- Show short metadata card for selected service -->
          {#if selectedService}
            <div class="bg-[var(--color-bg)] border border-[var(--color-border)] p-4 rounded-2xl grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div class="flex items-center gap-2">
                <Building class="w-4 h-4 text-[var(--color-primary)] shrink-0" />
                <div>
                  <span class="text-[var(--color-muted-foreground)] text-[10px] block">Unit Pelayanan</span>
                  <span class="text-[var(--color-text)] font-medium">{selectedService.unitName || 'Poli Umum'}</span>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <MapPin class="w-4 h-4 text-sky-400 shrink-0" />
                <div>
                  <span class="text-[var(--color-muted-foreground)] text-[10px] block">Lokasi Layanan</span>
                  <span class="text-[var(--color-text)] font-medium">{selectedService.locationName || 'Gedung Utama'}</span>
                </div>
              </div>
            </div>
          {/if}
        </div>

        <!-- FLOW SECTION 2: DATA PENDAFTAR -->
        <div class="space-y-3 pt-4 border-t border-[var(--color-border)]/80">
          <div class="flex items-center gap-2">
            <div class="w-6 h-6 rounded-lg bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 text-[var(--color-primary)] flex items-center justify-center text-xs font-bold">
              2
            </div>
            <h3 class="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider">Data Diri Calon Pasien</h3>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Full Name -->
            <div class="space-y-1">
              <label class="text-[var(--color-muted-foreground)] text-xs font-medium">Nama Lengkap Pasien <span class="text-rose-500">*</span></label>
              <div class="relative flex items-center">
                <User class="absolute left-3 w-4 h-4 text-[var(--color-muted-foreground)]" />
                <input aria-label="Nama Lengkap Pasien"
                  type="text"
                  value={fullName}
                  onchange={(e) => { fullName = (e.currentTarget as HTMLInputElement).value; }}
                  placeholder="Sesuai KTP / KK"
                  class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl pl-9 pr-3 py-3 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] text-xs transition-colors"
                  required
                />
              </div>
            </div>

            <!-- Identity Card (NIK) -->
            <div class="space-y-1">
              <label class="text-[var(--color-muted-foreground)] text-xs font-medium">Nomor Identitas (NIK KTP / KIA) <span class="text-rose-500">*</span></label>
              <div class="relative flex items-center">
                <CreditCard class="absolute left-3 w-4 h-4 text-[var(--color-muted-foreground)]" />
                <input aria-label="Nomor Identitas (NIK KTP / KIA)"
                  type="text"
                  value={identityNumber}
                  onchange={(e) => { identityNumber = (e.currentTarget as HTMLInputElement).value.replace(/[^0-9]/g, ''); }}
                  placeholder="16 digit angka NIK"
                  maxlength={16}
                  class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl pl-9 pr-3 py-3 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] text-xs transition-colors"
                  required
                />
              </div>
            </div>

            <!-- DOB -->
            <div class="space-y-1">
              <label class="text-[var(--color-muted-foreground)] text-xs font-medium">Tanggal Lahir <span class="text-rose-500">*</span></label>
              <input aria-label="Tanggal Lahir"
                type="date"
                value={dateOfBirth}
                onchange={(e) => { dateOfBirth = (e.currentTarget as HTMLInputElement).value; }}
                class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-3 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] text-xs transition-colors"
                required
              />
            </div>

            <!-- Gender -->
            <div class="space-y-1">
              <label class="text-[var(--color-muted-foreground)] text-xs font-medium">Jenis Kelamin <span class="text-rose-500">*</span></label>
              <select aria-label="Jenis Kelamin"
                value={gender}
                onchange={(e) => { gender = (e.currentTarget as HTMLSelectElement).value as 'L' | 'P'; }}
                class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-3 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] text-xs transition-colors"
                required
              >
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </select>
            </div>

            <!-- Active Phone Number -->
            <div class="space-y-1">
              <label class="text-[var(--color-muted-foreground)] text-xs font-medium">Nomor HP Aktif (WhatsApp) <span class="text-rose-500">*</span></label>
              <div class="relative flex items-center">
                <Phone class="absolute left-3 w-4 h-4 text-[var(--color-muted-foreground)]" />
                <input aria-label="Nomor HP Aktif (WhatsApp)"
                  type="tel"
                  value={phoneNumber}
                  onchange={(e) => { phoneNumber = (e.currentTarget as HTMLInputElement).value.replace(/[^0-9+]/g, ''); }}
                  placeholder="Contoh: 081234567890"
                  class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl pl-9 pr-3 py-3 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] text-xs transition-colors"
                  required
                />
              </div>
            </div>

            <!-- WhatsApp Consent -->
            <div class="flex items-start gap-2.5 pt-1 pb-1">
              <input
                type="checkbox"
                id="whatsappConsent"
                checked={whatsappConsent}
                onchange={(e) => { whatsappConsent = (e.currentTarget as HTMLInputElement).checked; }}
                class="mt-0.5 h-4 w-4 rounded border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] focus:ring-offset-[var(--color-bg)] transition-colors cursor-pointer"
              />
              <label for="whatsappConsent" class="text-[var(--color-muted-foreground)] text-xs leading-normal select-none cursor-pointer hover:text-[var(--color-text)] transition-colors">
                Saya bersedia menerima informasi penting & status antrean melalui WhatsApp.
              </label>
            </div>

            <!-- Short Notes -->
            <div class="space-y-1">
              <label class="text-[var(--color-muted-foreground)] text-xs font-medium">Catatan / Keterangan Kunjungan (Opsional)</label>
              <div class="relative flex items-center">
                <FileText class="absolute left-3 w-4 h-4 text-[var(--color-muted-foreground)]" />
                <input aria-label="Catatan / Keterangan Kunjungan (Opsional)"
                  type="text"
                  value={notes}
                  onchange={(e) => { notes = (e.currentTarget as HTMLInputElement).value; }}
                  placeholder="Keluhan singkat atau alasan kedatangan..."
                  class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl pl-9 pr-3 py-3 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] text-xs transition-colors"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- SUBMIT ROW -->
        <div class="pt-6 border-t border-[var(--color-border)]/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span class="text-[11px] text-[var(--color-muted-foreground)] max-w-sm flex items-center gap-1.5 leading-snug">
            <ShieldCheck class="w-5 h-5 text-[var(--color-primary)] shrink-0" />
            <span>
              <strong>Pernyataan Privasi:</strong> Data yang Anda kirimkan terenkripsi secara lokal dan hanya digunakan demi kelancaran penjadwalan administrasi di Puskesmas.
            </span>
          </span>

          <button
            type="submit"
            disabled={isSubmitting || !!scheduleError}
            class="w-full sm:w-auto px-6 py-3 bg-[var(--color-primary)] text-[var(--color-primary-foreground)] font-bold hover:bg-[var(--color-primary)] active:scale-98 transition rounded-xl text-xs flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {#if isSubmitting}
              <Clock class="w-4 h-4 animate-spin" />
              <span>Mengirim...</span>
            {:else}
              <span>Kirim Pendaftaran</span>
              <ArrowRight class="w-4 h-4" />
            {/if}
          </button>
        </div>

      </form>
    </Card>
  {/if}

  <!-- STATUS TRACKING PROMO FOOTER CARD -->
  <div class="bg-[var(--color-card)] border border-[var(--color-border)] p-5 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
    <div class="space-y-1">
      <span class="font-bold text-[var(--color-text)] block">Sudah Pernah Mendaftar?</span>
      <p class="text-[var(--color-muted-foreground)] leading-snug">Gunakan kode pendaftaran Anda untuk memantau status atau membatalkan registrasi.</p>
    </div>
    <a
      href="#/pendaftaran/cek"
      class="w-full sm:w-auto px-4 py-2.5 bg-[var(--color-bg)] border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] text-[var(--color-text)] font-bold transition text-center rounded-xl whitespace-nowrap"
    >
      Cek Status Pendaftaran →
    </a>
  </div>

</div>
