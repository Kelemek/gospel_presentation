import type { MemorizationPracticeSessionProps } from '@/lib/memorizationPracticeSessionTypes'
import type {
  MemorizationPracticeActionsSlice,
  MemorizationPracticeListenSlice,
  MemorizationPracticeModeSlice,
  MemorizationPracticeReciteSlice,
  MemorizationPracticeRoundSlice,
  MemorizationPracticeSessionState,
  MemorizationPracticeTypingSlice,
  MemorizationPracticeVerseModel,
} from '@/lib/memorizationPracticeSessionContract'

export type BuildMemorizationPracticeSessionStateArgs = {
  props: Pick<
    MemorizationPracticeSessionProps,
    'verse' | 'onClose' | 'onOpenSpurgeonStudy' | 'onPersistInProgress' | 'onClearInProgress'
  >
  strictMode: boolean
  verseModel: MemorizationPracticeVerseModel
  round: MemorizationPracticeRoundSlice
  mode: MemorizationPracticeModeSlice
  recite: MemorizationPracticeReciteSlice & {
    recitePracticeRef: MemorizationPracticeReciteSlice['recitePracticeRef']
  }
  typing: MemorizationPracticeTypingSlice
  listen: MemorizationPracticeListenSlice
  actions: Omit<MemorizationPracticeActionsSlice, 'onPersistInProgress' | 'onClearInProgress'>
}

/** Assembles the grouped session contract from hook slices (pure; no React). */
export function buildMemorizationPracticeSessionState({
  props,
  strictMode,
  verseModel,
  round,
  mode,
  recite,
  typing,
  listen,
  actions,
}: BuildMemorizationPracticeSessionStateArgs): MemorizationPracticeSessionState {
  const { verse, onClose, onOpenSpurgeonStudy, onPersistInProgress, onClearInProgress } = props
  const { recitePracticeRef, ...reciteSlice } = recite

  return {
    verse,
    strictMode,
    onClose,
    onOpenSpurgeonStudy,
    verseModel,
    round,
    mode,
    recite: {
      recitePracticeRef,
      ...reciteSlice,
    },
    typing,
    listen,
    actions: {
      ...actions,
      onPersistInProgress,
      onClearInProgress,
    },
  }
}
