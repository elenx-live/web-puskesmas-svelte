<!-- @component Halaman admin: Manajemen Notifikasi — konfigurasi templat event, triggers, dan log distribusi notifikasi multi-saluran. -->
<script lang="ts">
  import { onMount } from 'svelte';
  import {
    Bell, Settings, FileText, CheckCircle, AlertTriangle, Search,
    SlidersHorizontal, RefreshCw, ChevronLeft, ChevronRight, Edit2,
    ToggleLeft, ToggleRight, Info, AlertCircle
  } from 'lucide-svelte';
  import Card from '../../../shared/ui/Card.svelte';
  import Button from '../../../shared/ui/Button.svelte';
  import Badge from '../../../shared/ui/Badge.svelte';
  import Input from '../../../shared/ui/Input.svelte';
  import Modal from '../../../shared/ui/Modal.svelte';
  import { notificationService } from '../../../shared/services/notificationService.js';
  import { authStore } from '../../../shared/stores/auth.svelte.js';
  import type { NotificationTemplate, NotificationJob } from '../../../shared/types/index.js';

  const user = $derived(authStore.user);

  let activeSubTab = $state<'templates' | 'logs'>('templates');

  // Templates state
  let templates = $state<NotificationTemplate[]>([]);
  let selectedTemplate = $state<NotificationTemplate | null>(null);
  let isEditingTemplate = $state(false);
  let titleTemplate = $state('');
  let messageTemplate = $state('');
  // Counter untuk me-remount textarea saat variabel disisipkan via tombol (programmatic update).
  let msgKey = $state(0);
  let templateActive = $state(true);

  // Logs state
  let logs = $state<NotificationJob[]>([]);
  let search = $state('');
  let statusFilter = $state('');
  let channelFilter = $state('');
  let typeFilter = $state('');
  let page = $state(1);
  const itemsPerPage = 10;

  // Notification stats
  let stats = $state({ total: 0, sent: 0, failed: 0, pending: 0 });

  function loadData() {
    try {
      // Load templates
      const allTemplates = notificationService.getTemplates();
      templates = allTemplates;

      // Load jobs
      const allJobs = notificationService.getJobs({
        search: search,
        status: statusFilter,
        channel: channelFilter,
        type: typeFilter
      });
      logs = allJobs;

      // Calc stats
      const total = allJobs.length;
      const sent = allJobs.filter(j => j.status === 'sent').length;
      const failed = allJobs.filter(j => j.status === 'failed').length;
      const pending = allJobs.filter(j => j.status === 'pending' || j.status === 'processing').length;
      stats = { total, sent, failed, pending };
    } catch (e) {
      console.error('Failed to load notification configurations:', e);
    }
  }

  onMount(() => {
    loadData();
  });

  $effect(() => {
    search; statusFilter; channelFilter; typeFilter;
    loadData();
  });

  function handleEditTemplateClick(tpl: NotificationTemplate) {
    selectedTemplate = tpl;
    titleTemplate = tpl.titleTemplate;
    messageTemplate = tpl.messageTemplate;
    templateActive = tpl.isActive;
    isEditingTemplate = true;
  }

  function handleSaveTemplate(e: Event) {
    e.preventDefault();
    const u = user;
    if (!selectedTemplate || !u) return;

    // Validate variables
    const varsInMsg = (messageTemplate.match(/\{[^}]+\}/g) || []).map(v => v.slice(1, -1));
    const invalidVars = varsInMsg.filter(v => !selectedTemplate!.variables.includes(v));

    if (invalidVars.length > 0) {
      alert(`Variabel berikut tidak didukung untuk template ini: ${invalidVars.join(', ')}. Variabel yang diperbolehkan: ${selectedTemplate.variables.map(v => `{${v}}`).join(', ')}`);
      return;
    }

    try {
      const actor = { id: u.uid, email: u.email, name: u.displayName };
      notificationService.updateTemplate(selectedTemplate.id, {
        titleTemplate: titleTemplate.trim(),
        messageTemplate: messageTemplate.trim(),
        isActive: templateActive
      }, actor);

      isEditingTemplate = false;
      selectedTemplate = null;
      loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal memperbarui templat.');
    }
  }

  function handleToggleTemplateActive(tpl: NotificationTemplate) {
    const u = user;
    if (!u) return;
    try {
      const actor = { id: u.uid, email: u.email, name: u.displayName };
      notificationService.updateTemplate(tpl.id, {
        isActive: !tpl.isActive
      }, actor);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal mengubah status aktif templat.');
    }
  }

  // Pagination helper
  const totalPages = $derived(Math.ceil(logs.length / itemsPerPage) || 1);
  const paginatedLogs = $derived(logs.slice((page - 1) * itemsPerPage, page * itemsPerPage));

  const eventLabels: Record<string, string> = {
    registration_created: 'Pendaftaran Berhasil',
    registration_verified: 'Pendaftaran Diverifikasi',
    registration_confirmed: 'Pendaftaran Dikonfirmasi',
    registration_rejected: 'Pendaftaran Ditolak',
    registration_cancelled: 'Pendaftaran Dibatalkan',
    queue_created: 'Antrean Dibuat',
    queue_called: 'Antrean Dipanggil',
    queue_recalled: 'Antrean Dipanggil Ulang',
    queue_skipped: 'Antrean Dilewati',
    queue_completed: 'Antrean Selesai',
    complaint_received: 'Pengaduan Diterima',
    complaint_status_changed: 'Status Pengaduan Diubah',
    complaint_completed: 'Pengaduan Selesai'
  };

  function getEventLabel(evt: string): string {
    return eventLabels[evt] || evt;
  }

  function resetFilters() {
    search = '';
    statusFilter = '';
    channelFilter = '';
    typeFilter = '';
    page = 1;
  }

  function closeEditModal() {
    isEditingTemplate = false;
    selectedTemplate = null;
  }
