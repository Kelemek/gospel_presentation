# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

Single Next.js 16 app in `gospel-admin/`. The root `package.json` is a thin wrapper that delegates `dev`, `build`, `start` into `gospel-admin/`. All source code, tests, and dependencies live under `gospel-admin/`.

### Node version

Node 20.9.0 is pinned in `gospel-admin/.nvmrc`. Use `nvm use` (nvm is pre-installed) before running any commands.

### Key dev commands (run from `gospel-admin/`)

| Task | Command |
|------|---------|
| Dev server | `npm run dev` (port 3000) |
| Lint | `npm run lint` |
| Tests | `npm test` |
| Tests (CI mode w/ coverage) | `npm run test:ci` |
| Build | `npm run build` |

These are also documented in the root `README.md`.

### Environment variables

The dev server requires `gospel-admin/.env.local` with at minimum:

The required env vars are: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`, `ESV_API_TOKEN`, and `NEXT_PUBLIC_SITE_URL`. Placeholder values are sufficient to start the dev server and run the test suite. Actual Supabase/ESV credentials are needed for full functionality (auth, scripture lookup). See the root `README.md` "Environment Configuration" section for details.

### Lint

`npm run lint` exits non-zero due to pre-existing errors in `scripts/*.js` (CommonJS `require()` calls flagged by `@typescript-eslint/no-require-imports`) and a few Sentry config files. These are not in application source code and do not affect app behavior.

### Tests

Jest is configured with `ts-jest` (not Next.js SWC). All 155 test suites (748 tests) pass out of the box. Tests mock Supabase, Next.js navigation, and Capacitor — no external services needed.

### External services

The app depends on **Supabase** (PostgreSQL + Auth) and the **ESV Bible API**. Both are cloud-hosted — there are no Docker containers or local databases. With placeholder env vars, the dev server starts and renders the UI but auth/data flows return errors (expected).
