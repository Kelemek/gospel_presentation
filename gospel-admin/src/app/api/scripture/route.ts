import { NextRequest, NextResponse } from 'next/server'
import { fetchScripture, BibleTranslation } from '@/lib/bible-api'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const reference = searchParams.get('reference')
  const translation = (searchParams.get('translation') || 'esv') as BibleTranslation

  if (!reference) {
    return NextResponse.json({ error: 'Scripture reference is required' }, { status: 400 })
  }

  // Validate translation
  if (translation !== 'esv' && translation !== 'kjv' && translation !== 'nasb') {
    return NextResponse.json({ error: 'Invalid translation. Must be "esv", "kjv", or "nasb"' }, { status: 400 })
  }

  try {
    const result = await fetchScripture(reference, translation)
    
    return NextResponse.json({ 
      reference: result.reference,
      text: result.text,
      translation: result.translation
    })
  } catch (error) {
  logger.error('Scripture API error:', error)
    // Preserve specific error messages and map them to expected HTTP status codes
    if (error instanceof Error) {
      const msg = error.message || 'Failed to fetch scripture text'
      if (/ESV API token not configured/i.test(msg)) {
        return NextResponse.json({ error: msg }, { status: 500 })
      }
      if (/Scripture text not found/i.test(msg)) {
        return NextResponse.json({ error: msg }, { status: 404 })
      }
      return NextResponse.json({ error: 'Failed to fetch scripture text', details: msg }, { status: 500 })
    }
    // Non-Error thrown values (e.g. throw 'boom') should return a stable details message
    return NextResponse.json({ error: 'Failed to fetch scripture text', details: 'Unknown error' }, { status: 500 })
  }
}