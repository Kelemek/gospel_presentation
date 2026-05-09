import {
  chunkIndexContainingPlainOffset,
  splitListenRawIntoTtsChunksWithOffsets,
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

describe('splitListenRawIntoTtsChunksWithOffsets', () => {
  it('marks pauseBefore on first chunk of each segment after the first', () => {
    const raw = 'First line.\nSecond line.'
    const meta = splitListenRawIntoTtsChunksWithOffsets(raw)
    expect(meta.map((m) => m.pauseBefore)).toEqual([false, true])
    expect(meta[0]!.plainStart).toBe(0)
    expect(meta[1]!.plainStart).toBe(12)
  })

  it('plainStart spans joined segments like a single space between blocks', () => {
    const raw = 'hello\nworld'
    const meta = splitListenRawIntoTtsChunksWithOffsets(raw)
    expect(meta.map((m) => m.text)).toEqual(['hello', 'world'])
    expect(meta[0]!.plainStart).toBe(0)
    expect(meta[1]!.plainStart).toBe(6)
    expect(meta[1]!.pauseBefore).toBe(true)
  })
})

describe('chunkIndexContainingPlainOffset', () => {
  it('returns the chunk that contains the plain offset', () => {
    const meta = splitTextForTtsChunksWithOffsets('Hello world. Second line!')
    expect(chunkIndexContainingPlainOffset(meta, 0)).toBe(0)
    expect(chunkIndexContainingPlainOffset(meta, 12)).toBe(0)
    expect(chunkIndexContainingPlainOffset(meta, 13)).toBe(1)
    expect(chunkIndexContainingPlainOffset(meta, 999)).toBe(1)
  })
})
