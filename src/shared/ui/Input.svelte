<!--
  @component Input teks dengan label, pesan error, dan teks bantuan opsional.
  Mendukung dua mode:
  - Controlled: `value`/`bind:value` (two-way) — untuk search, filter.
  - Uncontrolled: `defaultValue` — untuk form editor (hindari lag ketikan).
    Nilai awal dari defaultValue, DOM pegang state ketikan, oninput untuk capture.
-->
<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';

  interface Props extends Omit<HTMLInputAttributes, 'oninput' | 'onchange' | 'defaultValue'> {
    /** Label di atas input. */
    label?: string;
    /** Pesan error validasi. */
    error?: string;
    /** Teks bantuan di bawah input. */
    helperText?: string;
    /** Nilai input (controlled). Mendukung bind:value (two-way) maupun value+oninput (one-way). */
    value?: string | number;
    /** Nilai awal (uncontrolled). Jika diisi, input tidak di-control Svelte per keystroke. */
    defaultValue?: string | number;
    oninput?: (e: Event & { currentTarget: HTMLInputElement }) => void;
    onchange?: (e: Event & { currentTarget: HTMLInputElement }) => void;
  }

  let {
    label,
    error,
    helperText,
    value = $bindable(''),
    defaultValue,
    id,
    class: className,
    oninput,
    onchange,
    ...rest
  }: Props = $props();

  const generatedId = $props.id();
  const inputId = id || generatedId;

  // Mode uncontrolled: jangan sync value balik ke DOM per keystroke.
  const isUncontrolled = defaultValue !== undefined;

  // Action untuk set nilai awal sekali saat mount (mode uncontrolled)
  function setInitialValue(node: HTMLInputElement) {
    if (isUncontrolled && defaultValue !== undefined) {
      node.value = String(defaultValue);
    }
  }

  function handleInput(e: Event & { currentTarget: HTMLInputElement }) {
    if (!isUncontrolled) {
      value = e.currentTarget.value;
    }
    oninput?.(e);
  }

  function handleChange(e: Event & { currentTarget: HTMLInputElement }) {
    if (!isUncontrolled) {
      value = e.currentTarget.value;
    }
    onchange?.(e);
  }
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
  {#if isUncontrolled}
    <!-- Uncontrolled: nilai awal di-set sekali via action, DOM pegang state ketikan -->
    <input
      id={inputId}
      use:setInitialValue
      oninput={handleInput}
      onchange={handleChange}
      class="bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] theme-button-radius px-4 py-2.5 text-xs text-[var(--color-text)] placeholder-[var(--color-text)] placeholder-opacity-50 transition {error
        ? 'border-red-500 focus:border-red-500'
        : ''} {className ?? ''}"
      {...rest}
    />
  {:else}
    <input
      id={inputId}
      value={value ?? ''}
      oninput={handleInput}
      onchange={handleChange}
      class="bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] theme-button-radius px-4 py-2.5 text-xs text-[var(--color-text)] placeholder-[var(--color-text)] placeholder-opacity-50 transition {error
        ? 'border-red-500 focus:border-red-500'
        : ''} {className ?? ''}"
      {...rest}
    />
  {/if}
  {#if error}
    <span class="text-[10px] text-red-500 font-medium">{error}</span>
  {/if}
  {#if helperText && !error}
    <span class="text-[10px] text-[var(--color-text)] opacity-50">{helperText}</span>
  {/if}
</div>
