import type { McheynePlanDay, McheynePlanFile } from '@/lib/mcheyne/mcheynePlanTypes'
import { normalizeMcheyneReference } from '@/lib/mcheyne/mcheyneReferenceNormalize'

export type { McheynePlanDay, McheynePlanFile }

type RawDay = { family: string[]; secret: string[] }

export function buildPlanFromRaw(rawPlan: Record<string, RawDay>): McheynePlanFile {
  const keys = Object.keys(rawPlan).sort()
  if (keys.length !== 365) {
    throw new Error(`Expected 365 M'Cheyne days, got ${keys.length}`)
  }

  const days: McheynePlanDay[] = keys.map((mmdd, index) => {
    const month = parseInt(mmdd.slice(0, 2), 10)
    const monthDay = parseInt(mmdd.slice(2, 4), 10)
    const entry = rawPlan[mmdd]
    if (!entry?.family?.[0] || !entry?.family?.[1] || !entry?.secret?.[0] || !entry?.secret?.[1]) {
      throw new Error(`Incomplete readings for ${mmdd}`)
    }
    return {
      day: index + 1,
      month,
      monthDay,
      family: [
        normalizeMcheyneReference(entry.family[0]),
        normalizeMcheyneReference(entry.family[1]),
      ] as [string, string],
      secret: [
        normalizeMcheyneReference(entry.secret[0]),
        normalizeMcheyneReference(entry.secret[1]),
      ] as [string, string],
    }
  })

  return {
    version: 1,
    leapDayNote:
      "M'Cheyne uses 365 calendar-dated readings. There is no Feb 29 entry; on leap years, skip or combine that day manually.",
    days,
  }
}
