/**
 * Google Identity Services (GIS) helper — pola PeSat.
 * Menggantikan Firebase Auth untuk login Google.
 */

/** Minimal type untuk window.google.accounts.id (tanpa dependensi @types). */
interface GisCredentialResponse {
  credential?: string;
  select_by?: string;
}

interface GisIdConfig {
  client_id: string;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
  callback: (resp: GisCredentialResponse) => void;
}

interface GoogleAccountsId {
  initialize: (config: GisIdConfig) => void;
  prompt: () => void;
  disableAutoSelect: () => void;
  renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: GoogleAccountsId;
      };
    };
  }
}

export type { GisCredentialResponse };

let _gisScriptPromise: Promise<void> | null = null;

/** Muat skrip GIS sekali saja (sudah ada di index.html, tapi pastikan tersedia). */
export function loadGisScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("Bukan environment browser."));
  if (window.google?.accounts?.id) return Promise.resolve();
  if (_gisScriptPromise) return _gisScriptPromise;
  _gisScriptPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => {
      _gisScriptPromise = null;
      reject(new Error("Tidak bisa memuat skrip Google Sign-In. Periksa koneksi internet."));
    };
    document.head.appendChild(s);
  });
  return _gisScriptPromise;
}

/** Ambil Google Client ID dari backend (tidak di-hardcode di frontend). */
export async function getGoogleClientId(): Promise<string> {
  const res = await fetch("/api/auth/config");
  if (!res.ok) throw new Error("Gagal memuat konfigurasi autentikasi.");
  const data = (await res.json()) as { googleClientId?: string };
  const clientId = (data.googleClientId || "").trim();
  if (!clientId) throw new Error("Login Google belum dikonfigurasi di server (GOOGLE_CLIENT_ID kosong).");
  return clientId;
}

/**
 * Minta credential Google via GIS One Tap / account chooser.
 * Resolve dengan ID token (credential) bila user memilih akun.
 * Reject bila dibatalkan atau gagal.
 */
export async function requestGoogleCredential(): Promise<string> {
  await loadGisScript();
  const clientId = await getGoogleClientId();
  const gid = window.google?.accounts?.id;
  if (!gid) throw new Error("Layanan Google Sign-In tidak tersedia di peramban ini.");

  return new Promise<string>((resolve, reject) => {
    let settled = false;
    const done = (fn: () => void) => {
      if (!settled) {
        settled = true;
        fn();
      }
    };
    gid.initialize({
      client_id: clientId,
      auto_select: false,
      cancel_on_tap_outside: true,
      callback: (resp: GisCredentialResponse) => {
        if (resp?.credential) {
          done(() => resolve(resp.credential as string));
        } else {
          done(() => reject(new Error("Login Google dibatalkan.")));
        }
      },
    });
    // Tampilkan pemilih akun
    gid.prompt();
    // Timeout pengaman: bila prompt tidak menghasilkan callback dalam 2 menit
    setTimeout(() => {
      done(() => reject(new Error("Waktu login Google habis. Silakan coba lagi.")));
    }, 120_000);
  });
}

/** Nonaktifkan auto-select GIS (dipakai saat logout). */
export function disableGisAutoSelect(): void {
  try {
    window.google?.accounts?.id?.disableAutoSelect?.();
  } catch {
    /* abaikan */
  }
}

// ---------- Penyimpanan Google ID Token (untuk Bearer di API requests) ----------
const TOKEN_KEY = 'puskesmas_google_token';

/** Ambil Google ID Token tersimpan (null bila belum login). */
export function getGoogleIdToken(): string | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
  } catch {
    return null;
  }
}

/** Simpan Google ID Token setelah login berhasil. */
export function setGoogleIdToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* abaikan */
  }
}

/** Hapus token saat logout. */
export function clearGoogleIdToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* abaikan */
  }
}
