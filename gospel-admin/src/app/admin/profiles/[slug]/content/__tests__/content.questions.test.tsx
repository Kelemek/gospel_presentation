import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Keep the page small by mocking heavy child components
jest.mock('@/components/AdminHeader', () => ({ __esModule: true, default: ({ title }: any) => <div data-testid="admin-header">{title}</div> }))
jest.mock('@/components/ScriptureHoverModal', () => ({ __esModule: true, default: ({ children }: any) => <div>{children}</div> }))
// Mock the RichTextEditor used in admin pages to a simple textarea so tests can
// interact with it synchronously (TipTap/ProseMirror requires browser APIs
// that JSDOM doesn't fully implement).
jest.mock('@/components/RichTextEditor', () => ({ __esModule: true, default: ({ value, onChange, placeholder }: any) => (
  <textarea placeholder={placeholder} value={value} onChange={(e: any) => onChange(e.target.value)} />
) }))

// Mock supabase auth used during checkAuth
jest.mock('@/lib/supabase/client', () => ({
  __esModule: true,
  createClient: () => ({ auth: { getUser: async () => ({ data: { user: { id: 'u1', email: 'admin@example.com' } } }) } })
}))

beforeAll(() => {
  // Provide profile data for the page and a COMA template with full text
  global.fetch = jest.fn((input: RequestInfo) => {
    const url = typeof input === 'string' ? input : (input as any).url || ''
    if (url.includes('/api/coma-template')) {
      return Promise.resolve({ ok: true, json: async () => ({ template: { questions: [
        'Context: Who wrote it?',
        'Observation: What stands out?'
      ], instructions: 'inst' } }) } as any)
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

test('apply COMA template populates questions and adding a question works', async () => {
  const { ContentEditPage } = await import('../page')

  render(<ContentEditPage params={Promise.resolve({ slug: 'p1' })} />)

  await waitFor(() => expect(screen.getByTestId('admin-header')).toBeInTheDocument())

  // Wait for the Questions & Answers heading to ensure profile content has loaded
  await screen.findByRole('heading', { name: /Questions & Answers/i })

  // Click the Apply COMA button (it includes a descriptive title attribute)
  const applyBtn = screen.getByTitle('Apply COMA questions template')
  await userEvent.click(applyBtn)

  // After applying COMA, the COMA questions (e.g. 'Context: Who wrote it?') should appear
  await waitFor(() => expect(screen.getByText(/Context: Who wrote it\\?/i)).toBeInTheDocument())

  // Now test adding a custom question via the + Add Question flow
  const addQuestionButtons = screen.getAllByText(/Add Question/i)
  expect(addQuestionButtons.length).toBeGreaterThan(0)
  await userEvent.click(addQuestionButtons[0])

  // The RichTextEditor is mocked to a textarea in tests, so we can find it
  // by its placeholder and type into it.
  const textarea = await screen.findByPlaceholderText(/Enter your question/i)
  await userEvent.type(textarea, 'What does this passage mean?')

  const submit = screen.getAllByRole('button', { name: /Add Question/i })
  // Click the first add question submit button (within the open form)
  await userEvent.click(submit[0])

  // The newly added question should appear in the document
  await waitFor(() => expect(screen.getByText(/What does this passage mean\?/i)).toBeInTheDocument())
})
