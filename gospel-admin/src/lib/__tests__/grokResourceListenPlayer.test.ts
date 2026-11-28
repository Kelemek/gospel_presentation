/**
 * @jest-environment jsdom
 */

import {
  getGrokResourceListenPlayer,
  GROK_LISTEN_WITH_TIMESTAMPS,
  resetGrokResourceListenPlayerForTests,
} from '@/lib/grokResourceListenPlayer'

class FakeAudio {
  static instances: FakeAudio[] = []
  static latest: FakeAudio | null = null
  static playBehavior: () => Promise<void> = () => Promise.resolve()
  currentTime = 0
  playbackRate = 1
  preload = ''
  ontimeupdate: (() => void) | null = null
  onended: (() => void) | null = null
  pause = jest.fn()
  play = jest.fn(() => FakeAudio.playBehavior())
  load = jest.fn()

  constructor(public src: string) {
    FakeAudio.instances.push(this)
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
    FakeAudio.instances = []
    FakeAudio.playBehavior = () => Promise.resolve()
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

  it('prefetch decodes ahead and reuses the warmed element when the chunk plays', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        audio: 'YQ==',
        contentType: 'audio/mpeg',
      }),
    }) as typeof fetch

    const player = getGrokResourceListenPlayer()
    player.configure({ voiceId: 'eve', withTimestamps: false })
    player.prefetch('Next line ready.')
    for (let i = 0; i < 10; i++) await Promise.resolve()

    const warmedCount = FakeAudio.instances.length
    expect(warmedCount).toBeGreaterThanOrEqual(1)
    expect(FakeAudio.instances[0]!.load).toHaveBeenCalled()

    const onend = jest.fn()
    player.speak('Next line ready.', 1, { onend })
    for (let i = 0; i < 10; i++) await Promise.resolve()

    expect(FakeAudio.latest).toBe(FakeAudio.instances[0])
    FakeAudio.latest!.onended?.()
    expect(onend).toHaveBeenCalled()
  })

  it('speaks a prefetched chunk without waiting on the inflight promise microtask', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        audio: 'YQ==',
        contentType: 'audio/mpeg',
      }),
    }) as typeof fetch

    const player = getGrokResourceListenPlayer()
    player.configure({ voiceId: 'eve', withTimestamps: false })
    player.prefetch('Line two.')
    for (let i = 0; i < 10; i++) await Promise.resolve()
    expect(player.isChunkReady('Line two.')).toBe(true)

    const playOrder: string[] = []
    const onstart = jest.fn(() => playOrder.push('start'))
    const onend = jest.fn(() => playOrder.push('end'))
    player.speak('Line two.', 1, { onstart, onend })
    expect(FakeAudio.latest).toBe(FakeAudio.instances[0])
    await Promise.resolve()
    expect(onstart).toHaveBeenCalled()

    FakeAudio.latest!.onended?.()
    expect(onend).toHaveBeenCalled()
    expect(playOrder).toEqual(['start', 'end'])
  })

  it('ends early when speechEndSec is before the file end', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        audio: 'YQ==',
        contentType: 'audio/mpeg',
        audioTimestamps: {
          graphChars: ['H', 'i'],
          graphTimes: [
            [0, 0.2],
            [0.2, 0.5],
          ],
        },
      }),
    })
    global.fetch = fetchMock as typeof fetch

    const onend = jest.fn()
    const player = getGrokResourceListenPlayer()
    expect(GROK_LISTEN_WITH_TIMESTAMPS).toBe(true)
    player.configure({ voiceId: 'eve', withTimestamps: GROK_LISTEN_WITH_TIMESTAMPS })
    player.speak('Hi', 1, { onend })
    for (let i = 0; i < 10; i++) await Promise.resolve()

    expect(JSON.parse(String(fetchMock.mock.calls[0]![1]!.body)).withTimestamps).toBe(true)

    const audio = FakeAudio.latest!
    audio.currentTime = 0.6
    audio.ontimeupdate?.()
    expect(onend).toHaveBeenCalled()
    expect(audio.pause).toHaveBeenCalled()
  })

  it('does not trim the clip when timestamps are absent', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        audio: 'YQ==',
        contentType: 'audio/mpeg',
      }),
    }) as typeof fetch

    const onend = jest.fn()
    const player = getGrokResourceListenPlayer()
    player.configure({ voiceId: 'eve', withTimestamps: false })
    player.speak('Hi', 1, { onend })
    for (let i = 0; i < 10; i++) await Promise.resolve()

    const audio = FakeAudio.latest!
    audio.currentTime = 0.6
    audio.ontimeupdate?.()
    expect(onend).not.toHaveBeenCalled()
    expect(audio.pause).not.toHaveBeenCalled()
  })

  it('releaseAll when the Grok voice changes so stale prefetches do not pile up', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ audio: 'YQ==', contentType: 'audio/mpeg' }),
    })
    global.fetch = fetchMock as typeof fetch

    const player = getGrokResourceListenPlayer()
    player.configure({ voiceId: 'eve', withTimestamps: false })
    player.prefetch('Same line.')
    await Promise.resolve()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(
      JSON.parse(String(fetchMock.mock.calls[0]![1]!.body)).voiceId
    ).toBe('eve')

    fetchMock.mockClear()
    player.configure({ voiceId: 'leo', withTimestamps: false })
    player.prefetch('Same line.')
    await Promise.resolve()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(
      JSON.parse(String(fetchMock.mock.calls[0]![1]!.body)).voiceId
    ).toBe('leo')
    expect(player.isSpeaking()).toBe(false)
  })

  it('pauses the current clip immediately and resumes the same element', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ audio: 'YQ==', contentType: 'audio/mpeg' }),
    }) as typeof fetch

    const onend = jest.fn()
    const player = getGrokResourceListenPlayer()
    player.configure({ voiceId: 'eve', withTimestamps: GROK_LISTEN_WITH_TIMESTAMPS })
    player.speak('Line in progress.', 1, { onend })
    for (let i = 0; i < 10; i++) await Promise.resolve()

    const audio = FakeAudio.latest!
    audio.currentTime = 1.25
    player.pause()
    expect(audio.pause).toHaveBeenCalled()
    expect(player.isPaused()).toBe(true)
    expect(player.isSpeaking()).toBe(true)
    expect(player.getSnapshot().paused).toBe(true)

    player.resume()
    expect(player.isPaused()).toBe(false)
    expect(audio.play).toHaveBeenCalledTimes(2)
    expect(audio.currentTime).toBe(1.25)
    expect(onend).not.toHaveBeenCalled()
  })

  it('pause before the clip is ready blocks prefetch from starting playback', async () => {
    let resolveFetch: (value: unknown) => void = () => {}
    global.fetch = jest.fn(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve
        })
    ) as typeof fetch

    const onstart = jest.fn()
    const onend = jest.fn()
    const player = getGrokResourceListenPlayer()
    player.configure({ voiceId: 'eve', withTimestamps: GROK_LISTEN_WITH_TIMESTAMPS })
    player.speak('Waiting on the network.', 1, { onstart, onend })

    player.pause()
    expect(player.isPaused()).toBe(true)
    expect(player.isSpeaking()).toBe(true)
    expect(FakeAudio.instances).toHaveLength(0)

    resolveFetch({
      ok: true,
      json: async () => ({ audio: 'YQ==', contentType: 'audio/mpeg' }),
    })
    for (let i = 0; i < 10; i++) await Promise.resolve()

    expect(FakeAudio.latest!.play).not.toHaveBeenCalled()
    expect(onstart).not.toHaveBeenCalled()
    expect(onend).not.toHaveBeenCalled()

    player.resume()
    for (let i = 0; i < 5; i++) await Promise.resolve()
    expect(FakeAudio.latest!.play).toHaveBeenCalledTimes(1)
    expect(onstart).toHaveBeenCalledTimes(1)
    expect(player.isPaused()).toBe(false)
  })

  it('holds the next clip when pause lands as the current clip ends', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ audio: 'YQ==', contentType: 'audio/mpeg' }),
    }) as typeof fetch

    const onend = jest.fn()
    const player = getGrokResourceListenPlayer()
    player.configure({ voiceId: 'eve', withTimestamps: GROK_LISTEN_WITH_TIMESTAMPS })
    player.speak('End of this clip.', 1, { onend })
    for (let i = 0; i < 10; i++) await Promise.resolve()

    player.pause()
    FakeAudio.latest!.onended?.()
    expect(onend).not.toHaveBeenCalled()
    expect(player.isPaused()).toBe(true)
    expect(player.isSpeaking()).toBe(true)

    player.resume()
    expect(onend).toHaveBeenCalledTimes(1)
    expect(player.isSpeaking()).toBe(false)
  })

  it('rapid pause and resume does not treat an aborted play() as a failure', async () => {
    let rejectPlay: (error: unknown) => void = () => {}
    FakeAudio.playBehavior = () =>
      new Promise((_resolve, reject) => {
        rejectPlay = reject
      })

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ audio: 'YQ==', contentType: 'audio/mpeg' }),
    }) as typeof fetch

    const onerror = jest.fn()
    const onstart = jest.fn()
    const player = getGrokResourceListenPlayer()
    player.configure({ voiceId: 'eve', withTimestamps: GROK_LISTEN_WITH_TIMESTAMPS })
    player.speak('Toggle me.', 1, { onerror, onstart })
    for (let i = 0; i < 10; i++) await Promise.resolve()

    const audio = FakeAudio.latest!
    player.pause()
    player.resume()
    player.pause()
    rejectPlay(new DOMException('The play() request was interrupted', 'AbortError'))
    for (let i = 0; i < 10; i++) await Promise.resolve()

    expect(onerror).not.toHaveBeenCalled()
    expect(onstart).not.toHaveBeenCalled()
    expect(player.isPaused()).toBe(true)
    expect(player.isSpeaking()).toBe(true)
    expect(audio.pause).toHaveBeenCalled()
  })

  it('prefetchAhead requests each chunk once', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ audio: 'YQ==', contentType: 'audio/mpeg' }),
    })
    global.fetch = fetchMock as typeof fetch

    const player = getGrokResourceListenPlayer()
    player.configure({ voiceId: 'eve', withTimestamps: false })
    player.prefetchAhead(['Chunk one.', 'Chunk two.', 'Chunk three.'])
    await Promise.resolve()

    expect(fetchMock).toHaveBeenCalledTimes(3)
    player.prefetchAhead(['Chunk one.', 'Chunk two.', 'Chunk three.'])
    await Promise.resolve()
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })
})
