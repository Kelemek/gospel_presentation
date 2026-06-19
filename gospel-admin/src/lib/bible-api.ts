// Bible API service for fetching scripture from multiple translations
// Supports ESV (api.esv.org) and API.Bible (KJV/NASB/LSB/NIV/NLT/CSB)

import type { ApiBibleTranslation, BibleTranslation } from '@/lib/bible-translations'
import { formatApiBiblePassageContent } from '@/lib/api-bible-format'
import { referenceToApiBiblePassageId } from '@/lib/api-bible-passage-id'
import { logger } from '@/lib/logger'
import { scriptureReferenceForPassageQuery } from '@/lib/parse-scripture-reference'

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
  const queryReference = scriptureReferenceForPassageQuery(cleanReference)

  const response = await fetch(
    `https://api.esv.org/v3/passage/text/?q=${encodeURIComponent(queryReference)}&include-headings=false&include-footnotes=false&include-verse-numbers=true&include-short-copyright=false&include-passage-references=false`,
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
  kjv: 'API_BIBLE_BIBLE_ID_KJV',
  nasb: 'API_BIBLE_BIBLE_ID_NASB',
  lsb: 'API_BIBLE_BIBLE_ID_LSB',
  niv: 'API_BIBLE_BIBLE_ID_NIV',
  nlt: 'API_BIBLE_BIBLE_ID_NLT',
  csb: 'API_BIBLE_BIBLE_ID_CSB',
}

/**
 * Fetch scripture from API.Bible.
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
  /** JSON `para` nodes preserve paragraph breaks; `include-titles=false` omits section titles. */
  const url = `${base}/v1/bibles/${encodeURIComponent(bibleId)}/passages/${encodeURIComponent(passageId)}?content-type=json&include-verse-numbers=true&include-titles=false`

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

  const payload = (await response.json()) as { data?: { content?: unknown } }
  const content = payload?.data?.content
  if (content == null || (typeof content === 'string' && !content.trim())) {
    throw new Error('Scripture text not found')
  }

  const text =
    typeof content === 'string'
      ? formatApiBiblePassageContent(content)
      : Array.isArray(content)
        ? formatApiBiblePassageContent(content)
        : ''
  if (!text.trim()) {
    throw new Error('Scripture text not found')
  }

  return {
    reference: reference.trim(),
    text,
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
    case 'kjv':
    case 'nasb':
    case 'lsb':
    case 'niv':
    case 'nlt':
    case 'csb':
      logger.debug(`Fetching ${reference} (${translation}) from API.Bible`)
      return fetchFromApiBible(reference, translation)
  }
}
