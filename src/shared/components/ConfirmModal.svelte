<!--
  @component Modal konfirmasi tindakan destruktif dengan tombol Batal / Ya.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import Modal from '../ui/Modal.svelte';
  import Button from '../ui/Button.svelte';
  import { AlertTriangle } from 'lucide-svelte';

  interface Props {
    /** Tampilkan modal. */
    isOpen: boolean;
    /** Dipanggil saat dibatalkan. */
    onClose: () => void;
    /** Dipanggil saat dikonfirmasi. */
    onConfirm: () => void;
    /** Judul modal. */
    title?: string;
    /** Isi pesan (teks atau snippet). */
    message: string | Snippet;
    /** Label tombol konfirmasi. */
    confirmLabel?: string;
    /** Status loading tombol konfirmasi. */
    isLoading?: boolean;
  }

  const {
    isOpen,
    onClose,
    onConfirm,
    title = 'Konfirmasi Tindakan',
    message,
    confirmLabel = 'Ya, Lanjutkan',
    isLoading = false,
  }: Props = $props();
</script>

<Modal {isOpen} {onClose} {title}>
  {#snippet footer()}
    <Button variant="secondary" onclick={onClose} disabled={isLoading}>Batal</Button>
    <Button variant="danger" onclick={onConfirm} {isLoading}>{confirmLabel}</Button>
  {/snippet}
  <div class="flex items-start gap-4">
    <div
      class="w-10 h-10 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shrink-0"
    >
      <AlertTriangle class="w-5 h-5" />
    </div>
    <div class="text-xs text-[var(--color-text)] leading-relaxed pt-1">
      {#if typeof message === 'string'}
        {message}
      {:else}
        {@render message()}
      {/if}
    </div>
  </div>
</Modal>
