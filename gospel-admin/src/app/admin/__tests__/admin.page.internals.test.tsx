import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// We will mock auth in tests to control the hoisted createClient behavior
// provided by jest.setup.js
jest.mock('@/lib/auth', () => ({
  isAuthenticated: () => false,
}))

describe('AdminPageContent internals', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('redirects to /login when not authenticated', async () => {
    // Ensure auth mock returns not authenticated (default above)
    // require the component after mocks are set
  // Import the component dynamically to avoid a fragile require-time hook dispatcher
  const { AdminPageContent } = await import('@/app/admin/page')
    render(<AdminPageContent />)

    await waitFor(() => {
      expect((global as any).__mockNextPush).toHaveBeenCalledWith('/login')
    })
  })

  it('renders admin header and new profile button when authenticated as admin', async () => {
  // Mutate the test-level auth mock (declared at file scope) so the
  // hoisted supabase client mock in jest.setup reports an authenticated user.
  // Mutate the hoisted auth mock so the hoisted createClient mock reports an authenticated user.
  // Using `require` targets the hoisted mock object created by Jest's module system.
  // eslint-disable-next-line global-require
  const authMock = require('@/lib/auth')
  authMock.isAuthenticated = () => true
  const { AdminPageContent: AdminPageContentAuthenticated } = (await import('@/app/admin/page'))

    render(<AdminPageContentAuthenticated />)

    // The default createClient mock in jest.setup returns role 'admin' for user_profiles
    await waitFor(() => expect(screen.getByText(/Profile Management/i)).toBeInTheDocument())
    // New Profile button should be present for admin
    expect(screen.getByRole('button', { name: /New Profile/i })).toBeInTheDocument()
  })

  it('shows duplicate-slug error when create profile API returns unique constraint error', async () => {
  // Mutate the test-level auth mock so the hoisted supabase client mock reports authenticated
  // eslint-disable-next-line global-require
  const authMock = require('@/lib/auth')
  authMock.isAuthenticated = () => true
  const { AdminPageContent: AdminPageContentAuth } = (await import('@/app/admin/page'))

    // Save original fetch to delegate other calls
    const originalFetch = global.fetch

    // Mock profiles index to return empty list initially
    const fetchMock = jest.fn((url: any, opts: any) => {
      if (typeof url === 'string' && url.includes('/api/profiles') && (!opts || opts.method === undefined)) {
        return Promise.resolve({ ok: true, json: async () => ({ profiles: [] }) })
      }

      // Intercept POST to /api/profiles to simulate unique constraint error
      if (typeof url === 'string' && url === '/api/profiles' && opts && opts.method === 'POST') {
        return Promise.resolve({ ok: false, json: async () => ({ error: 'profiles_slug_key' }) })
      }

      // Fallback to original
      return originalFetch(url, opts)
    })

    // @ts-ignore
    global.fetch = fetchMock

    render(<AdminPageContentAuth />)

    // Wait for header to appear
    await waitFor(() => expect(screen.getByText(/Profile Management/i)).toBeInTheDocument())

    // Open create form
    const newBtn = screen.getByRole('button', { name: /New Profile/i })
    await userEvent.click(newBtn)

    // Fill required fields
    const titleInput = screen.getByLabelText(/Profile Title \*/i)
    const descInput = screen.getByLabelText(/Description \*/i)
    await userEvent.type(titleInput, 'Test Title')
    await userEvent.type(descInput, 'desc')

    // Submit form
    const createBtn = screen.getByRole('button', { name: /Create Profile/i })
    await userEvent.click(createBtn)

    // Expect the duplicate-slug friendly message to appear
    await waitFor(() => expect(screen.getByText(/This URL slug is already in use/i)).toBeInTheDocument())

    // restore fetch
    global.fetch = originalFetch
  })

  it('cancels delete when confirm is false', async () => {
  // Mutate the test-level auth mock so the hoisted supabase client mock reports authenticated
  // eslint-disable-next-line global-require
  const authMock = require('@/lib/auth')
  authMock.isAuthenticated = () => true
  const { AdminPageContent: AdminPageContentAuth } = (await import('@/app/admin/page'))

    const originalFetch = global.fetch

    // Provide a profiles index containing one deletable profile
    const sampleProfile = {
      id: 'p1', slug: 'p1', title: 'P1', isDefault: false, isTemplate: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), visitCount: 0
    }

    const fetchMock = jest.fn((url: any, opts: any) => {
      if (typeof url === 'string' && url.includes('/api/profiles') && (!opts || opts.method === undefined)) {
        return Promise.resolve({ ok: true, json: async () => ({ profiles: [sampleProfile] }) })
      }
      return originalFetch(url, opts)
    })

    // @ts-ignore
    global.fetch = fetchMock

    // Mock confirm to return false (cancel)
    // @ts-ignore
    global.confirm = jest.fn(() => false)

    render(<AdminPageContentAuth />)

    // Wait for profile title to appear
    await waitFor(() => expect(screen.getByText(sampleProfile.title)).toBeInTheDocument())

    // Click Delete
    const deleteBtn = screen.getByRole('button', { name: /Delete/i })
    await userEvent.click(deleteBtn)

    // Since confirm returned false, no DELETE request should be made
    expect(fetchMock).toHaveBeenCalledTimes(1) // only the initial profiles fetch

    // cleanup
    global.fetch = originalFetch
    // @ts-ignore
    delete (global as any).confirm
  })

  it('creates profile successfully and refreshes list', async () => {
  const authMock = await import('@/lib/auth')
  // @ts-ignore
  authMock.isAuthenticated = () => true
  const { AdminPageContent: AdminPageContentAuth } = (await import('@/app/admin/page'))

    const originalFetch = global.fetch

    // Initial profiles index empty, POST returns created profile, subsequent GET returns new profile
  const createdProfile = { id: 'np', slug: 'np', title: 'Created Profile', isDefault: false, isTemplate: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), visitCount: 0 }

    let postCalled = false
    const fetchMock = jest.fn((url: any, opts: any) => {
      if (typeof url === 'string' && url.includes('/api/profiles') && (!opts || opts.method === undefined)) {
        // If POST was called, return list with created profile, otherwise empty
        return Promise.resolve({ ok: true, json: async () => ({ profiles: postCalled ? [createdProfile] : [] }) })
      }

      if (typeof url === 'string' && url === '/api/profiles' && opts && opts.method === 'POST') {
        postCalled = true
        return Promise.resolve({ ok: true, json: async () => ({ profile: createdProfile }) })
      }

      return originalFetch(url, opts)
    })

    // @ts-ignore
    global.fetch = fetchMock

    render(<AdminPageContentAuth />)

    // Wait for header
    await waitFor(() => expect(screen.getByText(/Profile Management/i)).toBeInTheDocument())

    // Open create form
    const newBtn = screen.getByRole('button', { name: /New Profile/i })
    await userEvent.click(newBtn)

    const titleInput = screen.getByLabelText(/Profile Title \*/i)
    const descInput = screen.getByLabelText(/Description \*/i)
  await userEvent.type(titleInput, 'Created Profile')
    await userEvent.type(descInput, 'desc')

    const createBtn = screen.getByRole('button', { name: /Create Profile/i })
    await userEvent.click(createBtn)

    // After successful creation, the new profile should appear in the list
    await waitFor(() => expect(screen.getByText(createdProfile.title)).toBeInTheDocument())

    // cleanup
    global.fetch = originalFetch
  })

  it('deletes profile when confirmed', async () => {
  // eslint-disable-next-line global-require
  const authMock = require('@/lib/auth')
  authMock.isAuthenticated = () => true
  const { AdminPageContent: AdminPageContentAuth } = (await import('@/app/admin/page'))

    const originalFetch = global.fetch

    const sampleProfile = {
      id: 'p2', slug: 'p2', title: 'P2', isDefault: false, isTemplate: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), visitCount: 0
    }

    let deleteCalled = false
    const fetchMock = jest.fn((url: any, opts: any) => {
      if (typeof url === 'string' && url.includes('/api/profiles') && (!opts || opts.method === undefined)) {
        return Promise.resolve({ ok: true, json: async () => ({ profiles: deleteCalled ? [] : [sampleProfile] }) })
      }
      if (typeof url === 'string' && url === `/api/profiles/${sampleProfile.slug}` && opts && opts.method === 'DELETE') {
        deleteCalled = true
        return Promise.resolve({ ok: true, json: async () => ({ success: true }) })
      }
      return originalFetch(url, opts)
    })

    // @ts-ignore
    global.fetch = fetchMock

    // Confirm true
    // @ts-ignore
    global.confirm = jest.fn(() => true)

    render(<AdminPageContentAuth />)

    // Wait for profile to appear
    await waitFor(() => expect(screen.getByText(sampleProfile.title)).toBeInTheDocument())

    const deleteBtn = screen.getByRole('button', { name: /Delete/i })
    await userEvent.click(deleteBtn)

    // After deletion, profile list should be refreshed and profile no longer present
    await waitFor(() => expect(screen.queryByText(sampleProfile.title)).not.toBeInTheDocument())

    // cleanup
    global.fetch = originalFetch
    // @ts-ignore
    delete (global as any).confirm
  })
})

