'use client'

import { useCallback, useEffect } from 'react'
import { scrollMemorizeBlankNearestInPracticeColumn } from '@/lib/memorizationScrollIntoPractice'
import {
  isMemorizeAndroidWebHost,
  isMemorizeIosWebHost,
} from '@/lib/memorizationViewportPlatform'
import { isPracticePhaseInSession } from '@/lib/memorizationPracticePhase'
import { MEMORIZE_EXTRA_GAP_ABOVE_KEYBOARD_PX } from '@/lib/memorizationPracticeSessionHelpers'
import {
  memorizationPracticeKeyboardInsetScrollDelayMs,
  shouldBlurMemorizationPracticeInput,
  shouldFocusMemorizationPracticeInput,
  shouldScrollBlankAfterInputFocus,
  shouldScrollBlankForActiveTarget,
} from '@/lib/memorizationPracticeTypingScrollPolicy'
import type { MemorizationPracticeTypingBag } from '@/hooks/memorizationPractice/memorizationPracticeTypingBag'
import type { MemorizationPracticeTypingHintState } from '@/hooks/memorizationPractice/useMemorizationPracticeTypingHint'

export function useMemorizationPracticeTypingScroll(
  bag: MemorizationPracticeTypingBag,
  hint: Pick<
    MemorizationPracticeTypingHintState,
    'hintActive' | 'currentTargetIndex'
  >,
  keyboardInsetPx: number,
  wordChoiceLabelsLength: number
) {
  const {
    phase,
    practiceMode,
    roundIndex,
    isRoundComplete,
    hasTypedInRound,
    practiceWordsWordRef,
    practiceWordsTypeRef,
    practiceScrollRef,
    androidScrollClampUntilRef,
    memorizeAndroidHost,
    practiceModeRef,
    practiceInputRef,
  } = bag
  const { hintActive, currentTargetIndex } = hint

  const scrollCurrentBlankIntoView = useCallback(() => {
    requestAnimationFrame(() => {
      const root = practiceWordsWordRef.current ?? practiceWordsTypeRef.current
      const scrollEl = practiceScrollRef.current
      if (!root || !scrollEl) return
      const el = root.querySelector<HTMLElement>('[data-memorize-current-blank="true"]')
      if (!el) return
      const androidHost = isMemorizeAndroidWebHost()
      if (androidHost) {
        if (Date.now() < androidScrollClampUntilRef.current) {
          scrollEl.scrollTop = 0
          return
        }
      }
      scrollMemorizeBlankNearestInPracticeColumn(scrollEl, el)
      const scrollRect = scrollEl.getBoundingClientRect()
      const vv = window.visualViewport
      const edgeMargin = 12
      const isWordMode = practiceModeRef.current === 'word'
      let viewTop: number
      let viewBottom: number
      if (isWordMode) {
        viewTop = scrollRect.top + edgeMargin
        viewBottom = scrollRect.bottom - edgeMargin
      } else if (vv) {
        viewTop = vv.offsetTop + edgeMargin
        viewBottom =
          vv.offsetTop + vv.height - edgeMargin - MEMORIZE_EXTRA_GAP_ABOVE_KEYBOARD_PX
      } else {
        viewTop = scrollRect.top + edgeMargin
        viewBottom = scrollRect.bottom - edgeMargin
      }
      const reduceMotion =
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const nudgeBehavior: ScrollBehavior =
        reduceMotion || androidHost || isMemorizeIosWebHost() ? 'auto' : 'smooth'
      const nudgeIntoVisibleViewport = () => {
        const rect = el.getBoundingClientRect()
        let delta = 0
        if (rect.bottom > viewBottom) delta += rect.bottom - viewBottom
        if (rect.top < viewTop) delta -= viewTop - rect.top
        if (Math.abs(delta) < 0.5) return
        const nextTop = Math.max(0, scrollEl.scrollTop + delta)
        scrollEl.scrollTo({ top: nextTop, behavior: nudgeBehavior })
      }
      nudgeIntoVisibleViewport()
      if (nudgeBehavior === 'auto') {
        requestAnimationFrame(nudgeIntoVisibleViewport)
      }
    })
  }, [
    practiceWordsWordRef,
    practiceWordsTypeRef,
    practiceScrollRef,
    androidScrollClampUntilRef,
    practiceModeRef,
  ])

  useEffect(() => {
    if (!memorizeAndroidHost || !isPracticePhaseInSession(phase)) return
    const scrollEl = practiceScrollRef.current
    if (!scrollEl) return
    const onScroll = () => {
      if (Date.now() < androidScrollClampUntilRef.current) {
        scrollEl.scrollTop = 0
      }
    }
    scrollEl.addEventListener('scroll', onScroll, { passive: false })
    return () => scrollEl.removeEventListener('scroll', onScroll)
  }, [memorizeAndroidHost, phase, practiceScrollRef, androidScrollClampUntilRef])

  useEffect(() => {
    const policy = {
      phase,
      practiceMode,
      isRoundComplete,
      currentTargetIndex,
      hintActive,
      hasTypedInRound,
    }

    if (shouldBlurMemorizationPracticeInput(policy)) {
      practiceInputRef.current?.blur()
    }

    let focusTimer = 0
    let insetScrollTimer = 0

    if (shouldFocusMemorizationPracticeInput(policy)) {
      focusTimer = window.setTimeout(() => {
        practiceInputRef.current?.focus({ preventScroll: true })
        if (shouldScrollBlankAfterInputFocus(policy)) {
          scrollCurrentBlankIntoView()
        }
      }, 0)
    }

    if (shouldScrollBlankForActiveTarget(policy)) {
      scrollCurrentBlankIntoView()
    }

    const insetScrollDelayMs = memorizationPracticeKeyboardInsetScrollDelayMs(policy)
    if (insetScrollDelayMs !== null) {
      insetScrollTimer = window.setTimeout(
        () => scrollCurrentBlankIntoView(),
        insetScrollDelayMs
      )
    }

    return () => {
      if (focusTimer) window.clearTimeout(focusTimer)
      if (insetScrollTimer) window.clearTimeout(insetScrollTimer)
    }
  }, [
    phase,
    practiceMode,
    isRoundComplete,
    currentTargetIndex,
    hintActive,
    hasTypedInRound,
    roundIndex,
    keyboardInsetPx,
    wordChoiceLabelsLength,
    scrollCurrentBlankIntoView,
    practiceInputRef,
  ])
}
