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

describe('/api/admin/notion-feedback', () => {
  const originalToken = process.env.NOTION_FEEDBACK_TOKEN

  beforeEach(() => {
    jest.clearAllMocks()
    delete process.env.NOTION_FEEDBACK_TOKEN
    mockRequireAdminUser.mockResolvedValue({ ok: true, userId: 'admin-1', email: 'admin@example.com' })
  })

  afterAll(() => {
    if (originalToken === undefined) delete process.env.NOTION_FEEDBACK_TOKEN
    else process.env.NOTION_FEEDBACK_TOKEN = originalToken
  })

  it('GET masks token for admin', async () => {
    ;(createAdminClient as jest.Mock).mockReturnValue(
      makeAdminClientMock({
        notion_feedback_enabled: true,
        notion_token: 'secret_1234567890abcdef',
        notion_database_id: '5c7d52ea-16a5-4471-914f-cac7baf28add',
      })
    )

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.notion_token_masked).toBe('secr****cdef')
    expect(data.has_notion_token).toBe(true)
    expect(data.notion_database_id).toBe('5c7d52ea-16a5-4471-914f-cac7baf28add')
    expect(JSON.stringify(data)).not.toContain('secret_1234567890abcdef')
  })

  it('PUT rejects non-admin', async () => {
    mockRequireAdminUser.mockResolvedValue({ ok: false, status: 403, error: 'Forbidden - Admin access required' })
    const req = new NextRequest('http://localhost/api/admin/notion-feedback', {
      method: 'PUT',
      body: JSON.stringify({
        notion_feedback_enabled: true,
        notion_database_id: '5c7d52ea-16a5-4471-914f-cac7baf28add',
      }),
    })
    const response = await PUT(req)
    expect(response.status).toBe(403)
  })

  it('PUT saves settings and preserves token when blank', async () => {
    const client = makeAdminClientMock({
      notion_feedback_enabled: false,
      notion_token: 'secret_savedtoken1234',
      notion_database_id: 'old-id',
    })
    ;(createAdminClient as jest.Mock).mockReturnValue(client)

    const req = new NextRequest('http://localhost/api/admin/notion-feedback', {
      method: 'PUT',
      body: JSON.stringify({
        notion_feedback_enabled: true,
        notion_database_id: '5c7d52ea-16a5-4471-914f-cac7baf28add',
        notion_token: '',
      }),
    })
    const response = await PUT(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.has_notion_token).toBe(true)
    expect(client.from).toHaveBeenCalled()
  })
})
