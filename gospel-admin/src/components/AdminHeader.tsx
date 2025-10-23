'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'

interface ProfileOption {
  slug: string
  title: string
  isDefault: boolean
}

interface AdminHeaderProps {
  title: string
  description: string
  currentProfileSlug?: string
  showProfileSwitcher?: boolean
  actions?: React.ReactNode
}

export default function AdminHeader({ 
  title, 
  description, 
  currentProfileSlug, 
  showProfileSwitcher = false,
  actions 
}: AdminHeaderProps) {
  const [profiles, setProfiles] = useState<ProfileOption[]>([])
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (showProfileSwitcher) {
      fetchProfiles()
    }
  }, [showProfileSwitcher])

  const fetchProfiles = async () => {
    try {
      const response = await fetch('/api/profiles')
      if (response.ok) {
        const data = await response.json()
        setProfiles(data.profiles.map((p: any) => ({
          slug: p.slug,
          title: p.title,
          isDefault: p.isDefault
        })))
      }
    } catch (error) {
      console.error('Error fetching profiles:', error)
    }
  }

  const handleProfileSwitch = (targetSlug: string) => {
    if (targetSlug === currentProfileSlug) {
      setIsDropdownOpen(false)
      return
    }

    setIsLoading(true)
    
    // Determine the target path based on current location
    let targetPath = '/admin'
    
    if (pathname.includes('/admin/profiles/')) {
      if (pathname.includes('/content')) {
        targetPath = `/admin/profiles/${targetSlug}/content`
      } else if (pathname.match(/\/admin\/profiles\/[^\/]+\/?$/)) {
        targetPath = `/admin/profiles/${targetSlug}`
      }
    }
    
    router.push(targetPath)
    setIsDropdownOpen(false)
    setIsLoading(false)
  }

  const getCurrentProfile = () => {
    if (!currentProfileSlug) return null
    return profiles.find(p => p.slug === currentProfileSlug)
  }

  const currentProfile = getCurrentProfile()

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-4 mb-2">
            <h1 className="text-2xl font-bold text-slate-800">
              {title}
            </h1>
            
            {/* Profile Switcher */}
            {showProfileSwitcher && profiles.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-sm font-medium transition-colors"
                  disabled={isLoading}
                >
                  <span className="text-xs">👤</span>
                  <span>
                    {currentProfile ? currentProfile.title : 'Select Profile'}
                    {currentProfile?.isDefault && ' (Default)'}
                  </span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <>
                    {/* Overlay */}
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setIsDropdownOpen(false)}
                    />
                    
                    {/* Dropdown */}
                    <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                      <div className="p-2">
                        <div className="text-xs font-medium text-gray-500 px-2 py-1 mb-1">
                          Switch Profile
                        </div>
                        {profiles.map((profile) => (
                          <button
                            key={profile.slug}
                            onClick={() => handleProfileSwitch(profile.slug)}
                            className={`w-full text-left px-2 py-2 rounded text-sm transition-colors ${
                              profile.slug === currentProfileSlug
                                ? 'bg-blue-50 text-blue-700 font-medium'
                                : 'hover:bg-gray-50 text-gray-700'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span>{profile.title}</span>
                              <div className="flex items-center gap-1">
                                {profile.isDefault && (
                                  <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                                    Default
                                  </span>
                                )}
                                {profile.slug === currentProfileSlug && (
                                  <span className="text-blue-600">✓</span>
                                )}
                              </div>
                            </div>
                          </button>
                        ))}
                        
                        {/* Quick Links */}
                        <div className="border-t border-gray-100 mt-2 pt-2">
                          <Link
                            href="/admin"
                            className="block w-full text-left px-2 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded transition-colors"
                            onClick={() => setIsDropdownOpen(false)}
                          >
                            <span className="flex items-center gap-2">
                              <span>🏠</span>
                              Dashboard
                            </span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
          
          <p className="text-slate-600">
            {description}
          </p>
          
          {/* Profile Context Info */}
          {currentProfile && (
            <div className="mt-3 flex items-center gap-4 text-sm">
              <span className="text-gray-500">Editing:</span>
              <Link
                href={`/${currentProfile.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                /{currentProfile.slug} ↗
              </Link>
              <Link
                href={`/admin/profiles/${currentProfile.slug}`}
                className="text-gray-600 hover:text-gray-800"
              >
                Profile Settings
              </Link>
              <Link
                href={`/admin/profiles/${currentProfile.slug}/content`}
                className="text-gray-600 hover:text-gray-800"
              >
                Edit Content
              </Link>
            </div>
          )}
        </div>

        {/* Actions */}
        {actions && (
          <div className="flex items-center gap-3 ml-4">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}