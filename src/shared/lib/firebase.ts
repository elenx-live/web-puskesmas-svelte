import type { FirebaseApp } from 'firebase/app';
import { GoogleAuthProvider } from 'firebase/auth';
import type { Auth } from 'firebase/auth';
import {
  Firestore,
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot 
} from 'firebase/firestore';
import type { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { app as sharedApp, auth as sharedAuth, db as sharedDb } from '../firebase/firebase';
import firebaseConfigJson from '../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: firebaseConfigJson.apiKey,
  authDomain: firebaseConfigJson.authDomain,
  projectId: firebaseConfigJson.projectId,
  storageBucket: firebaseConfigJson.storageBucket,
  messagingSenderId: firebaseConfigJson.messagingSenderId,
  appId: firebaseConfigJson.appId
};

// Unified Firebase Singleton instances
export const app: FirebaseApp = sharedApp;
export const auth: Auth = sharedAuth;
export const db: Firestore = sharedDb;

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const isFirebaseReady = (): boolean => {
  return !!(firebaseConfig.projectId && firebaseConfig.apiKey);
};

/**
 * Helper with timeout to prevent Firestore network stalls from blocking the UI
 */
function withTimeout<T>(promise: Promise<T>, ms: number, fallbackValue: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallbackValue), ms))
  ]);
}

// Queue manager to avoid "Write stream exhausted maximum allowed queued writes"
let pendingWritesCount = 0;
const MAX_CONCURRENT_WRITES = 3;
const writeQueue: Array<() => Promise<void>> = [];

async function processWriteQueue() {
  if (pendingWritesCount >= MAX_CONCURRENT_WRITES || writeQueue.length === 0) return;
  const nextTask = writeQueue.shift();
  if (!nextTask) return;
  
  pendingWritesCount++;
  try {
    await nextTask();
  } catch (e) {
    console.warn('[Firestore Write Queue] Handled write error:', e);
  } finally {
    pendingWritesCount--;
    if (writeQueue.length > 0) {
      setTimeout(processWriteQueue, 50);
    }
  }
}

function enqueueFirestoreWrite(task: () => Promise<void>): void {
  // Prevent infinite queue buildup by capping max queue length
  if (writeQueue.length > 25) {
    writeQueue.splice(0, 5); // discard oldest non-critical background writes
  }
  writeQueue.push(task);
  processWriteQueue();
}

