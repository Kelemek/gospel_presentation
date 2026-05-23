/**
 * @jest-environment jsdom
 */

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AddMemorizedVerseModal from '@/components/AddMemorizedVerseModal'
import type { BibleTranslation } from '@/lib/bible-translations'

const mockOnClose = jest.fn()
const mockShowAlert = jest.fn()

jest.mock('@/contexts/AlertModalContext', () => ({
  useAlertModal: () => ({
    showAlert: mockShowAlert,
    showConfirm: jest.fn(),
  }),
}))

const mockAddMemorizedVerse = jest.fn(
  (_reference: string, _text: string, _translation: BibleTranslation) => true
)
const mockIsMemoizedForReference = jest.fn(() => false)
jest.mock('@/lib/verseMemorizationStorage', () => ({
  addMemorizedVerse: (reference: string, text: string, translation: BibleTranslation) =>
    mockAddMemorizedVerse(reference, text, translation),
  isMemoizedForReference: (reference: string, translation: BibleTranslation) =>
    mockIsMemoizedForReference(reference, translation),
}))

function setupFetchSuccess(text = 'In the beginning God created the heaven and the earth.') {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: async () => ({ text }),
    })
  ) as jest.Mock
}

function setupFetchError(status = 500, body: Record<string, string> = { error: 'Server error' }) {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: false,
      status,
      json: async () => body,
    })
  ) as jest.Mock
}

/** Chapter row is the flex wrap immediately after the "Chapter" label (before "Verse" appears). */
function getChapterButtons() {
  const chapterLabel = screen.getByText('Chapter')
  const wrap = chapterLabel.nextElementSibling as HTMLElement | null
  if (!wrap) throw new Error('expected chapter button row')
  return within(wrap).getAllByRole('button')
}

/** Verse row is the flex wrap after the "Verse" label. */
function getVerseButtons() {
  const verseLabel = screen.getByText('Verse')
  const wrap = verseLabel.nextElementSibling as HTMLElement | null
  if (!wrap) throw new Error('expected verse button row')
  return within(wrap).getAllByRole('button')
}

