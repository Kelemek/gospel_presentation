'use client'

import { useLayoutEffect, useRef } from 'react'
import { playOverflowTextReveal, setOverflowRevealTranslate } from '@/lib/overflowTextRevealAnimation'

type ScriptureModalHeaderBookRevealProps = {
  book: string
  /** Changes on every passage navigation (tab switch, prev/next, new verse) to replay the reveal. */
  revealKey: string
}

/** Book title in the scripture header: pans once when clipped so the full name is readable. */
export default function ScriptureModalHeaderBookReveal({
  book,
  revealKey,
}: ScriptureModalHeaderBookRevealProps) {
  const containerRef = useRef<HTMLSpanElement>(null)
  const textRef = useRef<HTMLSpanElement>(null)

  useLayoutEffect(() => {
    const container = containerRef.current
    const text = textRef.current
    if (!container || !text) return

    setOverflowRevealTranslate(text, 0)
    const controller = new AbortController()

    const reducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const run = async () => {
      await new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => resolve())
      })
      if (controller.signal.aborted || reducedMotion) return
      await playOverflowTextReveal(container, text, controller.signal)
    }

    void run()

    return () => {
      controller.abort()
      setOverflowRevealTranslate(text, 0)
    }
  }, [book, revealKey])

  return (
    <span ref={containerRef} className="min-w-0 max-w-full flex-1 overflow-hidden inline-block">
      <span ref={textRef} className="inline-block whitespace-nowrap max-w-none">
        {book}
      </span>
    </span>
  )
}
