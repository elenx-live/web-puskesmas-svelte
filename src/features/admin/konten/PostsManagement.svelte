<!-- @component Manajemen berita & artikel: editor, upload gambar, AI Image Studio, impor Web/Medsos, dan hapus. -->
<script lang="ts">
  import Card from '../../../shared/ui/Card.svelte';
  import Button from '../../../shared/ui/Button.svelte';
  import Input from '../../../shared/ui/Input.svelte';
  import Select from '../../../shared/ui/Select.svelte';
  import Badge from '../../../shared/ui/Badge.svelte';
  import Modal from '../../../shared/ui/Modal.svelte';
  import ConfirmModal from '../../../shared/components/ConfirmModal.svelte';
  import AIProviderSettingsModal from '../../../shared/components/admin/AIProviderSettingsModal.svelte';
  import { authStore } from '../../../shared/stores/auth.svelte.js';
  import { toastStore } from '../../../shared/stores/toast.svelte.js';
  import { errorMessage } from '../../../shared/lib/logger.js';
  import { debounce } from '../../../shared/utils/debounce.js';
  import { postService } from '../../../shared/services/postService.js';
  import { categoryService } from '../../../shared/services/categoryService.js';
  import { tagService } from '../../../shared/services/tagService.js';
  import { aiProviderService } from '../../../shared/services/aiProviderService.js';
  import type { PostEntity, CategoryEntity, TagEntity, ContentStatus, AIProviderConfig } from '../../../shared/types/index.js';
  import {
    Plus,
    Search,
    Edit,
    Trash2,
    Save,
    DownloadCloud,
    ShieldCheck,
    AlertCircle,
    Sparkles,
    Settings2,
    Cpu,
    ExternalLink,
    Upload,
    ImageIcon,
    Wand2,
    RefreshCw,
    CheckCircle2,
    Check,
    X,
    Info,
    Copy,
    ChevronDown,
    ChevronUp
  } from 'lucide-svelte';

  const showToast = toastStore.showToast.bind(toastStore);

  const AI_IMAGE_PRESETS = [
    { id: 'posyandu', label: '👶 Posyandu Balita & Timbang', prompt: 'Foto pelayanan posyandu balita dan penimbangan berat badan di posyandu puskesmas, ramah dan bersih' },
    { id: 'vaksin', label: '💉 Imunisasi & Vaksinasi Anak', prompt: 'Foto tenaga medis perawat memberikan vaksinasi dan imunisasi anak balita dengan lembut dan profesional' },
    { id: 'dokter', label: '👩‍⚕️ Konsultasi & Periksa Dokter', prompt: 'Foto dokter puskesmas ramah sedang memeriksa pasien di ruang konsultasi poliklinik bersih' },
    { id: 'gizi', label: '🥗 Konseling Gizi & Cegah Stunting', prompt: 'Foto edukasi gizi seimbang dan pencegahan stunting pada ibu hamil dan balita' },
    { id: 'lansia', label: '👴 Posbindu & Skrining Lansia', prompt: 'Foto skrining kesehatan posbindu lansia, pemeriksaan tekanan darah dan gula darah' },
    { id: 'darurat', label: '🚑 UGD & Siaga Ambulans', prompt: 'Foto unit gawat darurat UGD puskesmas dan ambulans siaga 24 jam' },
    { id: 'farmasi', label: '💊 Farmasi & Pelayanan Obat', prompt: 'Foto apoteker di ruang farmasi puskesmas melayani resep obat dengan ramah' },
    { id: 'lab', label: '🔬 Laboratorium Medis', prompt: 'Foto analis kesehatan di laboratorium medis puskesmas dengan mikroskop dan peralatan steril' },
    { id: 'gigi', label: '🦷 Poli Kesehatan Gigi', prompt: 'Foto dokter gigi memeriksa kesehatan gigi pasien di dental unit modern' },
    { id: 'edukasi', label: '📢 Penyuluhan Masyarakat', prompt: 'Foto penyuluhan hidup bersih dan sehat PHBS bersama kader kesehatan masyarakat' }
  ];

  let posts = $state<PostEntity[]>([]);
  let categories = $state<CategoryEntity[]>([]);
  let tags = $state<TagEntity[]>([]);
  let loading = $state(true);

  let search = $state('');
  let selectedCat = $state('');
  let statusFilter = $state('');

  // Search di-debounce 300ms: cegah request jaringan per keystroke.
  // loadData membaca searchDebounced sehingga $effect hanya jalan setelah user berhenti mengetik.
  let searchDebounced = $state('');
  const applySearchDebounced = debounce((v: string) => {
    searchDebounced = v;
  }, 300);

  // Memoize opsi select: hindari alokasi array/objek baru tiap render
  // (keyed {#each} di Select tidak perlu diffing ulang).
  const categoryOptions = $derived(categories.map((c) => ({ value: c.id, label: c.name })));
  const statusOptions = [
    { value: 'draft', label: 'Draft (Internal)' },
    { value: 'published', label: 'Published (Tampil Publik)' }
  ];

  // Modal Create/Edit
  let isEditorOpen = $state(false);
  let editingPost = $state<Partial<PostEntity> | null>(null);
  let saving = $state(false);
  let tagInput = $state('');

  // Mutasi properti langsung (bukan spread-replace) agar Svelte hanya
  // menginvalidasi properti yang berubah — tidak re-render seluruh editor per keystroke.
  const patchEditingPost = (patch: Partial<PostEntity>) => {
    if (!editingPost) return;
    for (const k of Object.keys(patch) as (keyof PostEntity)[]) {
      (editingPost as Record<string, unknown>)[k] = patch[k];
    }
  };

  // Direct File Upload & AI Image Generation
  let fileInputEl = $state<HTMLInputElement | null>(null);
  let uploadingImage = $state(false);
  let isAiImageModalOpen = $state(false);
  let isAiSettingsModalOpen = $state(false);
  let aiSettingsModalTab = $state<'text' | 'image'>('text');
  let aiImagePrompt = $state('');
  let aiImageStyle = $state('fotorealistik');
  let aiImageGenerating = $state(false);
  let aiGeneratedPreview = $state<string | null>(null);
  let aiPreviewLoaded = $state(false);
  let aiPreviewFailed = $state(false);
  let aiGeneratedPromptUsed = $state('');
  let showPromptDetails = $state(false);
  let aiCapability = $state<{
    provider: string;
    providerName: string;
    model: string;
    hasKey: boolean;
    supportsNativeImage: boolean;
    nativeEngine?: string | null;
    capabilityType: 'native_image' | 'llm_text_only';
    explanation: string;
  } | null>(null);
  let aiGeneratedResult = $state<{
    providerUsed?: string;
    providerType?: string;
    isNativeImageAI?: boolean;
    supportMessage?: string;
    enhancedPrompt?: string;
    enhancedDescription?: string;
  } | null>(null);

  // Modal Import Web / Medsos (Copyright Compliant)
  let isImportModalOpen = $state(false);
  let importUrl = $state('');
  let importSourceName = $state('');
  let importRawText = $state('');
  let importCopyrightChecked = $state(false);
  let importing = $state(false);

  // AI Provider Configuration State
  let aiConfig = $state<AIProviderConfig | null>(null);

  const isSocialMediaUrl = $derived.by(() => {
    if (!importUrl) return false;
    const lower = importUrl.toLowerCase();
    return (
      lower.includes('instagram.com') ||
      lower.includes('facebook.com') ||
      lower.includes('tiktok.com') ||
      lower.includes('twitter.com') ||
      lower.includes('x.com') ||
      lower.includes('threads.net')
    );
  });

  // Delete
  let deleteModalOpen = $state(false);
  let postToDelete = $state<PostEntity | null>(null);

  async function loadAIConfig() {
    try {
      aiConfig = await aiProviderService.getConfig();
    } catch {
      // ignore
    }
  }

  $effect(() => {
    loadAIConfig();
  });

  async function loadData() {
    loading = true;
    try {
      const [postList, catList, tagList] = await Promise.all([
        postService.getPosts(selectedCat, undefined, searchDebounced, statusFilter),
        categoryService.getCategories('post'),
        tagService.getTags()
      ]);
      posts = postList;
      categories = catList;
      tags = tagList;
    } catch {
      showToast('Gagal memuat berita dan artikel', 'error');
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    applySearchDebounced(search);
    return () => applySearchDebounced.cancel();
  });

  $effect(() => {
    loadData();
  });

  function handleOpenCreate() {
    editingPost = {
      title: '',
      slug: '',
      excerpt: '',
      content: '',
      categoryId: categories[0]?.id || 'cat-berita',
      categoryName: categories[0]?.name || 'Berita & Kegiatan',
      tagIds: [],
      tagNames: [],
      status: 'draft',
      featuredImage: ''
    };
    tagInput = '';
    isEditorOpen = true;
  }

  function handleOpenEdit(post: PostEntity) {
    editingPost = { ...post };
    tagInput = (post.tagNames || []).join(', ');
    isEditorOpen = true;
  }

  async function handleAddTag() {
    if (!tagInput.trim()) return;
    try {
      const tag = await tagService.addOrGetTag(tagInput.trim());
      patchEditingPost({
        tagIds: [...(editingPost?.tagIds || []), tag.id],
        tagNames: [...(editingPost?.tagNames || []), tag.name]
      });
      tagInput = '';
    } catch (e: unknown) {
      showToast(errorMessage(e), 'error');
    }
  }

  async function handleSavePost(e: Event) {
    e.preventDefault();
    const user = authStore.user;
    if (!user || !editingPost) return;

    if (!editingPost.title?.trim() || !editingPost.content?.trim()) {
      showToast('Judul dan Konten Berita wajib diisi!', 'error');
      return;
    }

    saving = true;
    try {
      if (editingPost.id) {
        await postService.updatePost(editingPost.id, editingPost, {
          id: user.uid,
          email: user.email,
          name: user.displayName
        });
        showToast(`Berita "${editingPost.title}" berhasil diperbarui.`);
      } else {
        await postService.createPost(editingPost, {
          id: user.uid,
          email: user.email,
          name: user.displayName
        });
        showToast(`Berita "${editingPost.title}" berhasil dibuat.`);
      }

      isEditorOpen = false;
      editingPost = null;
      loadData();
    } catch (err: unknown) {
      showToast(errorMessage(err, 'Gagal menyimpan berita'), 'error');
    } finally {
      saving = false;
    }
  }

  // Handler for Direct File Upload to Server
  async function handleFileUpload(e: Event & { currentTarget: HTMLInputElement }) {
    const file = e.currentTarget.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Harap pilih berkas gambar yang valid (JPG, PNG, WebP, GIF)', 'error');
      if (fileInputEl) fileInputEl.value = '';
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      showToast('Ukuran berkas gambar melebihi batas 25MB', 'error');
      if (fileInputEl) fileInputEl.value = '';
      return;
    }

    uploadingImage = true;
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const rawBase64 = reader.result as string;

          // Client-side lightweight canvas optimization to ensure fast uploads & display
          let processedBase64 = rawBase64;
          try {
            const img = new Image();
            await new Promise((resolve, reject) => {
              img.onload = resolve;
              img.onerror = reject;
              img.src = rawBase64;
            });

            const maxDim = 1920;
            let width = img.width;
            let height = img.height;

            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }

              const canvas = document.createElement('canvas');
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(img, 0, 0, width, height);
                processedBase64 = canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.9);
              }
            }
          } catch (canvasErr) {
            console.warn('Canvas optimization skipped, using raw file:', canvasErr);
          }

          // Immediate local preview so the user instantly sees their photo
          patchEditingPost({ featuredImage: processedBase64 });

          // Upload to server
          const res = await fetch('/api/upload-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageBase64: processedBase64,
              fileName: file.name.replace(/\.[^/.]+$/, '')
            })
          });
          const data = await res.json();
          if (data.success && data.url) {
            patchEditingPost({ featuredImage: data.url });
            showToast('Foto berhasil diunggah langsung ke server dan siap digunakan!', 'success');
          } else {
            showToast('Foto dimuat secara lokal (Server: ' + (data.error || 'tersimpan') + ')', 'info');
          }
        } catch (err: unknown) {
          showToast('Foto dimuat secara lokal: ' + errorMessage(err), 'info');
        } finally {
          uploadingImage = false;
          if (fileInputEl) fileInputEl.value = '';
        }
      };
      reader.onerror = () => {
        uploadingImage = false;
        showToast('Gagal membaca berkas gambar dari perangkat', 'error');
        if (fileInputEl) fileInputEl.value = '';
      };
      reader.readAsDataURL(file);
    } catch (err: unknown) {
      uploadingImage = false;
      showToast('Terjadi kesalahan: ' + errorMessage(err), 'error');
      if (fileInputEl) fileInputEl.value = '';
    }
  }

  // Handler for AI Image Generation Modal
  async function handleOpenAiImageModal() {
    if (!aiImagePrompt && editingPost?.title) {
      aiImagePrompt = `Pelayanan kegiatan ${editingPost.title} di Puskesmas`;
    } else if (!aiImagePrompt) {
      aiImagePrompt = 'Pelayanan posyandu balita dan penimbangan berat badan oleh kader kesehatan puskesmas';
    }
    aiPreviewLoaded = false;
    aiPreviewFailed = false;
    isAiImageModalOpen = true;

    // Fetch capability of current AI provider
    try {
      aiCapability = await aiProviderService.getImageCapability();
    } catch {
      // fallback
    }
  }

  async function handleGenerateAiImage(customPrompt?: string) {
    const promptToUse =
      (customPrompt || aiImagePrompt || editingPost?.title || '').trim() ||
      'Foto pelayanan kesehatan Puskesmas ramah dan profesional';

    // Check if provider has active key or is supported
    if (aiCapability && (!aiCapability.hasKey || !aiCapability.supportsNativeImage)) {
      if (!aiCapability.hasKey) {
        showToast(
          `Provider Gambar ${aiCapability.providerName} belum memiliki Kunci API aktif. Silakan isi API Key di tab Provider Gambar.`,
          'error'
        );
        aiSettingsModalTab = 'image';
        isAiSettingsModalOpen = true;
        return;
      }
      if (!aiCapability.supportsNativeImage) {
        showToast(
          `Provider gambar (${aiCapability.providerName}) tidak mendukung generate visual. Harap pilih provider yang mendukung gambar (Pollinations Flux, Gemini, atau OpenAI).`,
          'error'
        );
        aiSettingsModalTab = 'image';
        isAiSettingsModalOpen = true;
        return;
      }
    }

    aiImageGenerating = true;
    aiPreviewLoaded = false;
    aiPreviewFailed = false;

    try {
      const data = await aiProviderService.generateImage({
        prompt: promptToUse,
        title: editingPost?.title,
        excerpt: editingPost?.excerpt,
        category: editingPost?.categoryName,
        style: aiImageStyle
      });
      if (data.success && data.url) {
        aiGeneratedPreview = data.url;
        aiGeneratedResult = {
          providerUsed: data.providerUsed,
          providerType: data.providerType,
          isNativeImageAI: data.isNativeImageAI,
          supportMessage: data.supportMessage,
          enhancedPrompt: data.enhancedPrompt,
          enhancedDescription: data.enhancedDescription
        };
        aiGeneratedPromptUsed = data.enhancedDescription || data.enhancedPrompt || promptToUse;
        showToast('Pratinjau gambar AI siap! Tinjau di bawah, lalu klik "Gunakan Gambar Ini" jika setuju.', 'success');
      } else {
        showToast('Gagal membuat gambar AI', 'error');
      }
    } catch (err: unknown) {
      const _e = err as { needsConfiguration?: unknown; message?: string };
      if (_e.needsConfiguration) {
        showToast(errorMessage(err), 'error');
        aiSettingsModalTab = 'image';
        isAiSettingsModalOpen = true;
      } else {
        showToast('Terjadi kesalahan generate gambar: ' + errorMessage(err), 'error');
      }
    } finally {
      aiImageGenerating = false;
    }
  }

  function handleApplyAiImage() {
    if (!aiGeneratedPreview) {
      showToast('Belum ada gambar AI yang di-generate.', 'error');
      return;
    }
    patchEditingPost({ featuredImage: aiGeneratedPreview });
    isAiImageModalOpen = false;
    showToast('Gambar AI berhasil disetujui dan diterapkan sebagai gambar sampul artikel!', 'success');
  }

  // Handler for Copyright-Compliant Web / Medsos Import with Multi-Provider AI
  async function handleImportSubmit(e: Event) {
    e.preventDefault();
    if (!importUrl.trim() && !importRawText.trim()) {
      showToast('Masukkan URL sumber atau cuplikan teks artikel/medsos yang ingin diimpor', 'error');
      return;
    }
    if (!importCopyrightChecked) {
      showToast('Anda wajib mencentang persetujuan kepatuhan hak cipta & atribusi sumber asli.', 'error');
      return;
    }

    importing = true;
    try {
      let sourceLabel = importSourceName.trim();
      if (!sourceLabel && importUrl.trim()) {
        try {
          sourceLabel = new URL(importUrl).hostname.replace('www.', '');
        } catch {
          sourceLabel = 'Sumber Eksternal';
        }
      }

      const data = await aiProviderService.importArticle({
        url: importUrl.trim(),
        sourceName: sourceLabel || 'Publik',
        rawText: importRawText.trim()
      });

      const newPost: Partial<PostEntity> = {
        title: data.title,
        slug: `impor-${Date.now()}`,
        excerpt: data.excerpt,
        content: data.content,
        categoryId: categories[0]?.id || 'cat-berita',
        categoryName: categories[0]?.name || 'Berita & Kegiatan',
        tagIds: [],
        tagNames: data.tags || ['ImporAI', (sourceLabel || 'Web').replace(/[^a-zA-Z0-9]/g, '')],
        status: 'draft',
        featuredImage: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&q=80&w=800'
      };

      const user = authStore.user;
      await postService.createPost(newPost, {
        id: user?.uid || 'system',
        email: user?.email || 'admin@puskesmas.id',
        name: user?.displayName || 'Admin Sistem'
      });

      showToast(`Berhasil mengimpor artikel via ${data.providerUsed || 'AI'}! Disimpan sebagai draft.`);
      isImportModalOpen = false;
      importUrl = '';
      importSourceName = '';
      importRawText = '';
      importCopyrightChecked = false;
      loadData();
    } catch (err: unknown) {
      showToast(errorMessage(err, 'Gagal mengimpor URL. Anda dapat mengganti provider atau memeriksa API Key.'), 'error');
    } finally {
      importing = false;
    }
  }

  async function handleDelete() {
    const user = authStore.user;
    if (!user || !postToDelete) return;
    saving = true;
    try {
      await postService.deletePost(postToDelete.id, {
        id: user.uid,
        email: user.email,
        name: user.displayName
      });
      showToast(`Berita "${postToDelete.title}" berhasil dihapus.`);
      deleteModalOpen = false;
      postToDelete = null;
      loadData();
    } catch (err: unknown) {
      showToast(errorMessage(err, 'Gagal menghapus berita'), 'error');
    } finally {
      saving = false;
    }
  }

  function handleImportUrlInput(value: string) {
    importUrl = value;
    if (!importSourceName) {
      const lower = value.toLowerCase();
      if (lower.includes('kemkes.go.id')) importSourceName = 'Kemenkes RI';
      else if (lower.includes('who.int')) importSourceName = 'WHO Indonesia';
      else if (lower.includes('detik.com')) importSourceName = 'Detik Health';
      else if (lower.includes('kompas.com')) importSourceName = 'Kompas Health';
      else if (lower.includes('instagram.com')) importSourceName = 'Instagram Resmi';
      else if (lower.includes('facebook.com')) importSourceName = 'Facebook Resmi';
    }
  }

  function copyPrompt() {
    navigator.clipboard.writeText(aiGeneratedResult?.enhancedPrompt || aiGeneratedPromptUsed);
    showToast('Deskripsi visual berhasil disalin', 'success');
  }
