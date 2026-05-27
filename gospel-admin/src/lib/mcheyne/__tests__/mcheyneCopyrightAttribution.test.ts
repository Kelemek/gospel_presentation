import {
  MCHEYNE_COPYRIGHT_ANCHOR_ID,
  MCHEYNE_COPYRIGHT_PAGE_HREF,
  MCHEYNE_READING_PLAN_ATTRIBUTION,
  MCHEYNE_SCHEDULE_SOURCE_HREF,
} from '@/lib/mcheyne/mcheyneCopyrightAttribution'

describe('mcheyneCopyrightAttribution', () => {
  it('defines stable copyright page anchor and href', () => {
    expect(MCHEYNE_COPYRIGHT_ANCHOR_ID).toBe('mcheyne-reading-plan')
    expect(MCHEYNE_COPYRIGHT_PAGE_HREF).toBe('/copyright#mcheyne-reading-plan')
  })

  it('points schedule source at mcheyne-api plan.json', () => {
    expect(MCHEYNE_SCHEDULE_SOURCE_HREF).toContain('speric/mcheyne-api')
    expect(MCHEYNE_SCHEDULE_SOURCE_HREF).toContain('plan.json')
  })

  it('names M\'Cheyne in attribution title', () => {
    expect(MCHEYNE_READING_PLAN_ATTRIBUTION.title).toMatch(/M'Cheyne/)
    expect(MCHEYNE_READING_PLAN_ATTRIBUTION.scheduleSourceLabel).toBe('mcheyne-api')
  })
})
