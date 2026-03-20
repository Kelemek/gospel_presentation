'use client'

import { useLayoutEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useTextSize } from '@/contexts/TextSizeContext'

const TEXT_SIZE_CLASSES = ['text-size-normal', 'text-size-larger', 'text-size-largest'] as const

function clearTextSizeClasses(root: HTMLElement) {
  for (const c of TEXT_SIZE_CLASSES) {
    root.classList.remove(c)
  }
}

/**
 * Applies root font-size on non-admin routes via html classes so profile content scales.
 * Admin routes strip these classes so the admin UI stays at default size.
 */
export function ApplyTextSize() {
  const { textSize } = useTextSize()
  const pathname = usePathname()

  useLayoutEffect(() => {
    const root = document.documentElement
    clearTextSizeClasses(root)

    if (pathname?.startsWith('/admin')) {
      return
    }

    root.classList.add(`text-size-${textSize}`)
  }, [pathname, textSize])

  return null
}
