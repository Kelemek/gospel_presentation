/**
 * @jest-environment jsdom
 */
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import {
  PARAGRAPH_INDENT_OFF_CLASS,
  PARAGRAPH_INDENT_ON_CLASS,
} from '@/lib/paragraphIndentClasses'
import { DivBlock, ParagraphIndent } from '@/lib/tiptapParagraphIndent'

function createEditor(content: string) {
  const el = document.createElement('div')
  document.body.appendChild(el)
  const editor = new Editor({
    element: el,
    extensions: [
      StarterKit.configure({ heading: false }),
      DivBlock,
      ParagraphIndent,
    ],
    content,
  })
  return { editor, el }
}

describe('tiptapParagraphIndent', () => {
  it('setParagraphIndentOff adds paragraph-no-indent on paragraph', () => {
    const { editor, el } = createEditor('<p>Hello</p>')
    editor.commands.focus('end')
    editor.commands.setParagraphIndentOff()
    expect(editor.getHTML()).toContain(PARAGRAPH_INDENT_OFF_CLASS)
    editor.destroy()
    el.remove()
  })

  it('setParagraphIndentOn adds paragraph-first-line-indent on paragraph', () => {
    const { editor, el } = createEditor('<p class="paragraph-no-indent">Hello</p>')
    editor.commands.focus('end')
    editor.commands.setParagraphIndentOn()
    expect(editor.getHTML()).toContain(PARAGRAPH_INDENT_ON_CLASS)
    expect(editor.getHTML()).not.toContain(PARAGRAPH_INDENT_OFF_CLASS)
    editor.destroy()
    el.remove()
  })

  it('parses and preserves indent class on div block', () => {
    const { editor, el } = createEditor(
      `<div class="${PARAGRAPH_INDENT_ON_CLASS}">Line without p tag</div>`
    )
    expect(editor.getHTML()).toContain(PARAGRAPH_INDENT_ON_CLASS)
    expect(editor.getHTML()).toContain('Line without p tag')
    editor.destroy()
    el.remove()
  })

  it('clearParagraphIndentClasses removes indent classes from paragraph', () => {
    const { editor, el } = createEditor(`<p class="${PARAGRAPH_INDENT_OFF_CLASS}">Hello</p>`)
    editor.commands.focus('end')
    editor.commands.clearParagraphIndentClasses()
    const html = editor.getHTML()
    expect(html).not.toContain(PARAGRAPH_INDENT_OFF_CLASS)
    expect(html).not.toContain(PARAGRAPH_INDENT_ON_CLASS)
    editor.destroy()
    el.remove()
  })
})
