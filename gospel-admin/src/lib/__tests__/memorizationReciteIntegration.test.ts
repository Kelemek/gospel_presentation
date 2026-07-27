import {
  RECITE_MAX_VERSES,
  computeReciteModeAvailable,
  computeReciteModeVisible,
  isReciteSupportedScriptureReference,
} from '@/lib/memorizationReciteIntegration'
import * as whisperSupport from '@/lib/isWhisperReciteSupported'

describe('isReciteSupportedScriptureReference', () => {
  it('allows single verses and ranges up to the limit', () => {
    expect(isReciteSupportedScriptureReference('John 3:16')).toBe(true)
    expect(isReciteSupportedScriptureReference('John 3:16-18')).toBe(true)
    expect(isReciteSupportedScriptureReference(`John 3:16-${15 + RECITE_MAX_VERSES}`)).toBe(true)
  })

  it('rejects ranges over the limit and chapter-only refs', () => {
    expect(isReciteSupportedScriptureReference(`John 3:16-${16 + RECITE_MAX_VERSES}`)).toBe(false)
    expect(isReciteSupportedScriptureReference('Psalm 23')).toBe(false)
  })
})

describe('computeReciteModeVisible', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('returns false when the browser cannot record for Whisper', () => {
    jest.spyOn(whisperSupport, 'isWhisperReciteSupported').mockReturnValue(false)
    expect(computeReciteModeVisible({ isBibleBooks: false })).toBe(false)
  })

  it('returns true when browser support passes', () => {
    jest.spyOn(whisperSupport, 'isWhisperReciteSupported').mockReturnValue(true)
    expect(computeReciteModeVisible({ isBibleBooks: false })).toBe(true)
    expect(computeReciteModeVisible({ isBibleBooks: true })).toBe(true)
  })
})

describe('computeReciteModeAvailable', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('returns false when the browser cannot record for Whisper', () => {
    jest.spyOn(whisperSupport, 'isWhisperReciteSupported').mockReturnValue(false)
    expect(
      computeReciteModeAvailable({
        isBibleBooks: false,
        reference: 'John 3:16',
      })
    ).toBe(false)
  })

  it('returns true when reference and browser support pass', () => {
    jest.spyOn(whisperSupport, 'isWhisperReciteSupported').mockReturnValue(true)
    expect(
      computeReciteModeAvailable({
        isBibleBooks: false,
        reference: 'John 3:16',
      })
    ).toBe(true)
  })

  it('returns true for bible books items without a verse reference', () => {
    jest.spyOn(whisperSupport, 'isWhisperReciteSupported').mockReturnValue(true)
    expect(
      computeReciteModeAvailable({
        isBibleBooks: true,
        reference: 'Bible Books (OT)',
      })
    ).toBe(true)
  })

  it('returns false for references over the verse limit', () => {
    jest.spyOn(whisperSupport, 'isWhisperReciteSupported').mockReturnValue(true)
    expect(
      computeReciteModeAvailable({
        isBibleBooks: false,
        reference: 'John 3:16-22',
      })
    ).toBe(false)
  })
})
