<!--
  @component State kosong: ilustrasi ikon + judul + deskripsi + tombol aksi opsional.
-->
<script lang="ts">
  import { Inbox, type Icon as LucideIcon } from 'lucide-svelte';
  import Button from './Button.svelte';

  interface Props {
    /** Komponen ikon lucide. */
    icon?: typeof LucideIcon;
    /** Judul utama. */
    title: string;
    /** Deskripsi pendukung. */
    description?: string;
    /** Label tombol aksi (opsional). */
    actionLabel?: string;
    /** Handler tombol aksi (opsional). */
    onAction?: () => void;
  }

  const {
    icon = Inbox,
    title,
    description = '',
    actionLabel = '',
    onAction,
  }: Props = $props();

  const Icon = $derived(icon);
</script>

<div class="rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] p-12 text-center space-y-4 my-8">
  <div class="w-12 h-12 rounded-2xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 text-[var(--color-primary)] flex items-center justify-center mx-auto">
    <Icon class="w-6 h-6" />
  </div>
  <div class="space-y-1">
    <h3 class="text-base font-bold text-[var(--color-text)]">{title}</h3>
    {#if description}
      <p class="text-xs text-[var(--color-muted-foreground)] max-w-md mx-auto">{description}</p>
    {/if}
  </div>
  {#if actionLabel && onAction}
    <Button size="sm" onclick={onAction}>{actionLabel}</Button>
  {/if}
</div>
