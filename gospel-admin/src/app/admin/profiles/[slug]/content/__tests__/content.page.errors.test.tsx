import React from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Keep child components simple
jest.mock('@/components/ScriptureHoverModal', () => ({
  __esModule: true,
  default: ({ children }: any) => <span>{children}</span>
}))

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

test('save failure shows alert', async () => {
  // spy createClient to simulate admin
  // eslint-disable-next-line global-require
  const clientMod = require('@/lib/supabase/client')
  jest.spyOn(clientMod, 'createClient').mockImplementation(() => ({
    auth: { getUser: async () => ({ data: { user: { id: 'u-admin', email: 'a@x.com' } } } ), signOut: async () => ({}) },
    from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { role: 'admin' } }) }) }) })
  }))

  // spy on alert to prevent modal popups; we will assert on error banner instead
  jest.spyOn(window, 'alert').mockImplementation(() => {})

  // Mock fetch: GET profile + GET coma-template, PUT returns not-ok
  // @ts-ignore
  global.fetch = jest.fn((url, opts) => {
    if (String(url).endsWith('/api/coma-template') && (!opts || opts.method === 'GET')) {
      return Promise.resolve({ ok: true, json: async () => ({ template: { questions: ['q1'], instructions: 'i' } }) })
    }
    if (String(url).includes('/api/profiles/') && (!opts || opts.method === 'GET')) {
      return Promise.resolve({ ok: true, json: async () => ({ profile: { title: 'P', description: 'D', gospelData: [ { section: '1', title: 'S1', subsections: [ { title: 'SS1', content: 'c1', scriptureReferences: [], nestedSubsections: [], questions: [] } ] } ] } }) })
    }
    // PUT save handler - simulate failure
    if (String(url).includes('/api/profiles/') && opts && opts.method === 'PUT') {
      return Promise.resolve({ ok: false, json: async () => ({ message: 'save failed' }) })
    }
    return Promise.resolve({ ok: true, json: async () => ({}) })
  })

  const params = Promise.resolve({ slug: 's1' })
  const { ContentEditPage } = await import('../page')

  render(<ContentEditPage params={params as any} />)

  // Wait for section content to render
  await waitFor(() => expect(screen.getByText('S1')).toBeInTheDocument())

  // Add a subsection to enable save
  const addSubBtn = screen.getByText('+ Add Subsection')
  await userEvent.click(addSubBtn)

  const adminActions = await screen.findByTestId('admin-actions')
  await waitFor(() => expect(within(adminActions).getByRole('button', { name: /Save Changes|Save/ })).toBeInTheDocument())

  const saveBtn = within(adminActions).getByRole('button', { name: /Save Changes|Save/ })
  await userEvent.click(saveBtn)

  // Expect error banner shown due to save failure
  await waitFor(() => expect(screen.getByText('Failed to save content')).toBeInTheDocument())
})

test('delete last subsection triggers confirm and alert', async () => {
  // spy createClient to simulate admin
  // eslint-disable-next-line global-require
  const clientMod = require('@/lib/supabase/client')
  jest.spyOn(clientMod, 'createClient').mockImplementation(() => ({
    auth: { getUser: async () => ({ data: { user: { id: 'u-admin', email: 'a@x.com' } } } ), signOut: async () => ({}) },
    from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { role: 'admin' } }) }) }) })
  }))

  const confirmSpy = jest.spyOn(window, 'confirm').mockImplementation(() => true)
  const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {})

  // Mock fetch: GET profile + GET coma-template, PUT returns ok true for saves
  // @ts-ignore
  global.fetch = jest.fn((url, opts) => {
    if (String(url).endsWith('/api/coma-template') && (!opts || opts.method === 'GET')) {
      return Promise.resolve({ ok: true, json: async () => ({ template: { questions: ['q1'], instructions: 'i' } }) })
    }
    if (String(url).includes('/api/profiles/') && (!opts || opts.method === 'GET')) {
      return Promise.resolve({ ok: true, json: async () => ({ profile: { title: 'P', description: 'D', gospelData: [ { section: '1', title: 'S1', subsections: [ { title: 'SS1', content: 'c1', scriptureReferences: [], nestedSubsections: [], questions: [] } ] } ] } }) })
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

  // The page initially has one subsection; click its Delete button
  const deleteBtns = screen.getAllByRole('button', { name: /Delete subsection|Delete/i })
  // find the button with title 'Delete subsection' (component renders title attr)
  const del = deleteBtns.find(b => b.getAttribute('title') === 'Delete subsection') || deleteBtns[0]
  await userEvent.click(del)

  // confirm was called and alert should be invoked for the deletion outcome
  await waitFor(() => expect(confirmSpy).toHaveBeenCalled())
  await waitFor(() => expect(alertSpy).toHaveBeenCalled())
})
