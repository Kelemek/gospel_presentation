import { renderHook } from '@testing-library/react'
import { useProfileContentHooks } from '@/hooks/useProfileContentHooks'
import { makeProfileContentHooksSlice } from '@/lib/testFixtures/profileContentHooksSlice'

jest.mock('@/hooks/useProfileContentBootstrap', () => ({
  useProfileContentBootstrap: jest.fn(),
}))
jest.mock('@/hooks/useProfileChromeState', () => ({
  useProfileChromeState: jest.fn(),
}))
jest.mock('@/hooks/useProfileContentReaderHooks', () => ({
  useProfileContentReaderHooks: jest.fn(),
}))

import { useProfileContentBootstrap } from '@/hooks/useProfileContentBootstrap'
import { useProfileChromeState } from '@/hooks/useProfileChromeState'
import { useProfileContentReaderHooks } from '@/hooks/useProfileContentReaderHooks'

const profileInfo = {
  title: 'Default',
  slug: 'default',
  favoriteScriptures: ['John 3:16'],
}

const sections = [{ id: 's1', title: 'Section', subsections: [] }]

function mockSlices(overrides?: {
  bootstrap?: Partial<ReturnType<typeof useProfileContentBootstrap>>
  chrome?: Partial<ReturnType<typeof useProfileChromeState>>
  reader?: Partial<ReturnType<typeof useProfileContentReaderHooks>>
}) {
  const slice = makeProfileContentHooksSlice()

  jest.mocked(useProfileContentBootstrap).mockReturnValue({
    isHydrated: true,
    fromEditor: false,
    sectionCount: 1,
    profileSlug: 'default',
    profileTitle: 'Default',
    footerAttributionEnabledCodes: ['ESV'],
    canEdit: false,
    router: { push: jest.fn() } as never,
    showConfirm: jest.fn(),
    showAlert: jest.fn(),
    translation: 'ESV',
    enabledTranslations: ['ESV'],
    translationsLoading: false,
    setTranslation: jest.fn(),
    registerPersistBeforeLeave: jest.fn(),
    persistReadingResumeBeforeLeave: jest.fn(),
    studyRefParam: '',
    scriptureRefParam: '',
    scriptureViewParam: '',
    translationParam: '',
    mcheynePlanDayParam: '',
    mcheyneResumePinParam: '',
    ...overrides?.bootstrap,
  })

  jest.mocked(useProfileChromeState).mockReturnValue({
    isMenuOpen: slice.isMenuOpen,
    toggleMenu: slice.toggleMenu,
    closeMenu: slice.closeMenu,
    openMenu: slice.openMenu,
    deferCloseMenuForFilePickerRef: slice.deferCloseMenuForFilePickerRef,
    dailyVerseChallengeVersion: slice.dailyVerseChallengeVersion,
    completeDailyVerseChallengeIfMatch: jest.fn(),
    isSharingResource: slice.isSharingResource,
    handleShareResource: slice.handleShareResource,
    presentationMarkedReadComplete: slice.presentationMarkedReadComplete,
    handleMarkPresentationUnread: slice.handleMarkPresentationUnread,
    versePinMap: { yellow: null, bookmarks: [] },
    versePinsList: slice.versePinsList,
    bumpVersePins: jest.fn(),
    handleRemoveVersePin: slice.handleRemoveVersePin,
    handleClearAllVersePins: slice.handleClearAllVersePins,
    highlightRevision: slice.highlightRevision,
    bumpHighlights: slice.bumpHighlights,
    highlightsByScopeId: slice.highlightsByScopeId,
    activeHighlightId: slice.activeHighlightId,
    focusHighlightById: slice.focusHighlightById,
    requestRemoveHighlightFromBody: slice.requestRemoveHighlightFromBody,
    resourceTabs: slice.resourceTabs,
    mainContentRef: slice.mainContentRef,
    resourceSearchOpen: slice.resourceSearchOpen,
    handleToggleResourceSearch: slice.handleToggleResourceSearch,
    clearResourceSearch: jest.fn(),
    ...overrides?.chrome,
  })

  jest.mocked(useProfileContentReaderHooks).mockReturnValue({
    profileInfo,
    sections: sections as never,
    scriptureModal: slice.scriptureModal,
    studyModals: slice.studyModals,
    handleSelectResourceTab: slice.handleSelectResourceTab,
    handleCloseResourceTab: slice.handleCloseResourceTab,
    navigateMcheynePlanDay: slice.navigateMcheynePlanDay,
    navigateMcheyneLatest: slice.navigateMcheyneLatest,
    ...overrides?.reader,
  })
}

describe('useProfileContentHooks', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSlices()
  })

  it('builds grouped layout and modals view-models', () => {
    const { result } = renderHook(() =>
      useProfileContentHooks({ sections: sections as never, profileInfo })
    )

    expect(useProfileContentBootstrap).toHaveBeenCalled()
    expect(useProfileChromeState).toHaveBeenCalledWith(
      expect.objectContaining({
        profileSlug: 'default',
        profileTitle: 'Default',
        sections,
      })
    )
    expect(useProfileContentReaderHooks).toHaveBeenCalledWith(
      expect.objectContaining({
        profileSlug: 'default',
        versePinMap: { yellow: null, bookmarks: [] },
        closeMenu: expect.any(Function),
      })
    )

    expect(result.current.layout.header.profileSlug).toBe('default')
    expect(result.current.modals.scripture.profileSlug).toBe('default')
    expect(result.current.footerAttributionEnabledCodes).toEqual(['ESV'])
  })

  it('reflects chrome menu state in layout props', () => {
    const toggleMenu = jest.fn()
    mockSlices({
      chrome: { isMenuOpen: true, toggleMenu },
    })

    const { result } = renderHook(() =>
      useProfileContentHooks({ sections: sections as never, profileInfo })
    )

    expect(result.current.layout.header.isMenuOpen).toBe(true)
    expect(result.current.layout.header.onToggleMenu).toBe(toggleMenu)
    expect(result.current.layout.slideout).not.toBeNull()
  })
})
