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
- **API.Bible (KJV, NASB, LSB, NIV, NLT, CSB).** When those translations are enabled in `translation_settings`, set `API_BIBLE_KEY` plus `API_BIBLE_BIBLE_ID_KJV`, `API_BIBLE_BIBLE_ID_NASB`, `API_BIBLE_BIBLE_ID_LSB`, `API_BIBLE_BIBLE_ID_NIV`, `API_BIBLE_BIBLE_ID_NLT`, and `API_BIBLE_BIBLE_ID_CSB` (from `GET /v1/bibles`). Optional: `API_BIBLE_BASE_URL` (default `https://rest.api.bible`), `API_BIBLE_CACHE_TTL_DAYS` (default 14), `ESV_CACHE_TTL_DAYS` (default 30). Run `gospel-admin/sql/enable_api_bible_translations.sql` in Supabase for settings rows, `user_profiles` constraint, and `enforce_translation_cache_limit`.
- **Tests are fully mocked.** The Jest suite runs without live services or env vars. Just `npm test`.
- **Dead code analysis.** Run `npm run knip` from `gospel-admin/` (see `knip.json`). It ignores `scripts/**`, Capacitor `android/**` build output, and several packages that are CLI-only or native-platform (`@capacitor/ios`, etc.); export/type rules are relaxed so the report focuses on unused files and dependency hygiene. Re-enable stricter `exports`/`types` rules in `knip.json` when cleaning the codebase.
- **Lint errors are pre-existing.** `npm run lint` exits non-zero due to `@typescript-eslint/no-require-imports` violations in `scripts/*.js` utility files and a few other pre-existing issues. These are not caused by new changes.
- **Dual lockfiles warning.** Next.js Turbopack warns about both `/workspace/package-lock.json` and `/workspace/gospel-admin/package-lock.json`. This is harmless and can be ignored.
- **Root `package.json`** is a thin wrapper that delegates `dev`/`build`/`start` to `gospel-admin/`. Always run commands from `gospel-admin/` directly.
- **Environment variables for dev server.** To run the dev server with live Supabase/ESV features, create `gospel-admin/.env.local` with the four required secrets. The dev server must be restarted after creating/changing this file.
- **Default profile route.** The app's main gospel presentation is viewable at `/default/` without authentication. Authenticated features (admin dashboard, profile CRUD) require Supabase auth which uses magic links or verification codes — these need a working email flow and cannot easily be tested locally without a real Supabase project.
