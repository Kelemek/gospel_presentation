# STEPBible word-study data (CC BY 4.0)

This folder is **not** in git (see `.gitignore`). `words/` and `lexicon/` are generated locally or on **Vercel** during `npm run build` via `scripts/ensure-stepbible-data.js` (full import when missing).

```bash
npm run import-stepbible          # full Bible (~15–20 min download/parse)
npm run reimport-stepbible        # wipe words/ and re-import (after import script fixes)
npm run import-stepbible:fixtures # minimal samples for Jest
```

After re-importing, **restart `npm run dev`** so API routes drop cached chapter JSON.

**Vercel:** First production build after a clean cache downloads ~100MB+ from GitHub (15–20 min). In Project Settings → Build & Development, add **`data/stepbible`** to cached paths so later deploys reuse the import. Set `SKIP_STEPBIBLE_IMPORT=1` only if you intentionally deploy without word study.

Source: [STEPBible-Data](https://github.com/STEPBible/STEPBible-Data) (TAGNT, TAHOT, TBESG, TBESH, TFLSJ).
