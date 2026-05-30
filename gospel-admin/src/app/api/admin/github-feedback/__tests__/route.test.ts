import { NextRequest } from 'next/server'
import { GET, PUT } from '../route'
import { requireAdminUser } from '@/lib/adminAuth'
import { createAdminClient } from '@/lib/supabase/server'

jest.mock('@/lib/adminAuth', () => ({
  requireAdminUser: jest.fn(),
}))

jest.mock('@/lib/supabase/server', () => ({
  createAdminClient: jest.fn(),
}))

const mockRequireAdminUser = requireAdminUser as jest.MockedFunction<typeof requireAdminUser>

function makeAdminClientMock(existing: unknown, updateError: unknown = null) {
  const update = jest.fn(() => ({
    eq: jest.fn().mockResolvedValue({ error: updateError }),
  }))
  return {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          maybeSingle: jest.fn().mockResolvedValue({ data: existing, error: null }),
        })),
      })),
      update,
    })),
    update,
  }
}

describe('/api/admin/github-feedback', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireAdminUser.mockResolvedValue({ ok: true, userId: 'admin-1', email: 'admin@example.com' })
  })

  it('GET masks token for admin', async () => {
    ;(createAdminClient as jest.Mock).mockReturnValue(
      makeAdminClientMock({
        github_feedback_enabled: true,
        github_token: 'ghp_1234567890abcdef',
        github_repo_owner: 'owner',
        github_repo_name: 'repo',
      })
    )

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.github_token_masked).toBe('ghp_****cdef')
    expect(data.has_github_token).toBe(true)
    expect(data.github_repo_owner).toBe('owner')
  })

  it('PUT rejects non-admin', async () => {
    mockRequireAdminUser.mockResolvedValue({ ok: false, status: 403, error: 'Forbidden - Admin access required' })
    const req = new NextRequest('http://localhost/api/admin/github-feedback', {
      method: 'PUT',
      body: JSON.stringify({
        github_feedback_enabled: true,
        github_repo_owner: 'owner',
        github_repo_name: 'repo',
      }),
    })
    const response = await PUT(req)
    expect(response.status).toBe(403)
  })

  it('PUT saves settings and preserves token when blank', async () => {
    const client = makeAdminClientMock({
      github_feedback_enabled: false,
      github_token: 'ghp_savedtoken1234',
      github_repo_owner: 'old',
      github_repo_name: 'oldrepo',
    })
    ;(createAdminClient as jest.Mock).mockReturnValue(client)

    const req = new NextRequest('http://localhost/api/admin/github-feedback', {
      method: 'PUT',
      body: JSON.stringify({
        github_feedback_enabled: true,
        github_repo_owner: 'owner',
        github_repo_name: 'repo',
        github_token: '',
      }),
    })
    const response = await PUT(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(client.from).toHaveBeenCalled()
  })
})
