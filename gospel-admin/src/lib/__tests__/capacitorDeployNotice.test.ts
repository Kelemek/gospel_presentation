import {
  getAcknowledgedDeployVersion,
  getSeenChangelogCount,
  selectChangelogMessagesToShow,
  setSeenChangelogCount,
} from '@/lib/capacitorAppDeployVersion'
import {
  acknowledgeCapacitorDeployChangelog,
  buildCapacitorRestartAppNotice,
  buildCapacitorWhatsNewNotice,
  CAPACITOR_RESTART_APP_NOTICE,
  CAPACITOR_WHATS_NEW_NOTICE_SHOWN_SESSION_KEY,
  markCapacitorDeployNoticeShown,
  markCapacitorWhatsNewShownThisSession,
  shouldShowCapacitorDeployNotice,
  shouldShowCapacitorWhatsNewOnColdStart,
} from '@/lib/capacitorDeployNotice'

describe('capacitorDeployNotice', () => {
  it('buildCapacitorRestartAppNotice omits changelog when there are no unseen messages', () => {
    expect(buildCapacitorRestartAppNotice()).toBe(CAPACITOR_RESTART_APP_NOTICE)
    expect(buildCapacitorRestartAppNotice([])).toBe(CAPACITOR_RESTART_APP_NOTICE)
  })

  it('buildCapacitorRestartAppNotice inserts unseen changelog before restart instructions', () => {
    const notice = buildCapacitorRestartAppNotice(['Fixed the Resources menu on iPhone.'])
    expect(notice).toContain('Update available')
    expect(notice).toContain('What has changed:')
    expect(notice).toContain('Fixed the Resources menu on iPhone.')
    expect(notice).toContain('close the Gospel Presentation app completely')
  })

  it('buildCapacitorRestartAppNotice numbers multiple unseen messages', () => {
    const notice = buildCapacitorRestartAppNotice([
      'Older release note.',
      'Latest release note.',
    ])
    expect(notice).toContain('1. Older release note.')
    expect(notice).toContain('2. Latest release note.')
  })

  beforeEach(() => {
    sessionStorage.clear()
    localStorage.clear()
  })

  it('shouldShowCapacitorDeployNotice is true until marked for that version', () => {
    expect(shouldShowCapacitorDeployNotice('deploy-new')).toBe(true)
    markCapacitorDeployNoticeShown('deploy-new')
    expect(shouldShowCapacitorDeployNotice('deploy-new')).toBe(false)
    expect(shouldShowCapacitorDeployNotice('deploy-next')).toBe(true)
  })

  it('buildCapacitorWhatsNewNotice formats one or more missed updates', () => {
    expect(buildCapacitorWhatsNewNotice(['Fixed the Resources menu on iPhone.'])).toBe(
      "What's new\n\nFixed the Resources menu on iPhone."
    )
    expect(
      buildCapacitorWhatsNewNotice([
        'Fixed the Resources menu on iPhone.',
        'Daily verse challenge: clearer feedback when you finish a day.',
      ])
    ).toBe(
      "What's new\n\n1. Fixed the Resources menu on iPhone.\n\n2. Daily verse challenge: clearer feedback when you finish a day."
    )
    expect(buildCapacitorWhatsNewNotice(['   '])).toBeNull()
  })

  it('acknowledgeCapacitorDeployChangelog persists acknowledged count and deploy version', () => {
    const changelog = ['one', 'two']
    setSeenChangelogCount(1)
    const { nextAcknowledgedCount } = selectChangelogMessagesToShow(changelog, 1)
    expect(nextAcknowledgedCount).toBe(2)

    acknowledgeCapacitorDeployChangelog(nextAcknowledgedCount, 'deploy-new')

    expect(getSeenChangelogCount()).toBe(2)
    expect(getAcknowledgedDeployVersion()).toBe('deploy-new')
  })

  it('shouldShowCapacitorWhatsNewOnColdStart is false after marking this session', () => {
    expect(shouldShowCapacitorWhatsNewOnColdStart()).toBe(true)
    markCapacitorWhatsNewShownThisSession()
    expect(shouldShowCapacitorWhatsNewOnColdStart()).toBe(false)
    expect(sessionStorage.getItem(CAPACITOR_WHATS_NEW_NOTICE_SHOWN_SESSION_KEY)).toBe('1')
  })
})
