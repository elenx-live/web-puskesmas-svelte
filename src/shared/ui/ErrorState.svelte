<!--
  @component State error: pesan kesalahan + tombol "Coba lagi".
-->
<script lang="ts">
  import { AlertTriangle } from 'lucide-svelte';
  import Button from './Button.svelte';

  interface Props {
    /** Judul error. */
    title?: string;
    /** Pesan detail error. */
    message?: string;
    /** Handler tombol coba lagi. Jika kosong, tombol tidak tampil. */
    onRetry?: () => void;
    /** Status sedang mencoba ulang (tampilkan spinner). */
    retrying?: boolean;
  }

  const {
    title = 'Gagal memuat data',
    message = 'Terjadi kesalahan saat mengambil data. Periksa koneksi internet Anda lalu coba lagi.',
    onRetry,
    retrying = false,
  }: Props = $props();
</script>

<div class="rounded-3xl border border-red-500/30 bg-red-500/5 p-12 text-center space-y-4 my-8" role="alert">
  <div class="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto">
    <AlertTriangle class="w-6 h-6" />
  </div>
  <div class="space-y-1">
    <h3 class="text-base font-bold text-[var(--color-text)]">{title}</h3>
    <p class="text-xs text-[var(--color-muted-foreground)] max-w-md mx-auto">{message}</p>
  </div>
  {#if onRetry}
    <Button size="sm" variant="outline" onclick={onRetry} disabled={retrying} isLoading={retrying}>
      {#if !retrying}⟳ Coba Lagi{/if}
    </Button>
  {/if}
</div>
