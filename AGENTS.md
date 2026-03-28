# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

Single-product repo: a **Next.js 16** app in `gospel-admin/` for biblical counseling gospel presentations. Uses hosted Supabase (no local DB), ESV Bible API, Tailwind CSS 4, Jest + React Testing Library.

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

### Caveats

- **No local database.** The app uses hosted Supabase. Features requiring Supabase (auth, profile CRUD) need `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_KEY` in `gospel-admin/.env.local`.
- **ESV API.** Scripture modal (ESV translation) requires `ESV_API_TOKEN` in `gospel-admin/.env.local`. Other translations (KJV, NASB, LSB) are fetched from Supabase's `bible_verses` table.
- **Tests are fully mocked.** All 748 tests run without any live services or env vars. Just `npm test`.
- **Lint errors are pre-existing.** `npm run lint` exits non-zero due to `@typescript-eslint/no-require-imports` violations in `scripts/*.js` utility files and a few other pre-existing issues. These are not caused by new changes.
- **Dual lockfiles warning.** Next.js Turbopack warns about both `/workspace/package-lock.json` and `/workspace/gospel-admin/package-lock.json`. This is harmless and can be ignored.
- **Root `package.json`** is a thin wrapper that delegates `dev`/`build`/`start` to `gospel-admin/`. Always run commands from `gospel-admin/` directly.
