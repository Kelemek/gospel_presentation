import {
  renumberGospelSections,
  sortGospelSectionsAlphabetically,
  sortGospelSectionsWithPinnedFirst,
} from '@/lib/gospelDataSections'
import type { GospelSection } from '@/lib/types'

describe('gospelDataSections', () => {
  it('sortGospelSectionsWithPinnedFirst keeps pinned titles first then alpha', () => {
    const gospelData: GospelSection[] = [
      { section: '1', title: 'Zebra', subsections: [] },
      { section: '2', title: 'Find your topic (secular terms)', subsections: [] },
      { section: '3', title: 'Anger', subsections: [] },
      { section: '4', title: 'Beta', subsections: [] },
    ]
    sortGospelSectionsWithPinnedFirst(gospelData, ['Find your topic (secular terms)'])
    expect(gospelData.map((s) => s.title)).toEqual([
      'Find your topic (secular terms)',
      'Anger',
      'Beta',
      'Zebra',
    ])
    expect(gospelData.map((s) => s.section)).toEqual(['1', '2', '3', '4'])
  })

  it('renumberGospelSections updates section fields in order', () => {
    const gospelData: GospelSection[] = [
      { section: '9', title: 'A', subsections: [] },
      { section: '2', title: 'B', subsections: [] },
    ]
    renumberGospelSections(gospelData)
    expect(gospelData.map((s) => s.section)).toEqual(['1', '2'])
  })

  it('sortGospelSectionsAlphabetically sorts and renumbers', () => {
    const gospelData: GospelSection[] = [
      { section: '1', title: 'Zebra', subsections: [] },
      { section: '2', title: 'Alpha', subsections: [] },
    ]
    sortGospelSectionsAlphabetically(gospelData)
    expect(gospelData.map((s) => s.title)).toEqual(['Alpha', 'Zebra'])
    expect(gospelData.map((s) => s.section)).toEqual(['1', '2'])
  })
})
