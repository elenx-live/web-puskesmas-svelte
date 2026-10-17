// TAHAP 3 — hasil pemecahan serviceEngineService.ts (perilaku TIDAK berubah).
import type { ServiceEntity, ServiceStatus } from '../../types/index.js';
import { requirementsApi, proceduresApi, productsApi } from "./serviceItems.js";
import { schedulesApi } from "./schedules.js";
import { generateSlug, auditService, getStoredServices, saveStoredServices, getStoredCategories, getStoredClusters, getStoredUnits, getStoredLocations } from "./common.js";
export const servicesApi = {
  async getServices(filter?: {
    search?: string;
    status?: string;
    categoryId?: string;
    clusterId?: string;
    unitId?: string;
    locationId?: string;
    featured?: boolean;
  }): Promise<ServiceEntity[]> {
    let services = getStoredServices();
    const categories = getStoredCategories();
    const clusters = getStoredClusters();
    const units = getStoredUnits();
    const locations = getStoredLocations();

    if (filter) {
      if (filter.status) {
        services = services.filter(s => s.status === filter.status);
      }
      if (filter.categoryId) {
        services = services.filter(s => s.categoryId === filter.categoryId);
      }
      if (filter.clusterId) {
        services = services.filter(s => s.clusterId === filter.clusterId);
      }
      if (filter.unitId) {
        services = services.filter(s => s.unitId === filter.unitId);
      }
      if (filter.locationId) {
        services = services.filter(s => s.locationId === filter.locationId);
      }
      if (filter.featured !== undefined) {
        services = services.filter(s => s.featured === filter.featured);
      }
      if (filter.search) {
        const q = filter.search.toLowerCase();
        services = services.filter(
          s =>
            s.name.toLowerCase().includes(q) ||
            s.shortDescription.toLowerCase().includes(q) ||
            s.description.toLowerCase().includes(q)
        );
      }
    }

    // Resolve relation names dynamically
    return services
      .map(s => {
        const cat = categories.find(c => c.id === s.categoryId);
        const cls = clusters.find(c => c.id === s.clusterId);
        const unit = units.find(u => u.id === s.unitId);
        const loc = locations.find(l => l.id === s.locationId);

        return {
          ...s,
          categoryName: cat ? cat.name : s.categoryName,
          clusterName: cls ? cls.name : s.clusterName,
          unitName: unit ? unit.name : s.unitName,
          locationName: loc ? loc.name : s.locationName
        };
      })
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  },

  async getPublishedServices(): Promise<ServiceEntity[]> {
    const services = await this.getServices({ status: 'published' });
    return services.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  },

  async getServiceById(id: string): Promise<ServiceEntity | null> {
    const services = await this.getServices();
    return services.find(s => s.id === id) || null;
  },

  async getServiceBySlug(slug: string): Promise<ServiceEntity | null> {
    const services = await this.getServices();
    const cleanSlug = slug.toLowerCase();
    return services.find(s => s.slug.toLowerCase() === cleanSlug) || null;
  },

  async createService(
    data: Partial<ServiceEntity>,
    actor: { id: string; email: string; name: string }
  ): Promise<ServiceEntity> {
    const services = getStoredServices();

    const name = data.name?.trim() || 'Layanan Baru';
    const slug = data.slug
      ? generateSlug(data.slug, undefined, services)
      : generateSlug(name, undefined, services);

    let categoryName = '';
    if (data.categoryId) {
      const cat = getStoredCategories().find(c => c.id === data.categoryId);
      if (cat) categoryName = cat.name;
    }

    let clusterName = '';
    if (data.clusterId) {
      const cls = getStoredClusters().find(c => c.id === data.clusterId);
      if (cls) clusterName = cls.name;
    }

    let unitName = '';
    if (data.unitId) {
      const u = getStoredUnits().find(unit => unit.id === data.unitId);
      if (u) unitName = u.name;
    }

    let locationName = '';
    if (data.locationId) {
      const loc = getStoredLocations().find(l => l.id === data.locationId);
      if (loc) locationName = loc.name;
    }

    const newService: ServiceEntity = {
      id: `srv-${Date.now()}`,
      name,
      slug,
      shortDescription: data.shortDescription || '',
      description: data.description || '',
      status: data.status || 'draft',
      categoryId: data.categoryId || '',
      categoryName,
      clusterId: data.clusterId || '',
      clusterName,
      unitId: data.unitId || '',
      unitName,
      locationId: data.locationId || '',
      locationName,
      featured: Boolean(data.featured),
      displayOrder: typeof data.displayOrder === 'number' ? data.displayOrder : services.length + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: { id: actor.id, name: actor.name, email: actor.email },
      publishedAt: data.status === 'published' ? new Date().toISOString() : undefined,
      publishedBy: data.status === 'published' ? { id: actor.id, name: actor.name } : undefined,
      seoTitle: data.seoTitle || name,
      seoDescription: data.seoDescription || data.shortDescription || ''
    };

    const updated = [...services, newService];
    saveStoredServices(updated);

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'CREATE',
      module: 'SERVICES',
      targetId: newService.id,
      targetName: newService.name,
      description: `Membuat layanan kesehatan baru: "${newService.name}" (Status: ${newService.status})`
    });

    return newService;
  },

  async updateService(
    id: string,
    updates: Partial<ServiceEntity>,
    actor: { id: string; email: string; name: string }
  ): Promise<ServiceEntity> {
    const services = getStoredServices();
    const index = services.findIndex(s => s.id === id);
    if (index === -1) throw new Error('Layanan tidak ditemukan');

    const existing = services[index];

    let slug = existing.slug;
    if (updates.slug && updates.slug !== existing.slug) {
      slug = generateSlug(updates.slug, id, services);
    }

    let categoryName = existing.categoryName;
    if (updates.categoryId !== undefined) {
      const cat = getStoredCategories().find(c => c.id === updates.categoryId);
      categoryName = cat ? cat.name : '';
    }

    let clusterName = existing.clusterName;
    if (updates.clusterId !== undefined) {
      const cls = getStoredClusters().find(c => c.id === updates.clusterId);
      clusterName = cls ? cls.name : '';
    }

    let unitName = existing.unitName;
    if (updates.unitId !== undefined) {
      const u = getStoredUnits().find(unit => unit.id === updates.unitId);
      unitName = u ? u.name : '';
    }

    let locationName = existing.locationName;
    if (updates.locationId !== undefined) {
      const loc = getStoredLocations().find(l => l.id === updates.locationId);
      locationName = loc ? loc.name : '';
    }

    const isNowPublishing = updates.status === 'published' && existing.status !== 'published';

    const updatedService: ServiceEntity = {
      ...existing,
      ...updates,
      slug,
      categoryName,
      clusterName,
      unitName,
      locationName,
      updatedAt: new Date().toISOString(),
      updatedBy: { id: actor.id, name: actor.name, email: actor.email },
      publishedAt: isNowPublishing ? new Date().toISOString() : existing.publishedAt,
      publishedBy: isNowPublishing ? { id: actor.id, name: actor.name } : existing.publishedBy
    };

    services[index] = updatedService;
    saveStoredServices(services);

    let actionName: 'UPDATE' | 'PUBLISH' | 'UNPUBLISH' = 'UPDATE';
    if (isNowPublishing) actionName = 'PUBLISH';
    else if (updates.status === 'draft' && existing.status === 'published') actionName = 'UNPUBLISH';

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: actionName,
      module: 'SERVICES',
      targetId: updatedService.id,
      targetName: updatedService.name,
      description: `Memperbarui layanan kesehatan: "${updatedService.name}" (Status: ${updatedService.status})`
    });

    return updatedService;
  },

  // ==================== PHASE 4I: APPROVAL & WORKFLOW ENGINE ====================
  async validateServiceForSubmit(id: string): Promise<{ valid: boolean; missingItems: string[] }> {
    const service = await this.getServiceById(id);
    if (!service) return { valid: false, missingItems: ['Layanan tidak ditemukan'] };

    const missingItems: string[] = [];

    if (!service.name?.trim()) missingItems.push('Nama Layanan belum diisi');
    if (!service.shortDescription || service.shortDescription.trim().length < 20) {
      missingItems.push('Deskripsi Singkat minimal 20 karakter');
    }
    if (!service.description || service.description.trim().length < 50) {
      missingItems.push('Deskripsi Lengkap minimal 50 karakter');
    }
    if (!service.categoryId) missingItems.push('Kategori Layanan belum dipilih');
    if (!service.clusterId) missingItems.push('Klaster Layanan belum dipilih');
    if (!service.unitId) missingItems.push('Unit Pelayanan belum dipilih');
    if (!service.locationId) missingItems.push('Lokasi Pelayanan belum dipilih');

    const [reqs, procs, prods, sch] = await Promise.all([
      requirementsApi.getRequirementsByServiceId(id),
      proceduresApi.getProceduresByServiceId(id),
      productsApi.getProductsByServiceId(id),
      schedulesApi.getServiceSchedule(id)
    ]);

    if (reqs.length === 0) missingItems.push('Persyaratan Layanan minimal 1 butir');
    if (procs.length === 0) missingItems.push('Prosedur/Alur Pelayanan minimal 1 langkah');
    if (prods.length === 0) missingItems.push('Produk/Output Pelayanan minimal 1 item');
    if (!sch || sch.weeklyRules.length === 0) missingItems.push('Jadwal Operasional Belum Dikonfigurasi');

    return {
      valid: missingItems.length === 0,
      missingItems
    };
  },

  async submitForReview(id: string, actor: { id: string; email: string; name: string }): Promise<ServiceEntity> {
    const validation = await this.validateServiceForSubmit(id);
    if (!validation.valid) {
      throw new Error(`Pengajuan gagal. Data belum lengkap:\n- ${validation.missingItems.join('\n- ')}`);
    }

    const services = getStoredServices();
    const index = services.findIndex(s => s.id === id);
    if (index === -1) throw new Error('Layanan tidak ditemukan');

    const existing = services[index];
    const now = new Date().toISOString();

    const updatedService: ServiceEntity = {
      ...existing,
      status: 'pending_review',
      submittedAt: now,
      submittedBy: { id: actor.id, name: actor.name, email: actor.email },
      rejectionReason: undefined,
      updatedAt: now,
      updatedBy: { id: actor.id, name: actor.name, email: actor.email }
    };

    services[index] = updatedService;
    saveStoredServices(services);

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'UPDATE',
      module: 'SERVICES',
      targetId: updatedService.id,
      targetName: updatedService.name,
      description: `Mengajukan layanan kesehatan "${updatedService.name}" untuk ditinjau (Pending Review)`
    });

    return updatedService;
  },

  async approveService(id: string, actor: { id: string; email: string; name: string }): Promise<ServiceEntity> {
    const services = getStoredServices();
    const index = services.findIndex(s => s.id === id);
    if (index === -1) throw new Error('Layanan tidak ditemukan');

    const existing = services[index];
    const now = new Date().toISOString();

    const updatedService: ServiceEntity = {
      ...existing,
      status: 'approved',
      reviewedAt: now,
      reviewedBy: { id: actor.id, name: actor.name, email: actor.email },
      updatedAt: now,
      updatedBy: { id: actor.id, name: actor.name, email: actor.email }
    };

    services[index] = updatedService;
    saveStoredServices(services);

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'UPDATE',
      module: 'SERVICES',
      targetId: updatedService.id,
      targetName: updatedService.name,
      description: `Menyetujui pengajuan layanan kesehatan "${updatedService.name}" (Status: Disetujui)`
    });

    return updatedService;
  },

  async rejectService(
    id: string,
    reason: string,
    actor: { id: string; email: string; name: string }
  ): Promise<ServiceEntity> {
    const cleanReason = reason.trim();
    if (!cleanReason) {
      throw new Error('Alasan penolakan / pengembalian pengajuan wajib diisi.');
    }

    const services = getStoredServices();
    const index = services.findIndex(s => s.id === id);
    if (index === -1) throw new Error('Layanan tidak ditemukan');

    const existing = services[index];
    const now = new Date().toISOString();

    const updatedService: ServiceEntity = {
      ...existing,
      status: 'rejected',
      rejectionReason: cleanReason,
      reviewedAt: now,
      reviewedBy: { id: actor.id, name: actor.name, email: actor.email },
      updatedAt: now,
      updatedBy: { id: actor.id, name: actor.name, email: actor.email }
    };

    services[index] = updatedService;
    saveStoredServices(services);

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'UPDATE',
      module: 'SERVICES',
      targetId: updatedService.id,
      targetName: updatedService.name,
      description: `Mengembalikan pengajuan layanan "${updatedService.name}" untuk diperbaiki. Alasan: "${cleanReason}"`
    });

    return updatedService;
  },

  async publishService(id: string, actor: { id: string; email: string; name: string }): Promise<ServiceEntity> {
    const services = getStoredServices();
    const index = services.findIndex(s => s.id === id);
    if (index === -1) throw new Error('Layanan tidak ditemukan');

    const existing = services[index];
    const now = new Date().toISOString();

    const updatedService: ServiceEntity = {
      ...existing,
      status: 'published',
      publishedAt: now,
      publishedBy: { id: actor.id, name: actor.name },
      updatedAt: now,
      updatedBy: { id: actor.id, name: actor.name, email: actor.email }
    };

    services[index] = updatedService;
    saveStoredServices(services);

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'PUBLISH',
      module: 'SERVICES',
      targetId: updatedService.id,
      targetName: updatedService.name,
      description: `Mempublikasikan layanan kesehatan "${updatedService.name}" ke direktori publik`
    });

    return updatedService;
  },

  async unpublishService(id: string, actor: { id: string; email: string; name: string }): Promise<ServiceEntity> {
    const services = getStoredServices();
    const index = services.findIndex(s => s.id === id);
    if (index === -1) throw new Error('Layanan tidak ditemukan');

    const existing = services[index];
    const now = new Date().toISOString();

    const updatedService: ServiceEntity = {
      ...existing,
      status: 'draft',
      updatedAt: now,
      updatedBy: { id: actor.id, name: actor.name, email: actor.email }
    };

    services[index] = updatedService;
    saveStoredServices(services);

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'UNPUBLISH',
      module: 'SERVICES',
      targetId: updatedService.id,
      targetName: updatedService.name,
      description: `Membatalkan publikasi layanan kesehatan "${updatedService.name}" (Kembali ke Draf)`
    });

    return updatedService;
  },

  async archiveService(id: string, actor: { id: string; email: string; name: string }): Promise<ServiceEntity> {
    const service = await this.updateService(id, { status: 'archived' }, actor);

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'UPDATE',
      module: 'SERVICES',
      targetId: service.id,
      targetName: service.name,
      description: `Mengarsipkan layanan kesehatan: "${service.name}"`
    });

    return service;
  },

  async deleteService(id: string, actor: { id: string; email: string; name: string }): Promise<void> {
    const services = getStoredServices();
    const target = services.find(s => s.id === id);
    if (!target) return;

    saveStoredServices(services.filter(s => s.id !== id));

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'DELETE',
      module: 'SERVICES',
      targetId: target.id,
      targetName: target.name,
      description: `Menghapus layanan kesehatan permanen: "${target.name}"`
    });
  },

  // ==========================================
  // SERVICE REQUIREMENTS (PHASE 4C)
  // ==========================================
};
