/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react'
import { AcbcExternalResourceLinksAttribution } from '@/components/AcbcExternalResourceLinksAttribution'
import { ACBC_EXTERNAL_LINKS_COPYRIGHT_ANCHOR_ID } from '@/lib/acbcExternalLinksCopyrightAttribution'

describe('AcbcExternalResourceLinksAttribution', () => {
  it('renders title, anchor id, and ACBC links', () => {
    render(<AcbcExternalResourceLinksAttribution />)

    expect(document.getElementById(ACBC_EXTERNAL_LINKS_COPYRIGHT_ANCHOR_ID)).toBeInTheDocument()
    expect(screen.getByText(/ACBC\) — outbound links/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'biblicalcounseling.com' })).toHaveAttribute(
      'href',
      'https://biblicalcounseling.com/'
    )
    expect(screen.getByRole('link', { name: /ACBC resource library/i })).toHaveAttribute(
      'href',
      'https://biblicalcounseling.com/resource-library/'
    )
    expect(screen.getByRole('link', { name: 'topic index' })).toHaveAttribute(
      'href',
      'https://biblicalcounseling.com/resource-library/topic-index/'
    )
  })
})
