/**
 * @jest-environment node
 */

jest.mock('next/server', () => {
  const actual = jest.requireActual<typeof import('next/server')>('next/server')
  return {
    ...actual,
    NextResponse: Object.assign(actual.NextResponse, {
      redirect(url: string | URL, init?: number | { status?: number }) {
        const loc = typeof url === 'string' ? url : url.toString()
        const status = typeof init === 'number' ? init : (init as { status?: number } | undefined)?.status ?? 302
        return {
          status,
          headers: { get: (n: string) => (n.toLowerCase() === 'location' ? loc : null) },
        }
      },
    }),
  }
})

import { NextRequest } from 'next/server'
import { GET } from '@/app/api/scripture/audio/route'
import * as ApiBibleAudio from '@/lib/apiBiblePassageAudio'
import * as EsvAudio from '@/lib/esvPassageAudio'

jest.mock('@/lib/esvPassageAudio', () => ({
  resolveEsvPassageAudioUrl: jest.fn(),
}))

jest.mock('@/lib/apiBiblePassageAudio', () => ({
  resolveApiBiblePassageAudioUrl: jest.fn(),
}))

describe('GET /api/scripture/audio', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('returns 400 when reference is missing', async () => {
    const req = new NextRequest('http://localhost/api/scripture/audio?translation=esv')
    const res = await GET(req)
    expect(res.status).toBe(400)
  })

  it('redirects to ESV audio URL', async () => {
    ;(EsvAudio.resolveEsvPassageAudioUrl as jest.Mock).mockResolvedValue('https://cdn.example.com/x.mp3')
    process.env.ESV_API_TOKEN = 't'
    const req = new NextRequest(
      'http://localhost/api/scripture/audio?' + new URLSearchParams({ reference: 'John 3:16', translation: 'esv' })
    )
    const res = await GET(req)
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('https://cdn.example.com/x.mp3')
  })

  it('redirects to API.Bible chapter audio URL', async () => {
    ;(ApiBibleAudio.resolveApiBiblePassageAudioUrl as jest.Mock).mockResolvedValue('https://tmp.example.com/c.mp3')
    process.env.API_BIBLE_KEY = 'k'
    const req = new NextRequest(
      'http://localhost/api/scripture/audio?' + new URLSearchParams({ reference: 'John 3:16', translation: 'niv' })
    )
    const res = await GET(req)
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('https://tmp.example.com/c.mp3')
    expect(ApiBibleAudio.resolveApiBiblePassageAudioUrl).toHaveBeenCalledWith('John 3:16', 'niv')
  })
})
