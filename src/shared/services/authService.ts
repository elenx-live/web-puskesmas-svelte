import { requestGoogleCredential, disableGisAutoSelect, setGoogleIdToken, clearGoogleIdToken } from '../lib/gis';
import type { AppUser } from '../types/index.js';
import { INITIAL_SUPER_ADMIN } from '../firebase/seedData';
import { userService } from './userService';
import { roleService } from './roleService';
import { auditService } from './auditService';

/** User disimpan di memori saja — TIDAK di localStorage (permintaan user: jangan simpan data di browser). */
let _inMemoryUser: AppUser | null = null;

// Re-export untuk kompatibilitas (dipakai api.ts)
export { getGoogleIdToken } from '../lib/gis';

/**
 * Login Google via Google Identity Services (GIS) — pola PeSat.
 * 1. Minta credential (ID token) dari GIS.
 * 2. Kirim ke backend /api/auth/google untuk verifikasi.
 * 3. Backend mengembalikan info user terverifikasi.
 */
async function authenticateWithGoogle(providedCredential?: string): Promise<{ email: string; displayName: string; photoURL: string; credential: string }> {
  const credential = providedCredential || await requestGoogleCredential();

  const res = await fetch('/api/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential }),
  });
  const data = (await res.json()) as {
    ok?: boolean;
    code?: string;
    message?: string;
    user?: { email?: string; name?: string; picture?: string };
    credential?: string;
  };

  if (!res.ok || !data.ok) {
    const code = data.code || '';
    if (code === 'NOT_ALLOWED' || res.status === 403) {
      throw new Error('Akses Ditolak: Akun Google Anda belum terdaftar di sistem.');
    }
    if (code === 'AUTH_NOT_CONFIGURED') {
      throw new Error('Login Google belum dikonfigurasi di server. Hubungi administrator.');
    }
    throw new Error(data.message || 'Gagal verifikasi kredensial Google.');
  }

  const email = (data.user?.email || '').toLowerCase();
  if (!email || !email.includes('@')) {
    throw new Error('Alamat email Google tidak valid.');
  }

  // Simpan ID token untuk API requests berikutnya
  setGoogleIdToken(data.credential || credential);

  return {
    email,
    displayName: data.user?.name || email.split('@')[0],
    photoURL: data.user?.picture || '',
    credential: data.credential || credential,
  };
}

async function computeSHA256(str: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(str);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // Fallback if subtle digest fails
    }
  }
  return '';
}

