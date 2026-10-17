// TAHAP 3 — hasil pemecahan serviceEngineService.ts (perilaku TIDAK berubah).
import type { ServiceLocationEntity } from '../../types/index.js';
import { auditService, getStoredLocations, saveStoredLocations, getStoredServices, saveStoredServices } from "./common.js";
export const locationsApi = {
  async getLocations(filter?: { search?: string; status?: string }): Promise<ServiceLocationEntity[]> {
    let locations = getStoredLocations();
    const services = getStoredServices();

    if (filter) {
      if (filter.status) {
        locations = locations.filter(l => l.status === filter.status);
      }
      if (filter.search) {
        const q = filter.search.toLowerCase();
        locations = locations.filter(
          l =>
            l.name.toLowerCase().includes(q) ||
            (l.building && l.building.toLowerCase().includes(q)) ||
            (l.room && l.room.toLowerCase().includes(q)) ||
            (l.description && l.description.toLowerCase().includes(q))
        );
      }
    }

    return locations
      .map(l => ({
        ...l,
        serviceCount: services.filter(s => s.locationId === l.id && s.status !== 'archived').length
      }))
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  },

  async getLocationById(id: string): Promise<ServiceLocationEntity | null> {
    const locations = await this.getLocations();
    return locations.find(l => l.id === id) || null;
  },

  async createLocation(
    data: Partial<ServiceLocationEntity>,
    actor: { id: string; email: string; name: string }
  ): Promise<ServiceLocationEntity> {
    const locations = getStoredLocations();
    const name = data.name?.trim();
    if (!name) throw new Error('Nama lokasi layanan wajib diisi');

    const newLocation: ServiceLocationEntity = {
      id: `loc-${Date.now()}`,
      name,
      building: data.building || '',
      floor: data.floor || '',
      room: data.room || '',
      description: data.description || '',
      status: data.status || 'active',
      displayOrder: typeof data.displayOrder === 'number' ? data.displayOrder : locations.length + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: { id: actor.id, name: actor.name, email: actor.email }
    };

    saveStoredLocations([...locations, newLocation]);

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'CREATE',
      module: 'SERVICE_LOCATIONS',
      targetId: newLocation.id,
      targetName: newLocation.name,
      description: `Membuat lokasi pelayanan baru: "${newLocation.name}" (${newLocation.building || ''} ${newLocation.room || ''})`
    });

    return newLocation;
  },

  async updateLocation(
    id: string,
    updates: Partial<ServiceLocationEntity>,
    actor: { id: string; email: string; name: string }
  ): Promise<ServiceLocationEntity> {
    const locations = getStoredLocations();
    const index = locations.findIndex(l => l.id === id);
    if (index === -1) throw new Error('Lokasi pelayanan tidak ditemukan');

    const existing = locations[index];

    const updatedLocation: ServiceLocationEntity = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
      updatedBy: { id: actor.id, name: actor.name, email: actor.email }
    };

    locations[index] = updatedLocation;
    saveStoredLocations(locations);

    // Sync location name in services
    if (updatedLocation.name !== existing.name) {
      const services = getStoredServices().map(s =>
        s.locationId === id ? { ...s, locationName: updatedLocation.name } : s
      );
      saveStoredServices(services);
    }

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'UPDATE',
      module: 'SERVICE_LOCATIONS',
      targetId: updatedLocation.id,
      targetName: updatedLocation.name,
      description: `Memperbarui lokasi pelayanan: "${updatedLocation.name}" (Status: ${updatedLocation.status})`
    });

    return updatedLocation;
  },

  async archiveLocation(id: string, actor: { id: string; email: string; name: string }): Promise<ServiceLocationEntity> {
    return this.updateLocation(id, { status: 'archived' }, actor);
  },

  async deleteLocation(id: string, actor: { id: string; email: string; name: string }): Promise<void> {
    const locations = getStoredLocations();
    const target = locations.find(l => l.id === id);
    if (!target) return;

    // Check usage
    const services = getStoredServices();
    const usedByServices = services.filter(s => s.locationId === id && s.status !== 'archived').length;

    if (usedByServices > 0) {
      throw new Error(`Lokasi pelayanan tidak dapat dihapus permanen karena masih digunakan oleh ${usedByServices} layanan.`);
    }

    saveStoredLocations(locations.filter(l => l.id !== id));

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'DELETE',
      module: 'SERVICE_LOCATIONS',
      targetId: target.id,
      targetName: target.name,
      description: `Menghapus lokasi pelayanan permanen: "${target.name}"`
    });
  },

  // ==================== SERVICES CORE (Phase 4A) ====================
};
