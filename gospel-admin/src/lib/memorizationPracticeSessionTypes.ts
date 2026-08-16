import type {
  MemorizationReorderChunk,
  MemorizationToken,
} from '@/lib/memorizationPracticeUtils'
import type {
  MemorizationInProgressSavePayload,
  MemorizationPracticeMode,
  MemorizedVerse,
} from '@/lib/verseMemorizationStorage'

export interface MemorizationPracticeSessionResult {
  wrongAttempts: number
  correctKeystrokes: number
  completed: boolean
}

export interface MemorizationPracticeSessionProps {
  verse: MemorizedVerse
  onClose: () => void
  onComplete: (result: MemorizationPracticeSessionResult) => void
  /** Persist multi-round progress (localStorage); do not replace the open `verse` prop on each call to avoid re-hydrating mid-session. */
  onPersistInProgress?: (payload: MemorizationInProgressSavePayload) => void
  /** Clear saved in-progress for this verse (e.g. Start over). */
  onClearInProgress?: () => void
  /**
   * When set, shows a **Study** control (enabled when indexed public Spurgeon sermons cite this passage
   * per `GET /api/scripture/spurgeon-links`; otherwise greyed out), same pattern as `ScriptureModal` Study.
   */
  onOpenSpurgeonStudy?: (reference: string) => void
}

export type SpurgeonStudyMatch = 'unset' | 'loading' | 'yes' | 'no'

export interface MemorizationPracticeVerseModel {
  isBibleBooks: boolean
  tokens: MemorizationToken[]
  reorderChunks: MemorizationReorderChunk[]
  reorderColonAfterSlotIndex: number | null
  typableIndices: number[]
  memorizeAndroidHost: boolean
  reciteModeVisible: boolean
  reciteModeAvailable: boolean
}

export interface MemorizationPracticeModeSlice {
  practiceMode: MemorizationPracticeMode | null
  setPracticeMode: (mode: MemorizationPracticeMode | null) => void
  modePickerOpen: boolean
  setModePickerOpen: (open: boolean) => void
  reciteModeBlockedMessage: string | null
  setReciteModeBlockedMessage: (msg: string | null) => void
  modePickerTitleId: string
  beginPracticeWithMode: (mode: MemorizationPracticeMode) => void
}
