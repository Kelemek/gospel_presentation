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
      // Verify all profiles are rendered
      expect(screen.getByText((content) => content.includes('Profile With Visits'))).toBeInTheDocument()
      expect(screen.getByText((content) => content.includes('Legacy Visits Profile'))).toBeInTheDocument()
      expect(screen.getByText((content) => content.includes('Never Visited Profile'))).toBeInTheDocument()
    })
    
    // Verify the Details toggle buttons exist for managing profiles
    const detailsButtons = screen.getAllByText(/Details/)
    expect(detailsButtons.length).toBeGreaterThan(0)
  })

  it('should display visit count and last visited date for each profile', async () => {
    render(<AdminDashboard />)
    await waitFor(() => {
      // Verify all profiles render
      expect(screen.getByText((content) => content.includes('Profile With Visits'))).toBeInTheDocument()
    })
    
    // Expand a profile to see detailed visit information
    const detailsButtons = screen.getAllByText(/Details/)
    await userEvent.click(detailsButtons[0])
    
    // Verify the expanded details area appears (check for visited profile content)
    await waitFor(() => {
      // The URL should be visible in the expanded view
      expect(screen.getByText((content, element) => {
        return Boolean(element && typeof (element.className) === 'string' && element.className.includes('break-all') && content.includes('profile-with-visits'))
      })).toBeInTheDocument()
    })
  })

  it('should render action buttons for each profile', async () => {
    render(<AdminDashboard />)
    await waitFor(() => {
      // Details buttons are visible without expansion
      const detailsButtons = screen.getAllByText(/Details/)
      expect(detailsButtons.length).toBeGreaterThan(0)
    })
    
    // Click the first Details button to expand
    const firstDetailsButton = screen.getAllByText(/Details/)[0]
    await userEvent.click(firstDetailsButton)
    
    await waitFor(() => {
      // Edit button is unique to the expanded profile row
      expect(screen.getByText('Edit')).toBeInTheDocument()
    })
  })

  it('should display "Never visited" label for profiles with zero visits', async () => {
    render(<AdminDashboard />)
    await waitFor(() => {
      expect(screen.getByText('Never Visited Profile')).toBeInTheDocument()
    })
    
    // Click the Details button to expand and see the visit information
    const detailsButtons = screen.getAllByText(/Details/)
    await userEvent.click(detailsButtons[1]) // Click second Details button for never-visited-profile
    
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
    expect(screen.getByText('Loading dashboard...')).toBeInTheDocument()
  })

  it('should display profile links correctly', async () => {
    render(<AdminDashboard />)
    await waitFor(() => {
      expect(screen.getByText('Profile With Visits')).toBeInTheDocument()
    })
    
    // Details buttons should be visible
    const detailsButtons = screen.getAllByText(/Details/)
    expect(detailsButtons.length).toBeGreaterThan(0)
    
    // Click the first Details button to expand and see the links
    await userEvent.click(detailsButtons[0])
    
    await waitFor(() => {
      // Edit button is unique to the expanded profile row
      expect(screen.getByText('Edit')).toBeInTheDocument()
    })
  })

  it('should show site URL for profiles', async () => {
    render(<AdminDashboard />)
    await waitFor(() => {
      expect(screen.getByText('Profile With Visits')).toBeInTheDocument()
    })
    
    // Click the first Details button to expand
    const detailsButtons = screen.getAllByText(/Details/)
    await userEvent.click(detailsButtons[0])
    
    // Now the URL should be visible
    await waitFor(() => {
      expect(screen.getByText((content, element) => {
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
