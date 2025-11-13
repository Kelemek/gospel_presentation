'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Superscript from '@tiptap/extension-superscript'
import Subscript from '@tiptap/extension-subscript'
import { useEffect } from 'react'
import { Extension } from '@tiptap/core'

// Extension to add custom HTML attributes to ordered lists
const OrderedListExtended = Extension.create({
  name: 'orderedListExtended',
  
  addGlobalAttributes() {
    return [
      {
        types: ['orderedList'],
        attributes: {
          class: {
            default: null,
            parseHTML: element => element.getAttribute('class'),
            renderHTML: attributes => {
              if (!attributes.class) {
                return {}
              }
              return { class: attributes.class }
            },
          },
        },
      },
    ]
  },
})

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  className?: string
  placeholder?: string
  multiline?: boolean
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'div'
}

export default function RichTextEditor({
  value,
  onChange,
  className = '',
  placeholder = 'Click to edit...',
  multiline = false,
  as = 'p'
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false, // Disable heading for inline editing
      }),
      Placeholder.configure({
        placeholder,
      }),
      TaskList,
      TaskItem.configure({
        nested: true, // Allow nested task lists
      }),
      OrderedListExtended,
      Superscript,
      Subscript,
    ],
    content: value,
    immediatelyRender: false, // Fix SSR hydration issues
    editorProps: {
      attributes: {
        class: `prose prose-sm max-w-none focus:outline-none ${className}`,
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      onChange(html)
    },
  })

  // Update editor content when value changes from parent
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value)
    }
  }, [value, editor])

  if (!editor) {
    return null
  }

  return (
    <div className="rich-text-editor">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 mb-2 p-2 bg-slate-50 border border-slate-200 rounded-t-lg">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          className={`px-2 py-1 text-sm font-bold rounded hover:bg-slate-200 transition-colors ${
            editor.isActive('bold') ? 'bg-slate-300' : 'bg-white'
          }`}
          title="Bold (Ctrl+B)"
        >
          B
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          className={`px-2 py-1 text-sm italic rounded hover:bg-slate-200 transition-colors ${
            editor.isActive('italic') ? 'bg-slate-300' : 'bg-white'
          }`}
          title="Italic (Ctrl+I)"
        >
          I
        </button>
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          disabled={!editor.can().chain().focus().toggleStrike().run()}
          className={`px-2 py-1 text-sm line-through rounded hover:bg-slate-200 transition-colors ${
            editor.isActive('strike') ? 'bg-slate-300' : 'bg-white'
          }`}
          title="Strikethrough"
        >
          S
        </button>
        <button
          onClick={() => editor.chain().focus().toggleSuperscript().run()}
          disabled={!editor.can().chain().focus().toggleSuperscript().run()}
          className={`px-2 py-1 text-sm rounded hover:bg-slate-200 transition-colors ${
            editor.isActive('superscript') ? 'bg-slate-300' : 'bg-white'
          }`}
          title="Superscript"
        >
          X<sup>2</sup>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleSubscript().run()}
          disabled={!editor.can().chain().focus().toggleSubscript().run()}
          className={`px-2 py-1 text-sm rounded hover:bg-slate-200 transition-colors ${
            editor.isActive('subscript') ? 'bg-slate-300' : 'bg-white'
          }`}
          title="Subscript"
        >
          X<sub>2</sub>
        </button>
        
        <div className="w-px h-6 bg-slate-300 mx-1" />
        
        {multiline && (
          <>
            <button
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={`px-2 py-1 text-sm rounded hover:bg-slate-200 transition-colors ${
                editor.isActive('bulletList') ? 'bg-slate-300' : 'bg-white'
              }`}
              title="Bullet List"
            >
              • List
            </button>
            <button
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={`px-2 py-1 text-sm rounded hover:bg-slate-200 transition-colors ${
                editor.isActive('orderedList') ? 'bg-slate-300' : 'bg-white'
              }`}
              title="Numbered List"
            >
              1. List
            </button>
            
            {/* Outline Style Buttons */}
            <button
              onClick={() => {
                if (editor.isActive('orderedList')) {
                  const attrs = editor.getAttributes('orderedList')
                  const currentClass = attrs.class || ''
                  const newClass = currentClass.includes('outline-style') ? '' : 'outline-style'
                  editor.chain().focus().updateAttributes('orderedList', { class: newClass }).run()
                }
              }}
              className={`px-2 py-1 text-sm rounded hover:bg-slate-200 transition-colors ${
                editor.isActive('orderedList') && editor.getAttributes('orderedList').class?.includes('outline-style')
                  ? 'bg-slate-300'
                  : 'bg-white'
              }`}
              title="Outline Style: 1. a. i. (1)"
              disabled={!editor.isActive('orderedList')}
            >
              1.a.i
            </button>
            <button
              onClick={() => {
                if (editor.isActive('orderedList')) {
                  const attrs = editor.getAttributes('orderedList')
                  const currentClass = attrs.class || ''
                  const newClass = currentClass.includes('legal-style') ? '' : 'legal-style'
                  editor.chain().focus().updateAttributes('orderedList', { class: newClass }).run()
                }
              }}
              className={`px-2 py-1 text-sm rounded hover:bg-slate-200 transition-colors ${
                editor.isActive('orderedList') && editor.getAttributes('orderedList').class?.includes('legal-style')
                  ? 'bg-slate-300'
                  : 'bg-white'
              }`}
              title="Legal Style: I. A. 1. a. i."
              disabled={!editor.isActive('orderedList')}
            >
              I.A.1
            </button>
            <button
              onClick={() => {
                if (editor.isActive('orderedList')) {
                  const attrs = editor.getAttributes('orderedList')
                  const currentClass = attrs.class || ''
                  const newClass = currentClass.includes('academic-style') ? '' : 'academic-style'
                  editor.chain().focus().updateAttributes('orderedList', { class: newClass }).run()
                }
              }}
              className={`px-2 py-1 text-sm rounded hover:bg-slate-200 transition-colors ${
                editor.isActive('orderedList') && editor.getAttributes('orderedList').class?.includes('academic-style')
                  ? 'bg-slate-300'
                  : 'bg-white'
              }`}
              title="Academic Style: 1.1, 1.2, 1.2.1"
              disabled={!editor.isActive('orderedList')}
            >
              1.1.1
            </button>
            
            <button
              onClick={() => editor.chain().focus().toggleTaskList().run()}
              className={`px-2 py-1 text-sm rounded hover:bg-slate-200 transition-colors ${
                editor.isActive('taskList') ? 'bg-slate-300' : 'bg-white'
              }`}
              title="Task List (Checkboxes)"
            >
              ☐ Tasks
            </button>
            
            <div className="w-px h-6 bg-slate-300 mx-1" />
          </>
        )}
        
        <button
          onClick={() => editor.chain().focus().setHardBreak().run()}
          className="px-2 py-1 text-sm rounded hover:bg-slate-200 transition-colors bg-white"
          title="Line Break (Shift+Enter)"
        >
          ↵ Break
        </button>
        
        <button
          onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
          className="px-2 py-1 text-sm rounded hover:bg-slate-200 transition-colors bg-white ml-auto"
          title="Clear Formatting"
        >
          Clear Format
        </button>
      </div>

      {/* Editor */}
      <div className="border border-slate-200 rounded-b-lg p-3 bg-white min-h-[3rem] focus-within:ring-2 focus-within:ring-blue-400">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
