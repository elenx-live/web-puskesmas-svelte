<!--
  @component Halaman pemberitahuan ketika sebuah fitur dinonaktifkan admin.
-->
<script lang="ts">
  import { AlertCircle, ArrowLeft, Home, Phone, ShieldAlert } from 'lucide-svelte';
  import PublicLayout from '../../shared/layout/PublicLayout.svelte';
  import type { FeatureMetadata } from '../../shared/services/featureFlagsService.js';

  interface Props {
    /** Metadata fitur dari feature flags service. */
    featureMeta?: FeatureMetadata;
    /** Judul kustom (menggantikan default). */
    customTitle?: string;
    /** Pesan kustom (menggantikan default). */
    customMessage?: string;
  }

  const { featureMeta, customTitle, customMessage }: Props = $props();

  const title = $derived(
    customTitle || (featureMeta ? `Layanan ${featureMeta.label} Sedang Dinonaktifkan` : 'Fitur Sedang Dinonaktifkan')
  );
  const message = $derived(
    customMessage ||
      featureMeta?.disabledNotice ||
      'Layanan ini untuk sementara dinonaktifkan oleh administrator Puskesmas. Mohon maaf atas ketidaknyamanannya.'
  );
</script>

<PublicLayout>
  <div class="min-h-[70vh] flex items-center justify-center px-4 py-16">
    <div
      class="max-w-lg w-full bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl p-8 sm:p-10 shadow-xl text-center space-y-6"
    >
      <div
        class="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto"
      >
        <AlertCircle class="w-8 h-8" />
      </div>

      <div class="space-y-2">
        <div
          class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs font-bold uppercase tracking-wider"
        >
          <ShieldAlert class="w-3.5 h-3.5" />
          <span>Status Fitur: Nonaktif</span>
        </div>
        <h1 class="text-xl sm:text-2xl font-bold text-[var(--color-text)] tracking-tight">{title}</h1>
        <p class="text-sm text-[var(--color-muted-foreground)] leading-relaxed max-w-md mx-auto">{message}</p>
      </div>

      <div class="p-4 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] text-left space-y-2">
        <span class="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider block">
          Butuh Bantuan Segera?
        </span>
        <p class="text-xs text-[var(--color-muted-foreground)] leading-relaxed">
          Anda tetap dapat menghubungi staf kami atau datang langsung ke gedung Puskesmas pada jam kerja operasional.
        </p>
        <div class="pt-2 flex flex-wrap gap-2">
          <a
            href="#/kontak"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] text-xs font-semibold text-[var(--color-text)] hover:border-[var(--color-primary)] transition"
          >
            <Phone class="w-3.5 h-3.5 text-[var(--color-primary)]" />
            <span>Saluran Kontak</span>
          </a>
        </div>
      </div>

      <div class="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <button
          onclick={() => window.history.back()}
          class="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-[var(--color-border)] text-xs font-semibold text-[var(--color-text)] hover:bg-[var(--color-bg)] transition flex items-center justify-center gap-2"
        >
          <ArrowLeft class="w-4 h-4" />
          <span>Halaman Sebelumnya</span>
        </button>
        <a
          href="#/"
          class="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-foreground)] text-xs font-bold hover:opacity-90 transition flex items-center justify-center gap-2 shadow-sm"
        >
          <Home class="w-4 h-4" />
          <span>Kembali ke Beranda</span>
        </a>
      </div>
    </div>
  </div>
</PublicLayout>
