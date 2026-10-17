<!-- @component WhatsApp Cloud API — konfigurasi integrasi WhatsApp Business, template, dan log pengiriman. -->
<script lang="ts">
  import {
    Settings, History, Send, ShieldCheck,
    RefreshCw, AlertTriangle, CheckCircle, Search, Eye, EyeOff,
    Sliders, BadgeAlert
  } from 'lucide-svelte';
  import Card from '../../../shared/ui/Card.svelte';
  import Button from '../../../shared/ui/Button.svelte';
  import Input from '../../../shared/ui/Input.svelte';
  import { toastStore } from '../../../shared/stores/toast.svelte.js';
  // Catatan: source React tidak me-render komponen ini; import disiapkan sesuai struktur fitur.
  import WhatsAppLinkPreviewTool from '../components/WhatsAppLinkPreviewTool.svelte';

  interface WhatsAppLog {
    id: string;
    notificationId: string;
    recipient: string;
    recipientMasked: string;
    event: string;
    template: string;
    status: 'pending' | 'sending' | 'sent' | 'failed' | 'delivered' | 'read' | 'received';
    messageText: string;
    providerMessageId: string;
    errorCode: number | null;
    errorMessage: string | null;
    attempts: number;
    direction: 'inbound' | 'outbound';
    relatedEntity: string;
    relatedEntityId: string;
    createdAt: string;
    updatedAt: string;
  }

  let activeTab = $state<'config' | 'logs'>('config');

  // Config States
  let enabled = $state(false);
  let phoneNumberId = $state('');
  let businessAccountId = $state('');
  let accessToken = $state('');
  let apiVersion = $state('v20.0');
  let webhookVerifyToken = $state('');
  let defaultCountryCode = $state('62');
  let testMode = $state(true);

  // Template mappings
  let templates = $state({
    registration_submitted: 'registration_submitted',
    registration_confirmed: 'registration_confirmed',
    registration_rejected: 'registration_rejected',
    queue_called: 'queue_called',
    service_completed: 'service_completed'
  });

  // UI States
  let showToken = $state(false);
  let showVerifyToken = $state(false);
  let loading = $state(true);
  let saving = $state(false);
  let testingConnection = $state(false);
  let connectionStatus = $state<{
    tested: boolean;
    success: boolean;
    message: string;
    details?: any;
  } | null>(null);

  // Logs States
  let logs = $state<WhatsAppLog[]>([]);
  let logsSearch = $state('');
  let logsFilter = $state<string>('all');
  let loadingLogs = $state(false);
  let retryingLogId = $state<string | null>(null);

  // Fetch Config
  async function fetchConfig() {
    try {
      loading = true;
      const res = await fetch('/api/whatsapp/config');
      if (res.ok) {
        const data = await res.json();
        enabled = data.enabled;
        phoneNumberId = data.phone_number_id;
        businessAccountId = data.business_account_id;
        accessToken = data.access_token;
        apiVersion = data.api_version || 'v20.0';
        webhookVerifyToken = data.webhook_verify_token;
        defaultCountryCode = data.default_country_code || '62';
        testMode = data.test_mode !== false;
        if (data.templates) {
          templates = data.templates;
        }
      }
    } catch (err) {
      toastStore.showToast('Gagal memuat konfigurasi WhatsApp.', 'error');
    } finally {
      loading = false;
    }
  }

  // Fetch Logs
  async function fetchLogs() {
    try {
      loadingLogs = true;
      const res = await fetch('/api/whatsapp/logs');
      if (res.ok) {
        const data = await res.json();
        logs = data;
      }
    } catch (err) {
      toastStore.showToast('Gagal memuat log pengiriman WhatsApp.', 'error');
    } finally {
      loadingLogs = false;
    }
  }

  $effect(() => {
    void fetchConfig();
  });

  $effect(() => {
    if (activeTab === 'logs') {
      void fetchLogs();
    }
  });

  // Save Configuration
  async function handleSaveConfig(e: Event) {
    e.preventDefault();
    saving = true;
    connectionStatus = null;

    try {
      const res = await fetch('/api/whatsapp/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled,
          phone_number_id: phoneNumberId,
          business_account_id: businessAccountId,
          access_token: accessToken,
          api_version: apiVersion,
          webhook_verify_token: webhookVerifyToken,
          default_country_code: defaultCountryCode,
          test_mode: testMode,
          templates
        })
      });

      const data = await res.json();
      if (res.ok) {
        toastStore.showToast('Konfigurasi WhatsApp Cloud API berhasil disimpan.');
        // Refetch config to get masked tokens
        void fetchConfig();
      } else {
        toastStore.showToast(data.message || 'Gagal menyimpan konfigurasi.', 'error');
      }
    } catch (err: any) {
      toastStore.showToast('Terjadi kesalahan koneksi server.', 'error');
    } finally {
      saving = false;
    }
  }

  // Test Connection to Meta Graph API
  async function handleTestConnection() {
    testingConnection = true;
    connectionStatus = null;

    try {
      const res = await fetch('/api/whatsapp/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number_id: phoneNumberId,
          access_token: accessToken,
          api_version: apiVersion
        })
      });

      const data = await res.json();
      connectionStatus = {
        tested: true,
        success: data.success,
        message: data.message,
        details: data.details || data.error
      };

      if (data.success) {
        toastStore.showToast('Koneksi WhatsApp API Berhasil!', 'success');
      } else {
        toastStore.showToast(`Koneksi Gagal: ${data.error || 'Periksa kredensial'}`, 'error');
      }
    } catch (err: any) {
      connectionStatus = {
        tested: true,
        success: false,
        message: 'Koneksi gagal. Periksa koneksi internet atau server.',
        details: err.message
      };
      toastStore.showToast('Koneksi gagal diuji.', 'error');
    } finally {
      testingConnection = false;
    }
  }

  // Retry Failed WhatsApp Log
  async function handleRetryLog(logId: string) {
    retryingLogId = logId;
    try {
      const res = await fetch('/api/whatsapp/logs/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: logId })
      });

      const data = await res.json();
      if (res.ok) {
        toastStore.showToast('Pesan WhatsApp berhasil dicoba kirim ulang.');
        void fetchLogs();
      } else {
        toastStore.showToast(data.message || 'Gagal mengirim ulang pesan.', 'error');
      }
    } catch (err) {
      toastStore.showToast('Koneksi server gagal.', 'error');
    } finally {
      retryingLogId = null;
    }
  }

  // Filter and Search logs
  const filteredLogs = $derived(
    logs.filter(log => {
      const matchesSearch = log.recipient.includes(logsSearch) ||
        log.recipientMasked.includes(logsSearch) ||
        (log.messageText && log.messageText.toLowerCase().includes(logsSearch.toLowerCase())) ||
        (log.providerMessageId && log.providerMessageId.includes(logsSearch)) ||
        log.event.toLowerCase().includes(logsSearch.toLowerCase());

      if (logsFilter === 'all') return matchesSearch;
      if (logsFilter === 'inbound') return matchesSearch && log.direction === 'inbound';
      if (logsFilter === 'outbound') return matchesSearch && log.direction === 'outbound';
      return matchesSearch && log.status === logsFilter;
    })
  );

  function getStatusBadgeClass(status: string) {
    switch (status) {
      case 'read':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'delivered':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'sent':
        return 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] border-[var(--color-primary)]/20';
      case 'sending':
        return 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] border-[var(--color-primary)]/20';
      case 'received':
        return 'bg-teal-500/10 text-teal-400 border-teal-500/20';
      case 'failed':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default:
        return 'bg-[var(--color-card)]0/10 text-[var(--color-muted-foreground)] border-zinc-500/20';
    }
  }
