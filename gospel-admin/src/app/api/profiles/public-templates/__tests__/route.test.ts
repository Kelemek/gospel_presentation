import { GET } from '../route'
import * as dataService from '@/lib/supabase-data-service'

jest.mock('@/lib/supabase-data-service')

const mockDataService = dataService as jest.Mocked<typeof dataService>

describe('GET /api/profiles/public-templates', () => {
  beforeEach(() => jest.resetAllMocks())

  it('returns profiles from getPublicTemplateProfiles', async () => {
    const profiles = [
      { slug: 'template-1', title: 'Template One' },
      { slug: 'template-2', title: 'Template Two' }
    ]
    mockDataService.getPublicTemplateProfiles.mockResolvedValue(profiles)

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.profiles).toEqual(profiles)
    expect(mockDataService.getPublicTemplateProfiles).toHaveBeenCalled()
  })

  it('returns empty array when no public templates', async () => {
    mockDataService.getPublicTemplateProfiles.mockResolvedValue([])

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.profiles).toEqual([])
  })

  it('returns 500 when getPublicTemplateProfiles throws', async () => {
    mockDataService.getPublicTemplateProfiles.mockRejectedValue(new Error('DB error'))

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error).toMatch(/Failed to fetch public templates/i)
  })
})
