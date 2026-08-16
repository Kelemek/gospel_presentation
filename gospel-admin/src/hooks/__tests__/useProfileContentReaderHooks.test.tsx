import { renderHook } from '@testing-library/react'
import { useProfileContentReaderHooks } from '@/hooks/useProfileContentReaderHooks'

const closeModal = jest.fn()
const openScriptureFromTabEntry = jest.fn()
const navigateScriptureInReader = jest.fn()
const persistOnLeave = jest.fn()
const handleSelectResourceTab = jest.fn()
const handleCloseResourceTab = jest.fn()
const navigateMcheynePlanDay = jest.fn()
const navigateMcheyneLatest = jest.fn()

jest.mock('@/hooks/useProfileScriptureModal', () => ({
  useProfileScriptureModal: jest.fn(() => ({
    selectedScriptureIsOpen: false,
    activeScripture: { reference: '', isOpen: false },
    closeModal,
    openScriptureFromTabEntry,
    navigateScriptureInReader,
    handleScriptureClick: jest.fn(),
  })),
}))

jest.mock('@/hooks/useProfileReadingResume', () => ({
  useProfileReadingResume: jest.fn(() => ({
    handleSelectResourceTab,
    handleCloseResourceTab,
    persistReadingResumeBeforeLeave: persistOnLeave,
  })),
}))

jest.mock('@/hooks/useProfileStudyModals', () => ({
  useProfileStudyModals: jest.fn(() => ({
    openStudyLibrary: jest.fn(),
    handleOpenBibleReader: jest.fn(),
  })),
}))

jest.mock('@/hooks/useProfileMcheyneNavigation', () => ({
  useProfileMcheyneNavigation: jest.fn(() => ({
    navigateMcheynePlanDay,
    navigateMcheyneLatest,
  })),
}))

import { useProfileScriptureModal } from '@/hooks/useProfileScriptureModal'
import { useProfileReadingResume } from '@/hooks/useProfileReadingResume'
import { useProfileStudyModals } from '@/hooks/useProfileStudyModals'

const profileInfo = {
  title: 'Default',
  slug: 'default',
  favoriteScriptures: [],
}

const sections = [{ id: 's1', title: 'Section', subsections: [] }]

const baseOptions = {
  isHydrated: true,
  sectionCount: 1,
  profileSlug: 'default',
  profileTitle: 'Default',
  sections: sections as never,
  profileInfo,
  scriptureRefParam: '',
  scriptureViewParam: '',
  translationParam: '',
  studyRefParam: '',
  mcheynePlanDayParam: '',
  mcheyneResumePinParam: '',
  translation: 'ESV' as const,
  enabledTranslations: ['ESV'] as const,
  translationsLoading: false,
  setTranslation: jest.fn(),
  router: { push: jest.fn() } as never,
  versePinMap: { yellow: null, bookmarks: [] },
  bumpVersePins: jest.fn(),
  persistReadingResumeBeforeLeave: jest.fn(),
  registerPersistBeforeLeave: jest.fn(),
  completeDailyVerseChallengeIfMatch: jest.fn(),
  closeMenu: jest.fn(),
  clearResourceSearch: jest.fn(),
}

describe('useProfileContentReaderHooks', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('wires scripture modal, reading resume, study modals, and M\'Cheyne navigation', () => {
    const registerPersistBeforeLeave = jest.fn()

    const { result } = renderHook(() =>
      useProfileContentReaderHooks({
        ...baseOptions,
        registerPersistBeforeLeave,
      })
    )

    expect(useProfileScriptureModal).toHaveBeenCalledWith(
      expect.objectContaining({
        profileSlug: 'default',
        scriptureRefParam: '',
        versePinMap: baseOptions.versePinMap,
        persistReadingResumeBeforeLeave: baseOptions.persistReadingResumeBeforeLeave,
      })
    )
    expect(useProfileReadingResume).toHaveBeenCalledWith(
      expect.objectContaining({
        profileSlug: 'default',
        selectedScriptureIsOpen: false,
        clearResourceSearch: baseOptions.clearResourceSearch,
      })
    )
    expect(useProfileStudyModals).toHaveBeenCalledWith({
      profileSlug: 'default',
      closeMenu: baseOptions.closeMenu,
      closeModal,
      openScriptureFromTabEntry,
      navigateScriptureInReader,
    })
    expect(registerPersistBeforeLeave).toHaveBeenCalledWith(persistOnLeave)
    expect(result.current.handleSelectResourceTab).toBe(handleSelectResourceTab)
    expect(result.current.navigateMcheyneLatest).toBe(navigateMcheyneLatest)
    expect(result.current.profileInfo).toBe(profileInfo)
  })

  it('passes scripture modal open state into reading resume', () => {
    jest.mocked(useProfileScriptureModal).mockReturnValueOnce({
      selectedScriptureIsOpen: true,
      activeScripture: { reference: 'John 3:16', isOpen: true },
      closeModal,
      openScriptureFromTabEntry,
      navigateScriptureInReader,
      handleScriptureClick: jest.fn(),
    } as never)

    renderHook(() => useProfileContentReaderHooks(baseOptions))

    expect(useProfileReadingResume).toHaveBeenCalledWith(
      expect.objectContaining({ selectedScriptureIsOpen: true })
    )
  })
})
