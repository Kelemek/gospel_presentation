# Copyright & attribution page

Static legal and attribution content at `/copyright` — usable **without** Supabase or ESV secrets.

## Sub-features

- `copyright-load` — page shows heading **Copyright & Attribution**.
- `copyright-theme` — renders in light/dark-capable layout (no auth).

## How to get to it (user POV)

- Open `http://127.0.0.1:3000/copyright` from the footer link on profile pages or directly.

## Driving it with verify-gp

Preconditions:

- Dev server running (`verify-gp doctor`).

- **HTTP.** Run `verify-gp curl --path /copyright`. Expect `200` and body containing `Copyright & Attribution`.
- **Browser.** Run `verify-gp browser goto --path /copyright`. Expect `role=heading` level 1 with name matching `/copyright/i`.
- **Proof.** Run `verify-gp browser screenshot --name copyright.png`.

## Gotchas

- Translation attribution sections may wait on `TranslationContext` when anon Supabase is configured; heading still proves the route.
- Use this feature when secrets are unavailable; it does not prove gospel profile loading.
