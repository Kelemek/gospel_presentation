import { kindleReadHashScrollScriptContent } from '@/lib/kindleReadHashScrollScript'

describe('kindleReadHashScrollScriptContent', () => {
  it('measures sticky toolbar height and skips scripture card anchors', () => {
    const script = kindleReadHashScrollScriptContent()
    expect(script).toContain('.kindle-read-toolbar')
    expect(script).toContain('hashchange')
    expect(script).toContain('isCardAnchor')
    expect(script).toContain('-card-\\d+$')
  })
})
