// Types for Gospel Presentation Data Structure

export interface ScriptureReference {
  reference: string
  text?: string
  favorite?: boolean
}

export interface NestedSubsection {
  title: string
  content: string
  scriptureReferences?: ScriptureReference[]
}

export interface Subsection {
  title: string
  content: string
  scriptureReferences?: ScriptureReference[]
  nestedSubsections?: NestedSubsection[]
}

export interface GospelSection {
  section: string
  title: string
  subsections: Subsection[]
}

export type GospelPresentationData = GospelSection[]

// Profile System Types
export interface GospelProfile {
  id: string
  slug: string                    // URL path: 'default', 'myprofile', 'youthgroup'
  title: string                   // Display name
  description?: string            // Optional description
  gospelData: GospelSection[]     // Complete copy of gospel presentation data
  isDefault: boolean              // True for the / route
  visitCount: number              // Analytics counter
  createdAt: Date
  updatedAt: Date
  lastVisited?: Date              // Last time this profile was accessed by a visitor
}

// Lightweight profile metadata for index operations
export interface ProfileMetadata {
  id: string
  slug: string
  title: string
  description?: string
  isDefault: boolean
  visitCount: number
  lastVisited?: Date
  createdAt: Date
  updatedAt: Date
}

export interface ProfileValidation {
  slug: {
    isValid: boolean
    isUnique: boolean
    error?: string
  }
  title: {
    isValid: boolean
    error?: string
  }
}

export interface CreateProfileRequest {
  slug: string
  title: string
  description?: string
  cloneFromSlug?: string          // Which profile to clone from
}

export interface ProfileAnalytics {
  profileSlug: string
  visitCount: number
  lastVisited: Date
  createdAt: Date
  favoriteScriptures: string[]    // Most viewed scriptures in this profile
}

// Profile validation constants
export const PROFILE_VALIDATION = {
  SLUG_PATTERN: /^[a-z][a-z0-9]*$/,  // Must start with letter, only lowercase alphanumeric
  SLUG_MIN_LENGTH: 3,
  SLUG_MAX_LENGTH: 20,
  TITLE_MAX_LENGTH: 50,
  DESCRIPTION_MAX_LENGTH: 200,
  MAX_PROFILES_PER_USER: 50,
  RESERVED_SLUGS: ['admin', 'api', 'auth', '_next', 'favicon']
} as const