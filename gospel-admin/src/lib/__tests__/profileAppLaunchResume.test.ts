import * as gospelClientStorage from '@/lib/gospelClientStorage'
import { installTestLocalStorage, resetGospelStorageTestState } from '@/lib/testing/testLocalStorage'
import {
  PROFILE_APP_LAUNCH_RESUME_SESSION_KEY,
  recordProfileLastOpenOnEnter,
} from '../profileLastOpenResourceStorage'
import { applyProfileAppLaunchResume } from '../profileAppLaunchResume'

describe('applyProfileAppLaunchResume', () => {
  const replace = jest.fn()
  let currentPath = '/'

  beforeEach(async () => {
    await resetGospelStorageTestState()
    installTestLocalStorage()
    replace.mockClear()
    currentPath = '/'
    sessionStorage.removeItem(PROFILE_APP_LAUNCH_RESUME_SESSION_KEY)
    jest.spyOn(gospelClientStorage, 'hydrateGospelClientStorage').mockResolvedValue(undefined)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  const getPathname = () => currentPath

  it('from / routes to last active profile after hydration', async () => {
    currentPath = '/'
    recordProfileLastOpenOnEnter('last-slug', 'Last')

    await applyProfileAppLaunchResume(replace, { getPathname })

    expect(replace).toHaveBeenCalledWith('/last-slug')
    expect(sessionStorage.getItem(PROFILE_APP_LAUNCH_RESUME_SESSION_KEY)).toBe('1')
  })

  it('from /default routes to last active profile on first launch in session', async () => {
    currentPath = '/default'
    recordProfileLastOpenOnEnter('last-slug', 'Last')

    await applyProfileAppLaunchResume(replace, { getPathname })

    expect(replace).toHaveBeenCalledWith('/last-slug')
    expect(sessionStorage.getItem(PROFILE_APP_LAUNCH_RESUME_SESSION_KEY)).toBe('1')
  })

  it('from / with session flag goes to /default not last profile', async () => {
    currentPath = '/'
    recordProfileLastOpenOnEnter('last-slug', 'Last')
    sessionStorage.setItem(PROFILE_APP_LAUNCH_RESUME_SESSION_KEY, '1')

    await applyProfileAppLaunchResume(replace, { getPathname })

    expect(replace).toHaveBeenCalledWith('/default')
    expect(replace).not.toHaveBeenCalledWith('/last-slug')
  })

  it('from /default with session flag does not re-route to last profile', async () => {
    currentPath = '/default'
    recordProfileLastOpenOnEnter('last-slug', 'Last')
    sessionStorage.setItem(PROFILE_APP_LAUNCH_RESUME_SESSION_KEY, '1')

    await applyProfileAppLaunchResume(replace, { getPathname })

    expect(replace).not.toHaveBeenCalled()
  })

  it('does not route when pathname moves to /admin before hydration finishes', async () => {
    currentPath = '/default'
    recordProfileLastOpenOnEnter('last-slug', 'Last')

    jest.spyOn(gospelClientStorage, 'hydrateGospelClientStorage').mockImplementation(async () => {
      currentPath = '/admin'
    })

    await applyProfileAppLaunchResume(replace, { getPathname })

    expect(replace).not.toHaveBeenCalled()
  })

  it('does not route when getPathname returns null (cancelled)', async () => {
    currentPath = '/default'
    recordProfileLastOpenOnEnter('last-slug', 'Last')

    await applyProfileAppLaunchResume(replace, { getPathname: () => null })

    expect(replace).not.toHaveBeenCalled()
  })

  it('does not throw when sessionStorage getItem fails', async () => {
    currentPath = '/default'
    recordProfileLastOpenOnEnter('last-slug', 'Last')
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('The operation is insecure.')
    })

    await expect(
      applyProfileAppLaunchResume(replace, { getPathname })
    ).resolves.toBeUndefined()
    expect(replace).toHaveBeenCalledWith('/last-slug')
  })

  it('still routes when sessionStorage setItem fails', async () => {
    currentPath = '/default'
    recordProfileLastOpenOnEnter('last-slug', 'Last')
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError')
    })

    await expect(
      applyProfileAppLaunchResume(replace, { getPathname })
    ).resolves.toBeUndefined()
    expect(replace).toHaveBeenCalledWith('/last-slug')
  })
})
