import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ProfileResourceReadAloud from '@/components/ProfileResourceReadAloud'
import type { GospelSection } from '@/lib/types'

describe('ProfileResourceReadAloud', () => {
  const originalUserAgent = typeof navigator !== 'undefined' ? navigator.userAgent : ''

  const sections: GospelSection[] = [
    {
      section: '1',
      title: 'Intro',
      subsections: [{ title: 'Part A', content: 'Body text.' }],
    },
  ]

  beforeEach(() => {
    document.body.innerHTML = ''
    localStorage.clear()
    const synthState = { speaking: false, paused: false }
    const speak = jest.fn(() => {
      synthState.speaking = true
    })
    const cancel = jest.fn(() => {
      synthState.speaking = false
      synthState.paused = false
    })
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      writable: true,
      value: {
        get speaking() {
          return synthState.speaking
        },
        get paused() {
          return synthState.paused
        },
        speak,
        cancel,
        pause: jest.fn(() => {
          synthState.paused = true
        }),
        resume: jest.fn(() => {
          synthState.paused = false
        }),
      },
    })
  })

  afterEach(() => {
    delete (window as unknown as { speechSynthesis?: unknown }).speechSynthesis
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value: originalUserAgent,
    })
  })

  it('renders nothing on Android user agents', () => {
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36',
    })
    render(<ProfileResourceReadAloud sections={sections} profileSlug="p1" />)
    expect(screen.queryByRole('button', { name: /listen/i })).not.toBeInTheDocument()
  })

  it('opens Listen dialog when trigger is clicked', async () => {
    render(<ProfileResourceReadAloud sections={sections} profileSlug="p1" />)

    fireEvent.click(screen.getByRole('button', { name: /listen/i }))
    expect(screen.getByRole('dialog', { name: /listen/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /listen/i })).toBeInTheDocument()
    expect(screen.getByTestId('memorize-listen-passage')).toBeInTheDocument()
  })

  it('calls speechSynthesis.speak when Play is used with a matching anchor', () => {
    document.body.innerHTML += `
      <section id="section-1" class="scroll-mt-20">
        <h3>Intro heading</h3>
        <div id="section-1-0" class="scroll-mt-20">
          <p>Paragraph for TTS.</p>
        </div>
      </section>
    `
    const speak = window.speechSynthesis.speak as jest.Mock
    render(<ProfileResourceReadAloud sections={sections} profileSlug="p1" />)

    fireEvent.click(screen.getByRole('button', { name: /listen/i }))
    fireEvent.click(screen.getByTestId('memorize-listen-passage'))

    expect(speak).toHaveBeenCalled()
    const utterance = speak.mock.calls[0][0] as SpeechSynthesisUtterance
    expect(utterance.text).toContain('Paragraph for TTS.')
  })

  it('replays the active chunk at a new rate when speed changes mid-chunk', async () => {
    document.body.innerHTML += `
      <section id="section-1" class="scroll-mt-20">
        <div id="section-1-0" class="scroll-mt-20"><p>Paragraph for TTS.</p></div>
      </section>
    `
    const speak = window.speechSynthesis.speak as jest.Mock
    const cancel = window.speechSynthesis.cancel as jest.Mock

    render(<ProfileResourceReadAloud sections={sections} profileSlug="p1" />)
    fireEvent.click(screen.getByRole('button', { name: /listen/i }))
    fireEvent.click(screen.getByTestId('memorize-listen-passage'))
    expect(speak).toHaveBeenCalledTimes(1)
    const firstRate = (speak.mock.calls[0][0] as SpeechSynthesisUtterance).rate

    fireEvent.change(screen.getByTestId('memorize-listen-speed'), { target: { value: '2' } })

    await waitFor(() => {
      expect(cancel).toHaveBeenCalled()
      expect(speak).toHaveBeenCalledTimes(2)
    })
    const secondRate = (speak.mock.calls[1][0] as SpeechSynthesisUtterance).rate
    expect(secondRate).toBeGreaterThan(firstRate)
  })

  it('queues multiple utterances for multi-sentence content without cancel', async () => {
    document.body.innerHTML += `
      <section id="section-1">
        <div id="section-1-0"><p>First sentence. Second sentence.</p></div>
      </section>
    `
    const synthState = { speaking: false, paused: false }
    const speak = jest.fn((u: SpeechSynthesisUtterance) => {
      synthState.speaking = true
      queueMicrotask(() => {
        synthState.speaking = false
        const h = u.onend
        if (h) {
          h.call(u, {} as SpeechSynthesisEvent)
        }
      })
    })
    const cancel = jest.fn(() => {
      synthState.speaking = false
      synthState.paused = false
    })
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      writable: true,
      value: {
        get speaking() {
          return synthState.speaking
        },
        get paused() {
          return synthState.paused
        },
        speak,
        cancel,
        pause: jest.fn(() => {
          synthState.paused = true
        }),
        resume: jest.fn(() => {
          synthState.paused = false
        }),
      },
    })

    render(<ProfileResourceReadAloud sections={sections} profileSlug="p1" />)
    fireEvent.click(screen.getByRole('button', { name: /listen/i }))
    fireEvent.click(screen.getByTestId('memorize-listen-passage'))

    await waitFor(() => expect(speak).toHaveBeenCalledTimes(2))
    expect(cancel).toHaveBeenCalledTimes(1)
    expect((speak.mock.calls[0][0] as SpeechSynthesisUtterance).text).toBe('First sentence.')
    expect((speak.mock.calls[1][0] as SpeechSynthesisUtterance).text).toBe('Second sentence.')
  })
})
