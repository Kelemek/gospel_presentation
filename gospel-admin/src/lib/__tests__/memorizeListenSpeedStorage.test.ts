import {
  MEMORIZE_LISTEN_SPEED_STORAGE_KEY,
  normalizeMemorizeListenSpeed,
  readMemorizeListenSpeedFromStorage,
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
})
