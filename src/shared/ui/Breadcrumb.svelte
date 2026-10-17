<!--
  @component Navigasi breadcrumb dengan tautan Beranda di awal.
-->
<script lang="ts">
  import { ChevronRight, Home } from 'lucide-svelte';

  export interface BreadcrumbItem {
    label: string;
    href?: string;
  }

  interface Props {
    /** Daftar item breadcrumb setelah Beranda. */
    items: BreadcrumbItem[];
  }

  const { items }: Props = $props();
</script>

<nav aria-label="Breadcrumb" class="py-3 px-6 max-w-7xl mx-auto">
  <ol class="flex items-center gap-2 text-xs text-[var(--color-muted-foreground)] flex-wrap">
    <li>
      <a href="#/" class="flex items-center gap-1 hover:text-[var(--color-primary)] transition">
        <Home class="w-3.5 h-3.5" />
        <span>Beranda</span>
      </a>
    </li>
    {#each items as item, idx (idx)}
      <li class="flex items-center gap-2">
        <ChevronRight class="w-3.5 h-3.5 text-zinc-600" />
        {#if item.href}
          <a href={item.href} class="hover:text-[var(--color-primary)] transition">
            {item.label}
          </a>
        {:else}
          <span class="text-[var(--color-text)] font-semibold">{item.label}</span>
        {/if}
      </li>
    {/each}
  </ol>
</nav>
