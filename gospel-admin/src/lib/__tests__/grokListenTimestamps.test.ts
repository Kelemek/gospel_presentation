import { buildBibleReferenceSpeakChunk } from '@/lib/bibleReferenceSpeechTransform'
import { shouldFallbackGrokListenToDevice } from '@/lib/grokListenFallback'
import {
  boundaryEventsFromGrokTimestamps,
  displayCharForGrokBoundary,
} from '@/lib/grokListenTimestamps'

describe('Grok timestamp alignment', () => {
  it('maps audio_timestamps through the bible-reference speech form onto the display colon', () => {
    const display = 'Read John 3:16 now.'
    const spoken = buildBibleReferenceSpeakChunk(display)
    expect(spoken.speakText).toContain('verse')
    const tracks = {
      graphChars: [...spoken.speakText],
      graphTimes: [...spoken.speakText].map((_, index) => [index * 0.05, (index + 1) * 0.05]),
    }
    const events = boundaryEventsFromGrokTimestamps(spoken.speakText, tracks)
    const verse = events.find(
      (event) => spoken.speakText.slice(event.charIndex, event.charIndex + event.charLength) === 'verse'
    )
    expect(verse).toBeDefined()
    const displayIndex = displayCharForGrokBoundary(
      verse!,
      spoken.speakCharToDisplayCharIndex,
      display.length
    )
    expect(display[displayIndex]).toBe(':')
    expect(verse!.startSec).toBeCloseTo(spoken.speakText.indexOf('verse') * 0.05)
  })
})

describe('shouldFallbackGrokListenToDevice', () => {
  it('falls back on offline, network, 429, and server errors when device speech exists', () => {
    expect(shouldFallbackGrokListenToDevice('offline', true)).toBe(true)
    expect(shouldFallbackGrokListenToDevice('network', true)).toBe(true)
    expect(shouldFallbackGrokListenToDevice(429, true)).toBe(true)
    expect(shouldFallbackGrokListenToDevice(502, true)).toBe(true)
    expect(shouldFallbackGrokListenToDevice(403, true)).toBe(true)
  })

  it('does not fall back when this device cannot speak', () => {
    expect(shouldFallbackGrokListenToDevice('offline', false)).toBe(false)
    expect(shouldFallbackGrokListenToDevice(502, false)).toBe(false)
  })
})
