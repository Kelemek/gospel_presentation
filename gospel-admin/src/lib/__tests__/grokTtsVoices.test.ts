import {
  GROK_TTS_FALLBACK_VOICES,
  genderForGrokVoiceId,
  groupGrokVoices,
  parseGrokVoiceList,
} from '@/lib/grokTtsVoices'

describe('Grok voice gender', () => {
  it('labels every fallback voice once, with nine female and nineteen male', () => {
    const grouped = groupGrokVoices(GROK_TTS_FALLBACK_VOICES)
    expect(GROK_TTS_FALLBACK_VOICES).toHaveLength(28)
    expect(grouped.female).toHaveLength(9)
    expect(grouped.male).toHaveLength(19)
    expect(grouped.other).toHaveLength(0)
    expect(grouped.female.map((voice) => voice.voiceId)).toEqual(
      expect.arrayContaining(['ara', 'eve', 'luna', 'ursa'])
    )
    expect(grouped.male.map((voice) => voice.voiceId)).toEqual(
      expect.arrayContaining(['leo', 'rex', 'sal', 'atlas'])
    )
  })

  it('uses a gender from the voice list when xAI sends one', () => {
    const voices = parseGrokVoiceList({
      voices: [{ voice_id: 'eve', name: 'Eve', gender: 'male' }],
    })
    expect(voices).toEqual([{ voiceId: 'eve', name: 'Eve', gender: 'male' }])
  })

  it('uses the static map when the voice list omits gender', () => {
    expect(genderForGrokVoiceId('Eve')).toBe('female')
    const voices = parseGrokVoiceList({
      voices: [{ voice_id: 'leo', name: 'Leo' }, { voice_id: 'custom1', name: 'Custom' }],
    })
    expect(voices).toEqual([
      { voiceId: 'leo', name: 'Leo', gender: 'male' },
      { voiceId: 'custom1', name: 'Custom', gender: null },
    ])
  })
})
