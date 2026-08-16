/**
 * @jest-environment jsdom
 */

import { act, renderHook } from '@testing-library/react'
import { useProfileMcheyneNavigation } from '@/hooks/useProfileMcheyneNavigation'
import { setPendingMcheynePlanDay } from '@/lib/mcheyne/mcheynePendingNavigation'

const mockPush = jest.fn()
const mockReplace = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  usePathname: () => '/other',
}))

jest.mock('@/lib/mcheyne/mcheynePendingNavigation', () => {
  const actual = jest.requireActual('@/lib/mcheyne/mcheynePendingNavigation')
  return {
    ...actual,
    setPendingMcheynePlanDay: jest.fn(actual.setPendingMcheynePlanDay),
    setPendingMcheyneResumePin: jest.fn(actual.setPendingMcheyneResumePin),
  }
})

jest.mock('@/lib/mcheyne/mcheyneResumeYellowPin', () => ({
  loadMcheyneYellowPinForResume: jest.fn(async () => null),
}))

jest.mock('@/lib/scrollToTocAnchor', () => ({
  scrollToTocAnchorWhenReady: jest.fn(() => () => {}),
}))

const sections = [
  {
    section: 'jan',
    title: 'January',
    subsections: [{ title: 'Day 1', content: '', questions: [] }],
  },
]

describe('useProfileMcheyneNavigation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('navigateMcheynePlanDay pushes to /mchy when not already on mchy', () => {
    const { result } = renderHook(() =>
      useProfileMcheyneNavigation({
        isHydrated: true,
        sectionCount: 1,
        profileSlug: 'default',
        sections,
        studyRefParam: '',
        mcheynePlanDayParam: '',
        mcheyneResumePinParam: '',
        bumpVersePins: jest.fn(),
      })
    )

    act(() => {
      result.current.navigateMcheynePlanDay(42)
    })

    expect(setPendingMcheynePlanDay).toHaveBeenCalledWith(42)
    expect(mockPush).toHaveBeenCalledWith('/mchy?planDay=42', { scroll: false })
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('navigateMcheynePlanDay replaces when already on mchy', () => {
    const { result } = renderHook(() =>
      useProfileMcheyneNavigation({
        isHydrated: true,
        sectionCount: 1,
        profileSlug: 'mchy',
        sections,
        studyRefParam: '',
        mcheynePlanDayParam: '',
        mcheyneResumePinParam: '',
        bumpVersePins: jest.fn(),
      })
    )

    act(() => {
      result.current.navigateMcheynePlanDay(7)
    })

    expect(mockReplace).toHaveBeenCalledWith('/mchy?planDay=7', { scroll: false })
    expect(mockPush).not.toHaveBeenCalled()
  })
})
