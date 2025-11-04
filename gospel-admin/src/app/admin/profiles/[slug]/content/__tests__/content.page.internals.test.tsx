import React from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Keep child components simple so tests focus on ContentEditPage logic
jest.mock('@/components/ScriptureHoverModal', () => ({
  __esModule: true,
  default: ({ children }: any) => <span>{children}</span>
}))

// Mock AdminHeader to render the actions prop so Save button appears in tests
jest.mock('@/components/AdminHeader', () => ({
  __esModule: true,
  default: ({ title, actions }: any) => (
    <div>
      <h1>{title}</h1>
      <div data-testid="admin-actions">{actions}</div>
    </div>
  )
}))

beforeEach(() => {
  jest.clearAllMocks()
})

test('create section, add scripture, toggle favorite and save content (success)', async () => {
  // Spy on createClient to simulate authenticated user
  // eslint-disable-next-line global-require
  const clientMod = require('@/lib/supabase/client')
  jest.spyOn(clientMod, 'createClient').mockImplementation(() => ({
    auth: { getUser: async () => ({ data: { user: { id: 'u-admin', email: 'a@x.com' } } } ), signOut: async () => ({}) },
    from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { role: 'admin' } }) }) }) })
  }))

  // Mock window.confirm and alert to avoid modal dialogs
  jest.spyOn(window, 'confirm').mockImplementation(() => true)
  const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {})

  // Mock fetch handlers for coma-template, profile GET and profile PUT
  // @ts-ignore
  global.fetch = jest.fn((url, opts) => {
    if (String(url).endsWith('/api/coma-template') && (!opts || opts.method === 'GET')) {
      return Promise.resolve({ ok: true, json: async () => ({ template: { questions: ['q1','q2'], instructions: 'inst' } }) })
    }
    if (String(url).includes('/api/profiles/') && (!opts || opts.method === 'GET')) {
      return Promise.resolve({ ok: true, json: async () => ({ profile: {
        title: 'P', description: 'D', gospelData: [
          { section: '1', title: 'S1', subsections: [ { title: 'SS1', content: 'c1', scriptureReferences: [], nestedSubsections: [], questions: [] } ] }
        ]
      } }) })
    }
    // PUT save handler
    if (String(url).includes('/api/profiles/') && opts && opts.method === 'PUT') {
      return Promise.resolve({ ok: true, json: async () => ({}) })
    }
    return Promise.resolve({ ok: true, json: async () => ({}) })
  })

  const params = Promise.resolve({ slug: 's1' })
  const { ContentEditPage } = await import('../page')

  render(<ContentEditPage params={params as any} />)

  // Wait for section content to render
  await waitFor(() => expect(screen.getByText('S1')).toBeInTheDocument())

  // Click + Add Subsection -> should enable Save Changes in header actions
  const addSubBtn = screen.getByText('+ Add Subsection')
  await userEvent.click(addSubBtn)

  // After adding subsection, Save Changes appears in header actions (scope to admin actions)
  const adminActions = await screen.findByTestId('admin-actions')
  // Use role+name to match the button (combines hidden/shown spans into one accessible name)
  await waitFor(() => expect(within(adminActions).getByRole('button', { name: /Save Changes|Save/ })).toBeInTheDocument())

  // Expand add scripture UI and add a scripture reference
  const addScriptBtns = screen.getAllByText('+ Add Scripture')
  // click the first add scripture
  await userEvent.click(addScriptBtns[0])

  // Find the new input and add a value
  const input = screen.getByPlaceholderText(/e.g., John 3:16/i)
  await userEvent.type(input, 'John 3:16')
  const addBtn = screen.getAllByRole('button', { name: /Add/i }).find(b => b.textContent === 'Add')
  if (addBtn) await userEvent.click(addBtn)

  // Expect the scripture button to appear
  const scriptureBtn = await screen.findByText(/John 3:16/i)
  expect(scriptureBtn).toBeInTheDocument()

  // Toggle favorite by clicking the scripture button
  await userEvent.click(scriptureBtn)
  // After click, text may include star; assert the element still present
  expect(screen.getByText(/John 3:16/i)).toBeInTheDocument()

  // Click Save Changes in header actions (scope to admin actions)
  const saveBtn = within(adminActions).getByRole('button', { name: /Save Changes|Save/ })
  await userEvent.click(saveBtn)

  // Alert should be called for successful save
  await waitFor(() => expect(alertSpy).toHaveBeenCalled())
})