describe('AddMemorizedVerseModal', () => {
  beforeEach(() => {
    mockOnClose.mockClear()
    mockShowAlert.mockClear()
    mockAddMemorizedVerse.mockReset()
    mockAddMemorizedVerse.mockReturnValue(true)
    mockIsMemoizedForReference.mockReset()
    mockIsMemoizedForReference.mockReturnValue(false)
    window.sessionStorage.clear()
    setupFetchSuccess()
  })

  it('renders nothing when closed', () => {
    const { container } = render(
      <AddMemorizedVerseModal isOpen={false} onClose={mockOnClose} translation="esv" />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders dialog with title when open', () => {
    render(<AddMemorizedVerseModal isOpen onClose={mockOnClose} translation="esv" />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Pick Chapter' })).toBeInTheDocument()
  })

  it('changes heading to Pick Verse Range after a chapter is selected', async () => {
    const user = userEvent.setup()
    render(<AddMemorizedVerseModal isOpen onClose={mockOnClose} translation="esv" />)
    expect(screen.getByRole('heading', { name: 'Pick Chapter' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^Genesis$/i }))
    await user.click(getChapterButtons()[0])
    expect(screen.getByRole('heading', { name: 'Pick Verse Range' })).toBeInTheDocument()
  })

  it('closes when Close is clicked', async () => {
    const user = userEvent.setup()
    render(<AddMemorizedVerseModal isOpen onClose={mockOnClose} translation="esv" />)
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('closes on Escape', async () => {
    render(<AddMemorizedVerseModal isOpen onClose={mockOnClose} translation="esv" />)
    await userEvent.keyboard('{Escape}')
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('switches to New Testament and shows Matthew', async () => {
    const user = userEvent.setup()
    render(<AddMemorizedVerseModal isOpen onClose={mockOnClose} translation="esv" />)
    await user.click(screen.getByRole('button', { name: 'New Testament' }))
    expect(screen.getByRole('button', { name: /^Matthew$/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Genesis$/i })).not.toBeInTheDocument()
  })

  it('expands a book, selects chapter and verse, then adds passage', async () => {
    const user = userEvent.setup()
    render(<AddMemorizedVerseModal isOpen onClose={mockOnClose} translation="esv" />)

    await user.click(screen.getByRole('button', { name: /^Genesis$/i }))
    await user.click(getChapterButtons()[0])

    await user.click(getVerseButtons()[0])

    const addBtn = screen.getByRole('button', { name: /^Add$/i })
    expect(addBtn).not.toBeDisabled()
    await user.click(addBtn)

    await waitFor(() => {
      expect(mockAddMemorizedVerse).toHaveBeenCalled()
    })
    expect(mockOnClose).toHaveBeenCalled()
    expect(global.fetch).toHaveBeenCalled()
    const fetchUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string
    expect(fetchUrl).toContain('/api/scripture')
    expect(fetchUrl).toContain('reference=')
    expect(fetchUrl).toContain('translation=esv')
  })

  it('ignores a second tap on the same verse before a range is set', async () => {
    const user = userEvent.setup()
    render(<AddMemorizedVerseModal isOpen onClose={mockOnClose} translation="esv" />)

    await user.click(screen.getByRole('button', { name: /^Genesis$/i }))
    await user.click(getChapterButtons()[0])
    const verseButtons = getVerseButtons()
    await user.click(verseButtons[0])
    await user.click(verseButtons[0])

    await user.click(screen.getByRole('button', { name: /^Add$/i }))
    await waitFor(() => expect(mockAddMemorizedVerse).toHaveBeenCalled())
    const refArg = mockAddMemorizedVerse.mock.calls[0][0] as string
    expect(refArg).toMatch(/Genesis 1:1$/)
  })

  it('starts a new single verse after a range was selected', async () => {
    const user = userEvent.setup()
    render(<AddMemorizedVerseModal isOpen onClose={mockOnClose} translation="esv" />)

    await user.click(screen.getByRole('button', { name: /^Genesis$/i }))
    await user.click(getChapterButtons()[0])
    const verseButtons = getVerseButtons()
    await user.click(verseButtons[0])
    await user.click(verseButtons[2])
    await user.click(verseButtons[4])

    await user.click(screen.getByRole('button', { name: /^Add$/i }))
    await waitFor(() => expect(mockAddMemorizedVerse).toHaveBeenCalled())
    const refArg = mockAddMemorizedVerse.mock.calls[0][0] as string
    expect(refArg).toMatch(/Genesis 1:5$/)
  })

  it('builds a verse range when two different verses are selected', async () => {
    const user = userEvent.setup()
    render(<AddMemorizedVerseModal isOpen onClose={mockOnClose} translation="esv" />)

    await user.click(screen.getByRole('button', { name: /^Genesis$/i }))
    await user.click(getChapterButtons()[0])

    const verseButtons = getVerseButtons()
    await user.click(verseButtons[0])
    await user.click(verseButtons[2])

    await user.click(screen.getByRole('button', { name: /^Add$/i }))
    await waitFor(() => expect(mockAddMemorizedVerse).toHaveBeenCalled())
    const refArg = mockAddMemorizedVerse.mock.calls[0][0] as string
    expect(refArg).toMatch(/Genesis 1:1-3/)
  })

  it('uses Psalm singular in reference for Psalms book', async () => {
    const user = userEvent.setup()
    render(<AddMemorizedVerseModal isOpen onClose={mockOnClose} translation="esv" />)

    const psalms = screen.getByRole('button', { name: /^Psalms$/i })
    await user.click(psalms)
    await user.click(getChapterButtons()[0])
    await user.click(getVerseButtons()[0])
    await user.click(screen.getByRole('button', { name: /^Add$/i }))

    await waitFor(() => expect(mockAddMemorizedVerse).toHaveBeenCalled())
    const refArg = mockAddMemorizedVerse.mock.calls[0][0] as string
    expect(refArg).toMatch(/^Psalm /)
  })

  it('shows alert when fetch fails', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('network'))) as jest.Mock
    const user = userEvent.setup()
    render(<AddMemorizedVerseModal isOpen onClose={mockOnClose} translation="esv" />)

    await user.click(screen.getByRole('button', { name: /^Genesis$/i }))
    await user.click(getChapterButtons()[0])
    await user.click(getVerseButtons()[0])
    await user.click(screen.getByRole('button', { name: /^Add$/i }))

    await waitFor(() => {
      expect(mockShowAlert).toHaveBeenCalledWith('network')
    })
  })

  it('shows alert when API returns error', async () => {
    setupFetchError(500, { error: 'Bad gateway' })
    const user = userEvent.setup()
    render(<AddMemorizedVerseModal isOpen onClose={mockOnClose} translation="esv" />)

    await user.click(screen.getByRole('button', { name: /^Genesis$/i }))
    await user.click(getChapterButtons()[0])
    await user.click(getVerseButtons()[0])
    await user.click(screen.getByRole('button', { name: /^Add$/i }))

    await waitFor(() => {
      expect(mockShowAlert).toHaveBeenCalledWith('Bad gateway')
    })
    expect(mockOnClose).not.toHaveBeenCalled()
  })

  it('shows alert when passage text is empty', async () => {
    setupFetchSuccess('   ')
    const user = userEvent.setup()
    render(<AddMemorizedVerseModal isOpen onClose={mockOnClose} translation="esv" />)

    await user.click(screen.getByRole('button', { name: /^Genesis$/i }))
    await user.click(getChapterButtons()[0])
    await user.click(getVerseButtons()[0])
    await user.click(screen.getByRole('button', { name: /^Add$/i }))

    await waitFor(() => {
      expect(mockShowAlert).toHaveBeenCalledWith('No text returned for this passage.')
    })
  })

  it('shows alert when verse is duplicate', async () => {
    mockAddMemorizedVerse.mockReturnValue(false)
    mockIsMemoizedForReference.mockReturnValue(true)
    const user = userEvent.setup()
    render(<AddMemorizedVerseModal isOpen onClose={mockOnClose} translation="esv" />)

    await user.click(screen.getByRole('button', { name: /^Genesis$/i }))
    await user.click(getChapterButtons()[0])
    await user.click(getVerseButtons()[0])
    await user.click(screen.getByRole('button', { name: /^Add$/i }))

    await waitFor(() => {
      expect(mockShowAlert).toHaveBeenCalledWith(
        'This verse is already in your memorization list.'
      )
    })
    expect(mockOnClose).not.toHaveBeenCalled()
  })

  it('disables Add until chapter and verse are selected', async () => {
    const user = userEvent.setup()
    render(<AddMemorizedVerseModal isOpen onClose={mockOnClose} translation="esv" />)

    expect(screen.getByRole('button', { name: /^Add$/i })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: /^Genesis$/i }))
    expect(screen.getByRole('button', { name: /^Add$/i })).toBeDisabled()

    await user.click(getChapterButtons()[0])
    expect(screen.getByRole('button', { name: /^Add$/i })).toBeDisabled()

    await user.click(getVerseButtons()[0])
    expect(screen.getByRole('button', { name: /^Add$/i })).not.toBeDisabled()
  })

  it('collapses book accordion when header is clicked again', async () => {
    const user = userEvent.setup()
    render(<AddMemorizedVerseModal isOpen onClose={mockOnClose} translation="esv" />)

    const genesisBtn = screen.getByRole('button', { name: /^Genesis$/i })
    await user.click(genesisBtn)
    expect(screen.getByText('Chapter')).toBeInTheDocument()

    await user.click(genesisBtn)
    expect(screen.queryByText('Chapter')).not.toBeInTheDocument()
  })

  it('shows alert when local storage save fails', async () => {
    mockAddMemorizedVerse.mockReturnValue(false)
    mockIsMemoizedForReference.mockReturnValue(false)
    const user = userEvent.setup()
    render(<AddMemorizedVerseModal isOpen onClose={mockOnClose} translation="esv" />)

    await user.click(screen.getByRole('button', { name: /^Genesis$/i }))
    await user.click(getChapterButtons()[0])
    await user.click(getVerseButtons()[0])
    await user.click(screen.getByRole('button', { name: /^Add$/i }))

    await waitFor(() => {
      expect(mockShowAlert).toHaveBeenCalledWith(
        expect.stringContaining('Could not save this verse on your device')
      )
    })
    expect(mockOnClose).not.toHaveBeenCalled()
  })

  it('opens New Testament and expands 1 Peter when seedReference is set', async () => {
    render(
      <AddMemorizedVerseModal
        isOpen
        onClose={mockOnClose}
        translation="esv"
        seedReference="1 Peter 2:13"
      />
    )
    expect(screen.getByRole('button', { name: /^1 Peter$/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Genesis$/i })).not.toBeInTheDocument()
    expect(screen.getByText('Chapter')).toBeInTheDocument()
    expect(window.sessionStorage.getItem('gospel-memorization-add-testament')).toBe('nt')
  })

  it('remembers New Testament tab in sessionStorage', async () => {
    const user = userEvent.setup()
    render(<AddMemorizedVerseModal isOpen onClose={mockOnClose} translation="esv" />)
    await user.click(screen.getByRole('button', { name: 'New Testament' }))
    expect(window.sessionStorage.getItem('gospel-memorization-add-testament')).toBe('nt')
  })

  it('resets expanded book when switching testament tab', async () => {
    const user = userEvent.setup()
    render(<AddMemorizedVerseModal isOpen onClose={mockOnClose} translation="esv" />)

    await user.click(screen.getByRole('button', { name: /^Genesis$/i }))
    expect(screen.getByText('Chapter')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'New Testament' }))
    expect(screen.queryByText('Chapter')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Matthew$/i })).toBeInTheDocument()
  })
})
