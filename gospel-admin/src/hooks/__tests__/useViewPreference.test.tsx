import React from 'react'
import { render, screen, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useViewPreference } from '../useViewPreference'

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    }),
  })),
}))

function TestComponent() {
  const [view, setView] = useViewPreference('list')
  return (
    <div>
      <span data-testid="view">{view}</span>
      <button type="button" onClick={() => setView('card')}>Card</button>
      <button type="button" onClick={() => setView('list')}>List</button>
    </div>
  )
}

describe('useViewPreference', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns default view', () => {
    render(<TestComponent />)
    expect(screen.getByTestId('view')).toHaveTextContent('list')
  })

  it('loads from localStorage on mount', async () => {
    localStorage.setItem('gospel-view-preference', 'card')
    render(<TestComponent />)
    await act(async () => {})
    expect(screen.getByTestId('view')).toHaveTextContent('card')
  })

  it('updates view and persists to localStorage', async () => {
    const user = userEvent.setup({ delay: null })
    render(<TestComponent />)
    await user.click(screen.getByRole('button', { name: 'Card' }))
    expect(screen.getByTestId('view')).toHaveTextContent('card')
    expect(localStorage.getItem('gospel-view-preference')).toBe('card')
    await user.click(screen.getByRole('button', { name: 'List' }))
    expect(screen.getByTestId('view')).toHaveTextContent('list')
    expect(localStorage.getItem('gospel-view-preference')).toBe('list')
  })

  it('loads from database when user is authenticated', async () => {
    const { createClient } = require('@/lib/supabase/client')
    createClient.mockReturnValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { view_preference: 'card' }, error: null }),
      }),
    })
    render(<TestComponent />)
    await waitFor(() => expect(screen.getByTestId('view')).toHaveTextContent('card'))
  })
})
