import { readFileSync } from 'fs'
import { join } from 'path'
import {
  GROK_VOICE_CODE_ALPHABET,
  GROK_VOICE_ESTIMATED_CHARS_PER_SECOND,
  audioMinutes,
  audioSecondsFromGraphTimes,
  chicagoMonthKey,
  evaluateGrokVoiceRedeem,
  formatGrokVoiceCode,
  generateGrokVoiceCode,
  generateGrokVoiceToken,
  grokVoiceCodeStatus,
  grokVoiceCostUsd,
  mp3DurationSeconds,
  normalizeGrokVoiceCode,
  resolveGrokAudioSeconds,
  sha256Hex,
  summarizeGrokVoiceUsage,
} from '@/lib/grokVoiceCode'

const CODE_PATTERN = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}(?:-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}){2}$/
const TOKEN_PATTERN = /^gvt_[A-Za-z0-9_-]{43}$/

describe('Grok voice codes', () => {
  it('uses a 31-character alphabet with no 0, O, 1, I, or L', () => {
    expect(GROK_VOICE_CODE_ALPHABET).toHaveLength(31)
    expect(new Set(GROK_VOICE_CODE_ALPHABET).size).toBe(31)
    expect(GROK_VOICE_CODE_ALPHABET).not.toMatch(/[01IOL]/)
    expect(12 * Math.log2(31)).toBeGreaterThan(59)
    expect(12 * Math.log2(31)).toBeLessThan(60)
  })

  it('normalizes case, spaces, and dashes to the same compact code', () => {
    const expected = 'ABCDEFGHJKMN'
    expect(normalizeGrokVoiceCode(' abcd-efgh-jkmn ')).toBe(expected)
    expect(normalizeGrokVoiceCode('ABCDEFGHJKMN')).toBe(expected)
    expect(normalizeGrokVoiceCode('abcd efgh jkmn')).toBe(expected)
    expect(normalizeGrokVoiceCode('abcd--efgh--jkmn')).toBe(expected)
    expect(formatGrokVoiceCode(expected)).toBe('ABCD-EFGH-JKMN')
  })

  it('rejects codes that use dropped characters or the wrong length', () => {
    expect(normalizeGrokVoiceCode('ABCD-EFGH-JKM0')).toBeNull()
    expect(normalizeGrokVoiceCode('ABCD-EFGH-JKMO')).toBeNull()
    expect(normalizeGrokVoiceCode('ABCD-EFGH-JKM1')).toBeNull()
    expect(normalizeGrokVoiceCode('ABCD-EFGH-JKMI')).toBeNull()
    expect(normalizeGrokVoiceCode('ABCD-EFGH-JKML')).toBeNull()
    expect(normalizeGrokVoiceCode('ABCD-EFGH')).toBeNull()
    expect(normalizeGrokVoiceCode('')).toBeNull()
  })

  it('generates a dashed code and a gvt_ token from random bytes', () => {
    for (let i = 0; i < 20; i += 1) {
      const code = generateGrokVoiceCode()
      expect(code).toMatch(CODE_PATTERN)
      expect(normalizeGrokVoiceCode(code)).toHaveLength(12)
    }
    const token = generateGrokVoiceToken()
    expect(token).toMatch(TOKEN_PATTERN)
    expect(generateGrokVoiceToken()).not.toBe(token)
  })

  it('hashes with sha256 of the normalized text', () => {
    expect(sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
    const compact = normalizeGrokVoiceCode('abcd-efgh-jkmn')
    expect(compact).toBe('ABCDEFGHJKMN')
    expect(sha256Hex(compact!)).toBe(sha256Hex('ABCDEFGHJKMN'))
    expect(sha256Hex('abcd-efgh-jkmn')).not.toBe(sha256Hex(compact!))
  })

  it('prices speech at $15 per million characters', () => {
    expect(grokVoiceCostUsd(1_000_000)).toBe(15)
    expect(grokVoiceCostUsd(1_000)).toBeCloseTo(0.015)
    expect(grokVoiceCostUsd(0)).toBe(0)
    expect(grokVoiceCostUsd(-5)).toBe(0)
  })

  it('buckets months in America/Chicago', () => {
    expect(chicagoMonthKey(new Date('2026-01-01T05:30:00.000Z'))).toBe('2025-12')
    expect(chicagoMonthKey(new Date('2026-01-01T06:00:00.000Z'))).toBe('2026-01')
    expect(chicagoMonthKey(new Date('2026-07-01T04:59:00.000Z'))).toBe('2026-06')
    expect(chicagoMonthKey(new Date('2026-07-01T05:00:00.000Z'))).toBe('2026-07')
  })

  it('denies a missing, revoked, expired, or full code and allows a live one', () => {
    const now = new Date('2026-06-01T12:00:00.000Z')
    const later = new Date('2026-06-08T12:00:00.000Z')
    const earlier = new Date('2026-05-01T12:00:00.000Z')
    const base = {
      found: true,
      codeRevoked: false,
      expiresAt: later,
      activeDevices: 0,
      maxDevices: 3,
      now,
    }
    expect(evaluateGrokVoiceRedeem(base)).toBe('ok')
    expect(evaluateGrokVoiceRedeem({ ...base, found: false })).toBe('denied')
    expect(evaluateGrokVoiceRedeem({ ...base, codeRevoked: true })).toBe('denied')
    expect(evaluateGrokVoiceRedeem({ ...base, expiresAt: earlier })).toBe('denied')
    expect(evaluateGrokVoiceRedeem({ ...base, expiresAt: now })).toBe('denied')
    expect(evaluateGrokVoiceRedeem({ ...base, activeDevices: 1, expiresAt: earlier })).toBe('ok')
    expect(evaluateGrokVoiceRedeem({ ...base, activeDevices: 2 })).toBe('ok')
    expect(evaluateGrokVoiceRedeem({ ...base, activeDevices: 3 })).toBe('denied')
    expect(evaluateGrokVoiceRedeem({ ...base, activeDevices: 4, maxDevices: 3 })).toBe('denied')
  })

  it('marks an unused past code expired and a redeemed one active', () => {
    const now = new Date('2026-06-10T00:00:00.000Z')
    expect(
      grokVoiceCodeStatus({
        revokedAt: null,
        expiresAt: '2026-06-01T00:00:00.000Z',
        activeDevices: 0,
        now,
      })
    ).toBe('expired')
    expect(
      grokVoiceCodeStatus({
        revokedAt: null,
        expiresAt: '2026-06-01T00:00:00.000Z',
        activeDevices: 1,
        now,
      })
    ).toBe('active')
    expect(
      grokVoiceCodeStatus({
        revokedAt: '2026-06-02T00:00:00.000Z',
        expiresAt: '2026-12-01T00:00:00.000Z',
        activeDevices: 1,
        now,
      })
    ).toBe('revoked')
  })

  it('reads duration from the last timestamp, then the MP3, then an estimate', () => {
    expect(
      audioSecondsFromGraphTimes([
        [0, 0.1],
        [0.1, 0.2],
      ])
    ).toBe(0.2)
    const frame = new Uint8Array(417)
    frame.set([0xff, 0xfb, 0x90, 0x00])
    const mp3Seconds = mp3DurationSeconds(frame)
    expect(mp3Seconds).toBeCloseTo(1152 / 44100)

    expect(
      resolveGrokAudioSeconds({
        chars: 1000,
        graphTimes: [[0, 1.5]],
        audioBytes: frame,
      })
    ).toEqual({ seconds: 1.5, estimated: false })
    expect(resolveGrokAudioSeconds({ chars: 1000, audioBytes: frame })).toEqual({
      seconds: mp3Seconds,
      estimated: false,
    })
    expect(resolveGrokAudioSeconds({ chars: 30, audioBytes: Uint8Array.from([1, 2, 3]) })).toEqual({
      seconds: 30 / GROK_VOICE_ESTIMATED_CHARS_PER_SECOND,
      estimated: true,
    })
  })

  it('sums this month and all-time usage without mixing months', () => {
    const totals = summarizeGrokVoiceUsage(
      [
        {
          deviceId: 'd1',
          monthKey: '2026-11',
          chars: 1_000_000,
          audioSeconds: 120,
          costUsd: 15,
          includesEstimate: false,
        },
        {
          deviceId: 'd1',
          monthKey: '2026-10',
          chars: 2_000_000,
          audioSeconds: 60,
          costUsd: 30,
          includesEstimate: true,
        },
      ],
      '2026-11'
    )
    expect(totals.chars).toBe(3_000_000)
    expect(totals.costUsd).toBe(45)
    expect(totals.audioSeconds).toBe(180)
    expect(audioMinutes(totals.audioSeconds)).toBe(3)
    expect(totals.monthCostUsd).toBe(15)
    expect(audioMinutes(totals.monthAudioSeconds)).toBe(2)
    expect(totals.monthIncludesEstimate).toBe(false)
    expect(totals.includesEstimate).toBe(true)
  })

  it('keeps the migration on the same redeem, cost, and backup rules', () => {
    const sql = readFileSync(
      join(process.cwd(), '../supabase/migrations/20261128020000_grok_voice_access_codes.sql'),
      'utf8'
    )
    expect(sql).toContain('FOR UPDATE')
    expect(sql).toContain('v_code.revoked_at IS NOT NULL')
    expect(sql).toContain('v_active = 0 AND v_code.expires_at <= now()')
    expect(sql).toContain('v_active >= v_code.max_devices')
    expect(sql).toContain('revoked_at IS NULL')
    expect(sql).toContain("(p_chars::numeric) * 15.0 / 1000000.0")
    expect(sql).toContain("to_char(now() AT TIME ZONE 'America/Chicago', 'YYYY-MM')")
    expect(sql).toContain('DROP COLUMN IF EXISTS grok_voice_enabled')
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.redeem_grok_voice_code(text, text, text) TO service_role')
    expect(sql).toContain('REVOKE ALL ON FUNCTION public.redeem_grok_voice_code(text, text, text) FROM PUBLIC, anon, authenticated')
    expect(sql).toMatch(/'grok_voice_codes'/)
    expect(sql).toMatch(/'grok_voice_devices'/)
    expect(sql).toMatch(/'grok_voice_usage'/)
    expect(sql).toMatch(/'grok_voice_rate_limits'/)
    expect(sql).not.toContain('CREATE POLICY')
  })
})
