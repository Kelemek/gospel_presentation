/**
 * @jest-environment jsdom
 */

import { render } from '@testing-library/react'
import ProfileContentLayout from '@/components/ProfileContentLayout'

jest.mock('@/components/ProfileStickyHeader', () => ({
  __esModule: true,
  default: () => <div data-testid="sticky-header" />,
}))
jest.mock('@/components/ProfileMainContent', () => ({
  __esModule: true,
  default: () => <div data-testid="main-content" />,
}))
jest.mock('@/components/ProfileSlideoutMenu', () => ({
  __esModule: true,
  default: () => <div data-testid="slideout-menu" />,
}))

describe('ProfileContentLayout', () => {
  it('renders header and main content; slide-out only when provided', () => {
    const { rerender, queryByTestId } = render(
      <ProfileContentLayout
        onOpenMenuHover={jest.fn()}
        header={{
          isMenuOpen: false,
          onToggleMenu: jest.fn(),
          canEdit: false,
          fromEditor: false,
          profileInfo: { title: 'Test', slug: 'test', favoriteScriptures: [] },
          sections: [],
          profileSlug: 'test',
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
        }}
        main={{
          mainContentRef: { current: null },
          sections: [],
          onScriptureClick: jest.fn(),
          versePinsList: [],
          onRemoveVersePin: jest.fn(),
          profileSlug: 'test',
          highlightsByScopeId: {},
          activeHighlightId: null,
          onHighlightMarkClick: jest.fn(),
          isMenuOpen: false,
          onCloseMenu: jest.fn(),
        }}
        slideout={null}
      />
    )

    expect(queryByTestId('sticky-header')).toBeTruthy()
    expect(queryByTestId('main-content')).toBeTruthy()
    expect(queryByTestId('slideout-menu')).toBeNull()

    rerender(
      <ProfileContentLayout
        onOpenMenuHover={jest.fn()}
        header={{
          isMenuOpen: true,
          onToggleMenu: jest.fn(),
          canEdit: false,
          fromEditor: false,
          profileInfo: { title: 'Test', slug: 'test', favoriteScriptures: [] },
          sections: [],
          profileSlug: 'test',
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
        }}
        main={{
          mainContentRef: { current: null },
          sections: [],
          onScriptureClick: jest.fn(),
          versePinsList: [],
          onRemoveVersePin: jest.fn(),
          profileSlug: 'test',
          highlightsByScopeId: {},
          activeHighlightId: null,
          onHighlightMarkClick: jest.fn(),
          isMenuOpen: true,
          onCloseMenu: jest.fn(),
        }}
        slideout={{
          onClose: jest.fn(),
          deferCloseMenuForFilePickerRef: { current: false },
          sections: [],
          profileInfo: { title: 'Test', slug: 'test', favoriteScriptures: [] },
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
        }}
      />
    )

    expect(queryByTestId('slideout-menu')).toBeTruthy()
  })
})
