'use client'

import { useCallback, useState } from 'react'
import { logger } from '@/lib/logger'
import { shareResourceUrl } from '@/lib/shareResourceUrl'

export type UseProfileShareResourceOptions = {
  profileSlug: string
  profileTitle: string
  showAlert: (message: string) => void
}

export function useProfileShareResource({
  profileSlug,
  profileTitle,
  showAlert,
}: UseProfileShareResourceOptions) {
  const [isSharingResource, setIsSharingResource] = useState(false)

  const handleShareResource = useCallback(async () => {
    if (typeof window === 'undefined' || !profileSlug) return
    const slug = profileSlug.replace(/^\/+|\/+$/g, '')
    const url = `${window.location.origin}/${slug}`
    setIsSharingResource(true)
    try {
      const result = await shareResourceUrl({
        url,
        title: profileTitle || slug,
        dialogTitle: 'Share presentation',
        text: `Open this gospel presentation: ${profileTitle || slug}`,
      })
      if (result === 'copied') {
        showAlert(`Link copied to clipboard:\n\n${url}`)
      }
    } catch (e) {
      logger.error('Share resource failed', e)
      showAlert('Could not share this link. Please try again.')
    } finally {
      setIsSharingResource(false)
    }
  }, [profileSlug, profileTitle, showAlert])

  return {
    isSharingResource,
    handleShareResource,
  }
}
