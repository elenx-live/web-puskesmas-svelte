<!-- @component Layar monitor TV antrean — polling 3 detik, pengumuman suara otomatis (TTS id-ID) saat nomor dipanggil, filter per unit. -->
<script lang="ts">
  import { untrack } from 'svelte';
  import { registrationService } from '../../shared/services/registrationService.js';
  import { serviceEngineService } from '../../shared/services/serviceEngineService.js';
  import type { ServiceRegistrationEntity, ServiceEntity } from '../../shared/types/index.js';
  import {
    Volume2, Play, Monitor, Activity, VolumeX,
  } from 'lucide-svelte';

  let registrations = $state<ServiceRegistrationEntity[]>([]);
  let services = $state<ServiceEntity[]>([]);
  let selectedServiceId = $state(''); // Optional filter for multi-TV setups

  // Audio monitor state (required by browser security policies)
  let audioEnabled = $state(false);
  let lastSpokenMap = $state<Record<string, string>>({}); // id -> queueCalledAt

  $effect(() => {
    void loadServices();
  });

  $effect(() => {
    const sid = selectedServiceId; // tracked dep
    untrack(() => {
      void fetchActiveQueues();
    });
    const interval = setInterval(fetchActiveQueues, 3000); // 3s polling for real-time response on TV
    return () => clearInterval(interval);
  });

  async function loadServices() {
    try {
      const all = await serviceEngineService.getServices();
      services = all.filter((s) => s.status === 'published' && s.queueEnabled);
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchActiveQueues() {
    if (document.hidden) return;
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const list = await registrationService.getRegistrations({ visitDate: todayStr });
      const activeList = list.filter((r) => r.queueNumber);

      registrations = activeList;

      // Speak next queue if audio is enabled
      if (audioEnabled) {
        checkAndSpeakQueues(activeList);
      }
    } catch (err) {
      console.error('Failed to poll active queues:', err);
    }
  }

  function checkAndSpeakQueues(list: ServiceRegistrationEntity[]) {
    // Find all currently calling queues
    const callingList = list.filter((r) => r.queueStatus === 'calling' && r.queueCalledAt);
    if (callingList.length === 0) return;

    // Filter by service if TV has a filter
    const targetCalling = selectedServiceId
      ? callingList.filter((r) => r.serviceId === selectedServiceId)
      : callingList;

    if (targetCalling.length === 0) return;

    // Sort by latest queueCalledAt
    const sorted = [...targetCalling].sort((a, b) => {
      const dateA = new Date(a.queueCalledAt || 0).getTime();
      const dateB = new Date(b.queueCalledAt || 0).getTime();
      return dateB - dateA; // latest first
    });

    const latestCalling = sorted[0];
    const spokenKey = latestCalling.id;
    const spokenTime = latestCalling.queueCalledAt || '';

    // If never spoken before OR the called-at timestamp changed (indicating a Recall action)
    if (lastSpokenMap[spokenKey] !== spokenTime) {
      speakQueue(latestCalling.queueNumber || '', latestCalling.serviceName, latestCalling.counterNumber || 1);

      lastSpokenMap = {
        ...lastSpokenMap,
        [spokenKey]: spokenTime,
      };
    }
  }

  function speakQueue(num: string, serviceName: string, counter: number | string) {
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel(); // cancel any active speech

        // Split for natural spelling e.g. "A 0 1 5"
        const parts = num.split('-');
        const prefix = parts[0] || '';
        const digits = (parts[1] || '').split('').join(' ');

        const text = `Nomor antrean, ${prefix} ${digits}, silakan menuju, ${serviceName}, Loket ${counter}`;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'id-ID';
        utterance.rate = 0.85;
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.error('Speech synthesis error:', e);
      }
    }
  }

  function enableAudio() {
    audioEnabled = true;
    // Make an initial silent/small test sound so browser allows audio context
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance('Monitor antrean aktif');
      utterance.lang = 'id-ID';
      utterance.volume = 0.1;
      window.speechSynthesis.speak(utterance);
    }
  }

  const todayStr = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Filter registrations for display
  const displayRegs = $derived(
    selectedServiceId
      ? registrations.filter((r) => r.serviceId === selectedServiceId)
      : registrations,
  );

  // Active callers being called right now across all counters
  const activeCalls = $derived(
    displayRegs
      .filter((r) => r.queueStatus === 'calling')
      .sort((a, b) => {
        const dateA = new Date(a.queueCalledAt || 0).getTime();
        const dateB = new Date(b.queueCalledAt || 0).getTime();
        return dateB - dateA; // latest first
      }),
  );

  // Main featured call on the big screen
  const mainCall = $derived(activeCalls[0] || null);

  // Other secondary calling/serving queues
  const secondaryCalls = $derived(
    displayRegs
      .filter((r) => r.queueStatus === 'calling' || r.queueStatus === 'serving')
      .filter((r) => r.id !== (mainCall?.id || ''))
      .slice(0, 4),
  );

  // Next up candidates (waiting)
  const nextUpList = $derived(
    displayRegs
      .filter((r) => r.queueStatus === 'waiting')
      .sort((a, b) => {
        const numA = parseInt(a.queueNumber?.split('-')[1] || '0', 10);
        const numB = parseInt(b.queueNumber?.split('-')[1] || '0', 10);
        return numA - numB;
      })
      .slice(0, 5),
  );
