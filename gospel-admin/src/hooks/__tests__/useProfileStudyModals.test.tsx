import { renderHook, act } from '@testing-library/react'
import { useProfileStudyModals } from '@/hooks/useProfileStudyModals'

jest.mock('@/lib/profileLastOpenResourceStorage', () => ({
  resolveScriptureModalTabToRestore: jest.fn(() => null),
}))

describe('useProfileStudyModals', () => {
  const baseOptions = {
    profileSlug: 'default',
    closeMenu: jest.fn(),
    closeModal: jest.fn(),
    openScriptureFromTabEntry: jest.fn(),
    navigateScriptureInReader: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('opens and closes M\'Cheyne plan via intent API', () => {
    const { result } = renderHook(() => useProfileStudyModals(baseOptions))

    expect(result.current.isMcheynePlanModalOpen).toBe(false)
    act(() => result.current.openMcheynePlan())
    expect(result.current.isMcheynePlanModalOpen).toBe(true)
    act(() => result.current.closeMcheynePlan())
    expect(result.current.isMcheynePlanModalOpen).toBe(false)
  })

  it('opens bible reader when no scripture tab is saved', () => {
    const { result } = renderHook(() => useProfileStudyModals(baseOptions))

    act(() => result.current.handleOpenBibleReader())
    expect(baseOptions.closeMenu).toHaveBeenCalled()
    expect(result.current.bibleReaderOpen).toBe(true)
  })
})
