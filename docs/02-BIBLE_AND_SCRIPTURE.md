# Bible & Scripture System

Complete guide to Bible translations, caching, and scripture retrieval.

## Supported Translations

| Translation | Source | Notes |
|-------------|--------|-------|
| **ESV** | ESV API | Cached in `scripture_cache`, 500-verse LRU cap |
| **NIV** | [API.Bible](https://rest.api.bible) | Cached like ESV; requires Bible ID + API key |
| **NLT** | API.Bible | Same as NIV |
| **CSB** | API.Bible | Same as NIV |
| **KJV** | Local Database | 31,102 verses, no API limit |
| **NASB** | Local Database | 31,103 verses, no API limit |
| **LSB** | Local Database | Legacy Standard Bible, LSBible.org |

## Presentation menu (readers)

On gospel **profile** pages (`[slug]`), the slide-out **Menu** includes a **Bible Translation** control (`TableOfContents`, `data-tour="toc-bible-translation"`)—a button that opens a list of versions, same pattern as **Text size**. The listed versions match **admin-enabled** translations; the visitor’s choice is stored for that browser and drives scripture modals and quoted text on presentation routes. **Help → Tutorials → Bible translation** runs a short driver.js tour (`runBibleTranslationFeatureTour` in `profileHelpTours.ts`) that prefetches `/api/translations/enabled` and **lists every enabled translation by name** in the popover (same order and labels as the menu list). **Help → Tutorials → Scripture reader** tours **ScriptureModal** from the first blue scripture card (including optional **Pin** `scripture-modal-pin-color`), closes the reader after a sample pin is set, spotlights the per-color 📌 control on the highlighted card (`data-tour="scripture-progress-unpin"` on `GospelSection`, explained only—no automatic unpin), then the bottom-of-menu **Pinned passages** / **Clear pinned passages** block (`runScriptureModalFeatureTour`; `ProfileContent` `data-tour="toc-verse-pins"` / `toc-reset-progress`). On **narrow viewports** (≤767px), driver.js uses **bottom**/center popover placement, larger **stage**/**popover** spacing, and **scrollIntoView** + refresh so the spotlighted card stays visible. On devices with **non-zero safe-area insets** (`viewport-fit=cover`), tutorial popovers avoid unconditional CSS margins; a **conditional translate** nudges the popover only when it would overlap the notch or home indicator (`applyProfileHelpTourPopoverSafeAreaNudge` in `profileHelpTours.ts`).

## Local Database Translations (KJV, NASB, LSB)

KJV, NASB, and LSB are stored in the local Supabase `bible_verses` table:
- **31,102 KJV verses** - imported from scrollmapper/bible_databases (MIT licensed)
- **31,103 NASB verses** - imported from DBL USX files (Lockman Foundation licensed)
- **LSB verses** - Legacy Standard Bible (LSBible.org)
- **0 API calls needed** - completely offline capable
- **Fast lookups** - <5ms per reference
- **No rate limits** - unlimited access
- **Verse range support** - handles both hyphens (-) and en-dashes (–)

### Table Structure
```sql
bible_verses {
  id: bigint (primary key)
  translation: 'esv' | 'kjv' | 'nasb' | 'lsb'
  book: string (normalized book name)
  chapter: integer
  verse: integer
  text: string
}
```

### Setup
```bash
# Create bible_verses table
cd gospel-admin
node scripts/create-bible-table.js

# Import KJV
node scripts/import-kjv-bible.js

# Import NASB (requires DBL USX files)
node scripts/import-nasb-bible.js
```

### Book Name Normalization

**KJV Format** - Uses Roman numerals and "Revelation of John":
- Input: `1 Samuel`, `2 Samuel`, `Revelation`
- Database: `I Samuel`, `II Samuel`, `Revelation of John`

**NASB Format** - Uses Arabic numerals:
- Input: `1 Samuel`, `2 Samuel`, `Revelation`
- Database: `1 Samuel`, `2 Samuel`, `Revelation`

The `normalizeBookName()` function handles automatic conversion for both formats.

## Remote API caching (ESV, NIV, NLT, CSB)

ESV and API.Bible translations store responses in the `scripture_cache` table to:
- Reduce API calls and costs
- Stay within provider limits (ESV free tier: max **500 verses** in cache at once, enforced via `enforce_esv_cache_limit`; NIV/NLT/CSB each use `enforce_translation_cache_limit` with the same 500-verse cap per translation code)
- Speed up repeated requests

**TTL**: `ESV_CACHE_TTL_DAYS` (default 30). API.Bible rows use `API_BIBLE_CACHE_TTL_DAYS` (default **14**, per provider refresh guidance).

**Setup (Supabase)**: Run [gospel-admin/sql/enable_api_bible_translations.sql](../gospel-admin/sql/enable_api_bible_translations.sql) to add `translation_settings` rows, widen `user_profiles.valid_translation`, and create `enforce_translation_cache_limit`. Enable each translation in Admin when ready.

**Admin UI**: On **Admin → Usage Reports** (`/admin/reports`), the **Server scripture cache** section shows per-translation reference counts and verse totals vs. the 500-verse limit for **ESV** and each **API.Bible** translation (NIV, NLT, CSB), backed by `GET /api/admin/scripture-cache-stats`. The Translations dropdown links to that page for usage and cache details.

**Env (`gospel-admin/.env.local`)**:
- `API_BIBLE_KEY` — API.Bible token (sent as HTTP header `api-key`)
- `API_BIBLE_BIBLE_ID_NIV`, `API_BIBLE_BIBLE_ID_NLT`, `API_BIBLE_BIBLE_ID_CSB` — each Bible’s **`id`** from the list below (not `dblId`)
- Optional: `API_BIBLE_BASE_URL` (default `https://rest.api.bible`)

**Finding Bible IDs** ([API.Bible Getting Started](https://api.bible/getting-started)): your key only returns Bibles you are licensed to use. List them with:

```bash
curl --request GET \
  --url https://rest.api.bible/v1/bibles \
  --header 'api-key: YOUR_API_BIBLE_KEY'
```

In the JSON response, each item in `data` includes `id` (use this in URLs as `bibles/{id}/passages/...`), plus `name` and `abbreviation` / `abbreviationLocal` so you can pick the right NIV, NLT, and CSB editions. If NIV/NLT/CSB do not appear, add those translations to your API.Bible account/plan first, then call the endpoint again.

Passage requests use USFM-style IDs (e.g. `JHN.3.16`); mapping lives in `gospel-admin/src/lib/api-bible-passage-id.ts`.

## Scripture API

### Endpoint
```
GET /api/scripture?reference=John%203:16&translation=esv

**Spoken audio (not cached):** `GET /api/scripture/audio?reference=…&translation=…` returns **302** to a provider audio URL. **ESV** uses Crossway’s passage-audio API (MP3 for the requested passage). **KJV, NASB, LSB, NIV, NLT, CSB** use API.Bible: `GET /v1/audio-bibles/.../chapters/...` (see [API.Bible — Audio Bibles](https://api.bible/api-reference)) — the **audio Bible** `bibleId` in that path can differ from the text `bibleId` in `API_BIBLE_BIBLE_ID_*`; the server resolves a linked id, then the **full chapter** `resourceUrl` for the passage’s chapter. Requires the same env as text (`ESV_API_TOKEN`, `API_BIBLE_KEY`, per-translation `API_BIBLE_BIBLE_ID_*`). If no audio is linked or the reference does not parse, the route may return 404/502.
```

### Spurgeon study from the scripture modal (indexed sermons)

On **profile** pages, the scripture modal uses **`GET /api/scripture/spurgeon-links?reference=…`** while the modal is open (with **`onOpenSpurgeonStudy`** wired) to see if any indexed public sermon cites that passage. **Study** is shown in the toolbar **only when** that response includes at least one `{ slug, title }`. Clicking **Study** opens the **Spurgeon sermons** modal on the **By scripture** tab with the current passage filled in and **`GET /api/spurgeon/by-reference`** run so **all** matching sermon templates (`sg…` slugs) appear in one list. The reader shows **verse text only** (no inline presentation subsection HTML). The modal still opens on the **Verse** tab (not Chapter Context).

`spurgeon-links` returns `{ "items": [{ "slug", "title" }] }` for templates with a row in `spurgeon_passage_index` for the same **canonical passage key** as scripture cache (`canonicalScriptureCacheReference` in [`gospel-admin/src/lib/api-bible-passage-id.ts`](gospel-admin/src/lib/api-bible-passage-id.ts)). If there is **no exact** row, the API loads **same-chapter** index candidates (`passage_key` equals `BOOK.chapter` or `like BOOK.chapter.%`) and keeps rows where the modal passage and the index key **overlap in verse span** within that chapter—for example modal **`PHP.2.1-PHP.2.5`** with index **`PHP.2.3`**, or modal **`ACT.26.17`** with index **`ACT.26.15-ACT.26.18`**. Logic lives in [`gospel-admin/src/lib/spurgeon/spurgeonPassageKeyMatch.ts`](gospel-admin/src/lib/spurgeon/spurgeonPassageKeyMatch.ts). Cross-chapter USFM keys are not span-matched (exact key only). New CCEL imports also expand each indexed same-chapter range into per-verse keys (`passageKeysFromRefs` in [`gospel-admin/src/lib/spurgeon/ccelSermonHtml.ts`](gospel-admin/src/lib/spurgeon/ccelSermonHtml.ts)). Inline scripture detection normalizes **en dash** verse ranges to a hyphen so `data-gospel-ref` stays aligned ([`gospel-admin/src/lib/injectGospelInlineMarkersInHtml.ts`](gospel-admin/src/lib/injectGospelInlineMarkersInHtml.ts)). Items are **A–Z** by visible title (after stripping a leading `Sermon N.` prefix), capped at **8** for the toolbar hint. Related: `GET /api/spurgeon/sermons` (keyword search in the library modal).

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
1. **KJV / NASB / LSB** — Load from `bible_verses` (no `scripture_cache`).
2. **ESV / NIV / NLT / CSB** — If cache row exists and is newer than the TTL for that provider → return cached text. Cache lookups and upserts use a **canonical key**: the USFM passage id from `referenceToApiBiblePassageId` when the reference parses (e.g. `Psalms 23:4a` and `Psalm 23:4` → `PSA.23.4`); otherwise a normalized string fallback. **HTTP responses are not browser-cached** (`Cache-Control: no-store`); only `scripture_cache` dedupes.
3. On cache miss → call ESV API or API.Bible → upsert `scripture_cache` → run the matching LRU RPC (`enforce_esv_cache_limit` or `enforce_translation_cache_limit`).

**Headings vs. verse text**: ESV requests use `include-headings=false`. API.Bible passage requests use **`include-titles=false`** so section titles are not requested in the response (see API reference: `include-titles` controls “Include section titles in content”). `formatApiBiblePassageText` only normalizes whitespace and verse-number shapes for display; it does not remove scripture.

### Verse Range Handling
Scripture references can include verse ranges using hyphens or en-dashes:
- `John 3:16-18` → Returns verses 16, 17, 18
- `Isaiah 40:25–26` → Returns verses 25 and 26 (en-dash character)

The parser handles both ASCII hyphens (-) and Unicode en-dashes (–) for proper formatting.

## Adding Translations

**API.Bible (already wired for NIV, NLT, CSB)** — Add env vars and Bible IDs, run the SQL migration, enable rows in `translation_settings`.

**New local translation (e.g. bulk import)**:
1. Acquire licensed data in USX or similar
2. Import into `bible_verses` (see KJV/NASB scripts)
3. Extend `BibleTranslation` in `gospel-admin/src/lib/bible-translations.ts`, `fetchScripture` in `bible-api.ts`, and translation settings / `user_profiles` constraint via SQL
4. Add book normalization in `normalizeBookName()` if needed

## Performance

- **Local database (KJV/NASB)**: <5ms per lookup
- **Cached ESV / API.Bible**: <10ms per lookup
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
