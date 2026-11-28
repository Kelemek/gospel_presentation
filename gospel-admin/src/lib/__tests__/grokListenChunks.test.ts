import {
  GROK_LISTEN_CHUNK_MAX_CHARS,
  GROK_LISTEN_CHUNK_MIN_CHARS,
  splitListenRawIntoGrokChunksWithOffsets,
} from '@/lib/grokListenChunks'

function sentence(words: number): string {
  return `${Array.from({ length: words }, () => 'word').join(' ')}.`
}

describe('splitListenRawIntoGrokChunksWithOffsets', () => {
  it('keeps a short passage as one chunk', () => {
    const chunks = splitListenRawIntoGrokChunksWithOffsets('Grace alone.')
    expect(chunks).toEqual([{ text: 'Grace alone.', plainStart: 0, pauseBefore: false }])
  })

  it('packs sentences into chunks of about 800 to 1200 characters', () => {
    const raw = Array.from({ length: 40 }, () => sentence(12)).join(' ')
    const chunks = splitListenRawIntoGrokChunksWithOffsets(raw)
    expect(chunks.length).toBeGreaterThan(1)
    for (const chunk of chunks.slice(0, -1)) {
      expect(chunk.text.length).toBeGreaterThanOrEqual(GROK_LISTEN_CHUNK_MIN_CHARS)
      expect(chunk.text.length).toBeLessThanOrEqual(GROK_LISTEN_CHUNK_MAX_CHARS)
    }
    expect(chunks[chunks.length - 1]!.text.length).toBeLessThanOrEqual(GROK_LISTEN_CHUNK_MAX_CHARS)
    expect(chunks[0]!.plainStart).toBe(0)
    expect(chunks[1]!.plainStart).toBeGreaterThan(chunks[0]!.plainStart)
  })

  it('splits one long sentence so no piece exceeds 1200 characters', () => {
    const raw = Array.from({ length: 400 }, () => 'word').join(' ')
    const chunks = splitListenRawIntoGrokChunksWithOffsets(raw)
    expect(chunks.length).toBeGreaterThan(1)
    expect(chunks.every((chunk) => chunk.text.length <= GROK_LISTEN_CHUNK_MAX_CHARS)).toBe(true)
  })

  it('packs multiple newline-separated blocks into one Grok chunk when short', () => {
    const chunks = splitListenRawIntoGrokChunksWithOffsets('First block here.\nSecond block here.')
    expect(chunks).toHaveLength(1)
    expect(chunks[0]).toMatchObject({
      text: 'First block here. Second block here.',
      plainStart: 0,
      pauseBefore: false,
    })
  })

  it('packs many short lines into one chunk instead of one fetch per line', () => {
    const raw = Array.from({ length: 8 }, (_, i) => `Short line number ${i + 1} about grace.`).join('\n')
    const chunks = splitListenRawIntoGrokChunksWithOffsets(raw)
    expect(chunks).toHaveLength(1)
    expect(chunks[0]!.text.length).toBeLessThanOrEqual(GROK_LISTEN_CHUNK_MAX_CHARS)
  })
})
