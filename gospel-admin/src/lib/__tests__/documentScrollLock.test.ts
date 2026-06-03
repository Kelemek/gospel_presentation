import { lockDocumentScroll, resetDocumentScrollLockForTests } from '@/lib/documentScrollLock'

describe('lockDocumentScroll', () => {
  const scrollToSpy = jest.spyOn(window, 'scrollTo').mockImplementation(() => {})

  beforeEach(() => {
    resetDocumentScrollLockForTests()
    scrollToSpy.mockClear()
    Object.defineProperty(window, 'scrollY', { value: 240, configurable: true, writable: true })
    Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true })
    Object.defineProperty(document.documentElement, 'clientWidth', {
      value: 1024,
      configurable: true,
    })
  })

  afterAll(() => {
    scrollToSpy.mockRestore()
    resetDocumentScrollLockForTests()
  })

  it('fixes body at current scrollY while locked and restores on unlock', () => {
    const unlock = lockDocumentScroll()
    expect(document.body.style.position).toBe('fixed')
    expect(document.body.style.top).toBe('-240px')

    unlock()
    expect(scrollToSpy).toHaveBeenCalledWith(0, 240)
    expect(document.body.style.position).toBe('')
    expect(document.body.style.top).toBe('')
  })

  it('supports nested locks with a single restore', () => {
    const unlockA = lockDocumentScroll()
    const unlockB = lockDocumentScroll()
    unlockB()
    expect(scrollToSpy).not.toHaveBeenCalled()
    unlockA()
    expect(scrollToSpy).toHaveBeenCalledWith(0, 240)
  })
})
