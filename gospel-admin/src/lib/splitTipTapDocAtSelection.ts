import type { Editor } from '@tiptap/core'
import type { Node } from '@tiptap/pm/model'
import { DOMSerializer } from '@tiptap/pm/model'

/** True if HTML is empty for gospel subsection body purposes (whitespace / empty p / br only). */
export function isEffectivelyEmptyRichHtml(html: string): boolean {
  let s = html.replace(/&nbsp;/gi, ' ').replace(/\s+/g, '')
  for (let i = 0; i < 6; i++) {
    s = s.replace(/<br\s*\/?>/gi, '')
    s = s.replace(/<p>\s*<\/p>/gi, '')
    s = s.replace(/<div>\s*<\/div>/gi, '')
  }
  return s.length === 0
}

/**
 * Split the editor document at the current selection anchor into two HTML strings.
 * Returns null if the cursor is at an edge or either side would be empty.
 */
export function getTipTapSplitHtmlAtSelection(editor: Editor): { beforeHtml: string; afterHtml: string } | null {
  if (typeof document === 'undefined') return null

  const { doc, selection } = editor.state
  const pos = selection.from
  const end = doc.content.size

  if (pos <= 0 || pos >= end) {
    return null
  }

  const beforeSlice = doc.slice(0, pos)
  const afterSlice = doc.slice(pos, end)

  const serializer = DOMSerializer.fromSchema(editor.schema)
  const toHtml = (fragment: typeof beforeSlice.content) => {
    const div = document.createElement('div')
    div.appendChild(serializer.serializeFragment(fragment))
    return div.innerHTML
  }

  const beforeHtml = toHtml(beforeSlice.content)
  const afterHtml = toHtml(afterSlice.content)

  if (isEffectivelyEmptyRichHtml(beforeHtml) || isEffectivelyEmptyRichHtml(afterHtml)) {
    return null
  }

  return { beforeHtml, afterHtml }
}

/** Map a plain-text offset in the document (0 = first char) to a ProseMirror position inside text. */
export function docTextOffsetToPos(doc: Node, targetOffset: number): number | null {
  let acc = 0
  let found: number | null = null
  doc.descendants((node, pos) => {
    if (found !== null) return false
    if (node.isText) {
      const len = node.text!.length
      if (acc + len >= targetOffset) {
        found = pos + (targetOffset - acc)
        return false
      }
      acc += len
    }
    return true
  })
  return found
}