/**
 * Universal Cloud Firestore & Multi-Account Server Persistence Helper
 * Cache-First (Stale-While-Revalidate): Returns local cache instantly (0ms)
 * and synchronizes authoritative state with Cloud Firestore and Central Server Data Store.
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

  // Helper to fetch from VPS SQLite database (FAST - primary source)
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

  // Helper to fetch from central server data store
  const fetchFromServerStore = async (): Promise<T[] | null> => {
    try {
      const srvRes = await fetch(`/api/data/${collectionName}?t=${Date.now()}`);
      if (srvRes.ok) {
        const srvJson = await srvRes.json();
        if (srvJson.success && Array.isArray(srvJson.data)) {
          return srvJson.data as T[];
        }
      }
    } catch {}
    return null;
  };

  // 2. Authoritative sync - VPS DB first (fast), then Firestore, then Server Store
  const revalidateCloudAndServer = async (): Promise<T[] | null> => {
    try {
      let authoritativeList: T[] | null = null;

      // Try VPS SQLite database FIRST (fastest - local)
      const vpsList = await fetchFromVpsDb();
      if (vpsList !== null && vpsList.length > 0) {
        authoritativeList = vpsList;
        applyAuthoritativeData(authoritativeList);
        return authoritativeList;
      }

      // Fallback to Firestore if VPS DB empty/failed
      let firestoreFetched = false;
      try {
        const colRef = collection(db, collectionName);
        const snap = await withTimeout(getDocs(colRef), 4000, null);
        if (snap !== null) {
          firestoreFetched = true;
          const items: T[] = [];
          snap.forEach((docSnap: QueryDocumentSnapshot<DocumentData>) => {
            const data = docSnap.data() as T;
            const docId = docSnap.id;
            items.push({ ...data, id: (data as any).id || docId });
          });
          authoritativeList = items;
        }
      } catch (firestoreErr) {
        console.warn(`[Firestore] Fetch ${collectionName} error:`, firestoreErr);
      }

      // If Firestore network failed or timed out, try central server store
      if (!firestoreFetched && authoritativeList === null) {
        const serverList = await fetchFromServerStore();
        if (serverList !== null) {
          authoritativeList = serverList;
        }
      }

      // If we got an authoritative list (even if empty `[]`), apply it directly!
      if (authoritativeList !== null && Array.isArray(authoritativeList)) {
        applyAuthoritativeData(authoritativeList);
        return authoritativeList;
      }
    } catch (err) {
      console.warn(`[Data Sync] Background sync failed for ${collectionName}:`, err);
    }
    return null;
  };

  // If we had local cache, return it immediately and revalidate in background
  if (localItems !== null) {
    revalidateCloudAndServer().catch(() => {});
    return localItems;
  }

  // If no local cache, perform fetch
  const freshData = await revalidateCloudAndServer();
  if (freshData !== null) {
    return freshData;
  }

  // Fallback if completely offline
  const fallback = defaultInitialData || [];
  applyAuthoritativeData(fallback);
  return fallback;
}

/**
 * Save or Update a single entity in Cloud Firestore, Central Server Store, and LocalStorage
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

  // 2. Synchronize to VPS Database, Central Server Data Store & Cloud Firestore
  try {
    // A. VPS SQLite Database (primary - fast)
    fetch(`/api/db/${collectionName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(err => console.warn(`[VPS-DB] Save to /api/db/${collectionName} error:`, err));

    // B. Server Store (legacy)
    fetch(`/api/data/${collectionName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(err => console.warn(`[Server] Save to /api/data/${collectionName} error:`, err));

    // C. Cloud Firestore (background sync)
    enqueueFirestoreWrite(async () => {
      try {
        const docRef = doc(db, collectionName, entityId);
        await withTimeout(setDoc(docRef, cleanUndefinedValues(payload), { merge: true }), 4000, null);
      } catch (err) {
        console.warn(`[Firestore] setDoc error for ${collectionName}/${entityId}:`, err);
      }
    });
  } catch (error) {
    console.warn(`[Persistence] Save document sync error for ${collectionName}/${entityId}:`, error);
  }
}

/**
 * Delete a document from Cloud Firestore, Central Server Store, and LocalStorage
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

  // 2. Synchronize deletion to VPS Database, Central Server Store and Cloud Firestore
  try {
    // A. VPS SQLite Database (primary - fast)
    fetch(`/api/db/${collectionName}/${encodeURIComponent(docId)}`, {
      method: 'DELETE'
    }).catch(err => console.warn(`[VPS-DB] Delete /api/db/${collectionName}/${docId} error:`, err));

    // B. Server Store (legacy)
    fetch(`/api/data/${collectionName}/${encodeURIComponent(docId)}`, {
      method: 'DELETE'
    }).catch(err => console.warn(`[Server] Delete /api/data/${collectionName}/${docId} error:`, err));

    // C. Cloud Firestore (background sync)
    enqueueFirestoreWrite(async () => {
      try {
        const docRef = doc(db, collectionName, docId);
        await withTimeout(deleteDoc(docRef), 4000, null);
      } catch (err) {
        console.warn(`[Firestore] deleteDoc error for ${collectionName}/${docId}:`, err);
      }
    });
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
 * Optimistic local write first, followed by Cloud Firestore & Central Server Store synchronization
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

  // 2. Sync to VPS Database, Central Server Store and Cloud Firestore
  try {
    // A. VPS SQLite Database (primary - fast)
    fetch(`/api/db/${collectionName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: docId, ...cleanedData })
    }).catch(() => {});

    // B. Server Store (legacy)
    fetch(`/api/data/${collectionName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cleanedData)
    }).catch(() => {});

    if (collectionName === 'site_settings') {
      fetch('/api/site-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanedData)
      }).catch(() => {});
    }

    // B. Cloud Firestore
    enqueueFirestoreWrite(async () => {
      try {
        const docRef = doc(db, collectionName, docId);
        await withTimeout(setDoc(docRef, cleanedData as any, { merge: true }), 4000, null);
        if (collectionName === 'site_settings' && (docId === 'global_settings' || docId === 'global-settings')) {
          const altId = docId === 'global_settings' ? 'global-settings' : 'global_settings';
          const altRef = doc(db, collectionName, altId);
          await withTimeout(setDoc(altRef, cleanedData as any, { merge: true }), 4000, null);
        }
      } catch (err) {
        console.warn(`[Firestore] saveSingleDoc error for ${collectionName}/${docId}:`, err);
      }
    });
  } catch (error) {
    console.warn(`[Persistence] Save single doc sync error for ${collectionName}/${docId}:`, error);
  }
}

/**
 * Get Single Object (e.g. site_settings, contact_settings, homepage)
 * Cache-First: Returns local cache instantly (0ms) and verifies authoritative state across all accounts
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
      // 0. Try VPS SQLite database FIRST (fastest - primary source)
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

      // 1. Try fetching from Server API (central source across all accounts)
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

      // 2. Try fetching from Cloud Firestore
      try {
        const docRef = doc(db, collectionName, docId);
        let snap = await withTimeout(getDoc(docRef), 3000, null as any);
        if ((!snap || !snap.exists()) && collectionName === 'site_settings') {
          const altId = docId === 'global_settings' ? 'global-settings' : 'global_settings';
          snap = await withTimeout(getDoc(doc(db, collectionName, altId)), 3000, null as any);
        }
        if (snap && snap.exists()) {
          const cloudData = { ...defaultInitialData, ...(snap.data() as T) };
          applyDoc(cloudData);
          return cloudData;
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
