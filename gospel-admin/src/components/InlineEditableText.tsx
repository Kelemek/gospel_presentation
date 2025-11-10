'use client'

import { useState, useRef, useEffect } from 'react'

interface InlineEditableTextProps {
  value: string
  onChange: (value: string) => void
  className?: string
  placeholder?: string
  multiline?: boolean
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'div'
  onSave?: () => void
}

export default function InlineEditableText({
  value,
  onChange,
  className = '',
  placeholder = 'Click to edit...',
  multiline = false,
  as = 'p',
  onSave
}: InlineEditableTextProps) {
  const [isEditing, setIsEditing] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  // Update content when value changes from parent and we're not editing
  useEffect(() => {
    if (!isEditing && contentRef.current) {
      contentRef.current.innerHTML = value || ''
    }
  }, [value, isEditing])

  // Focus and position cursor when entering edit mode
  useEffect(() => {
    if (isEditing && contentRef.current) {
      contentRef.current.focus()
      
      // Set cursor to end of content
      const range = document.createRange()
      const selection = window.getSelection()
      
      if (contentRef.current.childNodes.length > 0) {
        const lastNode = contentRef.current.childNodes[contentRef.current.childNodes.length - 1]
        const offset = lastNode.textContent?.length || 0
        range.setStart(lastNode, offset)
        range.collapse(true)
        selection?.removeAllRanges()
        selection?.addRange(range)
      }
    }
  }, [isEditing])

  const handleClick = () => {
    if (!isEditing) {
      setIsEditing(true)
    }
  }

  const handleBlur = () => {
    setIsEditing(false)
    const newValue = contentRef.current?.innerHTML || ''
    if (newValue !== value) {
      onChange(newValue)
      if (onSave) {
        onSave()
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Shift+Enter inserts a <br> tag (line break)
    if (e.key === 'Enter' && e.shiftKey && multiline) {
      e.preventDefault()
      
      // Insert <br> at cursor position
      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        range.deleteContents()
        const br = document.createElement('br')
        range.insertNode(br)
        
        // Move cursor after the <br>
        range.setStartAfter(br)
        range.setEndAfter(br)
        selection.removeAllRanges()
        selection.addRange(range)
      }
      return
    }
    
    if (!multiline && e.key === 'Enter') {
      e.preventDefault()
      contentRef.current?.blur()
    }
    
    if (e.key === 'Escape') {
      e.preventDefault()
      if (contentRef.current) {
        contentRef.current.innerHTML = value
      }
      contentRef.current?.blur()
    }
  }

  const getCurrentValue = () => contentRef.current?.innerHTML || ''

  const Component = as
  const baseClassName = `inline-editable-text ${className}`
  const editingClassName = isEditing 
    ? 'ring-2 ring-blue-400 bg-blue-50/50 outline-none' 
    : 'hover:bg-slate-100/50 cursor-pointer'
  const emptyClassName = !value ? 'text-slate-400 italic' : ''

  return (
    <Component
      ref={contentRef}
      contentEditable={isEditing}
      suppressContentEditableWarning
      onClick={handleClick}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={`${baseClassName} ${editingClassName} ${emptyClassName} transition-all rounded px-1 py-0.5`}
      data-placeholder={!value ? placeholder : undefined}
      style={{
        minHeight: multiline ? '3rem' : undefined,
        whiteSpace: multiline ? 'pre-wrap' : undefined,
        maxWidth: '100%',
        wordWrap: 'break-word'
      }}
    />
  )
}
