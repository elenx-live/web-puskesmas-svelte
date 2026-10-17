<!-- @component Panel kualitas data layanan — KPI kelengkapan, filter, dan tabel skor per layanan. -->
<script lang="ts">
  import Card from '../../../../shared/ui/Card.svelte';
  import Button from '../../../../shared/ui/Button.svelte';
  import Badge from '../../../../shared/ui/Badge.svelte';
  import Input from '../../../../shared/ui/Input.svelte';
  import Select from '../../../../shared/ui/Select.svelte';
  import type { ServiceEntity } from '../../../../shared/types/index.js';
  import {
    CheckCircle2, AlertTriangle, XCircle, Search,
    Sparkles, ShieldCheck, ArrowUpRight
  } from 'lucide-svelte';
  import { serviceEngineService } from '../../../../shared/services/serviceEngineService.js';

  interface QualityReportItem {
    service: ServiceEntity;
    score: number;
    qualityStatus: 'complete' | 'partial' | 'incomplete';
    missingItems: string[];
    primaryMissingTab: 'info' | 'requirements' | 'procedures' | 'products' | 'standards' | 'schedules' | 'pricing';
  }

  interface Props {
    onOpenFixEditor: (service: ServiceEntity, tab: 'info' | 'requirements' | 'procedures' | 'products' | 'standards' | 'schedules' | 'pricing') => void;
  }

  let { onOpenFixEditor }: Props = $props();

  let reports = $state<QualityReportItem[]>([]);
  let loading = $state(true);
  let search = $state('');
  let statusFilter = $state('all');

  async function loadDataQuality() {
    loading = true;
    try {
      const data = await serviceEngineService.getServiceDataQualityReport();
      reports = data;
    } catch (err) {
      console.error('Failed to load quality report:', err);
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    loadDataQuality();
  });

  const filteredReports = $derived(
    reports.filter((r) => {
      const q = search.toLowerCase();
      const matchesSearch = r.service.name.toLowerCase().includes(q) ||
                            (r.service.categoryName || '').toLowerCase().includes(q) ||
                            (r.service.unitName || '').toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (statusFilter === 'complete') return r.qualityStatus === 'complete';
      if (statusFilter === 'partial') return r.qualityStatus === 'partial';
      if (statusFilter === 'incomplete') return r.qualityStatus === 'incomplete';
      if (statusFilter === 'needs_fix') return r.qualityStatus !== 'complete';

      return true;
    })
  );

  const totalCount = $derived(reports.length);
  const completeCount = $derived(reports.filter((r) => r.qualityStatus === 'complete').length);
  const partialCount = $derived(reports.filter((r) => r.qualityStatus === 'partial').length);
  const incompleteCount = $derived(reports.filter((r) => r.qualityStatus === 'incomplete').length);

  const averageScore = $derived(
    totalCount > 0
      ? Math.round(reports.reduce((acc, curr) => acc + curr.score, 0) / totalCount)
      : 0
  );
</script>

