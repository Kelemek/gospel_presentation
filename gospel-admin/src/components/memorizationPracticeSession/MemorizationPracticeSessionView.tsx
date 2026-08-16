'use client'

import { MemorizationRoundAdvanceFooter } from '@/components/MemorizationRoundAdvanceFooter'
import { MemorizationWordChoicesFooter } from '@/components/MemorizationWordChoicesFooter'
import { MemorizeListenControlsDialog } from '@/components/MemorizeListenControlsDialog'
import {
  isPracticePhaseDone,
  isPracticePhaseInSession,
  isPracticePhaseIntro,
  isPracticePhaseRoundComplete,
} from '@/lib/memorizationPracticePhase'
import {
  MEMORIZE_LISTEN_CONTROLS_DIALOG_ID,
  MEMORIZE_LISTEN_CONTROLS_TITLE_ID,
  isKeyboardPracticeMode,
} from '@/lib/memorizationPracticeSessionHelpers'
import type { MemorizationPracticeSessionState } from '@/lib/memorizationPracticeSessionContract'
import { MemorizationPracticeModePickerDialog } from '@/components/memorizationPracticeSession/MemorizationPracticeModePickerDialog'
import { MemorizationPracticeSessionToolbar } from '@/components/memorizationPracticeSession/MemorizationPracticeSessionToolbar'
import { MemorizationPracticeIntroPanel } from '@/components/memorizationPracticeSession/MemorizationPracticeIntroPanel'
import { MemorizationPracticeActiveRoundPanel } from '@/components/memorizationPracticeSession/MemorizationPracticeActiveRoundPanel'
import { MemorizationPracticeReciteFooter } from '@/components/memorizationPracticeSession/MemorizationPracticeReciteFooter'
import { MemorizationPracticeHiddenInput } from '@/components/memorizationPracticeSession/MemorizationPracticeHiddenInput'

export type MemorizationPracticeSessionViewProps = {
  session: MemorizationPracticeSessionState
}

