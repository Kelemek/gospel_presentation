'use client'

import type { ReactNode } from 'react'
import { firstWeekdayOfMonth, MORNEVE_MONTH_NAMES } from '@/lib/spurgeon/morneveSlug'

const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

function daysInMonth(monthIndex: number): number {
  return DAYS_IN_MONTH[monthIndex] ?? 31
}

export type MonthCalendarGridProps = {
  monthIndex: number
  onMonthChange: (monthIndex: number) => void
  year?: number
  renderDay: (day: number, monthIndex: number) => ReactNode
  tourId?: string
}

export default function MonthCalendarGrid({
  monthIndex,
  onMonthChange,
  year = new Date().getFullYear(),
  renderDay,
  tourId,
}: MonthCalendarGridProps) {
  const monthName = MORNEVE_MONTH_NAMES[monthIndex]
  const count = daysInMonth(monthIndex)
  const firstWeekday = firstWeekdayOfMonth(year, monthIndex)
  const cells: (number | null)[] = []
  for (let i = 0; i < firstWeekday; i++) cells.push(null)
  for (let d = 1; d <= count; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div className="space-y-3" data-tour={tourId}>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onMonthChange(monthIndex <= 0 ? 11 : monthIndex - 1)}
          className="cursor-pointer px-3 py-1.5 text-sm font-medium rounded-md border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
          aria-label="Previous month"
        >
          ‹
        </button>
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{monthName}</span>
        <button
          type="button"
          onClick={() => onMonthChange(monthIndex >= 11 ? 0 : monthIndex + 1)}
          className="cursor-pointer px-3 py-1.5 text-sm font-medium rounded-md border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-500 dark:text-slate-400">
        {WEEKDAY_LABELS.map((d) => (
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
          return (
            <div key={`day-${monthIndex}-${day}`} className="aspect-square">
              {renderDay(day, monthIndex)}
            </div>
          )
        })}
      </div>
    </div>
  )
}
