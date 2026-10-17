<!-- @component Halaman detail informasi publik — menerima prop `slug`, menampilkan isi, lampiran, dan riwayat pembaruan. -->
<script lang="ts">
  import { publicInfoService } from '../../shared/services/publicInfoService.js';
  import type { PublicInfoEntity } from '../../shared/types/index.js';
  import { formatSafeHtml } from '../../shared/utils/sanitize.js';
  import { FileText, Calendar, ArrowLeft, Download } from 'lucide-svelte';

  let { slug = '' }: { slug?: string } = $props();

  let info = $state<PublicInfoEntity | null>(null);
  let loading = $state(true);

  $effect(() => {
    const currentSlug = slug;
    const loadInfo = async () => {
      loading = true;
      try {
        info = await publicInfoService.getPublicInfoBySlug(currentSlug);
      } catch (e) {
        console.error(e);
      } finally {
        loading = false;
      }
    };
    loadInfo();
  });
</script>

{#if loading}
  <div class="py-20 text-center text-[var(--color-muted-foreground)] font-mono text-sm">Memuat rincian informasi...</div>
{:else if !info}
  <div class="py-20 text-center space-y-4 max-w-md mx-auto px-6">
    <h1 class="text-xl font-bold text-[var(--color-text)]">Informasi Tidak Ditemukan</h1>
    <p class="text-xs text-[var(--color-muted-foreground)]">Informasi publik yang Anda cari mungkin telah diarsipkan atau tautan tidak valid.</p>
    <a href="#/informasi-publik" class="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-600 text-white text-xs font-medium">
      <ArrowLeft class="w-4 h-4" /> Kembali ke Pusat Informasi
    </a>
  </div>
{:else}
  <div class="py-12 px-6 max-w-4xl mx-auto space-y-8">

    <a href="#/informasi-publik" class="inline-flex items-center gap-2 text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-text)] transition">
      <ArrowLeft class="w-4 h-4" /> Kembali ke Daftar Informasi Publik
    </a>

    <div class="space-y-4 border-b border-[var(--color-border)] pb-6">
      <div class="flex items-center gap-3 flex-wrap">
        <span class="px-3 py-1 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20 text-xs font-semibold">
          {info.category}
        </span>
        <span class="text-xs text-[var(--color-muted-foreground)] flex items-center gap-1 font-mono">
          <Calendar class="w-3.5 h-3.5" />
          Dipublikasikan: {new Date(info.publicationDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
        </span>
      </div>

      <h1 class="text-2xl md:text-3xl font-light text-[var(--color-text)] leading-snug">
        {info.title}
      </h1>

      <p class="text-sm text-[var(--color-text)] font-medium leading-relaxed bg-[var(--color-card)] p-4 rounded-2xl border border-[var(--color-border)]">
        {info.summary}
      </p>
    </div>

    <!-- Content Body -->
    <div class="html-safe-content max-w-none text-sm text-[var(--color-text)] leading-relaxed space-y-4">
      {@html formatSafeHtml(info.content)}
    </div>

    <!-- Attachment if any -->
    {#if info.attachment}
      <div class="bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl p-6 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-2xl bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)] border border-[var(--color-primary)]/20">
            <FileText class="w-6 h-6" />
          </div>
          <div>
            <h4 class="text-sm font-medium text-[var(--color-text)]">{info.attachment.fileName}</h4>
            <p class="text-[10px] text-[var(--color-muted-foreground)] font-mono">Dokumen Lampiran Resmi • PPID Puskesmas</p>
          </div>
        </div>
        <a
          href={info.attachment.fileUrl}
          target="_blank"
          rel="noreferrer"
          class="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-[var(--color-primary)] text-[var(--color-primary-foreground)] text-xs font-medium transition flex items-center gap-2"
        >
          <Download class="w-4 h-4" /> Unduh Berkas
        </a>
      </div>
    {/if}

    <div class="pt-6 border-t border-[var(--color-border)] flex items-center justify-between text-xs text-[var(--color-muted-foreground)] font-mono">
      <span>Periode Pembaruan: {info.updatePeriod || 'Berkala'}</span>
      <span>Terakhir Ditinjau: {new Date(info.lastUpdatedDate || info.updatedAt).toLocaleDateString('id-ID')}</span>
    </div>

  </div>
{/if}
