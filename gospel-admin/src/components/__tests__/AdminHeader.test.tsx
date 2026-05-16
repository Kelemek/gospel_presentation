import React from 'react'
import { render, screen } from '@testing-library/react'
import AdminHeader from '../AdminHeader'

describe('AdminHeader', () => {
  it('renders title and description', () => {
    render(<AdminHeader title="Test Title" description="Test description" />)
    expect(screen.getByText('Test Title')).toBeInTheDocument()
    expect(screen.getByText('Test description')).toBeInTheDocument()
  })

  it('renders actions when provided', () => {
    render(
      <AdminHeader title="T" description="D" actions={<button type="button">Save</button>} />
    )
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
  })
})
