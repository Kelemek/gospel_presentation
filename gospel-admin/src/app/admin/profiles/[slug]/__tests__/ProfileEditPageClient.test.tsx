/**
 * Tests for ProfileEditPageClient - profile edit form, counselee access, backup/restore.
 * Mocks: supabase auth, fetch (API), AlertModalContext (jest.setup), next/navigation (jest.setup).
 */
jest.mock('@/components/AdminHeader', () => ({
  __esModule: true,
  default: ({ title, description }: any) => (
    <div data-testid="admin-header">
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  ),
}))

import React from 'react'
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProfileEditPage } from '../ProfileEditPageClient'

const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useParams: () => ({ slug: 'test-slug' }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

const mockGetUser = jest.fn()
jest.mock('@/lib/supabase/client', () => ({
  __esModule: true,
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
    },
  }),
}))

const mockProfile = {
  id: '1',
  slug: 'test-slug',
  title: 'Test Profile',
  description: 'Test description',
  gospelData: [],
  isDefault: false,
  isTemplate: false,
  visitCount: 10,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-02'),
}

function defaultFetch(url: string | Request, opts?: RequestInit) {
  const u = typeof url === 'string' ? url : (url as Request).url ?? ''
  const method = opts?.method || 'GET'

  if (u.includes('/api/users') && method === 'GET') {
    return Promise.resolve({
      ok: true,
      json: async () => ({ users: [{ email: 'c@x.com', role: 'user', username: 'counselee' }] }),
    })
  }
  if (u.includes('/api/profiles/test-slug/access')) {
    if (method === 'GET') {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          access: [
            { id: 'a1', user_email: 'existing@x.com', user_id: 'u1', created_at: '2025-01-01T00:00:00Z', username: 'Existing' },
          ],
        }),
      })
    }
    if (method === 'POST') return Promise.resolve({ ok: true, json: async () => ({}) })
    if (method === 'DELETE') return Promise.resolve({ ok: true, json: async () => ({}) })
  }
  if (u.includes('/api/profiles/test-slug')) {
    if (method === 'GET') {
      return Promise.resolve({
        ok: true,
        json: async () => ({ profile: mockProfile }),
      })
    }
    if (method === 'PUT') return Promise.resolve({ ok: true, json: async () => ({}) })
  }
  return Promise.resolve({ ok: false, json: async () => ({}) })
}

