<!--
  @component Wadah render toast — pasang sekali di root aplikasi.
-->
<script lang="ts">
  import { toastStore, toastIcons } from '../stores/toast.svelte.js';

  const { CheckCircle2, AlertCircle, AlertTriangle, X } = toastIcons;
</script>

<div class="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
  {#each toastStore.toasts as toast (toast.id)}
    <div
      class="pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-xl backdrop-blur-md text-xs font-semibold tracking-wide transition-all animate-in slide-in-from-right-5 {toast.type ===
      'success'
        ? 'bg-emerald-950/90 border-[var(--color-primary)]/40 text-emerald-200'
        : toast.type === 'error'
          ? 'bg-red-950/90 border-red-500/40 text-red-200'
          : toast.type === 'warning'
            ? 'bg-amber-950/90 border-[var(--color-primary)]/40 text-[var(--color-primary)]'
            : 'bg-[var(--color-card)]/90 border-[var(--color-border)] text-[var(--color-text)]'}"
    >
      {#if toast.type === 'success'}
        <CheckCircle2 class="w-5 h-5 text-[var(--color-primary)] shrink-0" />
      {:else if toast.type === 'error'}
        <AlertCircle class="w-5 h-5 text-red-400 shrink-0" />
      {:else if toast.type === 'warning'}
        <AlertTriangle class="w-5 h-5 text-[var(--color-primary)] shrink-0" />
      {/if}
      <span class="flex-1 leading-relaxed">{toast.message}</span>
      <button
        onclick={() => toastStore.removeToast(toast.id)}
        class="text-[var(--color-muted-foreground)] hover:text-[var(--color-text)] transition"
        aria-label="Tutup notifikasi"
      >
        <X class="w-4 h-4" />
      </button>
    </div>
  {/each}
</div>
