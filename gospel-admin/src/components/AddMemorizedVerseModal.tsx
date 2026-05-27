'use client'

import { useCallback } from 'react'
import { useAlertModal } from '@/contexts/AlertModalContext'
import BiblePassagePickerModal from '@/components/BiblePassagePickerModal'
import type { BibleTranslation } from '@/lib/bible-translations'
import { memorizationSaveFailureMessage } from '@/lib/memorizationSaveFailureMessage'
import { tryAddMemorizedVerse } from '@/lib/verseMemorizationStorage'

export interface AddMemorizedVerseModalProps {
  isOpen: boolean
  onClose: () => void
  translation: BibleTranslation
  /** When provided on open, switches to the correct testament and expands that book. */
  seedReference?: string | null
}

export default function AddMemorizedVerseModal({
  isOpen,
  onClose,
  translation,
  seedReference = null,
}: AddMemorizedVerseModalProps) {
  const { showAlert } = useAlertModal()

  const onConfirm = useCallback(
    async (ref: string) => {
      const params = new URLSearchParams({ reference: ref, translation })
      const res = await fetch(`/api/scripture?${params.toString()}`, { cache: 'no-store' })
      const data = (await res.json()) as { text?: string; error?: string }
      if (!res.ok) {
        throw new Error(data.error || 'Could not load scripture text')
      }
      const text = data.text ?? ''
      if (!text.trim()) {
        showAlert('No text returned for this passage.')
        return
      }
      const result = await tryAddMemorizedVerse(ref, text, translation)
      if (result.ok) {
        showAlert('Added to memorization list.\n\nYou can find this verse under Memorize in the menu.')
        onClose()
      } else {
        showAlert(memorizationSaveFailureMessage(result.reason))
      }
    },
    [onClose, showAlert, translation]
  )

  const handleConfirm = useCallback(
    async (ref: string) => {
      try {
        await onConfirm(ref)
      } catch (e: unknown) {
        showAlert(e instanceof Error ? e.message : 'Failed to add passage.')
      }
    },
    [onConfirm, showAlert]
  )

  return (
    <BiblePassagePickerModal
      isOpen={isOpen}
      onClose={onClose}
      confirmLabel="Add"
      requireVerse
      variant="memorize"
      seedReference={seedReference}
      onConfirm={handleConfirm}
    />
  )
}
