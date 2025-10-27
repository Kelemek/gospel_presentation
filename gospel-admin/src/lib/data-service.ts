// Data service - uses Netlify Blob Storage exclusively
// Requires NETLIFY_SITE_ID and NETLIFY_TOKEN environment variables

import type { GospelProfile, CreateProfileRequest, GospelPresentationData } from './types'
import { logger } from './logger'

// Validate Netlify credentials
const hasNetlifyCredentials = !!(process.env.NETLIFY_SITE_ID && process.env.NETLIFY_TOKEN)

if (!hasNetlifyCredentials) {
  throw new Error('[data-service] Missing required Netlify credentials. Please set NETLIFY_SITE_ID and NETLIFY_TOKEN environment variables.')
}

logger.info('[data-service] Using Netlify Blob Storage exclusively')

// Import blob storage service
const dataService = require('./blob-data-service')

// Re-export all functions from the chosen service
export const getProfiles = dataService.getProfiles
export const getProfileBySlug = dataService.getProfileBySlug
export const createProfile = dataService.createProfile
export const updateProfile = dataService.updateProfile
export const deleteProfile = dataService.deleteProfile
export const updateProfileContent = dataService.updateProfileContent
export const incrementProfileVisitCount = dataService.incrementProfileVisitCount

export default dataService