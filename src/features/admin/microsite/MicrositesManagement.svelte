<!-- @component Pengelolaan microsite: daftar portal per kategori, Studio visual editor, QR code & bagikan, analitik, duplikasi, ekspor/impor JSON, kelola kategori. -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { authStore } from '../../../shared/stores/auth.svelte.js';
  import { toastStore } from '../../../shared/stores/toast.svelte.js';
  import { micrositeService } from '../../../shared/services/micrositeService.js';
  import { generateSmartShareUrl, openWhatsAppShare } from '../../../shared/utils/shareUtils.js';
  import type {
    MicrositeEntity,
    ContentStatus,
    MicrositeCategory,
  } from '../../../shared/types/index.js';
  import Card from '../../../shared/ui/Card.svelte';
  import Button from '../../../shared/ui/Button.svelte';
  import Badge from '../../../shared/ui/Badge.svelte';
  import Modal from '../../../shared/ui/Modal.svelte';
  import MicrositeStudioEditor from '../../microsite/builder/MicrositeStudioEditor.svelte';
  import {
    Globe,
    Plus,
    Trash2,
    QrCode,
    ExternalLink,
    Lock,
    Unlock,
    Eye,
    CheckCircle,
    Download,
    Printer,
    Copy,
    Check,
    Search,
    Folder,
    Tag,
    Sparkles,
    TrendingUp,
    Send,
    MessageCircle,
    MousePointerClick,
    CopyPlus,
    UploadCloud,
    DownloadCloud,
    PieChart,
  } from 'lucide-svelte';

  let microsites = $state<MicrositeEntity[]>([]);
  let loading = $state(true);
  let searchQuery = $state('');

  // QR Code Modal State
  let qrModalOpen = $state(false);
  let qrMicrosite = $state<MicrositeEntity | null>(null);
  let copiedUrl = $state(false);

  // Studio Visual Editor State
  let studioOpen = $state(false);
  let studioMicrosite = $state<MicrositeEntity | null>(null);

  // Advanced Analytics State
  let analyticsModalOpen = $state(false);
  let selectedAnalyticsMicrosite = $state<MicrositeEntity | null>(null);
  let detailedAnalytics = $state<{
    views: number;
    clicks: number;
    ctr: string;
    deviceBreakdown?: Record<string, number>;
    referrerBreakdown?: Record<string, number>;
    blockClicks?: Record<string, number>;
  } | null>(null);

  // File Input for JSON Import
  let fileInputRef = $state<HTMLInputElement | null>(null);

  // Categories state
  let categories = $state<MicrositeCategory[]>([]);
  let categoryModalOpen = $state(false);
  let newCategoryName = $state('');
  let newCategoryDescription = $state('');
  let category = $state('Umum');

  const filteredMicrosites = $derived(
    microsites.filter(
      (m) =>
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.slug.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  function getActor() {
    const user = authStore.user;
    return {
      id: user?.uid || 'usr-admin',
      email: user?.email || 'admin@puskesmas.go.id',
      name: user?.displayName || 'Administrator',
    };
  }

  async function loadCategories() {
    try {
      const cats = await micrositeService.getCategories();
      categories = cats;
      if (cats.length > 0 && !category) {
        category = cats[0].name;
      }
    } catch (e) {
      console.error('Error loading categories:', e);
    }
  }

  async function handleAddCategory() {
    if (!newCategoryName.trim()) {
      toastStore.showToast('Nama kategori wajib diisi.', 'warning');
      return;
    }
    const nameTrim = newCategoryName.trim();
    if (categories.some((c) => c.name.toLowerCase() === nameTrim.toLowerCase())) {
      toastStore.showToast('Kategori sudah ada.', 'warning');
      return;
    }
    const updated: MicrositeCategory[] = [
      ...categories,
      {
        name: nameTrim,
        description: newCategoryDescription.trim() || `Kategori portal khusus untuk ${nameTrim}.`,
      },
    ];
    try {
      await micrositeService.saveCategories(updated, getActor());
      categories = updated;
      newCategoryName = '';
      newCategoryDescription = '';
      toastStore.showToast('Kategori berhasil ditambahkan.', 'success');
    } catch {
      toastStore.showToast('Gagal menyimpan kategori.', 'error');
    }
  }

  async function handleDeleteCategory(catToDelete: string) {
    if (catToDelete.toLowerCase() === 'umum') {
      toastStore.showToast(
        'Kategori "Umum" adalah kategori khusus yang wajib ada dan tidak dapat dihapus.',
        'warning'
      );
      return;
    }

    try {
      await micrositeService.deleteCategory(catToDelete, getActor());
      await loadCategories();
      await loadMicrosites();
      toastStore.showToast(`Kategori "${catToDelete}" berhasil dihapus dan portal dialihkan ke "Umum".`, 'success');
    } catch (e: any) {
      toastStore.showToast(e.message || 'Gagal menghapus kategori.', 'error');
    }
  }

  async function loadMicrosites() {
    loading = true;
    try {
      const data = await micrositeService.getMicrosites();
      microsites = data;
    } catch {
      toastStore.showToast('Gagal memuat microsite', 'error');
    } finally {
      loading = false;
    }
  }

  function handleOpenEdit(m: MicrositeEntity) {
    handleOpenStudio(m);
  }

  async function handleToggleStatus(m: MicrositeEntity) {
    const nextStatus: ContentStatus = m.status === 'published' ? 'draft' : 'published';
    try {
      await micrositeService.updateMicrosite(
        m.id,
        { status: nextStatus },
        {
          id: authStore.user?.uid || 'usr-anon',
          email: authStore.user?.email || 'anon@puskesmas.go.id',
          name: authStore.user?.displayName || 'Admin',
        }
      );
      toastStore.showToast(
        `Status "${m.name}" diubah ke ${nextStatus === 'published' ? 'Dipublikasikan' : 'Draft'}.`,
        'success'
      );
      loadMicrosites();
    } catch {
      toastStore.showToast('Gagal merubah status microsite.', 'error');
    }
  }

  async function handleDelete(m: MicrositeEntity) {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus microsite "${m.name}"? Tindakan ini tidak dapat dibatalkan.`))
      return;
    try {
      await micrositeService.deleteMicrosite(m.id, {
        id: authStore.user?.uid || 'usr-anon',
        email: authStore.user?.email || 'anon@puskesmas.go.id',
        name: authStore.user?.displayName || 'Admin',
      });
      toastStore.showToast(`Microsite "${m.name}" berhasil dihapus.`, 'success');
      loadMicrosites();
    } catch {
      toastStore.showToast('Gagal menghapus microsite', 'error');
    }
  }

  function handleOpenQR(m: MicrositeEntity) {
    qrMicrosite = m;
    qrModalOpen = true;
    copiedUrl = false;
  }

  function handleCopyQRUrl() {
    if (!qrMicrosite) return;
    const url = `${window.location.origin}/m/${qrMicrosite.slug}`;
    navigator.clipboard.writeText(url);
    copiedUrl = true;
    toastStore.showToast('Tautan microsite berhasil disalin ke clipboard.', 'success');
    setTimeout(() => (copiedUrl = false), 2000);
  }

  function handleDownloadQR() {
    if (!qrMicrosite) return;
    const qrUrl = micrositeService.generateQRCodeURL(qrMicrosite.slug);
    const a = document.createElement('a');
    a.href = qrUrl;
    a.target = '_blank';
    a.download = `QR_Code_Microsite_${qrMicrosite.slug}.png`;
    a.click();
  }

  function openPublicMicrosite() {
    if (!qrMicrosite) return;
    window.open(`/m/${qrMicrosite.slug}`, '_blank');
  }

  function handlePrintQR() {
    const printWindow = window.open('', '_blank');
    if (!printWindow || !qrMicrosite) return;
    const qrUrl = micrositeService.generateQRCodeURL(qrMicrosite.slug);
    const targetUrl = `${window.location.origin}/m/${qrMicrosite.slug}`;

    printWindow.document.write(`
      <html>
        <head>
          <title>Cetak QR Code - ${qrMicrosite.name}</title>
          <style>
            body { font-family: sans-serif; text-align: center; padding: 40px; background: white; color: black; }
            .card { border: 2px solid #ccc; border-radius: 16px; padding: 30px; display: inline-block; max-width: 400px; }
            img { width: 250px; height: 250px; margin: 20px 0; }
            h2 { margin: 10px 0; font-weight: normal; }
            p { font-size: 14px; color: #555; margin: 5px 0; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="card">
            <h2>${qrMicrosite.name}</h2>
            <p>Pindai QR Code di bawah untuk mengakses informasi cepat:</p>
            <img src="${qrUrl}" alt="QR Code"/>
            <p style="font-weight: bold; color: #10b981;">${targetUrl}</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  function handleOpenStudio(m?: MicrositeEntity) {
    if (m) {
      studioMicrosite = m;
    } else {
      const newBlank: MicrositeEntity = {
        id: 'new',
        name: 'Portal Layanan Baru',
        slug: 'layanan-' + Math.random().toString(36).substring(2, 6),
        description: 'Pusat informasi dan kontak resmi Puskesmas Manding',
        category: category || 'Umum',
        status: 'published',
        active: true,
        passwordProtected: false,
        views: 0,
        clicks: 0,
        links: [],
        blocks: [],
        groups: [],
        themeCustomization: {
          theme: 'emerald',
          template: 'modern_majestic',
          backgroundAnimation: 'aurora_flow',
          buttonStyle: 'rounded',
          accentColor: '#10b981',
        },
        createdBy: {
          id: authStore.user?.uid || 'admin',
          name: authStore.user?.displayName || 'Administrator',
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      studioMicrosite = newBlank;
    }
    studioOpen = true;
  }

  async function handleStudioSave(data: Partial<MicrositeEntity>) {
    if (!studioMicrosite) return;
    const actor = getActor();

    let savedResult: MicrositeEntity | undefined;
    if (studioMicrosite.id && studioMicrosite.id !== 'new') {
      savedResult = await micrositeService.updateMicrosite(studioMicrosite.id, data, actor);
    } else {
      savedResult = await micrositeService.createMicrosite(data as any, actor);
    }

    if (savedResult) {
      studioMicrosite = savedResult;
    }

    await loadMicrosites();
    // Tetap berada di Studio Visual Editor agar pengguna dapat terus mengatur elemen lain
  }

  async function handleDuplicate(m: MicrositeEntity) {
    try {
      const duplicated = await micrositeService.duplicateMicrosite(m.id, getActor());
      if (duplicated) {
        toastStore.showToast(`Microsite berhasil diduplikasi menjadi "${duplicated.name}"!`, 'success');
        loadMicrosites();
      }
    } catch (err: any) {
      toastStore.showToast(err.message || 'Gagal menduplikasi microsite', 'error');
    }
  }

  async function handleStudioDuplicate(id: string) {
    const target =
      microsites.find((m) => m.id === id) || (studioMicrosite?.id === id ? studioMicrosite : null);
    if (target) await handleDuplicate(target);
  }

  function handleExportJSON(m: MicrositeEntity) {
    const jsonStr = micrositeService.exportMicrositeToJSON(m);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `microsite-${m.slug}-backup.json`;
    a.click();
    URL.revokeObjectURL(url);
    toastStore.showToast('Konfigurasi microsite berhasil diekspor!', 'success');
  }

  function handleImportJSONClick() {
    fileInputRef?.click();
  }

  async function handleImportJSONFile(e: Event & { currentTarget: HTMLInputElement }) {
    const file = e.currentTarget.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const imported = await micrositeService.importMicrositeFromJSON(text, getActor());
      if (imported) {
        toastStore.showToast(`Microsite "${imported.name}" berhasil diimpor!`, 'success');
        loadMicrosites();
      } else {
        toastStore.showToast('Gagal memproses berkas konfigurasi JSON.', 'error');
      }
    } catch (err: any) {
      toastStore.showToast('Format berkas tidak valid.', 'error');
    }
    e.currentTarget.value = '';
  }

  async function handleOpenAnalytics(m: MicrositeEntity) {
    selectedAnalyticsMicrosite = m;
    analyticsModalOpen = true;
    detailedAnalytics = null;
    try {
      const summary = micrositeService.getAnalyticsSummary(m.id);
      const detailed = micrositeService.getDetailedAnalytics(m.id);
      detailedAnalytics = {
        views: summary.views,
        clicks: summary.clicks,
        ctr: summary.ctr,
        deviceBreakdown: {
          mobile: detailed.deviceBreakdown.mobile,
          desktop: detailed.deviceBreakdown.desktop,
          tablet: detailed.deviceBreakdown.tablet,
        },
      };
    } catch {
      detailedAnalytics = {
        views: m.views || 0,
        clicks: m.clicks || 0,
        ctr: m.views ? (((m.clicks || 0) / m.views) * 100).toFixed(1) + '%' : '0.0%',
      };
    }
  }

  function shareToWhatsApp(m: MicrositeEntity) {
    openWhatsAppShare({
      title: m.name,
      description: m.description,
      imageUrl: m.ogImageUrl || m.profileImageUrl || m.logoUrl,
      targetPath: `/m/${m.slug}`,
    });
  }

  function copySmartLink(m: MicrositeEntity) {
    const smartUrl = generateSmartShareUrl({
      title: m.name,
      description: m.description,
      imageUrl: m.ogImageUrl || m.profileImageUrl || m.logoUrl,
      targetPath: `/m/${m.slug}`,
    });
    navigator.clipboard.writeText(smartUrl);
    toastStore.showToast('Smart Link WhatsApp berhasil disalin!', 'success');
  }

  const analyticsBlockItems = $derived<any[]>(
    selectedAnalyticsMicrosite && detailedAnalytics
      ? selectedAnalyticsMicrosite.blocks && selectedAnalyticsMicrosite.blocks.length > 0
        ? selectedAnalyticsMicrosite.blocks
        : selectedAnalyticsMicrosite.links
      : []
  );

  onMount(() => {
    loadMicrosites();
    loadCategories();
  });
</script>

<div class="space-y-6">
  <!-- Header section -->
  <div
    class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-5"
  >
    <div>
      <div class="flex items-center gap-2">
        <Globe class="w-5 h-5 text-[var(--color-primary)] animate-pulse" />
        <span class="text-xs font-bold uppercase tracking-widest text-[var(--color-primary)]"
          >Materi & Publikasi</span
        >
      </div>
      <h1 class="text-2xl font-light text-[var(--color-text)] tracking-tight">Microsite</h1>
      <p class="text-xs text-[var(--color-muted-foreground)] mt-1">
        Buat halaman praktis (link-in-bio) dengan QR Code dinamis untuk mempercepat distribusi info
        posyandu, PIN polio, dan layanan.
      </p>
    </div>
    <div class="flex items-center gap-2 flex-wrap">
      <input
        type="file"
        bind:this={fileInputRef}
        onchange={handleImportJSONFile}
        accept=".json,application/json"
        class="hidden"
      />
      <Button onclick={handleImportJSONClick} variant="outline" class="flex items-center gap-1.5 text-xs">
        <UploadCloud class="w-4 h-4 text-emerald-400" />
        <span>Impor JSON</span>
      </Button>
      <Button onclick={() => (categoryModalOpen = true)} variant="outline" class="flex items-center gap-1.5 text-xs">
        <Folder class="w-4 h-4 text-[var(--color-primary)]" />
        <span>Kelola Kategori</span>
      </Button>
      <Button
        onclick={() => handleOpenStudio()}
        variant="primary"
        class="flex items-center gap-1.5 text-xs bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md"
      >
        <Plus class="w-4 h-4" />
        <span>Buat Microsite (Studio)</span>
      </Button>
    </div>
  </div>

  <!-- Search controls -->
  <div class="relative max-w-md">
    <Search class="w-4 h-4 text-[var(--color-muted-foreground)] absolute left-4 top-1/2 -translate-y-1/2" />
    <input
      type="text"
      bind:value={searchQuery}
      placeholder="Cari berdasarkan nama atau slug..."
      class="w-full bg-[var(--color-card)] border border-[var(--color-border)] focus:border-[var(--color-primary)]/70 focus:outline-none rounded-2xl pl-11 pr-4 py-3 text-xs text-[var(--color-text)] placeholder-zinc-500"
    />
  </div>

  <!-- List of Microsites -->
  {#if loading}
    <div class="p-12 text-center text-[var(--color-muted-foreground)] font-mono text-xs">
      Memuat daftar microsite...
    </div>
  {:else if filteredMicrosites.length === 0}
    <div
      class="bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl p-12 text-center text-[var(--color-muted-foreground)] space-y-3"
    >
      <Globe class="w-12 h-12 text-zinc-600 mx-auto" />
      <p class="text-sm font-semibold text-[var(--color-text)]">Belum ada Microsite</p>
      <p class="text-xs text-[var(--color-muted-foreground)] max-w-sm mx-auto">
        Mulailah dengan membuat microsite baru untuk kebutuhan Pekan Imunisasi, Layanan Ramah Anak,
        atau Program Promkes.
      </p>
    </div>
  {:else}
    <div class="space-y-8">
      {#each categories as catObj (catObj.name)}
        {@const catName = catObj.name}
        {@const catDesc = catObj.description}
        {@const items = filteredMicrosites.filter(
          (m) =>
            (m.category || 'Umum').toLowerCase() === catName.toLowerCase() ||
            (catName.toLowerCase() === 'umum' && !m.category)
        )}
        {#if items.length > 0 || !searchQuery}
          <div
            class="space-y-4 bg-[var(--color-card)]/40 border border-[var(--color-border)] p-6 rounded-3xl"
          >
            <div class="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <div class="flex items-center gap-2.5">
                <div
                  class="w-8 h-8 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center"
                >
                  <Folder class="w-4 h-4" />
                </div>
                <div>
                  <h2 class="text-sm font-bold text-[var(--color-text)]">{catName}</h2>
                  <p class="text-[11px] text-[var(--color-muted-foreground)]">{catDesc}</p>
                </div>
              </div>
              <span
                class="text-xs font-mono px-3 py-1 rounded-full bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-muted-foreground)] font-bold"
              >
                {items.length} Portal
              </span>
            </div>

            {#if items.length === 0}
              <div class="py-6 text-center text-xs text-[var(--color-muted-foreground)] italic">
                Belum ada microsite dalam kategori ini.
              </div>
            {:else}
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {#each items as m (m.id)}
                  <Card
                    class="p-5 border border-[var(--color-border)] bg-[var(--color-card)] hover:border-[var(--color-primary)]/30 transition flex flex-col justify-between space-y-4"
                  >
                    <div class="space-y-2">
                      <div class="flex items-start justify-between">
                        <div>
                          <h3
                            class="font-bold text-[var(--color-text)] text-base leading-snug line-clamp-1"
                          >
                            {m.name}
                          </h3>
                          <p class="text-[11px] text-[var(--color-muted-foreground)] font-mono mt-0.5">
                            /m/{m.slug}
                          </p>
                        </div>
                        <div class="flex gap-1">
                          {#if m.passwordProtected}
                            <Badge variant="rose" size="sm">
                              <span class="flex items-center gap-1"><Lock class="w-3 h-3" /> Sandi</span>
                            </Badge>
                          {:else}
                            <Badge variant="emerald" size="sm">
                              <span class="flex items-center gap-1"><Unlock class="w-3 h-3" /> Publik</span>
                            </Badge>
                          {/if}
                        </div>
                      </div>

                      <p class="text-xs text-[var(--color-muted-foreground)] line-clamp-2 leading-relaxed h-10">
                        {m.description || 'Tidak ada deskripsi portal.'}
                      </p>

                      <div class="flex items-center gap-1.5 pt-2 flex-wrap">
                        <span class="text-[10px] text-[var(--color-muted-foreground)] font-mono">Status:</span>
                        <Badge variant={m.status === 'published' ? 'emerald' : 'zinc'} size="sm">
                          {m.status === 'published' ? 'Published' : m.status === 'draft' ? 'Draft' : 'Arsip'}
                        </Badge>
                        <Badge variant={m.active ? 'emerald' : 'rose'} size="sm">
                          {m.active ? 'Aktif' : 'Nonaktif'}
                        </Badge>
                        <span
                          class="text-[10px] font-mono text-[var(--color-muted-foreground)] ml-auto flex items-center gap-2"
                        >
                          <span class="flex items-center gap-0.5 text-sky-400">
                            <Eye class="w-3 h-3" /> {m.views || 0}
                          </span>
                          <span class="flex items-center gap-0.5 text-[var(--color-primary)]">
                            <MousePointerClick class="w-3 h-3" /> {m.clicks || 0}
                          </span>
                        </span>
                      </div>
                    </div>

                    <div class="border-t border-[var(--color-border)]/60 pt-3 flex items-center justify-between gap-2">
                      <div class="text-[10px] text-[var(--color-muted-foreground)] font-mono">
                        Update:
                        {new Date(m.updatedAt).toLocaleDateString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                        })}
                      </div>

                      <!-- Operational actions -->
                      <div class="flex items-center gap-1 flex-wrap justify-end">
                        <button
                          onclick={() => handleOpenStudio(m)}
                          class="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600/20 to-teal-600/20 border border-emerald-500/40 hover:border-emerald-400 text-emerald-400 text-[11px] font-bold flex items-center gap-1 transition shadow-sm"
                          title="Buka Studio Builder Visual"
                        >
                          <Sparkles class="w-3.5 h-3.5 text-amber-400" />
                          <span>Studio</span>
                        </button>
                        <button
                          onclick={() => handleOpenAnalytics(m)}
                          class="p-1.5 rounded-xl bg-[var(--color-surface)] hover:bg-zinc-700 text-sky-400 transition"
                          title="Statistik & Analitik Lengkap"
                        >
                          <PieChart class="w-3.5 h-3.5" />
                        </button>
                        <button
                          onclick={() => handleDuplicate(m)}
                          class="p-1.5 rounded-xl bg-[var(--color-surface)] hover:bg-zinc-700 text-amber-400 transition"
                          title="Duplikasi Microsite"
                        >
                          <CopyPlus class="w-3.5 h-3.5" />
                        </button>
                        <button
                          onclick={() => handleExportJSON(m)}
                          class="p-1.5 rounded-xl bg-[var(--color-surface)] hover:bg-zinc-700 text-indigo-400 transition"
                          title="Ekspor JSON Konfigurasi"
                        >
                          <DownloadCloud class="w-3.5 h-3.5" />
                        </button>
                        <button
                          onclick={() => window.open(`/m/${m.slug}`, '_blank')}
                          class="p-1.5 rounded-xl bg-[var(--color-surface)] hover:bg-zinc-700 text-[var(--color-text)] transition"
                          title="Buka Link Publik"
                        >
                          <Eye class="w-3.5 h-3.5" />
                        </button>
                        <button
                          onclick={() => handleOpenQR(m)}
                          class="p-1.5 rounded-xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 hover:bg-[var(--color-primary)]/20 text-[var(--color-primary)] transition"
                          title="Tampilkan QR Code & Opsi Bagikan"
                        >
                          <QrCode class="w-3.5 h-3.5" />
                        </button>
                        <button
                          onclick={() => shareToWhatsApp(m)}
                          class="p-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-400 transition"
                          title="Bagikan ke WhatsApp (Pratinjau Dinamis)"
                        >
                          <MessageCircle class="w-3.5 h-3.5" />
                        </button>
                        <button
                          onclick={() => handleToggleStatus(m)}
                          class={`p-1.5 rounded-xl transition ${
                            m.status === 'published'
                              ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                              : 'bg-[var(--color-surface)] text-[var(--color-muted-foreground)]'
                          }`}
                          title={m.status === 'published' ? 'Tarik dari Publik' : 'Terbitkan ke Publik'}
                        >
                          <CheckCircle class="w-3.5 h-3.5" />
                        </button>
                        <button
                          onclick={() => handleDelete(m)}
                          class="p-1.5 rounded-xl bg-rose-500/10 border border-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition"
                          title="Hapus Portal"
                        >
                          <Trash2 class="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </Card>
                {/each}
              </div>
            {/if}
          </div>
        {/if}
      {/each}
    </div>
  {/if}

  <!-- QR Code & Information Share Modal -->
  <Modal
    isOpen={qrModalOpen}
    onClose={() => (qrModalOpen = false)}
    title="QR Code & Bagikan Portal"
    size="md"
  >
    {#if qrMicrosite}
      <div class="text-center space-y-6 py-4">
        <div
          class="bg-white p-6 rounded-3xl inline-block shadow-2xl border border-[var(--color-border)]"
        >
          <img
            src={micrositeService.generateQRCodeURL(qrMicrosite.slug)}
            alt={`QR Code ${qrMicrosite.name}`}
            class="w-56 h-56 mx-auto bg-white"
          />
          <div class="mt-4 text-center">
            <span class="text-[var(--color-primary-foreground)] font-bold text-sm tracking-wide block"
              >{qrMicrosite.name}</span
            >
            <span class="text-[var(--color-muted-foreground)] text-[10px] block mt-1 font-mono"
              >/m/{qrMicrosite.slug}</span
            >
          </div>
        </div>

        <div class="space-y-3 max-w-sm mx-auto">
          <div class="flex bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl items-center p-2.5">
            <span
              class="text-[var(--color-muted-foreground)] text-[10px] font-mono px-2 truncate flex-1 select-all"
            >
              {`${window.location.origin}/m/${qrMicrosite.slug}`}
            </span>
            <button
              onclick={handleCopyQRUrl}
              class="p-2 rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary)] transition"
              title="Salin Tautan"
            >
              {#if copiedUrl}<Check class="w-3.5 h-3.5" />{:else}<Copy class="w-3.5 h-3.5" />{/if}
            </button>
          </div>

          <div class="grid grid-cols-3 gap-2">
            <button
              onclick={handleDownloadQR}
              class="py-3 px-2 rounded-2xl bg-[var(--color-surface)] hover:bg-zinc-700 text-[var(--color-text)] hover:text-[var(--color-text)] transition flex flex-col items-center justify-center gap-1.5 text-[10px] font-bold"
            >
              <Download class="w-4 h-4 text-[var(--color-primary)]" />
              <span>Unduh PNG</span>
            </button>
            <button
              onclick={handlePrintQR}
              class="py-3 px-2 rounded-2xl bg-[var(--color-surface)] hover:bg-zinc-700 text-[var(--color-text)] hover:text-[var(--color-text)] transition flex flex-col items-center justify-center gap-1.5 text-[10px] font-bold"
            >
              <Printer class="w-4 h-4 text-[var(--color-primary)]" />
              <span>Cetak Brosur</span>
            </button>
            <button
              onclick={openPublicMicrosite}
              class="py-3 px-2 rounded-2xl bg-[var(--color-surface)] hover:bg-zinc-700 text-[var(--color-text)] hover:text-[var(--color-text)] transition flex flex-col items-center justify-center gap-1.5 text-[10px] font-bold"
            >
              <ExternalLink class="w-4 h-4 text-[var(--color-primary)]" />
              <span>Buka Link</span>
            </button>
          </div>

          <!-- Smart WhatsApp Share Card -->
          <div class="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl space-y-2 text-left">
            <div class="flex justify-between items-center">
              <span class="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <MessageCircle class="w-3.5 h-3.5" />
                <span>Link Khusus WhatsApp (Bypass Cache)</span>
              </span>
              <span
                class="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold uppercase"
              >
                Pratinjau Dinamis
              </span>
            </div>
            <p class="text-[10px] text-[var(--color-muted-foreground)] leading-relaxed">
              Gunakan tautan ini agar WhatsApp langsung menampilkan nama, foto, dan deskripsi microsite
              ini tanpa tertahan cache lama.
            </p>
            <div class="flex gap-2 pt-1">
              <button
                onclick={() => shareToWhatsApp(qrMicrosite!)}
                class="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-sm"
              >
                <Send class="w-3.5 h-3.5" />
                <span>Bagikan ke WhatsApp</span>
              </button>
              <button
                onclick={() => copySmartLink(qrMicrosite!)}
                class="py-2 px-3 rounded-xl bg-[var(--color-surface)] hover:bg-zinc-700 text-[var(--color-text)] border border-[var(--color-border)] font-bold text-xs flex items-center gap-1.5 transition"
                title="Salin Smart Link"
              >
                <Copy class="w-3.5 h-3.5" />
                <span>Salin</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    {/if}

    {#snippet footer()}
      <div class="flex justify-between items-center gap-2 w-full">
        <div class="text-[10px] text-[var(--color-muted-foreground)] font-mono">
          QR dinamis tidak akan berubah jika isi portal diubah.
        </div>
        <Button onclick={() => (qrModalOpen = false)} variant="secondary">Selesai</Button>
      </div>
    {/snippet}
  </Modal>

  <!-- Category Management Modal -->
  <Modal
    isOpen={categoryModalOpen}
    onClose={() => (categoryModalOpen = false)}
    title="Pengaturan Kategori Microsite"
    size="md"
  >
    <div class="space-y-6 py-2">
      <div class="space-y-3 bg-[var(--color-bg)] p-4 rounded-2xl border border-[var(--color-border)]">
        <label class="text-xs font-bold text-[var(--color-text)]">Tambah Kategori Baru</label>
        <div class="space-y-2.5">
          <input
            type="text"
            bind:value={newCategoryName}
            placeholder="Nama Kategori (Contoh: Layanan Darurat)..."
            class="w-full bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl px-3.5 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
          />
          <input
            type="text"
            bind:value={newCategoryDescription}
            placeholder="Keterangan singkat kategori..."
            class="w-full bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl px-3.5 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
          />
          <Button onclick={handleAddCategory} variant="primary" class="text-xs w-full"
            >Tambah Kategori</Button
          >
        </div>
      </div>

      <div class="space-y-3">
        <label class="text-xs font-bold text-[var(--color-text)]">Daftar Kategori Aktif</label>
        <div class="space-y-2.5 max-h-60 overflow-y-auto pr-1">
          {#each categories as cat (cat.name)}
            <div
              class="flex items-start justify-between p-3.5 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] gap-3"
            >
              <div class="space-y-1 flex-1">
                <div class="flex items-center gap-2">
                  <Tag class="w-3.5 h-3.5 text-[var(--color-primary)] shrink-0" />
                  <span class="text-xs font-bold text-[var(--color-text)]">{cat.name}</span>
                  {#if cat.name.toLowerCase() === 'umum'}
                    <span
                      class="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-bold"
                      >Wajib</span
                    >
                  {/if}
                </div>
                <p class="text-[11px] text-[var(--color-muted-foreground)] leading-relaxed">
                  {cat.description}
                </p>
              </div>
              {#if cat.name.toLowerCase() !== 'umum'}
                <button
                  type="button"
                  onclick={() => handleDeleteCategory(cat.name)}
                  class="p-2 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition shrink-0"
                  title="Hapus Kategori (Portal dialihkan ke Umum)"
                >
                  <Trash2 class="w-3.5 h-3.5" />
                </button>
              {:else}
                <span class="text-[10px] text-[var(--color-muted-foreground)] italic shrink-0 pt-1"
                  >Tidak dapat dihapus</span
                >
              {/if}
            </div>
          {/each}
        </div>
      </div>
    </div>

    {#snippet footer()}
      <Button onclick={() => (categoryModalOpen = false)} variant="primary" class="text-xs">Tutup</Button>
    {/snippet}
  </Modal>

  <!-- Detailed Analytics Modal -->
  <Modal
    isOpen={analyticsModalOpen}
    onClose={() => (analyticsModalOpen = false)}
    title={`Statistik & Analitik: ${selectedAnalyticsMicrosite?.name || ''}`}
    size="lg"
  >
    {#if selectedAnalyticsMicrosite && detailedAnalytics}
      <div class="space-y-6 py-2">
        <!-- Summary Metrics -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div class="p-4 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] space-y-1">
            <div class="flex items-center gap-1.5 text-sky-400 text-xs font-semibold">
              <Eye class="w-4 h-4" />
              <span>Total Kunjungan</span>
            </div>
            <p class="text-2xl font-bold font-mono text-[var(--color-text)]">
              {detailedAnalytics.views}
            </p>
            <p class="text-[10px] text-[var(--color-muted-foreground)]">Page views tercatat</p>
          </div>

          <div class="p-4 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] space-y-1">
            <div class="flex items-center gap-1.5 text-[var(--color-primary)] text-xs font-semibold">
              <MousePointerClick class="w-4 h-4" />
              <span>Total Klik Interaksi</span>
            </div>
            <p class="text-2xl font-bold font-mono text-[var(--color-text)]">
              {detailedAnalytics.clicks}
            </p>
            <p class="text-[10px] text-[var(--color-muted-foreground)]">Klik tautan & tombol</p>
          </div>

          <div class="p-4 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] space-y-1">
            <div class="flex items-center gap-1.5 text-amber-400 text-xs font-semibold">
              <TrendingUp class="w-4 h-4" />
              <span>Click-Through Rate</span>
            </div>
            <p class="text-2xl font-bold font-mono text-[var(--color-text)]">
              {detailedAnalytics.ctr}
            </p>
            <p class="text-[10px] text-[var(--color-muted-foreground)]">Efektivitas interaksi</p>
          </div>
        </div>

        <!-- Breakdown Devices -->
        {#if detailedAnalytics.deviceBreakdown && Object.keys(detailedAnalytics.deviceBreakdown).length > 0}
          <div class="p-4 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] space-y-3">
            <h4 class="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider">
              Distribusi Perangkat Pengunjung
            </h4>
            <div class="grid grid-cols-3 gap-3 text-center">
              {#each Object.entries(detailedAnalytics.deviceBreakdown) as [dev, count] (dev)}
                <div class="p-3 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)]">
                  <span class="text-[10px] uppercase font-bold text-[var(--color-muted-foreground)] block">
                    {dev}
                  </span>
                  <span class="text-lg font-bold font-mono text-[var(--color-text)]">{count}</span>
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Block / Link Performance -->
        <div class="p-4 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] space-y-3">
          <h4 class="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider">
            Performa Blok & Tautan Aktif
          </h4>
          <div class="space-y-2 max-h-56 overflow-y-auto">
            {#each analyticsBlockItems as item, idx (item.id || idx)}
              {@const title = item.title || item.label || 'Tautan'}
              {@const clicks = item.clicks || detailedAnalytics.blockClicks?.[item.id] || 0}
              <div
                class="flex items-center justify-between p-3 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] text-xs"
              >
                <div class="flex items-center gap-2 min-w-0">
                  <span class="font-mono text-[10px] text-[var(--color-muted-foreground)]">
                    #{idx + 1}
                  </span>
                  <span class="font-semibold text-[var(--color-text)] truncate">{title}</span>
                  <span class="text-[10px] text-[var(--color-muted-foreground)] truncate hidden sm:inline">
                    {item.url}
                  </span>
                </div>
                <span class="font-mono font-bold text-[var(--color-primary)] shrink-0 ml-3">
                  {clicks} klik
                </span>
              </div>
            {/each}
          </div>
        </div>
      </div>
    {/if}

    {#snippet footer()}
      <Button onclick={() => (analyticsModalOpen = false)} variant="primary" class="text-xs">
        Tutup
      </Button>
    {/snippet}
  </Modal>

  <!-- Full-Screen Visual Studio Builder -->
  {#if studioOpen && studioMicrosite}
    <MicrositeStudioEditor
      microsite={studioMicrosite}
      categories={categories}
      onSave={handleStudioSave}
      onClose={() => (studioOpen = false)}
      onDuplicate={handleStudioDuplicate}
    />
  {/if}
</div>
