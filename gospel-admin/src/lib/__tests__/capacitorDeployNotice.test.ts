import {
  buildCapacitorRestartAppNotice,
  CAPACITOR_RESTART_APP_NOTICE,
  markCapacitorDeployNoticeShown,
  shouldShowCapacitorDeployNotice,
} from '@/lib/capacitorDeployNotice'

describe('capacitorDeployNotice', () => {
  it('buildCapacitorRestartAppNotice omits changelog when message is empty', () => {
    expect(buildCapacitorRestartAppNotice()).toBe(CAPACITOR_RESTART_APP_NOTICE)
    expect(buildCapacitorRestartAppNotice('   ')).toBe(CAPACITOR_RESTART_APP_NOTICE)
  })

  it('buildCapacitorRestartAppNotice inserts changelog before restart instructions', () => {
    const notice = buildCapacitorRestartAppNotice('Fixed the Resources menu on iPhone.')
    expect(notice).toContain('Update available')
    expect(notice).toContain('What has changed:')
    expect(notice).toContain('Fixed the Resources menu on iPhone.')
    expect(notice).toContain('close the Gospel Presentation app completely')
  })

  beforeEach(() => {
    sessionStorage.clear()
  })

  it('shouldShowCapacitorDeployNotice is true until marked for that version', () => {
    expect(shouldShowCapacitorDeployNotice('deploy-new')).toBe(true)
    markCapacitorDeployNoticeShown('deploy-new')
    expect(shouldShowCapacitorDeployNotice('deploy-new')).toBe(false)
    expect(shouldShowCapacitorDeployNotice('deploy-next')).toBe(true)
  })
})
