import React from 'react'
import { render, screen } from '@testing-library/react'
import LastOpenScriptureRowLabel from '../LastOpenScriptureRowLabel'

describe('LastOpenScriptureRowLabel', () => {
  it('shows reference suffix and translation code with truncatable book', () => {
    render(<LastOpenScriptureRowLabel reference="Galatians 2:16" translation="esv" />)
    expect(screen.getByTitle('Galatians 2:16 · ESV')).toBeInTheDocument()
    expect(screen.getByText('Galatians')).toBeInTheDocument()
    expect(screen.getByText('2:16')).toBeInTheDocument()
    expect(screen.getByText(/· ESV/)).toBeInTheDocument()
  })
})
