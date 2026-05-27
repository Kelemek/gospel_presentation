'use client'

import { useEffect, useId, useState } from 'react'
import MonthCalendarGrid from '@/components/MonthCalendarGrid'
import {
  mcheyneCalendarShortTitleForMonthDay,
  mcheyneCalendarShortTitleForPlanDay,
  mcheyneCalendarTitleForMonthDay,
  mcheynePlanDayForCalendarMonthDay,
  mcheynePlanDayForLocalDate,
} from '@/lib/mcheyne/mcheyneCalendar'
import { mcheynePlanDayFromDaySubsectionId } from '@/lib/mcheyne/mcheyneReadingDay'
import { hydrateVersePinsFromStorage, loadVersePins } from '@/lib/versePinStorage'
import { MCHEYNE_SLUG } from '@/lib/mcheyne/mcheyneSlug'

interface McheyneReadingPlanModalProps {
  isOpen: boolean
  onClose: () => void
  onFollowDayLink?: () => void
  onNavigateToPlanDay: (planDay: number) => void
  onNavigateToLatest: () => void
}

const navButtonBaseClassName =
  'flex flex-1 min-w-0 flex-col sm:flex-row items-center justify-center leading-tight gap-0.5 sm:gap-2 rounded-lg border-2 px-3 py-2.5 sm:px-4 sm:py-3 text-base font-semibold transition-colors'

const todayButtonClassName = `${navButtonBaseClassName} cursor-pointer border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-900/50`

const resumeButtonClassName = `${navButtonBaseClassName} cursor-pointer border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700`

const resumeButtonDisabledClassName = `${navButtonBaseClassName} border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 cursor-not-allowed`

function PlanNavButtonLabel({
  label,
  dateLabel,
}: {
  label: 'Today' | 'Resume'
  dateLabel: string | null
}) {
  if (!dateLabel) return <>{label}</>
  return (
    <>
      <span className="sm:hidden flex flex-col items-center">
        <span>{label}</span>
        <span className="text-sm font-normal">{dateLabel}</span>
      </span>
      <span className="hidden sm:inline">
        {label} — {dateLabel}
      </span>
    </>
  )
}

function planNavAriaLabel(label: 'Today' | 'Resume', dateLabel: string | null, suffix?: string): string {
  if (!dateLabel) return label
  const base = `${label} — ${dateLabel}`
  return suffix ? `${base}, ${suffix}` : base
}

