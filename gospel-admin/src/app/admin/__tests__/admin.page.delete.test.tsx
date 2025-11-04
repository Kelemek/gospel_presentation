import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock next/navigation hooks used by AdminHeader and AdminPageContent
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/admin'
}))

// Mock createClient from supabase client
const mockGetUser = jest.fn()
const mockSingle = jest.fn()
const mockEq = jest.fn()
const mockSelect = jest.fn()
const mockFrom = jest.fn()

const mockSupabase = {
  auth: { getUser: mockGetUser },
  from: mockFrom,
  select: mockSelect,
  eq: mockEq,
  single: mockSingle,
  auth_signOut: jest.fn()
}

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabase
}))

import { AdminPageContent } from '../page'

describe('AdminPageContent delete flow', () => {
  beforeEach(() => {
    jest.resetAllMocks()

    // Default supabase auth.getUser -> logged-in user
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })

    // user_profiles select -> role admin
    mockFrom.mockImplementation(() => mockSupabase)
    mockSelect.mockImplementation(() => mockSupabase)
    mockEq.mockImplementation(() => mockSupabase)
    mockSingle.mockResolvedValue({ data: { role: 'admin' } })

    // Default fetch behavior sequence:
    // 1) initial GET /api/profiles -> returns one profile
    // 2) DELETE /api/profiles/:slug -> returns ok
    // 3) subsequent GET /api/profiles -> returns empty list (profile removed)
    // @ts-ignore
    const initialProfiles = [{ id: 'p-delete', slug: 'del-slug', title: 'DeleteMe', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), visitCount: 0 }]
    global.fetch = jest.fn()
      // initial GET
      .mockImplementationOnce((url, opts) => {
        if (url === '/api/profiles' && (!opts || opts.method === 'GET')) {
          return Promise.resolve({ ok: true, json: async () => ({ profiles: initialProfiles }) })
        }
        return Promise.resolve({ ok: true, json: async () => ({}) })
      })
      // DELETE
      .mockImplementationOnce((url, opts) => {
        if (typeof url === 'string' && url.startsWith('/api/profiles/') && opts && opts.method === 'DELETE') {
          return Promise.resolve({ ok: true, json: async () => ({}) })
        }
        return Promise.resolve({ ok: true, json: async () => ({}) })
      })
      // subsequent GET after deletion -> empty list
      .mockImplementationOnce((url, opts) => {
        if (url === '/api/profiles' && (!opts || opts.method === 'GET')) {
          return Promise.resolve({ ok: true, json: async () => ({ profiles: [] }) })
        }
        return Promise.resolve({ ok: true, json: async () => ({}) })
      })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('deletes a profile when confirmed', async () => {
    const user = userEvent.setup()
    // Confirm dialog -> true
    // @ts-ignore
    window.confirm = jest.fn(() => true)

    render(<AdminPageContent />)

    // Wait for the profile title to be visible
    const title = await screen.findByText('DeleteMe')
    expect(title).toBeInTheDocument()

    // Click Delete button (there may be multiple buttons; find by role and name)
    const deleteBtn = await screen.findByRole('button', { name: /Delete/i })
    await user.click(deleteBtn)

    // After delete resolves, the profile title should be removed (or not present)
    await waitFor(() => expect(screen.queryByText('DeleteMe')).not.toBeInTheDocument())
  })
})
