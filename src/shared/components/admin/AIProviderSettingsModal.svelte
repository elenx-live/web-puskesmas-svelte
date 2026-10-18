<!-- @component Modal pengaturan AI Provider — memakai panel pengaturan lengkap (AIProviderSettingsCard). -->
<script lang="ts">
  import Modal from '../../../shared/ui/Modal.svelte';
  import Button from '../../../shared/ui/Button.svelte';
  import AIProviderSettingsCard from '../../../features/admin/components/AIProviderSettingsCard.svelte';
  import type { AIProviderConfig } from '../../../shared/types/index.js';

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

  function handleCardSaved() {
    // Refresh config untuk parent, lalu teruskan callback
    onSaved?.({} as AIProviderConfig);
  }
</script>

<Modal {isOpen} {onClose} title="Pengaturan AI Provider" size="xl">
  {#snippet footer()}
    <Button variant="secondary" onclick={onClose}>Tutup</Button>
  {/snippet}

  <AIProviderSettingsCard onSaved={handleCardSaved} />
</Modal>
