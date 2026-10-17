<!-- @component Halaman Maklumat Pelayanan — pernyataan komitmen mutu & integritas pimpinan dan pegawai Puskesmas. -->
<script lang="ts">
  import { ShieldCheck, Award } from 'lucide-svelte';

  const PILAR = [
    {
      title: 'Standar Pelayanan Jelas',
      desc: 'Setiap jenis layanan memiliki prosedur, persyaratan, tarif (gratis/sesuai perda), dan jangka waktu penyelesaian yang transparan.'
    },
    {
      title: 'Responsif & Tanpa Pungli',
      desc: 'Pelayanan berorientasi kepuasan masyarakat dengan menolak segala bentuk gratifikasi dan pungutan liar.'
    },
    {
      title: 'Pengaduan & Tindak Lanjut',
      desc: 'Masyarakat dapat menyampaikan kritik, saran, dan pengaduan yang ditindaklanjuti secara cepat dan akuntabel.'
    },
    {
      title: 'Perbaikan Berkelanjutan',
      desc: 'Evaluasi berkala melalui Survei Kepuasan Masyarakat (SKM) dan audit internal mutu layanan kesehatan.'
    }
  ];
</script>

<div class="py-12 px-6 max-w-4xl mx-auto space-y-10">

  <div class="text-center space-y-3">
    <span class="text-xs font-bold uppercase tracking-widest text-[var(--color-primary)]">Komitmen Mutu & Integritas</span>
    <h1 class="text-3xl font-light text-[var(--color-text)]">Maklumat Pelayanan</h1>
    <p class="text-xs text-[var(--color-muted-foreground)] max-w-xl mx-auto">
      Pernyataan resmi komitmen pimpinan dan seluruh pegawai Puskesmas Sehat Mandiri dalam menyelenggarakan pelayanan prima.
    </p>
  </div>

  <!-- Maklumat Box -->
  <div class="bg-gradient-to-br from-emerald-950/40 via-[#16191F] to-[#16191F] border border-[var(--color-primary)]/30 rounded-3xl p-8 md:p-12 space-y-6 shadow-2xl relative overflow-hidden">
    <div class="absolute top-0 right-0 w-64 h-64 bg-[var(--color-primary)]/5 rounded-full blur-3xl pointer-events-none"></div>

    <div class="w-14 h-14 rounded-2xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 flex items-center justify-center text-[var(--color-primary)]">
      <Award class="w-7 h-7" />
    </div>

    <blockquote class="text-lg md:text-xl font-light text-[var(--color-text)] italic leading-relaxed">
      "Dengan ini, kami seluruh pimpinan dan pegawai Puskesmas Sehat Mandiri menyatakan sanggup menyelenggarakan pelayanan sesuai standar pelayanan yang telah ditetapkan dan sanggup menerima sanksi apabila pelayanan yang diberikan tidak sesuai standar serta melakukan perbaikan secara terus-menerus."
    </blockquote>

    <div class="pt-4 border-t border-[var(--color-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <p class="text-sm font-semibold text-[var(--color-text)]">Kepala Puskesmas Sehat Mandiri</p>
        <p class="text-xs text-[var(--color-muted-foreground)]">Dinas Kesehatan Kabupaten / Kota</p>
      </div>
      <div class="flex items-center gap-2 text-xs font-mono text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-3 py-1.5 rounded-xl border border-[var(--color-primary)]/20">
        <ShieldCheck class="w-4 h-4" /> Terverifikasi & Sah
      </div>
    </div>
  </div>

  <!-- 4 Pilar Maklumat -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
    {#each PILAR as item, idx (item.title)}
      <div class="bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl p-6 space-y-3">
        <div class="w-8 h-8 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)] font-bold text-xs">
          {idx + 1}
        </div>
        <h3 class="text-base font-medium text-[var(--color-text)]">{item.title}</h3>
        <p class="text-xs text-[var(--color-muted-foreground)] leading-relaxed">{item.desc}</p>
      </div>
    {/each}
  </div>

  <div class="text-center pt-4">
    <a
      href="#/informasi-publik"
      class="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] hover:border-[var(--color-primary)]/50 text-[var(--color-text)] text-xs font-medium transition"
    >
      Kembali ke Pusat Informasi Publik
    </a>
  </div>

</div>
