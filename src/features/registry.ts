/**
 * Registri rute seluruh fitur.
 *
 * Setiap fitur mandiri mendaftarkan rutenya di `routes.ts` masing-masing.
 * Router (`src/app/router.ts`) memuat komponen secara lazy per fitur,
 * sehingga satu fitur = satu chunk bundle yang independen.
 *
 * Menambah fitur baru: buat folder `src/features/<nama>/` dengan `routes.ts`,
 * lalu daftarkan di bawah ini.
 */
import type { RouteDef } from '../app/router.svelte.js';

import { berandaRoutes } from './beranda/routes.js';
import { profilRoutes } from './profil/routes.js';
import { layananRoutes } from './layanan/routes.js';
import { beritaRoutes } from './berita/routes.js';
import { dokumenRoutes } from './dokumen/routes.js';
import { galeriRoutes } from './galeri/routes.js';
import { kontakRoutes } from './kontak/routes.js';
import { pengaduanRoutes } from './pengaduan/routes.js';
import { pendaftaranRoutes } from './pendaftaran/routes.js';
import { surveiRoutes } from './survei/routes.js';
import { informasiRoutes } from './informasi/routes.js';
import { micrositeRoutes } from './microsite/routes.js';
import { authRoutes } from './auth/routes.js';
import { errorsRoutes } from './errors/routes.js';
import { adminRoutes } from './admin/routes.js';

export const featureRoutes: RouteDef[] = [
  ...berandaRoutes,
  ...profilRoutes,
  ...layananRoutes,
  ...beritaRoutes,
  ...dokumenRoutes,
  ...galeriRoutes,
  ...kontakRoutes,
  ...pengaduanRoutes,
  ...pendaftaranRoutes,
  ...surveiRoutes,
  ...informasiRoutes,
  ...micrositeRoutes,
  ...authRoutes,
  ...adminRoutes,
  // Rute fallback 404 harus paling akhir
  ...errorsRoutes,
];
