# Users & access

## Staff (admins)

The authenticated **admin** area (`/admin`, `/admin/settings`, `/admin/users`, profile editors, template tools) is for **admin** accounts only. Admins manage users, gospel profiles, templates, and app settings.

New accounts created through **Manage users** are always **`admin`** staff accounts.

## Public gospel profiles

Presentation URLs (`/[slug]`, `/default`) are designed to work **without signing in**. Visibility of profile content is not tied to the old per-user assignment model.

## Database note

The hosted database may still define a Postgres `user_role` enum that includes legacy values (`counselor`, `counselee`). The application code no longer branches on those roles for permissions; only **`admin`** unlocks staff UI and privileged APIs. Run `gospel-admin/sql/migrations/20260514_admin_only_staff_remove_profile_assignment.sql` when moving to admin-only staff (clears assignment rows and adjusts RLS). To remove the legacy `profile_access` table entirely, run `gospel-admin/sql/migrations/20260516_drop_profile_access_table.sql` after deploying code that no longer references it.

## Related documentation

- [04-AUTHENTICATION.md](04-AUTHENTICATION.md) — login, magic links, verification codes
- [03-FEATURES.md](03-FEATURES.md) — product behavior map
- [SECURITY.md](SECURITY.md) — security and RLS (historical scripts live under `gospel-admin/sql/`)
