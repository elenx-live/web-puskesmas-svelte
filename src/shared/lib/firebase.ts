import type { FirebaseApp } from 'firebase/app';
import { GoogleAuthProvider } from 'firebase/auth';
import type { Auth } from 'firebase/auth';
import { app as sharedApp, auth as sharedAuth } from '../firebase/firebase';
import firebaseConfigJson from '../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: firebaseConfigJson.apiKey,
  authDomain: firebaseConfigJson.authDomain,
  projectId: firebaseConfigJson.projectId,
  storageBucket: firebaseConfigJson.storageBucket,
  messagingSenderId: firebaseConfigJson.messagingSenderId,
  appId: firebaseConfigJson.appId
};

// Unified Firebase Singleton instances (Auth only - Firestore removed)
export const app: FirebaseApp = sharedApp;
export const auth: Auth = sharedAuth;

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const isFirebaseReady = (): boolean => {
  return !!(firebaseConfig.projectId && firebaseConfig.apiKey);
};

/**
 * Universal VPS SQLite Database Persistence Helper (/api/db/*)
 * Cache-First (Stale-While-Revalidate): Returns local cache instantly (0ms)
 * and synchronizes authoritative state with VPS SQLite database.
 * Firestore fallback has been removed - /api/db/* is the only source.
 */
