import type { GospelSection } from '@/lib/types'
import {
  buildOrderedTocAnchorIds,
  getLocationLabel,
} from '../tocAnchorFromScroll'

const sampleSections: GospelSection[] = [
  {
    section: '1',
    title: 'First',
    subsections: [
      {
        title: 'Sub A',
        content: 'c',
        nestedSubsections: [{ title: 'Nested', content: 'n' }],
      },
      {
        title: '',
        content: 'only nested',
        nestedSubsections: [{ title: 'N2', content: 'x' }],
      },
    ],
  },
  {
    section: '2',
    title: 'Second',
    subsections: [{ title: 'Alone', content: 'z' }],
  },
]

describe('tocAnchorFromScroll', () => {
  it('buildOrderedTocAnchorIds matches TOC order', () => {
    const ids = buildOrderedTocAnchorIds(sampleSections)
    expect(ids).toEqual([
      'section-1',
      'section-1-0',
      'section-1-0-0',
      'section-1-1-0',
      'section-2',
      'section-2-0',
    ])
  })

  it('getLocationLabel for section only', () => {
    expect(getLocationLabel(sampleSections, 'section-2')).toBe('Second')
  })

  it('getLocationLabel for subsection', () => {
    expect(getLocationLabel(sampleSections, 'section-2-0')).toBe('Second / Alone')
  })

  it('getLocationLabel for nested', () => {
    expect(getLocationLabel(sampleSections, 'section-1-0-0')).toBe(
      'First / Sub A / Nested'
    )
  })
})
