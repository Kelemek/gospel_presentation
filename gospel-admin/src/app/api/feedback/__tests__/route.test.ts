import { NextRequest } from 'next/server'
import { POST } from '../route'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { createGitHubIssue } from '@/lib/githubFeedback'

jest.mock('@/lib/supabase/server', () => ({
  createAdminClient: jest.fn(),
  createClient: jest.fn(),
}))

jest.mock('@/lib/githubFeedback', () => {
  const actual = jest.requireActual<typeof import('@/lib/githubFeedback')>('@/lib/githubFeedback')
  return {
    ...actual,
    createGitHubIssue: jest.fn(),
  }
})

const mockCreateGitHubIssue = createGitHubIssue as jest.MockedFunction<typeof createGitHubIssue>

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

  it('returns 503 when feedback is disabled', async () => {
    ;(createAdminClient as jest.Mock).mockReturnValue(
      makeAdminMock({
        github_feedback_enabled: false,
        github_token: null,
        github_repo_owner: '',
        github_repo_name: '',
      })
    )

    const req = new NextRequest('http://localhost/api/feedback', {
      method: 'POST',
      body: JSON.stringify({ title: 'Bug', description: 'Details', type: 'bug' }),
    })
    const response = await POST(req)
    expect(response.status).toBe(503)
  })

  it('creates issue when configured', async () => {
    ;(createAdminClient as jest.Mock).mockReturnValue(
      makeAdminMock({
        github_feedback_enabled: true,
        github_token: 'ghp_test',
        github_repo_owner: 'owner',
        github_repo_name: 'repo',
      })
    )
    mockCreateGitHubIssue.mockResolvedValue({ success: true, url: 'https://github.com/o/r/issues/1' })

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
    expect(data).toEqual({ success: true, url: 'https://github.com/o/r/issues/1' })
    expect(mockCreateGitHubIssue).toHaveBeenCalled()
  })
})
