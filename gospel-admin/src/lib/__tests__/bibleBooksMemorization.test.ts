import {
  bibleBooksCountLabel,
  bibleBooksPlainText,
  bibleBooksReferenceLabel,
  bibleBooksTestamentsForScope,
  booksForScope,
} from '@/lib/bibleBooksMemorization'

describe('bibleBooksMemorization', () => {
  it('filters books by scope', () => {
    expect(booksForScope('all')).toHaveLength(66)
    expect(booksForScope('ot')).toHaveLength(39)
    expect(booksForScope('nt')).toHaveLength(27)
    expect(booksForScope('ot')[0]?.name).toBe('Genesis')
    expect(booksForScope('nt')[0]?.name).toBe('Matthew')
  })

  it('builds plain text and labels', () => {
    expect(bibleBooksPlainText('ot').startsWith('Genesis')).toBe(true)
    expect(bibleBooksReferenceLabel('all')).toBe('Bible Books')
    expect(bibleBooksReferenceLabel('ot')).toBe('Bible Books (OT)')
    expect(bibleBooksReferenceLabel('nt')).toBe('Bible Books (NT)')
    expect(bibleBooksCountLabel('nt')).toBe('27 books')
  })

  it('returns testament tabs per scope', () => {
    expect(bibleBooksTestamentsForScope('all')).toEqual(['ot', 'nt'])
    expect(bibleBooksTestamentsForScope('ot')).toEqual(['ot'])
    expect(bibleBooksTestamentsForScope('nt')).toEqual(['nt'])
  })
})
