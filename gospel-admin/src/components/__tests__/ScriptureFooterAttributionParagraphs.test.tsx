import React from 'react'
import { render, screen } from '@testing-library/react'
import { ScriptureFooterAttributionParagraphs } from '../ScriptureFooterAttributionParagraphs'

describe('ScriptureFooterAttributionParagraphs', () => {
  it('renders publisher links inline for ESV, NASB, NIV, NLT, and CSB when all enabled (null)', () => {
    render(<ScriptureFooterAttributionParagraphs anchorClassName="a-class" enabledTranslationCodes={null} />)

    expect(screen.getByRole('link', { name: /^www\.esv\.org$/i })).toHaveAttribute('href', 'https://www.esv.org')
    expect(screen.getByRole('link', { name: /^www\.lockman\.org$/i })).toHaveAttribute('href', 'https://www.lockman.org')

    expect(screen.getByText(/NEW INTERNATIONAL VERSION/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Biblica\.com/i })).toHaveAttribute('href', 'https://www.biblica.com')

    expect(screen.getByText(/New Living Translation/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Tyndale\.com/i })).toHaveAttribute('href', 'https://www.tyndale.com')

    expect(screen.getByText(/Christian Standard Bible/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /CSBible\.com/i })).toHaveAttribute('href', 'https://csbible.com')
  })

  it('omits paragraphs for translations not in enabledTranslationCodes', () => {
    render(
      <ScriptureFooterAttributionParagraphs anchorClassName="a-class" enabledTranslationCodes={['esv', 'niv']} />
    )

    expect(screen.getByRole('link', { name: /^www\.esv\.org$/i })).toBeInTheDocument()
    expect(screen.getByText(/NEW INTERNATIONAL VERSION/i)).toBeInTheDocument()
    expect(screen.queryByText(/King James Version \(KJV\)/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /^www\.lockman\.org$/i })).not.toBeInTheDocument()
  })
})
