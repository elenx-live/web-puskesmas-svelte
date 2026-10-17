<!--
  @component Skeleton placeholder generik untuk state loading.
  Pakai warna skeleton netral (bukan warna kartu) agar terlihat saat animate-pulse.
-->
<script lang="ts">
  interface Props {
    /** Bentuk skeleton: card (grid kartu), list (baris), text (paragraf). */
    variant?: 'card' | 'list' | 'text';
    /** Jumlah item skeleton yang dirender. */
    count?: number;
  }

  const { variant = 'card', count = 6 }: Props = $props();
</script>

{#if variant === 'card'}
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" aria-hidden="true">
    {#each Array(count) as _, idx (idx)}
      <div class="rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 space-y-4 animate-pulse">
        <div class="h-4 rounded-lg bg-slate-300/60 dark:bg-slate-700/60 w-1/3"></div>
        <div class="h-6 rounded-lg bg-slate-300/60 dark:bg-slate-700/60 w-3/4"></div>
        <div class="h-12 rounded-lg bg-slate-300/60 dark:bg-slate-700/60 w-full"></div>
        <div class="h-10 rounded-xl bg-slate-300/60 dark:bg-slate-700/60 w-full"></div>
      </div>
    {/each}
  </div>
{:else if variant === 'list'}
  <div class="space-y-3" aria-hidden="true">
    {#each Array(count) as _, idx (idx)}
      <div class="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 flex items-center gap-4 animate-pulse">
        <div class="w-12 h-12 rounded-xl bg-slate-300/60 dark:bg-slate-700/60 shrink-0"></div>
        <div class="flex-1 space-y-2">
          <div class="h-4 rounded bg-slate-300/60 dark:bg-slate-700/60 w-2/3"></div>
          <div class="h-3 rounded bg-slate-300/60 dark:bg-slate-700/60 w-1/2"></div>
        </div>
      </div>
    {/each}
  </div>
{:else}
  <div class="space-y-3 animate-pulse" aria-hidden="true">
    {#each Array(count) as _, idx (idx)}
      <div class="h-4 rounded bg-slate-300/60 dark:bg-slate-700/60" style="width: {90 - idx * 12}%"></div>
    {/each}
  </div>
{/if}
