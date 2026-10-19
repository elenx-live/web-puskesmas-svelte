// Lapisan database SQLite (node:sqlite bawaan Node 22.5+, tanpa dependensi native).
// Menggantikan penyimpanan file JSON yang tersebar (site_settings.json,
// data_store/*.json, microsites_data.json, dsb).
//
// Skema:
//   kv_store(collection TEXT PRIMARY KEY, value TEXT)   — dokumen tunggal (JSON string)
//   items(collection TEXT, id TEXT, data TEXT, slug TEXT, status TEXT, updated_at TEXT)
//                                                     — koleksi array, PRIMARY KEY (collection, id)
import { DatabaseSync } from "node:sqlite";
import path from "path";

const DB_FILE = path.join(process.cwd(), "puskesmas.db");

let db: DatabaseSync | null = null;

/** Koneksi database singleton (lazy). Mengaktifkan WAL agar aman untuk akses konkuren. */
export function getDb(): DatabaseSync {
  if (!db) {
    db = new DatabaseSync(DB_FILE);
    db.exec("PRAGMA journal_mode = WAL;");
    db.exec("PRAGMA synchronous = NORMAL;");
    db.exec(`
      CREATE TABLE IF NOT EXISTS kv_store (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS items (
        collection TEXT NOT NULL,
        id TEXT NOT NULL,
        data TEXT NOT NULL,
        slug TEXT,
        status TEXT,
        updated_at TEXT,
        PRIMARY KEY (collection, id)
      );
      CREATE INDEX IF NOT EXISTS idx_items_collection_slug ON items(collection, slug);
      CREATE INDEX IF NOT EXISTS idx_items_collection_status ON items(collection, status);
    `);
  }
  return db;
}

/** Ambil dokumen tunggal (JSON string) atau null bila belum ada. */
export function kvGet(key: string): string | null {
  try {
    const row = getDb()
      .prepare("SELECT value FROM kv_store WHERE key = ?")
      .get(key) as { value: string } | undefined;
    return row ? row.value : null;
  } catch (e) {
    console.error(`[db] kvGet ${key}:`, e);
    return null;
  }
}

/** Simpan dokumen tunggal (JSON string). */
export function kvSet(key: string, value: string): boolean {
  try {
    getDb()
      .prepare("INSERT INTO kv_store (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
      .run(key, value);
    return true;
  } catch (e) {
    console.error(`[db] kvSet ${key}:`, e);
    return false;
  }
}

/** Ambil dokumen tunggal sebagai objek (atau null bila belum ada / bukan JSON valid). */
export function kvGetJson<T = Record<string, any>>(key: string): T | null {
  const raw = kvGet(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** Simpan objek sebagai dokumen tunggal. */
export function kvSetJson(key: string, value: unknown): boolean {
  return kvSet(key, JSON.stringify(value));
}

/** Tentukan id unik sebuah item (prioritas: id > uid > docId > slug > fallback). */
export function extractId(item: Record<string, any>): string {
  const raw = item?.id ?? item?.uid ?? item?.docId ?? item?.slug;
  if (raw !== undefined && raw !== null && String(raw).trim() !== "") {
    return String(raw);
  }
  return `item-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

function indexColumns(item: Record<string, any>): { slug: string | null; status: string | null; updatedAt: string | null } {
  const slug = item?.slug != null && String(item.slug).trim() !== "" ? String(item.slug) : null;
  const status = item?.status != null && String(item.status).trim() !== "" ? String(item.status) : null;
  const updatedAt =
    item?.updatedAt != null && String(item.updatedAt).trim() !== ""
      ? String(item.updatedAt)
      : item?.updated_at != null
        ? String(item.updated_at)
        : new Date().toISOString();
  return { slug, status, updatedAt };
}

/** Ambil seluruh item sebuah koleksi sebagai array objek (urut terbaru dulu bila ada updated_at). */
export function itemsAll(collection: string): any[] {
  try {
    const rows = getDb()
      .prepare("SELECT data FROM items WHERE collection = ? ORDER BY updated_at DESC")
      .all(collection) as { data: string }[];
    const out: any[] = [];
    for (const r of rows) {
      try {
        out.push(JSON.parse(r.data));
      } catch {}
    }
    return out;
  } catch (e) {
    console.error(`[db] itemsAll ${collection}:`, e);
    return [];
  }
}

/** Ambil satu item berdasarkan id. */
export function itemsGet(collection: string, id: string): any | null {
  try {
    const row = getDb()
      .prepare("SELECT data FROM items WHERE collection = ? AND id = ?")
      .get(collection, id) as { data: string } | undefined;
    if (!row) return null;
    try {
      return JSON.parse(row.data);
    } catch {
      return null;
    }
  } catch (e) {
    console.error(`[db] itemsGet ${collection}/${id}:`, e);
    return null;
  }
}

/** Insert atau update satu item (upsert berdasarkan id). */
export function itemsUpsert(collection: string, item: Record<string, any>): string {
  const id = extractId(item);
  const payload = { ...item, id };
  const { slug, status, updatedAt } = indexColumns(payload);
  try {
    getDb()
      .prepare(
        `INSERT INTO items (collection, id, data, slug, status, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(collection, id) DO UPDATE SET
           data = excluded.data, slug = excluded.slug,
           status = excluded.status, updated_at = excluded.updated_at`
      )
      .run(collection, id, JSON.stringify(payload), slug, status, updatedAt);
  } catch (e) {
    console.error(`[db] itemsUpsert ${collection}/${id}:`, e);
  }
  return id;
}

/** Hapus satu item berdasarkan id. */
export function itemsDelete(collection: string, id: string): void {
  try {
    getDb().prepare("DELETE FROM items WHERE collection = ? AND id = ?").run(collection, id);
  } catch (e) {
    console.error(`[db] itemsDelete ${collection}/${id}:`, e);
  }
}

/** Ganti seluruh isi koleksi (dipakai untuk full-sync dari panel). */
export function itemsReplaceAll(collection: string, items: Record<string, any>[]): void {
  const database = getDb();
  const del = database.prepare("DELETE FROM items WHERE collection = ?");
  const ins = database.prepare(
    "INSERT INTO items (collection, id, data, slug, status, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
  );
  try {
    database.exec("BEGIN");
    del.run(collection);
    for (const rawItem of items) {
      const id = extractId(rawItem);
      const payload = { ...rawItem, id };
      const { slug, status, updatedAt } = indexColumns(payload);
      ins.run(collection, id, JSON.stringify(payload), slug, status, updatedAt);
    }
    database.exec("COMMIT");
  } catch (e) {
    try {
      database.exec("ROLLBACK");
    } catch {}
    console.error(`[db] itemsReplaceAll ${collection}:`, e);
  }
}

/** Jumlah item dalam koleksi (untuk diagnostik). */
export function itemsCount(collection: string): number {
  try {
    const row = getDb()
      .prepare("SELECT COUNT(*) AS n FROM items WHERE collection = ?")
      .get(collection) as { n: number } | undefined;
    return row?.n ?? 0;
  } catch {
    return 0;
  }
}

/** Tutup koneksi (dipakai saat shutdown bila perlu). */
export function closeDb(): void {
  try {
    db?.close();
  } catch {}
  db = null;
}
