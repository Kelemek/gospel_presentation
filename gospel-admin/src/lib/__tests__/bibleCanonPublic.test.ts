import { BIBLE_BOOKS_PUBLIC } from '@/lib/bibleCanonPublic'

describe('bibleCanonPublic', () => {
  it('exports 66 Protestant books with derived chapter rows', () => {
    expect(BIBLE_BOOKS_PUBLIC).toHaveLength(66)
  })

  it('maps Genesis with OT testament and GEN-1 chapter id', () => {
    const genesis = BIBLE_BOOKS_PUBLIC.find((b) => b.id === 'GEN')
    expect(genesis).toBeDefined()
    expect(genesis?.name).toBe('Genesis')
    expect(genesis?.nameLong).toContain('Genesis')
    expect(genesis?.testament).toBe('ot')
    expect(genesis?.chapters[0]).toEqual({
      id: 'GEN-1',
      number: '1',
      verseCount: 31,
    })
    expect(genesis?.chapters).toHaveLength(50)
  })

  it('maps Matthew as NT with expected first chapter', () => {
    const matthew = BIBLE_BOOKS_PUBLIC.find((b) => b.id === 'MAT')
    expect(matthew?.testament).toBe('nt')
    expect(matthew?.chapters[0]?.id).toBe('MAT-1')
    expect(matthew?.chapters).toHaveLength(28)
  })

  it('uses stable synthetic chapter ids for every chapter', () => {
    for (const book of BIBLE_BOOKS_PUBLIC) {
      book.chapters.forEach((ch, i) => {
        expect(ch.id).toBe(`${book.id}-${i + 1}`)
        expect(ch.number).toBe(String(i + 1))
        expect(ch.verseCount).toBeGreaterThan(0)
      })
    }
  })
})
