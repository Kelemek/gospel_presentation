# Resource reader in-page back links

Imported book and counseling HTML can include same-document **`href="#section-…"`** links (editor footnotes, secular-term map topic rows, Kindle `kindle-read-internal-link`). Readers expect these to scroll within the profile instead of opening a new tab.

## Sub-features

- `hash-link-present` — at least one in-page `#section-` or internal kindle hash link on a long template.
- `hash-link-scroll` — activating the link brings the target section into view.

## How to get to it (user POV)

- On **Biblical Counseling** secular-term map (`/bcsecmap/` or production `/26b974ef/`), tap a **→ topic** row link.
- In Kindle read mode, tap a topic or footnote **Back** link that points to `#section-…` in the same chapter.

## Driving it with verify-gp

Preconditions:

- Supabase env; prefer **`/bcsecmap/`** when public (test fork), else **`/26b974ef/read/`**.

- **Built-in recipe.** Run `verify-gp feature --id resource-reader-back-links` (picks first loadable candidate, clicks first hash link, screenshot).
- If no hash links on the chosen profile, the recipe still smoke-captures the page (warn only).

## Gotchas

- **`/bcsecmap/`** may 404 when the test profile was not seeded in Supabase; the harness falls back to counseling read mode or smokes `/default/read/`.
- TipTap-saved body HTML may add `target="_blank"` on hash links; same-chapter scroll is unreliable on those rows (product limitation — report, do not weaken the recipe).
