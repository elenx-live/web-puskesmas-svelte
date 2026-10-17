<!--
  @component Halaman 403 — ditampilkan bila pengguna tidak punya izin akses.
-->
<script lang="ts">
  import { ShieldAlert, ArrowLeft } from 'lucide-svelte';
  import Button from '../../shared/ui/Button.svelte';
  import { navigate } from '../../app/router.svelte.js';
</script>

<div
  class="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] flex flex-col items-center justify-center p-6 text-center"
>
  <div
    class="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-6 shadow-xl shadow-red-500/10"
  >
    <ShieldAlert class="w-8 h-8 stroke-[2]" />
  </div>

  <h1 class="text-3xl font-light mb-2">403 — Akses Ditolak</h1>
  <p class="text-xs text-[var(--color-muted-foreground)] max-w-md mb-8 leading-relaxed">
    Anda tidak memiliki izin (permission) yang cukup untuk mengakses halaman ini. Silakan hubungi Super Admin jika Anda memerlukan akses khusus.
  </p>

  <Button onclick={() => navigate('/admin')} variant="primary">
    <ArrowLeft class="w-4 h-4" />
    Kembali ke Dashboard Admin
  </Button>
</div>
