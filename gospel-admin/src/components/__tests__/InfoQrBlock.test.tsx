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

    const scaleWrap = container.querySelector('a span.inline-block')
    expect(scaleWrap).toBeTruthy()
    expect(scaleWrap).toHaveClass(
      '[&_svg]:h-22',
      '[&_svg]:w-22',
      'xl:[&_svg]:h-[128px]',
      'xl:[&_svg]:w-[128px]'
    )
  })
})
