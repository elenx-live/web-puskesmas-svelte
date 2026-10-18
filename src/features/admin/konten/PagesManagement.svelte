<!-- @component Manajemen halaman dinamis CMS: daftar, editor HTML dengan toolbar format, pratinjau, revisi, dan hapus. -->
<script lang="ts">
  import Card from '../../../shared/ui/Card.svelte';
  import Button from '../../../shared/ui/Button.svelte';
  import Input from '../../../shared/ui/Input.svelte';
  import Select from '../../../shared/ui/Select.svelte';
  import Badge from '../../../shared/ui/Badge.svelte';
  import Modal from '../../../shared/ui/Modal.svelte';
  import ConfirmModal from '../../../shared/components/ConfirmModal.svelte';
  import { authStore } from '../../../shared/stores/auth.svelte.js';
  import { toastStore } from '../../../shared/stores/toast.svelte.js';
  import { pageService } from '../../../shared/services/pageService.js';
  import { formatSafeHtml } from '../../../shared/utils/sanitize.js';
  import type { PageEntity, PageRevision, ContentStatus } from '../../../shared/types/index.js';
  import {
    Plus,
    Search,
    Edit,
    Trash2,
    Eye,
    History,
    Globe,
    Save,
    Bold,
    Italic,
    Heading2,
    Heading3,
    List,
    ListOrdered,
    Quote,
    Table as TableIcon,
    Link as LinkIcon,
    Sparkles,
    LayoutTemplate
  } from 'lucide-svelte';

  const showToast = toastStore.showToast.bind(toastStore);

  let pages = $state<PageEntity[]>([]);
  let loading = $state(true);
  let search = $state('');
  let statusFilter = $state('');

  // Editor Modal State
  let isEditorOpen = $state(false);
  let editingPage = $state<Partial<PageEntity> | null>(null);
  let saving = $state(false);
  let editorTab = $state<'code' | 'preview'>('code');
  let textareaEl = $state<HTMLTextAreaElement | null>(null);

  // Mutasi properti langsung (bukan spread-replace) agar Svelte hanya
  // menginvalidasi properti yang berubah — tidak re-render seluruh editor per keystroke.
  const patchEditingPage = (patch: Partial<PageEntity>) => {
    if (!editingPage) return;
    for (const k of Object.keys(patch) as (keyof PageEntity)[]) {
      (editingPage as Record<string, unknown>)[k] = patch[k];
    }
  };

  function insertHtmlTag(openTag: string, closeTag: string, placeholder = '') {
    const textarea = textareaEl;
    const currentVal = editingPage?.content || '';
    if (!textarea) {
      patchEditingPage({ content: currentVal + openTag + placeholder + closeTag });
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = currentVal.substring(start, end) || placeholder;
    const replacement = openTag + selected + closeTag;

    const newVal = currentVal.substring(0, start) + replacement + currentVal.substring(end);
    patchEditingPage({ content: newVal });

    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + openTag.length + selected.length;
      textarea.setSelectionRange(start + openTag.length, newCursorPos);
    }, 50);
  }

  function insertStarterTemplate() {
    const template = `<h2>Judul Bagian Utama</h2>
<p>Ini adalah paragraf penjelasan lengkap untuk halaman dinamis ini. Anda dapat menjelaskan visi, alur layanan, atau pengumuman secara mendetail.</p>

<h3>Poin-Poin Penting</h3>
<ul>
  <li>Poin pertama yang penting untuk diperhatikan masyarakat.</li>
  <li>Poin kedua tentang syarat dan ketentuan layanan Puskesmas.</li>
  <li>Poin ketiga kontak penanggung jawab klaster terkait.</li>
</ul>

<blockquote>Maklumat Pelayanan: Kami berkomitmen memberikan pelayanan prima dengan tulus dan profesional kepada seluruh warga.</blockquote>

<h3>Tabel Jadwal / Informasi Terkait</h3>
<table border="1">
  <thead>
    <tr>
      <th>Kategori</th>
      <th>Keterangan</th>
      <th>Waktu / Lokasi</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Pelayanan Reguler</td>
      <td>Poli Umum & Poli Gigi</td>
      <td>Senin - Jumat (08.00 - 14.00 WIB)</td>
    </tr>
    <tr>
      <td>Pelayanan Khusus</td>
      <td>Imunisasi & Konsultasi Gizi</td>
      <td>Selasa & Kamis (08.30 - 12.00 WIB)</td>
    </tr>
  </tbody>
</table>`;

    patchEditingPage({
      content: editingPage?.content ? editingPage.content + '\n\n' + template : template
    });
  }

  // Preview Modal State
  let previewPage = $state<PageEntity | null>(null);

  // History / Revisions Modal
  let revisionsModalOpen = $state(false);
  let revisions = $state<PageRevision[]>([]);
  let selectedRevisionPageTitle = $state('');

  // Delete Confirm Modal
  let deleteModalOpen = $state(false);
  let pageToDelete = $state<PageEntity | null>(null);

  async function loadPages() {
    loading = true;
    try {
      pages = await pageService.getPages(statusFilter, search);
    } catch {
      showToast('Gagal memuat daftar halaman', 'error');
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    loadPages();
  });

  function handleOpenCreate() {
    editorTab = 'code';
    editingPage = {
      title: '',
      slug: '',
      excerpt: '',
      content: '',
      status: 'draft',
      visibility: 'public',
      seoTitle: '',
      seoDescription: ''
    };
    isEditorOpen = true;
  }

  function handleOpenEdit(page: PageEntity) {
    editorTab = 'code';
    editingPage = { ...page };
    isEditorOpen = true;
  }

  async function handleTitleInput(value: string) {
    const currentSlug = editingPage?.slug || '';

    // Auto generate slug if creating or if slug is empty
    let newSlug = currentSlug;
    if (!editingPage?.id || !currentSlug) {
      newSlug = await pageService.generateUniqueSlug(value, editingPage?.id);
    }

    patchEditingPage({
      title: value,
      slug: newSlug,
      seoTitle: editingPage?.seoTitle || value
    });
  }

  async function handleSavePage(e: Event) {
    e.preventDefault();
    const user = authStore.user;
    if (!user || !editingPage) return;

    if (!editingPage.title?.trim() || !editingPage.content?.trim()) {
      showToast('Judul dan Konten Halaman wajib diisi!', 'error');
      return;
    }

    saving = true;
    try {
      if (editingPage.id) {
        await pageService.updatePage(editingPage.id, editingPage, {
          id: user.uid,
          email: user.email,
          name: user.displayName
        });
        showToast(`Halaman "${editingPage.title}" berhasil diperbarui.`);
      } else {
        await pageService.createPage(editingPage, {
          id: user.uid,
          email: user.email,
          name: user.displayName
        });
        showToast(`Halaman baru "${editingPage.title}" berhasil dibuat.`);
      }

      isEditorOpen = false;
      editingPage = null;
      loadPages();
    } catch (err: any) {
      showToast(err.message || 'Gagal menyimpan halaman', 'error');
    } finally {
      saving = false;
    }
  }

  async function handleViewRevisions(page: PageEntity) {
    selectedRevisionPageTitle = page.title;
    revisions = await pageService.getRevisions(page.id);
    revisionsModalOpen = true;
  }

  async function handleDelete() {
    const user = authStore.user;
    if (!user || !pageToDelete) return;
    saving = true;
    try {
      await pageService.deletePage(pageToDelete.id, {
        id: user.uid,
        email: user.email,
        name: user.displayName
      });
      showToast(`Halaman "${pageToDelete.title}" dihapus.`);
      deleteModalOpen = false;
      pageToDelete = null;
      loadPages();
    } catch (err: any) {
      showToast(err.message || 'Gagal menghapus halaman', 'error');
    } finally {
      saving = false;
    }
  }

  function statusVariant(status: ContentStatus): 'emerald' | 'amber' | 'rose' | 'slate' {
    switch (status) {
      case 'published':
        return 'emerald';
      case 'review':
        return 'amber';
      case 'archived':
        return 'rose';
      default:
        return 'slate';
    }
  }

  function statusLabel(status: ContentStatus): string {
    switch (status) {
      case 'published':
        return 'Published';
      case 'review':
        return 'In Review';
      case 'archived':
        return 'Archived';
      default:
        return 'Draft';
    }
  }
