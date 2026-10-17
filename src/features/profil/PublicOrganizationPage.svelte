<!--
  @component Halaman publik Struktur Organisasi — bagan hierarki unit dan daftar
  unit beserta penanggung jawab. Mode tampilan tree/card + tombol cetak.
  Dibungkus PublicLayout oleh App.svelte.
-->
<script lang="ts">
  import {
    GitBranch, Printer
  } from 'lucide-svelte';
  import { staffOrgService } from '../../shared/services/staffOrgService.js';
  import type { OrganizationNode, StaffProfile } from '../../shared/types/index.js';

  let nodes = $state<OrganizationNode[]>([]);
  let staffList = $state<StaffProfile[]>([]);
  let loading = $state(true);
  let viewMode = $state<'tree' | 'card'>('tree');

  $effect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [nData, sData] = await Promise.all([
          staffOrgService.getOrgNodes(),
          staffOrgService.getStaffProfiles(false)
        ]);
        if (cancelled) return;
        nodes = nData.filter(n => n.status === 'active' && n.showOnWebsite);
        staffList = sData;
      } catch (e) {
        console.error('Failed to load organization data:', e);
      } finally {
        if (!cancelled) loading = false;
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  });

  function staffFor(node: OrganizationNode): StaffProfile | undefined {
    return staffList.find(s => s.unitId === node.id || s.userId === node.userId);
  }

  const rootNodes = $derived(nodes.filter(n => !n.parentId));

  function handlePrint() {
    window.print();
  }
</script>

