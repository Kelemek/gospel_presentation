# KJV Bible Import

This directory contains files to import the King James Version Bible into your Supabase database.

## Steps to Complete

### 1. Create the Table in Supabase

Go to your Supabase project: https://mchtyihbwlzjhkcmdvib.supabase.co

Navigate to: **SQL Editor** → **New Query**

Copy and paste the contents of `sql/create_bible_verses_table.sql` and click **Run**.

### 2. Run the Import Script

Once the table is created, run:

```bash
cd gospel-admin
node scripts/import-kjv-bible.js
```

This will import all 31,102 KJV verses into your database.

### 3. Update the Scripture API

After import completes, the scripture API route (`src/app/api/scripture/route.ts`) needs to be updated to check the database for KJV verses before calling external APIs.

## Files

- `kjv_data.json` - Downloaded KJV Bible data (8MB, 31,102 verses)
- `sql/create_bible_verses_table.sql` - SQL to create the table
- `scripts/import-kjv-bible.js` - Import script that loads KJV data into Supabase
- `scripts/create-bible-table.js` - Helper script (optional)

## Database Structure

```sql
CREATE TABLE bible_verses (
  id BIGSERIAL PRIMARY KEY,
  translation VARCHAR(10) NOT NULL,  -- 'kjv'
  book VARCHAR(50) NOT NULL,         -- 'Genesis', 'John', etc.
  chapter INTEGER NOT NULL,
  verse INTEGER NOT NULL,
  text TEXT NOT NULL,
  UNIQUE(translation, book, chapter, verse)
);
```

## Book Name Mapping

The KJV data uses these book names:
- Old Testament: Genesis, Exodus, ..., Malachi
- New Testament: Matthew, Mark, ..., Revelation of John

Note: Some names differ from API.Bible:
- `I Samuel` → `1 Samuel`
- `II Samuel` → `2 Samuel`
- `Revelation of John` → `Revelation`

Book name normalization will be handled in the API route.
