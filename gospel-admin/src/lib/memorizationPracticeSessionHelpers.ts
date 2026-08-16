import type { MemorizationPracticeMode } from '@/lib/verseMemorizationStorage'
import {
  MEMORIZATION_FULL_HIDE_ROUND,
  pickHiddenWordIndices,
} from '@/lib/memorizationPracticeUtils'

export const MEMORIZATION_WORD_CHOICE_COUNT_WORD = 8
export const MEMORIZATION_WORD_CHOICE_COUNT_DIGIT = 6

/** Extra inset beyond the viewport edge so the current blank sits higher above the soft keyboard. */
export const MEMORIZE_EXTRA_GAP_ABOVE_KEYBOARD_PX = 48

/** While Hint is held, each tick reveals one more unrevealed blank (left to right). */
export const MEMORIZE_HINT_EXTRA_PEEK_INTERVAL_MS = 1000

/** On Android, clamp the practice column scrollTop to 0 for this many ms after a round starts. */
export const ANDROID_SCROLL_CLAMP_MS = 600

export const MEMORIZE_LISTEN_CONTROLS_DIALOG_ID = 'memorize-listen-controls-dialog'
export const MEMORIZE_LISTEN_CONTROLS_TITLE_ID = 'memorize-listen-controls-title'

export const MEMORIZE_INTRO_START_ROUND_OPTIONS = Array.from(
  { length: MEMORIZATION_FULL_HIDE_ROUND },
  (_, i) => ({
    value: String(i + 1),
    label: `Round ${i + 1}`,
  })
)

export function isKeyboardPracticeMode(mode: MemorizationPracticeMode | null): boolean {
  return mode === 'type' || mode === 'firstLetters'
}

/** Hidden token indices for type / word / firstLetters (firstLetters = all typable hidden every round). */
export function hiddenTypingTokenIndices(
  mode: MemorizationPracticeMode | null | undefined,
  roundIndex: number,
  seed: string,
  typableIndices: number[]
): Set<number> {
  if (mode === 'firstLetters') return new Set(typableIndices)
  const localHidden = pickHiddenWordIndices(typableIndices.length, roundIndex, seed)
  return new Set([...localHidden].map((li) => typableIndices[li]!))
}

export function scrollActiveFirstLetterCueIntoView(
  root: HTMLDivElement | null,
  currentTargetIndex: number | null,
  typableIndices: number[]
) {
  if (!root) return
  const slot = currentTargetIndex !== null ? typableIndices.indexOf(currentTargetIndex) : -1
  const target =
    slot >= 0 ? root.querySelector<HTMLElement>(`[data-memorize-cue-slot="${slot}"]`) : null
  if (target) {
    try {
      target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' })
    } catch {
      /* jsdom / test env may not fully implement scrollIntoView */
    }
  } else {
    root.scrollTop = 0
  }
}
