---
name: verify-gospel-presentation
description: End-to-end verification for the Gospel Presentation Next.js app (gospel-admin). Run after code changes — automated lint/test/build, dev-server doctor, and Playwright-style browser drives of public routes (/default/, templates, /copyright). Use when shipping UI, API, or profile behavior in Kelemek/gospel_presentation.
---

# Verify Gospel Presentation

Project-local verification for **`gospel-admin/`** (Next.js 16). This skill drives the real dev server and captures proof artifacts. It **references** repo policy instead of replacing it.

## Authoritative repo docs (read, do not duplicate)

- [`AGENTS.md`](../../../AGENTS.md) — Node 22, commands, env vars, public `/default/`, production fork rules.
- [`.cursor/rules/commit-and-build.mdc`](../../../.cursor/rules/commit-and-build.mdc) — `npm run build` before commits touching app code.
- [`.cursor/rules/linting.mdc`](../../../.cursor/rules/linting.mdc) — lint every session-changed file.
- [`.cursor/rules/testing.mdc`](../../../.cursor/rules/testing.mdc) — Jest/RTL expectations.
- [`.cursor/rules/push-to-prod.mdc`](../../../.cursor/rules/push-to-prod.mdc) — never sync `gp-cp-church` unless asked.
- Feature behavior context: [`docs/03-FEATURES.md`](../../../docs/03-FEATURES.md).

## Launch

From **repo root**:

```bash
.cursor/skills/verify-gospel-presentation/scripts/verify-gp launch
```

This:

1. Ensures Node 22 (`nvm use` in `gospel-admin/`).
2. Optionally writes **`gospel-admin/.env.local`** from the current environment when the file is missing and `NEXT_PUBLIC_SUPABASE_URL` is set (gitignored).
3. Starts `npm run dev` in tmux session **`gospel-verify-dev`** (port **3000**).
4. Polls until `GET http://127.0.0.1:3000/copyright` returns HTTP 200.

**Ready** means the copyright page responds, not merely that port 3000 is open.

**Teardown:**

```bash
.cursor/skills/verify-gospel-presentation/scripts/verify-gp cleanup
```

Stops the tmux session and removes `gospel-admin/.verify-dev.pid` if present. Does **not** delete evidence under `evidence/runs/`.

## Doctor

Read-only instance check:

```bash
.cursor/skills/verify-gospel-presentation/scripts/verify-gp doctor
```

Reports: tmux session active, port owner PID, HTTP check on `/copyright`, and whether `gospel-admin/.env.local` exists with required keys named (values never printed).

Run doctor before every interactive drive when anything looks off.

## Automated verification (required after code changes)

From `gospel-admin/` with Node 22:

```bash
.cursor/skills/verify-gospel-presentation/scripts/verify-gp automated
```

Runs, in order: `npm run lint`, `npm test`, `npm run build`. Exit non-zero on first failure.

This matches the ship checklist in `AGENTS.md` and `commit-and-build.mdc`.

## Drive (interactive)

1. Read [`features/README.md`](./features/README.md) and pick a feature (or use a mapped id).
2. `verify-gp launch` → `verify-gp doctor`.
3. Execute the feature file's **Driving it with verify-gp** steps.

### Harness commands

All accept `--base-url` (default `http://127.0.0.1:3000`). Set `VERIFY_RUN_ID` (or let scripts default to a timestamp) for evidence paths.

| Command | Purpose |
|---|---|
| `verify-gp curl --path /copyright` | HTTP status + excerpt |
| `verify-gp browser goto --path /default/` | Navigate |
| `verify-gp browser screenshot --name foo.png` | PNG under `evidence/runs/<RUN_ID>/` |
| `verify-gp browser click --role button --name "Table of Contents"` | ARIA click |
| `verify-gp browser click --first data-tour scripture-card` | First matching tour selector |
| `verify-gp browser assert --role dialog` | Fail if missing |
| `verify-gp browser feature --id static-copyright-page` | Run built-in recipe for one feature |

Browser commands use **Playwright** from `scripts/package.json` (`verify-gp` runs `npm install` in `scripts/` on first browser use, then `playwright install chromium`).

### Routes agents can hit without login

| Route | Needs `.env.local` | Notes |
|---|---|---|
| `/copyright`, `/privacy`, `/info` | No | Static/client pages |
| `/login`, `/login-code` | Partial | UI loads; magic link needs Supabase |
| `/default/` | Yes (Supabase) | Primary public gospel presentation |
| `/{template-slug}/` e.g. `/aogr/` | Yes | Book templates (`AGENTS.md`) |
| `/{slug}/read/` kindle | Yes | **Smoke-only** (200 + heading); not default proof |
| `/admin/*` | Yes + auth | Skip unless testing admin with real login |

**Avoid** live counselor-only slugs that increment visits if product rules forbid it; use `/default/` or template slugs.

## Evidence

Proof artifacts:

```
.cursor/skills/verify-gospel-presentation/evidence/runs/<RUN_ID>/
```

- PNG screenshots, `curl-*.txt`, `doctor.txt`, optional `aria-*.txt`.
- **`cleanup` does not remove `evidence/runs/`**.
- Commit sample proof only when intentionally documenting a skill change (not required every PR).

Proof standards (from create-verification-skill):

- Exercise the **user path**, not internal APIs alone.
- Capture action **and** resulting state.
- Prefer live ESV/Supabase boundaries when env is available; use `/copyright` when secrets are absent.

## Helpers

| Script | Role |
|---|---|
| [`scripts/verify-gp`](./scripts/verify-gp) | CLI entry (`launch`, `doctor`, `automated`, `cleanup`, `curl`, `browser`, `feature`) |
| [`scripts/lib/common.sh`](./scripts/lib/common.sh) | Paths, `RUN_ID`, env materialization |
| [`scripts/browser.mjs`](./scripts/browser.mjs) | Playwright driver |
| [`scripts/feature-static-copyright.mjs`](./scripts/feature-static-copyright.mjs) | Built-in drive for `static-copyright-page` |

Make helpers executable: `chmod +x scripts/verify-gp`.

## Typical agent workflow

1. After editing `gospel-admin/`, run **`verify-gp automated`**.
2. If the change is user-visible, run **`launch` → `doctor` → `feature --id …` or a feature file recipe → `cleanup`**.
3. Lint session-changed paths per `linting.mdc` (includes files under `.cursor/skills/` if edited).
4. Before commit of app code: confirm `npm run build` already passed in automated step (`commit-and-build.mdc`).
5. User-visible releases: `append-release-changelog` per `deploy-update-message.mdc` (not part of this skill).

## Maintenance

When routes, ARIA labels, or tour attributes change, update the matching file under [`features/`](./features/). Re-run the proof workflow once after skill edits.
