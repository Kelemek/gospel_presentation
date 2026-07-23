import { buildMcheyneGospelData } from '@/lib/mcheyne/buildMcheyneGospelData'
import {
  findMcheyneDayAnchor,
  formatLocalIsoDate,
  isMcheynePlanComplete,
  findFirstMcheynePlanDayScriptureNav,
  mcheyneDayChapterReferences,
  mcheyneDayChapterReferencesForAnchor,
  mcheyneDayScriptureCardsFromRefs,
  mcheyneDaySubsectionIdFromAnchor,
  mcheynePlanDayForDates,
  mcheynePlanDayFromDaySubsectionId,
  parseLocalIsoDate,
  startOfLocalDay,
} from '@/lib/mcheyne/mcheyneReadingDay'
import type { GospelSection } from '@/lib/types'
import type { McheynePlanFile } from '@/lib/mcheyne/mcheynePlanTypes'
import fullPlan from '../../../../data/mcheyne/plan.json'
import planThreeDays from './fixtures/plan-three-days.json'

function buildAllScriptureRefs(sections: GospelSection[]) {
  return sections.flatMap((section) => {
    const sid = `section-${section.section}`
    return section.subsections.flatMap((subsection, subIndex) => {
      const subId = `${sid}-${subIndex}`
      const main = (subsection.scriptureReferences || []).map((ref) => ({
        reference: ref.reference,
        sectionId: sid,
        subsectionId: subId,
      }))
      const nested = (subsection.nestedSubsections || []).flatMap((nested, n) => {
        const nestedId = `${sid}-${subIndex}-${n}`
        return (nested.scriptureReferences || []).map((ref) => ({
          reference: ref.reference,
          sectionId: sid,
          subsectionId: nestedId,
        }))
      })
      return [...main, ...nested]
    })
  })
}

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

  describe('mcheyneDaySubsectionIdFromAnchor', () => {
    it('strips nested Family/Secret suffix', () => {
      expect(mcheyneDaySubsectionIdFromAnchor('section-may-26-0')).toBe('section-may-26')
      expect(mcheyneDaySubsectionIdFromAnchor('section-may-26')).toBe('section-may-26')
    })
  })

  describe('mcheynePlanDayFromDaySubsectionId', () => {
    it('maps January day 1 subsection (after intro)', () => {
      expect(mcheynePlanDayFromDaySubsectionId('section-jan-1')).toBe(1)
    })

    it('returns null for January intro', () => {
      expect(mcheynePlanDayFromDaySubsectionId('section-jan-0')).toBeNull()
    })

    it('maps nested Family anchor to the parent day', () => {
      expect(mcheynePlanDayFromDaySubsectionId('section-may-26-0')).toBe(147)
    })
  })

  describe('mcheyneDayChapterReferences', () => {
    it('returns Family then Secret chapters for a plan day', () => {
      expect(mcheyneDayChapterReferences(1)).toEqual([
        'Genesis 1',
        'Matthew 1',
        'Ezra 1',
        'Acts 1',
      ])
    })

    it('resolves nested anchor to the day playlist', () => {
      expect(mcheyneDayChapterReferencesForAnchor('section-jan-1-0')).toEqual([
        'Genesis 1',
        'Matthew 1',
        'Ezra 1',
        'Acts 1',
      ])
    })

    it('returns null for January intro', () => {
      expect(mcheyneDayChapterReferencesForAnchor('section-jan-0')).toBeNull()
    })

    it('expands chapter-range readings for the day Listen playlist', () => {
      expect(mcheyneDayChapterReferences(91)).toEqual([
        'Leviticus 4',
        'Psalms 1',
        'Psalms 2',
        'Proverbs 19',
        'Colossians 2',
      ])
    })
  })

  describe('findFirstMcheynePlanDayScriptureNav', () => {
    it('returns the first Family card anchors for a plan day', () => {
      expect(findFirstMcheynePlanDayScriptureNav(sections, 1)).toEqual({
        reference: 'Genesis 1',
        sectionId: 'section-jan',
        subsectionId: 'section-jan-1-0',
      })
    })

    it('returns null for invalid plan days', () => {
      expect(findFirstMcheynePlanDayScriptureNav(sections, 0)).toBeNull()
    })
  })

  describe('mcheyneDayScriptureCardsFromRefs', () => {
    it('returns only cards for the requested plan day', () => {
      const allRefs = buildAllScriptureRefs(sections)
      const dayCards = mcheyneDayScriptureCardsFromRefs(allRefs, 'section-jan-1')
      expect(dayCards.map((card) => card.reference)).toEqual([
        'Genesis 1',
        'Matthew 1',
        'Ezra 1',
        'Acts 1',
      ])
    })

    it('resolves nested Family/Secret anchors to the parent day cards', () => {
      const allRefs = buildAllScriptureRefs(sections)
      const dayCards = mcheyneDayScriptureCardsFromRefs(allRefs, 'section-jan-1-1')
      expect(dayCards).toHaveLength(4)
      expect(dayCards[3]?.reference).toBe('Acts 1')
    })

    it('keeps Day 172 Matthew 1 separate from Day 1 Matthew 1', () => {
      const fullSections = buildMcheyneGospelData(fullPlan as McheynePlanFile)
      const allRefs = buildAllScriptureRefs(fullSections)
      const day172 = findMcheyneDayAnchor(fullSections, 172)
      expect(day172).not.toBeNull()

      const day172Cards = mcheyneDayScriptureCardsFromRefs(
        allRefs,
        day172!.subsectionId
      )
      const matthewOn172 = day172Cards.find((card) => card.reference === 'Matthew 1')
      expect(matthewOn172?.subsectionId).toMatch(/^section-jun-\d+-1$/)

      const day1Cards = mcheyneDayScriptureCardsFromRefs(allRefs, 'section-jan-1')
      const matthewOn1 = day1Cards.find((card) => card.reference === 'Matthew 1')
      expect(matthewOn1?.subsectionId).toBe('section-jan-1-0')
      expect(matthewOn172?.subsectionId).not.toBe(matthewOn1?.subsectionId)
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

    it('matches subsection titles with hyphen instead of em dash', () => {
      const hyphenSections = buildMcheyneGospelData(plan)
      hyphenSections[0].subsections[1].title = 'Day 1 - January 1'
      const anchor = findMcheyneDayAnchor(hyphenSections, 1)
      expect(anchor?.subsectionId).toBe('section-jan-1')
    })
  })
})
