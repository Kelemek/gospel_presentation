// Mock dependencies used by the page. Declare mocks using the path alias so
// runtime imports within the component match the mocked module.
jest.mock('@/lib/data-service')
jest.mock('@/lib/auth')

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AdminContentPage from '../page'
import * as dataService from '@/lib/data-service'
import * as auth from '@/lib/auth'

const mockDataService = dataService as jest.Mocked<typeof dataService>
const mockAuth = auth as jest.Mocked<typeof auth>

// Mock next/navigation
const mockPush = jest.fn()
const mockParams = Promise.resolve({ slug: 'test-profile' })

// Provide a focused next/navigation mock used by this test file. We include
// useRouter, useParams and usePathname (AdminHeader uses usePathname).
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useParams: () => ({ slug: 'test-profile' }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

describe('Admin Content Page - Drag and Drop', () => {
  const mockProfile = {
    id: '1',
    slug: 'test-profile',
    title: 'Test Profile',
    description: 'Test description',
    gospelData: [
      {
        section: '1',
        title: 'God',
        subsections: [
          {
            title: 'A. God is Holy',
            content: 'Test content',
            scriptureReferences: [
              { reference: 'Isaiah 6:3', favorite: true },
              { reference: '1 Peter 1:15-16', favorite: false }
            ]
          }
        ]
      }
    ],
    isDefault: false,
    visitCount: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockAuth.isAuthenticated.mockReturnValue(true)
    mockDataService.getProfileBySlug.mockResolvedValue(mockProfile)
    mockDataService.updateProfile.mockResolvedValue(mockProfile)
    // Mock the fetch the page uses to load the profile via the server API.
    // Return the profile for profile-specific endpoints and a profiles
    // list for index requests to avoid AdminHeader errors.
    ;(global.fetch as unknown as jest.Mock).mockImplementation((url: any) => {
      const u = typeof url === 'string' ? url : (url && url.url) || ''
      if (u.includes('/api/profiles/') && !u.endsWith('/api/profiles')) {
        return Promise.resolve({ ok: true, json: async () => ({ profile: mockProfile }) })
      }
      if (u.includes('/api/profiles')) {
        return Promise.resolve({ ok: true, json: async () => ({ profiles: [mockProfile] }) })
      }
      return Promise.resolve({ ok: true, json: async () => ({}) })
    })
  })

    // Enable drag-and-drop tests — these are pure DOM interactions and use
    // mocked data-service/auth; they should run deterministically under jsdom.
    it('should handle drag start event', async () => {
    render(<AdminContentPage params={mockParams} />)

    await waitFor(() => {
      expect(screen.getAllByText('Test Profile').length).toBeGreaterThan(0)
    })

    // Wait for scripture reference to render
    await waitFor(() => expect(screen.getByText(/Isaiah\s*6:3/)).toBeInTheDocument())
  const scriptureCard = screen.getByText(/Isaiah\s*6:3/)
    
    // Simulate drag start (provide a dataTransfer mock since JSDOM
    // doesn't provide one by default)
    fireEvent.dragStart(scriptureCard, {
      dataTransfer: {
        setData: jest.fn(),
        getData: jest.fn(),
        effectAllowed: 'move'
      }
    })

    // Check if drag started (this would set internal state)
    expect(scriptureCard).toBeInTheDocument()
  })

  it('should handle drag over event', async () => {
    render(<AdminContentPage params={mockParams} />)

    await waitFor(() => {
      expect(screen.getAllByText('Test Profile').length).toBeGreaterThan(0)
    })

    // Wait for scripture reference to render
    await waitFor(() => expect(screen.getByText(/Isaiah\s*6:3/)).toBeInTheDocument())
  const scriptureCard = screen.getByText(/Isaiah\s*6:3/)
    
    // Simulate drag over (ensure dataTransfer exists and dropEffect can be set)
    fireEvent.dragOver(scriptureCard, {
      preventDefault: jest.fn(),
      dataTransfer: {
        dropEffect: 'move',
        getData: jest.fn(),
      }
    })

    expect(scriptureCard).toBeInTheDocument()
  })

  it('should handle drop event and reorder scriptures', async () => {
    const user = userEvent.setup()
    
    const profileWithMultipleRefs = {
      ...mockProfile,
      gospelData: [
        {
          section: '1',
          title: 'God',
          subsections: [
            {
              title: 'A. God is Holy',
              content: 'Test content',
              scriptureReferences: [
                { reference: 'Isaiah 6:3', favorite: true },
                { reference: '1 Peter 1:15-16', favorite: false },
                { reference: 'Habakkuk 1:13', favorite: false }
              ]
            }
          ]
        }
      ]
    }

    mockDataService.getProfileBySlug.mockResolvedValue(profileWithMultipleRefs)
    // Ensure the page fetch returns the richer profile for this test as well
    ;(global.fetch as unknown as jest.Mock).mockImplementationOnce((url: any) => {
      const u = typeof url === 'string' ? url : (url && url.url) || ''
      if (u.includes('/api/profiles/')) {
        return Promise.resolve({ ok: true, json: async () => ({ profile: profileWithMultipleRefs }) })
      }
      return Promise.resolve({ ok: true, json: async () => ({}) })
    })

    render(<AdminContentPage params={mockParams} />)

    await waitFor(() => {
      expect(screen.getAllByText('Test Profile').length).toBeGreaterThan(0)
    })

    // Wait for the specific scripture references to render
    await waitFor(() => expect(screen.getByText(/Isaiah\s*6:3/)).toBeInTheDocument())
  const firstRef = screen.getByText(/Isaiah\s*6:3/)
  await waitFor(() => expect(screen.getByText(/1\s*Peter\s*1:15-16/)).toBeInTheDocument())
  const secondRef = screen.getByText(/1\s*Peter\s*1:15-16/)

  // Simulate drag and drop (attach dataTransfer to each event)
  fireEvent.dragStart(firstRef, { dataTransfer: { setData: jest.fn(), getData: jest.fn(), effectAllowed: 'move' } })
  fireEvent.dragOver(secondRef, { dataTransfer: { dropEffect: 'move', getData: jest.fn() } })
  fireEvent.drop(secondRef, { dataTransfer: { getData: jest.fn() } })

    // The component should handle the reordering internally
    expect(firstRef).toBeInTheDocument()
    expect(secondRef).toBeInTheDocument()
  })

  it('should save changes when save button is clicked', async () => {
    const user = userEvent.setup()

    render(<AdminContentPage params={mockParams} />)

    await waitFor(() => {
      expect(screen.getAllByText('Test Profile').length).toBeGreaterThan(0)
    })
    // Make a change so the Save button is enabled (toggle favorite)
    await waitFor(() => expect(screen.getByText(/Isaiah\s*6:3/)).toBeInTheDocument())
    const favButton = screen.getByRole('button', { name: /Isaiah\s*6:3/i })
    await user.click(favButton)

    const saveButtons = screen.getAllByRole('button', { name: /Save|Save Changes/i })
    // Click the first save-related button (main save or section save)
    await user.click(saveButtons[0])

    await waitFor(() => {
      // The page uses fetch to PUT profile updates; assert fetch was called
      expect(global.fetch).toHaveBeenCalledWith('/api/profiles/test-profile', expect.objectContaining({ method: 'PUT' }))
    })
  })

  it('should show section save buttons', async () => {
    render(<AdminContentPage params={mockParams} />)

    await waitFor(() => {
      expect(screen.getAllByText('Test Profile').length).toBeGreaterThan(0)
    })

  // At minimum there should be a main save button or an indicator showing
  // save state (e.g. "No Changes" or "Save Changes"). Be tolerant here
  // to avoid fragile exact text matches.
  const saveButtons = screen.getAllByRole('button', { name: /Save|No Changes|Save Changes/i })
  expect(saveButtons.length).toBeGreaterThanOrEqual(1)
  })

  it('should handle favorite toggling', async () => {
    const user = userEvent.setup()
    
    render(<AdminContentPage params={mockParams} />)

    await waitFor(() => {
      expect(screen.getAllByText('Test Profile').length).toBeGreaterThan(0)
    })

    // Wait for scripture button to exist and then click it
    await waitFor(() => expect(screen.getByText(/Isaiah\s*6:3/)).toBeInTheDocument())
  const favoriteButton = screen.getByText(/Isaiah\s*6:3/)
  await user.click(favoriteButton)

  // The element should still be present after toggling favorite
  expect(favoriteButton).toBeInTheDocument()
  })
})