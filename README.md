# Website Puskesmas Manding (Svelte 5)

Website resmi & portal pelayanan terpadu Puskesmas Manding, Kabupaten Sumenep.
Dikonversi dari React 19 ke **Svelte 5** (runes) dengan arsitektur modular per fitur.

- **Frontend:** Svelte 5 + TypeScript + Vite 8 + Tailwind CSS 4
- **Backend:** Express 4 (TypeScript, dipecah per modul di `server/`)
- **Data:** Firebase Auth/Firestore/Storage + sinkronisasi lokal (SQLite/JSON via API)

## Syarat

- Node.js 20+
- npm 10+

## Setup

```bash
npm install
cp .env.example .env   # lalu isi nilainya (lihat .env.example)
```

Variabel penting di `.env`:

| Variabel | Wajib | Keterangan |
|---|---|---|
| `PORT` | — | Port server (default `3000`) |
| `ADMIN_UIDS` | untuk admin | UID Firebase admin, dipisah koma (alternatif: custom claim `admin: true`) |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | untuk auth API | Service account JSON (satu baris) — tanpa ini endpoint butuh-auth menjawab 503 |
| `GEMINI_API_KEY` | untuk AI | Kunci Gemini AI (`/api/ai/*`) |
| `WHATSAPP_*` | opsional | Konfigurasi WhatsApp Cloud API |

> Jangan commit `.env` asli. Kredensial Firebase Web SDK (publik) ada di
> `src/firebase-applet-config.json` — wajar untuk Web SDK, yang memproteksi
> adalah **Firestore Rules** (lihat bawah) + auth middleware backend.

## Perintah

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Frontend dev server (Vite) |
| `npm run dev:server` | Backend dev (tsx, hot-reload) |
| `npm run build` | Build frontend ke `dist/` |
| `npm run build:server` | Bundle backend ke `dist-server/server.cjs` (esbuild) |
| `npm run server` | Jalankan backend production |
| `npm run check` | Typecheck (`svelte-check` + `tsc`) |
| `npm run lint` | ESLint (warning saja, tidak menggagalkan) |
| `npm run lint:fix` | ESLint + auto-fix |
| `npm run format` | Prettier write |
| `npm test` | Test unit (vitest) |

## Arsitektur folder

```
src/
  app/            # entry + router SPA (hash-based)
  features/       # fitur per domain (modular, bukan monolitik)
    admin/        # panel admin (dashboard, konten, layanan, sistem, ...)
    beranda/      # halaman depan + template artistik
    profil/ layanan/ berita/ ...   # halaman publik
  shared/
    components/   # komponen lintas fitur
    lib/          # util (logger, firebase, ...)
    services/     # serviceEngine/* (per domain), themeService, ...
    stores/       # state Svelte 5 (auth, toast, ...)
    ui/           # primitif UI (Button, Card, Input, ...)
server/
  middleware/auth.ts   # auth Firebase ID Token, guard admin, rate limit
  lib/                 # config, storage (JSON/SQLite), logger
  routes/              # health, whatsapp, ai, theme, homepage,
                       # microsites, uploads, misc (satu file per domain)
server.ts              # entry: setup Express + mount router (ramping)
tests/                 # test unit vitest
```

## API — syarat akses

Semua di bawah prefix `/api`. Tanpa token → `401`; bukan admin → `403`.

**Publik (tanpa token):**
`GET /health`, `GET /api/health`, `GET /api/theme/published`,
`GET /api/homepage/published`, `GET /api/posts`, `GET /api/microsites*`,
`GET /api/site-settings`, `GET /api/contact-settings`, `GET /api/data/:collection`,
`GET /api/meta-preview`, generator OG image (`/api/og-image/*`, `/api/post-image/*`, …),
`GET /api/webhooks/whatsapp` (verifikasi webhook).

**Butuh login (Firebase ID Token via `Authorization: Bearer <token>`):**
semua `GET` non-publik lainnya.

**Admin saja** (klaim `admin: true` atau UID di `ADMIN_UIDS`):
semua `POST`/`PUT`/`PATCH`/`DELETE`, plus `GET /api/theme/draft`,
`/api/homepage/draft`, `/api/whatsapp/config`, `/api/whatsapp/logs`,
`/api/ai/provider-config`, `/api/ai/image-capability`.

**Rate limit:** `/api/ai/*` → 30 req/menit/IP (`429` + header `Retry-After`).
**Upload:** whitelist PNG/JPG/WebP (cek magic bytes), maks 5 MB, nama file dibuat server.

Ringkasan endpoint tulis utama:

| Method | Endpoint | Akses |
|---|---|---|
| POST | `/api/theme/publish`, `/api/theme/draft`, `/api/theme/reset` | admin |
| POST | `/api/homepage/publish`, `/api/homepage/draft`, `/api/homepage/reset` | admin |
| POST | `/api/whatsapp/config`, `/api/whatsapp/send`, `/api/whatsapp/test-connection` | admin |
| POST | `/api/ai/provider-config`, `/api/ai/generate-image`, `/api/ai/import-article`, `/api/ai/test-provider`, `/api/ai/fetch-models` | admin |
| POST | `/api/microsites`, `/api/microsites/sync-all`, `/api/microsites/sync-item` | admin |
| POST | `/api/posts`, `/api/posts/sync-item`, `/api/site-settings`, `/api/contact-settings` | admin |
| POST | `/api/upload-logo`, `/api/upload-image`, `/api/upload-favicon` | admin |
| POST | `/api/data/:collection`, `PUT/DELETE /api/data/:collection/:id` | admin |
| POST | `/api/webhooks/whatsapp` | verify-token |

## Deploy (pola yang dipakai)

```bash
npm run build
npm run build:server
# salin dist/ + dist-server/ ke server, lalu:
PORT=3000 node dist-server/server.cjs
# atau: npm run server
```

## Firestore Rules — WAJIB dipasang

File `firestore.rules` di root repo ini adalah **draf rules yang sudah dikeraskan**
(menggantikan rules lama yang membuka `allow write: if true` ke publik):

- Konten publik (site_settings, posts, services, microsites, …): baca bebas, tulis admin.
- Formulir publik (complaints, registrations, survey_responses): boleh `create`
  tanpa login, baca/ubah hanya admin.
- users/roles/audit_logs/backups: admin saja (user boleh baca dokumennya sendiri).
- Default: tolak (`allow read, write: if false`).

Cara pasang: Firebase Console → Firestore Database → tab **Rules** → tempel isi
`firestore.rules` → **Publish**. Admin ditandai via custom claim
`admin: true` pada user Auth (atau kelola tulis lewat backend yang memakai
Admin SDK — rules ini pertahanan lapis kedua).

## Catatan keamanan

- `ProtectedRoute` di frontend hanya UX — otorisasi asli ada di
  `server/middleware/auth.ts`.
- Body JSON dibatasi 2 MB; upload dibatasi tipe & ukuran (lihat tabel API).
- Lihat `docs/` untuk audit & rencana implementasi historis.
