import { Capacitor } from '@capacitor/core'
import { logger } from '@/lib/logger'
import { stripScriptureForMemorization } from '@/lib/verseMemorizationStorage'

export type ShareScripturePassageResult = 'shared' | 'copied' | 'cancelled'

export type FormatScripturePassageForShareOptions = {
  reference: string
  translationLabel: string
  passageText: string
}

export type ShareScripturePassageOptions = FormatScripturePassageForShareOptions & {
  dialogTitle?: string
}

function isAbortError(e: unknown): boolean {
  const name = e instanceof DOMException ? e.name : e instanceof Error ? e.name : ''
  return name === 'AbortError'
}

/** Plain-text body for share sheet / clipboard (reference, translation, passage). */
export function formatScripturePassageForShare(options: FormatScripturePassageForShareOptions): string {
  const { reference, translationLabel, passageText } = options
  const ref = reference.trim()
  const label = translationLabel.trim()
  const body = stripScriptureForMemorization(passageText)
  const header = label ? `${ref} (${label})` : ref
  if (!body) return header
  return `${header}\n\n${body}`
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

  const { reference, translationLabel, passageText, dialogTitle } = options
  const formatted = formatScripturePassageForShare({ reference, translationLabel, passageText })
  const title = reference.trim() || 'Scripture passage'

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
