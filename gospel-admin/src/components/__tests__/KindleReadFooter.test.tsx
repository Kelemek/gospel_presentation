import { render, screen } from '@testing-library/react'
import KindleReadFooter from '../KindleReadFooter'

describe('KindleReadFooter', () => {
  it('renders scripture attribution, content credits, and site links', () => {
    render(
      <KindleReadFooter
        enabledTranslationCodes={['esv', 'kjv']}
        fullSiteUrl="/default/"
        refreshHref="/default/read/"
      />
    )

    expect(screen.getByText(/English Standard Version/i)).toBeInTheDocument()
    expect(screen.getByText(/King James Version/i)).toBeInTheDocument()
    expect(screen.getByText(/M'Cheyne reading plan/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'full Copyright & Attribution page' })).toHaveAttribute(
      'href',
      '/copyright'
    )
    expect(screen.getByRole('link', { name: 'full site' })).toHaveAttribute('href', '/default/')
    expect(screen.getByRole('link', { name: 'Refresh this page' })).toHaveAttribute(
      'href',
      '/default/read/'
    )
  })
})
