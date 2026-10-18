<!-- @component Form komponen Standar Pelayanan Publik (Permenkes 19/2024 & UU 25/2009): 10 bidang ringkasan dalam grid. -->
<script lang="ts">
  import Button from '../../../../shared/ui/Button.svelte';
  import { authStore } from '../../../../shared/stores/auth.svelte.js';
  import { toastStore } from '../../../../shared/stores/toast.svelte.js';
  import { serviceEngineService } from '../../../../shared/services/serviceEngineService.js';
  import type { ServiceStandardEntity } from '../../../../shared/types/index.js';
  import { ShieldCheck, Save, Clock, RefreshCw, Info } from 'lucide-svelte';

  interface Props {
    serviceId: string;
    serviceName: string;
  }

  let { serviceId, serviceName }: Props = $props();

  const user = $derived(authStore.user);

  const emptyStandard = (): Partial<ServiceStandardEntity> => ({
    requirementsSummary: '',
    procedureSummary: '',
    serviceTime: '',
    serviceProductSummary: '',
    facilities: '',
    executorCompetency: '',
    supervision: '',
    complaintChannelSummary: '',
    evaluation: '',
    additionalInformation: ''
  });

  let standard = $state<Partial<ServiceStandardEntity>>(emptyStandard());

  let loading = $state(true);
  let saving = $state(false);
  let isNew = $state(true);

  $effect(() => {
    if (serviceId) {
      loadStandard();
    }
  });

  async function loadStandard() {
    loading = true;
    try {
      const data = await serviceEngineService.getServiceStandard(serviceId);
      if (data) {
        standard = data;
        isNew = false;
      } else {
        standard = {
          serviceId,
          ...emptyStandard()
        };
        isNew = true;
      }
    } catch (err) {
      console.error('Failed to load service standard:', err);
      toastStore.showToast('Gagal memuat standar pelayanan', 'error');
    } finally {
      loading = false;
    }
  }

  function updateStandard(patch: Partial<ServiceStandardEntity>) {
    standard = { ...standard, ...patch };
  }

  async function handleSave(e: Event) {
    e.preventDefault();
    if (!user || !serviceId) return;

    saving = true;
    try {
      const actor = { id: user.uid, email: user.email, name: user.displayName || 'Admin' };
      const saved = await serviceEngineService.saveServiceStandard(serviceId, standard, actor);
      standard = saved;
      isNew = false;
      toastStore.showToast('Komponen Standar Pelayanan Publik berhasil disimpan', 'success');
    } catch (err: any) {
      console.error('Failed to save service standard:', err);
      toastStore.showToast(err.message || 'Gagal menyimpan standar pelayanan', 'error');
    } finally {
      saving = false;
    }
  }
</script>

