'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { GospelProfile } from '@/lib/types'
import AdminHeader from '@/components/AdminHeader'
import { createClient } from '@/lib/supabase/client'
import { useAlertModal } from '@/contexts/AlertModalContext'

export interface ProfileEditPageProps {
  slug: string
}

export function ProfileEditPage({ slug }: ProfileEditPageProps) {
  const router = useRouter()
  const [profile, setProfile] = useState<GospelProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [isAuth, setIsAuth] = useState(false)
  const [editForm, setEditForm] = useState({
    title: '',
    description: ''
  })
  const [isBackingUp, setIsBackingUp] = useState(false)
  const [isRestoringBackup, setIsRestoringBackup] = useState(false)
  const { showAlert, showConfirm } = useAlertModal()

  // Check authentication on mount
  useEffect(() => {
    checkAuth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const checkAuth = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    setIsAuth(!!user)
    if (!user) {
      router.push('/login')
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (slug && isAuth) {
      void fetchProfile()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, isAuth])

  const fetchProfile = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/profiles/${slug}`)
      if (response.ok) {
        const data = await response.json()
        setProfile(data.profile)
        setEditForm({
          title: data.profile.title,
          description: data.profile.description || ''
        })
      } else if (response.status === 404) {
        setError('Profile not found')
      } else {
        setError('Failed to load profile')
      }
    } catch {
      setError('Failed to load profile')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return

    setIsSaving(true)
    setError('')

    try {
      const response = await fetch(`/api/profiles/${slug}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: editForm.title,
          description: editForm.description
        })
      })

      if (response.ok) {
        router.push('/admin')
      } else {
        const errorData = await response.json().catch(() => ({}))
        setError(errorData.error || 'Failed to save profile')
      }
    } catch {
      setError('Failed to save profile')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDownloadBackup = async () => {
    if (!profile) return

    try {
      setError('')
      setIsBackingUp(true)

      const response = await fetch(`/api/profiles/${slug}`)
      if (!response.ok) {
        throw new Error('Failed to fetch profile data')
      }

      const data = await response.json()
      const fullProfile = data.profile

      const backupData = {
        profile: {
          id: fullProfile.id,
          slug: fullProfile.slug,
          title: fullProfile.title,
          description: fullProfile.description,
          isDefault: fullProfile.isDefault,
          visitCount: fullProfile.visitCount,
          createdAt: fullProfile.createdAt,
          updatedAt: fullProfile.updatedAt,
          lastVisited: fullProfile.lastVisited,
          lastViewedScripture: fullProfile.lastViewedScripture,
          gospelData: fullProfile.gospelData
        },
        backup: {
          exportedAt: new Date().toISOString(),
          exportedBy: 'Gospel Presentation Admin',
          version: '1.0'
        }
      }

      const dataStr = JSON.stringify(backupData, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })

      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `gospel-profile-${profile.slug}-backup-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to download backup'
      setError(`Backup failed: ${errorMessage}`)
      showAlert(`Backup failed: ${errorMessage}`)
    } finally {
      setIsBackingUp(false)
    }
  }

  const handleRestoreBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !profile) return

    const confirmed = await showConfirm(`Are you sure you want to restore "${profile.title}" from "${file.name}"? This will replace all current content and cannot be undone.`)
    if (!confirmed) {
      event.target.value = ''
      return
    }

    try {
      setError('')
      setIsRestoringBackup(true)
      const fileContent = await file.text()
      const backupData = JSON.parse(fileContent)

      let dataToRestore
      if (backupData.profile) {
        dataToRestore = {
          title: backupData.profile.title,
          description: backupData.profile.description,
          gospelData: backupData.profile.gospelData,
          lastViewedScripture: backupData.profile.lastViewedScripture
        }
      } else if (backupData.gospelData) {
        dataToRestore = {
          gospelData: backupData.gospelData
        }
      } else {
        throw new Error('Invalid backup file format: missing profile or gospelData')
      }

      if (!dataToRestore.gospelData || !Array.isArray(dataToRestore.gospelData)) {
        throw new Error('Invalid backup file format: gospelData must be an array')
      }

      const response = await fetch(`/api/profiles/${slug}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToRestore)
      })

      if (response.ok) {
        await fetchProfile()
        showAlert(`Successfully restored content for "${profile.title}" from "${file.name}"!`)
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to save restored content')
      }
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to restore backup'
      setError(`Restore failed: ${errorMessage}`)
      showAlert(`Restore failed: ${errorMessage}`)
    } finally {
      setIsRestoringBackup(false)
      event.target.value = ''
    }
  }

  if (!isAuth || isLoading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (error && !profile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
            <div className="text-red-600 text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <Link
              href="/admin"
              className="bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-700 border border-slate-200 hover:border-slate-300 px-4 py-2 rounded-lg transition-colors"
            >
              Back
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-blue-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <AdminHeader
          title={profile ? profile.title : 'Profile Settings'}
          description={profile?.description || 'Configure profile settings and information'}
          actions={
            <Link
              href="/admin"
              className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-700 border border-slate-200 hover:border-slate-300 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md font-medium"
            >
              ← Back
            </Link>
          }
        />

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="text-red-800">{error}</div>
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-lg p-6 mb-6 shadow-lg">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Resource Information</h2>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label htmlFor="slug" className="block text-sm font-medium text-slate-700 mb-1">
                URL
              </label>
              <div className="flex">
                <span className="inline-flex items-center px-3 py-2 rounded-l-lg border border-r-0 border-slate-300 bg-slate-50 text-slate-500 text-sm">
                  yoursite.com/
                </span>
                <input
                  type="text"
                  id="slug"
                  value={slug}
                  disabled
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-r-lg bg-slate-50 text-slate-500 cursor-not-allowed"
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                URL cannot be changed after profile creation
              </p>
            </div>

            <div>
              <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-1">
                Title *
              </label>
              <input
                id="title"
                type="text"
                value={editForm.title}
                onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Mark Larson's Gospel Presentation"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                value={editForm.description}
                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description of this profile's purpose"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[100px]"
                rows={4}
              />
            </div>

            <div className="flex flex-row flex-wrap gap-3 pt-4">
              <button
                type="submit"
                disabled={isSaving}
                className="border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-700 bg-white hover:bg-slate-50 px-4 sm:px-6 py-2 rounded-lg transition-all duration-200 font-medium disabled:opacity-50 inline-flex items-center justify-center shadow-sm hover:shadow-md"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
              <Link
                href="/admin"
                className="border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-700 bg-white hover:bg-slate-50 px-4 sm:px-6 py-2 rounded-lg transition-all duration-200 text-center inline-flex items-center justify-center shadow-sm hover:shadow-md"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>

        {profile && (
          <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Profile Statistics</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-slate-500">Visits:</span>
                <span className="ml-2 font-medium">{profile.visitCount}</span>
              </div>
              <div>
                <span className="text-slate-500">Created:</span>
                <span className="ml-2 font-medium">{new Date(profile.createdAt).toLocaleDateString()}</span>
              </div>
              <div>
                <span className="text-slate-500">Last Updated:</span>
                <span className="ml-2 font-medium">{new Date(profile.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between">
              <Link
                href={`/${slug}`}
                target="_blank"
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                View Live Profile →
              </Link>
            </div>
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-lg">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Backup & Restore</h2>
          <p className="text-sm text-slate-600 mb-4">Download a backup of this profile or restore from a previously saved backup file.</p>

          <div className="flex gap-3">
            <button
              onClick={handleDownloadBackup}
              disabled={isBackingUp}
              className="flex-1 px-4 py-2 bg-green-50 hover:bg-green-100 text-green-700 hover:text-green-800 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md border border-green-200 hover:border-green-300"
            >
              {isBackingUp ? 'Downloading...' : 'Download Backup'}
            </button>
            <label className="flex-1 px-4 py-2 bg-green-50 hover:bg-green-100 text-green-700 hover:text-green-800 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 cursor-pointer text-center shadow-sm hover:shadow-md border border-green-200 hover:border-green-300 whitespace-nowrap">
              {isRestoringBackup ? 'Restoring...' : 'Restore Backup'}
              <input
                type="file"
                accept=".json"
                onChange={handleRestoreBackup}
                disabled={isRestoringBackup}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProfileEditPage
