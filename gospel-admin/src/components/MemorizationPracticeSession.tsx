'use client'

import { useMemorizationPracticeSession } from '@/hooks/memorizationPractice/useMemorizationPracticeSession'
import { MemorizationPracticeSessionEmpty } from '@/components/memorizationPracticeSession/MemorizationPracticeSessionEmpty'
import { MemorizationPracticeSessionView } from '@/components/memorizationPracticeSession/MemorizationPracticeSessionView'
import type {
  MemorizationPracticeSessionProps,
  MemorizationPracticeSessionResult,
} from '@/components/memorizationPracticeSession/memorizationPracticeSessionTypes'

export type { MemorizationPracticeSessionResult }

export default function MemorizationPracticeSession(props: MemorizationPracticeSessionProps) {
  const session = useMemorizationPracticeSession(props)

  if (session.verseModel.typableIndices.length === 0) {
    return <MemorizationPracticeSessionEmpty onClose={props.onClose} />
  }

  return <MemorizationPracticeSessionView session={session} />
}
