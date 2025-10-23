import { readFile, writeFile, mkdir, access, readdir } from 'fs/promises'
import { join, dirname } from 'path'
import { GospelProfile, ProfileMetadata } from './types'

// File paths - more robust path resolution for production
async function findDataDir(): Promise<string> {
  try {
    console.log(`[Profile Service] Starting findDataDir, cwd: ${process.cwd()}`)
    
    const fs = await import('fs/promises')
    
    // Try multiple possible paths for data directory (production-safe paths first)
    const possiblePaths = [
      '/tmp/gospel-data',                          // Always writable temp directory - FIRST PRIORITY
      join('/tmp', 'data'),                        // Alternative temp directory
      join(process.cwd(), 'data'),                 // Same directory as app
      join(process.cwd(), '..', 'data'),           // Development: gospel-admin/../data  
      join(process.env.HOME || '/tmp', 'gospel-data'), // User home directory fallback
      join(dirname(process.cwd()), 'data'),        // Alternative parent directory
    ]
    
    console.log(`[Profile Service] Trying paths: ${possiblePaths.join(', ')}`)
    
    for (const path of possiblePaths) {
      try {
        await fs.access(path)
        console.log(`[Profile Service] Found existing data directory at: ${path}`)
        return path
      } catch (error) {
        console.log(`[Profile Service] Path ${path} not accessible, trying to create: ${error}`)
        
        // Try to create the directory to test if it's writable
        try {
          await fs.mkdir(path, { recursive: true })
          console.log(`[Profile Service] Successfully created writable directory at: ${path}`)
          return path
        } catch (createError) {
          console.log(`[Profile Service] Cannot create directory at ${path}: ${createError}`)
          // Continue to next path
        }
      }
    }
    
    // If we get here, none of the paths worked - use the most reliable fallback
    const fallback = '/tmp/gospel-data'
    console.log(`[Profile Service] All paths failed, using guaranteed fallback: ${fallback}`)
    
    // Make one final attempt to create the fallback directory
    try {
      await fs.mkdir(fallback, { recursive: true })
      console.log(`[Profile Service] Created fallback directory: ${fallback}`)
      return fallback
    } catch (finalError) {
      console.error(`[Profile Service] Even fallback directory creation failed: ${finalError}`)
      // Return it anyway - the error will be caught later with better context
      return fallback
    }
  } catch (error) {
    console.error(`[Profile Service] Error in findDataDir: ${error}`)
    // Fallback to a safe default
    const fallbackPath = join(process.cwd(), 'data')
    console.log(`[Profile Service] Using fallback path: ${fallbackPath}`)
    return fallbackPath
  }
}

// Initialize paths (will be set dynamically)
let DATA_DIR: string
let PROFILES_DIR: string  
let INDEX_FILE: string

async function initializePaths() {
  if (!DATA_DIR) {
    try {
      console.log(`[Profile Service] Initializing paths...`)
      DATA_DIR = await findDataDir()
      PROFILES_DIR = join(DATA_DIR, 'profiles')
      INDEX_FILE = join(PROFILES_DIR, 'index.json')
      console.log(`[Profile Service] Paths initialized - DATA_DIR: ${DATA_DIR}, PROFILES_DIR: ${PROFILES_DIR}`)
    } catch (error) {
      console.error(`[Profile Service] Fatal error initializing paths: ${error}`)
      throw new Error(`Failed to initialize file paths: ${error}`)
    }
  }
}

interface ProfileIndex {
  profiles: ProfileMetadata[]
  lastUpdated: string
}

interface ProfileFile {
  profile: GospelProfile
  lastUpdated: string
}

// Ensure directories exist
async function ensureDirectories() {
  await initializePaths()
  
  console.log(`[Profile Service] Working directory: ${process.cwd()}`)
  console.log(`[Profile Service] Data directory: ${DATA_DIR}`)
  console.log(`[Profile Service] Profiles directory: ${PROFILES_DIR}`)
  
  // Since findDataDir already verified DATA_DIR is writable, just ensure PROFILES_DIR exists
  try {
    await access(PROFILES_DIR)
    console.log(`[Profile Service] Profiles directory exists: ${PROFILES_DIR}`)
  } catch (error) {
    console.log(`[Profile Service] Creating profiles directory: ${PROFILES_DIR}`)
    try {
      await mkdir(PROFILES_DIR, { recursive: true })
      console.log(`[Profile Service] Successfully created profiles directory: ${PROFILES_DIR}`)
    } catch (mkdirError) {
      console.error(`[Profile Service] Failed to create profiles directory: ${mkdirError}`)
      throw new Error(`Cannot create profiles directory at ${PROFILES_DIR}: ${mkdirError}`)
    }
  }
}

