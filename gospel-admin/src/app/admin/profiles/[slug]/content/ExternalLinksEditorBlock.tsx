'use client'

import { useState } from 'react'
import type { ExternalResourceLink } from '@/lib/types'
import { normalizeExternalResourceUrl } from '@/lib/externalResourceLink'

const DRAG_HANDLE = (
  <svg width="8" height="12" viewBox="0 0 8 12" fill="none" className="text-gray-400">
    <circle cx="2" cy="2" r="1" fill="currentColor" />
    <circle cx="6" cy="2" r="1" fill="currentColor" />
    <circle cx="2" cy="6" r="1" fill="currentColor" />
    <circle cx="6" cy="6" r="1" fill="currentColor" />
    <circle cx="2" cy="10" r="1" fill="currentColor" />
    <circle cx="6" cy="10" r="1" fill="currentColor" />
  </svg>
)

export interface ExternalLinksEditorBlockProps {
  locationId: string
  links: ExternalResourceLink[]
  onLinksChange: (links: ExternalResourceLink[]) => void
  /** Smaller labels/controls for nested subsections */
  compact?: boolean
}

export default function ExternalLinksEditorBlock({
  locationId,
  links,
  onLinksChange,
  compact = false,
}: ExternalLinksEditorBlockProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newUrl, setNewUrl] = useState('')
  const [addUrlError, setAddUrlError] = useState('')
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editingLabel, setEditingLabel] = useState('')
  const [editingUrl, setEditingUrl] = useState('')
  const [editUrlError, setEditUrlError] = useState('')
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const headingClass = compact ? 'text-xs font-medium text-slate-600' : 'text-sm font-medium text-slate-700'
  const buttonPad = compact ? 'px-1.5 py-0.5' : 'px-2 py-1'

  const commitLinks = (next: ExternalResourceLink[]) => {
    onLinksChange(next.length > 0 ? next : [])
  }

  const handleAdd = () => {
    const label = newLabel.trim()
    if (!label) return
    const normalized = normalizeExternalResourceUrl(newUrl)
    if (!normalized) {
      setAddUrlError('Enter a valid http or https URL.')
      return
    }
    setAddUrlError('')
    commitLinks([...links, { label, url: normalized }])
    setNewLabel('')
    setNewUrl('')
    setIsAdding(false)
  }

  const startEdit = (index: number) => {
    setEditingIndex(index)
    setEditingLabel(links[index].label)
    setEditingUrl(links[index].url)
    setEditUrlError('')
  }

  const cancelEdit = () => {
    setEditingIndex(null)
    setEditingLabel('')
    setEditingUrl('')
    setEditUrlError('')
  }

  const saveEdit = () => {
    if (editingIndex === null) return
    const label = editingLabel.trim()
    if (!label) return
    const normalized = normalizeExternalResourceUrl(editingUrl)
    if (!normalized) {
      setEditUrlError('Enter a valid http or https URL.')
      return
    }
    const next = [...links]
    next[editingIndex] = { label, url: normalized }
    commitLinks(next)
    cancelEdit()
  }

  const removeLink = (index: number) => {
    commitLinks(links.filter((_, i) => i !== index))
    if (editingIndex === index) cancelEdit()
  }

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(index)
  }

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null)
      setDragOverIndex(null)
      return
    }
    const next = [...links]
    const [moved] = next.splice(draggedIndex, 1)
    const adjustedTarget = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex
    next.splice(adjustedTarget, 0, moved)
    commitLinks(next)
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  return (
    <div className={compact ? 'mt-3' : 'mt-4'}>
      <div className={`flex items-center justify-between pr-2 ${compact ? 'mb-2' : 'mb-3'}`}>
        <h4 className={headingClass}>External Links:</h4>
        <button
          type="button"
          onClick={() => {
            setIsAdding(!isAdding)
            setNewLabel('')
            setNewUrl('')
            setAddUrlError('')
          }}
          className={`text-teal-600 hover:text-teal-800 text-xs font-medium border border-teal-200 hover:border-teal-300 rounded bg-teal-50 hover:bg-teal-100 transition-colors ${buttonPad}`}
        >
          {isAdding ? 'Cancel' : (
            <>
              <span className="hidden sm:inline">+ Add Link</span>
              <span className="sm:hidden">+ Link</span>
            </>
          )}
        </button>
      </div>

      {isAdding && (
        <div
          className={
            compact
              ? 'bg-teal-50 border border-teal-200 rounded p-2 mb-2'
              : 'bg-teal-50 border border-teal-200 rounded-lg p-3 mb-3'
          }
        >
          <div className="flex flex-col gap-2">
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Link label (e.g. ACBC: Worry)"
              className={
                compact
                  ? 'w-full text-xs px-2 py-1 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-sm'
                  : 'w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-sm'
              }
            />
            <input
              type="url"
              value={newUrl}
              onChange={(e) => {
                setNewUrl(e.target.value)
                setAddUrlError('')
              }}
              placeholder="https://biblicalcounseling.com/..."
              className={
                compact
                  ? 'w-full text-xs px-2 py-1 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-sm'
                  : 'w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-sm'
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd()
              }}
            />
            {addUrlError && <p className="text-xs text-red-600">{addUrlError}</p>}
            <button
              type="button"
              onClick={handleAdd}
              disabled={!newLabel.trim() || !newUrl.trim()}
              className={`self-start bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 ${compact ? 'px-2 py-1 text-xs' : 'px-4 py-2'}`}
            >
              Add
            </button>
          </div>
        </div>
      )}

      {links.length > 0 ? (
        <div className={`flex flex-wrap ${compact ? 'gap-1' : 'gap-2'}`}>
          {links.map((link, linkIndex) => {
            const isEditing = editingIndex === linkIndex
            const isDragging = draggedIndex === linkIndex
            const isDragOver = dragOverIndex === linkIndex

            return (
              <div
                key={`${locationId}-link-${linkIndex}-${link.url}`}
                className={`relative group ${isDragging ? 'opacity-50' : ''} ${isDragOver ? 'ring-2 ring-teal-400' : ''}`}
                draggable={!isEditing}
                onDragStart={(e) => handleDragStart(e, linkIndex)}
                onDragOver={(e) => handleDragOver(e, linkIndex)}
                onDragLeave={() => setDragOverIndex(null)}
                onDrop={(e) => handleDrop(e, linkIndex)}
                onDragEnd={handleDragEnd}
              >
                {isEditing ? (
                  <div className="flex flex-col gap-1 bg-yellow-50 border border-yellow-300 rounded-md p-2 min-w-[200px]">
                    <input
                      type="text"
                      value={editingLabel}
                      onChange={(e) => setEditingLabel(e.target.value)}
                      className="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-teal-500"
                      placeholder="Label"
                      autoFocus
                    />
                    <input
                      type="url"
                      value={editingUrl}
                      onChange={(e) => {
                        setEditingUrl(e.target.value)
                        setEditUrlError('')
                      }}
                      className="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-teal-500"
                      placeholder="https://..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit()
                        if (e.key === 'Escape') cancelEdit()
                      }}
                    />
                    {editUrlError && <p className="text-xs text-red-600">{editUrlError}</p>}
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={saveEdit}
                        disabled={!editingLabel.trim()}
                        className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700 disabled:opacity-50"
                      >
                        ✓
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="bg-gray-600 text-white px-2 py-1 rounded text-xs hover:bg-gray-700"
                      >
                        ✗
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center">
                      <div
                        className="drag-handle cursor-move p-1 opacity-0 group-hover:opacity-100 transition-opacity mr-1"
                        title="Drag to reorder"
                      >
                        {DRAG_HANDLE}
                      </div>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={
                          compact
                            ? 'inline-block px-2 py-0.5 text-xs rounded-md bg-teal-100 hover:bg-teal-200 text-teal-900 border border-teal-200 hover:border-teal-300 transition-colors'
                            : 'inline-block px-3 py-1 text-sm rounded-md bg-teal-100 hover:bg-teal-200 text-teal-900 border border-teal-200 hover:border-teal-300 transition-colors'
                        }
                        onClick={(e) => e.preventDefault()}
                      >
                        {link.label} ↗
                      </a>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLink(linkIndex)}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                      title="Remove link"
                    >
                      ×
                    </button>
                    <button
                      type="button"
                      onClick={() => startEdit(linkIndex)}
                      className="absolute -bottom-1 -right-1 bg-orange-500 text-white rounded-full w-4 h-4 text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-orange-600"
                      title="Edit link"
                    >
                      ✏️
                    </button>
                  </>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <p className={`text-slate-500 italic ${compact ? 'text-xs' : 'text-sm'}`}>
          No external links yet. Click &ldquo;Add Link&rdquo; for ACBC articles or other resources.
        </p>
      )}

      <p className="text-slate-500 text-xs mt-2">
        Opens in a new tab on the profile (not the scripture reader). Drag ⋮⋮ to reorder links; scriptures stay above links.
      </p>
    </div>
  )
}
