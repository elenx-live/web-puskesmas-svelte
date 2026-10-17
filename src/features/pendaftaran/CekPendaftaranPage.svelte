<!-- @component Halaman verifikasi status pendaftaran — cari dengan kode registrasi, lihat detail, dan batalkan pendaftaran mandiri. -->
<script lang="ts">
  import { routerState } from '../../app/router.svelte.js';
  import Card from '../../shared/ui/Card.svelte';
  import Badge from '../../shared/ui/Badge.svelte';
  import { registrationService } from '../../shared/services/registrationService.js';
  import type { ServiceRegistrationEntity } from '../../shared/types/index.js';
  import {
    Search, Calendar, User, Clock, CheckCircle, XCircle, AlertCircle,
    Trash2, Copy, ArrowLeft, RefreshCw, MessageSquare,
  } from 'lucide-svelte';

  let searchCode = $state('');
  let loading = $state(false);
  let registration = $state<ServiceRegistrationEntity | null>(null);
  let errorMessage = $state('');
  let successMessage = $state('');

  // UI Actions
  let copied = $state(false);
  let isCancelling = $state(false);

  // Auto search if registration code is in URL query (?reg=...)
  $effect(() => {
    const regParam = routerState.query.reg;
    if (regParam) {
      searchCode = regParam;
      void handleSearch(regParam);
    }
  });

  async function handleSearch(code: string) {
    const targetCode = code.trim();
    if (!targetCode) return;

    loading = true;
    errorMessage = '';
    successMessage = '';
    registration = null;

    try {
      const res = await registrationService.getRegistrationByNumber(targetCode);
      if (res) {
        registration = res;
      } else {
        errorMessage = 'Data pendaftaran tidak ditemukan. Silakan periksa kembali kode Anda.';
      }
    } catch (err) {
      errorMessage = (err as Error).message || 'Gagal mencari data pendaftaran.';
    } finally {
      loading = false;
    }
  }

  function handleFormSubmit(e: SubmitEvent) {
    e.preventDefault();
    void handleSearch(searchCode);
  }

  async function handleCancelRegistration() {
    if (!registration) return;
    if (!window.confirm('Apakah Anda yakin ingin membatalkan permohonan pendaftaran ini?')) return;

    isCancelling = true;
    errorMessage = '';
    successMessage = '';

    try {
      const patientActor = {
        id: 'patient-mandiri',
        email: registration.phoneNumber,
        name: `Pasien: ${registration.fullName}`,
      };
      const updated = await registrationService.updateStatus(
        registration.id,
        'cancelled',
        patientActor,
        'Dibatalkan secara mandiri oleh warga/pasien.',
      );
      registration = updated;
      successMessage = 'Pendaftaran telah berhasil dibatalkan oleh pasien.';
    } catch (err) {
      errorMessage = (err as Error).message || 'Gagal membatalkan pendaftaran.';
    } finally {
      isCancelling = false;
    }
  }

  function handleCopyCode(num: string) {
    navigator.clipboard.writeText(num);
    copied = true;
    setTimeout(() => {
      copied = false;
    }, 2000);
  }
</script>

