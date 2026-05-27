/** Device-local M'Cheyne plan start date (ISO `YYYY-MM-DD`, local calendar). */

import {
  gospelStorageGetSync,
  gospelStorageRemoveSync,
  gospelStorageSetSync,
} from '@/lib/gospelClientStorage'
import { MCHEYNE_SLUG } from '@/lib/mcheyne/mcheyneSlug'

export const MCHEYNE_START_DATE_KEY_PREFIX = 'gospel-mcheyne-start:'

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/

export function mcheyneStartDateStorageKey(profileSlug: string = MCHEYNE_SLUG): string {
  return `${MCHEYNE_START_DATE_KEY_PREFIX}v1:${profileSlug.trim().toLowerCase()}`
}

export function isValidLocalIsoDate(iso: string): boolean {
  const m = ISO_DATE_RE.exec(iso.trim())
  if (!m) return false
  const y = parseInt(m[1], 10)
  const monthIndex = parseInt(m[2], 10) - 1
  const d = parseInt(m[3], 10)
  const date = new Date(y, monthIndex, d)
  return date.getFullYear() === y && date.getMonth() === monthIndex && date.getDate() === d
}

export function loadMcheyneStartDate(profileSlug: string = MCHEYNE_SLUG): string | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = gospelStorageGetSync(mcheyneStartDateStorageKey(profileSlug))
    if (!raw) return null
    const iso = raw.trim()
    return isValidLocalIsoDate(iso) ? iso : null
  } catch {
    return null
  }
}

export function saveMcheyneStartDate(isoDate: string, profileSlug: string = MCHEYNE_SLUG): void {
  if (typeof window === 'undefined') return
  const iso = isoDate.trim()
  if (!isValidLocalIsoDate(iso)) return
  try {
    gospelStorageSetSync(mcheyneStartDateStorageKey(profileSlug), iso)
  } catch {
    // quota / private mode
  }
}

export function clearMcheyneStartDate(profileSlug: string = MCHEYNE_SLUG): void {
  if (typeof window === 'undefined') return
  try {
    gospelStorageRemoveSync(mcheyneStartDateStorageKey(profileSlug))
  } catch {
    // ignore
  }
}
