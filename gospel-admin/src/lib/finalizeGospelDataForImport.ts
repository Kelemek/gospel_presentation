import { normalizeGospelPresentationData } from '@/lib/scriptureReferenceNormalize'
import { passageKeysFromGospelPresentationData } from '@/lib/spurgeon/passageKeysFromGospelData'
import type { GospelPresentationData } from '@/lib/types'

export type FinalizeGospelDataForImportOptions = {
  /** USFM passage keys from scripRef / parser (chapter-only, etc.) merged with inline-scanned keys. */
  additionalPassageKeys?: string[]
}

/**
 * Normalize abbreviated scripture in gospel_data and build passage index keys for import.
 * Used by all CCEL import upserts so future imports match {@link normalize-scripture-references-in-profiles}.
 */
export function finalizeGospelDataForImport(
  gospelData: GospelPresentationData,
  options?: FinalizeGospelDataForImportOptions
): { gospelData: GospelPresentationData; passageKeys: string[] } {
  const { data } = normalizeGospelPresentationData(gospelData)
  const fromStored = passageKeysFromGospelPresentationData(data)
  const passageKeys = [...new Set([...(options?.additionalPassageKeys ?? []), ...fromStored])].sort((a, b) =>
    a.localeCompare(b)
  )
  return { gospelData: data, passageKeys }
}