export async function getCollectionData<T extends { id?: string; uid?: string }>(
  collectionName: string,
  localStorageKey: string,
  defaultInitialData: T[] = []
): Promise<T[]> {
  // 1. Check local cache first for instant 0ms initial rendering
  let localItems: T[] | null = null;
  try {
    const local = localStorage.getItem(localStorageKey);
    if (local !== null) {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed)) {
        localItems = parsed;
      }
    }
  } catch (e) {
    console.warn(`[Storage Cache] Read error for ${localStorageKey}:`, e);
  }

  // Helper to update cache and dispatch update event
  const applyAuthoritativeData = (authoritativeList: T[]) => {
    try {
      localStorage.setItem(localStorageKey, JSON.stringify(authoritativeList));
      window.dispatchEvent(new CustomEvent('puskesmas_collection_updated', {
        detail: { collectionName, localStorageKey, count: authoritativeList.length }
      }));
      window.dispatchEvent(new CustomEvent(`puskesmas_${collectionName}_updated`, {
        detail: authoritativeList
      }));
    } catch (e) {
      console.warn(`[Storage Cache] Write error for ${localStorageKey}:`, e);
    }
  };

  // Helper to fetch from VPS SQLite database (/api/db/*) - the ONLY source
  const fetchFromVpsDb = async (): Promise<T[] | null> => {
    try {
      const res = await fetch(`/api/db/${collectionName}?t=${Date.now()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.docs && Array.isArray(json.docs)) {
          return json.docs as T[];
        }
      }
    } catch {}
    return null;
  };

  // 2. Authoritative sync - VPS SQLite database only (no Firestore fallback)
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

  // If we had local cache, return it immediately and revalidate in background
  if (localItems !== null) {
    revalidateFromVps().catch(() => {});
    return localItems;
  }

  // If no local cache, fetch from VPS DB
  const freshData = await revalidateFromVps();
  if (freshData !== null) {
    return freshData;
  }

  // Fallback if completely offline
  const fallback = defaultInitialData || [];
  applyAuthoritativeData(fallback);
  return fallback;
}

/**
 * Save or Update a single entity in VPS SQLite database (/api/db/*) and LocalStorage
 */
export async function saveDocumentData<T extends { id?: string; uid?: string; slug?: string }>(
  collectionName: string,
  docId: string,
  data: T,
  localStorageKey: string
): Promise<void> {
  const entityId = docId || (data as any).id || (data as any).uid || String(Date.now());
  const payload = { ...data, id: entityId };

  // 1. Optimistic immediate update to LocalStorage cache (0ms)
  try {
    const local = localStorage.getItem(localStorageKey);
    let items: Record<string, unknown>[] = local ? JSON.parse(local) : [];
    if (!Array.isArray(items)) items = [];
    const index = items.findIndex((i: Record<string, unknown>) => (i.id === entityId || i.uid === entityId));
    if (index >= 0) {
      items[index] = { ...items[index], ...payload };
    } else {
      items.unshift(payload);
    }
    localStorage.setItem(localStorageKey, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent('puskesmas_collection_updated', {
      detail: { collectionName, localStorageKey, count: items.length }
    }));
    window.dispatchEvent(new CustomEvent(`puskesmas_${collectionName}_updated`, {
      detail: items
    }));
  } catch (e) {
    console.warn(`[Storage] Local cache save failed for ${localStorageKey}:`, e);
  }

  // 2. Persist to VPS SQLite Database via /api/db/* (only)
  try {
    fetch(`/api/db/${collectionName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(err => console.warn(`[VPS-DB] Save to /api/db/${collectionName} error:`, err));
  } catch (error) {
    console.warn(`[Persistence] Save document sync error for ${collectionName}/${entityId}:`, error);
  }
}

/**
 * Delete a document from VPS SQLite database (/api/db/*) and LocalStorage
 */
export async function deleteDocumentData(
  collectionName: string,
  docId: string,
  localStorageKey: string
): Promise<void> {
  // 1. Optimistic immediate removal from LocalStorage cache (0ms)
  try {
    const local = localStorage.getItem(localStorageKey);
    if (local) {
      const items: Record<string, unknown>[] = JSON.parse(local);
      if (Array.isArray(items)) {
        const filtered = items.filter((i: Record<string, unknown>) => i.id !== docId && i.uid !== docId && i.slug !== docId);
        localStorage.setItem(localStorageKey, JSON.stringify(filtered));
        window.dispatchEvent(new CustomEvent('puskesmas_collection_updated', {
          detail: { collectionName, localStorageKey, count: filtered.length }
        }));
        window.dispatchEvent(new CustomEvent(`puskesmas_${collectionName}_updated`, {
          detail: filtered
        }));
      }
    }
  } catch (e) {
    console.warn(`[Storage] Local delete failed for ${localStorageKey}:`, e);
  }

  // 2. Delete from VPS SQLite Database via /api/db/* (only)
  try {
    fetch(`/api/db/${collectionName}/${encodeURIComponent(docId)}`, {
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
 * Optimistic local write first, followed by VPS SQLite database (/api/db/*) sync.
 * Firestore fallback has been removed.
 */
export async function saveSingleDocument<T>(
  collectionName: string,
  docId: string,
  data: T,
  localStorageKey: string
): Promise<void> {
  const cleanedData = cleanUndefinedValues(data);

  // 1. Optimistic immediate write to LocalStorage (0ms)
  try {
    localStorage.setItem(localStorageKey, JSON.stringify(cleanedData));
    window.dispatchEvent(new CustomEvent('puskesmas_doc_updated', {
      detail: { collectionName, docId, localStorageKey, data: cleanedData }
    }));
    if (collectionName === 'site_settings') {
      window.dispatchEvent(new CustomEvent('puskesmas_settings_updated', { detail: cleanedData }));
    }
  } catch (e) {
    console.warn(`[Storage] Local save failed for ${localStorageKey}:`, e);
  }

  // 2. Sync to VPS SQLite Database via /api/db/* (only)
  try {
    fetch(`/api/db/${collectionName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: docId, ...cleanedData })
    }).catch(() => {});

    if (collectionName === 'site_settings') {
      fetch('/api/site-settings', {
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
 * Cache-First: Returns local cache instantly (0ms) and revalidates from VPS SQLite database (/api/db/*).
 * Firestore fallback has been removed.
 */
export async function getSingleDocument<T>(
  collectionName: string,
  docId: string,
  localStorageKey: string,
  defaultInitialData: T
): Promise<T> {
  let localData: T | null = null;

  // 1. Check local cache first for instant 0ms rendering
  try {
    const local = localStorage.getItem(localStorageKey);
    if (local) {
      const parsed = JSON.parse(local);
      if (parsed && typeof parsed === 'object') {
        localData = parsed;
      }
    }
  } catch (e) {
    console.warn(`[Storage] Read error for ${localStorageKey}:`, e);
  }

  const applyDoc = (authoritativeData: T) => {
    try {
      localStorage.setItem(localStorageKey, JSON.stringify(authoritativeData));
      window.dispatchEvent(new CustomEvent('puskesmas_doc_updated', {
        detail: { collectionName, docId, localStorageKey, data: authoritativeData }
      }));
      if (collectionName === 'site_settings') {
        window.dispatchEvent(new CustomEvent('puskesmas_settings_updated', { detail: authoritativeData }));
      }
    } catch {}
  };

  const revalidateDoc = async (): Promise<T | null> => {
    try {
      // Try VPS SQLite database via /api/db/* (the ONLY source - no Firestore fallback)
      try {
        const vpsRes = await fetch(`/api/db/${collectionName}/${encodeURIComponent(docId)}?t=${Date.now()}`);
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

      // Try dedicated server API endpoints (backend, not Firestore)
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

  if (localData !== null) {
    revalidateDoc().catch(() => {});
    return localData;
  }

  const fresh = await revalidateDoc();
  if (fresh !== null) return fresh;

  const fallback = defaultInitialData;
  applyDoc(fallback);
  return fallback;
}
