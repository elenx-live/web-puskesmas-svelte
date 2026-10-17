<!-- @component Daftar survei kepuasan masyarakat (SKM) yang aktif — pencarian, bagikan tautan, tampilkan & cetak QR code. -->
<script lang="ts">
  import { surveyService } from '../../shared/services/surveyService.js';
  import type { SurveyEntity } from '../../shared/types/index.js';
  import Card from '../../shared/ui/Card.svelte';
  import Badge from '../../shared/ui/Badge.svelte';
  import { Search, HelpCircle, Calendar, QrCode, ArrowRight, Printer, Share2, ClipboardList } from 'lucide-svelte';
  import { logger } from '../../shared/lib/logger';

  let activeSurveys = $state<SurveyEntity[]>([]);
  let loading = $state(true);
  let searchQuery = $state('');
  let selectedQR = $state<SurveyEntity | null>(null);

  $effect(() => {
    surveyService
      .getActiveSurveys()
      .then((surveys) => {
        activeSurveys = surveys;
        loading = false;
      })
      .catch((err) => {
        console.error('Gagal mengambil daftar survei aktif:', err);
        loading = false;
      });
  });

  const filteredSurveys = $derived(
    activeSurveys.filter(
      (s) =>
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase())),
    ),
  );

  // URL publik survei (hash router) — dipakai untuk QR, cetak, dan bagikan.
  function surveyPublicUrl(survey: SurveyEntity): string {
    return `${window.location.origin}/#/survei/${survey.slug}`;
  }

  function handlePrintQR() {
    if (!selectedQR) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const surveyUrl = surveyPublicUrl(selectedQR);
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(surveyUrl)}`;

    printWindow.document.write(`
      <html>
        <head>
          <title>Cetak QR Code - ${selectedQR.title}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              text-align: center;
              padding: 40px;
              color: #1a1a1a;
            }
            .container {
              max-width: 500px;
              margin: 0 auto;
              border: 2px dashed #ccc;
              padding: 30px;
              border-radius: 20px;
              background-color: #fbfbfb;
            }
            .logo {
              font-size: 24px;
              font-weight: bold;
              color: #f59e0b;
              margin-bottom: 10px;
            }
            h1 {
              font-size: 20px;
              margin-bottom: 20px;
            }
            p {
              font-size: 13px;
              color: #666;
              margin-bottom: 30px;
            }
            img {
              width: 250px;
              height: 250px;
              margin-bottom: 30px;
              border: 1px solid #eee;
              padding: 10px;
              background: #fff;
            }
            .footer {
              font-size: 11px;
              color: #999;
              margin-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">PUSKESMAS</div>
            <h1>PINDAI QR UNTUK MENGISI SURVEI</h1>
            <p>${selectedQR.title}</p>
            <img src="${qrUrl}" alt="QR Code" />
            <p style="font-weight: bold; color: #f59e0b; margin-top: 0;">${surveyUrl}</p>
            <div class="footer">Puskesmas Manding - Layanan Terintegrasi Primer</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          <\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  function handleShare(survey: SurveyEntity) {
    const surveyUrl = surveyPublicUrl(survey);
    if (navigator.share) {
      navigator.share({
        title: survey.title,
        text: survey.description || 'Mari berpartisipasi dalam Survei Kepuasan Masyarakat',
        url: surveyUrl,
      }).catch((err) => logger.warn('Gagal membagikan survei:', err));
    } else {
      navigator.clipboard.writeText(surveyUrl);
      alert('Tautan survei telah disalin ke clipboard!');
    }
  }
</script>

<div class="py-12 px-6 max-w-7xl mx-auto w-full flex-1">

  <!-- Header Section -->
  <div class="text-center max-w-3xl mx-auto mb-12 space-y-4">
    <div class="inline-flex items-center gap-2 px-3 py-1 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-full text-xs font-bold uppercase tracking-wider">
      <ClipboardList class="w-3.5 h-3.5" />
      <span>Kuesioner Masyarakat</span>
    </div>
    <h1 class="text-3xl md:text-4xl font-light text-[var(--color-text)] tracking-tight leading-tight">
      Survei Kepuasan <span class="font-bold text-[var(--color-primary)]">Masyarakat (SKM)</span>
    </h1>
    <p class="text-sm text-[var(--color-muted-foreground)] leading-relaxed">
      Penilaian Anda sangat berharga dalam meningkatkan standar pelayanan di Puskesmas kami. Seluruh tanggapan bersifat rahasia dan digunakan murni untuk evaluasi mutu pelayanan (Permenkes RI No. 19/2024).
    </p>
  </div>

  <!-- Search & Filter Area -->
  <div class="max-w-xl mx-auto mb-10">
    <div class="relative">
      <Search class="w-4 h-4 text-[var(--color-muted-foreground)] absolute left-4 top-1/2 -translate-y-1/2" />
      <input
        type="text"
        placeholder="Cari survei kepuasan aktif..."
        value={searchQuery}
        oninput={(e) => { searchQuery = (e.currentTarget as HTMLInputElement).value; }}
        class="w-full bg-[var(--color-card)] border border-[var(--color-border)] focus:border-[var(--color-primary)]/70 focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] rounded-2xl pl-11 pr-4 py-3 text-xs text-[var(--color-text)] placeholder-zinc-500"
      />
    </div>
  </div>

  <!-- Content Area -->
  {#if loading}
    <div class="flex flex-col items-center justify-center py-20 space-y-4">
      <div class="w-10 h-10 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"></div>
      <span class="text-xs text-[var(--color-muted-foreground)]">Memuat daftar survei kepuasan...</span>
    </div>
  {:else if filteredSurveys.length === 0}
    <Card class="max-w-md mx-auto text-center py-12 px-6 space-y-4 border-dashed">
      <div class="w-12 h-12 bg-[var(--color-surface)]/50 text-[var(--color-muted-foreground)] rounded-2xl flex items-center justify-center mx-auto">
        <HelpCircle class="w-6 h-6" />
      </div>
      <div>
        <h3 class="text-sm font-bold text-[var(--color-text)]">Tidak Ada Survei Aktif</h3>
        <p class="text-xs text-[var(--color-muted-foreground)] mt-1">Saat ini belum ada kuesioner survei kepuasan yang dibuka secara umum.</p>
      </div>
    </Card>
  {:else}
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
      {#each filteredSurveys as survey (survey.id)}
        {@const surveyUrl = `#/survei/${survey.slug}`}
        <Card class="flex flex-col justify-between border border-[var(--color-border)] bg-[var(--color-card)]/50 hover:border-[var(--color-primary)]/30 transition-all p-6 relative overflow-hidden group">
          <div class="space-y-4">
            <div class="flex items-center justify-between flex-wrap gap-2">
              <Badge variant="emerald">Terbuka / Aktif</Badge>
              <span class="text-[10px] text-[var(--color-muted-foreground)] flex items-center gap-1">
                <Calendar class="w-3 h-3 text-[var(--color-primary)]" />
                <span>s.d {new Date(survey.endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </span>
            </div>

            <div class="space-y-2">
              <h2 class="text-base font-bold text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition">
                {survey.title}
              </h2>
              <p class="text-xs text-[var(--color-muted-foreground)] leading-relaxed line-clamp-3">
                {survey.description || 'Berikan feedback Anda mengenai pelayanan untuk terus meningkatkan mutu pelayanan kami.'}
              </p>
            </div>

            {#if survey.isLinkedToRegistration}
              <div class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-lg text-[10px] font-bold">
                <span>* Memerlukan Kode Registrasi</span>
              </div>
            {/if}
          </div>

          <div class="mt-8 pt-4 border-t border-[var(--color-border)] flex items-center justify-between gap-4">
            <div class="flex items-center gap-1">
              <button
                onclick={() => { selectedQR = survey; }}
                class="p-2 text-[var(--color-muted-foreground)] hover:text-[var(--color-primary)] bg-[var(--color-bg)] hover:bg-[var(--color-primary)]/10 border border-[var(--color-border)] rounded-xl transition"
                title="Tampilkan QR Code"
              >
                <QrCode class="w-4 h-4" />
              </button>
              <button
                onclick={() => handleShare(survey)}
                class="p-2 text-[var(--color-muted-foreground)] hover:text-[var(--color-primary)] bg-[var(--color-bg)] hover:bg-[var(--color-primary)]/10 border border-[var(--color-border)] rounded-xl transition"
                title="Bagikan Tautan"
              >
                <Share2 class="w-4 h-4" />
              </button>
            </div>

            <a
              href={surveyUrl}
              class="inline-flex items-center gap-1.5 px-4 py-2 bg-[var(--color-primary)] hover:bg-amber-600 text-[var(--color-primary-foreground)] text-xs font-bold rounded-xl transition-all shadow-md shadow-[var(--color-primary)]/20"
            >
              <span>Mulai Survei</span>
              <ArrowRight class="w-3.5 h-3.5" />
            </a>
          </div>
        </Card>
      {/each}
    </div>
  {/if}

  <!-- QR Code Modal Drawer -->
  {#if selectedQR}
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <Card class="max-w-sm w-full p-6 text-center space-y-6 bg-[var(--color-card)] border border-[var(--color-border)]">
        <div class="flex justify-between items-center pb-3 border-b border-[var(--color-border)]">
          <span class="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider">Tampilkan Kode QR</span>
          <button
            onclick={() => { selectedQR = null; }}
            class="text-[var(--color-muted-foreground)] hover:text-[var(--color-text)] text-xs font-bold"
          >
            Tutup
          </button>
        </div>

        <div class="space-y-2">
          <h3 class="text-sm font-bold text-[var(--color-text)]">{selectedQR.title}</h3>
          <p class="text-[11px] text-[var(--color-muted-foreground)]">Pasien dapat memindai kode ini menggunakan ponsel untuk masuk langsung ke kuesioner.</p>
        </div>

        <div class="bg-white p-4 rounded-2xl inline-block border border-[var(--color-border)] shadow-xl mx-auto">
          <img
            referrerpolicy="no-referrer"
            src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(surveyPublicUrl(selectedQR))}`}
            alt="QR Code"
            class="w-48 h-48 block mx-auto"
          />
        </div>

        <div class="text-xs text-[var(--color-primary)] font-mono select-all">
          {surveyPublicUrl(selectedQR)}
        </div>

        <div class="flex gap-2 pt-2">
          <button
            onclick={() => {
              const url = surveyPublicUrl(selectedQR);
              navigator.clipboard.writeText(url);
              alert('Tautan disalin!');
            }}
            class="flex-1 py-2 bg-[var(--color-bg)] hover:bg-[var(--color-card)] text-[var(--color-text)] text-xs font-semibold rounded-xl border border-[var(--color-border)] transition"
          >
            Salin Tautan
          </button>
          <button
            onclick={handlePrintQR}
            class="flex-1 py-2 bg-[var(--color-primary)] hover:bg-amber-600 text-[var(--color-primary-foreground)] text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5"
          >
            <Printer class="w-3.5 h-3.5" />
            <span>Cetak Brosur QR</span>
          </button>
        </div>
      </Card>
    </div>
  {/if}

</div>
