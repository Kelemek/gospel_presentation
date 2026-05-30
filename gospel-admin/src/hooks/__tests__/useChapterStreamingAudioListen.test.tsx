/**
 * @jest-environment jsdom
 */

import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useChapterStreamingAudioListen } from '@/hooks/useChapterStreamingAudioListen'
import { applyMemorizeListenPlaybackRateToMediaElement } from '@/lib/memorizeListenSpeedStorage'

jest.mock('@/lib/memorizeListenSpeedStorage', () => {
  const actual = jest.requireActual<typeof import('@/lib/memorizeListenSpeedStorage')>(
    '@/lib/memorizeListenSpeedStorage'
  )
  return {
    ...actual,
    applyMemorizeListenPlaybackRateToMediaElement: jest.fn(actual.applyMemorizeListenPlaybackRateToMediaElement),
  }
})

jest.mock('@/lib/scrollReadAlongPlain', () => {
  const actual = jest.requireActual<typeof import('@/lib/scrollReadAlongPlain')>(
    '@/lib/scrollReadAlongPlain'
  )
  return {
    ...actual,
    prefersReducedMotionReadAlong: jest.fn(() => true),
  }
})

const mockApplyRate = applyMemorizeListenPlaybackRateToMediaElement as jest.MockedFunction<
  typeof applyMemorizeListenPlaybackRateToMediaElement
>

function Harness({
  audioUrls,
  enabled,
  onEnded,
  onTrackIndexChange,
  playlistStartIndex,
  onAutoAdvanceAfterPlayback,
  autoScroll,
}: {
  audioUrls: string[]
  enabled: boolean
  onEnded?: () => void
  onTrackIndexChange?: (index: number) => void
  playlistStartIndex?: number
  onAutoAdvanceAfterPlayback?: () => boolean | void
  autoScroll?: {
    scopeRef: { current: HTMLElement | null }
    scrollContainerRef: { current: HTMLElement | null }
  }
}) {
  const {
    passageAudioRef,
    handlePassageAudioPlay,
    handlePassageAudioEnded,
    handlePassageAudioError,
    handlePassageAudioLoadedMetadata,
    handlePassageAudioPause,
    handlePrimaryClick,
    readAloudDialogPrimaryLabel,
  } = useChapterStreamingAudioListen({
    audioUrls,
    enabled,
    onTrackIndexChange,
    playlistStartIndex,
    onAutoAdvanceAfterPlayback,
    autoScroll,
  })
  return (
    <>
      <audio
        ref={passageAudioRef}
        data-testid="passage-audio"
        onPlay={handlePassageAudioPlay}
        onPause={handlePassageAudioPause}
        onEnded={onEnded ?? handlePassageAudioEnded}
        onError={handlePassageAudioError}
        onLoadedMetadata={handlePassageAudioLoadedMetadata}
      />
      <button type="button" onClick={handlePrimaryClick}>
        primary
      </button>
      <span data-testid="primary-label">{readAloudDialogPrimaryLabel}</span>
    </>
  )
}

