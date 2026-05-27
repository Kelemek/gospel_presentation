import {
  buildMcheyneGospelData,
  monthNameForPlan,
  parseMcheynePlanFile,
} from '@/lib/mcheyne/buildMcheyneGospelData'
import { buildPlanFromRaw } from '@/lib/mcheyne/buildMcheynePlanFromRaw'
import { normalizeMcheyneReference } from '@/lib/mcheyne/mcheyneReferenceNormalize'
import { MCHEYNE_SLUG } from '@/lib/mcheyne/mcheyneSlug'
import type { McheynePlanFile } from '@/lib/mcheyne/mcheynePlanTypes'
import planThreeDays from './fixtures/plan-three-days.json'

describe('mcheyneReferenceNormalize', () => {
  it('normalizes source quirks', () => {
    expect(normalizeMcheyneReference('Acts \n4')).toBe('Acts 4')
    expect(normalizeMcheyneReference('Luke 1:39ff')).toBe('Luke 1:39')
    expect(normalizeMcheyneReference('Jeremiah 36 & 45')).toBe('Jeremiah 36-45')
  })

  it('keeps chapter-range readings used in the plan', () => {
    expect(normalizeMcheyneReference('Genesis 9-10')).toBe('Genesis 9-10')
    expect(normalizeMcheyneReference('Psalms 1-2')).toBe('Psalms 1-2')
  })
})

describe('buildPlanFromRaw', () => {
  it('builds 365 normalized days from MMDD keys', () => {
    const raw = {
      '0101': { family: ['Genesis 1', 'Matthew 1'], secret: ['Ezra 1', 'Acts 1'] },
      '0102': { family: ['Genesis 2', 'Matthew 2'], secret: ['Ezra 2', 'Acts 2'] },
    }
    expect(() => buildPlanFromRaw(raw)).toThrow(/Expected 365/)
  })
})

describe('buildMcheyneGospelData', () => {
  const plan = planThreeDays as McheynePlanFile

  it('groups days into month sections with intro in January', () => {
    const data = buildMcheyneGospelData(plan)
    expect(data).toHaveLength(1)
    expect(data[0].section).toBe('jan')
    expect(data[0].title).toBe('January')
    expect(data[0].subsections[0].title).toBe('About this plan')
    expect(data[0].subsections[0].content).toMatch(/Family/)
    expect(data[0].subsections[0].content).toMatch(/Copyright &amp; Attribution/)
    expect(data[0].subsections[0].content).toMatch(/mcheyne-reading-plan/)
    expect(data[0].subsections[1].title).toBe('Day 1 — January 1')
  })

  it('uses nested Family and Secret scripture cards without body prose', () => {
    const day1 = buildMcheyneGospelData(plan)[0].subsections[1]
    expect(day1.content).toBe('')
    expect(day1.nestedSubsections).toHaveLength(2)
    expect(day1.nestedSubsections![0].title).toBe('Family')
    expect(day1.nestedSubsections![0].scriptureReferences).toEqual([
      { reference: 'Genesis 1', favorite: false },
      { reference: 'Matthew 1', favorite: false },
    ])
    expect(day1.nestedSubsections![1].title).toBe('Secret')
    expect(day1.nestedSubsections![1].scriptureReferences).toEqual([
      { reference: 'Ezra 1', favorite: false },
      { reference: 'Acts 1', favorite: false },
    ])
  })

  it('parseMcheynePlanFile returns slug and passage keys', () => {
    const parsed = parseMcheynePlanFile(plan)
    expect(parsed.slug).toBe(MCHEYNE_SLUG)
    expect(parsed.passageKeys).toEqual(
      expect.arrayContaining(['GEN.1', 'MAT.1', 'EZR.1', 'ACT.1'])
    )
  })

  it('formats month names', () => {
    expect(monthNameForPlan(1)).toBe('January')
    expect(monthNameForPlan(12)).toBe('December')
  })
})

describe('full Mcheyne plan.json', () => {
  it('has 365 days with four readings each', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const full = require('../../../../data/mcheyne/plan.json') as McheynePlanFile
    expect(full.days).toHaveLength(365)
    for (const day of full.days) {
      expect(day.family).toHaveLength(2)
      expect(day.secret).toHaveLength(2)
    }
    const parsed = parseMcheynePlanFile(full)
    expect(parsed.gospelData).toHaveLength(12)
    expect(parsed.gospelData.reduce((n, s) => n + s.subsections.length, 0)).toBe(366)
    expect(parsed.passageKeys.length).toBeGreaterThan(1300)
  })
})
