import { kindleReadPinHighlightsScriptContent } from '@/lib/kindleReadPinHighlightsScript'

describe('kindleReadPinHighlightsScriptContent', () => {
  it('includes last-read and blue pin storage keys and card classes', () => {
    const script = kindleReadPinHighlightsScriptContent()
    expect(script).toContain('kindle-read-last-card-')
    expect(script).toContain('kindle-read-blue-pins-')
    expect(script).toContain('kindle-read-scripture-card--yellow-pin')
    expect(script).toContain('kindle-read-scripture-card--blue-pin')
    expect(script).toContain('DOMContentLoaded')
  })
})
