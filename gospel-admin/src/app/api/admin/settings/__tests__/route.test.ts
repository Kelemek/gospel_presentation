import { GET } from '../route'
import { NextRequest } from 'next/server'

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn((table) => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
    })),
  })),
}))

describe('/api/admin/settings', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return settings from database', async () => {
    const mockSettings = {
      verification_code_length: 6,
      verification_code_expiry_minutes: 15,
      enable_verification_code_login: true,
    }

    const { createClient } = require('@/lib/supabase/server')
    const mockSupabase = createClient()
    mockSupabase.from('admin_settings').select().eq().single.mockResolvedValue({
      data: mockSettings,
      error: null,
    })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(mockSettings)
  })

  it('should return default settings when not found', async () => {
    const { createClient } = require('@/lib/supabase/server')
    const mockSupabase = createClient()
    mockSupabase.from('admin_settings').select().eq().single.mockResolvedValue({
      data: null,
      error: new Error('Not found'),
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

  it('should return default settings on error', async () => {
    const { createClient } = require('@/lib/supabase/server')
    const mockSupabase = createClient()
    mockSupabase.from('admin_settings').select().eq().single.mockRejectedValue(
      new Error('Database error')
    )

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
    const { POST } = await import('../route')
    const response = await POST()
    const data = await response.json()

    expect(response.status).toBe(405)
    expect(data.error).toBe('Method not allowed. Use GET.')
  })
})
