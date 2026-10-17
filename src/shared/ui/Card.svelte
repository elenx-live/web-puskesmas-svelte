<!--
  @component Kartu konten generik dengan border dan radius tema.
-->
<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  import type { Snippet } from 'svelte';

  interface Props extends HTMLAttributes<HTMLDivElement> {
    /** Konten kartu. */
    children?: Snippet;
    /** Handler klik opsional — membuat kartu terlihat bisa diklik. */
    onclick?: (e: MouseEvent) => void;
  }

  const { children, onclick, ...rest }: Props = $props();
</script>

<div
  {...rest}
  onclick={onclick}
  class="bg-[var(--color-card)] border border-[var(--color-border)] theme-radius p-6 transition duration-200 {onclick
    ? 'cursor-pointer hover:border-[var(--color-primary)] hover:shadow-lg'
    : ''} {rest.class ?? ''}"
>
  {@render children?.()}
</div>
