import { NextRequest } from 'next/server'
import { GET, PUT } from '../route'
import { requireAdminUser } from '@/lib/adminAuth'
import {
  loadBiblicalCounselingSectionTitles,
  loadSecularTermMapFromSupabase,
  saveSecularTermMapToSupabase,
} from '@/lib/biblicalCounseling/secularTermMapDb'

jest.mock('@/lib/adminAuth', () => ({
  requireAdminUser: jest.fn(),
}))

jest.mock('@/lib/biblicalCounseling/secularTermMapDb', () => ({
  loadSecularTermMapFromSupabase: jest.fn(),
  loadBiblicalCounselingSectionTitles: jest.fn(),
  saveSecularTermMapToSupabase: jest.fn(),
}))

const mockRequireAdminUser = requireAdminUser as jest.MockedFunction<typeof requireAdminUser>
const mockLoadMap = loadSecularTermMapFromSupabase as jest.MockedFunction<
  typeof loadSecularTermMapFromSupabase
>
const mockLoadTitles = loadBiblicalCounselingSectionTitles as jest.MockedFunction<
  typeof loadBiblicalCounselingSectionTitles
>
const mockSaveMap = saveSecularTermMapToSupabase as jest.MockedFunction<
  typeof saveSecularTermMapToSupabase
>

const sampleMap = {
  pinnedSectionTitle: 'Find your topic (secular terms)',
  introHtml: '<p>Intro</p>',
  mappings: [{ secularTerms: ['anxiety'], biblicalTopic: 'Anxiety and Worry' }],
}

describe('/api/admin/biblical-counseling/secular-term-map', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireAdminUser.mockResolvedValue({ ok: true, userId: 'admin-1', email: 'admin@example.com' })
    mockLoadMap.mockResolvedValue(sampleMap)
    mockLoadTitles.mockResolvedValue(['Anxiety and Worry', 'Pride and Humility'])
  })

  it('GET returns map and section titles for admin', async () => {
    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.map.pinnedSectionTitle).toBe(sampleMap.pinnedSectionTitle)
    expect(data.sectionTitles).toEqual(['Anxiety and Worry', 'Pride and Humility'])
  })

  it('PUT rejects non-admin', async () => {
    mockRequireAdminUser.mockResolvedValue({ ok: false, status: 403, error: 'Forbidden' })
    const req = new NextRequest('http://localhost/api/admin/biblical-counseling/secular-term-map', {
      method: 'PUT',
      body: JSON.stringify({ map: sampleMap }),
    })
    const response = await PUT(req)
    expect(response.status).toBe(403)
  })

  it('PUT saves map and returns validation issues', async () => {
    mockSaveMap.mockResolvedValue({
      map: sampleMap,
      validationIssues: [{ biblicalTopic: 'Missing topic', kind: 'unknown_topic' }],
    })

    const req = new NextRequest('http://localhost/api/admin/biblical-counseling/secular-term-map', {
      method: 'PUT',
      body: JSON.stringify({ map: sampleMap }),
    })
    const response = await PUT(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.validationIssues).toHaveLength(1)
    expect(mockSaveMap).toHaveBeenCalled()
  })
})
