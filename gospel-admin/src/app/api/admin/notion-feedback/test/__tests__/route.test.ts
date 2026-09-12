import { NextRequest } from 'next/server'
import { POST } from '../route'
import { requireAdminUser } from '@/lib/adminAuth'
import { createAdminClient } from '@/lib/supabase/server'
import { createNotionTestRow, testNotionConnection } from '@/lib/notionFeedback'

jest.mock('@/lib/adminAuth', () => ({
  requireAdminUser: jest.fn(),
}))

jest.mock('@/lib/supabase/server', () => ({
  createAdminClient: jest.fn(),
}))

jest.mock('@/lib/notionFeedback', () => {
  const actual = jest.requireActual<typeof import('@/lib/notionFeedback')>('@/lib/notionFeedback')
  return {
    ...actual,
    testNotionConnection: jest.fn(),
    createNotionTestRow: jest.fn(),
  }
})

const mockRequireAdminUser = requireAdminUser as jest.MockedFunction<typeof requireAdminUser>
const mockTestNotionConnection = testNotionConnection as jest.MockedFunction<typeof testNotionConnection>
const mockCreateNotionTestRow = createNotionTestRow as jest.MockedFunction<typeof createNotionTestRow>

describe('/api/admin/notion-feedback/test', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireAdminUser.mockResolvedValue({ ok: true, userId: 'admin-1', email: 'admin@example.com' })
  })

  it('tests connection with posted token and database id', async () => {
    mockTestNotionConnection.mockResolvedValue({
      success: true,
      message: 'Successfully connected to Notion data source “Site issues”',
    })

    const req = new NextRequest('http://localhost/api/admin/notion-feedback/test', {
      method: 'POST',
      body: JSON.stringify({
        action: 'connection',
        notion_token: 'secret_test',
        notion_database_id: '5c7d52ea-16a5-4471-914f-cac7baf28add',
      }),
    })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(mockTestNotionConnection).toHaveBeenCalledWith(
      'secret_test',
      '5c7d52ea-16a5-4471-914f-cac7baf28add'
    )
    expect(createAdminClient).not.toHaveBeenCalled()
  })

  it('creates a test row when action is create', async () => {
    mockCreateNotionTestRow.mockResolvedValue({
      success: true,
      message: 'Created a test Site issues row',
      url: 'https://www.notion.so/test',
    })

    const req = new NextRequest('http://localhost/api/admin/notion-feedback/test', {
      method: 'POST',
      body: JSON.stringify({
        action: 'create',
        notion_token: 'secret_test',
        notion_database_id: '5c7d52ea-16a5-4471-914f-cac7baf28add',
      }),
    })
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.url).toBe('https://www.notion.so/test')
    expect(mockCreateNotionTestRow).toHaveBeenCalled()
  })
})
