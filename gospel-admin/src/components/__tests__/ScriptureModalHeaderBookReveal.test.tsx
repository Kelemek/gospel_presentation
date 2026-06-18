import { render, screen } from '@testing-library/react'
import ScriptureModalHeaderBookReveal from '@/components/ScriptureModalHeaderBookReveal'
import { playOverflowTextReveal } from '@/lib/overflowTextRevealAnimation'

jest.mock('@/lib/overflowTextRevealAnimation', () => ({
  ...jest.requireActual('@/lib/overflowTextRevealAnimation'),
  playOverflowTextReveal: jest.fn(() => Promise.resolve()),
}))

async function flushRevealFrame() {
  await new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve())
  })
}

describe('ScriptureModalHeaderBookReveal', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(() => ({
        matches: false,
        media: '',
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      })),
    })
  })

  it('renders the book name', () => {
    render(<ScriptureModalHeaderBookReveal book="Song of Solomon" revealKey="Song of Solomon 1:1" />)
    expect(screen.getByText('Song of Solomon')).toBeInTheDocument()
  })

  it('reveals clipped book names on mount', async () => {
    const playMock = playOverflowTextReveal as jest.Mock
    render(<ScriptureModalHeaderBookReveal book="1 Thessalonians" revealKey="1 Thessalonians 1:1" />)

    await flushRevealFrame()

    expect(playMock).toHaveBeenCalledTimes(1)
  })

  it('replays reveal when reference changes but book stays the same', async () => {
    const playMock = playOverflowTextReveal as jest.Mock
    const { rerender } = render(
      <ScriptureModalHeaderBookReveal book="Exodus" revealKey="Exodus 31:13" />
    )

    await flushRevealFrame()
    expect(playMock).toHaveBeenCalledTimes(1)

    rerender(<ScriptureModalHeaderBookReveal book="Exodus" revealKey="Exodus 32:1" />)
    await flushRevealFrame()

    expect(playMock).toHaveBeenCalledTimes(2)
  })

  it('skips reveal when reduced motion is preferred', async () => {
    const playMock = playOverflowTextReveal as jest.Mock
    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }))

    render(<ScriptureModalHeaderBookReveal book="1 Thessalonians" revealKey="1 Thessalonians 1:1" />)

    await flushRevealFrame()

    expect(playMock).not.toHaveBeenCalled()
  })
})
