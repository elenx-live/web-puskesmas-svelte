import type { AppUser, UserStatus } from '../types/index.js';
import { INITIAL_SUPER_ADMIN } from '../firebase/seedData';
import { roleService } from './roleService';
import { auditService } from './auditService';
import { getCollectionData, saveDocumentData } from '../lib/firebase';

const USERS_STORAGE_KEY = 'puskesmas_users';
const FIRESTORE_COLLECTION = 'users';

const INITIAL_USERS: AppUser[] = [
  INITIAL_SUPER_ADMIN,
  {
    uid: 'usr-admin-02',
    email: 'budi.website@puskesmas.go.id',
    displayName: 'Budi Santoso',
    photoURL: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=250',
    roleId: 'role-adminwebsite',
    roleName: 'Admin Website',
    status: 'active' as UserStatus,
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    lastLoginAt: new Date(Date.now() - 3600000 * 4).toISOString()
  },
  {
    uid: 'usr-editor-03',
    email: 'siti.editor@puskesmas.go.id',
    displayName: 'Siti Rahmawati',
    photoURL: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=250',
    roleId: 'role-editor',
    roleName: 'Editor Konten',
    status: 'active' as UserStatus,
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    lastLoginAt: new Date(Date.now() - 3600000 * 12).toISOString()
  }
];

export const userService = {
  async getUsers(search?: string, roleId?: string): Promise<AppUser[]> {
    let users = await getCollectionData<AppUser>(FIRESTORE_COLLECTION, USERS_STORAGE_KEY, INITIAL_USERS);

    // Ensure elengemail@gmail.com is always in the user list as Super Admin
    const superAdminIndex = users.findIndex(u => u.email?.toLowerCase() === 'elengemail@gmail.com');
    if (superAdminIndex === -1) {
      users = [INITIAL_SUPER_ADMIN, ...users];
    } else {
      users[superAdminIndex] = {
        ...users[superAdminIndex],
        roleId: 'role-superadmin',
        roleName: 'Super Admin',
        status: 'active'
      };
    }

    if (roleId) {
      users = users.filter(u => u.roleId === roleId);
    }

    if (search) {
      const q = search.toLowerCase();
      users = users.filter(u => 
        u.displayName.toLowerCase().includes(q) || 
        u.email.toLowerCase().includes(q)
      );
    }

    return users;
  },

  async createUser(data: { email: string; displayName: string; roleId: string; status?: UserStatus }, actor: { id: string; email: string; name: string }): Promise<AppUser> {
    const users = await this.getUsers();
    
    if (users.some(u => u.email.toLowerCase() === data.email.toLowerCase())) {
      throw new Error('Email sudah terdaftar dalam sistem');
    }

    const role = await roleService.getRoleById(data.roleId);

    const newUser: AppUser = {
      uid: `usr-${Date.now()}`,
      email: data.email,
      displayName: data.displayName,
      roleId: data.roleId,
      roleName: role?.name || 'User',
      permissions: role?.permissions || [],
      status: data.status || 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await saveDocumentData(FIRESTORE_COLLECTION, newUser.uid, newUser, USERS_STORAGE_KEY);

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'CREATE',
      module: 'USERS',
      targetId: newUser.uid,
      targetName: newUser.displayName,
      description: `Membuat akun pengguna baru: ${newUser.displayName} (${newUser.email}) dengan peran ${newUser.roleName}.`
    });

    return newUser;
  },

  async updateUserRole(uid: string, newRoleId: string, actor: { id: string; email: string; name: string }): Promise<AppUser> {
    const users = await this.getUsers();
    const index = users.findIndex(u => u.uid === uid);
    if (index === -1) throw new Error('Pengguna tidak ditemukan');

    if (users[index].email.toLowerCase() === 'elengemail@gmail.com' && newRoleId !== 'role-superadmin') {
      throw new Error('Peran Super Administrator utama tidak dapat diubah untuk menjaga integritas sistem.');
    }

    const role = await roleService.getRoleById(newRoleId);
    if (!role) throw new Error('Peran tidak valid');

    const updatedUser: AppUser = {
      ...users[index],
      roleId: newRoleId,
      roleName: role.name,
      permissions: role.permissions,
      updatedAt: new Date().toISOString()
    };

    await saveDocumentData(FIRESTORE_COLLECTION, updatedUser.uid, updatedUser, USERS_STORAGE_KEY);

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'ROLE_CHANGE',
      module: 'USERS',
      targetId: updatedUser.uid,
      targetName: updatedUser.displayName,
      description: `Mengubah peran pengguna ${updatedUser.displayName} menjadi ${role.name}.`
    });

    return updatedUser;
  },

  async updateUserStatus(uid: string, status: UserStatus, actor: { id: string; email: string; name: string }): Promise<AppUser> {
    const users = await this.getUsers();
    const index = users.findIndex(u => u.uid === uid);
    if (index === -1) throw new Error('Pengguna tidak ditemukan');

    if (users[index].email.toLowerCase() === 'elengemail@gmail.com' && status === 'inactive') {
      throw new Error('Akun Super Administrator utama tidak dapat dinonaktifkan.');
    }

    const updatedUser: AppUser = {
      ...users[index],
      status,
      updatedAt: new Date().toISOString()
    };

    await saveDocumentData(FIRESTORE_COLLECTION, updatedUser.uid, updatedUser, USERS_STORAGE_KEY);

    await auditService.recordLog({
      userId: actor.id,
      userEmail: actor.email,
      userName: actor.name,
      action: 'UPDATE',
      module: 'USERS',
      targetId: updatedUser.uid,
      targetName: updatedUser.displayName,
      description: `Mengubah status akun ${updatedUser.displayName} menjadi ${status.toUpperCase()}.`
    });

    return updatedUser;
  }
};
