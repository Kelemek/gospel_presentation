import {
  ACBC_EXCLUDED_SECTION_TITLES,
  findAcbcSlugsForSectionTitle,
  isAcbcExcludedSectionTitle,
  removeExcludedAcbcSections,
} from '@/lib/acbc/acbcTopicCatalog'
import type { GospelSection } from '@/lib/types'

describe('acbcTopicCatalog exclusions', () => {
  it('lists the four admin-omitted section titles', () => {
    expect(ACBC_EXCLUDED_SECTION_TITLES).toEqual([
      'Laziness',
      'Legal issues in counseling',
      'How to begin a counseling center',
      'Counseling practice',
    ])
  })

  it('isAcbcExcludedSectionTitle is case-insensitive', () => {
    expect(isAcbcExcludedSectionTitle('laziness')).toBe(true)
    expect(isAcbcExcludedSectionTitle('Counseling Practice')).toBe(true)
    expect(isAcbcExcludedSectionTitle('Anger')).toBe(false)
  })

  it('findAcbcSlugsForSectionTitle returns null for excluded titles', () => {
    for (const title of ACBC_EXCLUDED_SECTION_TITLES) {
      expect(findAcbcSlugsForSectionTitle(title)).toBeNull()
    }
    expect(findAcbcSlugsForSectionTitle('Anger')).toEqual(['anger'])
  })

  it('removeExcludedAcbcSections drops matching sections and renumbers', () => {
    const data: GospelSection[] = [
      { section: '1', title: 'Anger', subsections: [{ title: '', content: '' }] },
      { section: '2', title: 'Laziness', subsections: [{ title: '', content: '' }] },
      { section: '3', title: 'Church', subsections: [{ title: '', content: '' }] },
      { section: '4', title: 'Counseling practice', subsections: [{ title: '', content: '' }] },
    ]
    const removed = removeExcludedAcbcSections(data)
    expect(removed).toEqual(['Laziness', 'Counseling practice'])
    expect(data.map((s) => s.title)).toEqual(['Anger', 'Church'])
    expect(data.map((s) => s.section)).toEqual(['1', '2'])
  })
})
