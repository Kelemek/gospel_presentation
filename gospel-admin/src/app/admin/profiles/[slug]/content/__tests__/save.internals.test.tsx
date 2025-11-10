import React from 'react'
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock heavy child components to keep test focused
jest.mock('@/components/AdminHeader', () => ({ __esModule: true, default: ({ title }: any) => <div data-testid="admin-header">{title}</div> }))
jest.mock('@/components/ScriptureHoverModal', () => ({ __esModule: true, default: () => <div data-testid="scripture-hover">hover</div> }))
jest.mock('@/components/GospelSection', () => ({ __esModule: true, default: () => <div data-testid="gospel-section">section</div> }))
jest.mock('@/components/TableOfContents', () => ({ __esModule: true, default: () => <div data-testid="toc">toc</div> }))

// Mock supabase client auth used during checkAuth
jest.mock('@/lib/supabase/client', () => ({
  __esModule: true,
  createClient: () => ({ auth: { getUser: async () => ({ data: { user: { id: 'u1', email: 'admin@example.com' } } }) } })
}))

beforeAll(() => {
  global.alert = jest.fn()
  // Provide profile data for the page and a simple COMA template
  ;(global as any).fetch = jest.fn((input: RequestInfo, opts?: any) => {
    const url = typeof input === 'string' ? input : (input as any).url || ''
    if (url.includes('/api/coma-template')) {
      return Promise.resolve({ ok: true, json: async () => ({ template: { questions: ['q1','q2'], instructions: 'inst' } }) } as any)
    }
    if (url.includes('/api/profiles/p1') && (!opts || opts.method === 'GET')) {
      return Promise.resolve({ ok: true, json: async () => ({ profile: {
        id: 'p1', title: 'P1', slug: 'p1', description: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), visitCount: 0,
        gospelData: [
          { title: 'S1', subsections: [ { title: 'Sub 1', content: 'C', scriptureReferences: [], nestedSubsections: [], questions: [] } ] }
        ]
      } }) } as any)
    }

    if (url.includes('/api/profiles/p1') && opts && opts.method === 'PUT') {
      return Promise.resolve({ ok: true, json: async () => ({ success: true }) } as any)
    }

    // Default fallback
    return Promise.resolve({ ok: true, json: async () => ({}) } as any)
  }) as any
})

afterAll(() => {
  // @ts-ignore
  global.fetch = undefined
  // @ts-ignore
  global.alert = undefined
})

test('save content triggers PUT and shows success alert', async () => {
  const { ContentEditPage } = await import('../page')

  render(<ContentEditPage params={Promise.resolve({ slug: 'p1' })} />)

  // Wait for page to load
  await waitFor(() => expect(screen.getByTestId('admin-header')).toBeInTheDocument())

  // Wait for profile content to load (section title)
  await screen.findByText('S1')

  // The subsection title uses InlineEditableText, so we need to click on it to edit
  // Find the subsection titled 'Sub 1' - it's an h3 with contenteditable
  const subHeading = await screen.findByText('Sub 1')
  expect(subHeading).toBeInTheDocument()
  
  // Click on the title to make it editable
  await userEvent.click(subHeading)
  
  // Change the title to trigger hasChanges
  fireEvent.input(subHeading, { target: { textContent: 'Sub 1 Updated' } })
  
  // Blur to trigger onChange and setHasChanges
  fireEvent.blur(subHeading)

  // Save button should now show 'Save Changes' and be enabled
  const saveBtn = await screen.findByRole('button', { name: /Save Changes/i })
  expect(saveBtn).toBeEnabled()
  await userEvent.click(saveBtn)

  // Wait for PUT request to be made
  await waitFor(() => expect((global.fetch as jest.Mock).mock.calls.some(c => typeof c[0] === 'string' && c[0].includes('/api/profiles/p1') && c[1] && c[1].method === 'PUT')).toBeTruthy())

  // Confirm alert was shown
  expect(global.alert).toHaveBeenCalledWith('Content saved successfully!')
})
