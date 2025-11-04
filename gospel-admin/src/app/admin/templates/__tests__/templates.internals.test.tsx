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
    if (typeof input === 'string' && input.endsWith('/api/profiles')) {
      return Promise.resolve({ ok: true, json: async () => ({ profiles: [{ id: 't1', title: 'T1', slug: 't1', isTemplate: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), visitCount: 0 }] }) } as any)
    }
    return Promise.resolve({ ok: true, json: async () => ({}) } as any)
  }) as any
})

afterAll(() => {
  // @ts-ignore
  global.fetch = undefined
})

test('TemplatesPageContent renders and lists templates', async () => {
  const { TemplatesPageContent } = await import('../page')

  render(<TemplatesPageContent />)

  await waitFor(() => expect(screen.getByRole('heading', { name: /Template Profiles/i })).toBeInTheDocument())
  // The template title is rendered as a heading; target the heading specifically to avoid
  // matching the URL text which also contains the template slug.
  expect(screen.getByRole('heading', { name: /T1/i })).toBeInTheDocument()
})