</script>

<div class="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] font-sans p-6 md:p-10 flex flex-col justify-between relative overflow-hidden">

  <!-- Sound consent overlay -->
  {#if !audioEnabled}
    <div class="fixed inset-0 bg-[var(--color-bg)]/95 z-50 flex flex-col items-center justify-center text-center p-6 space-y-5 backdrop-blur-md">
      <div class="p-4 bg-[var(--color-primary)]/10 rounded-full border border-[var(--color-primary)]/20 text-[var(--color-primary)]">
        <Volume2 class="w-12 h-12 animate-pulse" />
      </div>
      <div class="max-w-md space-y-2">
        <h1 class="text-2xl font-bold text-[var(--color-text)]">Mulai Layar Monitor Monitor</h1>
        <p class="text-xs text-[var(--color-muted-foreground)] leading-relaxed">
          Tekan tombol di bawah untuk mengaktifkan suara Text-to-Speech otomatis saat nomor antrean dipanggil oleh petugas loket/poli.
        </p>
      </div>
      <button
        onclick={enableAudio}
        class="px-6 py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary)] text-[var(--color-primary-foreground)] font-bold rounded-xl text-sm transition shadow-lg shadow-[var(--color-primary)]/20 flex items-center gap-2"
      >
        <Play class="w-4 h-4 fill-current" />
        <span>Aktifkan Suara & Mulai Monitor</span>
      </button>
    </div>
  {/if}

  <!-- Header section -->
  <div class="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-[var(--color-border)] pb-6">
    <div class="flex items-center gap-3">
      <div class="w-12 h-12 bg-[var(--color-primary)] rounded-2xl flex items-center justify-center font-bold text-[var(--color-primary-foreground)] text-xl shadow-lg shadow-[var(--color-primary)]/20">
        TV
      </div>
      <div>
        <h1 class="text-xl font-bold text-[var(--color-text)] flex items-center gap-2">
          <span>MONITOR ANTREAN KUNJUNGAN</span>
          <Activity class="w-4 h-4 text-[var(--color-primary)] animate-pulse" />
        </h1>
        <p class="text-xs text-[var(--color-muted-foreground)]">INTEGRASI LAYANAN PRIMER • PUSKESMAS INDONESIA</p>
      </div>
    </div>

    <!-- Date and selector -->
    <div class="flex items-center gap-4">
      <div class="text-right hidden md:block">
        <p class="text-sm font-bold text-[var(--color-text)]">{todayStr}</p>
        <p class="text-xs text-[var(--color-muted-foreground)] font-mono">WAKTU AKTUAL (WIB/LOKAL)</p>
      </div>

      <div class="flex items-center gap-2 bg-[var(--color-card)] border border-[var(--color-border)] px-3 py-1.5 rounded-xl">
        <span class="text-[10px] text-[var(--color-muted-foreground)] font-bold uppercase">Saring:</span>
        <select
          value={selectedServiceId}
          onchange={(e) => { selectedServiceId = (e.currentTarget as HTMLSelectElement).value; }}
          class="bg-transparent text-xs font-semibold text-[var(--color-text)] focus:outline-none cursor-pointer border-none p-0"
        >
          <option value="">Semua Unit/Poli</option>
          {#each services as s (s.id)}
            <option value={s.id} class="bg-[var(--color-card)]">{s.name}</option>
          {/each}
        </select>
      </div>

      <button
        onclick={() => { audioEnabled = !audioEnabled; }}
        class={`p-2 rounded-xl transition ${audioEnabled ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}
        title={audioEnabled ? 'Matikan Suara' : 'Aktifkan Suara'}
      >
        {#if audioEnabled}<Volume2 class="w-4 h-4" />{:else}<VolumeX class="w-4 h-4" />{/if}
      </button>
    </div>
  </div>

  <!-- Main Screen Layout grids -->
  <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 my-8 flex-1 items-stretch">

    <!-- Left column: Big Showcase Box for Currently Called Number -->
    <div class="lg:col-span-8 flex flex-col">
      <div class="bg-[var(--color-card)] border-2 border-[var(--color-primary)]/40 rounded-3xl p-8 flex flex-col justify-between text-center relative overflow-hidden flex-1 min-h-[400px]">
        <!-- Ambient background glows -->
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-[var(--color-primary)]/5 rounded-full blur-3xl pointer-events-none" />

        <span class="text-[11px] font-bold tracking-widest text-[var(--color-primary)] uppercase bg-[var(--color-primary)]/10 px-3 py-1 rounded-full w-fit mx-auto mb-4">
          PANGGILAN AKTIF SAAT INI
        </span>

        {#if mainCall}
          <div class="my-auto space-y-6">
            <!-- BIG NUMBER -->
            <h2 class="text-8xl md:text-[11rem] font-bold text-[var(--color-text)] font-mono tracking-tighter drop-shadow-lg leading-none">
              {mainCall.queueNumber}
            </h2>

            <!-- UNIT AND LOCATION -->
            <div class="space-y-2">
              <div class="text-2xl sm:text-4xl font-bold text-[var(--color-primary)]">
                {mainCall.serviceName}
              </div>
              <div class="text-base font-bold text-[var(--color-muted-foreground)] tracking-wider">
                SILAKAN MENUJU: <span class="text-[var(--color-text)] uppercase bg-[var(--color-card)] px-3 py-1 rounded-xl font-mono">LOKET / MEJA {mainCall.counterNumber || 1}</span>
              </div>
            </div>
          </div>
        {:else}
          <div class="my-auto space-y-3 py-12">
            <p class="text-4xl font-light text-zinc-600">Belum Ada Panggilan</p>
            <p class="text-xs text-[var(--color-muted-foreground)]">Antrean yang dipanggil oleh petugas poli akan otomatis muncul di layar utama ini.</p>
          </div>
        {/if}

        <div class="pt-6 border-t border-[var(--color-border)] flex justify-center items-center gap-2 text-[10px] text-[var(--color-muted-foreground)]">
          <Volume2 class="w-4 h-4 text-[var(--color-primary)] animate-pulse" />
          <span>Sistem Pengeras Suara Otomatis Terkoneksi</span>
        </div>
      </div>
    </div>

    <!-- Right column: Secondary active counters and Next in Line -->
    <div class="lg:col-span-4 flex flex-col gap-6">

      <!-- Loket Lain / Secondary calls -->
      <div class="bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl p-5 flex flex-col justify-between flex-1">
        <span class="text-[10px] font-bold text-[var(--color-muted-foreground)] uppercase tracking-widest block mb-4 border-b border-[var(--color-border)] pb-2">
          STATUS POLIKLINIK LAINNYA
        </span>

        {#if secondaryCalls.length === 0}
          <div class="my-auto py-8 text-center text-zinc-600 italic text-xs">
            Tidak ada unit lain aktif saat ini
          </div>
        {:else}
          <div class="space-y-4">
            {#each secondaryCalls as sc (sc.id)}
              <div class="bg-[var(--color-bg)] border border-[var(--color-border)] p-4 rounded-2xl flex items-center justify-between">
                <div class="space-y-0.5">
                  <p class="text-[var(--color-muted-foreground)] text-[10px] font-bold truncate max-w-[150px]">{sc.serviceName}</p>
                  <p class="text-[var(--color-text)] font-mono font-bold text-lg">{sc.queueNumber}</p>
                </div>
                <div class="text-right">
                  <span class="text-[var(--color-primary)] text-xs font-mono bg-[var(--color-primary)]/10 px-2 py-0.5 rounded-lg border border-[var(--color-primary)]/20">
                    Loket {sc.counterNumber || 1}
                  </span>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Antrean Selanjutnya (Next up) -->
      <div class="bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl p-5 flex flex-col justify-between flex-1">
        <span class="text-[10px] font-bold text-[var(--color-muted-foreground)] uppercase tracking-widest block mb-4 border-b border-[var(--color-border)] pb-2">
          URUTAN BERIKUTNYA (DAFTAR TUNGGU)
        </span>

        {#if nextUpList.length === 0}
          <div class="my-auto py-8 text-center text-zinc-600 italic text-xs">
            Daftar tunggu kosong
          </div>
        {:else}
          <div class="space-y-3">
            {#each nextUpList as nu, index (nu.id)}
              <div class="flex items-center justify-between py-1.5 text-xs">
                <div class="flex items-center gap-2.5">
                  <span class="w-5 h-5 bg-[var(--color-card)] text-[var(--color-muted-foreground)] font-bold rounded-lg flex items-center justify-center font-mono text-[10px]">
                    {index + 1}
                  </span>
                  <span class="font-mono font-bold text-[var(--color-text)] text-sm">{nu.queueNumber}</span>
                </div>
                <span class="text-[var(--color-muted-foreground)] font-medium truncate max-w-[180px]">{nu.serviceName}</span>
              </div>
            {/each}
          </div>
        {/if}
      </div>

    </div>

  </div>

  <!-- Footer marquee or status information -->
  <div class="border-t border-[var(--color-border)] pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--color-muted-foreground)]">
    <div class="flex items-center gap-2">
      <Monitor class="w-4 h-4 text-[var(--color-primary)]" />
      <span>Monitor Display Layar Antrean v1.0 • Puskesmas ILP</span>
    </div>
    <p class="text-center sm:text-right">
      Gunakan browser mode Fullscreen (<kbd class="font-mono bg-[var(--color-card)] px-1 rounded">F11</kbd>) untuk tampilan monitor TV optimal.
    </p>
  </div>

</div>
