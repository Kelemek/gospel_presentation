'use client'

import SpurgeonSermonsModal, { STUDY_MODAL_DEFAULT_TITLE } from '@/components/SpurgeonSermonsModal'

interface CalvinCommentariesModalProps {
  isOpen: boolean
  onClose: () => void
  /** Modal title from Resources menu row (defaults to Calvin's Commentaries). */
  libraryTitle?: string
  /** When set as the modal opens, switches to “By scripture”, fills the reference, and runs lookup. */
  initialByReference?: string | null
  /** Called when the user follows a commentary profile link (before navigation). */
  onFollowCommentaryLink?: () => void
}

/** @deprecated Use {@link SpurgeonSermonsModal} with `libraryFocus="calvin"`. */
export default function CalvinCommentariesModal({
  isOpen,
  onClose,
  libraryTitle = "Calvin's Commentaries",
  initialByReference,
  onFollowCommentaryLink,
}: CalvinCommentariesModalProps) {
  return (
    <SpurgeonSermonsModal
      isOpen={isOpen}
      onClose={onClose}
      modalTitle={libraryTitle || STUDY_MODAL_DEFAULT_TITLE}
      libraryFocus="calvin"
      initialByReference={initialByReference}
      onFollowSermonLink={onFollowCommentaryLink}
    />
  )
}
