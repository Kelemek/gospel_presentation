import { NextRequest } from 'next/server'
import { logScriptureAccess, getSessionId } from '../scripture-logging'

jest.mock('@/lib/supabase/server', () => ({
  createAdminClient: jest.fn(),
}))

const mockCreateAdminClient = require('@/lib/supabase/server').createAdminClient as jest.Mock

describe('scripture-logging', () => {
  beforeEach(() => jest.clearAllMocks())

  describe('logScriptureAccess', () => {
    it('inserts log and does not throw', async () => {
      mockCreateAdminClient.mockReturnValue({
        from: jest.fn().mockReturnValue({
          insert: jest.fn().mockResolvedValue({ error: null }),
        }),
      })
      const req = new NextRequest('http://localhost/api/scripture')
      await expect(
        logScriptureAccess({ reference: 'John 3:16', translation: 'esv', sessionId: 's1', request: req })
      ).resolves.toBeUndefined()
    })

    it('handles insert error without throwing', async () => {
      mockCreateAdminClient.mockReturnValue({
        from: jest.fn().mockReturnValue({
          insert: jest.fn().mockResolvedValue({ error: { message: 'DB' } }),
        }),
      })
      const req = new NextRequest('http://localhost/api/scripture')
      await expect(
        logScriptureAccess({ reference: 'John 3:16', translation: 'kjv', sessionId: 's2', request: req })
      ).resolves.toBeUndefined()
    })

    it('handles throw from supabase without failing', async () => {
      mockCreateAdminClient.mockReturnValue({
        from: jest.fn().mockReturnValue({
          insert: jest.fn().mockRejectedValue(new Error('network')),
        }),
      })
      const req = new NextRequest('http://localhost/api/scripture')
      await expect(
        logScriptureAccess({ reference: 'Rom 1:1', translation: 'nasb', sessionId: 's3', request: req })
      ).resolves.toBeUndefined()
    })
  })

  describe('getSessionId', () => {
    it('returns x-session-id header when present', () => {
      const req = {
        headers: { get: (name: string) => (name === 'x-session-id' ? 'header-session' : null) },
        cookies: { get: () => undefined },
      } as unknown as NextRequest
      expect(getSessionId(req)).toBe('header-session')
    })

    it('returns cookie when no header', () => {
      const req = {
        headers: { get: () => null },
        cookies: { get: (name: string) => (name === 'scripture_session_id' ? { value: 'cookie-session' } : undefined) },
      } as unknown as NextRequest
      expect(getSessionId(req)).toBe('cookie-session')
    })

    it('generates session id from user-agent when no header or cookie', () => {
      const req = {
        headers: { get: (name: string) => (name === 'user-agent' ? 'TestAgent' : null) },
        cookies: { get: () => undefined },
      } as unknown as NextRequest
      const id = getSessionId(req)
      expect(id).toBeDefined()
      expect(id.length).toBeLessThanOrEqual(32)
    })
  })
})
