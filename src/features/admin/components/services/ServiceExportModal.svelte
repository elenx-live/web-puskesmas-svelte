<!-- @component Modal ekspor katalog layanan ke CSV (cakupan hasil filter / seluruh database) dengan RBAC. -->
<script lang="ts">
  import Modal from '../../../../shared/ui/Modal.svelte';
  import Button from '../../../../shared/ui/Button.svelte';
  import Badge from '../../../../shared/ui/Badge.svelte';
  import type { ServiceEntity } from '../../../../shared/types/index.js';
  import { Download, FileSpreadsheet, Filter, CheckCircle2, ShieldAlert } from 'lucide-svelte';
  import { auditService } from '../../../../shared/services/auditService.js';
  import { authStore } from '../../../../shared/stores/auth.svelte.js';
  import { toastStore } from '../../../../shared/stores/toast.svelte.js';

  interface Props {
    isOpen: boolean;
    onClose: () => void;
    allServices: ServiceEntity[];
    filteredServices: ServiceEntity[];
  }

  let { isOpen, onClose, allServices, filteredServices }: Props = $props();

  let exportScope = $state<'filtered' | 'all'>('filtered');
  let exporting = $state(false);

  const user = $derived(authStore.user);

  // Check RBAC permission
  const canExport = $derived(user?.permissions?.includes('export_services') || user?.roleId === 'role-superadmin');

  async function handleExportCSV() {
    if (!canExport) {
      toastStore.showToast('Anda tidak memiliki izin untuk mengekspor data layanan.', 'error');
      return;
    }

    const targetList = exportScope === 'filtered' ? filteredServices : allServices;

    if (targetList.length === 0) {
      toastStore.showToast('Tidak ada data layanan untuk diekspor.', 'warning');
      return;
    }

    exporting = true;

    try {
      // Define CSV Headers according to requirement 11:
      // ID, Nama, Slug, Kategori, Klaster, Unit, Lokasi, Status, Created At, Updated At
      const headers = [
        'ID',
        'Nama Layanan',
        'Slug',
        'Kategori',
        'Klaster',
        'Unit Pelayanan',
        'Lokasi Pelayanan',
        'Status',
        'Layanan Unggulan',
        'Created At',
        'Updated At'
      ];

      const rows = targetList.map((s) => [
        s.id,
        `"${(s.name || '').replace(/"/g, '""')}"`,
        `"${(s.slug || '').replace(/"/g, '""')}"`,
        `"${(s.categoryName || '').replace(/"/g, '""')}"`,
        `"${(s.clusterName || '').replace(/"/g, '""')}"`,
        `"${(s.unitName || '').replace(/"/g, '""')}"`,
        `"${(s.locationName || '').replace(/"/g, '""')}"`,
        s.status,
        s.featured ? 'Ya' : 'Tidak',
        s.createdAt || '',
        s.updatedAt || ''
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

      // Create Blob and trigger download
      const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      link.href = url;
      link.setAttribute('download', `Katalog_Layanan_Puskesmas_${exportScope}_${dateStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Audit Log record
      if (user) {
        await auditService.recordLog({
          userId: user.uid,
          userEmail: user.email,
          userName: user.displayName,
          action: 'SETTINGS_CHANGE',
          module: 'SERVICES',
          description: `Mengekspor berkas CSV katalog layanan (${targetList.length} data, cakupan: ${exportScope}).`
        });
      }

      toastStore.showToast(`Berhasil mengekspor ${targetList.length} data layanan ke CSV.`, 'success');
      onClose();
    } catch (err) {
      console.error('Export CSV failed:', err);
      toastStore.showToast('Gagal mengekspor data ke CSV', 'error');
    } finally {
      exporting = false;
    }
  }
</script>

<Modal
  {isOpen}
  {onClose}
  title="Export Data Katalog Layanan"
  size="md"
>
  <div class="space-y-5">
    {#if !canExport}
      <div class="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
        <ShieldAlert class="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />
        <div>
          <p class="text-xs font-semibold text-rose-800">Akses Dibatasi (RBAC)</p>
          <p class="text-xs text-rose-700 mt-0.5">
            Akun Anda tidak memiliki hak akses <code class="bg-rose-100 px-1 py-0.5 rounded font-mono text-[11px]">export_services</code> untuk mengunduh data katalog.
          </p>
        </div>
      </div>
    {:else}
      <div class="p-3.5 bg-blue-50 border border-blue-100 rounded-xl flex items-center gap-3">
        <FileSpreadsheet class="w-5 h-5 text-blue-600 shrink-0" />
        <div class="text-xs text-blue-800">
          Data akan diekspor dalam format <span class="font-semibold">CSV</span> berstandar UTF-8 yang kompatibel dengan Microsoft Excel, Google Sheets, dan SPSS.
        </div>
      </div>

      <div class="space-y-3">
        <label class="text-xs font-medium text-zinc-700 block">
          Pilih Cakupan Data Export:
        </label>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onclick={() => (exportScope = 'filtered')}
            class={`p-4 border rounded-xl text-left transition-all relative ${
              exportScope === 'filtered'
                ? 'border-[var(--color-primary)] bg-emerald-50/50 ring-2 ring-emerald-500/20'
                : 'border-[var(--color-border)] hover:border-zinc-300 bg-white'
            }`}
          >
            <div class="flex items-center justify-between mb-1">
              <span class="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                <Filter class="w-3.5 h-3.5 text-emerald-600" /> Hasil Filter Saat Ini
              </span>
              <Badge variant="emerald" size="sm">{filteredServices.length} Item</Badge>
            </div>
            <p class="text-[11px] text-[var(--color-muted-foreground)] leading-relaxed">
              Hanya mengekspor layanan yang sesuai dengan kriteria pencarian dan filter di tabel.
            </p>
          </button>

          <button
            type="button"
            onclick={() => (exportScope = 'all')}
            class={`p-4 border rounded-xl text-left transition-all relative ${
              exportScope === 'all'
                ? 'border-[var(--color-primary)] bg-emerald-50/50 ring-2 ring-emerald-500/20'
                : 'border-[var(--color-border)] hover:border-zinc-300 bg-white'
            }`}
          >
            <div class="flex items-center justify-between mb-1">
              <span class="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                <CheckCircle2 class="w-3.5 h-3.5 text-emerald-600" /> Seluruh Database
              </span>
              <Badge variant="zinc" size="sm">{allServices.length} Item</Badge>
            </div>
            <p class="text-[11px] text-[var(--color-muted-foreground)] leading-relaxed">
              Mengekspor seluruh katalog layanan kesehatan tanpa memedulikan filter pencarian aktif.
            </p>
          </button>
        </div>
      </div>

      <div class="border-t border-[var(--color-border)] pt-3">
        <p class="text-[11px] text-[var(--color-muted-foreground)]">
          <span class="font-semibold text-zinc-600">Catatan Keamanan:</span> Sesuai ketentuan privasi (Phase 4H), berkas export hanya berisi atribut publik layanan dan TIDAK menyertakan data pribadi pengaduan, token, atau kredensial internal.
        </p>
      </div>
    {/if}

    <div class="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
      <Button variant="ghost" size="sm" onclick={onClose}>
        Batal
      </Button>
      {#if canExport}
        <Button
          variant="primary"
          size="sm"
          onclick={handleExportCSV}
          disabled={exporting || (exportScope === 'filtered' ? filteredServices.length === 0 : allServices.length === 0)}
          class="gap-1.5"
        >
          <Download class="w-3.5 h-3.5" />
          {exporting ? 'Memproses CSV...' : 'Download Berkas CSV'}
        </Button>
      {/if}
    </div>
  </div>
</Modal>
