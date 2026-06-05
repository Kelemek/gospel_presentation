import { sortGospelSectionsAlphabetically } from '@/lib/gospelDataSections'
import type { GospelSection } from '@/lib/types'

describe('sortGospelSectionsAlphabetically', () => {
  it('sorts by title case-insensitively and renumbers', () => {
    const data: GospelSection[] = [
      { section: '9', title: 'Marriage', subsections: [{ title: '', content: '' }] },
      { section: '1', title: 'anger', subsections: [{ title: '', content: '' }] },
      { section: '5', title: 'Depression', subsections: [{ title: '', content: '' }] },
    ]
    sortGospelSectionsAlphabetically(data)
    expect(data.map((s) => s.title)).toEqual(['anger', 'Depression', 'Marriage'])
    expect(data.map((s) => s.section)).toEqual(['1', '2', '3'])
  })
})
