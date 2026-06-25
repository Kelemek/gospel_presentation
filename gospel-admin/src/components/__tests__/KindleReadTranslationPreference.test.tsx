/**
 * @jest-environment jsdom
 */

import { render } from '@testing-library/react'
import KindleReadTranslationPreference from '@/components/KindleReadTranslationPreference'
import { GOSPEL_PREFERRED_TRANSLATION_KEY } from '@/lib/kindleReadTranslationPreference'

jest.mock('@/lib/gospelClientStorage', () => ({
  gospelStorageSetSync: jest.fn(),
}))

import { gospelStorageSetSync } from '@/lib/gospelClientStorage'

describe('KindleReadTranslationPreference', () => {
  beforeEach(() => {
    localStorage.clear()
    document.cookie = `${GOSPEL_PREFERRED_TRANSLATION_KEY}=; path=/; max-age=0`
    window.history.replaceState({}, '', '/default/read/')
    jest.mocked(gospelStorageSetSync).mockClear()
  })

  it('persists ?translation= via gospelStorageSetSync on mount', () => {
    window.history.replaceState({}, '', '/default/read/?translation=kjv')

    render(<KindleReadTranslationPreference />)

    expect(gospelStorageSetSync).toHaveBeenCalledWith(GOSPEL_PREFERRED_TRANSLATION_KEY, 'kjv')
  })

  it('mirrors cookie translation into gospelStorageSetSync when URL has no param', () => {
    document.cookie = `${GOSPEL_PREFERRED_TRANSLATION_KEY}=kjv; path=/`

    render(<KindleReadTranslationPreference />)

    expect(gospelStorageSetSync).toHaveBeenCalledWith(GOSPEL_PREFERRED_TRANSLATION_KEY, 'kjv')
  })
})
