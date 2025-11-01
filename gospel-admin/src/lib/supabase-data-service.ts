// @ts-nocheck
// Supabase data service - replaces blob-data-service.ts
// Note: Type checking disabled due to Supabase client type inference issues
import { createClient } from './supabase/server'
import type { Database } from './supabase/database.types'
import type { GospelProfile, CreateProfileRequest, GospelPresentationData } from './types'
import { logger } from './logger'

/**
 * Loads gospel presentation data
 * For now, returns the default profile's gospel data
 */
export async function loadGospelData(): Promise<GospelPresentationData> {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('profiles')
      .select('gospel_data')
      .eq('is_default', true)
      .single()
    
    if (error) throw error
    
    logger.debug('[supabase-data-service] Loaded gospel data from default profile')
    return (data as any).gospel_data as GospelPresentationData
  } catch (error) {
    logger.error('[supabase-data-service] Error loading gospel data:', error)
    return []
  }
}

/**
 * Gets all profiles (respects RLS - users only see their own + default)
 */
export async function getProfiles(): Promise<GospelProfile[]> {
  try {
    const supabase = await createClient()
    
    // First get all profiles
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: true })
    
    if (error) {
      logger.error('[supabase-data-service] Error loading profiles:', error)
      throw error
    }
    
    // Get unique user IDs
    const userIds = [...new Set(data?.map(p => p.created_by).filter(Boolean))]
    
    // Get user display names
    let userMap = new Map()
    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('user_profiles')
        .select('id, display_name')
        .in('id', userIds)
      
      if (users) {
        users.forEach(u => userMap.set(u.id, u.display_name))
      }
    }
    
    // Get profile access (counselees) for all profiles
    const profileIds = data?.map(p => p.id).filter(Boolean) || []
    let accessMap = new Map()
    if (profileIds.length > 0) {
      const { data: accessData } = await supabase
        .from('profile_access')
        .select('profile_id, user_email, user_id')
        .in('profile_id', profileIds)
      
      if (accessData) {
        // Group by profile_id
        accessData.forEach(access => {
          if (!accessMap.has(access.profile_id)) {
            accessMap.set(access.profile_id, [])
          }
          accessMap.get(access.profile_id).push(access.user_email)
        })
      }
    }
    
    logger.debug(`[supabase-data-service] Loaded ${data?.length || 0} profiles`)
    
    return data.map((row: any) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.description || undefined,
      isDefault: row.is_default,
      isTemplate: row.is_template || false,
      visitCount: row.visit_count,
      gospelData: row.gospel_data as unknown as GospelPresentationData,
      lastViewedScripture: row.last_viewed_scripture ? {
        reference: row.last_viewed_scripture.reference,
        sectionId: row.last_viewed_scripture.sectionId,
        subsectionId: row.last_viewed_scripture.subsectionId,
        viewedAt: new Date(row.last_viewed_scripture.viewedAt)
      } : undefined,
      savedAnswers: row.saved_answers || [],
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      lastVisited: row.last_visited ? new Date(row.last_visited) : undefined,
      createdBy: row.created_by,
      ownerDisplayName: row.created_by ? userMap.get(row.created_by) || null : null,
      counseleeEmails: accessMap.get(row.id) || []
    }))
  } catch (error) {
    logger.error('[supabase-data-service] Error loading profiles:', error)
    return []
  }
}

/**
 * Gets a profile by slug (respects RLS)
 */
export async function getProfileBySlug(slug: string): Promise<GospelProfile | null> {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('slug', slug)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null
      }
      throw error
    }
    
    logger.debug(`[supabase-data-service] Loaded profile: ${slug}`)
    
    const row = data as any
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.description || undefined,
      isDefault: row.is_default,
      isTemplate: row.is_template || false,
      visitCount: row.visit_count,
      gospelData: row.gospel_data as unknown as GospelPresentationData,
      lastViewedScripture: row.last_viewed_scripture ? {
        reference: row.last_viewed_scripture.reference,
        sectionId: row.last_viewed_scripture.sectionId,
        subsectionId: row.last_viewed_scripture.subsectionId,
        viewedAt: new Date(row.last_viewed_scripture.viewedAt)
      } : undefined,
      savedAnswers: row.saved_answers || [],
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      lastVisited: row.last_visited ? new Date(row.last_visited) : undefined
    }
  } catch (error) {
    logger.error(`[supabase-data-service] Error loading profile ${slug}:`, error)
    return null
  }
}

/**
 * Creates a new profile
 */
