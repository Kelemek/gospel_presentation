'use client'

import { useEffect } from 'react'
import { recordProfileLastOpenOnEnter } from '@/lib/profileLastOpenResourceStorage'

export function useProfileLastOpenOnEnter(profileSlug: string | undefined, profileTitle: string) {
  useEffect(() => {
    if (!profileSlug) return
    recordProfileLastOpenOnEnter(profileSlug, profileTitle)
  }, [profileSlug, profileTitle])
}
