import { NextRequest } from 'next/server'
import { POST } from '../route'
import { logger } from '@/lib/logger'
import { buildReciteSttKeyterms } from '@/lib/memorizationPracticeUtils'

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}))

const originalFetch = global.fetch

function makeTranscribeRequest(form: FormData): NextRequest {
  const req = new NextRequest('http://localhost/api/memorization/recite/transcribe', {
    method: 'POST',
    body: form,
  })
  return Object.assign(req, {
    formData: async () => form,
  })
}

function audioFile(contents: BlobPart | BlobPart[] = 'audio-bytes', name = 'recording.webm'): File {
  const parts = Array.isArray(contents) ? contents : [contents]
  return new File(parts, name, { type: 'audio/webm' })
}

describe('POST /api/memorization/recite/transcribe', () => {
  const originalXaiKey = process.env.XAI_API_KEY

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.XAI_API_KEY = 'test-key'
    global.fetch = jest.fn() as typeof fetch
  })

  afterEach(() => {
    if (originalXaiKey === undefined) {
      delete process.env.XAI_API_KEY
    } else {
      process.env.XAI_API_KEY = originalXaiKey
    }
    global.fetch = originalFetch
    jest.restoreAllMocks()
  })

  it('returns 503 when XAI_API_KEY is unset or blank', async () => {
    delete process.env.XAI_API_KEY
    const form = new FormData()
    form.append('audio', audioFile())
    const missing = await POST(makeTranscribeRequest(form))
    expect(missing.status).toBe(503)

    process.env.XAI_API_KEY = '   '
    const blank = await POST(makeTranscribeRequest(form))
    expect(blank.status).toBe(503)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('returns 400 when audio is missing, empty, or larger than 10MB', async () => {
    const missing = await POST(makeTranscribeRequest(new FormData()))
    expect(missing.status).toBe(400)

    const emptyForm = new FormData()
    emptyForm.append('audio', audioFile([], 'empty.webm'))
    const empty = await POST(makeTranscribeRequest(emptyForm))
    expect(empty.status).toBe(400)

    const oversizedForm = new FormData()
    oversizedForm.append('audio', audioFile([new Uint8Array(10 * 1024 * 1024 + 1)], 'big.webm'))
    const oversized = await POST(makeTranscribeRequest(oversizedForm))
    expect(oversized.status).toBe(400)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('posts language, format false, server keyterms, and the file last', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ text: 'For God so loved the world' }),
    }) as typeof fetch

    const verse = 'For God so loved the world, that he gave his only begotten Son'
    const form = new FormData()
    form.append('audio', audioFile())
    form.append('audio_seconds', '3')
    form.append('reference', 'John 3:16')
    form.append('prompt', verse)
    form.append('keyterm', verse)
    const res = await POST(makeTranscribeRequest(form))

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ text: 'For God so loved the world' })

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.x.ai/v1/stt',
      expect.objectContaining({
        method: 'POST',
        headers: { Authorization: 'Bearer test-key' },
      })
    )
    const body = (global.fetch as jest.Mock).mock.calls[0][1].body as FormData
    const keys = [...body.keys()]
    expect(keys[0]).toBe('language')
    expect(keys[1]).toBe('format')
    expect(body.get('language')).toBe('en')
    expect(body.get('format')).toBe('false')
    expect(keys.at(-1)).toBe('file')
    expect(keys.slice(2, -1).every((key) => key === 'keyterm')).toBe(true)
    expect(body.get('prompt')).toBeNull()
    expect(body.getAll('keyterm')).toEqual(buildReciteSttKeyterms('John 3:16'))
    expect(body.getAll('keyterm').join('\n')).not.toContain('For God so loved')
    expect(logger.info).toHaveBeenCalledWith(
      'Recite transcription completed',
      expect.objectContaining({ audioSeconds: 1, audioBytes: audioFile().size })
    )
  })

  it('returns 422 when xAI returns no speech', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ text: '   ' }),
    }) as typeof fetch

    const form = new FormData()
    form.append('audio', audioFile())
    const res = await POST(makeTranscribeRequest(form))
    expect(res.status).toBe(422)
  })

  it('returns 502 when xAI fails or returns non-JSON', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      text: async () => JSON.stringify({ error: { message: 'bad request' } }),
    }) as typeof fetch

    const form = new FormData()
    form.append('audio', audioFile())
    const failed = await POST(makeTranscribeRequest(form))
    expect(failed.status).toBe(502)
    await expect(failed.json()).resolves.toEqual({
      error: 'Transcription failed',
      details: 'bad request',
    })

    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      text: async () => 'not-json',
    }) as typeof fetch
    const malformed = await POST(makeTranscribeRequest(form))
    expect(malformed.status).toBe(502)
  })

  it('returns 500 when reading the upload throws', async () => {
    const req = makeTranscribeRequest(new FormData())
    req.formData = async () => {
      throw new Error('boom')
    }
    const res = await POST(req)
    expect(res.status).toBe(500)
    expect(global.fetch).not.toHaveBeenCalled()
  })
})
