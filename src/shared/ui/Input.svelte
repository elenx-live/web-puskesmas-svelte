<!--
  @component Input teks dengan label, pesan error, dan teks bantuan opsional.
-->
<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';

  interface NonConflictingProps extends HTMLInputAttributes {
    oninput?: unknown;
    onchange?: unknown;
  }

  interface Props extends NonConflictingProps {
    /** Label di atas input. */
    label?: string;
    /** Pesan error validasi. */
    error?: string;
    /** Teks bantuan di bawah input. */
    helperText?: string;
    /** Nilai input (two-way binding). */
    value?: string | number;
    oninput?: (e: Event & { currentTarget: HTMLInputElement }) => void;
    onchange?: (e: Event & { currentTarget: HTMLInputElement }) => void;
  }

  let {
    label,
    error,
    helperText,
    value = $bindable(''),
    id,
    class: className,
    ...rest
  }: Props = $props();

  const generatedId = $props.id();
  const inputId = id || generatedId;
</script>

<div class="flex flex-col gap-1.5 w-full">
  {#if label}
    <label
      for={inputId}
      class="text-[10px] uppercase font-bold tracking-widest text-[var(--color-text)] opacity-70"
    >
      {label}
    </label>
  {/if}
  <input
    id={inputId}
    bind:value
    class="bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] theme-button-radius px-4 py-2.5 text-xs text-[var(--color-text)] placeholder-[var(--color-text)] placeholder-opacity-50 transition {error
      ? 'border-red-500 focus:border-red-500'
      : ''} {className ?? ''}"
    {...rest}
  />
  {#if error}
    <span class="text-[10px] text-red-500 font-medium">{error}</span>
  {/if}
  {#if helperText && !error}
    <span class="text-[10px] text-[var(--color-text)] opacity-50">{helperText}</span>
  {/if}
</div>
