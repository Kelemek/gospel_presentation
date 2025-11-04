import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'

// Mock components used by the page to keep the test small
jest.mock('@/components/AdminHeader', () => ({ __esModule: true, default: ({ title }: any) => <div data-testid="admin-header">{title}</div> }))
jest.mock('@/components/ScriptureHoverModal', () => ({ __esModule: true, default: () => <div data-testid="scripture-hover">hover</div> }))
jest.mock('@/components/GospelSection', () => ({ __esModule: true, default: () => <div data-testid="gospel-section">section</div> }))
jest.mock('@/components/TableOfContents', () => ({ __esModule: true, default: () => <div data-testid="toc">toc</div> }))

// Mock supabase client auth check used in the page
jest.mock('@/lib/supabase/client', () => ({
  __esModule: true,
  createClient: () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'u1', email: 'admin@example.com' } } }) }
  })
}))

beforeAll(() => {
  global.fetch = jest.fn((input: RequestInfo) => {
    if (typeof input === 'string' && input.endsWith('/api/coma-template')) {
      return Promise.resolve({ ok: true, json: async () => ({ template: { questions: ['a','b'], instructions: 'inst' } }) } as any)
    }
    return Promise.resolve({ ok: true, json: async () => ({}) } as any)
  }) as any
})

afterAll(() => {
  // @ts-ignore
  global.fetch = undefined
})

test('ContentEditPage renders header and loads coma template', async () => {
  const { ContentEditPage } = await import('../page')

  render(<ContentEditPage params={Promise.resolve({ slug: 'test' })} />)

  await waitFor(() => expect(screen.getByTestId('admin-header')).toBeInTheDocument())
  expect(screen.getByTestId('admin-header')).toHaveTextContent(/Content/i)
})
