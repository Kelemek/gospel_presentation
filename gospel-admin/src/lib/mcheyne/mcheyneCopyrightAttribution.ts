/** Anchor on `/copyright` for the M'Cheyne reading plan attribution block. */
export const MCHEYNE_COPYRIGHT_ANCHOR_ID = 'mcheyne-reading-plan'

export const MCHEYNE_COPYRIGHT_PAGE_HREF = `/copyright#${MCHEYNE_COPYRIGHT_ANCHOR_ID}`

/** Open JSON schedule used to build `data/mcheyne/plan.json` (see `generate-mcheyne-plan-json.ts`). */
export const MCHEYNE_SCHEDULE_SOURCE_HREF =
  'https://github.com/speric/mcheyne-api/blob/master/plan.json'

export const MCHEYNE_READING_PLAN_ATTRIBUTION = {
  title: "Robert Murray M'Cheyne, Bible Reading Plan",
  body:
    "The one-year schedule attributed to Rev. Robert Murray M'Cheyne (1813–1843) is a historic Bible reading plan. This resource lists daily scripture references only (Family and Secret readings)—not a modern book or commentary. The calendar-dated reference list in this app was compiled from the open",
  scheduleSourceLabel: 'mcheyne-api',
  scheduleSourceHref: MCHEYNE_SCHEDULE_SOURCE_HREF,
  closing:
    'Bible text shown when you open a reading uses the translation attributions on this page.',
} as const
