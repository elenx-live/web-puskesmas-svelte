<!-- @component Halaman Permohonan Informasi Publik PPID — formulir permohonan baru + pelacakan status via nomor tiket. -->
<script lang="ts">
  import { publicInfoService } from '../../shared/services/publicInfoService.js';
  import type { InformationRequestEntity } from '../../shared/types/index.js';
  import { Search, CheckCircle2, AlertCircle } from 'lucide-svelte';
  import { toastStore } from '../../shared/stores/toast.svelte.js';

  let activeTab = $state<'form' | 'tracking'>('form');

  // Form State
  let requesterName = $state('');
  let contact = $state('');
  let informationRequested = $state('');
  let purpose = $state('');
  let desiredFormat = $state<'Email (PDF)' | 'WhatsApp (Dokumen)' | 'Ambil Langsung ke Puskesmas' | 'Lainnya'>('Email (PDF)');
  let submitting = $state(false);
  let successReq = $state<InformationRequestEntity | null>(null);
  let errorMsg = $state('');

  // Tracking State
  let trackingCode = $state('');
  let trackingResult = $state<InformationRequestEntity | null>(null);
  let trackingLoading = $state(false);
  let trackingSearched = $state(false);

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    if (!contact || !informationRequested) {
      errorMsg = 'Mohon lengkapi nomor kontak/email dan rincian informasi yang diminta.';
      return;
    }
    errorMsg = '';
    submitting = true;
    try {
      const newReq = await publicInfoService.addInfoRequest({
        requesterName,
        contact,
        informationRequested,
        purpose,
        desiredFormat
      });
      successReq = newReq;
      toastStore.success('Permohonan informasi berhasil dikirim. Simpan nomor tiket Anda.');
    } catch (e: any) {
      errorMsg = e.message || 'Terjadi kesalahan saat mengajukan permohonan.';
      toastStore.error(errorMsg);
    } finally {
      submitting = false;
    }
  };

  const doTrack = async () => {
    if (!trackingCode.trim()) return;
    trackingLoading = true;
    trackingSearched = true;
    try {
      trackingResult = await publicInfoService.getInfoRequestByTracking(trackingCode);
    } catch (e) {
      console.error(e);
      trackingResult = null;
    } finally {
      trackingLoading = false;
    }
  };

  const handleTrack = async (e: SubmitEvent) => {
    e.preventDefault();
    await doTrack();
  };
</script>

