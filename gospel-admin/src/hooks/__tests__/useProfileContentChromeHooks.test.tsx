import { renderHook } from '@testing-library/react'
import { useProfileChromeState } from '@/hooks/useProfileChromeState'

jest.mock('@/hooks/useProfileSlideoutMenu', () => ({
  useProfileSlideoutMenu: jest.fn(() => ({
    isMenuOpen: false,
    toggleMenu: jest.fn(),
    closeMenu: jest.fn(),
    openMenu: jest.fn(),
    deferCloseMenuForFilePickerRef: { current: false },
  })),
}))
jest.mock('@/hooks/useProfileDailyVerseChallenge', () => ({
  useProfileDailyVerseChallenge: jest.fn(() => ({
    dailyVerseChallengeVersion: 0,
    completeDailyVerseChallengeIfMatch: jest.fn(),
  })),
}))
jest.mock('@/hooks/useProfileShareResource', () => ({
  useProfileShareResource: jest.fn(() => ({
    isSharingResource: false,
    handleShareResource: jest.fn(),
  })),
}))
jest.mock('@/hooks/useProfilePresentationReadStatus', () => ({
  useProfilePresentationReadStatus: jest.fn(() => ({
    presentationMarkedReadComplete: false,
    handleMarkPresentationUnread: jest.fn(),
  })),
}))
jest.mock('@/hooks/useProfileVersePins', () => ({
  useProfileVersePins: jest.fn(() => ({
    versePinMap: { yellow: null, bookmarks: [] },
    versePinsList: [],
    bumpVersePins: jest.fn(),
    handleRemoveVersePin: jest.fn(),
    handleClearAllVersePins: jest.fn(),
  })),
}))
jest.mock('@/hooks/useProfileHighlightUi', () => ({
  useProfileHighlightUi: jest.fn(() => ({
    highlightRevision: 0,
    bumpHighlights: jest.fn(),
    highlightsByScopeId: {},
    activeHighlightId: null,
    focusHighlightById: jest.fn(),
    requestRemoveHighlightFromBody: jest.fn(),
  })),
}))
jest.mock('@/hooks/useProfileResourceTabs', () => ({
  useProfileResourceTabs: jest.fn(() => ({
    resourceTabs: [],
    mainContentRef: { current: null },
    resourceSearchOpen: false,
    handleToggleResourceSearch: jest.fn(),
    clearResourceSearch: jest.fn(),
  })),
}))

import { useProfileDailyVerseChallenge } from '@/hooks/useProfileDailyVerseChallenge'
import { useProfileHighlightUi } from '@/hooks/useProfileHighlightUi'
import { useProfileResourceTabs } from '@/hooks/useProfileResourceTabs'
import { useProfileShareResource } from '@/hooks/useProfileShareResource'
import { useProfileVersePins } from '@/hooks/useProfileVersePins'

const sections = [{ id: 's1', title: 'Section', subsections: [] }]

describe('useProfileChromeState', () => {
  const showAlert = jest.fn()
  const showConfirm = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('composes chrome hooks with profile slug and sections', () => {
    const { result } = renderHook(() =>
      useProfileChromeState({
        isHydrated: true,
        profileSlug: 'default',
        profileTitle: 'Default',
        sections: sections as never,
        showAlert,
        showConfirm,
      })
    )

    expect(useProfileVersePins).toHaveBeenCalledWith('default')
    expect(useProfileShareResource).toHaveBeenCalledWith({
      profileSlug: 'default',
      profileTitle: 'Default',
      showAlert,
    })
    expect(useProfileHighlightUi).toHaveBeenCalledWith({
      isHydrated: true,
      profileSlug: 'default',
      profileTitle: 'Default',
      showConfirm,
    })
    expect(useProfileResourceTabs).toHaveBeenCalledWith({
      isHydrated: true,
      profileSlug: 'default',
      profileTitle: 'Default',
      sections,
    })
    expect(useProfileDailyVerseChallenge).toHaveBeenCalledWith(showAlert)
    expect(result.current.versePinMap).toEqual({ yellow: null, bookmarks: [] })
    expect(result.current.clearResourceSearch).toBeDefined()
  })
})
