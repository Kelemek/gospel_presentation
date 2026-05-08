'use client'

import type { GospelSection } from '@/lib/types'
import { MemorizeListenControlsDialog } from '@/components/MemorizeListenControlsDialog'
import { useAlertModal } from '@/contexts/AlertModalContext'
import { useProfileResourceReadAloud } from '@/hooks/useProfileResourceReadAloud'
import { isMemorizeAndroidWebHost } from '@/lib/memorizationViewportPlatform'
import { useCallback, useMemo } from 'react'

const TRIGGER_CLASS =
  'p-2 rounded-md flex items-center justify-center min-h-[36px] min-w-[36px] bg-slate-200 hover:bg-slate-300 active:bg-slate-400 text-slate-800 dark:bg-slate-600 dark:hover:bg-slate-700 dark:active:bg-slate-800 dark:text-white transition-colors cursor-pointer'

const PROFILE_RESOURCE_LISTEN_DIALOG_ID = 'profile-resource-listen-controls-dialog'
const PROFILE_RESOURCE_LISTEN_TITLE_ID = 'profile-resource-listen-controls-title'

interface ProfileResourceReadAloudProps {
  sections: GospelSection[]
}

export default function ProfileResourceReadAloud({ sections }: ProfileResourceReadAloudProps) {
  const androidHost = useMemo(() => isMemorizeAndroidWebHost(), [])
  const { showAlert } = useAlertModal()
  const onNothingToRead = useCallback(
    (message: string) => {
      showAlert(message)
    },
    [showAlert]
  )

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
  } = useProfileResourceReadAloud({ sections, onNothingToRead })

  if (androidHost) {
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
          aria-label="Read aloud"
          title="Read aloud"
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
      />
    </>
  )
}
