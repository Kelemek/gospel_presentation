/**
 * @jest-environment jsdom
 */

import {
  clearReadAlongDomHighlight,
  READ_ALONG_HIGHLIGHT_ROOT_ID,
  updateReadAlongDomHighlight,
} from '@/lib/profileReadAlongDomHighlight'

function mockClientRects(rect: DOMRect) {
  const list = {
    length: 1,
    0: rect,
    item: (i: number) => (i === 0 ? rect : null),
    *[Symbol.iterator]() {
      yield rect
    },
  } as unknown as DOMRectList

  const impl = jest.fn(() => list)
  Object.defineProperty(Range.prototype, 'getClientRects', {
    configurable: true,
    writable: true,
    value: impl,
  })
  return impl
}

function removeRangeGetClientRectsMock() {
  delete (Range.prototype as unknown as { getClientRects?: unknown }).getClientRects
}

describe('profileReadAlongDomHighlight', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    document.getElementById(READ_ALONG_HIGHLIGHT_ROOT_ID)?.remove()
  })

  afterEach(() => {
    removeRangeGetClientRectsMock()
  })

  it('does not paint when plainEndExclusive <= plainStart', () => {
    document.body.innerHTML = '<div id="s">Hello world</div>'
    const scope = document.getElementById('s') as HTMLElement
    updateReadAlongDomHighlight({
      scope,
      plainCollapsedLen: 11,
      plainStart: 5,
      plainEndExclusive: 5,
    })
    expect(document.getElementById(READ_ALONG_HIGHLIGHT_ROOT_ID)).toBeNull()
  })

  it('renders fixed underline segments from Range.getClientRects', () => {
    document.body.innerHTML = '<div id="s">Hello world</div>'
    const scope = document.getElementById('s') as HTMLElement
    mockClientRects(new DOMRect(10, 20, 100, 14))

    updateReadAlongDomHighlight({
      scope,
      plainCollapsedLen: 11,
      plainStart: 0,
      plainEndExclusive: 5,
    })

    const root = document.getElementById(READ_ALONG_HIGHLIGHT_ROOT_ID)
    expect(root?.children.length).toBe(1)
    const bar = root?.children[0] as HTMLElement
    expect(bar.style.position).toBe('fixed')
    expect(bar.style.top).toBe('34px')
    expect(bar.style.left).toBe('10px')
    expect(bar.style.width).toBe('100px')
    expect(bar.style.height).toBe('2px')
  })

  it('clearReadAlongDomHighlight removes underline segments', () => {
    document.body.innerHTML = '<div id="s">Hi</div>'
    const scope = document.getElementById('s') as HTMLElement
    mockClientRects(new DOMRect(0, 0, 10, 10))

    updateReadAlongDomHighlight({
      scope,
      plainCollapsedLen: 2,
      plainStart: 0,
      plainEndExclusive: 2,
    })
    clearReadAlongDomHighlight(document)
    expect(document.getElementById(READ_ALONG_HIGHLIGHT_ROOT_ID)?.childElementCount).toBe(0)
  })
})
