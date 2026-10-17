<!-- @component Panel kontrol petugas antrean digital: panggil, layani, lewati, dan selesaikan antrean pasien secara real-time. -->
<script lang="ts">
  import {
    UserCheck, Users, Play, SkipForward, CheckCircle,
    XCircle, Volume2, AlertCircle, RefreshCw, Calendar,
    Layers, MapPin, AlertTriangle
  } from 'lucide-svelte';
  import Badge from '../../../shared/ui/Badge.svelte';
  import { registrationService } from '../../../shared/services/registrationService.js';
  import { serviceEngineService } from '../../../shared/services/serviceEngineService.js';
  import { authStore } from '../../../shared/stores/auth.svelte.js';
  import type { ServiceEntity, ServiceRegistrationEntity } from '../../../shared/types/index.js';

  type BadgeVariant = 'primary' | 'amber' | 'emerald' | 'red' | 'zinc' | 'blue' | 'rose' | 'sky' | 'slate' | 'purple';
  type QueueStatus = 'waiting' | 'calling' | 'serving' | 'completed' | 'skipped' | 'cancelled';

  // Filters and Selection State
  let services = $state<ServiceEntity[]>([]);
  let selectedServiceId = $state('');
  let visitDate = $state(new Date().toISOString().split('T')[0]);
  let selectedCounter = $state(1);
  let skipReason = $state('');
  let isSkipModalOpen = $state(false);
  let regToSkip = $state<string | null>(null);

  // Data state
  let registrations = $state<ServiceRegistrationEntity[]>([]);
  let queueStats = $state({
    todayCount: 0,
    waitingCount: 0,
    callingCount: 0,
    servingCount: 0,
    completedCount: 0,
    skippedCount: 0,
    cancelledCount: 0
  });

  // UI state
  let loading = $state(false);
  let errorMsg = $state('');
  let successMsg = $state('');

  // Auto Refresh Interval
  $effect(() => {
    loadServices();
  });

  $effect(() => {
    loadQueueData();
    const interval = setInterval(loadQueueData, 5000); // 5 seconds light polling
    return () => clearInterval(interval);
  });

  async function loadServices() {
    try {
      const all = await serviceEngineService.getServices();
      // Only keep published services with queueEnabled
      const queueServices = all.filter(s => s.status === 'published' && s.queueEnabled);
      services = queueServices;
      if (queueServices.length > 0) {
        selectedServiceId = queueServices[0].id;
      }
    } catch (err) {
      console.error('Failed to load services:', err);
    }
  }

  async function loadQueueData() {
    if (document.hidden) return;
    try {
      // Get registrations filtered by date & service
      const filters: any = { visitDate };
      if (selectedServiceId) {
        filters.serviceId = selectedServiceId;
      }

      const allRegs = await registrationService.getRegistrations(filters);
      // Only registrations that have a queue number
      registrations = allRegs.filter(r => r.queueNumber);

      // Load statistics
      queueStats = await registrationService.getQueueDashboardSummary({
        visitDate,
        serviceId: selectedServiceId
      });
    } catch (err) {
      console.error('Failed to load queue data:', err);
    }
  }

  function speakQueue(num: string, serviceName: string, counter: number) {
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel(); // Stop any ongoing speech

        // Clean prefix and digits for spelling
        const parts = num.split('-');
        const prefix = parts[0] || '';
        const digits = (parts[1] || '').split('').join(' ');

        const text = `Nomor antrean, ${prefix} ${digits}, silakan menuju, ${serviceName}, Loket ${counter}`;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'id-ID';
        utterance.rate = 0.85; // Natural speed
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.warn('TTS Speech failed:', e);
      }
    }
  }

  function buildActor() {
    const user = authStore.user;
    return {
      id: user?.uid || 'officer',
      email: user?.email || 'officer@puskesmas.go.id',
      name: user?.displayName || 'Petugas Antrean'
    };
  }

  // 1. CALL NEXT IN LINE
  async function handleCallNext() {
    if (loading) return;
    loading = true;
    errorMsg = '';
    successMsg = '';

    try {
      // Find the next waiting registration
      // Sorted by queue number seq (natural order)
      const waitingList = registrations
        .filter(r => r.queueStatus === 'waiting')
        .sort((a, b) => {
          const numA = parseInt(a.queueNumber?.split('-')[1] || '0', 10);
          const numB = parseInt(b.queueNumber?.split('-')[1] || '0', 10);
          return numA - numB;
        });

      if (waitingList.length === 0) {
        errorMsg = 'Tidak ada antrean dalam daftar tunggu saat ini.';
        loading = false;
        return;
      }

      const nextInLine = waitingList[0];
      const actor = buildActor();

      const updated = await registrationService.updateQueueStatus(
        nextInLine.id,
        'calling',
        actor,
        selectedCounter,
        `Dipanggil oleh ${actor.name} ke Loket ${selectedCounter}`
      );

      successMsg = `Memanggil Antrean ${updated.queueNumber}`;
      speakQueue(updated.queueNumber || '', updated.serviceName, selectedCounter);
      await loadQueueData();
    } catch (err: any) {
      errorMsg = err.message || 'Gagal memanggil antrean. Silakan coba lagi.';
    } finally {
      loading = false;
    }
  }

  // Call a specific registration directly from the table row
  async function handleCallSpecific(reg: ServiceRegistrationEntity) {
    if (loading) return;
    loading = true;
    errorMsg = '';
    successMsg = '';
    try {
      const user = authStore.user;
      await registrationService.updateQueueStatus(reg.id, 'calling', {
        id: user?.uid || 'officer',
        email: user?.email || '',
        name: user?.displayName || 'Petugas'
      }, selectedCounter);
      speakQueue(reg.queueNumber || '', reg.serviceName, selectedCounter);
      await loadQueueData();
    } catch (err: any) {
      errorMsg = err.message;
    } finally {
      loading = false;
    }
  }

  // 2. RECALL CURRENT
  async function handleRecall(regId: string) {
    if (loading) return;
    loading = true;
    errorMsg = '';
    successMsg = '';

    try {
      const reg = registrations.find(r => r.id === regId);
      if (!reg) throw new Error('Data antrean tidak ditemukan.');

      const actor = buildActor();

      const updated = await registrationService.recallQueue(regId, actor);
      successMsg = `Memanggil Ulang Antrean ${updated.queueNumber}`;
      speakQueue(updated.queueNumber || '', updated.serviceName, reg.counterNumber || selectedCounter);
    } catch (err: any) {
      errorMsg = err.message || 'Gagal memanggil ulang antrean. Silakan coba lagi.';
    } finally {
      loading = false;
    }
  }

  // 3. START SERVICE
  async function handleStartService(regId: string) {
    if (loading) return;
    loading = true;
    errorMsg = '';
    successMsg = '';

    try {
      const actor = buildActor();

      const updated = await registrationService.updateQueueStatus(
        regId,
        'serving',
        actor,
        selectedCounter,
        'Pelayanan dimulai.'
      );

      successMsg = `Mulai pelayanan untuk nomor ${updated.queueNumber}`;
      await loadQueueData();
    } catch (err: any) {
      errorMsg = err.message || 'Gagal memulai pelayanan.';
    } finally {
      loading = false;
    }
  }

  // 4. COMPLETE SERVICE
  async function handleCompleteService(regId: string) {
    if (loading) return;
    loading = true;
    errorMsg = '';
    successMsg = '';

    try {
      const actor = buildActor();

      const updated = await registrationService.updateQueueStatus(
        regId,
        'completed',
        actor,
        selectedCounter,
        'Pelayanan selesai dilaksanakan.'
      );

      successMsg = `Pelayanan nomor ${updated.queueNumber} selesai.`;
      await loadQueueData();
    } catch (err: any) {
      errorMsg = err.message || 'Gagal menyelesaikan pelayanan.';
    } finally {
      loading = false;
    }
  }

  // 5. SKIP (LEWATI)
  function openSkipModal(regId: string) {
    regToSkip = regId;
    skipReason = 'Pasien tidak merespon setelah dipanggil 3 kali';
    isSkipModalOpen = true;
  }

  async function handleSkipConfirm() {
    if (!regToSkip || loading) return;
    loading = true;
    errorMsg = '';
    successMsg = '';

    try {
      const actor = buildActor();

      const updated = await registrationService.updateQueueStatus(
        regToSkip,
        'skipped',
        actor,
        selectedCounter,
        `Dilewati. Alasan: ${skipReason}`
      );

      successMsg = `Antrean ${updated.queueNumber} berhasil dilewati.`;
      isSkipModalOpen = false;
      regToSkip = null;
      await loadQueueData();
    } catch (err: any) {
      errorMsg = err.message || 'Gagal melepaskan antrean.';
    } finally {
      loading = false;
    }
  }

  // 6. CANCEL (BATALKAN)
  async function handleCancelQueue(regId: string) {
    if (loading) return;
    if (!window.confirm('Apakah Anda yakin ingin membatalkan antrean ini? Tindakan ini tidak dapat dibatalkan.')) return;

    loading = true;
    errorMsg = '';
    successMsg = '';

    try {
      const actor = buildActor();

      const updated = await registrationService.updateQueueStatus(
        regId,
        'cancelled',
        actor,
        selectedCounter,
        'Dibatalkan oleh Petugas Antrean.'
      );

      successMsg = `Antrean ${updated.queueNumber} telah dibatalkan.`;
      await loadQueueData();
    } catch (err: any) {
      errorMsg = err.message || 'Gagal membatalkan antrean.';
    } finally {
      loading = false;
    }
  }

  const activeService = $derived(services.find(s => s.id === selectedServiceId));

  // Find calling or serving items
  const currentCallingReg = $derived(registrations.find(r => r.queueStatus === 'calling' && r.counterNumber === selectedCounter));
  const currentServingReg = $derived(registrations.find(r => r.queueStatus === 'serving' && r.counterNumber === selectedCounter));

  // Next in line candidate
  const nextWaitingList = $derived(registrations
    .filter(r => r.queueStatus === 'waiting')
    .sort((a, b) => {
      const numA = parseInt(a.queueNumber?.split('-')[1] || '0', 10);
      const numB = parseInt(b.queueNumber?.split('-')[1] || '0', 10);
      return numA - numB;
    }));
  const nextUp = $derived(nextWaitingList[0] || null);

  function queueStatusInfo(status?: string): { variant: BadgeVariant; label: string } {
    const st = (status || 'waiting') as QueueStatus;
    switch (st) {
      case 'waiting': return { variant: 'blue', label: 'Menunggu' };
      case 'calling': return { variant: 'amber', label: 'Dipanggil' };
      case 'serving': return { variant: 'purple', label: 'Dilayani' };
      case 'completed': return { variant: 'emerald', label: 'Selesai' };
      case 'skipped': return { variant: 'red', label: 'Dilewati' };
      case 'cancelled': return { variant: 'red', label: 'Batal' };
      default: return { variant: 'zinc', label: st };
    }
  }
