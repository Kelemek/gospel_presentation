import React from 'react'
import { render, screen } from '@testing-library/react'

import { InfoQrBlock } from '../InfoQrBlock'

describe('InfoQrBlock', () => {
  it('renders QR link, label, and scales SVG wrapper for portrait vs xl', () => {
    const { container } = render(
      <InfoQrBlock
        href="https://example.com/path"
        label="Example"
        shortUrl="example.com"
        size={128}
        showShortUrl
      />
    )

    expect(screen.getByRole('link', { name: /Example: open link/i })).toHaveAttribute(
      'href',
      'https://example.com/path'
    )
    expect(screen.getByText('Example')).toBeInTheDocument()
    expect(screen.getByText('example.com')).toBeInTheDocument()

    const qrLink = screen.getByRole('link', { name: /Example: open link/i })
    expect(qrLink).toHaveClass(
      'aspect-square',
      'xl:max-w-full',
      'xl:max-h-full',
      'xl:w-auto',
      'xl:h-full'
    )

    const root = container.firstElementChild as HTMLElement
    expect(root).toHaveClass('w-full', 'h-full', 'min-h-0')
  })
})
