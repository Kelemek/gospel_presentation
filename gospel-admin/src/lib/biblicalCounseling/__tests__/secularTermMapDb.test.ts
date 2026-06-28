import { loadSecularTermMapFromSupabase } from '@/lib/biblicalCounseling/secularTermMapDb'
import { EMPTY_SECULAR_TERM_MAP } from '@/lib/biblicalCounseling/secularTermMap'
import { createAdminClient } from '@/lib/supabase/server'

jest.mock('@/lib/supabase/server', () => ({
  createAdminClient: jest.fn(),
}))

const mockCreateAdminClient = createAdminClient as jest.MockedFunction<typeof createAdminClient>

const dbMap = {
  pinnedSectionTitle: 'Find your topic (secular terms)',
  introHtml: '<p>From db</p>',
  mappings: [{ secularTerms: ['depression'], biblicalTopic: 'Depression' }],
}

function makeAdminClient(data: { secular_term_map?: unknown } | null, error: unknown = null) {
  return {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          maybeSingle: jest.fn().mockResolvedValue({ data, error }),
        })),
      })),
    })),
  }
}

describe('secularTermMapDb loadSecularTermMapFromSupabase', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns Supabase map when populated', async () => {
    mockCreateAdminClient.mockReturnValue(
      makeAdminClient({ secular_term_map: dbMap }) as ReturnType<typeof createAdminClient>
    )

    const map = await loadSecularTermMapFromSupabase()
    expect(map.introHtml).toBe('<p>From db</p>')
  })

  it('returns empty map when column is null', async () => {
    mockCreateAdminClient.mockReturnValue(
      makeAdminClient({ secular_term_map: null }) as ReturnType<typeof createAdminClient>
    )

    const map = await loadSecularTermMapFromSupabase()
    expect(map).toEqual(EMPTY_SECULAR_TERM_MAP)
  })
})
