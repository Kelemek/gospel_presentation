import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'

jest.mock('@/components/AdminErrorBoundary', () => ({ __esModule: true, default: ({ children }: any) => <div>{children}</div> }))
jest.mock('@/lib/supabase/client', () => ({
  __esModule: true,
  createClient: () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'u1', email: 'admin@example.com' } } }) },
    from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { role: 'admin' } }) }) }) })
  })
}))

beforeAll(() => {
  global.fetch = jest.fn((input: RequestInfo) => {
    const url = typeof input === 'string' ? input : input instanceof Request ? input.url : ''
    if (url.includes('/api/profiles/templates')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          profiles: [
            {
              id: 't1',
              title: 'T1',
              slug: 't1',
              isTemplate: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              visitCount: 0,
            },
          ],
          total: 1,
          page: 1,
          pageSize: 30,
          totalPages: 1,
        }),
      } as any)
    }
    return Promise.resolve({ ok: true, json: async () => ({}) } as any)
  }) as any
})

afterAll(() => {
  // @ts-expect-error mocking incompatible types
  global.fetch = undefined
})

test('TemplatesPageContent renders and lists templates', async () => {
  const { TemplatesPageContent } = await import('../page')

  render(<TemplatesPageContent />)

  await waitFor(() => expect(screen.getByRole('heading', { name: /Resource Template/i })).toBeInTheDocument())
  // The template title is rendered as a heading; target the heading specifically to avoid
  // matching the URL text which also contains the template slug.
  await waitFor(() => expect(screen.getByRole('heading', { name: /T1/i })).toBeInTheDocument())
})