{#if loading}
  <div class="p-8 text-center text-[var(--color-muted-foreground)] flex items-center justify-center gap-2 text-xs">
    <RefreshCw class="w-4 h-4 animate-spin text-[var(--color-primary)]" />
    <span>Memuat komponen Standar Pelayanan Publik...</span>
  </div>
{:else}
  {#key serviceId}
  <form onsubmit={handleSave} class="space-y-4 text-xs">
    <!-- Top Banner Info -->
    <div class="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl p-4 flex items-start justify-between gap-4">
      <div class="flex items-start gap-3">
        <div class="p-2 bg-[var(--color-primary)]/10 rounded-xl border border-[var(--color-primary)]/20 text-[var(--color-primary)] shrink-0">
          <ShieldCheck class="w-5 h-5" />
        </div>
        <div class="space-y-1">
          <div class="font-bold text-[var(--color-text)] text-sm flex items-center gap-2">
            <span>Standar Pelayanan Publik (Permenkes 19/2024 & UU No. 25/2009)</span>
            {#if isNew}
              <span class="px-2 py-0.5 rounded-full bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/30 text-[var(--color-primary)] text-[10px] font-medium">
                Belum Lengkap
              </span>
            {:else}
              <span class="px-2 py-0.5 rounded-full bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/30 text-[var(--color-primary)] text-[10px] font-medium">
                Tersimpan
              </span>
            {/if}
          </div>
          <p class="text-[var(--color-muted-foreground)] leading-relaxed text-[11px]">
            Lengkapi informasi standar pelayanan resmi untuk menjamin transparansi publik, akuntabilitas layanan, dan kepatuhan standar mutu Puskesmas.
          </p>
        </div>
      </div>

      <Button
        type="submit"
        disabled={saving}
        class="bg-[var(--color-primary)] hover:bg-amber-600 text-[var(--color-primary-foreground)] font-bold h-9 text-xs px-4 flex items-center gap-2 shrink-0"
      >
        <Save class="w-4 h-4" />
        <span>{saving ? 'Menyimpan...' : 'Simpan Standar Pelayanan'}</span>
      </Button>
    </div>

    {#if isNew}
      <div class="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400 flex items-center gap-2">
        <Info class="w-4 h-4 shrink-0" />
        <span>Informasi standar pelayanan belum pernah diisi. Silakan lengkapi formulir di bawah ini.</span>
      </div>
    {/if}

    <!-- Form Fields Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- 1. Waktu Pelayanan -->
      <div class="bg-[var(--color-bg)] p-4 rounded-2xl border border-[var(--color-border)] space-y-2">
        <label class="font-semibold text-[var(--color-text)] flex items-center gap-2">
          <Clock class="w-4 h-4 text-[var(--color-primary)]" />
          <span>Jangka Waktu Penyelesaian Layanan *</span>
        </label>
        <p class="text-[11px] text-[var(--color-muted-foreground)]">Estimasi durasi waktu pelayanan per pasien/kunjungan.</p>
        <input
          type="text"
          defaultValue={standard.serviceTime || ''}
          oninput={(e) => updateStandard({ serviceTime: e.currentTarget.value })}
          placeholder="Contoh: 15 - 30 Menit per Pasien"
          class="w-full bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-2.5 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
        />
      </div>

      <!-- 2. Ringkasan Persyaratan -->
      <div class="bg-[var(--color-bg)] p-4 rounded-2xl border border-[var(--color-border)] space-y-2">
        <label class="font-semibold text-[var(--color-text)]">Ringkasan Persyaratan Pelayanan</label>
        <p class="text-[11px] text-[var(--color-muted-foreground)]">Rangkuman persyaratan umum yang wajib dipatuhi publik.</p>
        <textarea
          rows={2}
          oninput={(e) => updateStandard({ requirementsSummary: e.currentTarget.value })}
          placeholder="Contoh: KTP/KK/KIA asli/fotokopi dan Kartu BPJS Kesehatan aktif."
          class="w-full bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-2.5 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
        >{standard.requirementsSummary || ''}</textarea>
      </div>

      <!-- 3. Ringkasan Prosedur -->
      <div class="bg-[var(--color-bg)] p-4 rounded-2xl border border-[var(--color-border)] space-y-2">
        <label class="font-semibold text-[var(--color-text)]">Ringkasan Prosedur & Alur</label>
        <p class="text-[11px] text-[var(--color-muted-foreground)]">Ringkasan langkah pelayanan secara singkat.</p>
        <textarea
          rows={2}
          oninput={(e) => updateStandard({ procedureSummary: e.currentTarget.value })}
          placeholder="Contoh: Pendaftaran -> Skrining Tanda Vital -> Pemeriksaan Dokter -> Apotek/Rujukan."
          class="w-full bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-2.5 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
        >{standard.procedureSummary || ''}</textarea>
      </div>

      <!-- 4. Ringkasan Produk Output -->
      <div class="bg-[var(--color-bg)] p-4 rounded-2xl border border-[var(--color-border)] space-y-2">
        <label class="font-semibold text-[var(--color-text)]">Ringkasan Produk Output Layanan</label>
        <p class="text-[11px] text-[var(--color-muted-foreground)]">Hasil akhir yang diterima masyarakat.</p>
        <textarea
          rows={2}
          oninput={(e) => updateStandard({ serviceProductSummary: e.currentTarget.value })}
          placeholder="Contoh: Resep Obat Dasar, Catatan Rekam Medis, Surat Keterangan / Rujukan."
          class="w-full bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-2.5 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
        >{standard.serviceProductSummary || ''}</textarea>
      </div>

      <!-- 5. Sarana, Prasarana & Fasilitas -->
      <div class="bg-[var(--color-bg)] p-4 rounded-2xl border border-[var(--color-border)] space-y-2">
        <label class="font-semibold text-[var(--color-text)]">Sarana, Prasarana & Fasilitas Peralatan</label>
        <p class="text-[11px] text-[var(--color-muted-foreground)]">Peralatan medis dan fasilitas penunjang yang tersedia.</p>
        <textarea
          rows={2}
          oninput={(e) => updateStandard({ facilities: e.currentTarget.value })}
          placeholder="Contoh: Stetoskop, Tensimeter Digital, Bed Pemeriksaan, Ruang Tunggu Ber-AC, Oksimeter."
          class="w-full bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-2.5 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
        >{standard.facilities || ''}</textarea>
      </div>

      <!-- 6. Kompetensi Pelaksana -->
      <div class="bg-[var(--color-bg)] p-4 rounded-2xl border border-[var(--color-border)] space-y-2">
        <label class="font-semibold text-[var(--color-text)]">Kompetensi Pelaksana / SDM Kesehatan</label>
        <p class="text-[11px] text-[var(--color-muted-foreground)]">Kualifikasi dan perizinan tenaga medis pelaksana.</p>
        <textarea
          rows={2}
          oninput={(e) => updateStandard({ executorCompetency: e.currentTarget.value })}
          placeholder="Contoh: Dokter Umum SIP Aktif, Perawat D3/S1 Keperawatan STR Aktif."
          class="w-full bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-2.5 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
        >{standard.executorCompetency || ''}</textarea>
      </div>

      <!-- 7. Pengawasan Internal -->
      <div class="bg-[var(--color-bg)] p-4 rounded-2xl border border-[var(--color-border)] space-y-2">
        <label class="font-semibold text-[var(--color-text)]">Pengawasan Internal & Penjaminan Mutu</label>
        <p class="text-[11px] text-[var(--color-muted-foreground)]">Mekanisme supervisi dan audit mutu layanan.</p>
        <textarea
          rows={2}
          oninput={(e) => updateStandard({ supervision: e.currentTarget.value })}
          placeholder="Contoh: Audit klinis berkala Tim Mutu Internal & Audit Dinas Kesehatan Kabupaten/Kota."
          class="w-full bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-2.5 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
        >{standard.supervision || ''}</textarea>
      </div>

      <!-- 8. Kanal Pengaduan -->
      <div class="bg-[var(--color-bg)] p-4 rounded-2xl border border-[var(--color-border)] space-y-2">
        <label class="font-semibold text-[var(--color-text)]">Kanal Penanganan Pengaduan & Saran</label>
        <p class="text-[11px] text-[var(--color-muted-foreground)]">Sarana resmi masyarakat menyampaikan masukan/pengaduan.</p>
        <textarea
          rows={2}
          oninput={(e) => updateStandard({ complaintChannelSummary: e.currentTarget.value })}
          placeholder="Contoh: Kotak Saran di lokasi, WhatsApp Pengaduan Resmi, atau Portal Pengaduan Online."
          class="w-full bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-2.5 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
        >{standard.complaintChannelSummary || ''}</textarea>
      </div>

      <!-- 9. Evaluasi Kinerja -->
      <div class="bg-[var(--color-bg)] p-4 rounded-2xl border border-[var(--color-border)] space-y-2">
        <label class="font-semibold text-[var(--color-text)]">Evaluasi Kinerja Pelayanan</label>
        <p class="text-[11px] text-[var(--color-muted-foreground)]">Metode pengukuran kepuasan masyarakat.</p>
        <textarea
          rows={2}
          oninput={(e) => updateStandard({ evaluation: e.currentTarget.value })}
          placeholder="Contoh: Survei Kepuasan Masyarakat (SKM) berkala per triwulan."
          class="w-full bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-2.5 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
        >{standard.evaluation || ''}</textarea>
      </div>

      <!-- 10. Informasi Tambahan & Dasar Hukum -->
      <div class="bg-[var(--color-bg)] p-4 rounded-2xl border border-[var(--color-border)] space-y-2">
        <label class="font-semibold text-[var(--color-text)]">Informasi Regulasi & Dasar Hukum</label>
        <p class="text-[11px] text-[var(--color-muted-foreground)]">Landasan hukum / acuan peraturan.</p>
        <textarea
          rows={2}
          oninput={(e) => updateStandard({ additionalInformation: e.currentTarget.value })}
          placeholder="Contoh: Permenkes No. 19 Tahun 2024 tentang Integrasi Layanan Primer (ILP)."
          class="w-full bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-2.5 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
        >{standard.additionalInformation || ''}</textarea>
      </div>
    </div>

    <div class="pt-3 flex justify-end">
      <Button
        type="submit"
        disabled={saving}
        class="bg-[var(--color-primary)] hover:bg-amber-600 text-[var(--color-primary-foreground)] font-bold h-10 px-6 flex items-center gap-2"
      >
        <Save class="w-4 h-4" />
        <span>{saving ? 'Menyimpan...' : 'Simpan Seluruh Standar Pelayanan'}</span>
      </Button>
    </div>
  </form>
  {/key}
{/if}