export default function McheyneReadingPlanModal({
  isOpen,
  onClose,
  onFollowDayLink,
  onNavigateToPlanDay,
  onNavigateToLatest,
}: McheyneReadingPlanModalProps) {
  const titleId = useId()
  const now = new Date()
  const [monthIndex, setMonthIndex] = useState(now.getMonth())
  const [resumePlanDay, setResumePlanDay] = useState<number | null>(null)

  const todayPlanDay = mcheynePlanDayForLocalDate(now)
  const todayDateLabel =
    todayPlanDay != null
      ? mcheyneCalendarShortTitleForMonthDay(now.getMonth() + 1, now.getDate())
      : null

  const resumeDateLabel =
    resumePlanDay != null ? mcheyneCalendarShortTitleForPlanDay(resumePlanDay) : null
  const highlightResume = resumeDateLabel != null
  const hasLatestPin = highlightResume

  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    void hydrateVersePinsFromStorage(MCHEYNE_SLUG).then(() => {
      if (cancelled) return
      const yellow = loadVersePins(MCHEYNE_SLUG).yellow
      if (!yellow?.subsectionId) {
        setResumePlanDay(null)
        return
      }
      setResumePlanDay(mcheynePlanDayFromDaySubsectionId(yellow.subsectionId))
    })
    return () => {
      cancelled = true
    }
  }, [isOpen])

  if (!isOpen) return null

  const followAndNavigate = (navigate: () => void) => {
    onFollowDayLink?.()
    onClose()
    navigate()
  }

  return (
    <div
      className="fixed inset-0 z-60 flex items-start justify-center overflow-x-hidden bg-black/50 dark:bg-black/70 pt-[max(2.5rem,env(safe-area-inset-top,0))] sm:pt-[max(3.5rem,env(safe-area-inset-top,0))] pb-[max(2rem,max(48px,env(safe-area-inset-bottom,0)))] pl-[max(1rem,env(safe-area-inset-left,0))] pr-[max(1rem,env(safe-area-inset-right,0))]"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="min-w-0 bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-lg w-full max-h-[calc(100dvh-max(2.5rem,env(safe-area-inset-top,0))-max(2rem,max(48px,env(safe-area-inset-bottom,0))))] sm:max-h-[calc(100dvh-max(3.5rem,env(safe-area-inset-top,0))-max(2rem,max(48px,env(safe-area-inset-bottom,0))))] overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 border-b border-gray-200 dark:border-slate-600 px-5 py-4 flex items-center justify-between gap-3">
          <h2 id={titleId} className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            M&apos;Cheyne Bible Reading Plan
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-5">
          <div className="flex flex-nowrap gap-2">
            {todayPlanDay != null && todayDateLabel ? (
              <button
                type="button"
                data-tour="mcheyne-modal-today"
                className={highlightResume ? resumeButtonClassName : todayButtonClassName}
                onClick={() => followAndNavigate(() => onNavigateToPlanDay(todayPlanDay))}
                aria-label={planNavAriaLabel('Today', todayDateLabel)}
              >
                <PlanNavButtonLabel label="Today" dateLabel={todayDateLabel} />
              </button>
            ) : (
              <div
                className="flex flex-1 min-w-0 items-center justify-center rounded-lg border-2 border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 px-4 py-3 text-sm text-slate-500 dark:text-slate-400"
                data-tour="mcheyne-modal-today"
              >
                No reading for today (Feb 29)
              </div>
            )}
            {hasLatestPin && resumeDateLabel ? (
              <button
                type="button"
                data-tour="mcheyne-modal-latest"
                className={todayButtonClassName}
                onClick={() => followAndNavigate(onNavigateToLatest)}
                aria-label={planNavAriaLabel('Resume', resumeDateLabel, 'your last pinned passage')}
              >
                <PlanNavButtonLabel label="Resume" dateLabel={resumeDateLabel} />
              </button>
            ) : (
              <button
                type="button"
                disabled
                data-tour="mcheyne-modal-latest"
                className={resumeButtonDisabledClassName}
                aria-label="Resume unavailable without a pinned passage"
              >
                Resume
              </button>
            )}
          </div>

          <MonthCalendarGrid
            monthIndex={monthIndex}
            onMonthChange={setMonthIndex}
            year={now.getFullYear()}
            tourId="mcheyne-modal-calendar"
            renderDay={(day, monthIdx) => {
              const month = monthIdx + 1
              const planDay = mcheynePlanDayForCalendarMonthDay(month, day)
              const calTitle = mcheyneCalendarTitleForMonthDay(month, day)
              const isToday = monthIdx === now.getMonth() && day === now.getDate()

              if (planDay == null) {
                return (
                  <span
                    className="aspect-square flex w-full h-full items-center justify-center rounded-md text-sm text-slate-300 dark:text-slate-600"
                    aria-hidden={calTitle == null}
                    aria-label={calTitle ?? undefined}
                  >
                    {day}
                  </span>
                )
              }

              return (
                <button
                  type="button"
                  onClick={() => {
                    followAndNavigate(() => onNavigateToPlanDay(planDay))
                  }}
                  className={`aspect-square flex w-full h-full items-center justify-center rounded-md text-sm transition-colors cursor-pointer ${
                    isToday
                      ? 'font-bold bg-blue-600 text-white dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                  aria-label={calTitle ?? `Day ${planDay}`}
                >
                  {day}
                </button>
              )
            }}
          />
        </div>
      </div>
    </div>
  )
}
