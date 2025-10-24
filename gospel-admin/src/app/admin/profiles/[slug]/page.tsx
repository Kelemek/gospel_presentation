'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { GospelProfile } from '@/lib/types'
import AdminLogin from '@/components/AdminLogin'
import AdminHeader from '@/components/AdminHeader'
import { isAuthenticated } from '@/lib/auth'

interface ProfileEditPageProps {
  params: Promise<{
    slug: string
  }>
}

export default function ProfileEditPage({ params }: ProfileEditPageProps) {
  const router = useRouter()
  const [slug, setSlug] = useState<string>('')
  const [profile, setProfile] = useState<GospelProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [isAuth, setIsAuth] = useState(false)
  const [editForm, setEditForm] = useState({
    title: '',
    description: ''
  })

  // Check authentication on mount
  useEffect(() => {
    setIsAuth(isAuthenticated())
    setIsLoading(false)
  }, [])

  // Resolve params Promise
  useEffect(() => {
    params.then(resolvedParams => {
      setSlug(resolvedParams.slug)
    })
  }, [params])

  useEffect(() => {
    if (slug && isAuth) {
      fetchProfile()
    }
  }, [slug, isAuth])

  const fetchProfile = async () => {
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
    } catch (err) {
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
        // Successfully saved, redirect back to admin dashboard
        router.push('/admin')
      } else {
        const errorData = await response.json().catch(() => ({}))
        setError(errorData.error || 'Failed to save profile')
      }
    } catch (err) {
      setError('Failed to save profile')
    } finally {
      setIsSaving(false)
    }
  }

  const handleLogin = () => {
    setIsAuth(true)
  }

  if (!isAuth) {
    return <AdminLogin onLogin={handleLogin} />
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
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
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <AdminHeader
          title={profile ? `${profile.title}` : "Profile Settings"}
          description={profile?.description || "Configure profile settings and information"}
          currentProfileSlug={slug}
          showProfileSwitcher={true}
          actions={
            <Link
              href="/admin"
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              ← Back to Dashboard
            </Link>
          }
        />

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="text-red-800">{error}</div>
          </div>
        )}

        {/* Profile Info Card */}
        <div className="bg-white border border-slate-200 rounded-lg p-6 mb-6 shadow-lg">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Profile Information</h2>
          
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label htmlFor="slug" className="block text-sm font-medium text-slate-700 mb-1">
                URL Slug
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
                URL slug cannot be changed after profile creation
              </p>
            </div>

            <div>
              <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-1">
                Profile Title *
              </label>
              <input
                type="text"
                id="title"
                value={editForm.title}
                onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 bg-white"
                placeholder="e.g., Mark Larson's Gospel Presentation"
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
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 bg-white"
                placeholder="Optional description of this profile's purpose"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                type="submit"
                disabled={isSaving}
                className="border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100 px-4 sm:px-6 py-2 rounded-lg transition-colors font-medium disabled:opacity-50 flex-1 sm:flex-none"
              >
                {isSaving ? (
                  <>
                    <span className="hidden sm:inline">Saving...</span>
                    <span className="sm:hidden">Saving</span>
                  </>
                ) : (
                  <>
                    <span className="hidden sm:inline">Save Changes</span>
                    <span className="sm:hidden">Save</span>
                  </>
                )}
              </button>
              <Link
                href="/admin"
                className="border border-slate-300 text-slate-600 bg-slate-50 hover:bg-slate-100 px-4 sm:px-6 py-2 rounded-lg transition-colors text-center flex-1 sm:flex-none"
              >
                <span className="hidden sm:inline">Cancel</span>
                <span className="sm:hidden">✕</span>
              </Link>
            </div>
          </form>
        </div>

        {/* Profile Stats */}
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
              
              <Link
                href={`/admin/profiles/${slug}/content`}
                className="border border-green-300 text-green-700 bg-green-50 hover:bg-green-100 px-4 py-2 rounded-lg transition-colors text-sm font-medium"
              >
                Edit Content
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}