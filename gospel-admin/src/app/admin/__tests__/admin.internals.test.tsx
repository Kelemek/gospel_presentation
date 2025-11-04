import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Simplify AdminErrorBoundary for focused testing
jest.mock('@/components/AdminErrorBoundary', () => ({ __esModule: true, default: ({ children }: any) => <div>{children}</div> }))

// Mock next/navigation router (jest.setup may already do this, but ensure hooks used by AdminHeader are present)
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/admin' }))

// Provide a mock supabase client tailored for this test
jest.mock('@/lib/supabase/client', () => ({
  __esModule: true,
  createClient: () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'u-admin' } } }) },
    from: (table: string) => ({
      select: (_cols?: any) => ({
        eq: (_col: string, _val: any) => ({ single: async () => ({ data: table === 'user_profiles' ? { role: 'admin' } : null, error: null }) }),
        order: (_col: string, _opts?: any) => ({ data: [], error: null })
      }),
      // include update/delete/upsert stubs if page triggers them
      update: () => ({ eq: (_col: string, _val: any) => ({ error: null }) }),
      insert: () => ({ error: null })
    })
  })
}))

beforeEach(() => {
  // Default fetch: return profiles list for GET /api/profiles and creation response for POST
  (global as any).fetch = jest.fn((input: RequestInfo, opts?: any) => {
    const url = typeof input === 'string' ? input : (input as any).url || ''

    if (url.endsWith('/api/profiles') && opts && opts.method === 'POST') {
      const body = opts.body ? JSON.parse(opts.body) : {}
      const created = {
        id: 'p-new',
        slug: (body.slug) || 'newslug',
        title: body.title || 'New Profile',
        description: body.description || '',
        isTemplate: !!body.isTemplate,
        isDefault: false,
        visitCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      return Promise.resolve({ ok: true, json: async () => ({ profile: created }) } as any)
    }

    if (url.endsWith('/api/profiles')) {
      const sample = {
        id: 'p-1',
        slug: 'sample-profile',
        title: 'Sample Profile',
        description: 'A sample',
        isTemplate: false,
        isDefault: false,
        visitCount: 3,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ownerDisplayName: 'Admin'
      }
      return Promise.resolve({ ok: true, json: async () => ({ profiles: [sample] }) } as any)
    }

    // Fallback
    return Promise.resolve({ ok: true, json: async () => ({}) } as any)
  })

  // Ensure confirm/alert do not block tests
  global.alert = jest.fn()
  global.confirm = jest.fn(() => true)
})

afterEach(() => {
  jest.resetAllMocks()
})

test('AdminPageContent renders profiles list for admin and opens create form', async () => {
  const { AdminPageContent } = await import('../page')

  render(<AdminPageContent />)

  // Header should show management label for admin
  await screen.findByText(/Profile Management/i)

  // The sample profile should render
  await screen.findByText(/Sample Profile/i)

  // Open new profile form
  const newBtn = await screen.findByRole('button', { name: /New Profile/i })
  await userEvent.click(newBtn)

  // Create form heading appears
  await screen.findByText(/Create New Profile/i)

  // Fill title and description
  const titleInput = await screen.findByLabelText(/Profile Title \*/i)
  const descInput = await screen.findByLabelText(/Description \*/i)
  await userEvent.type(titleInput, 'My Test Profile')
  await userEvent.type(descInput, 'Testing description')

  // Submit the form
  await userEvent.click(screen.getByRole('button', { name: /Create Profile/i }))

  // Wait for POST to be called
  await waitFor(() => expect((global.fetch as jest.Mock).mock.calls.some(c => typeof c[0] === 'string' && c[0].endsWith('/api/profiles') && c[1] && c[1].method === 'POST')).toBeTruthy())

  // After create, the create form should be closed
  await waitFor(() => expect(screen.queryByText(/Create New Profile/i)).not.toBeInTheDocument())
})