export function MemorizationPracticeSessionView({ session }: MemorizationPracticeSessionViewProps) {
  const { verseModel, round, mode, typing, listen, actions } = session
  const { memorizeAndroidHost } = verseModel
  const { phase, roundIndex, isRoundComplete, roundAffirmation, showNextRoundOption, showFinishPracticeOption } = round
  const { practiceMode, modePickerOpen, setModePickerOpen, modePickerTitleId, beginPracticeWithMode, reciteModeBlockedMessage } = mode
  const { reciteModeVisible } = verseModel
  const { currentTargetToken, wordChoiceLabels, processWordGuess, assignPracticeInputRef, handlePracticeInputKeyDown, handlePracticeInput, practiceInputDomId } = typing
  const {
    listenViaEsvPassageUrl,
    listenInteractionAllowed,
    listenPanelVisible,
    setListenPanelOpen,
    listenPlaybackRate,
    onSelectSpeed,
    repeatListenOn,
    handleRepeatListenToggle,
    handleListenPassageClick,
    readAloudDialogPrimaryLabel,
    readAloudDialogPrimaryAriaLabel,
    listenAriaPressed,
    passageAudioRef,
    handlePassageAudioPlay,
    handlePassageAudioPause,
    handlePassageAudioEnded,
    handlePassageAudioError,
  } = listen
  const {
    finishPracticeSession,
    startRoundAndFocusInput,
    persistPracticeSnapshot,
  } = actions

  const showListenOpeners = listenInteractionAllowed

  return (
    <>
      <div
        className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 dark:bg-black/70 p-4"
        style={{
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Memorize practice"
      >
        <div
          data-tour="memorize-practice-dialog"
          className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] border border-slate-200 dark:border-slate-600 flex flex-col overflow-hidden"
        >
          <MemorizationPracticeSessionToolbar
            verse={session.verse}
            onOpenSpurgeonStudy={session.onOpenSpurgeonStudy}
            verseModel={verseModel}
            round={round}
            mode={mode}
            recite={session.recite}
            typing={typing}
            listen={listen}
            actions={actions}
            showListenOpeners={showListenOpeners}
          />

          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {isPracticePhaseInSession(phase) && isKeyboardPracticeMode(practiceMode) && memorizeAndroidHost && (
              <MemorizationPracticeHiddenInput
                variant="android"
                practiceInputDomId={practiceInputDomId}
                inputRef={assignPracticeInputRef}
                currentTargetToken={currentTargetToken}
                isRoundComplete={isRoundComplete}
                onKeyDown={handlePracticeInputKeyDown}
                onInput={handlePracticeInput}
              />
            )}
            {!isPracticePhaseDone(phase) && listenViaEsvPassageUrl && (
              <audio
                ref={passageAudioRef}
                preload="none"
                className="hidden"
                aria-hidden
                onPlay={handlePassageAudioPlay}
                onPause={handlePassageAudioPause}
                onEnded={handlePassageAudioEnded}
                onError={handlePassageAudioError}
              />
            )}
            {isPracticePhaseIntro(phase) ? (
              <MemorizationPracticeIntroPanel
                verse={session.verse}
                verseModel={verseModel}
                round={round}
                mode={mode}
                practiceScrollRef={typing.practiceScrollRef}
              />
            ) : (
              <MemorizationPracticeActiveRoundPanel
                verse={session.verse}
                strictMode={session.strictMode}
                verseModel={verseModel}
                round={round}
                mode={mode}
                recite={session.recite}
                typing={typing}
                onClose={session.onClose}
              />
            )}

            {isPracticePhaseInSession(phase) && practiceMode === 'recite' && !isRoundComplete && (
              <MemorizationPracticeReciteFooter recite={session.recite} />
            )}

            {isPracticePhaseInSession(phase) &&
              practiceMode === 'word' &&
              !isRoundComplete &&
              wordChoiceLabels.length > 0 && (
                <MemorizationWordChoicesFooter
                  labels={wordChoiceLabels}
                  targetKind={currentTargetToken?.kind ?? null}
                  onGuess={processWordGuess}
                />
              )}

            {isPracticePhaseRoundComplete(phase) && practiceMode !== 'recite' && (
              <MemorizationRoundAdvanceFooter
                roundAffirmation={roundAffirmation}
                showNextRoundOption={showNextRoundOption}
                showFinishPracticeOption={showFinishPracticeOption}
                onRepeatRound={() => {
                  startRoundAndFocusInput(roundIndex)
                  persistPracticeSnapshot(
                    { kind: 'inRound', roundIndex },
                    { wrongAttemptsInRound: 0 }
                  )
                }}
                onNextRound={() => {
                  startRoundAndFocusInput(roundIndex + 1)
                  persistPracticeSnapshot(
                    { kind: 'inRound', roundIndex: roundIndex + 1 },
                    { wrongAttemptsInRound: 0 }
                  )
                }}
                onFinishPractice={() => finishPracticeSession()}
              />
            )}
          </div>
        </div>
      </div>

      <MemorizationPracticeModePickerDialog
        open={modePickerOpen && isPracticePhaseIntro(phase)}
        modePickerTitleId={modePickerTitleId}
        reciteModeVisible={reciteModeVisible}
        reciteModeBlockedMessage={reciteModeBlockedMessage}
        onClose={() => setModePickerOpen(false)}
        onSelectMode={beginPracticeWithMode}
      />

      {listenPanelVisible && showListenOpeners && (
        <MemorizeListenControlsDialog
          open
          onClose={() => {
            setListenPanelOpen(false)
          }}
          dialogId={MEMORIZE_LISTEN_CONTROLS_DIALOG_ID}
          titleId={MEMORIZE_LISTEN_CONTROLS_TITLE_ID}
          onPrimaryClick={handleListenPassageClick}
          primaryLabel={readAloudDialogPrimaryLabel}
          primaryAriaLabel={readAloudDialogPrimaryAriaLabel}
          primaryAriaPressed={listenAriaPressed}
          repeatListenOn={repeatListenOn}
          onRepeatToggle={handleRepeatListenToggle}
          listenPlaybackRate={listenPlaybackRate}
          onSelectSpeed={onSelectSpeed}
        />
      )}
    </>
  )
}
