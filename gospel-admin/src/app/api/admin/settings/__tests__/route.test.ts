import { GET, POST } from '../route'
import { createClient } from '@/lib/supabase/server'

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

function makeSupabaseMock(singleImpl: jest.Mock) {
  return {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: singleImpl,
        })),
      })),
    })),
  }
}

describe('/api/admin/settings', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return settings from database', async () => {
    const mockSingle = jest.fn()
    ;(createClient as jest.Mock).mockResolvedValue(makeSupabaseMock(mockSingle))
    const mockSettings = {
      verification_code_length: 6,
      verification_code_expiry_minutes: 15,
      enable_verification_code_login: true,
    }
    mockSingle.mockResolvedValue({
      data: mockSettings,
      error: null,
    })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(mockSettings)
  })

  it('should return default settings when Supabase returns error', async () => {
    const mockSingle = jest.fn()
    ;(createClient as jest.Mock).mockResolvedValue(makeSupabaseMock(mockSingle))
    mockSingle.mockResolvedValue({
      data: null,
      error: { message: 'Not found' },
    })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({
      verification_code_length: 6,
      verification_code_expiry_minutes: 15,
      enable_verification_code_login: true,
    })
  })

  it('should return default settings when .single() throws', async () => {
    const mockSingle = jest.fn()
    ;(createClient as jest.Mock).mockResolvedValue(makeSupabaseMock(mockSingle))
    mockSingle.mockRejectedValue(new Error('Database error'))

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({
      verification_code_length: 6,
      verification_code_expiry_minutes: 15,
      enable_verification_code_login: true,
    })
  })

  it('should return default settings when createClient throws', async () => {
    ;(createClient as jest.Mock).mockRejectedValueOnce(new Error('Auth failed'))

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({
      verification_code_length: 6,
      verification_code_expiry_minutes: 15,
      enable_verification_code_login: true,
    })
  })

  it('should reject POST requests', async () => {
    const response = await POST()
    const data = await response.json()

    expect(response.status).toBe(405)
    expect(data.error).toBe('Method not allowed. Use GET.')
  })
})
