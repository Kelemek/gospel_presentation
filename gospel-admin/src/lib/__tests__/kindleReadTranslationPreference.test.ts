/**
 * @jest-environment jsdom
 */

import {
  GOSPEL_PREFERRED_TRANSLATION_KEY,
  isKindleReadTranslationPreferenceRoute,
  kindleReadTranslationSwitchUrl,
  readKindleReadTranslationFromCookie,
  readKindleReadTranslationFromQueryString,
  resolveKindleReadTranslation,
  shortTranslationMenuLabel,
  syncKindleReadTranslationPreference,
  translationDisplayName,
  writeKindleReadTranslationToLocalStorage,
} from '@/lib/kindleReadTranslationPreference'

describe('kindleReadTranslationPreference', () => {
  const enabled = ['esv', 'kjv', 'nasb'] as const

  beforeEach(() => {
    localStorage.clear()
    document.cookie = `${GOSPEL_PREFERRED_TRANSLATION_KEY}=; path=/; max-age=0`
    window.history.replaceState({}, '', '/default/read/')
  })

  it('resolveKindleReadTranslation validates against enabled codes', () => {
    expect(resolveKindleReadTranslation('kjv', enabled)).toBe('kjv')
    expect(resolveKindleReadTranslation('niv', enabled)).toBe('esv')
    expect(resolveKindleReadTranslation(null, enabled)).toBe('esv')
  })

  it('shortTranslationMenuLabel uses text before parenthesis', () => {
    expect(shortTranslationMenuLabel('ESV (English Standard Version)', 'esv')).toBe('ESV')
    expect(shortTranslationMenuLabel('', 'kjv')).toBe('KJV')
  })

  it('translationDisplayName finds the enabled option label', () => {
    const options = [
      { translation_code: 'esv', translation_name: 'ESV (English Standard Version)' },
      { translation_code: 'kjv', translation_name: 'KJV (King James Version)' },
    ]
    expect(translationDisplayName(options, 'kjv')).toBe('KJV (King James Version)')
    expect(translationDisplayName(options, 'nasb')).toBe('NASB')
  })

  it('uses the shared storage key with the main app', () => {
    expect(GOSPEL_PREFERRED_TRANSLATION_KEY).toBe('gospel-preferred-translation')
  })

  it('kindleReadTranslationSwitchUrl builds a query link for the read page', () => {
    expect(kindleReadTranslationSwitchUrl('default', 'kjv')).toBe('/default/read/?translation=kjv')
  })

  it('syncKindleReadTranslationPreference saves ?translation= to localStorage', () => {
    window.history.replaceState({}, '', '/default/read/?translation=kjv')

    syncKindleReadTranslationPreference()

    expect(localStorage.getItem(GOSPEL_PREFERRED_TRANSLATION_KEY)).toBe('kjv')
    expect(readKindleReadTranslationFromCookie()).toBe('kjv')
  })

  it('syncKindleReadTranslationPreference copies cookie to localStorage when URL has no param', () => {
    document.cookie = `${GOSPEL_PREFERRED_TRANSLATION_KEY}=nasb; path=/`

    syncKindleReadTranslationPreference()

    expect(localStorage.getItem(GOSPEL_PREFERRED_TRANSLATION_KEY)).toBe('nasb')
  })

  it('query param wins over stale localStorage when syncing', () => {
    writeKindleReadTranslationToLocalStorage('esv')
    window.history.replaceState({}, '', '/default/read/?translation=kjv')

    syncKindleReadTranslationPreference()

    expect(localStorage.getItem(GOSPEL_PREFERRED_TRANSLATION_KEY)).toBe('kjv')
    expect(readKindleReadTranslationFromCookie()).toBe('kjv')
  })

  it('readKindleReadTranslationFromQueryString reads the translation search param', () => {
    window.history.replaceState({}, '', '/default/read/?translation=NASB')
    expect(readKindleReadTranslationFromQueryString()).toBe('nasb')
  })

  it('isKindleReadTranslationPreferenceRoute matches profile read and scripture paths', () => {
    expect(isKindleReadTranslationPreferenceRoute('/default/read/')).toBe(true)
    expect(isKindleReadTranslationPreferenceRoute('/default/read')).toBe(true)
    expect(isKindleReadTranslationPreferenceRoute('/read/scripture/')).toBe(true)
    expect(isKindleReadTranslationPreferenceRoute('/read/libraries/spurgeon/')).toBe(false)
    expect(isKindleReadTranslationPreferenceRoute('/read/read/')).toBe(false)
  })
})
