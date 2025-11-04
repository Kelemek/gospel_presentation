import React from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Keep the page small by mocking heavy child components
jest.mock('@/components/AdminHeader', () => ({ __esModule: true, default: ({ title }: any) => <div data-testid="admin-header">{title}</div> }))
jest.mock('@/components/ScriptureHoverModal', () => ({ __esModule: true, default: ({ children }: any) => <div>{children}</div> }))

// Mock supabase auth used during checkAuth
jest.mock('@/lib/supabase/client', () => ({
  __esModule: true,
  createClient: () => ({ auth: { getUser: async () => ({ data: { user: { id: 'u1', email: 'admin@example.com' } } }) } })
}))

beforeAll(() => {
  // Provide profile data for the page and a simple COMA template
  global.fetch = jest.fn((input: RequestInfo) => {
    const url = typeof input === 'string' ? input : (input as any).url || ''
    if (url.includes('/api/coma-template')) {
      return Promise.resolve({ ok: true, json: async () => ({ template: { questions: ['q1','q2'], instructions: 'inst' } }) } as any)
    }
    if (url.includes('/api/profiles/p1')) {
      return Promise.resolve({ ok: true, json: async () => ({ profile: {
        id: 'p1', title: 'P1', slug: 'p1', description: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), visitCount: 0,
        gospelData: [
          { title: 'S1', subsections: [ { title: 'Sub 1', content: 'C', scriptureReferences: [], nestedSubsections: [], questions: [] } ] }
        ]
      } }) } as any)
    }

    // Default fallback
    return Promise.resolve({ ok: true, json: async () => ({}) } as any)
  }) as any
})

afterAll(() => {
  // @ts-ignore
  global.fetch = undefined
})

test('can add, toggle favorite, and remove a scripture reference', async () => {
  const { ContentEditPage } = await import('../page')

  render(<ContentEditPage params={Promise.resolve({ slug: 'p1' })} />)

  // Wait for admin header to be present
  await waitFor(() => expect(screen.getByTestId('admin-header')).toBeInTheDocument())

  // Wait for the scripture section header to render and then open the Add Scripture input
  await screen.findByRole('heading', { name: /Scripture References/i })
  // Open the Add Scripture input (use the first + Add Scripture button)
  const addButtons = screen.getAllByText(/Add Scripture/i)
  expect(addButtons.length).toBeGreaterThan(0)
  await userEvent.click(addButtons[0])

  // Find the input and add a scripture
  const input = await screen.findByPlaceholderText(/e.g., John 3:16/i)
  const container = input.parentElement as HTMLElement
  const addBtn = within(container).getByRole('button', { name: /Add/i })

  await userEvent.type(input, 'John 3:16')
  await userEvent.click(addBtn)

  // After adding, the scripture should be rendered as a toggle button
  await waitFor(() => expect(screen.getByText(/John 3:16/i)).toBeInTheDocument())

  // Toggle favorite by clicking the scripture button; it should change to a filled star
  const scriptureButton = screen.getByText(/John 3:16/i)
  expect(scriptureButton).toBeInTheDocument()
  await userEvent.click(scriptureButton)
  await waitFor(() => expect(scriptureButton).toHaveTextContent('⭐'))

  // Remove the scripture using the remove control (title="Remove scripture")
  const removeBtn = screen.getByTitle('Remove scripture')
  await userEvent.click(removeBtn)

  await waitFor(() => expect(screen.queryByText(/John 3:16/i)).not.toBeInTheDocument())
})
