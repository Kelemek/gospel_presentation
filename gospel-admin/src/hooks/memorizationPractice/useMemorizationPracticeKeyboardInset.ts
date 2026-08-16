'use client'

import { useEffect, useState } from 'react'
import { isMemorizeAndroidWebHost } from '@/lib/memorizationViewportPlatform'

export function useMemorizationPracticeKeyboardInset() {
  const [keyboardInsetPx, setKeyboardInsetPx] = useState(0)

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const coalesceAndroid = isMemorizeAndroidWebHost()
    let insetRaf = 0
    const applyInset = () => {
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
      setKeyboardInsetPx(inset)
    }
    const updateInset = () => {
      if (!coalesceAndroid) {
        applyInset()
        return
      }
      if (insetRaf) return
      insetRaf = window.requestAnimationFrame(() => {
        insetRaf = 0
        applyInset()
      })
    }
    applyInset()
    vv.addEventListener('resize', updateInset)
    vv.addEventListener('scroll', updateInset)
    return () => {
      if (insetRaf) window.cancelAnimationFrame(insetRaf)
      vv.removeEventListener('resize', updateInset)
      vv.removeEventListener('scroll', updateInset)
    }
  }, [])

  return keyboardInsetPx
}
