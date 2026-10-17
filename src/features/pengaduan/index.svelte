<!-- @component Portal Pengaduan & Aspirasi Masyarakat: formulir penyampaian + cek status tiket (dari KritikSaranPage). -->
<script lang="ts">
  import { complaintService, type CreateComplaintInput } from '../../shared/services/complaintService.js';
  import { serviceEngineService } from '../../shared/services/serviceEngineService.js';
  import type { ServiceEntity, ComplaintType, ComplaintEntity, ComplaintStatus } from '../../shared/types/index.js';
  import Card from '../../shared/ui/Card.svelte';
  import Badge from '../../shared/ui/Badge.svelte';
  import {
    MessageSquare, Send, CheckCircle2, Copy, AlertCircle,
    Upload, Paperclip, X, ShieldCheck, UserX, FileText, Search, Clock,
    Star, ShieldAlert, ArrowRight, MessageCircle
  } from 'lucide-svelte';

  interface Props {
    /** Tab awal yang ditampilkan. */
    defaultTab?: 'form' | 'tracking';
  }
  let { defaultTab = 'form' }: Props = $props();

  let services = $state<ServiceEntity[]>([]);
  let categories = $state<string[]>([]);
  let enabledTypes = $state<ComplaintType[]>([]);
  let activeTab = $state<'form' | 'tracking'>(defaultTab);

  // Form State
  let type = $state<ComplaintType>('pengaduan');
  let title = $state('');
  let category = $state('');
  let isAnonymous = $state(false);
  let senderName = $state('');
  let senderEmail = $state('');
  let senderPhone = $state('');
  let serviceId = $state('');
  let unitId = $state('');
  let locationName = $state('');
  let occurrenceDate = $state('');
  let content = $state('');
  let consentChecked = $state(false);

  // Attachment State
  let attachmentFile = $state<{ fileName: string; fileUrl: string; fileSize: number; mimeType: string } | null>(null);
  let uploadError = $state('');

  // UI status
  let isSubmitting = $state(false);
  let errorMessage = $state('');
  let submittedData = $state<ComplaintEntity | null>(null);
  let copied = $state(false);

  // Ticket Search State
  let searchTicket = $state('');
  let searchedResult = $state<any>(undefined);
  let isSearching = $state(false);

  // Satisfaction Rating in Tracking View State
  let userRating = $state<number>(5);
  let userComment = $state('');
  let ratingSubmitted = $state(false);
  let ratingError = $state('');
  let isSubmittingRating = $state(false);

  const todayMax = new Date().toISOString().split('T')[0];

  function getHashTicketParam(): string | null {
    try {
      const h = window.location.hash || '';
      const qIdx = h.indexOf('?');
      if (qIdx < 0) return null;
      return new URLSearchParams(h.slice(qIdx + 1)).get('ticket');
    } catch {
      return null;
    }
  }

  async function handleSearchTicket(ticketCode: string) {
    isSearching = true;
    ratingSubmitted = false;
    try {
      const res = await complaintService.getComplaintByTicketNumber(ticketCode);
      searchedResult = res;
    } catch {
      searchedResult = null;
    } finally {
      isSearching = false;
    }
  }

  $effect(() => {
    // Load services, categories, and enabled types
    Promise.all([
      serviceEngineService.getPublishedServices(),
      Promise.resolve(complaintService.getCategories()),
      Promise.resolve(complaintService.getEnabledTypes())
    ]).then(([srvs, cats, types]) => {
      services = srvs;
      categories = cats;
      enabledTypes = types;
      if (types.length > 0 && !types.includes(type)) {
        type = types[0];
      }
    }).catch(err => {
      console.error('Failed to load page config:', err);
    });

    // Check hash query params for ticket auto-search
    const ticketParam = getHashTicketParam();
    if (ticketParam) {
      searchTicket = ticketParam;
      activeTab = 'tracking';
      void handleSearchTicket(ticketParam);
    }
    return () => {};
  });

  function handleFileUpload(e: Event) {
    uploadError = '';
    const file = (e.currentTarget as HTMLInputElement).files?.[0];
    if (!file) return;

    // Check size limit (5MB)
    if (file.size > 5 * 1024 * 1024) {
      uploadError = 'Ukuran berkas melebihi batas maksimal 5 MB.';
      return;
    }

    // Check extension
    const forbiddenExts = ['.exe', '.bat', '.sh', '.msi', '.cmd', '.vbs', '.js', '.php'];
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (forbiddenExts.includes(ext)) {
      uploadError = 'Tipe berkas executable tidak diizinkan.';
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      attachmentFile = {
        fileName: file.name,
        fileUrl: result,
        fileSize: file.size,
        mimeType: file.type
      };
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    errorMessage = '';

    if (!title.trim() || title.trim().length < 5) {
      errorMessage = 'Judul penyampaian minimal 5 karakter.';
      return;
    }

    if (!content.trim() || content.trim().length < 10) {
      errorMessage = 'Isi penyampaian minimal 10 karakter.';
      return;
    }

    if (content.length > 2000) {
      errorMessage = 'Isi penyampaian melebihi batas 2000 karakter.';
      return;
    }

    if (!consentChecked) {
      errorMessage = 'Anda harus menyetujui syarat pemrosesan data untuk melanjutkan.';
      return;
    }

    isSubmitting = true;

    // Resolve unit name if any
    let selectedUnitName = '';
    if (unitId) {
      const u = services.find(s => s.id === unitId);
      if (u) selectedUnitName = u.name;
    }

    try {
      const payload: CreateComplaintInput = {
        type,
        title: title.trim(),
        isAnonymous,
        senderName: isAnonymous ? '' : senderName.trim(),
        senderEmail: isAnonymous ? '' : senderEmail.trim(),
        senderPhone: isAnonymous ? '' : senderPhone.trim(),
        serviceId: serviceId || undefined,
        unitId: unitId || undefined,
        unitName: selectedUnitName || undefined,
        locationId: locationName ? 'custom' : undefined,
        locationName: locationName ? locationName.trim() : undefined,
        category: category || 'Lainnya',
        occurrenceDate: occurrenceDate || undefined,
        content: content.trim(),
        attachment: attachmentFile || undefined
      };

      const result = await complaintService.createComplaint(payload);
      submittedData = result;
    } catch (err: any) {
      errorMessage = err.message || 'Gagal mengirim pengaduan. Sila coba kembali.';
    } finally {
      isSubmitting = false;
    }
  }

  function handleResetForm() {
    submittedData = null;
    title = '';
    content = '';
    senderName = '';
    senderEmail = '';
    senderPhone = '';
    isAnonymous = false;
    serviceId = '';
    unitId = '';
    locationName = '';
    occurrenceDate = '';
    category = '';
    attachmentFile = null;
    errorMessage = '';
    consentChecked = false;
    type = enabledTypes[0] || 'pengaduan';
  }

  function handleCopyTicket(ticket: string) {
    navigator.clipboard.writeText(ticket);
    copied = true;
    setTimeout(() => copied = false, 2000);
  }

  function handleSearchTicketSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (!searchTicket.trim()) return;
    void handleSearchTicket(searchTicket.trim());
  }

  async function handleSatisfactionSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (!searchedResult) return;
    ratingError = '';
    isSubmittingRating = true;

    try {
      await complaintService.submitSatisfactionSurvey(
        searchedResult.id,
        userRating,
        userComment.trim()
      );
      ratingSubmitted = true;
      // Refresh local view
      searchedResult = {
        ...searchedResult,
        satisfactionRating: userRating,
        satisfactionComment: userComment.trim()
      };
    } catch (err: any) {
      ratingError = err.message || 'Gagal mengirimkan penilaian.';
    } finally {
      isSubmittingRating = false;
    }
  }

  function getTypeLabelText(t: ComplaintType): string {
    switch (t) {
      case 'pengaduan': return 'Pengaduan';
      case 'kritik': return 'Kritik';
      case 'saran': return 'Saran';
      case 'apresiasi': return 'Apresiasi';
      case 'informasi': return 'Permintaan Informasi';
      default: return t;
    }
  }

  function typeBadgeVariant(t: ComplaintType): 'rose' | 'amber' | 'sky' | 'emerald' | 'purple' | 'zinc' {
    switch (t) {
      case 'pengaduan': return 'rose';
      case 'kritik': return 'amber';
      case 'saran': return 'sky';
      case 'apresiasi': return 'emerald';
      case 'informasi': return 'purple';
      default: return 'zinc';
    }
  }

  function statusBadgeVariant(st: ComplaintStatus): 'sky' | 'purple' | 'blue' | 'amber' | 'zinc' | 'emerald' | 'rose' {
    switch (st) {
      case 'new': return 'sky';
      case 'verified': return 'purple';
      case 'assigned': return 'blue';
      case 'processing': return 'amber';
      case 'pending_info': return 'zinc';
      case 'completed': return 'emerald';
      case 'closed': return 'zinc';
      case 'rejected': return 'rose';
      default: return 'zinc';
    }
  }

  function statusBadgeLabel(st: ComplaintStatus): string {
    switch (st) {
      case 'new': return 'Diterima';
      case 'verified': return 'Diverifikasi';
      case 'assigned': return 'Ditugaskan';
      case 'processing': return 'Diproses';
      case 'pending_info': return 'Menunggu Info';
      case 'completed': return 'Selesai';
      case 'closed': return 'Ditutup';
      case 'rejected': return 'Ditolak';
      default: return st;
    }
  }

  function getStatusLabel(st: ComplaintStatus): string {
    switch (st) {
      case 'new': return 'Laporan berhasil diterima dan masuk antrean verifikasi tim pengaduan.';
      case 'verified': return 'Laporan telah divalidasi dan dikonfirmasi keabsahannya oleh tim verifikator.';
      case 'assigned': return 'Laporan telah didelegasikan ke unit penanggung jawab terkait.';
      case 'processing': return 'Unit pelaksana sedang melakukan tindakan perbaikan / proses tindak lanjut.';
      case 'pending_info': return 'Petugas memerlukan informasi tambahan dari pelapor. Mohon hubungi kami.';
      case 'completed': return 'Penanganan laporan telah selesai diselesaikan dan divalidasi.';
      case 'closed': return 'Laporan telah ditutup secara resmi.';
      case 'rejected': return 'Laporan ditolak / tidak memenuhi kriteria penanganan pengaduan masyarakat.';
      default: return st;
    }
  }

  const typeOptions = [
    { id: 'pengaduan', label: 'Pengaduan', desc: 'Keluhan layanan' },
    { id: 'kritik', label: 'Kritik', desc: 'Evaluasi kritis' },
    { id: 'saran', label: 'Saran', desc: 'Usul perbaikan' },
    { id: 'apresiasi', label: 'Apresiasi', desc: 'Pujian / terima kasih' },
    { id: 'informasi', label: 'Informasi', desc: 'Permohonan info' }
  ];

  function ratingLabel(r: number): string {
    return r === 5 ? 'Sangat Puas' :
           r === 4 ? 'Puas' :
           r === 3 ? 'Cukup' :
           r === 2 ? 'Kurang Puas' : 'Sangat Kecewa';
  }