// Load profile index (metadata only)
async function loadProfileIndex(): Promise<ProfileIndex> {
  await initializePaths()
  await ensureDirectories()
  
  try {
    const fileContent = await readFile(INDEX_FILE, 'utf-8')
    const data = JSON.parse(fileContent) as ProfileIndex
    
    // Convert date strings back to Date objects
    data.profiles = data.profiles.map(profile => ({
      ...profile,
      createdAt: new Date(profile.createdAt),
      updatedAt: new Date(profile.updatedAt)
    }))
    
    return data
  } catch (error) {
    console.log('No index found or corrupted, creating default...')
    
    // Create default profile if no index exists
    const defaultProfile = await createDefaultProfile()
    const defaultIndex: ProfileIndex = {
      profiles: [{
        id: defaultProfile.id,
        slug: defaultProfile.slug,
        title: defaultProfile.title,
        description: defaultProfile.description,
        isDefault: true,
        visitCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }],
      lastUpdated: new Date().toISOString()
    }
    
    await saveProfileIndex(defaultIndex)
    await saveProfile(defaultProfile)
    
    return defaultIndex
  }
}

// Save profile index
async function saveProfileIndex(index: ProfileIndex): Promise<void> {
  await initializePaths()
  await ensureDirectories()
  
  const indexToSave = {
    ...index,
    lastUpdated: new Date().toISOString()
  }
  
  await writeFile(INDEX_FILE, JSON.stringify(indexToSave, null, 2), 'utf-8')
  console.log(`Saved index with ${index.profiles.length} profiles`)
}

// Load individual profile
async function loadProfile(slug: string): Promise<GospelProfile | null> {
  await initializePaths()
  await ensureDirectories()
  
  const profileFile = join(PROFILES_DIR, `${slug}.json`)
  
  try {
    const fileContent = await readFile(profileFile, 'utf-8')
    const data = JSON.parse(fileContent) as ProfileFile
    
    // Convert date strings back to Date objects
    const profile = {
      ...data.profile,
      createdAt: new Date(data.profile.createdAt),
      updatedAt: new Date(data.profile.updatedAt)
    }
    
    return profile
  } catch (error) {
    console.error(`Error loading profile ${slug}:`, error)
    return null
  }
}

// Save individual profile
async function saveProfile(profile: GospelProfile): Promise<void> {
  await initializePaths()
  await ensureDirectories()
  
  const profileFile = join(PROFILES_DIR, `${profile.slug}.json`)
  const profileData: ProfileFile = {
    profile: {
      ...profile,
      updatedAt: new Date()
    },
    lastUpdated: new Date().toISOString()
  }
  
  await writeFile(profileFile, JSON.stringify(profileData, null, 2), 'utf-8')
  console.log(`Saved profile: ${profile.slug}`)
}

// Delete profile file
async function deleteProfileFile(slug: string): Promise<void> {
  await initializePaths()
  await ensureDirectories()
  
  const profileFile = join(PROFILES_DIR, `${slug}.json`)
  const fs = require('fs')
  
  try {
    await fs.promises.unlink(profileFile)
    console.log(`Deleted profile file: ${slug}`)
  } catch (error) {
    console.error(`Error deleting profile file ${slug}:`, error)
    throw error
  }
}

