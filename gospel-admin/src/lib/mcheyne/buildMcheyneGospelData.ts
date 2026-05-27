import type { GospelPresentationData, GospelSection, NestedSubsection, ScriptureReference, Subsection } from '@/lib/types'
import { MCHEYNE_COPYRIGHT_PAGE_HREF } from '@/lib/mcheyne/mcheyneCopyrightAttribution'
import type { McheynePlanDay, McheynePlanFile } from '@/lib/mcheyne/mcheynePlanTypes'
import { MCHEYNE_SLUG, mcheyneProfileTitle } from '@/lib/mcheyne/mcheyneSlug'
import { passageKeysFromGospelPresentationData } from '@/lib/spurgeon/passageKeysFromGospelData'

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const

const MONTH_SECTION_IDS = [
  'jan',
  'feb',
  'mar',
  'apr',
  'may',
  'jun',
  'jul',
  'aug',
  'sep',
  'oct',
  'nov',
  'dec',
] as const

export function monthNameForPlan(month: number): string {
  const name = MONTH_NAMES[month - 1]
  if (!name) throw new Error(`Invalid month: ${month}`)
  return name
}

export function monthSectionId(month: number): string {
  const id = MONTH_SECTION_IDS[month - 1]
  if (!id) throw new Error(`Invalid month: ${month}`)
  return id
}

function scriptureCards(refs: readonly string[]): ScriptureReference[] {
  return refs.map((reference) => ({ reference, favorite: false }))
}

function nestedReadingGroup(title: string, refs: readonly string[]): NestedSubsection {
  return {
    title,
    content: '',
    scriptureReferences: scriptureCards(refs),
    questions: [],
  }
}

function daySubsection(day: McheynePlanDay): Subsection {
  const monthLabel = monthNameForPlan(day.month)
  return {
    title: `Day ${day.day} — ${monthLabel} ${day.monthDay}`,
    content: '',
    nestedSubsections: [
      nestedReadingGroup('Family', day.family),
      nestedReadingGroup('Secret', day.secret),
    ],
    questions: [],
  }
}

function introSubsection(): Subsection {
  return {
    title: "About this plan",
    content: `<p>Robert Murray M'Cheyne's one-year Bible reading plan assigns <strong>four chapters per day</strong> in two tracks:</p>
<ul>
<li><strong>Family</strong> — readings for worship together (read aloud).</li>
<li><strong>Secret</strong> — readings for personal devotion.</li>
</ul>
<p>Over the year you read through the Old Testament once and the New Testament and Psalms twice. Tap a scripture card to open the Bible reader. Your place is saved automatically with the <strong>yellow pin</strong> on the last passage you opened (see <strong>Pinned passages</strong> in the menu). Set a <strong>plan start date</strong> in the menu and use <strong>Today&apos;s reading</strong> to jump to the day on your schedule; reopening this resource scrolls to your yellow pin.</p>
<p>This schedule uses <strong>365 calendar-dated days</strong>; there is no February 29 entry. See <a href="${MCHEYNE_COPYRIGHT_PAGE_HREF}">Copyright &amp; Attribution</a> for the reading-plan source.</p>`,
    questions: [],
  }
}

export function buildMcheyneGospelData(plan: McheynePlanFile): GospelPresentationData {
  const byMonth = new Map<number, McheynePlanDay[]>()
  for (const day of plan.days) {
    const list = byMonth.get(day.month) ?? []
    list.push(day)
    byMonth.set(day.month, list)
  }

  const sections: GospelSection[] = []
  const isFullYear = plan.days.length === 365
  for (let month = 1; month <= 12; month++) {
    const days = byMonth.get(month)
    if (!days?.length) {
      if (isFullYear) {
        throw new Error(`Missing M'Cheyne days for month ${month}`)
      }
      continue
    }
    const subsections: Subsection[] = days.map(daySubsection)
    if (month === 1) {
      subsections.unshift(introSubsection())
    }
    sections.push({
      section: monthSectionId(month),
      title: monthNameForPlan(month),
      subsections,
    })
  }

  return sections
}

export interface ParsedMcheynePlan {
  slug: string
  title: string
  gospelData: GospelPresentationData
  passageKeys: string[]
}

export function parseMcheynePlanFile(plan: McheynePlanFile): ParsedMcheynePlan {
  const gospelData = buildMcheyneGospelData(plan)
  return {
    slug: MCHEYNE_SLUG,
    title: mcheyneProfileTitle(),
    gospelData,
    passageKeys: passageKeysFromGospelPresentationData(gospelData),
  }
}
