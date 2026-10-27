# Historical SQL only — do not run for new changes

This folder is an archive of the old manual Supabase SQL runbook formerly at `gospel-admin/sql/`.

## Do not use for new work

- **Do not** run these scripts against the shared/production database for new schema or policy changes.
- New database changes go in `supabase/migrations/` and are applied by the Supabase GitHub integration on `Kelemek/gospel_presentation` (project `mchtyihbwlzjhkcmdvib`).
- Edge functions live under `supabase/functions/` and deploy the same way.

## Why this folder still exists

Kept as an audit trail / reference for how the live schema was built before GitHub-managed migrations. Supabase only auto-applies files under `supabase/migrations/`; nothing in this archive folder is deployed by the GitHub connection.
