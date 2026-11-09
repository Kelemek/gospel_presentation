# Slide-out presentation menu

The **Table of Contents** button opens the slide-out menu with sections, Bible translation, text size, and print.

## Sub-features

- `menu-open` — **Table of Contents** toggles the slide-out panel.
- `menu-sections` — Gospel sections appear as navigable entries.
- `menu-text-size` — **Text size** control opens its panel (`data-tour="toc-text-size-toggle"`).
- `menu-print-entry` — **Print version** entry present (`data-tour="toc-print-version"`).

## How to get to it (user POV)

- On any profile page (for example `/default/`), choose **Table of Contents** in the sticky header.

## Driving it with verify-gp

Preconditions:

- Profile page loaded (`public-default-presentation`).

- **Open menu.** Run `verify-gp browser click --role button --name "Table of Contents"`. Expect `data-tour="toc-print-version"` or print label in the panel.
- **Text size panel.** Run `verify-gp browser click --selector '[data-tour="toc-text-size-toggle"]'`. Expect region with `aria-label="Text size"` or `data-tour="text-size-panel"`.
- **Close menu.** Run `verify-gp browser click --role button --name "Close menu"` if present, or click **Table of Contents** again.
- **Proof.** Run `verify-gp browser screenshot --name toc-menu.png`.

## Gotchas

- Resources list may call `/api/...` when logged in; anonymous users still see static entries when cache is warm.
- Expand/collapse section buttons use names like `Expand <section title>` (see `TableOfContents` tests).
