import {
  consumePendingBookmarkResume,
  setPendingBookmarkResume,
} from '../profileBookmarkResumeSession'

describe('profileBookmarkResumeSession', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('set and consume pending bookmark resume once', () => {
    setPendingBookmarkResume({
      anchorId: 'section-2-1',
      plainOffset: 99,
      fingerprint: 'abc',
    })
    expect(consumePendingBookmarkResume()).toEqual({
      v: 1,
      anchorId: 'section-2-1',
      plainOffset: 99,
      fingerprint: 'abc',
    })
    expect(consumePendingBookmarkResume()).toBeNull()
  })
})
