import { resolveEsvPassageAudioUrl } from '@/lib/esvPassageAudio'

describe('resolveEsvPassageAudioUrl', () => {
  it('queries full chapter for single-chapter books stored as "Book 1"', async () => {
    process.env.ESV_API_TOKEN = 'token'
    const fetchMock = jest.fn(() =>
      Promise.resolve(
        new Response(null, {
          status: 302,
          headers: { location: 'https://audio.esv.org/final.mp3' },
        })
      )
    )
    global.fetch = fetchMock as unknown as typeof fetch

    await resolveEsvPassageAudioUrl('Obadiah 1')

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(encodeURIComponent('Obadiah 1:1-21')),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Token token' }),
      })
    )

    delete process.env.ESV_API_TOKEN
  })

  it('returns null when ESV_API_TOKEN is missing', async () => {
    const orig = process.env.ESV_API_TOKEN
    delete process.env.ESV_API_TOKEN
    await expect(resolveEsvPassageAudioUrl('John 3:16')).resolves.toBeNull()
    process.env.ESV_API_TOKEN = orig
  })
})
