import { kindleReadBluePinButtonScriptContent } from '@/lib/kindleReadBluePinButtonScript'

describe('kindleReadBluePinButtonScriptContent', () => {
  it('wires kindle-read-blue-pin-toggle buttons and uses Kindle blue pin storage', () => {
    const script = kindleReadBluePinButtonScriptContent()
    expect(script).toContain('kindle-read-blue-pins-')
    expect(script).toContain('kindle-read-blue-pin-toggle')
    expect(script).toContain('kindleAnchor')
    expect(script).toContain('Remove Pin')
    expect(script).toContain('touchend')
    expect(script).toContain('DOMContentLoaded')
    expect(script).toContain('load')
  })
})
