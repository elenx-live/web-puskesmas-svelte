<!--
  @component Penjaga rute admin: alihkan ke login bila belum login,
  tampilkan ForbiddenPage bila izin tidak cukup.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { authStore } from '../stores/auth.svelte.js';
  import ForbiddenPage from '../../features/errors/ForbiddenPage.svelte';

  interface Props {
    /** Kode izin granular yang dibutuhkan (opsional). */
    permission?: string;
    /** Konten yang dilindungi. */
    children: Snippet;
  }

  const { permission, children }: Props = $props();

  $effect(() => {
    if (!authStore.loading && !authStore.user) {
      if (window.location.hash !== '#/login') {
        window.location.replace('#/login');
      }
    }
  });
</script>

{#if authStore.loading}
  <div
    class="min-h-screen bg-[var(--color-bg)] flex flex-col items-center justify-center gap-3 text-[var(--color-muted-foreground)]"
  >
    <div
      class="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"
    ></div>
    <span class="text-xs uppercase font-bold tracking-widest text-[var(--color-muted-foreground)]">
      Memeriksa Akses Keamanan...
    </span>
  </div>
{:else if !authStore.user}
  <div
    class="min-h-screen bg-[var(--color-bg)] flex flex-col items-center justify-center gap-3 text-[var(--color-muted-foreground)]"
  >
    <div
      class="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"
    ></div>
    <span class="text-xs uppercase font-bold tracking-widest text-[var(--color-muted-foreground)]">
      Mengalihkan ke Halaman Login...
    </span>
  </div>
{:else if permission && !authStore.hasPermission(permission)}
  <ForbiddenPage />
{:else}
  {@render children()}
{/if}
