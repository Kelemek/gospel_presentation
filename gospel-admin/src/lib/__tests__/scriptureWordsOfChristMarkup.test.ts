import {
  ensureVerseNumbersOutsideWordsOfChrist,
  prefixScriptureCacheText,
  scripturePassagePlainText,
  stripScriptureWordsOfChristMarkers,
  wrapScriptureWordsOfChrist,
  SCRIPTURE_WOC_END,
  SCRIPTURE_WOC_START,
} from '@/lib/scriptureWordsOfChristMarkup'

describe('scriptureWordsOfChristMarkup', () => {
  it('wraps and strips inline markers', () => {
    const marked = wrapScriptureWordsOfChrist('Hello')
    expect(marked).toBe(`${SCRIPTURE_WOC_START}Hello${SCRIPTURE_WOC_END}`)
    expect(stripScriptureWordsOfChristMarkers(marked)).toBe('Hello')
  })

  it('moves a leading verse marker outside words-of-Christ delimiters', () => {
    const marked = wrapScriptureWordsOfChrist('[1] Blessed are the poor.')
    expect(ensureVerseNumbersOutsideWordsOfChrist(marked)).toBe(
      `[1] ${SCRIPTURE_WOC_START}Blessed are the poor.${SCRIPTURE_WOC_END}`
    )
  })

  it('strips cache version line for plain consumers', () => {
    const cached = prefixScriptureCacheText(
      `[16] ${SCRIPTURE_WOC_START}For God${SCRIPTURE_WOC_END}`
    )
    expect(scripturePassagePlainText(cached)).toBe('[16] For God')
  })
})
