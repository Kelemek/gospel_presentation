/**
 * @jest-environment jsdom
 */

const mockPush = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

jest.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => true },
}))

import { render } from '@testing-library/react'
import { CapacitorProfileHelpTourNavigation } from '../CapacitorProfileHelpTourNavigation'
import { scriptureReaderTourNavigation, setProfileHelpTourClientNavigate } from '@/lib/profileHelpTours'

describe('CapacitorProfileHelpTourNavigation', () => {
  afterEach(() => {
    setProfileHelpTourClientNavigate(null)
    mockPush.mockClear()
  })

  it('registers router.push for native so tour assign uses in-app navigation', () => {
    render(<CapacitorProfileHelpTourNavigation />)

    scriptureReaderTourNavigation.assign('/default')

    expect(mockPush).toHaveBeenCalledWith('/default')
  })
})
