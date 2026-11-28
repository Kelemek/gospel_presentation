import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Capacitor } from '@capacitor/core'
import ProfileResourceReadAloud from '@/components/ProfileResourceReadAloud'
import { claimExclusiveListenOwner } from '@/lib/gospelExclusiveListen'
import { GROK_VOICE_TOKEN_STORAGE_KEY } from '@/lib/grokVoiceTokenStorage'
import { DEVICE_LISTEN_VOICE_ID, RESOURCE_LISTEN_VOICE_STORAGE_KEY, readResourceListenVoice } from '@/lib/resourceListenVoiceStorage'
import { resetGospelListenSpeechEngineForTests } from '@/lib/gospelListenSpeechEngine'
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
  const originalFetch = global.fetch
  const token = `gvt_${'c'.repeat(43)}`

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
    resetGospelListenSpeechEngineForTests()
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
    global.fetch = originalFetch
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
      claimExclusiveListenOwner('memorize-practice')
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

  it('lets someone enter a Grok voice code without signing in, then remove it', async () => {
    global.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.endsWith('/api/grok-voice/redeem')) {
        expect(JSON.parse(String(init?.body))).toEqual({ code: 'ABCD-EFGH-JKMN', deviceLabel: 'web' })
        return { ok: true, status: 200, json: async () => ({ token }) }
      }
      if (url.endsWith('/api/read-aloud/access')) {
        return { ok: true, status: 200, json: async () => ({ enabled: true }), clone() { return this } }
      }
      if (url.endsWith('/api/read-aloud/voices')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ voices: [{ voiceId: 'eve', name: 'Eve', gender: 'female' }] }),
        }
      }
      return { ok: false, status: 500, json: async () => ({}) }
    }) as typeof fetch

    render(<ProfileResourceReadAloud sections={sections} profileSlug="p1" />)
    fireEvent.click(screen.getByRole('button', { name: /^listen$/i }))
    expect(screen.queryByTestId('resource-listen-voice')).not.toBeInTheDocument()
    const enterCode = screen.getByRole('button', { name: /^enter code$/i })
    expect(enterCode).toHaveClass('text-sm', 'font-medium', 'hover:underline')
    expect(enterCode).not.toHaveClass('rounded-lg', 'w-full', 'bg-white', 'border')
    fireEvent.click(enterCode)
    fireEvent.change(screen.getByLabelText(/access code/i), { target: { value: 'ABCD-EFGH-JKMN' } })
    const useCode = screen.getByRole('button', { name: /^use code$/i })
    expect(useCode).toHaveClass('w-full', 'rounded-lg', 'bg-white', 'border-slate-300')
    expect(useCode.className.split(/\s+/)).not.toContain('bg-slate-800')
    expect(useCode.className.split(/\s+/)).not.toContain('underline')
    fireEvent.click(useCode)

    expect(await screen.findByTestId('resource-listen-voice')).toBeInTheDocument()
    expect(localStorage.getItem(GROK_VOICE_TOKEN_STORAGE_KEY)).toBe(token)

    localStorage.setItem(RESOURCE_LISTEN_VOICE_STORAGE_KEY, 'eve')
    const remove = screen.getByRole('button', { name: /remove grok voice from this device/i })
    expect(remove.className.split(/\s+/)).toContain('hover:underline')
    expect(remove).not.toHaveClass('bg-white')
    fireEvent.click(remove)
    await waitFor(() => expect(localStorage.getItem(GROK_VOICE_TOKEN_STORAGE_KEY)).toBeNull())
    expect(readResourceListenVoice()).toBe(DEVICE_LISTEN_VOICE_ID)
    expect(screen.getByRole('button', { name: /^enter code$/i })).toBeInTheDocument()
    expect(screen.queryByTestId('resource-listen-voice')).not.toBeInTheDocument()
  })

  it('clears a rejected Grok voice token and keeps the code entry', async () => {
    localStorage.setItem(GROK_VOICE_TOKEN_STORAGE_KEY, token)
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      clone() {
        return this
      },
      json: async () => ({ enabled: false, code: 'grok_token_invalid' }),
    }) as typeof fetch

    render(<ProfileResourceReadAloud sections={sections} profileSlug="p1" />)
    await waitFor(() => expect(localStorage.getItem(GROK_VOICE_TOKEN_STORAGE_KEY)).toBeNull())
    fireEvent.click(screen.getByRole('button', { name: /^listen$/i }))
    expect(screen.getByRole('button', { name: /^enter code$/i })).toBeInTheDocument()
    expect(screen.queryByTestId('resource-listen-voice')).not.toBeInTheDocument()
  })
})
