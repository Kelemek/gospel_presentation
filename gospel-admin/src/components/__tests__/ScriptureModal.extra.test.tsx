import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ScriptureModal from '../ScriptureModal'

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

describe('ScriptureModal additional behaviors', () => {
  const defaultProps = {
    reference: 'Genesis 1:1-2',
    isOpen: true,
    onClose: jest.fn(),
  }

  const defaultFetchSuccess = {
    ok: true,
    json: () => Promise.resolve({ text: 'Initial scripture text' }),
  } as unknown as Response

  beforeEach(() => {
    mockFetch.mockReset()
    jest.clearAllMocks()
    mockFetch.mockResolvedValue(defaultFetchSuccess)
  })

  it('fetches chapter context and highlights verses with ids', async () => {
    const user = userEvent.setup()

    /** Verse fetch uses reference like Genesis%201%3A1-2; chapter context uses Genesis 1 only (no %3A). Strict Mode runs effects twice, so queue-based mocks are wrong. */
    mockFetch.mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (url.includes('Genesis%201%3A')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ text: 'Initial scripture text' }),
        } as unknown as Response)
      }
      if (url.includes('reference=Genesis%201&')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ text: '[1] In the beginning\n\n[2] And then' }),
        } as unknown as Response)
      }
      return Promise.resolve(defaultFetchSuccess)
    })

    const { container } = render(<ScriptureModal {...defaultProps} />)

    // Wait for component to mount and show controls
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /Genesis 1:1-2/ })).toBeInTheDocument()
    )

    const chapterButton = screen.getByText(/Chapter Context/)
    await user.click(chapterButton)

    // Wait for chapter-content to render
    await waitFor(() => expect(container.querySelector('#chapter-content')).toBeInTheDocument())

    const chapterContent = container.querySelector('#chapter-content')
    expect(chapterContent).toBeTruthy()
    const inner = chapterContent?.innerHTML || ''

    expect(inner).toMatch(/In the beginning/)
    expect(inner).toMatch(/And then/)
  })

  it('calls onScriptureViewed after successful scripture fetch', async () => {
    const onViewed = jest.fn()
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ text: 'Scripture body' }) } as unknown as Response)

    render(<ScriptureModal {...defaultProps} onScriptureViewed={onViewed} />)

    await waitFor(() => expect(onViewed).toHaveBeenCalledWith('Genesis 1:1-2'))
  })

  it('handles left and right swipe to trigger navigation', async () => {
    const onNext = jest.fn()
    const onPrevious = jest.fn()

    const { container } = render(
      <ScriptureModal
        {...defaultProps}
        hasNext={true}
        hasPrevious={true}
        onNext={onNext}
        onPrevious={onPrevious}
      />
    )

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /Genesis 1:1-2/ })).toBeInTheDocument()
    )

  // the scrollable content area uses the class 'overflow-y-auto'
  const scrollArea = container.querySelector('.overflow-y-auto') as HTMLElement
    expect(scrollArea).toBeTruthy()

    // Simulate left swipe (start 200 -> end 100) to trigger onNext
    fireEvent.touchStart(scrollArea, { targetTouches: [{ clientX: 200 }] })
    fireEvent.touchMove(scrollArea, { targetTouches: [{ clientX: 100 }] })
    fireEvent.touchEnd(scrollArea, { changedTouches: [{ clientX: 100 }] })

    expect(onNext).toHaveBeenCalled()

    // Simulate right swipe (start 100 -> end 200) to trigger onPrevious
    fireEvent.touchStart(scrollArea, { targetTouches: [{ clientX: 100 }] })
    fireEvent.touchMove(scrollArea, { targetTouches: [{ clientX: 200 }] })
    fireEvent.touchEnd(scrollArea, { changedTouches: [{ clientX: 200 }] })

    expect(onPrevious).toHaveBeenCalled()
  })

  it('chapter context highlight includes verse after publisher footnote markers like [1] (NLT)', async () => {
    const user = userEvent.setup()

    mockFetch.mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (url.includes('Psalm%2023%3A')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              text: '[4] Even when I walk [1] through the darkest valley, I will not be afraid. Your rod and your staff protect and comfort me.',
            }),
        } as unknown as Response)
      }
      if (url.includes('reference=Psalm%2023&')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              text:
                '[4] Even when I walk [1] through the darkest valley, I will not be afraid. Your rod and your staff protect and comfort me.\n\n[5] You prepare a table before me in the presence of my enemies.',
            }),
        } as unknown as Response)
      }
      return Promise.resolve(defaultFetchSuccess)
    })

    const { container } = render(
      <ScriptureModal reference="Psalm 23:4" isOpen={true} onClose={jest.fn()} />
    )

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /Psalm 23:4/ })).toBeInTheDocument()
    )

    await user.click(screen.getByText(/Chapter Context/))

    await waitFor(() => expect(container.querySelector('#chapter-content')).toBeInTheDocument())

    const chapterContent = container.querySelector('#chapter-content')
    const inner = chapterContent?.innerHTML ?? ''
    expect(inner).toMatch(/through the darkest valley/)
    expect(inner).toMatch(/Your rod and your staff/)
    const verseBlock = container.querySelector('#verse-4')
    expect(verseBlock?.textContent).toMatch(/through the darkest valley/)
  })
})
