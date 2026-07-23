import { findFirstScriptureCardAnchors } from '@/lib/findFirstScriptureCardAnchors'
import { indexOfScriptureCardInList } from '@/lib/scriptureModalOpenMode'
import type { GospelSection } from '@/lib/types'

/** Mirrors ProfileContent.syncNavIndexForReference index resolution (Listen playlist nav sync). */
function navIndexForReference(
  reference: string,
  allScriptureRefs: { reference: string; sectionId: string; subsectionId: string }[],
  sections: GospelSection[],
  explicit?: { sectionId: string; subsectionId: string },
  favoriteReferences: string[] = [],
  pinnedAnchors?: { reference: string; sectionId: string; subsectionId: string } | null
): number {
  let sectionId = explicit?.sectionId?.trim() ?? ''
  let subsectionId = explicit?.subsectionId?.trim() ?? ''
  if (!sectionId || !subsectionId) {
    if (pinnedAnchors && pinnedAnchors.reference === reference) {
      sectionId = pinnedAnchors.sectionId
      subsectionId = pinnedAnchors.subsectionId
    } else {
      const found = findFirstScriptureCardAnchors(sections, reference)
      if (found) {
        sectionId = found.sectionId
        subsectionId = found.subsectionId
      }
    }
  }
  const anchorLookup = sectionId && subsectionId ? { sectionId, subsectionId } : undefined
  const allIndex = indexOfScriptureCardInList(reference, allScriptureRefs, anchorLookup)
  if (allIndex === -1) return -1

  if (explicit?.sectionId && explicit?.subsectionId) {
    return allIndex
  }

  if (favoriteReferences.length > 0) {
    const favIndex = favoriteReferences.indexOf(reference)
    if (favIndex !== -1) return favIndex
    if (anchorLookup) return allIndex
    return -1
  }

  return allIndex
}

const mchyDaySections: GospelSection[] = [
  {
    section: 'jan',
    title: 'January',
    subsections: [
      { title: 'About', content: '', questions: [] },
      {
        title: 'Day 1',
        content: '',
        nestedSubsections: [
          {
            title: 'Family',
            content: '',
            scriptureReferences: [
              { reference: 'Genesis 1', favorite: false },
              { reference: 'Matthew 1', favorite: false },
            ],
            questions: [],
          },
          {
            title: 'Secret',
            content: '',
            scriptureReferences: [
              { reference: 'Ezra 2', favorite: false },
              { reference: 'Acts 2', favorite: false },
            ],
            questions: [],
          },
        ],
        questions: [],
      },
      {
        title: 'Day 2',
        content: '',
        nestedSubsections: [
          {
            title: 'Family',
            content: '',
            scriptureReferences: [{ reference: 'Genesis 2', favorite: false }],
            questions: [],
          },
        ],
        questions: [],
      },
    ],
  },
]

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

describe('syncScriptureNavIndexForReference (Listen playlist)', () => {
  const allRefs = buildAllScriptureRefs(mchyDaySections)

  it('maps the last day reading to index 3 so next nav is day 2', () => {
    expect(navIndexForReference('Acts 2', allRefs, mchyDaySections)).toBe(3)
    const nextIndex = (3 + 1) % allRefs.length
    expect(allRefs[nextIndex]?.reference).toBe('Genesis 2')
  })

  it('maps the first day reading to index 0', () => {
    expect(navIndexForReference('Genesis 1', allRefs, mchyDaySections)).toBe(0)
    expect(allRefs[1]?.reference).toBe('Matthew 1')
  })

  it('resolves index when card uses en-dash and lookup uses hyphen', () => {
    const enDashRefs = allRefs.map((r) =>
      r.reference === 'Matthew 1'
        ? { ...r, reference: 'Matthew 1:1–17' }
        : r
    )
    const found = findFirstScriptureCardAnchors(mchyDaySections, 'Matthew 1:1-17')
    expect(
      navIndexForReference(
        'Matthew 1:1-17',
        enDashRefs,
        mchyDaySections,
        found ? { sectionId: found.sectionId, subsectionId: found.subsectionId } : undefined
      )
    ).toBe(1)
  })

  it('prefers explicit anchors over favorites when the reference string matches a favorite', () => {
    const favorites = ['Matthew 1', 'Genesis 1']
    const day172Matthew = {
      reference: 'Matthew 1',
      sectionId: 'section-jun',
      subsectionId: 'section-jun-21-1',
    }
    const refsWithDay172 = [...allRefs, day172Matthew]
    expect(
      navIndexForReference('Matthew 1', refsWithDay172, mchyDaySections, {
        sectionId: day172Matthew.sectionId,
        subsectionId: day172Matthew.subsectionId,
      }, favorites)
    ).toBe(refsWithDay172.length - 1)
    expect(
      navIndexForReference('Matthew 1', refsWithDay172, mchyDaySections, undefined, favorites)
    ).toBe(0)
  })

  it('uses pinned modal anchors before the first profile match for duplicate references', () => {
    const day172Matthew = {
      reference: 'Matthew 1',
      sectionId: 'section-jun',
      subsectionId: 'section-jun-21-1',
    }
    const refsWithDay172 = [...allRefs, day172Matthew]
    expect(
      navIndexForReference(
        'Matthew 1',
        refsWithDay172,
        mchyDaySections,
        undefined,
        [],
        { reference: 'Matthew 1', sectionId: day172Matthew.sectionId, subsectionId: day172Matthew.subsectionId }
      )
    ).toBe(refsWithDay172.length - 1)
    expect(
      navIndexForReference('Matthew 1', refsWithDay172, mchyDaySections, undefined, [])
    ).toBe(1)
  })
})
