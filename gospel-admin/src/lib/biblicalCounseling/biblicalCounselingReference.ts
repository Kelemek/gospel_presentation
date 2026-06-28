/** Biblical Counseling Scripture Reference profile (Resources → Biblical Counseling). */
export const BIBLICAL_COUNSELING_REFERENCE_SLUG = '26b974ef'

/** Test fork with secular-term map applied; clone of production, not linked in Resources. */
export const BIBLICAL_COUNSELING_SECULAR_MAP_TEST_SLUG = 'bcsecmap'

/** Profiles that use secular-term map in-page search (production + test fork). */
export function isBiblicalCounselingSecularMapProfile(slug: string | null | undefined): boolean {
  const trimmed = slug?.trim()
  return (
    trimmed === BIBLICAL_COUNSELING_REFERENCE_SLUG ||
    trimmed === BIBLICAL_COUNSELING_SECULAR_MAP_TEST_SLUG
  )
}

/** DOM id for the pinned secular-term mapping section after sync (section field "1"). */
export const SECULAR_TERM_MAP_SECTION_DOM_ID = 'section-1'
