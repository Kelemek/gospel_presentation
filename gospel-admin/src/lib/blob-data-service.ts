// Netlify Blob storage service for profile data
import { getStore } from '@netlify/blobs'
import { 
  GospelProfile, 
  CreateProfileRequest, 
  GospelPresentationData 
} from './types'
import { createProfileFromRequest } from './profile-service'

// Store names
const PROFILES_STORE = 'profiles'
const GOSPEL_DATA_STORE = 'gospel-data'

// Profile storage interface
interface ProfileStorage {
  profiles: GospelProfile[]
  nextId: number
  lastModified: string
}

/**
 * Get the profiles blob store
 */
function getProfilesStore() {
  return getStore({
    name: PROFILES_STORE,
    siteID: process.env.NETLIFY_SITE_ID,
    token: process.env.NETLIFY_TOKEN
  })
}

/**
 * Get the gospel data blob store
 */
function getGospelDataStore() {
  return getStore({
    name: GOSPEL_DATA_STORE,
    siteID: process.env.NETLIFY_SITE_ID,
    token: process.env.NETLIFY_TOKEN
  })
}

/**
 * Loads gospel presentation data from blob storage or falls back to file
 */
export async function loadGospelData(): Promise<GospelPresentationData> {
  try {
    // Try to load from blob storage first
    const store = getGospelDataStore()
    const data = await store.get('gospel-presentation.json', { type: 'json' })
    
    if (data) {
      console.log('[blob-data-service] Loaded gospel data from blob storage')
      return data as GospelPresentationData
    }
  } catch (error) {
    console.log('[blob-data-service] Blob storage not available, loading from file')
  }
  
  // Fallback to reading from file (for initial setup or local dev)
  try {
    const fs = await import('fs/promises')
    const path = await import('path')
    
    const dataPath = process.env.NODE_ENV === 'production'
      ? path.join(process.cwd(), 'data', 'gospel-presentation.json')
      : path.join(process.cwd(), '..', 'data', 'gospel-presentation.json')
    
    const fileContent = await fs.readFile(dataPath, 'utf-8')
    const data = JSON.parse(fileContent) as GospelPresentationData
    
    // Cache it to blob storage for next time
    try {
      const store = getGospelDataStore()
      await store.setJSON('gospel-presentation.json', data)
      console.log('[blob-data-service] Cached gospel data to blob storage')
    } catch (err) {
      console.log('[blob-data-service] Could not cache to blob storage:', err)
    }
    
    return data
  } catch (error) {
    console.error('[blob-data-service] Error loading gospel data:', error)
    // Return minimal fallback data
    return []
  }
}

/**
 * Loads profiles from blob storage
 */
export async function loadProfiles(): Promise<ProfileStorage> {
  // Always use blob storage when credentials are available, regardless of environment
  const hasCredentials = !!(process.env.NETLIFY_SITE_ID && process.env.NETLIFY_TOKEN)
  
  if (hasCredentials) {
    try {
      const store = getProfilesStore()
      const data = await store.get('profiles.json', { type: 'json' })
      
      if (data) {
        const storage = data as ProfileStorage
        
        // Convert date strings back to Date objects
        storage.profiles = storage.profiles.map(profile => ({
          ...profile,
          createdAt: new Date(profile.createdAt),
          updatedAt: new Date(profile.updatedAt)
        }))
        
        console.log('[blob-data-service] ✅ Successfully loaded', storage.profiles.length, 'profiles from blob storage - returning immediately')
        return storage
      } else {
        console.log('[blob-data-service] No existing data in blob storage')
      }
    } catch (error) {
      console.log('[blob-data-service] Error accessing blob storage:', error instanceof Error ? error.message : String(error))
    }
  } else {
    console.log('[blob-data-service] No Netlify credentials available')
  }
  
  // Create default profile if no data exists anywhere
  console.log('[blob-data-service] 🆕 No existing profiles found, creating default profile...')
  
  // Create default profile
  const gospelData = await loadGospelData()
  const defaultProfile: GospelProfile = {
    id: "1",
    slug: "default",
    title: "Default Gospel Presentation",
    description: "The original gospel presentation",
    isDefault: true,
    visitCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    gospelData: gospelData
  }
  
  const initialStorage: ProfileStorage = {
    profiles: [defaultProfile],
    nextId: 2,
    lastModified: new Date().toISOString()
  }
  
  await saveProfiles(initialStorage)
  return initialStorage
}

/**
 * Saves profiles to blob storage exclusively
 */
