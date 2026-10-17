<!--
  @component Dropdown select dengan label dan pesan error opsional.
-->
<script lang="ts">
  import type { HTMLSelectAttributes } from 'svelte/elements';

  export interface SelectOption {
    value: string;
    label: string;
  }

  interface NonConflictingProps extends HTMLSelectAttributes {
    onchange?: unknown;
  }

  interface Props extends NonConflictingProps {
    /** Label di atas select. */
    label?: string;
    /** Daftar opsi. */
    options: SelectOption[];
    /** Pesan error validasi. */
    error?: string;
    /** Nilai terpilih (two-way binding). */
    value?: string;
    onchange?: (e: Event & { currentTarget: HTMLSelectElement }) => void;
  }

  let { label, options, error, value = $bindable(''), id, class: className, ...rest }: Props = $props();

  const generatedId = $props.id();
  const selectId = id || generatedId;
</script>

<div class="flex flex-col gap-1.5 w-full">
  {#if label}
    <label
      for={selectId}
      class="text-[10px] uppercase font-bold tracking-widest text-[var(--color-text)] opacity-70"
    >
      {label}
    </label>
  {/if}
  <select
    id={selectId}
    bind:value
    class="bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none theme-button-radius px-4 py-2.5 text-xs text-[var(--color-text)] transition {error
      ? 'border-red-500'
      : ''} {className ?? ''}"
    {...rest}
  >
    {#each options as opt (opt.value)}
      <option value={opt.value} class="bg-[var(--color-card)] text-[var(--color-text)]">
        {opt.label}
      </option>
    {/each}
  </select>
  {#if error}
    <span class="text-[10px] text-red-500 font-medium">{error}</span>
  {/if}
</div>
