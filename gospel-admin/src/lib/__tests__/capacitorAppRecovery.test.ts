import {
  __setReloadImplementationForTests,
  attemptCapacitorRecoveryReload,
  CAPACITOR_RECOVERY_RELOAD_COUNT_KEY,
  CAPACITOR_RECOVERY_RELOAD_MAX_PER_SESSION,
  getCapacitorRecoveryReloadCount,
  hasGospelAppSurface,
} from '../capacitorAppRecovery'

jest.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => true },
}))

describe('capacitorAppRecovery', () => {
  let reloadMock: jest.Mock

  beforeEach(() => {
    sessionStorage.clear()
    reloadMock = jest.fn()
    __setReloadImplementationForTests(reloadMock)
  })

  afterEach(() => {
    __setReloadImplementationForTests(null)
  })

  it('reloads and increments the per-session counter', () => {
    expect(attemptCapacitorRecoveryReload('test')).toBe(true)
    expect(reloadMock).toHaveBeenCalled()
    expect(getCapacitorRecoveryReloadCount()).toBe(1)
  })

  it('stops after the session reload cap', () => {
    sessionStorage.setItem(
      CAPACITOR_RECOVERY_RELOAD_COUNT_KEY,
      String(CAPACITOR_RECOVERY_RELOAD_MAX_PER_SESSION)
    )
    expect(attemptCapacitorRecoveryReload('test')).toBe(false)
    expect(reloadMock).not.toHaveBeenCalled()
  })

  describe('hasGospelAppSurface', () => {
    afterEach(() => {
      document.body.innerHTML = ''
    })

    it('returns true when data-gospel-surface is present', () => {
      document.body.innerHTML = '<div data-gospel-surface></div>'
      expect(hasGospelAppSurface()).toBe(true)
    })

    it('returns true when main has painted children (static pages)', () => {
      document.body.innerHTML = '<main><section>Privacy</section></main>'
      expect(hasGospelAppSurface()).toBe(true)
    })

    it('returns false when neither marker nor main content exists', () => {
      document.body.innerHTML = '<div></div>'
      expect(hasGospelAppSurface()).toBe(false)
    })
  })
})
