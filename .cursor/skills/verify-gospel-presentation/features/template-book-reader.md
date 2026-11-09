# Public book template reader

Committed CCEL-style **book** templates (for example **All of Grace** at `/aogr/`) are public profiles intended for library verification without counselor-specific slugs.

## Sub-features

- `template-load` — `/aogr/` returns 200 with book title visible.
- `template-menu` — **Table of Contents** works like other profiles.
- `template-kindle-smoke` — optional GET `/{slug}/read/` returns 200 only (no deep kindle proof).

## How to get to it (user POV)

- Resources menu → Books → **All of Grace**, or open `http://127.0.0.1:3000/aogr/` directly.

## Driving it with verify-gp

Preconditions:

- Supabase env configured (template rows live in hosted DB).
- Prefer **`aogr`**, **`ppgr`**, **`lgal`**, or another documented template slug from `AGENTS.md` — not private counselor slugs.

- **HTTP.** Run `verify-gp curl --path /aogr/`. Expect `200`.
- **Browser title.** Run `verify-gp browser goto --path /aogr/`. Expect visible `main` and book-oriented heading text.
- **Kindle smoke (optional).** Run `verify-gp curl --path /aogr/read/`. Expect `200`; do not treat kindle layout as full regression surface unless explicitly testing kindle.
- **Proof.** Run `verify-gp browser screenshot --name template-aogr.png`.

## Gotchas

- Large templates (`lbst`, `chst1`) are slow to compile and fetch; use smaller templates for routine drives.
- Repeated views can affect visit metrics on some deployments — still prefer templates over private slugs.