</script>

<!-- Header Banner -->
<section class="bg-gradient-to-b from-[#16191F] to-[#0B0D11] border-b border-[var(--color-border)] py-12 px-6">
  <div class="max-w-4xl mx-auto text-center space-y-4">
    <Badge variant="amber">Layanan Publik & Transparansi</Badge>
    <h1 class="text-3xl sm:text-4xl font-bold text-[var(--color-text)] tracking-tight">
      Portal Pengaduan & Aspirasi Masyarakat
    </h1>
    <p class="text-sm text-[var(--color-muted-foreground)] max-w-2xl mx-auto leading-relaxed">
      Sampaikan pengaduan, kritik, saran, apresiasi, maupun permintaan informasi secara aman. Setiap laporan diproses berdasarkan standar operasional (SLA) demi perbaikan mutu pelayanan kami.
    </p>

    <!-- Navigation Sub-Tabs -->
    <div class="pt-4 flex items-center justify-center gap-3">
      <button
        onclick={() => activeTab = 'form'}
        class={`px-5 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 ${
          activeTab === 'form'
            ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow-lg shadow-[var(--color-primary)]/20'
            : 'bg-[var(--color-card)] text-[var(--color-muted-foreground)] hover:text-[var(--color-text)] border border-[var(--color-border)]'
        }`}
      >
        <Send class="w-4 h-4" />
        <span>Formulir Penyampaian</span>
      </button>
      <button
        onclick={() => activeTab = 'tracking'}
        class={`px-5 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 ${
          activeTab === 'tracking'
            ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow-lg shadow-[var(--color-primary)]/20'
            : 'bg-[var(--color-card)] text-[var(--color-muted-foreground)] hover:text-[var(--color-text)] border border-[var(--color-border)]'
        }`}
      >
        <Search class="w-4 h-4" />
        <span>Cek Status Tiket</span>
      </button>
    </div>
  </div>
