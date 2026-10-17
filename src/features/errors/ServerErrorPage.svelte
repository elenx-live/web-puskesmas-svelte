<!--
  @component Halaman 500 — error server generik dengan tombol coba lagi.
  Catatan: sudah dibungkus PublicLayout oleh App.svelte.
-->
<script lang="ts">
  import { AlertOctagon, RefreshCw, ArrowLeft } from 'lucide-svelte';

  interface Props {
    /** Handler tombol coba lagi. */
    onRetry?: () => void;
    /** Pesan error kustom. */
    message?: string;
  }

  const { onRetry, message }: Props = $props();
</script>

<div class="py-20 px-6 max-w-2xl mx-auto text-center space-y-6">
  <div
    class="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 mx-auto shadow-xl shadow-rose-500/10"
  >
    <AlertOctagon class="w-8 h-8 stroke-[2]" />
  </div>

  <div class="space-y-2">
    <h1 class="text-3xl font-light text-[var(--color-text)]">Maaf, informasi belum dapat ditampilkan.</h1>
    <p class="text-sm text-[var(--color-muted-foreground)] max-w-md mx-auto leading-relaxed">
      {message || 'Terjadi gangguan saat mengambil data atau memproses permintaan Anda. Tim teknis kami telah diberitahu.'}
    </p>
  </div>

  <div class="flex flex-wrap items-center justify-center gap-3 pt-4">
    {#if onRetry}
      <button
        onclick={onRetry}
        class="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[var(--color-primary)] hover:bg-[var(--color-primary)] text-[var(--color-primary-foreground)] font-bold text-xs transition cursor-pointer shadow-lg shadow-[var(--color-primary)]/20"
      >
        <RefreshCw class="w-4 h-4 animate-spin-slow" />
        <span>Coba Lagi</span>
      </button>
    {/if}

    <a
      href="#/"
      class="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] hover:border-[var(--color-primary)]/40 text-[var(--color-primary)] font-bold text-xs transition"
    >
      <ArrowLeft class="w-4 h-4" />
      <span>Kembali ke Beranda</span>
    </a>
  </div>
</div>
