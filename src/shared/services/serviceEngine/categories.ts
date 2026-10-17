// TAHAP 3 — hasil pemecahan serviceEngineService.ts (perilaku TIDAK berubah).
import type { ServiceCategoryEntity } from '../../types/index.js';
import { generateSlug, auditService, getStoredCategories, saveStoredCategories, getStoredServices, saveStoredServices, getStoredClusters } from "./common.js";
export const categoriesApi = {
  async getCategories(filter?: { search?: string; status?: string; clusterId?: string }): Promise<ServiceCategoryEntity[]> {
    let categories = getStoredCategories();
    const services = getStoredServices();
    const clusters = getStoredClusters();

    if (filter) {
      if (filter.status) {
        categories = categories.filter(c => c.status === filter.status);
      }
      if (filter.clusterId) {
        categories = categories.filter(c => c.clusterId === filter.clusterId);
      }
      if (filter.search) {
        const q = filter.search.toLowerCase();
        categories = categories.filter(
          c => c.name.toLowerCase().includes(q) || (c.description && c.description.toLowerCase().includes(q))
        );
      }
    }

    return categories
      .map(c => {
        const parentCluster = clusters.find(cls => cls.id === c.clusterId);
        return {
          ...c,
          clusterName: parentCluster ? parentCluster.name : c.clusterName,
          serviceCount: services.filter(s => s.categoryId === c.id && s.status !== 'archived').length
        };
      })
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  },

  async getCategoryById(id: string): Promise<ServiceCategoryEntity | null> {
    const categories = await this.getCategories();
    return categories.find(c => c.id === id) || null;
  },

  async createCategory(
    data: Partial<ServiceCategoryEntity>,
    actor: { id: string; email: string; name: string }
  ): Promise<ServiceCategoryEntity> {
    const categories = getStoredCategories();
    const name = data.name?.trim();
    if (!name) throw new Error('Nama kategori wajib diisi');

    const slug = data.slug
      ? generateSlug(data.slug, undefined, categories)
      : generateSlug(name, undefined, categories);

    let clusterName = '';
    if (data.clusterId) {
      const cluster = getStoredClusters().find(cls => cls.id === data.clusterId);
      if (cluster) clusterName = cluster.name;
    }

    const newCategory: ServiceCategoryEntity = {
      id: `cat-${Date.now()}`,
      name,
      slug,
      description: data.description || '',
      clusterId: data.clusterId || '',
      clusterName,
      status: data.status || 'active',
      displayOrder: typeof data.displayOrder === 'number' ? data.displayOrder : categories.length + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: { id: actor.id, name: actor.name, email: actor.email }
    };

    saveStoredCategories([...categories, newCategory]);

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'CREATE',
      module: 'SERVICE_CATEGORIES',
      targetId: newCategory.id,
      targetName: newCategory.name,
      description: `Membuat kategori layanan baru: "${newCategory.name}"`
    });

    return newCategory;
  },

  async updateCategory(
    id: string,
    updates: Partial<ServiceCategoryEntity>,
    actor: { id: string; email: string; name: string }
  ): Promise<ServiceCategoryEntity> {
    const categories = getStoredCategories();
    const index = categories.findIndex(c => c.id === id);
    if (index === -1) throw new Error('Kategori tidak ditemukan');

    const existing = categories[index];
    let slug = existing.slug;
    if (updates.slug && updates.slug !== existing.slug) {
      slug = generateSlug(updates.slug, id, categories);
    } else if (updates.name && updates.name !== existing.name && !updates.slug) {
      slug = generateSlug(updates.name, id, categories);
    }

    let clusterName = existing.clusterName;
    if (updates.clusterId !== undefined) {
      const cluster = getStoredClusters().find(cls => cls.id === updates.clusterId);
      clusterName = cluster ? cluster.name : '';
    }

    const updatedCategory: ServiceCategoryEntity = {
      ...existing,
      ...updates,
      slug,
      clusterName,
      updatedAt: new Date().toISOString(),
      updatedBy: { id: actor.id, name: actor.name, email: actor.email }
    };

    categories[index] = updatedCategory;
    saveStoredCategories(categories);

    // Sync category name in services
    if (updatedCategory.name !== existing.name) {
      const services = getStoredServices().map(s =>
        s.categoryId === id ? { ...s, categoryName: updatedCategory.name } : s
      );
      saveStoredServices(services);
    }

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'UPDATE',
      module: 'SERVICE_CATEGORIES',
      targetId: updatedCategory.id,
      targetName: updatedCategory.name,
      description: `Memperbarui kategori layanan: "${updatedCategory.name}" (Status: ${updatedCategory.status})`
    });

    return updatedCategory;
  },

  async archiveCategory(id: string, actor: { id: string; email: string; name: string }): Promise<ServiceCategoryEntity> {
    return this.updateCategory(id, { status: 'archived' }, actor);
  },

  async deleteCategory(id: string, actor: { id: string; email: string; name: string }): Promise<void> {
    const categories = getStoredCategories();
    const target = categories.find(c => c.id === id);
    if (!target) return;

    // Check usage
    const services = getStoredServices();
    const usedByServices = services.filter(s => s.categoryId === id && s.status !== 'archived').length;

    if (usedByServices > 0) {
      throw new Error(`Kategori tidak dapat dihapus permanen karena masih digunakan oleh ${usedByServices} layanan.`);
    }

    saveStoredCategories(categories.filter(c => c.id !== id));

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'DELETE',
      module: 'SERVICE_CATEGORIES',
      targetId: target.id,
      targetName: target.name,
      description: `Menghapus kategori layanan permanen: "${target.name}"`
    });
  },

  // ==================== UNITS CRUD ====================
};
