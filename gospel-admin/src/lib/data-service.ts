// Universal data service - automatically chooses between blob and file storage
// Uses blob storage in production (Netlify) and file storage in development

import type { GospelProfile, CreateProfileRequest, GospelPresentationData } from './types'

// Determine environment and choose appropriate service
const isProduction = process.env.NODE_ENV === 'production'
const isNetlifyEnvironment = process.env.NETLIFY === 'true'
const hasNetlifyCredentials = !!(process.env.NETLIFY_SITE_ID && process.env.NETLIFY_TOKEN)

// Use blob storage only if in production on Netlify with proper credentials
const useBlobs = isProduction && isNetlifyEnvironment && hasNetlifyCredentials

console.log(`[data-service] Environment: ${process.env.NODE_ENV}, Netlify: ${process.env.NETLIFY}, Credentials: ${hasNetlifyCredentials}, Using: ${useBlobs ? 'blob-storage' : 'file-storage'}`)

// Import the appropriate service based on environment
let dataService: any

if (useBlobs) {
  try {
    // Production: Use blob storage
    dataService = require('./blob-data-service')
    console.log('[data-service] Successfully loaded blob-data-service')
  } catch (error) {
    console.warn('[data-service] Failed to load blob-data-service, falling back to file-data-service:', error)
    dataService = require('./file-data-service')
  }
} else {
  // Development: Use file storage
  dataService = require('./file-data-service')
  console.log('[data-service] Successfully loaded file-data-service')
}

// Re-export all functions from the chosen service
export const getProfiles = dataService.getProfiles
export const getProfileBySlug = dataService.getProfileBySlug
export const createProfile = dataService.createProfile
export const updateProfile = dataService.updateProfile
export const deleteProfile = dataService.deleteProfile
export const updateProfileContent = dataService.updateProfileContent
export const incrementProfileVisitCount = dataService.incrementProfileVisitCount

export default dataService