# Kindle read mode (`/default/read/`)

Server-rendered, e-reader-friendly layout for the default gospel presentation (and any public slug). Sticky **Menu** uses native `<details>` with **Table of Contents**, text size, and resources.

## Sub-features

- `kindle-read-http` — `GET /default/read/` returns 200 without client JS.
- `kindle-read-shell` — `.kindle-read-root` (or article) and profile title visible.
- `kindle-menu-summary` — Menu/TOC `<summary>` present (optional on minimal layouts).

## How to get to it (user POV)

- Open `http://127.0.0.1:3000/default/read/` on an e-reader browser, or from the interactive site’s Kindle banner when shown.

## Driving it with verify-gp

Preconditions:

- `gospel-admin/.env.local` with Supabase (profile body from DB).

- **Built-in recipe.** Run `verify-gp feature --id kindle-default-read` (curl + browser screenshot).
- **HTTP only.** Run `verify-gp curl --path /default/read/`; expect HTTP 200 and HTML containing `kindle-read` markers.

## Gotchas

- No scripture modal or **Back to top** control on read mode (by design).
- First compile can be slow; rely on `verify-gp doctor` before driving.
