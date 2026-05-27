# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

Single-product repo: a **Next.js 16** app in `gospel-admin/` for biblical counseling gospel presentations. Uses hosted Supabase (no local DB), ESV Bible API, optional API.Bible (KJV/NASB/LSB/NIV/NLT/CSB), Tailwind CSS 4, Jest + React Testing Library.

### Node version

The project requires **Node.js 20.9.0** (pinned in `gospel-admin/.nvmrc`). The VM uses nvm; activate with:
```bash
source /home/ubuntu/.nvm/nvm.sh && nvm use 20.9.0
```

### Key commands (all from `gospel-admin/`)

| Task | Command |
|---|---|
| Install deps | `npm install` (runs `patch-package` via postinstall) |
| Dev server | `npm run dev` (starts on port 3000) |
| Lint | `npm run lint` |
| Tests | `npm test` |
| Tests (CI) | `npm run test:ci` |
| Build | `npm run build` |
| Unused code (Knip) | `npm run knip` (uses `knip.json`; optional CI check) |

### Caveats

- **No local database.** The app uses hosted Supabase. Features requiring Supabase (auth, profile CRUD) need `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_KEY` in `gospel-admin/.env.local`.
- **ESV API.** ESV requires `ESV_API_TOKEN` in `gospel-admin/.env.local`.
- **PostHog (monitoring).** Optional for local dev: `NEXT_PUBLIC_POSTHOG_KEY`; `NEXT_PUBLIC_POSTHOG_HOST` defaults to `https://g.cp-church.org` (reverse proxy). When the key is unset, analytics does not load (CI/tests are unaffected). Replaces former Sentry + Clarity env vars.
- **API.Bible (KJV, NASB, LSB, NIV, NLT, CSB).** When those translations are enabled in `translation_settings`, set `API_BIBLE_KEY` plus `API_BIBLE_BIBLE_ID_KJV`, `API_BIBLE_BIBLE_ID_NASB`, `API_BIBLE_BIBLE_ID_LSB`, `API_BIBLE_BIBLE_ID_NIV`, `API_BIBLE_BIBLE_ID_NLT`, and `API_BIBLE_BIBLE_ID_CSB` (from `GET /v1/bibles`). Optional audio overrides when chapter listen plays the wrong edition: `API_BIBLE_AUDIO_BIBLE_ID_LSB` (and matching `_*` for other translations) from `GET /v1/audio-bibles`. Optional: `API_BIBLE_BASE_URL` (default `https://rest.api.bible`), `API_BIBLE_CACHE_TTL_DAYS` (default 14), `ESV_CACHE_TTL_DAYS` (default 30). Run `gospel-admin/sql/enable_api_bible_translations.sql` in Supabase for settings rows, `user_profiles` constraint, and `enforce_translation_cache_limit`.
- **Tests are fully mocked.** The Jest suite runs without live services or env vars. Just `npm test`.
- **Dead code analysis.** Run `npm run knip` from `gospel-admin/` (see `knip.json`). It ignores `scripts/**`, Capacitor `android/**` build output, and several packages that are CLI-only or native-platform (`@capacitor/ios`, etc.); export/type rules are relaxed so the report focuses on unused files and dependency hygiene. Re-enable stricter `exports`/`types` rules in `knip.json` when cleaning the codebase.
- **Lint errors are pre-existing.** `npm run lint` exits non-zero due to `@typescript-eslint/no-require-imports` violations in `scripts/*.js` utility files and a few other pre-existing issues. These are not caused by new changes.
- **Dual lockfiles warning.** Next.js Turbopack warns about both `/workspace/package-lock.json` and `/workspace/gospel-admin/package-lock.json`. This is harmless and can be ignored.
- **Root `package.json`** is a thin wrapper that delegates `dev`/`build`/`start` to `gospel-admin/`. Always run commands from `gospel-admin/` directly.
- **Environment variables for dev server.** To run the dev server with live Supabase/ESV features, create `gospel-admin/.env.local` with the four required secrets. The dev server must be restarted after creating/changing this file.
- **Default profile route.** The app's main gospel presentation is viewable at `/default/` without authentication. Authenticated features (admin dashboard, profile CRUD) require Supabase auth which uses magic links or verification codes — these need a working email flow and cannot easily be tested locally without a real Supabase project.
- **CCEL Edwards sermons.** Import Jonathan Edwards *Select Sermons* from `gospel-admin/`: `npm run import-edwards` (optional `--parse-only`, `--dry-run`, `--purge-je`). Creates public profiles `je01`–`je19` and `spurgeon_passage_index` rows. All CCEL import upserts run `finalizeGospelDataForImport` (abbrev → canonical book names in `gospel_data` + merged passage index). To fix existing templates without re-import: `npm run normalize-scripture-refs` (also normalizes canonical refs: comma verse lists → ranges, `f.` suffix, en-dashes; use `--audit` to list remaining unresolved abbrevs). Add **Edwards library** in Admin → Settings and **Save order** for the Resources menu.
- **CCEL Matthew Henry commentary (full 6-volume).** Import from `gospel-admin/`: `npm run import-henry` (optional `--parse-only`, `--volume mhc1`, `--book GEN`, `--dry-run`, `--purge-mh`). Creates public profiles `mhgen`–`mhrev` (one per Bible book) and `spurgeon_passage_index` rows from [`mhc1.xml`–`mhc6.xml`](https://www.ccel.org/ccel/henry/mhc.html). Add **Matthew Henry library** in Admin → Settings and **Save order** for the Resources menu.
- **CCEL Pilgrim's Progress (Bunyan).** Import from `gospel-admin/`: `npm run import-pilgrim` (optional `--parse-only`, `--dry-run`, `--purge-ppgr`). Creates public template profile **`ppgr`** (`/ppgr`) from [`pilgrim.xml`](https://www.ccel.org/ccel/bunyan/pilgrim.xml) (Author's Apology + Part I/II stages). Import uses `finalizeGospelDataForImport`; fix stored refs with `npm run normalize-scripture-refs -- --slug ppgr`. Add via Admin → Settings **Add template to list** (like `lgal`).
- **CCEL All of Grace (Spurgeon).** Import from `gospel-admin/`: `npm run import-all-of-grace` (optional `--parse-only`, `--dry-run`, `--purge-aogr`). Creates public template profile **`aogr`** (`/aogr`) from [`grace.xml`](https://www.ccel.org/ccel/spurgeon/grace.xml). **Required after import:** `npm run normalize-scripture-refs -- --slug aogr --audit`. Add under **Books** via Admin → Settings **Add template to category…**.
- **CCEL Thomas Watson (six books).** Import from `gospel-admin/`: `npm run import-watson` (optional `--parse-only`, `--dry-run`, `--purge-tw`, `--book divinity`). Creates **`twcm`**, **`twbt`**, **`twbd`**, **`twdc`**, **`twlp`**, **`twtc`**. **Required after import:** audit each slug with `npm run normalize-scripture-refs -- --slug <slug> --audit`.
- **M'Cheyne Bible reading plan.** Import from `gospel-admin/`: `npm run import-mcheyne` (optional `--parse-only`, `--dry-run`, `--purge-mchy`). Creates public template profile **`mchy`** (`/mchy`) with 365 daily Family/Secret scripture-card readings from [`data/mcheyne/plan.json`](gospel-admin/data/mcheyne/plan.json). Progress uses device verse pins (yellow = last opened). Add in Admin → Settings Resources order after import.
- **Automated DB backups** exclude re-importable CCEL corpus profiles (`sg`, `me`, `cv`, `mh`, `je`, `lgal`, `ppgr`) and their `spurgeon_passage_index` rows; disaster recovery for those corpora is the import scripts above, not Storage restore. Purge bloated `db-backups`: `node scripts/purge-db-backups-bucket.js` (see [backups/README.md](backups/README.md)).
- **STEP Bible word study.** Scripture modal **Words** toggle uses JSON under `gospel-admin/data/stepbible/` (no DB; gitignored). `npm run build` runs `ensure-stepbible-data.js` when `words/` is missing (Vercel production). After STEPBible-Data pin updates: `npm run import-stepbible`. Tests: `npm run import-stepbible:fixtures`. Vercel: cache `data/stepbible` in build settings to avoid re-import each deploy.
