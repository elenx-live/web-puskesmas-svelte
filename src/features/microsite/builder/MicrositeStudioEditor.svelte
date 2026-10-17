<!-- @component Studio editor microsite — builder blok, kustomisasi header/footer, tema & latar, info-kontak, grup, pratinjau langsung, & modal QR. -->
<script lang="ts">
  import { fade, scale } from 'svelte/transition';
  import {
    X,
    Save,
    Smartphone,
    Tablet,
    Monitor,
    Plus,
    Trash2,
    MoveUp,
    MoveDown,
    Globe,
    Palette,
    Settings,
    Share2,
    QrCode,
    Download,
    Check,
    Sparkles,
    Link2,
    MessageCircle,
    Phone,
    Mail,
    MapPin,
    FileText,
    Video,
    Megaphone,
    Image as ImageIcon,
    FolderPlus,
    Layers,
    Flame,
    ChevronDown,
    ChevronUp,
    CheckCircle2,
    Sliders,
    Info,
    LayoutTemplate,
    ShieldCheck,
    AlignCenter,
    AlignLeft,
    Award,
    HeartPulse,
    Building2
  } from 'lucide-svelte';
  import type {
    MicrositeEntity,
    MicrositeBlock,
    MicrositeBlockType,
    MicrositeGroup,
    HomepageTemplateType,
    BackgroundAnimationType,
    ContentStatus,
    MicrositeHeaderStyle,
    MicrositeFooterConfig,
    MicrositeFooterStyle,
    MicrositeFooterLink
  } from '../../../shared/types/index.js';
  import MicrositeTemplateRenderer from '../components/MicrositeTemplateRenderer.svelte';
  import MicrositeImageUploadField from './MicrositeImageUploadField.svelte';
  import { micrositeService } from '../../../shared/services/micrositeService.js';
  import { toastStore } from '../../../shared/stores/toast.svelte.js';

  interface Props {
    microsite: MicrositeEntity;
    onSave: (data: Partial<MicrositeEntity>) => Promise<void>;
    onClose: () => void;
    onDuplicate?: (id: string) => Promise<void>;
    categories?: { name: string }[];
    suggestedLinks?: { title: string; url: string; category?: string }[];
  }

  let {
    microsite: initialMicrosite,
    onSave,
    onClose,
    onDuplicate,
    categories = [],
    suggestedLinks = []
  }: Props = $props();

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') =>
    toastStore.showToast(message, type);

  const BLOCK_TYPE_CONFIGS: {
    type: MicrositeBlockType;
    label: string;
    description: string;
    icon: typeof Link2;
    color: string;
    defaultTitle: string;
  }[] = [
    {
      type: 'link',
      label: 'Tautan Kustom',
      description: 'Tautan ke website, halaman, atau portal layanan',
      icon: Link2,
      color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      defaultTitle: 'Tautan Layanan'
    },
    {
      type: 'whatsapp',
      label: 'WhatsApp Chat',
      description: 'Tombol chat langsung ke nomor CS / Petugas Medis',
      icon: MessageCircle,
      color: 'bg-green-500/10 text-green-400 border-green-500/30',
      defaultTitle: 'Konsultasi WhatsApp'
    },
    {
      type: 'phone',
      label: 'Panggilan Darurat',
      description: 'Hotline telepon darurat (klik langsung mendial)',
      icon: Phone,
      color: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
      defaultTitle: 'Hotline IGD 24 Jam'
    },
    {
      type: 'announcement',
      label: 'Pengumuman / Alert',
      description: 'Kotak banner pemberitahuan penting beranimasi',
      icon: Megaphone,
      color: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      defaultTitle: 'Pengumuman Pelayanan'
    },
    {
      type: 'heading',
      label: 'Judul Bagian',
      description: 'Pemisah kategori teks heading antar grup tautan',
      icon: FileText,
      color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
      defaultTitle: 'Layanan Poli & Konsultasi'
    },
    {
      type: 'text',
      label: 'Kartu Teks / Bio',
      description: 'Paragraf penjelasan informasi atau jadwal singkat',
      icon: Info,
      color: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
      defaultTitle: 'Informasi Alur Layanan'
    },
    {
      type: 'image_link',
      label: 'Poster / Banner Klik',
      description: 'Gambar banner flyer edukasi yang bisa diklik',
      icon: ImageIcon,
      color: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
      defaultTitle: 'Brosur Program Kesehatan'
    },
    {
      type: 'video',
      label: 'Video YouTube',
      description: 'Sematkan video edukasi dari YouTube secara responsif',
      icon: Video,
      color: 'bg-red-500/10 text-red-400 border-red-500/30',
      defaultTitle: 'Video Edukasi Kesehatan'
    },
    {
      type: 'location',
      label: 'Lokasi & Maps',
      description: 'Alamat fasilitas dan tombol navigasi Google Maps',
      icon: MapPin,
      color: 'bg-teal-500/10 text-teal-400 border-teal-500/30',
      defaultTitle: 'Lokasi Puskesmas'
    },
    {
      type: 'download',
      label: 'Unduh Dokumen / PDF',
      description: 'Tombol unduh berkas formulir atau panduan PDF',
      icon: Download,
      color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
      defaultTitle: 'Formulir Pendaftaran Pasien'
    },
    {
      type: 'email',
      label: 'Kontak Email',
      description: 'Tombol kirim surel ke alamat resmi',
      icon: Mail,
      color: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
      defaultTitle: 'Surat & Pengaduan Email'
    },
    {
      type: 'qr_code',
      label: 'Kode QR Halaman',
      description: 'Tampilkan QR Code interaktif untuk dipindai',
      icon: QrCode,
      color: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      defaultTitle: 'QR Code Bio Link'
    },
    {
      type: 'divider',
      label: 'Garis Pemisah',
      description: 'Garis tipis estetik untuk memisahkan konten',
      icon: Layers,
      color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30',
      defaultTitle: 'Pemisah'
    }
  ];

  const TEMPLATE_OPTIONS: { id: HomepageTemplateType; name: string; desc: string; icon: string }[] = [
    { id: 'modern_majestic', name: 'Grand Majestic', desc: 'Desain elegan kemilau emas & emerald resmi', icon: 'Sparkles' },
    { id: 'artistic_bio', name: 'Bio-Luminescent', desc: 'Gaya hayati bercahaya teal & cyan segar', icon: 'Leaf' },
    { id: 'avant_garde', name: 'Avant-Garde Cyber', desc: 'Nuansa futuristik modern telemetry cyan & dark', icon: 'Zap' },
    { id: 'nusantara_art', name: 'Harmoni Nusantara', desc: 'Aksara & ukiran klasik warisan budaya amber', icon: 'Award' },
    { id: 'minimal_gallery', name: 'Minimalist Studio', desc: 'Tipografi bersih, monokrom rapi & profesional', icon: 'Layers' },
    { id: 'classic', name: 'Classic Hub', desc: 'Tampilan kartu standar bio-link cepat', icon: 'Globe' }
  ];

  const HEADER_STYLE_OPTIONS: { id: MicrositeHeaderStyle; name: string; desc: string }[] = [
    { id: 'banner_hero', name: 'Hero Banner Cover', desc: 'Foto sampul lanskap di atas dengan avatar menonjol' },
    { id: 'avatar_top', name: 'Avatar Kemilau Tengah', desc: 'Fokus logo di tengah dengan ring kemilau elegan' },
    { id: 'glassmorphism_card', name: 'Glassmorphism Floating', desc: 'Kartu kaca transparan melayang modern' },
    { id: 'compact_inline', name: 'Kompak Horizontal', desc: 'Logo & teks sejajar dalam 1 baris hemat ruang' },
    { id: 'minimal_text', name: 'Minimalist Clean', desc: 'Tipografi bersih monokrom fokus teks' },
    { id: 'split_cover', name: 'Split Cover Duo', desc: 'Layout split 2 kolom kontras tinggi' }
  ];

  const FOOTER_STYLE_OPTIONS: {
    id: MicrositeFooterStyle;
    name: string;
    desc: string;
    badge: string;
  }[] = [
    {
      id: 'card_clean',
      name: 'Kartu Modern (Default)',
      desc: 'Panel kaca elegan dengan tombol aksi cepat, media sosial, dan hak cipta rapi',
      badge: 'Populer'
    },
    {
      id: 'government_formal',
      name: 'Format Resmi Instansi',
      desc: 'Standar resmi Puskesmas/Dinkes dengan lencana Kemenkes, GERMAS, dan kontak terpadu',
      badge: 'Resmi'
    },
    {
      id: 'minimal',
      name: 'Minimalis Bersih',
      desc: 'Teks simpel tanpa kartu pembatas, cocok untuk tema modern minimalis',
      badge: 'Ringan'
    },
    {
      id: 'compact_badge',
      name: 'Kapsul Mengambang',
      desc: 'Badge kapsul mengambang dengan logo, status verifikasi, dan tombol aksi cepat',
      badge: 'Elegan'
    },
    {
      id: 'floating_bar',
      name: 'Bar Aksi Bawah',
      desc: 'Navigasi bawah terpadu dengan indikator status aktif & tombol cepat',
      badge: 'Interaktif'
    },
    {
      id: 'hidden',
      name: 'Sembunyikan Footer',
      desc: 'Tidak menampilkan komponen footer sama sekali di bagian bawah halaman',
      badge: 'Polos'
    }
  ];

  const ANIMATION_OPTIONS: { id: BackgroundAnimationType; name: string }[] = [
    { id: 'aurora_flow', name: 'Aurora Gelombang (Menenangkan)' },
    { id: 'bioluminescent', name: 'Bioluminescent Partikel Hayati' },
    { id: 'geometric_waves', name: 'Geometric Grid Waves' },
    { id: 'golden_radiance', name: 'Golden Radiance Emas' },
    { id: 'subtle_glow', name: 'Subtle Glow Halus' },
    { id: 'none', name: 'Tanpa Animasi (Static)' }
  ];

  const AVATAR_SHAPE_OPTIONS = ['circle', 'rounded', 'square', 'hexagon'] as const;

  const SOCIAL_STYLE_OPTIONS = [
    { id: 'rounded_cards', label: 'Kotak Kaca' },
    { id: 'pills', label: 'Kapsul Label' },
    { id: 'floating_icons', label: 'Ikon Bulat' }
  ] as const;

  const BLUR_OPTIONS = ['none', 'sm', 'md', 'lg'] as const;

  const ICON_PRESETS = [
    'Globe', 'HeartPulse', 'Stethoscope', 'MessageCircle', 'Phone', 'Mail',
    'MapPin', 'FileText', 'Download', 'Calendar', 'Video', 'Megaphone',
    'Sparkles', 'ShieldCheck', 'Clock', 'User', 'HelpCircle', 'Folder'
  ];

  const GOV_BADGE_OPTIONS: {
    id: 'germas' | 'kemenkes' | 'akreditasi' | 'puskesmas';
    label: string;
    sub: string;
    icon: typeof HeartPulse;
  }[] = [
    { id: 'kemenkes', label: 'Kemenkes RI', sub: 'Kementerian Kesehatan', icon: HeartPulse },
    { id: 'germas', label: 'GERMAS', sub: 'Gerakan Hidup Sehat', icon: ShieldCheck },
    { id: 'akreditasi', label: 'Paripurna', sub: 'Akreditasi Tertinggi', icon: Award },
    { id: 'puskesmas', label: 'Puskesmas Resmi', sub: 'Dinas Kesehatan Kab.', icon: Building2 }
  ];

  const QUICK_LINK_PRESETS = [
    { label: 'Maklumat Pelayanan', url: '/maklumat' },
    { label: 'Standar Pelayanan (SPP)', url: '/standar-pelayanan' },
    { label: 'Pengaduan SP4N-LAPOR!', url: 'https://www.lapor.go.id', isExternal: true },
    { label: 'Kebijakan Privasi', url: '/privacy' },
    { label: 'Website Dinkes', url: 'https://dinkes.sumenepkab.go.id', isExternal: true }
  ];

  const TAGLINE_PRESETS = [
    'Portal Akses Cepat Informasi & Layanan Kesehatan Masyarakat',
    'Melayani dengan Hati, Sehat Bersama Masyarakat',
    'Puskesmas Ramah, Sigap, dan Terpercaya',
    'Mewujudkan Generasi Sehat, Tangguh & Mandiri'
  ];

  // Core metadata state
  let name = $state(initialMicrosite.name || '');
  let slug = $state(initialMicrosite.slug || '');
  let description = $state(initialMicrosite.description || '');
  let category = $state(initialMicrosite.category || 'Umum');
  let logoUrl = $state(initialMicrosite.logoUrl || '');
  let profileImageUrl = $state(initialMicrosite.profileImageUrl || '');
  let bannerImageUrl = $state(initialMicrosite.bannerImageUrl || initialMicrosite.profileImageUrl || '');
  let status = $state<ContentStatus>(initialMicrosite.status || 'published');
  let active = $state(initialMicrosite.active ?? true);

  // Header Customization State
  let headerStyle = $state<MicrositeHeaderStyle>(initialMicrosite.headerConfig?.style || 'banner_hero');
  let headerHeight = $state<'compact' | 'medium' | 'tall'>(initialMicrosite.headerConfig?.height || 'medium');
  let avatarShape = $state<'circle' | 'rounded' | 'square' | 'hexagon'>(initialMicrosite.headerConfig?.avatarShape || 'circle');
  let showCategoryBadge = $state(initialMicrosite.headerConfig?.showCategoryBadge ?? true);
  let categoryBadgeText = $state(initialMicrosite.headerConfig?.categoryBadgeText || '');
  let showVerifiedBadge = $state(initialMicrosite.headerConfig?.showVerifiedBadge ?? true);
  let customTitle = $state(initialMicrosite.headerConfig?.customTitle || '');
  let customSubtitle = $state(initialMicrosite.headerConfig?.customSubtitle || '');
  let bannerOverlayOpacity = $state(initialMicrosite.headerConfig?.bannerOverlayOpacity ?? 40);
  let headerAlignment = $state<'center' | 'left'>(initialMicrosite.headerConfig?.alignment || 'center');

  // Background Image State
  let backgroundImageUrl = $state(
    initialMicrosite.backgroundImageUrl || initialMicrosite.themeCustomization?.bgImageUrl || ''
  );
  let bgImageOpacity = $state(initialMicrosite.themeCustomization?.bgImageOpacity ?? 25);
  let bgImageBlur = $state<'none' | 'sm' | 'md' | 'lg'>(initialMicrosite.themeCustomization?.bgImageBlur || 'none');

  // Footer Customization State
  const initialFooterConfig: Partial<MicrositeFooterConfig> =
    initialMicrosite.footerConfig || initialMicrosite.themeCustomization?.footerConfig || {};
  let footerStyle = $state<MicrositeFooterStyle>(initialFooterConfig.style || 'card_clean');
  let customCopyrightText = $state(initialFooterConfig.customCopyrightText || '');
  let customTagline = $state(
    initialFooterConfig.customTagline !== undefined
      ? initialFooterConfig.customTagline
      : 'Portal Akses Cepat Informasi & Layanan Kesehatan Masyarakat'
  );
  let showSocialLinks = $state(initialFooterConfig.showSocialLinks ?? true);
  let socialStyle = $state<'pills' | 'floating_icons' | 'rounded_cards'>(
    initialFooterConfig.socialStyle || 'rounded_cards'
  );
  let showContactSummary = $state(initialFooterConfig.showContactSummary ?? false);
  let showBackToTop = $state(initialFooterConfig.showBackToTop ?? true);
  let showShareButton = $state(initialFooterConfig.showShareButton ?? true);
  let showQRButton = $state(initialFooterConfig.showQRButton ?? true);
  let showGovernmentBadges = $state(initialFooterConfig.showGovernmentBadges ?? true);
  let governmentBadges = $state<('germas' | 'kemenkes' | 'akreditasi' | 'puskesmas')[]>(
    initialFooterConfig.governmentBadges || ['kemenkes', 'germas', 'akreditasi']
  );
  let customBadgesText = $state(initialFooterConfig.customBadgesText || '');
  let footerLinks = $state<MicrositeFooterLink[]>(initialFooterConfig.links || []);
  let footerAlignment = $state<'center' | 'left'>(initialFooterConfig.alignment || 'center');

  // Social & contact state
  let phone = $state(initialMicrosite.phone || '');
  let email = $state(initialMicrosite.email || '');
  let website = $state(initialMicrosite.website || '');
  let address = $state(initialMicrosite.address || '');

  // Theme & Appearance
  let template = $state<HomepageTemplateType>(
    initialMicrosite.themeCustomization?.template || 'modern_majestic'
  );
  let backgroundAnimation = $state<BackgroundAnimationType>(
    initialMicrosite.themeCustomization?.backgroundAnimation || 'aurora_flow'
  );
  let accentColor = $state(initialMicrosite.themeCustomization?.accentColor || '#10b981');
  let themePreset = $state(initialMicrosite.themeCustomization?.theme || 'emerald');

  // Security
  let passwordProtected = $state(initialMicrosite.passwordProtected ?? false);
  let password = $state('');

  // Blocks & Groups state
  function buildInitialBlocks(): MicrositeBlock[] {
    if (initialMicrosite.blocks && initialMicrosite.blocks.length > 0) {
      return initialMicrosite.blocks;
    }
    if (initialMicrosite.links && initialMicrosite.links.length > 0) {
      return initialMicrosite.links.map(l => ({
        id: l.id,
        type: (l.type === 'whatsapp' ? 'whatsapp' : l.type === 'call' ? 'phone' : l.type === 'email' ? 'email' : l.type === 'pdf' ? 'download' : l.type === 'youtube' ? 'video' : 'link') as MicrositeBlockType,
        title: l.label,
        subtitle: l.subtitle,
        url: l.url,
        icon: l.icon,
        thumbnailUrl: l.thumbnailUrl,
        badgeText: l.badgeText,
        isFeatured: l.isFeatured,
        active: !l.archived,
        scheduledStart: l.scheduledStart,
        scheduledEnd: l.scheduledEnd,
        clicks: l.clicks || 0,
        displayOrder: l.displayOrder
      }));
    }
    return [];
  }

  let blocks = $state<MicrositeBlock[]>(buildInitialBlocks());
  let groups = $state<MicrositeGroup[]>(initialMicrosite.groups || []);

  // UI Studio State
  let studioTab = $state<'blocks' | 'header' | 'footer' | 'design' | 'settings' | 'groups'>('blocks');
  let deviceMode = $state<'mobile' | 'tablet' | 'desktop'>('mobile');
  let expandedBlockId = $state<string | null>(null);
  let isAddBlockOpen = $state(false);
  let isSaving = $state(false);
  let copiedLink = $state(false);
  let qrModalOpen = $state(false);

  // Construct Live Virtual Entity for realtime Simulator
  const liveEntity = $derived<MicrositeEntity>({
    ...initialMicrosite,
    name: name || 'Nama Portal Anda',
    slug: slug || 'slug-portal',
    description,
    category,
    logoUrl,
    profileImageUrl: bannerImageUrl || profileImageUrl,
    bannerImageUrl: bannerImageUrl || profileImageUrl,
    backgroundImageUrl,
    status,
    active,
    phone,
    email,
    website,
    address,
    passwordProtected,
    blocks,
    groups,
    headerConfig: {
      style: headerStyle,
      height: headerHeight,
      avatarShape,
      showCategoryBadge,
      categoryBadgeText,
      showVerifiedBadge,
      customTitle,
      customSubtitle,
      bannerOverlayOpacity,
      alignment: headerAlignment
    },
    footerConfig: {
      style: footerStyle,
      customCopyrightText,
      customTagline,
      showSocialLinks,
      socialStyle,
      showContactSummary,
      showBackToTop,
      showShareButton,
      showQRButton,
      showGovernmentBadges,
      governmentBadges,
      customBadgesText,
      links: footerLinks,
      alignment: footerAlignment
    },
    themeCustomization: {
      theme: themePreset,
      template,
      backgroundAnimation,
      buttonStyle: 'rounded',
      accentColor,
      bgImageUrl: backgroundImageUrl,
      bgImageOpacity,
      bgImageBlur,
      headerConfig: {
        style: headerStyle,
        height: headerHeight,
        avatarShape,
        showCategoryBadge,
        categoryBadgeText,
        showVerifiedBadge,
        customTitle,
        customSubtitle,
        bannerOverlayOpacity,
        alignment: headerAlignment
      },
      footerConfig: {
        style: footerStyle,
        customCopyrightText,
        customTagline,
        showSocialLinks,
        socialStyle,
        showContactSummary,
        showBackToTop,
        showShareButton,
        showQRButton,
        showGovernmentBadges,
        governmentBadges,
        customBadgesText,
        links: footerLinks,
        alignment: footerAlignment
      }
    }
  });

  // Footer Link Manipulation
  function addFooterLink(label: string, url: string, isExternal = false) {
    const newLnk: MicrositeFooterLink = {
      id: 'fl-' + Math.random().toString(36).substring(2, 7),
      label,
      url,
      isExternal
    };
    footerLinks = [...footerLinks, newLnk];
  }

  function removeFooterLink(id: string) {
    footerLinks = footerLinks.filter(l => l.id !== id);
  }

  function updateFooterLink(id: string, updates: Partial<MicrositeFooterLink>) {
    footerLinks = footerLinks.map(l => (l.id === id ? { ...l, ...updates } : l));
  }

  function toggleBadge(badge: 'germas' | 'kemenkes' | 'akreditasi' | 'puskesmas') {
    governmentBadges = governmentBadges.includes(badge)
      ? governmentBadges.filter(b => b !== badge)
      : [...governmentBadges, badge];
  }

  // Block Manipulation Methods
  function addBlock(type: MicrositeBlockType) {
    const config = BLOCK_TYPE_CONFIGS.find(c => c.type === type);
    const newBlock: MicrositeBlock = {
      id: 'blk-' + Math.random().toString(36).substring(2, 9),
      type,
      title: config?.defaultTitle || 'Blok Baru',
      subtitle: type === 'whatsapp' ? 'Hubungi layanan sekarang' : undefined,
      url: type === 'link' ? 'https://' : type === 'whatsapp' ? '6281234567890' : '',
      whatsappNumber: type === 'whatsapp' ? '6281234567890' : undefined,
      whatsappMessage: type === 'whatsapp' ? 'Halo Admin Puskesmas Manding, saya ingin bertanya tentang:' : undefined,
      icon: type === 'whatsapp' ? 'MessageCircle' : type === 'phone' ? 'Phone' : type === 'email' ? 'Mail' : type === 'location' ? 'MapPin' : 'Globe',
      active: true,
      isFeatured: false,
      clicks: 0,
      displayOrder: blocks.length + 1
    };

    blocks = [...blocks, newBlock];
    expandedBlockId = newBlock.id;
    isAddBlockOpen = false;
    showToast(`Blok "${config?.label || type}" berhasil ditambahkan!`, 'success');
  }

  function updateBlock(id: string, updates: Partial<MicrositeBlock>) {
    blocks = blocks.map(b => (b.id === id ? { ...b, ...updates } : b));
  }

  function removeBlock(id: string) {
    blocks = blocks.filter(b => b.id !== id);
    if (expandedBlockId === id) expandedBlockId = null;
    showToast('Blok dihapus', 'info');
  }

  function moveBlock(index: number, direction: 'up' | 'down') {
    const newIdx = direction === 'up' ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= blocks.length) return;
    const reordered = [...blocks];
    const temp = reordered[index];
    reordered[index] = reordered[newIdx];
    reordered[newIdx] = temp;
    // update displayOrder
    reordered.forEach((b, idx) => (b.displayOrder = idx + 1));
    blocks = reordered;
  }

  // Group Manipulation
  function addGroup() {
    const newGroup: MicrositeGroup = {
      id: 'grp-' + Math.random().toString(36).substring(2, 9),
      name: 'Grup Baru',
      collapsible: true,
      displayOrder: groups.length + 1
    };
    groups = [...groups, newGroup];
  }

  function removeGroup(groupId: string) {
    groups = groups.filter(g => g.id !== groupId);
    // Clear groupId from blocks
    blocks = blocks.map(b => (b.groupId === groupId ? { ...b, groupId: undefined } : b));
  }

  // Handle Save
  async function handleSave() {
    if (!name.trim()) {
      showToast('Nama microsite tidak boleh kosong', 'error');
      return;
    }
    if (!slug.trim()) {
      showToast('Slug microsite tidak boleh kosong', 'error');
      return;
    }

    isSaving = true;
    try {
      await onSave({
        name,
        slug: slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        description,
        category,
        logoUrl,
        profileImageUrl: bannerImageUrl || profileImageUrl,
        bannerImageUrl: bannerImageUrl || profileImageUrl,
        backgroundImageUrl,
        status,
        active,
        phone,
        email,
        website,
        address,
        passwordProtected,
        password: passwordProtected && password ? password : initialMicrosite.password,
        blocks,
        groups,
        headerConfig: {
          style: headerStyle,
          height: headerHeight,
          avatarShape,
          showCategoryBadge,
          categoryBadgeText,
          showVerifiedBadge,
          customTitle,
          customSubtitle,
          bannerOverlayOpacity,
          alignment: headerAlignment
        },
        themeCustomization: {
          theme: themePreset,
          template,
          backgroundAnimation,
          buttonStyle: 'rounded',
          accentColor,
          bgImageUrl: backgroundImageUrl,
          bgImageOpacity,
          bgImageBlur
        }
      });
      showToast('Perubahan microsite berhasil disimpan!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Gagal menyimpan microsite', 'error');
    } finally {
      isSaving = false;
    }
  }

  function handleCopyPublicLink() {
    const url = `${window.location.origin}/m/${slug}`;
    navigator.clipboard.writeText(url);
    copiedLink = true;
    setTimeout(() => (copiedLink = false), 2000);
    showToast('Tautan publik berhasil disalin ke clipboard!', 'success');
  }