<div class="py-12 px-6 max-w-4xl mx-auto space-y-10">

  <!-- Header -->
  <div class="text-center space-y-3">
    <span class="text-xs font-bold uppercase tracking-widest text-[var(--color-primary)]">Layanan PPID Mandiri</span>
    <h1 class="text-3xl font-light text-[var(--color-text)]">Permohonan Informasi Publik</h1>
    <p class="text-xs text-[var(--color-muted-foreground)] max-w-xl mx-auto">
      Ajukan permohonan informasi resmi atau lacak status permohonan Anda menggunakan nomor tiket unik (INFO-2026-XXXXXX).
    </p>
  </div>

  <!-- Tabs -->
  <div class="flex justify-center gap-2">
    <button
      onclick={() => (activeTab = 'form')}
      class={`px-6 py-2.5 rounded-2xl text-xs font-semibold transition ${
        activeTab === 'form'
          ? 'bg-emerald-600 text-[var(--color-text)] shadow-lg'
          : 'bg-[var(--color-card)] text-[var(--color-muted-foreground)] border border-[var(--color-border)] hover:text-[var(--color-text)]'
      }`}
    >
      Formulir Permohonan Baru
    </button>
    <button
      onclick={() => (activeTab = 'tracking')}
      class={`px-6 py-2.5 rounded-2xl text-xs font-semibold transition ${
        activeTab === 'tracking'
          ? 'bg-emerald-600 text-[var(--color-text)] shadow-lg'
          : 'bg-[var(--color-card)] text-[var(--color-muted-foreground)] border border-[var(--color-border)] hover:text-[var(--color-text)]'
      }`}
    >
      Lacak Permohonan
    </button>
  </div>

  {#if activeTab === 'form'}
    {#if successReq}
      <div class="bg-[var(--color-card)] border border-[var(--color-primary)]/40 rounded-3xl p-8 text-center space-y-6">
        <div class="w-16 h-16 rounded-full bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 flex items-center justify-center text-[var(--color-primary)] mx-auto">
          <CheckCircle2 class="w-8 h-8" />
        </div>
        <div class="space-y-2">
          <h3 class="text-xl font-medium text-[var(--color-text)]">Permohonan Berhasil Disubmit!</h3>
          <p class="text-xs text-[var(--color-muted-foreground)]">Nomor Tiket Permohonan Anda:</p>
          <div class="inline-block px-4 py-2 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-mono font-bold text-lg border border-[var(--color-primary)]/30">
            {successReq.trackingNumber}
          </div>
          <p class="text-xs text-[var(--color-muted-foreground)] pt-2">
            Simpan nomor tiket ini untuk melacak status proses permohonan informasi Anda. Tanggapan akan diberikan dalam jangka waktu sesuai ketentuan SLA.
          </p>
        </div>
        <div class="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onclick={() => { const tn = successReq?.trackingNumber; if (!tn) return; trackingCode = tn; activeTab = 'tracking'; successReq = null; void doTrack(); }}
            class="px-6 py-2.5 rounded-2xl bg-[var(--color-primary)] text-[var(--color-primary-foreground)] text-xs font-bold transition hover:opacity-90"
          >
            Lacak Permohonan Ini
          </button>
          <button
            onclick={() => { successReq = null; informationRequested = ''; purpose = ''; }}
            class="px-6 py-2.5 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] hover:border-[var(--color-primary)]/50 text-[var(--color-text)] text-xs font-medium transition"
          >
            Ajukan Permohonan Lain
          </button>
        </div>
      </div>
    {:else}
      <form onsubmit={handleSubmit} class="bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl p-8 space-y-6 shadow-xl">
        {#if errorMsg}
          <div class="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle class="w-4 h-4 shrink-0" /> {errorMsg}
          </div>
        {/if}

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="space-y-2">
            <label class="text-xs font-medium text-[var(--color-text)]">Nama Lengkap Pemohon</label>
            <input
              type="text"
              placeholder="Contoh: Budi Santoso"
              bind:value={requesterName}
              class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none rounded-2xl px-4 py-3 text-xs text-[var(--color-text)] placeholder-zinc-600"
            />
          </div>

          <div class="space-y-2">
            <label class="text-xs font-medium text-[var(--color-text)]">Kontak (Nomor WhatsApp / Email) <span class="text-[var(--color-primary)]">*</span></label>
            <input
              type="text"
              required
              placeholder="Contoh: 081234567890 / email@domain.com"
              bind:value={contact}
              class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none rounded-2xl px-4 py-3 text-xs text-[var(--color-text)] placeholder-zinc-600"
            />
          </div>
        </div>

        <div class="space-y-2">
          <label class="text-xs font-medium text-[var(--color-text)]">Rincian Informasi yang Diminta <span class="text-[var(--color-primary)]">*</span></label>
          <textarea
            required
            rows={4}
            placeholder="Jelaskan secara spesifik informasi publik atau dokumen apa yang Anda butuhkan..."
            bind:value={informationRequested}
            class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none rounded-2xl p-4 text-xs text-[var(--color-text)] placeholder-zinc-600"
          ></textarea>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="space-y-2">
            <label class="text-xs font-medium text-[var(--color-text)]">Tujuan Penggunaan Informasi</label>
            <input
              type="text"
              placeholder="Contoh: Untuk penelitian / kajian publik / pribadi"
              bind:value={purpose}
              class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none rounded-2xl px-4 py-3 text-xs text-[var(--color-text)] placeholder-zinc-600"
            />
          </div>

          <div class="space-y-2">
            <label class="text-xs font-medium text-[var(--color-text)]">Format Memperoleh Salinan Informasi</label>
            <select
              bind:value={desiredFormat}
              class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none rounded-2xl px-4 py-3 text-xs text-[var(--color-text)]"
            >
              <option value="Email (PDF)">Email (Dokumen PDF)</option>
              <option value="WhatsApp (Dokumen)">WhatsApp (Dokumen)</option>
              <option value="Ambil Langsung ke Puskesmas">Ambil Langsung ke Puskesmas</option>
              <option value="Lainnya">Lainnya</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          class="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-[var(--color-primary)] text-[var(--color-primary-foreground)] font-medium text-xs shadow-lg transition disabled:opacity-50"
        >
          {submitting ? 'Mengirim Permohonan...' : 'Kirim Permohonan Informasi'}
        </button>
      </form>
    {/if}
  {:else}
    <div class="space-y-6">
      <form onsubmit={handleTrack} class="bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl p-6 flex flex-col sm:flex-row gap-3">
        <div class="relative flex-1">
          <Search class="w-4 h-4 text-[var(--color-muted-foreground)] absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Masukkan Nomor Tiket, misal: INFO-2026-104829"
            bind:value={trackingCode}
            class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none rounded-2xl pl-11 pr-4 py-3 text-xs text-[var(--color-text)] placeholder-zinc-600 font-mono uppercase"
          />
        </div>
        <button
          type="submit"
          disabled={trackingLoading}
          class="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-[var(--color-primary)] text-[var(--color-primary-foreground)] font-medium text-xs shadow-lg transition shrink-0"
        >
          {trackingLoading ? 'Mencari...' : 'Lacak Status'}
        </button>
      </form>

      {#if trackingSearched}
        {#if trackingResult}
          <div class="bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl p-8 space-y-6">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-6">
              <div>
                <span class="text-[10px] text-[var(--color-muted-foreground)] font-mono uppercase">Nomor Tiket</span>
                <h3 class="text-xl font-mono font-bold text-[var(--color-text)]">{trackingResult.trackingNumber}</h3>
              </div>
              <span class={`px-3 py-1 rounded-full text-xs font-semibold ${
                trackingResult.status === 'Selesai' ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20' :
                trackingResult.status === 'Ditolak' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                'bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20'
              }`}>
                Status: {trackingResult.status}
              </span>
            </div>

            <div class="space-y-3">
              <h4 class="text-xs font-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">Rincian Permintaan</h4>
              <p class="text-sm text-[var(--color-text)] bg-[var(--color-bg)] p-4 rounded-2xl border border-[var(--color-border)]">
                {trackingResult.informationRequested}
              </p>
            </div>

            {#if trackingResult.publicResponses && trackingResult.publicResponses.length > 0}
              <div class="space-y-3">
                <h4 class="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)]">Tanggapan Resmi PPID</h4>
                {#each trackingResult.publicResponses as resp (resp.id)}
                  <div class="bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/20 rounded-2xl p-4 space-y-1">
                    <p class="text-xs font-semibold text-[var(--color-primary)]">{resp.authorName}</p>
                    <p class="text-xs text-[var(--color-text)] leading-relaxed">{resp.response}</p>
                    <span class="text-[10px] text-[var(--color-muted-foreground)] font-mono">{new Date(resp.createdAt).toLocaleString('id-ID')}</span>
                  </div>
                {/each}
              </div>
            {/if}

            <div class="space-y-3">
              <h4 class="text-xs font-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">Riwayat Proses (Timeline)</h4>
              <div class="space-y-2">
                {#each trackingResult.history as h, i (i)}
                  <div class="flex items-start gap-3 bg-[var(--color-bg)] p-3 rounded-xl border border-[var(--color-border)] text-xs">
                    <div class="w-2 h-2 rounded-full bg-[var(--color-primary)] mt-1.5 shrink-0"></div>
                    <div class="space-y-0.5 flex-1">
                      <div class="flex items-center justify-between">
                        <span class="font-semibold text-[var(--color-text)]">{h.status}</span>
                        <span class="text-[10px] text-[var(--color-muted-foreground)] font-mono">{new Date(h.updatedAt).toLocaleString('id-ID')}</span>
                      </div>
                      <p class="text-[var(--color-muted-foreground)]">{h.notes}</p>
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          </div>
        {:else}
          <div class="p-12 text-center bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl space-y-2">
            <AlertCircle class="w-8 h-8 text-zinc-600 mx-auto" />
            <h3 class="text-[var(--color-text)] font-medium text-sm">Permohonan Tidak Ditemukan</h3>
            <p class="text-xs text-[var(--color-muted-foreground)]">Pastikan nomor tiket permohonan informasi publik yang Anda masukkan sudah benar.</p>
          </div>
        {/if}
      {/if}
    </div>
  {/if}

</div>
