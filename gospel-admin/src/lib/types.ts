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
  linkUrl?: string
  linkDescription?: string
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

export interface ProfileAccess {
  id: string
  profileId: string
  userEmail: string
  userId?: string | null         // Populated after user accepts invite
  accessRole: 'counselee' | 'counselor'
  grantedBy: string              // User ID who granted access
  createdAt: Date
}

export interface GospelProfile {
  id: string
  slug: string                    // URL path: UUID-based for security
  title: string                   // Display name
  description?: string            // Optional description
  gospelData: GospelSection[]     // Complete copy of gospel presentation data
  isDefault: boolean              // True for the / route
  isTemplate: boolean             // True for template profiles (editable only by admins)
  isPublic?: boolean             // When true and isTemplate, anonymous users can view via Resources dropdown
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
  accessList?: ProfileAccess[]    // List of users with access to this profile
}

/** GospelSection pill highlight: string = match any pill with that reference; object = match that reference only in the given section/subsection anchors */
export type ScriptureProgressPin =
  | string
  | Pick<NonNullable<GospelProfile['lastViewedScripture']>, 'reference' | 'sectionId' | 'subsectionId'>

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
  slug?: string                   // Optional - will be auto-generated if not provided
  title: string
  description?: string
  cloneFromSlug?: string          // Which profile to clone from
  isTemplate?: boolean            // Whether this is a template profile
  counseleeEmails?: string[]      // Email addresses to grant counselee access
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

// Resources dropdown order (admin_settings.public_template_order)
export interface ResourceOrderItemTemplate {
  type: 'template'
  slug: string
}

export interface ResourceOrderItemCategory {
  type: 'category'
  id: string
  name: string
  templateSlugs: string[]
}

export type ResourceOrderItem = ResourceOrderItemTemplate | ResourceOrderItemCategory

export function isResourceOrderItemCategory(
  item: ResourceOrderItem
): item is ResourceOrderItemCategory {
  return item.type === 'category'
}

export function isResourceOrderItemTemplate(
  item: ResourceOrderItem
): item is ResourceOrderItemTemplate {
  return item.type === 'template'
}

/** Parse public_template_order JSON from DB into ResourceOrderItem[] (new format only). */
export function parseResourceOrder(raw: unknown): ResourceOrderItem[] {
  if (!Array.isArray(raw)) return []
  const out: ResourceOrderItem[] = []
  for (const el of raw) {
    if (el && typeof el === 'object' && 'type' in el) {
      if ((el as any).type === 'template' && typeof (el as any).slug === 'string') {
        out.push({ type: 'template', slug: (el as any).slug })
      } else if (
        (el as any).type === 'category' &&
        typeof (el as any).id === 'string' &&
        typeof (el as any).name === 'string' &&
        Array.isArray((el as any).templateSlugs)
      ) {
        out.push({
          type: 'category',
          id: (el as any).id,
          name: (el as any).name,
          templateSlugs: (el as any).templateSlugs.filter((s: unknown) => typeof s === 'string')
        })
      }
    }
  }
  return out
}