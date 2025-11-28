# Bible & Scripture System

Complete guide to Bible translations, caching, and scripture retrieval.

## Supported Translations

| Translation | Source | Notes |
|-------------|--------|-------|
| **ESV** | ESV API | Cached in database, free tier available |
| **KJV** | Local Database | 31,102 verses, no API limit |
| **NASB** | Local Database | 31,103 verses, no API limit |

## Local Database Translations (KJV & NASB)

Both KJV and NASB are stored in the local Supabase `bible_verses` table:
- **31,102 KJV verses** - imported from scrollmapper/bible_databases (MIT licensed)
- **31,103 NASB verses** - imported from DBL USX files (Lockman Foundation licensed)
- **0 API calls needed** - completely offline capable
- **Fast lookups** - <5ms per reference
- **No rate limits** - unlimited access
- **Verse range support** - handles both hyphens (-) and en-dashes (–)

### Table Structure
```sql
bible_verses {
  id: bigint (primary key)
  translation: 'esv' | 'kjv' | 'nasb'
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

## ESV Caching System

ESV API responses are cached in the `scripture_cache` table to:
- Reduce API calls and costs
- Stay within free tier rate limits
- Speed up repeated requests
- Handle offline scenarios

**Cache expires**: Configurable (typically 30 days)

## Scripture API

### Endpoint
```
GET /api/scripture?reference=John%203:16&translation=esv
```

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
1. Check local database for KJV/NASB verses
2. If found → Return from database immediately
3. If ESV and not found → Check cache
4. If ESV and not cached → Call ESV API
5. Cache result → Return to user

### Verse Range Handling
Scripture references can include verse ranges using hyphens or en-dashes:
- `John 3:16-18` → Returns verses 16, 17, 18
- `Isaiah 40:25–26` → Returns verses 25 and 26 (en-dash character)

The parser handles both ASCII hyphens (-) and Unicode en-dashes (–) for proper formatting.

## Adding Translations

To add a new translation (NIV, NRSV, etc.):
1. Acquire licensed data in USX format or JSON structure
2. Create import script following the KJV/NASB pattern:
   - Parse verses into `{translation, book, chapter, verse, text}` objects
   - Batch insert into `bible_verses` table (500 records per batch)
3. Update translation constants in `bible-api.ts`
4. Add book name normalization if needed in `normalizeBookName()`
5. Configure in translation settings UI

## Performance

- **Local database (KJV/NASB)**: <5ms per lookup
- **Cached ESV**: <10ms per lookup
- **Fresh ESV API call**: 500-2000ms

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

## Related Documentation
- Full KJV details: [KJV_DATABASE.md](KJV_DATABASE.md)
- Translation setup: [BIBLE_TRANSLATION_FEATURE.md](BIBLE_TRANSLATION_FEATURE.md)
- API removal notes: [API_BIBLE_REMOVAL_COMPLETE.md](API_BIBLE_REMOVAL_COMPLETE.md)
