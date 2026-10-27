-- Create bible_verses table to store Bible text locally
-- This allows us to serve certain translations (like KJV) directly from our database
-- instead of relying on external APIs

CREATE TABLE IF NOT EXISTS bible_verses (
  id BIGSERIAL PRIMARY KEY,
  translation VARCHAR(10) NOT NULL,  -- 'kjv', 'nasb', etc.
  book VARCHAR(50) NOT NULL,
  chapter INTEGER NOT NULL,
  verse INTEGER NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(translation, book, chapter, verse)
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_bible_verses_lookup 
  ON bible_verses(translation, book, chapter, verse);

-- Create index for book lookups
CREATE INDEX IF NOT EXISTS idx_bible_verses_book 
  ON bible_verses(translation, book);

COMMENT ON TABLE bible_verses IS 'Stores Bible verses for translations we host locally (e.g., KJV)';
COMMENT ON COLUMN bible_verses.translation IS 'Translation code (kjv, nasb, etc.)';
COMMENT ON COLUMN bible_verses.book IS 'Book name (Genesis, Exodus, John, etc.)';
COMMENT ON COLUMN bible_verses.chapter IS 'Chapter number';
COMMENT ON COLUMN bible_verses.verse IS 'Verse number';
COMMENT ON COLUMN bible_verses.text IS 'The actual verse text';
