import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'

// Mock AdminHeader and ErrorBoundary to simplify rendering
jest.mock('@/components/AdminHeader', () => ({
  __esModule: true,
  default: ({ title }: any) => <div data-testid="admin-header">{title}</div>
}))
jest.mock('@/components/AdminErrorBoundary', () => ({
  __esModule: true,
  default: ({ children }: any) => <div>{children}</div>
}))

// Mock supabase client with auth user and profile role
jest.mock('@/lib/supabase/client', () => ({
  __esModule: true,
  createClient: () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'u1', email: 'admin@example.com' } } }) },
    from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { role: 'admin' } } ) }) }) })
  })
}))

beforeAll(() => {
  global.fetch = jest.fn((input: RequestInfo) => {
    if (typeof input === 'string' && input.endsWith('/api/profiles')) {
      return Promise.resolve({ ok: true, json: async () => ({ profiles: [{ id: 'p1', title: 'P1', slug: 'p1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), visitCount: 0 }] }) } as any)
    }
    return Promise.resolve({ ok: true, json: async () => ({}) } as any)
  }) as any
})

afterAll(() => {
  // @ts-ignore
  global.fetch = undefined
})

test('AdminPageContent renders management heading for admin user', async () => {
  const { AdminPageContent } = await import('../admin/page')

  render(<AdminPageContent />)

  await waitFor(() => expect(screen.getByTestId('admin-header')).toBeInTheDocument())
  expect(screen.getByText(/Profile Management/i)).toBeInTheDocument()
})
