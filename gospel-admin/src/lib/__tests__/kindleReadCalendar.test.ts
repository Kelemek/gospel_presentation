import {
  kindleReadCalendarUrl,
  renderKindleReadCalendarHtml,
} from '@/lib/kindleReadCalendar'
import {
  mcheynePlanDayForCalendarMonthDay,
  mcheynePlanDayForLocalDate,
} from '@/lib/mcheyne/mcheyneCalendar'
import { findMcheyneDayAnchor } from '@/lib/mcheyne/mcheyneReadingDay'
import planFile from '../../../data/mcheyne/plan.json'
import { buildMcheyneGospelData } from '@/lib/mcheyne/buildMcheyneGospelData'
import type { McheynePlanFile } from '@/lib/mcheyne/mcheynePlanTypes'
import { morneveSlugForLocalDate } from '@/lib/spurgeon/morneveSlug'

const mcheyneSections = buildMcheyneGospelData(planFile as McheynePlanFile)

describe('kindleReadCalendarUrl', () => {
  it('builds calendar URLs with month and from', () => {
    expect(kindleReadCalendarUrl('morneve', 3, 'default')).toBe(
      '/read/calendar/morneve/?month=3&from=default'
    )
    expect(kindleReadCalendarUrl('mcheyne')).toBe('/read/calendar/mcheyne/')
  })
})

describe('renderKindleReadCalendarHtml — morneve', () => {
  const now = new Date(2026, 2, 15) // March 15, 2026

  it('renders Today link, month nav, and day links', () => {
    const html = renderKindleReadCalendarHtml({
      kind: 'morneve',
      month: 3,
      fromSlug: 'default',
      now,
    })

    const todaySlug = morneveSlugForLocalDate(now)
    expect(html).toContain(`/read/calendar/morneve/?month=2&amp;from=default`)
    expect(html).toContain(`/read/calendar/morneve/?month=4&amp;from=default`)
    expect(html).toContain('March')
    expect(html).toContain(`Today &mdash; March 15`)
    expect(html).toContain(`href="/${todaySlug}/read/"`)
    expect(html).toContain('href="/me0315/read/"')
    expect(html).toContain('kindle-read-calendar-day--today')
    expect(html).toContain('/default/read/">Back</a>')
  })

  it('maps Feb 28 today to me0229 on non-leap years', () => {
    const feb28 = new Date(2025, 1, 28)
    const html = renderKindleReadCalendarHtml({
      kind: 'morneve',
      month: 2,
      fromSlug: 'default',
      now: feb28,
    })

    expect(html).toContain('href="/me0229/read/"')
    expect(html).toContain('kindle-read-calendar-day--today')
  })
})

describe('renderKindleReadCalendarHtml — mcheyne', () => {
  const now = new Date(2026, 4, 27) // May 27, 2026

  it('renders Today link with plan-day hash anchor', () => {
    const planDay = mcheynePlanDayForLocalDate(now)
    expect(planDay).not.toBeNull()
    const anchor = findMcheyneDayAnchor(mcheyneSections, planDay!)
    expect(anchor).not.toBeNull()

    const html = renderKindleReadCalendarHtml({
      kind: 'mcheyne',
      month: 5,
      fromSlug: 'default',
      now,
    })

    expect(html).toContain('Today &mdash; May 27')
    expect(html).toContain(`/mchy/read/#${anchor!.subsectionId}`)
    expect(html).toContain('kindle-read-calendar-day--today')
  })

  it('renders disabled Feb 29 cell', () => {
    const html = renderKindleReadCalendarHtml({
      kind: 'mcheyne',
      month: 2,
      fromSlug: 'default',
      now: new Date(2026, 1, 1),
    })

    expect(mcheynePlanDayForCalendarMonthDay(2, 29)).toBeNull()
    expect(html).toContain('kindle-read-calendar-day--disabled')
  })

  it('shows no-reading message on Feb 29 today', () => {
    const html = renderKindleReadCalendarHtml({
      kind: 'mcheyne',
      month: 2,
      fromSlug: 'default',
      now: new Date(2028, 1, 29),
    })

    expect(mcheynePlanDayForLocalDate(new Date(2028, 1, 29))).toBeNull()
    expect(html).toContain('No reading for today (Feb 29)')
  })
})
