import type { ProfileContentModalsProps } from '@/lib/profileContentModalTypes'
import type { MemorizedVerse } from '@/lib/verseMemorizationStorage'

export const sampleMemorizedVerse: MemorizedVerse = {
  id: 'mem-1',
  reference: 'John 3:16',
  text: 'For God so loved the world',
  translation: 'esv',
  dateAdded: Date.now(),
  lastPracticedAt: null,
  practiceSessions: [],
}

export function makeProfileContentModalsProps(
  overrides: {
    scripture?: Partial<ProfileContentModalsProps['scripture']>
    study?: Partial<ProfileContentModalsProps['study']>
  } = {}
): ProfileContentModalsProps {
  const closeModal = jest.fn()
  const onOpenSpurgeonStudy = jest.fn()
  const bibleReaderOnConfirm = jest.fn()

  return {
    scripture: {
      profileSlug: 'default',
      profileTitle: 'Default',
      activeScripture: { reference: 'Romans 8:1', isOpen: true },
      effectiveModalOpenAnchors: {
        reference: 'Romans 8:1',
        sectionId: 's1',
        subsectionId: 'ss1',
      },
      mcheyneDayListenReferences: undefined,
      syncMcheynePlaylistChapter: jest.fn(),
      closeModal,
      openScriptureFromTabEntry: jest.fn(),
      navigateScriptureInReader: jest.fn(),
      clearMcheynePlanCardPinSession: jest.fn(),
      hasPrevious: true,
      hasNext: false,
      navigateToPrevious: jest.fn(),
      navigateToNext: jest.fn(),
      scriptureModalPresentationLocation: undefined,
      scriptureModalHighlightPicker: false,
      highlightRevision: 0,
      bumpHighlights: jest.fn(),
      modalPinDraftColor: 'yellow',
      modalPinSyncedKey: 'pin-key',
      modalPinDropdownColors: ['red', 'blue'],
      setModalPinUserOverride: jest.fn(),
      onOpenSpurgeonStudy,
      ...overrides.scripture,
    },
    study: {
      spurgeon: {
        isOpen: false,
        modalTitle: 'Study',
        libraryFocus: 'all',
        initialByReference: null,
        onClose: jest.fn(),
        onOpenScriptureReference: jest.fn(),
      },
      morneve: {
        isOpen: false,
        onClose: jest.fn(),
      },
      mcheyne: {
        isOpen: false,
        onClose: jest.fn(),
        navigatePlanDay: jest.fn(),
        navigateLatest: jest.fn(),
      },
      onDismissScriptureAndPractice: jest.fn(),
      bibleReader: {
        isOpen: false,
        onClose: jest.fn(),
        onConfirm: bibleReaderOnConfirm,
      },
      memorizationPractice: {
        verse: null,
        onClose: jest.fn(),
        onUpdated: jest.fn(),
      },
      ...overrides.study,
    },
  }
}
