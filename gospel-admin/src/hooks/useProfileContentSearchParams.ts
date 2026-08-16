'use client'

import { useSearchParams } from 'next/navigation'
import {
  parseProfileContentSearchParams,
  type ProfileContentSearchParams,
} from '@/lib/profileContentSearchParams'

export type { ProfileContentSearchParams } from '@/lib/profileContentSearchParams'

export function useProfileContentSearchParams(): ProfileContentSearchParams {
  const searchParams = useSearchParams()
  return parseProfileContentSearchParams(searchParams)
}
