/**
 * @jest-environment jsdom
 */

import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import ScriptureModalChapterListen from '@/components/ScriptureModalChapterListen'

function defaultAutoScrollProps() {
  return {
    passageScopeRef: createRef<HTMLDivElement>(),
    scrollContainerRef: createRef<HTMLDivElement>(),
  }
}

describe('ScriptureModalChapterListen', () => {
  beforeEach(() => {
    HTMLMediaElement.prototype.play = jest.fn().mockResolvedValue(undefined)
    HTMLMediaElement.prototype.pause = jest.fn()
    HTMLMediaElement.prototype.load = jest.fn()
  })

  it('renders a disabled listen button when not enabled', () => {
    render(
      <ScriptureModalChapterListen
        passageReference="John 3"
        chapterReference="John 3"
        translation="esv"
        enabled={false}
        {...defaultAutoScrollProps()}
      />
    )
    expect(screen.getByRole('button', { name: /listen/i })).toBeDisabled()
    expect(document.querySelector('audio')).toBeNull()
  })

  it('opens listen dialog with Play and speed, without Repeat', async () => {
    const user = userEvent.setup()
    render(
      <ScriptureModalChapterListen
        passageReference="John 3:16"
        chapterReference="John 3"
        translation="esv"
        enabled
        {...defaultAutoScrollProps()}
      />
    )
    await user.click(screen.getByRole('button', { name: /listen/i }))
    expect(screen.getByRole('dialog', { name: 'Listen' })).toBeInTheDocument()
    expect(screen.getByTestId('memorize-listen-passage')).toBeInTheDocument()
    expect(screen.getByTestId('memorize-listen-speed')).toBeInTheDocument()
    expect(screen.queryByTestId('memorize-listen-repeat')).not.toBeInTheDocument()
  })

  it('uses floating listen controls without a dimmed backdrop', async () => {
    const user = userEvent.setup()
    render(
      <ScriptureModalChapterListen
        passageReference="John 3:16"
        chapterReference="John 3"
        translation="esv"
        enabled
        {...defaultAutoScrollProps()}
      />
    )
    await user.click(screen.getByRole('button', { name: /listen/i }))
    const dialog = screen.getByRole('dialog', { name: 'Listen' })
    expect(dialog).toHaveAttribute('aria-modal', 'false')
    expect(document.querySelector('.bg-black\\/50')).not.toBeInTheDocument()
    const slot = dialog.parentElement
    expect(slot).toHaveClass('pointer-events-auto')
    expect(slot?.parentElement).toHaveClass('pointer-events-none')
  })

  it('labels and queues all day chapters when dayChapterReferences is set', async () => {
    const user = userEvent.setup()
    render(
      <ScriptureModalChapterListen
        passageReference="Genesis 1"
        chapterReference="Genesis 1"
        translation="esv"
        enabled
        {...defaultAutoScrollProps()}
        dayChapterReferences={['Genesis 1', 'Matthew 1', 'Ezra 1', 'Acts 1']}
      />
    )
    expect(
      screen.getByRole('button', { name: /listen to today's readings/i })
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /listen to today's readings/i }))
    await user.click(screen.getByTestId('memorize-listen-passage'))
    const audio = document.querySelector('audio') as HTMLAudioElement
    expect(audio.src).toContain('reference=Genesis')
  })

  it('starts playback at the current chapter when not on the first reading', async () => {
    const user = userEvent.setup()
    render(
      <ScriptureModalChapterListen
        passageReference="Matthew 1"
        chapterReference="Matthew 1"
        translation="esv"
        enabled
        {...defaultAutoScrollProps()}
        dayChapterReferences={['Genesis 1', 'Matthew 1', 'Ezra 1', 'Acts 1']}
      />
    )
    await user.click(screen.getByRole('button', { name: /listen to today's readings/i }))
    await user.click(screen.getByTestId('memorize-listen-passage'))
    const audio = document.querySelector('audio') as HTMLAudioElement
    expect(audio.src).toContain('Matthew')
    expect(audio.src).not.toContain('Genesis')
  })

  it('keeps stable playlist URLs when chapterReference changes during playback', () => {
    const dayRefs = ['Genesis 1', 'Matthew 1', 'Ezra 1', 'Acts 1'] as const
    const { rerender } = render(
      <ScriptureModalChapterListen
        passageReference="Genesis 1"
        chapterReference="Genesis 1"
        translation="esv"
        enabled
        {...defaultAutoScrollProps()}
        dayChapterReferences={dayRefs}
      />
    )
    const firstAudio = document.querySelector('audio') as HTMLAudioElement
    rerender(
      <ScriptureModalChapterListen
        passageReference="Matthew 1"
        chapterReference="Matthew 1"
        translation="esv"
        enabled
        {...defaultAutoScrollProps()}
        dayChapterReferences={dayRefs}
      />
    )
    const secondAudio = document.querySelector('audio') as HTMLAudioElement
    expect(secondAudio).toBe(firstAudio)
  })

  it('notifies onPlaylistChapterChange when the playlist advances', async () => {
    const onPlaylistChapterChange = jest.fn()
    const user = userEvent.setup()
    render(
      <ScriptureModalChapterListen
        passageReference="Genesis 1"
        chapterReference="Genesis 1"
        translation="esv"
        enabled
        {...defaultAutoScrollProps()}
        dayChapterReferences={['Genesis 1', 'Matthew 1']}
        onPlaylistChapterChange={onPlaylistChapterChange}
      />
    )
    await user.click(screen.getByRole('button', { name: /listen to today's readings/i }))
    await user.click(screen.getByTestId('memorize-listen-passage'))
    expect(onPlaylistChapterChange).toHaveBeenCalledWith('Genesis 1')

    const audio = document.querySelector('audio') as HTMLAudioElement
    await act(async () => {
      audio.dispatchEvent(new Event('ended'))
    })
    expect(onPlaylistChapterChange).toHaveBeenCalledWith('Matthew 1')
  })

  it('uses verse reference in audio URL when not on a day playlist', async () => {
    const user = userEvent.setup()
    render(
      <ScriptureModalChapterListen
        passageReference="John 3:16"
        chapterReference="John 3"
        translation="esv"
        enabled
        {...defaultAutoScrollProps()}
      />
    )
    await user.click(screen.getByRole('button', { name: /listen/i }))
    await user.click(screen.getByTestId('memorize-listen-passage'))
    const audio = document.querySelector('audio') as HTMLAudioElement
    expect(audio.src).toContain('John')
    expect(audio.src).toContain('3%3A16')
  })

  it('calls onNext when a verse track ends and hasNext is true', async () => {
    const onNext = jest.fn()
    const user = userEvent.setup()
    render(
      <ScriptureModalChapterListen
        passageReference="John 3:16"
        chapterReference="John 3"
        translation="esv"
        enabled
        {...defaultAutoScrollProps()}
        hasNext
        onNext={onNext}
      />
    )
    await user.click(screen.getByRole('button', { name: /listen/i }))
    await user.click(screen.getByTestId('memorize-listen-passage'))
    const audio = document.querySelector('audio') as HTMLAudioElement
    await act(async () => {
      audio.dispatchEvent(new Event('ended'))
    })
    expect(onNext).toHaveBeenCalledTimes(1)
  })

  it('does not call onNext when M\'Cheyne day playlist finishes', async () => {
    const onNext = jest.fn()
    const user = userEvent.setup()
    render(
      <ScriptureModalChapterListen
        passageReference="Genesis 1"
        chapterReference="Genesis 1"
        translation="esv"
        enabled
        {...defaultAutoScrollProps()}
        hasNext
        onNext={onNext}
        dayChapterReferences={['Genesis 1', 'Matthew 1']}
      />
    )
    await user.click(screen.getByRole('button', { name: /listen to today's readings/i }))
    await user.click(screen.getByTestId('memorize-listen-passage'))
    const audio = document.querySelector('audio') as HTMLAudioElement
    await act(async () => {
      audio.dispatchEvent(new Event('ended'))
    })
    await act(async () => {
      audio.dispatchEvent(new Event('ended'))
    })
    expect(onNext).not.toHaveBeenCalled()
  })

  it('builds chapter-scoped audio URL from reference and translation', async () => {
    const user = userEvent.setup()
    render(
      <ScriptureModalChapterListen
        passageReference="Genesis 1"
        chapterReference="Genesis 1"
        translation="kjv"
        enabled
        {...defaultAutoScrollProps()}
      />
    )
    await user.click(screen.getByRole('button', { name: /listen/i }))
    await user.click(screen.getByTestId('memorize-listen-passage'))
    const audio = document.querySelector('audio') as HTMLAudioElement
    expect(audio.src).toContain('reference=Genesis')
    expect(audio.src).toContain('translation=kjv')
  })
})
