import type { ProfileStickyHeaderProps } from '@/components/ProfileStickyHeader'
import type { ProfileSlideoutMenuProps } from '@/components/ProfileSlideoutMenu'
import type { ProfileContentLayoutProps } from '@/components/ProfileContentLayout'

export function makeProfileStickyHeaderProps(
  overrides: Partial<ProfileStickyHeaderProps> = {}
): ProfileStickyHeaderProps {
  return {
    isMenuOpen: false,
    onToggleMenu: jest.fn(),
    canEdit: false,
    fromEditor: false,
    profileInfo: { title: 'Default', slug: 'default', favoriteScriptures: [] },
    sections: [],
    profileSlug: 'default',
    onFocusHighlight: jest.fn(),
    onOpenScriptureHighlight: jest.fn(),
    onHighlightsChanged: jest.fn(),
    onShareResource: jest.fn(),
    isSharingResource: false,
    resourceTabs: [],
    onSelectResourceTab: jest.fn(),
    onCloseResourceTab: jest.fn(),
    resourceSearchOpen: false,
    onToggleResourceSearch: jest.fn(),
    contentRootRef: { current: null },
    scriptureModalOpen: false,
    ...overrides,
  }
}

export function makeProfileSlideoutMenuProps(
  overrides: Partial<ProfileSlideoutMenuProps> = {}
): ProfileSlideoutMenuProps {
  return {
    onClose: jest.fn(),
    deferCloseMenuForFilePickerRef: { current: false },
    sections: [],
    profileInfo: {
      title: 'Default',
      slug: 'default',
      description: 'A gospel profile',
      favoriteScriptures: ['John 3:16'],
    },
    canEdit: false,
    dailyVerseChallengeVersion: 0,
    versePinsList: [],
    onClearAllVersePins: jest.fn(),
    presentationMarkedReadComplete: false,
    onMarkPresentationUnread: jest.fn(),
    onMemorizationPracticeStart: jest.fn(),
    onOpenStudyLibrary: jest.fn(),
    onOpenMorneveLibrary: jest.fn(),
    onOpenMcheynePlan: jest.fn(),
    onOpenBibleReader: jest.fn(),
    ...overrides,
  }
}

export function makeProfileContentLayoutProps(
  overrides: Partial<ProfileContentLayoutProps> = {}
): ProfileContentLayoutProps {
  return {
    onOpenMenuHover: jest.fn(),
    header: makeProfileStickyHeaderProps(),
    main: {
      mainContentRef: { current: null },
      sections: [],
      onScriptureClick: jest.fn(),
      versePinsList: [],
      onRemoveVersePin: jest.fn(),
      profileSlug: 'default',
      highlightsByScopeId: {},
      activeHighlightId: null,
      onHighlightMarkClick: jest.fn(),
      isMenuOpen: false,
      onCloseMenu: jest.fn(),
    },
    slideout: makeProfileSlideoutMenuProps(),
    ...overrides,
  }
}
