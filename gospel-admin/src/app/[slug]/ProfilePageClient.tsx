'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, notFound } from 'next/navigation'
import ProfileContent from './ProfileContent'
import { useProfileWithCache } from '@/lib/useProfileWithCache'
import { createClient } from '@/lib/supabase/client'
import type { GospelProfile } from '@/lib/types'
import { isProfileResourceTabNavigationPending } from '@/lib/profileResourceTabNavigation'
import { attemptCapacitorRecoveryReload } from '@/lib/capacitorAppRecovery'
import {
  tryStartMarriageSeminarTourAfterNavigation,
  tryStartMemorizeTourAfterNavigation,
  tryStartScriptureReaderTourAfterNavigation,
  tryStartWordStudyTourAfterNavigation,
} from '@/lib/profileHelpTours'

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

type ProfilePageBodyProps = {
  slug: string
  profile: GospelProfile
}

function ProfilePageBody({
  slug,
  profile,
  profileLoadSettled,
}: ProfilePageBodyProps & { profileLoadSettled: boolean }) {
  const hideSiteHeaderForTabNav = isProfileResourceTabNavigationPending(slug)
  const [readingResumeRevealed, setReadingResumeRevealed] = useState(!hideSiteHeaderForTabNav)
  const siteHeaderHidden = hideSiteHeaderForTabNav && !readingResumeRevealed

  const handleReadingResumeSettled = useCallback(() => {
    setReadingResumeRevealed(true)
  }, [])

  useEffect(() => {
    if (!hideSiteHeaderForTabNav || readingResumeRevealed) return
    const timeoutId = window.setTimeout(() => setReadingResumeRevealed(true), 2500)
    return () => window.clearTimeout(timeoutId)
  }, [hideSiteHeaderForTabNav, readingResumeRevealed, slug])

  const { gospelData } = profile
  const favoriteScriptures = extractFavoriteScriptures(gospelData || [])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900" data-gospel-surface>
      {!siteHeaderHidden ? (
        <header
          data-profile-site-header
          className="bg-linear-to-br from-slate-700 to-slate-800 text-white text-center py-5 shadow-lg"
        >
          <div className="container mx-auto px-5">
            <h1 className="text-4xl md:text-5xl font-bold mb-1">
              The Gospel Presentation
            </h1>
          </div>
        </header>
      ) : null}

      <ProfileContent
        sections={gospelData || []}
        profileInfo={{
          title: profile.title,
          description: profile.description,
          slug,
          favoriteScriptures,
          savedAnswers: profile.savedAnswers,
        }}
        profile={profile}
        allowVisitTracking={profileLoadSettled}
        onReadingResumeSettled={handleReadingResumeSettled}
      />
    </div>
  )
}

function ProfileLoadingSurface({ message }: { message: string }) {
  return (
    <div
      className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center"
      data-gospel-surface
    >
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-600 dark:border-slate-400 mx-auto mb-4" />
        <p className="text-slate-600 dark:text-slate-300">{message}</p>
      </div>
    </div>
  )
}

export default function ProfilePageClient({ slug }: ProfilePageClientProps) {
  const router = useRouter()
  const { profile, isLoading, error, profileLoadSettled, refresh } = useProfileWithCache(slug)
  const profileRefreshAttemptedRef = useRef(false)
  const profileRecoveryReloadAttemptedRef = useRef(false)

  const showLoadingSpinner = isLoading || !profileLoadSettled

  useEffect(() => {
    profileRefreshAttemptedRef.current = false
    profileRecoveryReloadAttemptedRef.current = false
  }, [slug])

  useEffect(() => {
    if (profile) {
      profileRefreshAttemptedRef.current = false
      profileRecoveryReloadAttemptedRef.current = false
      return
    }

    if (!error || !profileLoadSettled) return

    if (!profileRefreshAttemptedRef.current) {
      profileRefreshAttemptedRef.current = true
      void refresh()
      return
    }

    if (profileRecoveryReloadAttemptedRef.current) return

    profileRecoveryReloadAttemptedRef.current = true
    attemptCapacitorRecoveryReload('profile-load-failed')
  }, [error, profile, profileLoadSettled, refresh])

  useEffect(() => {
    if (isLoading || !profileLoadSettled || profile || error) return
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
  }, [profile, isLoading, profileLoadSettled, error, slug, router])

  useEffect(() => {
    if (!profile) return
    tryStartScriptureReaderTourAfterNavigation(slug)
    tryStartWordStudyTourAfterNavigation(slug)
    tryStartMemorizeTourAfterNavigation(slug)
    tryStartMarriageSeminarTourAfterNavigation(slug)
  }, [profile, slug])

  if (profile) {
    return (
      <ProfilePageBody
        key={slug}
        slug={slug}
        profile={profile}
        profileLoadSettled={profileLoadSettled}
      />
    )
  }

  if (error && profileLoadSettled) {
    return <ProfileLoadingSurface message="Reconnecting..." />
  }

  if (showLoadingSpinner) {
    return <ProfileLoadingSurface message="Loading..." />
  }

  return <ProfileLoadingSurface message="One moment..." />
}
