import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

describe('AdminPageContent - additional internals', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // ensure a clean fetch mock for each test
    // tests will set global.fetch as needed
  })

  test('shows counselee view (My Profiles) when user role is counselee', async () => {
    // Use the already-loaded mocked client from jest.setup and override its
    // createClient implementation for this test (avoids resetModules which
    // can force a second React instance to be loaded).
    // eslint-disable-next-line global-require
    const clientMod = require('@/lib/supabase/client')
    jest.spyOn(clientMod, 'createClient').mockImplementation(() => ({
      auth: { getUser: async () => ({ data: { user: { id: 'u-c1' } } }) },
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: { role: 'counselee' } })
          })
        })
      }),
    }))

    // Make sure fetch for profiles list returns empty
    // @ts-ignore
    global.fetch = jest.fn((url, opts) => {
      if (url === '/api/profiles' && (!opts || opts.method === 'GET')) {
        return Promise.resolve({ ok: true, json: async () => ({ profiles: [] }) })
      }
      return Promise.resolve({ ok: true, json: async () => ({}) })
    })

    // Simulate an authenticated localStorage marker the jest.setup createClient shim can use
    ;(global as any).localStorage = {
      getItem: jest.fn((k: string) => (k === 'gospel-admin-auth' ? JSON.stringify({ isAuthenticated: true, sessionToken: 't' }) : null)),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn()
    }

  const { AdminPageContent } = await import('../page')
  render(<AdminPageContent />)

    // Expect the counselee-specific heading to appear
    const heading = await screen.findByText(/My Profiles/i)
    expect(heading).toBeInTheDocument()
  })

  test('shows duplicate-slug error when create API returns duplicate error', async () => {
    // eslint-disable-next-line global-require
    const clientMod = require('@/lib/supabase/client')
    jest.spyOn(clientMod, 'createClient').mockImplementation(() => ({
      auth: { getUser: async () => ({ data: { user: { id: 'u-admin' } } }) },
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: { role: 'admin' } })
          })
        })
      }),
    }))

    // Mock fetch: GET profiles -> empty; POST profiles -> duplicate slug error
    // @ts-ignore
    global.fetch = jest.fn((url, opts) => {
      if (url === '/api/profiles' && (!opts || opts.method === 'GET')) {
        return Promise.resolve({ ok: true, json: async () => ({ profiles: [] }) })
      }
      if (url === '/api/profiles' && opts && opts.method === 'POST') {
        return Promise.resolve({ ok: false, json: async () => ({ error: 'duplicate key value violates unique constraint' }) })
      }
      return Promise.resolve({ ok: true, json: async () => ({}) })
    })

    ;(global as any).localStorage = {
      getItem: jest.fn((k: string) => (k === 'gospel-admin-auth' ? JSON.stringify({ isAuthenticated: true, sessionToken: 't' }) : null)),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn()
    }


  const { AdminPageContent } = await import('../page')
  render(<AdminPageContent />)

  // Open create form, fill and submit to trigger POST
  const newBtn = await screen.findByRole('button', { name: /New Profile/i })
  await userEvent.click(newBtn)

  const titleInput = screen.getByLabelText(/Profile Title/i)
  const descInput = screen.getByLabelText(/Description/i)
  await userEvent.type(titleInput, 'Duplicate Title')
  await userEvent.type(descInput, 'desc')

  const createBtn = screen.getByRole('button', { name: /Create Profile/i })
  await userEvent.click(createBtn)

    // Expect duplicate-slug friendly error message to appear
    const err = await screen.findByText(/already in use/i)
    expect(err).toBeInTheDocument()
  })
})
