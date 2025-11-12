// Bible API service for fetching scripture from multiple translations
// Supports ESV (api.esv.org) and API.Bible (rest.api.bible)

export type BibleTranslation = 'esv' | 'kjv' | 'nasb'
import { logger } from '@/lib/logger'

interface ScriptureResult {
  reference: string
  text: string
  translation: BibleTranslation
}

// API.Bible IDs (https://rest.api.bible)
// Get your API key from https://scripture.api.bible
const API_BIBLE_IDS: Record<string, string> = {
  'kjv': 'de4e12af7f28f599-01',  // King James Version
  'nasb': '8e5cfc0c7d0b6e16-02', // New American Standard Bible 1995 (NASB 1995)
  // Add more translations here based on your API.Bible account access
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
 * Fetch scripture text from API.Bible (rest.api.bible)
 */
async function fetchFromAPIBible(reference: string, translation: BibleTranslation): Promise<ScriptureResult> {
  const apiKey = process.env.API_BIBLE_KEY
  
  if (!apiKey) {
    throw new Error('API.Bible key not configured (API_BIBLE_KEY required)')
  }

  const bibleId = API_BIBLE_IDS[translation]
  if (!bibleId) {
    throw new Error(`No API.Bible ID configured for translation: ${translation}`)
  }

  const cleanReference = reference.trim()

  // Check if this is a chapter request (no verse numbers)
  const isChapterRequest = /^[^:]+\s+\d+$/.test(cleanReference)
  
  // First, search to get the passage/chapter ID
  const searchUrl = `https://rest.api.bible/v1/bibles/${bibleId}/search?query=${encodeURIComponent(cleanReference)}&limit=1`
  
  logger.debug('[API.Bible] Searching:', { searchUrl, reference: cleanReference, bibleId, isChapterRequest })
  
  const searchResponse = await fetch(searchUrl, {
    headers: {
      'api-key': apiKey,
    },
  })

    if (!searchResponse.ok) {
    const errorText = await searchResponse.text()
    logger.error('[API.Bible] Search error:', {
      status: searchResponse.status,
      body: errorText,
    })
    throw new Error(`API.Bible search error: ${searchResponse.status} - ${errorText}`)
  }

  const searchData = await searchResponse.json()
  
  if (searchData.data && searchData.data.passages && searchData.data.passages.length > 0) {
    const passage = searchData.data.passages[0]
    
    if (isChapterRequest) {
      // For whole chapters, use the chapters endpoint
      if (passage.chapterIds && passage.chapterIds.length > 0) {
        const chapterId = passage.chapterIds[0]
        
        // Fetch the full chapter
        const chapterUrl = `https://rest.api.bible/v1/bibles/${bibleId}/chapters/${chapterId}?content-type=text&include-notes=false&include-titles=false&include-chapter-numbers=false&include-verse-numbers=true`
        
  logger.debug('[API.Bible] Fetching chapter:', { chapterUrl, chapterId })
        
        const chapterResponse = await fetch(chapterUrl, {
          headers: {
            'api-key': apiKey,
          },
        })

        if (!chapterResponse.ok) {
          const errorText = await chapterResponse.text()
          logger.error('[API.Bible] Chapter error:', {
            status: chapterResponse.status,
            body: errorText,
          })
          throw new Error(`API.Bible chapter error: ${chapterResponse.status}`)
        }

        const chapterData = await chapterResponse.json()
        
        if (chapterData.data && chapterData.data.content) {
          // Format verse numbers like ESV: [1] [2] etc.
          const formattedText = chapterData.data.content
            .replace(/<span[^>]*class="v"[^>]*>(\d+)<\/span>/g, '[$1]') // Convert verse numbers to [n] format
            .replace(/<[^>]*>/g, '') // Remove remaining HTML tags
            .replace(/\s+/g, ' ')    // Normalize whitespace
            .trim()
          
          return {
            reference: chapterData.data.reference || cleanReference,
            text: formattedText,
            translation: translation
          }
        }
      }
    } else {
      // For verse/passage requests, construct the passage ID from the reference
      // Parse the reference to get book, chapter, and verse range
      const verseRangeMatch = cleanReference.match(/(\d+):(\d+)[-–](\d+)/)
      
      let passageId = passage.id
      
      if (verseRangeMatch) {
        // This is a verse range (e.g., "John 3:16-18")
        const startVerse = verseRangeMatch[2]
        const endVerse = verseRangeMatch[3]
        
        // Construct passage ID with range: BOOK.CHAPTER.STARTVERSE-BOOK.CHAPTER.ENDVERSE
        const baseId = passage.id // e.g., "REV.20.12"
        const parts = baseId.split('.')
        if (parts.length === 3) {
          const book = parts[0]
          const chapter = parts[1]
          passageId = `${book}.${chapter}.${startVerse}-${book}.${chapter}.${endVerse}`
        }
      }
      
      const passageUrl = `https://rest.api.bible/v1/bibles/${bibleId}/passages/${passageId}?content-type=text&include-notes=false&include-titles=false&include-chapter-numbers=false&include-verse-numbers=true&include-verse-spans=false`
      
  logger.debug('[API.Bible] Fetching passage:', { passageUrl, passageId, originalId: passage.id })
      
      const passageResponse = await fetch(passageUrl, {
        headers: {
          'api-key': apiKey,
        },
      })

      if (!passageResponse.ok) {
        const errorText = await passageResponse.text()
        logger.error('[API.Bible] Passage error:', {
          status: passageResponse.status,
          body: errorText,
        })
        throw new Error(`API.Bible passage error: ${passageResponse.status}`)
      }

      const passageData = await passageResponse.json()
      
      if (passageData.data && passageData.data.content) {
        // Format verse numbers like ESV: [1] [2] etc.
        const formattedText = passageData.data.content
          .replace(/<span[^>]*class="v"[^>]*>(\d+)<\/span>/g, '[$1]') // Convert verse numbers to [n] format
          .replace(/<[^>]*>/g, '') // Remove remaining HTML tags
          .replace(/\s+/g, ' ')    // Normalize whitespace
          .trim()
        
        return {
          reference: passageData.data.reference || cleanReference,
          text: formattedText,
          translation: translation
        }
      }
    }
  }
  
  throw new Error('Scripture text not found in API.Bible response')
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
      return fetchFromAPIBible(reference, translation)
    default:
      // For any future API.Bible translations
      if (API_BIBLE_IDS[translation]) {
        return fetchFromAPIBible(reference, translation)
      }
      throw new Error(`Unsupported translation: ${translation}`)
  }
}
