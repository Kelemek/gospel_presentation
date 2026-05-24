import { Capacitor } from '@capacitor/core'
import { logger } from '@/lib/logger'
import { appendScriptureShareLink } from '@/lib/scriptureModalShareUrl'
import { stripScriptureForMemorization } from '@/lib/verseMemorizationStorage'

export type ShareScripturePassageResult = 'shared' | 'copied' | 'cancelled'

export type FormatScripturePassageForShareOptions = {
  reference: string
  translationLabel: string
  passageText: string
  /** Optional deep link appended to share body (e.g. /default?scriptureRef=…). */
  pageUrl?: string
}

export type ShareScripturePassageOptions = FormatScripturePassageForShareOptions & {
  dialogTitle?: string
}

function isAbortError(e: unknown): boolean {
  const name = e instanceof DOMException ? e.name : e instanceof Error ? e.name : ''
  return name === 'AbortError'
}

/** Plain-text body for share sheet / clipboard (reference, translation, passage, optional link). */
export function formatScripturePassageForShare(options: FormatScripturePassageForShareOptions): string {
  const { reference, translationLabel, passageText, pageUrl } = options
  const ref = reference.trim()
  const label = translationLabel.trim()
  const body = stripScriptureForMemorization(passageText)
  const header = label ? `${ref} (${label})` : ref
  const passageBlock = body ? `${header}\n\n${body}` : header
  return appendScriptureShareLink(passageBlock, pageUrl ?? '')
}

/**
 * Opens the native share sheet on Capacitor, Web Share API when available,
 * otherwise copies the formatted passage to the clipboard.
 */
export async function shareScripturePassage(
  options: ShareScripturePassageOptions
): Promise<ShareScripturePassageResult> {
  if (typeof window === 'undefined') {
    return 'cancelled'
  }

  const { reference, translationLabel, passageText, pageUrl, dialogTitle } = options
  const formatted = formatScripturePassageForShare({
    reference,
    translationLabel,
    passageText,
    pageUrl,
  })
  const title = reference.trim() || 'Scripture passage'
  // Passage + deep link live in `formatted` only. Do not also pass `url` — many share targets
  // (Web Share on Windows, iOS, Capacitor) prefer `url` over `text` and drop the scripture body.

  if (Capacitor.isNativePlatform()) {
    try {
      const { Share } = await import('@capacitor/share')
      const platform = Capacitor.getPlatform()
      await Share.share({
        title,
        text: formatted,
        ...(platform === 'android' ? { dialogTitle: dialogTitle ?? 'Share passage' } : {}),
      })
      return 'shared'
    } catch (e) {
      if (isAbortError(e)) {
        return 'cancelled'
      }
      logger.warn('Native Share.share failed for scripture passage, falling back', e)
    }
  }

  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({
        title,
        text: formatted,
      })
      return 'shared'
    } catch (e) {
      if (isAbortError(e)) {
        return 'cancelled'
      }
      logger.warn('navigator.share failed for scripture passage, falling back to clipboard', e)
    }
  }

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(formatted)
      return 'copied'
    }
  } catch (e) {
    logger.error('Clipboard write failed for scripture passage', e)
  }

  return 'cancelled'
}
