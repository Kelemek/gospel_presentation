import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const reference = searchParams.get('reference')

  if (!reference) {
    return NextResponse.json({ error: 'Scripture reference is required' }, { status: 400 })
  }

  try {
    const apiToken = process.env.ESV_API_TOKEN
    if (!apiToken) {
      return NextResponse.json({ error: 'ESV API token not configured' }, { status: 500 })
    }

    // Clean up the reference
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
      return NextResponse.json({ 
        reference: cleanReference,
        text: data.passages[0].trim()
      })
    } else {
      return NextResponse.json({ 
        error: 'Scripture text not found',
        reference: cleanReference
      }, { status: 404 })
    }
  } catch (error) {
    console.error('Scripture API error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch scripture text',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}