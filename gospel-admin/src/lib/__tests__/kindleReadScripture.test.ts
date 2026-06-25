import {
  kindleReadScriptureBackHref,
} from '@/lib/kindleReadScripture'

describe('kindleReadScriptureBackHref', () => {
  it('returns profile read url when from slug is provided', () => {
    expect(kindleReadScriptureBackHref('default')).toBe('/default/read/')
    expect(kindleReadScriptureBackHref(' lbst ')).toBe('/lbst/read/')
  })

  it('falls back to default read url', () => {
    expect(kindleReadScriptureBackHref(null)).toBe('/default/read/')
    expect(kindleReadScriptureBackHref('')).toBe('/default/read/')
  })

  it('appends anchor hash when provided', () => {
    expect(kindleReadScriptureBackHref('bxrp', 'section-bxrp-0')).toBe(
      '/bxrp/read/#section-bxrp-0'
    )
    expect(kindleReadScriptureBackHref('default', null)).toBe('/default/read/')
  })
})
