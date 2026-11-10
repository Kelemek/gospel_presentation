# Gospel Presentation verification map

Maintained recipes for driving **The Gospel Presentation** (`gospel-admin/`) the way readers and counselors do. Read this index before interactive verification; open the matching feature file for exact steps.

## Baseline preconditions

- **Repo root:** `gospel-admin/` is the app directory (not the monorepo root).
- **Node 22:** `source ~/.nvm/nvm.sh && cd gospel-admin && nvm use` (see `gospel-admin/.nvmrc`).
- **Dev server:** `npm run dev` on **port 3000** (`http://127.0.0.1:3000`).
- **Instance ownership:** Start the dev server in **this** verification run (tmux session `gospel-verify-dev`). Run `verify-gp doctor` before driving. Do not attach to another developer's server on port 3000.
- **Interactive browser drives:** Run `verify-gp launch-prod` and set **`VERIFY_BASE_URL=http://127.0.0.1:3001`** (tmux `gospel-verify-prod`). Headless Playwright against `next dev` often never clears the profile **Loading…** shell; production `next start` does. Kindle/curl proofs may stay on port 3000 dev.
- **Public profile slugs:** Prefer **`/default/`** for the main gospel presentation and committed template slugs such as **`/aogr/`** (All of Grace). **Do not** use live counselor slugs (for example profiles that increment visit counts in production analytics) unless the user explicitly requests them.
- **Kindle read mode:** `/default/read/` and `/{slug}/read/` are kindle-oriented layouts. Treat as **smoke-only** (HTTP 200 + heading visible), not full interactive proof, unless you are explicitly testing kindle UX.

## Environment (`.env.local`)

Hosted Supabase and ESV power most reader flows. Without secrets, profile pages may redirect to login or fail to load gospel content.

| Variable | Required for |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Profiles, admin, auth |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client Supabase |
| `SUPABASE_SERVICE_KEY` | Server APIs that read settings |
| `ESV_API_TOKEN` | Scripture modal text (ESV) and ESV Listen |

Optional (see `AGENTS.md`): API.Bible keys, PostHog, OpenAI (Recite), Notion feedback.

**Cloud agents:** secrets may exist in the process environment but Next still reads `gospel-admin/.env.local` at dev start. Use `verify-gp launch`, which can materialize `.env.local` from env when the file is missing (gitignored; never commit).

## Automated gate (always run after code changes)

From `gospel-admin/` with Node 22:

```bash
npm run lint && npm test && npm run build
```

See `.cursor/rules/commit-and-build.mdc`, `.cursor/rules/linting.mdc`, `.cursor/rules/testing.mdc`, and `AGENTS.md` (do not duplicate those policies here).

## Driving conventions

- Start each recipe from baseline unless the feature file says otherwise.
- Prefer **ARIA roles and accessible names** from tests (`Table of Contents`, `Help and tutorials`, scripture refs as `button` names like `John 3:16`).
- Use **`data-tour`** attributes when listed in a feature file (stable for tours and automation).
- Browser drives go through `verify-gp browser` (Playwright via `npx playwright`; first run may download browsers).
- HTTP smoke checks go through `verify-gp curl`.
- **Evidence** lands under `.cursor/skills/verify-gospel-presentation/evidence/runs/<RUN_ID>/` and is **not** removed by `verify-gp cleanup`.

## Proof and skip reporting

- Capture the user action and resulting UI state, not only "page loaded."
- UI proof: PNG screenshot plus optional ARIA snapshot text; include URL bar or page title in the shot when possible.
- HTTP proof: status code, `Content-Type`, and a short body excerpt.
- Record **feature id** and **entry route** with every artifact.
- If a precondition is missing (no `.env.local`, profile 404, scripture API error), **fail the step** and note the reason under that feature's **Gotchas** — do not weaken the journey.

## Feature entry contract

Each feature file has: **Sub-features**, **How to get to it (user POV)**, **Driving it with verify-gp**, **Gotchas**.

## Features

| Feature id (`verify-gp feature --id`) | Doc |
|---|---|
| `public-default-presentation` | [Default gospel presentation](./public-default-presentation.md) — `/default/` without login |
| `scripture-modal-default` | [Scripture modal](./scripture-modal-default.md) — card → ESV dialog |
| `slide-out-toc-menu` | [Slide-out menu & TOC](./slide-out-toc-menu.md) — **Open menu** → Table of Contents |
| `resource-scroll-to-top` | [Back to top](./resource-scroll-to-top.md) — long book templates (`#15`) |
| `kindle-default-read` | [Kindle `/default/read/`](./kindle-default-read.md) — server-rendered read mode |
| `resource-reader-back-links` | [In-page hash / Back links](./resource-reader-back-links.md) — footnotes & term-map jumps |
| `static-copyright-page` | [Copyright page](./static-copyright-page.md) — `/copyright` without secrets |
| `template-book-reader` | [Book template](./template-book-reader.md) — `/aogr/` smoke |
