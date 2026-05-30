import { GET } from '../route'
import { createAdminClient } from '@/lib/supabase/server'

jest.mock('@/lib/supabase/server', () => ({
  createAdminClient: jest.fn(),
}))

describe('/api/feedback/status', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns enabled true when fully configured', async () => {
    ;(createAdminClient as jest.Mock).mockReturnValue({
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                github_feedback_enabled: true,
                github_token: 'ghp_test',
                github_repo_owner: 'owner',
                github_repo_name: 'repo',
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
                github_feedback_enabled: true,
                github_token: null,
                github_repo_owner: 'owner',
                github_repo_name: 'repo',
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
