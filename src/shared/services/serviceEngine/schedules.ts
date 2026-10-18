// TAHAP 3 — hasil pemecahan serviceEngineService.ts (perilaku TIDAK berubah).
import type {
  ServiceEntity, ServiceStatus,
  DayOfWeek, ServiceScheduleRuleEntity, ServiceScheduleEntity,
  ScheduleExceptionType, ServiceScheduleExceptionEntity,
  PricingType, ServicePricingEntity,
} from '../../types/index.js';
import { servicesApi } from "./services.js";
import { sanitizeInput, generateSlug, auditService, saveSingleDocument, SCHEDULES_STORAGE_KEY, EXCEPTIONS_STORAGE_KEY, PRICING_STORAGE_KEY, getStoredRequirements, getStoredProcedures, getStoredProducts, getStoredStandards, getStoredServices, saveStoredServices, getStoredCategories, getStoredClusters, getStoredUnits, getStoredLocations } from "./common.js";
import { memStore } from '../../lib/memStore';
export const schedulesApi = {
  async getServiceSchedule(serviceId: string): Promise<ServiceScheduleEntity> {
    const all = getStoredSchedules();
    let schedule = all.find(s => s.serviceId === serviceId);

    if (!schedule) {
      // Create default schedule rules for new / unconfigured service
      const defaultRules = createDefaultScheduleRules(serviceId);
      schedule = {
        id: `sch-${serviceId}`,
        serviceId,
        timezone: 'Asia/Jakarta',
        status: 'active',
        rules: defaultRules,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      all.push(schedule);
      saveStoredSchedules(all);
    }

    return schedule;
  },

  async saveServiceSchedule(
    serviceId: string,
    rules: ServiceScheduleRuleEntity[],
    timezone: string = 'Asia/Jakarta',
    actor: { id: string; email: string; name: string }
  ): Promise<ServiceScheduleEntity> {
    // Validate every rule
    for (const rule of rules) {
      if (rule.isOpen) {
        const err = validateTimeRule(rule);
        if (err) {
          throw new Error(`Validasi Jadwal (${rule.dayOfWeek}): ${err}`);
        }
      }
    }

    const all = getStoredSchedules();
    const idx = all.findIndex(s => s.serviceId === serviceId);

    const updatedSchedule: ServiceScheduleEntity = {
      id: idx !== -1 ? all[idx].id : `sch-${serviceId}`,
      serviceId,
      timezone: sanitizeInput(timezone) || 'Asia/Jakarta',
      status: 'active',
      rules,
      createdAt: idx !== -1 ? all[idx].createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: idx !== -1 ? all[idx].createdBy : { id: actor.id, name: actor.name, email: actor.email },
      updatedBy: { id: actor.id, name: actor.name, email: actor.email }
    };

    if (idx !== -1) {
      all[idx] = updatedSchedule;
    } else {
      all.push(updatedSchedule);
    }

    saveStoredSchedules(all);

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'UPDATE',
      module: 'SERVICE_SCHEDULES',
      targetId: updatedSchedule.id,
      targetName: `Jadwal Pelayanan ${serviceId}`,
      description: `Memperbarui jam operasional mingguan untuk layanan ID ${serviceId}`
    });

    return updatedSchedule;
  },

  // ==========================================
  // PHASE 4D: SCHEDULE EXCEPTIONS & SPECIAL DATES
  // ==========================================
  async getScheduleExceptionsByServiceId(
    serviceId: string,
    options: { includePast?: boolean; includeArchived?: boolean } = {}
  ): Promise<ServiceScheduleExceptionEntity[]> {
    let all = getStoredExceptions().filter(e => e.serviceId === serviceId);

    if (!options.includeArchived) {
      all = all.filter(e => e.status !== 'archived');
    }

    if (options.includePast === false) {
      const todayStr = new Date().toISOString().split('T')[0];
      all = all.filter(e => e.date >= todayStr);
    }

    return all.sort((a, b) => b.date.localeCompare(a.date));
  },

  async getAllScheduleExceptions(
    options: { includePast?: boolean; includeArchived?: boolean } = {}
  ): Promise<ServiceScheduleExceptionEntity[]> {
    let all = getStoredExceptions();

    if (!options.includeArchived) {
      all = all.filter(e => e.status !== 'archived');
    }

    if (options.includePast === false) {
      const todayStr = new Date().toISOString().split('T')[0];
      all = all.filter(e => e.date >= todayStr);
    }

    return all.sort((a, b) => b.date.localeCompare(a.date));
  },

  async createScheduleException(
    serviceId: string,
    data: Partial<ServiceScheduleExceptionEntity>,
    actor: { id: string; email: string; name: string }
  ): Promise<ServiceScheduleExceptionEntity> {
    if (!data.date) {
      throw new Error('Tanggal jadwal khusus wajib diisi.');
    }

    if (!data.reason || !data.reason.trim()) {
      throw new Error('Alasan perubahan/jadwal khusus wajib diisi.');
    }

    // Check duplicate active exception for same serviceId and date
    const all = getStoredExceptions();
    const duplicate = all.find(
      e => e.serviceId === serviceId && e.date === data.date && e.status !== 'archived'
    );

    if (duplicate) {
      throw new Error(`Jadwal khusus/pengecualian untuk tanggal ${data.date} sudah ada. Silakan edit atau hapus jadwal yang sudah ada.`);
    }

    const type = data.type || 'closed';
    const isOpen = type === 'closed' ? false : Boolean(data.isOpen);

    if (isOpen) {
      const err = validateTimeRule({
        isOpen: true,
        openTime: data.openTime,
        closeTime: data.closeTime,
        breakStart: data.breakStart,
        breakEnd: data.breakEnd
      });
      if (err) {
        throw new Error(`Validasi Jam Operasional Khusus: ${err}`);
      }
    }

    const newException: ServiceScheduleExceptionEntity = {
      id: `exc-${Date.now()}`,
      serviceId,
      date: data.date,
      type,
      isOpen,
      openTime: isOpen ? data.openTime : undefined,
      closeTime: isOpen ? data.closeTime : undefined,
      breakStart: isOpen ? data.breakStart : undefined,
      breakEnd: isOpen ? data.breakEnd : undefined,
      reason: sanitizeInput(data.reason),
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: { id: actor.id, name: actor.name, email: actor.email }
    };

    all.push(newException);
    saveStoredExceptions(all);

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'CREATE',
      module: 'SERVICE_EXCEPTIONS',
      targetId: newException.id,
      targetName: `Jadwal Khusus ${data.date}`,
      description: `Menambahkan jadwal khusus/pengecualian pada tanggal ${data.date} (${type}): "${data.reason}"`
    });

    return newException;
  },

  async updateScheduleException(
    id: string,
    updates: Partial<ServiceScheduleExceptionEntity>,
    actor: { id: string; email: string; name: string }
  ): Promise<ServiceScheduleExceptionEntity> {
    const all = getStoredExceptions();
    const idx = all.findIndex(e => e.id === id);

    if (idx === -1) {
      throw new Error('Jadwal khusus tidak ditemukan.');
    }

    const existing = all[idx];

    if (updates.date && updates.date !== existing.date) {
      const duplicate = all.find(
        e => e.id !== id && e.serviceId === existing.serviceId && e.date === updates.date && e.status !== 'archived'
      );
      if (duplicate) {
        throw new Error(`Jadwal khusus/pengecualian untuk tanggal ${updates.date} sudah ada.`);
      }
    }

    const type = updates.type !== undefined ? updates.type : existing.type;
    const isOpen = type === 'closed' ? false : (updates.isOpen !== undefined ? updates.isOpen : existing.isOpen);

    if (isOpen) {
      const err = validateTimeRule({
        isOpen: true,
        openTime: updates.openTime !== undefined ? updates.openTime : existing.openTime,
        closeTime: updates.closeTime !== undefined ? updates.closeTime : existing.closeTime,
        breakStart: updates.breakStart !== undefined ? updates.breakStart : existing.breakStart,
        breakEnd: updates.breakEnd !== undefined ? updates.breakEnd : existing.breakEnd
      });
      if (err) {
        throw new Error(`Validasi Jam Operasional Khusus: ${err}`);
      }
    }

    const updated: ServiceScheduleExceptionEntity = {
      ...existing,
      ...updates,
      type,
      isOpen,
      reason: updates.reason !== undefined ? sanitizeInput(updates.reason) : existing.reason,
      updatedAt: new Date().toISOString(),
      updatedBy: { id: actor.id, name: actor.name, email: actor.email }
    };

    all[idx] = updated;
    saveStoredExceptions(all);

    let action: 'UPDATE' | 'DELETE' = 'UPDATE';
    if (updates.status === 'archived' && existing.status !== 'archived') action = 'DELETE';

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action,
      module: 'SERVICE_EXCEPTIONS',
      targetId: updated.id,
      targetName: `Jadwal Khusus ${updated.date}`,
      description: `Memperbarui jadwal khusus/pengecualian tanggal ${updated.date} (Status: ${updated.status})`
    });

    return updated;
  },

  async archiveScheduleException(id: string, actor: { id: string; email: string; name: string }): Promise<ServiceScheduleExceptionEntity> {
    return this.updateScheduleException(id, { status: 'archived' }, actor);
  },

  async restoreScheduleException(id: string, actor: { id: string; email: string; name: string }): Promise<ServiceScheduleExceptionEntity> {
    return this.updateScheduleException(id, { status: 'active' }, actor);
  },

  // ==========================================
  // PHASE 4D: SERVICE PRICING
  // ==========================================
  async getPricingByServiceId(
    serviceId: string,
    options: { includeArchived?: boolean } = {}
  ): Promise<ServicePricingEntity[]> {
    let all = getStoredPricing().filter(p => p.serviceId === serviceId);

    if (!options.includeArchived) {
      all = all.filter(p => p.status !== 'archived');
    }

    return all.sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
  },

  async getAllPricing(
    options: { includeArchived?: boolean } = {}
  ): Promise<ServicePricingEntity[]> {
    let all = getStoredPricing();

    if (!options.includeArchived) {
      all = all.filter(p => p.status !== 'archived');
    }

    return all.sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
  },

  async createPricing(
    serviceId: string,
    data: Partial<ServicePricingEntity>,
    actor: { id: string; email: string; name: string }
  ): Promise<ServicePricingEntity> {
    const pricingType = data.pricingType || 'free';

    if (!data.effectiveFrom) {
      throw new Error('Tanggal mulai berlaku tarif (Effective From) wajib diisi.');
    }

    if (data.effectiveUntil && data.effectiveUntil < data.effectiveFrom) {
      throw new Error('Tanggal akhir berlaku tidak boleh lebih awal dari tanggal mulai.');
    }

    if (pricingType === 'fixed') {
      if (data.amount === undefined || data.amount === null || isNaN(Number(data.amount))) {
        throw new Error('Nominal tarif wajib diisi untuk jenis tarif tetap.');
      }
      if (Number(data.amount) < 0) {
        throw new Error('Nominal tarif tidak boleh bernilai negatif.');
      }
    }

    // Check overlapping pricing ranges
    const all = getStoredPricing();
    const overlapWarning = checkPricingRangeOverlap(
      serviceId,
      undefined,
      data.effectiveFrom,
      data.effectiveUntil,
      all
    );

    if (overlapWarning) {
      console.warn('Pricing Range Overlap Notice:', overlapWarning);
    }

    const newPricing: ServicePricingEntity = {
      id: `prc-${Date.now()}`,
      serviceId,
      pricingType,
      amount: pricingType === 'fixed' ? Number(data.amount) : (pricingType === 'free' ? 0 : null),
      currency: data.currency || 'IDR',
      unit: sanitizeInput(data.unit) || 'per pelayanan',
      description: sanitizeInput(data.description),
      status: 'active',
      effectiveFrom: data.effectiveFrom,
      effectiveUntil: data.effectiveUntil || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: { id: actor.id, name: actor.name, email: actor.email }
    };

    all.push(newPricing);
    saveStoredPricing(all);

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'CREATE',
      module: 'SERVICE_PRICING',
      targetId: newPricing.id,
      targetName: `Tarif Layanan ${serviceId}`,
      description: `Menambahkan tarif (${pricingType}): ${newPricing.amount !== null ? 'Rp ' + newPricing.amount : 'Tanpa Nominal Fixed'} (Berlaku: ${data.effectiveFrom})`
    });

    return newPricing;
  },

  async updatePricing(
    id: string,
    updates: Partial<ServicePricingEntity>,
    actor: { id: string; email: string; name: string }
  ): Promise<ServicePricingEntity> {
    const all = getStoredPricing();
    const idx = all.findIndex(p => p.id === id);

    if (idx === -1) {
      throw new Error('Informasi tarif tidak ditemukan.');
    }

    const existing = all[idx];
    const pricingType = updates.pricingType !== undefined ? updates.pricingType : existing.pricingType;
    const effectiveFrom = updates.effectiveFrom !== undefined ? updates.effectiveFrom : existing.effectiveFrom;
    const effectiveUntil = updates.effectiveUntil !== undefined ? updates.effectiveUntil : existing.effectiveUntil;

    if (effectiveUntil && effectiveUntil < effectiveFrom) {
      throw new Error('Tanggal akhir berlaku tidak boleh lebih awal dari tanggal mulai.');
    }

    if (pricingType === 'fixed') {
      const amountVal = updates.amount !== undefined ? updates.amount : existing.amount;
      if (amountVal === undefined || amountVal === null || isNaN(Number(amountVal))) {
        throw new Error('Nominal tarif wajib diisi untuk jenis tarif tetap.');
      }
      if (Number(amountVal) < 0) {
        throw new Error('Nominal tarif tidak boleh bernilai negatif.');
      }
    }

    const updated: ServicePricingEntity = {
      ...existing,
      ...updates,
      pricingType,
      amount: pricingType === 'fixed' ? Number(updates.amount !== undefined ? updates.amount : existing.amount) : (pricingType === 'free' ? 0 : null),
      currency: updates.currency || existing.currency || 'IDR',
      unit: updates.unit !== undefined ? sanitizeInput(updates.unit) : existing.unit,
      description: updates.description !== undefined ? sanitizeInput(updates.description) : existing.description,
      effectiveFrom,
      effectiveUntil: effectiveUntil || undefined,
      updatedAt: new Date().toISOString(),
      updatedBy: { id: actor.id, name: actor.name, email: actor.email }
    };

    all[idx] = updated;
    saveStoredPricing(all);

    let action: 'UPDATE' | 'DELETE' = 'UPDATE';
    if (updates.status === 'archived' && existing.status !== 'archived') action = 'DELETE';

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action,
      module: 'SERVICE_PRICING',
      targetId: updated.id,
      targetName: `Tarif Layanan ${existing.serviceId}`,
      description: `Memperbarui informasi tarif ID ${updated.id} (${pricingType}) (Status: ${updated.status})`
    });

    return updated;
  },

  async archivePricing(id: string, actor: { id: string; email: string; name: string }): Promise<ServicePricingEntity> {
    return this.updatePricing(id, { status: 'archived' }, actor);
  },

  async restorePricing(id: string, actor: { id: string; email: string; name: string }): Promise<ServicePricingEntity> {
    return this.updatePricing(id, { status: 'active' }, actor);
  },

  // ==========================================
  // PHASE 4H: BULK OPERATIONS & DATA MANAGEMENT
  // ==========================================
  async bulkUpdateServices(
    serviceIds: string[],
    updates: {
      status?: ServiceStatus;
      categoryId?: string;
      clusterId?: string;
      unitId?: string;
      locationId?: string;
    },
    actor: { id: string; email: string; name: string }
  ): Promise<{ updatedCount: number }> {
    if (!serviceIds || serviceIds.length === 0) return { updatedCount: 0 };

    const services = getStoredServices();
    const categories = getStoredCategories();
    const clusters = getStoredClusters();
    const units = getStoredUnits();
    const locations = getStoredLocations();

    let categoryName: string | undefined;
    if (updates.categoryId) {
      const cat = categories.find(c => c.id === updates.categoryId);
      categoryName = cat ? cat.name : '';
    }

    let clusterName: string | undefined;
    if (updates.clusterId) {
      const cls = clusters.find(c => c.id === updates.clusterId);
      clusterName = cls ? cls.name : '';
    }

    let unitName: string | undefined;
    if (updates.unitId) {
      const u = units.find(unit => unit.id === updates.unitId);
      unitName = u ? u.name : '';
    }

    let locationName: string | undefined;
    if (updates.locationId) {
      const loc = locations.find(l => l.id === updates.locationId);
      locationName = loc ? loc.name : '';
    }

    let count = 0;
    const updatedServices = services.map(s => {
      if (!serviceIds.includes(s.id)) return s;

      count++;
      const isNowPublishing = updates.status === 'published' && s.status !== 'published';

      return {
        ...s,
        ...(updates.status ? { status: updates.status } : {}),
        ...(updates.categoryId ? { categoryId: updates.categoryId, categoryName } : {}),
        ...(updates.clusterId ? { clusterId: updates.clusterId, clusterName } : {}),
        ...(updates.unitId ? { unitId: updates.unitId, unitName } : {}),
        ...(updates.locationId ? { locationId: updates.locationId, locationName } : {}),
        updatedAt: new Date().toISOString(),
        updatedBy: { id: actor.id, name: actor.name, email: actor.email },
        ...(isNowPublishing ? {
          publishedAt: new Date().toISOString(),
          publishedBy: { id: actor.id, name: actor.name }
        } : {})
      };
    });

    saveStoredServices(updatedServices);

    const actionDesc = updates.status 
      ? `Aksi massal status (${updates.status.toUpperCase()})` 
      : 'Aksi massal relasi data (kategori/klaster/unit/lokasi)';

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'UPDATE',
      module: 'SERVICES',
      description: `${actionDesc} berhasil diperbarui untuk ${count} layanan kesehatan.`
    });

    return { updatedCount: count };
  },

  async getServiceDataQualityReport(): Promise<Array<{
    service: ServiceEntity;
    score: number;
    qualityStatus: 'complete' | 'partial' | 'incomplete';
    missingItems: string[];
    primaryMissingTab: 'info' | 'requirements' | 'procedures' | 'products' | 'standards' | 'schedules' | 'pricing';
  }>> {
    const services = await servicesApi.getServices();
    const allReqs = getStoredRequirements();
    const allProcs = getStoredProcedures();
    const allProds = getStoredProducts();
    const allStds = getStoredStandards();
    const allSchedules = getStoredSchedules();
    const allPricings = getStoredPricing();

    return services.map(s => {
      const missingItems: string[] = [];
      let missingTab: 'info' | 'requirements' | 'procedures' | 'products' | 'standards' | 'schedules' | 'pricing' = 'info';

      // Criteria 1: Name & Short Desc
      if (!s.name || !s.shortDescription) {
        missingItems.push('Informasi Umum (Deskripsi Singkat)');
      }

      // Criteria 2: Category
      if (!s.categoryId) {
        missingItems.push('Kategori Layanan');
      }

      // Criteria 3: Unit
      if (!s.unitId) {
        missingItems.push('Unit Pelayanan');
      }

      // Criteria 4: Location
      if (!s.locationId) {
        missingItems.push('Lokasi Pelayanan');
      }

      // Criteria 5: Requirements
      const hasReqs = allReqs.some(r => r.serviceId === s.id && r.status !== 'archived');
      if (!hasReqs) {
        missingItems.push('Persyaratan Layanan');
        if (missingItems.length === 1) missingTab = 'requirements';
      }

      // Criteria 6: Procedures
      const hasProcs = allProcs.some(p => p.serviceId === s.id && p.status !== 'archived');
      if (!hasProcs) {
        missingItems.push('Prosedur & Alur Pelayanan');
        if (missingItems.length === 1) missingTab = 'procedures';
      }

      // Criteria 7: Schedule
      const hasSchedule = allSchedules.some(sch => sch.serviceId === s.id && sch.rules && sch.rules.some(r => r.isOpen));
      if (!hasSchedule) {
        missingItems.push('Jadwal Operasional');
        if (missingItems.length === 1) missingTab = 'schedules';
      }

      // Criteria 8: Pricing
      const hasPricing = allPricings.some(pr => pr.serviceId === s.id && pr.status !== 'archived');
      if (!hasPricing) {
        missingItems.push('Informasi Tarif');
        if (missingItems.length === 1) missingTab = 'pricing';
      }

      const totalCriteria = 8;
      const metCriteria = totalCriteria - missingItems.length;
      const score = Math.round((metCriteria / totalCriteria) * 100);

      let qualityStatus: 'complete' | 'partial' | 'incomplete' = 'complete';
      if (score < 50) {
        qualityStatus = 'incomplete';
      } else if (score < 100) {
        qualityStatus = 'partial';
      }

      return {
        service: s,
        score,
        qualityStatus,
        missingItems,
        primaryMissingTab: missingTab
      };
    });
  },

  async importServicesBatch(
    rows: Array<{
      name: string;
      description?: string;
      shortDescription?: string;
      category?: string;
      cluster?: string;
      unit?: string;
      location?: string;
      status?: string;
    }>,
    actor: { id: string; email: string; name: string },
    options: { skipDuplicates?: boolean } = { skipDuplicates: true }
  ): Promise<{
    totalProcessed: number;
    successCount: number;
    failedCount: number;
    errors: string[];
  }> {
    const existingServices = getStoredServices();
    const categories = getStoredCategories();
    const clusters = getStoredClusters();
    const units = getStoredUnits();
    const locations = getStoredLocations();

    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];
    const newServices: ServiceEntity[] = [...existingServices];

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      const rowNum = index + 1;

      const name = row.name?.trim();
      if (!name) {
        errors.push(`Baris ${rowNum}: Nama layanan kosong.`);
        failedCount++;
        continue;
      }

      // Duplicate check
      const isDuplicate = newServices.some(
        s => s.name.toLowerCase() === name.toLowerCase() || s.slug === generateSlug(name)
      );

      if (isDuplicate) {
        if (options.skipDuplicates) {
          errors.push(`Baris ${rowNum}: Layanan "${name}" dilewati karena duplikat.`);
          failedCount++;
          continue;
        }
      }

      // Match relations
      let categoryId = '';
      let categoryName = '';
      if (row.category) {
        const catQuery = row.category.trim().toLowerCase();
        const cat = categories.find(
          c => c.name.toLowerCase() === catQuery || c.id.toLowerCase() === catQuery || c.slug.toLowerCase() === catQuery
        );
        if (cat) {
          categoryId = cat.id;
          categoryName = cat.name;
        } else {
          errors.push(`Baris ${rowNum}: Kategori "${row.category}" tidak ditemukan.`);
          failedCount++;
          continue;
        }
      }

      let clusterId = '';
      let clusterName = '';
      if (row.cluster) {
        const clsQuery = row.cluster.trim().toLowerCase();
        const cls = clusters.find(
          c => c.name.toLowerCase() === clsQuery || c.id.toLowerCase() === clsQuery || c.slug.toLowerCase() === clsQuery
        );
        if (cls) {
          clusterId = cls.id;
          clusterName = cls.name;
        }
      }

      let unitId = '';
      let unitName = '';
      if (row.unit) {
        const unitQuery = row.unit.trim().toLowerCase();
        const u = units.find(
          unit => unit.name.toLowerCase() === unitQuery || unit.id.toLowerCase() === unitQuery || unit.code?.toLowerCase() === unitQuery
        );
        if (u) {
          unitId = u.id;
          unitName = u.name;
        }
      }

      let locationId = '';
      let locationName = '';
      if (row.location) {
        const locQuery = row.location.trim().toLowerCase();
        const loc = locations.find(
          l => l.name.toLowerCase() === locQuery || l.id.toLowerCase() === locQuery
        );
        if (loc) {
          locationId = loc.id;
          locationName = loc.name;
        }
      }

      const status: ServiceStatus = (row.status?.trim().toLowerCase() as ServiceStatus) || 'draft';
      const validStatus: ServiceStatus = ['draft', 'published', 'archived'].includes(status) ? status : 'draft';

      const createdService: ServiceEntity = {
        id: `srv-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name,
        slug: generateSlug(name, undefined, newServices),
        shortDescription: row.shortDescription || row.description?.slice(0, 150) || '',
        description: row.description || '',
        status: validStatus,
        categoryId,
        categoryName,
        clusterId,
        clusterName,
        unitId,
        unitName,
        locationId,
        locationName,
        featured: false,
        displayOrder: newServices.length + 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: { id: actor.id, name: actor.name, email: actor.email },
        publishedAt: validStatus === 'published' ? new Date().toISOString() : undefined,
        publishedBy: validStatus === 'published' ? { id: actor.id, name: actor.name } : undefined,
        seoTitle: name,
        seoDescription: row.shortDescription || ''
      };

      newServices.push(createdService);
      successCount++;
    }

    if (successCount > 0) {
      saveStoredServices(newServices);
    }

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'CREATE',
      module: 'SERVICES',
      description: `Import massal data layanan dari file CSV. Total baris: ${rows.length}, Berhasil: ${successCount}, Gagal/Dilewati: ${failedCount}.`
    });

    return {
      totalProcessed: rows.length,
      successCount,
      failedCount,
      errors
    };
  }
};

export const DEFAULT_DAYS: { day: DayOfWeek; label: string }[] = [
  { day: 'monday', label: 'Senin' },
  { day: 'tuesday', label: 'Selasa' },
  { day: 'wednesday', label: 'Rabu' },
  { day: 'thursday', label: 'Kamis' },
  { day: 'friday', label: 'Jumat' },
  { day: 'saturday', label: 'Sabtu' },
  { day: 'sunday', label: 'Minggu' }
];


export function createDefaultScheduleRules(serviceId: string): ServiceScheduleRuleEntity[] {
  return DEFAULT_DAYS.map((d, index) => {
    const isWeekend = d.day === 'sunday';
    return {
      id: `rule-${serviceId}-${d.day}`,
      serviceId,
      dayOfWeek: d.day,
      isOpen: !isWeekend,
      openTime: !isWeekend ? '08:00' : undefined,
      closeTime: !isWeekend ? '15:00' : undefined,
      breakStart: !isWeekend ? '12:00' : undefined,
      breakEnd: !isWeekend ? '13:00' : undefined,
      displayOrder: index + 1,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  });
}


function getStoredSchedules(): ServiceScheduleEntity[] {
  try {
    const raw = memStore.getItem(SCHEDULES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredSchedules(data: ServiceScheduleEntity[]) {
  try {
    memStore.setItem(SCHEDULES_STORAGE_KEY, JSON.stringify(data));
    saveSingleDocument('service_engine', 'schedules', data, SCHEDULES_STORAGE_KEY).catch(() => {});
    fetch('/api/db/service_schedules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).catch(() => {});
  } catch (err) {
    console.error('Failed to save schedules:', err);
  }
}

function getStoredExceptions(): ServiceScheduleExceptionEntity[] {
  try {
    const raw = memStore.getItem(EXCEPTIONS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredExceptions(data: ServiceScheduleExceptionEntity[]) {
  try {
    memStore.setItem(EXCEPTIONS_STORAGE_KEY, JSON.stringify(data));
    saveSingleDocument('service_engine', 'schedule_exceptions', data, EXCEPTIONS_STORAGE_KEY).catch(() => {});
    fetch('/api/db/service_schedule_exceptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).catch(() => {});
  } catch (err) {
    console.error('Failed to save exceptions:', err);
  }
}

export const INITIAL_PRICING: ServicePricingEntity[] = [
  {
    id: 'prc-inap-bpjs',
    serviceId: 'srv-7',
    pricingType: 'free',
    amount: 0,
    currency: 'IDR',
    unit: 'Pasien BPJS / KIS',
    description: 'Bebas biaya 100% ditanggung BPJS Kesehatan sesuai hak kepesertaan FKTP.',
    status: 'active',
    effectiveFrom: '2024-01-01',
    createdAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    createdBy: { id: 'usr-superadmin-01', name: 'Administrator Utama', email: 'admin@puskesmas.go.id' }
  },
  {
    id: 'prc-inap-umum',
    serviceId: 'srv-7',
    pricingType: 'fixed',
    amount: 120000,
    currency: 'IDR',
    unit: 'per hari rawat inap',
    description: 'Tarif retribusi rawat inap umum (kamar perawatan, visite dokter rutin, dan asuhan keperawatan 24 jam) sesuai Perda.',
    status: 'active',
    effectiveFrom: '2024-01-01',
    createdAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    createdBy: { id: 'usr-superadmin-01', name: 'Administrator Utama', email: 'admin@puskesmas.go.id' }
  }
];

function getStoredPricing(): ServicePricingEntity[] {
  try {
    const raw = memStore.getItem(PRICING_STORAGE_KEY);
    if (!raw) {
      fetch('/api/db/service_pricing').then(r => r.json()).then(res => {
        const arrData = Array.isArray(res) ? res : (res && Array.isArray(res.docs) ? res.docs : (res && res.success && Array.isArray(res.data) ? res.data : null)); if (arrData) {
          memStore.setItem(PRICING_STORAGE_KEY, JSON.stringify(arrData));
        }
      }).catch(() => {});
      return [];
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveStoredPricing(data: ServicePricingEntity[]) {
  try {
    memStore.setItem(PRICING_STORAGE_KEY, JSON.stringify(data));
    saveSingleDocument('service_engine', 'pricing', data, PRICING_STORAGE_KEY).catch(() => {});
    fetch('/api/db/service_pricing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).catch(() => {});
  } catch (err) {
    console.error('Failed to save pricing:', err);
  }
}


export function validateTimeRule(rule: Partial<ServiceScheduleRuleEntity>): string | null {
  if (!rule.isOpen) return null;

  if (!rule.openTime || !rule.closeTime) {
    return 'Jam buka dan jam tutup wajib diisi jika layanan dibuka.';
  }

  if (rule.openTime >= rule.closeTime) {
    return `Jam buka (${rule.openTime}) harus lebih awal dari jam tutup (${rule.closeTime}).`;
  }

  if (rule.breakStart || rule.breakEnd) {
    if (!rule.breakStart || !rule.breakEnd) {
      return 'Jam mulai dan jam selesai istirahat harus diisi secara lengkap.';
    }

    if (rule.breakStart >= rule.breakEnd) {
      return `Jam mulai istirahat (${rule.breakStart}) harus lebih awal dari jam selesai istirahat (${rule.breakEnd}).`;
    }

    if (rule.breakStart < rule.openTime) {
      return `Jam istirahat (${rule.breakStart}) tidak boleh dimulai sebelum jam buka (${rule.openTime}).`;
    }

    if (rule.breakEnd > rule.closeTime) {
      return `Jam istirahat (${rule.breakEnd}) tidak boleh selesai setelah jam tutup (${rule.closeTime}).`;
    }
  }

  return null;
}

export function checkPricingRangeOverlap(
  serviceId: string,
  excludeId: string | undefined,
  effectiveFrom: string,
  effectiveUntil: string | undefined,
  allPricing: ServicePricingEntity[]
): string | null {
  const activePricing = allPricing.filter(
    p => p.serviceId === serviceId && p.status === 'active' && p.id !== excludeId
  );

  for (const p of activePricing) {
    const startA = effectiveFrom;
    const endA = effectiveUntil || '9999-12-31';
    const startB = p.effectiveFrom;
    const endB = p.effectiveUntil || '9999-12-31';

    if (startA <= endB && startB <= endA) {
      return `Periode berlaku (${effectiveFrom} s.d ${effectiveUntil || 'Seterusnya'}) bertabrakan dengan tarif aktif ID ${p.id} (${p.effectiveFrom} s.d ${p.effectiveUntil || 'Seterusnya'}).`;
    }
  }

  return null;
}


export interface OperationalStatusResult {
  code: 'open' | 'closed' | 'break' | 'outside_hours' | 'special_schedule';
  label: string;
  badgeVariant: 'emerald' | 'red' | 'amber' | 'secondary' | 'purple';
  detail: string;
  isSpecialSchedule: boolean;
}

export function calculateTodayOperationalStatus(
  service: ServiceEntity,
  schedule: ServiceScheduleEntity | null,
  exceptions: ServiceScheduleExceptionEntity[],
  now: Date = new Date()
): OperationalStatusResult {
  if (service.status !== 'published') {
    return {
      code: 'closed',
      label: 'Tutup',
      badgeVariant: 'red',
      detail: 'Layanan saat ini tidak dipublikasikan',
      isSpecialSchedule: false
    };
  }

  const tz = schedule?.timezone || 'Asia/Jakarta';

  let todayStr = '';
  let currentTimeStr = '';
  let currentDayName = '';

  try {
    const formatterDate = new Intl.DateTimeFormat('sv-SE', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
    todayStr = formatterDate.format(now);

    const formatterTime = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false });
    currentTimeStr = formatterTime.format(now);

    const formatterDay = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'long' });
    currentDayName = formatterDay.format(now).toLowerCase();
  } catch {
    todayStr = now.toISOString().split('T')[0];
    currentTimeStr = now.toTimeString().slice(0, 5);
    const dayNames: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    currentDayName = dayNames[now.getDay()];
  }

  // 1. Check Schedule Exception
  const activeExceptions = exceptions.filter(e => e.status !== 'archived' && e.date === todayStr);
  const todayException = activeExceptions[0];

  if (todayException) {
    if (todayException.type === 'closed' || !todayException.isOpen) {
      return {
        code: 'closed',
        label: 'Tutup (Jadwal Khusus)',
        badgeVariant: 'red',
        detail: todayException.reason || 'Libur / Jadwal Khusus Hari Ini',
        isSpecialSchedule: true
      };
    }

    const openTime = todayException.openTime || '08:00';
    const closeTime = todayException.closeTime || '12:00';

    if (currentTimeStr < openTime || currentTimeStr >= closeTime) {
      return {
        code: 'outside_hours',
        label: 'Di luar Jam Pelayanan',
        badgeVariant: 'secondary',
        detail: `Jadwal khusus hari ini: ${openTime} – ${closeTime} (${todayException.reason})`,
        isSpecialSchedule: true
      };
    }

    if (todayException.breakStart && todayException.breakEnd) {
      if (currentTimeStr >= todayException.breakStart && currentTimeStr < todayException.breakEnd) {
        return {
          code: 'break',
          label: 'Sedang Istirahat',
          badgeVariant: 'amber',
          detail: `Waktu istirahat khusus: ${todayException.breakStart} – ${todayException.breakEnd}`,
          isSpecialSchedule: true
        };
      }
    }

    return {
      code: 'open',
      label: 'Buka (Jadwal Khusus)',
      badgeVariant: 'emerald',
      detail: `Jadwal khusus hari ini s.d ${closeTime} (${todayException.reason})`,
      isSpecialSchedule: true
    };
  }

  // 2. Weekly Schedule Rules
  if (!schedule || !schedule.rules || schedule.rules.length === 0) {
    return {
      code: 'closed',
      label: 'Tutup',
      badgeVariant: 'red',
      detail: 'Jadwal operasional belum diatur',
      isSpecialSchedule: false
    };
  }

  const dayRule = schedule.rules.find(r => r.dayOfWeek === currentDayName);

  if (!dayRule || !dayRule.isOpen) {
    return {
      code: 'closed',
      label: 'Tutup',
      badgeVariant: 'red',
      detail: 'Tidak ada jadwal pelayanan pada hari ini',
      isSpecialSchedule: false
    };
  }

  const openTime = dayRule.openTime || '08:00';
  const closeTime = dayRule.closeTime || '15:00';

  if (currentTimeStr < openTime || currentTimeStr >= closeTime) {
    return {
      code: 'outside_hours',
      label: 'Di luar Jam Pelayanan',
      badgeVariant: 'secondary',
      detail: `Jam operasional reguler hari ini: ${openTime} – ${closeTime}`,
      isSpecialSchedule: false
    };
  }

  if (dayRule.breakStart && dayRule.breakEnd) {
    if (currentTimeStr >= dayRule.breakStart && currentTimeStr < dayRule.breakEnd) {
      return {
        code: 'break',
        label: 'Sedang Istirahat',
        badgeVariant: 'amber',
        detail: `Waktu istirahat pelayanan: ${dayRule.breakStart} – ${dayRule.breakEnd}`,
        isSpecialSchedule: false
      };
    }
  }

  return {
    code: 'open',
    label: 'Buka',
    badgeVariant: 'emerald',
    detail: `Layanan beroperasi reguler s.d ${closeTime}`,
    isSpecialSchedule: false
  };
}



