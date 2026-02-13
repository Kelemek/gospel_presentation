'use client'

import { useState } from 'react'
import RichTextEditor from './RichTextEditor'

interface InlineRichTextEditorProps {
  value: string
  onChange: (value: string) => void
  className?: string
  placeholder?: string
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'div'
}

// Strip all <p> tags from HTML so content is inline-safe and never produces nested <p> when rendered inside a <p> or <div>. Exported for use when displaying stored HTML (e.g. on edit page).
export function stripParagraphTags(html: string): string {
  if (!html) return ''
  // Remove every <p> and </p> so stored content has no paragraph wrappers (avoids invalid nested <p> on display)
  const stripped = html.replace(/<\/?p>/gi, '').trim()
  return stripped.replace(/\s+/g, ' ').trim()
}

// Get display text from HTML (strip all HTML tags for title display)
function getDisplayText(html: string): string {
  if (!html) return ''
  // Strip paragraph tags first
  const stripped = stripParagraphTags(html)
  // Return the stripped version (may still contain formatting tags like <strong>, <em>)
  return stripped
}

export default function InlineRichTextEditor({
  value,
  onChange,
  className = '',
  placeholder = 'Click to edit...',
  as = 'p'
}: InlineRichTextEditorProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)

  const Component = as

  const handleSave = () => {
    // Strip paragraph tags before saving
    const cleanedValue = stripParagraphTags(editValue)
    onChange(cleanedValue)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditValue(value)
    setIsEditing(false)
  }

  const handleEdit = () => {
    setEditValue(value)
    setIsEditing(true)
  }

  if (isEditing) {
    return (
      <div className="space-y-2">
        <RichTextEditor
          value={editValue}
          onChange={setEditValue}
          placeholder={placeholder}
          multiline
          as="div"
          className="w-full text-sm"
        />
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={!editValue.trim()}
            className="bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-700 border border-slate-200 hover:border-slate-300 px-3 py-1 rounded text-xs transition-colors disabled:opacity-50"
            type="button"
          >
            Save
          </button>
          <button
            onClick={handleCancel}
            className="bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-700 border border-slate-200 hover:border-slate-300 px-3 py-1 rounded text-xs transition-colors"
            type="button"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  const displayText = getDisplayText(value)

  return (
    <div className="group flex items-start gap-2">
      <Component
        className={`${className} ${!displayText ? 'text-slate-400 italic' : ''} flex-1`}
        dangerouslySetInnerHTML={{ __html: displayText || placeholder }}
      />
      <button
        onClick={handleEdit}
        className="text-slate-600 hover:text-slate-800 text-xs px-2 py-1 rounded hover:bg-slate-100 transition-colors"
        title="Edit"
        type="button"
      >
        ✏️
      </button>
    </div>
  )
}