export async function createProfile(request: CreateProfileRequest): Promise<GospelProfile> {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')
    
    // Generate secure slug if not provided
    const profileSlug = request.slug || crypto.randomUUID().split('-')[0]
    
    // Check if slug already exists
    const existing = await getProfileBySlug(profileSlug)
    if (existing) {
      throw new Error(`Profile with slug '${profileSlug}' already exists`)
    }
    
    // Clone gospel data from source profile
    const sourceSlug = request.cloneFromSlug || 'default'
    const sourceProfile = await getProfileBySlug(sourceSlug)
    if (!sourceProfile) {
      throw new Error(`Source profile '${sourceSlug}' not found`)
    }
    
    // Create new profile
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        slug: profileSlug,
        title: request.title,
        description: request.description,
        gospel_data: sourceProfile.gospelData,
        is_default: false,
        is_template: request.isTemplate || false,
        created_by: user.id // Automatically owned by current user
      })
      .select()
      .single()
    
    if (error) throw error
    
    logger.debug(`[supabase-data-service] Created profile: ${profileSlug}`)
    
    // If counselee emails were provided, grant them access
    if (request.counseleeEmails && request.counseleeEmails.length > 0) {
      await grantProfileAccess(data.id, request.counseleeEmails, user.id)
    }
    
    return {
      id: data.id,
      slug: data.slug,
      title: data.title,
      description: data.description || undefined,
      isDefault: data.is_default,
      isTemplate: data.is_template || false,
      visitCount: data.visit_count,
      gospelData: data.gospel_data as GospelPresentationData,
      lastViewedScripture: undefined,
      savedAnswers: [],
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      lastVisited: undefined,
      createdBy: data.created_by,
      accessList: []
    }
  } catch (error) {
    logger.error('[supabase-data-service] Error creating profile:', error)
    throw error
  }
}

/**
 * Updates a profile (RLS ensures users can only update their own)
 */
export async function updateProfile(
  slug: string,
  updates: Partial<{
    title: string
    description: string
    gospelData: GospelPresentationData
    lastViewedScripture: any
    savedAnswers: any[]
  }>
): Promise<GospelProfile> {
  try {
    const supabase = await createClient()
    
    const updateData: any = {}
    if (updates.title !== undefined) updateData.title = updates.title
    if (updates.description !== undefined) updateData.description = updates.description
    if (updates.gospelData !== undefined) updateData.gospel_data = updates.gospelData
    if (updates.lastViewedScripture !== undefined) {
      // Use null to clear the field, otherwise use the value
      updateData.last_viewed_scripture = updates.lastViewedScripture === null ? null : updates.lastViewedScripture
    }
    if (updates.savedAnswers !== undefined) {
      updateData.saved_answers = updates.savedAnswers
    }
    
    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('slug', slug)
      .select()
      .single()
    
    if (error) throw error
    
    logger.debug(`[supabase-data-service] Updated profile: ${slug}`)
    
    return {
      id: data.id,
      slug: data.slug,
      title: data.title,
      description: data.description || undefined,
      isDefault: data.is_default,
      isTemplate: data.is_template || false,
      visitCount: data.visit_count,
      gospelData: data.gospel_data as GospelPresentationData,
      lastViewedScripture: data.last_viewed_scripture ? {
        reference: data.last_viewed_scripture.reference,
        sectionId: data.last_viewed_scripture.sectionId,
        subsectionId: data.last_viewed_scripture.subsectionId,
        viewedAt: new Date(data.last_viewed_scripture.viewedAt)
      } : undefined,
      savedAnswers: data.saved_answers || [],
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      lastVisited: data.last_visited ? new Date(data.last_visited) : undefined
    }
  } catch (error) {
    logger.error(`[supabase-data-service] Error updating profile ${slug}:`, error)
    throw error
  }
}

/**
 * Deletes a profile (RLS ensures users can only delete their own)
 */
export async function deleteProfile(slug: string): Promise<void> {
  try {
    const supabase = await createClient()
    
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('slug', slug)
    
    if (error) throw error
    
    logger.debug(`[supabase-data-service] Deleted profile: ${slug}`)
  } catch (error) {
    logger.error(`[supabase-data-service] Error deleting profile ${slug}:`, error)
    throw error
  }
}

/**
 * Increments visit count for a profile
 */
