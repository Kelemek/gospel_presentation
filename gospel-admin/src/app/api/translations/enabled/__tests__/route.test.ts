jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))
import { GET } from '../route'
import * as server from '@/lib/supabase/server'

describe('GET /api/translations/enabled', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns enabled translations from DB', async () => {
    ;(server.createClient as jest.Mock).mockResolvedValue({
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [
            { translation_code: 'esv', translation_name: 'ESV', display_order: 1 },
            { translation_code: 'lsb', translation_name: 'LSB', display_order: 2 },
          ],
          error: null,
        }),
      }),
    })

    const res = await GET()
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.translations).toHaveLength(2)
    expect(body.translations[0].translation_code).toBe('esv')
  })

  it('on DB error returns default ESV', async () => {
    ;(server.createClient as jest.Mock).mockResolvedValue({
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
      }),
    })

    const res = await GET()
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.translations).toHaveLength(1)
    expect(body.translations[0].translation_code).toBe('esv')
  })

  it('ensures ESV is in list when missing', async () => {
    ;(server.createClient as jest.Mock).mockResolvedValue({
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [{ translation_code: 'lsb', translation_name: 'LSB', display_order: 1 }],
          error: null,
        }),
      }),
    })

    const res = await GET()
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.translations[0].translation_code).toBe('esv')
    expect(body.translations[1].translation_code).toBe('lsb')
  })

  it('on throw returns default ESV', async () => {
    ;(server.createClient as jest.Mock).mockRejectedValue(new Error('fail'))

    const res = await GET()
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.translations).toHaveLength(1)
    expect(body.translations[0].translation_code).toBe('esv')
  })
})
