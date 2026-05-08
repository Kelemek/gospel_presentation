import { clientRectsOnSameVisualLineAsCaret } from '@/lib/profileReadAlongDomHighlight'

describe('clientRectsOnSameVisualLineAsCaret', () => {
  it('keeps rects whose vertical span contains the caret midline', () => {
    const caret = { top: 10, bottom: 24, height: 14 }
    const rects = [
      { top: 8, bottom: 26, width: 50, height: 18, left: 0 },
      { top: 40, bottom: 56, width: 50, height: 16, left: 0 },
    ]
    const out = clientRectsOnSameVisualLineAsCaret(caret, rects)
    expect(out).toHaveLength(1)
    expect(out[0]!.top).toBe(8)
  })
})
