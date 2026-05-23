import { memorizationSaveFailureMessage } from '@/lib/memorizationSaveFailureMessage'

jest.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => false,
    getPlatform: () => 'web',
  },
}))

describe('memorizationSaveFailureMessage', () => {
  it('describes storage full separately from private browsing on web', () => {
    expect(memorizationSaveFailureMessage('storage_full')).toContain('storage for this site is full')
    expect(memorizationSaveFailureMessage('storage_unavailable')).toContain('Private Browsing')
  })
})
