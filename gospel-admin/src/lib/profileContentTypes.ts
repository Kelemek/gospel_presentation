import type { SavedAnswer } from '@/lib/types'

/** Shared profile header / slide-out profile summary fields. */
export type ProfileContentProfileInfo = {
  title: string
  description?: string
  slug: string
  favoriteScriptures: string[]
  savedAnswers?: SavedAnswer[]
}
