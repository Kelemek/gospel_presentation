import { Capacitor } from '@capacitor/core'
import { logger } from '@/lib/logger'

export type ShareResourceUrlResult = 'shared' | 'copied' | 'cancelled'

export type ShareResourceUrlOptions = {
  url: string
  /** e.g. profile title — used as share title / email subject where supported */
  title?: string
  /** Android share sheet title */
  dialogTitle?: string
  /** Optional body line (e.g. “Open this gospel presentation”) */
  text?: string
}

function isAbortError(e: unknown): boolean {
  const name = e instanceof DOMException ? e.name : e instanceof Error ? e.name : ''
  return name === 'AbortError'
}

/**
 * Opens the native share sheet on Capacitor, Web Share API when available,
 * otherwise copies the URL to the clipboard.
 */
export async function shareResourceUrl(options: ShareResourceUrlOptions): Promise<ShareResourceUrlResult> {
  const { url, title, dialogTitle, text } = options
  if (typeof window === 'undefined') {
    return 'cancelled'
  }

  const shareLine = text ?? (title ? `Open: ${title}` : url)

  if (Capacitor.isNativePlatform()) {
    try {
      const { Share } = await import('@capacitor/share')
      const platform = Capacitor.getPlatform()
      await Share.share({
        title: title ?? 'Gospel presentation',
        text: shareLine,
        url,
        ...(platform === 'android' ? { dialogTitle: dialogTitle ?? title ?? 'Share link' } : {}),
      })
      return 'shared'
    } catch (e) {
      if (isAbortError(e)) {
        return 'cancelled'
      }
      logger.warn('Native Share.share failed, falling back to clipboard', e)
    }
  }

  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({
        title: title ?? undefined,
        text: shareLine,
        url,
      })
      return 'shared'
    } catch (e) {
      if (isAbortError(e)) {
        return 'cancelled'
      }
      logger.warn('navigator.share failed, falling back to clipboard', e)
    }
  }

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url)
      return 'copied'
    }
  } catch (e) {
    logger.error('Clipboard write failed', e)
  }

  return 'cancelled'
}
