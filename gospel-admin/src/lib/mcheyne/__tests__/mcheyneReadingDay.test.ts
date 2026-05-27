import { buildMcheyneGospelData } from '@/lib/mcheyne/buildMcheyneGospelData'
import {
  findMcheyneDayAnchor,
  formatLocalIsoDate,
  isMcheynePlanComplete,
  mcheynePlanDayForDates,
  parseLocalIsoDate,
  startOfLocalDay,
} from '@/lib/mcheyne/mcheyneReadingDay'
import type { McheynePlanFile } from '@/lib/mcheyne/mcheynePlanTypes'
import planThreeDays from './fixtures/plan-three-days.json'

describe('mcheyneReadingDay', () => {
  const plan = planThreeDays as McheynePlanFile
  const sections = buildMcheyneGospelData(plan)

  describe('parseLocalIsoDate / formatLocalIsoDate', () => {
    it('round-trips valid local dates', () => {
      const d = new Date(2026, 0, 15)
      expect(formatLocalIsoDate(d)).toBe('2026-01-15')
      expect(parseLocalIsoDate('2026-01-15')).toEqual(startOfLocalDay(d))
    })

    it('rejects invalid calendar dates', () => {
      expect(parseLocalIsoDate('2026-02-30')).toBeNull()
      expect(parseLocalIsoDate('bad')).toBeNull()
    })
  })

  describe('mcheynePlanDayForDates', () => {
    it('returns day 1 on the start date', () => {
      const start = new Date(2026, 2, 1)
      expect(mcheynePlanDayForDates(start, start)).toBe(1)
    })

    it('counts elapsed days inclusively', () => {
      const start = new Date(2026, 0, 1)
      const today = new Date(2026, 0, 15)
      expect(mcheynePlanDayForDates(start, today)).toBe(15)
    })

    it('clamps at 365', () => {
      const start = new Date(2024, 0, 1)
      const today = new Date(2026, 0, 1)
      expect(mcheynePlanDayForDates(start, today)).toBe(365)
    })
  })

  describe('isMcheynePlanComplete', () => {
    it('is false through day 365 and true after', () => {
      const start = new Date(2026, 0, 1)
      expect(isMcheynePlanComplete(start, new Date(2026, 11, 31))).toBe(false)
      expect(isMcheynePlanComplete(start, new Date(2027, 0, 1))).toBe(true)
    })
  })

  describe('findMcheyneDayAnchor', () => {
    it('finds subsection for plan day 1 in January', () => {
      const anchor = findMcheyneDayAnchor(sections, 1)
      expect(anchor).toEqual({
        sectionId: 'section-jan',
        subsectionId: 'section-jan-1',
        planDay: 1,
      })
    })

    it('returns null for out-of-range days', () => {
      expect(findMcheyneDayAnchor(sections, 0)).toBeNull()
      expect(findMcheyneDayAnchor(sections, 366)).toBeNull()
    })
  })
})
