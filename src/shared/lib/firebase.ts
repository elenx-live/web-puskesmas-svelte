import type { FirebaseApp } from 'firebase/app';
import { app as sharedApp } from '../firebase/firebase';
import firebaseConfigJson from '../../firebase-applet-config.json';
import { apiFetch } from './api';

const firebaseConfig = {
  apiKey: firebaseConfigJson.apiKey,
  authDomain: firebaseConfigJson.authDomain,
  projectId: firebaseConfigJson.projectId,
  storageBucket: firebaseConfigJson.storageBucket,
  messagingSenderId: firebaseConfigJson.messagingSenderId,
  appId: firebaseConfigJson.appId
};

// Unified Firebase Singleton instance (app saja; Auth tidak dipakai lagi — login via GIS)
export const app: FirebaseApp = sharedApp;

export const isFirebaseReady = (): boolean => {
  return !!(firebaseConfig.projectId && firebaseConfig.apiKey);
};

/**
 * Cache in-memory per sesi — TIDAK disimpan di browser (aturan: jangan simpan data di browser).
 * Hilang saat refresh. TTL pendek 60 detik agar data tetap segar.
 */
const memCache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL_MS = 60_000;

function memGet<T>(key: string): T | null {
  const entry = memCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    memCache.delete(key);
    return null;
  }
  return entry.data as T;
}

function memSet(key: string, data: unknown): void {
  memCache.set(key, { data, ts: Date.now() });
}

/**
 * Universal VPS SQLite Database Persistence Helper (/api/db/*)
 * In-memory cache (stale-while-revalidate): kembalikan cache memori instan (0ms)
 * dan sinkronkan state otoritatif dengan database SQLite VPS.
 * TIDAK ada localStorage. Firestore fallback sudah dihapus - /api/db/* satu-satunya sumber.
 */
export async function getCollectionData<T extends { id?: string; uid?: string }>(
  collectionName: string,
  cacheKey: string,
  defaultInitialData: T[] = []
): Promise<T[]> {
  // 1. Cek cache memori dulu untuk render instan
  const cached = memGet<T[]>(cacheKey);

  // Helper untuk update cache memori dan dispatch event update
  const applyAuthoritativeData = (authoritativeList: T[]) => {
    memSet(cacheKey, authoritativeList);
    window.dispatchEvent(new CustomEvent('puskesmas_collection_updated', {
      detail: { collectionName, cacheKey, count: authoritativeList.length }
    }));
    window.dispatchEvent(new CustomEvent(`puskesmas_${collectionName}_updated`, {
      detail: authoritativeList
    }));
  };

  // Helper untuk fetch dari VPS SQLite database (/api/db/*) - satu-satunya sumber
  const fetchFromVpsDb = async (): Promise<T[] | null> => {
    try {
      const res = await apiFetch(`/api/db/${collectionName}?t=${Date.now()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.docs && Array.isArray(json.docs)) {
          return json.docs as T[];
        }
      }
    } catch {}
    return null;
  };

  // 2. Sinkronisasi otoritatif - VPS SQLite database saja (tanpa Firestore fallback)
  const revalidateFromVps = async (): Promise<T[] | null> => {
    try {
      const vpsList = await fetchFromVpsDb();
      if (vpsList !== null) {
        applyAuthoritativeData(vpsList);
        return vpsList;
      }
    } catch (err) {
      console.warn(`[Data Sync] VPS DB sync failed for ${collectionName}:`, err);
    }
    return null;
  };

  // Jika ada cache memori, kembalikan langsung dan revalidasi di background
  if (cached !== null) {
    revalidateFromVps().catch(() => {});
    return cached;
  }

  // Jika tidak ada cache, fetch dari VPS DB
  const freshData = await revalidateFromVps();
  if (freshData !== null) {
    return freshData;
  }

  // Fallback jika benar-benar offline
  const fallback = defaultInitialData || [];
  applyAuthoritativeData(fallback);
  return fallback;
}

/**
 * Save or Update a single entity in VPS SQLite database (/api/db/*)
 * Optimistic update ke cache memori dulu, lalu sinkron ke server.
 */
export async function saveDocumentData<T extends { id?: string; uid?: string; slug?: string }>(
  collectionName: string,
  docId: string,
  data: T,
  cacheKey: string
): Promise<void> {
  const entityId = docId || (data as any).id || (data as any).uid || String(Date.now());
  const payload = { ...data, id: entityId };

  // 1. Optimistic immediate update ke cache memori (0ms)
  try {
    let items = memGet<Record<string, unknown>[]>(cacheKey);
    if (!Array.isArray(items)) items = [];
    const index = items.findIndex((i: Record<string, unknown>) => (i.id === entityId || i.uid === entityId));
    if (index >= 0) {
      items[index] = { ...items[index], ...payload };
    } else {
      items.unshift(payload);
    }
    memSet(cacheKey, items);
    window.dispatchEvent(new CustomEvent('puskesmas_collection_updated', {
      detail: { collectionName, cacheKey, count: items.length }
    }));
    window.dispatchEvent(new CustomEvent(`puskesmas_${collectionName}_updated`, {
      detail: items
    }));
  } catch (e) {
    console.warn(`[Storage] Memory cache save failed for ${cacheKey}:`, e);
  }

  // 2. Persist ke VPS SQLite Database via /api/db/* (satu-satunya)
  try {
    apiFetch(`/api/db/${collectionName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(err => console.warn(`[VPS-DB] Save to /api/db/${collectionName} error:`, err));
  } catch (error) {
    console.warn(`[Persistence] Save document sync error for ${collectionName}/${entityId}:`, error);
  }
}

/**
 * Delete a document from VPS SQLite database (/api/db/*)
 * Optimistic removal dari cache memori dulu, lalu sinkron ke server.
 */
export async function deleteDocumentData(
  collectionName: string,
  docId: string,
  cacheKey: string
): Promise<void> {
  // 1. Optimistic immediate removal dari cache memori (0ms)
  try {
    const items = memGet<Record<string, unknown>[]>(cacheKey);
    if (Array.isArray(items)) {
      const filtered = items.filter((i: Record<string, unknown>) => i.id !== docId && i.uid !== docId && i.slug !== docId);
      memSet(cacheKey, filtered);
      window.dispatchEvent(new CustomEvent('puskesmas_collection_updated', {
        detail: { collectionName, cacheKey, count: filtered.length }
      }));
      window.dispatchEvent(new CustomEvent(`puskesmas_${collectionName}_updated`, {
        detail: filtered
      }));
    }
  } catch (e) {
    console.warn(`[Storage] Memory delete failed for ${cacheKey}:`, e);
  }

  // 2. Delete dari VPS SQLite Database via /api/db/* (satu-satunya)
  try {
    apiFetch(`/api/db/${collectionName}/${encodeURIComponent(docId)}`, {
      method: 'DELETE'
    }).catch(err => console.warn(`[VPS-DB] Delete /api/db/${collectionName}/${docId} error:`, err));
  } catch (error) {
    console.warn(`[Persistence] Delete document sync error for ${collectionName}/${docId}:`, error);
  }
}

function cleanUndefinedValues(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) {
    return obj.map(item => cleanUndefinedValues(item));
  }
  if (typeof obj === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = cleanUndefinedValues(value);
      }
    }
    return cleaned;
  }
  return obj;
}

