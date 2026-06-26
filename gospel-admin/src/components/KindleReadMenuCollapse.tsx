'use client'

import { useEffect } from 'react'
import {
  closeKindleReadProfileMenu,
  kindleReadMenuLinkFromClickTarget,
} from '@/lib/kindleReadMenuCollapse'

/**
 * Collapses the Kindle read Menu after choosing a resource or TOC link so the
 * sticky header does not stay open over the content (especially same-page anchors).
 */
export default function KindleReadMenuCollapse() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const link = kindleReadMenuLinkFromClickTarget(event.target)
      if (!link) return
      closeKindleReadProfileMenu()
    }

    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  return null
}
