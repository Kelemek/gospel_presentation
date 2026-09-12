import { NextRequest } from 'next/server'
import { POST } from '../route'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { createNotionFeedbackPage } from '@/lib/notionFeedback'

jest.mock('@/lib/supabase/server', () => ({
  createAdminClient: jest.fn(),
  createClient: jest.fn(),
}))

jest.mock('@/lib/notionFeedback', () => {
  const actual = jest.requireActual<typeof import('@/lib/notionFeedback')>('@/lib/notionFeedback')
  return {
    ...actual,
    createNotionFeedbackPage: jest.fn(),
  }
})

const mockCreateNotionFeedbackPage = createNotionFeedbackPage as jest.MockedFunction<
  typeof createNotionFeedbackPage
>

function makeAdminMock(data: unknown, error: unknown = null) {
  return {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          maybeSingle: jest.fn().mockResolvedValue({ data, error }),
        })),
      })),
    })),
  }
}

describe('/api/feedback POST', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
    })
  })

  it('rejects invalid payload', async () => {
    const req = new NextRequest('http://localhost/api/feedback', {
      method: 'POST',
      body: JSON.stringify({ title: '', description: 'x', type: 'bug' }),
    })
    const response = await POST(req)
    expect(response.status).toBe(400)
  })

  it('rejects invalid email', async () => {
    const req = new NextRequest('http://localhost/api/feedback', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Bug',
        description: 'Details',
        type: 'bug',
        email: 'not-an-email',
      }),
    })
    const response = await POST(req)
    expect(response.status).toBe(400)
  })

  it('returns 503 when feedback is disabled', async () => {
    ;(createAdminClient as jest.Mock).mockReturnValue(
      makeAdminMock({
        notion_feedback_enabled: false,
        notion_token: null,
        notion_database_id: '',
      })
    )

    const req = new NextRequest('http://localhost/api/feedback', {
      method: 'POST',
      body: JSON.stringify({ title: 'Bug', description: 'Details', type: 'bug' }),
    })
    const response = await POST(req)
    expect(response.status).toBe(503)
  })

  it('creates a Notion page when configured', async () => {
    ;(createAdminClient as jest.Mock).mockReturnValue(
      makeAdminMock({
        notion_feedback_enabled: true,
        notion_token: 'secret_test',
        notion_database_id: '5c7d52ea-16a5-4471-914f-cac7baf28add',
      })
    )
    mockCreateNotionFeedbackPage.mockResolvedValue({
      success: true,
      url: 'https://www.notion.so/page',
    })

    const req = new NextRequest('http://localhost/api/feedback', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Bug',
        description: 'Details',
        type: 'bug',
        pageUrl: 'https://example.com/default',
        profileSlug: 'default',
      }),
    })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ success: true, url: 'https://www.notion.so/page' })
    expect(mockCreateNotionFeedbackPage).toHaveBeenCalled()
  })

  it('passes optional form email to the Notion page payload', async () => {
    ;(createAdminClient as jest.Mock).mockReturnValue(
      makeAdminMock({
        notion_feedback_enabled: true,
        notion_token: 'secret_test',
        notion_database_id: '5c7d52ea-16a5-4471-914f-cac7baf28add',
      })
    )
    mockCreateNotionFeedbackPage.mockResolvedValue({
      success: true,
      url: 'https://www.notion.so/page-2',
    })

    const req = new NextRequest('http://localhost/api/feedback', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Bug',
        description: 'Details',
        type: 'bug',
        email: 'Reader@Example.com',
      }),
    })
    const response = await POST(req)

    expect(response.status).toBe(200)
    expect(mockCreateNotionFeedbackPage).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        userEmail: 'reader@example.com',
      })
    )
  })

  it('posts Anonymous when form email is omitted', async () => {
    ;(createAdminClient as jest.Mock).mockReturnValue(
      makeAdminMock({
        notion_feedback_enabled: true,
        notion_token: 'secret_test',
        notion_database_id: '5c7d52ea-16a5-4471-914f-cac7baf28add',
      })
    )
    mockCreateNotionFeedbackPage.mockResolvedValue({
      success: true,
      url: 'https://www.notion.so/page-3',
    })

    const req = new NextRequest('http://localhost/api/feedback', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Bug',
        description: 'Details',
        type: 'bug',
      }),
    })
    const response = await POST(req)

    expect(response.status).toBe(200)
    expect(mockCreateNotionFeedbackPage).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        userEmail: null,
      })
    )
  })
})
