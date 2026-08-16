import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Capacitor } from '@capacitor/core'
import ProfileResourceReadAloud from '@/components/ProfileResourceReadAloud'
import { cancelProfileReadAloudSpeech } from '@/lib/profileReadAloudSpeechEngine'
import type { GospelSection } from '@/lib/types'

jest.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: jest.fn(() => false),
    getPlatform: jest.fn(() => 'web'),
    isPluginAvailable: jest.fn(() => false),
  },
}))

function getAlertModalMocks() {
  return (globalThis as unknown as { __alertModalMocks: { showConfirm: jest.Mock; showAlert: jest.Mock } })
    .__alertModalMocks
}

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
    ;(Capacitor.isNativePlatform as jest.Mock).mockReturnValue(false)
    ;(Capacitor.getPlatform as jest.Mock).mockReturnValue('web')
    ;(Capacitor.isPluginAvailable as jest.Mock).mockReturnValue(false)
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
    // jsdom: `scrollIntoView` is missing or incomplete; read-aloud “Start from beginning” uses it.
    Element.prototype.scrollIntoView = jest.fn() as unknown as typeof Element.prototype.scrollIntoView

    const alertMocks = getAlertModalMocks()
    alertMocks.showConfirm.mockReset()
    alertMocks.showConfirm.mockResolvedValue(false)
    alertMocks.showAlert.mockReset()
  })

  afterEach(() => {
    delete (window as unknown as { speechSynthesis?: unknown }).speechSynthesis
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value: originalUserAgent,
    })
  })

  it('renders Listen on Android Chrome when speechSynthesis exists', () => {
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36',
    })
    render(<ProfileResourceReadAloud sections={sections} profileSlug="p1" />)
    expect(screen.getByRole('button', { name: /listen/i })).toBeInTheDocument()
  })

  it('renders nothing on native Android when the speech plugin is unavailable', () => {
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36',
    })
    ;(Capacitor.isNativePlatform as jest.Mock).mockReturnValue(true)
    ;(Capacitor.getPlatform as jest.Mock).mockReturnValue('android')
    ;(Capacitor.isPluginAvailable as jest.Mock).mockReturnValue(false)
    delete (window as unknown as { speechSynthesis?: unknown }).speechSynthesis
    render(<ProfileResourceReadAloud sections={sections} profileSlug="p1" />)
    expect(screen.queryByRole('button', { name: /listen/i })).not.toBeInTheDocument()
  })

  it('renders Listen on native Android when the speech plugin is available', () => {
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36',
    })
    ;(Capacitor.isNativePlatform as jest.Mock).mockReturnValue(true)
    ;(Capacitor.getPlatform as jest.Mock).mockReturnValue('android')
    ;(Capacitor.isPluginAvailable as jest.Mock).mockReturnValue(true)
    render(<ProfileResourceReadAloud sections={sections} profileSlug="p1" />)
    expect(screen.getByRole('button', { name: /listen/i })).toBeInTheDocument()
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

  it('allows Play again after an external cancel while a session was active', async () => {
    document.body.innerHTML += `
      <section id="section-1" class="scroll-mt-20">
        <div id="section-1-0" class="scroll-mt-20"><p>Paragraph for TTS.</p></div>
      </section>
    `
    const speak = window.speechSynthesis.speak as jest.Mock
    render(<ProfileResourceReadAloud sections={sections} profileSlug="p1" />)

    fireEvent.click(screen.getByRole('button', { name: /listen/i }))
    fireEvent.click(screen.getByTestId('memorize-listen-passage'))
    expect(speak).toHaveBeenCalledTimes(1)

    await act(async () => {
      cancelProfileReadAloudSpeech()
    })
    fireEvent.click(screen.getByRole('button', { name: /listen/i }))
    await act(async () => {
      fireEvent.click(screen.getByTestId('memorize-listen-passage'))
    })

    await waitFor(() => {
      expect(speak).toHaveBeenCalledTimes(2)
    })
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

    fireEvent.click(screen.getByTestId('memorize-listen-speed'))
    fireEvent.click(screen.getByTestId('memorize-listen-speed-option-2'))

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

  it('asks for confirmation on Start from beginning and does not restart when cancelled', async () => {
    const confirmMock = getAlertModalMocks().showConfirm
    confirmMock.mockReset()
    confirmMock.mockResolvedValue(false)

    document.body.innerHTML += `
      <section id="section-1" class="scroll-mt-20">
        <div id="section-1-0" class="scroll-mt-20"><p>Alpha.</p></div>
      </section>
    `
    const speak = window.speechSynthesis.speak as jest.Mock
    const user = userEvent.setup({ delay: null })
    render(<ProfileResourceReadAloud sections={sections} profileSlug="p1" />)
    await user.click(screen.getByRole('button', { name: /listen/i }))
    await user.click(screen.getByTestId('memorize-listen-start-from-beginning'))

    await waitFor(() => expect(confirmMock).toHaveBeenCalledTimes(1))
    expect(String(confirmMock.mock.calls[0][0])).toContain('Clear all saved listen progress')
    expect(speak).not.toHaveBeenCalled()
  })

  it('restarts from the first section after Start from beginning is confirmed', async () => {
    const confirmMock = getAlertModalMocks().showConfirm
    /** Isolate from beforeEach’s `mockResolvedValue(false)` so the first call is definitely `true`. */
    confirmMock.mockReset()
    confirmMock.mockResolvedValueOnce(true).mockResolvedValue(false)

    document.body.innerHTML += `
      <section id="section-1" class="scroll-mt-20">
        <div id="section-1-0" class="scroll-mt-20"><p>First section text.</p></div>
      </section>
    `
    const speak = window.speechSynthesis.speak as jest.Mock
    const user = userEvent.setup({ delay: null })
    render(<ProfileResourceReadAloud sections={sections} profileSlug="p1" />)
    await user.click(screen.getByRole('button', { name: /listen/i }))
    await user.click(screen.getByTestId('memorize-listen-start-from-beginning'))

    await waitFor(() => expect(confirmMock).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(speak).toHaveBeenCalled())
    const utt = speak.mock.calls[0][0] as SpeechSynthesisUtterance
    expect(utt.text).toContain('First section text')
  })

  it('starts from the viewport sentence on Start from Here without confirmation', async () => {
    const confirmMock = getAlertModalMocks().showConfirm
    confirmMock.mockReset()
    confirmMock.mockResolvedValue(false)

    document.body.innerHTML += `
      <section id="section-1" class="scroll-mt-20">
        <div id="section-1-0" class="scroll-mt-20"><p>First sentence. Second sentence.</p></div>
      </section>
    `

    const p = document.querySelector('#section-1-0 p')!
    const textNode = p.firstChild as Text
    const secIdx = (textNode.textContent ?? '').indexOf('Second')
    document.caretRangeFromPoint = jest.fn(() => {
      const range = document.createRange()
      range.setStart(textNode, secIdx + 2)
      range.collapse(true)
      return range
    }) as typeof document.caretRangeFromPoint

    const speak = window.speechSynthesis.speak as jest.Mock
    const user = userEvent.setup({ delay: null })
    render(<ProfileResourceReadAloud sections={sections} profileSlug="p1" />)
    await user.click(screen.getByRole('button', { name: /listen/i }))
    await user.click(screen.getByTestId('memorize-listen-start-from-here'))

    await waitFor(() => expect(speak).toHaveBeenCalled())
    expect(confirmMock).not.toHaveBeenCalled()
    const utt = speak.mock.calls[0][0] as SpeechSynthesisUtterance
    expect(utt.text).toBe('Second sentence.')

    delete (document as { caretRangeFromPoint?: unknown }).caretRangeFromPoint
  })
})
