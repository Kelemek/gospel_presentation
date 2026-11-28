'use client'

import type { GospelSection } from '@/lib/types'
import { GrokVoiceCodeAccess } from '@/components/GrokVoiceCodeAccess'
import { MemorizeListenControlsDialog } from '@/components/MemorizeListenControlsDialog'
import { useAlertModal } from '@/contexts/AlertModalContext'
import { useGrokVoiceEnabled } from '@/hooks/useGrokVoiceEnabled'
import { useProfileResourceReadAloud } from '@/hooks/useProfileResourceReadAloud'
import { isProfileResourceListenControlAvailable } from '@/lib/profileListenAvailability'
import type { GrokVoice } from '@/lib/grokTtsVoices'
import { grokVoiceRequestHeaders, noteGrokVoiceRejection, readGrokVoiceToken } from '@/lib/grokVoiceTokenStorage'
import {
  DEVICE_LISTEN_VOICE_ID,
  readResourceListenVoice,
  writeResourceListenVoice,
} from '@/lib/resourceListenVoiceStorage'
import { useCallback, useLayoutEffect, useRef, useState } from 'react'

const TRIGGER_CLASS =
  'p-2 rounded-md flex items-center justify-center min-h-[36px] min-w-[36px] bg-slate-200 hover:bg-slate-300 active:bg-slate-400 text-slate-800 dark:bg-slate-600 dark:hover:bg-slate-700 dark:active:bg-slate-800 dark:text-white transition-colors cursor-pointer'

const PROFILE_RESOURCE_LISTEN_DIALOG_ID = 'profile-resource-listen-controls-dialog'
const PROFILE_RESOURCE_LISTEN_TITLE_ID = 'profile-resource-listen-controls-title'

interface ProfileResourceReadAloudProps {
  sections: GospelSection[]
  profileSlug: string
}

export default function ProfileResourceReadAloud({ sections, profileSlug }: ProfileResourceReadAloudProps) {
  const { showAlert, showConfirm } = useAlertModal()
  const { enabled: grokEnabled, refresh: refreshGrokVoice } = useGrokVoiceEnabled(true)
  const [grokVoices, setGrokVoices] = useState<GrokVoice[]>([])
  const [chosenVoiceId, setChosenVoiceId] = useState<string | null>(null)
  const voiceId = grokEnabled ? (chosenVoiceId ?? readResourceListenVoice()) : DEVICE_LISTEN_VOICE_ID
  const voiceRef = useRef(voiceId)
  const onNothingToRead = useCallback(
    (message: string) => {
      showAlert(message)
    },
    [showAlert]
  )

  useLayoutEffect(() => {
    voiceRef.current = voiceId
  }, [voiceId])

  useLayoutEffect(() => {
    if (!grokEnabled) return
    let cancelled = false
    void fetch('/api/read-aloud/voices', { headers: grokVoiceRequestHeaders(), cache: 'no-store' })
      .then(async (response) => {
        await noteGrokVoiceRejection(response)
        if (!response.ok) {
          if (response.status === 401) refreshGrokVoice()
          return
        }
        const data = (await response.json()) as { voices?: GrokVoice[] }
        if (!cancelled && Array.isArray(data.voices)) setGrokVoices(data.voices)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [grokEnabled, refreshGrokVoice])

  const onGrokVoiceChanged = useCallback(() => {
    if (!readGrokVoiceToken()) {
      voiceRef.current = DEVICE_LISTEN_VOICE_ID
      setChosenVoiceId(DEVICE_LISTEN_VOICE_ID)
      writeResourceListenVoice(DEVICE_LISTEN_VOICE_ID)
    }
    refreshGrokVoice()
  }, [refreshGrokVoice])

  const {
    controlsOpen,
    openControls,
    closeControls,
    listenPlaybackRate,
    onSelectSpeed,
    handlePrimaryClick,
    readAloudDialogPrimaryLabel,
    readAloudDialogPrimaryAriaLabel,
    listenAriaPressed,
    restartReadAloudFromBeginning,
    startReadAloudFromHere,
    restartCurrentChunkAtNewSpeed,
    clearGrokFallback,
  } = useProfileResourceReadAloud({
    sections,
    profileSlug,
    onNothingToRead,
    resourceListenVoiceRef: voiceRef,
    resourceListenVoiceId: voiceId,
    onGrokFallback: onNothingToRead,
  })

  const onSelectResourceListenVoice = useCallback(
    (nextVoiceId: string) => {
      const known = grokVoices.some((voice) => voice.voiceId === nextVoiceId)
      const stored = nextVoiceId === DEVICE_LISTEN_VOICE_ID || known ? nextVoiceId : DEVICE_LISTEN_VOICE_ID
      clearGrokFallback()
      voiceRef.current = stored
      setChosenVoiceId(stored)
      writeResourceListenVoice(stored)
      restartCurrentChunkAtNewSpeed()
    },
    [clearGrokFallback, grokVoices, restartCurrentChunkAtNewSpeed]
  )

  const confirmRestartReadAloudFromBeginning = useCallback(async () => {
    const ok = await showConfirm(
      'Clear all saved listen progress for every section in this profile on this device, go to the first readable section, and start read-aloud from the beginning?'
    )
    if (ok) restartReadAloudFromBeginning()
  }, [showConfirm, restartReadAloudFromBeginning])

  if (!isProfileResourceListenControlAvailable()) {
    return null
  }

  return (
    <>
      <div className="relative print-hide">
        <button
          type="button"
          data-tour="profile-resource-read-aloud"
          onClick={openControls}
          className={TRIGGER_CLASS}
          aria-haspopup="dialog"
          aria-expanded={controlsOpen}
          aria-controls={PROFILE_RESOURCE_LISTEN_DIALOG_ID}
          aria-label="Listen"
          title="Listen"
        >
          <svg
            className="w-5 h-5 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden={true}
          >
            <polygon fill="none" points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M15.54 8.46a5 5 0 010 7.07" />
            <path d="M19.07 4.93a10 10 0 010 14.14" />
          </svg>
        </button>
      </div>

      <MemorizeListenControlsDialog
        open={controlsOpen}
        onClose={closeControls}
        dialogId={PROFILE_RESOURCE_LISTEN_DIALOG_ID}
        titleId={PROFILE_RESOURCE_LISTEN_TITLE_ID}
        presentation="floating"
        showRepeat={false}
        onPrimaryClick={handlePrimaryClick}
        primaryLabel={readAloudDialogPrimaryLabel}
        primaryAriaLabel={readAloudDialogPrimaryAriaLabel}
        primaryAriaPressed={listenAriaPressed}
        listenPlaybackRate={listenPlaybackRate}
        onSelectSpeed={onSelectSpeed}
        onStartFromHere={startReadAloudFromHere}
        onStartFromBeginning={confirmRestartReadAloudFromBeginning}
        grokVoiceAccess={<GrokVoiceCodeAccess onChanged={onGrokVoiceChanged} />}
        grokVoicePicker={
          grokEnabled
            ? {
                voices: grokVoices,
                value: voiceId,
                onChange: onSelectResourceListenVoice,
              }
            : undefined
        }
      />
    </>
  )
}
