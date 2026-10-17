<!-- @component Placeholder panel pengaturan AI Provider. Konversi penuh dari versi React (810 baris) di luar scope part 1. -->
<script lang="ts">
  import { onMount } from 'svelte';
  import Modal from '../../../shared/ui/Modal.svelte';
  import Button from '../../../shared/ui/Button.svelte';
  import { aiProviderService } from '../../../shared/services/aiProviderService.js';
  import type { AIProviderConfig } from '../../../shared/types/index.js';
  import { Cpu, Info } from 'lucide-svelte';

  interface Props {
    /** Tampilkan modal. */
    isOpen: boolean;
    /** Tab awal: 'text' | 'image'. */
    initialTab?: 'text' | 'image';
    /** Dipanggil saat modal ditutup. */
    onClose: () => void;
    /** Dipanggil setelah konfigurasi disimpan. */
    onSaved?: (config: AIProviderConfig) => void;
  }

  let { isOpen, initialTab = 'text', onClose, onSaved }: Props = $props();

  let activeTab = $state<'text' | 'image'>(initialTab);
  let config = $state<AIProviderConfig | null>(null);

  $effect(() => {
    if (isOpen) {
      activeTab = initialTab;
      loadConfig();
    }
  });

  async function loadConfig() {
    try {
      config = await aiProviderService.getConfig();
    } catch {
      config = null;
    }
  }

  function handleDone() {
    if (config && onSaved) onSaved(config);
    onClose();
  }

  onMount(() => {});
</script>

<Modal {isOpen} {onClose} title="Pengaturan AI Provider" size="lg">
  {#snippet footer()}
    <Button variant="secondary" onclick={onClose}>Tutup</Button>
    <Button variant="primary" onclick={handleDone}>Selesai</Button>
  {/snippet}

  <div class="space-y-4">
    <div class="flex items-center gap-1 bg-[var(--color-bg)] border border-[var(--color-border)] p-0.5 rounded-xl text-xs w-fit">
      <button
        type="button"
        onclick={() => (activeTab = 'text')}
        class={`px-3 py-1.5 rounded-lg font-medium transition ${activeTab === 'text' ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-text)]'}`}
      >
        Provider Teks
      </button>
      <button
        type="button"
        onclick={() => (activeTab = 'image')}
        class={`px-3 py-1.5 rounded-lg font-medium transition ${activeTab === 'image' ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-text)]'}`}
      >
        Provider Gambar
      </button>
    </div>

    <div class="p-4 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl flex items-start gap-3">
      <div class="p-2 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] shrink-0">
        <Cpu class="w-4 h-4" />
      </div>
      <div>
        <p class="text-xs font-bold text-[var(--color-text)]">
          Konfigurasi AI {activeTab === 'text' ? 'Teks' : 'Gambar'} Aktif
        </p>
        <p class="text-xs text-[var(--color-muted-foreground)] mt-1">
          {config?.providerName || 'Google Gemini (Google AI Studio)'}
          <span class="font-mono"> — {config?.model || 'gemini-3.8-flash'}</span>
        </p>
      </div>
    </div>

    <div class="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-600 dark:text-amber-300 flex items-start gap-2.5 text-[11px]">
      <Info class="w-4 h-4 shrink-0 mt-0.5" />
      <span>
        Panel pengaturan lengkap (pilihan provider, API key, uji koneksi) masih dalam tahap konversi ke Svelte.
        Konfigurasi aktif saat ini tetap dipakai oleh fitur impor artikel dan AI Image Studio.
      </span>
    </div>
  </div>
</Modal>
