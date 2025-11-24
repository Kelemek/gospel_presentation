jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn()
}))

jest.mock('@/lib/supabase-data-service', () => ({
  grantProfileAccess: jest.fn(async () => true),
  getProfileAccessList: jest.fn(async () => []),
  revokeProfileAccess: jest.fn(async () => true),
}))

import { POST } from '../access/route'
import { createClient } from '@/lib/supabase/server'

describe('profiles access route - username handling', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('POST grants access with username for new user', async () => {
    const mockCreateClient = createClient as jest.Mock
    mockCreateClient.mockResolvedValueOnce({
      auth: { getUser: async () => ({ data: { user: { id: 'user1' } } }) },
      from: jest.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn(async () => ({ data: { id: 'p1', created_by: 'user1' } }))
          }
        }
        if (table === 'user_profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn(async () => ({ data: { id: 'up1', role: 'counselor' } })),
            update: jest.fn().mockReturnThis()
          }
        }
        return {}
      })
    })

    const req: any = {
      json: async () => ({
        email: 'new@example.com',
        username: 'john_doe'
      })
    }
    const res = await POST(req, { params: Promise.resolve({ slug: 'test' }) } as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.email).toBe('new@example.com')
    expect(body.message).toMatch(/granted successfully/i)
  })

  it('POST grants access with username when no existing user_profile', async () => {
    // This test triggers the else block (lines 155-158) where existingUser is null
    const mockCreateClient = createClient as jest.Mock
    mockCreateClient.mockResolvedValueOnce({
      auth: { getUser: async () => ({ data: { user: { id: 'user1' } } }) },
      from: jest.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn(async () => ({ data: { id: 'p1', created_by: 'user1' } }))
          }
        }
        if (table === 'user_profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn(async () => ({ data: null, error: null })), // No user found
            update: jest.fn().mockReturnThis()
          }
        }
        return {}
      })
    })

    const req: any = {
      json: async () => ({
        email: 'newuser@example.com',
        username: 'new_user'
      })
    }
    const res = await POST(req, { params: Promise.resolve({ slug: 'test' }) } as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.email).toBe('newuser@example.com')
    expect(body.message).toMatch(/granted successfully/i)
  })

  it('POST grants access without username', async () => {
    const mockCreateClient = createClient as jest.Mock
    mockCreateClient.mockResolvedValueOnce({
      auth: { getUser: async () => ({ data: { user: { id: 'user1' } } }) },
      from: jest.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn(async () => ({ data: { id: 'p1', created_by: 'user1' } }))
          }
        }
        if (table === 'user_profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn(async () => ({ data: { id: 'up1', role: 'counselor' } })),
            update: jest.fn().mockReturnThis()
          }
        }
        return {}
      })
    })

    const req: any = {
      json: async () => ({
        email: 'nouser@example.com'
      })
    }
    const res = await POST(req, { params: Promise.resolve({ slug: 'test' }) } as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.email).toBe('nouser@example.com')
  })

  it('POST trims and lowercases email', async () => {
    const mockCreateClient = createClient as jest.Mock
    mockCreateClient.mockResolvedValueOnce({
      auth: { getUser: async () => ({ data: { user: { id: 'user1' } } }) },
      from: jest.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn(async () => ({ data: { id: 'p1', created_by: 'user1' } }))
          }
        }
        if (table === 'user_profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn(async () => ({ data: { id: 'up1', role: 'counselor' } })),
            update: jest.fn().mockReturnThis()
          }
        }
        return {}
      })
    })

    const req: any = {
      json: async () => ({
        email: '  USER@EXAMPLE.COM  ',
        username: 'user'
      })
    }
    const res = await POST(req, { params: Promise.resolve({ slug: 'test' }) } as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.email).toBe('user@example.com')
  })

  it('POST trims username', async () => {
    const mockCreateClient = createClient as jest.Mock
    mockCreateClient.mockResolvedValueOnce({
      auth: { getUser: async () => ({ data: { user: { id: 'user1' } } }) },
      from: jest.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn(async () => ({ data: { id: 'p1', created_by: 'user1' } }))
          }
        }
        if (table === 'user_profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn(async () => ({ data: { id: 'up1', role: 'counselor' } })),
            update: jest.fn().mockReturnThis()
          }
        }
        return {}
      })
    })

    const req: any = {
      json: async () => ({
        email: 'test@example.com',
        username: '  trimmed_user  '
      })
    }
    const res = await POST(req, { params: Promise.resolve({ slug: 'test' }) } as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.message).toMatch(/granted successfully/i)
  })
})
