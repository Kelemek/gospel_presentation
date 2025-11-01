'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'
import AdminErrorBoundary from '@/components/AdminErrorBoundary'
import Link from 'next/link'

interface UserProfile {
  id: string
  email: string
  role: 'admin' | 'counselor' | 'counselee'
  created_at: string
  last_sign_in?: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUserRole, setCurrentUserRole] = useState<'admin' | 'counselor' | null>(null)
  const [showNewUserModal, setShowNewUserModal] = useState(false)
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserRole, setNewUserRole] = useState<'admin' | 'counselor' | 'counselee'>('counselor')
  const [isCreatingUser, setIsCreatingUser] = useState(false)

  useEffect(() => {
    loadUsers()
    checkCurrentUserRole()
  }, [])

  const checkCurrentUserRole = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const { data } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        
        setCurrentUserRole((data as any)?.role || null)
      }
    } catch (err) {
      logger.error('Failed to check user role:', err)
    }
  }

  const loadUsers = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const supabase = createClient()
      
      // Get all user profiles (admin only view)
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (profilesError) throw profilesError
      
      // Get auth users data
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      
      if (!currentUser) {
        setError('Not authenticated')
        return
      }
      
      // Map profiles with user data
      // Note: display_name in user_profiles contains the email
      const mappedUsers: UserProfile[] = profiles.map((profile: any) => ({
        id: profile.id,
        email: profile.display_name || 'Unknown',
        role: profile.role,
        created_at: profile.created_at,
        last_sign_in: profile.updated_at
      }))
      
      setUsers(mappedUsers)
    } catch (err: any) {
      logger.error('Failed to load users:', err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'counselor' | 'counselee') => {
    try {
      const supabase = createClient()
      
      const { error } = await supabase
        .from('user_profiles')
        // @ts-expect-error - Supabase type inference issue
        .update({ role: newRole })
        .eq('id', userId)
      
      if (error) throw error
      
      logger.info(`Updated user ${userId} role to ${newRole}`)
      await loadUsers() // Reload users
    } catch (err: any) {
      logger.error('Failed to update user role:', err)
      alert(`Failed to update role: ${err.message}`)
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newUserEmail) {
      alert('Please enter an email address')
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
          role: newUserRole,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create user')
      }

      logger.info('Created new user:', newUserEmail)
      
      // Reset form
      setNewUserEmail('')
      setNewUserRole('counselor')
      setShowNewUserModal(false)
      
      // Reload users
      await loadUsers()
      
      alert(`User ${newUserEmail} created successfully! They will receive a login link via email.`)
    } catch (err: any) {
      logger.error('Failed to create user:', err)
      alert(`Failed to create user: ${err.message}`)
    } finally {
      setIsCreatingUser(false)
    }
  }

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to delete user ${userEmail}? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete user')
      }

      logger.info('Deleted user:', userEmail)
      
      // Reload users
      await loadUsers()
      
      alert(`User ${userEmail} deleted successfully!`)
    } catch (err: any) {
      logger.error('Failed to delete user:', err)
      alert(`Failed to delete user: ${err.message}`)
    }
  }

  // Only admins can access this page
  if (isLoading && currentUserRole === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-8">
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
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <AdminErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2">
                  User Management
                </h1>
                <p className="text-slate-600">
                  Manage user accounts and permissions
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowNewUserModal(true)}
                  className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-700 border border-slate-200 hover:border-slate-300 rounded-lg transition-all duration-200 font-medium shadow-sm hover:shadow-md"
                >
                  + New User
                </button>
                <Link
                  href="/admin"
                  className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-700 border border-slate-200 hover:border-slate-300 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md font-medium"
                >
                  ← Back
                </Link>
              </div>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-6 py-4 rounded-lg shadow-sm">
              <p className="font-semibold">Error</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          )}

          {/* Loading state */}
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600 mx-auto"></div>
              <p className="mt-4 text-slate-600">Loading users...</p>
            </div>
          ) : (
            /* Users table */
            <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                        No users found
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-slate-900">
                            {user.email}
                          </div>
                          <div className="text-xs text-slate-500">
                            ID: {user.id.substring(0, 8)}...
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={user.role}
                            onChange={(e) => handleRoleChange(user.id, e.target.value as 'admin' | 'counselor' | 'counselee')}
                            className="px-3 py-1 text-sm border border-slate-200 hover:border-slate-300 focus:border-slate-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200 bg-white text-slate-900 shadow-sm transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem] bg-[right_0.5rem_center] bg-no-repeat pr-10"
                          >
                            <option value="admin">Admin</option>
                            <option value="counselor">Counselor</option>
                            <option value="counselee">Counselee</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => handleDeleteUser(user.id, user.email)}
                            className="text-slate-600 hover:text-slate-800 font-medium transition-colors"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Info box */}
          <div className="mt-8 bg-blue-50 border border-blue-200 text-blue-900 px-6 py-4 rounded-lg shadow-sm">
            <p className="font-semibold mb-2">User Roles</p>
            <ul className="text-sm space-y-1">
              <li><strong>Admin:</strong> Full access to all profiles and settings</li>
              <li><strong>Counselor:</strong> Can create, edit, and delete their own profiles, and grant counselee access</li>
              <li><strong>Counselee:</strong> View-only access to profiles they've been granted access to</li>
            </ul>
          </div>

          {/* New User Modal */}
          {showNewUserModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                <h2 className="text-2xl font-bold text-slate-900 mb-4">
                  Create New User
                </h2>
                
                <form onSubmit={handleCreateUser}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Email
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
                        Role
                      </label>
                      <select
                        value={newUserRole}
                        onChange={(e) => setNewUserRole(e.target.value as 'admin' | 'counselor' | 'counselee')}
                        className="w-full px-3 py-2 border border-slate-200 hover:border-slate-300 focus:border-slate-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200 bg-white text-slate-900 shadow-sm transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem] bg-[right_0.5rem_center] bg-no-repeat pr-10"
                      >
                        <option value="counselor">Counselor</option>
                        <option value="counselee">Counselee</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
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
                        setNewUserRole('counselor')
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
