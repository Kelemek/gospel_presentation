import { fetchScripture } from '@/lib/bible-api'
import type { BibleTranslation } from '@/lib/bible-translations'
import { kindleProfileReadUrl } from '@/lib/kindleReadHtml'
import { logger } from '@/lib/logger'

export type KindleReadScriptureChapterNavLink = {
  href: string
  label: string
}

export type KindleReadScriptureChapterNav = {
  prev: KindleReadScriptureChapterNavLink | null
  next: KindleReadScriptureChapterNavLink | null
}

export type KindleReadScriptureResult =
  | { ok: true; reference: string; text: string }
  | { ok: false; error: string }

/** Server-side scripture fetch for Kindle read scripture pages. */
export async function fetchScriptureForKindleRead(
  reference: string,
  translation: BibleTranslation = 'esv'
): Promise<KindleReadScriptureResult> {
  const trimmed = reference.trim()
  if (!trimmed) {
    return { ok: false, error: 'A scripture reference is required.' }
  }

  try {
    const result = await fetchScripture(trimmed, translation)
    return {
      ok: true,
      reference: result.reference,
      text: result.text,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    logger.warn('[kindle-read] scripture fetch failed', { reference: trimmed, message })
    return {
      ok: false,
      error: 'Could not load this passage. Check the reference or try again later.',
    }
  }
}

export function kindleReadScriptureBackHref(
  fromSlug: string | null,
  anchor?: string | null
): string {
  const base =
    fromSlug && fromSlug.trim() ? kindleProfileReadUrl(fromSlug.trim()) : '/default/read/'
  const anchorTrimmed = anchor?.trim()
  if (anchorTrimmed) {
    return `${base}#${anchorTrimmed}`
  }
  return base
}
