import { splitScriptureReferenceForHeader } from '../splitScriptureReferenceForHeader'

describe('splitScriptureReferenceForHeader', () => {
  it('splits book and chapter:verse', () => {
    expect(splitScriptureReferenceForHeader('Deuteronomy 4:35')).toEqual({
      book: 'Deuteronomy',
      referenceSuffix: '4:35',
    })
    expect(splitScriptureReferenceForHeader('John 3:16')).toEqual({
      book: 'John',
      referenceSuffix: '3:16',
    })
  })

  it('keeps numbered books with chapter:verse', () => {
    expect(splitScriptureReferenceForHeader('1 John 1:1')).toEqual({
      book: '1 John',
      referenceSuffix: '1:1',
    })
    expect(splitScriptureReferenceForHeader('2 Corinthians 1:3–4')).toEqual({
      book: '2 Corinthians',
      referenceSuffix: '1:3–4',
    })
  })

  it('handles multi-word books', () => {
    expect(splitScriptureReferenceForHeader('Song of Solomon 2:1')).toEqual({
      book: 'Song of Solomon',
      referenceSuffix: '2:1',
    })
  })

  it('handles verse ranges and comma lists in suffix', () => {
    expect(splitScriptureReferenceForHeader('Matthew 5:3-12')).toEqual({
      book: 'Matthew',
      referenceSuffix: '5:3-12',
    })
    expect(splitScriptureReferenceForHeader('Romans 3:1, 5')).toEqual({
      book: 'Romans',
      referenceSuffix: '3:1, 5',
    })
  })

  it('splits chapter-only references', () => {
    expect(splitScriptureReferenceForHeader('Psalm 23')).toEqual({
      book: 'Psalm',
      referenceSuffix: '23',
    })
  })

  it('returns whole string as book when pattern does not match', () => {
    expect(splitScriptureReferenceForHeader('Custom note')).toEqual({
      book: 'Custom note',
      referenceSuffix: '',
    })
    expect(splitScriptureReferenceForHeader('')).toEqual({
      book: '',
      referenceSuffix: '',
    })
  })
})
