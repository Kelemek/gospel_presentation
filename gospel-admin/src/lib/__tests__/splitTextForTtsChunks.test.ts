import {
  splitTextForTtsChunks,
  splitTextForTtsChunksWithOffsets,
} from '@/lib/splitTextForTtsChunks'

describe('splitTextForTtsChunks', () => {
  it('splits on sentence boundaries', () => {
    expect(splitTextForTtsChunks('Hello world. Second line! Third?')).toEqual([
      'Hello world.',
      'Second line!',
      'Third?',
    ])
  })

  it('returns a single chunk for short unpunctuated text', () => {
    expect(splitTextForTtsChunks('One continuous phrase')).toEqual(['One continuous phrase'])
  })

  it('trims and drops empties', () => {
    expect(splitTextForTtsChunks('  A.  B.  ')).toEqual(['A.', 'B.'])
  })
})

describe('splitTextForTtsChunksWithOffsets', () => {
  it('records plainStart aligned with trimmed text', () => {
    const meta = splitTextForTtsChunksWithOffsets('Hello world. Second line!')
    expect(meta.map((m) => m.text)).toEqual(['Hello world.', 'Second line!'])
    expect(meta[0]!.plainStart).toBe(0)
    expect(meta[1]!.plainStart).toBe(13)
  })
})
