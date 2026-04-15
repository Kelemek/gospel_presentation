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
    expect(qrLink).toHaveClass('cursor-pointer', 'group', 'flex', 'flex-col')

    const aspect = qrLink.querySelector('.aspect-square')
    expect(aspect).toBeTruthy()

    const root = container.firstElementChild as HTMLElement
    expect(root).toHaveClass('w-full', 'flex', 'min-h-0')
  })

  it('compact mode uses tighter max QR width below xl', () => {
    render(
      <InfoQrBlock
        href="https://example.com"
        label="Web"
        shortUrl="example.com"
        size={128}
        showShortUrl={false}
        compact
      />
    )
    const qrLink = screen.getByRole('link', { name: /Web: open link/i })
    const inner = qrLink.querySelector('.aspect-square')
    expect(inner).toHaveClass('max-xl:max-w-[3.25rem]', 'xl:max-w-full')
  })
})
