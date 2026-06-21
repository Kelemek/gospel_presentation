import { findFirstScriptureCardAnchors } from '@/lib/findFirstScriptureCardAnchors'
import { indexOfScriptureCardInList } from '@/lib/scriptureModalOpenMode'
import type { GospelSection } from '@/lib/types'

/** Mirrors ProfileContent.syncNavIndexForReference index resolution (Listen playlist nav sync). */
function navIndexForReference(
  reference: string,
  allScriptureRefs: { reference: string; sectionId: string; subsectionId: string }[],
  sections: GospelSection[]
): number {
  const found = findFirstScriptureCardAnchors(sections, reference)
  return indexOfScriptureCardInList(
    reference,
    allScriptureRefs,
    found ? { sectionId: found.sectionId, subsectionId: found.subsectionId } : undefined
  )
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
    expect(navIndexForReference('Matthew 1:1-17', enDashRefs, mchyDaySections)).toBe(1)
  })
})
