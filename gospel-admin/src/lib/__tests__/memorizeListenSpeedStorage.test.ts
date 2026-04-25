import {
  MEMORIZE_IOS_WEB_SPEECH_RATE_SCALE,
  MEMORIZE_LISTEN_SPEED_STORAGE_KEY,
  normalizeMemorizeListenSpeed,
  readMemorizeListenSpeedFromStorage,
  toMemorizeWebSpeechUtteranceRate,
} from '@/lib/memorizeListenSpeedStorage'

describe('memorizeListenSpeedStorage', () => {
  it('normalize returns 1 for invalid or empty', () => {
    expect(normalizeMemorizeListenSpeed(null)).toBe(1)
    expect(normalizeMemorizeListenSpeed('')).toBe(1)
    expect(normalizeMemorizeListenSpeed('99')).toBe(1)
  })

  it('normalize accepts preset strings', () => {
    expect(normalizeMemorizeListenSpeed('1.25')).toBe(1.25)
    expect(normalizeMemorizeListenSpeed('1')).toBe(1)
  })

  it('read returns stored preset when getItem returns a valid value', () => {
    const getItemSpy = jest.spyOn(Storage.prototype, 'getItem').mockReturnValueOnce('1.5')
    expect(readMemorizeListenSpeedFromStorage()).toBe(1.5)
    expect(getItemSpy).toHaveBeenCalledWith(MEMORIZE_LISTEN_SPEED_STORAGE_KEY)
    getItemSpy.mockRestore()
  })

  it('Web Speech rate matches preset on non-iOS', () => {
    expect(toMemorizeWebSpeechUtteranceRate(1, false)).toBe(1)
    expect(toMemorizeWebSpeechUtteranceRate(1.25, false)).toBe(1.25)
  })

  it('Web Speech rate is scaled on iOS to align with ESV audio', () => {
    expect(MEMORIZE_IOS_WEB_SPEECH_RATE_SCALE).toBeLessThan(1)
    expect(toMemorizeWebSpeechUtteranceRate(1, true)).toBeCloseTo(0.82, 5)
    expect(toMemorizeWebSpeechUtteranceRate(1.25, true)).toBeCloseTo(1.25 * 0.82, 5)
  })
})
