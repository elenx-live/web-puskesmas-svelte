<!--
  @component Label status kecil dengan varian warna.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    /** Varian warna badge. */
    variant?: 'primary' | 'amber' | 'emerald' | 'red' | 'zinc' | 'blue' | 'rose' | 'sky' | 'slate' | 'purple';
    /** Ukuran badge. */
    size?: 'sm' | 'md';
    /** Kelas tambahan. */
    class?: string;
    /** Konten badge. */
    children?: Snippet;
  }

  const { variant = 'amber', size = 'md', class: className = '', children }: Props = $props();

  const variantStyles: Record<string, string> = {
    primary: 'bg-[var(--color-primary)] text-[var(--color-text)] border-[var(--color-primary)]',
    amber: 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] border-[var(--color-primary)]/30',
    emerald: 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] border-[var(--color-primary)]/30',
    red: 'bg-red-500/10 text-red-400 border-red-500/30',
    zinc: 'bg-[var(--color-surface)]/60 text-[var(--color-muted-foreground)] border-[var(--color-border)]',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    rose: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    sky: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
    slate: 'bg-slate-800/60 text-slate-400 border-slate-700',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  };

  const sizeStyles: Record<string, string> = {
    sm: 'text-[9px] px-2 py-0.5',
    md: 'text-[10px] px-2.5 py-1',
  };
</script>

<span
  class="inline-flex items-center font-bold uppercase tracking-widest rounded-xl border {variantStyles[variant]} {sizeStyles[size]} {className}"
>
  {@render children?.()}
</span>