<div class="space-y-6">
  <!-- Top KPI Metrics Cards -->
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    <Card class="p-4 bg-white border border-[var(--color-border)]">
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold text-[var(--color-muted-foreground)]">Rata-Rata Kelengkapan</span>
        <Sparkles class="w-4 h-4 text-emerald-600" />
      </div>
      <div class="mt-2 flex items-baseline gap-2">
        <span class="text-2xl font-bold text-zinc-900">{averageScore}%</span>
        <span class="text-[11px] text-[var(--color-muted-foreground)] font-medium">skor agregat</span>
      </div>
      <div class="mt-2 w-full bg-zinc-100 h-1.5 rounded-full overflow-hidden">
        <div
          class="bg-[var(--color-primary)] h-full transition-all duration-500"
          style={`width: ${averageScore}%`}
        ></div>
      </div>
    </Card>

    <Card class="p-4 bg-emerald-50/50 border border-emerald-200/80">
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold text-emerald-800">Status Data Lengkap</span>
        <CheckCircle2 class="w-4 h-4 text-emerald-600" />
      </div>
      <p class="text-2xl font-bold text-emerald-900 mt-2">{completeCount}</p>
      <p class="text-[11px] text-emerald-700 mt-0.5">100% data terpenuhi</p>
    </Card>

    <Card class="p-4 bg-amber-50/50 border border-amber-200/80">
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold text-amber-800">Perlu Dilengkapi</span>
        <AlertTriangle class="w-4 h-4 text-amber-600" />
      </div>
      <p class="text-2xl font-bold text-amber-900 mt-2">{partialCount}</p>
      <p class="text-[11px] text-amber-700 mt-0.5">50% - 99% kelengkapan</p>
    </Card>

    <Card class="p-4 bg-rose-50/50 border border-rose-200/80">
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold text-rose-800">Belum Lengkap</span>
        <XCircle class="w-4 h-4 text-rose-600" />
      </div>
      <p class="text-2xl font-bold text-rose-900 mt-2">{incompleteCount}</p>
      <p class="text-[11px] text-rose-700 mt-0.5">&lt; 50% kelengkapan data</p>
    </Card>
  </div>

  <!-- Filter and Search Bar -->
  <Card class="p-4 bg-white border border-[var(--color-border)] space-y-4">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
      <div class="relative flex-1">
        <Search class="w-4 h-4 text-[var(--color-muted-foreground)] absolute left-3 top-1/2 -translate-y-1/2" />
        <Input
          placeholder="Cari nama layanan, kategori, atau unit..."
          bind:value={search}
          class="pl-9 h-9 text-xs"
        />
      </div>

      <div class="flex items-center gap-2">
        <Select
          bind:value={statusFilter}
          class="h-9 text-xs min-w-[180px]"
          options={[
            { value: 'all', label: 'Semua Status Quality' },
            { value: 'needs_fix', label: 'Perlu Perbaikan (Kurang)' },
            { value: 'complete', label: 'Lengkap (100%)' },
            { value: 'partial', label: 'Sebagian (50-99%)' },
            { value: 'incomplete', label: 'Belum Lengkap (<50%)' }
          ]}
        />
      </div>
    </div>

    <!-- Quality Table -->
    <div class="border border-[var(--color-border)] rounded-xl overflow-hidden">
      <table class="w-full text-left border-collapse text-xs">
        <thead class="bg-[var(--color-card)] text-zinc-600 font-semibold border-b border-[var(--color-border)]">
          <tr>
            <th class="p-3">Layanan Kesehatan</th>
            <th class="p-3">Kategori & Unit</th>
            <th class="p-3 text-center">Skor Kelengkapan</th>
            <th class="p-3">Item Data Yang Belum Lengkap</th>
            <th class="p-3 text-center">Tindakan</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-zinc-200 bg-white">
          {#if loading}
            <tr>
              <td colspan={5} class="p-8 text-center text-[var(--color-muted-foreground)]">
                Memuat data kualitas layanan...
              </td>
            </tr>
          {:else if filteredReports.length === 0}
            <tr>
              <td colspan={5} class="p-8 text-center text-[var(--color-muted-foreground)]">
                Tidak ada data layanan yang sesuai filter kualitas.
              </td>
            </tr>
          {:else}
            {#each filteredReports as item (item.service.id)}
              <tr class="hover:bg-[var(--color-card)]/80 transition-colors">
                <td class="p-3">
                  <p class="font-bold text-zinc-900">{item.service.name}</p>
                  <p class="text-[11px] text-[var(--color-muted-foreground)] font-mono mt-0.5">{item.service.slug}</p>
                </td>

                <td class="p-3 text-zinc-600">
                  <p class="font-medium text-zinc-800">{item.service.categoryName || '-'}</p>
                  <p class="text-[11px] text-[var(--color-muted-foreground)]">{item.service.unitName || '-'}</p>
                </td>

                <td class="p-3 text-center">
                  <div class="inline-flex flex-col items-center gap-1">
                    {#if item.qualityStatus === 'complete'}
                      <Badge variant="emerald" size="sm">
                        <span class="flex items-center gap-1"><CheckCircle2 class="w-3 h-3" /> Lengkap (100%)</span>
                      </Badge>
                    {:else if item.qualityStatus === 'partial'}
                      <Badge variant="amber" size="sm">
                        <span class="flex items-center gap-1"><AlertTriangle class="w-3 h-3" /> Sebagian ({item.score}%)</span>
                      </Badge>
                    {:else if item.qualityStatus === 'incomplete'}
                      <Badge variant="rose" size="sm">
                        <span class="flex items-center gap-1"><XCircle class="w-3 h-3" /> Belum Lengkap ({item.score}%)</span>
                      </Badge>
                    {/if}
                    <div class="w-20 bg-zinc-100 h-1.5 rounded-full overflow-hidden mt-1">
                      <div
                        class={`h-full ${
                          item.score === 100 ? 'bg-[var(--color-primary)]' : item.score >= 50 ? 'bg-[var(--color-primary)]' : 'bg-rose-500'
                        }`}
                        style={`width: ${item.score}%`}
                      ></div>
                    </div>
                  </div>
                </td>

                <td class="p-3">
                  {#if item.missingItems.length === 0}
                    <span class="text-emerald-600 font-medium flex items-center gap-1 text-[11px]">
                      <ShieldCheck class="w-3.5 h-3.5" /> Seluruh komponen terisi
                    </span>
                  {:else}
                    <div class="flex flex-wrap gap-1 max-w-sm">
                      {#each item.missingItems as m, idx (idx)}
                        <span class="bg-rose-50 text-rose-700 border border-rose-200 text-[10px] px-2 py-0.5 rounded-full font-medium">
                          {m}
                        </span>
                      {/each}
                    </div>
                  {/if}
                </td>

                <td class="p-3 text-center">
                  {#if item.missingItems.length > 0}
                    <Button
                      variant="primary"
                      size="sm"
                      onclick={() => onOpenFixEditor(item.service, item.primaryMissingTab)}
                      class="h-7 text-[11px] px-2.5 gap-1"
                    >
                      Perbaiki <ArrowUpRight class="w-3 h-3" />
                    </Button>
                  {:else}
                    <Button
                      variant="ghost"
                      size="sm"
                      onclick={() => onOpenFixEditor(item.service, 'info')}
                      class="h-7 text-[11px] px-2 text-[var(--color-muted-foreground)] hover:text-zinc-800"
                    >
                      Lihat Detail
                    </Button>
                  {/if}
                </td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>
  </Card>
</div>
