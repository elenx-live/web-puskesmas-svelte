<!-- @component Pengelola struktur menu navigasi: hirarki 3 level, tambah/edit/hapus item, dan urut ulang. -->
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
  import { menuService } from '../../../shared/services/menuService.js';
  import { pageService } from '../../../shared/services/pageService.js';
  import type { MenuItem, MenuTreeItem, MenuItemType, PageEntity } from '../../../shared/types/index.js';
  import {
    Menu as MenuIcon,
    Plus,
    Trash2,
    Edit,
    ArrowUp,
    ArrowDown
  } from 'lucide-svelte';

  const showToast = toastStore.showToast.bind(toastStore);

  let menuList = $state<MenuItem[]>([]);
  let menuTree = $state<MenuTreeItem[]>([]);
  let pagesList = $state<PageEntity[]>([]);
  let loading = $state(true);

  // Modal Create/Edit
  let isModalOpen = $state(false);
  let editingItem = $state<Partial<MenuItem> | null>(null);
  let saving = $state(false);

  // Delete Confirm
  let deleteModalOpen = $state(false);
  let itemToDelete = $state<MenuItem | null>(null);

  // Mutasi properti langsung (bukan spread-replace) agar Svelte hanya
  // menginvalidasi properti yang berubah — tidak re-render seluruh form per keystroke.
  const patchEditingItem = (patch: Partial<MenuItem>) => {
    if (!editingItem) return;
    for (const k of Object.keys(patch) as (keyof MenuItem)[]) {
      (editingItem as Record<string, unknown>)[k] = patch[k];
    }
  };

  async function loadData() {
    loading = true;
    try {
      const [menus, tree, pages] = await Promise.all([
        menuService.getMenuList(),
        menuService.getMenuTree(),
        pageService.getPublishedPages()
      ]);
      menuList = menus;
      menuTree = tree;
      pagesList = pages;
    } catch {
      showToast('Gagal memuat struktur menu navigasi', 'error');
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    loadData();
  });

  function handleOpenAdd(parentId?: string) {
    editingItem = {
      label: '',
      type: 'custom',
      url: '/',
      parentId,
      enabled: true,
      openInNewTab: false,
      visibility: 'all'
    };
    isModalOpen = true;
  }

  function handleOpenEdit(item: MenuItem) {
    editingItem = { ...item };
    isModalOpen = true;
  }

  async function handleSave(e: Event) {
    e.preventDefault();
    const user = authStore.user;
    if (!user || !editingItem) return;

    if (!editingItem.label?.trim()) {
      showToast('Label Menu wajib diisi!', 'error');
      return;
    }

    saving = true;
    try {
      if (editingItem.id) {
        await menuService.updateMenuItem(editingItem.id, editingItem, {
          id: user.uid,
          email: user.email,
          name: user.displayName
        });
        showToast(`Menu "${editingItem.label}" berhasil diperbarui.`);
      } else {
        await menuService.addMenuItem(editingItem, {
          id: user.uid,
          email: user.email,
          name: user.displayName
        });
        showToast(`Menu baru "${editingItem.label}" berhasil ditambahkan.`);
      }

      isModalOpen = false;
      editingItem = null;
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Gagal menyimpan menu', 'error');
    } finally {
      saving = false;
    }
  }

  async function handleDelete() {
    const user = authStore.user;
    if (!user || !itemToDelete) return;
    saving = true;
    try {
      await menuService.deleteMenuItem(itemToDelete.id, {
        id: user.uid,
        email: user.email,
        name: user.displayName
      });
      showToast(`Menu "${itemToDelete.label}" dihapus.`);
      deleteModalOpen = false;
      itemToDelete = null;
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Gagal menghapus menu', 'error');
    } finally {
      saving = false;
    }
  }

  async function handleMoveOrder(index: number, direction: 'up' | 'down') {
    const user = authStore.user;
    if (!user) return;
    const items = [...menuList];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const temp = items[index];
    items[index] = items[targetIndex];
    items[targetIndex] = temp;

    const orderedIds = items.map((m) => m.id);
    await menuService.reorderMenus(orderedIds, {
      id: user.uid,
      email: user.email,
      name: user.displayName
    });

    loadData();
  }

  function typeVariant(type: MenuItemType): 'amber' | 'emerald' | 'sky' | 'rose' | 'slate' {
    switch (type) {
      case 'page':
        return 'amber';
      case 'post':
        return 'emerald';
      case 'service':
        return 'sky';
      case 'external':
        return 'rose';
      default:
        return 'slate';
    }
  }

  function typeLabel(type: MenuItemType): string {
    switch (type) {
      case 'page':
        return 'CMS Page';
      case 'post':
        return 'Berita';
      case 'service':
        return 'Layanan';
      case 'external':
        return 'Eksternal';
      default:
        return 'URL Kustom';
    }
  }
