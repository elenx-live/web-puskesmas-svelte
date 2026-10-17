import type { UserRole, UserPermission } from '../types/index.js';
import { DEFAULT_ROLES, DEFAULT_PERMISSIONS } from '../firebase/seedData';
import { auditService } from './auditService';
import { getCollectionData, saveDocumentData } from '../lib/firebase';

const ROLES_STORAGE_KEY = 'puskesmas_roles';
const FIRESTORE_COLLECTION = 'roles';

export const roleService = {
  async getRoles(): Promise<UserRole[]> {
    const roles = await getCollectionData<UserRole>(FIRESTORE_COLLECTION, ROLES_STORAGE_KEY, DEFAULT_ROLES);
    // Sync system roles with new permissions added in seedData if needed
    return roles.map(r => {
      const defRole = DEFAULT_ROLES.find(dr => dr.id === r.id);
      if (defRole && r.isSystemRole) {
        const hasDiff = r.permissions.length !== defRole.permissions.length ||
          defRole.permissions.some(p => !r.permissions.includes(p));
        if (hasDiff) {
          return {
            ...r,
            permissions: defRole.permissions,
            updatedAt: new Date().toISOString()
          };
        }
      }
      return r;
    });
  },

  async getRoleById(id: string): Promise<UserRole | null> {
    const roles = await this.getRoles();
    return roles.find(r => r.id === id) || null;
  },

  async getAllPermissions(): Promise<UserPermission[]> {
    return DEFAULT_PERMISSIONS;
  },

  async createRole(role: Omit<UserRole, 'id' | 'updatedAt'>, actor: { id: string; email: string; name: string }): Promise<UserRole> {
    const newRole: UserRole = {
      ...role,
      id: `role-${Date.now()}`,
      updatedAt: new Date().toISOString()
    };

    await saveDocumentData(FIRESTORE_COLLECTION, newRole.id, newRole, ROLES_STORAGE_KEY);

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'CREATE',
      module: 'ROLES',
      targetId: newRole.id,
      targetName: newRole.name,
      description: `Membuat peran baru: ${newRole.name} dengan ${newRole.permissions.length} izin akses.`
    });

    return newRole;
  },

  async updateRole(id: string, updates: Partial<UserRole>, actor: { id: string; email: string; name: string }): Promise<UserRole> {
    const roles = await this.getRoles();
    const index = roles.findIndex(r => r.id === id);
    if (index === -1) throw new Error('Peran tidak ditemukan');

    const updatedRole: UserRole = {
      ...roles[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    await saveDocumentData(FIRESTORE_COLLECTION, updatedRole.id, updatedRole, ROLES_STORAGE_KEY);

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'ROLE_CHANGE',
      module: 'ROLES',
      targetId: updatedRole.id,
      targetName: updatedRole.name,
      description: `Memperbarui hak akses dan izin untuk peran: ${updatedRole.name}.`
    });

    return updatedRole;
  }
};
