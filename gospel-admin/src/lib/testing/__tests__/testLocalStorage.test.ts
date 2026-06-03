import {
  createTestStorage,
  installTestSessionStorage,
} from '@/lib/testing/testLocalStorage'

describe('installTestSessionStorage', () => {
  it('persists values on window.sessionStorage (not jest.fn mocks)', () => {
    installTestSessionStorage()
    window.sessionStorage.setItem('tab-scroll', '150')
    expect(window.sessionStorage.getItem('tab-scroll')).toBe('150')
    expect(sessionStorage.getItem('tab-scroll')).toBe('150')
  })

  it('createTestStorage round-trips without install', () => {
    const storage = createTestStorage()
    storage.setItem('a', 'b')
    expect(storage.getItem('a')).toBe('b')
  })
})
