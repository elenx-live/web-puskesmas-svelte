// TAHAP 3 — hasil pemecahan serviceEngineService.ts (perilaku TIDAK berubah).
import type { ServiceRequirementEntity, ServiceProcedureEntity, ServiceProductEntity, ServiceStandardEntity } from '../../types/index.js';
import {
  sanitizeInput, auditService,
  getStoredRequirements, saveStoredRequirements,
  getStoredProcedures, saveStoredProcedures,
  getStoredProducts, saveStoredProducts,
  getStoredStandards, saveStoredStandards,
} from "./common.js";
export const requirementsApi = {
  async getRequirementsByServiceId(serviceId: string): Promise<ServiceRequirementEntity[]> {
    const all = getStoredRequirements();
    return all
      .filter(r => r.serviceId === serviceId)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  },

  async checkDuplicateRequirementTitle(serviceId: string, title: string, excludeId?: string): Promise<boolean> {
    const all = getStoredRequirements();
    const cleanTitle = title.trim().toLowerCase();
    return all.some(r => 
      r.serviceId === serviceId && 
      r.status !== 'archived' && 
      r.id !== excludeId && 
      r.title.trim().toLowerCase() === cleanTitle
    );
  },

  async createRequirement(
    serviceId: string,
    data: Partial<ServiceRequirementEntity>,
    actor: { id: string; email: string; name: string }
  ): Promise<ServiceRequirementEntity> {
    const all = getStoredRequirements();
    const existingForService = all.filter(r => r.serviceId === serviceId);

    const title = sanitizeInput(data.title?.trim() || 'Persyaratan Baru');
    const description = sanitizeInput(data.description);

    const newReq: ServiceRequirementEntity = {
      id: `req-${Date.now()}`,
      serviceId,
      title,
      description,
      required: data.required !== undefined ? Boolean(data.required) : true,
      displayOrder: typeof data.displayOrder === 'number' ? data.displayOrder : existingForService.length + 1,
      status: data.status || 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: { id: actor.id, name: actor.name, email: actor.email }
    };

    saveStoredRequirements([...all, newReq]);

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'CREATE',
      module: 'SERVICE_REQUIREMENTS',
      targetId: newReq.id,
      targetName: newReq.title,
      description: `Membuat persyaratan baru: "${newReq.title}" untuk layanan (ID: ${serviceId})`
    });

    return newReq;
  },

  async updateRequirement(
    id: string,
    updates: Partial<ServiceRequirementEntity>,
    actor: { id: string; email: string; name: string }
  ): Promise<ServiceRequirementEntity> {
    const all = getStoredRequirements();
    const idx = all.findIndex(r => r.id === id);
    if (idx === -1) throw new Error('Persyaratan tidak ditemukan');

    const existing = all[idx];
    const updated: ServiceRequirementEntity = {
      ...existing,
      ...updates,
      title: updates.title !== undefined ? sanitizeInput(updates.title.trim()) : existing.title,
      description: updates.description !== undefined ? sanitizeInput(updates.description) : existing.description,
      updatedAt: new Date().toISOString(),
      updatedBy: { id: actor.id, name: actor.name, email: actor.email }
    };

    all[idx] = updated;
    saveStoredRequirements(all);

    let action: 'UPDATE' | 'DELETE' = 'UPDATE';
    if (updates.status === 'archived' && existing.status !== 'archived') action = 'DELETE';

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action,
      module: 'SERVICE_REQUIREMENTS',
      targetId: updated.id,
      targetName: updated.title,
      description: `Memperbarui persyaratan: "${updated.title}" (Status: ${updated.status})`
    });

    return updated;
  },

  async archiveRequirement(id: string, actor: { id: string; email: string; name: string }): Promise<ServiceRequirementEntity> {
    return this.updateRequirement(id, { status: 'archived' }, actor);
  },

  async restoreRequirement(id: string, actor: { id: string; email: string; name: string }): Promise<ServiceRequirementEntity> {
    return this.updateRequirement(id, { status: 'active' }, actor);
  },

  async reorderRequirements(
    serviceId: string,
    orderedIds: string[],
    actor: { id: string; email: string; name: string }
  ): Promise<ServiceRequirementEntity[]> {
    const all = getStoredRequirements();
    
    orderedIds.forEach((id, index) => {
      const idx = all.findIndex(r => r.id === id && r.serviceId === serviceId);
      if (idx !== -1) {
        all[idx].displayOrder = index + 1;
        all[idx].updatedAt = new Date().toISOString();
      }
    });

    saveStoredRequirements(all);

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'UPDATE',
      module: 'SERVICE_REQUIREMENTS',
      targetId: serviceId,
      description: `Menyusun ulang (reorder) persyaratan pelayanan.`
    });

    return this.getRequirementsByServiceId(serviceId);
  },

  // ==========================================
  // SERVICE PROCEDURES (PHASE 4C)
  // ==========================================
};
export const proceduresApi = {
  async getProceduresByServiceId(serviceId: string): Promise<ServiceProcedureEntity[]> {
    const all = getStoredProcedures();
    const serviceProcs = all
      .filter(p => p.serviceId === serviceId)
      .sort((a, b) => a.displayOrder - b.displayOrder);

    return serviceProcs.map((p, idx) => ({
      ...p,
      stepNumber: idx + 1
    }));
  },

  async createProcedure(
    serviceId: string,
    data: Partial<ServiceProcedureEntity>,
    actor: { id: string; email: string; name: string }
  ): Promise<ServiceProcedureEntity> {
    const all = getStoredProcedures();
    const existingForService = all.filter(p => p.serviceId === serviceId);

    const title = sanitizeInput(data.title?.trim() || 'Langkah Prosedur Baru');
    const description = sanitizeInput(data.description);

    const newProc: ServiceProcedureEntity = {
      id: `proc-${Date.now()}`,
      serviceId,
      stepNumber: existingForService.length + 1,
      title,
      description,
      displayOrder: typeof data.displayOrder === 'number' ? data.displayOrder : existingForService.length + 1,
      status: data.status || 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: { id: actor.id, name: actor.name, email: actor.email }
    };

    saveStoredProcedures([...all, newProc]);

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'CREATE',
      module: 'SERVICE_PROCEDURES',
      targetId: newProc.id,
      targetName: newProc.title,
      description: `Membuat langkah prosedur baru: "${newProc.title}" untuk layanan (ID: ${serviceId})`
    });

    return newProc;
  },

  async updateProcedure(
    id: string,
    updates: Partial<ServiceProcedureEntity>,
    actor: { id: string; email: string; name: string }
  ): Promise<ServiceProcedureEntity> {
    const all = getStoredProcedures();
    const idx = all.findIndex(p => p.id === id);
    if (idx === -1) throw new Error('Prosedur tidak ditemukan');

    const existing = all[idx];
    const updated: ServiceProcedureEntity = {
      ...existing,
      ...updates,
      title: updates.title !== undefined ? sanitizeInput(updates.title.trim()) : existing.title,
      description: updates.description !== undefined ? sanitizeInput(updates.description) : existing.description,
      updatedAt: new Date().toISOString(),
      updatedBy: { id: actor.id, name: actor.name, email: actor.email }
    };

    all[idx] = updated;
    saveStoredProcedures(all);

    let action: 'UPDATE' | 'DELETE' = 'UPDATE';
    if (updates.status === 'archived' && existing.status !== 'archived') action = 'DELETE';

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action,
      module: 'SERVICE_PROCEDURES',
      targetId: updated.id,
      targetName: updated.title,
      description: `Memperbarui langkah prosedur: "${updated.title}" (Status: ${updated.status})`
    });

    return updated;
  },

  async archiveProcedure(id: string, actor: { id: string; email: string; name: string }): Promise<ServiceProcedureEntity> {
    return this.updateProcedure(id, { status: 'archived' }, actor);
  },

  async restoreProcedure(id: string, actor: { id: string; email: string; name: string }): Promise<ServiceProcedureEntity> {
    return this.updateProcedure(id, { status: 'active' }, actor);
  },

  async reorderProcedures(
    serviceId: string,
    orderedIds: string[],
    actor: { id: string; email: string; name: string }
  ): Promise<ServiceProcedureEntity[]> {
    const all = getStoredProcedures();
    
    orderedIds.forEach((id, index) => {
      const idx = all.findIndex(p => p.id === id && p.serviceId === serviceId);
      if (idx !== -1) {
        all[idx].displayOrder = index + 1;
        all[idx].stepNumber = index + 1;
        all[idx].updatedAt = new Date().toISOString();
      }
    });

    saveStoredProcedures(all);

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'UPDATE',
      module: 'SERVICE_PROCEDURES',
      targetId: serviceId,
      description: `Menyusun ulang (reorder) alur langkah prosedur pelayanan.`
    });

    return this.getProceduresByServiceId(serviceId);
  },

  // ==========================================
  // SERVICE PRODUCTS (PHASE 4C)
  // ==========================================
};
export const productsApi = {
  async getProductsByServiceId(serviceId: string): Promise<ServiceProductEntity[]> {
    const all = getStoredProducts();
    return all
      .filter(p => p.serviceId === serviceId)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  },

  async createProduct(
    serviceId: string,
    data: Partial<ServiceProductEntity>,
    actor: { id: string; email: string; name: string }
  ): Promise<ServiceProductEntity> {
    const all = getStoredProducts();
    const existingForService = all.filter(p => p.serviceId === serviceId);

    const name = sanitizeInput(data.name?.trim() || 'Produk Layanan Baru');
    const description = sanitizeInput(data.description);

    const newProd: ServiceProductEntity = {
      id: `prod-${Date.now()}`,
      serviceId,
      name,
      description,
      displayOrder: typeof data.displayOrder === 'number' ? data.displayOrder : existingForService.length + 1,
      status: data.status || 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: { id: actor.id, name: actor.name, email: actor.email }
    };

    saveStoredProducts([...all, newProd]);

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'CREATE',
      module: 'SERVICE_PRODUCTS',
      targetId: newProd.id,
      targetName: newProd.name,
      description: `Membuat produk layanan baru: "${newProd.name}" untuk layanan (ID: ${serviceId})`
    });

    return newProd;
  },

  async updateProduct(
    id: string,
    updates: Partial<ServiceProductEntity>,
    actor: { id: string; email: string; name: string }
  ): Promise<ServiceProductEntity> {
    const all = getStoredProducts();
    const idx = all.findIndex(p => p.id === id);
    if (idx === -1) throw new Error('Produk layanan tidak ditemukan');

    const existing = all[idx];
    const updated: ServiceProductEntity = {
      ...existing,
      ...updates,
      name: updates.name !== undefined ? sanitizeInput(updates.name.trim()) : existing.name,
      description: updates.description !== undefined ? sanitizeInput(updates.description) : existing.description,
      updatedAt: new Date().toISOString(),
      updatedBy: { id: actor.id, name: actor.name, email: actor.email }
    };

    all[idx] = updated;
    saveStoredProducts(all);

    let action: 'UPDATE' | 'DELETE' = 'UPDATE';
    if (updates.status === 'archived' && existing.status !== 'archived') action = 'DELETE';

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action,
      module: 'SERVICE_PRODUCTS',
      targetId: updated.id,
      targetName: updated.name,
      description: `Memperbarui produk layanan: "${updated.name}" (Status: ${updated.status})`
    });

    return updated;
  },

  async archiveProduct(id: string, actor: { id: string; email: string; name: string }): Promise<ServiceProductEntity> {
    return this.updateProduct(id, { status: 'archived' }, actor);
  },

  async restoreProduct(id: string, actor: { id: string; email: string; name: string }): Promise<ServiceProductEntity> {
    return this.updateProduct(id, { status: 'active' }, actor);
  },

  async reorderProducts(
    serviceId: string,
    orderedIds: string[],
    actor: { id: string; email: string; name: string }
  ): Promise<ServiceProductEntity[]> {
    const all = getStoredProducts();
    
    orderedIds.forEach((id, index) => {
      const idx = all.findIndex(p => p.id === id && p.serviceId === serviceId);
      if (idx !== -1) {
        all[idx].displayOrder = index + 1;
        all[idx].updatedAt = new Date().toISOString();
      }
    });

    saveStoredProducts(all);

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'UPDATE',
      module: 'SERVICE_PRODUCTS',
      targetId: serviceId,
      description: `Menyusun ulang (reorder) produk output pelayanan.`
    });

    return this.getProductsByServiceId(serviceId);
  },

  // ==========================================
  // SERVICE STANDARDS (PHASE 4C)
  // ==========================================
};
export const standardsApi = {
  async getServiceStandard(serviceId: string): Promise<ServiceStandardEntity | null> {
    const all = getStoredStandards();
    return all.find(s => s.serviceId === serviceId) || null;
  },

  async saveServiceStandard(
    serviceId: string,
    data: Partial<ServiceStandardEntity>,
    actor: { id: string; email: string; name: string }
  ): Promise<ServiceStandardEntity> {
    const all = getStoredStandards();
    const idx = all.findIndex(s => s.serviceId === serviceId);

    const sanitizedData = {
      requirementsSummary: sanitizeInput(data.requirementsSummary),
      procedureSummary: sanitizeInput(data.procedureSummary),
      serviceTime: sanitizeInput(data.serviceTime),
      serviceProductSummary: sanitizeInput(data.serviceProductSummary),
      facilities: sanitizeInput(data.facilities),
      executorCompetency: sanitizeInput(data.executorCompetency),
      supervision: sanitizeInput(data.supervision),
      complaintChannelSummary: sanitizeInput(data.complaintChannelSummary),
      evaluation: sanitizeInput(data.evaluation),
      additionalInformation: sanitizeInput(data.additionalInformation)
    };

    let result: ServiceStandardEntity;

    if (idx !== -1) {
      result = {
        ...all[idx],
        ...sanitizedData,
        updatedAt: new Date().toISOString(),
        updatedBy: { id: actor.id, name: actor.name, email: actor.email }
      };
      all[idx] = result;
    } else {
      result = {
        id: `std-${Date.now()}`,
        serviceId,
        ...sanitizedData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: { id: actor.id, name: actor.name, email: actor.email }
      };
      all.push(result);
    }

    saveStoredStandards(all);

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'UPDATE',
      module: 'SERVICE_STANDARDS',
      targetId: result.id,
      targetName: `Standar Pelayanan ${serviceId}`,
      description: `Memperbarui komponen Standar Pelayanan Publik untuk layanan ID ${serviceId}`
    });

    return result;
  },

  // ==========================================
  // PHASE 4D: SERVICE SCHEDULE ENGINE
  // ==========================================
};
