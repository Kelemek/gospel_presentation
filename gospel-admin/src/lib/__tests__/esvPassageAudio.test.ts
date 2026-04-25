import { resolveEsvPassageAudioUrl } from '@/lib/esvPassageAudio'

describe('resolveEsvPassageAudioUrl', () => {
  it('returns null when ESV_API_TOKEN is missing', async () => {
    const orig = process.env.ESV_API_TOKEN
    delete process.env.ESV_API_TOKEN
    await expect(resolveEsvPassageAudioUrl('John 3:16')).resolves.toBeNull()
    process.env.ESV_API_TOKEN = orig
  })
})