/**
 * Save Single Object (e.g. site_settings, contact_settings, homepage, theme)
 * Optimistic write ke memori dulu, diikuti sinkron VPS SQLite database (/api/db/*).
 * Firestore fallback sudah dihapus.
 */
export async function saveSingleDocument<T>(
  collectionName: string,
  docId: string,
  data: T,
  cacheKey: string
): Promise<void> {
  const cleanedData = cleanUndefinedValues(data);

  // 1. Optimistic immediate write ke cache memori (0ms)
  try {
    memSet(cacheKey, cleanedData);
    window.dispatchEvent(new CustomEvent('puskesmas_doc_updated', {
      detail: { collectionName, docId, cacheKey, data: cleanedData }
    }));
    if (collectionName === 'site_settings') {
      window.dispatchEvent(new CustomEvent('puskesmas_settings_updated', { detail: cleanedData }));
    }
  } catch (e) {
    console.warn(`[Storage] Memory save failed for ${cacheKey}:`, e);
  }

  // 2. Sync ke VPS SQLite Database via /api/db/* (satu-satunya)
  try {
    apiFetch(`/api/db/${collectionName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: docId, ...cleanedData })
    }).catch(() => {});

    if (collectionName === 'site_settings') {
    apiFetch('/api/site-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanedData)
      }).catch(() => {});
    }
  } catch (error) {
    console.warn(`[Persistence] Save single doc sync error for ${collectionName}/${docId}:`, error);
  }
}

/**
 * Get Single Object (e.g. site_settings, contact_settings, homepage)
 * In-memory cache: kembalikan cache memori instan (0ms) dan revalidasi dari VPS SQLite database (/api/db/*).
 * Firestore fallback sudah dihapus.
 */
export async function getSingleDocument<T>(
  collectionName: string,
  docId: string,
  cacheKey: string,
  defaultInitialData: T
): Promise<T> {
  const cached = memGet<T>(cacheKey);

  const applyDoc = (authoritativeData: T) => {
    memSet(cacheKey, authoritativeData);
    window.dispatchEvent(new CustomEvent('puskesmas_doc_updated', {
      detail: { collectionName, docId, cacheKey, data: authoritativeData }
    }));
    if (collectionName === 'site_settings') {
      window.dispatchEvent(new CustomEvent('puskesmas_settings_updated', { detail: authoritativeData }));
    }
  };

  const revalidateDoc = async (): Promise<T | null> => {
    try {
      // Coba VPS SQLite database via /api/db/* (satu-satunya sumber - tanpa Firestore fallback)
      try {
        const vpsRes = await apiFetch(`/api/db/${collectionName}/${encodeURIComponent(docId)}?t=${Date.now()}`);
        if (vpsRes.ok) {
          const vpsJson = await vpsRes.json();
          if (vpsJson && typeof vpsJson === 'object' && !vpsJson.error) {
            const { id: _, ...docData } = vpsJson;
            const merged = { ...defaultInitialData, ...docData };
            applyDoc(merged);
            return merged;
          }
        }
      } catch {}

      // Coba dedicated server API endpoints (backend, bukan Firestore)
      try {
        const url = collectionName === 'site_settings'
          ? `/api/site-settings?t=${Date.now()}`
          : `/api/data/${collectionName}?t=${Date.now()}`;
        const srvRes = await fetch(url);
        if (srvRes.ok) {
          const srvJson = await srvRes.json();
          const srvData = srvJson.settings || srvJson.contactSettings || srvJson.data;
          if (srvData && typeof srvData === 'object') {
            const merged = { ...defaultInitialData, ...srvData };
            applyDoc(merged);
            return merged;
          }
        }
      } catch {}
    } catch (err) {
      console.warn(`[Data Sync] Revalidate single doc failed for ${collectionName}:`, err);
    }
    return null;
  };

  if (cached !== null) {
    revalidateDoc().catch(() => {});
    return cached;
  }

  const fresh = await revalidateDoc();
  if (fresh !== null) return fresh;

  const fallback = defaultInitialData;
  applyDoc(fallback);
  return fallback;
}
