import { render, screen } from '@testing-library/react'
import ScripturePassageReaderOptionsPanel from '../ScripturePassageReaderOptionsPanel'

describe('ScripturePassageReaderOptionsPanel', () => {
  const defaultProps = {
    open: true,
    onClose: jest.fn(),
    showVerseNumbers: true,
    onShowVerseNumbersChange: jest.fn(),
    showWordsOfChrist: true,
    onShowWordsOfChristChange: jest.fn(),
  }

  it('exposes an accessible modal dialog when open', () => {
    render(<ScripturePassageReaderOptionsPanel {...defaultProps} />)
    const dialog = screen.getByRole('dialog', { name: 'Scripture reader display' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveFocus()
  })
})
