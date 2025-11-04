import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'

// Mock the ProfileContent component (relative import used by the page)
jest.mock('../ProfileContent', () => ({ __esModule: true, default: ({ profileInfo }: any) => <div data-testid="profile-content">{profileInfo.title}</div> }))

// Mock the server data service used by getProfile when running on the server
jest.mock('@/lib/supabase-data-service', () => ({
  __esModule: true,
  getProfileBySlug: async (slug: string) => {
    if (slug === 'missing') return null
    return {
      id: 'p1',
      title: 'P1',
      slug: 'p1',
      description: 'Desc',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      visitCount: 0,
      savedAnswers: {},
      gospelData: [
        {
          title: 'Section 1',
          subsections: [
            {
              title: 'Sub 1',
              scriptureReferences: [{ reference: 'John 3:16', favorite: true }],
              nestedSubsections: []
            }
          ]
        }
      ]
    }
  }
}))

// Ensure next/navigation's notFound is available in the test environment
jest.mock('next/navigation', () => ({
  notFound: jest.fn(),
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), forward: jest.fn(), refresh: jest.fn(), prefetch: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/'
}))

beforeAll(() => {
  // Mock fetch to return profile when the page requests it via client path
  global.fetch = jest.fn((input: RequestInfo) => {
    const url = typeof input === 'string' ? input : (input as any).url || ''
    if (url.includes('/api/profiles/p1')) {
      return Promise.resolve({ ok: true, json: async () => ({ profile: {
        id: 'p1', title: 'P1', slug: 'p1', description: 'Desc', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), visitCount: 0,
        savedAnswers: {}, gospelData: [{ title: 'Section 1', subsections: [{ title: 'Sub 1', scriptureReferences: [{ reference: 'John 3:16', favorite: true }], nestedSubsections: [] }] }]
      } }) } as any)
    }
    return Promise.resolve({ ok: false, status: 404, json: async () => ({}) } as any)
  }) as any
})

afterAll(() => {
  // @ts-ignore
  global.fetch = undefined
})

test('generateMetadata returns profile metadata for existing profile', async () => {
  const { generateMetadata } = await import('../page')

  const metadata = await generateMetadata({ params: Promise.resolve({ slug: 'p1' }) })

  expect(metadata.title).toBe('P1')
  expect((metadata.description as string).toLowerCase()).toContain('desc')
})

test('ProfilePage renders header and ProfileContent', async () => {
  const { default: ProfilePage } = await import('../page')

  const element = await ProfilePage({ params: Promise.resolve({ slug: 'p1' }) } as any)

  render(element)

  await waitFor(() => expect(screen.getByText(/The Gospel Presentation/i)).toBeInTheDocument())
  expect(screen.getByTestId('profile-content')).toHaveTextContent(/P1/i)
})
