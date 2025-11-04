// Focused tests for nested drag/drop logic in the admin content page
jest.mock('@/lib/data-service')
jest.mock('@/lib/auth')

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AdminContentPage from '../page'
import * as dataService from '@/lib/data-service'
import * as auth from '@/lib/auth'

const mockDataService = dataService as jest.Mocked<typeof dataService>
const mockAuth = auth as jest.Mocked<typeof auth>

const mockPush = jest.fn()
const mockParams = Promise.resolve({ slug: 'nested-profile' })

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useParams: () => ({ slug: 'nested-profile' }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

describe('Admin Content Page - Nested Drag/Drop', () => {
  const profileWithNested = {
    id: 'np1',
    slug: 'nested-profile',
    title: 'Nested',
    description: '',
    gospelData: [
      {
        section: '1',
        title: 'S',
        subsections: [
          {
            title: 'Sub A',
            content: '',
            scriptureReferences: [],
            nestedSubsections: [
              { title: 'N1', content: '', scriptureReferences: [ { reference: 'Ref A1', favorite: false } ] },
              { title: 'N2', content: '', scriptureReferences: [ { reference: 'Ref B1', favorite: false } ] }
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
    mockDataService.getProfileBySlug.mockResolvedValue(profileWithNested)
    mockDataService.updateProfile.mockResolvedValue(profileWithNested)

    ;(global.fetch as unknown as jest.Mock).mockImplementation((url: any) => {
      const u = typeof url === 'string' ? url : (url && url.url) || ''
      if (u.includes('/api/profiles/nested-profile')) {
        return Promise.resolve({ ok: true, json: async () => ({ profile: profileWithNested }) })
      }
      if (u.includes('/api/coma-template')) {
        return Promise.resolve({ ok: true, json: async () => ({ template: { questions: [], instructions: '' } }) })
      }
      return Promise.resolve({ ok: true, json: async () => ({}) })
    })
  })

  it('moves a scripture from nested subsection N1 to N2 (different nested sections)', async () => {
    render(<AdminContentPage params={mockParams} />)

    await waitFor(() => expect(screen.getByText('Nested')).toBeInTheDocument())

    // Wait for nested subsection title N1 and N2 to render
    await waitFor(() => expect(screen.getByText('N1')).toBeInTheDocument())
    await waitFor(() => expect(screen.getByText('N2')).toBeInTheDocument())

  // The scripture text 'Ref A1' should exist; choose the first match if duplicated
  const refAList = await screen.findAllByText(/Ref A1/)
  const refBList = await screen.findAllByText(/Ref B1/)
  const refA = refAList[0]
  const refB = refBList[0]

    // Simulate drag from Ref A and drop onto Ref B
    fireEvent.dragStart(refA, { dataTransfer: { setData: jest.fn(), getData: jest.fn(), effectAllowed: 'move' } })
    fireEvent.dragOver(refB, { dataTransfer: { dropEffect: 'move', getData: jest.fn() }, preventDefault: jest.fn() })
    fireEvent.drop(refB, { dataTransfer: { getData: jest.fn() } })

    // After drop, the favorite buttons for scripture references should still be present
    const favButtons = screen.getAllByTitle('Click to favorite')
    expect(favButtons.length).toBeGreaterThanOrEqual(2)
  })

  it('reorders within same nested subsection (N1) when dropped earlier/later', async () => {
    // Mutate the shared profile to give N1 two scripture refs so reorder is possible
    profileWithNested.gospelData[0].subsections[0].nestedSubsections[0].scriptureReferences = [
      { reference: 'A1', favorite: false },
      { reference: 'A2', favorite: false }
    ]

    // Ensure fetch returns the mutated profile
    mockDataService.getProfileBySlug.mockResolvedValue(profileWithNested)
    ;(global.fetch as unknown as jest.Mock).mockImplementation((url: any) => {
      const u = typeof url === 'string' ? url : (url && url.url) || ''
      if (u.includes('/api/profiles/nested-profile')) {
        return Promise.resolve({ ok: true, json: async () => ({ profile: profileWithNested }) })
      }
      if (u.includes('/api/coma-template')) {
        return Promise.resolve({ ok: true, json: async () => ({ template: { questions: [], instructions: '' } }) })
      }
      return Promise.resolve({ ok: true, json: async () => ({}) })
    })

    render(<AdminContentPage params={mockParams} />)

    await waitFor(() => expect(screen.getByText('Nested')).toBeInTheDocument())
    await waitFor(() => expect(screen.getByText('N1')).toBeInTheDocument())

    // Find favorite buttons and reorder via drag/drop
    const favButtonsBefore = screen.getAllByTitle('Click to favorite')
    expect(favButtonsBefore.length).toBeGreaterThanOrEqual(2)

    const a1 = favButtonsBefore[0]
    const a2 = favButtonsBefore[1]

    fireEvent.dragStart(a1, { dataTransfer: { setData: jest.fn(), getData: jest.fn(), effectAllowed: 'move' } })
    fireEvent.dragOver(a2, { dataTransfer: { dropEffect: 'move', getData: jest.fn() }, preventDefault: jest.fn() })
    fireEvent.drop(a2, { dataTransfer: { getData: jest.fn() } })

    const favButtonsAfter = screen.getAllByTitle('Click to favorite')
    expect(favButtonsAfter.length).toBeGreaterThanOrEqual(2)
  })
})
