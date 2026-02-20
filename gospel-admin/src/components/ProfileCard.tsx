'use client'

import Link from 'next/link'
import { useState } from 'react'

interface ProfileCardProps {
  profile: any
  siteUrl: string
  onCopyUrl: (profile: any) => void
  onDelete: (slug: string, title: string) => void
  canManage?: boolean
  showDetails?: boolean
  onToggleDetails?: () => void
  userRole?: 'admin' | 'counselor' | 'counselee' | null
}

/**
 * Card view component for displaying a profile in a grid layout.
 */
export default function ProfileCard({
  profile,
  siteUrl,
  onCopyUrl,
  onDelete,
  canManage = true,
  showDetails: externalShowDetails,
  onToggleDetails,
  userRole
}: ProfileCardProps) {
  const [internalShowDetails, setInternalShowDetails] = useState(false)
  const showDetails = externalShowDetails !== undefined ? externalShowDetails : internalShowDetails
  const profileUrl = `${siteUrl}/${profile.slug}`
  // Only show details toggle if a toggle handler is provided
  const hasDetailsToggle = onToggleDetails !== undefined

  if (!hasDetailsToggle) {
    // Counselee view - simple clickable card
    return (
      <Link href={profileUrl} target="_blank" rel="noopener noreferrer" className="block group">
        <div className="bg-white rounded-lg border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col h-full hover:bg-slate-50">
          {/* Header - Title with Blue Background */}
          <div className="p-4 bg-linear-to-r from-blue-50 to-slate-50">
            <h3 className="text-sm sm:text-base font-semibold text-slate-900 group-hover:text-blue-600 truncate transition-colors">
              {profile.title}
            </h3>
          </div>

          {/* Description */}
          <div className="flex-1 px-4 pt-4 pb-4 bg-white">
            {profile.description && (
              <p className="text-xs sm:text-sm text-slate-600 line-clamp-3">
                {profile.description}
              </p>
            )}
          </div>
        </div>
      </Link>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col h-full">
      {/* Header - Title with Blue Background */}
      <Link href={profileUrl} target="_blank" rel="noopener noreferrer">
        <div className="p-4 bg-linear-to-r from-blue-50 to-slate-50">
          <h3 className="text-sm sm:text-base font-semibold text-slate-900 truncate hover:text-blue-600">
            {profile.title}
          </h3>
        </div>
      </Link>

      {/* Description */}
      <div className={`flex-1 px-4 pt-4 ${hasDetailsToggle ? 'pb-3' : 'pb-4'} bg-white`}>
        {profile.description && (
          <p className="text-xs sm:text-sm text-slate-600 line-clamp-3">
            {profile.description}
          </p>
        )}
      </div>

      {/* Details Toggle Section - Only show if details functionality is enabled */}
      {hasDetailsToggle && (
        <button
          onClick={() => {
            if (onToggleDetails) {
              onToggleDetails()
            } else {
              setInternalShowDetails(!internalShowDetails)
            }
          }}
          className="w-full px-4 py-3 bg-linear-to-r from-blue-50 to-slate-50 hover:from-blue-100 hover:to-slate-100 border-t border-slate-100 transition-colors cursor-pointer flex items-center justify-between"
        >
          <span className="text-xs sm:text-sm font-medium text-slate-700">Details...</span>
          <span className="text-xs text-slate-500">{showDetails ? '▼' : '▶'}</span>
        </button>
      )}

      {/* Expandable Details Section */}
      {showDetails && (
        <div className="px-4 py-3 border-t border-slate-100 space-y-2 text-xs">
          {/* Badges */}
          {(profile.isDefault || profile.isTemplate) && (
            <div className="flex flex-wrap gap-1.5 pb-2 border-b border-slate-100">
              {profile.isDefault && (
                <span className="bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded-full font-medium">
                  Default
                </span>
              )}
              {profile.isTemplate && (
                <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full font-medium">
                  Template
                </span>
              )}
            </div>
          )}

          {/* Metadata */}
          <div className="space-y-2">
            {profile.ownerUsername && (
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Owner:</span>
                <span className="text-slate-700 font-medium truncate">{profile.ownerUsername}</span>
              </div>
            )}
            {userRole !== 'counselee' && profile.usernames && profile.usernames.length > 0 && (
              <div className="flex items-start gap-2">
                <span className="text-slate-500 whitespace-nowrap">Counselees:</span>
                <span className="text-slate-700 font-medium">
                  {profile.usernames.join(', ')}
                </span>
              </div>
            )}
            {profile.visitCount !== undefined && (
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Views:</span>
                <span className="text-slate-700 font-medium">{profile.visitCount}</span>
              </div>
            )}
            {profile.updatedAt && (
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Updated:</span>
                <span className="text-slate-700 font-medium">
                  {new Date(profile.updatedAt).toLocaleDateString()}
                </span>
              </div>
            )}
            {profile.createdAt && (
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Created:</span>
                <span className="text-slate-700 font-medium">
                  {new Date(profile.createdAt).toLocaleDateString()}
                </span>
              </div>
            )}
            {profile.lastVisited ? (
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Last Viewed:</span>
                <span className="text-slate-700 font-medium">
                  {new Date(profile.lastVisited).toLocaleDateString()}
                </span>
              </div>
            ) : profile.visitCount === 0 ? (
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Last Viewed:</span>
                <span className="text-orange-500 font-medium">Never visited</span>
              </div>
            ) : null}
          </div>

          {/* Action Buttons */}
          <div className="pt-3 space-y-2 border-t border-slate-100">
            {canManage && (
              <div className="flex gap-2">
                <Link
                  href={`/admin/profiles/${profile.slug}/content`}
                  className="flex-1 block text-center px-2 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-800 rounded text-xs font-medium transition-colors border border-blue-200 hover:border-blue-300"
                >
                  Edit
                </Link>
                <Link
                  href={`/admin/profiles/${profile.slug}`}
                  className="flex-1 block text-center px-2 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-800 rounded text-xs font-medium transition-colors border border-blue-200 hover:border-blue-300"
                >
                  Settings
                </Link>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => onCopyUrl(profile)}
                className="flex-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium transition-colors border border-slate-300 hover:border-slate-400"
                title={profileUrl}
              >
                Copy URL
              </button>

              {canManage && (
                <button
                  onClick={() => onDelete(profile.slug, profile.title)}
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
