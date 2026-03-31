import React from 'react'
import { render, screen } from '@testing-library/react'
import { CopyrightScriptureAttributionSections } from '../CopyrightScriptureAttributionSections'

describe('CopyrightScriptureAttributionSections', () => {
  it('shows only enabled translation sections', () => {
    render(<CopyrightScriptureAttributionSections enabledTranslationCodes={['esv', 'kjv']} />)

    expect(screen.getByRole('heading', { name: /English Standard Version \(ESV\)/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /King James Version \(KJV\)/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /New International Version \(NIV\)/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /New American Standard Bible \(NASB\)/i })).not.toBeInTheDocument()
  })

  it('shows all sections when enabled list is null', () => {
    render(<CopyrightScriptureAttributionSections enabledTranslationCodes={null} />)

    expect(screen.getByRole('heading', { name: /Christian Standard Bible \(CSB\)/i })).toBeInTheDocument()
  })
})
