// Migrasi satu-kali: pindahkan seluruh data JSON lama ke SQLite.
// Dijalankan otomatis saat server start (idempotent — dilewati bila flag
// __migrated_v1 sudah ada di kv_store).
//
// Sumber yang dibaca:
//   - File JSON di folder kerja: site_settings.json, data_store_contact.json,
//     theme_published.json, theme_draft.json, homepage_published.json,
//     homepage_draft.json, whatsapp_config.json, whatsapp_logs.json,
//     ai_provider_config.json, microsites_meta.json, posts_meta.json,
//     microsites_data.json, microsites_categories.json
//   - data_store/*.json: array -> koleksi items, objek -> kv dokumen tunggal
import fs from "fs";
import path from "path";
import { kvGetJson, kvSetJson, itemsReplaceAll } from "./db.js";

const MIGRATION_FLAG = "__migrated_v1";

// File root -> key kv_store
const KV_FILE_MAP: Record<string, string> = {
  "site_settings.json": "site_settings",
  "data_store_contact.json": "contact_settings",
  "theme_published.json": "theme_published",
  "theme_draft.json": "theme_draft",
  "homepage_published.json": "homepage_published",
  "homepage_draft.json": "homepage_draft",
  "whatsapp_config.json": "whatsapp_config",
  "whatsapp_logs.json": "whatsapp_logs",
  "ai_provider_config.json": "ai_provider_config",
  "microsites_meta.json": "microsites_meta",
  "posts_meta.json": "posts_meta",
};

// File root berisi array -> koleksi items
const ITEMS_FILE_MAP: Record<string, string> = {
  "microsites_data.json": "microsites",
  "microsites_categories.json": "microsite_categories",
};

// Koleksi data_store yang diperlakukan sebagai dokumen tunggal (bukan array)
const DATASTORE_SINGLE_DOCS = new Set([
  "site_settings",
  "contact_settings",
  "theme",
  "homepage",
  "theme_draft",
  "homepage_draft",
]);

function readJsonFile(filePath: string): unknown | undefined {
  try {
    if (!fs.existsSync(filePath)) return undefined;
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch (e) {
    console.error(`[migrate] gagal baca ${filePath}:`, e);
    return undefined;
  }
}

function isRecord(v: unknown): v is Record<string, any> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

export function migrateJsonToSqlite(): void {
  if (kvGetJson(MIGRATION_FLAG)) {
    return; // sudah dimigrasi
  }
  const cwd = process.cwd();
  let importedFiles = 0;
  let importedItems = 0;

  // 1. File JSON di root -> kv_store (merge dengan nilai yang sudah ada bila ada)
  for (const [fileName, kvKey] of Object.entries(KV_FILE_MAP)) {
    const parsed = readJsonFile(path.join(cwd, fileName));
    if (parsed === undefined) continue;
    const existing = kvGetJson<Record<string, any>>(kvKey);
    if (isRecord(existing) && isRecord(parsed)) {
      kvSetJson(kvKey, { ...existing, ...parsed });
    } else {
      kvSetJson(kvKey, parsed);
    }
    importedFiles++;
  }

  // 2. File JSON array di root -> tabel items
  for (const [fileName, collection] of Object.entries(ITEMS_FILE_MAP)) {
    const parsed = readJsonFile(path.join(cwd, fileName));
    if (Array.isArray(parsed) && parsed.length > 0) {
      itemsReplaceAll(collection, parsed);
      importedFiles++;
      importedItems += parsed.length;
    }
  }

  // 3. data_store/*.json
  const dataStoreDir = path.join(cwd, "data_store");
  try {
    if (fs.existsSync(dataStoreDir)) {
      for (const fileName of fs.readdirSync(dataStoreDir)) {
        if (!fileName.endsWith(".json")) continue;
        const collection = fileName.replace(/\.json$/, "");
        const parsed = readJsonFile(path.join(dataStoreDir, fileName));
        if (parsed === undefined) continue;
        if (DATASTORE_SINGLE_DOCS.has(collection)) {
          const existing = kvGetJson<Record<string, any>>(collection);
          if (isRecord(existing) && isRecord(parsed)) {
            kvSetJson(collection, { ...existing, ...parsed });
          } else {
            kvSetJson(collection, parsed);
          }
          importedFiles++;
        } else if (Array.isArray(parsed)) {
          if (parsed.length > 0) {
            itemsReplaceAll(collection, parsed);
            importedItems += parsed.length;
          }
          importedFiles++;
        } else if (isRecord(parsed)) {
          kvSetJson(collection, parsed);
          importedFiles++;
        }
      }
    }
  } catch (e) {
    console.error("[migrate] gagal baca data_store:", e);
  }

  kvSetJson(MIGRATION_FLAG, {
    migratedAt: new Date().toISOString(),
    importedFiles,
    importedItems,
  });
  console.log(`[migrate] JSON -> SQLite selesai: ${importedFiles} file, ${importedItems} item.`);
}
