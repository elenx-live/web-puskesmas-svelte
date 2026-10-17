<!-- @component Halaman admin: Tema & Home Page Builder — studio kustomisasi palet warna, preset tema, susunan section beranda, template artistik, animasi latar, dan pratinjau interaktif. -->
<script lang="ts">
  import { onMount } from 'svelte';
  import {
    Palette, LayoutGrid, Sparkles, RotateCcw, Save, Check, AlertTriangle,
    Eye, EyeOff, Settings, ChevronUp, ChevronDown, ChevronRight, Trash2, Plus, Tv,
    Tablet, Smartphone, Crown, Leaf, Zap
  } from 'lucide-svelte';
  import Card from '../../../shared/ui/Card.svelte';
  import Button from '../../../shared/ui/Button.svelte';
  import Badge from '../../../shared/ui/Badge.svelte';
  import Input from '../../../shared/ui/Input.svelte';
  import Modal from '../../../shared/ui/Modal.svelte';
  import ThemeStyleInjector from '../../../shared/components/ThemeStyleInjector.svelte';
  import { themeService, THEME_PRESETS } from '../../../shared/services/themeService.js';
  import { homepageService } from '../../../shared/services/homepageService.js';
  import type {
    GlobalThemeConfig, HomepageSection, HomepageTemplateType,
    BackgroundAnimationType
  } from '../../../shared/types/index.js';
  import { authStore } from '../../../shared/stores/auth.svelte.js';
  import { toastStore } from '../../../shared/stores/toast.svelte.js';

  const user = $derived(authStore.user);

  type ActiveTab = 'warna' | 'konten' | 'tampilan' | 'publikasi';
  type PreviewMode = 'desktop' | 'tablet' | 'mobile';

  const SECTION_OPTIONS = [
    { value: 'hero', label: 'Hero Banner' },
    { value: 'sambutan', label: 'Sambutan Kepala Puskesmas' },
    { value: 'info', label: 'Informasi Puskesmas (Grid)' },
    { value: 'unggulan', label: 'Layanan Unggulan' },
    { value: 'layanan', label: 'Daftar Layanan Kesehatan' },
    { value: 'jadwal', label: 'Jadwal Pelayanan Poli' },
    { value: 'berita', label: 'Berita & Artikel' },
    { value: 'pengumuman', label: 'Pengumuman Penting' },
    { value: 'statistik', label: 'Statistik Pelayanan' },
    { value: 'kritik_saran', label: 'Kritik & Saran / Pengaduan' },
    { value: 'kontak', label: 'Kontak Hubung' },
    { value: 'lokasi', label: 'Lokasi & Peta' },
    { value: 'microsites', label: 'Microsite' },
    { value: 'cta', label: 'Call to Action (UGD Darurat)' }
  ];

  const TEMPLATE_OPTIONS = [
    { id: 'modern_majestic' as HomepageTemplateType, name: 'Kemegahan Mahakarya Sovereign', tag: 'Megah & Modern', desc: 'Latar aurora bersinar, tipografi editorial aristokrat, glassmorphism dengan aksen emas-zamrud.', bgAnim: 'aurora_flow' as BackgroundAnimationType, icon: Crown, color: 'from-amber-500 to-emerald-600' },
    { id: 'artistic_bio' as HomepageTemplateType, name: 'Seni Organik Bio-Luminescence', tag: 'Alami & Holistik', desc: 'Latar partikel sel bercahaya, kurva organik lembut, pilar kesehatan holistik dan kesejahteraan.', bgAnim: 'bioluminescent' as BackgroundAnimationType, icon: Leaf, color: 'from-emerald-500 to-teal-500' },
    { id: 'avant_garde' as HomepageTemplateType, name: 'Avant-Garde Cyber-Clinic', tag: 'Futuristik Medis', desc: 'Matriks partikel presisi, telemetri radar antrean langsung, neon cyber-clinical modern.', bgAnim: 'particle_mesh' as BackgroundAnimationType, icon: Zap, color: 'from-cyan-500 to-indigo-600' },
    { id: 'nusantara_art' as HomepageTemplateType, name: 'Harmoni Nusantara Modern', tag: 'Kearifan & Kehangatan', desc: 'Nuansa hangat batik geometris modern, kehangatan ramah tamah, dan maklumat pelayanan resmi.', bgAnim: 'golden_radiance' as BackgroundAnimationType, icon: Sparkles, color: 'from-amber-600 to-rose-600' },
    { id: 'minimal_gallery' as HomepageTemplateType, name: 'Studio Seni Kontemporer', tag: 'Galeri Minimalis', desc: 'Arsitektur visual Swiss yang bersih, tipografi berskala besar, dan ruang negatif elegan.', bgAnim: 'geometric_waves' as BackgroundAnimationType, icon: Palette, color: 'from-slate-700 to-zinc-900' },
    { id: 'classic' as HomepageTemplateType, name: 'Klasik Modular Builder', tag: 'Standar Fleksibel', desc: 'Tata letak modular standar sesuai urutan section pada Homepage Builder admin.', bgAnim: 'none' as BackgroundAnimationType, icon: LayoutGrid, color: 'from-blue-600 to-teal-600' }
  ];

  const BG_ANIMATION_OPTIONS = [
    { id: 'aurora_flow', label: 'Aurora Flow', desc: 'Gradien lembut bergelombang' },
    { id: 'particles_floating', label: 'Floating Particles', desc: 'Partikel kesehatan melayang' },
    { id: 'waves_pulse', label: 'Soft Waves', desc: 'Gelombang ritme lembut' },
    { id: 'static_gradient', label: 'Static Clean', desc: 'Gradien statis bersih' }
  ];

  let activeTab = $state<ActiveTab>('warna');

  const TAB_STEPS: { id: ActiveTab; label: string; desc: string }[] = [
    { id: 'warna', label: 'Warna & Gaya', desc: 'Palet warna & preset' },
    { id: 'konten', label: 'Konten Beranda', desc: 'Susun section' },
    { id: 'tampilan', label: 'Tampilan', desc: 'Template & animasi' },
    { id: 'publikasi', label: 'Pratinjau & Publikasi', desc: 'Cek & terbitkan' },
  ];

  // Theme State
  let theme = $state<GlobalThemeConfig | null>(null);
  let contrastWarning = $state<string | null>(null);

  // Homepage Builder State
  let homeConfig = $state<import('../../../shared/types/index.js').HomepageBuilderConfig | null>(null);
  let sections = $state<HomepageSection[]>([]);
  let selectedTemplate = $state<HomepageTemplateType>('modern_majestic');
  let selectedBgAnimation = $state<BackgroundAnimationType>('aurora_flow');

  // Preview & Context Data
  let previewMode = $state<PreviewMode>('desktop');

  // Modals & Forms
  let editingSection = $state<HomepageSection | null>(null);
  let isAddModalOpen = $state(false);
  let newSectionType = $state('layanan');
  let newSectionTitle = $state('');

  // Status & Loaders
  let loading = $state(true);
  let isSavingDraft = $state(false);
  let isPublishing = $state(false);
  let lastSaved = $state('');

  onMount(() => {
    loadAllConfigs();
  });

  async function loadAllConfigs() {
    try {
      loading = true;
      // Hanya load yang benar-benar dipakai (theme + homepage)
      // services/posts/settings/announcements tidak dipakai di halaman ini
      const [themeDraft, homeDraft] = await Promise.all([
        themeService.getDraftConfig(),
        homepageService.getDraftConfig(),
      ]);

      theme = themeDraft;
      lastSaved = themeDraft.updatedAt || new Date().toISOString();

      homeConfig = homeDraft;
      sections = homeDraft.sections || [];
      if (homeDraft.template) selectedTemplate = homeDraft.template;
      if (homeDraft.backgroundAnimation) selectedBgAnimation = homeDraft.backgroundAnimation;
    } catch (err) {
      console.error('Error loading theme and homepage configs:', err);
      toastStore.showToast('Gagal memuat konfigurasi tema dan beranda', 'error');
    } finally {
      loading = false;
    }
  }

  // WCAG Contrast Check
  $effect(() => {
    const t = theme;
    if (!t) return;
    const getBrightness = (hex: string) => {
      let r = 0, g = 0, b = 0;
      if (hex.length === 4) {
        r = parseInt(hex[1] + hex[1], 16);
        g = parseInt(hex[2] + hex[2], 16);
        b = parseInt(hex[3] + hex[3], 16);
      } else if (hex.length === 7) {
        r = parseInt(hex.substring(1, 3), 16);
        g = parseInt(hex.substring(3, 5), 16);
        b = parseInt(hex.substring(5, 7), 16);
      }
      return Math.sqrt(0.299 * (r * r) + 0.587 * (g * g) + 0.114 * (b * b));
    };

    try {
      const bgBright = getBrightness(t.colorBg);
      const textBright = getBrightness(t.colorText);
      const diff = Math.abs(bgBright - textBright);

      if (diff < 125) {
        contrastWarning = 'Peringatan: Kontras antara teks dan latar belakang relatif rendah. Disarankan memilih warna yang lebih kontras demi kenyamanan pasien & lansia.';
      } else {
        contrastWarning = null;
      }
    } catch {
      contrastWarning = null;
    }
  });

  // Theme Handlers
  function handleColorChange(field: keyof GlobalThemeConfig, val: string) {
    if (!theme) return;
    theme = { ...theme, [field]: val };
  }

  function handleApplyPreset(presetKey: string) {
    const p = THEME_PRESETS[presetKey];
    if (p && theme) {
      theme = {
        ...theme,
        themeName: p.themeName,
        colorPrimary: p.colorPrimary,
        colorPrimaryForeground: p.colorPrimaryForeground,
        colorSecondary: p.colorSecondary,
        colorSecondaryForeground: p.colorSecondaryForeground,
        colorAccent: p.colorAccent,
        colorAccentForeground: p.colorAccentForeground,
        colorBg: p.colorBg,
        colorText: p.colorText,
        colorCard: p.colorCard,
        colorSurface: p.colorSurface,
        colorSurfaceForeground: p.colorSurfaceForeground,
        colorMuted: p.colorMuted,
        colorMutedForeground: p.colorMutedForeground,
        colorBorder: p.colorBorder,
        colorInput: p.colorInput,
        colorRing: p.colorRing
      };
      toastStore.showToast(`Preset tema "${p.themeName}" diterapkan ke editor`, 'info');
    }
  }

  // Section Handlers
  function handleMoveSection(index: number, direction: 'up' | 'down') {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sections.length) return;

    const newSections = [...sections];
    const [moved] = newSections.splice(index, 1);
    newSections.splice(targetIndex, 0, moved);

    const reordered = newSections.map((s, idx) => ({ ...s, order: idx }));
    sections = reordered;
  }

  function handleToggleVisibility(index: number) {
    const newSections = [...sections];
    newSections[index] = { ...newSections[index], visible: !newSections[index].visible };
    sections = newSections;
  }

  function handleDeleteSection(index: number) {
    if (confirm('Apakah Anda yakin ingin menghapus section ini dari susunan beranda?')) {
      const newSections = sections.filter((_, idx) => idx !== index).map((s, idx) => ({ ...s, order: idx }));
      sections = newSections;
      toastStore.showToast('Section dihapus dari daftar', 'info');
    }
  }

  function handleAddSection() {
    if (!newSectionTitle.trim()) {
      toastStore.showToast('Judul section wajib diisi', 'error');
      return;
    }

    const newSec: HomepageSection = {
      id: `sec-${Date.now()}`,
      type: newSectionType as HomepageSection['type'],
      title: newSectionTitle,
      visible: true,
      order: sections.length,
      settings: {}
    };

    sections = [...sections, newSec];
    isAddModalOpen = false;
    newSectionTitle = '';
    toastStore.showToast('Section baru berhasil ditambahkan', 'success');
  }

  function handleSaveSectionSettings() {
    if (!editingSection) return;
    const newSections = sections.map(s => s.id === editingSection!.id ? editingSection! : s);
    sections = newSections;
    editingSection = null;
    toastStore.showToast('Pengaturan section diperbarui', 'success');
  }

  function getActor() {
    const u = user;
    return {
      id: u?.uid || 'usr-admin',
      email: u?.email || 'admin@puskesmas.go.id',
      name: u?.displayName || 'Administrator'
    };
  }

  // Unified Save & Publish
  function moveSection(index: number, direction: number) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= sections.length) return;
    const updated = [...sections];
    const [moved] = updated.splice(index, 1);
    updated.splice(newIndex, 0, moved);
    sections = updated;
  }

  function removeSection(id: string) {
    if (!confirm('Hapus section ini?')) return;
    sections = sections.filter(s => s.id !== id);
  }

  function addSection() {
    const opt = SECTION_OPTIONS.find(o => o.value === newSectionType);
    const newSec: HomepageSection = {
      id: `sec-${Date.now()}`,
      type: newSectionType as any,
      title: newSectionTitle.trim() || opt?.label || newSectionType,
      visible: true,
      order: sections.length
    };
    sections = [...sections, newSec];
    isAddModalOpen = false;
    newSectionTitle = '';
    newSectionType = 'layanan';
  }

  async function handleSaveDraft() {
    if (!theme) { toastStore.showToast("Tema belum dimuat", "error"); return; }
    try {
      isSavingDraft = true;
      const userMeta = getActor();

      await Promise.all([
        themeService.saveDraft(theme, userMeta),
        homepageService.saveDraft(sections, userMeta, selectedTemplate, selectedBgAnimation)
      ]);

      lastSaved = new Date().toISOString();
      toastStore.showToast('Draft Tema & Susunan Beranda berhasil disimpan!', 'success');
    } catch (err) {
      console.error('Error saving draft:', err);
      toastStore.showToast('Gagal menyimpan draft', 'error');
    } finally {
      isSavingDraft = false;
    }
  }

  async function handlePublish() {
    if (!theme) { toastStore.showToast("Tema belum dimuat", "error"); return; }
    try {
      isPublishing = true;
      const userMeta = getActor();

      await Promise.all([
        themeService.publish(theme, userMeta),
        homepageService.publish(sections, userMeta, selectedTemplate, selectedBgAnimation)
      ]);

      lastSaved = new Date().toISOString();
      toastStore.showToast('Tema dan Beranda berhasil dipublikasikan ke seluruh perangkat!', 'success');
    } catch (err) {
      console.error('Error publishing:', err);
      toastStore.showToast('Gagal mempublikasikan tema & beranda', 'error');
    } finally {
      isPublishing = false;
    }
  }

  async function handleResetToDefault() {
    if (!user || !confirm('Reset seluruh palet warna dan susunan beranda ke setelan awal Puskesmas?')) return;
    try {
      loading = true;
      const userMeta = getActor();

      const [resetTheme, resetHome] = await Promise.all([
        themeService.resetToDefault(userMeta),
        homepageService.resetToDefault(userMeta)
      ]);

      theme = resetTheme;
      sections = resetHome.sections;
      selectedTemplate = resetHome.template || 'modern_majestic';
      selectedBgAnimation = resetHome.backgroundAnimation || 'aurora_flow';

      toastStore.showToast('Konfigurasi Tema & Beranda berhasil direset ke standar', 'info');
    } catch (err) {
      console.error('Error resetting:', err);
      toastStore.showToast('Gagal mereset konfigurasi', 'error');
    } finally {
      loading = false;
    }
  }

  const activeSectionCount = $derived(sections.filter(s => s.visible).length);
  const activeTemplateOption = $derived(TEMPLATE_OPTIONS.find(t => t.id === selectedTemplate) || TEMPLATE_OPTIONS[0]);

  function previewWidthClass() {
    if (previewMode === 'desktop') return 'w-full max-w-6xl';
    if (previewMode === 'tablet') return 'w-[768px]';
    return 'w-[375px]';
  }

  // Navigasi langkah: mudah & intuitif
  function goToStep(step: ActiveTab) {
    activeTab = step;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function nextStep() {
    const idx = TAB_STEPS.findIndex(s => s.id === activeTab);
    if (idx < TAB_STEPS.length - 1) goToStep(TAB_STEPS[idx + 1].id);
  }
  function prevStep() {
    const idx = TAB_STEPS.findIndex(s => s.id === activeTab);
    if (idx > 0) goToStep(TAB_STEPS[idx - 1].id);
  }
</script>

<div class="space-y-6">
  <div class="flex flex-wrap items-center justify-between gap-4">
    <div>
      <h1 class="text-2xl font-bold text-slate-900 flex items-center gap-2">
        <Palette class="w-6 h-6 text-emerald-700" />
        Tema & Home Page Builder
      </h1>
      <p class="text-sm text-slate-500 mt-1">Kustomisasi palet warna, susunan section beranda, template artistik, dan pratinjau langsung.</p>
    </div>
    <div class="flex items-center gap-2">
      {#if lastSaved}
        <span class="text-xs text-slate-400 hidden sm:inline">Terakhir disimpan: {new Date(lastSaved).toLocaleString('id-ID')}</span>
      {/if}
      <Button variant="outline" size="sm" onclick={handleResetToDefault} disabled={loading} title="Kembalikan ke pengaturan awal">
        <RotateCcw class="w-4 h-4 mr-1" /> <span class="hidden sm:inline">Reset</span>
      </Button>
      <Button size="sm" onclick={() => activeTab = 'publikasi'} class="bg-emerald-700 hover:bg-emerald-800 rounded-xl whitespace-nowrap">
        <Eye class="w-4 h-4 mr-1 shrink-0" /> Publikasi
      </Button>
    </div>
  </div>

  {#if loading}
    <Card class="p-12 text-center">
      <div class="animate-pulse space-y-4">
        <div class="h-4 bg-slate-200 rounded w-1/3 mx-auto"></div>
        <div class="h-4 bg-slate-200 rounded w-1/2 mx-auto"></div>
        <p class="text-sm text-slate-500">Memuat konfigurasi tema...</p>
      </div>
    </Card>
  {:else if !theme}
    <Card class="p-12 text-center">
      <AlertTriangle class="w-12 h-12 text-amber-500 mx-auto mb-4" />
      <p class="text-slate-600">Gagal memuat konfigurasi tema.</p>
      <Button variant="outline" size="sm" onclick={loadAllConfigs} class="mt-4">Coba Lagi</Button>
    </Card>
  {:else}
    <!-- Step indicator: alur yang jelas 1 → 2 → 3 → 4 -->
    <div class="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-2">
      {#each TAB_STEPS as step, i}
        <button
          onclick={() => activeTab = step.id}
          class="flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap {activeTab === step.id ? 'bg-emerald-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}"
        >
          <span class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold {activeTab === step.id ? 'bg-white/20' : 'bg-slate-200 text-slate-600'}">{i + 1}</span>
          <span class="hidden sm:inline">
            <span class="block leading-tight">{step.label}</span>
            <span class="block text-[10px] font-normal opacity-75 leading-tight">{step.desc}</span>
          </span>
          <span class="sm:hidden">{step.label}</span>
        </button>
        {#if i < TAB_STEPS.length - 1}
          <ChevronRight class="w-4 h-4 text-slate-300 shrink-0" />
        {/if}
      {/each}
    </div>

    {#if contrastWarning}
      <div class="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2 text-sm text-amber-800">
        <AlertTriangle class="w-4 h-4 mt-0.5 shrink-0" />
        <span>{contrastWarning}</span>
      </div>
    {/if}

    {#if activeTab === 'warna'}
      <Card class="p-6">
        <h2 class="text-sm font-bold text-slate-800 uppercase tracking-wider mb-1">Pilih Koleksi Tema Standar Kesehatan</h2>
        <p class="text-xs text-slate-500 mb-4">Pilih salah satu palet yang telah disesuaikan dengan pedoman identitas visual Kemenkes & standar pelayanan kesehatan.</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {#each Object.values(THEME_PRESETS) as preset}
            {@const isSelected = theme.themeName === preset.themeName}
            <button
              onclick={() => { theme = { ...theme, ...preset }; }}
              class="p-4 rounded-xl border text-left transition-all {isSelected ? 'border-emerald-600 ring-2 ring-emerald-500/20 bg-emerald-50/50' : 'border-slate-200 bg-white hover:border-slate-300'}"
            >
              <div class="flex items-center justify-between mb-3">
                <span class="text-xs font-bold text-slate-800">{preset.themeName}</span>
                {#if isSelected}<Badge class="text-[10px]">Aktif</Badge>{/if}
              </div>
              <div class="flex items-center gap-1 h-6 rounded-lg overflow-hidden border border-slate-200">
                <div class="h-full flex-1" style="background-color: {preset.colorPrimary}"></div>
                <div class="h-full flex-1" style="background-color: {preset.colorSecondary}"></div>
                <div class="h-full flex-1" style="background-color: {preset.colorAccent}"></div>
                <div class="h-full flex-1" style="background-color: {preset.colorBg}"></div>
              </div>
            </button>
          {/each}
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card class="p-6 border border-slate-200">
            <h3 class="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Warna Identitas Utama & Brand</h3>
            <div class="space-y-3">
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Warna Utama (Primary)</label>
                <div class="flex items-center gap-3">
                  <input type="color" bind:value={theme.colorPrimary} class="w-10 h-10 rounded-lg cursor-pointer border border-slate-200 p-0.5" />
                  <Input bind:value={theme.colorPrimary} class="text-xs font-mono" />
                </div>
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Warna Sekunder (Secondary)</label>
                <div class="flex items-center gap-3">
                  <input type="color" bind:value={theme.colorSecondary} class="w-10 h-10 rounded-lg cursor-pointer border border-slate-200 p-0.5" />
                  <Input bind:value={theme.colorSecondary} class="text-xs font-mono" />
                </div>
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Warna Aksen (Accent / Sorotan)</label>
                <div class="flex items-center gap-3">
                  <input type="color" bind:value={theme.colorAccent} class="w-10 h-10 rounded-lg cursor-pointer border border-slate-200 p-0.5" />
                  <Input bind:value={theme.colorAccent} class="text-xs font-mono" />
                </div>
              </div>
            </div>
          </Card>
          <Card class="p-6 border border-slate-200">
            <h3 class="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Latar Belakang, Kartu & Tipografi</h3>
            <div class="space-y-3">
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Latar Belakang (Background Halaman)</label>
                <div class="flex items-center gap-3">
                  <input type="color" bind:value={theme.colorBg} class="w-10 h-10 rounded-lg cursor-pointer border border-slate-200 p-0.5" />
                  <Input bind:value={theme.colorBg} class="text-xs font-mono" />
                </div>
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Warna Teks Utama (Typography)</label>
                <div class="flex items-center gap-3">
                  <input type="color" bind:value={theme.colorText} class="w-10 h-10 rounded-lg cursor-pointer border border-slate-200 p-0.5" />
                  <Input bind:value={theme.colorText} class="text-xs font-mono" />
                </div>
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Warna Kartu (Card)</label>
                <div class="flex items-center gap-3">
                  <input type="color" bind:value={theme.colorCard} class="w-10 h-10 rounded-lg cursor-pointer border border-slate-200 p-0.5" />
                  <Input bind:value={theme.colorCard} class="text-xs font-mono" />
                </div>
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Gaya Kelengkungan Sudut (Radius)</label>
                <select bind:value={theme.radius} class="w-full rounded-xl border border-slate-200 p-2.5 text-xs bg-white">
                  <option value="sharp">Kotak Tajam (Modern Sharp - 0px)</option>
                  <option value="rounded">Standar Halus (Rounded - 12px)</option>
                  <option value="pill">Ekstra Bulat (Pill Full - 24px)</option>
                </select>
              </div>
            </div>
          </Card>
        </div>
      </Card>
      <!-- Navigasi langkah -->
      <div class="flex justify-end mt-4">
        <Button onclick={nextStep} class="bg-emerald-700 hover:bg-emerald-800 rounded-xl">
          Lanjut: Konten Beranda <ChevronRight class="w-4 h-4 ml-1" />
        </Button>
      </div>
    {:else if activeTab === 'konten'}
      <Card class="p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-semibold text-slate-900">Susunan Section Beranda</h2>
          <Button size="sm" onclick={() => isAddModalOpen = true}>
            <Plus class="w-4 h-4 mr-1" /> Tambah Section
          </Button>
        </div>
        {#if sections.length === 0}
          <p class="text-sm text-slate-500 text-center py-8">Belum ada section. Klik "Tambah Section" untuk mulai menyusun beranda.</p>
        {:else}
          <div class="space-y-2">
            {#each sections as section, i (section.id)}
              <div class="flex items-center gap-3 p-3 border rounded-xl bg-slate-50">
                <span class="text-xs text-slate-400 font-mono w-6">{i + 1}</span>
                <div class="flex-1">
                  <p class="text-sm font-medium text-slate-800">{section.title || SECTION_OPTIONS.find(o => o.value === section.type)?.label || section.type}</p>
                  <p class="text-xs text-slate-500">{section.type}</p>
                </div>
                <button
                  onclick={() => { section.visible = !section.visible; sections = [...sections]; }}
                  class="p-1.5 rounded-lg hover:bg-slate-200"
                  title={section.visible ? 'Sembunyikan' : 'Tampilkan'}
                >
                  {#if section.visible}<Eye class="w-4 h-4 text-emerald-600" />{:else}<EyeOff class="w-4 h-4 text-slate-400" />{/if}
                </button>
                <button onclick={() => moveSection(i, -1)} disabled={i === 0} class="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-30">
                  <ChevronUp class="w-4 h-4" />
                </button>
                <button onclick={() => moveSection(i, 1)} disabled={i === sections.length - 1} class="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-30">
                  <ChevronDown class="w-4 h-4" />
                </button>
                <button onclick={() => removeSection(section.id)} class="p-1.5 rounded-lg hover:bg-red-100">
                  <Trash2 class="w-4 h-4 text-red-500" />
                </button>
              </div>
            {/each}
          </div>
        {/if}
      </Card>
      <div class="flex justify-between mt-4">
        <Button variant="outline" onclick={prevStep}>
          <ChevronRight class="w-4 h-4 mr-1 rotate-180" /> Kembali
        </Button>
        <Button onclick={nextStep} class="bg-emerald-700 hover:bg-emerald-800 rounded-xl">
          Lanjut: Tampilan <ChevronRight class="w-4 h-4 ml-1" />
        </Button>
      </div>
    {:else if activeTab === 'tampilan'}
      <Card class="p-6">
        <h2 class="font-semibold text-slate-900 mb-4">Pilih Template Beranda</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {#each TEMPLATE_OPTIONS as tpl}
            <button
              onclick={() => { selectedTemplate = tpl.id; }}
              class="text-left p-4 rounded-xl border-2 transition {selectedTemplate === tpl.id ? 'border-emerald-600 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'}"
            >
              <div class="h-16 rounded-lg bg-gradient-to-br {tpl.color} mb-3 flex items-center justify-center">
                <svelte:component this={tpl.icon} class="w-8 h-8 text-white" />
              </div>
              <p class="text-sm font-semibold text-slate-900">{tpl.name}</p>
              <Badge class="mt-1 text-[10px]">{tpl.tag}</Badge>
              <p class="text-xs text-slate-500 mt-2">{tpl.desc}</p>
              {#if selectedTemplate === tpl.id}
                <p class="text-xs text-emerald-700 font-medium mt-2 flex items-center gap-1"><Check class="w-3 h-3" /> Aktif</p>
              {/if}
            </button>
          {/each}
        </div>
        <h2 class="font-semibold text-slate-900 mt-6 mb-4">Animasi Latar</h2>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {#each BG_ANIMATION_OPTIONS as anim}
            <button
              onclick={() => selectedBgAnimation = anim.id}
              class="p-3 rounded-xl border text-left transition {selectedBgAnimation === anim.id ? 'border-emerald-600 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'}"
            >
              <p class="text-sm font-medium text-slate-800">{anim.label}</p>
              <p class="text-xs text-slate-500">{anim.desc}</p>
            </button>
          {/each}
        </div>
      </Card>
      <div class="flex justify-between mt-4">
        <Button variant="outline" onclick={prevStep}>
          <ChevronRight class="w-4 h-4 mr-1 rotate-180" /> Kembali
        </Button>
        <Button onclick={nextStep} class="bg-emerald-700 hover:bg-emerald-800 rounded-xl">
          Lanjut: Pratinjau & Publikasi <ChevronRight class="w-4 h-4 ml-1" />
        </Button>
      </div>
    {:else if activeTab === 'publikasi'}
      <Card class="p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-semibold text-slate-900">Pratinjau Langsung</h2>
          <div class="flex gap-1 bg-slate-100 rounded-lg p-1">
            <button onclick={() => previewMode = 'desktop'} class="p-2 rounded-md {previewMode === 'desktop' ? 'bg-white shadow' : ''}" title="Desktop"><Tv class="w-4 h-4" /></button>
            <button onclick={() => previewMode = 'tablet'} class="p-2 rounded-md {previewMode === 'tablet' ? 'bg-white shadow' : ''}" title="Tablet"><Tablet class="w-4 h-4" /></button>
            <button onclick={() => previewMode = 'mobile'} class="p-2 rounded-md {previewMode === 'mobile' ? 'bg-white shadow' : ''}" title="Mobile"><Smartphone class="w-4 h-4" /></button>
          </div>
        </div>
        <div class="flex justify-center">
          <div class="{previewWidthClass()} border rounded-2xl overflow-hidden bg-white transition-all">
            <div class="p-6 text-center" style="background: linear-gradient(135deg, {theme.colorPrimary}22, {theme.colorSecondary}44)">
              <h3 class="text-xl font-bold" style="color: {theme.colorPrimary}">Puskesmas Manding</h3>
              <p class="text-sm text-slate-600 mt-1">Bismillah Melayani, Anda Sehat Kami Puas</p>
              <div class="mt-4 flex justify-center gap-2">
                <span class="px-4 py-2 rounded-lg text-white text-sm font-medium" style="background: {theme.colorPrimary}">Layanan</span>
                <span class="px-4 py-2 rounded-lg text-sm font-medium border" style="border-color: {theme.colorPrimary}; color: {theme.colorPrimary}">Berita</span>
              </div>
            </div>
            <div class="p-4 space-y-2">
              <p class="text-xs text-slate-500 text-center">Template: {activeTemplateOption.name} • {sections.filter(s => s.visible).length} section aktif</p>
              {#each sections.filter(s => s.visible).slice(0, 5) as s (s.id)}
                <div class="p-3 bg-slate-50 rounded-lg text-xs text-slate-600">{s.title || s.type}</div>
              {/each}
            </div>
          </div>
        </div>
      </Card>

      <!-- Ringkasan & Publikasi: satu aksi jelas -->
      <Card class="p-6 mt-4 border-emerald-200 bg-emerald-50/50">
        <h3 class="font-semibold text-slate-900 mb-3">Siap dipublikasikan?</h3>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-4">
          <div class="bg-white rounded-lg p-3 border">
            <p class="text-slate-500">Warna primer</p>
            <p class="font-mono font-semibold flex items-center gap-2">
              <span class="w-4 h-4 rounded border" style="background: {theme.colorPrimary}"></span>
              {theme.colorPrimary}
            </p>
          </div>
          <div class="bg-white rounded-lg p-3 border">
            <p class="text-slate-500">Template</p>
            <p class="font-semibold">{activeTemplateOption.name}</p>
          </div>
          <div class="bg-white rounded-lg p-3 border">
            <p class="text-slate-500">Section aktif</p>
            <p class="font-semibold">{activeSectionCount} dari {sections.length}</p>
          </div>
          <div class="bg-white rounded-lg p-3 border">
            <p class="text-slate-500">Animasi latar</p>
            <p class="font-semibold">{BG_ANIMATION_OPTIONS.find(a => a.id === selectedBgAnimation)?.label || selectedBgAnimation}</p>
          </div>
        </div>
        <div class="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
          <Button
            size="lg"
            onclick={handlePublish}
            disabled={loading || isPublishing}
            class="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl w-full sm:w-auto justify-center"
          >
            <Check class="w-5 h-5 mr-2 shrink-0" />
            <span class="truncate">{isPublishing ? 'Mempublikasikan...' : '🚀 Publikasikan ke Website'}</span>
          </Button>
          <Button
            variant="outline"
            onclick={handleSaveDraft}
            disabled={loading || isSavingDraft}
            class="w-full sm:w-auto justify-center"
          >
            <Save class="w-4 h-4 mr-1 shrink-0" />
            {isSavingDraft ? 'Menyimpan...' : 'Simpan sebagai Draf'}
          </Button>
          {#if lastSaved}
            <span class="text-xs text-slate-500">Terakhir disimpan: {new Date(lastSaved).toLocaleString('id-ID')}</span>
          {/if}
        </div>
        <p class="text-xs text-slate-500 mt-3">
          Publikasikan untuk menampilkan perubahan ke semua pengunjung website. Draf tersimpan otomatis di perangkat ini.
        </p>
      </Card>
    {/if}
  {/if}
</div>

<Modal open={isAddModalOpen} onClose={() => isAddModalOpen = false}>
  <div class="p-6">
    <h3 class="font-semibold text-slate-900 mb-4">Tambah Section</h3>
    <label class="text-xs font-medium text-slate-600 block mb-1">Tipe Section</label>
    <select bind:value={newSectionType} class="w-full border rounded-lg px-3 py-2 text-sm mb-3">
      {#each SECTION_OPTIONS as opt}
        <option value={opt.value}>{opt.label}</option>
      {/each}
    </select>
    <label class="text-xs font-medium text-slate-600 block mb-1">Judul (opsional)</label>
    <Input bind:value={newSectionTitle} placeholder="Judul section..." class="mb-4" />
    <div class="flex justify-end gap-2">
      <Button variant="outline" size="sm" onclick={() => isAddModalOpen = false}>Batal</Button>
      <Button size="sm" onclick={addSection}>Tambah</Button>
    </div>
  </div>
</Modal>

<ThemeStyleInjector />
