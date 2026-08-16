'use client'

import { useMemo } from 'react'
import { booksForScope, isBibleBooksMemorizationItem } from '@/lib/bibleBooksMemorization'
import {
  buildBibleBooksReorderChunks,
  buildMemorizationReorderChunks,
  buildMemorizationTokens,
  getTypableTokenIndices,
  reorderReferenceColonAfterSlotIndex,
} from '@/lib/memorizationPracticeUtils'
import { isMemorizeAndroidWebHost } from '@/lib/memorizationViewportPlatform'
import {
  computeReciteModeAvailable,
  computeReciteModeVisible,
} from '@/lib/memorizationReciteIntegration'
import type { MemorizedVerse } from '@/lib/verseMemorizationStorage'
import type { MemorizationPracticeVerseModel } from '@/lib/memorizationPracticeSessionTypes'

export function useMemorizationPracticeVerseModel(verse: MemorizedVerse): MemorizationPracticeVerseModel {
  const isBibleBooks = isBibleBooksMemorizationItem(verse)

  const tokens = useMemo(
    () =>
      isBibleBooks
        ? buildMemorizationTokens(verse.text, '')
        : buildMemorizationTokens(verse.text, verse.reference),
    [isBibleBooks, verse.text, verse.reference]
  )

  const reorderChunks = useMemo(() => {
    if (isBibleBooks) {
      return buildBibleBooksReorderChunks(booksForScope(verse.bibleBooksScope).map((b) => b.name))
    }
    return buildMemorizationReorderChunks(verse.text, verse.reference)
  }, [isBibleBooks, verse.bibleBooksScope, verse.text, verse.reference])

  const reorderColonAfterSlotIndex = useMemo(
    () => reorderReferenceColonAfterSlotIndex(reorderChunks.length, verse.reference),
    [reorderChunks.length, verse.reference]
  )

  const typableIndices = useMemo(() => getTypableTokenIndices(tokens), [tokens])

  const memorizeAndroidHost = useMemo(() => isMemorizeAndroidWebHost(), [])

  const reciteModeVisible = useMemo(() => computeReciteModeVisible({ isBibleBooks }), [isBibleBooks])

  const reciteModeAvailable = useMemo(
    () =>
      computeReciteModeAvailable({
        isBibleBooks,
        reference: verse.reference,
      }),
    [isBibleBooks, verse.reference]
  )

  return {
    isBibleBooks,
    tokens,
    reorderChunks,
    reorderColonAfterSlotIndex,
    typableIndices,
    memorizeAndroidHost,
    reciteModeVisible,
    reciteModeAvailable,
  }
}
