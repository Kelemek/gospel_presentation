// Verse counting utility for ESV cache compliance
// Parses Bible references and calculates actual verse counts

// Book chapter verse counts - maps book name to chapters and their verse counts
const CHAPTER_VERSE_COUNTS: { [key: string]: number[] } = {
  'Deuteronomy': [34, 25, 17, 44, 49, 16, 30, 20, 48, 21, 13, 21, 13, 27, 19, 19, 20, 28, 10, 27, 36, 30, 22, 29, 23, 22, 20, 22, 21, 28, 29, 30, 30, 34, 22, 26, 22],
  'Genesis': [31, 25, 24, 26, 32, 22, 29, 32, 32, 20, 29, 23, 22, 20, 25, 22, 27, 32, 20, 26, 21, 26, 34, 22, 22, 29, 2, 32, 27, 24],
  'Psalms': [6, 12, 8, 8, 12, 10, 17, 9, 20, 18, 7, 8, 6, 7, 5, 11, 15, 50, 14, 9, 13, 31, 6, 10, 22, 12, 14, 9, 11, 13, 15, 10, 17, 16, 16, 13, 3, 18, 14, 17, 14, 16, 5, 5, 10, 7, 6, 8, 5, 12, 15, 13, 12, 9, 9, 5, 6, 7, 5, 7, 8, 5, 8, 6, 14, 5, 6, 10, 8, 7, 1, 14, 10, 4, 14, 7, 6, 4, 6, 8, 9, 4, 8, 7, 10, 6, 10, 4, 14, 7, 10, 7, 1, 4, 7, 8, 4, 5, 7, 10, 4, 7, 7, 5, 5, 5, 8, 5, 14, 5, 6, 5, 7, 13, 5, 5, 7, 7, 7, 7, 7, 7, 6, 6, 6, 6, 5, 6, 7, 8, 8, 7, 7, 10, 5, 10, 10, 9, 13, 5, 11, 10, 6, 9, 9, 8, 8, 3, 9, 4, 8, 8, 8, 9, 4, 8, 6, 7, 12, 5, 11, 7, 7, 8, 7, 10, 1, 10, 10, 4, 8, 8, 4, 12, 10, 9, 13, 8, 15, 3, 7, 8, 8, 8, 8, 8, 8, 13, 4, 8, 5, 8, 11, 11, 8, 5, 5, 5, 8, 9, 8, 5, 5, 10, 8, 9, 4, 7, 6, 7, 10, 8, 1, 6, 6, 4, 6, 9, 5, 4, 7, 8, 8, 6, 10, 1, 10, 4, 14, 3, 19, 7, 8, 9, 3, 7, 8, 9, 3, 2, 9, 13, 4, 3, 6, 3, 4, 7, 6, 13, 4, 4, 7, 6, 11, 18, 7, 22, 18, 12, 12, 13, 11, 9, 14, 15, 8],
  'Psalm': [6, 12, 8, 8, 12, 10, 17, 9, 20, 18, 7, 8, 6, 7, 5, 11, 15, 50, 14, 9, 13, 31, 6, 10, 22, 12, 14, 9, 11, 13, 15, 10, 17, 16, 16, 13, 3, 18, 14, 17, 14, 16, 5, 5, 10, 7, 6, 8, 5, 12, 15, 13, 12, 9, 9, 5, 6, 7, 5, 7, 8, 5, 8, 6, 14, 5, 6, 10, 8, 7, 1, 14, 10, 4, 14, 7, 6, 4, 6, 8, 9, 4, 8, 7, 10, 6, 10, 4, 14, 7, 10, 7, 1, 4, 7, 8, 4, 5, 7, 10, 4, 7, 7, 5, 5, 5, 8, 5, 14, 5, 6, 5, 7, 13, 5, 5, 7, 7, 7, 7, 7, 7, 6, 6, 6, 6, 5, 6, 7, 8, 8, 7, 7, 10, 5, 10, 10, 9, 13, 5, 11, 10, 6, 9, 9, 8, 8, 3, 9, 4, 8, 8, 8, 9, 4, 8, 6, 7, 12, 5, 11, 7, 7, 8, 7, 10, 1, 10, 10, 4, 8, 8, 4, 12, 10, 9, 13, 8, 15, 3, 7, 8, 8, 8, 8, 8, 8, 13, 4, 8, 5, 8, 11, 11, 8, 5, 5, 5, 8, 9, 8, 5, 5, 10, 8, 9, 4, 7, 6, 7, 10, 8, 1, 6, 6, 4, 6, 9, 5, 4, 7, 8, 8, 6, 10, 1, 10, 4, 14, 3, 19, 7, 8, 9, 3, 7, 8, 9, 3, 2, 9, 13, 4, 3, 6, 3, 4, 7, 6, 13, 4, 4, 7, 6, 11, 18, 7, 22, 18, 12, 12, 13, 11, 9, 14, 15, 8],
  'Isaiah': [31, 22, 26, 6, 30, 13, 25, 23, 20, 19, 19, 25, 22, 16, 19, 15, 16, 15, 13, 27, 14, 17, 20, 13, 13, 13, 14, 20, 31, 26, 20, 26, 13, 19, 30, 26, 27, 26, 24, 23, 26, 23, 23, 28, 25, 31, 29, 30, 23, 25, 28, 23, 19, 13, 19, 27, 31, 30, 21, 22, 25, 28, 23, 23, 24, 26, 20, 26, 31, 34],
  'Ephesians': [23, 22, 21, 32, 33, 24],
  'John': [51, 25, 36, 54, 47, 71, 53, 59, 41, 42, 57, 50, 38, 31, 27, 33, 26, 40, 42, 31, 25],
  'Colossians': [29, 23, 25, 18],
  'Ecclesiastes': [18, 26, 22, 16, 20, 12, 29, 17],
  'Galatians': [24, 21, 29, 31, 26, 18],
  'Ezekiel': [28, 10, 27, 17, 17, 14, 27, 18, 11, 22, 25, 28, 23, 23, 8, 63, 24, 32, 14, 49, 32, 31, 49, 27, 17, 21, 36, 26, 21, 26, 18, 32, 33, 31, 15, 38, 28, 23, 29, 49, 26, 20, 27, 31, 25, 24, 23, 35],
  'I Corinthians': [25, 16, 23, 21, 13, 20, 40, 13, 27, 33, 34, 31, 13, 40, 58, 24],
  '1 Corinthians': [25, 16, 23, 21, 13, 20, 40, 13, 27, 33, 34, 31, 13, 40, 58, 24],
};

