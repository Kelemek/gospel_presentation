import { GOSPEL_SYNC_ENABLED_KEY } from '@/lib/gospelDeviceSync/constants'
import { markSyncKeyDirty } from '@/lib/gospelDeviceSync/dirty'
import {
  GOSPEL_LOCAL_USER_DATA_KIND,
  GOSPEL_LOCAL_USER_DATA_SCHEMA_VERSION,
  collectGospelLocalUserDataForExport,
  parseGospelLocalUserDataImport,
} from '@/lib/gospelLocalUserDataBackup'
import {
  GROK_VOICE_TOKEN_STORAGE_KEY,
  clearGrokVoiceToken,
  noteGrokVoiceRejection,
  readGrokVoiceToken,
  writeGrokVoiceToken,
} from '@/lib/grokVoiceTokenStorage'
const TOKEN = `gvt_${'a'.repeat(43)}`

describe('Grok voice token storage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('round-trips a token in its own localStorage key and ignores anything else', () => {
    expect(readGrokVoiceToken()).toBeNull()
    writeGrokVoiceToken('not-a-token')
    expect(localStorage.getItem(GROK_VOICE_TOKEN_STORAGE_KEY)).toBeNull()
    writeGrokVoiceToken(TOKEN)
    expect(readGrokVoiceToken()).toBe(TOKEN)
    expect(localStorage.getItem(GROK_VOICE_TOKEN_STORAGE_KEY)).toBe(TOKEN)
    clearGrokVoiceToken()
    expect(readGrokVoiceToken()).toBeNull()
  })

  it('clears the token only for the invalid-token response', async () => {
    const response = (status: number, body: unknown) =>
      ({
        status,
        clone() {
          return this
        },
        json: async () => body,
      }) as Response
    writeGrokVoiceToken(TOKEN)
    await noteGrokVoiceRejection(response(429, { error: 'busy' }))
    expect(readGrokVoiceToken()).toBe(TOKEN)
    await noteGrokVoiceRejection(response(401, { error: 'Unauthorized' }))
    expect(readGrokVoiceToken()).toBe(TOKEN)
    await noteGrokVoiceRejection(response(401, { code: 'grok_token_invalid' }))
    expect(readGrokVoiceToken()).toBeNull()
  })

  it('stays out of device sync and JSON backup', () => {
    localStorage.setItem(GOSPEL_SYNC_ENABLED_KEY, '1')
    localStorage.setItem(GROK_VOICE_TOKEN_STORAGE_KEY, TOKEN)
    expect(markSyncKeyDirty(GROK_VOICE_TOKEN_STORAGE_KEY)).toBe(false)
    expect(markSyncKeyDirty('gospel-verse-pins-demo')).toBe(true)

    const exported = collectGospelLocalUserDataForExport(localStorage)
    expect(exported[GROK_VOICE_TOKEN_STORAGE_KEY]).toBeUndefined()

    expect(() =>
      parseGospelLocalUserDataImport(
        JSON.stringify({
          kind: GOSPEL_LOCAL_USER_DATA_KIND,
          schemaVersion: GOSPEL_LOCAL_USER_DATA_SCHEMA_VERSION,
          localStorage: { [GROK_VOICE_TOKEN_STORAGE_KEY]: TOKEN },
        })
      )
    ).toThrow(/cannot be restored safely/i)
  })
})
