/**
 * @jest-environment jsdom
 */

import { GOSPEL_SYNC_STARTUP_PULL_DONE_EVENT } from '@/lib/gospelDeviceSync/constants'
import { waitForDeviceSyncStartupPull } from '@/lib/gospelDeviceSync/waitForStartupPull'

describe('waitForDeviceSyncStartupPull', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    window.localStorage.clear()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('resolves immediately when sync is not active', async () => {
    await expect(waitForDeviceSyncStartupPull()).resolves.toBeUndefined()
  })

  it('resolves when startup pull done event fires', async () => {
    window.localStorage.setItem('gospel-sync-enabled:v1', '1')
    window.localStorage.setItem('gospel-sync-key:v1', 'dGVzdC1zeW5jLWtleS0xMjM0NTY3ODkwMTIzNDU2Nzg5MDE=')

    const pending = waitForDeviceSyncStartupPull()
    window.dispatchEvent(new CustomEvent(GOSPEL_SYNC_STARTUP_PULL_DONE_EVENT))
    await expect(pending).resolves.toBeUndefined()
  })

  it('resolves after timeout when event never fires', async () => {
    window.localStorage.setItem('gospel-sync-enabled:v1', '1')
    window.localStorage.setItem('gospel-sync-key:v1', 'dGVzdC1zeW5jLWtleS0xMjM0NTY3ODkwMTIzNDU2Nzg5MDE=')

    const pending = waitForDeviceSyncStartupPull()
    jest.advanceTimersByTime(1_200)
    await expect(pending).resolves.toBeUndefined()
  })
})
