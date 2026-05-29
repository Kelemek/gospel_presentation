'use client'

import { useCallback, useMemo } from 'react'
import { MemorizeListenControlsDialog } from '@/components/MemorizeListenControlsDialog'
import { useAlertModal } from '@/contexts/AlertModalContext'
import { useChapterStreamingAudioListen } from '@/hooks/useChapterStreamingAudioListen'
import { scriptureChapterReferenceKey } from '@/lib/parse-scripture-reference'
import type { BibleTranslation } from '@/contexts/TranslationContext'
import { scriptureModalHeaderIconButtonClass } from '@/components/scriptureModalHeaderButtons'

const SCRIPTURE_MODAL_LISTEN_DIALOG_ID = 'scripture-modal-listen-controls-dialog'
const SCRIPTURE_MODAL_LISTEN_TITLE_ID = 'scripture-modal-listen-controls-title'

interface ScriptureModalChapterListenProps {
  /** Reference sent to `/api/scripture/audio` (verse in verse view, chapter in chapter view). */
  passageReference: string
  /** Chapter form of the open reference (playlist index for M'Cheyne day). */
  chapterReference: string
  translation: BibleTranslation
  enabled: boolean
  /** M'Cheyne: all four chapter refs for the day (Family then Secret); plays in order then stops. */
  dayChapterReferences?: readonly string[]
  /** When the playlist advances, switch the scripture reader to this chapter reference. */
  onPlaylistChapterChange?: (reference: string) => void
  /** Same as scripture modal header Next — used to auto-advance audio when a track ends. */
  hasNext?: boolean
  onNext?: () => void
}

function scriptureAudioUrl(reference: string, translation: BibleTranslation): string {
  return `/api/scripture/audio?${new URLSearchParams({
    reference,
    translation,
  }).toString()}`
}

export default function ScriptureModalChapterListen({
  passageReference,
  chapterReference,
  translation,
  enabled,
  dayChapterReferences,
  onPlaylistChapterChange,
  hasNext = false,
  onNext,
}: ScriptureModalChapterListenProps) {
  const { showAlert } = useAlertModal()

  const isDayPlaylist =
    dayChapterReferences != null && dayChapterReferences.length > 1

  const playlistChapterRefs = useMemo((): readonly string[] => {
    if (dayChapterReferences && dayChapterReferences.length > 0) {
      return dayChapterReferences
    }
    return [passageReference]
  }, [dayChapterReferences, passageReference])

  const audioUrls = useMemo(
    () => playlistChapterRefs.map((ref) => scriptureAudioUrl(ref, translation)),
    [playlistChapterRefs, translation]
  )

  const playlistStartIndex = useMemo(() => {
    if (playlistChapterRefs.length <= 1) return 0
    const key = scriptureChapterReferenceKey(chapterReference)
    if (!key) return 0
    const idx = playlistChapterRefs.findIndex(
      (ref) => scriptureChapterReferenceKey(ref) === key
    )
    return idx >= 0 ? idx : 0
  }, [playlistChapterRefs, chapterReference])

  const onPlaybackError = useCallback(() => {
    showAlert('Audio is not available for this passage or translation.')
  }, [showAlert])

  const onTrackIndexChange = useCallback(
    (index: number) => {
      if (!onPlaylistChapterChange || playlistChapterRefs.length <= 1) return
      const ref = playlistChapterRefs[index]
      if (ref) onPlaylistChapterChange(ref)
    },
    [onPlaylistChapterChange, playlistChapterRefs]
  )

  const onAutoAdvanceAfterPlayback = useCallback((): boolean => {
    if (!hasNext || !onNext) return false
    onNext()
    return true
  }, [hasNext, onNext])

  const {
    passageAudioRef,
    controlsOpen,
    openControls,
    closeControls,
    listenPlaybackRate,
    onSelectSpeed,
    handlePrimaryClick,
    readAloudDialogPrimaryLabel,
    readAloudDialogPrimaryAriaLabel,
    listenAriaPressed,
    handlePassageAudioPlay,
    handlePassageAudioPause,
    handlePassageAudioEnded,
    handlePassageAudioError,
    keepAudioMounted,
  } = useChapterStreamingAudioListen({
    audioUrls,
    enabled,
    onPlaybackError,
    onTrackIndexChange,
    playlistStartIndex,
    onAutoAdvanceAfterPlayback: isDayPlaylist ? undefined : onAutoAdvanceAfterPlayback,
  })

  const listenTitle =
    dayChapterReferences && dayChapterReferences.length > 1
      ? "Listen to today's readings"
      : 'Listen'

  return (
    <>
      <button
        type="button"
        data-tour="scripture-modal-chapter-listen"
        onClick={enabled ? openControls : undefined}
        disabled={!enabled}
        className={scriptureModalHeaderIconButtonClass}
        aria-haspopup={enabled ? 'dialog' : undefined}
        aria-expanded={enabled ? controlsOpen : undefined}
        aria-controls={enabled ? SCRIPTURE_MODAL_LISTEN_DIALOG_ID : undefined}
        aria-label={listenTitle}
        title={listenTitle}
      >
        <svg
          className="w-5 h-5 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <polygon fill="none" points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <path d="M15.54 8.46a5 5 0 010 7.07" />
          <path d="M19.07 4.93a10 10 0 010 14.14" />
        </svg>
      </button>

      {keepAudioMounted ? (
        <>
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

          <MemorizeListenControlsDialog
            open={controlsOpen}
            onClose={closeControls}
            dialogId={SCRIPTURE_MODAL_LISTEN_DIALOG_ID}
            titleId={SCRIPTURE_MODAL_LISTEN_TITLE_ID}
            presentation="modal"
            showRepeat={false}
            onPrimaryClick={handlePrimaryClick}
            primaryLabel={readAloudDialogPrimaryLabel}
            primaryAriaLabel={readAloudDialogPrimaryAriaLabel}
            primaryAriaPressed={listenAriaPressed}
            listenPlaybackRate={listenPlaybackRate}
            onSelectSpeed={onSelectSpeed}
          />
        </>
      ) : null}
    </>
  )
}
