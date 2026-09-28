import {
  esvPassageHtmlToScriptureText,
  normalizeEsvMisconvertedChapterVersePrefix,
} from '@/lib/esvPassageHtmlToText'
import {
  SCRIPTURE_WOC_END,
  SCRIPTURE_WOC_START,
} from '@/lib/scriptureWordsOfChristMarkup'

describe('esvPassageHtmlToScriptureText', () => {
  it('converts verse numbers and words-of-Christ spans', () => {
    const html = `<p id="p1"><b class="verse-num woc" id="v1">16\u00a0</b><span class="woc">For God so loved the world.</span></p>`
    const text = esvPassageHtmlToScriptureText(html)
    expect(text).toBe(
      `[16] ${SCRIPTURE_WOC_START}For God so loved the world.${SCRIPTURE_WOC_END}`
    )
  })

  it('marks only the spoken span when narration shares the verse (Mark 4:39 style)', () => {
    const html = `<p class="virtual"><b class="verse-num" id="v39">39\u00a0</b>He woke and rebuked the wind, <span class="woc">“Be quiet!”</span> and the sea.</p>`
    const text = esvPassageHtmlToScriptureText(html)
    expect(text).toContain('rebuked the wind, ')
    expect(text).toContain(`${SCRIPTURE_WOC_START}“Be quiet!”${SCRIPTURE_WOC_END}`)
    expect(text).not.toMatch(/\[39\].*${SCRIPTURE_WOC_START}/)
  })

  it('uses verse digit only when ESV verse-num is chapter:verse (Matthew 2:1)', () => {
    const html = `<p><b class="verse-num" id="v1">2:1</b> Now after Jesus was born in Bethlehem of Judea.</p><p><b class="verse-num" id="v2">2&nbsp;</b>And he sent them to Bethlehem.</p>`
    expect(esvPassageHtmlToScriptureText(html)).toBe(
      '[1] Now after Jesus was born in Bethlehem of Judea.\n\n[2] And he sent them to Bethlehem.'
    )
  })

  it('converts ESV chapter-num opener (Matthew 5:1)', () => {
    const html = `<p class="starts-chapter"><b class="chapter-num" id="v40005001-1">5:1&nbsp;</b>Seeing the crowds, he went up on the mountain.</p><p><b class="verse-num" id="v40005002-1">2&nbsp;</b>And he opened his mouth and taught them, saying:</p>`
    expect(esvPassageHtmlToScriptureText(html)).toBe(
      '[1] Seeing the crowds, he went up on the mountain.\n\n[2] And he opened his mouth and taught them, saying:'
    )
  })

  it('fixes legacy mis-converted chapter:verse prefix in plain text', () => {
    expect(normalizeEsvMisconvertedChapterVersePrefix('[2] :1 Now after Jesus')).toBe(
      '[1] Now after Jesus'
    )
    expect(normalizeEsvMisconvertedChapterVersePrefix('5:1 Seeing the crowds')).toBe(
      '[1] Seeing the crowds'
    )
  })

  it('keeps verse numbers outside words-of-Christ markers when ESV nests verse-num in woc', () => {
    const html = `<p><span class="woc"><b class="verse-num woc" id="v1">1\u00a0</b>Blessed are the poor in spirit.</span></p>`
    const text = esvPassageHtmlToScriptureText(html)
    expect(text).toBe(
      `[1] ${SCRIPTURE_WOC_START}Blessed are the poor in spirit.${SCRIPTURE_WOC_END}`
    )
  })

  it('joins multiple paragraphs with blank lines', () => {
    const html = `<p><b class="verse-num">1\u00a0</b>First.</p><p><b class="verse-num">2\u00a0</b>Second.</p>`
    expect(esvPassageHtmlToScriptureText(html)).toBe('[1] First.\n\n[2] Second.')
  })
})
