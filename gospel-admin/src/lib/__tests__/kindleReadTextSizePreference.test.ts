import {
  applyKindleReadTextSizeClass,
  GOSPEL_PROFILE_TEXT_SIZE_KEY,
  isKindleReadTextSizePreferenceRoute,
  kindleReadTextSizeSwitchUrl,
  resolveKindleReadTextSize,
  syncKindleReadTextSizePreference,
} from '@/lib/kindleReadTextSizePreference'

describe('kindleReadTextSizePreference', () => {
  beforeEach(() => {
    document.documentElement.classList.remove(
      'text-size-normal',
      'text-size-larger',
      'text-size-largest'
    )
    document.cookie = `${GOSPEL_PROFILE_TEXT_SIZE_KEY}=; path=/; max-age=0`
    localStorage.clear()
  })

  it('resolveKindleReadTextSize falls back to normal for invalid values', () => {
    expect(resolveKindleReadTextSize('larger')).toBe('larger')
    expect(resolveKindleReadTextSize('invalid')).toBe('normal')
    expect(resolveKindleReadTextSize(null)).toBe('normal')
  })

  it('kindleReadTextSizeSwitchUrl preserves translation when not ESV', () => {
    expect(kindleReadTextSizeSwitchUrl('default', 'larger')).toBe('/default/read/?textSize=larger')
    expect(kindleReadTextSizeSwitchUrl('default', 'largest', 'kjv')).toBe(
      '/default/read/?textSize=largest&translation=kjv'
    )
  })

  it('isKindleReadTextSizePreferenceRoute matches Kindle read paths', () => {
    expect(isKindleReadTextSizePreferenceRoute('/default/read/')).toBe(true)
    expect(isKindleReadTextSizePreferenceRoute('/read/scripture/')).toBe(true)
    expect(isKindleReadTextSizePreferenceRoute('/read/libraries/spurgeon/')).toBe(true)
    expect(isKindleReadTextSizePreferenceRoute('/default/')).toBe(false)
  })

  it('syncKindleReadTextSizePreference applies class from query param', () => {
    window.history.replaceState({}, '', '/default/read/?textSize=largest')
    syncKindleReadTextSizePreference()
    expect(document.documentElement.classList.contains('text-size-largest')).toBe(true)
    expect(localStorage.getItem(GOSPEL_PROFILE_TEXT_SIZE_KEY)).toBe('largest')
  })

  it('applyKindleReadTextSizeClass swaps html classes', () => {
    applyKindleReadTextSizeClass('larger')
    expect(document.documentElement.classList.contains('text-size-larger')).toBe(true)
    expect(document.documentElement.classList.contains('text-size-normal')).toBe(false)
  })
})