</script>

<div class="space-y-6">

  <!-- Alerts -->
  {#if errorMsg}
    <div class="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 text-xs text-red-400 flex items-start gap-3">
      <AlertCircle class="w-4 h-4 mt-0.5 shrink-0" />
      <span>{errorMsg}</span>
    </div>
  {/if}
  {#if successMsg}
    <div class="bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 rounded-2xl p-4 text-xs text-[var(--color-primary)] flex items-start gap-3">
      <CheckCircle class="w-4 h-4 mt-0.5 shrink-0" />
      <span>{successMsg}</span>
    </div>
  {/if}

  <!-- Dashboard Filters Panel -->
  <div class="bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl p-5 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
    <div class="space-y-1.5">
      <label class="text-xs text-[var(--color-muted-foreground)] font-medium flex items-center gap-1.5">
        <Layers class="w-3.5 h-3.5 text-[var(--color-muted-foreground)]" />
        <span>Layanan Kesehatan</span>
      </label>
      <select
        bind:value={selectedServiceId}
        class="w-full px-3 py-2.5 bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] rounded-xl text-xs focus:outline-none focus:border-[var(--color-primary)]"
      >
        <option value="">-- Pilih Layanan --</option>
        {#each services as s (s.id)}
          <option value={s.id}>{s.name}</option>
        {/each}
      </select>
    </div>

    <div class="space-y-1.5">
      <label class="text-xs text-[var(--color-muted-foreground)] font-medium flex items-center gap-1.5">
        <Calendar class="w-3.5 h-3.5 text-[var(--color-muted-foreground)]" />
        <span>Tanggal Pelayanan</span>
      </label>
      <input
        type="date"
        bind:value={visitDate}
        class="w-full px-3 py-2.5 bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] rounded-xl text-xs focus:outline-none focus:border-[var(--color-primary)]"
      />
    </div>

    <div class="space-y-1.5">
      <label class="text-xs text-[var(--color-muted-foreground)] font-medium flex items-center gap-1.5">
        <MapPin class="w-3.5 h-3.5 text-[var(--color-muted-foreground)]" />
        <span>Nomor Loket / Poli</span>
      </label>
      <select
        bind:value={selectedCounter}
        class="w-full px-3 py-2.5 bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] rounded-xl text-xs focus:outline-none focus:border-[var(--color-primary)] font-bold"
      >
        {#each [1, 2, 3, 4, 5] as n (n)}
          <option value={n}>Loket / Meja {n}</option>
        {/each}
      </select>
    </div>

    <div>
      <button
        onclick={loadQueueData}
        class="w-full py-2.5 bg-[var(--color-card)] hover:bg-[var(--color-card)] text-[var(--color-text)] hover:text-[var(--color-text)] rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5"
      >
        <RefreshCw class="w-3.5 h-3.5" />
        <span>Sinkronisasi Data</span>
      </button>
    </div>
  </div>

  <!-- Counter Stats cards -->
  <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
    <div class="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl p-4 space-y-1">
      <span class="text-[10px] text-[var(--color-muted-foreground)] font-bold uppercase tracking-wider block">Total Antrean</span>
      <div class="text-2xl font-light text-[var(--color-text)] font-mono">{queueStats.todayCount}</div>
    </div>
    <div class="bg-[var(--color-card)] border border-blue-500/20 rounded-2xl p-4 space-y-1 shadow-lg shadow-blue-500/20">
      <span class="text-[10px] text-blue-400 font-bold uppercase tracking-wider block">Menunggu</span>
      <div class="text-2xl font-light text-blue-300 font-mono">{queueStats.waitingCount}</div>
    </div>
    <div class="bg-[var(--color-card)] border border-[var(--color-primary)]/20 rounded-2xl p-4 space-y-1 shadow-lg shadow-[var(--color-primary)]/20">
      <span class="text-[10px] text-[var(--color-primary)] font-bold uppercase tracking-wider block">Dipanggil</span>
      <div class="text-2xl font-light text-[var(--color-primary)] font-mono">{queueStats.callingCount}</div>
    </div>
    <div class="bg-[var(--color-card)] border border-purple-500/20 rounded-2xl p-4 space-y-1 shadow-lg shadow-purple-500/20">
      <span class="text-[10px] text-purple-400 font-bold uppercase tracking-wider block">Dilayani</span>
      <div class="text-2xl font-light text-purple-300 font-mono">{queueStats.servingCount}</div>
    </div>
    <div class="bg-[var(--color-card)] border border-[var(--color-primary)]/20 rounded-2xl p-4 space-y-1 shadow-lg shadow-emerald-500/20">
      <span class="text-[10px] text-[var(--color-primary)] font-bold uppercase tracking-wider block">Selesai</span>
      <div class="text-2xl font-light text-emerald-300 font-mono">{queueStats.completedCount}</div>
    </div>
    <div class="bg-[var(--color-card)] border border-orange-500/20 rounded-2xl p-4 space-y-1 shadow-lg shadow-orange-500/20">
      <span class="text-[10px] text-orange-400 font-bold uppercase tracking-wider block">Dilewati</span>
      <div class="text-2xl font-light text-orange-300 font-mono">{queueStats.skippedCount}</div>
    </div>
    <div class="bg-[var(--color-card)] border border-red-500/20 rounded-2xl p-4 space-y-1 shadow-lg shadow-red-500/20">
      <span class="text-[10px] text-red-400 font-bold uppercase tracking-wider block">Batal</span>
      <div class="text-2xl font-light text-red-300 font-mono">{queueStats.cancelledCount}</div>
    </div>
  </div>

  <!-- Live Controller Dashboard & Display Panel -->
  <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">

    <!-- Main Queue Caller Box (Left side) -->
    <div class="lg:col-span-8 space-y-6">
      <div class="bg-[var(--color-card)] border border-[var(--color-primary)]/20 rounded-3xl p-6 relative overflow-hidden space-y-6">
        <div class="absolute top-0 right-0 w-32 h-32 bg-[var(--color-primary)]/5 rounded-full blur-3xl"></div>

        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[var(--color-border)]">
          <div class="space-y-1">
            <span class="text-[10px] font-bold tracking-wider text-[var(--color-primary)] uppercase bg-[var(--color-primary)]/10 px-2 py-0.5 rounded">
              LOKET AKTIF: {selectedCounter}
            </span>
            <h3 class="text-base font-bold text-[var(--color-text)]">
              {activeService ? activeService.name : 'Silakan pilih layanan'}
            </h3>
          </div>
          <div class="text-xs text-[var(--color-muted-foreground)] font-mono">
            {visitDate}
          </div>
        </div>

        <!-- Status Visualizer -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-6 py-4">

          <!-- Sedang Dipanggil -->
          <div class="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl p-4 text-center space-y-2 relative">
            <span class="text-[10px] text-[var(--color-primary)] uppercase tracking-widest block font-bold">Sedang Dipanggil</span>
            {#if currentCallingReg}
              <div class="space-y-1">
                <div class="text-4xl font-light text-[var(--color-text)] font-mono tracking-tight">{currentCallingReg.queueNumber}</div>
                <div class="text-[11px] text-[var(--color-muted-foreground)] font-medium truncate">{currentCallingReg.fullName}</div>
                <div class="flex justify-center gap-1 mt-2">
                  <button
                    onclick={() => handleRecall(currentCallingReg.id)}
                    disabled={loading}
                    class="px-2 py-1 bg-[var(--color-primary)] hover:bg-[var(--color-primary)] disabled:bg-[var(--color-primary)]/20 disabled:text-[var(--color-muted-foreground)] text-[var(--color-primary-foreground)] rounded-lg text-[10px] font-bold transition flex items-center gap-1"
                  >
                    <Volume2 class="w-3 h-3" />
                    <span>Panggil Lagi</span>
                  </button>
                </div>
              </div>
            {:else}
              <div class="py-6 text-[var(--color-muted-foreground)] text-xs italic">Tidak ada</div>
            {/if}
          </div>

          <!-- Sedang Dilayani -->
          <div class="bg-[var(--color-bg)] border border-purple-500/20 rounded-2xl p-4 text-center space-y-2">
            <span class="text-[10px] text-purple-400 uppercase tracking-widest block font-bold">Sedang Dilayani</span>
            {#if currentServingReg}
              <div class="space-y-1">
                <div class="text-4xl font-light text-[var(--color-text)] font-mono tracking-tight">{currentServingReg.queueNumber}</div>
                <div class="text-[11px] text-[var(--color-muted-foreground)] font-medium truncate">{currentServingReg.fullName}</div>
              </div>
            {:else}
              <div class="py-6 text-[var(--color-muted-foreground)] text-xs italic">Tidak ada</div>
            {/if}
          </div>

          <!-- Berikutnya -->
          <div class="bg-[var(--color-bg)] border border-blue-500/20 rounded-2xl p-4 text-center space-y-2">
            <span class="text-[10px] text-blue-400 uppercase tracking-widest block font-bold">Berikutnya (Waiting)</span>
            {#if nextUp}
              <div class="space-y-1">
                <div class="text-4xl font-light text-[var(--color-text)] font-mono tracking-tight">{nextUp.queueNumber}</div>
                <div class="text-[11px] text-[var(--color-muted-foreground)] font-medium truncate">{nextUp.fullName}</div>
              </div>
            {:else}
              <div class="py-6 text-[var(--color-muted-foreground)] text-xs italic">Habis</div>
            {/if}
          </div>
        </div>

        <!-- Action Board (Highly intuitive control triggers) -->
        <div class="pt-4 border-t border-[var(--color-border)] space-y-3">
          <span class="text-[10px] font-bold text-[var(--color-muted-foreground)] uppercase block tracking-wider">Panel Kontrol Petugas</span>
          <div class="flex flex-wrap gap-3">

            <!-- Call Next Button -->
            <button
              onclick={handleCallNext}
              disabled={loading || !selectedServiceId || nextWaitingList.length === 0}
              class="px-5 py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary)] disabled:bg-[var(--color-primary)]/10 disabled:text-zinc-600 text-[var(--color-primary-foreground)] font-bold rounded-xl text-xs transition active:scale-98 flex items-center gap-2"
            >
              <Play class="w-4 h-4 fill-current" />
              <span>Panggil Berikutnya</span>
            </button>

            <!-- If there is a calling queue, offer options to start serving or skip -->
            {#if currentCallingReg}
              <button
                onclick={() => handleStartService(currentCallingReg.id)}
                disabled={loading}
                class="px-5 py-3 bg-purple-600 hover:bg-purple-500 text-[var(--color-text)] font-bold rounded-xl text-xs transition active:scale-98 flex items-center gap-2"
              >
                <UserCheck class="w-4 h-4" />
                <span>Mulai Layani</span>
              </button>
              <button
                onclick={() => openSkipModal(currentCallingReg.id)}
                disabled={loading}
                class="px-5 py-3 bg-orange-600 hover:bg-orange-500 text-[var(--color-text)] font-bold rounded-xl text-xs transition active:scale-98 flex items-center gap-2"
              >
                <SkipForward class="w-4 h-4" />
                <span>Lewati</span>
              </button>
            {/if}

            <!-- If there is a serving queue, offer option to complete -->
            {#if currentServingReg}
              <button
                onclick={() => handleCompleteService(currentServingReg.id)}
                disabled={loading}
                class="px-5 py-3 bg-blue-500 hover:bg-blue-400 text-[var(--color-primary-foreground)] font-bold rounded-xl text-xs transition active:scale-98 flex items-center gap-2"
              >
                <CheckCircle class="w-4 h-4" />
                <span>Selesaikan Layanan</span>
              </button>
            {/if}

          </div>
        </div>

      </div>

      <!-- Queue Registry List -->
      <div class="bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl overflow-hidden">
        <div class="px-6 py-5 border-b border-[var(--color-border)] flex justify-between items-center">
          <h4 class="text-sm font-bold text-[var(--color-text)]">Daftar Antrean Hari Ini</h4>
          <span class="text-[11px] font-mono font-bold text-[var(--color-muted-foreground)]">{registrations.length} Total Antrean</span>
        </div>

        {#if registrations.length === 0}
          <div class="p-12 text-center text-[var(--color-muted-foreground)] space-y-1 text-xs">
            <Users class="w-8 h-8 text-zinc-600 mx-auto mb-2" />
            <p>Tidak ada antrean terdaftar untuk filter yang dipilih.</p>
            <p class="text-[10px] text-zinc-600">Pastikan pendaftaran sudah berstatus "Dikonfirmasi" agar masuk ke daftar antrean.</p>
          </div>
        {:else}
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse text-xs">
              <thead>
                <tr class="border-b border-[var(--color-border)] text-[var(--color-muted-foreground)] bg-[var(--color-bg)]/30">
                  <th class="p-4 font-semibold">Nomor</th>
                  <th class="p-4 font-semibold">Pasien</th>
                  <th class="p-4 font-semibold">Loket</th>
                  <th class="p-4 font-semibold">Status</th>
                  <th class="p-4 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[var(--color-border)]/50">
                {#each registrations as r (r.id)}
                  {@const info = queueStatusInfo(r.queueStatus)}
                  <tr class="hover:bg-[var(--color-card)]/30 transition">
                    <td class="p-4 font-mono font-bold text-[var(--color-text)] text-sm">{r.queueNumber}</td>
                    <td class="p-4">
                      <div class="font-semibold text-[var(--color-text)]">{r.fullName}</div>
                      <div class="text-[10px] text-[var(--color-muted-foreground)] font-mono">{r.registrationNumber} • {r.phoneNumber}</div>
                    </td>
                    <td class="p-4 text-[var(--color-text)] font-bold">
                      {r.counterNumber ? `Loket ${r.counterNumber}` : '-'}
                    </td>
                    <td class="p-4">
                      <Badge variant={info.variant}>{info.label}</Badge>
                    </td>
                    <td class="p-4 text-right">
                      <div class="flex justify-end gap-1.5">
                        {#if r.queueStatus === 'waiting'}
                          <button
                            onclick={() => handleCallSpecific(r)}
                            class="p-1.5 bg-[var(--color-card)] hover:bg-[var(--color-primary)] hover:text-[var(--color-primary-foreground)] text-[var(--color-primary-foreground)] rounded-lg transition"
                            title="Panggil Antrean Ini"
                          >
                            <Play class="w-3.5 h-3.5 fill-current" />
                          </button>
                        {/if}

                        {#if r.queueStatus === 'calling'}
                          <button
                            onclick={() => handleRecall(r.id)}
                            class="p-1.5 bg-[var(--color-card)] hover:bg-[var(--color-primary)] hover:text-[var(--color-primary-foreground)] text-[var(--color-primary-foreground)] rounded-lg transition"
                            title="Panggil Ulang"
                          >
                            <Volume2 class="w-3.5 h-3.5" />
                          </button>
                          <button
                            onclick={() => handleStartService(r.id)}
                            class="p-1.5 bg-[var(--color-card)] hover:bg-purple-500 text-[var(--color-text)] hover:text-[var(--color-text)] rounded-lg transition"
                            title="Mulai Layani"
                          >
                            <UserCheck class="w-3.5 h-3.5" />
                          </button>
                          <button
                            onclick={() => openSkipModal(r.id)}
                            class="p-1.5 bg-[var(--color-card)] hover:bg-orange-500 text-[var(--color-text)] hover:text-[var(--color-text)] rounded-lg transition"
                            title="Lewati"
                          >
                            <SkipForward class="w-3.5 h-3.5" />
                          </button>
                        {/if}

                        {#if r.queueStatus === 'serving'}
                          <button
                            onclick={() => handleCompleteService(r.id)}
                            class="p-1.5 bg-[var(--color-card)] hover:bg-blue-500 hover:text-[var(--color-primary-foreground)] text-white rounded-lg transition"
                            title="Selesaikan"
                          >
                            <CheckCircle class="w-3.5 h-3.5" />
                          </button>
                        {/if}

                        {#if r.queueStatus !== 'completed' && r.queueStatus !== 'cancelled'}
                          <button
                            onclick={() => handleCancelQueue(r.id)}
                            class="p-1.5 bg-[var(--color-card)] hover:bg-red-500 hover:text-[var(--color-text)] text-red-400 rounded-lg transition"
                            title="Batalkan Antrean"
                          >
                            <XCircle class="w-3.5 h-3.5" />
                          </button>
                        {/if}
                      </div>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </div>

    </div>

    <!-- Quick-display view link & guidelines sidebar (Right side) -->
    <div class="lg:col-span-4 space-y-6">

      <!-- Monitor display shortcut card -->
      <div class="bg-gradient-to-br from-[var(--color-primary)]/10 to-transparent border border-[var(--color-primary)]/20 rounded-3xl p-5 space-y-4">
        <div class="p-3 bg-[var(--color-primary)]/10 rounded-2xl w-fit">
          <Volume2 class="w-6 h-6 text-[var(--color-primary)]" />
        </div>
        <div class="space-y-1">
          <h4 class="text-sm font-bold text-[var(--color-text)]">Layar Monitor Antrean (Display)</h4>
          <p class="text-xs text-[var(--color-muted-foreground)] leading-relaxed">
            Buka layar display antrean di TV/Monitor tunggu Puskesmas untuk menampilkan panggilan antrean dan pemanggilan suara (TTS) otomatis secara langsung.
          </p>
        </div>
        <a
          href="#/antrian/display"
          target="_blank"
          rel="noopener noreferrer"
          class="flex items-center justify-center gap-2 w-full py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary)] text-[var(--color-primary-foreground)] font-bold rounded-xl text-xs transition"
        >
          <span>Buka Layar Monitor TV</span>
        </a>
      </div>

      <!-- Instruction guidelines -->
      <div class="bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl p-5 space-y-4">
        <div class="flex items-center gap-2 border-b border-[var(--color-border)] pb-3 text-[var(--color-text)] font-bold text-xs uppercase tracking-wider">
          <AlertTriangle class="w-4 h-4 text-[var(--color-muted-foreground)]" />
          <span>Panduan Operasional</span>
        </div>
        <ul class="space-y-3 text-xs text-[var(--color-muted-foreground)] list-disc list-inside leading-relaxed">
          <li>
            <strong class="text-[var(--color-text)]">Panggil Berikutnya:</strong> Mengambil pasien dengan nomor terkecil yang masih menunggu.
          </li>
          <li>
            <strong class="text-[var(--color-text)]">Panggil Lagi:</strong> Mengulang pengumuman suara jika pasien tidak mendengar.
          </li>
          <li>
            <strong class="text-[var(--color-text)]">Lewati:</strong> Gunakan jika pasien tidak kunjung datang. Alasan wajib dicatat.
          </li>
          <li>
            <strong class="text-[var(--color-text)]">Mulai Layani:</strong> Tekan saat pasien sudah masuk dan pelayanan dimulai.
          </li>
          <li>
            <strong class="text-[var(--color-text)]">Selesai:</strong> Tekan saat konsultasi/tindakan medis telah rampung.
          </li>
        </ul>
      </div>

    </div>

  </div>

</div>

<!-- Skip Reason Modal -->
{#if isSkipModalOpen}
  <div class="fixed inset-0 bg-[var(--color-bg)]/70 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
    <div class="bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
      <h3 class="text-sm font-bold text-[var(--color-text)]">Alasan Melewati Antrean</h3>
      <div class="space-y-1">
        <label class="text-[10px] text-[var(--color-muted-foreground)] uppercase tracking-wider font-bold">Catatan / Alasan Petugas</label>
        <textarea
          bind:value={skipReason}
          placeholder="Tulis alasan, contoh: Pasien tidak hadir di loket..."
          class="w-full h-24 px-3 py-2 bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] rounded-xl text-xs focus:outline-none focus:border-[var(--color-primary)] resize-none"
        ></textarea>
      </div>
      <div class="flex gap-2">
        <button
          onclick={() => {
            isSkipModalOpen = false;
            regToSkip = null;
          }}
          class="flex-1 py-2 bg-[var(--color-card)] hover:bg-[var(--color-card)] text-[var(--color-text)] rounded-xl text-xs font-semibold transition"
        >
          Kembali
        </button>
        <button
          onclick={handleSkipConfirm}
          disabled={loading || !skipReason.trim()}
          class="flex-1 py-2 bg-orange-600 hover:bg-orange-500 text-[var(--color-text)] font-bold rounded-xl text-xs transition disabled:opacity-50"
        >
          Simpan & Lewati
        </button>
      </div>
    </div>
  </div>
{/if}
