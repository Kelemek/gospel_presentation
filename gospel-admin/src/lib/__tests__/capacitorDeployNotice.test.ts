import {
  markCapacitorDeployNoticeShown,
  shouldShowCapacitorDeployNotice,
} from '@/lib/capacitorDeployNotice'

describe('capacitorDeployNotice', () => {
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
