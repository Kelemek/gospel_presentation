import React from 'react'
import { render, screen } from '@testing-library/react'

import InfoLayout, { metadata } from '../layout'

describe('InfoLayout', () => {
  it('exports metadata for the /info route', () => {
    expect(metadata.title).toBe('About the app — The Gospel Presentation')
    expect(metadata.description).toContain('Gospel Presentation')
    expect(metadata.description).toContain('QR codes')
  })

  it('renders children unchanged (pass-through layout)', () => {
    render(
      <InfoLayout>
        <div data-testid="info-child">About content</div>
      </InfoLayout>
    )
    expect(screen.getByTestId('info-child')).toHaveTextContent('About content')
  })
})
