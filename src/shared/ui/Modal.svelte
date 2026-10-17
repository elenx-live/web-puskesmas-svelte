<!--
  @component Modal dialog dengan judul, konten scrollable, dan footer opsional.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { X } from 'lucide-svelte';

  interface Props {
    /** Tampilkan modal. */
    isOpen: boolean;
    /** Dipanggil saat modal ditutup (tombol X / Escape). */
    onClose: () => void;
    /** Judul modal. */
    title: string;
    /** Konten utama modal. */
    children?: Snippet;
    /** Konten footer modal. */
    footer?: Snippet;
    /** Lebar modal. */
    size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl';
  }

  const { isOpen, onClose, title, children, footer, size = 'md' }: Props = $props();

  const sizeClasses: Record<string, string> = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-3xl',
    '2xl': 'max-w-4xl',
    '4xl': 'max-w-6xl',
  };

  let dialogEl = $state<HTMLDivElement | null>(null);

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      onClose();
      return;
    }
    // Focus trap sederhana: Tab berputar di dalam dialog
    if (e.key === 'Tab' && dialogEl) {
      const focusables = dialogEl.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const list = Array.from(focusables).filter((el) => !el.hasAttribute('disabled'));
      if (list.length === 0) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  $effect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Fokus awal ke dialog agar trap langsung aktif
      requestAnimationFrame(() => dialogEl?.focus());
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  });
</script>

{#if isOpen}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
    onclick={onClose}
  >
    <div
      bind:this={dialogEl}
      tabindex="-1"
      class="bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl {sizeClasses[size] ??
        'max-w-lg'} w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
      onclick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div class="flex items-center justify-between p-6 border-b border-[var(--color-border)]">
        <h3 class="text-base font-bold text-[var(--color-text)] tracking-wide">{title}</h3>
        <button
          onclick={onClose}
          class="text-[var(--color-muted-foreground)] hover:text-[var(--color-text)] transition p-1 rounded-xl hover:bg-[var(--color-card)]"
          aria-label="Tutup"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <div class="p-6 max-h-[75vh] overflow-y-auto space-y-4">
        {@render children?.()}
      </div>

      {#if footer}
        <div
          class="flex items-center justify-end gap-3 p-6 border-t border-[var(--color-border)] bg-[var(--color-bg)]/50"
        >
          {@render footer()}
        </div>
      {/if}
    </div>
  </div>
{/if}
