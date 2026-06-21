import {
  assertSyncKeyCount,
  isPairingSessionExpired,
  isValidPairingCode,
  isValidStorageId,
  isValidSyncStorageKey,
  parseSyncKeyEntries,
} from '@/lib/gospelDeviceSync/serverValidation'
import { SYNC_MAX_KEYS_PER_GROUP } from '@/lib/gospelDeviceSync/constants'

describe('gospelDeviceSync serverValidation', () => {
  it('validates storage id format', () => {
    const valid = 'a'.repeat(64)
    expect(isValidStorageId(valid)).toBe(true)
    expect(isValidStorageId('short')).toBe(false)
  })

  it('validates pairing codes', () => {
    expect(isValidPairingCode('000001')).toBe(true)
    expect(isValidPairingCode('12345')).toBe(false)
    expect(isValidPairingCode('abcdef')).toBe(false)
  })

  it('isPairingSessionExpired compares epoch ms, not ISO strings', () => {
    const nowMs = Date.parse('2026-06-20T22:27:28.900Z')
    expect(isPairingSessionExpired('2026-06-20T22:27:29.00100+00:00', nowMs)).toBe(false)
    expect(isPairingSessionExpired('2026-06-20T22:27:29.10000+00:00', nowMs)).toBe(false)
    expect(isPairingSessionExpired('2026-06-20T22:27:28.50000+00:00', nowMs)).toBe(true)
  })

  it('rejects sync meta keys', () => {
    expect(isValidSyncStorageKey('gospel-sync-key:v1')).toBe(false)
    expect(isValidSyncStorageKey('gospel-profile-theme')).toBe(true)
  })

  it('parses sync key entries', () => {
    const entries = parseSyncKeyEntries([
      {
        key: 'gospel-profile-theme',
        ciphertext: '{"iv":"x","ct":"y"}',
        updatedAt: '2026-01-01T00:00:00.000Z',
        contentHash: 'abc',
      },
    ])
    expect(entries).toHaveLength(1)
    expect(entries[0]?.key).toBe('gospel-profile-theme')
  })

  it('assertSyncKeyCount rejects only when incoming entry count exceeds limit', () => {
    expect(() => assertSyncKeyCount(SYNC_MAX_KEYS_PER_GROUP)).not.toThrow()
    expect(() => assertSyncKeyCount(SYNC_MAX_KEYS_PER_GROUP + 1)).toThrow(/keys/)
    // Full replace validates incoming batch size only (remote count is irrelevant).
    expect(() => assertSyncKeyCount(10)).not.toThrow()
  })
})
