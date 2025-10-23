// Profile Service - Core business logic for profile management
import { 
  GospelProfile, 
  CreateProfileRequest, 
  ProfileValidation, 
  PROFILE_VALIDATION,
  GospelPresentationData 
} from './types'

export class ProfileValidationError extends Error {
  constructor(message: string, public field: string) {
    super(message)
    this.name = 'ProfileValidationError'
  }
}

/**
 * Validates a profile slug according to business rules
 */
export function validateProfileSlug(slug: string, existingSlugs: string[] = []): ProfileValidation['slug'] {
  // Check length
  if (slug.length < PROFILE_VALIDATION.SLUG_MIN_LENGTH) {
    return {
      isValid: false,
      isUnique: false,
      error: `Slug must be at least ${PROFILE_VALIDATION.SLUG_MIN_LENGTH} characters`
    }
  }

  if (slug.length > PROFILE_VALIDATION.SLUG_MAX_LENGTH) {
    return {
      isValid: false,
      isUnique: false,
      error: `Slug must be no more than ${PROFILE_VALIDATION.SLUG_MAX_LENGTH} characters`
    }
  }

  // Check pattern (lowercase alphanumeric, start with letter)
  if (!PROFILE_VALIDATION.SLUG_PATTERN.test(slug)) {
    return {
      isValid: false,
      isUnique: false,
      error: 'Slug must start with a letter and contain only lowercase letters and numbers'
    }
  }

  // Check reserved words
  if ((PROFILE_VALIDATION.RESERVED_SLUGS as readonly string[]).includes(slug)) {
    return {
      isValid: false,
      isUnique: false,
      error: `'${slug}' is a reserved word and cannot be used`
    }
  }

  // Check uniqueness
  if (existingSlugs.includes(slug)) {
    return {
      isValid: true,
      isUnique: false,
      error: `A profile with slug '${slug}' already exists`
    }
  }

  return {
    isValid: true,
    isUnique: true
  }
}

/**
 * Validates a profile title
 */
export function validateProfileTitle(title: string): ProfileValidation['title'] {
  const trimmedTitle = title.trim()

  if (!trimmedTitle) {
    return {
      isValid: false,
      error: 'Title is required'
    }
  }

  if (trimmedTitle.length > PROFILE_VALIDATION.TITLE_MAX_LENGTH) {
    return {
      isValid: false,
      error: `Title must be no more than ${PROFILE_VALIDATION.TITLE_MAX_LENGTH} characters`
    }
  }

  return { isValid: true }
}

/**
 * Validates a complete profile creation request
 */
export function validateCreateProfileRequest(
  request: CreateProfileRequest, 
  existingSlugs: string[] = []
): ProfileValidation {
  const slugValidation = validateProfileSlug(request.slug, existingSlugs)
  const titleValidation = validateProfileTitle(request.title)

  return {
    slug: slugValidation,
    title: titleValidation
  }
}

/**
 * Creates a new profile object from a creation request
 */
export function createProfileFromRequest(
  request: CreateProfileRequest,
  sourceGospelData: GospelPresentationData
): Omit<GospelProfile, 'id'> {
  const now = new Date()
  
  return {
    slug: request.slug.toLowerCase().trim(),
    title: request.title.trim(),
    description: request.description?.trim() || '',
    gospelData: JSON.parse(JSON.stringify(sourceGospelData)), // Deep clone
    isDefault: false,
    visitCount: 0,
    createdAt: now,
    updatedAt: now
  }
}

/**
 * Creates the default profile object
 */
export function createDefaultProfile(gospelData: GospelPresentationData): Omit<GospelProfile, 'id'> {
  const now = new Date()
  
  return {
    slug: 'default',
    title: 'Default Gospel Presentation',
    description: 'The original gospel presentation',
    gospelData: JSON.parse(JSON.stringify(gospelData)), // Deep clone
    isDefault: true,
    visitCount: 0,
    createdAt: now,
    updatedAt: now
  }
}

/**
 * Sanitizes profile data for public consumption (removes sensitive fields)
 */
export function sanitizeProfileForPublic(profile: GospelProfile): Omit<GospelProfile, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    slug: profile.slug,
    title: profile.title,
    description: profile.description,
    gospelData: profile.gospelData,
    isDefault: profile.isDefault,
    visitCount: profile.visitCount
  }
}

/**
 * Generates a unique slug suggestion based on title
 */
export function generateSlugSuggestion(title: string, existingSlugs: string[] = []): string {
  if (!title.trim()) {
    return ''
  }

  // Convert title to slug format with enhanced processing
  let baseSlug = title
    .toLowerCase()                           // Convert to lowercase
    .trim()                                 // Remove leading/trailing spaces
    .replace(/[^\w\s-]/g, '')              // Remove special characters except spaces and hyphens
    .replace(/[\s_-]+/g, '')               // Remove spaces, underscores, and hyphens
    .replace(/[^a-z0-9]/g, '')             // Ensure only alphanumeric characters remain
    .substring(0, PROFILE_VALIDATION.SLUG_MAX_LENGTH) // Truncate to max length

  // Ensure it starts with a letter (prepend 'profile' if it starts with number)
  if (!/^[a-z]/.test(baseSlug)) {
    if (baseSlug.length > 0 && /^[0-9]/.test(baseSlug)) {
      baseSlug = 'profile' + baseSlug
    } else {
      baseSlug = 'profile'
    }
  }

  // Ensure minimum length
  if (baseSlug.length < PROFILE_VALIDATION.SLUG_MIN_LENGTH) {
    baseSlug = baseSlug.padEnd(PROFILE_VALIDATION.SLUG_MIN_LENGTH, '0')
  }

  // Truncate again if padding made it too long
  baseSlug = baseSlug.substring(0, PROFILE_VALIDATION.SLUG_MAX_LENGTH)

  // If unique, return as-is
  if (!existingSlugs.includes(baseSlug)) {
    return baseSlug
  }

  // Add numbers until unique
  let counter = 1
  let candidateSlug = baseSlug
  
  while (existingSlugs.includes(candidateSlug) && counter < 100) {
    const suffix = counter.toString()
    const maxBaseLength = PROFILE_VALIDATION.SLUG_MAX_LENGTH - suffix.length
    candidateSlug = baseSlug.substring(0, maxBaseLength) + suffix
    counter++
  }

  return candidateSlug
}