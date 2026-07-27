import { NextRequest } from 'next/server'
import { POST } from '../route'

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

describe('POST /api/memorization/recite/transcribe', () => {
  const originalOpenAiKey = process.env.OPENAI_API_KEY

  afterEach(() => {
    process.env.OPENAI_API_KEY = originalOpenAiKey
    global.fetch = originalFetch
    jest.restoreAllMocks()
  })

  it('returns 503 when OPENAI_API_KEY is unset', async () => {
    delete process.env.OPENAI_API_KEY
    const form = new FormData()
    form.append('audio', new File(['audio'], 'recording.webm', { type: 'audio/webm' }))
    const res = await POST(makeTranscribeRequest(form))
    expect(res.status).toBe(503)
  })

  it('returns 400 when audio is missing', async () => {
    process.env.OPENAI_API_KEY = 'test-key'
    const res = await POST(makeTranscribeRequest(new FormData()))
    expect(res.status).toBe(400)
  })

  it('returns transcript on success', async () => {
    process.env.OPENAI_API_KEY = 'test-key'
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ text: 'For God so loved the world' }),
    }) as typeof fetch

    const form = new FormData()
    form.append('audio', new File(['audio-bytes'], 'recording.webm', { type: 'audio/webm' }))
    form.append('audio_seconds', '3')
    const res = await POST(makeTranscribeRequest(form))
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ transcript: 'For God so loved the world' })
  })

  it('returns 502 when OpenAI fails', async () => {
    process.env.OPENAI_API_KEY = 'test-key'
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: { message: 'bad request' } }),
    }) as typeof fetch

    const form = new FormData()
    form.append('audio', new File(['audio-bytes'], 'recording.webm', { type: 'audio/webm' }))
    const res = await POST(makeTranscribeRequest(form))
    expect(res.status).toBe(502)
  })
})
