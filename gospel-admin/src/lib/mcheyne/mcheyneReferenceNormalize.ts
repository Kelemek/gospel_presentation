import { canonicalScriptureCacheReference } from '@/lib/api-bible-passage-id'
import {
  isGospelCanonicalScriptureRef,
  normalizeScriptureReferenceString,
} from '@/lib/scriptureReferenceNormalize'

/** Pre-normalize quirks in the M'Cheyne source schedule before canonical normalization. */
export function preprocessMcheyneReference(raw: string): string {
  let s = raw.replace(/\s+/g, ' ').trim()
  s = s.replace(/\s*&\s*/g, '-')
  s = s.replace(/(\d):(\d+)ff\b/i, '$1:$2')
  s = s.replace(/(\d):(\d+)f\b/i, '$1:$2')
  return s
}

export function isAcceptableMcheyneReference(ref: string): boolean {
  if (isGospelCanonicalScriptureRef(ref)) return true
  return Boolean(canonicalScriptureCacheReference(ref))
}

export function normalizeMcheyneReference(raw: string): string {
  const pre = preprocessMcheyneReference(raw)
  const norm = normalizeScriptureReferenceString(pre)
  if (isAcceptableMcheyneReference(norm)) return norm
  if (isAcceptableMcheyneReference(pre)) return pre
  throw new Error(`Could not normalize M'Cheyne reference: ${JSON.stringify(raw)}`)
}
