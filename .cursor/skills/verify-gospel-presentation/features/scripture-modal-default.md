# Scripture modal (default profile)

Readers tap a scripture **card** on `/default/` and read the passage in the scripture modal (ESV when enabled).

## Sub-features

- `modal-open` — tapping a card opens a `dialog` with the reference visible.
- `modal-verse-text` — ESV body loads when `ESV_API_TOKEN` is set.
- `modal-close` — Close control dismisses the reader.

## How to get to it (user POV)

- On `/default/`, scroll to a section with a scripture card (button showing a reference, `data-tour="scripture-card"`).
- Activate a card (for example **Romans 3:23** or the first visible reference on screen).

## Driving it with verify-gp

Preconditions:

- `public-default-presentation` preconditions met.
- `ESV_API_TOKEN` present in `gospel-admin/.env.local` (or env at launch).

- **Open modal.** Run `verify-gp browser goto --path /default/`. Run `verify-gp browser click --role button --name /Romans 3:23/i` (or `verify-gp browser click --first data-tour scripture-card` when the exact ref differs). Expect `role=dialog` visible.
- **Passage text.** Run `verify-gp browser assert --role dialog --contains-text "Romans"` (or visible verse content after load). If only a loading or error state appears, fail and capture screenshot.
- **Close.** Run `verify-gp browser click --role button --name /close/i` (modal close). Expect dialog hidden.
- **Proof.** Run `verify-gp browser screenshot --name scripture-modal.png`.

## Gotchas

- Scripture text requires live ESV API; tests mock `/api/scripture` but the dev server does not.
- Compare, Listen, and alternate translations need extra API keys (`AGENTS.md`).
- Cards are per-profile; template profiles use the same pattern with different refs.
