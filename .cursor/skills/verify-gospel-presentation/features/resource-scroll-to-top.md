# Resource reader scroll-to-top

On interactive profile pages (not Kindle `/read/`), a fixed **Back to top** control appears after scrolling about one viewport. It uses `aria-label="Back to top"` and is hidden when modals are open.

## Sub-features

- `scroll-top-appear` — button becomes visible after scrolling down on a book template.
- `scroll-top-act` — click scrolls the window to the top.
- `scroll-top-absent-kindle` — not mounted on `/{slug}/read/` (see `kindle-default-read`).

## How to get to it (user POV)

- Open a long book template such as `/aogr/`, scroll down the article, tap the bottom-right up-arrow.

## Driving it with verify-gp

Preconditions:

- Supabase env (template profile loads).
- Not Kindle read mode.

- **Built-in recipe.** Run `verify-gp feature --id resource-scroll-to-top` (scrolls `/aogr/`, clicks **Back to top**, captures PNG).
- **Manual.** Run `verify-gp browser goto --path /aogr/`, `verify-gp browser scroll --path /aogr/ --y 1500`, `verify-gp browser wait-for --path /aogr/ --role button --name "Back to top"`, click, screenshot.

## Gotchas

- Control stays hidden until scroll offset exceeds viewport height and no `aria-modal` overlay is open.
- Silk/Kindle user agents never show the control on the main React site (`isKindleBrowser()`).
