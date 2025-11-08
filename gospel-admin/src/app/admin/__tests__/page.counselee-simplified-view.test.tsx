import { render, screen } from '@testing-library/react'

describe('AdminPage - Counselee Simplified View', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('counselee view shows only title, description, and view button (hides URL, owner, counselees, and details)', async () => {
    const clientMod = require('@/lib/supabase/client')
    jest.spyOn(clientMod, 'createClient').mockImplementation(() => ({
      auth: { 
        getUser: async () => ({ data: { user: { id: 'counselee-user-123' } } }),
        getSession: async () => ({ data: { session: { user: { id: 'counselee-user-123' }, expires_at: Math.floor(Date.now() / 1000) + 3600 } } })
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: { role: 'counselee' } })
          }),
          order: () => Promise.resolve({ data: [], error: null })
        })
      }),
    }))

    const testProfile = {
      id: 'prof-123',
      slug: 'test-profile',
      title: 'My Gospel Profile',
      description: 'This is a test profile description',
      ownerDisplayName: 'Admin User',
      counseleeEmails: ['counselee1@example.com', 'counselee2@example.com'],
      visitCount: 42,
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-20T15:30:00Z',
      lastVisited: '2024-01-22T08:45:00Z',
      isDefault: false,
      isTemplate: false
    }

    global.fetch = jest.fn((url: string) => {
      if (url === '/api/profiles') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ profiles: [testProfile] })
        })
      }
      return Promise.resolve({ ok: true, json: async () => ({}) })
    }) as jest.Mock

    ;(global as any).localStorage = {
      getItem: jest.fn((k: string) => (k === 'gospel-admin-auth' ? JSON.stringify({ isAuthenticated: true }) : null)),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn()
    }

    const { AdminPageContent } = await import('../page')
    render(<AdminPageContent />)

    // Should show title and description
    expect(await screen.findByText('My Gospel Profile')).toBeInTheDocument()
    expect(screen.getByText('This is a test profile description')).toBeInTheDocument()

    // Should show "My Profiles" heading for counselees
    expect(screen.getByText(/My Profiles/i)).toBeInTheDocument()

    // Should show View button (for the profile, not the "View Site" link in header)
    const viewLinks = screen.getAllByRole('link', { name: /View/i })
    const profileViewLink = viewLinks.find(link => link.getAttribute('href') === '/test-profile')
    expect(profileViewLink).toBeInTheDocument()

    // Should NOT show URL line
    expect(screen.queryByText(/URL:/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/test-profile/i)).not.toBeInTheDocument()

    // Should NOT show Owner line
    expect(screen.queryByText(/Owner:/i)).not.toBeInTheDocument()
    expect(screen.queryByText('Admin User')).not.toBeInTheDocument()

    // Should NOT show Counselees line
    expect(screen.queryByText(/Counselees:/i)).not.toBeInTheDocument()
    expect(screen.queryByText('counselee1@example.com')).not.toBeInTheDocument()

    // Should NOT show visit count and dates
    expect(screen.queryByText(/42 visits/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Created/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Updated/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Last visited/i)).not.toBeInTheDocument()

    // Should NOT show management buttons
    expect(screen.queryByRole('button', { name: /Share/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Settings/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Edit/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Delete/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Download Backup/i })).not.toBeInTheDocument()
  })

  test('admin view shows all fields including URL, owner, counselees, and details', async () => {
    const clientMod = require('@/lib/supabase/client')
    jest.spyOn(clientMod, 'createClient').mockImplementation(() => ({
      auth: { 
        getUser: async () => ({ data: { user: { id: 'admin-user-456' } } }),
        getSession: async () => ({ data: { session: { user: { id: 'admin-user-456' }, expires_at: Math.floor(Date.now() / 1000) + 3600 } } })
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: { role: 'admin' } })
          }),
          order: () => Promise.resolve({ data: [], error: null })
        })
      }),
    }))

    const testProfile = {
      id: 'prof-456',
      slug: 'admin-profile',
      title: 'Admin Gospel Profile',
      description: 'Admin test profile',
      ownerDisplayName: 'Admin User',
      counseleeEmails: ['user1@example.com'],
      visitCount: 15,
      createdAt: '2024-02-01T10:00:00Z',
      updatedAt: '2024-02-10T15:30:00Z',
      lastVisited: null,
      isDefault: false,
      isTemplate: false,
      createdBy: 'admin-user-456'
    }

    global.fetch = jest.fn((url: string) => {
      if (url === '/api/profiles') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ profiles: [testProfile] })
        })
      }
      return Promise.resolve({ ok: true, json: async () => ({}) })
    }) as jest.Mock

    ;(global as any).localStorage = {
      getItem: jest.fn((k: string) => (k === 'gospel-admin-auth' ? JSON.stringify({ isAuthenticated: true }) : null)),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn()
    }

    const { AdminPageContent } = await import('../page')
    render(<AdminPageContent />)

    // Should show title and description
    expect(await screen.findByText('Admin Gospel Profile')).toBeInTheDocument()
    expect(screen.getByText(/Admin test profile/i)).toBeInTheDocument()

    // Should show "Profile Management" heading for admins
    expect(screen.getByText(/Profile Management/i)).toBeInTheDocument()

    // Should show URL line
    expect(screen.getByText(/URL:/i)).toBeInTheDocument()
    expect(screen.getByText(/admin-profile/i)).toBeInTheDocument()

    // Should show Owner line
    expect(screen.getByText(/Owner:/i)).toBeInTheDocument()
    expect(screen.getByText('Admin User')).toBeInTheDocument()

    // Should show Counselees line
    expect(screen.getByText(/Counselees:/i)).toBeInTheDocument()
    expect(screen.getByText(/user1@example.com/i)).toBeInTheDocument()

    // Should show visit count and dates
    expect(screen.getByText(/15 visits/i)).toBeInTheDocument()
    expect(screen.getByText(/Created/i)).toBeInTheDocument()
    expect(screen.getByText(/Updated/i)).toBeInTheDocument()
    // lastVisited is null in test data, so we won't see a "Last visited" date

    // Should show management buttons for admin-owned profile
    expect(screen.getByRole('button', { name: /Share/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Settings/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Edit/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Delete/i })).toBeInTheDocument()
  })

  test('counselor view shows all fields including URL, owner, counselees, and details', async () => {
    const clientMod = require('@/lib/supabase/client')
    jest.spyOn(clientMod, 'createClient').mockImplementation(() => ({
      auth: { 
        getUser: async () => ({ data: { user: { id: 'counselor-user-789' } } }),
        getSession: async () => ({ data: { session: { user: { id: 'counselor-user-789' }, expires_at: Math.floor(Date.now() / 1000) + 3600 } } })
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: { role: 'counselor' } })
          }),
          order: () => Promise.resolve({ data: [], error: null })
        })
      }),
    }))

    const testProfile = {
      id: 'prof-789',
      slug: 'counselor-profile',
      title: 'Counselor Gospel Profile',
      description: 'Counselor test profile',
      ownerDisplayName: 'Counselor User',
      counseleeEmails: ['student@example.com'],
      visitCount: 8,
      createdAt: '2024-03-01T10:00:00Z',
      updatedAt: '2024-03-05T15:30:00Z',
      lastVisited: '2024-03-06T12:00:00Z',
      isDefault: false,
      isTemplate: false,
      createdBy: 'counselor-user-789'
    }

    global.fetch = jest.fn((url: string) => {
      if (url === '/api/profiles') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ profiles: [testProfile] })
        })
      }
      return Promise.resolve({ ok: true, json: async () => ({}) })
    }) as jest.Mock

    ;(global as any).localStorage = {
      getItem: jest.fn((k: string) => (k === 'gospel-admin-auth' ? JSON.stringify({ isAuthenticated: true }) : null)),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn()
    }

    const { AdminPageContent } = await import('../page')
    render(<AdminPageContent />)

    // Should show title and description
    expect(await screen.findByText('Counselor Gospel Profile')).toBeInTheDocument()
    expect(screen.getByText(/Counselor test profile/i)).toBeInTheDocument()

    // Should show "Profile Management" heading for counselors
    expect(screen.getByText(/Profile Management/i)).toBeInTheDocument()

    // Should show URL line
    expect(screen.getByText(/URL:/i)).toBeInTheDocument()
    expect(screen.getByText(/counselor-profile/i)).toBeInTheDocument()

    // Should show Owner line
    expect(screen.getByText(/Owner:/i)).toBeInTheDocument()
    expect(screen.getByText('Counselor User')).toBeInTheDocument()

    // Should show Counselees line
    expect(screen.getByText(/Counselees:/i)).toBeInTheDocument()
    expect(screen.getByText(/student@example.com/i)).toBeInTheDocument()

    // Should show visit count and dates
    expect(screen.getByText(/8 visits/i)).toBeInTheDocument()
    expect(screen.getByText(/Created/i)).toBeInTheDocument()
    expect(screen.getByText(/Updated/i)).toBeInTheDocument()
    expect(screen.getByText(/Last visited/i)).toBeInTheDocument()

    // Should show management buttons for counselor-owned profile
    expect(screen.getByRole('button', { name: /Share/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Settings/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Edit/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Delete/i })).toBeInTheDocument()
  })
})
