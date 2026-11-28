import { NextRequest } from 'next/server'
import { POST } from '../route'
import { sha256Hex } from '@/lib/grokVoiceCode'
import {
  consumeGrokVoiceRateLimit,
  grokVoiceRateLimitOpen,
  redeemGrokVoiceCode,
} from '@/lib/grokVoiceDb'
import { logger } from '@/lib/logger'

jest.mock('@/lib/grokVoiceDb', () => ({
  GROK_REDEEM_IP_MAX: 5,
  GROK_REDEEM_IP_WINDOW_SECONDS: 600,
  GROK_REDEEM_FAILURE_MAX: 60,
  GROK_REDEEM_FAILURE_WINDOW_SECONDS: 3600,
  GROK_REDEEM_FAILURE_BUCKET: 'redeem:failures',
  grokRedeemIpBucket: (ip: string) => `redeem:ip:${ip}`,
  consumeGrokVoiceRateLimit: jest.fn(),
  grokVoiceRateLimitOpen: jest.fn(),
  redeemGrokVoiceCode: jest.fn(),
}))

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}))

const open = grokVoiceRateLimitOpen as jest.MockedFunction<typeof grokVoiceRateLimitOpen>
const consume = consumeGrokVoiceRateLimit as jest.MockedFunction<typeof consumeGrokVoiceRateLimit>
const redeem = redeemGrokVoiceCode as jest.MockedFunction<typeof redeemGrokVoiceCode>

function post(body: unknown, ip = '203.0.113.8') {
  return POST(
    new NextRequest('http://localhost/api/grok-voice/redeem', {
      method: 'POST',
      headers: { 'x-forwarded-for': ip, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  )
}

describe('POST /api/grok-voice/redeem', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    open.mockResolvedValue({ ok: true, allowed: true })
    consume.mockResolvedValue({ ok: true, allowed: true })
    redeem.mockResolvedValue({ ok: true, codeId: 'code-1', deviceId: 'device-1' })
  })

  it('returns a token once, stores only hashes, and does not log the code or token', async () => {
    const response = await post({ code: ' abcd-efgh-jkmn ', deviceLabel: '  web  ' })
    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    const body = (await response.json()) as { token: string }
    expect(body.token).toMatch(/^gvt_[A-Za-z0-9_-]{43}$/)
    expect(JSON.stringify(body)).not.toContain('code_hash')
    expect(redeem).toHaveBeenCalledWith({
      codeHash: sha256Hex('ABCDEFGHJKMN'),
      tokenHash: sha256Hex(body.token),
      deviceLabel: 'web',
    })
    const logged = JSON.stringify((logger.info as jest.Mock).mock.calls)
    expect(logged).toContain('code-1')
    expect(logged).toContain('device-1')
    expect(logged).not.toContain('ABCDEFGHJKMN')
    expect(logged).not.toContain(body.token)
    expect(logged).not.toContain('x-forwarded-for')
  })

  it('returns the same 404 for a bad, expired, revoked, or full code', async () => {
    redeem.mockResolvedValue({ ok: false, denied: true })
    for (const code of ['nope', 'ABCD-EFGH-JKM0', 'ABCD-EFGH-JKMN']) {
      const response = await post({ code })
      expect(response.status).toBe(404)
      expect(response.headers.get('Cache-Control')).toBe('no-store')
      await expect(response.json()).resolves.toEqual({ error: 'Not found' })
    }
  })

  it('hashes mixed case and spacing to the same code', async () => {
    redeem.mockResolvedValue({ ok: false, denied: true })
    await post({ code: 'abcd efgh jkmn' })
    await post({ code: 'ABCD-EFGH-JKMN' })
    expect(redeem).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ codeHash: sha256Hex('ABCDEFGHJKMN') })
    )
    expect(redeem).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ codeHash: sha256Hex('ABCDEFGHJKMN') })
    )
  })

  it('stops at 429 when the IP attempt budget is closed and does not redeem', async () => {
    consume.mockResolvedValueOnce({ ok: true, allowed: false })
    const response = await post({ code: 'ABCD-EFGH-JKMN' }, '203.0.113.9')
    expect(response.status).toBe(429)
    expect(consume).toHaveBeenCalledWith('redeem:ip:203.0.113.9', 5, 600)
    expect(redeem).not.toHaveBeenCalled()
  })

  it('stops at 429 when the global failure budget is closed', async () => {
    open.mockResolvedValue({ ok: true, allowed: false })
    const response = await post({ code: 'ABCD-EFGH-JKMN' })
    expect(response.status).toBe(429)
    expect(consume).not.toHaveBeenCalled()
    expect(redeem).not.toHaveBeenCalled()
  })

  it('fails closed with 503 when a limiter cannot run and does not redeem', async () => {
    open.mockResolvedValue({ ok: false, unavailable: true })
    const closed = await post({ code: 'ABCD-EFGH-JKMN' })
    expect(closed.status).toBe(503)
    expect(redeem).not.toHaveBeenCalled()

    open.mockResolvedValue({ ok: true, allowed: true })
    consume.mockResolvedValueOnce({ ok: false, unavailable: true })
    const ipDown = await post({ code: 'ABCD-EFGH-JKMN' })
    expect(ipDown.status).toBe(503)
    expect(redeem).not.toHaveBeenCalled()
  })

  it('fails closed when the failure counter cannot record a denied code', async () => {
    redeem.mockResolvedValue({ ok: false, denied: true })
    consume.mockImplementation(async (bucket: string) => {
      if (bucket === 'redeem:failures') return { ok: false, unavailable: true }
      return { ok: true, allowed: true }
    })
    const response = await post({ code: 'ABCD-EFGH-JKMN' })
    expect(response.status).toBe(503)
  })
})
