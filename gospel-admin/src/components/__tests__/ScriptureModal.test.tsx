import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ScriptureModal from '../ScriptureModal'

// Mock fetch for scripture API calls
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

function fetchUrl(input: RequestInfo | URL): string {
  return typeof input === 'string' ? input : (input as Request).url
}

describe('ScriptureModal Component', () => {
  const defaultProps = {
    reference: 'John 3:16',
    isOpen: true,
    onClose: jest.fn(),
  }

  beforeEach(() => {
    mockFetch.mockReset()
    jest.clearAllMocks()
    mockFetch.mockImplementation((input: RequestInfo | URL) => {
      const url = fetchUrl(input)
      if (url.includes('/api/scripture/spurgeon-links')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ items: [] }),
        } as Response)
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ text: 'Sample scripture text' }),
      } as Response)
    })
  })

  it('should render modal when open', () => {
    render(<ScriptureModal {...defaultProps} />)

    // Wait for async fetch effect to settle to avoid act() warnings
    return waitFor(() => {
      expect(screen.getByRole('heading', { name: 'John 3:16' })).toBeInTheDocument()
      expect(screen.getByLabelText('Close modal')).toBeInTheDocument()
    })
  })

  it('should not render modal when closed', () => {
    render(<ScriptureModal {...defaultProps} isOpen={false} />)
    
    expect(screen.queryByRole('heading', { name: 'John 3:16' })).not.toBeInTheDocument()
  })

  it('should call onClose when close button is clicked', async () => {
    const user = userEvent.setup()
    const mockOnClose = jest.fn()
    
    render(<ScriptureModal {...defaultProps} onClose={mockOnClose} />)

    // Wait for fetch to resolve and effects to settle
    await waitFor(() => expect(screen.getByLabelText('Close modal')).toBeInTheDocument())

    const closeButton = screen.getByLabelText('Close modal')
    await user.click(closeButton)

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('should show navigation buttons when provided', () => {
    const mockOnPrevious = jest.fn()
    const mockOnNext = jest.fn()
    
    render(
      <ScriptureModal 
        {...defaultProps} 
        onPrevious={mockOnPrevious}
        onNext={mockOnNext}
        hasPrevious={true}
        hasNext={true}
      />
    )
    
    // wait for controls to be available (effects may run async)
    return waitFor(() => {
      expect(screen.getByLabelText('Previous Scripture')).toBeInTheDocument()
      expect(screen.getByLabelText('Next Scripture')).toBeInTheDocument()
    })
  })

  it('should call navigation functions when buttons are clicked', async () => {
    const user = userEvent.setup()
    const mockOnPrevious = jest.fn()
    const mockOnNext = jest.fn()
    
    render(
      <ScriptureModal 
        {...defaultProps} 
        onPrevious={mockOnPrevious}
        onNext={mockOnNext}
        hasPrevious={true}
        hasNext={true}
      />
    )
    
    await waitFor(() => expect(screen.getByLabelText('Previous Scripture')).toBeInTheDocument())
    await user.click(screen.getByLabelText('Previous Scripture'))
    expect(mockOnPrevious).toHaveBeenCalled()

    await user.click(screen.getByLabelText('Next Scripture'))
    expect(mockOnNext).toHaveBeenCalled()
  })

  it('should disable navigation buttons appropriately', () => {
    render(
      <ScriptureModal 
        {...defaultProps} 
        onPrevious={jest.fn()}
        onNext={jest.fn()}
        hasPrevious={false}
        hasNext={true}
      />
    )

    // Wait for async effects if any
    return waitFor(() => {
      expect(screen.getByLabelText('Previous Scripture')).toBeDisabled()
      expect(screen.getByLabelText('Next Scripture')).not.toBeDisabled()
    })
  })

  it('should fetch scripture text when opened', async () => {
    mockFetch.mockImplementation((input: RequestInfo | URL) => {
      const url = fetchUrl(input)
      if (url.includes('/api/scripture?')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              passages: [
                'For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.',
              ],
            }),
        } as Response)
      }
      return Promise.reject(new Error(`Unexpected fetch: ${url}`))
    })

    render(<ScriptureModal {...defaultProps} />)

    await waitFor(() => {
      expect(
        mockFetch.mock.calls.some((c) =>
          String(c[0]).includes('/api/scripture?reference=John%203%3A16&translation=esv')
        )
      ).toBe(true)
    })
  })

  it('should handle scripture fetch errors', async () => {
    mockFetch.mockImplementation((input: RequestInfo | URL) => {
      const url = fetchUrl(input)
      if (url.includes('/api/scripture?')) {
        return Promise.reject(new Error('API Error'))
      }
      return Promise.reject(new Error(`Unexpected fetch: ${url}`))
    })

    render(<ScriptureModal {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText(/Failed to load scripture/)).toBeInTheDocument()
    })
  })

  it('should show loading state', () => {
    const pendingCtl: { resolve?: (r: Response) => void } = {}
    const pendingScripture = new Promise<Response>((resolve) => {
      pendingCtl.resolve = resolve
    })

    mockFetch.mockImplementation((input: RequestInfo | URL) => {
      const url = fetchUrl(input)
      if (url.includes('/api/scripture?')) {
        return pendingScripture
      }
      return Promise.reject(new Error(`Unexpected fetch: ${url}`))
    })

    render(<ScriptureModal {...defaultProps} />)

    expect(screen.getByText(/Loading scripture/)).toBeInTheDocument()
    pendingCtl.resolve?.({
      ok: true,
      json: () => Promise.resolve({ text: 'done' }),
    } as Response)
  })

  it('should show error when main fetch returns data.error', async () => {
    mockFetch.mockImplementation((input: RequestInfo | URL) => {
      const url = fetchUrl(input)
      if (url.includes('/api/scripture?')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ error: 'Verse not found' }),
        } as Response)
      }
      return Promise.reject(new Error(`Unexpected fetch: ${url}`))
    })
    render(<ScriptureModal {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByText(/Verse not found/)).toBeInTheDocument()
    })
  })

  it('should show error when chapter context fetch returns data.error', async () => {
    mockFetch.mockImplementation((input: RequestInfo | URL) => {
      const url = fetchUrl(input)
      if (url.includes('reference=Genesis%201&') && !url.includes('%3A')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ error: 'Chapter not found' }),
        } as Response)
      }
      if (url.includes('/api/scripture?')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ text: 'Main verse' }),
        } as Response)
      }
      return Promise.reject(new Error(`Unexpected fetch: ${url}`))
    })
    const user = userEvent.setup()
    render(<ScriptureModal {...defaultProps} reference="Genesis 1:1" />)
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /Genesis 1:1/ })).toBeInTheDocument()
    )
    await user.click(screen.getByText(/Chapter Context/))
    await waitFor(() => expect(screen.getByText(/Chapter not found/)).toBeInTheDocument())
  })

  it('should show error when chapter context fetch throws', async () => {
    mockFetch.mockImplementation((input: RequestInfo | URL) => {
      const url = fetchUrl(input)
      if (url.includes('reference=Genesis%201&') && !url.includes('%3A')) {
        return Promise.reject(new Error('Network error'))
      }
      if (url.includes('/api/scripture?')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ text: 'Main verse' }),
        } as Response)
      }
      return Promise.reject(new Error(`Unexpected fetch: ${url}`))
    })
    const user = userEvent.setup()
    render(<ScriptureModal {...defaultProps} reference="Genesis 1:2" />)
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /Genesis 1:2/ })).toBeInTheDocument()
    )
    await user.click(screen.getByText(/Chapter Context/))
    await waitFor(() => expect(screen.getByText(/Failed to load chapter context/)).toBeInTheDocument())
  })

  it('should fetch and show compare translation when Compare dropdown is selected', async () => {
    mockFetch.mockImplementation((input: RequestInfo | URL) => {
      const url = fetchUrl(input)
      if (url.includes('translation=kjv') && url.includes('John%203%3A16')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ text: 'Compare verse KJV' }),
        } as Response)
      }
      if (url.includes('/api/scripture?')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ text: 'Main verse ESV' }),
        } as Response)
      }
      return Promise.reject(new Error(`Unexpected fetch: ${url}`))
    })
    const user = userEvent.setup()
    render(<ScriptureModal {...defaultProps} />)
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /John 3:16/ })).toBeInTheDocument()
    )
    await user.click(screen.getByRole('button', { name: /Compare with another translation/i }))
    await user.click(await screen.findByRole('option', { name: /^KJV$/i }))
    await waitFor(() => expect(screen.getByText(/Compare verse KJV/)).toBeInTheDocument())
  })

  it('should show compare error when compare fetch returns data.error', async () => {
    mockFetch.mockImplementation((input: RequestInfo | URL) => {
      const url = fetchUrl(input)
      if (url.includes('translation=kjv') && url.includes('John%203%3A16')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ error: 'Compare translation unavailable' }),
        } as Response)
      }
      if (url.includes('/api/scripture?')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ text: 'Main' }),
        } as Response)
      }
      return Promise.reject(new Error(`Unexpected fetch: ${url}`))
    })
    const user = userEvent.setup()
    render(<ScriptureModal {...defaultProps} />)
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /John 3:16/ })).toBeInTheDocument()
    )
    await user.click(screen.getByRole('button', { name: /Compare with another translation/i }))
    await user.click(await screen.findByRole('option', { name: /^KJV$/i }))
    await waitFor(() => expect(screen.getByText(/Compare translation unavailable/)).toBeInTheDocument())
  })

  it('does not show Study without onOpenSpurgeonStudy', async () => {
    render(<ScriptureModal {...defaultProps} />)
    await waitFor(() => expect(screen.getByRole('heading', { name: 'John 3:16' })).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: /Study: Spurgeon sermons for this passage/i })).not.toBeInTheDocument()
  })

  it('does not show Study when onOpenSpurgeonStudy is set but spurgeon-links returns no sermons', async () => {
    const openStudy = jest.fn()
    render(<ScriptureModal {...defaultProps} onOpenSpurgeonStudy={openStudy} />)
    await waitFor(() => expect(screen.getByRole('heading', { name: 'John 3:16' })).toBeInTheDocument())
    await waitFor(() =>
      expect(mockFetch.mock.calls.some((c) => String(c[0]).includes('spurgeon-links'))).toBe(true)
    )
    expect(screen.queryByRole('button', { name: /Study: Spurgeon sermons for this passage/i })).not.toBeInTheDocument()
  })

  it('calls onOpenSpurgeonStudy when Study is shown and clicked', async () => {
    const user = userEvent.setup()
    const openStudy = jest.fn()
    mockFetch.mockImplementation((input: RequestInfo | URL) => {
      const url = fetchUrl(input)
      if (url.includes('/api/scripture/spurgeon-links')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              items: [{ slug: 'sg00001', title: 'A Sermon' }],
            }),
        } as Response)
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ text: 'Sample scripture text' }),
      } as Response)
    })
    render(<ScriptureModal {...defaultProps} onOpenSpurgeonStudy={openStudy} />)
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Study: Spurgeon sermons for this passage/i })).toBeInTheDocument()
    )
    await user.click(screen.getByRole('button', { name: /Study: Spurgeon sermons for this passage/i }))
    expect(openStudy).toHaveBeenCalledWith('John 3:16')
  })
})