/**
 * @jest-environment node
 */

import { resolveApiBiblePassageAudioUrl } from '@/lib/apiBiblePassageAudio'

describe('resolveApiBiblePassageAudioUrl', () => {
  const origFetch = global.fetch

  afterEach(() => {
    global.fetch = origFetch
    delete process.env.API_BIBLE_KEY
    delete process.env.API_BIBLE_BIBLE_ID_NIV
    delete process.env.API_BIBLE_BIBLE_ID_CSB
  })

  it('merges GET /v1/bibles/{textId} audioBibles with GET /v1/audio-bibles?bibleId= and resolves chapter (kebab-case paths)', async () => {
    process.env.API_BIBLE_KEY = 'k'
    process.env.API_BIBLE_BIBLE_ID_NIV = 'niv-text-id'

    const calls: string[] = []
    global.fetch = jest.fn((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString()
      calls.push(url)
      if (url.includes('/v1/bibles/') && url.includes('niv-text-id')) {
        return Promise.resolve(
          new Response(JSON.stringify({ data: { id: 'niv-text-id', audioBibles: [] } }), { status: 200 })
        )
      }
      if (url.includes('/v1/audio-bibles?') && url.includes('bibleId=')) {
        expect(url).toContain(encodeURIComponent('niv-text-id'))
        return Promise.resolve(
          new Response(JSON.stringify({ data: [{ id: 'audio-1', type: 'audio' }] }), { status: 200 })
        )
      }
      if (url.includes('/v1/audio-bibles/audio-1/chapters/JHN.3')) {
        return Promise.resolve(
          new Response(JSON.stringify({ data: { resourceUrl: 'https://signed.example/a.mp3' } }), { status: 200 })
        )
      }
      return Promise.resolve(new Response('not found', { status: 404 }))
    }) as unknown as typeof fetch

    const out = await resolveApiBiblePassageAudioUrl('John 3:16', 'niv')
    expect(out).toBe('https://signed.example/a.mp3')
    expect(calls.some((u) => u.includes('/v1/bibles/'))).toBe(true)
    expect(calls.some((u) => u.includes('/v1/audio-bibles?'))).toBe(true)
  })

  it('tries the next audio bible when the first returns 404 for the chapter', async () => {
    process.env.API_BIBLE_KEY = 'k'
    process.env.API_BIBLE_BIBLE_ID_NIV = 'niv-text-id'

    global.fetch = jest.fn((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (url.includes('/v1/bibles/')) {
        return Promise.resolve(
          new Response(JSON.stringify({ data: { audioBibles: [] } }), { status: 200 })
        )
      }
      if (url.includes('/v1/audio-bibles?') && url.includes('bibleId=')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({ data: [{ id: 'fails', type: 'audio' }, { id: 'wins', type: 'audio' }] }),
            { status: 200 }
          )
        )
      }
      if (url.includes('/v1/audio-bibles/fails/chapters/')) {
        return Promise.resolve(new Response('nope', { status: 404 }))
      }
      if (url.includes('/v1/audio-bibles/wins/chapters/')) {
        return Promise.resolve(
          new Response(JSON.stringify({ data: { resourceUrl: 'https://signed.example/ok.mp3' } }), { status: 200 })
        )
      }
      return Promise.resolve(new Response('not found', { status: 404 }))
    }) as unknown as typeof fetch

    const out = await resolveApiBiblePassageAudioUrl('Deuteronomy 23:17', 'niv')
    expect(out).toBe('https://signed.example/ok.mp3')
  })

  it('uses embed-only audio when the list is empty', async () => {
    process.env.API_BIBLE_KEY = 'k'
    process.env.API_BIBLE_BIBLE_ID_CSB = 'csb-text'

    const calls: string[] = []
    global.fetch = jest.fn((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString()
      calls.push(url)
      if (url.includes('/v1/audio-bibles?') && url.includes('bibleId=')) {
        return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }))
      }
      if (url.includes('/v1/bibles/')) {
        expect(url).toContain('csb-text')
        return Promise.resolve(
          new Response(
            JSON.stringify({ data: { id: 'csb-text', audioBibles: [{ id: 'embed-audio' }] } }),
            { status: 200 }
          )
        )
      }
      if (url.includes('/v1/audio-bibles/embed-audio/chapters/')) {
        return Promise.resolve(
          new Response(JSON.stringify({ data: { resourceUrl: 'https://signed.example/csb.mp3' } }), { status: 200 })
        )
      }
      return Promise.resolve(new Response('not found', { status: 404 }))
    }) as unknown as typeof fetch

    const out = await resolveApiBiblePassageAudioUrl('Deuteronomy 23:17', 'csb')
    expect(out).toBe('https://signed.example/csb.mp3')
    expect(calls.some((u) => u.includes('/v1/audio-bibles?'))).toBe(true)
    expect(calls.some((u) => u.includes('/v1/bibles/'))).toBe(true)
  })

  it('falls back to GET .../books/{bookId}/chapters when direct .../chapters/{id} 404s but list has a canonical id', async () => {
    process.env.API_BIBLE_KEY = 'k'
    process.env.API_BIBLE_BIBLE_ID_NIV = 'niv-text-id'

    global.fetch = jest.fn((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (url.includes('/v1/bibles/')) {
        return Promise.resolve(
          new Response(JSON.stringify({ data: { audioBibles: [{ id: 'ab1' }] } }), { status: 200 })
        )
      }
      if (url.includes('/v1/audio-bibles?')) {
        return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }))
      }
      if (/\/v1\/audio-bibles\/ab1\/chapters\/JHN\.3(\?|$)/.test(url) && !url.includes('JHN.3-resolved')) {
        return Promise.resolve(new Response('nope', { status: 404 }))
      }
      if (url.includes('/v1/audio-bibles/ab1/books/JHN/chapters')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [{ id: 'JHN.3-resolved', number: '3', bookId: 'JHN' }],
            }),
            { status: 200 }
          )
        )
      }
      if (url.includes('/v1/audio-bibles/ab1/chapters/JHN.3-resolved')) {
        return Promise.resolve(
          new Response(JSON.stringify({ data: { resourceUrl: 'https://signed.example/via-list.mp3' } }), { status: 200 })
        )
      }
      return Promise.resolve(new Response('not found', { status: 404 }))
    }) as unknown as typeof fetch

    const out = await resolveApiBiblePassageAudioUrl('John 3:16', 'niv')
    expect(out).toBe('https://signed.example/via-list.mp3')
  })

  it('discovers audio from GET /v1/audio-bibles?language=eng when embed, bibleId, and abbreviation search are all empty', async () => {
    process.env.API_BIBLE_KEY = 'k'
    process.env.API_BIBLE_BIBLE_ID_CSB = 'csb-text'

    global.fetch = jest.fn((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (url.includes('/v1/bibles/') && url.includes('csb-text')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                id: 'csb-text',
                abbreviationLocal: 'CSB',
                abbreviation: 'engCSB',
                audioBibles: [],
              },
            }),
            { status: 200 }
          )
        )
      }
      if (url.includes('bibleId=')) {
        return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }))
      }
      if (url.includes('abbreviation=') || url.includes('name=')) {
        return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }))
      }
      if (
        url.includes('/v1/audio-bibles?') &&
        url.includes('language=eng') &&
        !url.includes('abbreviation=') &&
        !url.includes('name=') &&
        !url.includes('bibleId=')
      ) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [{ id: 'from-wide', type: 'audio', abbreviationLocal: 'CSB' }],
            }),
            { status: 200 }
          )
        )
      }
      if (url.includes('/v1/audio-bibles/from-wide/chapters/DEU.23')) {
        return Promise.resolve(
          new Response(JSON.stringify({ data: { resourceUrl: 'https://signed.example/wide.mp3' } }), { status: 200 })
        )
      }
      return Promise.resolve(new Response('not found', { status: 404 }))
    }) as unknown as typeof fetch

    const out = await resolveApiBiblePassageAudioUrl('Deuteronomy 23:17', 'csb')
    expect(out).toBe('https://signed.example/wide.mp3')
  })

  it('finds CSB in one GET /v1/audio-bibles?language=eng response (no limit/offset — API returns 400 for those)', async () => {
    process.env.API_BIBLE_KEY = 'k'
    process.env.API_BIBLE_BIBLE_ID_CSB = 'csb-text'

    const pad = Array.from({ length: 50 }, (_, i) => ({
      id: `pad-${i}`,
      type: 'audio' as const,
      abbreviationLocal: 'ZZZ',
    }))

    global.fetch = jest.fn((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (url.includes('/v1/bibles/') && url.includes('csb-text')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                id: 'csb-text',
                abbreviationLocal: 'CSB',
                abbreviation: 'engCSB',
                audioBibles: [],
              },
            }),
            { status: 200 }
          )
        )
      }
      if (url.includes('bibleId=')) {
        return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }))
      }
      if (url.includes('abbreviation=') || url.includes('name=')) {
        return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }))
      }
      if (
        url.includes('/v1/audio-bibles?') &&
        url.includes('language=eng') &&
        !url.includes('abbreviation=') &&
        !url.includes('name=') &&
        !url.includes('bibleId=') &&
        !url.includes('limit=') &&
        !url.includes('offset=')
      ) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [...pad, { id: 'csb-audio', type: 'audio', abbreviationLocal: 'CSB' }],
            }),
            { status: 200 }
          )
        )
      }
      if (url.includes('/v1/audio-bibles/csb-audio/chapters/DEU.23')) {
        return Promise.resolve(
          new Response(JSON.stringify({ data: { resourceUrl: 'https://signed.example/large-list.mp3' } }), { status: 200 })
        )
      }
      return Promise.resolve(new Response('not found', { status: 404 }))
    }) as unknown as typeof fetch

    const out = await resolveApiBiblePassageAudioUrl('Deuteronomy 23:17', 'csb')
    expect(out).toBe('https://signed.example/large-list.mp3')
  })

  it('matches CSB text to ENGCBS-style audio bible row (not strict string equality)', async () => {
    process.env.API_BIBLE_KEY = 'k'
    process.env.API_BIBLE_BIBLE_ID_CSB = 'csb-text'

    global.fetch = jest.fn((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (url.includes('/v1/bibles/') && url.includes('csb-text')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                id: 'csb-text',
                abbreviationLocal: 'CSB',
                abbreviation: 'engCSB',
                audioBibles: [],
              },
            }),
            { status: 200 }
          )
        )
      }
      if (url.includes('bibleId=')) {
        return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }))
      }
      if (url.includes('abbreviation=') || url.includes('name=')) {
        return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }))
      }
      if (
        url.includes('/v1/audio-bibles?') &&
        url.includes('language=eng') &&
        !url.includes('abbreviation=') &&
        !url.includes('name=') &&
        !url.includes('bibleId=')
      ) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [{ id: 'engcbs-audio', type: 'audio', abbreviation: 'ENGCBS1DA' }],
            }),
            { status: 200 }
          )
        )
      }
      if (url.includes('/v1/audio-bibles/engcbs-audio/chapters/DEU.23')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({ data: { resourceUrl: 'https://signed.example/engcbs.mp3' } }),
            { status: 200 }
          )
        )
      }
      return Promise.resolve(new Response('not found', { status: 404 }))
    }) as unknown as typeof fetch

    const out = await resolveApiBiblePassageAudioUrl('Deuteronomy 23:17', 'csb')
    expect(out).toBe('https://signed.example/engcbs.mp3')
  })

  it('matches wide list rows that only have name (no abbrev) using edition name + abbrev needles', async () => {
    process.env.API_BIBLE_KEY = 'k'
    process.env.API_BIBLE_BIBLE_ID_CSB = 'csb-text'

    global.fetch = jest.fn((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (url.includes('/v1/bibles/') && url.includes('csb-text')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                id: 'csb-text',
                nameLocal: 'Holman Christian Standard',
                name: 'CSB',
                abbreviationLocal: 'CSB',
                abbreviation: 'engCSB',
                audioBibles: [],
              },
            }),
            { status: 200 }
          )
        )
      }
      if (url.includes('bibleId=')) {
        return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }))
      }
      if (url.includes('abbreviation=') || url.includes('name=')) {
        return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }))
      }
      if (
        url.includes('/v1/audio-bibles?') &&
        url.includes('language=eng') &&
        !url.includes('abbreviation=') &&
        !url.includes('name=') &&
        !url.includes('bibleId=') &&
        !url.includes('limit=') &&
        !url.includes('offset=')
      ) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [
                { id: 'name-only', type: 'audio', nameLocal: 'HCSB Audio by Example', name: 'HCSB' },
              ],
            }),
            { status: 200 }
          )
        )
      }
      if (url.includes('/v1/audio-bibles/name-only/chapters/DEU.23')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({ data: { resourceUrl: 'https://signed.example/name-only.mp3' } }),
            { status: 200 }
          )
        )
      }
      return Promise.resolve(new Response('not found', { status: 404 }))
    }) as unknown as typeof fetch

    const out = await resolveApiBiblePassageAudioUrl('Deuteronomy 23:17', 'csb')
    expect(out).toBe('https://signed.example/name-only.mp3')
  })

  it('enriches wide list rows with GET /v1/audio-bibles/{id} when abbrev is missing, then matches', async () => {
    process.env.API_BIBLE_KEY = 'k'
    process.env.API_BIBLE_BIBLE_ID_CSB = 'csb-text'

    global.fetch = jest.fn((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (url.includes('/v1/bibles/') && url.includes('csb-text')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: {
                id: 'csb-text',
                abbreviationLocal: 'CSB',
                abbreviation: 'engCSB',
                audioBibles: [],
              },
            }),
            { status: 200 }
          )
        )
      }
      if (url.includes('bibleId=')) {
        return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }))
      }
      if (url.includes('abbreviation=') || url.includes('name=')) {
        return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }))
      }
      if (url === 'https://api.scripture.api.bible/v1/audio-bibles/need-enrich' || url.endsWith('/v1/audio-bibles/need-enrich')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({ data: { id: 'need-enrich', type: 'audio', abbreviationLocal: 'CSB' } }),
            { status: 200 }
          )
        )
      }
      if (
        url.includes('/v1/audio-bibles?') &&
        url.includes('language=eng') &&
        !url.includes('abbreviation=') &&
        !url.includes('name=') &&
        !url.includes('bibleId=') &&
        !url.includes('limit=') &&
        !url.includes('offset=')
      ) {
        return Promise.resolve(
          new Response(
            JSON.stringify({ data: [{ id: 'need-enrich', type: 'audio' }] }),
            { status: 200 }
          )
        )
      }
      if (url.includes('/v1/audio-bibles/need-enrich/chapters/DEU.23')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({ data: { resourceUrl: 'https://signed.example/enriched.mp3' } }),
            { status: 200 }
          )
        )
      }
      return Promise.resolve(new Response('not found', { status: 404 }))
    }) as unknown as typeof fetch

    const out = await resolveApiBiblePassageAudioUrl('Deuteronomy 23:17', 'csb')
    expect(out).toBe('https://signed.example/enriched.mp3')
  })
})
