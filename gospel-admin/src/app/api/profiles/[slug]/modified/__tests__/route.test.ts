import { GET } from '../route'
import * as dataService from '@/lib/supabase-data-service'

jest.mock('@/lib/supabase-data-service')

const mockDataService = dataService as jest.Mocked<typeof dataService>

describe('GET /api/profiles/[slug]/modified', () => {
  beforeEach(() => jest.resetAllMocks())

  it('returns updatedAt for existing profile', async () => {
    const updatedAt = new Date('2026-03-01T12:00:00Z')
    mockDataService.getProfileUpdatedAt.mockResolvedValue(updatedAt)

    const req = {} as any
    const res = await GET(req, { params: Promise.resolve({ slug: 'my-profile' }) })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.updatedAt).toBe(updatedAt.toISOString())
    expect(mockDataService.getProfileUpdatedAt).toHaveBeenCalledWith('my-profile')
  })

  it('normalizes default slug', async () => {
    const updatedAt = new Date()
    mockDataService.getProfileUpdatedAt.mockResolvedValue(updatedAt)

    const res = await GET({} as any, { params: Promise.resolve({ slug: 'default' }) })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.updatedAt).toBeDefined()
    expect(mockDataService.getProfileUpdatedAt).toHaveBeenCalledWith('default')
  })

  it('returns 404 when profile not found', async () => {
    mockDataService.getProfileUpdatedAt.mockResolvedValue(null)

    const res = await GET({} as any, { params: Promise.resolve({ slug: 'missing' }) })
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body.error).toMatch(/not found/i)
  })

  it('returns 500 when getProfileUpdatedAt throws', async () => {
    mockDataService.getProfileUpdatedAt.mockRejectedValue(new Error('DB error'))

    const res = await GET({} as any, { params: Promise.resolve({ slug: 'x' }) })
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error).toMatch(/Failed to fetch/i)
  })
})
