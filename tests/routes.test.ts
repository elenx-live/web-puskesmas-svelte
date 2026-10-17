/**
 * Verifikasi registry routing tunggal (TAHAP 1).
 *
 * Memastikan setiap URL hash yang dipakai aplikasi terdaftar tepat satu kali,
 * dan URL ngawur tidak cocok ke rute mana pun (jatuh ke NotFoundPage).
 *
 * Catatan: fungsi matchRoute/matchPath di router.svelte.ts tidak diubah pada
 * tahap ini, sehingga logika pencocokan diuji lewat replika lokal yang identik.
 */
import { describe, it, expect } from 'vitest';
import { featureRoutes } from '../src/features/registry.js';
import type { RouteDef } from '../src/app/router.svelte.js';

// Replika matchPath dari router.svelte.ts (tidak diubah pada tahap ini)
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

const allRoutes: RouteDef[] = [...featureRoutes].sort((a, b) => {
  const dynA = (a.path.match(/:/g) || []).length;
  const dynB = (b.path.match(/:/g) || []).length;
  return dynA - dynB;
});

function findRoute(path: string): RouteDef | null {
  const clean = path.split('?')[0] || '/';
  for (const def of allRoutes) {
    if (matchPath(def.path, clean)) return def;
  }
  return null;
}

describe('registry routing tunggal', () => {
  it('tidak ada path rute yang duplikat', () => {
    const paths = featureRoutes.map((r) => r.path);
    const dupes = paths.filter((p, i) => paths.indexOf(p) !== i);
    expect(dupes).toEqual([]);
  });

  it('setiap rute punya loader lazy dan layout valid', () => {
    for (const r of featureRoutes) {
      expect(typeof r.load, `load() missing for ${r.path}`).toBe('function');
      expect(['public', 'admin', 'none']).toContain(r.layout);
    }
  });

  it('URL publik utama terdaftar', () => {
    const cases: Array<[string, string]> = [
      ['/', '/'],
      ['/search', '/search'],
      ['/login', '/login'],
      ['/layanan', '/layanan'],
      ['/layanan/umum', '/layanan/:slug'],
      ['/fasilitas', '/fasilitas'],
      ['/sarana-prasarana', '/sarana-prasarana'],
      ['/berita', '/berita'],
      ['/berita/slug-xyz', '/berita/:slug'],
      ['/dokumen', '/dokumen'],
      ['/galeri', '/galeri'],
      ['/kontak', '/kontak'],
      ['/lokasi', '/lokasi'],
      ['/kontak-lokasi', '/kontak-lokasi'],
      ['/hubungi-kami', '/hubungi-kami'],
      ['/faq', '/faq'],
      ['/pusat-bantuan', '/pusat-bantuan'],
      ['/pengaduan', '/pengaduan'],
      ['/kritik-saran', '/kritik-saran'],
      ['/pengaduan/cek', '/pengaduan/cek'],
      ['/notifications', '/notifications'],
      ['/aktivitas', '/aktivitas'],
      ['/pendaftaran', '/pendaftaran'],
      ['/pendaftaran/cek', '/pendaftaran/cek'],
      ['/antrian', '/antrian'],
      ['/queue', '/queue'],
      ['/antrian/display', '/antrian/display'],
      ['/survei', '/survei'],
      ['/survei/abc123', '/survei/:id'],
      ['/profil', '/profil'],
      ['/sejarah-puskesmas', '/sejarah-puskesmas'],
      ['/visi-misi', '/visi-misi'],
      ['/struktur-organisasi', '/struktur-organisasi'],
      ['/profil/struktur-organisasi', '/profil/struktur-organisasi'],
      ['/tenaga-kesehatan', '/tenaga-kesehatan'],
      ['/profil/petugas', '/profil/petugas'],
      ['/petugas', '/petugas'],
      ['/informasi', '/informasi'],
      ['/informasi-publik', '/informasi-publik'],
      ['/informasi-publik/slug-x', '/informasi-publik/:slug'],
      ['/permintaan-informasi', '/permintaan-informasi'],
      ['/maklumat', '/maklumat'],
      ['/maklumat-pelayanan', '/maklumat-pelayanan'],
      ['/ppid', '/ppid'],
      ['/microsites', '/microsites'],
      ['/m', '/m'],
      ['/m/slug-x', '/m/:slug'],
      ['/microsite/slug-x', '/microsite/:slug'],
    ];
    for (const [url, expected] of cases) {
      const found = findRoute(url);
      expect(found?.path, `URL ${url}`).toBe(expected);
    }
  });

  it('rute admin terdaftar (termasuk alias)', () => {
    const adminUrls = [
      '/admin',
      '/admin/users',
      '/admin/roles',
      '/admin/theme',
      '/admin/builder',
      '/admin/ai-provider',
      '/admin/ai-providers',
      '/admin/settings/ai-provider',
      '/admin/audit',
      '/admin/audit-logs',
      '/admin/whatsapp',
      '/admin/settings/whatsapp',
      '/admin/system/backup',
      '/admin/system/health',
      '/admin/pengaduan',
      '/admin/survei',
      '/admin/microsites',
    ];
    for (const url of adminUrls) {
      const found = findRoute(url);
      expect(found, `URL ${url} harus terdaftar`).not.toBeNull();
      expect(found?.layout).toBe('admin');
    }
  });

  it('URL ngawur tidak cocok (jatuh ke NotFoundPage)', () => {
    for (const url of ['/ngawur123', '/tidak-ada', '/admin/ngawur', '/blueprint', '/xyz/abc']) {
      expect(findRoute(url), `URL ${url} harus 404`).toBeNull();
    }
  });

  it('rute dinamis tidak menelan rute statis', () => {
    // /maklumat harus cocok /maklumat, bukan /maklumat-pelayanan
    expect(findRoute('/maklumat')?.path).toBe('/maklumat');
    expect(findRoute('/maklumat-pelayanan')?.path).toBe('/maklumat-pelayanan');
    // /informasi vs /informasi-publik
    expect(findRoute('/informasi')?.path).toBe('/informasi');
    expect(findRoute('/informasi-publik')?.path).toBe('/informasi-publik');
  });

  it('param slug/id diteruskan dengan benar', () => {
    const m1 = findRoute('/berita/lonjakan-gula-darah');
    expect(m1?.path).toBe('/berita/:slug');
    const p1 = matchPath(m1!.path, '/berita/lonjakan-gula-darah');
    expect(p1?.slug).toBe('lonjakan-gula-darah');

    const m2 = findRoute('/survei/skm-2026');
    const p2 = matchPath(m2!.path, '/survei/skm-2026');
    expect(p2?.id).toBe('skm-2026');

    const m3 = findRoute('/m/posyandu-melati');
    const p3 = matchPath(m3!.path, '/m/posyandu-melati');
    expect(p3?.slug).toBe('posyandu-melati');
  });
});
