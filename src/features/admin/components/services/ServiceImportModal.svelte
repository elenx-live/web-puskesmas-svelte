<!-- @component Modal import massal data layanan dari CSV: unduh template, validasi baris, deteksi duplikat, dan eksekusi batch. -->
<script lang="ts">
  import Modal from '../../../../shared/ui/Modal.svelte';
  import Button from '../../../../shared/ui/Button.svelte';
  import Badge from '../../../../shared/ui/Badge.svelte';
  import {
    Upload, Download, FileText, CheckCircle2, AlertTriangle,
    ArrowRight, ShieldAlert
  } from 'lucide-svelte';
  import { authStore } from '../../../../shared/stores/auth.svelte.js';
  import { toastStore } from '../../../../shared/stores/toast.svelte.js';
  import { serviceEngineService } from '../../../../shared/services/serviceEngineService.js';

  interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
  }

  interface ParsedRow {
    rowNum: number;
    name: string;
    shortDescription: string;
    description: string;
    category: string;
    cluster: string;
    unit: string;
    location: string;
    status: string;
    isValid: boolean;
    isDuplicate: boolean;
    errors: string[];
  }

  let { isOpen, onClose, onSuccess }: Props = $props();

  const user = $derived(authStore.user);

  let step = $state<'upload' | 'preview' | 'result'>('upload');
  let file = $state<File | null>(null);
  let parsing = $state(false);
  let importing = $state(false);
  let skipDuplicates = $state(true);
  let fileInput = $state<HTMLInputElement | undefined>();

  // Parsed Data State
  let parsedRows = $state<ParsedRow[]>([]);
  let importResult = $state<{
    totalProcessed: number;
    successCount: number;
    failedCount: number;
    errors: string[];
  } | null>(null);

  // Check RBAC
  const canImport = $derived(user?.permissions?.includes('import_services') || user?.roleId === 'role-superadmin');

  const validCount = $derived(parsedRows.filter((r) => r.isValid && !r.isDuplicate).length);
  const duplicateCount = $derived(parsedRows.filter((r) => r.isDuplicate).length);
  const invalidCount = $derived(parsedRows.filter((r) => !r.isValid).length);

  function resetState() {
    step = 'upload';
    file = null;
    parsedRows = [];
    importResult = null;
    if (fileInput) fileInput.value = '';
  }

  function handleClose() {
    resetState();
    onClose();
  }

  // 1. Download CSV Template
  function handleDownloadTemplate() {
    const headers = ['name', 'shortDescription', 'description', 'category', 'cluster', 'unit', 'location', 'status'];
    const sampleRow1 = [
      '"Pelayanan Poli Umum"',
      '"Pemeriksaan kesehatan umum dan konsultasi dokter."',
      '"Pelayanan kesehatan dasar mencakup anamnesis, pemeriksaan fisik, dan terapi medis dasar."',
      '"Pelayanan Medis Umum"',
      '"Klaster 3 — Usia Dewasa & Lansia"',
      '"Ruang Poli Umum"',
      '"Poli Umum R101"',
      '"published"'
    ];
    const sampleRow2 = [
      '"Pelayanan Kesehatan Ibu Hamil (ANC)"',
      '"Pemeriksaan rutin kehamilan dan konseling gizi."',
      '"Pemeriksaan antenatal care (ANC) terpadu untuk mendeteksi dini faktor risiko kehamilan."',
      '"Kesehatan Ibu & Anak"',
      '"Klaster 2 — Ibu dan Anak"',
      '"Ruang KIA & KB"',
      '"Poli Umum R101"',
      '"published"'
    ];

    const csvContent = [headers.join(','), sampleRow1.join(','), sampleRow2.join(',')].join('\n');
    const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Template_Import_Layanan_Puskesmas.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toastStore.showToast('Template CSV berhasil diunduh.', 'success');
  }

  // Simple, robust CSV string line parser
  function parseCSVText(text: string): string[][] {
    const lines: string[][] = [];
    const rawLines = text.split(/\r\n|\n|\r/);

    for (const rawLine of rawLines) {
      if (!rawLine.trim()) continue;

      const row: string[] = [];
      let inQuotes = false;
      let currentField = '';

      for (let i = 0; i < rawLine.length; i++) {
        const char = rawLine[i];

        if (char === '"') {
          if (inQuotes && rawLine[i + 1] === '"') {
            currentField += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          row.push(currentField.trim());
          currentField = '';
        } else {
          currentField += char;
        }
      }
      row.push(currentField.trim());
      lines.push(row);
    }

    return lines;
  }

  // 2. Validate & Process File
  async function handleFileSelect(e: Event & { currentTarget: HTMLInputElement }) {
    const selectedFile = e.currentTarget.files?.[0];
    if (!selectedFile) return;

    // Security check 1: File extension & mime
    const fileName = selectedFile.name.toLowerCase();
    if (!fileName.endsWith('.csv')) {
      toastStore.showToast('Format berkas tidak valid. Hanya berkas .csv yang diperbolehkan.', 'error');
      return;
    }

    // Security check 2: Size limit (5 MB)
    if (selectedFile.size > 5 * 1024 * 1024) {
      toastStore.showToast('Ukuran file melebihi batas maksimum 5MB.', 'error');
      return;
    }

    file = selectedFile;
    parsing = true;

    try {
      const text = await selectedFile.text();
      const rows = parseCSVText(text);

      if (rows.length < 2) {
        toastStore.showToast('Berkas CSV kosong atau hanya berisi baris header.', 'error');
        parsing = false;
        return;
      }

      // Read existing data for relation & duplicate checks
      const existingServices = await serviceEngineService.getServices();
      const categories = await serviceEngineService.getCategories();
      const clusters = await serviceEngineService.getClusters();
      const units = await serviceEngineService.getUnits();
      const locations = await serviceEngineService.getLocations();

      const header = rows[0].map((h) => h.toLowerCase().replace(/[^a-z]/g, ''));
      const nameIdx = header.findIndex((h) => h.includes('name') || h.includes('nama'));
      const shortDescIdx = header.findIndex((h) => h.includes('short') || h.includes('singkat'));
      const descIdx = header.findIndex((h) => h.includes('desc') || h.includes('deskripsi'));
      const catIdx = header.findIndex((h) => h.includes('cat') || h.includes('kategori'));
      const clsIdx = header.findIndex((h) => h.includes('cluster') || h.includes('klaster'));
      const unitIdx = header.findIndex((h) => h.includes('unit'));
      const locIdx = header.findIndex((h) => h.includes('loc') || h.includes('lokasi'));
      const statusIdx = header.findIndex((h) => h.includes('status'));

      const evaluatedRows: ParsedRow[] = [];

      for (let i = 1; i < rows.length; i++) {
        const rowData = rows[i];
        if (rowData.length === 0 || rowData.every((cell) => !cell)) continue;

        const rowNum = i + 1;
        const name = nameIdx !== -1 ? rowData[nameIdx] || '' : rowData[0] || '';
        const shortDescription = shortDescIdx !== -1 ? rowData[shortDescIdx] || '' : '';
        const description = descIdx !== -1 ? rowData[descIdx] || '' : '';
        const category = catIdx !== -1 ? rowData[catIdx] || '' : '';
        const cluster = clsIdx !== -1 ? rowData[clsIdx] || '' : '';
        const unit = unitIdx !== -1 ? rowData[unitIdx] || '' : '';
        const location = locIdx !== -1 ? rowData[locIdx] || '' : '';
        const status = statusIdx !== -1 ? rowData[statusIdx] || 'draft' : 'draft';

        const rowErrors: string[] = [];

        // Validation 1: Required Name
        if (!name.trim()) {
          rowErrors.push('Nama layanan kosong');
        }

        // Validation 2: Category matching
        if (category.trim()) {
          const q = category.trim().toLowerCase();
          const match = categories.find(
            (c) => c.name.toLowerCase() === q || c.id.toLowerCase() === q || c.slug.toLowerCase() === q
          );
          if (!match) {
            rowErrors.push(`Kategori "${category}" tidak ditemukan`);
          }
        }

        // Validation 3: Cluster matching
        if (cluster.trim()) {
          const q = cluster.trim().toLowerCase();
          const match = clusters.find(
            (c) => c.name.toLowerCase() === q || c.id.toLowerCase() === q || c.slug.toLowerCase() === q
          );
          if (!match) {
            rowErrors.push(`Klaster "${cluster}" tidak ditemukan`);
          }
        }

        // Validation 4: Unit matching
        if (unit.trim()) {
          const q = unit.trim().toLowerCase();
          const match = units.find(
            (u) => u.name.toLowerCase() === q || u.id.toLowerCase() === q || u.code?.toLowerCase() === q
          );
          if (!match) {
            rowErrors.push(`Unit "${unit}" tidak ditemukan`);
          }
        }

        // Validation 5: Location matching
        if (location.trim()) {
          const q = location.trim().toLowerCase();
          const match = locations.find(
            (l) => l.name.toLowerCase() === q || l.id.toLowerCase() === q
          );
          if (!match) {
            rowErrors.push(`Lokasi "${location}" tidak ditemukan`);
          }
        }

        // Duplicate Check against DB
        const isDuplicate = existingServices.some(
          (s) => s.name.toLowerCase() === name.trim().toLowerCase()
        );

        evaluatedRows.push({
          rowNum,
          name,
          shortDescription,
          description,
          category,
          cluster,
          unit,
          location,
          status,
          isValid: rowErrors.length === 0,
          isDuplicate,
          errors: rowErrors
        });
      }

      parsedRows = evaluatedRows;
      step = 'preview';
    } catch (err) {
      console.error('Failed to parse CSV:', err);
      toastStore.showToast('Gagal memproses berkas CSV. Pastikan format penulisan sesuai template.', 'error');
    } finally {
      parsing = false;
    }
  }

  // 3. Execute Import Batch
  async function handleExecuteImport() {
    if (!user) return;
    const validRows = parsedRows.filter((r) => r.isValid && (!r.isDuplicate || !skipDuplicates));

    if (validRows.length === 0) {
      toastStore.showToast('Tidak ada data valid yang siap diimpor.', 'warning');
      return;
    }

    importing = true;

    try {
      const res = await serviceEngineService.importServicesBatch(
        validRows.map((r) => ({
          name: r.name,
          shortDescription: r.shortDescription,
          description: r.description,
          category: r.category,
          cluster: r.cluster,
          unit: r.unit,
          location: r.location,
          status: r.status
        })),
        { id: user.uid, email: user.email, name: user.displayName },
        { skipDuplicates }
      );

      importResult = res;
      step = 'result';
      onSuccess();
      toastStore.showToast(`Import selesai: ${res.successCount} berhasil, ${res.failedCount} gagal/dilewati.`, 'success');
    } catch (err) {
      console.error('Import execution error:', err);
      toastStore.showToast('Terjadi kesalahan saat memproses import batch.', 'error');
    } finally {
      importing = false;
    }
  }
</script>

<Modal
  {isOpen}
  onClose={handleClose}
  title="Import Massal Data Layanan Kesehatan"
  size="xl"
>
  <div class="space-y-5">
    {#if !canImport}
      <div class="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
        <ShieldAlert class="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />
        <div>
          <p class="text-xs font-semibold text-rose-800">Akses Dibatasi (RBAC)</p>
          <p class="text-xs text-rose-700 mt-0.5">
            Akun Anda tidak memiliki hak akses <code class="bg-rose-100 px-1 py-0.5 rounded font-mono text-[11px]">import_services</code>.
          </p>
        </div>
      </div>
    {:else}
      <!-- Step 1: Upload -->
      {#if step === 'upload'}
        <div class="space-y-4">
          <div class="p-4 bg-blue-50/70 border border-blue-100 rounded-xl flex items-start justify-between gap-3">
            <div class="flex items-start gap-3">
              <FileText class="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <h4 class="text-xs font-bold text-blue-900">Petunjuk Format Berkas CSV</h4>
                <p class="text-xs text-blue-800 mt-1 leading-relaxed">
                  Gunakan file template CSV resmi. Pastikan nama kategori, klaster, unit, dan lokasi sesuai dengan nama/kode entitas master yang ada di sistem.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onclick={handleDownloadTemplate}
              class="shrink-0 bg-white hover:bg-blue-50 text-blue-700 border-blue-200 gap-1.5"
            >
              <Download class="w-3.5 h-3.5" /> Download Template CSV
            </Button>
          </div>

          <!-- Upload Drag Drop Zone -->
          <div
            onclick={() => fileInput?.click()}
            onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInput?.click(); }}
            role="button"
            tabindex="0"
            class="border-2 border-dashed border-zinc-300 hover:border-[var(--color-primary)] bg-[var(--color-card)]/50 hover:bg-emerald-50/30 rounded-2xl p-8 text-center cursor-pointer transition-all"
          >
            <input
              bind:this={fileInput}
              type="file"
              accept=".csv"
              class="hidden"
              onchange={handleFileSelect}
            />
            <Upload class="w-10 h-10 text-[var(--color-muted-foreground)] mx-auto mb-3" />
            <p class="text-xs font-semibold text-zinc-800">
              Klik untuk memilih atau seret file CSV ke sini
            </p>
            <p class="text-[11px] text-[var(--color-muted-foreground)] mt-1">
              Maksimal ukuran file: 5 MB (Format .CSV)
            </p>
          </div>
        </div>
      {/if}

      <!-- Step 2: Validation Preview -->
      {#if step === 'preview'}
        <div class="space-y-4">
          <!-- Metrics Summary -->
          <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div class="p-3 bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl">
              <p class="text-[11px] text-[var(--color-muted-foreground)] font-medium">Total Baris</p>
              <p class="text-lg font-bold text-zinc-900 mt-0.5">{parsedRows.length}</p>
            </div>
            <div class="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <p class="text-[11px] text-emerald-700 font-medium">Data Valid</p>
              <p class="text-lg font-bold text-emerald-700 mt-0.5">{validCount}</p>
            </div>
            <div class="p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <p class="text-[11px] text-amber-700 font-medium font-medium">Duplikat</p>
              <p class="text-lg font-bold text-amber-700 mt-0.5">{duplicateCount}</p>
            </div>
            <div class="p-3 bg-rose-50 border border-rose-200 rounded-xl">
              <p class="text-[11px] text-rose-700 font-medium">Invalid / Error</p>
              <p class="text-lg font-bold text-rose-700 mt-0.5">{invalidCount}</p>
            </div>
          </div>

          <!-- Duplicate Settings Toggle -->
          {#if duplicateCount > 0}
            <div class="p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center justify-between">
              <div class="flex items-center gap-2">
                <AlertTriangle class="w-4 h-4 text-amber-600 shrink-0" />
                <span class="text-xs font-medium text-amber-900">
                  Ditemukan {duplicateCount} layanan yang sudah ada di database.
                </span>
              </div>
              <label class="flex items-center gap-2 text-xs font-semibold text-amber-900 cursor-pointer">
                <input
                  type="checkbox"
                  bind:checked={skipDuplicates}
                  class="rounded border-amber-300 text-amber-600 focus:ring-[var(--color-primary)]"
                />
                Lewati Duplikat (Default)
              </label>
            </div>
          {/if}

          <!-- Preview Table -->
          <div class="border border-[var(--color-border)] rounded-xl overflow-hidden max-h-72 overflow-y-auto">
            <table class="w-full text-left border-collapse text-xs">
              <thead class="bg-zinc-100 text-zinc-600 font-medium sticky top-0 border-b border-[var(--color-border)]">
                <tr>
                  <th class="p-2.5 w-12 text-center">Baris</th>
                  <th class="p-2.5">Nama Layanan</th>
                  <th class="p-2.5">Kategori</th>
                  <th class="p-2.5">Unit</th>
                  <th class="p-2.5">Status Validasi</th>
                  <th class="p-2.5">Keterangan / Detail Error</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-zinc-200">
                {#each parsedRows as r, idx (idx)}
                  <tr class={!r.isValid ? 'bg-rose-50/40' : r.isDuplicate ? 'bg-amber-50/40' : 'hover:bg-[var(--color-card)]'}>
                    <td class="p-2.5 text-center font-mono text-[var(--color-muted-foreground)]">{r.rowNum}</td>
                    <td class="p-2.5 font-semibold text-zinc-900">{r.name || '<Kosong>'}</td>
                    <td class="p-2.5 text-zinc-600">{r.category || '-'}</td>
                    <td class="p-2.5 text-zinc-600">{r.unit || '-'}</td>
                    <td class="p-2.5">
                      {#if !r.isValid}
                        <Badge variant="rose" size="sm">Invalid</Badge>
                      {:else if r.isDuplicate}
                        <Badge variant="amber" size="sm">Duplikat</Badge>
                      {:else}
                        <Badge variant="emerald" size="sm">Valid</Badge>
                      {/if}
                    </td>
                    <td class="p-2.5 text-[11px]">
                      {#if r.errors.length > 0}
                        <span class="text-rose-600 font-medium">{r.errors.join('; ')}</span>
                      {:else if r.isDuplicate}
                        <span class="text-amber-700 font-medium">
                          {skipDuplicates ? 'Akan dilewati saat import' : 'Akan ditambahkan ulang'}
                        </span>
                      {:else}
                        <span class="text-emerald-600 font-medium">Siap diimpor</span>
                      {/if}
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      {/if}

      <!-- Step 3: Result -->
      {#if step === 'result' && importResult}
        <div class="space-y-4 text-center py-4">
          <div class="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 class="w-6 h-6" />
          </div>
          <div>
            <h3 class="text-base font-bold text-zinc-900">Proses Import Selesai</h3>
            <p class="text-xs text-[var(--color-muted-foreground)] mt-1">
              Berikut adalah ringkasan hasil impor data layanan ke sistem.
            </p>
          </div>

          <div class="grid grid-cols-3 gap-3 max-w-md mx-auto text-left">
            <div class="p-3 bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl text-center">
              <p class="text-[11px] text-[var(--color-muted-foreground)] font-medium">Diproses</p>
              <p class="text-lg font-bold text-zinc-900">{importResult.totalProcessed}</p>
            </div>
            <div class="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
              <p class="text-[11px] text-emerald-700 font-medium">Berhasil</p>
              <p class="text-lg font-bold text-emerald-700">{importResult.successCount}</p>
            </div>
            <div class="p-3 bg-rose-50 border border-rose-200 rounded-xl text-center">
              <p class="text-[11px] text-rose-700 font-medium">Gagal / Dilewati</p>
              <p class="text-lg font-bold text-rose-700">{importResult.failedCount}</p>
            </div>
          </div>

          {#if importResult.errors.length > 0}
            <div class="text-left bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-3 max-h-36 overflow-y-auto">
              <p class="text-xs font-bold text-zinc-700 mb-1.5">Catatan Log Perubahan:</p>
              <ul class="text-[11px] text-zinc-600 space-y-1 list-disc list-inside">
                {#each importResult.errors as err, i (i)}
                  <li>{err}</li>
                {/each}
              </ul>
            </div>
          {/if}
        </div>
      {/if}
    {/if}

    <div class="flex items-center justify-between pt-3 border-t border-zinc-100">
      {#if step === 'preview'}
        <Button variant="ghost" size="sm" onclick={() => (step = 'upload')}>
          Kembali Ke Upload
        </Button>
      {:else}
        <div></div>
      {/if}

      <div class="flex items-center gap-2">
        <Button variant="ghost" size="sm" onclick={handleClose}>
          {step === 'result' ? 'Tutup' : 'Batal'}
        </Button>

        {#if canImport && step === 'preview'}
          <Button
            variant="primary"
            size="sm"
            onclick={handleExecuteImport}
            disabled={importing || validCount === 0}
            class="gap-1.5"
          >
            {importing ? 'Menyimpan Data...' : `Impor ${validCount} Data Valid`} <ArrowRight class="w-3.5 h-3.5" />
          </Button>
        {/if}
      </div>
    </div>
  </div>
</Modal>
