/**
 * Hash router ringan dengan lazy loading per fitur.
 *
 * Setiap fitur mendaftarkan rutenya lewat `src/features/<nama>/routes.ts`.
 * Router mencocokkan hash saat ini, memuat komponen fitur secara lazy
 * (satu chunk per fitur), lalu merendernya di dalam layout yang sesuai.
 */
import { featureRoutes } from '../features/registry.js';

export interface RouteDef {
  /** Pola path, mis. '/layanan' atau '/layanan/:slug'. */
  path: string;
  /** Lazy loader komponen halaman fitur. */
  load: () => Promise<{ default: unknown }>;
  /** Layout pembungkus. */
  layout?: 'public' | 'admin' | 'none';
  /** Kode izin granular (khusus rute admin). */
  permission?: string;
  /** Judul untuk dokumen (opsional). */
  title?: string;
}

export interface MatchedRoute {
  def: RouteDef;
  params: Record<string, string>;
}

/** Semua rute dari seluruh fitur, diurutkan: statis dulu, dinamis belakangan. */
const allRoutes: RouteDef[] = [...featureRoutes].sort((a, b) => {
  const dynA = (a.path.match(/:/g) || []).length;
  const dynB = (b.path.match(/:/g) || []).length;
  return dynA - dynB;
});

function matchPath(pattern: string, path: string): Record<string, string> | null {
  const pSegs = pattern.split('/').filter(Boolean);
  const sSegs = path.split('/').filter(Boolean);
  if (pSegs.length !== sSegs.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < pSegs.length; i++) {
    const p = pSegs[i];
    const s = sSegs[i];
    if (p.startsWith(':')) {
      params[p.slice(1)] = decodeURIComponent(s);
    } else if (p !== s) {
      return null;
    }
  }
  return params;
}

/** Cari rute yang cocok untuk path hash (tanpa '#'). */
export function matchRoute(hashPath: string): MatchedRoute | null {
  const clean = hashPath.split('?')[0] || '/';
  for (const def of allRoutes) {
    const params = matchPath(def.path, clean);
    if (params) return { def, params };
  }
  return null;
}

/** Path hash saat ini, mis. '/layanan'. Juga mendukung path-based URL. */
export function currentPath(): string {
  const h = window.location.hash;
  // Jika ada hash (termasuk '#/'), pakai hash sebagai sumber utama
  if (h && h.length > 1) {
    const path = h.slice(1).split('?')[0];
    return path || '/';
  }
  // Fallback ke pathname hanya jika TIDAK ada hash sama sekali
  const p = window.location.pathname;
  if (p && p !== '/' && !p.startsWith('/api/') && !p.includes('.')) {
    return p.split('?')[0] || '/';
  }
  return '/';
}

/** Navigasi ke path hash. */
export function navigate(path: string): void {
  window.location.hash = '#' + (path.startsWith('/') ? path : '/' + path);
}

/** State reaktif rute aktif — dipakai App.svelte. */
export class RouterState {
  path = $state('/');
  query = $state<Record<string, string>>({});
  private onHashChange = () => {
    this.path = currentPath();
    const h = window.location.hash || '#/';
    const [, q] = h.slice(1).split('?');
    // Jika pakai pathname, ambil query dari URL
    const queryStr = q || window.location.search.slice(1);
    this.query = Object.fromEntries(new URLSearchParams(queryStr || '').entries());
  };

  init(): () => void {
    this.onHashChange();
    window.addEventListener('hashchange', this.onHashChange);
    // Juga dengarkan popstate untuk navigasi path-based
    window.addEventListener('popstate', this.onHashChange);
    return () => {
      window.removeEventListener('hashchange', this.onHashChange);
      window.removeEventListener('popstate', this.onHashChange);
    };
  }
}

export const routerState = new RouterState();
