/**
 * @jest-environment jsdom
 */

const mockPush = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

jest.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => true,
    getPlatform: () => 'android',
  },
}))

import { render } from '@testing-library/react'
import { CapacitorProfileHelpTourNavigation } from '../CapacitorProfileHelpTourNavigation'
import { scriptureReaderTourNavigation, setProfileHelpTourClientNavigate } from '@/lib/profileHelpTours'

describe('CapacitorProfileHelpTourNavigation', () => {
  afterEach(() => {
    setProfileHelpTourClientNavigate(null)
    mockPush.mockClear()
    document.body.classList.remove('capacitor-native', 'capacitor-android', 'capacitor-ios')
  })

  it('registers router.push for native so tour assign uses in-app navigation', () => {
    render(<CapacitorProfileHelpTourNavigation />)

    scriptureReaderTourNavigation.assign('/default')

    expect(mockPush).toHaveBeenCalledWith('/default')
  })

  it('tags body with capacitor-native + capacitor-<platform> classes while mounted on native', () => {
    const { unmount } = render(<CapacitorProfileHelpTourNavigation />)

    expect(document.body.classList.contains('capacitor-native')).toBe(true)
    expect(document.body.classList.contains('capacitor-android')).toBe(true)

    unmount()

    expect(document.body.classList.contains('capacitor-native')).toBe(false)
    expect(document.body.classList.contains('capacitor-android')).toBe(false)
  })
})
