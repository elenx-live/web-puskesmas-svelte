/**
 * Fetch helper yang otomatis melampirkan Google ID Token sebagai Bearer.
 * Dipakai untuk request ke /api/* yang butuh autentikasi.
 */
import { getGoogleIdToken } from './gis';

/** Header Authorization bila ada token tersimpan. */
export function authHeaders(): Record<string, string> {
  const token = getGoogleIdToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * fetch() dengan Authorization header otomatis.
 * Untuk request publik, header diabaikan backend bila tidak ada token.
 */
export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers || {});
  const auth = authHeaders();
  for (const [k, v] of Object.entries(auth)) {
    if (!headers.has(k)) headers.set(k, v);
  }
  return fetch(input, { ...init, headers });
}
