import { checkPairingClaimRateLimit, getClientIp } from '@/lib/gospelDeviceSync/serverRateLimit'

const mockRpc = jest.fn()

jest.mock('@/lib/gospelDeviceSync/deviceSyncSupabase', () => ({
  createDeviceSyncAdminClient: () => ({
    rpc: (...args: unknown[]) => mockRpc(...args),
  }),
}))

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}))

function makeRequest(headers: Record<string, string>): Request {
  return {
    headers: {
      get: (name: string) => headers[name.toLowerCase()] ?? headers[name] ?? null,
    },
  } as unknown as Request
}

describe('serverRateLimit', () => {
  beforeEach(() => {
    mockRpc.mockReset()
  })

  describe('getClientIp', () => {
    it('uses the first x-forwarded-for address', () => {
      const request = makeRequest({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' })
      expect(getClientIp(request)).toBe('1.2.3.4')
    })

    it('falls back to x-real-ip', () => {
      const request = makeRequest({ 'x-real-ip': '9.9.9.9' })
      expect(getClientIp(request)).toBe('9.9.9.9')
    })

    it('returns unknown when no IP headers are present', () => {
      expect(getClientIp(makeRequest({}))).toBe('unknown')
    })
  })

  describe('checkPairingClaimRateLimit', () => {
    it('calls the Postgres RPC with window and max attempt settings', async () => {
      mockRpc.mockResolvedValue({ data: true, error: null })

      await expect(checkPairingClaimRateLimit('203.0.113.1')).resolves.toBe(true)

      expect(mockRpc).toHaveBeenCalledWith('check_pairing_claim_rate_limit', {
        p_client_ip: '203.0.113.1',
        p_max_attempts: 10,
        p_window_seconds: 60,
      })
    })

    it('returns false when the RPC reports the limit is exceeded', async () => {
      mockRpc.mockResolvedValue({ data: false, error: null })

      await expect(checkPairingClaimRateLimit('203.0.113.1')).resolves.toBe(false)
    })

    it('allows the request when the RPC is unavailable', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { message: 'function missing' } })

      await expect(checkPairingClaimRateLimit('203.0.113.1')).resolves.toBe(true)
    })
  })
})
