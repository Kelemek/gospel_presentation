import { gospelStorageSetSync } from '@/lib/gospelClientStorage'
import { resetGospelStorageTestState, installTestLocalStorage } from '@/lib/testing/testLocalStorage'
import {
  PROFILE_HIGHLIGHTS_STORAGE_KEY,
  addHighlight,
  highlightsForSlug,
  loadHighlights,
  removeHighlight,
} from '../profileHighlightsStorage'

describe('profileHighlightsStorage', () => {
  beforeEach(async () => {
    await resetGospelStorageTestState()
    installTestLocalStorage()
  })

  it('adds and loads highlights', () => {
    expect(loadHighlights()).toEqual([])
    const added = addHighlight({
      slug: 'abc',
      resourceTitle: 'Resource',
      anchorId: 'section-1-0',
      locationLabel: 'Section 1 > Subsection 1',
      scopeId: 'section-1-0-content',
      quote: 'sample quote',
      startOffset: 3,
      endOffset: 15,
    })
    expect(added).not.toBeNull()
    const list = loadHighlights()
    expect(list).toHaveLength(1)
    expect(list[0].slug).toBe('abc')
    expect(list[0].scopeId).toBe('section-1-0-content')
  })

  it('filters by slug', () => {
    addHighlight({
      slug: 'a',
      resourceTitle: 'A',
      anchorId: 'section-1-0',
      locationLabel: 'A',
      scopeId: 'section-1-0-content',
      quote: 'A',
      startOffset: 0,
      endOffset: 1,
    })
    addHighlight({
      slug: 'b',
      resourceTitle: 'B',
      anchorId: 'section-1-0',
      locationLabel: 'B',
      scopeId: 'section-1-0-content',
      quote: 'B',
      startOffset: 0,
      endOffset: 1,
    })
    expect(highlightsForSlug('a')).toHaveLength(1)
    expect(highlightsForSlug('b')).toHaveLength(1)
  })

  it('rejects duplicate scope+range in same slug', () => {
    addHighlight({
      slug: 'abc',
      resourceTitle: 'Resource',
      anchorId: 'section-1-0',
      locationLabel: 'Loc',
      scopeId: 'section-1-0-content',
      quote: 'first',
      startOffset: 10,
      endOffset: 22,
    })
    const added = addHighlight({
      slug: 'abc',
      resourceTitle: 'Resource',
      anchorId: 'section-1-0',
      locationLabel: 'Loc',
      scopeId: 'section-1-0-content',
      quote: 'second',
      startOffset: 10,
      endOffset: 22,
    })
    expect(added).toBeNull()
    expect(loadHighlights()).toHaveLength(1)
  })

  it('removeHighlight removes by id', () => {
    const added = addHighlight({
      slug: 'abc',
      resourceTitle: 'Resource',
      anchorId: 'section-1-0',
      locationLabel: 'Loc',
      scopeId: 'section-1-0-content',
      quote: 'quote',
      startOffset: 1,
      endOffset: 5,
    })
    expect(added).not.toBeNull()
    removeHighlight(added!.id)
    expect(loadHighlights()).toEqual([])
  })

  it('returns empty on corrupt JSON', () => {
    gospelStorageSetSync(PROFILE_HIGHLIGHTS_STORAGE_KEY, 'not-json')
    expect(loadHighlights()).toEqual([])
  })
})

