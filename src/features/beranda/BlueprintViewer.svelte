<!-- @component Penampil cetak biru arsitektur sistem CMS (modul, skema database, matriks RBAC, ADR, checklist). -->
<script lang="ts">
  import { ArrowRight, CheckCircle2 } from 'lucide-svelte';
  import Button from '../../shared/ui/Button.svelte';
  import Card from '../../shared/ui/Card.svelte';
  import Badge from '../../shared/ui/Badge.svelte';
  import { navigate } from '../../app/router.svelte.js';
  import {
    SYSTEM_MODULES,
    FIRESTORE_SCHEMAS,
    ROLE_MATRIX,
    DECISION_LOG,
    APPROVAL_CHECKLIST
  } from '../../shared/data/blueprintData.js';

  let activeSection = $state<'modules' | 'schemas' | 'matrix' | 'adr' | 'checklist'>('modules');

  const tabs = [
    { id: 'modules', label: 'Modul Sistem' },
    { id: 'schemas', label: 'Skema Database' },
    { id: 'matrix', label: 'Matriks RBAC' },
    { id: 'adr', label: 'Keputusan Arsitektur (ADR)' },
    { id: 'checklist', label: 'Persetujuan Phase 1' }
  ] as const;
</script>

<div class="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] p-6 max-w-7xl mx-auto space-y-6">
  <div class="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
    <div>
      <span class="text-xs font-bold uppercase tracking-widest text-[var(--color-primary)]">
        Arsitektur Phase 1
      </span>
      <h1 class="text-2xl font-light text-[var(--color-text)]">Cetak Biru Sistem CMS Puskesmas</h1>
    </div>
    <Button onclick={() => navigate('/admin')} variant="primary">
      Masuk ke Admin Shell (Phase 2 & 3)
      <ArrowRight class="w-4 h-4" />
    </Button>
  </div>

  <div class="flex gap-2 overflow-x-auto pb-2 border-b border-[var(--color-border)]">
    {#each tabs as tab (tab.id)}
      <button
        onclick={() => (activeSection = tab.id)}
        class="px-4 py-2 rounded-2xl text-xs font-semibold transition shrink-0 {activeSection === tab.id
          ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/30'
          : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-text)] hover:bg-[var(--color-card)]'}"
      >
        {tab.label}
      </button>
    {/each}
  </div>

  {#if activeSection === 'modules'}
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      {#each SYSTEM_MODULES as m (m.id)}
        <Card class="space-y-2">
          <Badge variant="amber">{m.id.toUpperCase()}</Badge>
          <h3 class="text-base font-bold text-[var(--color-text)]">{m.name}</h3>
          <p class="text-xs text-[var(--color-text)]">{m.description}</p>
        </Card>
      {/each}
    </div>
  {:else if activeSection === 'schemas'}
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      {#each FIRESTORE_SCHEMAS as s (s.name)}
        <Card class="space-y-2">
          <code class="text-[var(--color-primary)] font-bold text-xs">{s.name}</code>
          <p class="text-xs text-[var(--color-text)]">{s.purpose}</p>
        </Card>
      {/each}
    </div>
  {:else if activeSection === 'matrix'}
    <Card class="p-0 overflow-x-auto">
      <table class="w-full text-xs text-left text-[var(--color-text)]">
        <thead class="bg-[var(--color-bg)] text-[10px] font-bold uppercase text-[var(--color-muted-foreground)] border-b border-[var(--color-border)]">
          <tr>
            <th class="p-4">Izin Akses</th>
            <th class="p-4">Super Admin</th>
            <th class="p-4">Admin Web</th>
            <th class="p-4">Editor</th>
            <th class="p-4">Operator</th>
            <th class="p-4">Viewer</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-[var(--color-border)]">
          {#each ROLE_MATRIX as p (p.permission)}
            <tr>
              <td class="p-4 font-bold text-[var(--color-text)] font-mono text-[11px]">{p.permission}</td>
              <td class="p-4">
                {#if p.superAdmin}<CheckCircle2 class="w-4 h-4 text-[var(--color-primary)]" />{:else}-{/if}
              </td>
              <td class="p-4">
                {#if p.adminWebsite}<CheckCircle2 class="w-4 h-4 text-[var(--color-primary)]" />{:else}-{/if}
              </td>
              <td class="p-4">
                {#if p.editor}<CheckCircle2 class="w-4 h-4 text-[var(--color-primary)]" />{:else}-{/if}
              </td>
              <td class="p-4">
                {#if p.operator}<CheckCircle2 class="w-4 h-4 text-[var(--color-primary)]" />{:else}-{/if}
              </td>
              <td class="p-4">
                {#if p.viewer}<CheckCircle2 class="w-4 h-4 text-[var(--color-primary)]" />{:else}-{/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </Card>
  {:else if activeSection === 'adr'}
    <div class="space-y-4">
      {#each DECISION_LOG as adr (adr.id)}
        <Card class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-[var(--color-primary)]">{adr.id}: {adr.topic}</span>
            <Badge variant="emerald">Disetujui</Badge>
          </div>
          <p class="text-xs text-[var(--color-text)]">{adr.selected}</p>
          <p class="text-[10px] text-[var(--color-muted-foreground)]">{adr.rationale}</p>
        </Card>
      {/each}
    </div>
  {:else if activeSection === 'checklist'}
    <Card class="space-y-3">
      {#each APPROVAL_CHECKLIST as c (c.id)}
        <div class="flex items-center gap-3 p-3 bg-[var(--color-bg)] rounded-2xl border border-[var(--color-border)]">
          <CheckCircle2 class="w-5 h-5 text-[var(--color-primary)] shrink-0" />
          <div>
            <div class="text-xs font-bold text-[var(--color-text)]">{c.title}</div>
            <div class="text-[10px] text-[var(--color-muted-foreground)]">{c.description}</div>
          </div>
        </div>
      {/each}
    </Card>
  {/if}
</div>
