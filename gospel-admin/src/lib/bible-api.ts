// Bible API service for fetching scripture from multiple translations
// Supports ESV (api.esv.org) and local database for KJV/NASB

export type BibleTranslation = 'esv' | 'kjv' | 'nasb'
import { logger } from '@/lib/logger'
import { createAdminClient } from '@/lib/supabase/server'

interface ScriptureResult {
  reference: string
  text: string
  translation: BibleTranslation
}

/**
 * Fetch scripture text from ESV API
 */
async function fetchFromESV(reference: string): Promise<ScriptureResult> {
  const apiToken = process.env.ESV_API_TOKEN
  if (!apiToken) {
    throw new Error('ESV API token not configured')
  }

  const cleanReference = reference.trim()

  const response = await fetch(
    `https://api.esv.org/v3/passage/text/?q=${encodeURIComponent(cleanReference)}&include-headings=false&include-footnotes=false&include-verse-numbers=true&include-short-copyright=false&include-passage-references=false`,
    {
      headers: {
        'Authorization': `Token ${apiToken}`,
        'Content-Type': 'application/json',
      },
    }
  )

  if (!response.ok) {
    throw new Error(`ESV API error: ${response.status}`)
  }

  const data = await response.json()
  
  if (data.passages && data.passages.length > 0) {
    return {
      reference: cleanReference,
      text: data.passages[0].trim(),
      translation: 'esv'
    }
  } else {
    throw new Error('Scripture text not found')
  }
}

/**
 * Parse a scripture reference into components
 * Examples: "John 3:16", "Genesis 1:1-3", "Psalm 23", "Isaiah 40:25–26", "Isaiah 44:6–7a"
 * Handles both hyphens (-) and en dashes (–) in verse ranges
 * Strips letter suffixes like "a", "b" from verse numbers
 */
function parseReference(reference: string): { book: string; chapter: number; verseStart: number | null; verseEnd: number | null } | null {
  // Normalize en dashes to hyphens and remove letter suffixes
  const normalized = reference.replace(/–/g, '-').replace(/(\d+)[a-z]+/g, '$1')
  
  // Handle formats like "John 3:16" or "Genesis 1:1-3" or "Psalm 23"
  const match = normalized.match(/^(.+?)\s+(\d+)(?::(\d+)(?:-(\d+))?)?$/)
  if (!match) return null
  
  return {
    book: match[1].trim(),
    chapter: parseInt(match[2]),
    verseStart: match[3] ? parseInt(match[3]) : null,
    verseEnd: match[4] ? parseInt(match[4]) : null
  }
}

/**
 * Normalize book names to match database format
 * Database uses: "I Samuel", "II Samuel", "Revelation of John", etc.
 * Common input: "1 Samuel", "2 Samuel", "Revelation", etc.
 */
function normalizeBookName(book: string): string {
  const normalizations: Record<string, string> = {
    '1 samuel': 'I Samuel',
    '2 samuel': 'II Samuel',
    '1 kings': 'I Kings',
    '2 kings': 'II Kings',
    '1 chronicles': 'I Chronicles',
    '2 chronicles': 'II Chronicles',
    '1 corinthians': 'I Corinthians',
    '2 corinthians': 'II Corinthians',
    '1 thessalonians': 'I Thessalonians',
    '2 thessalonians': 'II Thessalonians',
    '1 timothy': 'I Timothy',
    '2 timothy': 'II Timothy',
    '1 peter': 'I Peter',
    '2 peter': 'II Peter',
    '1 john': 'I John',
    '2 john': 'II John',
    '3 john': 'III John',
    'revelation': 'Revelation of John',
    'song of songs': 'Song of Solomon',
    'song of sol': 'Song of Solomon',
  }
  
  const key = book.toLowerCase()
  return normalizations[key] || book
}

/**
 * Fetch scripture text from local database
 * Currently supports: KJV, NASB (when imported)
 */
async function fetchFromDatabase(reference: string, translation: BibleTranslation): Promise<ScriptureResult> {
  const supabase = createAdminClient()
  
  // Parse the reference (e.g., "John 3:16" or "Genesis 1:1-3")
  const parsed = parseReference(reference)
  if (!parsed) {
    throw new Error(`Invalid scripture reference format: ${reference}`)
  }
  
  const { book, chapter, verseStart, verseEnd } = parsed
  
  // Normalize book name for database lookup
  const normalizedBook = normalizeBookName(book)
  
  // Fetch verses from database
  let query = supabase
    .from('bible_verses')
    .select('verse, text')
    .eq('translation', translation)
    .eq('book', normalizedBook)
    .eq('chapter', chapter)
    .order('verse', { ascending: true })
  
  if (verseStart !== null) {
    query = query.gte('verse', verseStart)
    if (verseEnd !== null) {
      query = query.lte('verse', verseEnd)
    } else {
      query = query.eq('verse', verseStart)
    }
  }
  
  const { data, error } = await query
  
  if (error) {
    throw new Error(`Database error: ${error.message}`)
  }
  
  if (!data || data.length === 0) {
    throw new Error(`Scripture text not found in database for ${translation.toUpperCase()}. Make sure the translation has been imported.`)
  }
  
  // Format the verses with verse numbers
  const formattedText = data
    .map((v: any) => `[${v.verse}] ${v.text}`)
    .join(' ')
  
  return {
    reference: reference.trim(),
    text: formattedText,
    translation
  }
}

/**
 * Fetch scripture text from the specified translation
 */
export async function fetchScripture(
  reference: string, 
  translation: BibleTranslation = 'esv'
): Promise<ScriptureResult> {
  switch (translation) {
    case 'esv':
      return fetchFromESV(reference)
    case 'kjv':
    case 'nasb':
      // Fetch from local database
      logger.debug(`Fetching ${reference} (${translation}) from local database`)
      return await fetchFromDatabase(reference, translation)
    default:
      throw new Error(`Unsupported translation: ${translation}`)
  }
}
