import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Provide a test-level supabase client mock so the page's `checkAuth` sees an authenticated user
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: async () => ({ data: { user: { id: 'u-admin' } } }),
      signOut: async () => ({ error: null })
    },
    from: (table: string) => ({
      select: () => ({
        eq: () => ({ single: async () => ({ data: table === 'user_profiles' ? { role: 'admin' } : null }) })
      })
    }),
    storage: { from: () => ({ upload: async () => ({ data: null }), download: async () => ({ data: null }) }) }
  })
}))

beforeEach(() => {
  jest.clearAllMocks()
})

test('shows no templates when API returns empty list', async () => {
  // no-op: authentication is provided by the test-level supabase client mock above

  // Mock fetch to return empty profiles list
  // @ts-ignore
  global.fetch = jest.fn((url: any, opts: any) => {
    if (typeof url === 'string' && url.includes('/api/profiles')) {
      return Promise.resolve({ ok: true, json: async () => ({ profiles: [] }) })
    }
    return Promise.resolve({ ok: true, json: async () => ({}) })
  })

  const { default: TemplatesPage } = await import('../templates/page')

  render(React.createElement(TemplatesPage))

  // Should show loading then 'No templates found' placeholder
  await waitFor(() => expect(screen.getByText(/No templates found/i)).toBeInTheDocument())
})

test('renders templates list and shows never visited marker for zero visits', async () => {
  global.localStorage.setItem('gospel-admin-auth', JSON.stringify({ isAuthenticated: true, sessionToken: 'test-user' }))

  const sampleTemplate = {
    id: 't1', slug: 't-one', title: 'Template One', description: 'Desc', isTemplate: true,
    isDefault: false, visitCount: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ownerDisplayName: 'Owner'
  }

  // @ts-ignore
  global.fetch = jest.fn((url: any, opts: any) => {
    if (typeof url === 'string' && url.includes('/api/profiles')) {
      return Promise.resolve({ ok: true, json: async () => ({ profiles: [sampleTemplate] }) })
    }
    return Promise.resolve({ ok: true, json: async () => ({}) })
  })

  const { default: TemplatesPage } = await import('../templates/page')
  render(React.createElement(TemplatesPage))

  // Header and template should render
  await waitFor(() => expect(screen.findByRole('heading', { name: /Template Profiles/i })).resolves.toBeTruthy())
  await waitFor(() => expect(screen.getByText(sampleTemplate.title)).toBeInTheDocument())

  // Since visitCount === 0, the 'Never visited' label should be present
  expect(screen.getByText(/Never visited/i)).toBeInTheDocument()

  // Test search: type a query that doesn't match -> shows 'No templates match your search'
  const searchInput = screen.getByPlaceholderText(/Search templates by name, URL, description, or owner.../i)
  await userEvent.type(searchInput, 'no-match-for-this')
  await waitFor(() => expect(screen.getByText(/No templates match your search/i)).toBeInTheDocument())
})
