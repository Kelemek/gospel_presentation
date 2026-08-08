import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ScriptureWordStudyModal from '@/components/ScriptureWordStudyModal'

function renderInScrollPane(ui: React.ReactElement) {
  return render(
    <div className="relative h-96 overflow-hidden" data-testid="scroll-pane">
      {ui}
    </div>
  )
}

describe('ScriptureWordStudyModal', () => {
  beforeEach(() => {
    global.fetch = jest.fn(async (url: string | URL) => {
      const u = String(url)
      if (u.includes('/api/scripture/word-study')) {
        return {
          ok: true,
          json: async () => ({
            reference: 'Romans 12:2',
            passageKey: 'ROM.12.2',
            stepRef: 'Rom.12.2',
            language: 'grc',
            words: [
              {
                position: 8,
                text: 'μεταμορφοῦσθε',
                transliteration: 'metamorphousthe',
                strongs: 'G3339',
                gloss: 'to transform',
              },
            ],
            verses: [
              {
                verse: 2,
                passageKey: 'ROM.12.2',
                stepRef: 'Rom.12.2',
                words: [
                  {
                    position: 8,
                    text: 'μεταμορφοῦσθε',
                    strongs: 'G3339',
                    gloss: 'to transform',
                  },
                ],
              },
            ],
          }),
        } as Response
      }
      return { ok: false, json: async () => ({}) } as Response
    }) as typeof fetch
  })

  it('renders nothing when closed', () => {
    const { container } = renderInScrollPane(
      <ScriptureWordStudyModal reference="Romans 12:2" isOpen={false} onClose={jest.fn()} />
    )
    expect(container.querySelector('[role="dialog"]')).toBeNull()
  })

  it('shows dialog with reference and word chips when open', async () => {
    renderInScrollPane(
      <ScriptureWordStudyModal reference="Romans 12:2" isOpen onClose={jest.fn()} />
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/Word study — Romans 12:2/)).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText('μεταμορφοῦσθε')).toBeInTheDocument()
    })
  })

  it('does not re-register Escape listener when onClose identity changes', async () => {
    const addSpy = jest.spyOn(window, 'addEventListener')
    const onCloseA = jest.fn()
    const onCloseB = jest.fn()

    const { rerender } = renderInScrollPane(
      <ScriptureWordStudyModal reference="Romans 12:2" isOpen onClose={onCloseA} />
    )
    await waitFor(() => {
      expect(screen.getByText('μεταμορφοῦσθε')).toBeInTheDocument()
    })

    const keydownAdds = () =>
      addSpy.mock.calls.filter(([type]) => type === 'keydown').length
    expect(keydownAdds()).toBe(1)

    rerender(
      <div className="relative h-96 overflow-hidden" data-testid="scroll-pane">
        <ScriptureWordStudyModal reference="Romans 12:2" isOpen onClose={onCloseB} />
      </div>
    )
    expect(keydownAdds()).toBe(1)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(onCloseB).toHaveBeenCalledTimes(1)
    expect(onCloseA).not.toHaveBeenCalled()

    addSpy.mockRestore()
  })

  it('calls onClose when close button is clicked', async () => {
    const onClose = jest.fn()
    const user = userEvent.setup()
    renderInScrollPane(
      <ScriptureWordStudyModal reference="Romans 12:2" isOpen onClose={onClose} />
    )
    await user.click(screen.getByRole('button', { name: 'Close word study' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('opens lexicon when a word chip is clicked without closing the overlay', async () => {
    const onClose = jest.fn()
    const user = userEvent.setup()
    global.fetch = jest.fn(async (url: string | URL) => {
      const u = String(url)
      if (u.includes('/api/scripture/word-study')) {
        return {
          ok: true,
          json: async () => ({
            reference: 'Romans 12:2',
            language: 'grc',
            verses: [
              {
                verse: 2,
                words: [
                  {
                    position: 8,
                    text: 'μεταμορφοῦσθε',
                    strongs: 'G3339',
                    gloss: 'to transform',
                  },
                ],
              },
            ],
          }),
        } as Response
      }
      if (u.includes('/api/scripture/lexicon')) {
        return {
          ok: true,
          json: async () => ({
            strongs: 'G3339',
            gloss: 'to transform',
            source: 'TBESG',
            detail: 'brief',
          }),
        } as Response
      }
      return { ok: false, json: async () => ({}) } as Response
    }) as typeof fetch

    renderInScrollPane(
      <ScriptureWordStudyModal reference="Romans 12:2" isOpen onClose={onClose} />
    )
    await waitFor(() => {
      expect(screen.getByText('μεταμορφοῦσθε')).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /G3339/i }))
    await waitFor(() => {
      expect(screen.getByRole('region', { name: 'Lexicon definition' })).toBeInTheDocument()
    })
    expect(onClose).not.toHaveBeenCalled()
  })

  it('adds drop shadows at the scroll edges of the word list', async () => {
    renderInScrollPane(
      <ScriptureWordStudyModal reference="Romans 12:2" isOpen onClose={jest.fn()} />
    )
    await waitFor(() => {
      expect(screen.getByText('μεταμορφοῦσθε')).toBeInTheDocument()
    })

    const header = document.querySelector('[data-tour="scripture-modal-word-study-header"]')
    const panel = document.querySelector('[data-tour="scripture-modal-word-study-panel"]')
    const scroll = document.querySelector(
      '[data-tour="scripture-modal-word-study-scroll"]'
    ) as HTMLDivElement | null
    expect(header).toBeTruthy()
    expect(panel).toBeTruthy()
    expect(scroll).toBeTruthy()
    expect(header?.className).not.toMatch(/shadow-\[0_10px_28px/)
    expect(panel?.className).not.toMatch(/shadow-\[inset_0_-28px/)
    expect(document.querySelector('[data-tour="scripture-modal-word-study-footer"]')).toBeNull()
    expect(scroll?.className).toMatch(/overscroll-y-contain/)
    expect(scroll?.className).toMatch(/pb-\[max\(1\.5rem/)
    expect(scroll?.className).toMatch(/4\.5rem/)

    Object.defineProperty(scroll!, 'scrollTop', { configurable: true, writable: true, value: 24 })
    Object.defineProperty(scroll!, 'clientHeight', { configurable: true, value: 200 })
    Object.defineProperty(scroll!, 'scrollHeight', { configurable: true, value: 800 })
    scroll!.dispatchEvent(new Event('scroll', { bubbles: true }))

    await waitFor(() => {
      expect(header?.className).toMatch(/shadow-\[0_10px_28px/)
      expect(panel?.className).toMatch(/shadow-\[inset_0_-28px/)
    })

    Object.defineProperty(scroll!, 'scrollTop', { configurable: true, writable: true, value: 0 })
    scroll!.dispatchEvent(new Event('scroll', { bubbles: true }))

    await waitFor(() => {
      expect(header?.className).not.toMatch(/shadow-\[0_10px_28px/)
      expect(panel?.className).not.toMatch(/shadow-\[inset_0_-28px/)
    })
  })
})