</script>

<!-- Header Search & Actions -->
<div class="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[var(--color-card)] border border-[var(--color-border)] p-4 rounded-3xl">
  <div class="flex items-center gap-3 w-full sm:w-auto flex-1">
    <div class="relative w-full max-w-xs">
      <Search class="w-4 h-4 text-[var(--color-muted-foreground)] absolute left-3 top-1/2 -translate-y-1/2" />
      <input
        type="text"
        placeholder="Cari berita & artikel..."
        bind:value={search}
        class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)]/70 focus:outline-none rounded-2xl pl-9 pr-4 py-2 text-xs text-[var(--color-text)] placeholder-zinc-600"
      />
    </div>

    <div class="w-44">
      <Select
        bind:value={selectedCat}
        options={[
          { value: '', label: 'Semua Kategori' },
          ...categories.map((c) => ({ value: c.id, label: c.name }))
        ]}
      />
    </div>

    <div class="w-36">
      <Select
        bind:value={statusFilter}
        options={[
          { value: '', label: 'Semua Status' },
          { value: 'published', label: 'Published' },
          { value: 'draft', label: 'Draft' }
        ]}
      />
    </div>
  </div>

  <div class="flex items-center gap-2 w-full sm:w-auto justify-end">
    {#if authStore.hasPermission('create_posts')}
      <Button onclick={() => (isImportModalOpen = true)} variant="secondary" class="gap-1.5 text-xs">
        <DownloadCloud class="w-4 h-4 text-[var(--color-primary)]" />
        Impor Web / Medsos
      </Button>
      <Button onclick={handleOpenCreate} variant="primary" class="gap-1.5 text-xs">
        <Plus class="w-4 h-4" />
        Tulis Berita
      </Button>
    {/if}
  </div>
</div>

<!-- Posts Table with Skeleton Loader -->
<Card class="p-0 overflow-hidden">
  <div class="overflow-x-auto">
    <table class="w-full text-xs text-left text-[var(--color-text)]">
      <thead class="bg-[var(--color-bg)] text-[10px] font-bold uppercase text-[var(--color-muted-foreground)] border-b border-[var(--color-border)]">
        <tr>
          <th class="p-4">Berita & Ringkasan</th>
          <th class="p-4">Kategori & Tag</th>
          <th class="p-4">Penulis</th>
          <th class="p-4">Status & Tanggal</th>
          <th class="p-4 text-right">Tindakan</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-[var(--color-border)]">
        {#if loading}
          {#each Array.from({ length: 4 }) as _, idx (idx)}
            <tr class="animate-pulse">
              <td class="p-4">
                <div class="flex items-center gap-3">
                  <div class="w-12 h-12 rounded-xl bg-[var(--color-border)]/50 shrink-0"></div>
                  <div class="space-y-2 w-64">
                    <div class="h-4 bg-[var(--color-border)]/50 rounded w-full"></div>
                    <div class="h-3 bg-[var(--color-border)]/30 rounded w-3/4"></div>
                  </div>
                </div>
              </td>
              <td class="p-4"><div class="h-5 w-20 bg-[var(--color-border)]/40 rounded"></div></td>
              <td class="p-4"><div class="h-4 w-24 bg-[var(--color-border)]/40 rounded"></div></td>
              <td class="p-4"><div class="h-5 w-16 bg-[var(--color-border)]/40 rounded"></div></td>
              <td class="p-4 text-right"><div class="h-6 w-16 bg-[var(--color-border)]/40 rounded ml-auto"></div></td>
            </tr>
          {/each}
        {:else if posts.length === 0}
          <tr>
            <td colspan={5} class="p-8 text-center text-[var(--color-muted-foreground)]">Belum ada berita ditemukan.</td>
          </tr>
        {:else}
          {#each posts as post (post.id)}
            <tr class="hover:bg-[var(--color-card)]/50 transition">
              <td class="p-4">
                <div class="flex items-start gap-3">
                  {#if post.featuredImage}
                    <img
                      src={post.featuredImage}
                      alt={post.title}
                      class="w-12 h-12 rounded-xl object-cover border border-[var(--color-border)] shrink-0"
                    />
                  {/if}
                  <div>
                    <div class="font-bold text-[var(--color-text)] text-sm line-clamp-1">{post.title}</div>
                    <div class="text-[11px] text-[var(--color-muted-foreground)] line-clamp-1 mt-0.5">{post.excerpt}</div>
                  </div>
                </div>
              </td>
              <td class="p-4">
                <Badge variant="amber">{post.categoryName || 'General'}</Badge>
                <div class="flex flex-wrap gap-1 mt-1">
                  {#each post.tagNames || [] as t (t)}
                    <span class="text-[9px] text-[var(--color-muted-foreground)] bg-[var(--color-bg)] border border-[var(--color-border)] px-1.5 py-0.5 rounded-md">
                      #{t}
                    </span>
                  {/each}
                </div>
              </td>
              <td class="p-4 text-[var(--color-text)] font-semibold">{post.authorName}</td>
              <td class="p-4">
                {#if post.status === 'published'}
                  <Badge variant="emerald">Published</Badge>
                {:else}
                  <Badge variant="slate">Draft</Badge>
                {/if}
                <div class="text-[10px] text-[var(--color-muted-foreground)] mt-1">
                  {new Date(post.createdAt).toLocaleDateString('id-ID')}
                </div>
              </td>
              <td class="p-4 text-right space-x-2">
                {#if authStore.hasPermission('edit_posts')}
                  <button
                    onclick={() => handleOpenEdit(post)}
                    class="p-1.5 rounded-xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 text-[var(--color-primary)]"
                  >
                    <Edit class="w-3.5 h-3.5" />
                  </button>
                {/if}
                {#if authStore.hasPermission('delete_posts')}
                  <button
                    onclick={() => {
                      postToDelete = post;
                      deleteModalOpen = true;
                    }}
                    class="p-1.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400"
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                  </button>
                {/if}
              </td>
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>
</Card>

<!-- Editor Modal -->
<Modal
  isOpen={isEditorOpen}
  onClose={() => (isEditorOpen = false)}
  title={editingPost?.id ? 'Edit Berita / Artikel' : 'Tulis Berita Baru'}
  size="2xl"
>
  {#snippet footer()}
    <Button variant="secondary" onclick={() => (isEditorOpen = false)}>
      Batal
    </Button>
    <Button variant="primary" onclick={handleSavePost} isLoading={saving}>
      <Save class="w-4 h-4" />
      Simpan Berita
    </Button>
  {/snippet}

  {#if editingPost}
  {#key editingPost.id || 'new'}
    <form onsubmit={handleSavePost} class="space-y-4">
      <Input
        label="Judul Berita Utama *"
        placeholder="Contoh: Pelaksanaan PIN Polio Serentak di Puskesmas"
        defaultValue={editingPost.title || ''}
        oninput={(e) => patchEditingPost({ title: e.currentTarget.value })}
        required
      />

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select
          label="Kategori Berita *"
          defaultValue={editingPost.categoryId || ''}
          onchange={(e) => {
            const categoryId = e.currentTarget.value;
            const found = categories.find((c) => c.id === categoryId);
            patchEditingPost({ categoryId, categoryName: found?.name });
          }}
          options={categoryOptions}
        />

        <Select
          label="Status Publikasi *"
          value={editingPost.status || 'draft'}
          onchange={(e) => patchEditingPost({ status: e.currentTarget.value as ContentStatus })}
          options={statusOptions}
        />
      </div>

      <!-- Enhanced Featured Image Section with Direct Upload & AI Generation -->
      <div class="space-y-2 p-3.5 rounded-2xl bg-[var(--color-bg)]/80 border border-[var(--color-border)]">
        <div class="flex items-center justify-between">
          <label class="text-xs font-semibold text-[var(--color-text)] flex items-center gap-1.5">
            <ImageIcon class="w-3.5 h-3.5 text-[var(--color-primary)]" />
            Gambar Sampul Berita (Featured Image)
          </label>
          <span class="text-[11px] text-zinc-400">Rasio 16:9 direkomendasikan</span>
        </div>

        <!-- Action Buttons: Upload & AI Studio -->
        <div class="flex flex-wrap gap-2">
          <input
            type="file"
            bind:this={fileInputEl}
            accept="image/png, image/jpeg, image/webp"
            onchange={handleFileUpload}
            class="hidden"
          />

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onclick={() => fileInputEl?.click()}
            isLoading={uploadingImage}
            class="gap-1.5 text-xs bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-primary)]/50"
          >
            <Upload class="w-3.5 h-3.5 text-emerald-500" />
            {uploadingImage ? 'Mengunggah...' : 'Upload Berkas Foto'}
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onclick={handleOpenAiImageModal}
            class="gap-1.5 text-xs shadow-sm shadow-[var(--color-primary)]/20"
          >
            <Sparkles class="w-3.5 h-3.5 text-amber-300" />
            Generate Gambar AI
          </Button>
        </div>

        <!-- URL Input Fallback -->
        <Input
          placeholder="Atau tempel URL gambar langsung (https://...)"
          defaultValue={editingPost.featuredImage || ''}
          oninput={(e) => patchEditingPost({ featuredImage: e.currentTarget.value })}
          class="text-xs"
        />

        <!-- Live Preview Thumbnail -->
        {#if editingPost.featuredImage}
          <div class="mt-2.5 p-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center gap-3">
            <div class="w-24 h-16 rounded-lg overflow-hidden bg-black/40 flex-shrink-0 border border-white/10 relative">
              <img
                src={editingPost.featuredImage}
                alt="Preview Sampul"
                class="w-full h-full object-cover"
                referrerpolicy="no-referrer"
                onerror={() => {
                  console.warn('Gagal render preview gambar:', editingPost.featuredImage);
                }}
              />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-[11px] font-medium text-[var(--color-text)] truncate flex items-center gap-1">
                <CheckCircle2 class="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                Gambar Sampul Aktif
              </p>
              <p class="text-[10px] text-zinc-400 truncate mt-0.5 font-mono">
                {editingPost.featuredImage.startsWith('data:')
                  ? 'Berkas Unggahan (Tersedia Lokal)'
                  : editingPost.featuredImage}
              </p>
            </div>
            <button
              type="button"
              onclick={() => patchEditingPost({ featuredImage: '' })}
              class="p-1.5 text-zinc-400 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors"
              title="Hapus gambar sampul"
            >
              <X class="w-4 h-4" />
            </button>
          </div>
        {/if}
      </div>

      <Input
        label="Ringkasan Singkat (Excerpt)"
        placeholder="Ringkasan 1-2 kalimat untuk kartu berita..."
        defaultValue={editingPost.excerpt || ''}
        oninput={(e) => patchEditingPost({ excerpt: e.currentTarget.value })}
      />

      <!-- Tag Generator -->
      <div>
        <label class="block text-xs font-semibold text-[var(--color-text)] mb-1">Tag / Label Berita</label>
        <div class="flex gap-2">
          <input
            type="text"
            placeholder="Ketik tag baru (misal: Vaksinasi, Stunting) lalu klik Tambah"
            bind:value={tagInput}
            class="flex-1 bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)]/70 focus:outline-none rounded-2xl px-3 py-1.5 text-xs text-[var(--color-text)] placeholder-zinc-600"
          />
          <Button type="button" variant="secondary" onclick={handleAddTag}>
            + Tambah Tag
          </Button>
        </div>
        <div class="flex flex-wrap gap-1.5 mt-2">
          {#each editingPost.tagNames || [] as tn (tn)}
            <span class="text-xs bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 text-[var(--color-primary)] px-2 py-0.5 rounded-lg flex items-center gap-1">
              #{tn}
            </span>
          {/each}
        </div>
      </div>

      <div>
        <label class="block text-xs font-semibold text-[var(--color-text)] mb-1">
          Isi Lengkap Berita (HTML Format) *
        </label>
        <textarea
          rows={8}
          oninput={(e) => patchEditingPost({ content: e.currentTarget.value })}
          placeholder="Tuliskan isi berita lengkap di sini..."
          class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)]/70 focus:outline-none rounded-2xl p-4 text-xs text-[var(--color-text)] font-mono leading-relaxed"
          required
        >{editingPost.content || ''}</textarea>
      </div>
    </form>
  {/key}
  {/if}
</Modal>

<!-- Copyright-Compliant Import Modal with Configurable AI Engine -->
<Modal
  isOpen={isImportModalOpen}
  onClose={() => (isImportModalOpen = false)}
  title="Impor Berita & Artikel (Web / Medsos)"
  size="lg"
>
  {#snippet footer()}
    <Button variant="secondary" onclick={() => (isImportModalOpen = false)}>
      Batal
    </Button>
    <Button variant="primary" onclick={handleImportSubmit} isLoading={importing} class="gap-1.5">
      <DownloadCloud class="w-4 h-4" />
      Impor & Simpan ke Draft
    </Button>
  {/snippet}

  <form onsubmit={handleImportSubmit} class="space-y-4 text-xs">
    <!-- Active AI Provider Status with Link to Sistem & Konfigurasi -->
    <div class="p-3 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center shrink-0">
          <Sparkles class="w-4 h-4" />
        </div>
        <div>
          <p class="text-[10px] text-[var(--color-muted-foreground)] font-medium">Provider AI Terhubung:</p>
          <p class="text-xs font-bold text-[var(--color-text)] flex items-center gap-1.5">
            {aiConfig?.providerName || 'Google Gemini (Google AI Studio)'}
            <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
              {aiConfig?.model || 'gemini-3.8-flash'}
            </span>
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2 self-end sm:self-auto">
        <button
          type="button"
          onclick={() => {
            aiSettingsModalTab = 'text';
            isAiSettingsModalOpen = true;
          }}
          class="px-3 py-1.5 rounded-xl border border-[var(--color-border)] hover:border-[var(--color-primary)] bg-[var(--color-surface)] text-[var(--color-primary)] font-semibold flex items-center gap-1.5 transition text-xs shadow-sm"
        >
          <Settings2 class="w-3.5 h-3.5" />
          <span>Atur Provider Teks</span>
        </button>
      </div>
    </div>

    <div class="p-3 bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 rounded-2xl text-[var(--color-primary)] flex items-start gap-2.5">
      <ShieldCheck class="w-5 h-5 shrink-0 mt-0.5" />
      <div class="space-y-1">
        <p class="font-bold text-xs">Penyusunan Berita Komprehensif & Kepatuhan Hak Cipta</p>
        <p class="text-[11px] opacity-90 leading-relaxed">
          AI akan menyusun artikel kesehatan yang mendalam dan mudah dipahami pembaca (minimal 4–6 paragraf berbobot, lengkap dengan subjudul dan panduan praktis). Sistem wajib menyertakan kotak atribusi resmi dan tautan langsung ke web/medsos yang dikutip sesuai kaidah <em>Fair Use</em>.
        </p>
      </div>
    </div>

    <!-- Alert for Social Media Links -->
    {#if isSocialMediaUrl}
      <div class="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-700 dark:text-amber-300 flex items-start gap-2.5">
        <AlertCircle class="w-5 h-5 shrink-0 mt-0.5 text-amber-500" />
        <div class="space-y-1">
          <p class="font-bold text-xs">Penting untuk Link Media Sosial</p>
          <p class="text-[11px] leading-relaxed">
            Platform medsos (Instagram/Facebook/TikTok/X) mengunci konten dari bot scraper otomatis luar. Pastikan Anda <strong>menyalin (copy) teks caption</strong> postingan dan <strong>menempelkannya (paste)</strong> ke kolom <em>Cuplikan Teks / Caption Medsos</em> di bawah agar berita yang dihasilkan AI akurat sesuai isi aslinya.
          </p>
        </div>
      </div>
    {/if}

    <Input
      label="URL Sumber Berita / Artikel / Medsos"
      placeholder="https://www.kemkes.go.id/article/view/... atau link media sosial"
      value={importUrl}
      oninput={(e) => handleImportUrlInput(e.currentTarget.value)}
    />

    <Input
      label="Nama Sumber (Opsional)"
      placeholder="Contoh: Kemenkes RI / Dinas Kesehatan / WHO Indonesia"
      value={importSourceName}
      oninput={(e) => (importSourceName = e.currentTarget.value)}
    />

    <div>
      <label class="block text-xs font-semibold text-[var(--color-text)] mb-1">
        Cuplikan Teks / Caption Medsos {isSocialMediaUrl ? '(Sangat Dianjurkan untuk Medsos)' : '(Opsional)'}
      </label>
      <textarea
        rows={3}
        bind:value={importRawText}
        placeholder={isSocialMediaUrl
          ? 'Tempelkan (paste) caption postingan Instagram/Facebook/X di sini agar AI dapat menyusunnya menjadi artikel berita yang lengkap...'
          : 'Jika postingan medsos atau artikel diproteksi login/anti-bot, Anda dapat menyalin caption atau cuplikan paragraf di sini agar AI dapat menyusunnya menjadi berita yang lengkap...'}
        class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)]/70 focus:outline-none rounded-2xl p-3 text-xs text-[var(--color-text)] placeholder-zinc-500 leading-relaxed"
      ></textarea>
    </div>

    <div class="pt-1">
      <label class="flex items-start gap-3 p-3.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl cursor-pointer hover:border-[var(--color-primary)] transition">
        <input
          type="checkbox"
          bind:checked={importCopyrightChecked}
          class="w-4 h-4 mt-0.5 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
          required
        />
        <span class="text-[11px] leading-relaxed text-[var(--color-text)]">
          Saya menyatakan bahwa konten yang diimpor dari URL publik di atas menyertakan atribusi sumber asli yang transparan, mematuhi kaidah <em>Fair Use</em> untuk edukasi publik, dan tidak melanggar ketentuan hak cipta komersial.
        </span>
      </label>
    </div>
  </form>
</Modal>

<!-- Delete Confirmation -->
<ConfirmModal
  isOpen={deleteModalOpen}
  onClose={() => (deleteModalOpen = false)}
  onConfirm={handleDelete}
  isLoading={saving}
  title="Hapus Berita"
  message={`Apakah Anda yakin ingin menghapus berita "${postToDelete?.title}"?`}
/>

<!-- AI Image Studio Modal -->
<Modal
  isOpen={isAiImageModalOpen}
  onClose={() => (isAiImageModalOpen = false)}
  title="AI Image Studio - Gambar Sampul Berita"
  size="lg"
>
  {#snippet footer()}
    <div class="flex flex-wrap items-center justify-between w-full gap-2">
      <Button variant="secondary" onclick={() => (isAiImageModalOpen = false)}>
        Batal
      </Button>
      <div class="flex items-center gap-2">
        <Button
          variant="secondary"
          onclick={() => handleGenerateAiImage()}
          isLoading={aiImageGenerating}
          class="gap-1.5"
        >
          <Sparkles class="w-4 h-4 text-amber-400" />
          {aiGeneratedPreview ? 'Generate Varian Baru' : 'Generate Pratinjau AI'}
        </Button>
        <Button
          variant="primary"
          onclick={handleApplyAiImage}
          disabled={!aiGeneratedPreview || aiImageGenerating}
          class="gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 disabled:opacity-40"
        >
          <Check class="w-4 h-4" />
          Gunakan Gambar Ini (Setuju)
        </Button>
      </div>
    </div>
  {/snippet}

  <div class="space-y-4">
    <!-- Integrated AI Provider Status Card -->
    <div class={`p-3.5 rounded-2xl border transition ${
      !aiCapability?.hasKey
        ? 'bg-amber-500/10 border-amber-500/30'
        : !aiCapability?.supportsNativeImage
          ? 'bg-blue-500/10 border-blue-500/30'
          : 'bg-gradient-to-r from-[var(--color-primary)]/10 via-[var(--color-primary)]/5 to-transparent border border-[var(--color-primary)]/25'
    }`}>
      <div class="flex flex-wrap items-start justify-between gap-2.5">
        <div class="flex items-start gap-2.5">
          <div class={`p-2 rounded-xl shrink-0 mt-0.5 ${
            !aiCapability?.hasKey
              ? 'bg-amber-500/20 text-amber-500'
              : !aiCapability?.supportsNativeImage
                ? 'bg-blue-500/20 text-blue-500'
                : 'bg-[var(--color-primary)]/15 text-[var(--color-primary)]'
          }`}>
            <Cpu class="w-4 h-4" />
          </div>
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-xs font-bold text-[var(--color-text)]">
                Provider AI Gambar: {aiCapability?.providerName || 'Pollinations AI (Flux)'}
              </span>
              {#if aiCapability?.model}
                <span class="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                  Model: {aiCapability.model}
                </span>
              {/if}
              {#if !aiCapability?.hasKey}
                <span class="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/25 font-semibold flex items-center gap-1">
                  <AlertCircle class="w-3 h-3" />
                  Perlu Kunci API
                </span>
              {:else}
                <span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/25 font-semibold flex items-center gap-1">
                  <CheckCircle2 class="w-3 h-3" />
                  {aiCapability.nativeEngine || 'Siap Digunakan'}
                </span>
              {/if}
            </div>
            <p class="text-[11px] text-zinc-400 mt-1 leading-relaxed">
              {aiCapability?.explanation || 'Gambar akan digenerate langsung oleh Provider Gambar yang Anda atur tanpa penyedia lain.'}
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onclick={() => {
            aiSettingsModalTab = 'image';
            isAiSettingsModalOpen = true;
          }}
          class="gap-1.5 text-xs shrink-0 self-start border-[var(--color-border)] hover:border-[var(--color-primary)]/50"
        >
          <Settings2 class="w-3.5 h-3.5 text-[var(--color-primary)]" />
          Atur Provider Gambar
        </Button>
      </div>

      {#if !aiCapability?.hasKey || !aiCapability?.supportsNativeImage}
        <div class="mt-2.5 pt-2.5 border-t border-[var(--color-border)]/60 flex items-center justify-between text-xs">
          <span class="text-[11px] text-amber-400">
            {!aiCapability?.hasKey
              ? '⚠️ Provider belum memiliki API Key. Klik tombol di kanan untuk menyetel provider gambar.'
              : 'ℹ️ Provider ini tidak mendukung gambar. Ganti provider gambar di pengaturan.'}
          </span>
          <button
            type="button"
            onclick={() => {
              aiSettingsModalTab = 'image';
              isAiSettingsModalOpen = true;
            }}
            class="text-[11px] font-semibold text-[var(--color-primary)] hover:underline flex items-center gap-1"
          >
            Buka Pengaturan Gambar &rarr;
          </button>
        </div>
      {/if}
    </div>

    <!-- Quick Preset Buttons -->
    <div>
      <label class="block text-xs font-semibold text-[var(--color-text)] mb-2 flex items-center justify-between">
        <span>Pilihan Cepat Tema Puskesmas</span>
        <span class="text-[10px] text-zinc-400 font-normal">Klik untuk memasukkan deskripsi tema</span>
      </label>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {#each AI_IMAGE_PRESETS as preset (preset.id)}
          <button
            type="button"
            onclick={() => {
              aiImagePrompt = preset.prompt;
              handleGenerateAiImage(preset.prompt);
            }}
            class="text-left p-2.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] hover:border-[var(--color-primary)]/70 hover:bg-[var(--color-primary)]/5 transition text-xs flex items-center justify-between group"
          >
            <span class="font-medium text-[var(--color-text)] group-hover:text-[var(--color-primary)] truncate">
              {preset.label}
            </span>
            <Wand2 class="w-3.5 h-3.5 text-zinc-400 group-hover:text-[var(--color-primary)] shrink-0 ml-1 opacity-0 group-hover:opacity-100 transition" />
          </button>
        {/each}
      </div>
    </div>

    <!-- Custom Prompt Input -->
    <div>
      <label class="block text-xs font-semibold text-[var(--color-text)] mb-1 flex items-center justify-between">
        <span>Instruksi / Prompt Visual Spesifik (Bahasa Indonesia)</span>
        <span class="text-[10px] text-zinc-400">Jelaskan kegiatan, orang, dan suasananya</span>
      </label>
      <textarea
        rows={3}
        bind:value={aiImagePrompt}
        placeholder="Contoh: Seorang anak balita sedang ditimbang di timbangan dacin posyandu oleh kader kesehatan berkerudung dengan ibu tersenyum mendampingi..."
        class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)]/70 focus:outline-none rounded-2xl p-3 text-xs text-[var(--color-text)] placeholder-zinc-500 leading-relaxed"
      ></textarea>
    </div>

    <!-- Style Selector & Trigger Button -->
    <div class="flex flex-wrap items-center justify-between gap-3 pt-1">
      <div>
        <label class="block text-xs font-semibold text-[var(--color-text)] mb-1.5">Gaya Visual</label>
        <div class="flex flex-wrap gap-2">
          {#each [
            { id: 'fotorealistik', label: '📷 Foto Realistik' },
            { id: 'jurnalistik', label: '📰 Jurnalistik Berita' },
            { id: 'modern-clean', label: '✨ Modern & Bersih' }
          ] as st (st.id)}
            <button
              type="button"
              onclick={() => (aiImageStyle = st.id)}
              class={`px-3 py-1.5 rounded-xl text-xs font-medium border transition ${
                aiImageStyle === st.id
                  ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-sm'
                  : 'bg-[var(--color-bg)] border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-primary)]/50'
              }`}
            >
              {st.label}
            </button>
          {/each}
        </div>
      </div>

      <div class="self-end">
        <Button
          type="button"
          variant="primary"
          onclick={() => handleGenerateAiImage()}
          isLoading={aiImageGenerating}
          class="gap-2 shadow-sm shadow-[var(--color-primary)]/20"
        >
          <Sparkles class="w-4 h-4 text-amber-300" />
          {aiImageGenerating ? 'Merancang & Merender...' : 'Generate Pratinjau'}
        </Button>
      </div>
    </div>

    <!-- Generating Loading State -->
    {#if aiImageGenerating}
      <div class="p-8 rounded-2xl border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5 flex flex-col items-center justify-center text-center gap-3 animate-pulse">
        <RefreshCw class="w-9 h-9 text-[var(--color-primary)] animate-spin" />
        <div>
          <p class="text-xs font-bold text-[var(--color-text)]">
            AI Sedang Menganalisis Prompt & Merender Visual...
          </p>
          <p class="text-[11px] text-zinc-400 mt-1 max-w-sm">
            Menerjemahkan instruksi bahasa Indonesia ke standar fotografi Puskesmas, lalu merender gambar resolusi tinggi 1200x630.
          </p>
        </div>
      </div>
    {/if}

    <!-- Preview of Generated Image -->
    {#if !aiImageGenerating && aiGeneratedPreview}
      <div class="space-y-3 pt-3 border-t border-[var(--color-border)]">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold text-[var(--color-text)] flex items-center gap-1.5">
              <CheckCircle2 class="w-4 h-4 text-emerald-400" />
              Pratinjau Hasil Gambar AI
            </span>
            {#if aiGeneratedResult?.providerUsed}
              <span class="text-[10px] px-2 py-0.5 rounded-md bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-medium border border-[var(--color-primary)]/20">
                Diproses: {aiGeneratedResult.providerUsed}
              </span>
            {/if}
          </div>
          <span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 font-semibold border border-emerald-500/25">
            Tinjau & Setujui
          </span>
        </div>

        <!-- Informational support callout -->
        {#if aiGeneratedResult?.supportMessage}
          <div class="p-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-start gap-2 text-[11px] text-zinc-400">
            <Info class="w-3.5 h-3.5 text-[var(--color-primary)] shrink-0 mt-0.5" />
            <span>{aiGeneratedResult.supportMessage}</span>
          </div>
        {/if}

        <!-- Image Display Frame -->
        <div class="relative w-full aspect-video rounded-2xl overflow-hidden border border-[var(--color-border)] bg-zinc-950 shadow-inner group">
          {#if !aiPreviewLoaded && !aiPreviewFailed}
            <div class="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-xs z-10 gap-2">
              <RefreshCw class="w-7 h-7 text-white/70 animate-spin" />
              <span class="text-[11px] text-white/80 font-medium">Memuat pratinjau gambar...</span>
            </div>
          {/if}

          {#if aiPreviewFailed}
            <div class="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-zinc-900 z-10 gap-2">
              <AlertCircle class="w-8 h-8 text-amber-400" />
              <p class="text-xs font-semibold text-zinc-200">Gagal memuat visual pratinjau langsung</p>
              <p class="text-[11px] text-zinc-400 max-w-xs">
                Koneksi visual membutuhkan percobaan ulang. Silakan klik tombol di bawah untuk membuat varian baru.
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onclick={() => handleGenerateAiImage()}
                class="mt-2 text-xs"
              >
                <RefreshCw class="w-3.5 h-3.5 mr-1" />
                Coba Render Ulang Varian Baru
              </Button>
            </div>
          {:else}
            <img
              src={aiGeneratedPreview}
              alt="AI Generated Preview"
              referrerpolicy="no-referrer"
              onload={() => (aiPreviewLoaded = true)}
              onerror={() => (aiPreviewFailed = true)}
              class="w-full h-full object-cover transition duration-300 group-hover:scale-[1.01]"
            />
          {/if}

          <div class="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-20">
            <a
              href={aiGeneratedPreview}
              target="_blank"
              rel="noopener noreferrer"
              class="p-1.5 rounded-lg bg-black/70 hover:bg-black text-white text-[11px] backdrop-blur-sm transition flex items-center gap-1 px-2.5"
              title="Buka gambar di tab baru"
            >
              <ExternalLink class="w-3.5 h-3.5" />
              <span>Ukuran Asli</span>
            </a>
          </div>
        </div>

        <!-- Prompt Transparency & Translation Accordion -->
        <div class="p-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-xs space-y-2">
          <div class="flex items-center justify-between">
            <div class="min-w-0 flex-1">
              <p class="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Prompt Asli (Input Anda):</p>
              <p class="text-xs font-medium text-[var(--color-text)] truncate mt-0.5">
                {aiImagePrompt || editingPost?.title || 'Foto pelayanan kesehatan Puskesmas'}
              </p>
            </div>
            <button
              type="button"
              onclick={() => (showPromptDetails = !showPromptDetails)}
              class="text-[11px] text-[var(--color-primary)] hover:underline flex items-center gap-1 shrink-0 ml-2 font-medium"
            >
              <span>{showPromptDetails ? 'Sembunyikan Detail Visual' : 'Lihat Detail Terjemahan AI'}</span>
              {#if showPromptDetails}
                <ChevronUp class="w-3.5 h-3.5" />
              {:else}
                <ChevronDown class="w-3.5 h-3.5" />
              {/if}
            </button>
          </div>

          {#if showPromptDetails}
            <div class="pt-2 border-t border-[var(--color-border)]/60 space-y-1.5 text-[11px]">
              <div class="flex items-center justify-between text-zinc-400">
                <span class="font-semibold">Deskripsi Visual AI yang Dihasilkan:</span>
                <button
                  type="button"
                  onclick={copyPrompt}
                  class="flex items-center gap-1 hover:text-[var(--color-text)] transition"
                >
                  <Copy class="w-3 h-3" />
                  <span>Salin Prompt</span>
                </button>
              </div>
              <p class="p-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] font-mono text-[10.5px] leading-relaxed break-words">
                {aiGeneratedResult?.enhancedPrompt || aiGeneratedPromptUsed}
              </p>
            </div>
          {/if}
        </div>

        <!-- Bottom Quick Approval Callout -->
        <div class="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-1">
          <p class="text-[11px] text-zinc-400 text-center sm:text-left">
            Suka dengan gambar ini? Klik tombol setujui untuk menerapkannya sebagai gambar sampul berita.
          </p>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onclick={handleApplyAiImage}
            class="w-full sm:w-auto gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shrink-0"
          >
            <Check class="w-3.5 h-3.5" />
            Gunakan Gambar Ini (Setuju)
          </Button>
        </div>
      </div>
    {/if}
  </div>
</Modal>

<!-- AI Provider Settings Modal (Easily accessed from AI Image Studio) -->
<AIProviderSettingsModal
  isOpen={isAiSettingsModalOpen}
  initialTab={aiSettingsModalTab}
  onClose={() => (isAiSettingsModalOpen = false)}
  onSaved={async (newConfig) => {
    aiConfig = newConfig;
    try {
      aiCapability = await aiProviderService.getImageCapability();
    } catch {
      // ignore
    }
    showToast(`Konfigurasi AI Provider (${newConfig.providerName}) berhasil diperbarui!`, 'success');
  }}
/>
