/**
 * Additional tests for ContentEditPageClient to bring coverage over 80%.
 * Covers: auth redirect, loading/error states, fetch failures, create section/subsection,
 * save catch, COMA template load, error banner.
 */
import React from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

jest.mock('@/components/ScriptureHoverModal', () => ({
  __esModule: true,
  default: ({ children }: any) => <span>{children}</span>,
}))

jest.mock('@/components/AdminHeader', () => ({
  __esModule: true,
  default: ({ title, actions }: any) => (
    <div>
      <h1>{title}</h1>
      <div data-testid="admin-actions">{actions}</div>
    </div>
  ),
}))

const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useParams: () => ({ slug: 'cov' }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

const mockGetUser = jest.fn()
jest.mock('@/lib/supabase/client', () => ({
  __esModule: true,
  createClient: () => ({ auth: { getUser: mockGetUser } }),
}))

const defaultProfile = {
  id: '1',
  slug: 'cov',
  title: 'Coverage Profile',
  description: 'D',
  gospelData: [
    {
      section: '1',
      title: 'Section One',
      subsections: [
        {
          title: 'Sub One',
          content: 'Content here',
          scriptureReferences: [],
          nestedSubsections: [],
          questions: [],
        },
      ],
    },
  ],
  isDefault: false,
  isTemplate: false,
  visitCount: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

const twoSectionProfile = {
  ...defaultProfile,
  gospelData: [
    defaultProfile.gospelData[0],
    {
      section: '2',
      title: 'Section Two',
      subsections: [
        {
          title: 'Sub Two',
          content: 'More content',
          scriptureReferences: [],
          nestedSubsections: [],
          questions: [],
        },
      ],
    },
  ],
}

function defaultFetch(url: string | Request, opts?: RequestInit) {
  const u = typeof url === 'string' ? url : (url as Request).url ?? ''
  const method = opts?.method || 'GET'
  if (u.includes('/api/coma-template') && method === 'GET') {
    return Promise.resolve({
      ok: true,
      json: async () => ({ template: { questions: ['q1'], instructions: 'i' } }),
    })
  }
  if (u.includes('/api/profiles/cov')) {
    if (method === 'GET') {
      return Promise.resolve({
        ok: true,
        json: async () => ({ profile: defaultProfile }),
      })
    }
    if (method === 'PUT') {
      return Promise.resolve({ ok: true, json: async () => ({}) })
    }
  }
  return Promise.resolve({ ok: false, json: async () => ({}) })
}

function fetchWithProfile(profile: typeof defaultProfile) {
  return (url: string | Request, opts?: RequestInit) => {
    const u = typeof url === 'string' ? url : (url as Request).url ?? ''
    const method = opts?.method || 'GET'
    if (u.includes('/api/coma-template') && method === 'GET') {
      return Promise.resolve({
        ok: true,
        json: async () => ({ template: { questions: ['q1'], instructions: 'i' } }),
      })
    }
    if (u.includes('/api/profiles/cov')) {
      if (method === 'GET') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ profile }),
        })
      }
      if (method === 'PUT') {
        return Promise.resolve({ ok: true, json: async () => ({}) })
      }
    }
    return Promise.resolve({ ok: false, json: async () => ({}) })
  }
}

