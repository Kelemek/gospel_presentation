'use client'

import { useEffect, useRef, useState } from 'react'

interface InlineRichTextEditorProps {
  value: string
  onChange: (value: string) => void
  className?: string
  placeholder?: string
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'div'
  /** Bordered white field + focus ring, aligned with RichTextEditor body chrome */
  variant?: 'minimal' | 'field'
}

// Strip all <p> tags from HTML so content is inline-safe and never produces nested <p> when rendered inside a <p> or <div>. Exported for use when displaying stored HTML (e.g. on edit page).
export function stripParagraphTags(html: string): string {
  if (!html) return ''
  // Remove every <p> and </p> so stored content has no paragraph wrappers (avoids invalid nested <p> on display)
  const stripped = html.replace(/<\/?p>/gi, '').trim()
  return stripped.replace(/\s+/g, ' ').trim()
}

/** Plain text for a single-line title input (decodes entities, strips tags). */
export function htmlToPlainText(html: string): string {
  if (!html) return ''
  if (typeof document === 'undefined') {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
  }
  const d = document.createElement('div')
  d.innerHTML = html
  return (d.textContent || '').replace(/\s+/g, ' ').trim()
}

/** Store plain title as minimal HTML-safe text (no wrapper tags). */
function plainTextToInlineHtml(text: string): string {
  if (!text) return ''
  if (typeof document === 'undefined') {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }
  const span = document.createElement('span')
  span.textContent = text
  return span.innerHTML
}

const FIELD_SHELL_CLASS =
  'w-full flex min-h-12 items-center border border-slate-200 rounded-lg p-3 bg-white focus-within:ring-2 focus-within:ring-blue-400'

export default function InlineRichTextEditor({
  value,
  onChange,
  className = '',
  placeholder = 'Click to edit...',
  variant = 'minimal',
}: InlineRichTextEditorProps) {
  const [draft, setDraft] = useState(() => htmlToPlainText(value))
  const isEditingRef = useRef(false)

  useEffect(() => {
    if (isEditingRef.current) return
    const nextDraft = htmlToPlainText(value)
    setDraft((prev) => (prev === nextDraft ? prev : nextDraft))
  }, [value])

  const commitIfChanged = () => {
    isEditingRef.current = false
    const next = stripParagraphTags(plainTextToInlineHtml(draft))
    const prev = stripParagraphTags(value)
    if (next !== prev) {
      onChange(next)
    }
  }

  const minimalInputClass =
    `${className} w-full min-w-0 rounded-md border border-transparent bg-transparent px-1 py-0.5 -mx-1 text-inherit shadow-none outline-none transition-colors placeholder:text-slate-400 placeholder:italic hover:border-slate-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30 dark:hover:border-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-500/30`

  const fieldInputClass =
    `${className} min-w-0 flex-1 border-0 bg-transparent p-0 text-slate-800 shadow-none outline-none ring-0 focus:ring-0 placeholder:text-slate-400 placeholder:italic`

  const input = (
    <input
      type="text"
      className={variant === 'field' ? fieldInputClass : minimalInputClass}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={() => {
        isEditingRef.current = true
      }}
      onBlur={commitIfChanged}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          ;(e.target as HTMLInputElement).blur()
        }
      }}
      placeholder={placeholder}
      aria-label={placeholder}
    />
  )

  if (variant === 'field') {
    return <div className={FIELD_SHELL_CLASS}>{input}</div>
  }

  return input
}