describe('useChapterStreamingAudioListen', () => {
  const audioUrl = '/api/scripture/audio?reference=John%203&translation=esv'
  let rafCallbacks: FrameRequestCallback[] = []
  let rafId = 0

  function flushRaf() {
    const pending = [...rafCallbacks]
    rafCallbacks = []
    for (const cb of pending) {
      cb(performance.now())
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
    HTMLMediaElement.prototype.play = jest.fn().mockResolvedValue(undefined)
    HTMLMediaElement.prototype.pause = jest.fn()
    HTMLMediaElement.prototype.load = jest.fn()
    rafCallbacks = []
    rafId = 0
    global.requestAnimationFrame = jest.fn((cb: FrameRequestCallback) => {
      rafCallbacks.push(cb)
      rafId += 1
      return rafId
    }) as typeof requestAnimationFrame
    global.cancelAnimationFrame = jest.fn((id: number) => {
      rafCallbacks = rafCallbacks.filter((_, index) => index + 1 !== id)
    }) as typeof cancelAnimationFrame
  })

  it('assigns audio src and plays when primary is clicked', async () => {
    const user = userEvent.setup()
    render(<Harness audioUrls={[audioUrl]} enabled />)
    await user.click(screen.getByRole('button', { name: 'primary' }))
    const el = screen.getByTestId('passage-audio') as HTMLAudioElement
    expect(el.src).toContain('/api/scripture/audio')
    expect(el.src).toContain('John')
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled()
    expect(mockApplyRate).toHaveBeenCalled()
  })

  it('stops and clears src when enabled becomes false', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<Harness audioUrls={[audioUrl]} enabled />)
    await user.click(screen.getByRole('button', { name: 'primary' }))
    const el = screen.getByTestId('passage-audio') as HTMLAudioElement
    expect(el.getAttribute('src')).toBeTruthy()
    rerender(<Harness audioUrls={[audioUrl]} enabled={false} />)
    expect(el.getAttribute('src')).toBeNull()
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled()
  })

  it('pauses when primary is clicked while playing', async () => {
    const user = userEvent.setup()
    render(<Harness audioUrls={[audioUrl]} enabled />)
    const el = screen.getByTestId('passage-audio') as HTMLAudioElement
    await user.click(screen.getByRole('button', { name: 'primary' }))
    Object.defineProperty(el, 'paused', { configurable: true, get: () => false })
    await user.click(screen.getByRole('button', { name: 'primary' }))
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled()
  })

  it('cancels speech synthesis when starting playback', async () => {
    const cancel = jest.fn()
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: { speaking: true, cancel },
    })
    const user = userEvent.setup()
    render(<Harness audioUrls={[audioUrl]} enabled />)
    await user.click(screen.getByRole('button', { name: 'primary' }))
    expect(cancel).toHaveBeenCalled()
    delete (window as { speechSynthesis?: unknown }).speechSynthesis
  })

  it('switches audio when audioUrls change during playback', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<Harness audioUrls={[audioUrl]} enabled />)
    await user.click(screen.getByRole('button', { name: 'primary' }))
    const el = screen.getByTestId('passage-audio') as HTMLAudioElement
    expect(el.src).toContain('John')
    Object.defineProperty(el, 'paused', { configurable: true, get: () => false })
    Object.defineProperty(el, 'ended', { configurable: true, get: () => false })
    rerender(
      <Harness
        audioUrls={['/api/scripture/audio?reference=Romans%208&translation=esv']}
        enabled
      />
    )
    await act(async () => {
      await Promise.resolve()
    })
    expect(el.src).toContain('Romans')
  })

  it('calls onTrackIndexChange when each playlist track starts', async () => {
    const onTrackIndexChange = jest.fn()
    const user = userEvent.setup()
    render(
      <Harness
        audioUrls={[
          '/api/scripture/audio?reference=Genesis%201&translation=esv',
          '/api/scripture/audio?reference=Matthew%201&translation=esv',
        ]}
        enabled
        onTrackIndexChange={onTrackIndexChange}
      />
    )
    await user.click(screen.getByRole('button', { name: 'primary' }))
    expect(onTrackIndexChange).toHaveBeenCalledWith(0)

    const el = screen.getByTestId('passage-audio') as HTMLAudioElement
    await act(async () => {
      el.dispatchEvent(new Event('ended'))
    })
    expect(onTrackIndexChange).toHaveBeenCalledWith(1)
  })

  it('does not reset playback when audioUrls array identity changes but URLs are unchanged', async () => {
    const urls = [
      '/api/scripture/audio?reference=Genesis%201&translation=esv',
      '/api/scripture/audio?reference=Matthew%201&translation=esv',
    ]
    const user = userEvent.setup()
    const { rerender } = render(<Harness audioUrls={urls} enabled />)
    await user.click(screen.getByRole('button', { name: 'primary' }))
    const el = screen.getByTestId('passage-audio') as HTMLAudioElement
    expect(el.src).toContain('Genesis')
    rerender(<Harness audioUrls={[...urls]} enabled />)
    expect(el.src).toContain('Genesis')
  })

  it('starts playlist from playlistStartIndex, not always track 0', async () => {
    const urls = [
      '/api/scripture/audio?reference=Genesis%201&translation=esv',
      '/api/scripture/audio?reference=Matthew%201&translation=esv',
      '/api/scripture/audio?reference=Ezra%201&translation=esv',
    ]
    const user = userEvent.setup()
    render(<Harness audioUrls={urls} enabled playlistStartIndex={1} />)
    await user.click(screen.getByRole('button', { name: 'primary' }))
    const el = screen.getByTestId('passage-audio') as HTMLAudioElement
    expect(el.src).toContain('Matthew')
    expect(el.src).not.toContain('Genesis')
  })

  it('follows playlistStartIndex while playing when the reader chapter changes', async () => {
    const urls = [
      '/api/scripture/audio?reference=Genesis%201&translation=esv',
      '/api/scripture/audio?reference=Matthew%201&translation=esv',
    ]
    const user = userEvent.setup()
    const { rerender } = render(<Harness audioUrls={urls} enabled playlistStartIndex={0} />)
    await user.click(screen.getByRole('button', { name: 'primary' }))
    const el = screen.getByTestId('passage-audio') as HTMLAudioElement
    expect(el.src).toContain('Genesis')
    Object.defineProperty(el, 'paused', { configurable: true, get: () => false })
    Object.defineProperty(el, 'ended', { configurable: true, get: () => false })
    rerender(<Harness audioUrls={urls} enabled playlistStartIndex={1} />)
    await act(async () => {
      await Promise.resolve()
    })
    expect(el.src).toContain('Matthew')
  })

  it('plays each url in a playlist then stops', async () => {
    const urls = [
      '/api/scripture/audio?reference=Genesis%201&translation=esv',
      '/api/scripture/audio?reference=Matthew%201&translation=esv',
    ]
    const user = userEvent.setup()
    render(<Harness audioUrls={urls} enabled />)
    await user.click(screen.getByRole('button', { name: 'primary' }))
    const el = screen.getByTestId('passage-audio') as HTMLAudioElement
    expect(el.src).toContain('Genesis')

    await act(async () => {
      el.dispatchEvent(new Event('ended'))
    })
    expect(el.src).toContain('Matthew')
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(2)

    await act(async () => {
      el.dispatchEvent(new Event('ended'))
    })
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(2)
  })

  it('calls onAutoAdvanceAfterPlayback when a single track ends and auto-plays after URL change', async () => {
    const onAutoAdvance = jest.fn(() => true)
    const user = userEvent.setup()
    const nextUrl = '/api/scripture/audio?reference=John%203%3A17&translation=esv'
    const advance = () => {
      onAutoAdvance()
      return true
    }
    const { rerender } = render(
      <Harness audioUrls={[audioUrl]} enabled onAutoAdvanceAfterPlayback={advance} />
    )
    await user.click(screen.getByRole('button', { name: 'primary' }))
    const el = screen.getByTestId('passage-audio') as HTMLAudioElement
    await act(async () => {
      el.dispatchEvent(new Event('ended'))
    })
    expect(onAutoAdvance).toHaveBeenCalledTimes(1)

    rerender(
      <Harness audioUrls={[nextUrl]} enabled onAutoAdvanceAfterPlayback={advance} />
    )
    await waitFor(() => {
      expect(el.src).toContain('3%3A17')
    })
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(2)
  })

  it('auto-plays after URL change when enabled was false during passage load', async () => {
    const onAutoAdvance = jest.fn(() => true)
    const user = userEvent.setup()
    const nextUrl = '/api/scripture/audio?reference=John%203%3A17&translation=esv'
    const advance = () => {
      onAutoAdvance()
      return true
    }
    const { rerender } = render(
      <Harness audioUrls={[audioUrl]} enabled onAutoAdvanceAfterPlayback={advance} />
    )
    await user.click(screen.getByRole('button', { name: 'primary' }))
    const el = screen.getByTestId('passage-audio') as HTMLAudioElement
    await act(async () => {
      el.dispatchEvent(new Event('ended'))
    })
    expect(onAutoAdvance).toHaveBeenCalledTimes(1)

    rerender(
      <Harness audioUrls={[nextUrl]} enabled={false} onAutoAdvanceAfterPlayback={advance} />
    )
    await act(async () => {
      await Promise.resolve()
    })

    rerender(
      <Harness audioUrls={[nextUrl]} enabled onAutoAdvanceAfterPlayback={advance} />
    )
    await waitFor(() => {
      expect(el.src).toContain('3%3A17')
    })
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(2)
  })

  it('does not call onAutoAdvanceAfterPlayback when the user paused before ended', async () => {
    const onAutoAdvance = jest.fn()
    const user = userEvent.setup()
    render(
      <Harness
        audioUrls={[audioUrl]}
        enabled
        onAutoAdvanceAfterPlayback={onAutoAdvance}
      />
    )
    await user.click(screen.getByRole('button', { name: 'primary' }))
    const el = screen.getByTestId('passage-audio') as HTMLAudioElement
    Object.defineProperty(el, 'paused', { configurable: true, get: () => false })
    await user.click(screen.getByRole('button', { name: 'primary' }))
    await act(async () => {
      el.dispatchEvent(new Event('ended'))
    })
    expect(onAutoAdvance).not.toHaveBeenCalled()
  })

  it('scrolls the passage pane via rAF when autoScroll is configured', async () => {
    document.body.innerHTML = '<div id="scope">For God so loved the world</div>'
    const scope = document.getElementById('scope') as HTMLElement
    const scrollContainer = document.createElement('div')
    document.body.appendChild(scrollContainer)
    Object.defineProperty(scrollContainer, 'scrollTop', { configurable: true, writable: true, value: 0 })
    Object.defineProperty(scrollContainer, 'scrollHeight', { configurable: true, value: 1000 })
    Object.defineProperty(scrollContainer, 'clientHeight', { configurable: true, value: 400 })

    const user = userEvent.setup()
    render(
      <Harness
        audioUrls={[audioUrl]}
        enabled
        autoScroll={{ scopeRef: { current: scope }, scrollContainerRef: { current: scrollContainer } }}
      />
    )
    await user.click(screen.getByRole('button', { name: 'primary' }))
    const el = screen.getByTestId('passage-audio') as HTMLAudioElement
    Object.defineProperty(el, 'duration', { configurable: true, value: 10 })
    Object.defineProperty(el, 'currentTime', { configurable: true, value: 0, writable: true })
    Object.defineProperty(el, 'paused', { configurable: true, get: () => false })

    let now = 1000
    jest.spyOn(performance, 'now').mockImplementation(() => now)

    await act(async () => {
      el.dispatchEvent(new Event('play'))
      flushRaf()
    })
    expect(scrollContainer.scrollTop).toBe(0)

    now += 5000
    await act(async () => {
      flushRaf()
    })
    expect(scrollContainer.scrollTop).toBe(300)
  })

  it('cancels rAF auto-scroll loop on pause', async () => {
    document.body.innerHTML = '<div id="scope">For God so loved the world</div>'
    const scope = document.getElementById('scope') as HTMLElement
    const scrollContainer = document.createElement('div')
    document.body.appendChild(scrollContainer)
    Object.defineProperty(scrollContainer, 'scrollTop', { configurable: true, writable: true, value: 0 })
    Object.defineProperty(scrollContainer, 'scrollHeight', { configurable: true, value: 1000 })
    Object.defineProperty(scrollContainer, 'clientHeight', { configurable: true, value: 400 })

    let now = 1000
    jest.spyOn(performance, 'now').mockImplementation(() => now)

    const user = userEvent.setup()
    render(
      <Harness
        audioUrls={[audioUrl]}
        enabled
        autoScroll={{ scopeRef: { current: scope }, scrollContainerRef: { current: scrollContainer } }}
      />
    )
    await user.click(screen.getByRole('button', { name: 'primary' }))
    const el = screen.getByTestId('passage-audio') as HTMLAudioElement
    Object.defineProperty(el, 'duration', { configurable: true, value: 10 })
    Object.defineProperty(el, 'currentTime', { configurable: true, value: 5, writable: true })
    let paused = false
    Object.defineProperty(el, 'paused', { configurable: true, get: () => paused })

    await act(async () => {
      el.dispatchEvent(new Event('play'))
      flushRaf()
    })
    expect(global.requestAnimationFrame).toHaveBeenCalled()

    paused = true
    await act(async () => {
      el.dispatchEvent(new Event('pause'))
      flushRaf()
    })
    expect(global.cancelAnimationFrame).toHaveBeenCalled()
    const scrollTopAfterPause = scrollContainer.scrollTop
    now += 1000
    await act(async () => {
      flushRaf()
    })
    expect(scrollContainer.scrollTop).toBe(scrollTopAfterPause)
  })

  it('does not adjust scroll when the pane is already at the bottom', async () => {
    document.body.innerHTML = '<div id="scope">For God so loved the world</div>'
    const scope = document.getElementById('scope') as HTMLElement
    const scrollContainer = document.createElement('div')
    document.body.appendChild(scrollContainer)
    Object.defineProperty(scrollContainer, 'scrollTop', { configurable: true, writable: true, value: 600 })
    Object.defineProperty(scrollContainer, 'scrollHeight', { configurable: true, value: 1000 })
    Object.defineProperty(scrollContainer, 'clientHeight', { configurable: true, value: 400 })

    const user = userEvent.setup()
    render(
      <Harness
        audioUrls={[audioUrl]}
        enabled
        autoScroll={{ scopeRef: { current: scope }, scrollContainerRef: { current: scrollContainer } }}
      />
    )
    await user.click(screen.getByRole('button', { name: 'primary' }))
    const el = screen.getByTestId('passage-audio') as HTMLAudioElement
    Object.defineProperty(el, 'duration', { configurable: true, value: 10 })
    Object.defineProperty(el, 'currentTime', { configurable: true, value: 9.5, writable: true })
    Object.defineProperty(el, 'paused', { configurable: true, get: () => false })

    await act(async () => {
      el.dispatchEvent(new Event('play'))
      flushRaf()
    })
    expect(scrollContainer.scrollTop).toBe(600)
  })

  it('keeps scrolling on successive rAF frames while audio plays', async () => {
    document.body.innerHTML = '<div id="scope">For God so loved the world</div>'
    const scope = document.getElementById('scope') as HTMLElement
    const scrollContainer = document.createElement('div')
    document.body.appendChild(scrollContainer)
    Object.defineProperty(scrollContainer, 'scrollTop', { configurable: true, writable: true, value: 0 })
    Object.defineProperty(scrollContainer, 'scrollHeight', { configurable: true, value: 1000 })
    Object.defineProperty(scrollContainer, 'clientHeight', { configurable: true, value: 400 })

    let now = 0
    jest.spyOn(performance, 'now').mockImplementation(() => now)

    const user = userEvent.setup()
    render(
      <Harness
        audioUrls={[audioUrl]}
        enabled
        autoScroll={{ scopeRef: { current: scope }, scrollContainerRef: { current: scrollContainer } }}
      />
    )
    await user.click(screen.getByRole('button', { name: 'primary' }))
    const el = screen.getByTestId('passage-audio') as HTMLAudioElement
    Object.defineProperty(el, 'duration', { configurable: true, value: 10 })
    Object.defineProperty(el, 'currentTime', { configurable: true, value: 0, writable: true })
    Object.defineProperty(el, 'paused', { configurable: true, get: () => false })

    await act(async () => {
      el.dispatchEvent(new Event('play'))
      flushRaf()
    })
    const afterFirst = scrollContainer.scrollTop

    now += 100
    await act(async () => {
      flushRaf()
    })

    expect(afterFirst).toBe(0)
    expect(scrollContainer.scrollTop).toBeGreaterThan(0)
  })
})
