# Default gospel presentation

Readers open the main **Gospel in its Context** presentation at `/default/` without signing in when Supabase env is configured.

## Sub-features

- `default-load` — page renders presentation title and section body.
- `default-menu` — sticky header shows **Table of Contents** and **Help and tutorials**.
- `default-no-login` — anonymous reader is not redirected to `/login`.

## How to get to it (user POV)

- Open `http://127.0.0.1:3000/default/` (trailing slash optional).
- From `/`, cold start may redirect to `/default/` or last profile per `ProfileAppLaunchResume`; for verification, navigate directly to `/default/`.

## Driving it with verify-gp

Preconditions:

- `verify-gp doctor` reports port 3000 owned by this run and HTTP health OK.
- `gospel-admin/.env.local` includes Supabase URL and anon key (or launch materialized it from env).

- **HTTP smoke.** Run `verify-gp curl --path /default/`. Expect HTTP `200` and HTML containing `default` profile shell markers (main landmark, header).
- **Browser load.** Run `verify-gp browser goto --path /default/`. Expect `document.title` non-empty and a visible `main` region.
- **Header controls.** Run `verify-gp browser wait-for --path /default/ --role button --name "Open menu"`. Run `verify-gp browser wait-for --path /default/ --role button --name /help and tutorials/i` (Help menu; exact name varies by platform).
- **Proof.** Run `verify-gp browser screenshot --name default-home.png`.

## Gotchas

- Without Supabase env the server may redirect to `/login?redirect=/default` — that is a failed `default-no-login`, not a pass.
- First load can be slow while Next compiles; wait for `doctor` health, not a fixed sleep.
- Do not use private counselor slugs for routine verification (visit counting / cache invalidation); use `/default/` or template slugs.