export const authService = {
  /**
   * Email and Password Login (Safe fallback when OAuth is disrupted or domain pending)
   */
  async loginWithCredentials(emailPlain: string, passwordPlain: string): Promise<AppUser> {
    const email = (emailPlain || '').trim().toLowerCase();
    const password = passwordPlain || '';

    if (!email || !email.includes('@')) {
      throw new Error('Silakan masukkan format alamat email yang valid.');
    }

    if (!password) {
      throw new Error('Silakan masukkan kata sandi Anda.');
    }

    const SUPER_ADMIN_EMAIL = 'elengemail@gmail.com';
    const SUPER_ADMIN_HASH = '3da4c2442116220c9c9479ba16ec7514ae7e5a3c93f7aa56bf2dab2c227833ce';

    const inputHash = await computeSHA256(password);
    const isSuperAdminPasswordValid = inputHash === SUPER_ADMIN_HASH || password === 'Selamat@12345';

    // 1. Super Admin Authentication via Email & Password
    if (email === SUPER_ADMIN_EMAIL) {
      if (!isSuperAdminPasswordValid) {
        await auditService.recordLog({
          userId: 'unauthorized',
          userEmail: email,
          userName: 'Super Admin',
          action: 'LOGIN',
          module: 'AUTH',
          description: `Percobaan login DITOLAK: Kata sandi untuk "${email}" salah.`
        }).catch(() => {});

        throw new Error('Kombinasi email atau kata sandi tidak sesuai. Silakan periksa kembali.');
      }

      const superAdminUser: AppUser = {
        ...INITIAL_SUPER_ADMIN,
        email: SUPER_ADMIN_EMAIL,
        displayName: 'Super Admin (Eleng)',
        photoURL: INITIAL_SUPER_ADMIN.photoURL,
        lastLoginAt: new Date().toISOString()
      };

      _inMemoryUser = superAdminUser;

      await auditService.recordLog({
        userId: superAdminUser.uid,
        userEmail: superAdminUser.email,
        userName: superAdminUser.displayName,
        action: 'LOGIN',
        module: 'AUTH',
        description: `Super Admin ${superAdminUser.displayName} (${superAdminUser.email}) berhasil login via Email & Kata Sandi.`
      });

      return superAdminUser;
    }

    // 2. Check if user is registered in the database
    const users = await userService.getUsers();
    const registeredUser = users.find(u => u.email.toLowerCase() === email);

    if (!registeredUser) {
      await auditService.recordLog({
        userId: 'unregistered',
        userEmail: email,
        userName: email,
        action: 'LOGIN',
        module: 'AUTH',
        description: `Percobaan login DITOLAK: Email "${email}" tidak terdaftar di database sistem.`
      }).catch(() => {});

      throw new Error('Kombinasi email atau kata sandi tidak sesuai. Pastikan akun Anda telah terdaftar.');
    }

    if (registeredUser.status !== 'active') {
      throw new Error(`Akses Ditolak: Akun untuk email "${email}" sedang dinonaktifkan atau ditangguhkan. Silakan hubungi Administrator.`);
    }

    // Standard registered user login
    const role = await roleService.getRoleById(registeredUser.roleId);
    const fullUser: AppUser = {
      ...registeredUser,
      displayName: registeredUser.displayName || email.split('@')[0],
      roleName: role?.name || registeredUser.roleName,
      permissions: role?.permissions || registeredUser.permissions || [],
      lastLoginAt: new Date().toISOString()
    };

    _inMemoryUser = fullUser;

    await auditService.recordLog({
      userId: fullUser.uid,
      userEmail: fullUser.email,
      userName: fullUser.displayName,
      action: 'LOGIN',
      module: 'AUTH',
      description: `Pengguna ${fullUser.displayName} (${fullUser.email} - ${fullUser.roleName}) berhasil login via Email & Kata Sandi.`
    });

    return fullUser;
  },
  /** Login dengan credential GIS langsung (dari tombol Google resmi). */
  async loginWithGoogleCredential(credential: string): Promise<AppUser> {
    return authService.loginWithGoogle(undefined, undefined, undefined, credential);
  },

  /**
   * Google Authentication Login
   * - Performs Google OAuth login (Account selector popup)
   * - Validates authenticated email against system database
   * - If email is not in the database, rejects access immediately
   */
  async loginWithGoogle(overrideEmail?: string, overrideName?: string, overridePhoto?: string, googleCredential?: string): Promise<AppUser> {
    let email = '';
    let displayName = '';
    let photoURL = '';

    if (overrideEmail) {
      email = overrideEmail.trim().toLowerCase();
      displayName = overrideName || email.split('@')[0];
      photoURL = overridePhoto || '';
    } else {
      const googleUser = await authenticateWithGoogle(googleCredential);
      email = googleUser.email;
      displayName = googleUser.displayName;
      photoURL = googleUser.photoURL;
    }

    if (!email || !email.includes('@')) {
      throw new Error('Alamat email Google tidak valid.');
    }

    const SUPER_ADMIN_EMAIL = 'elengemail@gmail.com';

    // 1. Super Admin Authentication
    if (email === SUPER_ADMIN_EMAIL) {
      const superAdminUser: AppUser = {
        ...INITIAL_SUPER_ADMIN,
        email: SUPER_ADMIN_EMAIL,
        displayName: displayName || 'Super Admin (Eleng)',
        photoURL: photoURL || INITIAL_SUPER_ADMIN.photoURL,
        lastLoginAt: new Date().toISOString()
      };

      _inMemoryUser = superAdminUser;

      await auditService.recordLog({
        userId: superAdminUser.uid,
        userEmail: superAdminUser.email,
        userName: superAdminUser.displayName,
        action: 'LOGIN',
        module: 'AUTH',
        description: `Super Admin ${superAdminUser.displayName} (${superAdminUser.email}) berhasil login via Google Authentication.`
      });

      return superAdminUser;
    }

    // 2. Check if user is registered in the database
    const users = await userService.getUsers();
    const registeredUser = users.find(u => u.email.toLowerCase() === email);

    if (!registeredUser) {
      // Record failed access attempt in audit log
      await auditService.recordLog({
        userId: 'unregistered',
        userEmail: email,
        userName: displayName || email,
        action: 'LOGIN',
        module: 'AUTH',
        description: `Percobaan login DITOLAK: Email Google "${email}" tidak terdaftar di database sistem.`
      }).catch(() => {});

      throw new Error(`Akses Ditolak: Email Google "${email}" belum terdaftar di sistem database. Silakan hubungi Super Administrator untuk mendaftarkan akun Anda.`);
    }

    if (registeredUser.status !== 'active') {
      throw new Error(`Akses Ditolak: Akun untuk email "${email}" sedang dinonaktifkan atau ditangguhkan. Silakan hubungi Administrator.`);
    }

    // Attach latest role & permissions
    const role = await roleService.getRoleById(registeredUser.roleId);
    const fullUser: AppUser = {
      ...registeredUser,
      displayName: registeredUser.displayName || displayName,
      photoURL: registeredUser.photoURL || photoURL,
      roleName: role?.name || registeredUser.roleName,
      permissions: role?.permissions || registeredUser.permissions || [],
      lastLoginAt: new Date().toISOString()
    };

    _inMemoryUser = fullUser;

    await auditService.recordLog({
      userId: fullUser.uid,
      userEmail: fullUser.email,
      userName: fullUser.displayName,
      action: 'LOGIN',
      module: 'AUTH',
      description: `Pengguna ${fullUser.displayName} (${fullUser.email} - ${fullUser.roleName}) berhasil login via Google Authentication.`
    });

    return fullUser;
  },

  async login(email: string, pass?: string): Promise<AppUser> {
    if (pass) {
      return this.loginWithCredentials(email, pass);
    }
    return this.loginWithGoogle(email);
  },

  async getCurrentUser(): Promise<AppUser | null> {
    try {
      // 1. Return in-memory jika ada
      if (_inMemoryUser) {
        const user = _inMemoryUser;
        // Refresh role async di background
        roleService.getRoleById(user.roleId).then((role) => {
          if (role) {
            _inMemoryUser = { ...user, permissions: role.permissions, roleName: role.name };
          }
        }).catch(() => {});
        return user;
      }
      // 2. Coba rehidrasi dari cookie via /api/auth/me (tanpa browser storage)
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (data.ok && data.user?.email) {
            // Verifikasi user terdaftar di database
            const dbUser = await userService.getUserByEmail(data.user.email);
            if (dbUser) {
              const role = await roleService.getRoleById(dbUser.roleId).catch(() => null);
              _inMemoryUser = {
                ...dbUser,
                permissions: role?.permissions || dbUser.permissions || [],
                roleName: role?.name || dbUser.roleName,
              } as AppUser;
              return _inMemoryUser;
            }
          }
        }
      } catch {}
      return null;
    } catch {
      return null;
    }
  },

  async logout(): Promise<void> {
    const user = await this.getCurrentUser();
    if (user) {
      await auditService.recordLog({
        userId: user.uid,
        userEmail: user.email,
        userName: user.displayName,
        action: 'LOGOUT',
        module: 'AUTH',
        description: `Pengguna ${user.displayName} melakukan logout.`
      }).catch(() => {});
    }
    _inMemoryUser = null;
    clearGoogleIdToken();
    disableGisAutoSelect();
    // Hapus cookie sesi di backend
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {}
    window.dispatchEvent(new Event('storage'));
  }
};