export function parseVerseRange(reference: string): number {
  // Examples:
  // "John 3:16" -> 1 verse
  // "John 3:16–17" -> 2 verses
  // "John 3" -> all verses in chapter 3 of John (36 verses)
  // "John 3:1–5" -> 5 verses
  
  const bookMatch = reference.match(/^([A-Za-z\s]+?)\s+(\d+)(?::(\d+))?(?:–(\d+))?(?::(\d+))?(?:–(\d+))?$/);
  
  if (!bookMatch) {
    return 1; // Default to 1 if we can't parse
  }
  
  const book = bookMatch[1].trim();
  const startChapter = parseInt(bookMatch[2]);
  const startVerse = bookMatch[3] ? parseInt(bookMatch[3]) : null;
  const endVerseInChapter = bookMatch[4] ? parseInt(bookMatch[4]) : null;
  const endChapter = bookMatch[5] ? parseInt(bookMatch[5]) : null;
  const endVerseAlternate = bookMatch[6] ? parseInt(bookMatch[6]) : null;
  
  // Find the book in our chapter counts (case-insensitive)
  let chapterCounts: number[] | undefined;
  for (const key in CHAPTER_VERSE_COUNTS) {
    if (key.toLowerCase() === book.toLowerCase()) {
      chapterCounts = CHAPTER_VERSE_COUNTS[key];
      break;
    }
  }
  
  // If we only have a chapter reference (e.g., "John 3" or "Deuteronomy 4")
  if (startVerse === null && !endChapter) {
    if (chapterCounts && startChapter <= chapterCounts.length) {
      return chapterCounts[startChapter - 1]; // Chapters are 1-indexed
    }
    return 1; // Default if we don't have chapter data
  }
  
  // If we have verse numbers in the same chapter (e.g., "John 3:16–17")
  if (startVerse !== null && endVerseInChapter && !endChapter) {
    return endVerseInChapter - startVerse + 1;
  }
  
  // If we have an end chapter and end verse (e.g., "John 3:1–5:3")
  if (startVerse !== null && endChapter && endVerseAlternate) {
    let total = 0;
    // Count from start verse to end of start chapter
    if (chapterCounts && startChapter <= chapterCounts.length) {
      total += chapterCounts[startChapter - 1] - startVerse + 1;
    }
    // Count all chapters between start and end
    for (let ch = startChapter + 1; ch < endChapter; ch++) {
      if (chapterCounts && ch <= chapterCounts.length) {
        total += chapterCounts[ch - 1];
      }
    }
    // Count from start of end chapter to end verse
    if (chapterCounts && endChapter <= chapterCounts.length) {
      total += endVerseAlternate;
    }
    return total;
  }
  
  // Single verse (e.g., "John 3:16")
  if (startVerse !== null && !endVerseInChapter && !endChapter) {
    return 1;
  }
  
  return 1;
}

