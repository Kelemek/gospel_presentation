// Data service - uses Supabase Storage
// Requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables

import type { GospelProfile, CreateProfileRequest, GospelPresentationData } from './types'
import { logger } from './logger'

logger.info('[data-service] Using Supabase Storage')

// Import Supabase storage service
const dataService = require('./supabase-data-service')

// Re-export all functions from the chosen service
export const getProfiles = dataService.getProfiles
export const getProfileBySlug = dataService.getProfileBySlug
export const createProfile = dataService.createProfile
export const updateProfile = dataService.updateProfile
export const deleteProfile = dataService.deleteProfile
export const incrementProfileVisitCount = dataService.incrementProfileVisitCount

export default dataService