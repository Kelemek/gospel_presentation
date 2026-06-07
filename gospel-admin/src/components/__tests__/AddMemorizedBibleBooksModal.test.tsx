/**
 * @jest-environment jsdom
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AddMemorizedBibleBooksModal from '@/components/AddMemorizedBibleBooksModal'
import { resetGospelClientStorageForTests } from '@/lib/gospelClientStorage'
import { installTestLocalStorage } from '@/lib/testing/testLocalStorage'
import { loadMemorizedVerses, tryAddMemorizedBibleBooks } from '@/lib/verseMemorizationStorage'

const mockShowAlert = jest.fn()

jest.mock('@/contexts/AlertModalContext', () => ({
  useAlertModal: () => ({
    showAlert: mockShowAlert,
    showConfirm: jest.fn(),
  }),
}))

describe('AddMemorizedBibleBooksModal', () => {
  beforeEach(() => {
    resetGospelClientStorageForTests()
    installTestLocalStorage()
    mockShowAlert.mockReset()
  })

  it('renders scope options and book list', () => {
    render(
      <AddMemorizedBibleBooksModal isOpen onClose={jest.fn()} translation="esv" />
    )
    expect(screen.getByRole('heading', { name: 'Bible Books' })).toBeInTheDocument()
    expect(screen.getByDisplayValue('all')).toBeInTheDocument()
    expect(screen.getByDisplayValue('ot')).toBeInTheDocument()
    expect(screen.getByDisplayValue('nt')).toBeInTheDocument()
    expect(screen.getByText('Genesis')).toBeInTheDocument()
  })

  it('adds selected scope and closes on success', async () => {
    const user = userEvent.setup()
    const onClose = jest.fn()
    render(
      <AddMemorizedBibleBooksModal isOpen onClose={onClose} translation="esv" />
    )
    await user.click(screen.getByDisplayValue('ot'))
    await user.click(screen.getByRole('button', { name: /^Add$/i }))
    await waitFor(() => expect(loadMemorizedVerses()).toHaveLength(1))
    expect(loadMemorizedVerses()[0]?.kind).toBe('bibleBooks')
    expect(loadMemorizedVerses()[0]?.bibleBooksScope).toBe('ot')
    await waitFor(() => expect(mockShowAlert).toHaveBeenCalled())
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('tryAddMemorizedBibleBooks rejects duplicate scope', async () => {
    await expect(tryAddMemorizedBibleBooks('all', 'esv')).resolves.toEqual({ ok: true })
    await expect(tryAddMemorizedBibleBooks('all', 'esv')).resolves.toEqual({
      ok: false,
      reason: 'duplicate',
    })
  })
})
