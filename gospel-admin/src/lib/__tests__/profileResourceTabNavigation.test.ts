import {
  clearProfileResourceTabNavigationStaging,
  consumeProfileResourceTabNavigation,
  isProfileResourceTabNavigationPending,
  markProfileResourceTabNavigation,
  peekProfileResourceTabNavigation,
  PROFILE_RESOURCE_TAB_NAV_SESSION_KEY,
  resetProfileResourceTabNavigationForTests,
} from '../profileResourceTabNavigation'

describe('profileResourceTabNavigation', () => {
  beforeEach(() => {
    sessionStorage.clear()
    resetProfileResourceTabNavigationForTests()
  })

  it('marks and consumes tab navigation with resume payload', () => {
    markProfileResourceTabNavigation('ppgr', {
      v: 1,
      anchorId: 'section-1-0',
      plainOffset: 12,
      fingerprint: 'abc',
    })
    expect(isProfileResourceTabNavigationPending('ppgr')).toBe(true)
    expect(consumeProfileResourceTabNavigation('ppgr')).toEqual({
      v: 1,
      anchorId: 'section-1-0',
      plainOffset: 12,
      fingerprint: 'abc',
    })
    expect(sessionStorage.getItem(PROFILE_RESOURCE_TAB_NAV_SESSION_KEY)).toBeNull()
    expect(consumeProfileResourceTabNavigation('ppgr')).toBeUndefined()
  })

  it('peek is idempotent until staging is cleared (Strict Mode remount)', () => {
    const resume = {
      v: 1 as const,
      anchorId: 'section-1-0-2',
      plainOffset: 4,
      fingerprint: 'fp',
    }
    markProfileResourceTabNavigation('default', resume)
    expect(peekProfileResourceTabNavigation('default')).toEqual(resume)
    expect(peekProfileResourceTabNavigation('default')).toEqual(resume)
    clearProfileResourceTabNavigationStaging()
    expect(peekProfileResourceTabNavigation('default')).toBeUndefined()
  })

  it('marks tab navigation without resume', () => {
    markProfileResourceTabNavigation('default', null)
    expect(consumeProfileResourceTabNavigation('default')).toBeNull()
  })

  it('does not consume for a different slug', () => {
    markProfileResourceTabNavigation('default', null)
    expect(consumeProfileResourceTabNavigation('ppgr')).toBeUndefined()
    expect(isProfileResourceTabNavigationPending('default')).toBe(true)
  })

  it('clear for one slug does not remove staging for another', () => {
    const resumeDefault = {
      v: 1 as const,
      anchorId: 'section-1',
      plainOffset: 0,
      fingerprint: 'a',
    }
    const resumePpgr = {
      v: 1 as const,
      anchorId: 'section-2',
      plainOffset: 40,
      fingerprint: 'b',
    }
    markProfileResourceTabNavigation('default', resumeDefault)
    markProfileResourceTabNavigation('ppgr', resumePpgr)
    clearProfileResourceTabNavigationStaging('default')
    expect(peekProfileResourceTabNavigation('default')).toBeUndefined()
    expect(peekProfileResourceTabNavigation('ppgr')).toEqual(resumePpgr)
    expect(isProfileResourceTabNavigationPending('ppgr')).toBe(true)
  })
})
