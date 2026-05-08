/**
 * @jest-environment jsdom
 */

import { walkerOffsetForReadAlongPlainOffset } from '@/lib/scrollReadAlongPlain'

describe('walkerOffsetForReadAlongPlainOffset', () => {
  it('maps proportionally into walker length', () => {
    document.body.innerHTML = '<div id="scope">abcd</div>'
    const scope = document.getElementById('scope') as HTMLElement
    expect(walkerOffsetForReadAlongPlainOffset(scope, 100, 50)).toBe(2)
  })

  it('clamps offset', () => {
    document.body.innerHTML = '<div id="scope">ab</div>'
    const scope = document.getElementById('scope') as HTMLElement
    expect(walkerOffsetForReadAlongPlainOffset(scope, 10, 999)).toBe(2)
  })
})
