# Verification run artifacts

Each drive uses `VERIFY_RUN_ID` (default UTC timestamp). Artifacts live in subfolders here and **survive** `verify-gp cleanup`.

## Proof run (skill introduction)

- **Run ID:** `proof-cb6f-20251109`
- **Feature:** `static-copyright-page`
- **Steps:** `verify-gp launch` → `verify-gp doctor` → `verify-gp feature --id static-copyright-page` → `verify-gp cleanup`
- **Primary artifact:** `proof-cb6f-20251109/feature-static-copyright.png`
