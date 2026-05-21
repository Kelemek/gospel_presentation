# Bible & Scripture System

Complete guide to Bible translations, caching, and scripture retrieval.

## Supported Translations

| Translation | Source | Notes |
|-------------|--------|-------|
| **ESV** | ESV API | Cached in `scripture_cache`, 500-verse LRU cap |
| **KJV** | [API.Bible](https://rest.api.bible) | Cached in `scripture_cache`; requires `API_BIBLE_BIBLE_ID_KJV` |
| **NASB** | API.Bible | Same pattern as KJV |
| **LSB** | API.Bible | Same pattern as KJV |
| **NIV** | API.Bible | Same pattern as KJV |
| **NLT** | API.Bible | Same pattern as KJV |
| **CSB** | API.Bible | Same pattern as KJV |

## Presentation menu (readers)

On gospel **profile** pages (`[slug]`), the slide-out **Menu** includes a **Bible Translation** control (`TableOfContents`, `data-tour="toc-bible-translation"`)—a button that opens a list of versions, same pattern as **Text size**. The listed versions match **admin-enabled** translations; the visitor’s choice is stored for that browser and drives scripture modals and quoted text on presentation routes. **Help → Tutorials → Bible translation** runs a short driver.js tour (`runBibleTranslationFeatureTour` in `profileHelpTours.ts`) that prefetches `/api/translations/enabled` and **lists every enabled translation by name** in the popover (same order and labels as the menu list). **Help → Tutorials → Scripture reader** tours **ScriptureModal** from the first blue scripture card (including optional **Pin** `scripture-modal-pin-color`), closes the reader after a sample pin is set, spotlights the per-color 📌 control on the highlighted card (`data-tour="scripture-progress-unpin"` on `GospelSection`, explained only—no automatic unpin), then the bottom-of-menu **Pinned passages** / **Clear pinned passages** block (`runScriptureModalFeatureTour`; `ProfileContent` `data-tour="toc-verse-pins"` / `toc-reset-progress`). On **narrow viewports** (≤767px), driver.js uses **bottom**/center popover placement, larger **stage**/**popover** spacing, and **scrollIntoView** + refresh so the spotlighted card stays visible. On devices with **non-zero safe-area insets** (`viewport-fit=cover`), tutorial popovers avoid unconditional CSS margins; a **conditional translate** nudges the popover only when it would overlap the notch or home indicator (`applyProfileHelpTourPopoverSafeAreaNudge` in `profileHelpTours.ts`).

When a visitor opens **ScriptureModal** from a profile (blue scripture card **or** an inline reference in subsection HTML—typical for Spurgeon sermons, where refs are not duplicated onto `scriptureReferences` cards), a compact **where you are** strip appears between the toolbar and the scrollable verse area: **major section** title, then **subsection** when the anchor is below the section heading (indented with a left rule), and—when the anchor is a **nested** block—a further line for the nested title with **deeper indent**. Titles are resolved from `sections` using the same anchor ids as the TOC (`section-…`, `section-…-…`, `section-…-…-…`); when a matching scripture *card* exists, that path is preferred. Text is plain (HTML stripped the same way as the TOC). The strip uses `data-tour="scripture-modal-context"` for optional tour spotlighting; it is omitted when anchors cannot be resolved (e.g. `modal-view` fallback). The toolbar uses a single **Verse / Chapter** toggle (`data-tour="scripture-modal-verse-chapter-toggle`): it shows **Chapter** while you are on the verse view (tap to load chapter context) and **Verse** while chapter context is shown (tap to return); the control keeps a **fixed width** so the label does not shift. On viewports **narrower than Tailwind’s `sm` breakpoint** (under 640px), when the profile **text size** is **Larger** or **Largest**, **Compare** and **Translation** dropdowns use **fixed pixel widths** (Compare wider than translation so the word **Compare** is not clipped) so the **Pin** control stays beside them on the first toolbar row (root `rem` scales with text size, so default `rem`-based widths were too wide).

## Optional `bible_verses` table (import scripts only)

The app **does not** read `bible_verses` for `/api/scripture` text. KJV, NASB, and LSB (and all other non-ESV codes) are fetched from **API.Bible** in [`gospel-admin/src/lib/bible-api.ts`](../gospel-admin/src/lib/bible-api.ts).

The repo still includes Supabase scripts that can bulk-load verses into `bible_verses` (e.g. `gospel-admin/scripts/import-kjv-bible.js`, `import-nasb-bible.js`, `import-lsb-bible.js`) for **data ownership, audits, or other tooling**—not as a runtime fallback when API.Bible fails. To remove the table from hosted Postgres after you no longer need that storage, run [gospel-admin/sql/migrations/20260515_drop_bible_verses_table.sql](../gospel-admin/sql/migrations/20260515_drop_bible_verses_table.sql) (see comments in the file; export data first if you care about it).

## Server scripture cache (ESV + API.Bible)

ESV and every API.Bible-backed translation store responses in the `scripture_cache` table to:
- Reduce API calls and costs
- Stay within provider limits (ESV free tier: max **500 verses** in cache at once, enforced via `enforce_esv_cache_limit`; each API.Bible translation code uses `enforce_translation_cache_limit` with the same **500-verse cap per translation**)
- Speed up repeated requests

**TTL**: `ESV_CACHE_TTL_DAYS` (default 30). API.Bible rows use `API_BIBLE_CACHE_TTL_DAYS` (default **14**, per provider refresh guidance).

**Setup (Supabase)**: Run [gospel-admin/sql/enable_api_bible_translations.sql](../gospel-admin/sql/enable_api_bible_translations.sql) to add `translation_settings` rows, widen `user_profiles.valid_translation`, and create `enforce_translation_cache_limit`. Enable each translation in Admin when ready.

**Admin UI**: On **Admin → Usage Reports** (`/admin/reports`), the **Server scripture cache** section shows per-translation reference counts and verse totals vs. the 500-verse limit for **ESV** and each enabled **API.Bible** translation, backed by `GET /api/admin/scripture-cache-stats`. The Translations dropdown links to that page for usage and cache details.

**Env (`gospel-admin/.env.local`)**:
- `API_BIBLE_KEY` — API.Bible token (sent as HTTP header `api-key`)
- `API_BIBLE_BIBLE_ID_KJV`, `API_BIBLE_BIBLE_ID_NASB`, `API_BIBLE_BIBLE_ID_LSB`, `API_BIBLE_BIBLE_ID_NIV`, `API_BIBLE_BIBLE_ID_NLT`, `API_BIBLE_BIBLE_ID_CSB` — each Bible’s **`id`** from the list below (not `dblId`)
- Optional: `API_BIBLE_BASE_URL` (default `https://rest.api.bible`)

**Finding Bible IDs** ([API.Bible Getting Started](https://api.bible/getting-started)): your key only returns Bibles you are licensed to use. List them with:

```bash
curl --request GET \
  --url https://rest.api.bible/v1/bibles \
  --header 'api-key: YOUR_API_BIBLE_KEY'
```

In the JSON response, each item in `data` includes `id` (use this in URLs as `bibles/{id}/passages/...`), plus `name` and `abbreviation` / `abbreviationLocal` so you can pick the right edition. If a translation does not appear, add it to your API.Bible account/plan first, then call the endpoint again.

Passage requests use USFM-style IDs (e.g. `JHN.3.16`); mapping lives in `gospel-admin/src/lib/api-bible-passage-id.ts`.

## Scripture API

### Endpoint
```
GET /api/scripture?reference=John%203:16&translation=esv

**Spoken audio (not cached):** `GET /api/scripture/audio?reference=…&translation=…` returns **302** to a provider audio URL. **ESV** uses Crossway’s passage-audio API (MP3 for the requested passage). **KJV, NASB, LSB, NIV, NLT, CSB** use API.Bible: `GET /v1/audio-bibles/.../chapters/...` (see [API.Bible — Audio Bibles](https://api.bible/api-reference)) — the **audio Bible** `bibleId` in that path can differ from the text `bibleId` in `API_BIBLE_BIBLE_ID_*`; the server resolves a linked id, then the **full chapter** `resourceUrl` for the passage’s chapter. Requires the same env as text (`ESV_API_TOKEN`, `API_BIBLE_KEY`, per-translation `API_BIBLE_BIBLE_ID_*`). If no audio is linked or the reference does not parse, the route may return 404/502.
```

### Spurgeon study from the scripture modal (indexed sermons)

On **profile** pages, the scripture modal uses **`GET /api/scripture/spurgeon-links?reference=…`** while the modal is open (with **`onOpenSpurgeonStudy`** wired) to see if any indexed study resource cites that passage. **Study** stays in the toolbar: it is **enabled** when that response includes at least one `{ slug, title, kind }`, and **disabled** (greyed out) while loading, on error, or when there are no matches. Clicking **Study** when enabled opens the study library modal on the **By scripture** tab with the current passage filled in (`libraryFocus="all"`): **Spurgeon** (`sg…`), **Edwards** (`je…`), **Morning & Evening** (`me…`), and **Calvin** (`cv…`) sections as indexed. The reader shows **verse text only** (no inline presentation subsection HTML). The reader opens on **verse** view (not full-chapter context).

`spurgeon-links` returns `{ "items": [{ "slug", "title" }] }` for templates with a row in `spurgeon_passage_index` for the same **canonical passage key** as scripture cache (`canonicalScriptureCacheReference` in [`gospel-admin/src/lib/api-bible-passage-id.ts`](gospel-admin/src/lib/api-bible-passage-id.ts)). If there is **no exact** row, the API loads **same-chapter** index candidates (`passage_key` equals `BOOK.chapter` or `like BOOK.chapter.%`) and keeps rows where the modal passage and the index key **overlap in verse span** within that chapter—for example modal **`PHP.2.1-PHP.2.5`** with index **`PHP.2.3`**, or modal **`ACT.26.17`** with index **`ACT.26.15-ACT.26.18`**. Logic lives in [`gospel-admin/src/lib/spurgeon/spurgeonPassageKeyMatch.ts`](gospel-admin/src/lib/spurgeon/spurgeonPassageKeyMatch.ts). Cross-chapter USFM keys are not span-matched (exact key only). New CCEL imports also expand each indexed same-chapter range into per-verse keys (`passageKeysFromRefs` in [`gospel-admin/src/lib/spurgeon/ccelSermonHtml.ts`](gospel-admin/src/lib/spurgeon/ccelSermonHtml.ts)). Inline scripture detection normalizes **en dash** verse ranges to a hyphen so `data-gospel-ref` stays aligned ([`gospel-admin/src/lib/injectGospelInlineMarkersInHtml.ts`](gospel-admin/src/lib/injectGospelInlineMarkersInHtml.ts)). Combined items are capped at **8** for the toolbar hint, in order: Spurgeon sermons (A–Z, `Sermon N.` stripped) → Edwards sermons (A–Z) → Morning & Evening → Calvin (canon order). Response includes `sermonCount`, `edwardsCount`, `morneveCount`, and `calvinCount`. Related: `GET /api/spurgeon/sermons`, `GET /api/edwards/sermons`, and other library modal APIs.

**Provenance:** Sermon text for public `sg…` profiles is attributed on the in-app **Copyright & Attribution** page (`/copyright`)—public-domain sermons by Charles H. Spurgeon, with the ThML electronic edition credited to the **Christian Classics Ethereal Library (CCEL)** and a link to CCEL’s copyright information.

### Word study (STEP Bible, Scripture modal)

On profile gospel pages, **ScriptureModal** includes a **Words** toolbar toggle (verse view only) that opens a **word study overlay** floating over the reader’s verse scroll area (English text stays visible underneath; toolbar unchanged). It loads original-language data from [STEPBible-Data](https://github.com/STEPBible/STEPBible-Data) (CC BY 4.0)—**not** tied to the English translation (ESV, KJV, NASB, etc.). Tapping a word opens a **bottom sheet** definition over the word chips, not a fixed panel above them.

| Endpoint | Purpose |
|----------|---------|
| `GET /api/scripture/word-study?reference=Romans%2012%3A2` | Hebrew (OT) or Greek (NT) tokens per verse: surface form, transliteration, Strong’s, brief gloss |
| `GET /api/scripture/lexicon?strongs=G3339&detail=brief\|full` | TBESG / TBESH brief entries; Greek **full** uses TFLSJ where available |

**Data on disk:** Imported JSON under `gospel-admin/data/stepbible/` (`words/{USFM}/{chapter}.json`, `lexicon/greek.json`, `lexicon/hebrew.json`). No Supabase tables. Run `npm run import-stepbible` from `gospel-admin/` after clone or when updating the STEPBible pin (see `scripts/import-stepbible-data.js`). Tests use `npm run import-stepbible:fixtures` for minimal samples.

**Scope:** Full Protestant canon (TAGNT + TAHOT). Verse ranges (same chapter, e.g. Romans 12:2–4) show word study for **each** verse in the range. Chapter context disables **Words**. In compare mode, **Words** still opens the same overlay above the reader (not tied to either translation column).

**Attribution:** Credit [STEP Bible](https://www.stepbible.org/) (Tyndale House, Cambridge), CC BY 4.0—see `/copyright`.

**Android (Capacitor):** The word-study card uses the same bottom inset floors as help-tour popovers (`72px` narrow web Android, `96px` native Capacitor Android via `body.capacitor-android` in `globals.css`) so it stays above the system navigation bar when `env(safe-area-inset-bottom)` is zero.

### Response
```json
{
  "reference": "John 3:16",
  "text": "[16] For God so loved the world...",
  "translation": "esv",
  "cached": false
}
```

### How It Works
1. For any supported translation, **`GET /api/scripture`** checks `scripture_cache` for a row matching the **canonical cache key** and translation, with `cached_at` newer than that translation’s TTL.
2. **Cache hit** → return stored text (HTTP `Cache-Control: no-store`; only `scripture_cache` dedupes). Keys use `referenceToApiBiblePassageId` when the reference parses (e.g. `Psalms 23:4a` and `Psalm 23:4` → `PSA.23.4`); otherwise a normalized string fallback.
3. **Cache miss** → call **ESV API** or **API.Bible** (`fetchScripture` in `bible-api.ts`) → upsert `scripture_cache` → run **`enforce_esv_cache_limit`** or **`enforce_translation_cache_limit`**.

**Headings vs. verse text**: ESV requests use `include-headings=false`. API.Bible passage requests use **`include-titles=false`** so section titles are not requested in the response (see API reference: `include-titles` controls “Include section titles in content”). `formatApiBiblePassageText` only normalizes whitespace and verse-number shapes for display; it does not remove scripture.

### Verse Range Handling
Scripture references can include verse ranges using hyphens or en-dashes:
- `John 3:16-18` → Returns verses 16, 17, 18
- `Isaiah 40:25–26` → Returns verses 25 and 26 (en-dash character)

The parser handles both ASCII hyphens (-) and Unicode en-dashes (–) for proper formatting.

## Adding Translations

**API.Bible (KJV, NASB, LSB, NIV, NLT, CSB)** — Add env vars and Bible IDs, run the SQL migration, enable rows in `translation_settings`. Implementation: `fetchFromApiBible` in `gospel-admin/src/lib/bible-api.ts`.

**Bulk verse storage (`bible_verses`)** — Optional; use the import scripts if you want a local copy in Supabase. The running app does not fall back to this table when API.Bible errors.

## Performance

- **Cached ESV / API.Bible**: typically &lt;10ms per lookup
- **Fresh ESV or API.Bible call**: ~500–2000ms

## Attribution & Licensing

**KJV** - Public domain
- Source: scrollmapper/bible_databases (MIT licensed)
- 31,102 verses

**NASB** - Licensed content
- Copyright © 1960-1995 The Lockman Foundation
- Licensed through Digital Bible Library (DBL)
- 31,103 verses
- Attribution: www.lockman.org

**ESV** - Licensed content
- Copyright © 2001 by Crossway
- Free API tier available (max 500 verses cached, enforced via real-time LRU eviction)
- Attribution: www.esv.org

**LSB** - Licensed content
- Legacy Standard Bible Copyright ©2021 by The Lockman Foundation
- Managed in partnership with Three Sixteen Publishing Inc.
- Attribution: www.LSBible.org

**NIV / NLT / CSB** (via API.Bible)
- Text served under API.Bible and publisher terms; follow [API.Bible](https://rest.api.bible) and publisher attribution. Full publisher blurbs appear in the scripture modal footer, the gospel presentation footer, and the in-app Copyright & Attribution page (`/copyright`). **Which** translations get a blurb there follows **admin translation settings** (`translation_settings` / `GET /api/translations/enabled`): only enabled codes are shown; while the enabled list is loading, all known blurbs render to avoid a flash of missing legal text. Shared UI: `ScriptureFooterAttributionParagraphs`, `CopyrightScriptureAttributionSections`, helper `gospel-admin/src/lib/scripture-attribution-visibility.ts`.

## Related Documentation
- Full KJV details: [KJV_DATABASE.md](KJV_DATABASE.md)
- Translation setup: [BIBLE_TRANSLATION_FEATURE.md](BIBLE_TRANSLATION_FEATURE.md)
- API removal notes: [API_BIBLE_REMOVAL_COMPLETE.md](API_BIBLE_REMOVAL_COMPLETE.md)
