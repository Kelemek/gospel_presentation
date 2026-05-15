/**
 * @jest-environment jsdom
 */
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import {
  getTipTapSplitHtmlAtSelection,
  isEffectivelyEmptyRichHtml,
  docTextOffsetToPos,
} from '@/lib/splitTipTapDocAtSelection'

describe('splitTipTapDocAtSelection', () => {
  it('detects empty rich HTML', () => {
    expect(isEffectivelyEmptyRichHtml('')).toBe(true)
    expect(isEffectivelyEmptyRichHtml('<p></p>')).toBe(true)
    expect(isEffectivelyEmptyRichHtml('  <p>  </p>  ')).toBe(true)
    expect(isEffectivelyEmptyRichHtml('<p><br></p>')).toBe(true)
    expect(isEffectivelyEmptyRichHtml('<p>Hi</p>')).toBe(false)
  })

  it('splits a single paragraph at cursor into two HTML parts', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)

    const editor = new Editor({
      element: el,
      extensions: [StarterKit.configure({ heading: false })],
      content: '<p>Hello world</p>',
    })

    const splitAt = docTextOffsetToPos(editor.state.doc, 6)
    expect(splitAt).not.toBeNull()
    editor.commands.setTextSelection(splitAt!)

    const split = getTipTapSplitHtmlAtSelection(editor)
    expect(split).not.toBeNull()
    if (!split) return

    expect(split.beforeHtml).toMatch(/Hello/)
    expect(split.afterHtml).toMatch(/world/)

    editor.destroy()
    el.remove()
  })

  it('returns null at document end', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)

    const editor = new Editor({
      element: el,
      extensions: [StarterKit.configure({ heading: false })],
      content: '<p>Only</p>',
    })

    const end = editor.state.doc.content.size
    editor.commands.setTextSelection(end)

    expect(getTipTapSplitHtmlAtSelection(editor)).toBeNull()

    editor.destroy()
    el.remove()
  })
})
