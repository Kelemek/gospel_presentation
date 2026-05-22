import { Extension, Node, mergeAttributes } from '@tiptap/core'
import type { Editor } from '@tiptap/core'
import {
  htmlClassFromIndentMarkup,
  indentMarkupFromHtmlClass,
  indentMarkupRenderHtml,
  type ParagraphIndentMarkup,
} from '@/lib/paragraphIndentClasses'

const INDENT_BLOCK_TYPES = ['paragraph', 'divBlock'] as const
type IndentBlockType = (typeof INDENT_BLOCK_TYPES)[number]

const indentMarkupAttribute = {
  default: null as ParagraphIndentMarkup,
  parseHTML: (element: HTMLElement) => indentMarkupFromHtmlClass(element.getAttribute('class')),
  renderHTML: (attributes: { indentMarkup?: ParagraphIndentMarkup }) =>
    indentMarkupRenderHtml(attributes.indentMarkup ?? null),
}

/** Block `<div>` line for content that is not a `<p>` (supports explicit indent class). */
export const DivBlock = Node.create({
  name: 'divBlock',
  group: 'block',
  content: 'inline*',

  addAttributes() {
    return {
      indentMarkup: indentMarkupAttribute,
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div',
        getAttrs: (node) => {
          const el = node as HTMLElement
          if (el.closest('[data-type="taskItem"]')) return false
          if (el.querySelector(':scope > p')) return false
          return {}
        },
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes), 0]
  },
})

function activeIndentBlockType(editor: Editor): IndentBlockType | null {
  for (const name of INDENT_BLOCK_TYPES) {
    if (editor.isActive(name)) return name
  }
  return null
}

function inListContext(editor: Editor): boolean {
  return (
    editor.isActive('listItem') ||
    editor.isActive('bulletList') ||
    editor.isActive('orderedList') ||
    editor.isActive('taskList') ||
    editor.isActive('taskItem')
  )
}

export const ParagraphIndent = Extension.create({
  name: 'paragraphIndent',

  addGlobalAttributes() {
    return [
      {
        types: ['paragraph'],
        attributes: {
          indentMarkup: indentMarkupAttribute,
        },
      },
    ]
  },

  addCommands() {
    return {
      setParagraphIndentOn:
        () =>
        ({ editor, chain }) => {
          if (inListContext(editor)) return false
          const block = activeIndentBlockType(editor)
          if (!block) return false
          return chain().focus().updateAttributes(block, { indentMarkup: 'on' }).run()
        },
      setParagraphIndentOff:
        () =>
        ({ editor, chain }) => {
          if (inListContext(editor)) return false
          const block = activeIndentBlockType(editor)
          if (!block) return false
          return chain().focus().updateAttributes(block, { indentMarkup: 'off' }).run()
        },
      clearParagraphIndentClasses:
        () =>
        ({ editor, chain }) => {
          if (inListContext(editor)) return false
          const block = activeIndentBlockType(editor)
          if (!block) return false
          return chain().focus().updateAttributes(block, { indentMarkup: null }).run()
        },
    }
  },

  addKeyboardShortcuts() {
    return {
      Tab: ({ editor }) => {
        if (inListContext(editor)) return false
        return editor.commands.setParagraphIndentOn()
      },
      'Shift-Tab': ({ editor }) => {
        if (inListContext(editor)) return false
        return editor.commands.setParagraphIndentOff()
      },
    }
  },
})

export function paragraphIndentToolbarState(editor: Editor): {
  canIndent: boolean
  indentActive: boolean
  outdentActive: boolean
} {
  const block = activeIndentBlockType(editor)
  const canIndent = Boolean(block) && !inListContext(editor)
  if (!canIndent || !block) {
    return { canIndent: false, indentActive: false, outdentActive: false }
  }
  const markup = editor.getAttributes(block).indentMarkup as ParagraphIndentMarkup
  return {
    canIndent: true,
    indentActive: markup === 'on',
    outdentActive: markup === 'off',
  }
}

/** For tests: class string TipTap will persist for a markup value. */
export function indentClassForMarkup(markup: ParagraphIndentMarkup): string | null {
  return htmlClassFromIndentMarkup(markup)
}