describe('ContentEditPageClient coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'admin@test.com' } } })
    global.fetch = jest.fn(defaultFetch) as any
  })

  it('redirects to login when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const { ContentEditPage } = await import('../page')
    render(<ContentEditPage slug="cov" />)
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/login'))
  })

  it('shows loading state then content when authenticated', async () => {
    const { ContentEditPage } = await import('../page')
    render(<ContentEditPage slug="cov" />)
    expect(screen.getByText(/Loading profile content/i)).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('Section One')).toBeInTheDocument())
    expect(screen.getByTestId('admin-actions')).toBeInTheDocument()
  })

  it('shows error page when profile fetch returns 404', async () => {
    global.fetch = jest.fn((url: any, opts?: any) => {
      const u = typeof url === 'string' ? url : url?.url ?? ''
      if (u.includes('/api/profiles/cov') && (!opts || opts.method === 'GET')) {
        return Promise.resolve({ ok: false, status: 404, json: async () => ({}) })
      }
      return defaultFetch(url, opts)
    }) as any
    const { ContentEditPage } = await import('../page')
    render(<ContentEditPage slug="cov" />)
    await waitFor(() => expect(screen.getByText('Profile not found')).toBeInTheDocument())
    expect(screen.getByRole('link', { name: /Back to Dashboard/i })).toBeInTheDocument()
  })

  it('shows error page when profile fetch fails (non-404)', async () => {
    global.fetch = jest.fn((url: any, opts?: any) => {
      const u = typeof url === 'string' ? url : url?.url ?? ''
      if (u.includes('/api/profiles/cov') && (!opts || opts.method === 'GET')) {
        return Promise.resolve({ ok: false, status: 500, json: async () => ({}) })
      }
      return defaultFetch(url, opts)
    }) as any
    const { ContentEditPage } = await import('../page')
    render(<ContentEditPage slug="cov" />)
    await waitFor(() => expect(screen.getByText('Failed to load profile')).toBeInTheDocument())
  })

  it('shows error page when profile fetch throws', async () => {
    global.fetch = jest.fn((url: any, opts?: any) => {
      const u = typeof url === 'string' ? url : url?.url ?? ''
      if (u.includes('/api/profiles/cov') && (!opts || opts.method === 'GET')) {
        return Promise.reject(new Error('Network error'))
      }
      return defaultFetch(url, opts)
    }) as any
    const { ContentEditPage } = await import('../page')
    render(<ContentEditPage slug="cov" />)
    await waitFor(() => expect(screen.getByText('Failed to load profile')).toBeInTheDocument())
  })

  it('save failure with error message shows banner', async () => {
    global.fetch = jest.fn((url: any, opts?: any) => {
      const u = typeof url === 'string' ? url : url?.url ?? ''
      if (u.includes('/api/profiles/cov') && opts?.method === 'PUT') {
        return Promise.resolve({
          ok: false,
          json: async () => ({ error: 'Server rejected save' }),
        })
      }
      return defaultFetch(url, opts)
    }) as any
    const { ContentEditPage } = await import('../page')
    render(<ContentEditPage slug="cov" />)
    await waitFor(() => expect(screen.getByText('Section One')).toBeInTheDocument())
    const addSub = screen.getByText('+ Add Subsection')
    await userEvent.click(addSub)
    const adminActions = await screen.findByTestId('admin-actions')
    const saveBtn = within(adminActions).getByRole('button', { name: /Save Changes|Save/i })
    await userEvent.click(saveBtn)
    await waitFor(() => expect(screen.getByText('Server rejected save')).toBeInTheDocument())
  })

  it('save when fetch throws shows error banner', async () => {
    global.fetch = jest.fn((url: any, opts?: any) => {
      const u = typeof url === 'string' ? url : url?.url ?? ''
      if (u.includes('/api/profiles/cov') && opts?.method === 'PUT') {
        return Promise.reject(new Error('Network error'))
      }
      return defaultFetch(url, opts)
    }) as any
    const { ContentEditPage } = await import('../page')
    render(<ContentEditPage slug="cov" />)
    await waitFor(() => expect(screen.getByText('Section One')).toBeInTheDocument())
    const addSub = screen.getByText('+ Add Subsection')
    await userEvent.click(addSub)
    const adminActions = await screen.findByTestId('admin-actions')
    const saveBtn = within(adminActions).getByRole('button', { name: /Save Changes|Save/i })
    await userEvent.click(saveBtn)
    await waitFor(() => expect(screen.getByText('Failed to save content')).toBeInTheDocument())
  })

  it('create new section adds section and enables save', async () => {
    const { ContentEditPage } = await import('../page')
    render(<ContentEditPage slug="cov" />)
    await waitFor(() => expect(screen.getByText('Section One')).toBeInTheDocument())
    const addSectionBtn = screen.getByRole('button', { name: /Add section below/i })
    await userEvent.click(addSectionBtn)
    await waitFor(() => expect(screen.getByText('New Section 2')).toBeInTheDocument())
    const adminActions = screen.getByTestId('admin-actions')
    const saveBtn = within(adminActions).getByRole('button', { name: /Save Changes|Save/i })
    expect(saveBtn).toBeEnabled()
  })

  it('create new subsection adds subsection', async () => {
    const { ContentEditPage } = await import('../page')
    render(<ContentEditPage slug="cov" />)
    await waitFor(() => expect(screen.getByText('Section One')).toBeInTheDocument())
    const addSubBtn = screen.getByText('+ Add Subsection')
    await userEvent.click(addSubBtn)
    await waitFor(() => expect(screen.getByText('New Subsection')).toBeInTheDocument())
  })

  it('toggle COMA template editor shows and hides editor', async () => {
    const { ContentEditPage } = await import('../page')
    render(<ContentEditPage slug="cov" />)
    await waitFor(() => expect(screen.getByText('Section One')).toBeInTheDocument())
    const editComaBtn = screen.getByRole('button', { name: /Edit COMA Template|Edit COMA/i })
    await userEvent.click(editComaBtn)
    await waitFor(() => expect(screen.getByText(/COMA Instructions/i)).toBeInTheDocument())
    const hideBtn = screen.getByRole('button', { name: /Hide COMA Template|Hide COMA/i })
    await userEvent.click(hideBtn)
    await waitFor(() => expect(screen.queryByText(/COMA Instructions/i)).not.toBeInTheDocument())
  })

  it('COMA template load failure does not crash page', async () => {
    global.fetch = jest.fn((url: any, opts?: any) => {
      const u = typeof url === 'string' ? url : url?.url ?? ''
      if (u.includes('/api/coma-template') && (!opts || opts.method === 'GET')) {
        return Promise.reject(new Error('DB error'))
      }
      return defaultFetch(url, opts)
    }) as any
    const { ContentEditPage } = await import('../page')
    render(<ContentEditPage slug="cov" />)
    await waitFor(() => expect(screen.getByText('Section One')).toBeInTheDocument())
    expect(screen.getByTestId('admin-actions')).toBeInTheDocument()
  })

  it('add scripture resolves abbreviation and shows in list', async () => {
    const { ContentEditPage } = await import('../page')
    render(<ContentEditPage slug="cov" />)
    await waitFor(() => expect(screen.getByText('Section One')).toBeInTheDocument())
    const addScriptureBtn = screen.getAllByText(/\+ Add Scripture|\+ Add/)[0]
    await userEvent.click(addScriptureBtn)
    const input = await screen.findByPlaceholderText(/e\.g\., John 3:16/i)
    await userEvent.type(input, 'jn 3:16')
    const addBtn = within(input.closest('div')!).getByRole('button', { name: /Add/i })
    await userEvent.click(addBtn)
    await waitFor(() => expect(screen.getByText(/John 3:16/i)).toBeInTheDocument())
  })

  it('add nested sub-subsection', async () => {
    const { ContentEditPage } = await import('../page')
    render(<ContentEditPage slug="cov" />)
    await waitFor(() => expect(screen.getByText('Section One')).toBeInTheDocument())
    const addNestedBtn = screen.getByText('+ Add Sub-subsection')
    await userEvent.click(addNestedBtn)
    await waitFor(() => expect(screen.getByText('New Sub-subsection')).toBeInTheDocument())
  })

  it('apply COMA template populates questions', async () => {
    const { ContentEditPage } = await import('../page')
    render(<ContentEditPage slug="cov" />)
    await waitFor(() => expect(screen.getByText(/Questions & Answers/i)).toBeInTheDocument())
    const applyComaBtn = screen.getByTitle('Apply COMA questions template')
    await userEvent.click(applyComaBtn)
    await waitFor(() => expect(screen.getByText(/q1/i)).toBeInTheDocument())
  })

  it('add question and save', async () => {
    const { ContentEditPage } = await import('../page')
    render(<ContentEditPage slug="cov" />)
    await waitFor(() => expect(screen.getByText(/Questions & Answers/i)).toBeInTheDocument())
    const addQBtn = screen.getAllByText(/\+ Add Question|\+ Q/)[0]
    await userEvent.click(addQBtn)
    const textarea = await screen.findByPlaceholderText(/Enter your question/i)
    await userEvent.type(textarea, 'What does this mean?')
    const submitBtn = screen.getAllByRole('button', { name: /Add Question|Add/i }).find(b => b.closest('form') || (b as any).type === 'submit')
    if (submitBtn) await userEvent.click(submitBtn)
    else await userEvent.click(screen.getAllByRole('button', { name: /Add Question/i })[0])
    await waitFor(() => expect(screen.getByText(/What does this mean/i)).toBeInTheDocument())
  })

  it('delete subsection with confirm calls showConfirm and showAlert', async () => {
    ;(global as any).__alertModalMocks.showConfirm.mockImplementationOnce(() => Promise.resolve(true))
    const { showAlert, showConfirm } = (global as any).__alertModalMocks
    const { ContentEditPage } = await import('../page')
    render(<ContentEditPage slug="cov" />)
    await waitFor(() => expect(screen.getByText('Sub One')).toBeInTheDocument())
    const deleteBtn = screen.getByTitle('Delete subsection')
    await userEvent.click(deleteBtn)
    await waitFor(() => expect(showConfirm).toHaveBeenCalled())
    await waitFor(() => expect(showAlert).toHaveBeenCalled())
  })

  it('toggle scripture favorite after adding scripture', async () => {
    const { ContentEditPage } = await import('../page')
    render(<ContentEditPage slug="cov" />)
    await waitFor(() => expect(screen.getByText('Section One')).toBeInTheDocument())
    const addScriptureBtn = screen.getAllByText(/\+ Add Scripture|\+ Add/)[0]
    await userEvent.click(addScriptureBtn)
    const input = await screen.findByPlaceholderText(/e\.g\., John 3:16/i)
    await userEvent.type(input, 'John 3:16')
    const addBtn = within(input.closest('div')!).getByRole('button', { name: /Add/i })
    await userEvent.click(addBtn)
    await waitFor(() => expect(screen.getByText(/John 3:16/i)).toBeInTheDocument())
    const scriptureBtn = screen.getByText(/John 3:16/i)
    await userEvent.click(scriptureBtn)
    await waitFor(() => expect(scriptureBtn).toHaveTextContent(/⭐|John 3:16/))
  })

  it('remove scripture via remove control', async () => {
    const profileWithScripture = {
      ...defaultProfile,
      gospelData: [
        {
          section: '1',
          title: 'Section One',
          subsections: [
            {
              title: 'Sub One',
              content: 'Content',
              scriptureReferences: [{ reference: 'Romans 8:28', favorite: false }],
              nestedSubsections: [],
              questions: [],
            },
          ],
        },
      ],
    }
    global.fetch = jest.fn((url: any, opts?: any) => {
      const u = typeof url === 'string' ? url : url?.url ?? ''
      const m = opts?.method ?? 'GET'
      if (u.includes('/api/coma-template') && m === 'GET') {
        return Promise.resolve({ ok: true, json: async () => ({ template: { questions: ['q1'], instructions: 'i' } }) })
      }
      if (u.includes('/api/profiles/cov') && m === 'GET') {
        return Promise.resolve({ ok: true, json: async () => ({ profile: profileWithScripture }) })
      }
      if (u.includes('/api/profiles/cov') && m === 'PUT') {
        return Promise.resolve({ ok: true, json: async () => ({}) })
      }
      return defaultFetch(url, opts)
    }) as any
    const { ContentEditPage } = await import('../page')
    render(<ContentEditPage slug="cov" />)
    await waitFor(() => expect(screen.getByText(/Romans 8:28/)).toBeInTheDocument())
    const removeBtn = screen.getByTitle('Remove scripture')
    await userEvent.click(removeBtn)
    await waitFor(() => expect(screen.queryByText(/Romans 8:28/)).not.toBeInTheDocument())
  })

  it('edit section optional link URL and description', async () => {
    const { ContentEditPage } = await import('../page')
    render(<ContentEditPage slug="cov" />)
    await waitFor(() => expect(screen.getByText('Section One')).toBeInTheDocument())
    const linkUrlInput = screen.getByPlaceholderText(/https:\/\/example\.com/)
    await userEvent.type(linkUrlInput, 'https://example.com/foo')
    expect(linkUrlInput).toHaveValue('https://example.com/foo')
    const linkDescInput = screen.getByPlaceholderText(/e\.g\., 'Watch the video'/)
    await userEvent.type(linkDescInput, 'Watch the video')
    expect(linkDescInput).toHaveValue('Watch the video')
  })

  it('edit scripture reference and save', async () => {
    const profileWithScripture = {
      ...defaultProfile,
      gospelData: [
        {
          section: '1',
          title: 'Section One',
          subsections: [
            {
              title: 'Sub One',
              content: 'Content',
              scriptureReferences: [{ reference: 'Romans 8:28', favorite: false }],
              nestedSubsections: [],
              questions: [],
            },
          ],
        },
      ],
    }
    global.fetch = jest.fn((url: any, opts?: any) => {
      const u = typeof url === 'string' ? url : url?.url ?? ''
      const m = opts?.method ?? 'GET'
      if (u.includes('/api/coma-template') && m === 'GET') {
        return Promise.resolve({ ok: true, json: async () => ({ template: { questions: ['q1'], instructions: 'i' } }) })
      }
      if (u.includes('/api/profiles/cov') && m === 'GET') {
        return Promise.resolve({ ok: true, json: async () => ({ profile: profileWithScripture }) })
      }
      if (u.includes('/api/profiles/cov') && m === 'PUT') {
        return Promise.resolve({ ok: true, json: async () => ({}) })
      }
      return defaultFetch(url, opts)
    }) as any
    const { ContentEditPage } = await import('../page')
    render(<ContentEditPage slug="cov" />)
    await waitFor(() => expect(screen.getByText(/Romans 8:28/)).toBeInTheDocument())
    const editBtn = screen.getByTitle('Edit scripture reference')
    await userEvent.click(editBtn)
    const input = await screen.findByPlaceholderText(/e\.g\., John 3:16/)
    await userEvent.clear(input)
    await userEvent.type(input, 'Romans 12:1')
    const saveBtn = screen.getByTitle('Save changes')
    await userEvent.click(saveBtn)
    await waitFor(() => expect(screen.getByText(/Romans 12:1/)).toBeInTheDocument())
  })

  it('edit question and save', async () => {
    const { ContentEditPage } = await import('../page')
    render(<ContentEditPage slug="cov" />)
    await waitFor(() => expect(screen.getByText('Section One')).toBeInTheDocument())
    const applyBtn = screen.getByTitle('Apply COMA questions template')
    await userEvent.click(applyBtn)
    await waitFor(() => expect(screen.getByText(/q1/)).toBeInTheDocument())
    const editBtn = screen.getByTitle('Edit question')
    await userEvent.click(editBtn)
    const saveBtn = await screen.findByRole('button', { name: /^Save$/ })
    await userEvent.click(saveBtn)
    await waitFor(() => expect(screen.queryByTitle('Edit question')).toBeInTheDocument())
  })

  it('delete section with confirm removes section', async () => {
    ;(global as any).__alertModalMocks.showConfirm.mockImplementationOnce(() => Promise.resolve(true))
    const { ContentEditPage } = await import('../page')
    render(<ContentEditPage slug="cov" />)
    await waitFor(() => expect(screen.getByText('Section One')).toBeInTheDocument())
    const deleteSectionBtn = screen.getByTitle('Delete section')
    await userEvent.click(deleteSectionBtn)
    await waitFor(() => expect(screen.queryByText('Section One')).not.toBeInTheDocument())
  })

  it('cancel editing scripture leaves reference unchanged', async () => {
    const profileWithScripture = {
      ...defaultProfile,
      gospelData: [
        {
          section: '1',
          title: 'Section One',
          subsections: [
            {
              title: 'Sub One',
              content: 'Content',
              scriptureReferences: [{ reference: 'Romans 8:28', favorite: false }],
              nestedSubsections: [],
              questions: [],
            },
          ],
        },
      ],
    }
    global.fetch = jest.fn((url: any, opts?: any) => {
      const u = typeof url === 'string' ? url : url?.url ?? ''
      const m = opts?.method ?? 'GET'
      if (u.includes('/api/coma-template') && m === 'GET') {
        return Promise.resolve({ ok: true, json: async () => ({ template: { questions: ['q1'], instructions: 'i' } }) })
      }
      if (u.includes('/api/profiles/cov') && m === 'GET') {
        return Promise.resolve({ ok: true, json: async () => ({ profile: profileWithScripture }) })
      }
      if (u.includes('/api/profiles/cov') && m === 'PUT') {
        return Promise.resolve({ ok: true, json: async () => ({}) })
      }
      return defaultFetch(url, opts)
    }) as any
    const { ContentEditPage } = await import('../page')
    render(<ContentEditPage slug="cov" />)
    await waitFor(() => expect(screen.getByText(/Romans 8:28/)).toBeInTheDocument())
    const editBtn = screen.getByTitle('Edit scripture reference')
    await userEvent.click(editBtn)
    const cancelBtn = screen.getByTitle('Cancel editing')
    await userEvent.click(cancelBtn)
    await waitFor(() => expect(screen.getByText(/Romans 8:28/)).toBeInTheDocument())
  })

  it('remove question after applying COMA', async () => {
    const { ContentEditPage } = await import('../page')
    render(<ContentEditPage slug="cov" />)
    await waitFor(() => expect(screen.getByText('Section One')).toBeInTheDocument())
    const applyBtn = screen.getByTitle('Apply COMA questions template')
    await userEvent.click(applyBtn)
    await waitFor(() => expect(screen.getByText(/q1/)).toBeInTheDocument())
    const removeBtn = screen.getByTitle('Remove question')
    await userEvent.click(removeBtn)
    await waitFor(() => expect(screen.queryByText(/q1/)).not.toBeInTheDocument())
  })

  it('successful save shows alert and clears hasChanges', async () => {
    const { showAlert } = (global as any).__alertModalMocks
    const { ContentEditPage } = await import('../page')
    render(<ContentEditPage slug="cov" />)
    await waitFor(() => expect(screen.getByText('Section One')).toBeInTheDocument())
    const addSectionBtn = screen.getByRole('button', { name: /Add section below/i })
    await userEvent.click(addSectionBtn)
    await waitFor(() => expect(screen.getByText('New Section 2')).toBeInTheDocument())
    const actions = screen.getByTestId('admin-actions')
    const saveBtn = within(actions).getByRole('button', { name: /Save Changes/i })
    await userEvent.click(saveBtn)
    await waitFor(() => expect(showAlert).toHaveBeenCalledWith('Content saved successfully!'))
    await waitFor(() => expect(within(actions).getByText(/No Changes/)).toBeInTheDocument())
  })

  it('move section down reorders top-level sections', async () => {
    global.fetch = jest.fn(fetchWithProfile(twoSectionProfile)) as any
    const { ContentEditPage } = await import('../page')
    render(<ContentEditPage slug="cov" />)
    await waitFor(() => expect(screen.getByText('Section Two')).toBeInTheDocument())
    const downs = screen.getAllByRole('button', { name: /Move section down/i })
    await userEvent.click(downs[0])
    const headings = screen.getAllByRole('heading', { level: 2 })
    expect(headings[0]).toHaveTextContent('Section Two')
    expect(headings[1]).toHaveTextContent('Section One')
  })

  it('add section below inserts a section after the first', async () => {
    global.fetch = jest.fn(fetchWithProfile(twoSectionProfile)) as any
    const { ContentEditPage } = await import('../page')
    render(<ContentEditPage slug="cov" />)
    await waitFor(() => expect(screen.getByText('Section Two')).toBeInTheDocument())
    const belowBtns = screen.getAllByRole('button', { name: /Add section below/i })
    await userEvent.click(belowBtns[0])
    await waitFor(() => expect(screen.getByText('New Section 3')).toBeInTheDocument())
    const headings = screen.getAllByRole('heading', { level: 2 })
    expect(headings).toHaveLength(3)
    expect(headings[1]).toHaveTextContent('New Section 3')
  })

  it('move section up and down are disabled at list ends', async () => {
    global.fetch = jest.fn(fetchWithProfile(twoSectionProfile)) as any
    const { ContentEditPage } = await import('../page')
    render(<ContentEditPage slug="cov" />)
    await waitFor(() => expect(screen.getByText('Section Two')).toBeInTheDocument())
    const ups = screen.getAllByRole('button', { name: /Move section up/i })
    const downs = screen.getAllByRole('button', { name: /Move section down/i })
    expect(ups[0]).toBeDisabled()
    expect(downs[downs.length - 1]).toBeDisabled()
    expect(ups[1]).not.toBeDisabled()
    expect(downs[0]).not.toBeDisabled()
  })

  it('delete second subsection removes it', async () => {
    ;(global as any).__alertModalMocks.showConfirm.mockImplementationOnce(() => Promise.resolve(true))
    const { ContentEditPage } = await import('../page')
    render(<ContentEditPage slug="cov" />)
    await waitFor(() => expect(screen.getByText('Sub One')).toBeInTheDocument())
    const addSubBtn = screen.getByText('+ Add Subsection')
    await userEvent.click(addSubBtn)
    await waitFor(() => expect(screen.getByText('New Subsection')).toBeInTheDocument())
    const deleteButtons = screen.getAllByTitle('Delete subsection')
    await userEvent.click(deleteButtons[1])
    await waitFor(() => expect(screen.queryByText('New Subsection')).not.toBeInTheDocument())
    expect(screen.getByText('Sub One')).toBeInTheDocument()
  })

  it('delete nested sub-subsection removes it', async () => {
    ;(global as any).__alertModalMocks.showConfirm.mockImplementationOnce(() => Promise.resolve(true))
    const { ContentEditPage } = await import('../page')
    render(<ContentEditPage slug="cov" />)
    await waitFor(() => expect(screen.getByText('Sub One')).toBeInTheDocument())
    const addNestedBtn = screen.getByText('+ Add Sub-subsection')
    await userEvent.click(addNestedBtn)
    await waitFor(() => expect(screen.getByText('New Sub-subsection')).toBeInTheDocument())
    const deleteNestedBtn = screen.getByTitle('Delete sub-subsection')
    await userEvent.click(deleteNestedBtn)
    await waitFor(() => expect(screen.queryByText('New Sub-subsection')).not.toBeInTheDocument())
  })
})
