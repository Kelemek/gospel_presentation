// File-based data persistence service using the repository's data directory
import { readFile, writeFile, mkdir, access } from 'fs/promises'
import { constants } from 'fs'
import path from 'path'
import { 
  GospelProfile, 
  CreateProfileRequest, 
  GospelPresentationData 
} from './types'
import { createProfileFromRequest } from './profile-service'

// Paths relative to the repository root
const DATA_DIR = path.join(process.cwd(), '..', 'data')
const PROFILES_FILE = path.join(DATA_DIR, 'profiles.json')
const GOSPEL_DATA_FILE = path.join(DATA_DIR, 'gospel-presentation.json')

// Profile storage interface
interface ProfileStorage {
  profiles: GospelProfile[]
  nextId: number
  lastModified: string
}

/**
 * Ensures the data directory exists
 */
async function ensureDataDirectory(): Promise<void> {
  try {
    await access(DATA_DIR, constants.F_OK)
  } catch {
    await mkdir(DATA_DIR, { recursive: true })
  }
}

/**
 * Loads gospel presentation data from JSON file
 */
export async function loadGospelData(): Promise<GospelPresentationData> {
  try {
    const fileContent = await readFile(GOSPEL_DATA_FILE, 'utf-8')
    return JSON.parse(fileContent)
  } catch (error) {
    console.error('Error loading gospel data from file:', error)
    // Return minimal fallback data if file doesn't exist
    const fallbackData: GospelPresentationData = [
      {
        "section": "1",
        "title": "God",
        "subsections": [
          {
            "title": "A. God is Holy",
            "content": "God is separate from and exalted above His creation. He is morally pure, perfect, and untainted by sin.",
            "scriptureReferences": [
              { "reference": "Isaiah 6:3", "favorite": true },
              { "reference": "1 Peter 1:15-16", "favorite": false }
            ]
          }
        ]
      }
    ]
    
    // Save the fallback data to create the file
    await ensureDataDirectory()
    await writeFile(GOSPEL_DATA_FILE, JSON.stringify(fallbackData, null, 2))
    return fallbackData
  }
}

/**
 * Loads profiles from the profiles.json file
 */
export async function loadProfiles(): Promise<ProfileStorage> {
  try {
    const fileContent = await readFile(PROFILES_FILE, 'utf-8')
    const data = JSON.parse(fileContent) as ProfileStorage
    
    // Convert date strings back to Date objects
    data.profiles = data.profiles.map(profile => ({
      ...profile,
      createdAt: new Date(profile.createdAt),
      updatedAt: new Date(profile.updatedAt)
    }))
    
    // Check if profiles array is empty and create default profile
    if (data.profiles.length === 0) {
      console.log('No profiles found, creating default profile...')
      const gospelData = await loadGospelData()
      const defaultProfile: GospelProfile = {
        id: '1',
        slug: 'default',
        title: 'Default Gospel Presentation',
        description: 'The original gospel presentation',
        gospelData,
        isDefault: true,
        visitCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      const updatedStorage: ProfileStorage = {
        profiles: [defaultProfile],
        nextId: 2,
        lastModified: new Date().toISOString()
      }
      
      await saveProfiles(updatedStorage)
      return updatedStorage
    }
    
    return data
  } catch (error) {
    console.error('Error loading profiles from file:', error)
    
    // Create initial profiles file with default profile
    const gospelData = await loadGospelData()
    const defaultProfile: GospelProfile = {
      id: '1',
      slug: 'default',
      title: 'Default Gospel Presentation',
      description: 'The original gospel presentation',
      gospelData,
      isDefault: true,
      visitCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    const initialStorage: ProfileStorage = {
      profiles: [defaultProfile],
      nextId: 2,
      lastModified: new Date().toISOString()
    }
    
    await saveProfiles(initialStorage)
    return initialStorage
  }
}

/**
 * Saves profiles to the profiles.json file
 */
export async function saveProfiles(storage: ProfileStorage): Promise<void> {
  try {
    await ensureDataDirectory()
    
    // Update last modified timestamp
    const dataToSave = {
      ...storage,
      lastModified: new Date().toISOString()
    }
    
    const jsonContent = JSON.stringify(dataToSave, null, 2)
    await writeFile(PROFILES_FILE, jsonContent, 'utf-8')
    
    console.log(`Saved ${storage.profiles.length} profiles to ${PROFILES_FILE}`)
  } catch (error) {
    console.error('Error saving profiles to file:', error)
    throw new Error('Failed to save profiles to file')
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
  
  // Get source data for cloning
  let sourceGospelData: GospelPresentationData
  
  if (request.cloneFromSlug) {
    const sourceProfile = storage.profiles.find(p => p.slug === request.cloneFromSlug)
    if (!sourceProfile) {
      throw new Error(`Source profile '${request.cloneFromSlug}' not found`)
    }
    sourceGospelData = sourceProfile.gospelData
  } else {
    // Clone from default profile or gospel data file
    const defaultProfile = storage.profiles.find(p => p.isDefault)
    if (!defaultProfile) {
      sourceGospelData = await loadGospelData()
    } else {
      sourceGospelData = defaultProfile.gospelData
    }
  }
  
  // Create the new profile
  const newProfile: GospelProfile = {
    id: storage.nextId.toString(),
    ...createProfileFromRequest(request, sourceGospelData)
  }
  
  // Add to storage
  storage.profiles.push(newProfile)
  storage.nextId++
  
  // Save to file
  await saveProfiles(storage)
  
  return newProfile
}

/**
 * Updates an existing profile
 */
export async function updateProfile(slug: string, updates: Partial<Omit<GospelProfile, 'id' | 'slug' | 'createdAt'>>): Promise<GospelProfile> {
  const storage = await loadProfiles()
  
  const profileIndex = storage.profiles.findIndex(p => p.slug === slug)
  if (profileIndex === -1) {
    throw new Error(`Profile with slug '${slug}' not found`)
  }
  
  // Update the profile
  storage.profiles[profileIndex] = {
    ...storage.profiles[profileIndex],
    ...updates,
    updatedAt: new Date()
  }
  
  // Save to file
  await saveProfiles(storage)
  
  return storage.profiles[profileIndex]
}

/**
 * Deletes a profile by slug
 */
export async function deleteProfile(slug: string): Promise<void> {
  const storage = await loadProfiles()
  
  const profileIndex = storage.profiles.findIndex(p => p.slug === slug)
  if (profileIndex === -1) {
    throw new Error(`Profile with slug '${slug}' not found`)
  }
  
  // Don't allow deletion of default profile
  if (storage.profiles[profileIndex].isDefault) {
    throw new Error('Cannot delete the default profile')
  }
  
  // Remove the profile
  storage.profiles.splice(profileIndex, 1)
  
  // Save to file
  await saveProfiles(storage)
}

/**
 * Increments visit count for a profile
 */
export async function incrementProfileVisitCount(slug: string): Promise<void> {
  const storage = await loadProfiles()
  
  const profile = storage.profiles.find(p => p.slug === slug)
  if (profile) {
    profile.visitCount++
    profile.updatedAt = new Date()
    await saveProfiles(storage)
  }
}

/**
 * Gets existing slugs for validation
 */
export async function getExistingSlugs(): Promise<string[]> {
  const profiles = await getProfiles()
  return profiles.map(p => p.slug)
}

/**
 * Backup profiles to a timestamped file
 */
export async function backupProfiles(): Promise<string> {
  const storage = await loadProfiles()
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupFile = path.join(DATA_DIR, `profiles-backup-${timestamp}.json`)
  
  await writeFile(backupFile, JSON.stringify(storage, null, 2))
  return backupFile
}