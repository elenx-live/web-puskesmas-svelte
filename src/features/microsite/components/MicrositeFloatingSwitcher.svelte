<!-- @component Pengalih tema microsite mengambang — ganti template desain & animasi latar kinetik secara langsung. -->
<script lang="ts">
  import { fade, fly, scale } from 'svelte/transition';
  import { Palette, Sparkles, Check, ChevronUp, ChevronDown, X } from 'lucide-svelte';
  import type { HomepageTemplateType, BackgroundAnimationType } from '../../../shared/types/index.js';

  let {
    currentTemplate,
    onSelectTemplate,
    currentAnimation,
    onSelectAnimation
  }: {
    currentTemplate: HomepageTemplateType;
    onSelectTemplate: (t: HomepageTemplateType) => void;
    currentAnimation: BackgroundAnimationType;
    onSelectAnimation: (a: BackgroundAnimationType) => void;
  } = $props();

  const TEMPLATES: { id: HomepageTemplateType; label: string; desc: string; color: string }[] = [
    { id: 'modern_majestic', label: 'Grand & Majestic', desc: 'Kemegahan abadi & aksen emas zamrud', color: 'from-emerald-600 to-amber-500' },
    { id: 'artistic_bio', label: 'Bio-Luminescent', desc: 'Pendaran alami & seluler organik', color: 'from-teal-500 to-emerald-400' },
    { id: 'avant_garde', label: 'Avant-Garde Cyber', desc: 'Telemetri medis & grid teknologi', color: 'from-cyan-500 to-blue-600' },
    { id: 'nusantara_art', label: 'Harmoni Nusantara', desc: 'Kearifan etnik & batik hangat', color: 'from-amber-600 to-orange-500' },
    { id: 'minimal_gallery', label: 'Minimalist Gallery', desc: 'Studio seni kontemporer & tipografi tajam', color: 'from-zinc-700 to-zinc-900' },
    { id: 'classic', label: 'Classic Link Hub', desc: 'Format link-in-bio ringkas standar', color: 'from-emerald-700 to-teal-900' }
  ];

  const ANIMATIONS: { id: BackgroundAnimationType; label: string }[] = [
    { id: 'aurora_flow', label: 'Lembayung Aurora' },
    { id: 'bioluminescent', label: 'Pendar Hayati (Bio-Glow)' },
    { id: 'geometric_waves', label: 'Gelombang Kinetik' },
    { id: 'particle_mesh', label: 'Jaring Partikel' },
    { id: 'golden_radiance', label: 'Kilau Keemasan' },
    { id: 'subtle_glow', label: 'Pendaran Halus' },
    { id: 'none', label: 'Tanpa Animasi' }
  ];

  let isOpen = $state(false);
</script>

<div class="fixed bottom-5 right-5 z-50">
  {#if isOpen}
    <div
      in:fly={{ y: 20, duration: 200 }}
      out:fade={{ duration: 150 }}
      class="mb-3 w-80 sm:w-96 p-4 rounded-3xl bg-[var(--color-card)]/95 backdrop-blur-2xl border border-[var(--color-border)] shadow-2xl space-y-4"
    >
      <div class="flex items-center justify-between border-b border-[var(--color-border)] pb-2.5">
        <div class="flex items-center gap-2">
          <div class="w-7 h-7 rounded-xl bg-[var(--color-primary)]/15 text-[var(--color-primary)] flex items-center justify-center">
            <Palette class="w-4 h-4" />
          </div>
          <div>
            <h4 class="text-xs font-bold text-[var(--color-text)]">Ubah Tema Microsite</h4>
            <p class="text-[10px] text-[var(--color-muted-foreground)]">Eksplorasi gaya visual artistik</p>
          </div>
        </div>
        <button
          onclick={() => (isOpen = false)}
          class="p-1 rounded-xl text-[var(--color-muted-foreground)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] transition"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <div class="space-y-1.5">
        <label class="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted-foreground)] block">
          Pilihan Template Desain
        </label>
        <div class="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto pr-1">
          {#each TEMPLATES as t (t.id)}
            {@const isSelected = currentTemplate === t.id}
            <button
              onclick={() => onSelectTemplate(t.id)}
              class={`w-full p-2.5 rounded-2xl text-left border flex items-center justify-between transition-all ${
                isSelected
                  ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)] shadow-sm'
                  : 'bg-[var(--color-bg)]/60 hover:bg-[var(--color-bg)] border-[var(--color-border)]'
              }`}
            >
              <div class="flex items-center gap-2.5 min-w-0">
                <div class={`w-3.5 h-3.5 rounded-full bg-gradient-to-br ${t.color} shrink-0 shadow-sm`} />
                <div class="min-w-0">
                  <p class={`text-xs font-bold truncate ${isSelected ? 'text-[var(--color-primary)]' : 'text-[var(--color-text)]'}`}>
                    {t.label}
                  </p>
                  <p class="text-[10px] text-[var(--color-muted-foreground)] truncate">{t.desc}</p>
                </div>
              </div>
              {#if isSelected}<Check class="w-4 h-4 text-[var(--color-primary)] shrink-0 pl-1" />{/if}
            </button>
          {/each}
        </div>
      </div>

      <div class="space-y-1.5 pt-2 border-t border-[var(--color-border)]">
        <label class="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted-foreground)] flex items-center gap-1">
          <Sparkles class="w-3 h-3 text-amber-400" />
          <span>Animasi Latar Kinetik (Canvas 60 FPS)</span>
        </label>
        <div class="grid grid-cols-2 gap-1.5">
          {#each ANIMATIONS as a (a.id)}
            {@const isSelected = currentAnimation === a.id}
            <button
              onclick={() => onSelectAnimation(a.id)}
              class={`p-2 rounded-xl text-[11px] font-medium border text-left truncate transition ${
                isSelected
                  ? 'bg-[var(--color-primary)]/15 border-[var(--color-primary)] text-[var(--color-primary)] font-bold'
                  : 'bg-[var(--color-bg)]/60 hover:bg-[var(--color-bg)] border-[var(--color-border)] text-[var(--color-text)]'
              }`}
            >
              {a.label}
            </button>
          {/each}
        </div>
      </div>
    </div>
  {/if}

  <button
    onclick={() => (isOpen = !isOpen)}
    class="px-4 py-2.5 rounded-full bg-[var(--color-primary)] text-[var(--color-primary-foreground)] font-bold text-xs shadow-2xl flex items-center gap-2 hover:scale-105 active:scale-95 transition shadow-emerald-950/30"
  >
    <Palette class="w-4 h-4" />
    <span class="hidden sm:inline">Tema & Animasi</span>
    {#if isOpen}<ChevronDown class="w-3.5 h-3.5" />{:else}<ChevronUp class="w-3.5 h-3.5" />{/if}
  </button>
</div>
