// TAHAP 3 — hasil pemecahan serviceEngineService.ts (perilaku TIDAK berubah).
import type { ServiceClusterEntity } from '../../types/index.js';
import { generateSlug, auditService, getStoredClusters, saveStoredClusters, getStoredServices, saveStoredServices, getStoredCategories, saveStoredCategories } from "./common.js";
export const clustersApi = {
  async getClusters(filter?: { search?: string; status?: string }): Promise<ServiceClusterEntity[]> {
    let clusters = getStoredClusters();
    const services = getStoredServices();
    const categories = getStoredCategories();

    if (filter) {
      if (filter.status) {
        clusters = clusters.filter(c => c.status === filter.status);
      }
      if (filter.search) {
        const q = filter.search.toLowerCase();
        clusters = clusters.filter(
          c => c.name.toLowerCase().includes(q) || (c.description && c.description.toLowerCase().includes(q))
        );
      }
    }

    return clusters
      .map(c => ({
        ...c,
        categoryCount: categories.filter(cat => cat.clusterId === c.id && cat.status !== 'archived').length,
        serviceCount: services.filter(s => s.clusterId === c.id && s.status !== 'archived').length
      }))
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  },

  async getClusterById(id: string): Promise<ServiceClusterEntity | null> {
    const clusters = await this.getClusters();
    return clusters.find(c => c.id === id) || null;
  },

  async createCluster(
    data: Partial<ServiceClusterEntity>,
    actor: { id: string; email: string; name: string }
  ): Promise<ServiceClusterEntity> {
    const clusters = getStoredClusters();
    const name = data.name?.trim();
    if (!name) throw new Error('Nama klaster wajib diisi');

    const slug = data.slug
      ? generateSlug(data.slug, undefined, clusters)
      : generateSlug(name, undefined, clusters);

    const newCluster: ServiceClusterEntity = {
      id: `cls-${Date.now()}`,
      name,
      slug,
      description: data.description || '',
      status: data.status || 'active',
      displayOrder: typeof data.displayOrder === 'number' ? data.displayOrder : clusters.length + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: { id: actor.id, name: actor.name, email: actor.email }
    };

    saveStoredClusters([...clusters, newCluster]);

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'CREATE',
      module: 'SERVICE_CLUSTERS',
      targetId: newCluster.id,
      targetName: newCluster.name,
      description: `Membuat klaster pelayanan baru: "${newCluster.name}"`
    });

    return newCluster;
  },

  async updateCluster(
    id: string,
    updates: Partial<ServiceClusterEntity>,
    actor: { id: string; email: string; name: string }
  ): Promise<ServiceClusterEntity> {
    const clusters = getStoredClusters();
    const index = clusters.findIndex(c => c.id === id);
    if (index === -1) throw new Error('Klaster tidak ditemukan');

    const existing = clusters[index];
    let slug = existing.slug;
    if (updates.slug && updates.slug !== existing.slug) {
      slug = generateSlug(updates.slug, id, clusters);
    } else if (updates.name && updates.name !== existing.name && !updates.slug) {
      slug = generateSlug(updates.name, id, clusters);
    }

    const updatedCluster: ServiceClusterEntity = {
      ...existing,
      ...updates,
      slug,
      updatedAt: new Date().toISOString(),
      updatedBy: { id: actor.id, name: actor.name, email: actor.email }
    };

    clusters[index] = updatedCluster;
    saveStoredClusters(clusters);

    // Sync cluster name in categories and services
    if (updatedCluster.name !== existing.name) {
      const categories = getStoredCategories().map(cat =>
        cat.clusterId === id ? { ...cat, clusterName: updatedCluster.name } : cat
      );
      saveStoredCategories(categories);

      const services = getStoredServices().map(s =>
        s.clusterId === id ? { ...s, clusterName: updatedCluster.name } : s
      );
      saveStoredServices(services);
    }

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'UPDATE',
      module: 'SERVICE_CLUSTERS',
      targetId: updatedCluster.id,
      targetName: updatedCluster.name,
      description: `Memperbarui klaster pelayanan: "${updatedCluster.name}" (Status: ${updatedCluster.status})`
    });

    return updatedCluster;
  },

  async archiveCluster(id: string, actor: { id: string; email: string; name: string }): Promise<ServiceClusterEntity> {
    return this.updateCluster(id, { status: 'archived' }, actor);
  },

  async deleteCluster(id: string, actor: { id: string; email: string; name: string }): Promise<void> {
    const clusters = getStoredClusters();
    const target = clusters.find(c => c.id === id);
    if (!target) return;

    // Check usage
    const services = getStoredServices();
    const categories = getStoredCategories();
    const usedByServices = services.filter(s => s.clusterId === id && s.status !== 'archived').length;
    const usedByCategories = categories.filter(cat => cat.clusterId === id && cat.status !== 'archived').length;

    if (usedByServices > 0 || usedByCategories > 0) {
      throw new Error(`Klaster tidak dapat dihapus permanen karena masih digunakan oleh ${usedByServices} layanan dan ${usedByCategories} kategori.`);
    }

    saveStoredClusters(clusters.filter(c => c.id !== id));

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'DELETE',
      module: 'SERVICE_CLUSTERS',
      targetId: target.id,
      targetName: target.name,
      description: `Menghapus klaster pelayanan permanen: "${target.name}"`
    });
  },

  // ==================== CATEGORIES CRUD ====================
};
