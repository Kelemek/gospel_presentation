'use client'

import { useCallback, useMemo, useState } from 'react'
import type { GospelSection } from '@/lib/types'
import {
  findMcheyneDayAnchor,
  formatLocalIsoDate,
  isMcheynePlanComplete,
  mcheynePlanDayForDates,
  MCHEYNE_PLAN_DAYS,
  parseLocalIsoDate,
} from '@/lib/mcheyne/mcheyneReadingDay'
import {
  loadMcheyneStartDate,
  saveMcheyneStartDate,
} from '@/lib/mcheyne/mcheyneStartDateStorage'
import { scrollToTocAnchorWhenReady } from '@/lib/scrollToTocAnchor'
import { OpenBookIcon } from '@/components/OpenBookIcon'

interface McheyneReadingControlsProps {
  profileSlug: string
  sections: GospelSection[]
}

export default function McheyneReadingControls({
  profileSlug,
  sections,
}: McheyneReadingControlsProps) {
  const [startIso, setStartIso] = useState(() => loadMcheyneStartDate(profileSlug) ?? '')

  const startDate = useMemo(() => (startIso ? parseLocalIsoDate(startIso) : null), [startIso])

  const planDay = useMemo(() => {
    if (!startDate) return null
    return mcheynePlanDayForDates(startDate)
  }, [startDate])

  const planComplete = useMemo(() => {
    if (!startDate) return false
    return isMcheynePlanComplete(startDate)
  }, [startDate])

  const handleStartDateChange = useCallback(
    (value: string) => {
      setStartIso(value)
      if (value) saveMcheyneStartDate(value, profileSlug)
    },
    [profileSlug]
  )

  const handleTodayReading = useCallback(() => {
    if (!startDate || planDay == null) return
    const anchor = findMcheyneDayAnchor(sections, planDay)
    if (!anchor) return
    scrollToTocAnchorWhenReady(anchor.subsectionId, { behavior: 'smooth' })
  }, [sections, startDate, planDay])

  const todayLabel = planDay != null
    ? planComplete
      ? `Plan complete — Day ${MCHEYNE_PLAN_DAYS}`
      : `Day ${planDay} of ${MCHEYNE_PLAN_DAYS}`
    : null

  return (
    <div
      className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-600"
      data-tour="mcheyne-reading-controls"
    >
      <div className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-2 flex items-center gap-1.5">
        <OpenBookIcon className="w-4 h-4 shrink-0" />
        Reading schedule
      </div>
      <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1" htmlFor="mcheyne-start-date">
        Plan start date
      </label>
      <input
        id="mcheyne-start-date"
        type="date"
        value={startIso}
        max={formatLocalIsoDate(new Date())}
        onChange={(e) => handleStartDateChange(e.target.value)}
        className="w-full rounded border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs px-2 py-1.5 mb-2"
      />
      {todayLabel ? (
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{todayLabel}</p>
      ) : (
        <p className="text-xs text-slate-500 dark:text-slate-400 italic mb-2">
          Pick a start date to jump to today&apos;s readings.
        </p>
      )}
      <button
        type="button"
        onClick={handleTodayReading}
        disabled={!startDate || planDay == null}
        className="w-full cursor-pointer rounded px-3 py-1.5 text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700 transition-colors hover:bg-blue-200 dark:hover:bg-blue-900/60 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-100 dark:disabled:hover:bg-blue-900/40"
        aria-label={
          planDay != null
            ? `Go to today's reading, day ${planDay}`
            : "Go to today's reading"
        }
      >
        Today&apos;s reading
      </button>
    </div>
  )
}