<div class="py-10 md:py-14 px-4 sm:px-6 max-w-7xl mx-auto space-y-10 animate-in fade-in duration-300">
  <!-- Header Breadcrumb & Section Title -->
  <div class="border-b border-[var(--color-border)] pb-8 space-y-4">
    <div class="flex flex-wrap items-center gap-2 text-xs text-[var(--color-muted-foreground)]">
      <a href="#/" class="hover:text-[var(--color-primary)] transition">Beranda</a>
      <span>/</span>
      <a href="#/profil" class="hover:text-[var(--color-primary)] transition">Profil</a>
      <span>/</span>
      <span class="text-[var(--color-primary)] font-semibold">Struktur Organisasi</span>
    </div>

    <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div class="space-y-2">
        <span class="inline-flex items-center gap-1.5 px-3 py-1 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-full text-xs font-bold uppercase tracking-wider">
          <GitBranch class="w-3.5 h-3.5" /> Struktur Organisasi Resmi
        </span>
        <h1 class="text-2xl sm:text-3xl md:text-4xl font-light text-[var(--color-text)] tracking-tight">
          Susunan Organisasi & Tata Kelola
        </h1>
        <p class="text-xs sm:text-sm text-[var(--color-muted-foreground)] max-w-2xl">
          Hierarki kepemimpinan, unit klaster Integrasi Layanan Primer (ILP), dan penanggung jawab operasional fasilitas kesehatan.
        </p>
      </div>

      <div class="flex items-center gap-3 shrink-0">
        <div class="flex bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl p-1 text-xs">
          <button
            onclick={() => viewMode = 'tree'}
            class={`px-3.5 py-1.5 rounded-xl font-medium transition ${
              viewMode === 'tree'
                ? 'bg-[var(--color-primary)] text-white'
                : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-text)]'
            }`}
          >
            Bagan Hierarki
          </button>
          <button
            onclick={() => viewMode = 'card'}
            class={`px-3.5 py-1.5 rounded-xl font-medium transition ${
              viewMode === 'card'
                ? 'bg-[var(--color-primary)] text-white'
                : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-text)]'
            }`}
          >
            Daftar Unit
          </button>
        </div>

        <button
          onclick={handlePrint}
          class="px-3.5 py-2 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text)] hover:text-[var(--color-primary)] text-xs font-semibold inline-flex items-center gap-1.5 transition shadow-xs"
        >
          <Printer class="w-3.5 h-3.5 text-[var(--color-primary)]" />
          <span class="hidden sm:inline">Cetak</span>
        </button>
      </div>
    </div>
  </div>

  <!-- Organization Content -->
  {#if loading}
    <div class="min-h-[40vh] flex flex-col items-center justify-center space-y-3">
      <div class="w-8 h-8 border-3 border-[var(--color-primary)]/20 border-t-[var(--color-primary)] rounded-full animate-spin"></div>
      <p class="text-xs text-[var(--color-muted-foreground)]">Memuat struktur organisasi...</p>
    </div>
  {:else if nodes.length === 0}
    <div class="p-12 rounded-3xl bg-[var(--color-card)] border border-[var(--color-border)] text-center space-y-3">
      <GitBranch class="w-12 h-12 text-[var(--color-muted-foreground)] mx-auto opacity-40" />
      <h3 class="text-sm font-bold text-[var(--color-text)]">Struktur Organisasi Belum Tersedia</h3>
      <p class="text-xs text-[var(--color-muted-foreground)]">Data bagan struktur sedang dalam tahap penataan oleh administrator.</p>
    </div>
  {:else if viewMode === 'tree'}
    <div class="space-y-6">
      {#each rootNodes as root (root.id)}
        {@const children = nodes.filter(n => n.parentId === root.id)}
        {@const assignedStaff = staffFor(root)}
        <div class="bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl p-6 md:p-8 space-y-6 shadow-xs">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-6">
            <div class="space-y-1.5">
              <span class="px-3 py-1 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-xs font-mono font-bold uppercase border border-[var(--color-primary)]/20">
                {root.title}
              </span>
              <h2 class="text-xl md:text-2xl font-bold text-[var(--color-text)]">{root.name}</h2>
              <p class="text-xs text-[var(--color-muted-foreground)] max-w-2xl">{root.description}</p>
            </div>

            {#if assignedStaff}
              <div class="flex items-center gap-3 bg-[var(--color-bg)] border border-[var(--color-border)] p-3 rounded-2xl shrink-0">
                <img src={assignedStaff.photoUrl} alt={assignedStaff.name} class="w-12 h-12 rounded-xl object-cover" />
                <div>
                  <div class="text-xs font-bold text-[var(--color-text)]">{assignedStaff.name}</div>
                  <div class="text-[11px] text-[var(--color-primary)]">{assignedStaff.positionTitle}</div>
                </div>
              </div>
            {:else}
              <div class="px-4 py-3 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-muted-foreground)] text-xs italic shrink-0">
                Penanggung Jawab Belum Ditetapkan
              </div>
            {/if}
          </div>

          <!-- Sub units -->
          {#if children.length > 0}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pl-0 md:pl-6 border-l-0 md:border-l-2 md:border-[var(--color-primary)]/20 pt-2">
              {#each children as child (child.id)}
                {@const childStaff = staffFor(child)}
                <div class="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl p-5 space-y-3">
                  <div class="space-y-1">
                    <span class="px-2.5 py-0.5 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-[10px] font-mono font-bold uppercase">
                      {child.title}
                    </span>
                    <h3 class="text-sm font-bold text-[var(--color-text)]">{child.name}</h3>
                    <p class="text-xs text-[var(--color-muted-foreground)]">{child.description}</p>
                  </div>

                  {#if childStaff}
                    <div class="flex items-center gap-2.5 pt-2 border-t border-[var(--color-border)]">
                      <img src={childStaff.photoUrl} alt={childStaff.name} class="w-8 h-8 rounded-full object-cover" />
                      <div class="text-xs">
                        <div class="font-semibold text-[var(--color-text)]">{childStaff.name}</div>
                        <div class="text-[10px] text-[var(--color-muted-foreground)]">{childStaff.positionTitle}</div>
                      </div>
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {:else}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {#each nodes as n (n.id)}
        {@const assigned = staffFor(n)}
        <div class="bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl p-6 space-y-4 shadow-xs flex flex-col justify-between">
          <div class="space-y-2">
            <span class="px-2.5 py-0.5 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-[10px] font-mono font-bold uppercase">
              {n.title}
            </span>
            <h3 class="text-base font-bold text-[var(--color-text)]">{n.name}</h3>
            <p class="text-xs text-[var(--color-muted-foreground)]">{n.description}</p>
          </div>

          {#if assigned}
            <div class="flex items-center gap-3 pt-3 border-t border-[var(--color-border)]">
              <img src={assigned.photoUrl} alt={assigned.name} class="w-10 h-10 rounded-xl object-cover" />
              <div class="text-xs">
                <div class="font-bold text-[var(--color-text)]">{assigned.name}</div>
                <div class="text-[10px] text-[var(--color-muted-foreground)]">{assigned.positionTitle}</div>
              </div>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>
