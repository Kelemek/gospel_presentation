import type { GospelSection } from '@/lib/types'
import {
  buildOrderedTocAnchorIds,
  getCurrentTocAnchorId,
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

  it('getCurrentTocAnchorId uses binary search on many anchors', () => {
    const manySubsections: GospelSection[] = [
      {
        section: '1',
        title: 'Book',
        subsections: Array.from({ length: 40 }, (_, i) => ({
          title: `Sub ${i}`,
          content: 'x',
          nestedSubsections: [],
        })),
      },
    ]
    document.body.innerHTML = ''
    const tops: number[] = []
    manySubsections[0]!.subsections.forEach((_, index) => {
      const el = document.createElement('div')
      el.id = `section-1-${index}`
      const top = 100 + index * 80
      tops.push(top)
      document.body.appendChild(el)
      jest.spyOn(el, 'getBoundingClientRect').mockReturnValue({
        top,
        left: 0,
        right: 0,
        bottom: top + 40,
        width: 0,
        height: 40,
        x: 0,
        y: top,
        toJSON: () => ({}),
      })
    })

    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true })
    jest.spyOn(document, 'querySelector').mockImplementation((selector) => {
      if (selector === '[data-profile-sticky-header]') return null
      return null
    })

    const threshold = 80 + 24
    let expectIndex = 0
    for (let i = 0; i < tops.length; i += 1) {
      if (tops[i]! <= threshold) expectIndex = i
    }
    expect(getCurrentTocAnchorId(manySubsections)).toBe(`section-1-${expectIndex}`)

    document.body.innerHTML = ''
    jest.restoreAllMocks()
  })
})
