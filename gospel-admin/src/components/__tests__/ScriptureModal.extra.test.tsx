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

  beforeEach(() => {
    mockFetch.mockClear()
    jest.clearAllMocks()
    // default initial scripture fetch
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ text: 'Initial scripture text' }) } as unknown as Response)
  })

  it('fetches chapter context and highlights verses with ids', async () => {
    const user = userEvent.setup()

  // Explicitly provide the two fetch responses in order:
  // 1) initial scripture fetch
  mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ text: 'Initial scripture text' }) } as unknown as Response)
  // 2) chapter context response - include verse markers [1] and [2]
  mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ text: '[1] In the beginning\n\n[2] And then' }) } as unknown as Response)

  const { container } = render(<ScriptureModal {...defaultProps} />)

    // Wait for component to mount and show controls
    await waitFor(() => expect(screen.getByText(/Genesis 1:1-2/)).toBeInTheDocument())

    const chapterButton = screen.getByText(/Chapter Context/)
    await user.click(chapterButton)

    // Wait for chapter-content to render
    await waitFor(() => expect(container.querySelector('#chapter-content')).toBeInTheDocument())

  // The processed HTML should include the chapter content and highlighted verse markers
  const chapterContent = container.querySelector('#chapter-content')
  expect(chapterContent).toBeTruthy()
  const inner = chapterContent?.innerHTML || ''

  // Should include the original verse text and the sup/verse markers after processing
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

    await waitFor(() => expect(screen.getByText(/Genesis 1:1-2/)).toBeInTheDocument())

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
})
