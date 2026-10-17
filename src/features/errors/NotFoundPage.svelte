<!--
  @component Halaman 404 — ditampilkan untuk rute yang tidak dikenal.
  Catatan: sudah dibungkus PublicLayout oleh App.svelte.
-->
<script lang="ts">
  import { FileQuestion, ArrowLeft, HeartPulse } from 'lucide-svelte';
</script>

<div class="py-20 px-6 max-w-2xl mx-auto text-center space-y-6">
  <div
    class="w-16 h-16 rounded-3xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-center text-[var(--color-primary)] mx-auto shadow-xl shadow-[var(--color-primary)]/20"
  >
    <FileQuestion class="w-8 h-8 stroke-[2]" />
  </div>

  <div class="space-y-2">
    <h1 class="text-3xl font-light text-[var(--color-text)]">Halaman Tidak Ditemukan</h1>
    <p class="text-sm text-[var(--color-muted-foreground)] max-w-md mx-auto leading-relaxed">
      Halaman tidak ditemukan. Alamat URL yang Anda tuju tidak tersedia, belum dipublikasikan, atau telah dipindahkan.
    </p>
  </div>

  <div class="flex flex-wrap items-center justify-center gap-3 pt-4">
    <a
      href="#/"
      class="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[var(--color-primary)] hover:bg-[var(--color-primary)] text-[var(--color-primary-foreground)] font-bold text-xs transition"
    >
      <ArrowLeft class="w-4 h-4" />
      Kembali ke Beranda
    </a>

    <a
      href="#/layanan"
      class="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] hover:border-[var(--color-primary)]/40 text-[var(--color-primary)] font-bold text-xs transition"
    >
      <HeartPulse class="w-4 h-4 text-[var(--color-primary)]" />
      Lihat Layanan
    </a>
  </div>
</div>
