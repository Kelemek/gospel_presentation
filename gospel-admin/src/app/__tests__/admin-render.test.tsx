/**
 * Render test for admin page that mocks Supabase client and fetch
 * to exercise data-loading and render the management UI.
 */
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'

// Mock next/navigation useRouter and usePathname
jest.doMock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/admin'
}))

// Mock the Supabase client used by the admin page
jest.doMock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: async () => ({ data: { user: { id: 'user-1' } } })
    },
    from: (_table: string) => ({
      select: () => ({
        eq: (_col: string, _val: any) => ({ single: async () => ({ data: { role: 'admin' }, error: null }) }),
        order: (_col: string, _opts: any) => ({
          then: (cb: any) => cb({ data: [], error: null })
        })
      })
    })
  })
}))

// Provide a global fetch mock for /api/profiles
const origFetch = global.fetch
beforeAll(() => {
  global.fetch = jest.fn((input: RequestInfo) => {
    const url = typeof input === 'string' ? input : (input as Request).url
    if (url.includes('/api/profiles/templates')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ profiles: [], total: 0, totalPages: 1 }),
      } as any)
    }
    if (url.includes('/api/profiles')) {
      return Promise.resolve({ ok: true, json: async () => ({ profiles: [] }) } as any)
    }
    return Promise.resolve({ ok: true, json: async () => ({}) } as any)
  }) as any
})
afterAll(() => {
  global.fetch = origFetch
})

test('admin page mounts and shows profile management heading', async () => {
  const AdminPage = (await import('../admin/page')).default
  render(<AdminPage />)

  // Wait for the heading that indicates the management UI is rendered
  await waitFor(() => {
    expect(screen.getByRole('heading', { name: 'Resource templates' })).toBeInTheDocument()
  })
})
