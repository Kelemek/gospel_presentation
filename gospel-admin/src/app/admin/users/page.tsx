'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'
import AdminErrorBoundary from '@/components/AdminErrorBoundary'
import Link from 'next/link'
import { useAlertModal } from '@/contexts/AlertModalContext'

interface UserProfile {
  id: string
  email: string
  username?: string
  role: string | null
  created_at: string
  last_sign_in?: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)
  const [showNewUserModal, setShowNewUserModal] = useState(false)
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserName, setNewUserName] = useState('')
  const [isCreatingUser, setIsCreatingUser] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const { showAlert, showConfirm } = useAlertModal()

  const checkCurrentUserRole = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        setCurrentUserRole((data as { role?: string } | null)?.role ?? null)
      }
    } catch (err) {
      logger.error('Failed to check user role:', err)
    }
  }, [])

  const loadUsers = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const supabase = createClient()

      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('*')
        .order('display_name', { ascending: true })

      if (profilesError) throw profilesError

      const { data: { user: currentUser } } = await supabase.auth.getUser()

      if (!currentUser) {
        setError('Not authenticated')
        return
      }

      const mappedUsers: UserProfile[] = (profiles || []).map((profile: Record<string, unknown>) => {
        const raw = profile.role
        const role =
          raw != null && String(raw).trim() !== '' ? String(raw).trim() : null
        return {
          id: profile.id as string,
          email: (profile.display_name as string) || 'Unknown',
          username: profile.username as string | undefined,
          role,
          created_at: profile.created_at as string,
          last_sign_in: profile.updated_at as string | undefined,
        }
      })

      setUsers(mappedUsers)
    } catch (err: unknown) {
      logger.error('Failed to load users:', err)
      setError(err instanceof Error ? err.message : 'Failed to load users')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      await Promise.resolve()
      if (cancelled) return
      await loadUsers()
    })()
    void (async () => {
      await Promise.resolve()
      if (cancelled) return
      await checkCurrentUserRole()
    })()
    return () => {
      cancelled = true
    }
  }, [loadUsers, checkCurrentUserRole])

  const handlePromoteToAdmin = async (userId: string) => {
    try {
      const supabase = createClient()

      const { error } = await supabase
        .from('user_profiles')
        // @ts-expect-error - Supabase type inference issue
        .update({ role: 'admin' })
        .eq('id', userId)

      if (error) throw error

      logger.info(`Updated user ${userId} role to admin`)
      await loadUsers()
    } catch (err: unknown) {
      logger.error('Failed to update user role:', err)
      showAlert(`Failed to update role: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newUserEmail) {
      showAlert('Please enter an email address')
      return
    }

    if (!newUserName.trim()) {
      showAlert('Please enter a name')
      return
    }

    setIsCreatingUser(true)

    try {
      const response = await fetch('/api/users/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: newUserEmail,
          username: newUserName.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create user')
      }

      logger.info('Created new user:', newUserEmail)

      setNewUserEmail('')
      setNewUserName('')
      setShowNewUserModal(false)

      await loadUsers()

      showAlert(`User ${newUserEmail} created successfully! They will receive a login link via email.`)
    } catch (err: unknown) {
      logger.error('Failed to create user:', err)
      showAlert(`Failed to create user: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setIsCreatingUser(false)
    }
  }

  const filteredUsers = users.filter((user) => {
    if (!searchQuery.trim()) return true

    const query = searchQuery.toLowerCase()
    return (
      user.email.toLowerCase().includes(query) ||
      (user.username && user.username.toLowerCase().includes(query)) ||
      (user.role && user.role.toLowerCase().includes(query))
    )
  })

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    const confirmed = await showConfirm(`Are you sure you want to delete user ${userEmail}? This action cannot be undone.`)
    if (!confirmed) return

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete user')
      }

      logger.info('Deleted user:', userEmail)

      await loadUsers()

      showAlert(`User ${userEmail} deleted successfully!`)
    } catch (err: unknown) {
      logger.error('Failed to delete user:', err)
      showAlert(`Failed to delete user: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const handleUpdateUsername = async (userId: string, newName: string) => {
    try {
      const supabase = createClient()

      const { error } = await supabase
        .from('user_profiles')
        // @ts-expect-error - Supabase type inference issue
        .update({ username: newName || null })
        .eq('id', userId)

      if (error) throw error

      logger.info(`Updated name for user ${userId}`)
      setEditingUserId(null)
      await loadUsers()
    } catch (err: unknown) {
      logger.error('Failed to update name:', err)
      showAlert(`Failed to update name: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  if (isLoading && currentUserRole === null) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 p-4 sm:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-xl shadow-md border border-slate-100 p-8">
            <div className="flex items-center justify-center">
              <div className="animate-pulse text-slate-600">Loading...</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (currentUserRole !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200 px-6 py-4 rounded-lg">
            <p className="font-semibold">Access Denied</p>
            <p className="text-sm mt-1">Only administrators can manage users.</p>
            <Link href="/admin" className="text-sm underline mt-2 inline-block">
              ← Back
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <AdminErrorBoundary>
      <div className="min-h-screen bg-linear-to-br from-slate-50 to-blue-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2">
                  User Management
                </h1>
                <p className="text-slate-600">
                  Manage staff accounts (admin role)
                </p>
              </div>
              <div className="flex gap-3">
                <Link
                  href="/admin"
                  className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-700 border border-slate-200 hover:border-slate-300 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md font-medium"
                >
                  ← Back
                </Link>
                <button
                  type="button"
                  onClick={() => setShowNewUserModal(true)}
                  className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-700 border border-slate-200 hover:border-slate-300 rounded-lg transition-all duration-200 font-medium shadow-sm hover:shadow-md cursor-pointer"
                >
                  + New User
                </button>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <div className="relative max-w-xl">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by email or username..."
                className="w-full px-4 py-2 pl-10 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 text-sm text-slate-900 placeholder-slate-400"
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-6 py-4 rounded-lg shadow-sm">
              <p className="font-semibold">Error</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600 mx-auto"></div>
              <p className="mt-4 text-slate-600">Loading users...</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-lg border border-slate-200 p-4">
              {filteredUsers.length === 0 ? (
                <div className="p-6 text-center text-slate-500">
                  {searchQuery ? 'No users found matching your search' : 'No users found'}
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredUsers.map((user) => (
                    <div key={user.id} className="group rounded-md border border-slate-200 p-4 flex flex-col gap-2 hover:shadow-sm hover:border-slate-300 transition">
                      <div className="text-sm font-semibold text-slate-900 break-all leading-tight">{user.email}</div>
                      {editingUserId === user.id ? (
                        <div className="flex gap-2 items-start">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="flex-1 px-2 py-1 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-200"
                            autoFocus
                            placeholder="Username"
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateUsername(user.id, editingName)}
                            className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingUserId(null)}
                            className="text-slate-600 hover:text-slate-800 text-xs font-medium"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-700 truncate max-w-[70%]" title={user.username || user.email}>
                            {user.username || user.email}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingUserId(user.id)
                              setEditingName(user.username || '')
                            }}
                            className="opacity-0 group-hover:opacity-100 text-amber-500 hover:text-amber-700 text-xs ml-2"
                          >
                            ✎
                          </button>
                        </div>
                      )}
                      <div className="flex items-center gap-3 flex-wrap justify-between">
                        <div className="text-[11px] text-slate-500 flex items-center">
                          <span className="hidden lg:inline mr-1">Created:</span>
                          {new Date(user.created_at).toLocaleDateString()}
                        </div>
                        {user.role !== 'admin' && (
                          <button
                            type="button"
                            onClick={() => handlePromoteToAdmin(user.id)}
                            className="text-xs font-medium px-2 py-1 rounded-md border border-slate-200 hover:border-slate-300 bg-white text-slate-700"
                          >
                            Make admin
                          </button>
                        )}
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(user.id, user.email)}
                          className="text-red-700 hover:text-red-800 text-xs font-medium bg-red-50 hover:bg-red-100 px-3 py-1 rounded-md border border-red-200 hover:border-red-300 transition shadow-sm hover:shadow-md"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="mt-8 bg-blue-50 border border-blue-200 text-blue-900 px-6 py-4 rounded-lg shadow-sm">
            <p className="font-semibold mb-2">Staff access</p>
            <p className="text-sm">
              New accounts are created as <strong>admin</strong> (full access to templates, profiles, and settings). Use{' '}
              <strong>Make admin</strong> if an older account still shows a non-admin role after a database migration.
            </p>
          </div>

          {showNewUserModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                <h2 className="text-2xl font-bold text-slate-900 mb-4">
                  Create New User
                </h2>

                <form onSubmit={handleCreateUser}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Email *
                      </label>
                      <input
                        type="email"
                        value={newUserEmail}
                        onChange={(e) => setNewUserEmail(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-slate-900"
                        placeholder="user@example.com"
                        required
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        User will receive a login link via email
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Username *
                      </label>
                      <input
                        type="text"
                        value={newUserName}
                        onChange={(e) => setNewUserName(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-slate-900"
                        placeholder="e.g., John Smith"
                        required
                      />
                    </div>

                    <p className="text-sm text-slate-600">New users are created with the <strong>admin</strong> role.</p>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      type="submit"
                      disabled={isCreatingUser}
                      className="flex-1 px-4 py-2 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-700 border border-slate-200 hover:border-slate-300 disabled:opacity-50 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md font-medium"
                    >
                      {isCreatingUser ? 'Creating...' : 'Create User'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewUserModal(false)
                        setNewUserEmail('')
                        setNewUserName('')
                      }}
                      className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-700 border border-slate-200 hover:border-slate-300 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminErrorBoundary>
  )
}
