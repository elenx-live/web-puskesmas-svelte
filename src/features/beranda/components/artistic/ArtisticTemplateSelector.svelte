<!-- @component Pilihan template artistik beranda (floating drawer kanan bawah). -->
<script lang="ts">
  import { scale } from 'svelte/transition';
  import {
    Sparkles,
    Palette,
    Crown,
    Leaf,
    Zap,
    LayoutGrid,
    Check,
    Settings,
    X
  } from 'lucide-svelte';
  import type { HomepageTemplateType, BackgroundAnimationType } from '../../../../shared/types/index.js';

  interface TemplateOption {
    id: HomepageTemplateType;
    name: string;
    tag: string;
    desc: string;
    bgAnim: BackgroundAnimationType;
    icon: typeof Crown;
    color: string;
  }

  export const TEMPLATE_OPTIONS: TemplateOption[] = [
    {
      id: 'modern_majestic',
      name: 'Kemegahan Mahakarya Sovereign',
      tag: 'Megah & Modern',
      desc: 'Latar aurora bersinar, tipografi editorial aristokrat, glassmorphism dengan aksen emas-zamrud.',
      bgAnim: 'aurora_flow',
      icon: Crown,
      color: 'from-amber-500 to-emerald-600'
    },
    {
      id: 'artistic_bio',
      name: 'Seni Organik Bio-Luminescence',
      tag: 'Alami & Holistik',
      desc: 'Latar partikel sel bercahaya, kurva organik lembut, pilar kesehatan holistik dan kesejahteraan.',
      bgAnim: 'bioluminescent',
      icon: Leaf,
      color: 'from-emerald-500 to-teal-500'
    },
    {
      id: 'avant_garde',
      name: 'Avant-Garde Cyber-Clinic',
      tag: 'Futuristik Medis',
      desc: 'Matriks partikel presisi, telemetri radar antrean langsung, neon cyber-clinical modern.',
      bgAnim: 'particle_mesh',
      icon: Zap,
      color: 'from-cyan-500 to-indigo-600'
    },
    {
      id: 'nusantara_art',
      name: 'Harmoni Nusantara Modern',
      tag: 'Kearifan & Kehangatan',
      desc: 'Nuansa hangat batik geometris modern, kehangatan ramah tamah, dan maklumat pelayanan resmi.',
      bgAnim: 'golden_radiance',
      icon: Sparkles,
      color: 'from-amber-600 to-rose-600'
    },
    {
      id: 'minimal_gallery',
      name: 'Studio Seni Kontemporer',
      tag: 'Galeri Minimalis',
      desc: 'Arsitektur visual Swiss yang bersih, tipografi berskala besar, dan ruang negatif elegan.',
      bgAnim: 'geometric_waves',
      icon: Palette,
      color: 'from-slate-700 to-zinc-900'
    },
    {
      id: 'classic',
      name: 'Klasik Modular Builder',
      tag: 'Standar Fleksibel',
      desc: 'Tata letak modular standar sesuai urutan section pada Homepage Builder admin.',
      bgAnim: 'none',
      icon: LayoutGrid,
      color: 'from-blue-600 to-teal-600'
    }
  ];

  interface Props {
    currentTemplate: HomepageTemplateType;
    onSelectTemplate: (template: HomepageTemplateType) => void;
  }

  let { currentTemplate, onSelectTemplate }: Props = $props();

  let isOpen = $state(false);

  const activeOption = $derived(
    TEMPLATE_OPTIONS.find((t) => t.id === currentTemplate) || TEMPLATE_OPTIONS[0]
  );
</script>

