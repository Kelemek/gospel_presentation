/**
 * @jest-environment jsdom
 */

import { getGrokResourceListenPlayer, resetGrokResourceListenPlayerForTests } from '@/lib/grokResourceListenPlayer'

class FakeAudio {
  static latest: FakeAudio | null = null
  currentTime = 0
  playbackRate = 1
  ontimeupdate: (() => void) | null = null
  onended: (() => void) | null = null
  pause = jest.fn()
  play = jest.fn().mockResolvedValue(undefined)

  constructor(public src: string) {
    FakeAudio.latest = this
  }
}

describe('Grok resource listen player', () => {
  const originalFetch = global.fetch
  const originalCreate = URL.createObjectURL
  const originalRevoke = URL.revokeObjectURL
  const originalAudio = global.Audio

  beforeEach(() => {
    FakeAudio.latest = null
    resetGrokResourceListenPlayerForTests()
    URL.createObjectURL = jest.fn(() => 'blob:chunk') as typeof URL.createObjectURL
    URL.revokeObjectURL = jest.fn()
    global.Audio = FakeAudio as unknown as typeof Audio
  })

  afterEach(() => {
    resetGrokResourceListenPlayerForTests()
    global.fetch = originalFetch
    URL.createObjectURL = originalCreate
    URL.revokeObjectURL = originalRevoke
    global.Audio = originalAudio
  })

  it('plays fetched audio at the selected speed, reports the word start, and revokes the URL', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        audio: 'YQ==',
        contentType: 'audio/mpeg',
        audioTimestamps: {
          graphChars: ['H', 'i'],
          graphTimes: [
            [0, 0.2],
            [0.2, 0.4],
          ],
        },
      }),
    }) as typeof fetch

    const onboundary = jest.fn()
    const onend = jest.fn()
    const player = getGrokResourceListenPlayer()
    player.configure({ voiceId: 'eve', withTimestamps: true })
    player.speak('Hi', 1.5, { onboundary, onend })

    for (let i = 0; i < 10; i++) await Promise.resolve()

    const audio = FakeAudio.latest
    expect(audio).not.toBeNull()
    expect(audio!.playbackRate).toBe(1.5)
    expect(audio!.src).toBe('blob:chunk')
    expect(onboundary).toHaveBeenCalledWith(expect.objectContaining({ charIndex: 0, charLength: 2, startSec: 0 }))

    audio!.onended?.()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:chunk')
    expect(onend).toHaveBeenCalled()
  })
})
