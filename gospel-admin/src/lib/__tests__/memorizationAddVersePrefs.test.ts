/**
 * @jest-environment jsdom
 */

import {
  MEMORIZE_ADD_TESTAMENT_KEY,
  memorizeAddBookFromReference,
  readMemorizeAddTestament,
  writeMemorizeAddTestament,
} from '@/lib/memorizationAddVersePrefs'

describe('memorizationAddVersePrefs', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
  })

  it('defaults to Old Testament when unset', () => {
    expect(readMemorizeAddTestament()).toBe('ot')
  })

  it('persists testament tab in sessionStorage', () => {
    writeMemorizeAddTestament('nt')
    expect(window.sessionStorage.getItem(MEMORIZE_ADD_TESTAMENT_KEY)).toBe('nt')
    expect(readMemorizeAddTestament()).toBe('nt')
  })

  it('resolves 1 Peter 2:13 to NT book 1PE', () => {
    const book = memorizeAddBookFromReference('1 Peter 2:13')
    expect(book).not.toBeNull()
    expect(book?.id).toBe('1PE')
    expect(book?.testament).toBe('nt')
    expect(book?.name).toBe('1 Peter')
  })
})
