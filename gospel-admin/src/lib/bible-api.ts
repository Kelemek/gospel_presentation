// Bible API service for fetching scripture from multiple translations
// Supports ESV (api.esv.org), API.Bible (NIV/NLT/CSB), and local database for KJV/NASB/LSB

import type { ApiBibleTranslation, BibleTranslation } from '@/lib/bible-translations'
import { formatApiBiblePassageText } from '@/lib/api-bible-format'
import { referenceToApiBiblePassageId } from '@/lib/api-bible-passage-id'
import { parseReference } from '@/lib/parse-scripture-reference'
import { logger } from '@/lib/logger'
import { createAdminClient } from '@/lib/supabase/server'

export type { BibleTranslation } from '@/lib/bible-translations'

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
        Authorization: `Token ${apiToken}`,
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
      translation: 'esv',
    }
  }
  throw new Error('Scripture text not found')
}

const API_BIBLE_ID_ENV: Record<ApiBibleTranslation, string> = {
  niv: 'API_BIBLE_BIBLE_ID_NIV',
  nlt: 'API_BIBLE_BIBLE_ID_NLT',
  csb: 'API_BIBLE_BIBLE_ID_CSB',
}

/**
 * Fetch scripture from API.Bible (NIV, NLT, CSB).
 */
async function fetchFromApiBible(
  reference: string,
  translation: ApiBibleTranslation
): Promise<ScriptureResult> {
  const apiKey = process.env.API_BIBLE_KEY
  if (!apiKey) {
    throw new Error('API.Bible key not configured')
  }

  const envName = API_BIBLE_ID_ENV[translation]
  const bibleId = process.env[envName]
  if (!bibleId) {
    throw new Error(`API.Bible Bible ID not configured (${envName})`)
  }

  const passageId = referenceToApiBiblePassageId(reference)
  if (!passageId) {
    throw new Error(`Invalid scripture reference format: ${reference}`)
  }

  const base = (process.env.API_BIBLE_BASE_URL || 'https://rest.api.bible').replace(/\/$/, '')
  const url = `${base}/v1/bibles/${encodeURIComponent(bibleId)}/passages/${encodeURIComponent(passageId)}?content-type=text&include-verse-numbers=true`

  const response = await fetch(url, {
    headers: {
      'api-key': apiKey,
    },
  })

  if (response.status === 404) {
    throw new Error('Scripture text not found')
  }
  if (!response.ok) {
    throw new Error(`API.Bible error: ${response.status}`)
  }

  const payload = (await response.json()) as { data?: { content?: string } }
  const content = payload?.data?.content
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('Scripture text not found')
  }

  return {
    reference: reference.trim(),
    text: formatApiBiblePassageText(content),
    translation,
  }
}

/**
 * Normalize book names to match database format
 * KJV uses Roman numerals: "I Samuel", "II Samuel", "Revelation of John"
 * NASB uses Arabic numerals: "1 Samuel", "2 Samuel", "Revelation"
 * Common input: "1 Samuel", "2 Samuel", "Revelation", etc.
 */
function normalizeBookName(book: string, translation: BibleTranslation): string {
  const key = book.toLowerCase()

  if (translation === 'kjv') {
    const kjvNormalizations: Record<string, string> = {
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
      revelation: 'Revelation of John',
      'song of songs': 'Song of Solomon',
      'song of sol': 'Song of Solomon',
    }
    return kjvNormalizations[key] || book
  }

  const commonNormalizations: Record<string, string> = {
    'song of songs': 'Song of Solomon',
    'song of sol': 'Song of Solomon',
  }

  return commonNormalizations[key] || book
}

/**
 * Fetch scripture text from local database
 * Currently supports: KJV, NASB (when imported)
 */
async function fetchFromDatabase(reference: string, translation: BibleTranslation): Promise<ScriptureResult> {
  const supabase = createAdminClient()

  const parsed = parseReference(reference)
  if (!parsed) {
    throw new Error(`Invalid scripture reference format: ${reference}`)
  }

  const { book, chapter, verseStart, verseEnd } = parsed

  const normalizedBook = normalizeBookName(book, translation)

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
    throw new Error(
      `Scripture text not found in database for ${translation.toUpperCase()}. Make sure the translation has been imported.`
    )
  }

  const formattedText = data.map((v: { verse: number; text: string }) => `[${v.verse}] ${v.text}`).join(' ')

  return {
    reference: reference.trim(),
    text: formattedText,
    translation,
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
    case 'niv':
    case 'nlt':
    case 'csb':
      logger.debug(`Fetching ${reference} (${translation}) from API.Bible`)
      return fetchFromApiBible(reference, translation)
    case 'kjv':
    case 'nasb':
    case 'lsb':
      logger.debug(`Fetching ${reference} (${translation}) from local database`)
      return await fetchFromDatabase(reference, translation)
  }
}
