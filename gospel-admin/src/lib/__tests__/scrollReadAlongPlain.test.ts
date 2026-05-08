/**
 * @jest-environment jsdom
 */

import { visibleListenRawText } from '@/lib/profileResourceListenText'
import { walkerOffsetForReadAlongPlainOffset } from '@/lib/scrollReadAlongPlain'

describe('walkerOffsetForReadAlongPlainOffset', () => {
  it('inserts implicit breaks between block elements like innerText', () => {
    document.body.innerHTML = '<div id="scope"><p>hello</p><p>world</p></div>'
    const scope = document.getElementById('scope') as HTMLElement
    expect(visibleListenRawText(scope)).toBe('hello\nworld')
    const L = 'hello world'.length
    expect(walkerOffsetForReadAlongPlainOffset(scope, L, 6)).toBe(6)
  })

  it('returns raw length when plain offset is past the last collapsed character', () => {
    document.body.innerHTML = '<div id="scope">abcd</div>'
    const scope = document.getElementById('scope') as HTMLElement
    expect(walkerOffsetForReadAlongPlainOffset(scope, 4, 50)).toBe(4)
  })

  it('clamps offset at collapsed length', () => {
    document.body.innerHTML = '<div id="scope">ab</div>'
    const scope = document.getElementById('scope') as HTMLElement
    expect(walkerOffsetForReadAlongPlainOffset(scope, 2, 999)).toBe(2)
  })
})