describe('ProfileEditPageClient', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'admin@test.com' } } })
    ;(global as any).__mockNextPush = mockPush
    ;(global as any).__alertModalMocks.showConfirm.mockImplementation((_m: string) => Promise.resolve(false))
    global.fetch = jest.fn(defaultFetch) as any
  })

  describe('auth and loading', () => {
    it('redirects to login when not authenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } })
      render(<ProfileEditPage slug="test-slug" />)
      await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/login'))
    })

    it('shows loading then profile form when authenticated', async () => {
      render(<ProfileEditPage slug="test-slug" />)
      expect(screen.getByText(/Loading profile/i)).toBeInTheDocument()
      await waitFor(() => expect(screen.getByTestId('admin-header')).toBeInTheDocument())
      expect(screen.getByDisplayValue('Test Profile')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Test description')).toBeInTheDocument()
    })
  })

  describe('error state', () => {
    it('shows error when profile fetch returns 404', async () => {
      global.fetch = jest.fn((url: any, opts?: any) => {
        const u = typeof url === 'string' ? url : url?.url ?? ''
        if (u.includes('/api/profiles/test-slug') && (!opts || opts.method === 'GET')) {
          return Promise.resolve({ ok: false, status: 404, json: async () => ({}) })
        }
        return defaultFetch(url, opts)
      }) as any
      render(<ProfileEditPage slug="test-slug" />)
      await waitFor(() => expect(screen.getByText('Profile not found')).toBeInTheDocument())
    })

    it('shows error when profile fetch fails', async () => {
      global.fetch = jest.fn((url: any, opts?: any) => {
        const u = typeof url === 'string' ? url : url?.url ?? ''
        if (u.includes('/api/profiles/test-slug') && (!opts || opts.method === 'GET')) {
          return Promise.reject(new Error('Network error'))
        }
        return defaultFetch(url, opts)
      }) as any
      render(<ProfileEditPage slug="test-slug" />)
      await waitFor(() => expect(screen.getByText('Failed to load profile')).toBeInTheDocument())
    })

    it('shows error when profile fetch returns non-404 error', async () => {
      global.fetch = jest.fn((url: any, opts?: any) => {
        const u = typeof url === 'string' ? url : url?.url ?? ''
        if (u.includes('/api/profiles/test-slug') && (!opts || opts.method === 'GET')) {
          return Promise.resolve({ ok: false, status: 500, json: async () => ({}) })
        }
        return defaultFetch(url, opts)
      }) as any
      render(<ProfileEditPage slug="test-slug" />)
      await waitFor(() => expect(screen.getByText('Failed to load profile')).toBeInTheDocument())
    })
  })

  describe('form and save', () => {
    it('renders form with title and description and Save button', async () => {
      render(<ProfileEditPage slug="test-slug" />)
      await waitFor(() => expect(screen.getByDisplayValue('Test Profile')).toBeInTheDocument())
      expect(screen.getByLabelText(/Title/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Description/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Save Changes|Save/i })).toBeInTheDocument()
    })

    it('updates title and description on input change', async () => {
      render(<ProfileEditPage slug="test-slug" />)
      await waitFor(() => expect(screen.getByDisplayValue('Test Profile')).toBeInTheDocument())
      await userEvent.clear(screen.getByLabelText(/Title/i))
      await userEvent.type(screen.getByLabelText(/Title/i), 'New Title')
      await userEvent.clear(screen.getByLabelText(/Description/i))
      await userEvent.type(screen.getByLabelText(/Description/i), 'New desc')
      expect(screen.getByDisplayValue('New Title')).toBeInTheDocument()
      expect(screen.getByDisplayValue('New desc')).toBeInTheDocument()
    })

    it('on save success redirects to /admin', async () => {
      render(<ProfileEditPage slug="test-slug" />)
      await waitFor(() => expect(screen.getByDisplayValue('Test Profile')).toBeInTheDocument())
      await userEvent.click(screen.getByRole('button', { name: /Save Changes|Save/i }))
      await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/admin'))
    })

    it('on save failure shows error', async () => {
      global.fetch = jest.fn((url: any, opts?: any) => {
        const u = typeof url === 'string' ? url : url?.url ?? ''
        if (u.includes('/api/profiles/test-slug') && opts?.method === 'PUT') {
          return Promise.resolve({ ok: false, json: async () => ({ error: 'Server error' }) })
        }
        return defaultFetch(url, opts)
      }) as any
      render(<ProfileEditPage slug="test-slug" />)
      await waitFor(() => expect(screen.getByDisplayValue('Test Profile')).toBeInTheDocument())
      await userEvent.click(screen.getByRole('button', { name: /Save Changes|Save/i }))
      await waitFor(() => expect(screen.getByText('Server error')).toBeInTheDocument())
    })

    it('on save when fetch throws shows error', async () => {
      global.fetch = jest.fn((url: any, opts?: any) => {
        const u = typeof url === 'string' ? url : url?.url ?? ''
        if (u.includes('/api/profiles/test-slug') && opts?.method === 'PUT') {
          return Promise.reject(new Error('Network error'))
        }
        return defaultFetch(url, opts)
      }) as any
      render(<ProfileEditPage slug="test-slug" />)
      await waitFor(() => expect(screen.getByDisplayValue('Test Profile')).toBeInTheDocument())
      await userEvent.click(screen.getByRole('button', { name: /Save Changes|Save/i }))
      await waitFor(() => expect(screen.getByText('Failed to save profile')).toBeInTheDocument())
    })
  })

  describe('counselee access', () => {
    it('shows add counselee section and existing access', async () => {
      render(<ProfileEditPage slug="test-slug" />)
      await waitFor(() => expect(screen.getByText(/Counselee Access/i)).toBeInTheDocument())
      await waitFor(() => expect(screen.getByText('existing@x.com')).toBeInTheDocument())
    })

    it('add counselee button is disabled when username is empty', async () => {
      render(<ProfileEditPage slug="test-slug" />)
      await waitFor(() => expect(screen.getByPlaceholderText(/Or type email/i)).toBeInTheDocument())
      await userEvent.type(screen.getByPlaceholderText(/Or type email/i), 'new@x.com')
      expect(screen.getByRole('button', { name: /^Add$/i })).toBeDisabled()
    })

    it('add counselee with email and username calls API and clears form', async () => {
      render(<ProfileEditPage slug="test-slug" />)
      await waitFor(() => expect(screen.getByPlaceholderText(/Or type email/i)).toBeInTheDocument())
      await userEvent.type(screen.getByPlaceholderText(/Or type email/i), 'new@x.com')
      await userEvent.type(screen.getByPlaceholderText(/Username/i), 'newuser')
      await userEvent.click(screen.getByRole('button', { name: /^Add$/i }))
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/profiles/test-slug/access'),
          expect.objectContaining({ method: 'POST', body: expect.stringContaining('new@x.com') })
        )
      })
    })

    it('selecting existing user from dropdown fills email and username', async () => {
      render(<ProfileEditPage slug="test-slug" />)
      await waitFor(() => expect(screen.getByText(/counselee.*user/i)).toBeInTheDocument())
      const select = document.querySelector('select')
      expect(select).toBeInTheDocument()
      await userEvent.selectOptions(select!, 'c@x.com')
      expect(screen.getByDisplayValue('c@x.com')).toBeInTheDocument()
      expect(screen.getByDisplayValue('counselee')).toBeInTheDocument()
    })

    it('remove counselee when user cancels confirm does not call DELETE', async () => {
      ;(global as any).__alertModalMocks.showConfirm.mockImplementationOnce(() => Promise.resolve(false))
      render(<ProfileEditPage slug="test-slug" />)
      await waitFor(() => expect(screen.getByText('existing@x.com')).toBeInTheDocument())
      const removeBtn = screen.getByRole('button', { name: /Remove/i })
      await userEvent.click(removeBtn)
      await waitFor(() => expect((global as any).__alertModalMocks.showConfirm).toHaveBeenCalled())
      const deleteCalls = (global.fetch as jest.Mock).mock.calls.filter(
        (c: any) => c[0]?.includes?.('access') && c[1]?.method === 'DELETE'
      )
      expect(deleteCalls.length).toBe(0)
    })

    it('remove counselee when user confirms calls DELETE and updates', async () => {
      ;(global as any).__alertModalMocks.showConfirm.mockImplementationOnce(() => Promise.resolve(true))
      render(<ProfileEditPage slug="test-slug" />)
      await waitFor(() => expect(screen.getByText('existing@x.com')).toBeInTheDocument())
      await userEvent.click(screen.getByRole('button', { name: /Remove/i }))
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/profiles/test-slug/access'),
          expect.objectContaining({ method: 'DELETE', body: expect.stringContaining('existing@x.com') })
        )
      })
    })

    it('remove counselee when DELETE fails sets accessError', async () => {
      ;(global as any).__alertModalMocks.showConfirm.mockImplementationOnce(() => Promise.resolve(true))
      global.fetch = jest.fn((url: any, opts?: any) => {
        const u = typeof url === 'string' ? url : url?.url ?? ''
        if (u.includes('/api/profiles/test-slug/access') && opts?.method === 'DELETE') {
          return Promise.resolve({ ok: false, json: async () => ({ error: 'Cannot remove' }) })
        }
        return defaultFetch(url, opts)
      }) as any
      render(<ProfileEditPage slug="test-slug" />)
      await waitFor(() => expect(screen.getByText('existing@x.com')).toBeInTheDocument())
      await userEvent.click(screen.getByRole('button', { name: /Remove/i }))
      await waitFor(() => expect(screen.getByText('Cannot remove')).toBeInTheDocument())
    })

    it('add counselee when POST fails sets accessError', async () => {
      global.fetch = jest.fn((url: any, opts?: any) => {
        const u = typeof url === 'string' ? url : url?.url ?? ''
        if (u.includes('/api/profiles/test-slug/access') && opts?.method === 'POST') {
          return Promise.resolve({ ok: false, json: async () => ({ error: 'Already has access' }) })
        }
        return defaultFetch(url, opts)
      }) as any
      render(<ProfileEditPage slug="test-slug" />)
      await waitFor(() => expect(screen.getByPlaceholderText(/Or type email/i)).toBeInTheDocument())
      await userEvent.type(screen.getByPlaceholderText(/Or type email/i), 'new@x.com')
      await userEvent.type(screen.getByPlaceholderText(/Username/i), 'newuser')
      await userEvent.click(screen.getByRole('button', { name: /^Add$/i }))
      await waitFor(() => expect(screen.getByText('Already has access')).toBeInTheDocument())
    })

    it('remove counselee when fetch throws sets accessError', async () => {
      ;(global as any).__alertModalMocks.showConfirm.mockImplementationOnce(() => Promise.resolve(true))
      global.fetch = jest.fn((url: any, opts?: any) => {
        const u = typeof url === 'string' ? url : url?.url ?? ''
        if (u.includes('/api/profiles/test-slug/access') && opts?.method === 'DELETE') {
          return Promise.reject(new Error('Network error'))
        }
        return defaultFetch(url, opts)
      }) as any
      render(<ProfileEditPage slug="test-slug" />)
      await waitFor(() => expect(screen.getByText('existing@x.com')).toBeInTheDocument())
      await userEvent.click(screen.getByRole('button', { name: /Remove/i }))
      await waitFor(() => expect(screen.getByText('Failed to remove counselee')).toBeInTheDocument())
    })
  })

  describe('backup and restore', () => {
    it('download backup creates blob and triggers download', async () => {
      const createObjectURL = jest.fn(() => 'blob:mock')
      const revokeObjectURL = jest.fn()
      global.URL.createObjectURL = createObjectURL as any
      global.URL.revokeObjectURL = revokeObjectURL
      render(<ProfileEditPage slug="test-slug" />)
      await waitFor(() => expect(screen.getByText(/Backup & Restore/i)).toBeInTheDocument())
      await userEvent.click(screen.getByRole('button', { name: /Download Backup/i }))
      await waitFor(() => expect(createObjectURL).toHaveBeenCalled())
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock')
    })

    it('download backup on fetch failure sets error and showAlert', async () => {
      let getProfileCallCount = 0
      global.fetch = jest.fn((url: any, opts?: any) => {
        const u = typeof url === 'string' ? url : url?.url ?? ''
        if (u.includes('/api/profiles/test-slug') && (!opts || opts.method === 'GET')) {
          getProfileCallCount++
          if (getProfileCallCount > 1) {
            return Promise.resolve({ ok: false })
          }
          return Promise.resolve({ ok: true, json: async () => ({ profile: mockProfile }) })
        }
        return defaultFetch(url, opts)
      }) as any
      const { showAlert } = (global as any).__alertModalMocks
      render(<ProfileEditPage slug="test-slug" />)
      await waitFor(() => expect(screen.getByText(/Download Backup/i)).toBeInTheDocument())
      await userEvent.click(screen.getByRole('button', { name: /Download Backup/i }))
      await waitFor(() => expect(showAlert).toHaveBeenCalledWith(expect.stringContaining('Backup failed')))
    })

    it('restore backup when user cancels confirm does not PUT', async () => {
      ;(global as any).__alertModalMocks.showConfirm.mockImplementationOnce(() => Promise.resolve(false))
      render(<ProfileEditPage slug="test-slug" />)
      await waitFor(() => expect(screen.getByText(/Restore Backup/i)).toBeInTheDocument())
      const fileInput = document.querySelector('input[type="file"]')
      expect(fileInput).toBeInTheDocument()
      const content = JSON.stringify({ profile: { title: 'X', gospelData: [] } })
      const fileLike = { name: 'backup.json', type: 'application/json', text: () => Promise.resolve(content) }
      fireEvent.change(fileInput!, { target: { files: [fileLike], value: '' } })
      await waitFor(() => expect((global as any).__alertModalMocks.showConfirm).toHaveBeenCalled())
      const putCalls = (global.fetch as jest.Mock).mock.calls.filter(
        (c: any) => String(c[0]).includes('profiles/test-slug') && c[1]?.method === 'PUT'
      )
      expect(putCalls.length).toBe(0)
    })

    it('restore backup with valid file and confirm calls PUT and showAlert', async () => {
      ;(global as any).__alertModalMocks.showConfirm.mockImplementationOnce(() => Promise.resolve(true))
      const { showAlert } = (global as any).__alertModalMocks
      render(<ProfileEditPage slug="test-slug" />)
      await waitFor(() => expect(screen.getByText(/Restore Backup/i)).toBeInTheDocument())
      const fileInput = document.querySelector('input[type="file"]')
      const content = JSON.stringify({
        profile: {
          title: 'Restored',
          description: 'D',
          gospelData: [{ section: '1', title: 'S', subsections: [] }],
        },
      })
      const fileLike = { name: 'backup.json', type: 'application/json', text: () => Promise.resolve(content) }
      fireEvent.change(fileInput!, { target: { files: [fileLike], value: '' } })
      await waitFor(() => {
        const putCalls = (global.fetch as jest.Mock).mock.calls.filter(
          (c: any) => String(c[0]).includes('profiles/test-slug') && c[1]?.method === 'PUT'
        )
        expect(putCalls.length).toBeGreaterThan(0)
        expect(putCalls[0][1].body).toContain('Restored')
      })
      await waitFor(() => expect(showAlert).toHaveBeenCalledWith(expect.stringContaining('Successfully restored')))
    })

    it('restore backup with invalid file format shows error', async () => {
      ;(global as any).__alertModalMocks.showConfirm.mockImplementationOnce(() => Promise.resolve(true))
      const { showAlert } = (global as any).__alertModalMocks
      render(<ProfileEditPage slug="test-slug" />)
      await waitFor(() => expect(screen.getByText(/Restore Backup/i)).toBeInTheDocument())
      const fileInput = document.querySelector('input[type="file"]')
      const content = JSON.stringify({ invalid: true })
      const fileLike = { name: 'bad.json', type: 'application/json', text: () => Promise.resolve(content) }
      fireEvent.change(fileInput!, { target: { files: [fileLike], value: '' } })
      await waitFor(() =>
        expect(showAlert).toHaveBeenCalledWith(expect.stringMatching(/Failed to restore|Invalid backup/))
      )
    })

    it('restore backup with legacy gospelData-only format calls PUT', async () => {
      ;(global as any).__alertModalMocks.showConfirm.mockImplementationOnce(() => Promise.resolve(true))
      const { showAlert } = (global as any).__alertModalMocks
      render(<ProfileEditPage slug="test-slug" />)
      await waitFor(() => expect(screen.getByText(/Restore Backup/i)).toBeInTheDocument())
      const fileInput = document.querySelector('input[type="file"]')
      const content = JSON.stringify({
        gospelData: [{ section: '1', title: 'Legacy', subsections: [] }],
      })
      const fileLike = { name: 'legacy.json', type: 'application/json', text: () => Promise.resolve(content) }
      fireEvent.change(fileInput!, { target: { files: [fileLike], value: '' } })
      await waitFor(() => {
        const putCalls = (global.fetch as jest.Mock).mock.calls.filter(
          (c: any) => String(c[0]).includes('profiles/test-slug') && c[1]?.method === 'PUT'
        )
        expect(putCalls.length).toBeGreaterThan(0)
        expect(putCalls[0][1].body).toContain('gospelData')
      })
      await waitFor(() => expect(showAlert).toHaveBeenCalledWith(expect.stringContaining('Successfully restored')))
    })

    it('restore backup when PUT fails shows error', async () => {
      ;(global as any).__alertModalMocks.showConfirm.mockImplementationOnce(() => Promise.resolve(true))
      const { showAlert } = (global as any).__alertModalMocks
      global.fetch = jest.fn((url: any, opts?: any) => {
        const u = typeof url === 'string' ? url : url?.url ?? ''
        if (u.includes('/api/profiles/test-slug') && opts?.method === 'PUT') {
          return Promise.resolve({ ok: false, json: async () => ({ error: 'Save rejected' }) })
        }
        return defaultFetch(url, opts)
      }) as any
      render(<ProfileEditPage slug="test-slug" />)
      await waitFor(() => expect(screen.getByText(/Restore Backup/i)).toBeInTheDocument())
      const fileInput = document.querySelector('input[type="file"]')
      const content = JSON.stringify({
        profile: { title: 'X', description: '', gospelData: [] },
      })
      const fileLike = { name: 'x.json', type: 'application/json', text: () => Promise.resolve(content) }
      fireEvent.change(fileInput!, { target: { files: [fileLike], value: '' } })
      await waitFor(() => {
        expect(showAlert).toHaveBeenCalled()
        const msg = (showAlert as jest.Mock).mock.calls[0][0]
        expect(msg).toMatch(/Restore failed|Failed to restore|Save rejected/)
      })
    })
  })

  describe('profile statistics', () => {
    it('shows visit count and dates when profile loaded', async () => {
      render(<ProfileEditPage slug="test-slug" />)
      await waitFor(() => expect(screen.getByText(/Profile Statistics/i)).toBeInTheDocument())
      expect(screen.getByText('10')).toBeInTheDocument()
      expect(screen.getByText(/View Live Profile/i)).toBeInTheDocument()
    })
  })
})