// Create default profile
async function createDefaultProfile(): Promise<GospelProfile> {
  await initializePaths()
  // Load gospel data from the original data file
  const gospelDataPath = join(DATA_DIR, 'gospel-presentation.json')
  let gospelData = []
  
  try {
    const gospelContent = await readFile(gospelDataPath, 'utf-8')
    gospelData = JSON.parse(gospelContent)
  } catch (error) {
    console.error('Could not load gospel data:', error)
    // Fallback to basic structure
    gospelData = [
      {
        section: "1",
        title: "God",
        subsections: []
      }
    ]
  }
  
  return {
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
}

// Generate next ID
function generateNextId(profiles: ProfileMetadata[]): string {
  if (profiles.length === 0) return "1"
  
  const maxId = Math.max(...profiles.map(p => parseInt(p.id) || 0))
  return (maxId + 1).toString()
}

// Atomic operations with index updates

export async function getProfiles(): Promise<ProfileMetadata[]> {
  try {
    console.log('[Profile Service] getProfiles() called')
    await initializePaths()
    console.log('[Profile Service] Paths initialized, loading index...')
    const index = await loadProfileIndex()
    console.log(`[Profile Service] Loaded ${index.profiles.length} profiles from index`)
    return index.profiles
  } catch (error) {
    console.error('[Profile Service] Error in getProfiles():', error)
    console.error('[Profile Service] Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    throw error
  }
}

export async function getProfileBySlug(slug: string): Promise<GospelProfile | null> {
  return await loadProfile(slug)
}

export async function createProfile(
  slug: string,
  title: string,
  description: string | undefined,
  cloneFromSlug: string = 'default'
): Promise<GospelProfile> {
  // Load index and source profile
  const index = await loadProfileIndex()
  const sourceProfile = await loadProfile(cloneFromSlug)
  
  if (!sourceProfile) {
    throw new Error(`Source profile '${cloneFromSlug}' not found`)
  }
  
  // Check if slug already exists
  if (index.profiles.some(p => p.slug === slug)) {
    throw new Error(`Profile with slug '${slug}' already exists`)
  }
  
  // Create new profile
  const newProfile: GospelProfile = {
    id: generateNextId(index.profiles),
    slug,
    title,
    description,
    isDefault: false,
    visitCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    gospelData: JSON.parse(JSON.stringify(sourceProfile.gospelData)) // Deep clone
  }
  
  // Save profile file
  await saveProfile(newProfile)
  
  // Update index
  const newMetadata: ProfileMetadata = {
    id: newProfile.id,
    slug: newProfile.slug,
    title: newProfile.title,
    description: newProfile.description,
    isDefault: newProfile.isDefault,
    visitCount: newProfile.visitCount,
    createdAt: newProfile.createdAt,
    updatedAt: newProfile.updatedAt
  }
  
  index.profiles.push(newMetadata)
  await saveProfileIndex(index)
  
  return newProfile
}

export async function updateProfile(slug: string, updates: Partial<GospelProfile>): Promise<GospelProfile> {
  // Load current profile
  const profile = await loadProfile(slug)
  if (!profile) {
    throw new Error(`Profile '${slug}' not found`)
  }
  
  // Apply updates
  const updatedProfile: GospelProfile = {
    ...profile,
    ...updates,
    slug: profile.slug, // Never change slug through updates
    id: profile.id, // Never change id
    updatedAt: new Date()
  }
  
  // Save updated profile
  await saveProfile(updatedProfile)
  
  // Update index metadata
  const index = await loadProfileIndex()
  const profileIndex = index.profiles.findIndex(p => p.slug === slug)
  
  if (profileIndex !== -1) {
    index.profiles[profileIndex] = {
      id: updatedProfile.id,
      slug: updatedProfile.slug,
      title: updatedProfile.title,
      description: updatedProfile.description,
      isDefault: updatedProfile.isDefault,
      visitCount: updatedProfile.visitCount,
      createdAt: updatedProfile.createdAt,
      updatedAt: updatedProfile.updatedAt
    }
    
    await saveProfileIndex(index)
  }
  
  return updatedProfile
}

export async function deleteProfile(slug: string): Promise<boolean> {
  // Load profile to check if it exists and if it's default
  const profile = await loadProfile(slug)
  if (!profile) {
    return false
  }
  
  if (profile.isDefault) {
    throw new Error('Cannot delete default profile')
  }
  
  // Delete profile file
  await deleteProfileFile(slug)
  
  // Update index
  const index = await loadProfileIndex()
  index.profiles = index.profiles.filter(p => p.slug !== slug)
  await saveProfileIndex(index)
  
  return true
}

export async function incrementVisitCount(slug: string): Promise<void> {
  const profile = await loadProfile(slug)
  if (profile) {
    profile.visitCount += 1
    await updateProfile(slug, { visitCount: profile.visitCount })
  }
}

// Migration function to convert from old single-file format
export async function migrateFromSingleFile(): Promise<void> {
  await initializePaths()
  const oldFilePath = join(DATA_DIR, 'profiles.json')
  
  try {
    // Check if old file exists
    await access(oldFilePath)
    
    // Load old format
    const oldContent = await readFile(oldFilePath, 'utf-8')
    const oldData = JSON.parse(oldContent)
    
    if (oldData.profiles && Array.isArray(oldData.profiles)) {
      console.log(`Migrating ${oldData.profiles.length} profiles from single file...`)
      
      // Create new index
      const newIndex: ProfileIndex = {
        profiles: [],
        lastUpdated: new Date().toISOString()
      }
      
      // Migrate each profile
      for (const oldProfile of oldData.profiles) {
        // Save individual profile file
        await saveProfile(oldProfile)
        
        // Add to index
        newIndex.profiles.push({
          id: oldProfile.id,
          slug: oldProfile.slug,
          title: oldProfile.title,
          description: oldProfile.description,
          isDefault: oldProfile.isDefault,
          visitCount: oldProfile.visitCount || 0,
          createdAt: new Date(oldProfile.createdAt),
          updatedAt: new Date(oldProfile.updatedAt)
        })
      }
      
      // Save new index
      await saveProfileIndex(newIndex)
      
      // Rename old file as backup
      const backupPath = join(DATA_DIR, `profiles.json.backup.${Date.now()}`)
      const fs = require('fs')
      await fs.promises.rename(oldFilePath, backupPath)
      
      console.log(`Migration complete! Old file backed up to: ${backupPath}`)
    }
  } catch (error) {
    // Old file doesn't exist or is corrupted, that's fine
    console.log('No old profiles file to migrate')
  }
}