</script>

{#if loading}
  <div class="p-8 text-center text-[var(--color-muted-foreground)] flex flex-col items-center justify-center gap-3">
    <RefreshCw class="w-6 h-6 animate-spin text-[var(--color-primary)]" />
    <span>Memuat konfigurasi integrasi...</span>
  </div>
{:else}
  <!-- Tab Navigation -->
  <div class="flex items-center gap-2 border-b border-[var(--color-border)] pb-3 mb-6">
    <button
      onclick={() => activeTab = 'config'}
      class={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold transition shrink-0 ${
        activeTab === 'config'
          ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/30'
          : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-text)] hover:bg-[var(--color-card)]'
      }`}
    >
      <Settings class="w-4 h-4" />
      <span>Konfigurasi API & Template</span>
    </button>
    <button
      onclick={() => activeTab = 'logs'}
      class={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold transition shrink-0 ${
        activeTab === 'logs'
          ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/30'
          : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-text)] hover:bg-[var(--color-card)]'
      }`}
    >
      <History class="w-4 h-4" />
      <span>Log & Status Pengiriman</span>
    </button>
  </div>

  {#if activeTab === 'config'}
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Main Config Form -->
      <div class="lg:col-span-2 space-y-6">
        <form onsubmit={handleSaveConfig} class="space-y-6">
          <Card class="space-y-6">
            <div class="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
              <div>
                <h3 class="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider">Status Integrasi</h3>
                <p class="text-[10px] text-[var(--color-muted-foreground)]">Aktifkan atau nonaktifkan pengiriman WhatsApp otomatis</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  bind:checked={enabled}
                  class="sr-only peer"
                />
                <div class="w-11 h-6 bg-[var(--color-surface)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)] peer-checked:after:bg-white"></div>
              </label>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Phone Number ID"
                bind:value={phoneNumberId}
                placeholder="Contoh: 10582928502..."
                required={enabled}
              />
              <Input
                label="Business Account ID"
                bind:value={businessAccountId}
                placeholder="Contoh: 10472859205..."
              />
            </div>

            <div class="space-y-1">
              <label class="text-[10px] uppercase font-bold tracking-widest text-[var(--color-muted-foreground)]">Access Token (Permanent)</label>
              <div class="relative flex items-center">
                <input
                  type={showToken ? 'text' : 'password'}
                  bind:value={accessToken}
                  placeholder="EAAGxxxxx..."
                  class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)]/70 focus:outline-none rounded-2xl pl-4 pr-10 py-2.5 text-xs text-[var(--color-text)] placeholder-zinc-600 font-mono"
                  required={enabled}
                />
                <button
                  type="button"
                  onclick={() => showToken = !showToken}
                  class="absolute right-3 text-[var(--color-muted-foreground)] hover:text-[var(--color-text)] transition"
                >
                  {#if showToken}
                    <EyeOff class="w-4 h-4" />
                  {:else}
                    <Eye class="w-4 h-4" />
                  {/if}
                </button>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Graph API Version"
                bind:value={apiVersion}
                placeholder="v20.0"
              />
              <div class="space-y-1">
                <label class="text-[10px] uppercase font-bold tracking-widest text-[var(--color-muted-foreground)]">Webhook Verify Token</label>
                <div class="relative flex items-center">
                  <input
                    type={showVerifyToken ? 'text' : 'password'}
                    bind:value={webhookVerifyToken}
                    placeholder="Token verifikasi lokal"
                    class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)]/70 focus:outline-none rounded-2xl pl-4 pr-10 py-2.5 text-xs text-[var(--color-text)] placeholder-zinc-600 font-mono"
                  />
                  <button
                    type="button"
                    onclick={() => showVerifyToken = !showVerifyToken}
                    class="absolute right-3 text-[var(--color-muted-foreground)] hover:text-[var(--color-text)] transition"
                  >
                    {#if showVerifyToken}
                      <EyeOff class="w-4 h-4" />
                    {:else}
                      <Eye class="w-4 h-4" />
                    {/if}
                  </button>
                </div>
              </div>
              <Input
                label="Default Country Code"
                bind:value={defaultCountryCode}
                placeholder="62"
              />
            </div>

            <div class="flex items-center justify-between border-t border-[var(--color-border)] pt-4 bg-[var(--color-card)]/20 -mx-6 -mb-6 p-6 rounded-b-2xl">
              <div class="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="testMode"
                  bind:checked={testMode}
                  class="h-4 w-4 rounded border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] focus:ring-offset-[var(--color-bg)]"
                />
                <label for="testMode" class="text-xs text-[var(--color-text)] select-none cursor-pointer">
                  <strong>Test Mode (Simulasi)</strong> - Simulasikan respons API tanpa memotong kuota Meta API Anda.
                </label>
              </div>
              <Button type="submit" variant="primary" class="shrink-0" disabled={saving}>
                {#if saving}
                  <RefreshCw class="w-4 h-4 animate-spin" />
                {:else}
                  <Send class="w-4 h-4" />
                {/if}
                <span>{saving ? 'Menyimpan...' : 'Simpan Kredensial'}</span>
              </Button>
            </div>
          </Card>

          <!-- Template Mapping Card -->
          <Card class="space-y-6">
            <div>
              <h3 class="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider">Pemetaan Template Meta</h3>
              <p class="text-[10px] text-[var(--color-muted-foreground)]">Hubungkan event CMS internal dengan nama template di WhatsApp Manager Meta</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 divide-y md:divide-y-0 divide-[var(--color-border)]">
              <div class="space-y-4 pt-4 md:pt-0">
                <h4 class="text-xs font-bold text-[var(--color-primary)]">Event Registrasi Online</h4>
                <Input
                  label="Pendaftaran Diajukan (registration_submitted)"
                  bind:value={templates.registration_submitted}
                />
                <Input
                  label="Pendaftaran Dikonfirmasi (registration_confirmed)"
                  bind:value={templates.registration_confirmed}
                />
                <Input
                  label="Pendaftaran Ditolak (registration_rejected)"
                  bind:value={templates.registration_rejected}
                />
              </div>

              <div class="space-y-4 pt-4 md:pt-0">
                <h4 class="text-xs font-bold text-[var(--color-primary)]">Event Antrean Pelayanan</h4>
                <Input
                  label="Antrean Dipanggil (queue_called)"
                  bind:value={templates.queue_called}
                />
                <Input
                  label="Pelayanan Selesai (service_completed)"
                  bind:value={templates.service_completed}
                />
              </div>
            </div>
          </Card>
        </form>
      </div>

      <!-- Connection Test Tool -->
      <div class="space-y-6">
        <Card class="space-y-4">
          <h3 class="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider flex items-center gap-2">
            <Sliders class="w-4 h-4 text-[var(--color-primary)]" />
            <span>Konektivitas Diagnostik</span>
          </h3>
          <p class="text-xs text-[var(--color-muted-foreground)] leading-normal">
            Uji langsung token otorisasi dan validitas Phone Number ID yang dikonfigurasi ke server Meta API.
          </p>

          <div class="space-y-3 pt-2">
            <Button
              onclick={handleTestConnection}
              variant="secondary"
              class="w-full justify-center py-2.5"
              disabled={testingConnection}
            >
              {#if testingConnection}
                <RefreshCw class="w-4 h-4 animate-spin" />
              {:else}
                <ShieldCheck class="w-4 h-4" />
              {/if}
              <span>{testingConnection ? 'Memeriksa Otorisasi...' : 'Uji Koneksi Meta API'}</span>
            </Button>
          </div>

          {#if connectionStatus}
            <div class={`p-4 rounded-2xl border text-xs leading-normal animate-in fade-in space-y-2 ${
              connectionStatus.success
                ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/20 text-[var(--color-primary)]'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
            }`}>
              <div class="font-bold flex items-center gap-1.5">
                {#if connectionStatus.success}
                  <CheckCircle class="w-4 h-4" />
                {:else}
                  <AlertTriangle class="w-4 h-4" />
                {/if}
                <span>{connectionStatus.message}</span>
              </div>
              {#if connectionStatus.details}
                <pre class="p-2.5 bg-black/40 rounded-xl font-mono text-[10px] overflow-x-auto max-h-40 text-[var(--color-muted-foreground)] whitespace-pre-wrap">
                  {typeof connectionStatus.details === 'object'
                    ? JSON.stringify(connectionStatus.details, null, 2)
                    : connectionStatus.details}
                </pre>
              {/if}
            </div>
          {/if}
        </Card>

        <Card class="space-y-4 bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/10">
          <h4 class="text-xs font-bold text-[var(--color-primary)] uppercase tracking-widest flex items-center gap-1.5">
            <AlertTriangle class="w-4 h-4" />
            <span>KEAMANAN PRIVASI MEDIS</span>
          </h4>
          <p class="text-xs text-[var(--color-text)] leading-relaxed">
            Sesuai dengan kebijakan regulasi privasi data nasional, media WhatsApp <strong>TIDAK BOLEH</strong> digunakan untuk mentransmisikan data medis rahasia seperti:
          </p>
          <ul class="text-[11px] text-[var(--color-muted-foreground)] space-y-1 list-disc list-inside">
            <li>Diagnosis klinis & penyakit pasien</li>
            <li>Hasil pemeriksaan laboratorium / penunjang</li>
            <li>Daftar resep obat / rekam medis detail</li>
            <li>Informasi kesehatan pribadi yang sensitif</li>
          </ul>
          <p class="text-[10px] text-[var(--color-primary)] font-semibold leading-normal pt-1">
            Gunakan template notifikasi berupa penunjuk status antrean atau instruksi umum tanpa menyertakan data medis klinis.
          </p>
        </Card>
      </div>
    </div>
  {:else}
    <!-- Logs tab view -->
    <div class="space-y-6">
      <div class="flex flex-col md:flex-row items-center justify-between gap-4">
        <!-- Filter and Search -->
        <div class="relative w-full md:max-w-md">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-muted-foreground)]" />
          <input
            type="text"
            placeholder="Cari berdasarkan nomor penerima atau isi pesan..."
            bind:value={logsSearch}
            class="w-full bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl pl-10 pr-4 py-2.5 text-xs text-[var(--color-text)] placeholder-zinc-500 focus:outline-none focus:border-[var(--color-primary)] transition-colors"
          />
        </div>

        <div class="flex items-center gap-2 w-full md:w-auto overflow-x-auto shrink-0 pb-1 md:pb-0">
          {#each [
            { id: 'all', label: 'Semua Pesan' },
            { id: 'outbound', label: 'Outbound' },
            { id: 'inbound', label: 'Inbound' },
            { id: 'sent', label: 'Sent / Terkirim' },
            { id: 'delivered', label: 'Delivered / Sampai' },
            { id: 'read', label: 'Read / Dibaca' },
            { id: 'failed', label: 'Failed / Gagal' }
          ] as f (f.id)}
            <button
              onclick={() => logsFilter = f.id}
              class={`px-3 py-1.5 rounded-xl text-[11px] font-semibold transition shrink-0 ${
                logsFilter === f.id
                  ? 'bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border)]'
                  : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-text)] hover:bg-[var(--color-card)]'
              }`}
            >
              {f.label}
            </button>
          {/each}
        </div>
      </div>

      <Card class="p-0 overflow-hidden">
        {#if loadingLogs}
          <div class="p-8 text-center text-[var(--color-muted-foreground)] flex flex-col items-center justify-center gap-3">
            <RefreshCw class="w-6 h-6 animate-spin text-[var(--color-primary)]" />
            <span>Memuat catatan log...</span>
          </div>
        {:else if filteredLogs.length === 0}
          <div class="p-12 text-center text-[var(--color-muted-foreground)]">
            Catatan log pengiriman WhatsApp tidak ditemukan.
          </div>
        {:else}
          <div class="overflow-x-auto">
            <table class="w-full text-xs text-left text-[var(--color-text)]">
              <thead class="bg-[var(--color-bg)] text-[10px] font-bold uppercase text-[var(--color-muted-foreground)] border-b border-[var(--color-border)]">
                <tr>
                  <th class="p-4">Tanggal & Waktu</th>
                  <th class="p-4">Penerima</th>
                  <th class="p-4">Arah</th>
                  <th class="p-4">Event & Template</th>
                  <th class="p-4">Isi Pesan</th>
                  <th class="p-4">Status Delivery</th>
                  <th class="p-4">Provider Message ID</th>
                  <th class="p-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[var(--color-border)]">
                {#each filteredLogs as log (log.id)}
                  <tr class="hover:bg-[var(--color-card)]/50 transition-colors">
                    <td class="p-4 whitespace-nowrap text-[var(--color-muted-foreground)] font-mono text-[11px]">
                      {new Date(log.createdAt).toLocaleString('id-ID')}
                    </td>
                    <td class="p-4 font-semibold text-[var(--color-text)] font-mono text-[11px]">
                      {log.recipientMasked}
                    </td>
                    <td class="p-4">
                      <span class={`inline-flex px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase ${
                        log.direction === 'inbound' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                      }`}>
                        {log.direction || 'outbound'}
                      </span>
                    </td>
                    <td class="p-4 whitespace-nowrap">
                      <div class="font-bold text-[var(--color-text)]">{log.event}</div>
                      <div class="text-[10px] text-[var(--color-muted-foreground)] font-mono">{log.template}</div>
                    </td>
                    <td class="p-4 max-w-xs">
                      <div class="truncate text-[var(--color-text)]" title={log.messageText}>
                        {log.messageText}
                      </div>
                    </td>
                    <td class="p-4 whitespace-nowrap">
                      <div class="space-y-1">
                        <span class={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadgeClass(log.status)}`}>
                          {log.status}
                        </span>
                        {#if log.errorCode}
                          <div class="text-[10px] text-rose-400 font-mono">
                            Code {log.errorCode}: {log.errorMessage}
                          </div>
                        {/if}
                      </div>
                    </td>
                    <td class="p-4 font-mono text-[10px] text-[var(--color-muted-foreground)] max-w-[150px] truncate" title={log.providerMessageId}>
                      {log.providerMessageId || '-'}
                    </td>
                    <td class="p-4 text-right whitespace-nowrap">
                      {#if log.status === 'failed' && log.attempts < 3 && log.direction !== 'inbound'}
                        <Button
                          onclick={() => handleRetryLog(log.id)}
                          variant="secondary"
                          class="px-2 py-1 h-auto text-[10px]"
                          disabled={retryingLogId === log.id}
                        >
                          {#if retryingLogId === log.id}
                            <RefreshCw class="w-3 h-3 animate-spin" />
                          {:else}
                            <RefreshCw class="w-3 h-3" />
                          {/if}
                          <span>Retry ({log.attempts}/3)</span>
                        </Button>
                      {/if}
                      {#if log.attempts >= 3 && log.status === 'failed'}
                        <span class="text-[10px] text-[var(--color-muted-foreground)] font-bold flex items-center justify-end gap-1">
                          <BadgeAlert class="w-3.5 h-3.5 text-[var(--color-muted-foreground)]" /> Max Attempt
                        </span>
                      {/if}
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </Card>
    </div>
  {/if}
{/if}
