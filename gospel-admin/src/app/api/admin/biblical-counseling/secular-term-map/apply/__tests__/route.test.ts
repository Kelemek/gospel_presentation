import { NextRequest } from 'next/server'
import { POST } from '../route'
import { requireAdminUser } from '@/lib/adminAuth'
import {
  applySecularTermMapToProfile,
  loadSecularTermMapFromSupabase,
} from '@/lib/biblicalCounseling/secularTermMapDb'
import { BIBLICAL_COUNSELING_SECULAR_MAP_TEST_SLUG } from '@/lib/biblicalCounseling/biblicalCounselingReference'

jest.mock('@/lib/adminAuth', () => ({
  requireAdminUser: jest.fn(),
}))

jest.mock('@/lib/biblicalCounseling/secularTermMapDb', () => ({
  loadSecularTermMapFromSupabase: jest.fn(),
  applySecularTermMapToProfile: jest.fn(),
}))

const mockRequireAdminUser = requireAdminUser as jest.MockedFunction<typeof requireAdminUser>
const mockLoadMap = loadSecularTermMapFromSupabase as jest.MockedFunction<
  typeof loadSecularTermMapFromSupabase
>
const mockApply = applySecularTermMapToProfile as jest.MockedFunction<
  typeof applySecularTermMapToProfile
>

describe('/api/admin/biblical-counseling/secular-term-map/apply', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireAdminUser.mockResolvedValue({ ok: true, userId: 'admin-1', email: 'admin@example.com' })
    mockLoadMap.mockResolvedValue({
      pinnedSectionTitle: 'Find your topic (secular terms)',
      introHtml: '',
      mappings: [],
    })
    mockApply.mockResolvedValue({ validationIssues: [] })
  })

  it('POST applies map to allowed slug', async () => {
    const req = new NextRequest(
      'http://localhost/api/admin/biblical-counseling/secular-term-map/apply',
      {
        method: 'POST',
        body: JSON.stringify({ slug: BIBLICAL_COUNSELING_SECULAR_MAP_TEST_SLUG }),
      }
    )
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(mockApply).toHaveBeenCalledWith(BIBLICAL_COUNSELING_SECULAR_MAP_TEST_SLUG, expect.any(Object))
  })

  it('POST rejects invalid slug', async () => {
    const req = new NextRequest(
      'http://localhost/api/admin/biblical-counseling/secular-term-map/apply',
      {
        method: 'POST',
        body: JSON.stringify({ slug: 'not-allowed' }),
      }
    )
    const response = await POST(req)
    expect(response.status).toBe(400)
  })
})
