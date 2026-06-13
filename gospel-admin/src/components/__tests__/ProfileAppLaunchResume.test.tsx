import { render, waitFor } from '@testing-library/react'
import * as gospelClientStorage from '@/lib/gospelClientStorage'
import { installTestLocalStorage, resetGospelStorageTestState } from '@/lib/testing/testLocalStorage'
import {
  PROFILE_APP_LAUNCH_RESUME_SESSION_KEY,
  recordProfileLastOpenOnEnter,
} from '@/lib/profileLastOpenResourceStorage'

const mockReplace = jest.fn()

jest.mock('next/navigation', () => ({
  usePathname: () => '/default',
  useRouter: () => ({ replace: mockReplace }),
}))

describe('ProfileAppLaunchResume', () => {
  beforeEach(async () => {
    await resetGospelStorageTestState()
    installTestLocalStorage()
    mockReplace.mockClear()
    sessionStorage.removeItem(PROFILE_APP_LAUNCH_RESUME_SESSION_KEY)
    window.history.replaceState(null, '', '/default')
    jest.spyOn(gospelClientStorage, 'hydrateGospelClientStorage').mockResolvedValue(undefined)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('redirects from /default to last active profile once per session', async () => {
    recordProfileLastOpenOnEnter('last-slug', 'Last Resource')

    const { ProfileAppLaunchResume } = require('../ProfileAppLaunchResume')
    render(<ProfileAppLaunchResume />)

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/last-slug', { scroll: false })
    })
    expect(sessionStorage.getItem(PROFILE_APP_LAUNCH_RESUME_SESSION_KEY)).toBe('1')
  })

  it('does not redirect when session flag already set', async () => {
    recordProfileLastOpenOnEnter('x', 'X')
    sessionStorage.setItem(PROFILE_APP_LAUNCH_RESUME_SESSION_KEY, '1')

    const { ProfileAppLaunchResume } = require('../ProfileAppLaunchResume')
    render(<ProfileAppLaunchResume />)

    await waitFor(() => {
      expect(sessionStorage.getItem(PROFILE_APP_LAUNCH_RESUME_SESSION_KEY)).toBe('1')
    })
    expect(mockReplace).not.toHaveBeenCalled()
  })
})