/** Max cached verses per remote translation (ESV free tier; API.Bible per-translation cap). */
export const SCRIPTURE_CACHE_VERSE_LIMIT = 500

export type ScriptureCacheTranslationStats = {
  referenceCount: number
  totalVerses: number
  verseLimit: number
  withinLimit: boolean
}

export function scriptureCacheStatsFromRows(rows: { reference: string }[]): ScriptureCacheTranslationStats {
  if (!rows.length) {
    return {
      referenceCount: 0,
      totalVerses: 0,
      verseLimit: SCRIPTURE_CACHE_VERSE_LIMIT,
      withinLimit: true,
    }
  }

  const uniqueReferences = new Set<string>()
  let totalVerses = 0
  for (const entry of rows) {
    if (!entry.reference) continue
    uniqueReferences.add(entry.reference)
    totalVerses += parseVerseRange(entry.reference)
  }

  return {
    referenceCount: uniqueReferences.size,
    totalVerses,
    verseLimit: SCRIPTURE_CACHE_VERSE_LIMIT,
    withinLimit: totalVerses <= SCRIPTURE_CACHE_VERSE_LIMIT,
  }
}

/**
 * Row count + verse total for one `scripture_cache.translation` (ESV, NIV, NLT, CSB).
 * Returns `null` if the database query fails (callers that need silent fallback should use `??` empty stats).
 */
export async function getScriptureCacheStatsForTranslation(
  supabase: any,
  translation: string
): Promise<ScriptureCacheTranslationStats | null> {
  const { data, error } = await supabase
    .from('scripture_cache')
    .select('reference')
    .eq('translation', translation)

  if (error) {
    return null
  }

  if (!data || data.length === 0) {
    return {
      referenceCount: 0,
      totalVerses: 0,
      verseLimit: SCRIPTURE_CACHE_VERSE_LIMIT,
      withinLimit: true,
    }
  }

  return scriptureCacheStatsFromRows(data as { reference: string }[])
}

export async function getTotalEsvCacheVerseCount(supabase: any): Promise<number> {
  const s = await getScriptureCacheStatsForTranslation(supabase, 'esv')
  return s?.totalVerses ?? 0
}

export async function getTotalCacheVerseCountForTranslation(
  supabase: any,
  translation: string
): Promise<number> {
  const s = await getScriptureCacheStatsForTranslation(supabase, translation)
  return s?.totalVerses ?? 0
}