<div class="py-12 px-4 sm:px-6 max-w-3xl mx-auto space-y-8">

  <!-- Breadcrumb / Back button -->
  <div>
    <a
      href="#/layanan"
      class="inline-flex items-center gap-2 text-xs font-medium text-[var(--color-primary)] hover:text-[var(--color-primary)] transition bg-[var(--color-primary)]/10 px-3 py-1.5 rounded-xl border border-[var(--color-primary)]/20"
    >
      <ArrowLeft class="w-3.5 h-3.5" />
      <span>Kembali ke Layanan</span>
    </a>
  </div>

  <!-- Title block -->
  <div class="space-y-2 text-center">
    <h1 class="text-2xl sm:text-3xl font-light text-[var(--color-text)] tracking-tight">
      Verifikasi Status Pendaftaran
    </h1>
    <p class="text-xs sm:text-sm text-[var(--color-muted-foreground)] max-w-lg mx-auto">
      Masukkan kode registrasi kunjungan (contoh: REG-2026-XXXXXX) untuk memantau status persetujuan poli klinis.
    </p>
  </div>

  <!-- Search input Form -->
  <Card class="p-5 sm:p-6 bg-[var(--color-card)] border border-[var(--color-border)]">
    <form onsubmit={handleFormSubmit} class="space-y-4">
      <div class="space-y-2">
        <label class="text-[var(--color-text)] text-xs font-bold uppercase tracking-wider block">Nomor Pendaftaran Online</label>
        <div class="flex flex-col sm:flex-row gap-3">
          <div class="relative flex-1 flex items-center">
            <Search class="absolute left-3.5 w-4 h-4 text-[var(--color-muted-foreground)]" />
            <input
              type="text"
              placeholder="REG-2026-000001"
              value={searchCode}
              oninput={(e) => { searchCode = (e.currentTarget as HTMLInputElement).value.toUpperCase().trim(); }}
              class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl pl-10 pr-4 py-3 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] font-mono tracking-wider text-xs transition-colors"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            class="px-6 py-3 bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary)] font-bold active:scale-98 transition rounded-xl text-xs flex items-center justify-center gap-2"
          >
            {#if loading}
              <RefreshCw class="w-4 h-4 animate-spin" />
              <span>Memproses...</span>
            {:else}
              <Search class="w-4 h-4" />
              <span>Cek Status</span>
            {/if}
          </button>
        </div>
      </div>
    </form>
  </Card>

  <!-- Alerts for feedback -->
  {#if errorMessage}
    <div class="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex gap-3 text-xs text-rose-400 animate-fadeIn">
      <AlertCircle class="w-5 h-5 shrink-0" />
      <p class="font-medium">{errorMessage}</p>
    </div>
  {/if}

  {#if successMessage}
    <div class="p-4 bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 rounded-2xl flex gap-3 text-xs text-[var(--color-primary)] animate-fadeIn">
      <CheckCircle class="w-5 h-5 shrink-0" />
      <p class="font-medium">{successMessage}</p>
    </div>
  {/if}

  <!-- REGISTRATION DETAIL BLOCK -->
  {#if registration}
    <Card class="p-6 space-y-6 border-[var(--color-border)] bg-[var(--color-card)] animate-fadeIn">

      <!-- Header: Code & Status -->
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-5">
        <div class="space-y-1">
          <span class="text-[10px] uppercase font-mono tracking-wider text-[var(--color-muted-foreground)] block">Identitas Pendaftaran</span>
          <div class="flex items-center gap-2">
            <span class="text-base font-bold text-[var(--color-text)] font-mono tracking-wide">{registration.registrationNumber}</span>
            <button
              onclick={() => handleCopyCode(registration.registrationNumber)}
              class="p-1 rounded bg-[var(--color-bg)] hover:bg-[var(--color-surface)] transition text-[var(--color-muted-foreground)]"
              title="Salin Nomor"
            >
              <Copy class="w-3.5 h-3.5" />
            </button>
            {#if copied}<span class="text-[10px] text-[var(--color-primary)] font-medium font-mono">Tersalin</span>{/if}
          </div>
        </div>
        <div class="space-y-1 sm:text-right">
          <span class="text-[10px] uppercase font-mono tracking-wider text-[var(--color-muted-foreground)] block">Status Persetujuan</span>
          {#if registration.status === 'waiting'}
            <Badge variant="amber">
              <Clock class="w-3.5 h-3.5 mr-1" />
              Menunggu Konfirmasi
            </Badge>
          {:else if registration.status === 'confirmed'}
            <Badge variant="emerald">
              <CheckCircle class="w-3.5 h-3.5 mr-1" />
              Dikonfirmasi / Disetujui
            </Badge>
          {:else if registration.status === 'rejected'}
            <Badge variant="rose">
              <XCircle class="w-3.5 h-3.5 mr-1" />
              Ditolak / Dibatalkan Admin
            </Badge>
          {:else if registration.status === 'completed'}
            <Badge variant="blue">
              <CheckCircle class="w-3.5 h-3.5 mr-1" />
              Selesai Kunjungan
            </Badge>
          {:else if registration.status === 'cancelled'}
            <Badge variant="zinc">
              <XCircle class="w-3.5 h-3.5 mr-1" />
              Dibatalkan Pasien
            </Badge>
          {:else}
            <Badge variant="zinc">{registration.status}</Badge>
          {/if}
        </div>
      </div>

      <!-- Content info grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-[var(--color-text)]">

        <!-- Left Column: Patient Personal Info -->
        <div class="space-y-4">
          <h3 class="text-[var(--color-muted-foreground)] font-bold uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
            <User class="w-4 h-4 text-[var(--color-primary)]" />
            <span>Informasi Calon Pasien</span>
          </h3>
          <div class="bg-[var(--color-bg)] border border-[var(--color-border)] p-4 rounded-2xl space-y-3">
            <div>
              <span class="text-[var(--color-muted-foreground)] block">Nama Lengkap Pasien</span>
              <span class="text-[var(--color-text)] font-bold">{registration.fullName}</span>
            </div>
            <div>
              <span class="text-[var(--color-muted-foreground)] block">Nomor Identitas (NIK)</span>
              <span class="text-[var(--color-text)] font-mono font-medium">{registration.identityNumber.slice(0, 10)}******</span>
            </div>
            <div>
              <span class="text-[var(--color-muted-foreground)] block">Tanggal Lahir / Gender</span>
              <span class="text-[var(--color-text)] font-medium">
                {registration.dateOfBirth} ({registration.gender === 'L' ? 'Laki-laki' : 'Perempuan'})
              </span>
            </div>
            <div>
              <span class="text-[var(--color-muted-foreground)] block">Nomor HP Aktif</span>
              <span class="text-[var(--color-text)] font-medium">{registration.phoneNumber}</span>
            </div>
          </div>
        </div>

        <!-- Right Column: Service & Operational details -->
        <div class="space-y-4">
          <h3 class="text-[var(--color-muted-foreground)] font-bold uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
            <Calendar class="w-4 h-4 text-sky-400" />
            <span>Detail Kunjungan Medis</span>
          </h3>
          <div class="bg-[var(--color-bg)] border border-[var(--color-border)] p-4 rounded-2xl space-y-3">
            <div>
              <span class="text-[var(--color-muted-foreground)] block">Layanan Kesehatan</span>
              <span class="text-[var(--color-text)] font-bold text-sm text-[var(--color-primary)]">{registration.serviceName}</span>
            </div>
            <div>
              <span class="text-[var(--color-muted-foreground)] block">Rencana Tanggal Kunjungan</span>
              <span class="text-[var(--color-text)] font-bold text-sm">{registration.visitDate}</span>
            </div>
            <div>
              <span class="text-[var(--color-muted-foreground)] block">Catatan / Keluhan Pasien</span>
              <p class="text-[var(--color-text)] italic">{registration.notes || 'Tidak ada catatan khusus.'}</p>
            </div>
            {#if registration.adminNotes}
              <div class="p-3 bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 rounded-xl mt-2 text-[var(--color-primary)] space-y-1">
                <span class="font-bold flex items-center gap-1 text-[10px] uppercase tracking-wider">
                  <MessageSquare class="w-3.5 h-3.5" />
                  <span>Catatan Petugas Admin</span>
                </span>
                <p class="font-medium text-[var(--color-text)]">{registration.adminNotes}</p>
              </div>
            {/if}
          </div>
        </div>

      </div>

      <!-- Footer row: Cancel Button if allowed -->
      {#if registration.status === 'waiting'}
        <div class="pt-5 border-t border-[var(--color-border)] flex flex-col sm:flex-row items-center justify-between gap-4">
          <span class="text-[11px] text-[var(--color-muted-foreground)] flex items-center gap-1.5 leading-snug">
            <AlertCircle class="w-5 h-5 text-[var(--color-primary)] shrink-0" />
            <span>Anda dapat membatalkan permohonan pendaftaran ini selama statusnya masih Menunggu Konfirmasi.</span>
          </span>

          <button
            type="button"
            onclick={handleCancelRegistration}
            disabled={isCancelling}
            class="w-full sm:w-auto px-4.5 py-2.5 bg-rose-600/15 border border-rose-600/30 text-rose-400 hover:bg-rose-600 hover:text-white font-bold transition rounded-xl text-xs flex items-center justify-center gap-1.5"
          >
            {#if isCancelling}
              <RefreshCw class="w-3.5 h-3.5 animate-spin" />
              <span>Membatalkan...</span>
            {:else}
              <Trash2 class="w-3.5 h-3.5" />
              <span>Batalkan Pendaftaran</span>
            {/if}
          </button>
        </div>
      {/if}

    </Card>
  {/if}

</div>