<div class="fixed bottom-6 right-6 z-50 flex flex-col items-end">
  {#if isOpen}
    <div
      transition:scale={{ duration: 250, start: 0.95, opacity: 0 }}
      class="mb-3 w-80 sm:w-96 rounded-3xl bg-[var(--color-card)]/95 backdrop-blur-xl border border-[var(--color-border)] shadow-2xl p-5 space-y-4 overflow-hidden"
    >
      <div class="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
        <div class="flex items-center gap-2">
          <div class="p-2 rounded-xl bg-gradient-to-tr from-amber-500 to-emerald-600 text-white shadow-md">
            <Sparkles class="w-4 h-4 animate-spin" />
          </div>
          <div>
            <h4 class="text-xs font-black text-[var(--color-text)] uppercase tracking-wider">
              Galeri Template Seniman
            </h4>
            <p class="text-[10px] text-[var(--color-muted-foreground)]">
              Ubah desain estetika halaman depan secara instan
            </p>
          </div>
        </div>
        <button
          type="button"
          onclick={() => (isOpen = false)}
          class="p-1.5 rounded-full hover:bg-[var(--color-bg)] text-[var(--color-muted-foreground)] transition"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <div class="space-y-2 max-h-80 overflow-y-auto pr-1">
        {#each TEMPLATE_OPTIONS as opt (opt.id)}
          {@const Icon = opt.icon}
          {@const isSelected = currentTemplate === opt.id}
          <button
            type="button"
            onclick={() => {
              onSelectTemplate(opt.id);
              isOpen = false;
            }}
            class="w-full p-3 rounded-2xl text-left border transition-all flex items-start gap-3 group {isSelected
              ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)] shadow-md'
              : 'bg-[var(--color-bg)]/80 border-[var(--color-border)] hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-card)]'}"
          >
            <div
              class="p-2.5 rounded-xl bg-gradient-to-tr {opt.color} text-white shadow-sm shrink-0 mt-0.5 group-hover:scale-105 transition"
            >
              <Icon class="w-4 h-4" />
            </div>
            <div class="flex-1 min-w-0 space-y-0.5">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-[var(--color-text)] truncate">
                  {opt.name}
                </span>
                {#if isSelected}
                  <Check class="w-4 h-4 text-[var(--color-primary)] shrink-0" />
                {/if}
              </div>
              <span class="inline-block text-[9px] px-2 py-0.5 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-bold">
                {opt.tag}
              </span>
              <p class="text-[10px] text-[var(--color-muted-foreground)] line-clamp-2 leading-relaxed">
                {opt.desc}
              </p>
            </div>
          </button>
        {/each}
      </div>

      <div class="pt-2 border-t border-[var(--color-border)] flex items-center justify-between text-[10px] text-[var(--color-muted-foreground)]">
        <span class="flex items-center gap-1 font-medium">
          <Palette class="w-3 h-3 text-[var(--color-primary)]" />
          <span>5 Template Artistik Tersedia</span>
        </span>
        <a
          href="#/admin/builder"
          class="text-[var(--color-primary)] font-bold hover:underline flex items-center gap-1"
        >
          <span>Kelola di Admin</span>
          <Settings class="w-3 h-3" />
        </a>
      </div>
    </div>
  {/if}

  <button
    type="button"
    onclick={() => (isOpen = !isOpen)}
    class="flex items-center gap-2.5 px-4 py-3 rounded-full bg-[var(--color-card)]/90 backdrop-blur-xl border border-[var(--color-border)] hover:border-[var(--color-primary)] text-[var(--color-text)] shadow-2xl hover:shadow-[var(--color-primary)]/20 transition-all text-xs font-bold hover:scale-105 active:scale-95"
  >
    <div class="w-6 h-6 rounded-full bg-gradient-to-tr {activeOption.color} text-white flex items-center justify-center shadow-sm">
      <activeOption.icon class="w-3.5 h-3.5" />
    </div>
    <span class="hidden sm:inline">Desain: {activeOption.name}</span>
    <span class="sm:hidden">{activeOption.tag}</span>
    <Sparkles class="w-3.5 h-3.5 text-amber-500 animate-pulse" />
  </button>
</div>
