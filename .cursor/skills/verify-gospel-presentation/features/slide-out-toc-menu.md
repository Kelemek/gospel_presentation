# Slide-out presentation menu

The slide-out **Menu** (sticky header **Open menu**) contains a **Table of Contents** dropdown with sections, Bible translation, text size, and print.

## Sub-features

- `menu-open` — **Open menu** reveals the slide-out panel.
- `toc-dropdown` — **Table of Contents** inside the panel toggles section links (`data-tour="toc-section-toggle"`).
- `menu-sections` — Gospel sections appear as navigable entries.
- `menu-text-size` — **Text size** control opens its panel (`data-tour="toc-text-size-toggle"`).
- `menu-print-entry` — **Print version** entry present (`data-tour="toc-print-version"`).

## How to get to it (user POV)

- On any profile page (for example `/default/`), choose **Open menu**, then **Table of Contents** in the slide-out.

## Driving it with verify-gp

Preconditions:

- Profile page loaded (`public-default-presentation`).

- **Built-in recipe (preferred).** Run `verify-gp feature --id slide-out-toc-menu` (opens **Open menu**, expands TOC, waits for `data-tour="toc-print-version"`).
- **Manual steps.** Each `verify-gp browser` call starts a **new** browser — use a feature script for multi-step flows, or chain:
  - `verify-gp browser click --path /default/ --role button --name "Open menu"`
  - `verify-gp browser click --path /default/ --selector '[data-tour="toc-section-toggle"]'`
  - `verify-gp browser wait-for --path /default/ --selector '[data-tour="toc-print-version"]'`
- **Text size panel.** With menu open: `verify-gp browser click --path /default/ --selector '[data-tour="toc-text-size-toggle"]'`.
- **Proof.** Screenshot via feature id or `verify-gp browser screenshot --path /default/ --name toc-menu.png`.

## Gotchas

- **Table of Contents** is not in the sticky header — only **Open menu** / **Close menu** (`data-tour="profile-menu-button"`). Clicking TOC without opening the slide-out times out.
- Each bare `verify-gp browser click` launches a fresh session on `--path` only; multi-step menu flows need `verify-gp feature --id slide-out-toc-menu` or `browserSession.mjs` recipes.
- Default Playwright viewport is **1280×720** so **Menu** label + **Open menu** stay visible.
- Use **`verify-gp launch-prod`** and `VERIFY_BASE_URL=http://127.0.0.1:3001` so the profile leaves the **Loading…** state (see `features/README.md`).
- Harness recipes pre-seed `gospel-presentation-first-visit-welcome-v1` so the first-visit **Welcome** overlay does not block menu clicks.
- Resources list may call `/api/...` when logged in; anonymous users still see static entries when cache is warm.
- Expand/collapse section buttons use names like `Expand <section title>` (see `TableOfContents` tests).
