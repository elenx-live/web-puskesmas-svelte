<!-- @component Manajemen taksonomi: kategori konten (berita/dokumen/layanan) dan tagar kata kunci. -->
<script lang="ts">
  import Card from '../../../shared/ui/Card.svelte';
  import Button from '../../../shared/ui/Button.svelte';
  import Input from '../../../shared/ui/Input.svelte';
  import Select from '../../../shared/ui/Select.svelte';
  import Badge from '../../../shared/ui/Badge.svelte';
  import Modal from '../../../shared/ui/Modal.svelte';
  import { authStore } from '../../../shared/stores/auth.svelte.js';
  import { toastStore } from '../../../shared/stores/toast.svelte.js';
  import { categoryService } from '../../../shared/services/categoryService.js';
  import { tagService } from '../../../shared/services/tagService.js';
  import type { CategoryEntity, TagEntity } from '../../../shared/types/index.js';
  import {
    FolderTree,
    Tag as TagIcon,
    Plus,
    Trash2,
    Edit2,
    Search,
    Layers,
    FileText,
    CheckCircle2,
    AlertTriangle,
    RefreshCw
  } from 'lucide-svelte';

  const showToast = toastStore.showToast.bind(toastStore);

  let categories = $state<CategoryEntity[]>([]);
  let tags = $state<TagEntity[]>([]);
  let loading = $state(true);
  let actionLoading = $state(false);

  // Filters
  let searchCat = $state('');
  let selectedType = $state<string>('all');
  let searchTag = $state('');

  // Category Add/Edit Modal
  let catModalOpen = $state(false);
  let editingCategory = $state<CategoryEntity | null>(null);
  let catName = $state('');
  let catSlug = $state('');
  let catDesc = $state('');
  let catType = $state<'post' | 'document' | 'service'>('post');
  let catOrder = $state(1);

  // Delete Category Modal
  let deleteModalOpen = $state(false);
  let catToDelete = $state<CategoryEntity | null>(null);

  // Tag Form
  let newTagName = $state('');

  async function loadData() {
    loading = true;
    try {
      const [catList, tagList] = await Promise.all([
        categoryService.getCategories(),
        tagService.getTags()
      ]);
      categories = catList;
      tags = tagList;
    } catch {
      showToast('Gagal memuat taksonomi kategori', 'error');
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    loadData();
  });

  function openAddModal() {
    editingCategory = null;
    catName = '';
    catSlug = '';
    catDesc = '';
    catType = selectedType === 'all' ? 'post' : (selectedType as 'post' | 'document' | 'service');
    catOrder = categories.length + 1;
    catModalOpen = true;
  }

  function openEditModal(cat: CategoryEntity) {
    editingCategory = cat;
    catName = cat.name;
    catSlug = cat.slug;
    catDesc = cat.description || '';
    catType = cat.type as 'post' | 'document' | 'service';
    catOrder = cat.order || 1;
    catModalOpen = true;
  }

  function handleNameInput(val: string) {
    catName = val;
    if (!editingCategory) {
      const autoSlug = val
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-');
      catSlug = autoSlug;
    }
  }

  async function handleSaveCategory(e: Event) {
    e.preventDefault();
    if (!catName.trim()) {
      showToast('Nama kategori wajib diisi.', 'error');
      return;
    }

    actionLoading = true;
    try {
      if (editingCategory) {
        await categoryService.updateCategory(editingCategory.id, {
          name: catName.trim(),
          slug: catSlug.trim() || undefined,
          description: catDesc.trim(),
          type: catType,
          order: Number(catOrder) || 1
        });
        showToast(`Kategori "${catName}" berhasil diperbarui.`);
      } else {
        await categoryService.addCategory({
          name: catName.trim(),
          slug: catSlug.trim() || undefined,
          description: catDesc.trim(),
          type: catType,
          order: Number(catOrder) || categories.length + 1
        });
        showToast(`Kategori "${catName}" berhasil ditambahkan.`);
      }
      catModalOpen = false;
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Gagal menyimpan kategori', 'error');
    } finally {
      actionLoading = false;
    }
  }

  function confirmDeleteCategory(cat: CategoryEntity) {
    catToDelete = cat;
    deleteModalOpen = true;
  }

  async function handleDeleteCategory() {
    if (!catToDelete) return;

    actionLoading = true;
    try {
      await categoryService.deleteCategory(catToDelete.id);
      showToast(`Kategori "${catToDelete.name}" berhasil dihapus.`);
      deleteModalOpen = false;
      catToDelete = null;
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Gagal menghapus kategori', 'error');
    } finally {
      actionLoading = false;
    }
  }

  async function handleAddTag(e: Event) {
    e.preventDefault();
    if (!newTagName.trim()) return;

    try {
      await tagService.addOrGetTag(newTagName.trim());
      showToast(`Tag #${newTagName} berhasil ditambahkan.`);
      newTagName = '';
      await loadData();
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  }

  async function handleDeleteTag(id: string, name: string) {
    try {
      await tagService.deleteTag(id);
      showToast(`Tag #${name} berhasil dihapus.`);
      await loadData();
    } catch {
      showToast('Gagal menghapus tag', 'error');
    }
  }

  const filteredCategories = $derived(
    categories.filter((c) => {
      const matchSearch =
        !searchCat.trim() ||
        c.name.toLowerCase().includes(searchCat.toLowerCase()) ||
        c.slug.toLowerCase().includes(searchCat.toLowerCase()) ||
        (c.description && c.description.toLowerCase().includes(searchCat.toLowerCase()));

      const matchType = selectedType === 'all' || c.type === selectedType;

      return matchSearch && matchType;
    })
  );

  const filteredTags = $derived.by(() => {
    if (!searchTag.trim()) return tags;
    const q = searchTag.toLowerCase();
    return tags.filter((t) => t.name.toLowerCase().includes(q));
  });

  const postCount = $derived(categories.filter((c) => c.type === 'post').length);
  const docCount = $derived(categories.filter((c) => c.type === 'document').length);
  const serviceCount = $derived(categories.filter((c) => c.type === 'service').length);

  function typeVariant(type: string): 'amber' | 'sky' | 'emerald' {
    return type === 'post' ? 'amber' : type === 'document' ? 'sky' : 'emerald';
  }

  function typeLabel(type: string): string {
    return type === 'post' ? 'Berita' : type === 'document' ? 'Dokumen' : 'Layanan';
  }
</script>

<!-- Overview Stat Cards -->
<div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
  <div
    onclick={() => (selectedType = 'all')}
    class={`p-4 rounded-3xl border transition cursor-pointer ${
      selectedType === 'all'
        ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/50 ring-2 ring-[var(--color-primary)]/30'
        : 'bg-[var(--color-card)] border-[var(--color-border)] hover:border-[var(--color-primary)]/40'
    }`}
  >
    <div class="flex items-center justify-between">
      <span class="text-xs font-semibold text-[var(--color-muted-foreground)]">Semua Kategori</span>
      <FolderTree class="w-4 h-4 text-[var(--color-primary)]" />
    </div>
    <div class="text-2xl font-black text-[var(--color-text)] mt-1">{categories.length}</div>
    <div class="text-[10px] text-[var(--color-muted-foreground)] mt-0.5">Total klasifikasi aktif</div>
  </div>

  <div
    onclick={() => (selectedType = 'post')}
    class={`p-4 rounded-3xl border transition cursor-pointer ${
      selectedType === 'post'
        ? 'bg-amber-500/10 border-amber-500/50 ring-2 ring-amber-500/30'
        : 'bg-[var(--color-card)] border-[var(--color-border)] hover:border-amber-500/40'
    }`}
  >
    <div class="flex items-center justify-between">
      <span class="text-xs font-semibold text-[var(--color-muted-foreground)]">Kategori Berita</span>
      <FileText class="w-4 h-4 text-amber-500" />
    </div>
    <div class="text-2xl font-black text-[var(--color-text)] mt-1">{postCount}</div>
    <div class="text-[10px] text-[var(--color-muted-foreground)] mt-0.5">Artikel, liputan & edukasi</div>
  </div>

  <div
    onclick={() => (selectedType = 'document')}
    class={`p-4 rounded-3xl border transition cursor-pointer ${
      selectedType === 'document'
        ? 'bg-sky-500/10 border-sky-500/50 ring-2 ring-sky-500/30'
        : 'bg-[var(--color-card)] border-[var(--color-border)] hover:border-sky-500/40'
    }`}
  >
    <div class="flex items-center justify-between">
      <span class="text-xs font-semibold text-[var(--color-muted-foreground)]">Kategori Dokumen</span>
      <Layers class="w-4 h-4 text-sky-500" />
    </div>
    <div class="text-2xl font-black text-[var(--color-text)] mt-1">{docCount}</div>
    <div class="text-[10px] text-[var(--color-muted-foreground)] mt-0.5">Regulasi, SOP & formulir</div>
  </div>

  <div
    onclick={() => (selectedType = 'service')}
    class={`p-4 rounded-3xl border transition cursor-pointer ${
      selectedType === 'service'
        ? 'bg-emerald-500/10 border-emerald-500/50 ring-2 ring-emerald-500/30'
        : 'bg-[var(--color-card)] border-[var(--color-border)] hover:border-emerald-500/40'
    }`}
  >
    <div class="flex items-center justify-between">
      <span class="text-xs font-semibold text-[var(--color-muted-foreground)]">Kategori Layanan</span>
      <CheckCircle2 class="w-4 h-4 text-emerald-500" />
    </div>
    <div class="text-2xl font-black text-[var(--color-text)] mt-1">{serviceCount}</div>
    <div class="text-[10px] text-[var(--color-muted-foreground)] mt-0.5">Poli & klaster pelayanan</div>
  </div>
</div>

<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
  <!-- Main Categories Section (2 Columns) -->
  <div class="lg:col-span-2 space-y-4">
    <Card class="space-y-4 p-5">
      <!-- Header & Controls -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--color-border)]">
        <div>
          <div class="flex items-center gap-2 text-[var(--color-text)] font-bold text-sm">
            <FolderTree class="w-4 h-4 text-[var(--color-primary)]" />
            <span>Daftar Kategori Konten</span>
          </div>
          <p class="text-[11px] text-[var(--color-muted-foreground)] mt-0.5">
            Menampilkan {filteredCategories.length} dari {categories.length} kategori
          </p>
        </div>

        <div class="flex items-center gap-2">
          <Button variant="ghost" size="sm" onclick={loadData} disabled={loading} title="Segarkan Data">
            <RefreshCw class={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="primary" size="sm" onclick={openAddModal}>
            <Plus class="w-3.5 h-3.5" />
            <span>Tambah Kategori</span>
          </Button>
        </div>
      </div>

      <!-- Filter Tabs & Search -->
      <div class="flex flex-col sm:flex-row items-center gap-3">
        <div class="relative flex-1 w-full">
          <Search class="absolute left-3 top-2.5 w-3.5 h-3.5 text-[var(--color-muted-foreground)]" />
          <input
            type="text"
            placeholder="Cari nama kategori atau slug..."
            bind:value={searchCat}
            class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)]/70 focus:outline-none rounded-2xl pl-9 pr-3 py-2 text-xs text-[var(--color-text)] placeholder-zinc-500"
          />
        </div>

        <div class="flex items-center gap-1 p-1 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl w-full sm:w-auto overflow-x-auto">
          <button
            type="button"
            onclick={() => (selectedType = 'all')}
            class={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              selectedType === 'all'
                ? 'bg-[var(--color-card)] text-[var(--color-primary)] shadow-sm'
                : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-text)]'
            }`}
          >
            Semua
          </button>
          <button
            type="button"
            onclick={() => (selectedType = 'post')}
            class={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              selectedType === 'post'
                ? 'bg-[var(--color-card)] text-amber-500 shadow-sm'
                : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-text)]'
            }`}
          >
            Berita ({postCount})
          </button>
          <button
            type="button"
            onclick={() => (selectedType = 'document')}
            class={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              selectedType === 'document'
                ? 'bg-[var(--color-card)] text-sky-500 shadow-sm'
                : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-text)]'
            }`}
          >
            Dokumen ({docCount})
          </button>
          <button
            type="button"
            onclick={() => (selectedType = 'service')}
            class={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              selectedType === 'service'
                ? 'bg-[var(--color-card)] text-emerald-500 shadow-sm'
                : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-text)]'
            }`}
          >
            Layanan ({serviceCount})
          </button>
        </div>
      </div>

      <!-- Category List Items -->
      {#if loading}
        <div class="py-12 text-center text-xs text-[var(--color-muted-foreground)]">
          <RefreshCw class="w-5 h-5 animate-spin mx-auto mb-2 text-[var(--color-primary)]" />
          Memuat data kategori...
        </div>
      {:else if filteredCategories.length === 0}
        <div class="py-12 text-center text-xs text-[var(--color-muted-foreground)] bg-[var(--color-bg)] rounded-2xl border border-dashed border-[var(--color-border)]">
          Tidak ada kategori yang cocok dengan filter.
        </div>
      {:else}
        <div class="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
          {#each filteredCategories as cat (cat.id)}
            <div class="group flex items-center justify-between p-3.5 bg-[var(--color-bg)] hover:bg-[var(--color-card)] border border-[var(--color-border)] hover:border-[var(--color-primary)]/40 rounded-2xl transition shadow-sm">
              <div class="flex-1 min-w-0 pr-3">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="font-bold text-[var(--color-text)] text-xs truncate">
                    {cat.name}
                  </span>
                  <Badge variant={typeVariant(cat.type)}>
                    {typeLabel(cat.type)}
                  </Badge>
                  <span class="text-[10px] font-mono text-[var(--color-muted-foreground)] bg-[var(--color-card)] px-2 py-0.5 rounded-lg border border-[var(--color-border)]">
                    /{cat.slug}
                  </span>
                </div>
                <div class="text-[11px] text-[var(--color-muted-foreground)] mt-1 line-clamp-1">
                  {cat.description || 'Tidak ada deskripsi tambahan.'}
                </div>
              </div>

              <div class="flex items-center gap-1.5 shrink-0">
                <button
                  onclick={() => openEditModal(cat)}
                  class="p-2 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]/40 transition"
                  title="Edit Kategori"
                >
                  <Edit2 class="w-3.5 h-3.5" />
                </button>
                <button
                  onclick={() => confirmDeleteCategory(cat)}
                  class="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition"
                  title="Hapus Kategori"
                >
                  <Trash2 class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </Card>
  </div>

  <!-- Tags Section (1 Column) -->
  <div class="space-y-4">
    <Card class="space-y-4 p-5">
      <div class="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
        <div class="flex items-center gap-2 text-[var(--color-text)] font-bold text-sm">
          <TagIcon class="w-4 h-4 text-[var(--color-primary)]" />
          <span>Tagar & Kata Kunci Konten</span>
        </div>
        <Badge variant="amber">{tags.length} Tag</Badge>
      </div>

      <form onsubmit={handleAddTag} class="flex gap-2">
        <input
          type="text"
          placeholder="Nama tag baru (contoh: Imunisasi, Posyandu)..."
          bind:value={newTagName}
          class="flex-1 bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)]/70 focus:outline-none rounded-2xl px-3 py-2 text-xs text-[var(--color-text)] placeholder-zinc-500"
        />
        <Button type="submit" variant="primary" size="sm">
          <Plus class="w-3.5 h-3.5" />
          <span>Tambah</span>
        </Button>
      </form>

      <div class="relative">
        <Search class="absolute left-3 top-2.5 w-3.5 h-3.5 text-[var(--color-muted-foreground)]" />
        <input
          type="text"
          placeholder="Saring tagar..."
          bind:value={searchTag}
          class="w-full bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)]/70 focus:outline-none rounded-2xl pl-9 pr-3 py-1.5 text-xs text-[var(--color-text)] placeholder-zinc-500"
        />
      </div>

      <div class="flex flex-wrap gap-2 pt-2 max-h-[420px] overflow-y-auto">
        {#each filteredTags as tag (tag.id)}
          <div class="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-bg)] border border-[var(--color-border)] hover:border-[var(--color-primary)]/40 rounded-2xl text-xs font-mono transition">
            <span class="text-[var(--color-primary)] font-bold">#{tag.name}</span>
            {#if tag.usageCount > 0}
              <span class="text-[10px] text-[var(--color-muted-foreground)]">({tag.usageCount})</span>
            {/if}
            <button
              onclick={() => handleDeleteTag(tag.id, tag.name)}
              class="text-[var(--color-muted-foreground)] hover:text-red-400 p-0.5 ml-0.5 transition"
              title="Hapus Tag"
            >
              ×
            </button>
          </div>
        {/each}
        {#if filteredTags.length === 0}
          <div class="w-full text-center py-6 text-xs text-[var(--color-muted-foreground)]">
            Belum ada tagar yang terdaftar.
          </div>
        {/if}
      </div>
    </Card>
  </div>
</div>

<!-- Add / Edit Category Modal -->
<Modal
  isOpen={catModalOpen}
  onClose={() => (catModalOpen = false)}
  title={editingCategory ? 'Edit Kategori Konten' : 'Tambah Kategori Baru'}
>
  {#snippet footer()}
    <Button variant="secondary" onclick={() => (catModalOpen = false)}>
      Batal
    </Button>
    <Button variant="primary" onclick={handleSaveCategory} disabled={actionLoading}>
      {actionLoading ? 'Menyimpan...' : editingCategory ? 'Simpan Perubahan' : 'Tambah Kategori'}
    </Button>
  {/snippet}

  <form onsubmit={handleSaveCategory} class="space-y-4">
    <Input
      label="Nama Kategori *"
      placeholder="Contoh: Edukasi Kesehatan"
      value={catName}
      oninput={(e) => handleNameInput(e.currentTarget.value)}
      required
    />

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Input
        label="Slug URL"
        placeholder="edukasi-kesehatan"
        bind:value={catSlug}
      />

      <Select
        label="Peruntukan Modul *"
        bind:value={catType}
        options={[
          { value: 'post', label: 'Modul Berita & Artikel' },
          { value: 'document', label: 'Modul Dokumen Publik' },
          { value: 'service', label: 'Modul Layanan Spesialis' }
        ]}
      />
    </div>

    <Input
      label="Urutan Tampilan (Display Order)"
      type="number"
      value={catOrder}
      oninput={(e) => (catOrder = Number(e.currentTarget.value))}
    />

    <div class="flex flex-col gap-1.5">
      <label class="text-[10px] uppercase font-bold tracking-widest text-[var(--color-muted-foreground)]">
        Deskripsi Kategori
      </label>
      <textarea
        rows={3}
        placeholder="Keterangan singkat tentang cakupan kategori ini..."
        bind:value={catDesc}
        class="bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-primary)]/70 focus:outline-none rounded-2xl p-3 text-xs text-[var(--color-text)] placeholder-zinc-500 resize-none"
      ></textarea>
    </div>
  </form>
</Modal>

<!-- Delete Confirmation Modal -->
<Modal
  isOpen={deleteModalOpen}
  onClose={() => (deleteModalOpen = false)}
  title="Konfirmasi Hapus Kategori"
>
  {#snippet footer()}
    <Button variant="secondary" onclick={() => (deleteModalOpen = false)}>
      Batal
    </Button>
    <Button variant="danger" onclick={handleDeleteCategory} disabled={actionLoading}>
      {actionLoading ? 'Menghapus...' : 'Ya, Hapus Kategori'}
    </Button>
  {/snippet}

  <div class="space-y-4">
    <div class="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3">
      <AlertTriangle class="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
      <div class="text-xs text-red-200">
        <p class="font-bold">Apakah Anda yakin ingin menghapus kategori ini?</p>
        <p class="mt-1 text-red-300">
          Kategori <strong class="text-white">"{catToDelete?.name}"</strong> ({catToDelete?.type}) akan dihapus secara permanen dari basis data sistem.
        </p>
      </div>
    </div>
    <p class="text-xs text-[var(--color-muted-foreground)] leading-relaxed">
      Artikel atau dokumen yang sebelumnya berada dalam kategori ini akan dialihkan ke kategori default atau berstatus tanpa kategori.
    </p>
  </div>
</Modal>
