'use client'

import React, { useEffect, useLayoutEffect } from 'react'
import { useRouter, notFound } from 'next/navigation'
import ProfileContent from './ProfileContent'
import { useProfileWithCache } from '@/lib/useProfileWithCache'
import { createClient } from '@/lib/supabase/client'
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext'

interface ProfilePageClientProps {
  slug: string
}

function extractFavoriteScriptures(gospelData: any[]): string[] {
  const favorites: string[] = []
  gospelData?.forEach((section: any) => {
    section.subsections?.forEach((subsection: any) => {
      subsection.scriptureReferences?.forEach((ref: any) => {
        if (ref.favorite) favorites.push(ref.reference)
      })
      subsection.nestedSubsections?.forEach((nested: any) => {
        nested.scriptureReferences?.forEach((ref: any) => {
          if (ref.favorite) favorites.push(ref.reference)
        })
      })
    })
  })
  return favorites
}

export default function ProfilePageClient({ slug }: ProfilePageClientProps) {
  const router = useRouter()
  const { profile, isLoading, error } = useProfileWithCache(slug)

  // When profile is null after loading, check auth and redirect or 404
  useEffect(() => {
    if (isLoading || profile) return
    const run = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace(`/login?redirect=/${slug}`)
      } else {
        notFound()
      }
    }
    run()
  }, [profile, isLoading, slug, router])

  if (isLoading) {
    return (
      <ThemeProvider>
        <ProfileThemeWrapper>
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-600 dark:border-slate-400 mx-auto mb-4" />
              <p className="text-slate-600 dark:text-slate-300">Loading...</p>
            </div>
          </div>
        </ProfileThemeWrapper>
      </ThemeProvider>
    )
  }

  if (error || !profile) {
    return null // Redirect effect will run
  }

  const { gospelData } = profile
  const favoriteScriptures = extractFavoriteScriptures(gospelData || [])

  return (
    <ThemeProvider>
      <ProfileThemeWrapper>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <header className="bg-linear-to-br from-slate-700 to-slate-800 text-white text-center py-5 shadow-lg">
            <div className="container mx-auto px-5">
              <h1 className="text-4xl md:text-5xl font-bold mb-1">
                The Gospel Presentation
              </h1>
            </div>
          </header>

          <ProfileContent
            sections={gospelData || []}
            profileInfo={{
              title: profile.title,
              description: profile.description,
              slug,
              favoriteScriptures,
              savedAnswers: profile.savedAnswers
            }}
            profile={profile}
          />
        </div>
      </ProfileThemeWrapper>
    </ThemeProvider>
  )
}

const BODY_DARK_CLASS = 'profile-dark'

function ProfileThemeWrapper({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme()

  useLayoutEffect(() => {
    if (theme === 'dark') {
      document.body.classList.add(BODY_DARK_CLASS)
    } else {
      document.body.classList.remove(BODY_DARK_CLASS)
    }
    return () => document.body.classList.remove(BODY_DARK_CLASS)
  }, [theme])

  return <div className={theme === 'dark' ? 'dark' : ''}>{children}</div>
}
