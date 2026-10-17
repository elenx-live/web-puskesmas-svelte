// TAHAP 3 — hasil pemecahan serviceEngineService.ts (perilaku TIDAK berubah).
import type { ServiceUnitEntity } from '../../types/index.js';
import { auditService, getStoredUnits, saveStoredUnits, getStoredServices, saveStoredServices } from "./common.js";
export const unitsApi = {
  async getUnits(filter?: { search?: string; status?: string }): Promise<ServiceUnitEntity[]> {
    let units = getStoredUnits();
    const services = getStoredServices();

    if (filter) {
      if (filter.status) {
        units = units.filter(u => u.status === filter.status);
      }
      if (filter.search) {
        const q = filter.search.toLowerCase();
        units = units.filter(
          u =>
            u.name.toLowerCase().includes(q) ||
            (u.code && u.code.toLowerCase().includes(q)) ||
            (u.description && u.description.toLowerCase().includes(q))
        );
      }
    }

    return units
      .map(u => ({
        ...u,
        serviceCount: services.filter(s => s.unitId === u.id && s.status !== 'archived').length
      }))
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  },

  async getUnitById(id: string): Promise<ServiceUnitEntity | null> {
    const units = await this.getUnits();
    return units.find(u => u.id === id) || null;
  },

  async createUnit(
    data: Partial<ServiceUnitEntity>,
    actor: { id: string; email: string; name: string }
  ): Promise<ServiceUnitEntity> {
    const units = getStoredUnits();
    const name = data.name?.trim();
    if (!name) throw new Error('Nama unit pelayanan wajib diisi');

    const code = data.code?.trim().toUpperCase() || '';
    if (code && units.some(u => u.code?.toUpperCase() === code)) {
      throw new Error(`Kode unit "${code}" sudah digunakan.`);
    }

    const newUnit: ServiceUnitEntity = {
      id: `unit-${Date.now()}`,
      name,
      code,
      description: data.description || '',
      status: data.status || 'active',
      displayOrder: typeof data.displayOrder === 'number' ? data.displayOrder : units.length + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: { id: actor.id, name: actor.name, email: actor.email }
    };

    saveStoredUnits([...units, newUnit]);

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'CREATE',
      module: 'SERVICE_UNITS',
      targetId: newUnit.id,
      targetName: newUnit.name,
      description: `Membuat unit pelayanan baru: "${newUnit.name}" (${newUnit.code || 'Tanpa Kode'})`
    });

    return newUnit;
  },

  async updateUnit(
    id: string,
    updates: Partial<ServiceUnitEntity>,
    actor: { id: string; email: string; name: string }
  ): Promise<ServiceUnitEntity> {
    const units = getStoredUnits();
    const index = units.findIndex(u => u.id === id);
    if (index === -1) throw new Error('Unit pelayanan tidak ditemukan');

    const existing = units[index];

    const code = updates.code !== undefined ? updates.code.trim().toUpperCase() : existing.code;
    if (code && units.some(u => u.code?.toUpperCase() === code && u.id !== id)) {
      throw new Error(`Kode unit "${code}" sudah digunakan.`);
    }

    const updatedUnit: ServiceUnitEntity = {
      ...existing,
      ...updates,
      code,
      updatedAt: new Date().toISOString(),
      updatedBy: { id: actor.id, name: actor.name, email: actor.email }
    };

    units[index] = updatedUnit;
    saveStoredUnits(units);

    // Sync unit name in services
    if (updatedUnit.name !== existing.name) {
      const services = getStoredServices().map(s =>
        s.unitId === id ? { ...s, unitName: updatedUnit.name } : s
      );
      saveStoredServices(services);
    }

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'UPDATE',
      module: 'SERVICE_UNITS',
      targetId: updatedUnit.id,
      targetName: updatedUnit.name,
      description: `Memperbarui unit pelayanan: "${updatedUnit.name}" (Status: ${updatedUnit.status})`
    });

    return updatedUnit;
  },

  async archiveUnit(id: string, actor: { id: string; email: string; name: string }): Promise<ServiceUnitEntity> {
    return this.updateUnit(id, { status: 'archived' }, actor);
  },

  async deleteUnit(id: string, actor: { id: string; email: string; name: string }): Promise<void> {
    const units = getStoredUnits();
    const target = units.find(u => u.id === id);
    if (!target) return;

    // Check usage
    const services = getStoredServices();
    const usedByServices = services.filter(s => s.unitId === id && s.status !== 'archived').length;

    if (usedByServices > 0) {
      throw new Error(`Unit pelayanan tidak dapat dihapus permanen karena masih digunakan oleh ${usedByServices} layanan.`);
    }

    saveStoredUnits(units.filter(u => u.id !== id));

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'DELETE',
      module: 'SERVICE_UNITS',
      targetId: target.id,
      targetName: target.name,
      description: `Menghapus unit pelayanan permanen: "${target.name}"`
    });
  },

  // ==================== LOCATIONS CRUD ====================
};
