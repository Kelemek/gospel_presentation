'use client'

import { useCallback, useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import type { GospelSection } from '@/lib/types'
import { scrollToTocAnchorWhenReady } from '@/lib/scrollToTocAnchor'
import { isMcheyneProfileSlug } from '@/lib/mcheyne/mcheyneSlug'
import { findMcheyneDayAnchor, mcheyneDaySubsectionIdFromAnchor } from '@/lib/mcheyne/mcheyneReadingDay'
import {
  resolveMcheynePlanDayFromNavigation,
  resolveMcheyneResumePinFromNavigation,
  setPendingMcheynePlanDay,
  setPendingMcheyneResumePin,
} from '@/lib/mcheyne/mcheynePendingNavigation'
import { loadMcheyneYellowPinForResume } from '@/lib/mcheyne/mcheyneResumeYellowPin'
import {
  cancelMcheyneResumeScroll,
  finishMcheyneResumeScrollSession,
  startMcheyneResumeScroll,
} from '@/lib/mcheyne/mcheyneResumeScrollSession'

export type UseProfileMcheyneNavigationOptions = {
  isHydrated: boolean
  sectionCount: number
  profileSlug: string
  sections: GospelSection[]
  studyRefParam: string
  mcheynePlanDayParam: string
  mcheyneResumePinParam: string
  bumpVersePins: () => void
}

export function useProfileMcheyneNavigation({
  isHydrated,
  sectionCount,
  profileSlug,
  sections,
  studyRefParam,
  mcheynePlanDayParam,
  mcheyneResumePinParam,
  bumpVersePins,
}: UseProfileMcheyneNavigationOptions) {
  const pathname = usePathname()
  const router = useRouter()
  const mcheynePlanDayScrollRef = useRef<number | null>(null)
  const mcheyneResumePinScrollRef = useRef(false)
  const mcheyneResumeScrollCancelRef = useRef<(() => void) | null>(null)

  const clearMcheyneNavQueryParams = useCallback(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash : ''
    router.replace(`${pathname}${hash}`, { scroll: false })
  }, [router, pathname])

  const finishMcheyneResumeScroll = useCallback(() => {
    finishMcheyneResumeScrollSession(mcheyneResumeScrollCancelRef)
    clearMcheyneNavQueryParams()
  }, [clearMcheyneNavQueryParams])

  const startMcheyneResumeScrollToYellowPin = useCallback(
    (subsectionId: string): void => {
      const daySubsectionId = mcheyneDaySubsectionIdFromAnchor(subsectionId)
      mcheyneResumePinScrollRef.current = true
      startMcheyneResumeScroll(
        mcheyneResumeScrollCancelRef,
        scrollToTocAnchorWhenReady(daySubsectionId, {
          behavior: 'auto',
          maxFrames: 180,
          preferSubsectionTitle: true,
          onDone: finishMcheyneResumeScroll,
          onGiveUp: finishMcheyneResumeScroll,
        })
      )
    },
    [finishMcheyneResumeScroll]
  )

  const scrollToMcheynePlanDay = useCallback(
    (planDay: number, sectionList: GospelSection[]) => {
      const anchor = findMcheyneDayAnchor(sectionList, planDay)
      if (!anchor) return null
      return scrollToTocAnchorWhenReady(anchor.subsectionId, {
        behavior: 'auto',
        maxFrames: 180,
        preferSubsectionTitle: true,
        onDone: clearMcheyneNavQueryParams,
        onGiveUp: clearMcheyneNavQueryParams,
      })
    },
    [clearMcheyneNavQueryParams]
  )

  const navigateMcheynePlanDay = useCallback(
    (planDay: number) => {
      const onMchy = Boolean(profileSlug && isMcheyneProfileSlug(profileSlug))
      mcheynePlanDayScrollRef.current = null
      cancelMcheyneResumeScroll(mcheyneResumeScrollCancelRef)
      mcheyneResumePinScrollRef.current = false
      setPendingMcheynePlanDay(planDay)
      if (onMchy) {
        router.replace(`/mchy?planDay=${planDay}`, { scroll: false })
        return
      }
      router.push(`/mchy?planDay=${planDay}`, { scroll: false })
    },
    [profileSlug, router]
  )

  const navigateMcheyneLatest = useCallback(() => {
    mcheynePlanDayScrollRef.current = null
    cancelMcheyneResumeScroll(mcheyneResumeScrollCancelRef)
    mcheyneResumePinScrollRef.current = false

    void (async () => {
      if (!profileSlug) return
      const yellow = await loadMcheyneYellowPinForResume()
      if (!yellow) return

      if (isMcheyneProfileSlug(profileSlug)) {
        bumpVersePins()
        startMcheyneResumeScrollToYellowPin(yellow.subsectionId)
        return
      }

      setPendingMcheyneResumePin()
      router.push('/mchy?resumePin=1', { scroll: false })
    })()
  }, [profileSlug, bumpVersePins, router, startMcheyneResumeScrollToYellowPin])

  useEffect(() => {
    if (!isHydrated || sectionCount === 0 || !profileSlug || !isMcheyneProfileSlug(profileSlug)) {
      return
    }
    if (studyRefParam) return
    const rawHash = window.location.hash.slice(1)
    if (rawHash && rawHash.startsWith('section-')) return

    const wantsResumePin = resolveMcheyneResumePinFromNavigation(mcheyneResumePinParam)
    if (wantsResumePin) {
      if (mcheyneResumePinScrollRef.current) return
      mcheyneResumePinScrollRef.current = true
      let cancelled = false
      let scrollStarted = false

      void (async () => {
        const yellow = await loadMcheyneYellowPinForResume()
        if (cancelled) {
          mcheyneResumePinScrollRef.current = false
          return
        }
        bumpVersePins()
        if (!yellow) {
          mcheyneResumePinScrollRef.current = false
          clearMcheyneNavQueryParams()
          return
        }
        startMcheyneResumeScrollToYellowPin(yellow.subsectionId)
        scrollStarted = true
        if (cancelled) {
          cancelMcheyneResumeScroll(mcheyneResumeScrollCancelRef)
          scrollStarted = false
          mcheyneResumePinScrollRef.current = false
        }
      })()

      return () => {
        cancelled = true
        if (scrollStarted) return
        mcheyneResumePinScrollRef.current = false
      }
    }

    if (!wantsResumePin) {
      mcheyneResumePinScrollRef.current = false
    }
    const planDay = resolveMcheynePlanDayFromNavigation(mcheynePlanDayParam)
    if (planDay == null || !sections) {
      mcheynePlanDayScrollRef.current = null
      return
    }
    if (mcheynePlanDayScrollRef.current === planDay) return
    mcheynePlanDayScrollRef.current = planDay

    const cancelScroll = scrollToMcheynePlanDay(planDay, sections)
    if (cancelScroll == null) {
      clearMcheyneNavQueryParams()
      return
    }
    return () => {
      if (mcheynePlanDayScrollRef.current === planDay) return
      cancelScroll()
    }
  }, [
    isHydrated,
    sectionCount,
    profileSlug,
    studyRefParam,
    sections,
    mcheynePlanDayParam,
    mcheyneResumePinParam,
    bumpVersePins,
    clearMcheyneNavQueryParams,
    scrollToMcheynePlanDay,
    startMcheyneResumeScrollToYellowPin,
  ])

  return {
    navigateMcheynePlanDay,
    navigateMcheyneLatest,
  }
}
