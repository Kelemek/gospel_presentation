'use client'

import Link from 'next/link'

interface ProfileCardProps {
  profile: any
  siteUrl: string
  onCopyUrl: (profile: any) => void
  onDownloadBackup: (profile: any) => void
  onRestoreBackup: (profile: any, event: React.ChangeEvent<HTMLInputElement>) => void
  onDelete: (slug: string, title: string) => void
  canManage?: boolean
}

/**
 * Card view component for displaying a profile in a grid layout.
 */
export default function ProfileCard({
  profile,
  siteUrl,
  onCopyUrl,
  onDownloadBackup,
  onRestoreBackup,
  onDelete,
  canManage = true
}: ProfileCardProps) {
  const profileUrl = `${siteUrl}/${profile.slug}`

  return (
    <div className="bg-white rounded-lg border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col h-full">
      {/* Header - Clickable to view profile */}
      <Link href={profileUrl} target="_blank" rel="noopener noreferrer">
        <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-slate-50 hover:from-blue-100 hover:to-slate-100 transition-colors cursor-pointer">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm sm:text-base font-semibold text-slate-900 truncate hover:text-blue-600">
                {profile.title}
              </h3>
              <p className="text-xs text-slate-500 mt-1 truncate">{profile.slug}</p>
            </div>
          </div>
          
          {/* Badges */}
          <div className="flex flex-wrap gap-1.5 mt-2">
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
        </div>
      </Link>

      {/* Content */}
      <div className="flex-1 p-4">
        {profile.description && (
          <p className="text-xs sm:text-sm text-slate-600 line-clamp-3 mb-3">
            {profile.description}
          </p>
        )}

        {/* Metadata */}
        <div className="space-y-2 text-xs">
          {profile.ownerDisplayName && (
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Owner:</span>
              <span className="text-slate-700 font-medium truncate">{profile.ownerDisplayName}</span>
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
        </div>
      </div>

      {/* Footer Actions */}
      <div className="border-t border-slate-100 p-3 bg-slate-50 space-y-2">
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

        <button
          onClick={() => onCopyUrl(profile)}
          className="w-full px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium transition-colors border border-slate-300 hover:border-slate-400"
          title={profileUrl}
        >
          Copy URL
        </button>

        {canManage && (
          <>
            <div className="flex gap-2">
              <button
                onClick={() => onDownloadBackup(profile)}
                className="flex-1 px-2 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 hover:text-green-800 rounded text-xs font-medium transition-colors border border-green-200 hover:border-green-300"
              >
                Backup
              </button>
              <label className="flex-1 px-2 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 hover:text-green-800 rounded text-xs font-medium transition-colors cursor-pointer text-center border border-green-200 hover:border-green-300">
                Restore
                <input
                  type="file"
                  accept=".json"
                  onChange={(e) => onRestoreBackup(profile, e)}
                  className="hidden"
                />
              </label>
            </div>

            <button
              onClick={() => onDelete(profile.slug, profile.title)}
              className="w-full px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 hover:text-red-800 rounded text-xs font-medium transition-colors border border-red-200 hover:border-red-300"
            >
              Delete
            </button>
          </>
        )}
      </div>
    </div>
  )
}
