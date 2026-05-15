beforeAll(() => {
  // Mock window.confirm globally for all tests
  window.confirm = jest.fn(() => true)
})
/** Mock auth module at the very top for correct test setup */
// Mock using the TypeScript path alias so runtime imports match the mock
jest.mock('@/lib/auth', () => ({
  isAuthenticated: jest.fn(() => true),
  logout: jest.fn()
}))

import { render, screen, waitFor } from '@testing-library/react'
import AdminDashboard from '../admin/page'
import * as auth from '@/lib/auth'
const mockAuth = auth as jest.Mocked<typeof auth>

// Mock Next.js router and pathname
const mockPush = jest.fn()
const mockPathname = '/admin'
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  usePathname: () => mockPathname,
}))

const mockProfiles = {
  profiles: [
    {
      id: '1',
      slug: 'profile-with-visits',
      title: 'Profile With Visits',
      description: 'A visited profile',
      isDefault: true,
      visitCount: 5,
      lastVisited: '2025-10-24T12:00:00.000Z',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-10-23T00:00:00.000Z'
    },
    {
      id: '2',
      slug: 'never-visited-profile',
      title: 'Never Visited Profile',
      description: 'A profile that has never been visited',
      isDefault: false,
      visitCount: 0,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-10-23T00:00:00.000Z'
    },
    {
      id: '3',
      slug: 'legacy-visits-profile',
      title: 'Legacy Visits Profile',
      description: 'A profile with visits before lastVisited tracking',
      isDefault: false,
      visitCount: 3,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-10-20T00:00:00.000Z'
    }
  ]
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(auth, 'isAuthenticated').mockReturnValue(true)
  global.fetch = jest.fn().mockImplementation((input, init) => {
    const urlStr = typeof input === 'string' ? input : input.url
    if (urlStr && urlStr.includes('/api/profiles/templates') && (!init || init.method === 'GET')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ profiles: [], total: 0, totalPages: 1 }),
      })
    }
    if (urlStr && /\/api\/profiles(?:\?|$)/.test(urlStr) && (!init || init.method === 'GET')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockProfiles),
      })
    }
    if (urlStr && urlStr.endsWith('/api/profiles') && init && init.method === 'POST') {
      const body = JSON.parse(init.body as string)
      const newProfile = {
        id: String(Math.random()),
        slug: body.slug,
        title: body.title,
        description: body.description,
        isDefault: false,
        visitCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      mockProfiles.profiles.push(newProfile)
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ profile: newProfile }),
      })
    }
    if (urlStr && urlStr.match(/\/api\/profiles\/.+/) && init && init.method === 'DELETE') {
      const slug = urlStr.split('/').pop()
      mockProfiles.profiles = mockProfiles.profiles.filter((p) => p.slug !== slug)
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({}),
    })
  })
})

describe('AdminDashboard', () => {
  it('shows templates card; backup import is not on /admin; does not list assigned profiles', async () => {
    render(<AdminDashboard />)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Resource templates' })).toBeInTheDocument()
    })
    expect(screen.queryByText(/Create from backup/i)).not.toBeInTheDocument()
    expect(screen.queryByText('Profile With Visits')).not.toBeInTheDocument()
  })

  it('shows Settings link in header to /admin/settings for admins', async () => {
    render(<AdminDashboard />)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Resource templates' })).toBeInTheDocument()
    })
    const settingsLink = screen.getByRole('link', { name: 'Settings' })
    expect(settingsLink).toHaveAttribute('href', '/admin/settings')
  })

  it('should handle authentication redirect', () => {
    mockAuth.isAuthenticated.mockReturnValue(false)
    render(<AdminDashboard />)
    expect(mockAuth.isAuthenticated).toHaveBeenCalled()
  })
})
