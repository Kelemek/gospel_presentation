/**
 * @jest-environment jsdom
 */

import { act, render, screen } from '@testing-library/react'
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

const mockApplyRate = applyMemorizeListenPlaybackRateToMediaElement as jest.MockedFunction<
  typeof applyMemorizeListenPlaybackRateToMediaElement
>

function Harness({
  audioUrls,
  enabled,
  onEnded,
  onTrackIndexChange,
  playlistStartIndex,
}: {
  audioUrls: string[]
  enabled: boolean
  onEnded?: () => void
  onTrackIndexChange?: (index: number) => void
  playlistStartIndex?: number
}) {
  const api = useChapterStreamingAudioListen({
    audioUrls,
    enabled,
    onTrackIndexChange,
    playlistStartIndex,
  })
  return (
    <>
      <audio
        ref={api.passageAudioRef}
        data-testid="passage-audio"
        onEnded={onEnded ?? api.handlePassageAudioEnded}
        onError={api.handlePassageAudioError}
      />
      <button type="button" onClick={api.handlePrimaryClick}>
        primary
      </button>
      <span data-testid="primary-label">{api.readAloudDialogPrimaryLabel}</span>
    </>
  )
}

describe('useChapterStreamingAudioListen', () => {
  const audioUrl = '/api/scripture/audio?reference=John%203&translation=esv'

  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
    HTMLMediaElement.prototype.play = jest.fn().mockResolvedValue(undefined)
    HTMLMediaElement.prototype.pause = jest.fn()
    HTMLMediaElement.prototype.load = jest.fn()
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
})
