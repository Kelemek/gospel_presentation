'use client'

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

jest.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => false },
}))

import GospelInlineHtml from '@/components/GospelInlineHtml'

describe('GospelInlineHtml', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ reference: 'John 3:16', text: 'For God so loved the world', translation: 'esv' }),
    })
  })

  it('portals a COMA link and calls onComaClick', async () => {
    const onComaClick = jest.fn()
    render(<GospelInlineHtml html="<p>Use COMA in counseling.</p>" onComaClick={onComaClick} onScriptureClick={jest.fn()} />)

    const link = await screen.findByRole('link', { name: /COMA/i })
    expect(link).toHaveAttribute('href', '#')
    fireEvent.click(link)
    expect(onComaClick).toHaveBeenCalledTimes(1)
  })

  it('portals C.O.M.A. label from injected data-gospel-coma-label', async () => {
    const onComaClick = jest.fn()
    render(<GospelInlineHtml html="<p>Study C.O.M.A. method.</p>" onComaClick={onComaClick} onScriptureClick={jest.fn()} />)

    const link = await screen.findByRole('link', { name: 'C.O.M.A.' })
    fireEvent.click(link)
    expect(onComaClick).toHaveBeenCalled()
  })

  it('portals Four Rules link and calls onFourRulesClick', async () => {
    const onFourRulesClick = jest.fn()
    render(
      <GospelInlineHtml
        html="<p>Read Four Rules of Communication today.</p>"
        onComaClick={jest.fn()}
        onFourRulesClick={onFourRulesClick}
        onScriptureClick={jest.fn()}
      />
    )

    const link = await screen.findByRole('link', { name: 'Four Rules of Communication' })
    fireEvent.click(link)
    expect(onFourRulesClick).toHaveBeenCalledTimes(1)
  })

  it('portals scripture button with ScriptureHoverModal and calls onScriptureClick with anchors', async () => {
    const onScriptureClick = jest.fn()
    render(
      <GospelInlineHtml
        html="<p>See John 3:16 for the gospel.</p>"
        onComaClick={jest.fn()}
        onScriptureClick={onScriptureClick}
        anchorSectionId="section-a"
        anchorSubsectionId="section-a-0"
      />
    )

    await waitFor(() => expect(screen.getByRole('button', { name: 'John 3:16' })).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'John 3:16' })).toHaveAttribute('data-tour', 'scripture-card')
    fireEvent.click(screen.getByRole('button', { name: 'John 3:16' }))
    expect(onScriptureClick).toHaveBeenCalledWith('John 3:16', 'section-a', 'section-a-0')
  })

  it('renders scripture reference as static pill when onScriptureClick is omitted', async () => {
    render(<GospelInlineHtml html="<p>Romans 8:28</p>" onComaClick={jest.fn()} />)

    await waitFor(() => expect(screen.getByText('Romans 8:28')).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: 'Romans 8:28' })).not.toBeInTheDocument()
  })

  it('injects scripture mount spans into the container', async () => {
    const { container } = render(
      <GospelInlineHtml html="<p>Acts 1:1 only.</p>" onComaClick={jest.fn()} onScriptureClick={jest.fn()} />
    )

    await screen.findByRole('button', { name: 'Acts 1:1' })
    const mount = container.querySelector('[data-gospel-mount="scripture"][data-gospel-ref="Acts 1:1"]')
    expect(mount).toBeTruthy()
  })

  it('updates portals when html prop changes', async () => {
    const onScriptureClick = jest.fn()
    const { rerender } = render(
      <GospelInlineHtml html="<p>Galatians 1:1</p>" onComaClick={jest.fn()} onScriptureClick={onScriptureClick} />
    )
    await screen.findByRole('button', { name: 'Galatians 1:1' })

    rerender(<GospelInlineHtml html="<p>Ephesians 2:8</p>" onComaClick={jest.fn()} onScriptureClick={onScriptureClick} />)

    await waitFor(() => expect(screen.getByRole('button', { name: 'Ephesians 2:8' })).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: 'Galatians 1:1' })).not.toBeInTheDocument()
  })

  it('inserts highlights as mark[data-resource-highlight-id] in the injected container', async () => {
    const { container } = render(
      <GospelInlineHtml
        html="<p>ABCDEFGHIJ</p>"
        onComaClick={jest.fn()}
        highlights={[{ id: 'h1', startOffset: 1, endOffset: 5 }]}
        activeHighlightId={null}
      />
    )

    await waitFor(() => {
      const m = container.querySelector('mark[data-resource-highlight-id="h1"]')
      expect(m).toBeTruthy()
      expect(m?.textContent).toBe('BCDE')
      expect(m?.hasAttribute('data-resource-highlight-active')).toBe(false)
    })
  })

  it('sets data-resource-highlight-active on the matching mark', async () => {
    const { container } = render(
      <GospelInlineHtml
        html="<p>ABCDEFGHIJ</p>"
        onComaClick={jest.fn()}
        highlights={[{ id: 'h1', startOffset: 1, endOffset: 5 }]}
        activeHighlightId="h1"
      />
    )

    await waitFor(() => {
      const m = container.querySelector('mark[data-resource-highlight-id="h1"]')
      expect(m?.getAttribute('data-resource-highlight-active')).toBe('true')
    })
  })

  it('calls onHighlightMarkClick when a removable highlight mark is clicked', async () => {
    const onHighlightMarkClick = jest.fn()
    const { container } = render(
      <GospelInlineHtml
        html="<p>ABCDEFGHIJ</p>"
        onComaClick={jest.fn()}
        highlights={[{ id: 'h1', startOffset: 1, endOffset: 5 }]}
        activeHighlightId={null}
        onHighlightMarkClick={onHighlightMarkClick}
      />
    )

    await waitFor(() => {
      const m = container.querySelector('mark[data-resource-highlight-id="h1"]')
      expect(m).toBeTruthy()
      expect(m?.getAttribute('data-resource-highlight-removable')).toBe('true')
    })
    const mark = container.querySelector('mark[data-resource-highlight-id="h1"]')!
    fireEvent.click(mark)
    expect(onHighlightMarkClick).toHaveBeenCalledWith('h1')
  })

  it('splits highlights across sibling inner div blocks (TipTap-style) into one mark per div', async () => {
    const { container } = render(
      <GospelInlineHtml
        html="<div><div>AB</div><div>CD</div></div>"
        onComaClick={jest.fn()}
        highlights={[{ id: 'h1', startOffset: 0, endOffset: 4 }]}
        activeHighlightId={null}
      />
    )

    await waitFor(() => {
      const marks = container.querySelectorAll('mark[data-resource-highlight-id="h1"]')
      expect(marks.length).toBe(2)
      const chunks = [...marks].map((m) => (m.textContent ?? '').trim()).sort()
      expect(chunks).toEqual(['AB', 'CD'])
    })
  })

  it('splits highlights inside blockquote with div lines into one mark per div', async () => {
    const { container } = render(
      <GospelInlineHtml
        html="<blockquote><div>WX</div><div>YZ</div></blockquote>"
        onComaClick={jest.fn()}
        highlights={[{ id: 'h1', startOffset: 0, endOffset: 4 }]}
        activeHighlightId={null}
      />
    )

    await waitFor(() => {
      const marks = container.querySelectorAll('mark[data-resource-highlight-id="h1"]')
      expect(marks.length).toBe(2)
      const chunks = [...marks].map((m) => (m.textContent ?? '').trim()).sort()
      expect(chunks).toEqual(['WX', 'YZ'])
    })
  })

  it('splits highlights that span sibling paragraphs into one mark per paragraph', async () => {
    const { container } = render(
      <GospelInlineHtml
        html="<p>ABCDEFGHIJ</p><p>KLMNOP</p>"
        onComaClick={jest.fn()}
        highlights={[{ id: 'h1', startOffset: 8, endOffset: 12 }]}
        activeHighlightId={null}
      />
    )

    await waitFor(() => {
      const marks = container.querySelectorAll('mark[data-resource-highlight-id="h1"]')
      expect(marks.length).toBe(2)
      const chunks = [...marks].map((m) => (m.textContent ?? '').trim())
      expect(new Set(chunks)).toEqual(new Set(['IJ', 'KL']))
    })
  })

  it('does not nest multiple <p> inside a single mark when paragraphs sit under an outer wrapper <div>', async () => {
    const { container } = render(
      <GospelInlineHtml
        html="<div><p>ABCDEFGHIJ</p><p>KLMNOP</p></div>"
        onComaClick={jest.fn()}
        highlights={[{ id: 'h1', startOffset: 8, endOffset: 12 }]}
        activeHighlightId={null}
      />
    )

    await waitFor(() => {
      const marks = container.querySelectorAll('mark[data-resource-highlight-id="h1"]')
      expect(marks.length).toBe(2)
      marks.forEach((m) => {
        expect(m.querySelectorAll('p').length).toBe(0)
      })
      const chunks = [...marks].map((m) => (m.textContent ?? '').trim())
      expect(new Set(chunks)).toEqual(new Set(['IJ', 'KL']))
    })
  })

  it('shows verse pin styling and remove control when a pin matches the row', async () => {
    const onRemoveVersePin = jest.fn()
    render(
      <GospelInlineHtml
        html="<p>John 3:16</p>"
        onComaClick={jest.fn()}
        onScriptureClick={jest.fn()}
        anchorSectionId="s1"
        anchorSubsectionId="s1-0"
        versePins={[
          {
            colorId: 'red',
            bookmarkId: 'bm-1',
            reference: 'John 3:16',
            sectionId: 's1',
            subsectionId: 's1-0',
          },
        ]}
        onRemoveVersePin={onRemoveVersePin}
      />
    )

    const unpin = await screen.findByRole('button', { name: /Remove red pin for John 3:16/i })
    fireEvent.click(unpin)
    expect(onRemoveVersePin).toHaveBeenCalledWith({ colorId: 'red', bookmarkId: 'bm-1' })
  })
})
