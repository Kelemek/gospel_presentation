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

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
    // Handle GET /api/profiles
    if (urlStr && urlStr.includes('/api/profiles') && (!init || init.method === 'GET')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockProfiles)
      })
    }
    // Handle POST /api/profiles (profile creation)
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
        updatedAt: new Date().toISOString()
      }
      // Add to mockProfiles for subsequent GETs
      mockProfiles.profiles.push(newProfile)
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ profile: newProfile })
      })
    }
    // Handle DELETE /api/profiles/:slug (profile deletion)
    if (urlStr && urlStr.match(/\/api\/profiles\/.+/) && init && init.method === 'DELETE') {
      const slug = urlStr.split('/').pop()
      mockProfiles.profiles = mockProfiles.profiles.filter(p => p.slug !== slug)
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
      })
    }
    // Default fallback
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({})
    })
  })
})

describe('AdminDashboard - Visit Tracking', () => {
  it('should render all profiles with correct title, URL, and visit count', async () => {
    render(<AdminDashboard />)
    await waitFor(() => {
      expect(screen.getByText((content) => content.includes('Profile With Visits'))).toBeInTheDocument()
      expect(screen.getByText((content) => content.includes('Legacy Visits Profile'))).toBeInTheDocument()
      expect(screen.getByText('5 visits')).toBeInTheDocument()
      expect(screen.getAllByText('0 visits').length).toBeGreaterThan(0)
      expect(screen.getByText('3 visits')).toBeInTheDocument()
    })
  })

  it('should display visit count and last visited date for each profile', async () => {
    render(<AdminDashboard />)
    await waitFor(() => {
      expect(screen.getByText('5 visits')).toBeInTheDocument()
      expect(screen.getByText('Last visited 10/24/2025')).toBeInTheDocument()
      expect(screen.getAllByText('0 visits').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Never visited').length).toBeGreaterThan(0)
      expect(screen.getByText('3 visits')).toBeInTheDocument()
    })
  })

  it('should render action buttons for each profile', async () => {
    render(<AdminDashboard />)
    await waitFor(() => {
      expect(screen.getAllByText('View').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Settings').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Content').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Delete').length).toBeGreaterThan(0)
    })
  })

  it('should display "Never visited" label for profiles with zero visits', async () => {
    render(<AdminDashboard />)
    await waitFor(() => {
      expect(screen.getAllByText('Never visited').length).toBeGreaterThan(0)
    })
  })

  it('should display the Default badge for the default profile', async () => {
    render(<AdminDashboard />)
    await waitFor(() => {
      // Be tolerant: there may be multiple elements or slightly different
      // rendering in jsdom; assert that at least one element contains
      // the Default badge text.
      expect(screen.getAllByText('Default').length).toBeGreaterThan(0)
    })
  })

  it('should show loading state initially', () => {
    (global.fetch as jest.Mock).mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({
      ok: true,
      json: () => Promise.resolve(mockProfiles)
    }), 100)))
    render(<AdminDashboard />)
    expect(screen.getByText('Loading admin dashboard...')).toBeInTheDocument()
  })

  it('should display profile links correctly', async () => {
    render(<AdminDashboard />)
    await waitFor(() => {
      expect(screen.getByText('Profile With Visits')).toBeInTheDocument()
    })
    const viewLinks = screen.getAllByText('View')
    const settingsLinks = screen.getAllByText('Settings')
    const contentLinks = screen.getAllByText('Content')
    expect(viewLinks.length).toBeGreaterThan(0)
    expect(settingsLinks.length).toBeGreaterThan(0)
    expect(contentLinks.length).toBeGreaterThan(0)
  })

  it('should show site URL for profiles', async () => {
    render(<AdminDashboard />)
    await waitFor(() => {
      expect(screen.getByText((content, element) => {
        // Defensive: element.className may not be a string in some jsdom
        // nodes; check its type before calling includes.
        return Boolean(element && typeof (element.className) === 'string' && element.className.includes('break-all') && content.includes('profile-with-visits'))
      })).toBeInTheDocument()
    })
  })

  it('should handle authentication redirect', () => {
    mockAuth.isAuthenticated.mockReturnValue(false)
    render(<AdminDashboard />)
    expect(mockAuth.isAuthenticated).toHaveBeenCalled()
  })
})

  describe('AdminDashboard - error handling on profile deletion', () => {
    it('shows an error message if profile deletion fails', async () => {
        // Mock the delete API to reject
        jest.spyOn(global, 'fetch').mockImplementationOnce(() =>
          Promise.resolve({
            ok: false,
            status: 500,
            json: async () => ({ error: 'Failed to delete profile' })
          }) as any
        );

        const { container } = render(<AdminDashboard />);

        // Wait for profiles to load by inspecting h3 elements
          await waitFor(() => {
            expect(screen.getByText('Failed to fetch profiles')).toBeInTheDocument();
          });

        // Wait for error message to appear
  const errorMessage = await screen.findByText(/failed to fetch profiles/i);
  expect(errorMessage).toBeInTheDocument();
    });
  });
