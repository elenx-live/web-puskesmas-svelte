<!-- @component Halaman admin: Audit Log Keamanan — riwayat transaksi append-only dengan filter modul, tindakan, dan pencarian. -->
<script lang="ts">
  import { Search } from 'lucide-svelte';
  import Card from '../../../shared/ui/Card.svelte';
  import Badge from '../../../shared/ui/Badge.svelte';
  import Select from '../../../shared/ui/Select.svelte';
  import { auditService } from '../../../shared/services/auditService.js';
  import type { AuditLog } from '../../../shared/types/index.js';

  let logs = $state<AuditLog[]>([]);
  let search = $state('');
  let moduleFilter = $state('');
  let actionFilter = $state('');
  let loading = $state(true);

  async function loadLogs() {
    loading = true;
    try {
      logs = await auditService.getLogs({ module: moduleFilter, action: actionFilter, search });
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    search; moduleFilter; actionFilter;
    loadLogs();
  });

  const moduleOptions = [
    { value: '', label: 'Semua Modul' },
    { value: 'AUTH', label: 'Modul: Otentikasi' },
    { value: 'USERS', label: 'Modul: Pengguna' },
    { value: 'ROLES', label: 'Modul: Peran & Izin' },
    { value: 'SETTINGS', label: 'Modul: Pengaturan' },
    { value: 'MEDIA', label: 'Modul: Media' },
  ];

  const actionOptions = [
    { value: '', label: 'Semua Tindakan' },
    { value: 'LOGIN', label: 'Tindakan: LOGIN' },
    { value: 'LOGOUT', label: 'Tindakan: LOGOUT' },
    { value: 'CREATE', label: 'Tindakan: CREATE' },
    { value: 'UPDATE', label: 'Tindakan: UPDATE' },
    { value: 'DELETE', label: 'Tindakan: DELETE' },
    { value: 'ROLE_CHANGE', label: 'Tindakan: ROLE_CHANGE' },
    { value: 'SETTINGS_CHANGE', label: 'Tindakan: SETTINGS_CHANGE' },
  ];

  function actionVariant(action: string): 'emerald' | 'red' | 'blue' | 'zinc' {
    if (action === 'CREATE') return 'emerald';
    if (action === 'DELETE') return 'red';
    if (action === 'LOGIN') return 'blue';
    return 'zinc';
  }
</script>

<!-- Search & Filters -->
<div class="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[var(--color-card)] border border-[var(--color-border)] p-4 rounded-3xl">
  <div class="relative">
    <Search class="w-4 h-4 text-[var(--color-muted-foreground)] absolute left-3 top-1/2 -translate-y-1/2" />
    <input
      type="text"
      placeholder="Cari deskripsi / nama pengguna..."
      bind:value={search}
      class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)]/70 focus:outline-none rounded-2xl pl-9 pr-4 py-2 text-xs text-[var(--color-text)] placeholder-zinc-600"
    />
  </div>

  <Select bind:value={moduleFilter} options={moduleOptions} />
  <Select bind:value={actionFilter} options={actionOptions} />
</div>

<!-- Audit Logs Table -->
<Card class="p-0 overflow-hidden">
  <div class="overflow-x-auto">
    <table class="w-full text-left text-xs text-[var(--color-text)]">
      <thead class="bg-[var(--color-bg)]/60 text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted-foreground)] border-b border-[var(--color-border)]">
        <tr>
          <th class="p-4 pl-6">Waktu</th>
          <th class="p-4">Pengguna</th>
          <th class="p-4">Modul</th>
          <th class="p-4">Tindakan</th>
          <th class="p-4 pr-6">Deskripsi Aktivitas</th>
        </tr>
      </thead>

      <tbody class="divide-y divide-[var(--color-border)]">
        {#if loading}
          <tr>
            <td colspan={5} class="p-8 text-center text-[var(--color-muted-foreground)]">
              Memuat audit log...
            </td>
          </tr>
        {:else if logs.length === 0}
          <tr>
            <td colspan={5} class="p-8 text-center text-[var(--color-muted-foreground)]">
              Tidak ada catatan audit log yang cocok.
            </td>
          </tr>
        {:else}
          {#each logs as log (log.id)}
            <tr class="hover:bg-[var(--color-card)]/50 transition">
              <td class="p-4 pl-6 text-[11px] text-[var(--color-muted-foreground)] shrink-0 whitespace-nowrap">
                {new Date(log.timestamp).toLocaleString('id-ID')}
              </td>

              <td class="p-4">
                <div class="font-bold text-[var(--color-text)]">{log.userName}</div>
                <div class="text-[10px] text-[var(--color-muted-foreground)]">{log.userEmail}</div>
              </td>

              <td class="p-4">
                <Badge variant="amber">{log.module}</Badge>
              </td>

              <td class="p-4">
                <Badge variant={actionVariant(log.action)}>{log.action}</Badge>
              </td>

              <td class="p-4 pr-6 text-[var(--color-text)] leading-relaxed max-w-md">
                {log.description}
              </td>
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>
</Card>
