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

  it('exposes data-tour hooks for the scripture reader help tour', () => {
    render(<ScripturePassageReaderOptionsPanel {...defaultProps} />)
    expect(document.querySelector('[data-tour="scripture-reader-options-panel"]')).toBeTruthy()
    expect(document.querySelector('[data-tour="scripture-reader-options-verse-numbers"]')).toBeTruthy()
    expect(document.querySelector('[data-tour="scripture-reader-options-red-letter"]')).toBeTruthy()
  })
})