export async function incrementProfileVisitCount(slug: string): Promise<void> {
  try {
    const supabase = await createClient()
    
    // Use RPC to increment atomically
    await supabase.rpc('increment_visit_count', { profile_slug: slug })
    
    logger.debug(`[supabase-data-service] Incremented visit count for: ${slug}`)
  } catch (error) {
    // Don't throw - visit count is not critical
    logger.warn(`[supabase-data-service] Error incrementing visit count for ${slug}:`, error)
  }
}

/**
 * Grants access to a profile for counselee users
 * Creates auth accounts if they don't exist
 */
export async function grantProfileAccess(
  profileId: string,
  emails: string[],
  grantedBy: string
): Promise<void> {
  try {
    const supabase = await createClient()
    
    // Validate emails
    const validEmails = emails.filter(email => {
      const trimmed = email.trim().toLowerCase()
      return trimmed && trimmed.includes('@')
    })
    
    if (validEmails.length === 0) {
      logger.warn('[supabase-data-service] No valid emails provided for access grant')
      return
    }
    
    // Insert access records
    const accessRecords = validEmails.map(email => ({
      profile_id: profileId,
      user_email: email.trim().toLowerCase(),
      access_role: 'counselee' as const,
      granted_by: grantedBy
    }))
    
    const { error } = await supabase
      .from('profile_access')
      .upsert(accessRecords, { 
        onConflict: 'profile_id,user_email',
        ignoreDuplicates: false 
      })
    
    if (error) throw error
    
    logger.debug(`[supabase-data-service] Granted access to ${validEmails.length} users for profile ${profileId}`)
    
    // Invite users who don't have accounts yet
    await inviteCounseleeUsers(validEmails, profileId)
  } catch (error) {
    logger.error('[supabase-data-service] Error granting profile access:', error)
    throw error
  }
}

/**
 * Revokes access to a profile
 */
export async function revokeProfileAccess(
  profileId: string,
  email: string
): Promise<void> {
  try {
    const supabase = await createClient()
    
    const { error } = await supabase
      .from('profile_access')
      .delete()
      .eq('profile_id', profileId)
      .eq('user_email', email.trim().toLowerCase())
    
    if (error) throw error
    
    logger.debug(`[supabase-data-service] Revoked access for ${email} to profile ${profileId}`)
  } catch (error) {
    logger.error('[supabase-data-service] Error revoking profile access:', error)
    throw error
  }
}

/**
 * Gets the access list for a profile
 */
export async function getProfileAccessList(profileId: string): Promise<any[]> {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('profile_access')
      .select('*')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: true })
    
    if (error) throw error
    
    return data || []
  } catch (error) {
    logger.error('[supabase-data-service] Error getting profile access list:', error)
    return []
  }
}

/**
 * Invites counselee users who don't have accounts yet
 * This will send them an email invitation to sign up
 */
async function inviteCounseleeUsers(emails: string[], profileId: string): Promise<void> {
  try {
    const supabase = await createClient()
    
    // Check which emails don't have accounts
    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    const existingEmails = new Set(existingUsers?.users?.map(u => u.email?.toLowerCase()) || [])
    
    const newEmails = emails.filter(email => !existingEmails.has(email.toLowerCase()))
    
    if (newEmails.length === 0) {
      logger.debug('[supabase-data-service] All users already have accounts')
      return
    }
    
    // Get the profile details for the welcome email
    const { data: profile } = await supabase
      .from('profiles')
      .select('title, slug')
      .eq('id', profileId)
      .single()
    
    // Create accounts and send welcome emails
    for (const email of newEmails) {
      try {
        // Use inviteUserByEmail which sends a magic link and creates the account
        // Note: The redirect URL should be configured in Supabase Dashboard under Authentication > URL Configuration
        const { data, error } = await supabase.auth.admin.inviteUserByEmail(email.toLowerCase(), {
          data: {
            role: 'counselee',
            invited_for_profile: profileId,
            profile_title: profile?.title,
            profile_slug: profile?.slug
          }
          // redirectTo is optional - will use Supabase's configured Site URL + /auth/callback
        })
        
        if (error) {
          logger.warn(`[supabase-data-service] Failed to invite user ${email}:`, error.message)
        } else {
          logger.info(`[supabase-data-service] Sent welcome email to ${email} for profile: ${profile?.title}`)
        }
      } catch (err) {
        logger.warn(`[supabase-data-service] Error inviting user ${email}:`, err)
      }
    }
  } catch (error) {
    logger.warn('[supabase-data-service] Error inviting counselee users:', error)
    // Don't throw - access was granted, user creation is best-effort
  }
}

