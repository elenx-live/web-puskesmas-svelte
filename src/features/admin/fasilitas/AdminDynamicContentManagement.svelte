<!-- @component Manajemen konten publik (CMS): daftar, filter tipe/status/kategori, editor, pratinjau, transisi status workflow, export CSV, pemilih media. -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { authStore } from '../../../shared/stores/auth.svelte.js';
  import { toastStore } from '../../../shared/stores/toast.svelte.js';
  import { dynamicContentService } from '../../../shared/services/dynamicContentService.js';
  import { serviceEngineService } from '../../../shared/services/serviceEngineService.js';
  import { documentService } from '../../../shared/services/documentService.js';
  import { mediaService } from '../../../shared/services/mediaService.js';
  import type {
    DynamicContentEntity,
    ContentType,
    DynamicContentStatus,
    ContentCategoryEntity,
    MediaItem,
    DocumentEntity,
    ServiceEntity,
  } from '../../../shared/types/index.js';
  import { formatSafeHtml } from '../../../shared/utils/sanitize.js';
  import Card from '../../../shared/ui/Card.svelte';
  import Input from '../../../shared/ui/Input.svelte';
  import Select from '../../../shared/ui/Select.svelte';
  import ConfirmModal from '../../../shared/components/ConfirmModal.svelte';
  import {
    Plus,
    Search,
    Eye,
    Edit3,
    Trash2,
    CheckCircle2,
    Clock,
    Send,
    X,
    Pin,
    Star,
    Download,
    Image as ImageIcon,
  } from 'lucide-svelte';

  let contents = $state<DynamicContentEntity[]>([]);
  let categories = $state<ContentCategoryEntity[]>([]);
  let services = $state<ServiceEntity[]>([]);
  let documents = $state<DocumentEntity[]>([]);
  let mediaList = $state<MediaItem[]>([]);

  let loading = $state(true);
  let search = $state('');
  let typeFilter = $state<ContentType | ''>('');
  let statusFilter = $state<DynamicContentStatus | ''>('');
  let categoryFilter = $state('');

  // Modal State for Create / Edit
  let isModalOpen = $state(false);
  let editingContent = $state<Partial<DynamicContentEntity> | null>(null);
  // Counter remount untuk field yang diupdate programatik (bukan dari ketikan):
  // slug (auto dari judul), featuredImage (dari media picker), content (toolbar HTML).
  // Field-field ini uncontrolled, jadi perlu remount agar perubahan programatik tampil.
  let progRev = $state(0);

  // Preview Modal
  let previewContent = $state<DynamicContentEntity | null>(null);

  // Delete Confirm Modal
  let deleteModalOpen = $state(false);
  let contentToDelete = $state<DynamicContentEntity | null>(null);
  let deleting = $state(false);

  // Media Library Picker Modal inside Editor
  let isMediaPickerOpen = $state(false);

  function getActor() {
    const user = authStore.user;
    return {
      id: user?.uid || 'usr-admin',
      name: user?.displayName || 'Administrator',
      email: user?.email || 'admin@puskesmas.id',
    };
  }

  async function loadData() {
    loading = true;
    try {
      const [listData, catData, srvData, docData, medData] = await Promise.all([
        dynamicContentService.getContents(
          typeFilter || undefined,
          statusFilter || undefined,
          categoryFilter || undefined,
          search
        ),
        dynamicContentService.getCategories(),
        serviceEngineService.getServices(),
        documentService.getDocuments(),
        mediaService.getMediaList(),
      ]);
      contents = listData;
      categories = catData;
      services = srvData;
      documents = docData;
      mediaList = medData;
    } catch (e) {
      console.error(e);
      toastStore.showToast('Gagal memuat data konten', 'error');
    } finally {
      loading = false;
    }
  }

  function handleOpenCreate() {
    editingContent = {
      contentType: 'berita',
      title: '',
      slug: '',
      excerpt: '',
      content: '',
      featuredImage: '',
      category: 'Pelayanan Publik',
      tags: [],
      status: 'draft',
      pinned: false,
      featured: false,
      relatedServiceId: '',
      relatedDocumentIds: [],
      agendaDetails: {
        eventDate: new Date().toISOString().split('T')[0],
        startTime: '08:00',
        endTime: '12:00',
        location: 'Aula Puskesmas Manding',
        organizer: 'Tim Promkes Puskesmas',
      },
    };
    isModalOpen = true;
  }

  function handleOpenEdit(item: DynamicContentEntity) {
    editingContent = { ...item };
    isModalOpen = true;
  }

  async function handleSaveContent(e: SubmitEvent) {
    e.preventDefault();
    if (!editingContent || !editingContent.title) {
      toastStore.showToast('Judul konten wajib diisi', 'error');
      return;
    }

    try {
      const actor = getActor();
      if (editingContent.id) {
        await dynamicContentService.updateContent(editingContent.id, editingContent, actor);
        toastStore.showToast('Konten berhasil diperbarui', 'success');
      } else {
        await dynamicContentService.createContent(editingContent, actor);
        toastStore.showToast('Konten baru berhasil dibuat', 'success');
      }
      isModalOpen = false;
      loadData();
    } catch (e: any) {
      toastStore.showToast(e.message || 'Gagal menyimpan konten', 'error');
    }
  }

  function handleDeleteClick(item: DynamicContentEntity) {
    contentToDelete = item;
    deleteModalOpen = true;
  }

  async function handleDelete() {
    if (!contentToDelete) return;
    deleting = true;
    try {
      await dynamicContentService.deleteContent(contentToDelete.id, getActor());
      toastStore.showToast('Konten berhasil dihapus', 'success');
      deleteModalOpen = false;
      contentToDelete = null;
      loadData();
    } catch (e) {
      toastStore.showToast('Gagal menghapus konten', 'error');
    } finally {
      deleting = false;
    }
  }

  async function handleStatusTransition(id: string, newStatus: DynamicContentStatus, actionName: string) {
    try {
      await dynamicContentService.updateContent(id, { status: newStatus }, getActor());
      toastStore.showToast(`Konten berhasil diubah statusnya menjadi ${actionName}`, 'success');
      loadData();
    } catch (e) {
      toastStore.showToast('Gagal mengubah status konten', 'error');
    }
  }

  function handleExportCSV() {
    const headers = ['ID', 'Tipe', 'Judul', 'Kategori', 'Status', 'Author', 'Dibuat', 'Dilihat'];
    const rows = contents.map((c) => [
      c.id,
      c.contentType,
      `"${c.title.replace(/"/g, '""')}"`,
      c.category,
      c.status,
      c.authorName,
      new Date(c.createdAt).toLocaleDateString('id-ID'),
      c.viewCount,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `laporan_konten_cms_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toastStore.showToast('Berkas CSV berhasil diunduh', 'success');
  }

  function updateEditing(patch: Partial<DynamicContentEntity>) {
    if (!editingContent) return;
    editingContent = { ...editingContent, ...patch };
  }

  function handleTitleChange(title: string) {
    if (!editingContent) return;
    const slug = title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
    updateEditing({ title, slug, seoTitle: title });
    progRev++;
  }

  function appendContentTag(html: string) {
    if (!editingContent) return;
    updateEditing({ content: (editingContent.content || '') + html });
    progRev++;
  }

  function handlePickMedia(m: MediaItem) {
    updateEditing({ featuredImage: m.fileUrl });
    isMediaPickerOpen = false;
    progRev++;
  }

  function setAgendaField(
    field: 'eventDate' | 'startTime' | 'endTime' | 'location' | 'organizer',
    value: string
  ) {
    const current = editingContent?.agendaDetails;
    updateEditing({
      agendaDetails: {
        eventDate: current?.eventDate ?? '',
        startTime: current?.startTime ?? '',
        endTime: current?.endTime ?? '',
        location: current?.location ?? '',
        organizer: current?.organizer ?? '',
        [field]: value,
      },
    });
  }

  // Stats computation
  const totalContents = $derived(contents.length);
  const publishedCount = $derived(contents.filter((c) => c.status === 'published').length);
  const draftCount = $derived(contents.filter((c) => c.status === 'draft').length);
  const pendingCount = $derived(contents.filter((c) => c.status === 'pending_review').length);
  const scheduledCount = $derived(contents.filter((c) => c.status === 'scheduled').length);

  const typeLabels: Record<ContentType, { label: string; color: string }> = {
    berita: { label: 'Berita', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    artikel: {
      label: 'Artikel',
      color: 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] border-[var(--color-primary)]/20',
    },
    pengumuman: { label: 'Pengumuman', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
    agenda: {
      label: 'Agenda',
      color: 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] border-[var(--color-primary)]/20',
    },
    kegiatan: { label: 'Kegiatan', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
    edukasi: { label: 'Edukasi', color: 'bg-sky-500/10 text-sky-400 border-sky-500/20' },
    prestasi: { label: 'Prestasi', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  };

  onMount(() => {
    loadData();
  });

  $effect(() => {
    const s = search;
    const t = typeFilter;
    const st = statusFilter;
    const c = categoryFilter;
    void s;
    void t;
    void st;
    void c;
    loadData();
  });
</script>

<div class="space-y-6 max-w-7xl mx-auto pb-12">
  <!-- Top Header & Actions -->
  <div
    class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--color-card)] border border-[var(--color-border)] p-6 rounded-3xl"
  >
    <div class="space-y-1">
      <span class="text-[10px] font-bold uppercase tracking-widest text-[var(--color-primary)]"
        >PHASE 5J — Dynamic CMS</span
      >
      <h1 class="text-xl font-bold text-[var(--color-text)]">Manajemen Konten Publik</h1>
      <p class="text-xs text-[var(--color-muted-foreground)]">
        Kelola berita, artikel informatif, pengumuman, agenda kegiatan, dan materi edukasi kesehatan.
      </p>
    </div>
    <div class="flex items-center gap-3">
      <button
        onclick={handleExportCSV}
        class="px-4 py-2.5 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] hover:text-[var(--color-text)] text-xs font-semibold inline-flex items-center gap-2 transition"
      >
        <Download class="w-4 h-4 text-[var(--color-primary)]" /> Export CSV
      </button>
      <button
        onclick={handleOpenCreate}
        class="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-[var(--color-primary)] text-[var(--color-primary-foreground)] text-xs font-semibold inline-flex items-center gap-2 shadow-lg transition"
      >
        <Plus class="w-4 h-4" /> Buat Konten Baru
      </button>
    </div>
  </div>

  <!-- Statistics Cards -->
  <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
    <div class="bg-[var(--color-card)] border border-[var(--color-border)] p-4 rounded-2xl space-y-1">
      <div class="text-[var(--color-muted-foreground)] text-[10px] uppercase font-bold">Total Konten</div>
      <div class="text-xl font-bold text-[var(--color-text)] font-mono">{totalContents}</div>
    </div>
    <div class="bg-[var(--color-card)] border border-[var(--color-border)] p-4 rounded-2xl space-y-1">
      <div class="text-[var(--color-primary)] text-[10px] uppercase font-bold">Published</div>
      <div class="text-xl font-bold text-[var(--color-primary)] font-mono">{publishedCount}</div>
    </div>
    <div class="bg-[var(--color-card)] border border-[var(--color-border)] p-4 rounded-2xl space-y-1">
      <div class="text-[var(--color-primary)] text-[10px] uppercase font-bold">Draft</div>
      <div class="text-xl font-bold text-[var(--color-primary)] font-mono">{draftCount}</div>
    </div>
    <div class="bg-[var(--color-card)] border border-[var(--color-border)] p-4 rounded-2xl space-y-1">
      <div class="text-purple-400 text-[10px] uppercase font-bold">Pending Review</div>
      <div class="text-xl font-bold text-purple-400 font-mono">{pendingCount}</div>
    </div>
    <div class="bg-[var(--color-card)] border border-[var(--color-border)] p-4 rounded-2xl space-y-1 col-span-2 md:col-span-1">
      <div class="text-blue-400 text-[10px] uppercase font-bold">Scheduled</div>
      <div class="text-xl font-bold text-blue-400 font-mono">{scheduledCount}</div>
    </div>
  </div>

  <!-- Filters & Search -->
  <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
    <div class="relative">
      <Search class="w-4 h-4 text-[var(--color-muted-foreground)] absolute left-3 top-1/2 -translate-y-1/2" />
      <Input
        placeholder="Cari judul, ringkasan, tag..."
        bind:value={search}
        class="bg-[var(--color-card)] border-[var(--color-border)] pl-9 rounded-2xl"
      />
    </div>

    <Select
      bind:value={typeFilter}
      options={[
        { value: '', label: 'Semua Tipe Konten' },
        { value: 'berita', label: 'Berita' },
        { value: 'artikel', label: 'Artikel' },
        { value: 'pengumuman', label: 'Pengumuman' },
        { value: 'agenda', label: 'Agenda' },
        { value: 'kegiatan', label: 'Kegiatan' },
        { value: 'edukasi', label: 'Edukasi Kesehatan' },
        { value: 'prestasi', label: 'Prestasi' },
      ]}
      class="bg-[var(--color-card)] border-[var(--color-border)] rounded-2xl"
    />

    <Select
      bind:value={statusFilter}
      options={[
        { value: '', label: 'Semua Status' },
        { value: 'draft', label: 'Draft' },
        { value: 'pending_review', label: 'Pending Review' },
        { value: 'scheduled', label: 'Scheduled' },
        { value: 'published', label: 'Published' },
        { value: 'unpublished', label: 'Unpublished' },
        { value: 'archived', label: 'Archived' },
        { value: 'expired', label: 'Expired' },
      ]}
      class="bg-[var(--color-card)] border-[var(--color-border)] rounded-2xl"
    />

    <select
      bind:value={categoryFilter}
      class="bg-[var(--color-card)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none rounded-2xl px-4 py-2.5 text-xs text-[var(--color-text)]"
    >
      <option value="">Semua Kategori</option>
      {#each categories as cat (cat.id)}
        <option value={cat.name}>{cat.name}</option>
      {/each}
    </select>
  </div>

  <!-- Content Table -->
  <div class="bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl overflow-hidden shadow-xl">
    {#if loading}
      <div class="p-12 text-center text-[var(--color-muted-foreground)] font-mono text-xs">
        Memuat data konten...
      </div>
    {:else if contents.length === 0}
      <div class="p-12 text-center text-[var(--color-muted-foreground)] text-xs">
        Tidak ada konten yang ditemukan.
      </div>
    {:else}
      <div class="overflow-x-auto">
        <table class="w-full text-xs text-left text-[var(--color-text)]">
          <thead
            class="bg-[var(--color-bg)] text-[10px] font-bold uppercase text-[var(--color-muted-foreground)] border-b border-[var(--color-border)]"
          >
            <tr>
              <th class="px-6 py-4">Konten & Tipe</th>
              <th class="px-6 py-4">Kategori & Tag</th>
              <th class="px-6 py-4">Status & Waktu</th>
              <th class="px-6 py-4">Penulis & Statistik</th>
              <th class="px-6 py-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[var(--color-border)]">
            {#each contents as item (item.id)}
              {@const typeMeta = typeLabels[item.contentType] || {
                label: item.contentType,
                color: 'bg-[var(--color-card)]/10 text-[var(--color-muted-foreground)]',
              }}
              <tr class="hover:bg-[var(--color-card)] transition">
                <td class="px-6 py-4 space-y-1.5 max-w-sm">
                  <div class="flex items-center gap-2">
                    <span
                      class={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${typeMeta.color}`}
                    >
                      {typeMeta.label}
                    </span>
                    {#if item.pinned}
                      <span
                        class="px-1.5 py-0.5 rounded bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-[9px] font-bold inline-flex items-center gap-0.5"
                      >
                        <Pin class="w-2.5 h-2.5" /> Pinned
                      </span>
                    {/if}
                    {#if item.featured}
                      <span
                        class="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 text-[9px] font-bold inline-flex items-center gap-0.5"
                      >
                        <Star class="w-2.5 h-2.5" /> Featured
                      </span>
                    {/if}
                  </div>
                  <div class="font-bold text-[var(--color-text)] line-clamp-1">{item.title}</div>
                  <div class="text-[11px] text-[var(--color-muted-foreground)] font-mono line-clamp-1">
                    {item.slug}
                  </div>
                </td>
                <td class="px-6 py-4 space-y-1">
                  <div class="font-medium text-[var(--color-text)]">{item.category}</div>
                  <div class="flex flex-wrap gap-1">
                    {#each item.tags as t (t)}
                      <span
                        class="px-2 py-0.5 rounded bg-[var(--color-bg)] text-[var(--color-muted-foreground)] text-[10px]"
                      >
                        #{t}
                      </span>
                    {/each}
                  </div>
                </td>
                <td class="px-6 py-4 space-y-1">
                  <div>
                    <span
                      class={`px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase ${
                        item.status === 'published'
                          ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20'
                          : item.status === 'pending_review'
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                            : item.status === 'scheduled'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : item.status === 'archived'
                                ? 'bg-[var(--color-card)]/10 text-[var(--color-muted-foreground)] border border-zinc-500/20'
                                : item.status === 'expired'
                                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                  : 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                  <div class="text-[10px] text-[var(--color-muted-foreground)] font-mono">
                    {item.publishedAt
                      ? `Pub: ${new Date(item.publishedAt).toLocaleDateString('id-ID')}`
                      : `Dibuat: ${new Date(item.createdAt).toLocaleDateString('id-ID')}`}
                  </div>
                </td>
                <td class="px-6 py-4 space-y-0.5 text-[var(--color-muted-foreground)]">
                  <div class="text-[var(--color-text)] font-medium">{item.authorName}</div>
                  <div class="text-[10px] font-mono text-[var(--color-muted-foreground)]">
                    {item.viewCount || 0} Dilihat • v{item.version}
                  </div>
                </td>
                <td class="px-6 py-4 text-right space-x-1.5 whitespace-nowrap">
                  <button
                    onclick={() => (previewContent = item)}
                    title="Pratinjau"
                    class="p-2 rounded-xl bg-[var(--color-bg)] text-[var(--color-text)] hover:text-[var(--color-text)] hover:bg-[var(--color-card)] transition inline-flex items-center"
                  >
                    <Eye class="w-3.5 h-3.5" />
                  </button>
                  <button
                    onclick={() => handleOpenEdit(item)}
                    title="Edit"
                    class="p-2 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20 transition inline-flex items-center"
                  >
                    <Edit3 class="w-3.5 h-3.5" />
                  </button>
                  {#if item.status === 'draft'}
                    <button
                      onclick={() => handleStatusTransition(item.id, 'pending_review', 'Pending Review')}
                      title="Submit for Review"
                      class="p-2 rounded-xl bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition inline-flex items-center"
                    >
                      <Send class="w-3.5 h-3.5" />
                    </button>
                  {/if}
                  {#if item.status === 'draft' || item.status === 'pending_review' || item.status === 'unpublished'}
                    <button
                      onclick={() => handleStatusTransition(item.id, 'published', 'Published')}
                      title="Publikasikan"
                      class="p-2 rounded-xl bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition inline-flex items-center"
                    >
                      <CheckCircle2 class="w-3.5 h-3.5" />
                    </button>
                  {/if}
                  {#if item.status === 'published'}
                    <button
                      onclick={() => handleStatusTransition(item.id, 'unpublished', 'Unpublished')}
                      title="Tarik Publikasi (Unpublish)"
                      class="p-2 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20 transition inline-flex items-center"
                    >
                      <Clock class="w-3.5 h-3.5" />
                    </button>
                  {/if}
                  <button
                    onclick={() => handleDeleteClick(item)}
                    title="Hapus"
                    class="p-2 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition inline-flex items-center"
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>

  <!-- Modal Create / Edit -->
  {#if isModalOpen && editingContent}
    <div class="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        class="bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl max-w-4xl w-full p-6 space-y-6 shadow-2xl max-h-[92vh] overflow-y-auto"
      >
        <div class="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
          <div>
            <span class="text-[10px] text-[var(--color-muted-foreground)] font-mono uppercase"
              >CMS Publik Editor</span
            >
            <h3 class="text-lg font-mono font-bold text-[var(--color-text)]">
              {editingContent.id ? 'Edit Konten Publik' : 'Buat Konten Baru'}
            </h3>
          </div>
          <button
            onclick={() => (isModalOpen = false)}
            class="text-[var(--color-muted-foreground)] hover:text-[var(--color-text)]"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        {#key editingContent.id || 'new'}
        <form onsubmit={handleSaveContent} class="space-y-4 text-xs">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="space-y-1.5">
              <label class="text-[var(--color-muted-foreground)] font-semibold">Tipe Konten *</label>
              <select
                value={editingContent.contentType || 'berita'}
                onchange={(e) =>
                  updateEditing({ contentType: e.currentTarget.value as ContentType })}
                class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none rounded-2xl px-3 py-2.5 text-[var(--color-text)]"
              >
                <option value="berita">Berita</option>
                <option value="artikel">Artikel</option>
                <option value="pengumuman">Pengumuman</option>
                <option value="agenda">Agenda Kegiatan</option>
                <option value="kegiatan">Kegiatan</option>
                <option value="edukasi">Edukasi Kesehatan</option>
                <option value="prestasi">Prestasi</option>
              </select>
            </div>

            <div class="space-y-1.5">
              <label class="text-[var(--color-muted-foreground)] font-semibold">Kategori *</label>
              <select
                value={editingContent.category || ''}
                onchange={(e) => updateEditing({ category: e.currentTarget.value })}
                class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none rounded-2xl px-3 py-2.5 text-[var(--color-text)]"
              >
                <option value="Umum">Pilih Kategori</option>
                {#each categories as cat (cat.id)}
                  <option value={cat.name}>{cat.name}</option>
                {/each}
              </select>
            </div>

            <div class="space-y-1.5">
              <label class="text-[var(--color-muted-foreground)] font-semibold">Status *</label>
              <select
                value={editingContent.status || 'draft'}
                onchange={(e) =>
                  updateEditing({ status: e.currentTarget.value as DynamicContentStatus })}
                class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none rounded-2xl px-3 py-2.5 text-[var(--color-text)]"
              >
                <option value="draft">Draft</option>
                <option value="pending_review">Pending Review</option>
                <option value="scheduled">Scheduled</option>
                <option value="published">Published</option>
                <option value="unpublished">Unpublished</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          <div class="space-y-1.5">
            <label class="text-[var(--color-muted-foreground)] font-semibold">Judul Konten *</label>
            <input
              type="text"
              required
              placeholder="Contoh: Penyuluhan Imunisasi Campak & Rubella"
              defaultValue={editingContent.title || ''}
              oninput={(e) => handleTitleChange(e.currentTarget.value)}
              class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none rounded-2xl px-4 py-2.5 text-[var(--color-text)]"
            />
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="text-[var(--color-muted-foreground)] font-semibold">Slug URL</label>
              {#key progRev}
              <input
                type="text"
                defaultValue={editingContent.slug || ''}
                oninput={(e) => updateEditing({ slug: e.currentTarget.value })}
                class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none rounded-2xl px-4 py-2 text-[var(--color-text)] font-mono text-[11px]"
              />
              {/key}
            </div>
            <div class="space-y-1.5">
              <label class="text-[var(--color-muted-foreground)] font-semibold"
                >Tag (Pisahkan dengan koma)</label
              >
              <input
                type="text"
                placeholder="Posyandu, Imunisasi, Lansia"
                defaultValue={Array.isArray(editingContent.tags) ? editingContent.tags.join(', ') : ''}
                oninput={(e) =>
                  updateEditing({
                    tags: e.currentTarget.value.split(',').map((t) => t.trim()).filter(Boolean),
                  })}
                class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none rounded-2xl px-4 py-2 text-[var(--color-text)]"
              />
            </div>
          </div>

          <div class="space-y-1.5">
            <label class="text-[var(--color-muted-foreground)] font-semibold">Ringkasan / Excerpt</label>
            <textarea
              rows={2}
              placeholder="Ringkasan singkat untuk kartu pratinjau..."
              oninput={(e) =>
                updateEditing({ excerpt: e.currentTarget.value, seoDescription: e.currentTarget.value })}
              class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none rounded-2xl px-4 py-2.5 text-[var(--color-text)]"
            >{editingContent.excerpt || ''}</textarea>
          </div>

          <!-- Featured Image Picker -->
          <div class="space-y-1.5">
            <label class="text-[var(--color-muted-foreground)] font-semibold"
              >Featured Image URL / Media Library</label
            >
            <div class="flex gap-2">
              {#key progRev}
              <input
                type="text"
                placeholder="https://images.unsplash.com/..."
                defaultValue={editingContent.featuredImage || ''}
                oninput={(e) => updateEditing({ featuredImage: e.currentTarget.value })}
                class="flex-1 bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none rounded-2xl px-4 py-2 text-[var(--color-text)]"
              />
              {/key}
              <button
                type="button"
                onclick={() => (isMediaPickerOpen = true)}
                class="px-4 py-2 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 font-semibold inline-flex items-center gap-1.5"
              >
                <ImageIcon class="w-4 h-4" /> Pilih dari Media
              </button>
            </div>
          </div>

          <!-- Rich Text Editor Simulation -->
          <div class="space-y-1.5">
            <label class="text-[var(--color-muted-foreground)] font-semibold"
              >Isi Konten (HTML / Rich Text)</label
            >
            <div class="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl p-2 space-y-2">
              <div class="flex flex-wrap gap-1 border-b border-[var(--color-border)] pb-2 text-[11px]">
                <button
                  type="button"
                  onclick={() => appendContentTag('<h2>Subjudul</h2>')}
                  class="px-2 py-1 rounded bg-[var(--color-card)] text-[var(--color-text)] hover:text-[var(--color-text)]"
                  >Heading</button
                >
                <button
                  type="button"
                  onclick={() => appendContentTag('<p>Paragraf baru...</p>')}
                  class="px-2 py-1 rounded bg-[var(--color-card)] text-[var(--color-text)] hover:text-[var(--color-text)]"
                  >Paragraph</button
                >
                <button
                  type="button"
                  onclick={() => appendContentTag('<strong>Teks Tebal</strong>')}
                  class="px-2 py-1 rounded bg-[var(--color-card)] text-[var(--color-text)] hover:text-[var(--color-text)]"
                  >Bold</button
                >
                <button
                  type="button"
                  onclick={() => appendContentTag('<ul><li>Poin 1</li><li>Poin 2</li></ul>')}
                  class="px-2 py-1 rounded bg-[var(--color-card)] text-[var(--color-text)] hover:text-[var(--color-text)]"
                  >List</button
                >
                <button
                  type="button"
                  onclick={() => appendContentTag('<blockquote>Kutipan penting...</blockquote>')}
                  class="px-2 py-1 rounded bg-[var(--color-card)] text-[var(--color-text)] hover:text-[var(--color-text)]"
                  >Quote</button
                >
              </div>
              {#key progRev}
              <textarea
                rows={8}
                placeholder="Tulis isi konten lengkap di sini (mendukung tag HTML)..."
                oninput={(e) => updateEditing({ content: e.currentTarget.value })}
                class="w-full bg-transparent focus:outline-none text-[var(--color-text)] font-mono text-xs p-2"
              >{editingContent.content || ''}</textarea>
              {/key}
            </div>
          </div>

          <!-- Agenda Specific Fields if contentType === 'agenda' -->
          {#if editingContent.contentType === 'agenda'}
            <div
              class="bg-[var(--color-bg)] border border-[var(--color-primary)]/20 p-4 rounded-2xl space-y-3"
            >
              <h4 class="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)]">
                Detail Jadwal Agenda Kegiatan
              </h4>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label class="text-[var(--color-muted-foreground)]">Tanggal Kegiatan</label>
                  <input
                    type="date"
                    value={editingContent.agendaDetails?.eventDate || ''}
                    onchange={(e) =>
                      setAgendaField('eventDate', e.currentTarget.value)}
                    class="w-full bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-[var(--color-text)]"
                  />
                </div>
                <div>
                  <label class="text-[var(--color-muted-foreground)]">Jam Mulai</label>
                  <input
                    type="time"
                    value={editingContent.agendaDetails?.startTime || ''}
                    onchange={(e) =>
                      setAgendaField('startTime', e.currentTarget.value)}
                    class="w-full bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-[var(--color-text)] font-mono"
                  />
                </div>
                <div>
                  <label class="text-[var(--color-muted-foreground)]">Jam Selesai</label>
                  <input
                    type="time"
                    value={editingContent.agendaDetails?.endTime || ''}
                    onchange={(e) =>
                      setAgendaField('endTime', e.currentTarget.value)}
                    class="w-full bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-[var(--color-text)] font-mono"
                  />
                </div>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label class="text-[var(--color-muted-foreground)]">Lokasi</label>
                  <input
                    type="text"
                    placeholder="Lokasi kegiatan..."
                    defaultValue={editingContent.agendaDetails?.location || ''}
                    oninput={(e) =>
                      setAgendaField('location', e.currentTarget.value)}
                    class="w-full bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-[var(--color-text)]"
                  />
                </div>
                <div>
                  <label class="text-[var(--color-muted-foreground)]">Penyelenggara</label>
                  <input
                    type="text"
                    placeholder="Tim / Unit..."
                    defaultValue={editingContent.agendaDetails?.organizer || ''}
                    oninput={(e) =>
                      setAgendaField('organizer', e.currentTarget.value)}
                    class="w-full bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-[var(--color-text)]"
                  />
                </div>
              </div>
            </div>
          {/if}

          <!-- Scheduling & Expiry -->
          <div
            class="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[var(--color-bg)] p-4 rounded-2xl border border-[var(--color-border)]"
          >
            <div class="space-y-1.5">
              <label class="text-[var(--color-muted-foreground)] font-semibold"
                >Jadwal Publikasi (Publish At)</label
              >
              <input
                type="datetime-local"
                value={editingContent.publishAt ? editingContent.publishAt.slice(0, 16) : ''}
                onchange={(e) =>
                  updateEditing({
                    publishAt: e.currentTarget.value ? new Date(e.currentTarget.value).toISOString() : undefined,
                  })}
                class="w-full bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-[var(--color-text)] font-mono"
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-[var(--color-muted-foreground)] font-semibold"
                >Batas Kedaluwarsa (Expire At)</label
              >
              <input
                type="datetime-local"
                value={editingContent.expireAt ? editingContent.expireAt.slice(0, 16) : ''}
                onchange={(e) =>
                  updateEditing({
                    expireAt: e.currentTarget.value ? new Date(e.currentTarget.value).toISOString() : undefined,
                  })}
                class="w-full bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-[var(--color-text)] font-mono"
              />
            </div>
          </div>

          <!-- Pin & Feature Options -->
          <div class="flex gap-6 py-2">
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!editingContent.pinned}
                onchange={(e) => updateEditing({ pinned: e.currentTarget.checked })}
                class="rounded bg-[var(--color-bg)] border-[var(--color-border)] text-[var(--color-primary)] focus:ring-0"
              />
              <span class="text-[var(--color-text)] font-medium"
                >Pin Konten (Tampilkan di posisi khusus)</span
              >
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!editingContent.featured}
                onchange={(e) => updateEditing({ featured: e.currentTarget.checked })}
                class="rounded bg-[var(--color-bg)] border-[var(--color-border)] text-[var(--color-primary)] focus:ring-0"
              />
              <span class="text-[var(--color-text)] font-medium"
                >Jadikan Konten Unggulan (Featured)</span
              >
            </label>
          </div>

          <!-- Related Service & Documents Integration -->
          <div
            class="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[var(--color-bg)] p-4 rounded-2xl border border-[var(--color-border)]"
          >
            <div class="space-y-1.5">
              <label class="text-[var(--color-muted-foreground)] font-semibold"
                >Kaitkan dengan Layanan (Phase 4)</label
              >
              <select
                value={editingContent.relatedServiceId || ''}
                onchange={(e) => updateEditing({ relatedServiceId: e.currentTarget.value })}
                class="w-full bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-[var(--color-text)]"
              >
                <option value="">-- Tidak ada layanan terkait --</option>
                {#each services as srv (srv.id)}
                  <option value={srv.id}>{srv.name}</option>
                {/each}
              </select>
            </div>
            <div class="space-y-1.5">
              <label class="text-[var(--color-muted-foreground)] font-semibold"
                >Dokumen Terkait (Phase 5H)</label
              >
              <select
                value={editingContent.relatedDocumentIds?.[0] || ''}
                onchange={(e) =>
                  updateEditing({
                    relatedDocumentIds: e.currentTarget.value ? [e.currentTarget.value] : [],
                  })}
                class="w-full bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-[var(--color-text)]"
              >
                <option value="">-- Pilih Dokumen Standar / Formulir --</option>
                {#each documents as doc (doc.id)}
                  <option value={doc.id}>{doc.title}</option>
                {/each}
              </select>
            </div>
          </div>

          <div class="flex justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
            <button
              type="button"
              onclick={() => (isModalOpen = false)}
              class="px-5 py-2.5 rounded-2xl bg-[var(--color-bg)] text-[var(--color-muted-foreground)] hover:text-[var(--color-text)] font-semibold transition"
            >
              Batal
            </button>
            <button
              type="submit"
              class="px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-[var(--color-primary)] text-[var(--color-primary-foreground)] font-semibold shadow-lg transition"
            >
              Simpan Konten
            </button>
          </div>
        </form>
        {/key}
      </div>
    </div>
  {/if}

  <!-- Media Library Picker Modal -->
  {#if isMediaPickerOpen}
    <div class="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        class="bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl max-w-3xl w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto"
      >
        <div class="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
          <h3 class="text-sm font-bold text-[var(--color-text)]">Pilih Gambar dari Media Library</h3>
          <button
            onclick={() => (isMediaPickerOpen = false)}
            class="text-[var(--color-muted-foreground)] hover:text-[var(--color-text)]"
          >
            <X class="w-5 h-5" />
          </button>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {#each mediaList as m (m.id)}
            <button
              type="button"
              onclick={() => handlePickMedia(m)}
              class="group relative bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl p-2 cursor-pointer hover:border-[var(--color-primary)] transition text-left"
            >
              <img src={m.fileUrl} alt={m.fileName} class="w-full h-28 object-cover rounded-xl" />
              <p class="text-[10px] text-[var(--color-text)] mt-1 truncate">{m.fileName}</p>
            </button>
          {/each}
        </div>
      </div>
    </div>
  {/if}

  <!-- Preview Modal -->
  {#if previewContent}
    <div class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        class="bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl max-w-3xl w-full p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div class="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
          <div>
            <span class="text-[10px] text-[var(--color-primary)] font-mono uppercase"
              >Pratinjau Publik — {previewContent.contentType}</span
            >
            <h3 class="text-lg font-bold text-[var(--color-text)]">{previewContent.title}</h3>
          </div>
          <button
            onclick={() => (previewContent = null)}
            class="text-[var(--color-muted-foreground)] hover:text-[var(--color-text)]"
          >
            <X class="w-5 h-5" />
          </button>
        </div>
        {#if previewContent.featuredImage}
          <img
            src={previewContent.featuredImage}
            alt={previewContent.title}
            class="w-full h-64 object-cover rounded-2xl"
          />
        {/if}
        <div
          class="flex items-center gap-4 text-xs text-[var(--color-muted-foreground)] border-b border-[var(--color-border)] pb-3"
        >
          <span>Kategori: <strong class="text-[var(--color-text)]">{previewContent.category}</strong></span>
          <span
            >Penulis: <strong class="text-[var(--color-text)]">{previewContent.authorName}</strong></span
          >
          <span
            >Tanggal:
            <strong class="text-[var(--color-text)]"
              >{new Date(previewContent.createdAt).toLocaleDateString('id-ID')}</strong
            ></span
          >
        </div>
        <div
          class="html-safe-content max-w-none text-[var(--color-text)] text-sm leading-relaxed"
        >
          {@html formatSafeHtml(previewContent.content)}
        </div>
      </div>
    </div>
  {/if}
</div>

<!-- Delete Confirmation Modal -->
<ConfirmModal
  isOpen={deleteModalOpen}
  onClose={() => (deleteModalOpen = false)}
  onConfirm={handleDelete}
  isLoading={deleting}
  title="Hapus Konten Publik"
  message={`Apakah Anda yakin ingin menghapus konten "${contentToDelete?.title}"?`}
/>