</script>

<div class="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-xl flex flex-col text-slate-100 font-sans overflow-hidden">
  <!-- Top Studio Action Bar -->
  <header class="h-16 border-b border-slate-800 bg-slate-900/80 px-4 sm:px-6 flex items-center justify-between shrink-0 z-20">
    <div class="flex items-center gap-3 min-w-0">
      <button
        type="button"
        onclick={onClose}
        class="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition"
        title="Tutup Studio"
            aria-label="Tutup Studio"
      >
        <X class="w-5 h-5" />
      </button>

      <div class="min-w-0">
        <div class="flex items-center gap-2">
          <span class="font-bold text-sm sm:text-base text-white truncate max-w-[200px] sm:max-w-xs">
            {name || 'Studio Editor Microsite'}
          </span>
          <span
            class={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
              status === 'published'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
            }`}
          >
            {status === 'published' ? 'Live' : 'Draft'}
          </span>
        </div>
        <p class="text-[11px] text-slate-400 font-mono truncate hidden sm:block">
          /m/{slug || '...'}
        </p>
      </div>
    </div>

    <!-- Device Switcher (Desktop view only) -->
    <div class="hidden lg:flex items-center gap-1 p-1 rounded-xl bg-slate-800/80 border border-slate-700/60">
      <button
        type="button"
        onclick={() => (deviceMode = 'mobile')}
        class={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
          deviceMode === 'mobile' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
        }`}
        title="Tampilan Smartphone (375px)"
      >
        <Smartphone class="w-4 h-4" />
        <span>Mobile</span>
      </button>
      <button
        type="button"
        onclick={() => (deviceMode = 'tablet')}
        class={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
          deviceMode === 'tablet' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
        }`}
        title="Tampilan Tablet (640px)"
      >
        <Tablet class="w-4 h-4" />
        <span>Tablet</span>
      </button>
      <button
        type="button"
        onclick={() => (deviceMode = 'desktop')}
        class={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
          deviceMode === 'desktop' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
        }`}
        title="Tampilan Layar Penuh"
      >
        <Monitor class="w-4 h-4" />
        <span>Desktop</span>
      </button>
    </div>

    <!-- Action Controls -->
    <div class="flex items-center gap-2">
      <button
        type="button"
        onclick={handleCopyPublicLink}
        class="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
        title="Salin Tautan Publik"
      >
        {#if copiedLink}
          <Check class="w-4 h-4 text-emerald-400" />
        {:else}
          <Share2 class="w-4 h-4" />
        {/if}
        <span class="hidden sm:inline">{copiedLink ? 'Tersalin' : 'Bagikan'}</span>
      </button>

      <button
        type="button"
        onclick={() => (qrModalOpen = true)}
        class="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-400 text-xs font-semibold transition"
        title="Lihat QR Code"
      >
        <QrCode class="w-4 h-4" />
      </button>

      <button
        type="button"
        onclick={handleSave}
        disabled={isSaving}
        class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 transition shadow-lg shadow-emerald-950/40"
      >
        <Save class="w-4 h-4" />
        <span>{isSaving ? 'Menyimpan...' : 'Simpan & Rilis'}</span>
      </button>
    </div>
  </header>

  <!-- Main Studio Body: 2 Columns -->
  <div class="flex-1 flex overflow-hidden">
    <!-- LEFT COLUMN: Controls & Block Builder -->
    <div class="w-full lg:w-[480px] xl:w-[540px] border-r border-slate-800 bg-slate-900/60 flex flex-col shrink-0 z-10">
      <!-- Navigation Sub-Tabs -->
      <div class="flex border-b border-slate-800 px-3 bg-slate-900/90 shrink-0 gap-1 pt-2 overflow-x-auto custom-scrollbar">
        <button
          type="button"
          onclick={() => (studioTab = 'blocks')}
          class={`pb-2.5 px-2.5 text-xs font-bold flex items-center gap-1.5 border-b-2 whitespace-nowrap transition ${
            studioTab === 'blocks'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers class="w-4 h-4" />
          <span>Blok ({blocks.length})</span>
        </button>
        <button
          type="button"
          onclick={() => (studioTab = 'header')}
          class={`pb-2.5 px-2.5 text-xs font-bold flex items-center gap-1.5 border-b-2 whitespace-nowrap transition ${
            studioTab === 'header'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <LayoutTemplate class="w-4 h-4" />
          <span>Ubah Header</span>
        </button>
        <button
          type="button"
          onclick={() => (studioTab = 'footer')}
          class={`pb-2.5 px-2.5 text-xs font-bold flex items-center gap-1.5 border-b-2 whitespace-nowrap transition ${
            studioTab === 'footer'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders class="w-4 h-4" />
          <span>Ubah Footer</span>
        </button>
        <button
          type="button"
          onclick={() => (studioTab = 'design')}
          class={`pb-2.5 px-2.5 text-xs font-bold flex items-center gap-1.5 border-b-2 whitespace-nowrap transition ${
            studioTab === 'design'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Palette class="w-4 h-4" />
          <span>Tema & Latar</span>
        </button>
        <button
          type="button"
          onclick={() => (studioTab = 'settings')}
          class={`pb-2.5 px-2.5 text-xs font-bold flex items-center gap-1.5 border-b-2 whitespace-nowrap transition ${
            studioTab === 'settings'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Settings class="w-4 h-4" />
          <span>Info & Kontak</span>
        </button>
        <button
          type="button"
          onclick={() => (studioTab = 'groups')}
          class={`pb-2.5 px-2.5 text-xs font-bold flex items-center gap-1.5 border-b-2 whitespace-nowrap transition ${
            studioTab === 'groups'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FolderPlus class="w-4 h-4" />
          <span>Grup ({groups.length})</span>
        </button>
      </div>

      <!-- Left Tab Content Scrollable Area -->
      <div class="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar">
        <!-- TAB 1: BLOCKS BUILDER -->
        {#if studioTab === 'blocks'}
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Struktur Blok Bio-Link
                </h3>
                <p class="text-[11px] text-slate-400">
                  Susun, atur jadwal, atau sematkan blok baru
                </p>
              </div>
              <button
                type="button"
                onclick={() => (isAddBlockOpen = true)}
                class="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
              >
                <Plus class="w-4 h-4" />
                <span>Tambah Blok</span>
              </button>
            </div>

            <!-- Blocks List -->
            {#if blocks.length === 0}
              <div class="p-8 text-center rounded-2xl border-2 border-dashed border-slate-800 bg-slate-900/30 space-y-3">
                <Layers class="w-10 h-10 text-slate-600 mx-auto" />
                <p class="text-xs text-slate-400">Belum ada blok konten.</p>
                <button
                  type="button"
                  onclick={() => (isAddBlockOpen = true)}
                  class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-2"
                >
                  <Plus class="w-4 h-4" />
                  <span>Pilih Blok Pertama</span>
                </button>
              </div>
            {:else}
              <div class="space-y-2.5">
                {#each blocks as block, idx (block.id)}
                  {@const isExpanded = expandedBlockId === block.id}
                  {@const blockConfig = BLOCK_TYPE_CONFIGS.find(c => c.type === block.type)}
                  {@const IconComponent = blockConfig?.icon || Link2}
                  <div
                    class={`rounded-2xl border transition-all duration-200 ${
                      isExpanded
                        ? 'border-emerald-500/60 bg-slate-850 shadow-lg ring-1 ring-emerald-500/20'
                        : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'
                    }`}
                  >
                    <!-- Block Header Row -->
                    <div class="p-3.5 flex items-center justify-between gap-2.5 select-none">
                      <div class="flex items-center gap-2.5 min-w-0 flex-1">
                        <div class="flex flex-col gap-0.5 text-slate-500">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onclick={() => moveBlock(idx, 'up')}
                            class="p-0.5 hover:text-white disabled:opacity-20 transition"
                            title="Pindah ke Atas"
                          >
                            <MoveUp class="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === blocks.length - 1}
                            onclick={() => moveBlock(idx, 'down')}
                            class="p-0.5 hover:text-white disabled:opacity-20 transition"
                            title="Pindah ke Bawah"
                          >
                            <MoveDown class="w-3 h-3" />
                          </button>
                        </div>

                        <div
                          class={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                            blockConfig?.color || 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          <IconComponent class="w-4 h-4" />
                        </div>

                        <div
                          onclick={() => (expandedBlockId = isExpanded ? null : block.id)}
                          onkeydown={(e) => e.key === 'Enter' && (expandedBlockId = isExpanded ? null : block.id)}
                          role="button"
                          tabindex="0"
                          class="min-w-0 flex-1 cursor-pointer"
                        >
                          <div class="flex items-center gap-1.5">
                            <span class="font-semibold text-xs text-white truncate">
                              {block.title || 'Blok Tanpa Judul'}
                            </span>
                            {#if block.isFeatured}
                              <span class="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 text-[9px] font-bold border border-amber-500/30">
                                UNGGULAN
                              </span>
                            {/if}
                            {#if !block.active}
                              <span class="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 text-[9px] font-bold">
                                NONAKTIF
                              </span>
                            {/if}
                          </div>
                          <p class="text-[10px] text-slate-400 truncate">
                            {blockConfig?.label} {block.subtitle ? `• ${block.subtitle}` : ''}
                          </p>
                        </div>
                      </div>

                      <!-- Quick Action Toggles -->
                      <div class="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onclick={() => updateBlock(block.id, { active: !block.active })}
                          class={`p-1.5 rounded-lg text-xs font-bold transition ${
                            block.active ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-slate-500 hover:bg-slate-800'
                          }`}
                          title={block.active ? 'Nonaktifkan Blok' : 'Aktifkan Blok'}
                        >
                          <CheckCircle2 class="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onclick={() => (expandedBlockId = isExpanded ? null : block.id)}
                          class="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                        >
                          {#if isExpanded}
                            <ChevronUp class="w-4 h-4" />
                          {:else}
                            <ChevronDown class="w-4 h-4" />
                          {/if}
                        </button>
                      </div>
                    </div>

                    <!-- Block Detail Accordion Form -->
                    {#if isExpanded}
                      <div class="p-4 pt-2 border-t border-slate-800 space-y-3.5 text-xs bg-slate-900/40 rounded-b-2xl">
                        <!-- Title & Subtitle -->
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label class="text-[11px] font-bold text-slate-400 block mb-1">
                              Judul Blok
                            </label>
                            <input
                              type="text"
                              bind:value={block.title}
                              class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-emerald-500 focus:outline-none"
                              placeholder="Judul tombol atau banner"
                            />
                          </div>
                          <div>
                            <label class="text-[11px] font-bold text-slate-400 block mb-1">
                              Subjudul / Keterangan
                            </label>
                            <input
                              type="text"
                              bind:value={block.subtitle}
                              class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-emerald-500 focus:outline-none"
                              placeholder="Keterangan singkat tambahan"
                            />
                          </div>
                        </div>

                        <!-- WhatsApp specific inputs -->
                        {#if block.type === 'whatsapp'}
                          <div class="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-2.5">
                            <div>
                              <label class="text-[11px] font-bold text-emerald-400 block mb-1">
                                Nomor WhatsApp (Format: 08xx atau 628xx)
                              </label>
                              <input
                                type="text"
                                bind:value={block.whatsappNumber}
                                class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-emerald-500/40 text-white text-xs font-mono focus:border-emerald-400 focus:outline-none"
                                placeholder="Contoh: 081234567890"
                              />
                            </div>
                            <div>
                              <label class="text-[11px] font-bold text-emerald-400 block mb-1">
                                Template Pesan Awal (Opsional)
                              </label>
                              <textarea
                                rows={2}
                                bind:value={block.whatsappMessage}
                                class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-emerald-500/40 text-white text-xs focus:border-emerald-400 focus:outline-none"
                                placeholder="Contoh: Halo Admin Puskesmas Manding, saya ingin informasi jadwal..."
                              ></textarea>
                            </div>
                          </div>
                        {/if}

                        <!-- General URL / Link Input -->
                        {#if block.type !== 'divider' && block.type !== 'spacer' && block.type !== 'text' && block.type !== 'whatsapp'}
                          <div>
                            <label class="text-[11px] font-bold text-slate-400 block mb-1">
                              {block.type === 'video' ? 'URL Video YouTube' : block.type === 'phone' ? 'Nomor Telepon Hotline' : block.type === 'email' ? 'Alamat Email' : 'URL Tujuan'}
                            </label>
                            <input
                              type="text"
                              bind:value={block.url}
                              class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-emerald-500 focus:outline-none"
                              placeholder={block.type === 'video' ? 'https://www.youtube.com/watch?v=...' : block.type === 'phone' ? '08123456789' : 'https://...'}
                            />
                          </div>
                        {/if}

                        <!-- Content area for Text/Bio/Announcement/Location -->
                        {#if block.type === 'text' || block.type === 'announcement' || block.type === 'location'}
                          <div>
                            <label class="text-[11px] font-bold text-slate-400 block mb-1">
                              Isi Konten Teks Lengkap
                            </label>
                            <textarea
                              rows={3}
                              bind:value={block.content}
                              class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-emerald-500 focus:outline-none"
                              placeholder="Tuliskan isi informasi, pengumuman, atau alamat lengkap di sini..."
                            ></textarea>
                          </div>
                        {/if}

                        <!-- Image thumbnail / Poster URL -->
                        {#if block.type === 'link' || block.type === 'image' || block.type === 'image_link'}
                          <div>
                            <label class="text-[11px] font-bold text-slate-400 block mb-1">
                              URL Gambar / Poster Banner
                            </label>
                            <input
                              type="text"
                              bind:value={block.thumbnailUrl}
                              class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-emerald-500 focus:outline-none"
                              placeholder="https://images.unsplash.com/..."
                            />
                          </div>
                        {/if}

                        <!-- Badge, Icon & Featured -->
                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                          <div>
                            <label class="text-[11px] font-bold text-slate-400 block mb-1">
                              Pita Badge Text
                            </label>
                            <input
                              type="text"
                              bind:value={block.badgeText}
                              class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-emerald-500 focus:outline-none"
                              placeholder="Contoh: BARU / POPULER"
                            />
                          </div>

                          <div>
                            <label class="text-[11px] font-bold text-slate-400 block mb-1">
                              Ikon Pilihan
                            </label>
                            <select
                              bind:value={block.icon}
                              class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-emerald-500 focus:outline-none"
                            >
                              {#each ICON_PRESETS as iconName (iconName)}
                                <option value={iconName}>
                                  {iconName}
                                </option>
                              {/each}
                            </select>
                          </div>

                          <div>
                            <label class="text-[11px] font-bold text-slate-400 block mb-1">
                              Grup Kategori
                            </label>
                            <select
                              value={block.groupId || ''}
                              onchange={(e) => updateBlock(block.id, { groupId: e.currentTarget.value || undefined })}
                              class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-emerald-500 focus:outline-none"
                            >
                              <option value="">Tanpa Grup (Utama)</option>
                              {#each groups as g (g.id)}
                                <option value={g.id}>
                                  {g.name}
                                </option>
                              {/each}
                            </select>
                          </div>
                        </div>

                        <!-- Highlight Toggle & Scheduling -->
                        <div class="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
                          <label class="flex items-center gap-2 cursor-pointer text-slate-300">
                            <input
                              type="checkbox"
                              bind:checked={block.isFeatured}
                              class="w-4 h-4 rounded text-amber-500 focus:ring-amber-500"
                            />
                            <span class="flex items-center gap-1 font-semibold text-amber-400">
                              <Flame class="w-3.5 h-3.5" />
                              <span>Sorot Sebagai Unggulan</span>
                            </span>
                          </label>

                          <button
                            type="button"
                            onclick={() => removeBlock(block.id)}
                            class="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold flex items-center gap-1.5 transition ml-auto"
                          >
                            <Trash2 class="w-3.5 h-3.5" />
                            <span>Hapus Blok</span>
                          </button>
                        </div>
                      </div>
                    {/if}
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {/if}

        <!-- TAB 2: UBAH HEADER & FOTO -->
        {#if studioTab === 'header'}
          <div class="space-y-5 text-xs">
            <div>
              <h3 class="text-xs font-bold uppercase tracking-wider text-slate-300 mb-1 flex items-center gap-1.5">
                <LayoutTemplate class="w-4 h-4 text-emerald-400" />
                <span>Gaya & Layout Header</span>
              </h3>
              <p class="text-[11px] text-slate-400 mb-3">
                Pilih tata letak header yang paling representatif untuk portal Puskesmas
              </p>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {#each HEADER_STYLE_OPTIONS as opt (opt.id)}
                  <div
                    onclick={() => (headerStyle = opt.id)}
                    onkeydown={(e) => e.key === 'Enter' && (headerStyle = opt.id)}
                    role="button"
                    tabindex="0"
                    class={`p-3 rounded-2xl border cursor-pointer transition-all ${
                      headerStyle === opt.id
                        ? 'border-emerald-500 bg-emerald-950/20 ring-1 ring-emerald-500/30'
                        : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                    }`}
                  >
                    <div class="flex items-center justify-between mb-1">
                      <span class="font-bold text-xs text-white">{opt.name}</span>
                      {#if headerStyle === opt.id}<CheckCircle2 class="w-4 h-4 text-emerald-400" />{/if}
                    </div>
                    <p class="text-[10px] text-slate-400 leading-relaxed">{opt.desc}</p>
                  </div>
                {/each}
              </div>
            </div>

            <!-- Upload Logo Resmi / Avatar Profil -->
            <div class="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
              <div class="flex items-center justify-between">
                <div>
                  <h4 class="font-bold text-white text-xs flex items-center gap-1.5">
                    <Sparkles class="w-3.5 h-3.5 text-emerald-400" />
                    <span>Logo Resmi / Avatar Profil</span>
                  </h4>
                  <p class="text-[10px] text-slate-400">
                    Upload logo instansi, puskesmas, atau foto profil penanggung jawab
                  </p>
                </div>
              </div>

              <MicrositeImageUploadField
                label="Upload File Logo"
                value={logoUrl}
                onChange={(url) => (logoUrl = url)}
                presetType="logo"
                aspectRatio="square"
                placeholder="Pilih file logo PNG/JPG/WebP atau masukkan tautan URL..."
              />

              <!-- Avatar Shape Selection -->
              <div>
                <label class="text-[11px] font-bold text-slate-400 block mb-1.5">Bentuk Logo / Avatar</label>
                <div class="grid grid-cols-4 gap-2">
                  {#each AVATAR_SHAPE_OPTIONS as shape (shape)}
                    <button
                      type="button"
                      onclick={() => (avatarShape = shape)}
                      class={`py-1.5 px-2 rounded-xl border text-[10px] font-bold capitalize transition ${
                        avatarShape === shape
                          ? 'border-emerald-400 bg-emerald-950/40 text-emerald-300'
                          : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {shape === 'circle' ? 'Bulat' : shape === 'rounded' ? 'Melengkung' : shape === 'square' ? 'Kotak' : 'Heksagon'}
                    </button>
                  {/each}
                </div>
              </div>
            </div>

            <!-- Upload Banner / Foto Sampul Header -->
            <div class="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
              <div class="flex items-center justify-between">
                <div>
                  <h4 class="font-bold text-white text-xs flex items-center gap-1.5">
                    <ImageIcon class="w-3.5 h-3.5 text-cyan-400" />
                    <span>Banner / Sampul Header</span>
                  </h4>
                  <p class="text-[10px] text-slate-400">
                    Foto gedung fasilitas kesehatan, tim medis, atau pemandangan lanskap
                  </p>
                </div>
              </div>

              <MicrositeImageUploadField
                label="Upload File Banner"
                value={bannerImageUrl}
                onChange={(url) => {
                  bannerImageUrl = url;
                  profileImageUrl = url;
                }}
                presetType="banner"
                aspectRatio="banner"
                placeholder="Pilih foto sampul lanskap PNG/JPG/WebP atau tautan..."
              />

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label class="text-[11px] font-bold text-slate-400 block mb-1">Tinggi Banner</label>
                  <select
                    bind:value={headerHeight}
                    class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs"
                  >
                    <option value="compact">Ringkas (Compact ~140px)</option>
                    <option value="medium">Sedang Standar (~190px)</option>
                    <option value="tall">Tinggi Megah (~260px)</option>
                  </select>
                </div>

                <div>
                  <div class="flex justify-between items-center mb-1">
                    <label class="text-[11px] font-bold text-slate-400">Kegelapan Overlay</label>
                    <span class="text-[10px] text-emerald-400 font-mono">{bannerOverlayOpacity}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="85"
                    bind:value={bannerOverlayOpacity}
                    class="w-full accent-emerald-500 cursor-pointer mt-1"
                  />
                </div>
              </div>
            </div>

            <!-- Header Typography & Badges -->
            <div class="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
              <h4 class="font-bold text-white text-xs flex items-center gap-1.5">
                <ShieldCheck class="w-3.5 h-3.5 text-amber-400" />
                <span>Lencana & Penataan Teks Header</span>
              </h4>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="text-[11px] font-bold text-slate-400 block mb-1">Perataan Teks</label>
                  <div class="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onclick={() => (headerAlignment = 'center')}
                      class={`py-1.5 px-2 rounded-xl border text-[10px] font-bold flex items-center justify-center gap-1 transition ${
                        headerAlignment === 'center'
                          ? 'border-emerald-400 bg-emerald-950/40 text-emerald-300'
                          : 'border-slate-800 bg-slate-900 text-slate-400'
                      }`}
                    >
                      <AlignCenter class="w-3.5 h-3.5" />
                      <span>Tengah</span>
                    </button>
                    <button
                      type="button"
                      onclick={() => (headerAlignment = 'left')}
                      class={`py-1.5 px-2 rounded-xl border text-[10px] font-bold flex items-center justify-center gap-1 transition ${
                        headerAlignment === 'left'
                          ? 'border-emerald-400 bg-emerald-950/40 text-emerald-300'
                          : 'border-slate-800 bg-slate-900 text-slate-400'
                      }`}
                    >
                      <AlignLeft class="w-3.5 h-3.5" />
                      <span>Kiri</span>
                    </button>
                  </div>
                </div>

                <div class="flex flex-col justify-end">
                  <label class="flex items-center gap-2 cursor-pointer p-2 rounded-xl bg-slate-900 border border-slate-800">
                    <input
                      type="checkbox"
                      bind:checked={showVerifiedBadge}
                      class="w-4 h-4 rounded text-emerald-500"
                    />
                    <span class="text-[11px] font-bold text-slate-300">Lencana Terverifikasi (Resmi)</span>
                  </label>
                </div>
              </div>

              <div class="pt-2 border-t border-slate-800 space-y-2">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    bind:checked={showCategoryBadge}
                    class="w-4 h-4 rounded text-emerald-500"
                  />
                  <span class="text-[11px] font-bold text-slate-300">Tampilkan Kategori Badge di Header</span>
                </label>
                {#if showCategoryBadge}
                  <input
                    type="text"
                    bind:value={categoryBadgeText}
                    placeholder={`Kustom teks badge (kosongkan untuk default: "${category}")`}
                    class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs"
                  />
                {/if}
              </div>
            </div>
          </div>
        {/if}

        <!-- TAB: FOOTER CUSTOMIZATION -->
        {#if studioTab === 'footer'}
          <div class="space-y-5">
            <div>
              <h3 class="text-xs font-bold uppercase tracking-wider text-slate-300 mb-1 flex items-center gap-1.5">
                <Sliders class="w-4 h-4 text-emerald-400" />
                <span>Gaya Tata Letak Footer</span>
              </h3>
              <p class="text-[11px] text-slate-400 mb-3">
                Pilih format visual bagian bawah microsite sesuai kebutuhan institusi atau estetika Anda
              </p>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {#each FOOTER_STYLE_OPTIONS as opt (opt.id)}
                  {@const isSelected = footerStyle === opt.id}
                  <div
                    onclick={() => (footerStyle = opt.id)}
                    onkeydown={(e) => e.key === 'Enter' && (footerStyle = opt.id)}
                    role="button"
                    tabindex="0"
                    class={`p-3 rounded-2xl border cursor-pointer transition-all relative ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-950/20 ring-1 ring-emerald-500/30 shadow-md'
                        : 'border-slate-800 bg-slate-900/70 hover:border-slate-700'
                    }`}
                  >
                    <div class="flex items-center justify-between gap-1.5 mb-1">
                      <span class="font-bold text-xs text-white flex items-center gap-1.5">
                        {opt.name}
                      </span>
                      <div class="flex items-center gap-1.5">
                        <span class={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          isSelected ? 'bg-emerald-500/30 text-emerald-300' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {opt.badge}
                        </span>
                        {#if isSelected}<CheckCircle2 class="w-4 h-4 text-emerald-400 shrink-0" />{/if}
                      </div>
                    </div>
                    <p class="text-[10px] text-slate-400 leading-relaxed">{opt.desc}</p>
                  </div>
                {/each}
              </div>
            </div>

            <!-- Perataan & Tampilan Dasar -->
            <div class="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
              <h4 class="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <AlignCenter class="w-3.5 h-3.5 text-emerald-400" />
                <span>Perataan & Orientasi Konten</span>
              </h4>

              <div class="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onclick={() => (footerAlignment = 'center')}
                  class={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                    footerAlignment === 'center'
                      ? 'border-emerald-500 bg-emerald-950/30 text-emerald-400'
                      : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  <AlignCenter class="w-4 h-4" />
                  <span>Rata Tengah (Center)</span>
                </button>
                <button
                  type="button"
                  onclick={() => (footerAlignment = 'left')}
                  class={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                    footerAlignment === 'left'
                      ? 'border-emerald-500 bg-emerald-950/30 text-emerald-400'
                      : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  <AlignLeft class="w-4 h-4" />
                  <span>Rata Kiri (Left)</span>
                </button>
              </div>
            </div>

            <!-- Teks Hak Cipta & Slogan -->
            <div class="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3.5">
              <h4 class="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <FileText class="w-3.5 h-3.5 text-emerald-400" />
                <span>Teks Hak Cipta & Slogan Pelayanan</span>
              </h4>

              <div>
                <label class="block text-[11px] font-semibold text-slate-300 mb-1">
                  Teks Hak Cipta (Copyright)
                </label>
                <input
                  type="text"
                  bind:value={customCopyrightText}
                  placeholder={`Contoh: © ${new Date().getFullYear()} ${name || 'Puskesmas Manding'}. All Rights Reserved.`}
                  class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
                <p class="text-[10px] text-slate-500 mt-1">
                  Kosongkan untuk memakai teks otomatis default dengan nama microsite.
                </p>
              </div>

              <div>
                <label class="block text-[11px] font-semibold text-slate-300 mb-1">
                  Slogan / Motto Pelayanan
                </label>
                <input
                  type="text"
                  bind:value={customTagline}
                  placeholder="Contoh: Portal Akses Cepat Layanan Kesehatan Masyarakat"
                  class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
                <div class="flex flex-wrap gap-1.5 mt-2">
                  <span class="text-[10px] text-slate-500 self-center">Preset:</span>
                  {#each TAGLINE_PRESETS as preset (preset)}
                    <button
                      type="button"
                      onclick={() => (customTagline = preset)}
                      class="text-[10px] px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                    >
                      {preset.length > 28 ? preset.substring(0, 28) + '...' : preset}
                    </button>
                  {/each}
                </div>
              </div>
            </div>

            <!-- Lencana Resmi & Akreditasi -->
            <div class="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3.5">
              <div class="flex items-center justify-between">
                <h4 class="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Award class="w-3.5 h-3.5 text-emerald-400" />
                  <span>Lencana Resmi & Akreditasi</span>
                </h4>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    bind:checked={showGovernmentBadges}
                    class="sr-only peer"
                  />
                  <div class="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {#if showGovernmentBadges}
                <div class="space-y-3 pt-2 border-t border-slate-800">
                  <p class="text-[11px] text-slate-400">
                    Pilih lencana legitimasi instansi yang ditampilkan:
                  </p>
                  <div class="grid grid-cols-2 gap-2">
                    {#each GOV_BADGE_OPTIONS as b (b.id)}
                      {@const isChecked = governmentBadges.includes(b.id)}
                      {@const IconComp = b.icon}
                      <button
                        type="button"
                        onclick={() => toggleBadge(b.id)}
                        class={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition ${
                          isChecked
                            ? 'border-emerald-500/60 bg-emerald-950/20 text-emerald-300'
                            : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <div class={`p-1.5 rounded-lg ${isChecked ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                          <IconComp class="w-4 h-4" />
                        </div>
                        <div class="min-w-0 flex-1">
                          <div class="text-[11px] font-bold truncate">{b.label}</div>
                          <div class="text-[9px] text-slate-500 truncate">{b.sub}</div>
                        </div>
                        {#if isChecked}<Check class="w-3.5 h-3.5 text-emerald-400 shrink-0" />{/if}
                      </button>
                    {/each}
                  </div>

                  <div>
                    <label class="block text-[11px] font-semibold text-slate-300 mb-1">
                      Catatan / Keterangan Tambahan Lencana
                    </label>
                    <input
                      type="text"
                      bind:value={customBadgesText}
                      placeholder="Contoh: Terakreditasi Paripurna Kemenkes RI No: 440/123/2024"
                      class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              {/if}
            </div>

            <!-- Tombol Interaktif & Aksi Cepat -->
            <div class="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
              <h4 class="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Sparkles class="w-3.5 h-3.5 text-emerald-400" />
                <span>Tombol Aksi Cepat & Navigasi</span>
              </h4>

              <div class="space-y-2">
                <label class="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-850 cursor-pointer hover:border-slate-700 transition">
                  <div class="flex items-center gap-2">
                    <MoveUp class="w-4 h-4 text-emerald-400" />
                    <div>
                      <span class="text-xs font-bold text-slate-200 block">Tombol "Kembali ke Atas"</span>
                      <span class="text-[10px] text-slate-400">Memudahkan pengunjung melompat ke bagian atas</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    bind:checked={showBackToTop}
                    class="w-4 h-4 rounded text-emerald-500 bg-slate-800 border-slate-700"
                  />
                </label>

                <label class="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-850 cursor-pointer hover:border-slate-700 transition">
                  <div class="flex items-center gap-2">
                    <Share2 class="w-4 h-4 text-sky-400" />
                    <div>
                      <span class="text-xs font-bold text-slate-200 block">Tombol "Bagikan Portal"</span>
                      <span class="text-[10px] text-slate-400">Salin link atau buka dialog bagikan cepat</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    bind:checked={showShareButton}
                    class="w-4 h-4 rounded text-emerald-500 bg-slate-800 border-slate-700"
                  />
                </label>

                <label class="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-850 cursor-pointer hover:border-slate-700 transition">
                  <div class="flex items-center gap-2">
                    <QrCode class="w-4 h-4 text-amber-400" />
                    <div>
                      <span class="text-xs font-bold text-slate-200 block">Tombol "Kode QR"</span>
                      <span class="text-[10px] text-slate-400">Tampilkan modal scan QR code untuk pengunjung</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    bind:checked={showQRButton}
                    class="w-4 h-4 rounded text-emerald-500 bg-slate-800 border-slate-700"
                  />
                </label>

                <label class="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-850 cursor-pointer hover:border-slate-700 transition">
                  <div class="flex items-center gap-2">
                    <Phone class="w-4 h-4 text-rose-400" />
                    <div>
                      <span class="text-xs font-bold text-slate-200 block">Ringkasan Kontak Footer</span>
                      <span class="text-[10px] text-slate-400">Tampilkan ringkasan nomor telepon, email, & alamat</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    bind:checked={showContactSummary}
                    class="w-4 h-4 rounded text-emerald-500 bg-slate-800 border-slate-700"
                  />
                </label>
              </div>
            </div>

            <!-- Media Sosial Footer -->
            <div class="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
              <div class="flex items-center justify-between">
                <h4 class="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Globe class="w-3.5 h-3.5 text-emerald-400" />
                  <span>Ikon Media Sosial Footer</span>
                </h4>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    bind:checked={showSocialLinks}
                    class="sr-only peer"
                  />
                  <div class="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {#if showSocialLinks}
                <div class="space-y-2 pt-2 border-t border-slate-800">
                  <label class="block text-[11px] font-semibold text-slate-300">
                    Gaya Tampilan Ikon Sosial
                  </label>
                  <div class="grid grid-cols-3 gap-2">
                    {#each SOCIAL_STYLE_OPTIONS as st (st.id)}
                      <button
                        type="button"
                        onclick={() => (socialStyle = st.id)}
                        class={`py-2 px-2 rounded-xl border text-[11px] font-bold text-center transition ${
                          socialStyle === st.id
                            ? 'border-emerald-500 bg-emerald-950/30 text-emerald-400'
                            : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                        }`}
                      >
                        {st.label}
                      </button>
                    {/each}
                  </div>
                </div>
              {/if}
            </div>

            <!-- Tautan Navigasi Footer Tambahan -->
            <div class="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3.5">
              <div class="flex items-center justify-between">
                <h4 class="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Link2 class="w-3.5 h-3.5 text-emerald-400" />
                  <span>Tautan Navigasi Footer (Quick Links)</span>
                </h4>
                <button
                  type="button"
                  onclick={() => addFooterLink('Maklumat Pelayanan', '/maklumat-pelayanan')}
                  class="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 transition"
                >
                  <Plus class="w-3.5 h-3.5" />
                  <span>Tambah Tautan</span>
                </button>
              </div>

              <!-- Preset Quick Links -->
              <div class="space-y-1.5">
                <span class="text-[10px] text-slate-400 block font-semibold">
                  Tambah Cepat Tautan Standar Instansi:
                </span>
                <div class="flex flex-wrap gap-1.5">
                  {#each QUICK_LINK_PRESETS as preset (preset.label)}
                    <button
                      type="button"
                      onclick={() => addFooterLink(preset.label, preset.url, preset.isExternal)}
                      class="text-[10px] px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 flex items-center gap-1 transition"
                    >
                      <Plus class="w-3 h-3" />
                      <span>{preset.label}</span>
                    </button>
                  {/each}
                </div>
              </div>

              <!-- Links List -->
              {#if footerLinks.length === 0}
                <div class="p-3 text-center rounded-xl border border-dashed border-slate-800 text-[11px] text-slate-500">
                  Belum ada tautan navigasi khusus di footer.
                </div>
              {:else}
                <div class="space-y-2">
                  {#each footerLinks as fl (fl.id)}
                    <div class="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2">
                      <div class="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          bind:value={fl.label}
                          placeholder="Label Tautan (contoh: Maklumat)"
                          class="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs"
                        />
                        <input
                          type="text"
                          bind:value={fl.url}
                          placeholder="URL Tautan (https:// atau /path)"
                          class="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs"
                        />
                      </div>
                      <button
                        type="button"
                        onclick={() => removeFooterLink(fl.id)}
                        class="p-2 rounded-lg text-rose-400 hover:bg-rose-950/40 transition"
                        title="Hapus Tautan"
                      >
                        <Trash2 class="w-4 h-4" />
                      </button>
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
          </div>
        {/if}

        <!-- TAB 3: DESIGN & BACKGROUND -->
        {#if studioTab === 'design'}
          <div class="space-y-5">
            <div>
              <h3 class="text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                Pilihan Tema Visual Master
              </h3>
              <p class="text-[11px] text-slate-400 mb-3">
                Pilih arsitektur template estetika berkelas untuk bio link
              </p>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {#each TEMPLATE_OPTIONS as opt (opt.id)}
                  <div
                    onclick={() => (template = opt.id)}
                    onkeydown={(e) => e.key === 'Enter' && (template = opt.id)}
                    role="button"
                    tabindex="0"
                    class={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      template === opt.id
                        ? 'border-emerald-500 bg-emerald-950/20 ring-1 ring-emerald-500/30'
                        : 'border-slate-800 bg-slate-900/70 hover:border-slate-700'
                    }`}
                  >
                    <div class="flex items-center justify-between mb-1">
                      <span class="font-bold text-xs text-white">{opt.name}</span>
                      {#if template === opt.id}<CheckCircle2 class="w-4 h-4 text-emerald-400" />{/if}
                    </div>
                    <p class="text-[10px] text-slate-400 leading-relaxed">{opt.desc}</p>
                  </div>
                {/each}
              </div>
            </div>

            <!-- Upload Background Image -->
            <div class="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
              <h3 class="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <ImageIcon class="w-3.5 h-3.5 text-teal-400" />
                <span>Upload Gambar Latar Belakang (Background)</span>
              </h3>
              <p class="text-[11px] text-slate-400">
                Sematkan foto latar belakang artistik untuk seluruh halaman microsite
              </p>

              <MicrositeImageUploadField
                label="Upload File Background"
                value={backgroundImageUrl}
                onChange={(url) => (backgroundImageUrl = url)}
                presetType="background"
                aspectRatio="background"
                placeholder="Pilih foto wallpaper PNG/JPG/WebP atau tautan..."
              />

              {#if backgroundImageUrl}
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <div class="flex justify-between items-center mb-1">
                      <label class="text-[11px] font-bold text-slate-400">Transparansi Latar</label>
                      <span class="text-[10px] text-emerald-400 font-mono">{bgImageOpacity}%</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="100"
                      bind:value={bgImageOpacity}
                      class="w-full accent-emerald-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <label class="text-[11px] font-bold text-slate-400 block mb-1">Efek Blur Latar</label>
                    <div class="grid grid-cols-4 gap-1.5">
                      {#each BLUR_OPTIONS as b (b)}
                        <button
                          type="button"
                          onclick={() => (bgImageBlur = b)}
                          class={`py-1.5 px-1.5 rounded-xl border text-[10px] font-bold uppercase transition ${
                            bgImageBlur === b
                              ? 'border-emerald-400 bg-emerald-950/40 text-emerald-300'
                              : 'border-slate-800 bg-slate-900 text-slate-400'
                          }`}
                        >
                          {b === 'none' ? '0' : b}
                        </button>
                      {/each}
                    </div>
                  </div>
                </div>
              {/if}
            </div>

            <div>
              <h3 class="text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                Animasi Latar Belakang (Artistic Canvas)
              </h3>
              <p class="text-[11px] text-slate-400 mb-3">
                Efek gelombang partikel dinamis yang meredakan ketegangan mata
              </p>
              <select
                bind:value={backgroundAnimation}
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-emerald-500 focus:outline-none"
              >
                {#each ANIMATION_OPTIONS as anim (anim.id)}
                  <option value={anim.id}>
                    {anim.name}
                  </option>
                {/each}
              </select>
            </div>

            <div>
              <h3 class="text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                Warna Aksen & Preset Tone
              </h3>
              <div class="grid grid-cols-4 gap-2 pt-1">
                {#each [
                  { name: 'Emerald', color: '#10b981', preset: 'emerald' },
                  { name: 'Teal', color: '#14b8a6', preset: 'teal' },
                  { name: 'Amber Gold', color: '#f59e0b', preset: 'amber' },
                  { name: 'Cyan Modern', color: '#06b6d4', preset: 'cyan' }
                ] as p (p.name)}
                  <button
                    type="button"
                    onclick={() => {
                      accentColor = p.color;
                      themePreset = p.preset;
                    }}
                    class={`p-2.5 rounded-xl border text-center transition ${
                      accentColor === p.color
                        ? 'border-emerald-400 bg-slate-800'
                        : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                    }`}
                  >
                    <div
                      class="w-5 h-5 rounded-full mx-auto mb-1.5 shadow-sm"
                      style={`background-color: ${p.color}`}
                    ></div>
                    <span class="text-[10px] font-semibold text-slate-300 block truncate">{p.name}</span>
                  </button>
                {/each}
              </div>
            </div>
          </div>
        {/if}

        <!-- TAB 4: SETTINGS & METADATA -->
        {#if studioTab === 'settings'}
          <div class="space-y-4 text-xs">
            <div>
              <label class="text-[11px] font-bold text-slate-400 block mb-1">Nama Microsite / Portal</label>
              <input
                type="text"
                bind:value={name}
                class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-emerald-500 focus:outline-none"
                placeholder="Contoh: Portal Informasi Cepat Puskesmas Manding"
              />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="text-[11px] font-bold text-slate-400 block mb-1">Slug URL (/m/slug)</label>
                <input
                  type="text"
                  bind:value={slug}
                  class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-emerald-500 focus:outline-none"
                  placeholder="portal-cepat"
                />
              </div>

              <div>
                <label class="text-[11px] font-bold text-slate-400 block mb-1">Kategori</label>
                <select
                  bind:value={category}
                  class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-emerald-500 focus:outline-none"
                >
                  {#each categories as c (c.name)}
                    <option value={c.name}>
                      {c.name}
                    </option>
                  {/each}
                  <option value="Umum">Umum</option>
                </select>
              </div>
            </div>

            <div>
              <label class="text-[11px] font-bold text-slate-400 block mb-1">Deskripsi Ringkas</label>
              <textarea
                rows={2}
                bind:value={description}
                class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-emerald-500 focus:outline-none"
                placeholder="Deskripsi singkat portal untuk pengunjung..."
              ></textarea>
            </div>

            <!-- Upload Logo & Banner Quick Section in Settings -->
            <div class="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
              <h4 class="font-bold text-slate-300 uppercase tracking-wider text-[10px]">
                Media Logo & Foto Sampul
              </h4>
              <div class="space-y-3">
                <MicrositeImageUploadField
                  label="Logo Resmi"
                  value={logoUrl}
                  onChange={(url) => (logoUrl = url)}
                  presetType="logo"
                  aspectRatio="square"
                  placeholder="Upload logo resmi..."
                />
                <MicrositeImageUploadField
                  label="Banner Sampul Header"
                  value={bannerImageUrl}
                  onChange={(url) => {
                    bannerImageUrl = url;
                    profileImageUrl = url;
                  }}
                  presetType="banner"
                  aspectRatio="banner"
                  placeholder="Upload banner sampul..."
                />
              </div>
            </div>

            <!-- Kontak & Lokasi Posko -->
            <div class="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
              <h4 class="font-bold text-slate-300 uppercase tracking-wider text-[10px]">
                Kontak & Posko Pelayanan
              </h4>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <input
                  type="text"
                  bind:value={phone}
                  class="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs"
                  placeholder="Hotline Telepon"
                />
                <input
                  type="text"
                  bind:value={email}
                  class="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs"
                  placeholder="Email Resmi"
                />
              </div>
              <input
                type="text"
                bind:value={address}
                class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs"
                placeholder="Alamat Fasilitas Kesehatan"
              />
            </div>

            <!-- Status Publikasi & Password -->
            <div class="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div class="flex items-center justify-between">
                <div>
                  <span class="font-bold text-slate-300 block">Status Publikasi</span>
                  <span class="text-[10px] text-slate-500">Live dapat diakses publik</span>
                </div>
                <select
                  bind:value={status}
                  class="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs"
                >
                  <option value="published">Published (Aktif)</option>
                  <option value="draft">Draft (Konsep)</option>
                  <option value="archived">Archived (Arsip)</option>
                </select>
              </div>

              <div class="pt-2 border-t border-slate-800">
                <label class="flex items-center gap-2 cursor-pointer mb-2">
                  <input
                    type="checkbox"
                    bind:checked={passwordProtected}
                    class="w-4 h-4 rounded text-emerald-500"
                  />
                  <span class="font-bold text-slate-300">Proteksi PIN / Password</span>
                </label>
                {#if passwordProtected}
                  <input
                    type="password"
                    bind:value={password}
                    placeholder="Masukkan PIN / Password akses"
                    class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs"
                  />
                {/if}
              </div>
            </div>
          </div>
        {/if}

        <!-- TAB 4: GROUPS ORGANIZER -->
        {#if studioTab === 'groups'}
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Grup & Kategori Blok
                </h3>
                <p class="text-[11px] text-slate-400">
                  Kelompokkan tautan ke dalam folder / accordion
                </p>
              </div>
              <button
                type="button"
                onclick={addGroup}
                class="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-1.5"
              >
                <Plus class="w-3.5 h-3.5" />
                <span>Tambah Grup</span>
              </button>
            </div>

            {#if groups.length === 0}
              <div class="p-6 text-center rounded-2xl border border-dashed border-slate-800 text-xs text-slate-500">
                Belum ada grup. Semua blok akan ditampilkan dalam satu daftar bersambung.
              </div>
            {:else}
              <div class="space-y-2.5">
                {#each groups as grp (grp.id)}
                  <div class="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2.5">
                    <div class="flex items-center justify-between gap-2">
                      <input
                        type="text"
                        bind:value={grp.name}
                        class="flex-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-bold"
                        placeholder="Nama Grup"
                      />
                      <button
                        type="button"
                        onclick={() => removeGroup(grp.id)}
                        class="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition"
                      >
                        <Trash2 class="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div class="flex items-center justify-between text-[11px] text-slate-400">
                      <label class="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          bind:checked={grp.collapsible}
                          class="rounded text-emerald-500"
                        />
                        <span>Bisa Dilipat (Accordion)</span>
                      </label>
                      <span class="font-mono text-[10px]">
                        {blocks.filter(b => b.groupId === grp.id).length} Blok
                      </span>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {/if}
      </div>
    </div>

    <!-- RIGHT COLUMN: Interactive Device Simulator -->
    <div class="flex-1 bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 overflow-hidden relative">
      <div class="absolute top-4 right-4 z-20 flex items-center gap-2">
        <span class="px-2.5 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-slate-300 text-[11px] font-mono flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Pratinjau Langsung</span>
        </span>
      </div>

      <!-- Device Frame -->
      <div
        class={`transition-all duration-300 rounded-[2.5rem] border-4 border-slate-800 shadow-2xl bg-[var(--color-bg)] overflow-hidden flex flex-col ${
          deviceMode === 'mobile'
            ? 'w-[375px] h-[720px] max-h-[90vh]'
            : deviceMode === 'tablet'
            ? 'w-[600px] h-[760px] max-h-[90vh]'
            : 'w-full max-w-2xl h-[780px] max-h-[90vh]'
        }`}
      >
        <!-- Phone Speaker Notch -->
        {#if deviceMode === 'mobile'}
          <div class="w-full h-5 bg-slate-900 flex justify-center items-center shrink-0">
            <div class="w-16 h-1 rounded-full bg-slate-700"></div>
          </div>
        {/if}

        <!-- Scrollable Live Interactive Preview -->
        <div class="flex-1 overflow-y-auto custom-scrollbar">
          <MicrositeTemplateRenderer
            microsite={liveEntity}
            templateOverride={template}
            animationOverride={backgroundAnimation}
            isPreviewMode={true}
            onOpenQR={() => (qrModalOpen = true)}
            onCopyLink={handleCopyPublicLink}
            copied={copiedLink}
          />
        </div>
      </div>
    </div>
  </div>

  <!-- MODAL: ADD BLOCK SELECTOR PALETTE -->
  {#if isAddBlockOpen}
    <div class="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4" transition:fade={{ duration: 200 }}>
      <div
        class="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col"
        in:scale={{ duration: 200, start: 0.95 }}
        out:scale={{ duration: 150, start: 0.95 }}
      >
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Plus class="w-5 h-5" />
            </div>
            <div>
              <h3 class="font-bold text-sm text-white">Pilih Jenis Blok Konten</h3>
              <p class="text-[11px] text-slate-400">Pilih modul yang ingin disematkan ke bio link</p>
            </div>
          </div>
          <button
            type="button"
            onclick={() => (isAddBlockOpen = false)}
            class="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-1 custom-scrollbar">
          {#each BLOCK_TYPE_CONFIGS as item (item.type)}
            {@const Icon = item.icon}
            <button
              type="button"
              onclick={() => addBlock(item.type)}
              class="p-3.5 rounded-2xl border border-slate-800 bg-slate-950/60 hover:bg-slate-800 hover:border-slate-700 text-left transition flex items-start gap-3 group"
            >
              <div class={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${item.color}`}>
                <Icon class="w-4 h-4" />
              </div>
              <div class="min-w-0 flex-1">
                <span class="font-bold text-xs text-white group-hover:text-emerald-400 transition block">
                  {item.label}
                </span>
                <p class="text-[10px] text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">
                  {item.description}
                </p>
              </div>
            </button>
          {/each}
        </div>
      </div>
    </div>
  {/if}

  <!-- MODAL: QR CODE PREVIEW & DOWNLOAD -->
  {#if qrModalOpen}
    <div class="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4" transition:fade={{ duration: 200 }}>
      <div
        class="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-center space-y-4"
        in:scale={{ duration: 200, start: 0.95 }}
        out:scale={{ duration: 150, start: 0.95 }}
      >
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 class="font-bold text-sm text-white">QR Code Microsite</h3>
          <button
            type="button"
            onclick={() => (qrModalOpen = false)}
            class="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <div class="p-4 bg-white rounded-2xl inline-block shadow-inner">
          <img
            src={micrositeService.generateQRCodeURL(slug)}
            alt="QR Code"
            class="w-48 h-48 object-contain mx-auto"
          />
        </div>

        <div>
          <p class="text-xs font-semibold text-white">{name}</p>
          <p class="text-[11px] font-mono text-emerald-400 mt-0.5">/m/{slug}</p>
        </div>

        <div class="flex gap-2 pt-2">
          <a
            href={micrositeService.generateQRCodeURL(slug)}
            download={`qr-microsite-${slug}.png`}
            target="_blank"
            rel="noopener noreferrer"
            class="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition"
          >
            <Download class="w-4 h-4" />
            <span>Unduh Gambar QR</span>
          </a>
        </div>
      </div>
    </div>
  {/if}
</div>
