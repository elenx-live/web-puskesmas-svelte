import type { MenuItem, MenuTreeItem, MenuItemType } from '../types/index.js';
import { auditService } from './auditService';
import { getCollectionData, saveDocumentData, deleteDocumentData } from '../lib/firebase';

const FIRESTORE_COLLECTION = 'menus';
const MENUS_STORAGE_KEY = 'puskesmas_cms_menus';

export const INITIAL_MENUS: MenuItem[] = [
  {
    id: 'menu-home',
    label: 'Beranda',
    type: 'custom',
    url: '/',
    order: 1,
    enabled: true,
    openInNewTab: false,
    visibility: 'all',
    createdAt: new Date().toISOString()
  },
  {
    id: 'menu-profil',
    label: 'Profil Puskesmas',
    type: 'page',
    targetId: 'page-sejarah',
    url: '/profil',
    order: 2,
    enabled: true,
    openInNewTab: false,
    visibility: 'all',
    createdAt: new Date().toISOString()
  },
  {
    id: 'menu-sejarah',
    label: 'Sejarah & Perkembangan',
    type: 'page',
    targetId: 'page-sejarah',
    url: '/sejarah-puskesmas',
    parentId: 'menu-profil',
    order: 1,
    enabled: true,
    openInNewTab: false,
    visibility: 'all',
    createdAt: new Date().toISOString()
  },
  {
    id: 'menu-visimisi',
    label: 'Visi, Misi & Maklumat',
    type: 'page',
    targetId: 'page-visi-misi',
    url: '/visi-misi',
    parentId: 'menu-profil',
    order: 2,
    enabled: true,
    openInNewTab: false,
    visibility: 'all',
    createdAt: new Date().toISOString()
  },
  {
    id: 'menu-layanan',
    label: 'Layanan Kesehatan',
    type: 'custom',
    url: '/layanan',
    order: 3,
    enabled: true,
    openInNewTab: false,
    visibility: 'all',
    createdAt: new Date().toISOString()
  },
  {
    id: 'menu-berita',
    label: 'Berita & Artikel',
    type: 'custom',
    url: '/berita',
    order: 4,
    enabled: true,
    openInNewTab: false,
    visibility: 'all',
    createdAt: new Date().toISOString()
  },
  {
    id: 'menu-dokumen',
    label: 'Dokumen & Publikasi',
    type: 'custom',
    url: '/dokumen',
    order: 5,
    enabled: true,
    openInNewTab: false,
    visibility: 'all',
    createdAt: new Date().toISOString()
  },
  {
    id: 'menu-galeri',
    label: 'Galeri Foto',
    type: 'custom',
    url: '/galeri',
    order: 6,
    enabled: true,
    openInNewTab: false,
    visibility: 'all',
    createdAt: new Date().toISOString()
  },
  {
    id: 'menu-kontak',
    label: 'Kontak & Lokasi',
    type: 'custom',
    url: '/kontak',
    order: 7,
    enabled: true,
    openInNewTab: false,
    visibility: 'all',
    createdAt: new Date().toISOString()
  },
  {
    id: 'menu-microsites',
    label: 'Microsite',
    type: 'custom',
    url: '/microsites',
    order: 8,
    enabled: true,
    openInNewTab: false,
    visibility: 'all',
    createdAt: new Date().toISOString()
  }
];

export const menuService = {
  async getMenuList(): Promise<MenuItem[]> {
    const menus = await getCollectionData<MenuItem>(FIRESTORE_COLLECTION, MENUS_STORAGE_KEY, INITIAL_MENUS);
    return [...menus].sort((a, b) => a.order - b.order);
  },

  async getMenuTree(): Promise<MenuTreeItem[]> {
    const menus = await this.getMenuList();
    const items = menus.filter(m => m.enabled).sort((a, b) => a.order - b.order);
    
    const itemMap = new Map<string, MenuTreeItem>();
    items.forEach(item => itemMap.set(item.id, { ...item, children: [] }));

    const rootItems: MenuTreeItem[] = [];

    items.forEach(item => {
      const treeNode = itemMap.get(item.id)!;
      if (item.parentId && itemMap.has(item.parentId)) {
        itemMap.get(item.parentId)!.children!.push(treeNode);
      } else {
        rootItems.push(treeNode);
      }
    });

    return rootItems;
  },

  async addMenuItem(item: Partial<MenuItem>, actor: { id: string; email: string; name: string }): Promise<MenuItem> {
    const menus = await this.getMenuList();
    const newItem: MenuItem = {
      id: `menu-${Date.now()}`,
      label: item.label || 'Menu Baru',
      type: item.type || 'custom',
      targetId: item.targetId,
      url: item.url || '/',
      parentId: item.parentId || undefined,
      order: item.order || menus.length + 1,
      enabled: item.enabled ?? true,
      openInNewTab: !!item.openInNewTab,
      visibility: item.visibility || 'all',
      createdAt: new Date().toISOString()
    };

    await saveDocumentData(FIRESTORE_COLLECTION, newItem.id, newItem, MENUS_STORAGE_KEY);

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'CREATE',
      module: 'PAGES',
      targetId: newItem.id,
      targetName: newItem.label,
      description: `Menambahkan item menu navigasi baru: "${newItem.label}"`
    });

    return newItem;
  },

  async updateMenuItem(id: string, updates: Partial<MenuItem>, actor: { id: string; email: string; name: string }): Promise<MenuItem> {
    const menus = await this.getMenuList();
    const index = menus.findIndex(m => m.id === id);
    if (index === -1) throw new Error('Menu item tidak ditemukan');

    const updated = {
      ...menus[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    await saveDocumentData(FIRESTORE_COLLECTION, id, updated, MENUS_STORAGE_KEY);

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'UPDATE',
      module: 'PAGES',
      targetId: updated.id,
      targetName: updated.label,
      description: `Memperbarui item menu: "${updated.label}"`
    });

    return updated;
  },

  async deleteMenuItem(id: string, actor: { id: string; email: string; name: string }): Promise<void> {
    const menus = await this.getMenuList();
    const target = menus.find(m => m.id === id);
    if (!target) return;

    await deleteDocumentData(FIRESTORE_COLLECTION, id, MENUS_STORAGE_KEY);

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'DELETE',
      module: 'PAGES',
      targetId: target.id,
      targetName: target.label,
      description: `Menghapus item menu navigasi: "${target.label}"`
    });
  },

  async reorderMenus(orderedIds: string[], actor: { id: string; email: string; name: string }): Promise<void> {
    const menus = await this.getMenuList();
    for (const m of menus) {
      const idx = orderedIds.indexOf(m.id);
      if (idx !== -1) {
        const updated = { ...m, order: idx + 1 };
        await saveDocumentData(FIRESTORE_COLLECTION, m.id, updated, MENUS_STORAGE_KEY);
      }
    }

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'UPDATE',
      module: 'PAGES',
      description: 'Mengubah urutan struktur menu navigasi utama'
    });
  }
};
