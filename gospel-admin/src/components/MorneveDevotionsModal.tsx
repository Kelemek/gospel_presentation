'use client'

import { useId, useState } from 'react'
import Link from 'next/link'
import {
  MORNEVE_MONTH_NAMES,
  firstWeekdayOfMonth,
  morneveSlugForLocalDate,
  morneveSlugForMmdd,
  morneveTitleForMmdd,
} from '@/lib/spurgeon/morneveSlug'

const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const

function mmddForCalendarDay(monthIndex: number, day: number): string {
  const mm = String(monthIndex + 1).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return `${mm}${dd}`
}

function daysInMonth(monthIndex: number): number {
  return DAYS_IN_MONTH[monthIndex] ?? 31
}

interface MorneveDevotionsModalProps {
  isOpen: boolean
  onClose: () => void
  onFollowDayLink?: () => void
}

export default function MorneveDevotionsModal({
  isOpen,
  onClose,
  onFollowDayLink,
}: MorneveDevotionsModalProps) {
  const titleId = useId()
  const todaySlug = morneveSlugForLocalDate()
  const todayTitle = morneveTitleForMmdd(todaySlug.replace(/^me/i, ''))

  const now = new Date()
  const [monthIndex, setMonthIndex] = useState(now.getMonth())

  if (!isOpen) return null

  const monthName = MORNEVE_MONTH_NAMES[monthIndex]
  const count = daysInMonth(monthIndex)
  const firstWeekday = firstWeekdayOfMonth(now.getFullYear(), monthIndex)
  const cells: (number | null)[] = []
  for (let i = 0; i < firstWeekday; i++) cells.push(null)
  for (let d = 1; d <= count; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

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
            Spurgeon&apos;s Morning and Evening
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
          <div>
            <Link
              href={`/${todaySlug}`}
              onClick={() => {
                onFollowDayLink?.()
                onClose()
              }}
              data-tour="morneve-modal-today"
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/30 px-4 py-3 text-base font-semibold text-blue-800 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
            >
              Today — {todayTitle}
            </Link>
          </div>

          <div className="space-y-3" data-tour="morneve-modal-calendar">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setMonthIndex((m) => (m <= 0 ? 11 : m - 1))}
                className="cursor-pointer px-3 py-1.5 text-sm font-medium rounded-md border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                aria-label="Previous month"
              >
                ‹
              </button>
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{monthName}</span>
              <button
                type="button"
                onClick={() => setMonthIndex((m) => (m >= 11 ? 0 : m + 1))}
                className="cursor-pointer px-3 py-1.5 text-sm font-medium rounded-md border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                aria-label="Next month"
              >
                ›
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-500 dark:text-slate-400">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d} className="py-1">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {cells.map((day, idx) => {
                if (day == null) {
                  return <div key={`empty-${idx}`} className="aspect-square" aria-hidden />
                }
                const mmdd = mmddForCalendarDay(monthIndex, day)
                const slug = morneveSlugForMmdd(mmdd)
                const isToday =
                  monthIndex === now.getMonth() &&
                  day === now.getDate() &&
                  (monthIndex !== 1 || day !== 29 || now.getDate() === 29)
                const isTodayFeb28NonLeap =
                  monthIndex === 1 &&
                  day === 28 &&
                  now.getMonth() === 1 &&
                  now.getDate() === 28 &&
                  todaySlug === morneveSlugForMmdd('0229')

                const highlight = isToday || isTodayFeb28NonLeap

                return (
                  <Link
                    key={slug}
                    href={`/${slug}`}
                    onClick={() => {
                      onFollowDayLink?.()
                      onClose()
                    }}
                    className={`aspect-square flex items-center justify-center rounded-md text-sm transition-colors ${
                      highlight
                        ? 'font-bold bg-blue-600 text-white dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                    aria-label={morneveTitleForMmdd(mmdd)}
                  >
                    {day}
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
