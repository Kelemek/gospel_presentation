import { render, screen } from '@testing-library/react'

describe('Profile NotFound page', () => {
  it('renders 404 text and links', () => {
    // eslint-disable-next-line global-require
    const NotFound = require('@/app/[slug]/not-found').default
    render(<NotFound />)

    expect(screen.getByText(/404/)).toBeInTheDocument()
    expect(screen.getByText(/Profile Not Found/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /View Default Presentation/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Contact the administrator/i })).toBeInTheDocument()
  })
})
