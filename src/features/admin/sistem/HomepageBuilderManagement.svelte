<!-- @component Homepage builder: pilihan template artistik, animasi latar, kelola urutan & visibilitas section, live preview simulator responsif, draft & publish. -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { authStore } from '../../../shared/stores/auth.svelte.js';
  import { homepageService } from '../../../shared/services/homepageService.js';
  import { serviceEngineService } from '../../../shared/services/serviceEngineService.js';
  import { postService } from '../../../shared/services/postService.js';
  import { siteSettingsService } from '../../../shared/services/siteSettingsService.js';
  import { announcementService } from '../../../shared/services/announcementService.js';
  import type {
    HomepageSection,
    ServiceEntity,
    PostEntity,
    SiteSettings,
    AnnouncementEntity,
    HomepageTemplateType,
    BackgroundAnimationType,
  } from '../../../shared/types/index.js';
  import Card from '../../../shared/ui/Card.svelte';
  import Button from '../../../shared/ui/Button.svelte';
  import Input from '../../../shared/ui/Input.svelte';
  import Select from '../../../shared/ui/Select.svelte';
  import Badge from '../../../shared/ui/Badge.svelte';
  import Modal from '../../../shared/ui/Modal.svelte';
  import GrandMajesticTemplate from '../../beranda/templates/GrandMajesticTemplate.svelte';
  import BioLuminescentArtTemplate from '../../beranda/templates/BioLuminescentArtTemplate.svelte';
  import AvantGardeCyberClinicTemplate from '../../beranda/templates/AvantGardeCyberClinicTemplate.svelte';
  import HarmoniNusantaraTemplate from '../../beranda/templates/HarmoniNusantaraTemplate.svelte';
  import MinimalistGalleryTemplate from '../../beranda/templates/MinimalistGalleryTemplate.svelte';
  import HomepageSectionsRenderer from '../../beranda/HomepageSectionsRenderer.svelte';
  import {
    Sparkles,
    ChevronUp,
    ChevronDown,
    Eye,
    EyeOff,
    Settings,
    Trash2,
    Plus,
    Tv,
    Tablet,
    Smartphone,
    RotateCcw,
    Save,
    Check,
    ListOrdered,
    Crown,
    Leaf,
    Zap,
    Palette,
    LayoutGrid,
  } from 'lucide-svelte';

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
    { value: 'cta', label: 'Call To Action (Darurat)' },
    { value: 'microsites', label: 'Microsite' },
  ];

  const ANIMATION_OPTIONS = [
    { value: 'aurora_flow', label: 'Aurora Flow (Lembayung Cahaya Mengalir)' },
    { value: 'particle_mesh', label: 'Particle Mesh (Jaringan Matriks Partikel)' },
    { value: 'bioluminescent', label: 'Bioluminescent Nodes (Sel & Energi Alami)' },
    { value: 'geometric_waves', label: 'Geometric Waves (Gelombang Harmonik)' },
    { value: 'golden_radiance', label: 'Golden Radiance (Sinar Kemegahan Emas)' },
    { value: 'subtle_glow', label: 'Subtle Atmosphere (Glow Halus)' },
    { value: 'none', label: 'Tanpa Animasi (Statis)' },
  ];

  const TEMPLATE_OPTIONS = [
    { id: 'modern_majestic' as HomepageTemplateType, name: 'Kemegahan Mahakarya Sovereign', tag: 'Megah & Modern', desc: 'Latar aurora bersinar, tipografi editorial aristokrat, glassmorphism dengan aksen emas-zamrud.', bgAnim: 'aurora_flow' as BackgroundAnimationType, icon: Crown, color: 'from-amber-500 to-emerald-600' },
    { id: 'artistic_bio' as HomepageTemplateType, name: 'Seni Organik Bio-Luminescence', tag: 'Alami & Holistik', desc: 'Latar partikel sel bercahaya, kurva organik lembut, pilar kesehatan holistik dan kesejahteraan.', bgAnim: 'bioluminescent' as BackgroundAnimationType, icon: Leaf, color: 'from-emerald-500 to-teal-500' },
    { id: 'avant_garde' as HomepageTemplateType, name: 'Avant-Garde Cyber-Clinic', tag: 'Futuristik Medis', desc: 'Matriks partikel presisi, telemetri radar antrean langsung, neon cyber-clinical modern.', bgAnim: 'particle_mesh' as BackgroundAnimationType, icon: Zap, color: 'from-cyan-500 to-indigo-600' },
    { id: 'nusantara_art' as HomepageTemplateType, name: 'Harmoni Nusantara Modern', tag: 'Kearifan & Kehangatan', desc: 'Nuansa hangat batik geometris modern, kehangatan ramah tamah, dan maklumat pelayanan resmi.', bgAnim: 'golden_radiance' as BackgroundAnimationType, icon: Sparkles, color: 'from-amber-600 to-rose-600' },
    { id: 'minimal_gallery' as HomepageTemplateType, name: 'Studio Seni Kontemporer', tag: 'Galeri Minimalis', desc: 'Arsitektur visual Swiss yang bersih, tipografi berskala besar, dan ruang negatif elegan.', bgAnim: 'geometric_waves' as BackgroundAnimationType, icon: Palette, color: 'from-slate-700 to-zinc-900' },
    { id: 'classic' as HomepageTemplateType, name: 'Klasik Modular Builder', tag: 'Standar Fleksibel', desc: 'Tata letak modular standar sesuai urutan section pada Homepage Builder admin.', bgAnim: 'none' as BackgroundAnimationType, icon: LayoutGrid, color: 'from-blue-600 to-teal-600' },
  ];

  let template = $state<HomepageTemplateType>('modern_majestic');
  let bgAnim = $state<BackgroundAnimationType>('aurora_flow');
  let sections = $state<HomepageSection[]>([]);
  let status = $state<'draft' | 'published'>('draft');
  let lastSaved = $state<string>('');
  let previewMode = $state<PreviewMode>('desktop');

  // Real dynamic data for preview
  let services = $state<ServiceEntity[]>([]);
  let posts = $state<PostEntity[]>([]);
  let settings = $state<SiteSettings | null>(null);
  let announcements = $state<AnnouncementEntity[]>([]);

  // Modals & Editing states
  let isEditingSection = $state<HomepageSection | null>(null);
  let editFields = $state<Record<string, any>>({});
  let newSectionType = $state<string>('hero');
  let isSaving = $state(false);
  let isPublishing = $state(false);

  function getActor() {
    const user = authStore.user;
    return user
      ? { id: user.uid, email: user.email, name: user.displayName || 'Admin' }
      : { id: 'usr-admin-01', email: 'admin@puskesmas-mandiri.go.id', name: 'Admin Utama' };
  }

  function handleSelectTemplate(t: HomepageTemplateType) {
    template = t;
    const opt = TEMPLATE_OPTIONS.find((o) => o.id === t);
    if (opt) bgAnim = opt.bgAnim;
    status = 'draft';
  }

  // Reorder actions
  function moveUp(index: number) {
    if (index === 0) return;
    const updated = [...sections];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;

    sections = updated.map((s, idx) => ({ ...s, order: idx }));
    status = 'draft';
  }

  function moveDown(index: number) {
    if (index === sections.length - 1) return;
    const updated = [...sections];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;

    sections = updated.map((s, idx) => ({ ...s, order: idx }));
    status = 'draft';
  }

  function toggleVisibility(id: string) {
    sections = sections.map((s) => {
      if (s.id === id) {
        return { ...s, visible: !s.visible };
      }
      return s;
    });
    status = 'draft';
  }

  function deleteSection(id: string) {
    if (confirm('Apakah Anda yakin ingin menghapus section ini?')) {
      sections = sections.filter((s) => s.id !== id).map((s, idx) => ({ ...s, order: idx }));
      status = 'draft';
    }
  }

  function addSection() {
    const opt = SECTION_OPTIONS.find((o) => o.value === newSectionType);
    if (!opt) return;

    let defaultSettings: Record<string, any> = {};
    if (newSectionType === 'hero') {
      defaultSettings = {
        subtitle: 'Penyelenggaraan pelayanan primer terintegrasi.',
        buttonText: 'Lihat Layanan',
        buttonLink: '/layanan',
        buttonText2: 'Kontak',
        buttonLink2: '/kontak',
        alignment: 'left',
        bgGradient: true,
      };
    } else if (newSectionType === 'sambutan') {
      defaultSettings = {
        name: 'dr. H. Ahmad Fauzi, M.Kes',
        role: 'Kepala Puskesmas',
        text: 'Selamat datang di website kami.',
        avatarUrl: '',
      };
    } else if (newSectionType === 'info') {
      defaultSettings = {
        grid: [
          { title: '5 Klaster', desc: 'Penyelenggaraan Klaster Kesehatan Terintegrasi' },
          { title: '24 Jam', desc: 'Layanan UGD & Persalinan Darurat' },
          { title: '11 Komponen', desc: 'Standar Pelayanan Publik Terbuka' },
          { title: '12 SPM', desc: 'Cakupan Standar Pelayanan Minimal' },
        ],
      };
    } else if (newSectionType === 'unggulan') {
      defaultSettings = {
        items: [
          {
            name: 'Skrining PTM Keliling',
            description: 'Pemeriksaan tensi, gula darah, dan kolesterol gratis di dusun-dusun.',
          },
          {
            name: 'Pojok Gizi & Konseling',
            description: 'Pelayanan konseling gizi terpadu untuk penanganan stunting.',
          },
          {
            name: 'UGD & Ambulans Siaga 24 Jam',
            description: 'Pelayanan gawat darurat respons cepat.',
          },
        ],
      };
    } else if (newSectionType === 'layanan') {
      defaultSettings = { limit: 6, layout: 'grid', categoryFilter: 'all' };
    } else if (newSectionType === 'jadwal') {
      defaultSettings = {
        schedules: [
          { name: 'Poli Umum', days: 'Senin - Sabtu', hours: '08:00 - 14:00' },
          { name: 'Poli Gigi', days: 'Senin - Jumat', hours: '08:00 - 13:00' },
          { name: 'Poli KIA/KB', days: 'Selasa & Kamis', hours: '08:00 - 12:00' },
        ],
      };
    } else if (newSectionType === 'berita') {
      defaultSettings = { limit: 3, showCategory: true };
    } else if (newSectionType === 'pengumuman') {
      defaultSettings = { limit: 2 };
    } else if (newSectionType === 'statistik') {
      defaultSettings = {
        stats: [
          { label: 'Kunjungan Harian', value: '150+' },
          { label: 'Tenaga Medis', value: '35' },
          { label: 'Desa Binaan', value: '8' },
          { label: 'Kepuasan Pasien', value: '98%' },
        ],
      };
    } else if (newSectionType === 'kritik_saran') {
      defaultSettings = { showRating: true };
    } else if (newSectionType === 'kontak') {
      defaultSettings = { showSocials: true };
    } else if (newSectionType === 'lokasi') {
      defaultSettings = { height: '400px' };
    } else if (newSectionType === 'cta') {
      defaultSettings = {
        subtitle: 'Layanan UGD dan Bersalin siaga 24 jam.',
        buttonText: 'Hubungi UGD',
        buttonLink: 'tel:0215550199',
      };
    } else if (newSectionType === 'microsites') {
      defaultSettings = {
        subtitle: 'Akses cepat portal khusus dan program kesehatan tematik.',
      };
    }

    const newSec: HomepageSection = {
      id: `sec-${Date.now()}`,
      type: newSectionType as any,
      title: opt.label,
      visible: true,
      order: sections.length,
      settings: defaultSettings,
    };

    sections = [...sections, newSec];
    status = 'draft';
  }

  function openEditSettings(sec: HomepageSection) {
    isEditingSection = sec;
    editFields = {
      title: sec.title,
      ...sec.settings,
    };
  }

  function handleSaveSectionSettings() {
    if (!isEditingSection) return;

    const updatedSections = sections.map((s) => {
      if (s.id === isEditingSection?.id) {
        const { title, ...restSettings } = editFields;
        return {
          ...s,
          title: title || s.title,
          settings: restSettings,
        };
      }
      return s;
    });

    sections = updatedSections;
    status = 'draft';
    isEditingSection = null;
  }

  async function handleSaveDraft() {
    isSaving = true;
    try {
      const actor = getActor();
      const res = await homepageService.saveDraft(sections, actor, template, bgAnim);
      status = res.status;
      lastSaved = res.updatedAt;
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan draft.');
    } finally {
      isSaving = false;
    }
  }

  async function handlePublish() {
    isPublishing = true;
    try {
      const actor = getActor();
      const res = await homepageService.publish(sections, actor, template, bgAnim);
      status = res.status;
      lastSaved = res.updatedAt;
      localStorage.setItem('puskesmas_homepage_template', template);
      alert('Berhasil dipublikasikan ke beranda publik!');
    } catch (err) {
      console.error(err);
      alert('Gagal mempublikasikan.');
    } finally {
      isPublishing = false;
    }
  }

  async function handleReset() {
    if (confirm('Apakah Anda yakin ingin mengatur ulang susunan section beranda ke bawaan?')) {
      try {
        const actor = getActor();
        const res = await homepageService.resetToDefault(actor);
        sections = res.sections;
        template = 'modern_majestic';
        bgAnim = 'aurora_flow';
        status = res.status;
        lastSaved = res.updatedAt;
      } catch (err) {
        console.error(err);
        alert('Gagal mereset.');
      }
    }
  }

  function updateEditField(field: string, value: any) {
    editFields = { ...editFields, [field]: value };
  }

  onMount(() => {
    async function loadData() {
      try {
        const [draftConfig, allServices, allPosts, siteSettings, publishedAnn] = await Promise.all([
          homepageService.getDraftConfig(),
          serviceEngineService.getPublishedServices(),
          postService.getPublishedPosts(),
          siteSettingsService.getSettings(),
          announcementService.getPublishedAnnouncements(),
        ]);

        if (draftConfig.template) template = draftConfig.template;
        if (draftConfig.backgroundAnimation) bgAnim = draftConfig.backgroundAnimation;
        sections = draftConfig.sections;
        status = draftConfig.status;
        lastSaved = draftConfig.updatedAt;

        services = allServices;
        posts = allPosts;
        settings = siteSettings;
        announcements = publishedAnn;
      } catch (err) {
        console.error('Error loading builder data:', err);
      }
    }

    loadData();
  });
