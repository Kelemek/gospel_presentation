import { GOSPEL_SYNC_STARTUP_PULL_DONE_EVENT } from '@/lib/gospelDeviceSync/constants'
import { isDeviceSyncActive } from '@/lib/gospelDeviceSync/dirty'

const STARTUP_PULL_WAIT_MS = 1_200

/** Lets profile reading-resume restore wait for the first sync pull on cold load. */
export function waitForDeviceSyncStartupPull(): Promise<void> {
  if (typeof window === 'undefined' || !isDeviceSyncActive()) {
    return Promise.resolve()
  }

  return new Promise((resolve) => {
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      window.removeEventListener(GOSPEL_SYNC_STARTUP_PULL_DONE_EVENT, onDone)
      window.clearTimeout(timer)
      resolve()
    }
    const onDone = () => finish()
    const timer = window.setTimeout(finish, STARTUP_PULL_WAIT_MS)
    window.addEventListener(GOSPEL_SYNC_STARTUP_PULL_DONE_EVENT, onDone)
  })
}