</section>

<!-- Main Content Area -->
<section class="py-12 px-6 max-w-4xl mx-auto flex-1 w-full">
  {#if activeTab === 'tracking'}
    <!-- TICKET TRACKING SEARCH VIEW -->
    <div class="space-y-6">
      <Card class="p-6 sm:p-8 space-y-6">
        <div>
          <h2 class="text-lg font-bold text-[var(--color-text)] flex items-center gap-2">
            <Search class="w-5 h-5 text-[var(--color-primary)]" />
            Pencarian Status Tiket Pengaduan
          </h2>
          <p class="text-xs text-[var(--color-muted-foreground)] mt-1">
            Masukkan nomor tiket unik Anda (contoh: <code class="text-[var(--color-primary)]">ADU-2026-000001</code>) untuk memeriksa progres penanganan.
          </p>
        </div>

        <form onsubmit={handleSearchTicketSubmit} class="flex gap-3">
          <input
            type="text"
            value={searchTicket}
            oninput={(e) => searchTicket = e.currentTarget.value}
            placeholder="Masukkan Nomor Tiket (ADU-2026-XXXXXX)"
            class="flex-1 bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)]/70 focus:outline-none rounded-2xl px-4 py-3 text-xs text-[var(--color-text)] font-mono uppercase tracking-wider text-center"
          />
          <button
            type="submit"
            disabled={isSearching || !searchTicket.trim()}
            class="px-6 py-3 bg-[var(--color-primary)] text-[var(--color-primary-foreground)] font-bold text-xs rounded-2xl hover:bg-[var(--color-primary)] disabled:opacity-50 transition shrink-0 flex items-center gap-2"
          >
            <Search class="w-4 h-4" />
            <span>{isSearching ? 'Mencari...' : 'Cari Tiket'}</span>
          </button>
        </form>

        <!-- Search Result Display -->
        {#if searchedResult !== undefined}
          <div class="pt-4 border-t border-[var(--color-border)]">
            {#if searchedResult === null}
              <div class="p-6 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-center space-y-2">
                <AlertCircle class="w-8 h-8 text-rose-400 mx-auto" />
                <div class="text-xs font-bold text-rose-300">Tiket Tidak Ditemukan</div>
                <p class="text-xs text-[var(--color-muted-foreground)]">
                  Nomor tiket <code class="text-[var(--color-text)] font-mono">{searchTicket}</code> tidak terdaftar dalam database pengaduan. Mohon periksa kembali penulisan nomor tiket Anda.
                </p>
              </div>
            {:else}
              <div class="space-y-6">
                <div class="p-6 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl space-y-4">
                  <div class="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[var(--color-border)]">
                    <div>
                      <span class="text-[10px] uppercase font-bold text-[var(--color-muted-foreground)] block">Nomor Tiket</span>
                      <span class="text-lg font-bold font-mono text-[var(--color-primary)]">{searchedResult.ticketNumber}</span>
                    </div>
                    <div class="flex items-center gap-2">
                      <Badge variant={typeBadgeVariant(searchedResult.type)}>{getTypeLabelText(searchedResult.type)}</Badge>
                      <Badge variant={statusBadgeVariant(searchedResult.status)}>{statusBadgeLabel(searchedResult.status)}</Badge>
                    </div>
                  </div>

                  <!-- DUPLICATE WARNING -->
                  {#if searchedResult.isDuplicate}
                    <div class="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-start gap-3">
                      <ShieldAlert class="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                      <div class="space-y-1">
                        <p class="font-bold">Laporan Terdeteksi Duplikat</p>
                        <p class="leading-relaxed">
                          Laporan ini terdeteksi memiliki esensi yang sama dengan laporan sebelumnya. Penanganan laporan Anda digabungkan pada tiket utama pelapor dengan nomor: <span class="font-mono font-bold text-[var(--color-primary)]">{searchedResult.duplicateOfTicket || 'Utama'}</span>. Sila simpan nomor tiket utama tersebut untuk memantau penyelesaiannya.
                        </p>
                      </div>
                    </div>
                  {/if}

                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span class="text-[var(--color-muted-foreground)] block text-[10px] uppercase font-bold">Judul Laporan</span>
                      <span class="text-[var(--color-text)] font-bold text-sm">
                        {searchedResult.title || 'Laporan Tanpa Judul'}
                      </span>
                    </div>

                    <div>
                      <span class="text-[var(--color-muted-foreground)] block text-[10px] uppercase font-bold">Tanggal Kirim</span>
                      <span class="text-[var(--color-text)] font-medium">
                        {new Date(searchedResult.createdAt).toLocaleDateString('id-ID', {
                          day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                        })} WIB
                      </span>
                    </div>

                    <div>
                      <span class="text-[var(--color-muted-foreground)] block text-[10px] uppercase font-bold">Kategori</span>
                      <span class="text-[var(--color-text)] font-medium">{searchedResult.category || 'Lainnya'}</span>
                    </div>

                    <div>
                      <span class="text-[var(--color-muted-foreground)] block text-[10px] uppercase font-bold">Layanan Terkait</span>
                      <span class="text-[var(--color-text)] font-medium">{searchedResult.serviceName || 'Tidak terkait layanan tertentu'}</span>
                    </div>

                    {#if searchedResult.unitName}
                      <div>
                        <span class="text-[var(--color-muted-foreground)] block text-[10px] uppercase font-bold">Unit Pelayanan</span>
                        <span class="text-[var(--color-text)] font-medium">{searchedResult.unitName}</span>
                      </div>
                    {/if}

                    {#if searchedResult.locationName}
                      <div>
                        <span class="text-[var(--color-muted-foreground)] block text-[10px] uppercase font-bold">Lokasi / Ruangan</span>
                        <span class="text-[var(--color-text)] font-medium">{searchedResult.locationName}</span>
                      </div>
                    {/if}

                    {#if searchedResult.occurrenceDate}
                      <div>
                        <span class="text-[var(--color-muted-foreground)] block text-[10px] uppercase font-bold">Tanggal Kejadian</span>
                        <span class="text-[var(--color-text)] font-medium">
                          {new Date(searchedResult.occurrenceDate).toLocaleDateString('id-ID', {
                            day: 'numeric', month: 'long', year: 'numeric'
                          })}
                        </span>
                      </div>
                    {/if}
                  </div>

                  <div class="space-y-1 text-xs border-t border-[var(--color-border)] pt-4">
                    <span class="text-[var(--color-muted-foreground)] block text-[10px] uppercase font-bold">Isi Penyampaian</span>
                    <div class="p-4 bg-[var(--color-card)] rounded-xl text-[var(--color-text)] leading-relaxed italic border border-[var(--color-border)]">
                      "{searchedResult.content}"
                    </div>
                  </div>

                  <!-- SLA INDICATORS -->
                  {#if searchedResult.status !== 'completed' && searchedResult.status !== 'closed' && searchedResult.status !== 'rejected' && searchedResult.targetResolutionTime}
                    <div class="p-4 bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl space-y-2 text-xs">
                      <span class="text-[10px] font-bold uppercase text-[var(--color-muted-foreground)] tracking-wider flex items-center gap-1.5">
                        <Clock class="w-3.5 h-3.5 text-[var(--color-primary)]" /> Standar Batas Waktu Layanan (SLA)
                      </span>
                      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[var(--color-muted-foreground)]">
                        <div>
                          <span class="block text-[10px] text-[var(--color-muted-foreground)]">Estimasi Tanggapan Awal</span>
                          <span class="text-[var(--color-text)] font-medium">
                            {new Date(searchedResult.targetResponseTime).toLocaleDateString('id-ID', {
                              day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <div>
                          <span class="block text-[10px] text-[var(--color-muted-foreground)]">Estimasi Selesai Solusi</span>
                          <span class="text-[var(--color-text)] font-medium">
                            {new Date(searchedResult.targetResolutionTime).toLocaleDateString('id-ID', {
                              day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                      <!-- OVERDUE WARNER -->
                      {#if new Date().getTime() > new Date(searchedResult.targetResolutionTime).getTime()}
                        <div class="pt-2 flex items-center gap-2 text-rose-400 font-bold text-[11px]">
                          <ShieldAlert class="w-4 h-4 shrink-0" />
                          <span>Melewati batas waktu SLA penanganan. Prioritas dinaikkan ke eskalasi internal.</span>
                        </div>
                      {/if}
                    </div>
                  {/if}

                  <div class="p-4 bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 rounded-xl space-y-1">
                    <span class="text-[10px] font-bold uppercase text-[var(--color-primary)] tracking-wider flex items-center gap-1.5">
                      <Clock class="w-3.5 h-3.5" /> Status Pelaksanaan
                    </span>
                    <p class="text-xs text-[var(--color-text)]">{getStatusLabel(searchedResult.status)}</p>
                  </div>
                </div>

                <!-- PUBLIC RESPONSES LOG (TIMELINE OF ACTIONS) -->
                {#if searchedResult.publicResponses && searchedResult.publicResponses.length > 0}
                  <div class="space-y-3">
                    <h3 class="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)] flex items-center gap-1.5">
                      <MessageCircle class="w-4 h-4" /> Tanggapan & Klarifikasi Resmi Petugas
                    </h3>
                    <div class="space-y-3">
                      {#each searchedResult.publicResponses as res (res.id)}
                        <div class="p-4 bg-gradient-to-r from-amber-500/5 to-transparent border-l-2 border-[var(--color-primary)] bg-[var(--color-bg)] rounded-r-xl space-y-1 text-xs">
                          <div class="flex items-center justify-between text-[10px]">
                            <span class="font-bold text-[var(--color-primary)]">{res.authorName} (Petugas Puskesmas)</span>
                            <span class="text-[var(--color-muted-foreground)]">
                              {new Date(res.createdAt).toLocaleDateString('id-ID', {
                                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                              })} WIB
                            </span>
                          </div>
                          <p class="text-[var(--color-text)] leading-relaxed font-sans">{res.response}</p>
                        </div>
                      {/each}
                    </div>
                  </div>
                {/if}

                <!-- SATISFACTION EVALUATION FOR RESOLVED COMPLAINTS -->
                {#if searchedResult.status === 'completed' || searchedResult.status === 'closed'}
                  <Card class="p-6 border border-[var(--color-primary)]/20 bg-gradient-to-b from-[#16191F] to-[#0B0D11] space-y-4">
                    <div class="flex items-center gap-3">
                      <Star class="w-6 h-6 text-[var(--color-primary)] fill-[var(--color-primary)]" />
                      <div>
                        <h3 class="text-sm font-bold text-[var(--color-text)]">Evaluasi Kepuasan Penanganan</h3>
                        <p class="text-[11px] text-[var(--color-muted-foreground)]">Bagaimana penilaian Anda terhadap kualitas solusi dan kecepatan tim kami?</p>
                      </div>
                    </div>

                    {#if searchedResult.satisfactionRating}
                      <div class="p-4 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl space-y-2">
                        <div class="flex items-center gap-1">
                          {#each [1, 2, 3, 4, 5] as star (star)}
                            <Star
                              class={`w-4 h-4 ${star <= (searchedResult.satisfactionRating || 0) ? 'text-[var(--color-primary)] fill-[var(--color-primary)]' : 'text-zinc-700'}`}
                            />
                          {/each}
                          <span class="text-xs font-bold text-[var(--color-primary)] ml-1">Terima Kasih atas Penilaian Anda</span>
                        </div>
                        {#if searchedResult.satisfactionComment}
                          <p class="text-xs text-[var(--color-muted-foreground)] italic">"{searchedResult.satisfactionComment}"</p>
                        {/if}
                      </div>
                    {:else}
                      <form onsubmit={handleSatisfactionSubmit} class="space-y-4 pt-2">
                        {#if ratingError}
                          <div class="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-[11px]">
                            {ratingError}
                          </div>
                        {/if}

                        <div>
                          <label class="text-[10px] font-bold text-[var(--color-muted-foreground)] uppercase tracking-wider block mb-2">Nilai Penanganan (1-5 Bintang)</label>
                          <div class="flex items-center gap-2">
                            {#each [1, 2, 3, 4, 5] as star (star)}
                              <button
                                type="button"
                                onclick={() => userRating = star}
                                class="p-1 text-[var(--color-muted-foreground)] hover:text-[var(--color-primary)] transition"
                              >
                                <Star class={`w-8 h-8 transition-all ${star <= userRating ? 'text-[var(--color-primary)] fill-[var(--color-primary)] scale-110' : 'text-zinc-600'}`} />
                              </button>
                            {/each}
                            <span class="text-xs font-bold text-[var(--color-text)] ml-2">
                              {ratingLabel(userRating)}
                            </span>
                          </div>
                        </div>

                        <div>
                          <label class="text-[10px] font-bold text-[var(--color-muted-foreground)] uppercase tracking-wider block mb-1">Catatan Tambahan / Review</label>
                          <textarea
                            rows={2}
                            value={userComment}
                            oninput={(e) => userComment = e.currentTarget.value}
                            placeholder="Masukan atau saran Anda terkait proses tindak lanjut ini..."
                            class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)]/70 focus:outline-none rounded-xl p-3 text-xs text-[var(--color-text)]"
                          ></textarea>
                        </div>

                        <button
                          type="submit"
                          disabled={isSubmittingRating}
                          class="px-5 py-2.5 bg-[var(--color-primary)] text-[var(--color-primary-foreground)] font-bold text-xs rounded-xl hover:bg-[var(--color-primary)] transition flex items-center gap-1.5"
                        >
                          {isSubmittingRating ? 'Mengirim...' : 'Kirim Ulasan Layanan'}
                          <ArrowRight class="w-3.5 h-3.5" />
                        </button>
                      </form>
                    {/if}
                  </Card>
                {/if}
              </div>
            {/if}
          </div>
        {/if}
      </Card>
    </div>
  {:else if submittedData}
    <!-- SUCCESS CONFIRMATION VIEW -->
    <Card class="p-8 space-y-6 text-center border border-[var(--color-primary)]/30 bg-gradient-to-b from-[#16191F] to-[#0B0D11]">
      <div class="w-16 h-16 bg-[var(--color-primary)]/20 text-[var(--color-primary)] rounded-full flex items-center justify-center mx-auto border border-[var(--color-primary)]/40 shadow-xl shadow-emerald-500/10">
        <CheckCircle2 class="w-8 h-8" />
      </div>

      <div class="space-y-2">
        <h2 class="text-2xl font-bold text-[var(--color-text)]">Laporan Berhasil Terdaftar</h2>
        <p class="text-xs text-[var(--color-muted-foreground)] max-w-lg mx-auto">
          Terima kasih. Laporan Anda telah tersimpan secara resmi dalam sistem manajemen pengaduan internal Puskesmas.
        </p>
      </div>

      <!-- Ticket Card Box -->
      <div class="p-6 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-3xl max-w-md mx-auto space-y-4 text-left shadow-2xl">
        <div class="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
          <span class="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">Nomor Tiket Anda</span>
          <Badge variant={typeBadgeVariant(submittedData.type)}>{getTypeLabelText(submittedData.type)}</Badge>
        </div>

        <div class="flex items-center justify-between gap-2">
          <span class="text-2xl font-mono font-bold text-[var(--color-primary)] tracking-wider">
            {submittedData.ticketNumber}
          </span>
          <button
            onclick={() => submittedData && handleCopyTicket(submittedData.ticketNumber)}
            class="p-2.5 bg-[var(--color-card)] hover:bg-[var(--color-card)] text-[var(--color-text)] hover:text-[var(--color-text)] rounded-2xl border border-[var(--color-border)] transition flex items-center gap-1 text-xs font-semibold"
            title="Salin Nomor Tiket"
          >
            <Copy class="w-4 h-4" />
            <span>{copied ? 'Tersalin!' : 'Salin'}</span>
          </button>
        </div>

        <div class="space-y-2 text-xs text-[var(--color-muted-foreground)] border-t border-[var(--color-border)] pt-3">
          <div class="flex justify-between">
            <span>Judul Laporan:</span>
            <span class="text-[var(--color-text)] truncate font-semibold max-w-[200px]">
              {submittedData.title}
            </span>
          </div>
          <div class="flex justify-between">
            <span>Waktu Kirim:</span>
            <span class="text-[var(--color-text)] font-mono">
              {new Date(submittedData.createdAt).toLocaleDateString('id-ID', {
                day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
              })} WIB
            </span>
          </div>
          <div class="flex justify-between">
            <span>Sifat Pengirim:</span>
            <span class="text-[var(--color-primary)] font-semibold">
              {submittedData.isAnonymous ? 'Anonim (Rahasia)' : 'Teridentifikasi'}
            </span>
          </div>
        </div>
      </div>

      <div class="p-4 bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl text-xs text-[var(--color-muted-foreground)] text-left max-w-md mx-auto flex items-start gap-3">
        <ShieldCheck class="w-5 h-5 text-[var(--color-primary)] shrink-0 mt-0.5" />
        <p class="leading-relaxed">
          Simpan nomor tiket ini dengan aman. Sila gunakan menu <strong>Cek Status Tiket</strong> untuk memantau respons, perkembangan pelaksanaan solusi, maupun memberikan umpan balik kepuasan penanganan.
        </p>
      </div>

      <div class="pt-2">
        <button
          onclick={handleResetForm}
          class="px-6 py-3 bg-[var(--color-primary)] text-[var(--color-primary-foreground)] font-bold text-xs rounded-2xl hover:bg-[var(--color-primary)] transition"
        >
          Kirim Penyampaian Lainnya
        </button>
      </div>
    </Card>
  {:else}
    <!-- FORM VIEW -->
    <Card class="p-6 sm:p-8 space-y-6">
      <form onsubmit={handleSubmit} class="space-y-6">

        <!-- Error Alert -->
        {#if errorMessage}
          <div class="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs text-rose-300 flex items-start gap-3">
            <AlertCircle class="w-5 h-5 text-rose-400 shrink-0" />
            <div class="leading-relaxed">{errorMessage}</div>
          </div>
        {/if}

        <!-- 1. Jenis Penyampaian -->
        <div class="space-y-3">
          <label class="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)] block">
            1. Jenis Penyampaian Laporan <span class="text-rose-400">*</span>
          </label>
          <div class="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {#each typeOptions as item (item.id)}
              {@const isDisabled = enabledTypes.length > 0 && !enabledTypes.includes(item.id as ComplaintType)}
              <button
                type="button"
                disabled={isDisabled}
                onclick={() => type = item.id as ComplaintType}
                class={`p-3 rounded-xl border text-left transition ${
                  isDisabled ? 'opacity-30 cursor-not-allowed bg-[var(--color-card)] border-zinc-950 text-zinc-600' :
                  type === item.id
                    ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)] text-[var(--color-primary)] font-bold'
                    : 'bg-[var(--color-bg)] border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:text-[var(--color-text)] hover:border-[var(--color-border)]'
                }`}
              >
                <div class="text-xs font-bold truncate">{item.label}</div>
                <div class="text-[9px] text-[var(--color-muted-foreground)] mt-0.5 truncate">{item.desc}</div>
              </button>
            {/each}
          </div>
        </div>

        <!-- Title Input -->
        <div class="space-y-2">
          <label class="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)] block">
            2. Judul Penyampaian <span class="text-rose-400">*</span>
          </label>
          <input
            type="text"
            value={title}
            oninput={(e) => title = e.currentTarget.value}
            placeholder="Ringkasan singkat laporan (contoh: Antrean loket terlalu lama)"
            class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)]/70 focus:outline-none rounded-2xl p-3 text-xs text-[var(--color-text)]"
          />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <!-- 3. Kategori -->
          <div class="space-y-2">
            <label class="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)] block">
              3. Kategori Laporan
            </label>
            <select
              value={category}
              onchange={(e) => category = e.currentTarget.value}
              class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)]/70 focus:outline-none rounded-2xl p-3 text-xs text-[var(--color-text)]"
            >
              <option value="">-- Pilih Kategori --</option>
              {#each categories as cat (cat)}
                <option value={cat}>{cat}</option>
              {/each}
            </select>
          </div>

          <!-- 4. Layanan Terkait -->
          <div class="space-y-2">
            <label class="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)] block">
              4. Layanan Terkait
            </label>
            <select
              value={serviceId}
              onchange={(e) => serviceId = e.currentTarget.value}
              class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)]/70 focus:outline-none rounded-2xl p-3 text-xs text-[var(--color-text)]"
            >
              <option value="">-- Tidak terkait layanan tertentu --</option>
              {#each services as srv (srv.id)}
                <option value={srv.id}>
                  {srv.name}
                </option>
              {/each}
            </select>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <!-- Unit Pelayanan -->
          <div class="space-y-2">
            <label class="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)] block">
              5. Unit Pelayanan / Poliklinik
            </label>
            <select
              value={unitId}
              onchange={(e) => unitId = e.currentTarget.value}
              class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)]/70 focus:outline-none rounded-2xl p-3 text-xs text-[var(--color-text)]"
            >
              <option value="">-- Pilih Unit / Poli (Opsional) --</option>
              {#each services as srv (srv.id)}
                <option value={srv.id}>
                  {srv.name}
                </option>
              {/each}
            </select>
          </div>

          <!-- Lokasi / Ruangan -->
          <div class="space-y-2">
            <label class="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)] block">
              6. Lokasi / Ruangan Spesifik
            </label>
            <input
              type="text"
              value={locationName}
              oninput={(e) => locationName = e.currentTarget.value}
              placeholder="contoh: Ruang Tunggu Apotek"
              class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)]/70 focus:outline-none rounded-2xl p-3 text-xs text-[var(--color-text)]"
            />
          </div>

          <!-- Tanggal Kejadian -->
          <div class="space-y-2">
            <label class="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)] block">
              7. Tanggal Kejadian
            </label>
            <input
              type="date"
              value={occurrenceDate}
              oninput={(e) => occurrenceDate = e.currentTarget.value}
              max={todayMax}
              class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)]/70 focus:outline-none rounded-2xl p-2.5 text-xs text-[var(--color-text)]"
            />
          </div>
        </div>

        <!-- 8. Pengirim & Anonim Options -->
        <div class="space-y-4 p-5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl">
          <div class="flex items-center justify-between flex-wrap gap-2">
            <span class="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)] flex items-center gap-1.5">
              <FileText class="w-4 h-4" /> 8. Identitas Pengirim
            </span>

            <!-- Anonymous Switch Toggle -->
            <label class="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[var(--color-text)] hover:text-[var(--color-text)]">
              <input
                type="checkbox"
                checked={isAnonymous}
                onchange={(e) => isAnonymous = e.currentTarget.checked}
                class="w-4 h-4 rounded border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] focus:ring-offset-0"
              />
              <span class="flex items-center gap-1">
                <UserX class="w-3.5 h-3.5 text-[var(--color-primary)]" />
                Kirim secara Anonim (Rahasia)
              </span>
            </label>
          </div>

          {#if isAnonymous}
            <div class="p-3 bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 rounded-xl text-xs text-[var(--color-primary)] flex items-center gap-2">
              <ShieldCheck class="w-4 h-4 shrink-0" />
              <span>Identitas Anda disembunyikan penuh. Petugas tidak akan melihat nama, email, maupun nomor WhatsApp Anda demi jaminan perlindungan pelapor.</span>
            </div>
          {:else}
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div>
                <label class="text-[10px] font-bold text-[var(--color-muted-foreground)] block mb-1">Nama Lengkap (Opsional)</label>
                <input
                  type="text"
                  value={senderName}
                  oninput={(e) => senderName = e.currentTarget.value}
                  placeholder="Nama Lengkap Anda"
                  class="w-full bg-[var(--color-card)] border border-[var(--color-border)] focus:border-[var(--color-primary)]/70 focus:outline-none rounded-xl p-2.5 text-xs text-[var(--color-text)]"
                />
              </div>
              <div>
                <label class="text-[10px] font-bold text-[var(--color-muted-foreground)] block mb-1">Alamat Email (Opsional)</label>
                <input
                  type="email"
                  value={senderEmail}
                  oninput={(e) => senderEmail = e.currentTarget.value}
                  placeholder="contoh@email.com"
                  class="w-full bg-[var(--color-card)] border border-[var(--color-border)] focus:border-[var(--color-primary)]/70 focus:outline-none rounded-xl p-2.5 text-xs text-[var(--color-text)]"
                />
              </div>
              <div>
                <label class="text-[10px] font-bold text-[var(--color-muted-foreground)] block mb-1">No. HP / WhatsApp (Opsional)</label>
                <input
                  type="tel"
                  value={senderPhone}
                  oninput={(e) => senderPhone = e.currentTarget.value}
                  placeholder="0812xxxxxxx"
                  class="w-full bg-[var(--color-card)] border border-[var(--color-border)] focus:border-[var(--color-primary)]/70 focus:outline-none rounded-xl p-2.5 text-xs text-[var(--color-text)]"
                />
              </div>
            </div>
          {/if}
        </div>

        <!-- 9. Isi Penyampaian -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <label class="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)] block">
              9. Isi Kritik / Saran / Pengaduan <span class="text-rose-400">*</span>
            </label>
            <span class={`text-[10px] ${content.length > 2000 ? 'text-rose-400 font-bold' : 'text-[var(--color-muted-foreground)]'}`}>
              {content.length} / 2000 Karakter
            </span>
          </div>
          <textarea
            rows={6}
            value={content}
            oninput={(e) => content = e.currentTarget.value}
            placeholder="Jelaskan secara rinci kronologi kejadian, saran konkret, keluhan, atau apresiasi Anda..."
            class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)]/70 focus:outline-none rounded-2xl p-4 text-xs text-[var(--color-text)] leading-relaxed"
          ></textarea>
        </div>

        <!-- 10. Lampiran Berkas (Optional) -->
        <div class="space-y-2">
          <label class="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)] block">
            10. Lampiran Bukti Pendukung (Opsional)
          </label>

          {#if attachmentFile}
            <div class="flex items-center justify-between p-3 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl">
              <div class="flex items-center gap-3 truncate">
                <Paperclip class="w-4 h-4 text-[var(--color-primary)] shrink-0" />
                <span class="text-xs font-mono text-[var(--color-text)] truncate">{attachmentFile.fileName}</span>
                <span class="text-[10px] text-[var(--color-muted-foreground)] shrink-0">
                  ({Math.round(attachmentFile.fileSize / 1024)} KB)
                </span>
              </div>
              <button
                type="button"
                onclick={() => attachmentFile = null}
                class="p-1 text-[var(--color-muted-foreground)] hover:text-rose-400 transition"
              >
                <X class="w-4 h-4" />
              </button>
            </div>
          {:else}
            <div>
              <label class="flex items-center justify-center gap-2 p-4 bg-[var(--color-bg)] border border-dashed border-[var(--color-border)] hover:border-[var(--color-primary)]/50 rounded-2xl cursor-pointer text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-text)] transition">
                <Upload class="w-4 h-4 text-[var(--color-primary)]" />
                <span>Pilih berkas lampiran pendukung (JPG, PNG, PDF, DOCX, Maks. 5 MB)</span>
                <input
                  type="file"
                  accept="image/*,.pdf,.doc,.docx"
                  onchange={handleFileUpload}
                  class="hidden"
                />
              </label>
            </div>
          {/if}

          {#if uploadError}
            <p class="text-[10px] text-rose-400 font-semibold">{uploadError}</p>
          {/if}
        </div>

        <!-- Consent Policy and Verification Checkbox -->
        <div class="p-4 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl space-y-3">
          <label class="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={consentChecked}
              onchange={(e) => consentChecked = e.currentTarget.checked}
              class="w-4 h-4 rounded border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] focus:ring-offset-0 mt-0.5"
            />
            <span class="text-xs text-[var(--color-muted-foreground)] leading-relaxed">
              Saya menyatakan bahwa seluruh informasi dan data laporan yang dikirimkan adalah benar, tidak mengandung fitnah/SARA/kebencian, dan memberikan persetujuan kepada tim Puskesmas Manding untuk memproses data laporan ini demi peningkatan mutu pelayanan publik. <span class="text-rose-400">*</span>
            </span>
          </label>
        </div>

        <!-- Submit Button -->
        <div class="pt-4 border-t border-[var(--color-border)] flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting || !content.trim() || content.trim().length < 10 || !title.trim() || !consentChecked}
            class="px-8 py-3.5 bg-[var(--color-primary)] text-[var(--color-primary-foreground)] font-bold text-xs rounded-2xl hover:bg-[var(--color-primary)] disabled:opacity-50 transition shadow-lg shadow-[var(--color-primary)]/20 flex items-center gap-2"
          >
            <Send class="w-4 h-4" />
            <span>{isSubmitting ? 'Mengirim...' : 'Kirim Pengaduan Publik'}</span>
          </button>
        </div>

      </form>
    </Card>
  {/if}
</section>
