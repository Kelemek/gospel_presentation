import { createAdminClient } from '@/lib/supabase/server'
import { sha256Hex } from '@/lib/grokVoiceCode'
import { issueGrokVoiceCode, listGrokVoiceCodes, revokeGrokVoiceCode } from '@/lib/grokVoiceDb'

jest.mock('@/lib/supabase/server', () => ({
  createAdminClient: jest.fn(),
}))

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}))

const CODE_ID = '11111111-1111-4111-8111-111111111111'
const DEVICE_ID = '22222222-2222-4222-8222-222222222222'

describe('Grok voice code records', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-11-15T18:00:00.000Z'))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('stores the hash and returns the plaintext code once', async () => {
    const inserted: Record<string, unknown>[] = []
    jest.mocked(createAdminClient).mockReturnValue({
      from: () => ({
        insert: (row: Record<string, unknown>) => {
          inserted.push(row)
          return {
            select: () => ({
              single: async () => ({
                data: {
                  id: CODE_ID,
                  name: row.name,
                  expires_at: row.expires_at,
                  max_devices: row.max_devices,
                },
                error: null,
              }),
            }),
          }
        },
      }),
    } as never)

    const issued = await issueGrokVoiceCode({
      name: 'Sunday school',
      expiresInDays: 7,
      maxDevices: 3,
      createdBy: 'admin-1',
    })
    expect(issued.ok).toBe(true)
    if (!issued.ok) return
    expect(issued.issued.code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/)
    expect(issued.issued.expiresAt).toBe('2026-11-22T18:00:00.000Z')
    expect(inserted[0]).toMatchObject({
      name: 'Sunday school',
      code_hash: sha256Hex(issued.issued.code.replace(/-/g, '')),
      max_devices: 3,
      created_by: 'admin-1',
    })
    expect(JSON.stringify(inserted)).not.toContain(issued.issued.code)
  })

  it('lists minutes and dollars without code or token hashes', async () => {
    const rows = {
      grok_voice_codes: [
        {
          id: CODE_ID,
          name: 'Sunday school',
          code_hash: 'a'.repeat(64),
          max_devices: 3,
          expires_at: '2026-11-01T00:00:00.000Z',
          revoked_at: null,
          created_at: '2026-10-20T00:00:00.000Z',
        },
      ],
      grok_voice_devices: [
        {
          id: DEVICE_ID,
          code_id: CODE_ID,
          token_hash: 'b'.repeat(64),
          device_label: 'web',
          revoked_at: null,
          last_used_at: '2026-11-15T17:00:00.000Z',
          created_at: '2026-11-01T00:00:00.000Z',
        },
      ],
      grok_voice_usage: [
        {
          device_id: DEVICE_ID,
          code_id: CODE_ID,
          month_key: '2026-11',
          chars: 1_000_000,
          audio_seconds: 120,
          cost_usd: 15,
          includes_estimate: false,
        },
        {
          device_id: DEVICE_ID,
          code_id: CODE_ID,
          month_key: '2026-10',
          chars: 2_000_000,
          audio_seconds: 60,
          cost_usd: 30,
          includes_estimate: true,
        },
      ],
    }
    jest.mocked(createAdminClient).mockReturnValue({
      from: (table: keyof typeof rows) => {
        const result = Promise.resolve({ data: rows[table], error: null })
        const chain = {
          select: () => chain,
          order: () => chain,
          then: result.then.bind(result),
        }
        return chain
      },
    } as never)

    const listed = await listGrokVoiceCodes(new Date('2026-11-15T18:00:00.000Z'))
    expect(listed.ok).toBe(true)
    if (!listed.ok) return
    expect(listed.codes).toEqual([
      expect.objectContaining({
        id: CODE_ID,
        name: 'Sunday school',
        status: 'active',
        devicesUsed: 1,
        maxDevices: 3,
        minutesThisMonth: 2,
        dollarsThisMonth: 15,
        minutesAllTime: 3,
        dollarsAllTime: 45,
        includesEstimate: true,
        lastUsedAt: '2026-11-15T17:00:00.000Z',
      }),
    ])
    expect(listed.codes[0]?.devices[0]).toMatchObject({
      id: DEVICE_ID,
      label: 'web',
      minutesThisMonth: 2,
      dollarsAllTime: 45,
    })
    const encoded = JSON.stringify(listed)
    expect(encoded).not.toContain('a'.repeat(64))
    expect(encoded).not.toContain('b'.repeat(64))
    expect(encoded).not.toContain('code_hash')
    expect(encoded).not.toContain('token_hash')
  })

  it('keeps a code revoked when revoke runs twice', async () => {
    const updates: unknown[] = []
    jest.mocked(createAdminClient).mockReturnValue({
      from: () => ({
        update: (row: unknown) => {
          updates.push(row)
          return {
            eq: () => ({
              is: () => ({
                select: () => ({
                  maybeSingle: async () => ({ data: null, error: null }),
                }),
              }),
            }),
          }
        },
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: { id: CODE_ID, revoked_at: '2026-11-01T00:00:00.000Z' }, error: null }),
          }),
        }),
      }),
    } as never)

    await expect(revokeGrokVoiceCode(CODE_ID)).resolves.toBe('revoked')
    await expect(revokeGrokVoiceCode(CODE_ID)).resolves.toBe('revoked')
    expect(updates).toHaveLength(2)
  })
})
