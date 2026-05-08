/**
 * @jest-environment jsdom
 */

import {
  PROFILE_READ_ALONG_UNDERLINE_STYLE_STORAGE_KEY,
  readProfileReadAlongUnderlineStyleFromStorage,
  writeProfileReadAlongUnderlineStyleToStorage,
} from '@/lib/profileReadAlongUnderlineStyleStorage'

const KEY = PROFILE_READ_ALONG_UNDERLINE_STYLE_STORAGE_KEY

describe('profileReadAlongUnderlineStyleStorage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('defaults to word', () => {
    expect(readProfileReadAlongUnderlineStyleFromStorage()).toBe('word')
  })

  it('round-trips line', () => {
    writeProfileReadAlongUnderlineStyleToStorage('line')
    expect(localStorage.getItem(KEY)).toBe('line')
    expect(readProfileReadAlongUnderlineStyleFromStorage()).toBe('line')
  })

  it('ignores invalid stored values', () => {
    localStorage.setItem(KEY, 'bogus')
    expect(readProfileReadAlongUnderlineStyleFromStorage()).toBe('word')
  })
})
