/**
 * @jest-environment jsdom
 */

jest.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => true },
}))

import {
  setProfileHelpTourClientNavigate,
  scriptureReaderTourNavigation,
} from '@/lib/profileHelpTours'

describe('scriptureReaderTourNavigation.assign on Capacitor', () => {
  afterEach(() => {
    setProfileHelpTourClientNavigate(null)
    jest.restoreAllMocks()
  })

  it('calls registered client navigate instead of location.assign', () => {
    const push = jest.fn()
    setProfileHelpTourClientNavigate(push)

    scriptureReaderTourNavigation.assign('/default')

    expect(push).toHaveBeenCalledWith('/default')
  })
})
