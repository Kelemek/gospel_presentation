import type { ReactElement } from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TextSizeProvider } from '@/contexts/TextSizeContext'
import ScriptureModal from '../ScriptureModal'
import { resetDocumentScrollLockForTests } from '@/lib/documentScrollLock'
import { DEFAULT_LONG_PRESS_MS } from '@/hooks/useLongPress'
import { SCRIPTURE_SHOW_VERSE_NUMBERS_STORAGE_KEY } from '@/lib/scriptureVerseNumbersPreference'

const mockShareScripturePassage = jest.fn((_options?: unknown) => Promise.resolve('shared' as const))

jest.mock('@/lib/shareScripturePassage', () => ({
  shareScripturePassage: (options: unknown) => mockShareScripturePassage(options),
}))

function renderWithTextSize(ui: ReactElement) {
  return render(<TextSizeProvider>{ui}</TextSizeProvider>)
}

function getAlertModalMocks() {
  return (
    globalThis as unknown as {
      __alertModalMocks: { showConfirm: jest.Mock; showAlert: jest.Mock }
    }
  ).__alertModalMocks
}

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
    profileSlug: 'default',
  }

  beforeEach(() => {
    mockFetch.mockReset()
    jest.clearAllMocks()
    resetDocumentScrollLockForTests()
    localStorage.removeItem(SCRIPTURE_SHOW_VERSE_NUMBERS_STORAGE_KEY)
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
    renderWithTextSize(<ScriptureModal {...defaultProps} />)

    // Wait for async fetch effect to settle to avoid act() warnings
    return waitFor(() => {
      expect(screen.getByRole('heading', { name: 'John 3:16' })).toBeInTheDocument()
      expect(screen.getByLabelText('Close modal')).toBeInTheDocument()
    })
  })

  it('extends to the bottom on mobile while keeping top and side safe-area inset', () => {
    renderWithTextSize(<ScriptureModal {...defaultProps} />)

    const overlay = document.querySelector('[data-scripture-modal-overlay]') as HTMLElement
    expect(overlay).toHaveStyle({ paddingTop: 'env(safe-area-inset-top)' })
    expect(overlay.style.paddingBottom).toBe('')

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveClass('h-full')
    expect(dialog).not.toHaveClass('h-dvh')
  })

  it('locks document scroll without jumping the page to the top', () => {
    Object.defineProperty(window, 'scrollY', { value: 180, configurable: true, writable: true })
    const scrollToSpy = jest.spyOn(window, 'scrollTo').mockImplementation(() => {})

    const { unmount } = renderWithTextSize(<ScriptureModal {...defaultProps} />)
    expect(document.body.style.position).toBe('fixed')
    expect(document.body.style.top).toBe('-180px')

    unmount()
    expect(scrollToSpy).toHaveBeenCalledWith(0, 180)

    scrollToSpy.mockRestore()
  })

  it('opens passage picker when header reference is clicked and onNavigateReference is set', async () => {
    const user = userEvent.setup()
    renderWithTextSize(
      <ScriptureModal {...defaultProps} onNavigateReference={jest.fn()} />
    )
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /John 3:16\. Choose another passage/i })
      ).toBeInTheDocument()
    )
    await user.click(
      screen.getByRole('button', { name: /John 3:16\. Choose another passage/i })
    )
    expect(screen.getByRole('heading', { name: 'Pick Chapter' })).toBeInTheDocument()
  })

  it('calls onPassagePickerOpen when header reference opens the picker', async () => {
    const user = userEvent.setup()
    const onPassagePickerOpen = jest.fn()
    renderWithTextSize(
      <ScriptureModal
        {...defaultProps}
        onNavigateReference={jest.fn()}
        onPassagePickerOpen={onPassagePickerOpen}
      />
    )
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /John 3:16\. Choose another passage/i })
      ).toBeInTheDocument()
    )
    await user.click(
      screen.getByRole('button', { name: /John 3:16\. Choose another passage/i })
    )
    expect(onPassagePickerOpen).toHaveBeenCalledTimes(1)
  })

  it('shows presentation location strip when presentationLocation is set', async () => {
    renderWithTextSize(
      <ScriptureModal
        {...defaultProps}
        presentationLocation={{
          sectionTitle: 'Fall',
          subsectionTitle: 'Sin entered',
        }}
      />
    )
    await waitFor(() =>
      expect(screen.getByTestId('scripture-modal-presentation-location')).toBeInTheDocument()
    )
    const region = screen.getByLabelText('Where you are in this presentation')
    expect(region).toHaveTextContent('Fall')
    expect(region).toHaveTextContent('Sin entered')
  })

  it('shows nested subsection on its own indented line when nestedSubsectionTitle is set', async () => {
    renderWithTextSize(
      <ScriptureModal
        {...defaultProps}
        presentationLocation={{
          sectionTitle: 'Sect',
          subsectionTitle: 'Sub',
          nestedSubsectionTitle: 'Deep',
        }}
      />
    )
    await waitFor(() =>
      expect(screen.getByTestId('scripture-modal-presentation-location')).toBeInTheDocument()
    )
    const region = screen.getByLabelText('Where you are in this presentation')
    expect(region).toHaveTextContent('Sub')
    expect(region).toHaveTextContent('Deep')
    const nestedLine = screen.getByText('Deep')
    expect(nestedLine).toHaveClass('pl-6')
  })

  it('should not render modal when closed', () => {
    renderWithTextSize(<ScriptureModal {...defaultProps} isOpen={false} />)
    
    expect(screen.queryByRole('heading', { name: 'John 3:16' })).not.toBeInTheDocument()
  })

  it('should call onClose when close button is clicked', async () => {
    const user = userEvent.setup()
    const mockOnClose = jest.fn()
    
    renderWithTextSize(<ScriptureModal {...defaultProps} onClose={mockOnClose} />)

    // Wait for fetch to resolve and effects to settle
    await waitFor(() => expect(screen.getByLabelText('Close modal')).toBeInTheDocument())

    const closeButton = screen.getByLabelText('Close modal')
    await user.click(closeButton)

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('should show navigation buttons when provided', () => {
    const mockOnPrevious = jest.fn()
    const mockOnNext = jest.fn()
    
    renderWithTextSize(
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
    
    renderWithTextSize(
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
    renderWithTextSize(
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

    renderWithTextSize(<ScriptureModal {...defaultProps} />)

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

    renderWithTextSize(<ScriptureModal {...defaultProps} />)
    
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

    renderWithTextSize(<ScriptureModal {...defaultProps} />)

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
    renderWithTextSize(<ScriptureModal {...defaultProps} />)
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
    renderWithTextSize(<ScriptureModal {...defaultProps} reference="Genesis 1:1" />)
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /Genesis 1:1/ })).toBeInTheDocument()
    )
    await user.click(screen.getByRole('button', { name: /chapter context/i }))
    await waitFor(() => expect(screen.getByText(/Chapter not found/)).toBeInTheDocument())
    expect(screen.getByText(/Main verse/)).toBeInTheDocument()
  })

  it('shows Listen control in verse view when verse text is loaded', async () => {
    renderWithTextSize(<ScriptureModal {...defaultProps} />)
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /John 3:16/ })).toBeInTheDocument()
    )
    await waitFor(() => expect(screen.getByLabelText(/^Listen$/i)).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: /chapter context/i })).toBeInTheDocument()
  })

  it('shows Search Bible control left of Listen when onNavigateReference is set', async () => {
    renderWithTextSize(
      <ScriptureModal {...defaultProps} onNavigateReference={jest.fn()} />
    )
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /John 3:16/i })).toBeInTheDocument()
    )
    await waitFor(() => expect(screen.getByLabelText(/^Listen$/i)).toBeInTheDocument())
    const search = screen.getByRole('button', { name: /^Search Bible$/i })
    const listen = screen.getByRole('button', { name: /^Listen$/i })
    const headerRow = listen.parentElement
    expect(headerRow).toContainElement(search)
    const buttons: HTMLElement[] = Array.from(headerRow?.querySelectorAll('button') ?? [])
    expect(buttons.indexOf(search)).toBeLessThan(buttons.indexOf(listen))
  })

  it('shows chapter Listen control left of Share when chapter context is loaded', async () => {
    mockFetch.mockImplementation((input: RequestInfo | URL) => {
      const url = fetchUrl(input)
      if (url.includes('reference=John%203&') && !url.includes('%3A')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ text: 'Full chapter text.' }),
        } as Response)
      }
      if (url.includes('/api/scripture/spurgeon-links')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ items: [] }),
        } as Response)
      }
      if (url.includes('/api/scripture?')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ text: 'Verse sixteen.' }),
        } as Response)
      }
      return Promise.reject(new Error(`Unexpected fetch: ${url}`))
    })
    const user = userEvent.setup()
    renderWithTextSize(<ScriptureModal {...defaultProps} />)
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /John 3:16/ })).toBeInTheDocument()
    )
    await waitFor(() => expect(screen.getByLabelText(/^Listen$/i)).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /chapter context/i }))
    await waitFor(() => expect(screen.getByText(/Full chapter text/)).toBeInTheDocument())
    const listen = screen.getByRole('button', { name: /^Listen$/i })
    const share = screen.getByRole('button', { name: /share passage/i })
    const headerRow = listen.parentElement
    expect(headerRow).toContainElement(share)
    const buttons: HTMLElement[] = Array.from(headerRow?.querySelectorAll('button') ?? [])
    expect(buttons.indexOf(listen)).toBeLessThan(buttons.indexOf(share))
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
    renderWithTextSize(<ScriptureModal {...defaultProps} reference="Genesis 1:2" />)
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /Genesis 1:2/ })).toBeInTheDocument()
    )
    await user.click(screen.getByRole('button', { name: /chapter context/i }))
    await waitFor(() => expect(screen.getByText(/Failed to load chapter context/)).toBeInTheDocument())
    expect(screen.getByText(/Main verse/)).toBeInTheDocument()
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
    renderWithTextSize(<ScriptureModal {...defaultProps} />)
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
    renderWithTextSize(<ScriptureModal {...defaultProps} />)
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /John 3:16/ })).toBeInTheDocument()
    )
    await user.click(screen.getByRole('button', { name: /Compare with another translation/i }))
    await user.click(await screen.findByRole('option', { name: /^KJV$/i }))
    await waitFor(() => expect(screen.getByText(/Compare translation unavailable/)).toBeInTheDocument())
  })

  it('does not show Study without onOpenSpurgeonStudy', async () => {
    renderWithTextSize(<ScriptureModal {...defaultProps} />)
    await waitFor(() => expect(screen.getByRole('heading', { name: 'John 3:16' })).toBeInTheDocument())
    expect(
      screen.queryByRole('button', { name: /Study: indexed resources for this passage/i })
    ).not.toBeInTheDocument()
  })

  it('disables Study when onOpenSpurgeonStudy is set but spurgeon-links returns no sermons', async () => {
    const openStudy = jest.fn()
    renderWithTextSize(<ScriptureModal {...defaultProps} onOpenSpurgeonStudy={openStudy} />)
    await waitFor(() => expect(screen.getByRole('heading', { name: 'John 3:16' })).toBeInTheDocument())
    await waitFor(() =>
      expect(mockFetch.mock.calls.some((c) => String(c[0]).includes('spurgeon-links'))).toBe(true)
    )
    const study = screen.getByRole('button', {
      name: /Study: no indexed resources or cross references for this passage/i,
    })
    expect(study).toBeDisabled()
    expect(study).toHaveTextContent('Study')
  })

  it.each(['larger', 'largest'] as const)(
    'on narrow viewports with text size %s, Compare and Translation use compact fixed widths',
    async (storedSize) => {
      const prevMm = window.matchMedia
      localStorage.setItem('gospel-profile-text-size', storedSize)
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        configurable: true,
        value: jest.fn().mockImplementation((query: string) => ({
          matches: query === '(max-width: 639px)',
          media: query,
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
        })),
      })

      renderWithTextSize(<ScriptureModal {...defaultProps} />)
      try {
        await waitFor(() =>
          expect(screen.getByRole('button', { name: /chapter context/i })).toHaveTextContent('Chapter')
        )
        const compareBtn = screen.getByRole('button', { name: /compare with another translation/i })
        const translationBtn = screen.getByRole('button', { name: /select bible translation/i })
        expect(compareBtn.className).toMatch(/w-\[128px\]/)
        expect(translationBtn.className).toMatch(/w-\[84px\]/)
        expect(compareBtn.querySelector('span')?.className).toMatch(/text-xs/)
        expect(compareBtn).toHaveTextContent('Compare')
      } finally {
        window.matchMedia = prevMm
        localStorage.removeItem('gospel-profile-text-size')
      }
    }
  )

  it('on narrow viewports shows Chapter on the verse/chapter toggle when text size is normal', async () => {
    const prevMm = window.matchMedia
    localStorage.removeItem('gospel-profile-text-size')
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: jest.fn().mockImplementation((query: string) => ({
        matches: query === '(max-width: 639px)',
        media: query,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      })),
    })

    renderWithTextSize(<ScriptureModal {...defaultProps} />)
    try {
      await waitFor(() =>
        expect(screen.getByRole('button', { name: /chapter context/i })).toHaveTextContent('Chapter')
      )
      const compareBtn = screen.getByRole('button', { name: /compare with another translation/i })
      expect(compareBtn.className).toMatch(/w-\[6\.5rem\]/)
    } finally {
      window.matchMedia = prevMm
    }
  })

  it('verse/chapter toggle shows Chapter on wide viewports with fixed width', async () => {
    const prevMm = window.matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: jest.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      })),
    })

    renderWithTextSize(<ScriptureModal {...defaultProps} />)
    try {
      await waitFor(() =>
        expect(screen.getByRole('button', { name: /chapter context/i })).toHaveTextContent('Chapter')
      )
      const toggle = screen.getByRole('button', { name: /chapter context/i })
      expect(toggle.className).toMatch(/w-\[88px\]/)
    } finally {
      window.matchMedia = prevMm
    }
  })

  it('enables Share after load and calls share helper with reference and translation', async () => {
    const user = userEvent.setup()
    mockFetch.mockImplementation((input: RequestInfo | URL) => {
      const url = fetchUrl(input)
      if (url.includes('/api/scripture?')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              text: 'For God so loved the world.',
            }),
        } as Response)
      }
      return Promise.reject(new Error(`Unexpected fetch: ${url}`))
    })

    renderWithTextSize(<ScriptureModal {...defaultProps} />)

    const shareButton = await screen.findByRole('button', { name: 'Share passage' })
    await waitFor(() => expect(shareButton).not.toBeDisabled())

    await user.click(shareButton)

    expect(mockShareScripturePassage).toHaveBeenCalledWith(
      expect.objectContaining({
        reference: 'John 3:16',
        translationLabel: 'ESV (English Standard Version)',
        passageText: 'For God so loved the world.',
        dialogTitle: 'Share passage',
        pageUrl: expect.stringContaining('/default?scriptureRef=John'),
      })
    )
  })

  it('disables Share while loading and when main column has an error', async () => {
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

    renderWithTextSize(<ScriptureModal {...defaultProps} />)

    expect(screen.getByRole('button', { name: 'Share passage' })).toBeDisabled()

    pendingCtl.resolve?.({
      ok: true,
      json: () => Promise.resolve({ error: 'Verse not found' }),
    } as Response)

    await waitFor(() => expect(screen.getByText(/Verse not found/)).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Share passage' })).toBeDisabled()
  })

  it('enables Study when spurgeon-links returns crossRefCount only', async () => {
    mockFetch.mockImplementation((input: RequestInfo | URL) => {
      const url = fetchUrl(input)
      if (url.includes('/api/scripture/spurgeon-links')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              items: [],
              sermonCount: 0,
              edwardsCount: 0,
              morneveCount: 0,
              calvinCount: 0,
              henryCount: 0,
              bookCount: 0,
              crossRefCount: 12,
            }),
        } as Response)
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ text: 'Sample scripture text' }),
      } as Response)
    })
    renderWithTextSize(<ScriptureModal {...defaultProps} onOpenSpurgeonStudy={jest.fn()} />)
    await waitFor(() =>
      expect(
        screen.getByRole('button', {
          name: /Study: cross references and indexed resources for this passage/i,
        })
      ).not.toBeDisabled()
    )
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
              items: [{ slug: 'sg00001', title: 'A Sermon', kind: 'sermon' }],
              sermonCount: 1,
              morneveCount: 0,
            }),
        } as Response)
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ text: 'Sample scripture text' }),
      } as Response)
    })
    renderWithTextSize(<ScriptureModal {...defaultProps} onOpenSpurgeonStudy={openStudy} />)
    await waitFor(() =>
      expect(
        screen.getByRole('button', {
          name: /Study: cross references and indexed resources for this passage/i,
        })
      ).toBeInTheDocument()
    )
    await user.click(
      screen.getByRole('button', {
        name: /Study: cross references and indexed resources for this passage/i,
      })
    )
    expect(openStudy).toHaveBeenCalledWith('John 3:16')
  })

  it('long press on passage text prompts to hide verse numbers and persists preference', async () => {
    const alertMocks = getAlertModalMocks()
    alertMocks.showConfirm.mockResolvedValue(true)

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
        json: () => Promise.resolve({ text: '[16] For God so loved the world.' }),
      } as Response)
    })

    renderWithTextSize(<ScriptureModal {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText(/For God so loved the world/i)).toBeInTheDocument()
    })

    const passage = document.querySelector('[data-tour="scripture-modal-verse-body"] > div')
    expect(passage).toBeTruthy()
    expect(passage!.querySelector('sup.text-blue-600')).toBeTruthy()

    jest.useFakeTimers()
    act(() => {
      fireEvent.pointerDown(passage!, { button: 0, clientX: 100, clientY: 200 })
    })
    act(() => {
      jest.advanceTimersByTime(DEFAULT_LONG_PRESS_MS)
    })
    jest.useRealTimers()

    await waitFor(() => {
      expect(alertMocks.showConfirm).toHaveBeenCalledWith(
        'Hide verse numbers in the scripture reader?'
      )
    })

    await waitFor(() => {
      expect(localStorage.getItem(SCRIPTURE_SHOW_VERSE_NUMBERS_STORAGE_KEY)).toBe('false')
      expect(passage!.querySelector('sup.hidden')).toBeTruthy()
      expect(passage!.querySelector('sup.text-blue-600')).toBeNull()
    })
  })
})