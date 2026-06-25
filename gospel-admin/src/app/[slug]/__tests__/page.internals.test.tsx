import React from 'react'
import { render, screen } from '@testing-library/react'

// Mock ProfileContent
jest.mock('../ProfileContent', () => ({ __esModule: true, default: ({ profileInfo }: any) => <div data-testid="profile-content">{profileInfo.title}</div> }))
// Mock ProfilePageClient to avoid useProfileWithCache/fetch in test (tests page wiring)
jest.mock('../ProfilePageClient', () => ({
  __esModule: true,
  default: ({ slug }: { slug: string }) => (
    <div>
      <header><h1>The Gospel Presentation</h1></header>
      <div data-testid="profile-content">P1</div>
    </div>
  )
}))

// Mock the server data service - page uses getProfileMeta for lightweight check
jest.mock('@/lib/supabase-data-service', () => ({
  __esModule: true,
  getProfileMeta: async (slug: string) => {
    if (slug === 'missing') return null
    return { title: 'P1', description: 'Desc', updatedAt: new Date() }
  },
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

jest.mock('next/headers', () => ({
  headers: jest.fn(() =>
    Promise.resolve({
      get: jest.fn((name: string) => (name === 'user-agent' ? 'Mozilla/5.0' : null)),
    })
  ),
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
  // @ts-expect-error mocking incompatible types
  global.fetch = undefined
})

test('generateMetadata returns profile metadata for existing profile', async () => {
  const { generateMetadata } = await import('../page')

  const metadata = await generateMetadata({ params: Promise.resolve({ slug: 'p1' }) })

  expect(metadata.title).toBe('P1')
  expect((metadata.description as string).toLowerCase()).toContain('desc')
})

test('ProfilePage renders ProfilePageClient with slug', async () => {
  const { default: ProfilePage } = await import('../page')

  const element = await ProfilePage({ params: Promise.resolve({ slug: 'p1' }) } as any)

  render(element)

  expect(screen.getByText(/The Gospel Presentation/i)).toBeInTheDocument()
  expect(screen.getByTestId('profile-content')).toHaveTextContent(/P1/i)
})
