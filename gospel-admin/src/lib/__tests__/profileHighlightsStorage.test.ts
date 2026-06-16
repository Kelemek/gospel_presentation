import { gospelStorageSetSync } from '@/lib/gospelClientStorage'
import { resetGospelStorageTestState, installTestLocalStorage } from '@/lib/testing/testLocalStorage'
import {
  PROFILE_HIGHLIGHTS_STORAGE_KEY,
  addHighlight,
  getScriptureHighlightForReference,
  highlightsForSlug,
  loadHighlights,
  loadScriptureHighlights,
  removeHighlight,
  scriptureHighlightsForChapter,
  toggleScriptureHighlight,
} from '../profileHighlightsStorage'

describe('profileHighlightsStorage', () => {
  beforeEach(async () => {
    await resetGospelStorageTestState()
    installTestLocalStorage()
  })

  it('adds and loads resource highlights', () => {
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
    expect(highlightsForSlug('abc')).toHaveLength(1)
    expect(highlightsForSlug('abc')[0]!.scopeId).toBe('section-1-0-content')
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

  it('migrates v1 resource highlights', () => {
    gospelStorageSetSync(
      PROFILE_HIGHLIGHTS_STORAGE_KEY,
      JSON.stringify({
        v: 1,
        highlights: [
          {
            id: 'h1',
            slug: 'abc',
            resourceTitle: 'R',
            anchorId: 'a',
            locationLabel: 'L',
            scopeId: 's',
            quote: 'q',
            startOffset: 0,
            endOffset: 1,
            createdAt: 1,
          },
        ],
      })
    )
    expect(loadHighlights()).toHaveLength(1)
  })

  it('upserts scripture highlight by normalized reference', () => {
    const first = toggleScriptureHighlight({
      reference: 'John 3:16',
      quote: 'For God so loved',
      colorId: 'red',
    })
    expect(first).not.toBeNull()
    expect(first!.colorId).toBe('red')
    expect(loadScriptureHighlights()).toHaveLength(1)

    const second = toggleScriptureHighlight({
      reference: 'John 3:16',
      quote: 'For God so loved the world',
      colorId: 'blue',
    })
    expect(second!.colorId).toBe('blue')
    expect(loadScriptureHighlights()).toHaveLength(1)
    expect(getScriptureHighlightForReference('John 3:16')?.colorId).toBe('blue')
  })

  it('toggleScriptureHighlight removes when same color picked again', () => {
    toggleScriptureHighlight({
      reference: 'Romans 8:28',
      quote: 'And we know',
      colorId: 'green',
    })
    const removed = toggleScriptureHighlight({
      reference: 'Romans 8:28',
      quote: 'And we know',
      colorId: 'green',
    })
    expect(removed).toBeNull()
    expect(loadScriptureHighlights()).toHaveLength(0)
  })

  it('persists yellow scripture highlight', () => {
    const saved = toggleScriptureHighlight({
      reference: 'Psalm 23:1',
      quote: 'The Lord is my shepherd',
      colorId: 'yellow',
    })
    expect(saved?.colorId).toBe('yellow')
    expect(getScriptureHighlightForReference('Psalm 23:1')?.colorId).toBe('yellow')
  })

  it('scriptureHighlightsForChapter matches Psalm and Psalms spellings', () => {
    toggleScriptureHighlight({
      reference: 'Psalm 24:2',
      quote: 'verse two',
      colorId: 'red',
    })
    toggleScriptureHighlight({
      reference: 'Psalms 24:3',
      quote: 'verse three',
      colorId: 'blue',
    })
    expect(scriptureHighlightsForChapter('Psalm', 24)).toHaveLength(2)
    expect(scriptureHighlightsForChapter('Psalms', 24)).toHaveLength(2)
  })
})