</script>

<!-- Action Header -->
<div class="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[var(--color-card)] border border-[var(--color-border)] p-4 rounded-3xl">
  <div class="flex items-center gap-3 w-full sm:w-auto flex-1">
    <div class="relative w-full max-w-xs">
      <Search class="w-4 h-4 text-[var(--color-muted-foreground)] absolute left-3 top-1/2 -translate-y-1/2" />
      <input
        type="text"
        placeholder="Cari judul / slug..."
        bind:value={search}
        class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)]/70 focus:outline-none rounded-2xl pl-9 pr-4 py-2 text-xs text-[var(--color-text)] placeholder-zinc-600"
      />
    </div>

    <div class="w-44">
      <Select
        bind:value={statusFilter}
        options={[
          { value: '', label: 'Semua Status' },
          { value: 'published', label: 'Published' },
          { value: 'review', label: 'In Review' },
          { value: 'draft', label: 'Draft' },
          { value: 'archived', label: 'Archived' }
        ]}
      />
    </div>
  </div>

  {#if authStore.hasPermission('create_pages')}
    <Button onclick={handleOpenCreate} variant="primary">
      <Plus class="w-4 h-4" />
      Buat Halaman Baru
    </Button>
  {/if}
</div>

<!-- Pages List Table -->
<Card class="p-0 overflow-hidden">
  <div class="overflow-x-auto">
    <table class="w-full text-xs text-left text-[var(--color-text)]">
      <thead class="bg-[var(--color-bg)] text-[10px] font-bold uppercase text-[var(--color-muted-foreground)] border-b border-[var(--color-border)]">
        <tr>
          <th class="p-4">Halaman & URL Slug</th>
          <th class="p-4">Status & Visibilitas</th>
          <th class="p-4">Versi & Penulis</th>
          <th class="p-4">Terakhir Diperbarui</th>
          <th class="p-4 text-right">Tindakan</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-[var(--color-border)]">
        {#if loading}
          <tr>
            <td colspan={5} class="p-8 text-center text-[var(--color-muted-foreground)]">
              Memuat daftar halaman CMS...
            </td>
          </tr>
        {:else if pages.length === 0}
          <tr>
            <td colspan={5} class="p-8 text-center text-[var(--color-muted-foreground)]">
              Belum ada halaman dinamis ditemukan.
            </td>
          </tr>
        {:else}
          {#each pages as page (page.id)}
            <tr class="hover:bg-[var(--color-card)]/50 transition">
              <td class="p-4">
                <div class="font-bold text-[var(--color-text)] text-sm">{page.title}</div>
                <div class="flex items-center gap-1.5 text-[11px] text-[var(--color-primary)] font-mono mt-0.5">
                  <Globe class="w-3 h-3 shrink-0" />
                  <span>/{page.slug}</span>
                </div>
              </td>
              <td class="p-4">
                <div class="flex items-center gap-2">
                  <Badge variant={statusVariant(page.status)}>{statusLabel(page.status)}</Badge>
                  <span class="text-[10px] text-[var(--color-muted-foreground)] capitalize px-2 py-0.5 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)]">
                    {page.visibility}
                  </span>
                </div>
              </td>
              <td class="p-4">
                <div class="text-[var(--color-text)] font-semibold">v{page.version}</div>
                <div class="text-[10px] text-[var(--color-muted-foreground)]">{page.updatedBy?.name || page.createdBy?.name}</div>
              </td>
              <td class="p-4 text-[var(--color-muted-foreground)] text-[11px]">
                {new Date(page.updatedAt).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </td>
              <td class="p-4 text-right space-x-2">
                <!-- Preview -->
                <button
                  onclick={() => (previewPage = page)}
                  class="p-1.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:text-[var(--color-primary)] transition"
                  title="Pratinjau Halaman"
                >
                  <Eye class="w-3.5 h-3.5" />
                </button>

                <!-- History -->
                <button
                  onclick={() => handleViewRevisions(page)}
                  class="p-1.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:text-[var(--color-primary)] transition"
                  title="Riwayat Revisi"
                >
                  <History class="w-3.5 h-3.5" />
                </button>

                <!-- Edit -->
                {#if authStore.hasPermission('edit_pages')}
                  <button
                    onclick={() => handleOpenEdit(page)}
                    class="p-1.5 rounded-xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20 transition"
                    title="Edit Halaman"
                  >
                    <Edit class="w-3.5 h-3.5" />
                  </button>
                {/if}

                <!-- Delete -->
                {#if authStore.hasPermission('delete_pages')}
                  <button
                    onclick={() => {
                      pageToDelete = page;
                      deleteModalOpen = true;
                    }}
                    class="p-1.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition"
                    title="Hapus Halaman"
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

<!-- Page Editor Modal -->
<Modal
  isOpen={isEditorOpen}
  onClose={() => (isEditorOpen = false)}
  title={editingPage?.id ? `Edit Halaman (v${editingPage.version})` : 'Buat Halaman Baru'}
  size="2xl"
>
  {#snippet footer()}
    <Button variant="secondary" onclick={() => (isEditorOpen = false)}>
      Batal
    </Button>
    <Button variant="primary" onclick={handleSavePage} isLoading={saving}>
      <Save class="w-4 h-4" />
      Simpan Halaman
    </Button>
  {/snippet}

  {#if editingPage}
    <form onsubmit={handleSavePage} class="space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Judul Halaman *"
          placeholder="Contoh: Sejarah & Perkembangan Puskesmas"
          value={editingPage.title || ''}
          oninput={(e) => handleTitleInput(e.currentTarget.value)}
          required
        />

        <div>
          <label class="block text-xs font-semibold text-[var(--color-text)] mb-1">
            URL Slug Permanen *
          </label>
          <div class="relative">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)] text-xs font-mono">/</span>
            <input
              type="text"
              value={editingPage.slug || ''}
              oninput={(e) => patchEditingPage({ slug: e.currentTarget.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
              class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)]/70 focus:outline-none rounded-2xl pl-7 pr-4 py-2 text-xs text-[var(--color-primary)] font-mono"
              placeholder="sejarah-puskesmas"
              required
            />
          </div>
        </div>
      </div>

      <!-- Status & Visibility Row -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl">
        <Select
          label="Status Alur Kerja"
          bind:value={editingPage.status}
          options={[
            { value: 'draft', label: 'Draft (Internal)' },
            { value: 'review', label: 'Review (Menunggu Pemeriksaan)' },
            { value: 'published', label: 'Published (Tampil Publik)' },
            { value: 'archived', label: 'Archived (Diarsipkan)' }
          ]}
        />

        <Select
          label="Visibilitas"
          bind:value={editingPage.visibility}
          options={[
            { value: 'public', label: 'Publik (Semua Pengunjung)' },
            { value: 'private', label: 'Privat (Pengguna Login)' }
          ]}
        />

        <Input
          label="Gambar Utama (Featured Image)"
          placeholder="https://images.unsplash.com/..."
          value={editingPage.featuredImage || ''}
          oninput={(e) => patchEditingPage({ featuredImage: e.currentTarget.value })}
        />
      </div>

      <!-- Excerpt -->
      <Input
        label="Ringkasan Halaman (Excerpt)"
        placeholder="Ringkasan singkat 1-2 kalimat untuk pratinjau halaman..."
        value={editingPage.excerpt || ''}
        oninput={(e) => patchEditingPage({ excerpt: e.currentTarget.value })}
      />

      <!-- Structured Content Area with Format Toolbar and Live Preview -->
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <label class="block text-xs font-semibold text-[var(--color-text)]">
            Konten Halaman (Formatting Format HTML Safe) *
          </label>
          <div class="flex items-center gap-1 bg-[var(--color-bg)] border border-[var(--color-border)] p-0.5 rounded-lg text-[11px]">
            <button
              type="button"
              onclick={() => (editorTab = 'code')}
              class={`px-2.5 py-1 rounded-md font-medium transition ${
                editorTab === 'code'
                  ? 'bg-[var(--color-primary)] text-white shadow-sm'
                  : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-text)]'
              }`}
            >
              Editor HTML
            </button>
            <button
              type="button"
              onclick={() => (editorTab = 'preview')}
              class={`px-2.5 py-1 rounded-md font-medium transition flex items-center gap-1 ${
                editorTab === 'preview'
                  ? 'bg-[var(--color-primary)] text-white shadow-sm'
                  : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-text)]'
              }`}
            >
              <Eye class="w-3 h-3" />
              Pratinjau Langsung
            </button>
          </div>
        </div>

        {#if editorTab === 'code'}
          <div class="space-y-2">
            <!-- Formatting Toolbar -->
            <div class="flex flex-wrap items-center gap-1 p-1.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl text-xs text-[var(--color-text)]">
              <button
                type="button"
                onclick={() => insertHtmlTag('<strong>', '</strong>', 'teks tebal')}
                class="px-2 py-1 hover:bg-[var(--color-border)] rounded transition flex items-center gap-1 font-bold text-xs"
                title="Tebal / Bold (<strong>)"
              >
                <Bold class="w-3.5 h-3.5" />
                <span>B</span>
              </button>
              <button
                type="button"
                onclick={() => insertHtmlTag('<em>', '</em>', 'teks miring')}
                class="px-2 py-1 hover:bg-[var(--color-border)] rounded transition flex items-center gap-1 italic text-xs"
                title="Miring / Italic (<em>)"
              >
                <Italic class="w-3.5 h-3.5" />
                <span>I</span>
              </button>
              <div class="w-px h-4 bg-[var(--color-border)] my-auto mx-0.5"></div>
              <button
                type="button"
                onclick={() => insertHtmlTag('<h2>', '</h2>', 'Judul Bagian')}
                class="px-2 py-1 hover:bg-[var(--color-border)] rounded transition flex items-center gap-1 font-semibold text-xs"
                title="Judul Utama (<h2>)"
              >
                <Heading2 class="w-3.5 h-3.5" />
                <span>H2</span>
              </button>
              <button
                type="button"
                onclick={() => insertHtmlTag('<h3>', '</h3>', 'Sub Judul Bagian')}
                class="px-2 py-1 hover:bg-[var(--color-border)] rounded transition flex items-center gap-1 font-semibold text-xs"
                title="Sub Judul (<h3>)"
              >
                <Heading3 class="w-3.5 h-3.5" />
                <span>H3</span>
              </button>
              <button
                type="button"
                onclick={() => insertHtmlTag('<p>', '</p>', 'Teks paragraf baru...')}
                class="px-2 py-1 hover:bg-[var(--color-border)] rounded transition font-mono text-xs"
                title="Paragraf (<p>)"
              >
                &lt;p&gt;
              </button>
              <div class="w-px h-4 bg-[var(--color-border)] my-auto mx-0.5"></div>
              <button
                type="button"
                onclick={() => insertHtmlTag('<ul>\n  <li>', '</li>\n  <li>Poin kedua</li>\n</ul>', 'Poin pertama')}
                class="px-2 py-1 hover:bg-[var(--color-border)] rounded transition flex items-center gap-1 text-xs"
                title="Daftar Simbol (<ul><li>)"
              >
                <List class="w-3.5 h-3.5" />
                <span>Daftar Poin</span>
              </button>
              <button
                type="button"
                onclick={() => insertHtmlTag('<ol>\n  <li>', '</li>\n  <li>Langkah kedua</li>\n</ol>', 'Langkah pertama')}
                class="px-2 py-1 hover:bg-[var(--color-border)] rounded transition flex items-center gap-1 text-xs"
                title="Daftar Angka (<ol><li>)"
              >
                <ListOrdered class="w-3.5 h-3.5" />
                <span>Daftar Nomor</span>
              </button>
              <button
                type="button"
                onclick={() => insertHtmlTag('<blockquote>', '</blockquote>', 'Kutipan maklumat resmi Puskesmas...')}
                class="px-2 py-1 hover:bg-[var(--color-border)] rounded transition flex items-center gap-1 text-xs"
                title="Kutipan Maklumat (<blockquote>)"
              >
                <Quote class="w-3.5 h-3.5" />
                <span>Kutipan</span>
              </button>
              <button
                type="button"
                onclick={() => insertHtmlTag('<table border="1">\n  <thead>\n    <tr><th>Kolom 1</th><th>Kolom 2</th></tr>\n  </thead>\n  <tbody>\n    <tr><td>Data 1</td><td>Data 2</td></tr>\n  </tbody>\n</table>', '')}
                class="px-2 py-1 hover:bg-[var(--color-border)] rounded transition flex items-center gap-1 text-xs"
                title="Tabel Data (<table>)"
              >
                <TableIcon class="w-3.5 h-3.5" />
                <span>Tabel</span>
              </button>
              <button
                type="button"
                onclick={() => insertHtmlTag('<a href="https://" target="_blank" rel="noopener noreferrer">', '</a>', 'Teks Tautan')}
                class="px-2 py-1 hover:bg-[var(--color-border)] rounded transition flex items-center gap-1 text-xs"
                title="Tautan / Link (<a>)"
              >
                <LinkIcon class="w-3.5 h-3.5" />
                <span>Tautan</span>
              </button>
              <button
                type="button"
                onclick={() => insertHtmlTag('\n<hr />\n', '')}
                class="px-2 py-1 hover:bg-[var(--color-border)] rounded transition text-xs font-mono"
                title="Garis Pemisah (<hr />)"
              >
                &lt;hr /&gt;
              </button>
              <button
                type="button"
                onclick={insertStarterTemplate}
                class="ml-auto px-2.5 py-1 bg-[var(--color-primary)]/10 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20 rounded-lg transition flex items-center gap-1 text-[11px] font-semibold"
                title="Sisipkan struktur format HTML lengkap"
              >
                <LayoutTemplate class="w-3 h-3" />
                <span>+ Template Lengkap</span>
              </button>
            </div>

            <textarea
              bind:this={textareaEl}
              rows={9}
              value={editingPage.content || ''}
              oninput={(e) => patchEditingPage({ content: e.currentTarget.value })}
              placeholder="Gunakan tag HTML atau klik tombol format di atas (<h2>, <p>, <ul>, <li>, <strong>, <table>)..."
              class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)]/70 focus:outline-none rounded-2xl p-4 text-xs text-[var(--color-text)] placeholder-zinc-500 font-mono leading-relaxed"
              required
            ></textarea>
            <div class="flex items-center justify-between text-[11px] text-[var(--color-muted-foreground)]">
              <span>Sanitasi XSS aktif otomatis. Tag formatting aman: &lt;h1-h6&gt;, &lt;p&gt;, &lt;ul&gt;, &lt;ol&gt;, &lt;strong&gt;, &lt;em&gt;, &lt;blockquote&gt;, &lt;table&gt;.</span>
              <span class="font-mono">{(editingPage.content || '').length} karakter</span>
            </div>
          </div>
        {:else}
          <div class="border border-[var(--color-border)] bg-[var(--color-bg)] rounded-2xl p-5 min-h-[220px] max-h-[350px] overflow-y-auto">
            {#if editingPage.content}
              <div class="html-safe-content">
                {@html formatSafeHtml(editingPage.content)}
              </div>
            {:else}
              <div class="text-center py-10 text-xs text-[var(--color-muted-foreground)]">
                Belum ada konten ditulis. Beralih ke tab Editor HTML untuk menulis konten.
              </div>
            {/if}
          </div>
        {/if}
      </div>

      <!-- SEO Engine Metadata Collapsible -->
      <div class="border border-[var(--color-border)] rounded-2xl p-4 bg-[var(--color-bg)]/50 space-y-4">
        <div class="flex items-center gap-2 text-xs font-bold text-[var(--color-primary)] uppercase tracking-widest">
          <Sparkles class="w-4 h-4" />
          <span>Pengaturan Mesin SEO & Metatag</span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Judul SEO (SEO Title)"
            placeholder="KOSONG = Menggunakan Judul Halaman Utama"
            value={editingPage.seoTitle || ''}
            oninput={(e) => patchEditingPage({ seoTitle: e.currentTarget.value })}
          />

          <Input
            label="Deskripsi Meta (SEO Meta Description)"
            placeholder="Deskripsi untuk hasil pencarian Google..."
            value={editingPage.seoDescription || ''}
            oninput={(e) => patchEditingPage({ seoDescription: e.currentTarget.value })}
          />
        </div>
      </div>
    </form>
  {/if}
</Modal>

<!-- Page Preview Modal -->
<Modal
  isOpen={!!previewPage}
  onClose={() => (previewPage = null)}
  title={`Pratinjau Publik: ${previewPage?.title}`}
  size="2xl"
>
  {#if previewPage}
    <div class="space-y-6">
      <div class="p-4 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl flex items-center justify-between text-xs">
        <div class="flex items-center gap-2 text-[var(--color-primary)] font-mono">
          <Globe class="w-4 h-4" />
          <span>https://puskesmas.go.id/{previewPage.slug}</span>
        </div>
        <Badge variant={statusVariant(previewPage.status)}>{statusLabel(previewPage.status)}</Badge>
      </div>

      {#if previewPage.featuredImage}
        <img
          src={previewPage.featuredImage}
          alt={previewPage.title}
          class="w-full h-56 object-cover rounded-2xl border border-[var(--color-border)]"
        />
      {/if}

      <div class="space-y-2">
        <h1 class="text-2xl font-light text-[var(--color-text)]">{previewPage.title}</h1>
        <p class="text-xs text-[var(--color-primary)] italic">{previewPage.excerpt}</p>
      </div>

      <div class="html-safe-content text-sm text-[var(--color-text)] leading-relaxed space-y-4 pt-4 border-t border-[var(--color-border)]">
        {@html formatSafeHtml(previewPage.content)}
      </div>
    </div>
  {/if}
</Modal>

<!-- Revisions History Modal -->
<Modal
  isOpen={revisionsModalOpen}
  onClose={() => (revisionsModalOpen = false)}
  title={`Riwayat Versi Halaman: ${selectedRevisionPageTitle}`}
>
  <div class="space-y-3 max-h-96 overflow-y-auto pr-1">
    {#if revisions.length === 0}
      <div class="p-6 text-center text-[var(--color-muted-foreground)] text-xs">
        Belum ada riwayat revisi tersimpan untuk halaman ini.
      </div>
    {:else}
      {#each revisions as rev (rev.id)}
        <div class="p-3 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl space-y-2">
          <div class="flex items-center justify-between text-xs">
            <span class="font-bold text-[var(--color-primary)]">Versi v{rev.version}</span>
            <span class="text-[10px] text-[var(--color-muted-foreground)]">
              {new Date(rev.modifiedAt).toLocaleString('id-ID')}
            </span>
          </div>
          <div class="text-xs text-[var(--color-text)] font-semibold">{rev.title}</div>
          <div class="text-[10px] text-[var(--color-muted-foreground)]">Diperbarui oleh {rev.modifiedBy.name}</div>
        </div>
      {/each}
    {/if}
  </div>
</Modal>

<!-- Delete Confirmation Modal -->
<ConfirmModal
  isOpen={deleteModalOpen}
  onClose={() => (deleteModalOpen = false)}
  onConfirm={handleDelete}
  isLoading={saving}
  title="Hapus Halaman Dinamis"
  message={`Apakah Anda yakin ingin menghapus halaman "${pageToDelete?.title}"? Slug /${pageToDelete?.slug} tidak akan dapat diakses lagi.`}
/>