</script>

<div class="space-y-6">
  <!-- Navigation Tabs -->
  <div class="flex border-b border-[var(--color-border)] gap-2 pb-px">
    <button
      onclick={() => { activeSubTab = 'templates'; page = 1; }}
      class={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 ${
        activeSubTab === 'templates'
          ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary)]/5'
          : 'border-transparent text-[var(--color-muted-foreground)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]/10'
      }`}
    >
      <Settings class="w-3.5 h-3.5" />
      <span>Templat Notifikasi</span>
    </button>
    <button
      onclick={() => { activeSubTab = 'logs'; page = 1; }}
      class={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 ${
        activeSubTab === 'logs'
          ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary)]/5'
          : 'border-transparent text-[var(--color-muted-foreground)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]/10'
      }`}
    >
      <FileText class="w-3.5 h-3.5" />
      <span>Log Distribusi Notifikasi</span>
      {#if stats.total > 0}
        <span class="bg-[var(--color-card)] text-[var(--color-text)] text-[10px] px-1.5 py-0.5 rounded-full font-semibold ml-1">
          {stats.total}
        </span>
      {/if}
    </button>
  </div>

  {#if activeSubTab === 'templates'}
    <!-- TEMPLATE LIST TAB -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2 space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-bold text-[var(--color-text)] flex items-center gap-2">
            <Bell class="w-4 h-4 text-[var(--color-primary)]" />
            <span>Daftar Templat Event Notifikasi</span>
          </h3>
          <span class="text-xs text-[var(--color-muted-foreground)] font-medium">Sistem Event Terintegrasi</span>
        </div>

        <div class="grid grid-cols-1 gap-4">
          {#each templates as tpl (tpl.id)}
            <Card class="p-5 border-[var(--color-border)] bg-[var(--color-card)] hover:border-[var(--color-border)] transition space-y-4">
              <div class="flex items-start justify-between gap-4">
                <div class="space-y-1">
                  <div class="flex items-center gap-2">
                    <Badge variant={tpl.isActive ? 'amber' : 'zinc'}>
                      {tpl.event.split('_')[0]}
                    </Badge>
                    <span class="text-xs font-bold text-[var(--color-text)]">{getEventLabel(tpl.event)}</span>
                  </div>
                  <p class="text-[11px] text-[var(--color-muted-foreground)] font-mono">Event ID: {tpl.event}</p>
                </div>

                <div class="flex items-center gap-2">
                  <button
                    onclick={() => handleToggleTemplateActive(tpl)}
                    class="text-[var(--color-muted-foreground)] hover:text-[var(--color-text)] transition"
                    title={tpl.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                  >
                    {#if tpl.isActive}
                      <ToggleRight class="w-6 h-6 text-[var(--color-primary)]" />
                    {:else}
                      <ToggleLeft class="w-6 h-6 text-zinc-600" />
                    {/if}
                  </button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onclick={() => handleEditTemplateClick(tpl)}
                    class="flex items-center gap-1.5 text-xs py-1 px-2.5"
                  >
                    <Edit2 class="w-3 h-3" />
                    <span>Edit</span>
                  </Button>
                </div>
              </div>

              <div class="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-3 space-y-1">
                <span class="text-[10px] text-[var(--color-muted-foreground)] font-bold block">{tpl.titleTemplate}</span>
                <p class="text-xs text-[var(--color-text)] leading-relaxed">{tpl.messageTemplate}</p>
              </div>

              <div class="flex flex-wrap items-center gap-1.5">
                <span class="text-[10px] text-[var(--color-muted-foreground)] font-bold uppercase">Variabel:</span>
                {#each tpl.variables as v}
                  <span class="bg-[var(--color-surface)]/60 border border-[var(--color-border)]/50 text-[var(--color-text)] font-mono text-[10px] px-2 py-0.5 rounded-md">
                    {`{${v}}`}
                  </span>
                {/each}
              </div>
            </Card>
          {/each}
        </div>
      </div>

      <!-- Template Instructions / Preview Side Panel -->
      <div class="space-y-4">
        <h4 class="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider">Panduan Konfigurasi Templat</h4>
        <Card class="p-5 border-[var(--color-border)] bg-[var(--color-card)] space-y-4">
          <div class="flex items-start gap-3">
            <Info class="w-4 h-4 text-[var(--color-primary)] mt-0.5 shrink-0" />
            <div class="space-y-1">
              <h5 class="text-xs font-bold text-[var(--color-text)]">Sistem Variabel Dinamis</h5>
              <p class="text-[11px] text-[var(--color-muted-foreground)] leading-relaxed">
                Gunakan kurung kurawal ganda/tunggal seperti <code class="font-mono text-[var(--color-primary)]">{`{registrationNumber}`}</code> untuk menyisipkan variabel dinamis dari database sistem secara real-time.
              </p>
            </div>
          </div>

          <div class="flex items-start gap-3 border-t border-[var(--color-border)] pt-4">
            <AlertCircle class="w-4 h-4 text-[var(--color-primary)] mt-0.5 shrink-0" />
            <div class="space-y-1">
              <h5 class="text-xs font-bold text-[var(--color-text)]">Keamanan & Sanitasi</h5>
              <p class="text-[11px] text-[var(--color-muted-foreground)] leading-relaxed">
                Sistem melarang keras penyusupan tag HTML mentah atau script asing. Seluruh output disanitasi ketat menggunakan filter sanitasi XSS untuk mencegah bypass RBAC atau serangan injeksi.
              </p>
            </div>
          </div>

          <div class="flex items-start gap-3 border-t border-[var(--color-border)] pt-4">
            <SlidersHorizontal class="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
            <div class="space-y-1">
              <h5 class="text-xs font-bold text-[var(--color-text)]">Abstraksi Multi-Saluran</h5>
              <p class="text-[11px] text-[var(--color-muted-foreground)] leading-relaxed">
                Meskipun saat ini pengiriman difokuskan pada saluran <span class="text-[var(--color-text)] font-bold">In-App</span>, arsitektur backend dirancang modular & siap ditingkatkan untuk WhatsApp API, Email SMTP, maupun SMS Gateway di masa mendatang tanpa memutus alur bisnis utama.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  {:else}
    <!-- DISTRIBUTION LOGS TAB -->
    <div class="space-y-4">
      <!-- Stats Overview -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="bg-[var(--color-card)] border border-[var(--color-border)] p-4 rounded-2xl space-y-1">
          <span class="text-[10px] font-bold text-[var(--color-muted-foreground)] uppercase tracking-wider block">Total Log Kirim</span>
          <div class="text-xl font-black text-[var(--color-text)]">{stats.total}</div>
        </div>
        <div class="bg-[var(--color-card)] border border-[var(--color-border)] p-4 rounded-2xl space-y-1">
          <span class="text-[10px] font-bold text-[var(--color-primary)] uppercase tracking-wider block">Terkirim</span>
          <div class="text-xl font-black text-[var(--color-primary)]">{stats.sent}</div>
        </div>
        <div class="bg-[var(--color-card)] border border-[var(--color-border)] p-4 rounded-2xl space-y-1">
          <span class="text-[10px] font-bold text-red-400 uppercase tracking-wider block">Gagal / Masalah</span>
          <div class="text-xl font-black text-red-400">{stats.failed}</div>
        </div>
        <div class="bg-[var(--color-card)] border border-[var(--color-border)] p-4 rounded-2xl space-y-1">
          <span class="text-[10px] font-bold text-[var(--color-primary)] uppercase tracking-wider block">Dalam Antrean Kerja</span>
          <div class="text-xl font-black text-[var(--color-primary)]">{stats.pending}</div>
        </div>
      </div>

      <!-- Filter and Search Bar -->
      <Card class="p-4 border-[var(--color-border)] bg-[var(--color-card)] flex flex-col md:flex-row items-center gap-4">
        <div class="relative flex-1 w-full">
          <Search class="absolute left-3 top-2.5 h-4 w-4 text-[var(--color-muted-foreground)]" />
          <Input
            placeholder="Cari penerima (NIK/Email/Kode) atau log pesan..."
            bind:value={search}
            class="pl-9 text-xs"
          />
        </div>

        <div class="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            bind:value={statusFilter}
            class="bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)]/70 focus:outline-none rounded-2xl px-4 py-2.5 text-xs text-[var(--color-text)]"
          >
            <option value="">Semua Status</option>
            <option value="sent">Terkirim</option>
            <option value="failed">Gagal</option>
            <option value="pending">Tertunda</option>
            <option value="processing">Diproses</option>
          </select>

          <select
            bind:value={channelFilter}
            class="bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)]/70 focus:outline-none rounded-2xl px-4 py-2.5 text-xs text-[var(--color-text)]"
          >
            <option value="">Semua Saluran</option>
            <option value="in_app">In-App</option>
            <option value="whatsapp">WhatsApp (Deferred)</option>
            <option value="email">Email (Deferred)</option>
            <option value="sms">SMS (Deferred)</option>
          </select>

          <select
            bind:value={typeFilter}
            class="bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)]/70 focus:outline-none rounded-2xl px-4 py-2.5 text-xs text-[var(--color-text)]"
          >
            <option value="">Semua Event</option>
            <option value="registration_created">Pendaftaran Berhasil</option>
            <option value="registration_verified">Pendaftaran Diverifikasi</option>
            <option value="registration_confirmed">Pendaftaran Dikonfirmasi</option>
            <option value="registration_rejected">Pendaftaran Ditolak</option>
            <option value="registration_cancelled">Pendaftaran Dibatalkan</option>
            <option value="queue_called">Antrean Dipanggil</option>
            <option value="queue_recalled">Antrean Dipanggil Ulang</option>
            <option value="queue_skipped">Antrean Dilewati</option>
            <option value="queue_completed">Antrean Selesai</option>
            <option value="complaint_received">Pengaduan Diterima</option>
          </select>

          <Button
            onclick={resetFilters}
            variant="secondary"
            size="sm"
            class="p-2"
            title="Reset Filter"
          >
            <RefreshCw class="w-3.5 h-3.5" />
          </Button>
        </div>
      </Card>

      <!-- Logs Table -->
      <Card class="border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-[var(--color-border)] bg-[var(--color-bg)] text-[10px] font-bold text-[var(--color-muted-foreground)] uppercase tracking-wider">
                <th class="p-4">Waktu</th>
                <th class="p-4">Penerima (Recipient NIK/Email)</th>
                <th class="p-4">Event Trigger</th>
                <th class="p-4">Saluran</th>
                <th class="p-4">Status</th>
                <th class="p-4">Keterangan / Error</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[var(--color-border)] text-xs">
              {#if paginatedLogs.length > 0}
                {#each paginatedLogs as job (job.id)}
                  <tr class="hover:bg-[var(--color-surface)]/10 transition">
                    <td class="p-4 text-[var(--color-muted-foreground)] whitespace-nowrap">
                      {new Date(job.createdAt).toLocaleString('id-ID')}
                    </td>
                    <td class="p-4 font-mono font-semibold text-[var(--color-text)]">
                      {job.recipient.length > 15
                        ? job.recipient.slice(0, 10) + '***' + job.recipient.slice(-4)
                        : job.recipient}
                    </td>
                    <td class="p-4 text-[var(--color-text)]">
                      {getEventLabel(job.type)}
                    </td>
                    <td class="p-4 whitespace-nowrap">
                      {#if job.channel === 'whatsapp'}
                        <Badge variant="emerald">WA (Deferred)</Badge>
                      {:else if job.channel === 'email'}
                        <Badge variant="blue">Email (Deferred)</Badge>
                      {:else if job.channel === 'sms'}
                        <Badge variant="amber">SMS (Deferred)</Badge>
                      {:else}
                        <Badge variant="purple">In-App</Badge>
                      {/if}
                    </td>
                    <td class="p-4 whitespace-nowrap">
                      {#if job.status === 'sent'}
                        <span class="flex items-center gap-1 w-fit"><Badge variant="emerald"><span class="flex items-center gap-1"><CheckCircle class="w-3 h-3" /> Dikirim</span></Badge></span>
                      {:else if job.status === 'failed'}
                        <span class="flex items-center gap-1 w-fit"><Badge variant="red"><span class="flex items-center gap-1"><AlertTriangle class="w-3 h-3" /> Gagal</span></Badge></span>
                      {:else if job.status === 'processing'}
                        <span class="flex items-center gap-1 w-fit animate-pulse"><Badge variant="blue">Diproses</Badge></span>
                      {:else}
                        <span class="flex items-center gap-1 w-fit"><Badge variant="amber">Tertunda</Badge></span>
                      {/if}
                    </td>
                    <td class="p-4 text-[var(--color-muted-foreground)] max-w-xs truncate" title={job.errorMessage || ''}>
                      {job.errorMessage || '-'}
                    </td>
                  </tr>
                {/each}
              {:else}
                <tr>
                  <td colspan={6} class="p-12 text-center text-[var(--color-muted-foreground)] font-medium">
                    Tidak ditemukan log pengiriman notifikasi yang sesuai filter.
                  </td>
                </tr>
              {/if}
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        {#if totalPages > 1}
          <div class="p-4 border-t border-[var(--color-border)] flex items-center justify-between">
            <span class="text-xs text-[var(--color-muted-foreground)]">
              Halaman {page} dari {totalPages} ({logs.length} Log)
            </span>
            <div class="flex items-center gap-1">
              <Button
                onclick={() => (page = Math.max(page - 1, 1))}
                disabled={page === 1}
                variant="secondary"
                size="sm"
                class="p-1.5"
              >
                <ChevronLeft class="w-4 h-4" />
              </Button>
              <Button
                onclick={() => (page = Math.min(page + 1, totalPages))}
                disabled={page === totalPages}
                variant="secondary"
                size="sm"
                class="p-1.5"
              >
                <ChevronRight class="w-4 h-4" />
              </Button>
            </div>
          </div>
        {/if}
      </Card>
    </div>
  {/if}
</div>

<!-- EDIT TEMPLATE MODAL -->
<Modal isOpen={isEditingTemplate && !!selectedTemplate} onClose={closeEditModal} title={`Edit Templat: ${selectedTemplate ? getEventLabel(selectedTemplate.event) : ''}`} size="lg">
  {#if selectedTemplate}
    <form onsubmit={handleSaveTemplate} class="space-y-4">
      <div class="space-y-1.5">
        <label class="text-[11px] font-bold text-[var(--color-muted-foreground)] uppercase tracking-wider block">Judul Notifikasi (Title)</label>
        <Input
          defaultValue={titleTemplate}
          oninput={(e) => (titleTemplate = e.currentTarget.value)}
          placeholder="Masukkan judul default notifikasi"
          required
          class="text-xs"
        />
      </div>

      <div class="space-y-1.5">
        <label class="text-[11px] font-bold text-[var(--color-muted-foreground)] uppercase tracking-wider block">Pesan Notifikasi (Body)</label>
        {#key msgKey}
          <textarea
            oninput={(e) => (messageTemplate = e.currentTarget.value)}
            placeholder="Masukkan template isi pesan notifikasi..."
            required
            rows={4}
            class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl p-3 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]/50"
          >{messageTemplate}</textarea>
        {/key}
      </div>

      <div class="space-y-1.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl p-4">
        <span class="text-[10px] font-bold text-[var(--color-muted-foreground)] block mb-2 uppercase">Variabel Tersedia</span>
        <div class="flex flex-wrap gap-1.5">
          {#each selectedTemplate.variables as v}
            <button
              type="button"
              onclick={() => { messageTemplate = messageTemplate + `{${v}}`; msgKey += 1; }}
              class="bg-[var(--color-surface)] border border-[var(--color-border)]/50 hover:bg-zinc-700 hover:border-zinc-600 text-[var(--color-text)] font-mono text-[10px] px-2 py-0.5 rounded-md transition"
              title="Klik untuk menyisipkan ke kursor"
            >
              {`{${v}}`}
            </button>
          {/each}
        </div>
        <p class="text-[10px] text-[var(--color-muted-foreground)] mt-2">Klik variabel di atas untuk menyisipkan otomatis ke bagian akhir templat pesan.</p>
      </div>

      <div class="flex items-center justify-between pt-2">
        <div class="flex items-center gap-2">
          <button
            type="button"
            onclick={() => (templateActive = !templateActive)}
            class="text-[var(--color-muted-foreground)] hover:text-[var(--color-text)] transition"
          >
            {#if templateActive}
              <ToggleRight class="w-6 h-6 text-[var(--color-primary)]" />
            {:else}
              <ToggleLeft class="w-6 h-6 text-zinc-600" />
            {/if}
          </button>
          <span class="text-xs text-[var(--color-text)] font-semibold">Aktifkan Templat Ini</span>
        </div>
      </div>

      {#snippet footer()}
        <Button type="button" variant="secondary" size="sm" onclick={closeEditModal}>
          Batal
        </Button>
        <Button type="submit" variant="primary" size="sm">
          Simpan Perubahan
        </Button>
      {/snippet}
    </form>
  {/if}
</Modal>
