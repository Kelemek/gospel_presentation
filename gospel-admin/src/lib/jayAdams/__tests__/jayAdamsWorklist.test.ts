import {
  expandCommaSeparatedVerseTails,
  parseJayAdamsWorklistLine,
  parseJayAdamsWorklistLines,
  preprocessJayAdamsWorklistLine,
} from '@/lib/jayAdams/parseJayAdamsWorklistLines'
import { routeJayAdamsTopic, profileSectionTitleForJayAdamsTopic } from '@/lib/jayAdams/jayAdamsTopicToSection'
import { loadJayAdamsScriptureRefsBySection } from '@/lib/jayAdams/loadJayAdamsWorklist'
import { applyJayAdamsWorklistToGospelData } from '@/lib/jayAdams/applyJayAdamsWorklist'
import { mergeScriptureReferenceLists } from '@/lib/acbc/acbcScriptureIndexSync'
import type { GospelSection } from '@/lib/types'

describe('parseJayAdamsWorklistLines', () => {
  it('expands comma-separated verses in one chapter', () => {
    expect(parseJayAdamsWorklistLine('Eph 4:25, 29, 31').references).toEqual([
      'Ephesians 4:25',
      'Ephesians 4:29',
      'Ephesians 4:31',
    ])
  })

  it('continues semicolon segments with chapter:verse on the same book', () => {
    expect(parseJayAdamsWorklistLine('Pr 5:1, 2, 13; 13:18; 15:31; 18:13').references).toEqual([
      'Proverbs 5:1',
      'Proverbs 5:2',
      'Proverbs 5:13',
      'Proverbs 13:18',
      'Proverbs 15:31',
      'Proverbs 18:13',
    ])
  })

  it('expands chapter ranges for numbered books', () => {
    expect(preprocessJayAdamsWorklistLine('1Co 12-14')).toEqual([
      '1 Cor 12',
      '1 Cor 13',
      '1 Cor 14',
    ])
  })

  it('expands comma chapter lists', () => {
    expect(preprocessJayAdamsWorklistLine('Rev 2, 3')).toEqual(['Rev 2', 'Rev 3'])
    expect(preprocessJayAdamsWorklistLine('Ps 32, 38, 51')).toEqual(['Psalm 32', 'Psalm 38', 'Psalm 51'])
  })

  it('handles whole-book lines', () => {
    expect(parseJayAdamsWorklistLine('Hosea, book of').references[0]).toMatch(/^Hosea 1/)
  })

  it('strips ff suffix', () => {
    expect(parseJayAdamsWorklistLine('Mt 7:1ff.').references).toEqual(['Matthew 7:1'])
  })

  it('splits mixed verse ranges and verses in one chapter', () => {
    expect(expandCommaSeparatedVerseTails('Genesis 19:4-9, 24, 25')).toEqual([
      'Genesis 19:4-9',
      'Genesis 19:24',
      'Genesis 19:25',
    ])
  })

  it('dedupes identical references within a batch', () => {
    const result = parseJayAdamsWorklistLines(['Rm 12:1', 'Rm 12:1'])
    expect(result.references).toEqual(['Romans 12:1'])
  })
})

describe('jayAdamsTopicToSection', () => {
  it('maps cross-reference topics to skip', () => {
    expect(routeJayAdamsTopic('Anxiety').kind).toBe('skip')
    expect(routeJayAdamsTopic('Alcoholism').kind).toBe('skip')
  })

  it('maps existing and new topics', () => {
    expect(profileSectionTitleForJayAdamsTopic('Anger')).toBe('Anger')
    expect(profileSectionTitleForJayAdamsTopic('Worry')).toBe('Anxiety and Worry')
    expect(profileSectionTitleForJayAdamsTopic('Commandment')).toBe('Commandments')
    expect(profileSectionTitleForJayAdamsTopic('Blame Shifting')).toBe('Blame shifting')
  })

  it('splits Family lines between Marriage and Parenting', () => {
    const route = routeJayAdamsTopic('Family', ['Gen 2:18, 24', 'Ex 20:12'])
    expect(route.kind).toBe('split')
    if (route.kind !== 'split') return
    expect(route.routes[0].sectionTitle).toBe('Marriage')
    expect(route.routes[1].sectionTitle).toBe('Parenting')
  })
})

describe('loadJayAdamsScriptureRefsBySection', () => {
  it('loads worklist without unresolved lines', () => {
    const { bySection, unresolved } = loadJayAdamsScriptureRefsBySection()
    expect(unresolved).toEqual([])
    expect(bySection.size).toBeGreaterThan(50)
    expect(bySection.get('anger')?.some((r) => r.reference.startsWith('James 1:'))).toBe(true)
  })
})

describe('applyJayAdamsWorklistToGospelData', () => {
  it('adds new sections and merges without duplicate refs', () => {
    const gospelData: GospelSection[] = [
      {
        section: '1',
        title: 'Anger',
        subsections: [
          {
            title: '',
            content: '',
            scriptureReferences: [{ reference: 'James 1:19', favorite: false }],
          },
        ],
      },
    ]

    const summary = applyJayAdamsWorklistToGospelData(gospelData)
    expect(summary.unresolved).toEqual([])
    expect(summary.sectionsCreated).toContain('Assurance')
    const anger = gospelData.find((s) => s.title === 'Anger')
    const refs = anger?.subsections[0]?.scriptureReferences?.map((r) => r.reference) ?? []
    expect(refs.filter((r) => r === 'James 1:19')).toHaveLength(1)
    expect(refs.length).toBeGreaterThan(1)

    const mergedAgain = applyJayAdamsWorklistToGospelData(gospelData)
    expect(Object.values(mergedAgain.refsAddedBySection).every((n) => n === 0)).toBe(true)
  })

  it('uses mergeScriptureReferenceLists semantics for duplicates', () => {
    const existing = [{ reference: 'Proverbs 14:29', favorite: true }]
    const incoming = [{ reference: 'Proverbs 14:29', favorite: false }]
    const merged = mergeScriptureReferenceLists(existing, incoming)
    expect(merged).toEqual([{ reference: 'Proverbs 14:29', favorite: true }])
  })
})
