// Types for Gospel Presentation Data Structure

export interface ScriptureReference {
  reference: string
  text?: string
  favorite?: boolean
}

export interface QuestionAnswer {
  id: string
  question: string
  answer?: string              // User's answer (optional until they save it)
  maxLength?: number           // Maximum characters allowed for answer
  createdAt?: Date            // When the question was added
  answeredAt?: Date           // When the user last saved their answer
}

export interface NestedSubsection {
  title: string
  content: string
  scriptureReferences?: ScriptureReference[]
  questions?: QuestionAnswer[]
}

export interface Subsection {
  title: string
  content: string
  scriptureReferences?: ScriptureReference[]
  nestedSubsections?: NestedSubsection[]
  questions?: QuestionAnswer[]
}

export interface GospelSection {
  section: string
  title: string
  subsections: Subsection[]
}

export type GospelPresentationData = GospelSection[]

// Saved answer from anonymous user
export interface SavedAnswer {
  questionId: string              // ID of the question being answered
  answer: string                  // User's answer text
  answeredAt: Date               // When the answer was saved
}

// Profile System Types
export interface GospelProfile {
  id: string
  slug: string                    // URL path: 'default', 'myprofile', 'youthgroup'
  title: string                   // Display name
  description?: string            // Optional description
  gospelData: GospelSection[]     // Complete copy of gospel presentation data
  isDefault: boolean              // True for the / route
  isTemplate: boolean             // True for template profiles (editable only by admins)
  visitCount: number              // Analytics counter
  createdAt: Date
  updatedAt: Date
  lastVisited?: Date              // Last time this profile was accessed by a visitor
  lastViewedScripture?: {         // Track reading progress (non-default profiles only)
    reference: string
    sectionId: string             // For navigation purposes
    subsectionId: string          // For navigation purposes
    viewedAt: Date
  }
  savedAnswers?: SavedAnswer[]    // Answers saved by anonymous users viewing this profile
  createdBy?: string | null       // User ID who created this profile
  ownerDisplayName?: string | null // Display name of the owner
}

// Lightweight profile metadata for index operations
export interface ProfileMetadata {
  id: string
  slug: string
  title: string
  description?: string
  isDefault: boolean
  isTemplate: boolean
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
  isTemplate?: boolean            // Whether this is a template profile
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
  QUESTION_MAX_LENGTH: 500,        // Max length for question text
  ANSWER_MAX_LENGTH: 2000,         // Max length for answer text (allows full explanation)
  MAX_PROFILES_PER_USER: 50,
  RESERVED_SLUGS: ['admin', 'api', 'auth', '_next', 'favicon']
} as const