</script>

<!-- Header Bar -->
<div class="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[var(--color-card)] border border-[var(--color-border)] p-4 rounded-3xl">
  <div>
    <h2 class="text-sm font-bold text-[var(--color-text)]">Struktur Navigasi Aktif</h2>
    <p class="text-xs text-[var(--color-muted-foreground)]">
      Mendukung submenu bertingkat (maksimal 3 level) dan pautan otomatis ke Halaman CMS.
    </p>
  </div>

  <Button onclick={() => handleOpenAdd()} variant="primary">
    <Plus class="w-4 h-4" />
    Tambah Menu Utama
  </Button>
</div>

<!-- Tree Grid -->
<Card class="p-6 space-y-4">
  {#if loading}
    <div class="p-8 text-center text-[var(--color-muted-foreground)]">Memuat struktur menu...</div>
  {:else if menuTree.length === 0}
    <div class="p-8 text-center text-[var(--color-muted-foreground)]">Belum ada item menu navigasi.</div>
  {:else}
    <div class="space-y-3">
      {#each menuTree as node, index (node.id)}
        <div class="space-y-2">
          <!-- Level 1 (Root) -->
          <div class="flex items-center justify-between p-3.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl group hover:border-[var(--color-primary)]/50 transition">
            <div class="flex items-center gap-3">
              <div class="p-2 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20">
                <MenuIcon class="w-4 h-4" />
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <span class="font-bold text-[var(--color-text)] text-xs">{node.label}</span>
                  <Badge variant={typeVariant(node.type)}>{typeLabel(node.type)}</Badge>
                  {#if !node.enabled}
                    <Badge variant="rose">Disabled</Badge>
                  {/if}
                </div>
                <div class="text-[10px] text-[var(--color-muted-foreground)] font-mono mt-0.5">{node.url}</div>
              </div>
            </div>

            <div class="flex items-center gap-1.5">
              <button
                onclick={() => handleMoveOrder(index, 'up')}
                disabled={index === 0}
                class="p-1.5 rounded-xl bg-[var(--color-card)] text-[var(--color-muted-foreground)] hover:text-[var(--color-text)] disabled:opacity-30"
                title="Naikkan Urutan"
              >
                <ArrowUp class="w-3.5 h-3.5" />
              </button>
              <button
                onclick={() => handleMoveOrder(index, 'down')}
                disabled={index === menuTree.length - 1}
                class="p-1.5 rounded-xl bg-[var(--color-card)] text-[var(--color-muted-foreground)] hover:text-[var(--color-text)] disabled:opacity-30"
                title="Turunkan Urutan"
              >
                <ArrowDown class="w-3.5 h-3.5" />
              </button>

              <button
                onclick={() => handleOpenAdd(node.id)}
                class="p-1.5 rounded-xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20 transition"
                title="Tambah Submenu"
              >
                <Plus class="w-3.5 h-3.5" />
              </button>

              <button
                onclick={() => handleOpenEdit(node)}
                class="p-1.5 rounded-xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20 transition"
                title="Edit Menu"
              >
                <Edit class="w-3.5 h-3.5" />
              </button>

              <button
                onclick={() => {
                  itemToDelete = node;
                  deleteModalOpen = true;
                }}
                class="p-1.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition"
                title="Hapus Menu"
              >
                <Trash2 class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <!-- Level 2 Submenus -->
          {#if node.children && node.children.length > 0}
            <div class="pl-6 space-y-2 border-l-2 border-[var(--color-primary)]/20 ml-4">
              {#each node.children as child (child.id)}
                <div class="space-y-2">
                  <div class="flex items-center justify-between p-3 bg-[var(--color-card)]/60 border border-[var(--color-border)] rounded-2xl group hover:border-[var(--color-primary)]/40 transition">
                    <div class="flex items-center gap-2">
                      <span class="text-[var(--color-muted-foreground)] font-mono text-xs">└─</span>
                      <div>
                        <div class="flex items-center gap-2">
                          <span class="font-semibold text-[var(--color-text)] text-xs">{child.label}</span>
                          <Badge variant={typeVariant(child.type)}>{typeLabel(child.type)}</Badge>
                          {#if !child.enabled}
                            <Badge variant="rose">Disabled</Badge>
                          {/if}
                        </div>
                        <div class="text-[10px] text-[var(--color-muted-foreground)] font-mono">{child.url}</div>
                      </div>
                    </div>

                    <div class="flex items-center gap-1.5">
                      <button
                        onclick={() => handleOpenAdd(child.id)}
                        class="p-1.5 rounded-xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20 transition"
                        title="Tambah Sub Child Menu"
                      >
                        <Plus class="w-3.5 h-3.5" />
                      </button>
                      <button
                        onclick={() => handleOpenEdit(child)}
                        class="p-1.5 rounded-xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 text-[var(--color-primary)]"
                        title="Edit Menu"
                      >
                        <Edit class="w-3.5 h-3.5" />
                      </button>
                      <button
                        onclick={() => {
                          itemToDelete = child;
                          deleteModalOpen = true;
                        }}
                        class="p-1.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition"
                        title="Hapus Menu"
                      >
                        <Trash2 class="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <!-- Level 3 Sub-children -->
                  {#if child.children && child.children.length > 0}
                    <div class="pl-6 space-y-1.5 border-l-2 border-[var(--color-primary)]/10 ml-4">
                      {#each child.children as subChild (subChild.id)}
                        <div class="flex items-center justify-between p-2.5 bg-[var(--color-bg)]/80 border border-[var(--color-border)] rounded-xl">
                          <div class="flex items-center gap-2">
                            <span class="text-[var(--color-muted-foreground)] font-mono text-[10px]">└──</span>
                            <div>
                              <div class="flex items-center gap-1.5">
                                <span class="font-medium text-[var(--color-text)] text-xs">{subChild.label}</span>
                                <Badge variant={typeVariant(subChild.type)}>{typeLabel(subChild.type)}</Badge>
                                {#if !subChild.enabled}
                                  <Badge variant="rose">Disabled</Badge>
                                {/if}
                              </div>
                              <div class="text-[10px] text-[var(--color-muted-foreground)] font-mono">{subChild.url}</div>
                            </div>
                          </div>

                          <div class="flex items-center gap-1.5">
                            <button
                              onclick={() => handleOpenEdit(subChild)}
                              class="p-1.5 rounded-xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 text-[var(--color-primary)]"
                              title="Edit Sub Child"
                            >
                              <Edit class="w-3 h-3" />
                            </button>
                            <button
                              onclick={() => {
                                itemToDelete = subChild;
                                deleteModalOpen = true;
                              }}
                              class="p-1.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400"
                              title="Hapus Sub Child"
                            >
                              <Trash2 class="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      {/each}
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</Card>

<!-- Add / Edit Modal -->
<Modal
  isOpen={isModalOpen}
  onClose={() => (isModalOpen = false)}
  title={editingItem?.id ? 'Edit Item Navigasi' : 'Tambah Item Navigasi Baru'}
>
  {#snippet footer()}
    <Button variant="secondary" onclick={() => (isModalOpen = false)}>
      Batal
    </Button>
    <Button variant="primary" onclick={handleSave} isLoading={saving}>
      Simpan Menu
    </Button>
  {/snippet}

  {#if editingItem}
  {#key editingItem.id || 'new'}
    <form onsubmit={handleSave} class="space-y-4">
      <Input
        label="Label Menu *"
        placeholder="Contoh: Sejarah & Perkembangan"
        defaultValue={editingItem.label || ''}
        oninput={(e) => patchEditingItem({ label: e.currentTarget.value })}
        required
      />

      <Select
        label="Induk Menu (Parent / Submenu)"
        value={editingItem.parentId || ''}
        onchange={(e) => patchEditingItem({ parentId: e.currentTarget.value || undefined })}
        options={[
          { value: '', label: '-- Menu Utama (Tingkat Teratas / Root) --' },
          ...menuList
            .filter((m) => m.id !== editingItem.id)
            .map((m) => ({
              value: m.id,
              label: `${m.parentId ? '   ↳ ' : '📁 '}${m.label}`
            }))
        ]}
      />

      <Select
        label="Tipe Target Link"
        value={editingItem.type || 'custom'}
        onchange={(e) => patchEditingItem({ type: e.currentTarget.value as MenuItemType })}
        options={[
          { value: 'page', label: 'Halaman CMS Dinamis' },
          { value: 'post', label: 'Modul Berita & Artikel (/berita)' },
          { value: 'service', label: 'Modul Layanan (/layanan)' },
          { value: 'external', label: 'Tautan Eksternal' },
          { value: 'custom', label: 'URL Kustom Manual' }
        ]}
      />

      {#if editingItem.type === 'page'}
        <Select
          label="Pilih Halaman CMS *"
          value={editingItem.targetId || ''}
          onchange={(e) => {
            const targetId = e.currentTarget.value;
            const selectedPage = pagesList.find((p) => p.id === targetId);
            patchEditingItem({
              targetId,
              url: selectedPage ? `/${selectedPage.slug}` : '/'
            });
          }}
          options={[
            { value: '', label: '-- Pilih Halaman Terpublikasi --' },
            ...pagesList.map((p) => ({ value: p.id, label: `${p.title} (/${p.slug})` }))
          ]}
        />
      {:else}
        <Input
          label="Tautan / Path URL *"
          placeholder="/profil atau https://..."
          defaultValue={editingItem.url || ''}
          oninput={(e) => patchEditingItem({ url: e.currentTarget.value })}
          required
        />
      {/if}

      <div class="flex items-center gap-4 pt-2">
        <label class="flex items-center gap-2 text-xs text-[var(--color-text)] cursor-pointer">
          <input
            type="checkbox"
            checked={editingItem.enabled ?? true}
            onchange={(e) => patchEditingItem({ enabled: e.currentTarget.checked })}
            class="rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
          />
          <span>Aktifkan Menu</span>
        </label>

        <label class="flex items-center gap-2 text-xs text-[var(--color-text)] cursor-pointer">
          <input
            type="checkbox"
            checked={!!editingItem.openInNewTab}
            onchange={(e) => patchEditingItem({ openInNewTab: e.currentTarget.checked })}
            class="rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
          />
          <span>Buka di Tab Baru</span>
        </label>
      </div>
    </form>
  {/key}
  {/if}
</Modal>

<!-- Delete Confirmation -->
<ConfirmModal
  isOpen={deleteModalOpen}
  onClose={() => (deleteModalOpen = false)}
  onConfirm={handleDelete}
  isLoading={saving}
  title="Hapus Item Menu"
  message={`Apakah Anda yakin ingin menghapus item menu "${itemToDelete?.label}"? Submenu di dalamnya akan diatur ulang.`}
/>