</script>

<div class="space-y-6">
  <!-- Top action header card -->
  <Card class="p-6">
    <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      <div class="space-y-1">
        <div class="flex items-center gap-2">
          <h2 class="text-lg font-bold text-[var(--color-text)]">Konfigurasi Beranda & Desain Seniman</h2>
          <Badge variant={status === 'published' ? 'emerald' : 'amber'} size="sm">
            {status === 'published' ? 'Published' : 'Draft Tersimpan'}
          </Badge>
        </div>
        <p class="text-xs text-[var(--color-muted-foreground)] font-mono">
          Terakhir diperbarui: {lastSaved ? new Date(lastSaved).toLocaleString('id-ID') : '-'}
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <Button variant="danger" size="sm" onclick={handleReset} class="flex items-center gap-1.5">
          <RotateCcw class="w-3.5 h-3.5" /> Reset Default
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onclick={handleSaveDraft}
          isLoading={isSaving}
          class="flex items-center gap-1.5"
        >
          <Save class="w-3.5 h-3.5" /> Simpan Draft
        </Button>
        <Button
          variant="primary"
          size="sm"
          onclick={handlePublish}
          isLoading={isPublishing}
          class="flex items-center gap-1.5"
        >
          <Check class="w-3.5 h-3.5" /> Publikasikan
        </Button>
      </div>
    </div>
  </Card>

  <!-- ARTISTIC TEMPLATES SELECTOR CARD -->
  <Card class="p-6 space-y-4">
    <div class="flex items-center justify-between">
      <div class="space-y-1">
        <div class="flex items-center gap-2">
          <Sparkles class="w-5 h-5 text-amber-500 animate-pulse" />
          <h3 class="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider">
            Pilihan Template Halaman Depan Mahakarya (Artistic Templates)
          </h3>
        </div>
        <p class="text-xs text-[var(--color-muted-foreground)]">
          Pilih gaya estetika beranda yang dirancang khusus dengan animasi latar kinetik yang megah dan
          elegan.
        </p>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {#each TEMPLATE_OPTIONS as opt (opt.id)}
        {@const Icon = opt.icon}
        {@const isSelected = template === opt.id}
        <button
          type="button"
          onclick={() => handleSelectTemplate(opt.id)}
          class={`p-4 rounded-2xl text-left border transition-all flex flex-col justify-between space-y-3 ${
            isSelected
              ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/30 shadow-lg'
              : 'bg-[var(--color-bg)] border-[var(--color-border)] hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-card)]'
          }`}
        >
          <div class="flex items-center justify-between w-full">
            <div class={`p-2.5 rounded-xl bg-gradient-to-tr ${opt.color} text-white shadow-sm`}>
              <Icon class="w-5 h-5" />
            </div>
            <span
              class={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                isSelected
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-[var(--color-surface)] text-[var(--color-muted-foreground)]'
              }`}
            >
              {opt.tag}
            </span>
          </div>
          <div>
            <div class="text-xs font-bold text-[var(--color-text)] flex items-center justify-between">
              <span>{opt.name}</span>
              {#if isSelected}<Check class="w-4 h-4 text-[var(--color-primary)]" />{/if}
            </div>
            <p class="text-[11px] text-[var(--color-muted-foreground)] mt-1 line-clamp-2 leading-relaxed">
              {opt.desc}
            </p>
          </div>
        </button>
      {/each}
    </div>

    <!-- Background Animation Preference -->
    <div class="pt-4 border-t border-[var(--color-border)] grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
      <div>
        <label class="block text-xs font-bold text-[var(--color-text)] mb-1">
          Gaya Animasi Latar Belakang Kinetik
        </label>
        <p class="text-[11px] text-[var(--color-muted-foreground)]">
          Pola partikel dan aurora 60fps yang aktif pada latar belakang beranda.
        </p>
      </div>
      <div>
        <Select
          value={bgAnim}
          onchange={(e) => {
            bgAnim = e.currentTarget.value as BackgroundAnimationType;
            status = 'draft';
          }}
          options={ANIMATION_OPTIONS}
        />
      </div>
    </div>
  </Card>

  <!-- Main split workspace -->
  <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
    <!-- Left Column: List and Management of Sections -->
    <div class="lg:col-span-5 space-y-4">
      <div class="flex items-center justify-between">
        <h3
          class="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider flex items-center gap-1.5"
        >
          <ListOrdered class="w-4 h-4 text-[var(--color-primary)]" />
          Susunan Section Modular ({sections.length})
        </h3>
      </div>

      <div class="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
        {#each sections as sec, idx (sec.id)}
          <div
            class={`p-4 border rounded-2xl flex items-center justify-between transition ${
              sec.visible
                ? 'bg-[var(--color-card)] border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-primary)]/20'
                : 'bg-[var(--color-bg)] border-[var(--color-border)] text-[var(--color-muted-foreground)]'
            }`}
          >
            <div class="space-y-1 max-w-[55%]">
              <div class="flex items-center gap-2">
                <span class="text-[10px] font-bold text-[var(--color-muted-foreground)] font-mono"
                  >#{idx + 1}</span
                >
                <span class="text-xs font-bold truncate block">{sec.title}</span>
              </div>
              <span class="text-[9px] uppercase tracking-wider text-[var(--color-primary)] font-semibold block">
                {sec.type.replace('_', ' ')}
              </span>
            </div>

            <div class="flex items-center gap-1">
              <button
                onclick={() => moveUp(idx)}
                disabled={idx === 0}
                class="p-1.5 rounded-xl hover:bg-[var(--color-surface)] text-[var(--color-muted-foreground)] disabled:opacity-30 disabled:hover:bg-transparent"
                title="Pindahkan Ke Atas"
              >
                <ChevronUp class="w-4 h-4" />
              </button>
              <button
                onclick={() => moveDown(idx)}
                disabled={idx === sections.length - 1}
                class="p-1.5 rounded-xl hover:bg-[var(--color-surface)] text-[var(--color-muted-foreground)] disabled:opacity-30 disabled:hover:bg-transparent"
                title="Pindahkan Ke Bawah"
              >
                <ChevronDown class="w-4 h-4" />
              </button>
              <button
                onclick={() => toggleVisibility(sec.id)}
                class={`p-1.5 rounded-xl hover:bg-[var(--color-surface)] ${
                  sec.visible ? 'text-[var(--color-primary)]' : 'text-zinc-600'
                }`}
                title={sec.visible ? 'Sembunyikan dari Publik' : 'Tampilkan ke Publik'}
              >
                {#if sec.visible}<Eye class="w-4 h-4" />{:else}<EyeOff class="w-4 h-4" />{/if}
              </button>
              <button
                onclick={() => openEditSettings(sec)}
                class="p-1.5 rounded-xl hover:bg-[var(--color-surface)] text-[var(--color-primary)]"
                title="Edit Konten/Pengaturan"
              >
                <Settings class="w-4 h-4" />
              </button>
              <button
                onclick={() => deleteSection(sec.id)}
                class="p-1.5 rounded-xl hover:bg-red-500/10 text-red-400"
                title="Hapus Section"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>
        {/each}
      </div>

      <!-- Add New Section Panel -->
      <Card class="p-4 border-dashed border-[var(--color-border)] space-y-3">
        <h4 class="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider">Tambah Section</h4>
        <div class="flex gap-2">
          <div class="flex-1">
            <Select
              value={newSectionType}
              onchange={(e) => (newSectionType = e.currentTarget.value)}
              options={SECTION_OPTIONS}
            />
          </div>
          <Button onclick={addSection} size="sm" class="shrink-0 flex items-center gap-1">
            <Plus class="w-4 h-4" /> Tambah
          </Button>
        </div>
      </Card>
    </div>

    <!-- Right Column: Live Responsive Simulator Preview -->
    <div class="lg:col-span-7 space-y-4">
      <div class="flex items-center justify-between">
        <h3
          class="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider flex items-center gap-1.5"
        >
          <Tv class="w-4 h-4 text-[var(--color-primary)]" />
          Live Preview Simulator ({template.replace('_', ' ')})
        </h3>
        <div class="flex items-center gap-1 bg-[var(--color-card)] p-1 rounded-xl border border-[var(--color-border)]">
          <button
            onclick={() => (previewMode = 'desktop')}
            class={`p-1.5 rounded-lg text-xs flex items-center gap-1 ${
              previewMode === 'desktop'
                ? 'bg-[var(--color-primary)] text-white'
                : 'text-[var(--color-muted-foreground)]'
            }`}
          >
            <Tv class="w-3.5 h-3.5" /> Desktop
          </button>
          <button
            onclick={() => (previewMode = 'tablet')}
            class={`p-1.5 rounded-lg text-xs flex items-center gap-1 ${
              previewMode === 'tablet'
                ? 'bg-[var(--color-primary)] text-white'
                : 'text-[var(--color-muted-foreground)]'
            }`}
          >
            <Tablet class="w-3.5 h-3.5" /> Tablet
          </button>
          <button
            onclick={() => (previewMode = 'mobile')}
            class={`p-1.5 rounded-lg text-xs flex items-center gap-1 ${
              previewMode === 'mobile'
                ? 'bg-[var(--color-primary)] text-white'
                : 'text-[var(--color-muted-foreground)]'
            }`}
          >
            <Smartphone class="w-3.5 h-3.5" /> Mobile
          </button>
        </div>
      </div>

      <!-- Canvas Box for Simulator -->
      <div
        class="bg-[var(--color-bg)] p-3 rounded-3xl border border-[var(--color-border)] flex justify-center overflow-hidden"
      >
        <div
          class={`transition-all duration-300 bg-[var(--color-bg)] overflow-y-auto max-h-[75vh] rounded-2xl border border-[var(--color-border)] shadow-2xl ${
            previewMode === 'desktop' ? 'w-full' : previewMode === 'tablet' ? 'w-[768px]' : 'w-[375px]'
          }`}
        >
          {#if template === 'modern_majestic'}
            <GrandMajesticTemplate
              {services}
              {posts}
              {settings}
              {announcements}
              flags={{ onlineQueue: true, documents: true }}
            />
          {:else if template === 'artistic_bio'}
            <BioLuminescentArtTemplate
              {services}
              {posts}
              {settings}
              {announcements}
              flags={{ onlineQueue: true, documents: true }}
            />
          {:else if template === 'avant_garde'}
            <AvantGardeCyberClinicTemplate
              {services}
              {posts}
              {settings}
              {announcements}
              flags={{ onlineQueue: true, documents: true }}
            />
          {:else if template === 'nusantara_art'}
            <HarmoniNusantaraTemplate
              {services}
              {posts}
              {settings}
              {announcements}
              flags={{ onlineQueue: true, documents: true }}
            />
          {:else if template === 'minimal_gallery'}
            <MinimalistGalleryTemplate
              {services}
              {posts}
              {settings}
              {announcements}
              flags={{ onlineQueue: true, documents: true }}
            />
          {:else}
            <HomepageSectionsRenderer
              {sections}
              {services}
              {posts}
              {settings}
              {announcements}
            />
          {/if}
        </div>
      </div>
    </div>
  </div>

  <!-- Modal Edit Section Settings -->
  {#if isEditingSection}
    <Modal
      isOpen={!!isEditingSection}
      onClose={() => (isEditingSection = null)}
      title={`Pengaturan Section: ${isEditingSection.title}`}
    >
      <div class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-[var(--color-text)] mb-1">Judul Section</label>
          <Input
            value={editFields.title || ''}
            oninput={(e) => updateEditField('title', e.currentTarget.value)}
            placeholder="Judul Section"
          />
        </div>

        {#if isEditingSection.type === 'hero'}
          <div>
            <label class="block text-xs font-semibold text-[var(--color-text)] mb-1">Sub Judul</label>
            <Input
              value={editFields.subtitle || ''}
              oninput={(e) => updateEditField('subtitle', e.currentTarget.value)}
              placeholder="Sub judul deskripsi..."
            />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-[var(--color-text)] mb-1">Teks Tombol 1</label>
              <Input
                value={editFields.buttonText || ''}
                oninput={(e) => updateEditField('buttonText', e.currentTarget.value)}
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-[var(--color-text)] mb-1">Link Tombol 1</label>
              <Input
                value={editFields.buttonLink || ''}
                oninput={(e) => updateEditField('buttonLink', e.currentTarget.value)}
              />
            </div>
          </div>
        {/if}

        {#if isEditingSection.type === 'sambutan'}
          <div>
            <label class="block text-xs font-semibold text-[var(--color-text)] mb-1">Nama Pejabat</label>
            <Input
              value={editFields.name || ''}
              oninput={(e) => updateEditField('name', e.currentTarget.value)}
            />
          </div>
          <div>
            <label class="block text-xs font-semibold text-[var(--color-text)] mb-1">Jabatan</label>
            <Input
              value={editFields.role || ''}
              oninput={(e) => updateEditField('role', e.currentTarget.value)}
            />
          </div>
          <div>
            <label class="block text-xs font-semibold text-[var(--color-text)] mb-1">Isi Sambutan</label>
            <textarea
              rows={4}
              value={editFields.text || ''}
              oninput={(e) => updateEditField('text', e.currentTarget.value)}
              class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-3 text-xs text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none"
            ></textarea>
          </div>
        {/if}

        <div class="flex justify-end gap-2 pt-4 border-t border-[var(--color-border)]">
          <Button variant="secondary" onclick={() => (isEditingSection = null)}>Batal</Button>
          <Button variant="primary" onclick={handleSaveSectionSettings}>Terapkan Perubahan</Button>
        </div>
      </div>
    </Modal>
  {/if}
</div>