export async function saveProfiles(storage: ProfileStorage): Promise<void> {
  const hasCredentials = !!(process.env.NETLIFY_SITE_ID && process.env.NETLIFY_TOKEN)
  
  if (!hasCredentials) {
    throw new Error('Netlify credentials required for saving profiles')
  }
  
  try {
    const store = getProfilesStore()
    
    const dataToSave = {
      ...storage,
      lastModified: new Date().toISOString()
    }
    
    await store.setJSON('profiles.json', dataToSave)
    console.log('[blob-data-service] ✅ Saved', storage.profiles.length, 'profiles to blob storage')
  } catch (error) {
    console.error('[blob-data-service] ❌ Failed to save to blob storage:', error)
    throw new Error('Failed to save profiles to blob storage')
  }
}

/**
 * Gets all profiles
 */
export async function getProfiles(): Promise<GospelProfile[]> {
  const storage = await loadProfiles()
  return storage.profiles
}

/**
 * Gets a single profile by slug
 */
export async function getProfileBySlug(slug: string): Promise<GospelProfile | null> {
  const profiles = await getProfiles()
  return profiles.find(profile => profile.slug === slug) || null
}

/**
 * Creates a new profile
 */
export async function createProfile(request: CreateProfileRequest): Promise<GospelProfile> {
  const storage = await loadProfiles()
  
  // Check if slug already exists
  if (storage.profiles.some(p => p.slug === request.slug)) {
    throw new Error(`Profile with slug '${request.slug}' already exists`)
  }
  
  // Get the source profile to clone from
  const sourceProfile = storage.profiles.find(p => p.slug === (request.cloneFromSlug || 'default'))
  if (!sourceProfile) {
    throw new Error(`Source profile '${request.cloneFromSlug}' not found`)
  }
  
  // Create the new profile
  const profileWithoutId = await createProfileFromRequest(request, sourceProfile.gospelData)
  
  const newProfile: GospelProfile = {
    ...profileWithoutId,
    id: storage.nextId.toString()
  }
  
  // Add to storage
  storage.profiles.push(newProfile)
  storage.nextId++
  
  // Save to blob storage
  await saveProfiles(storage)
  
  console.log('[blob-data-service] Created new profile:', newProfile.slug)
  return newProfile
}

/**
 * Updates an existing profile
 */
export async function updateProfile(
  slug: string, 
  updates: Partial<Omit<GospelProfile, 'id' | 'slug' | 'createdAt'>>
): Promise<GospelProfile> {
  const storage = await loadProfiles()
  
  const profileIndex = storage.profiles.findIndex(p => p.slug === slug)
  if (profileIndex === -1) {
    throw new Error(`Profile '${slug}' not found`)
  }
  
  // Apply updates
  const updatedProfile: GospelProfile = {
    ...storage.profiles[profileIndex],
    ...updates,
    slug: storage.profiles[profileIndex].slug, // Never change slug
    id: storage.profiles[profileIndex].id, // Never change id
    updatedAt: new Date()
  }
  
  storage.profiles[profileIndex] = updatedProfile
  
  // Save to blob storage
  await saveProfiles(storage)
  
  console.log('[blob-data-service] Updated profile:', slug)
  return updatedProfile
}

/**
 * Deletes a profile
 */
export async function deleteProfile(slug: string): Promise<void> {
  const storage = await loadProfiles()
  
  const profile = storage.profiles.find(p => p.slug === slug)
  if (!profile) {
    throw new Error(`Profile '${slug}' not found`)
  }
  
  if (profile.isDefault) {
    throw new Error('Cannot delete the default profile')
  }
  
  // Remove from storage
  storage.profiles = storage.profiles.filter(p => p.slug !== slug)
  
  // Save to blob storage
  await saveProfiles(storage)
  
  console.log('[blob-data-service] Deleted profile:', slug)
}

/**
 * Increments the visit count for a profile
 */
export async function incrementProfileVisitCount(slug: string): Promise<void> {
  try {
    const storage = await loadProfiles()
    
    const profile = storage.profiles.find(p => p.slug === slug)
    if (profile) {
      profile.visitCount = (profile.visitCount || 0) + 1
      profile.updatedAt = new Date()
      profile.lastVisited = new Date()
      
      // Save to blob storage
      await saveProfiles(storage)
      
      console.log(`[blob-data-service] Incremented visit count for '${slug}' to ${profile.visitCount}, last visited: ${profile.lastVisited.toISOString()}`)
    }
  } catch (error) {
    // Don't throw errors for visit counting - it shouldn't break the page
    console.warn('[blob-data-service] Failed to increment visit count:', error)
  }
}
