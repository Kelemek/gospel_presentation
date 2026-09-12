import { GET } from '../route'
import { createAdminClient } from '@/lib/supabase/server'

jest.mock('@/lib/supabase/server', () => ({
  createAdminClient: jest.fn(),
}))

describe('/api/feedback/status', () => {
  const originalToken = process.env.NOTION_FEEDBACK_TOKEN

  beforeEach(() => {
    jest.clearAllMocks()
    delete process.env.NOTION_FEEDBACK_TOKEN
  })

  afterAll(() => {
    if (originalToken === undefined) delete process.env.NOTION_FEEDBACK_TOKEN
    else process.env.NOTION_FEEDBACK_TOKEN = originalToken
  })

  it('returns enabled true when fully configured', async () => {
    ;(createAdminClient as jest.Mock).mockReturnValue({
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                notion_feedback_enabled: true,
                notion_token: 'secret_test',
                notion_database_id: '5c7d52ea-16a5-4471-914f-cac7baf28add',
              },
              error: null,
            }),
          })),
        })),
      })),
    })

    const response = await GET()
    const data = await response.json()
    expect(response.status).toBe(200)
    expect(data).toEqual({ enabled: true })
  })

  it('returns enabled false when config is incomplete', async () => {
    ;(createAdminClient as jest.Mock).mockReturnValue({
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                notion_feedback_enabled: true,
                notion_token: null,
                notion_database_id: '5c7d52ea-16a5-4471-914f-cac7baf28add',
              },
              error: null,
            }),
          })),
        })),
      })),
    })

    const response = await GET()
    const data = await response.json()
    expect(data).toEqual({ enabled: false })
  })
})
