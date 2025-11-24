'use client'

import Link from 'next/link'
import { useState } from 'react'

interface TemplateCardProps {
  template: any
  siteUrl: string
  onCopyUrl: (template: any) => void
  onDelete: (slug: string, title: string) => void
  onDownloadBackup: (template: any) => void
  onRestoreBackup: (template: any, event: React.ChangeEvent<HTMLInputElement>) => void
  userRole?: 'admin' | 'counselor' | null
  canManage?: boolean
  isExpanded?: boolean
  onToggleExpand?: () => void
}

/**
 * Card view component for displaying a template with all details from list view.
 * Only shown to admins. Uses collapsible details similar to ProfileCard.
 */
export default function TemplateCard({
  template,
  siteUrl,
  onCopyUrl,
  onDelete,
  onDownloadBackup,
  onRestoreBackup,
  userRole,
  canManage = true,
  isExpanded = false,
  onToggleExpand
}: TemplateCardProps) {
  const [internalShowDetails, setInternalShowDetails] = useState(false)
  const showDetails = onToggleExpand !== undefined ? isExpanded : internalShowDetails
  const profileUrl = `${siteUrl}/${template.slug}`

  return (
    <div className="bg-white rounded-lg border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col h-full">
      {/* Header - Title */}
      <Link href={profileUrl} target="_blank" rel="noopener noreferrer">
        <div className="p-4 bg-gradient-to-r from-blue-50 to-slate-50 hover:from-blue-100 hover:to-slate-100 transition-colors">
          <h3 className="text-sm sm:text-base font-semibold text-slate-900 truncate hover:text-blue-600">
            {template.title}
          </h3>
        </div>
      </Link>

      {/* Description */}
      <div className="flex-1 px-4 pt-4 pb-3 bg-white">
        {template.description && (
          <p className="text-xs sm:text-sm text-slate-600 line-clamp-3">
            {template.description}
          </p>
        )}
      </div>

      {/* Details Toggle Button - Only for admins */}
      {userRole === 'admin' && (
        <button
          onClick={() => {
            if (onToggleExpand !== undefined) {
              onToggleExpand()
            } else {
              setInternalShowDetails(!internalShowDetails)
            }
          }}
          className="w-full px-4 py-3 bg-gradient-to-r from-blue-50 to-slate-50 hover:from-blue-100 hover:to-slate-100 border-t border-slate-100 transition-colors cursor-pointer flex items-center justify-between"
        >
          <span className="text-xs sm:text-sm font-medium text-slate-700">Details...</span>
          <span className="text-xs text-slate-500">{showDetails ? '▼' : '▶'}</span>
        </button>
      )}

      {/* Expandable Details Section */}
      {showDetails && (
        <div className="px-4 py-3 border-t border-slate-100 space-y-2 text-xs bg-slate-50">
          {/* Badges */}
          <div className="flex flex-wrap gap-1.5 pb-2 border-b border-slate-100">
            <span className="bg-slate-200 text-slate-700 text-xs px-2 py-1 rounded-full font-medium">
              Template
            </span>
          </div>

          {/* Metadata */}
          <div className="space-y-2">
            {/* URL */}
            <div className="flex items-start gap-2">
              <span className="text-slate-500 whitespace-nowrap">URL:</span>
              <span className="text-slate-700 font-medium break-all text-xs">{siteUrl}/{template.slug}</span>
            </div>

            {/* Owner */}
            {template.ownerDisplayName && (
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Owner:</span>
                <span className="text-slate-700 font-medium truncate">{template.ownerDisplayName}</span>
              </div>
            )}

            {/* Visit Count */}
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Views:</span>
              <span className="text-slate-700 font-medium">{template.visitCount || 0}</span>
            </div>

            {/* Dates */}
            {template.createdAt && (
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Created:</span>
                <span className="text-slate-700 font-medium">
                  {new Date(template.createdAt).toLocaleDateString()}
                </span>
              </div>
            )}

            {template.updatedAt && (
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Updated:</span>
                <span className="text-slate-700 font-medium">
                  {new Date(template.updatedAt).toLocaleDateString()}
                </span>
              </div>
            )}

            {/* Last Visited */}
            {template.lastVisited ? (
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Last Viewed:</span>
                <span className="text-slate-700 font-medium">
                  {new Date(template.lastVisited).toLocaleDateString()}
                </span>
              </div>
            ) : template.visitCount === 0 ? (
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Last Viewed:</span>
                <span className="text-orange-500 font-medium">Never visited</span>
              </div>
            ) : null}
          </div>

          {/* Action Buttons */}
          <div className="pt-3 space-y-2 border-t border-slate-100">
            {/* Primary Actions */}
            <div className="flex gap-2">
              <Link
                href={`/admin/profiles/${template.slug}/content`}
                className="flex-1 block text-center px-2 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-800 rounded text-xs font-medium transition-colors border border-blue-200 hover:border-blue-300"
              >
                Edit
              </Link>
              <Link
                href={`/admin/profiles/${template.slug}`}
                className="flex-1 block text-center px-2 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-800 rounded text-xs font-medium transition-colors border border-blue-200 hover:border-blue-300"
              >
                Settings
              </Link>
            </div>

            {/* URL and Delete Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => onCopyUrl(template)}
                className="flex-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium transition-colors border border-slate-300 hover:border-slate-400"
                title={profileUrl}
              >
                Copy URL
              </button>

              {canManage && !template.isDefault && (
                <button
                  onClick={() => onDelete(template.slug, template.title)}
                  className="flex-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 hover:text-red-800 rounded text-xs font-medium transition-colors border border-red-200 hover:border-red-300"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
