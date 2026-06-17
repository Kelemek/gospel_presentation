import { splitBibleSearchSnippetByQuery } from '@/lib/bibleSearchSnippetHighlight'

describe('splitBibleSearchSnippetByQuery', () => {
  it('marks case-insensitive matches', () => {
    expect(
      splitBibleSearchSnippetByQuery('For by grace you have been saved', 'grace')
    ).toEqual([
      { text: 'For by ', match: false },
      { text: 'grace', match: true },
      { text: ' you have been saved', match: false },
    ])
  })

  it('highlights multi-word phrases', () => {
    expect(splitBibleSearchSnippetByQuery('The grace of God', 'grace of')).toEqual([
      { text: 'The ', match: false },
      { text: 'grace of', match: true },
      { text: ' God', match: false },
    ])
  })

  it('escapes regex metacharacters in the query', () => {
    expect(splitBibleSearchSnippetByQuery('God (love)', '(love)')).toEqual([
      { text: 'God ', match: false },
      { text: '(love)', match: true },
    ])
  })

  it('returns the full text when query is empty', () => {
    expect(splitBibleSearchSnippetByQuery('Hello world', '   ')).toEqual([
      { text: 'Hello world', match: false },
    ])
  })
})
