/**
 * @jest-environment jsdom
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MemorizeDropdown from '@/components/MemorizeDropdown'
import { resetGospelClientStorageForTests } from '@/lib/gospelClientStorage'
import { installTestLocalStorage } from '@/lib/testing/testLocalStorage'
import {
  addMemorizedVerse,
  loadMemorizedVerses,
  tryAddMemorizedBibleBooks,
} from '@/lib/verseMemorizationStorage'

const mockShowConfirm = jest.fn()

jest.mock('@/contexts/TranslationContext', () => ({
  useTranslation: () => ({ translation: 'esv' }),
}))

jest.mock('@/components/AddMemorizedVerseModal', () => ({
  __esModule: true,
  default: function MockAddVerseModal({ isOpen }: { isOpen: boolean }) {
    return isOpen ? <div data-testid="add-memorized-verse-modal" /> : null
  },
}))

jest.mock('@/components/AddMemorizedBibleBooksModal', () => ({
  __esModule: true,
  default: function MockAddBibleBooksModal({ isOpen }: { isOpen: boolean }) {
    return isOpen ? <div data-testid="add-memorized-bible-books-modal" /> : null
  },
}))

jest.mock('@/contexts/AlertModalContext', () => ({
  useAlertModal: () => ({
    showConfirm: mockShowConfirm,
    showAlert: jest.fn(),
  }),
}))

jest.mock('@/components/MemorizationPracticeSession', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-practice-session">practice</div>,
}))

describe('MemorizeDropdown', () => {
  beforeEach(() => {
    resetGospelClientStorageForTests()
    installTestLocalStorage()
    mockShowConfirm.mockReset()
    mockShowConfirm.mockResolvedValue(true)
  })

  it('shows empty state when no verses saved', async () => {
    const user = userEvent.setup()
    render(<MemorizeDropdown />)
    await user.click(screen.getByRole('button', { name: /memorize/i }))
    const panel = screen.getByRole('region', { name: 'Memorization list' })
    expect(panel).toHaveTextContent(/Nothing saved yet/)
    expect(panel).toHaveTextContent(/\+ Add Verses/)
    expect(panel).toHaveTextContent(/Bible Books/)
  })

  it('shows + Add Verses and + Bible Books when Memorize panel is expanded', async () => {
    const user = userEvent.setup()
    render(<MemorizeDropdown />)
    await user.click(screen.getByRole('button', { name: /memorize/i }))
    expect(screen.getByRole('button', { name: /^\+ Add Verses$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^\+ Bible Books$/i })).toBeInTheDocument()
  })

  it('opens add-verse modal when + Add Verses is clicked', async () => {
    const user = userEvent.setup()
    render(<MemorizeDropdown />)
    await user.click(screen.getByRole('button', { name: /memorize/i }))
    await user.click(screen.getByRole('button', { name: /^\+ Add Verses$/i }))
    expect(screen.getByTestId('add-memorized-verse-modal')).toBeInTheDocument()
  })

  it('opens bible books modal when + Bible Books is clicked', async () => {
    const user = userEvent.setup()
    render(<MemorizeDropdown />)
    await user.click(screen.getByRole('button', { name: /memorize/i }))
    await user.click(screen.getByRole('button', { name: /^\+ Bible Books$/i }))
    expect(screen.getByTestId('add-memorized-bible-books-modal')).toBeInTheDocument()
  })

  it('lists bible books item with book count instead of translation', async () => {
    await tryAddMemorizedBibleBooks('ot', 'esv')
    const user = userEvent.setup()
    render(<MemorizeDropdown />)
    await user.click(screen.getByRole('button', { name: /memorize/i }))
    expect(screen.getByText('Bible Books (OT)')).toBeInTheDocument()
    expect(screen.getByText('39 books')).toBeInTheDocument()
  })

  it('lists verses grouped by mastery', async () => {
    addMemorizedVerse('John 3:16', 'For God so loved the world.', 'esv')
    expect(loadMemorizedVerses()).toHaveLength(1)
    const user = userEvent.setup()
    render(<MemorizeDropdown />)
    await user.click(screen.getByRole('button', { name: /memorize/i }))
    expect(screen.getByText('John 3:16')).toBeInTheDocument()
    expect(screen.getByText(/Learning/i)).toBeInTheDocument()
  })

  it('remove calls confirm and removes verse when confirmed', async () => {
    addMemorizedVerse('Ps 1:1', 'Blessed is the man', 'esv')
    expect(loadMemorizedVerses()).toHaveLength(1)

    const user = userEvent.setup()
    render(<MemorizeDropdown />)
    await user.click(screen.getByRole('button', { name: /memorize/i }))
    await user.click(screen.getByRole('button', { name: /Remove Ps 1:1/i }))

    expect(mockShowConfirm).toHaveBeenCalled()
    await waitFor(() => expect(loadMemorizedVerses()).toHaveLength(0))
  })

  it('does not call onNavigate when parent handles practice (avoids double closeMenu)', async () => {
    addMemorizedVerse('John 3:16', 'For God so loved the world.', 'esv')
    const user = userEvent.setup()
    const onNavigate = jest.fn()
    const onMemorizationPracticeStart = jest.fn()
    render(
      <MemorizeDropdown onNavigate={onNavigate} onMemorizationPracticeStart={onMemorizationPracticeStart} />
    )
    await user.click(screen.getByRole('button', { name: /memorize/i }))
    const practiceBtn = document.querySelector('[data-memorize-verse-practice]')
    expect(practiceBtn).toBeTruthy()
    await user.click(practiceBtn as HTMLElement)

    expect(onMemorizationPracticeStart).toHaveBeenCalledTimes(1)
    expect(onNavigate).not.toHaveBeenCalled()
  })

  it('calls onNavigate when opening the portaled practice session locally', async () => {
    addMemorizedVerse('John 3:16', 'For God so loved the world.', 'esv')
    const user = userEvent.setup()
    const onNavigate = jest.fn()
    render(<MemorizeDropdown onNavigate={onNavigate} />)
    await user.click(screen.getByRole('button', { name: /memorize/i }))
    const practiceBtn = document.querySelector('[data-memorize-verse-practice]')
    expect(practiceBtn).toBeTruthy()
    await user.click(practiceBtn as HTMLElement)

    expect(onNavigate).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('mock-practice-session')).toBeInTheDocument()
  })
})
