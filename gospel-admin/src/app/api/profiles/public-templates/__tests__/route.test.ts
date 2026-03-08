import { GET } from '../route'
import * as dataService from '@/lib/supabase-data-service'

jest.mock('@/lib/supabase-data-service')

const mockDataService = dataService as jest.Mocked<typeof dataService>

describe('GET /api/profiles/public-templates', () => {
  beforeEach(() => jest.resetAllMocks())

  it('returns items from getPublicResourcesStructure', async () => {
    const items = [
      { type: 'template' as const, slug: 'template-1', title: 'Template One' },
      { type: 'template' as const, slug: 'template-2', title: 'Template Two' }
    ]
    mockDataService.getPublicResourcesStructure.mockResolvedValue(items)

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.items).toEqual(items)
    expect(mockDataService.getPublicResourcesStructure).toHaveBeenCalled()
  })

  it('returns items with categories when present', async () => {
    const items = [
      { type: 'category' as const, id: 'cat-1', name: 'Category A', templates: [{ slug: 't1', title: 'T1' }] },
      { type: 'template' as const, slug: 't2', title: 'T2' }
    ]
    mockDataService.getPublicResourcesStructure.mockResolvedValue(items)

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.items).toEqual(items)
  })

  it('returns empty array when no public resources', async () => {
    mockDataService.getPublicResourcesStructure.mockResolvedValue([])

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.items).toEqual([])
  })

  it('returns 500 when getPublicResourcesStructure throws', async () => {
    mockDataService.getPublicResourcesStructure.mockRejectedValue(new Error('DB error'))

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error).toMatch(/Failed to fetch public templates/i)
  })
})
