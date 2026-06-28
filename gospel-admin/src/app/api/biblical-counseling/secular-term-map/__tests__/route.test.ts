import { GET } from '../route'
import { loadSecularTermMapFromSupabase } from '@/lib/biblicalCounseling/secularTermMapDb'

jest.mock('@/lib/biblicalCounseling/secularTermMapDb', () => ({
  loadSecularTermMapFromSupabase: jest.fn(),
}))

const mockLoadMap = loadSecularTermMapFromSupabase as jest.MockedFunction<
  typeof loadSecularTermMapFromSupabase
>

describe('/api/biblical-counseling/secular-term-map', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('GET returns public map JSON', async () => {
    mockLoadMap.mockResolvedValue({
      pinnedSectionTitle: 'Find your topic (secular terms)',
      introHtml: '<p>Intro</p>',
      mappings: [{ secularTerms: ['anxiety'], biblicalTopic: 'Anxiety and Worry' }],
    })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.mappings).toHaveLength(1)
  })
})
