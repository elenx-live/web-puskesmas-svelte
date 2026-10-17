/**
 * Firestore Sync module - Deprecated and replaced by authoritative on-demand Firestore services in src/lib/firebase.ts
 */
export async function initFirestoreSync(): Promise<void> {
  // Inert no-op to prevent queued write stream resource exhaustion
}

export async function pushLocalKeyToFirestore(_localStorageKey: string): Promise<void> {
  // Inert no-op
}

export async function forceSyncAllToFirestore(): Promise<void> {
  // Inert no-op
}
