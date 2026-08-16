'use client'

import BibleBooksMemorizationList from '@/components/BibleBooksMemorizationList'
import ScriptureModalToolbarMenu from '@/components/ScriptureModalToolbarMenu'
import { formatMemorizationTokensPlain } from '@/lib/memorizationPracticeUtils'
import { MEMORIZE_INTRO_START_ROUND_OPTIONS } from '@/lib/memorizationPracticeSessionHelpers'
import type { MemorizationPracticeModeSlice, MemorizationPracticeVerseModel } from '@/lib/memorizationPracticeSessionTypes'
import type { MemorizationPracticeRoundSlice, MemorizationPracticeTypingSlice } from '@/lib/memorizationPracticeSessionContract'
import type { MemorizedVerse } from '@/lib/verseMemorizationStorage'

export type MemorizationPracticeIntroPanelProps = {
  verse: MemorizedVerse
  verseModel: Pick<MemorizationPracticeVerseModel, 'isBibleBooks' | 'tokens'>
  round: Pick<MemorizationPracticeRoundSlice, 'startRoundChoice' | 'setStartRoundChoice'>
  mode: Pick<MemorizationPracticeModeSlice, 'setModePickerOpen' | 'setReciteModeBlockedMessage'>
  practiceScrollRef: MemorizationPracticeTypingSlice['practiceScrollRef']
}

export function MemorizationPracticeIntroPanel({
  verse,
  verseModel,
  round,
  mode,
  practiceScrollRef,
}: MemorizationPracticeIntroPanelProps) {
  const { isBibleBooks, tokens } = verseModel
  const { startRoundChoice, setStartRoundChoice } = round
  const { setModePickerOpen, setReciteModeBlockedMessage } = mode

  return (
    <>
      <div
        ref={practiceScrollRef}
        className="relative px-4 py-4 flex-1 min-h-0 overflow-y-auto overscroll-y-contain touch-pan-y"
      >
        <div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
            <strong>Start practice</strong> when you{"'"}re ready; <strong>Round</strong> sets where you begin in the
            five-round run (1 is easiest).
          </p>
          {isBibleBooks ? (
            <div data-testid="memorize-intro-bible-books">
              <BibleBooksMemorizationList
                scope={verse.bibleBooksScope ?? 'all'}
                tourPrefix="memorize-bible-books"
              />
            </div>
          ) : (
            <p
              className="text-base leading-relaxed text-slate-900 dark:text-slate-100 font-serif"
              data-testid="memorize-intro-text"
            >
              {formatMemorizationTokensPlain(tokens)}
            </p>
          )}
        </div>
      </div>
      <div
        className="shrink-0 border-t border-slate-200 dark:border-slate-600 px-4 py-3 bg-slate-50 dark:bg-slate-900/60"
        data-testid="memorize-intro-footer"
      >
        <div className="flex min-w-0 flex-nowrap items-stretch gap-3">
          <button
            type="button"
            data-tour="memorize-start-practice"
            onClick={() => {
              setReciteModeBlockedMessage(null)
              setModePickerOpen(true)
            }}
            className="min-w-0 flex-1 px-4 py-3 text-center sm:flex-none sm:w-auto sm:shrink-0 rounded-lg font-medium transition-colors cursor-pointer bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-900/60 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700 hover:border-blue-300 dark:hover:border-blue-600"
          >
            Start practice
          </button>
          <div className="w-38 shrink-0 min-w-0 sm:w-auto sm:max-w-48 sm:shrink-0 self-stretch flex items-stretch">
            <ScriptureModalToolbarMenu
              value={String(startRoundChoice)}
              options={MEMORIZE_INTRO_START_ROUND_OPTIONS}
              onSelect={(v) => {
                setStartRoundChoice(Number(v))
              }}
              ariaLabel="Starting round (1 to 5)"
              listboxAriaLabel="Choose starting round"
              triggerClassName="h-12.5 min-h-[50px] w-full min-w-0"
              portaledListbox
            />
          </div>
        </div>
      </div>
    </>
  )
}
