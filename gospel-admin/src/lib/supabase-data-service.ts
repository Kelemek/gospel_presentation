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
    
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        *,
        owner:user_profiles!profiles_created_by_fkey(display_name)
      `)
      .order('created_at', { ascending: true })
    
    if (error) throw error
    
    logger.debug(`[supabase-data-service] Loaded ${data.length} profiles`)
    
    return data.map((row: any) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.description || undefined,
      isDefault: row.is_default,
      visitCount: row.visit_count,
      gospelData: row.gospel_data as unknown as GospelPresentationData,
      lastViewedScripture: row.last_viewed_scripture ? {
        reference: row.last_viewed_scripture.reference,
        sectionId: row.last_viewed_scripture.sectionId,
        subsectionId: row.last_viewed_scripture.subsectionId,
        viewedAt: new Date(row.last_viewed_scripture.viewedAt)
      } : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      lastVisited: row.last_visited ? new Date(row.last_visited) : undefined,
      createdBy: row.created_by,
      ownerDisplayName: row.owner?.display_name || null
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
      visitCount: row.visit_count,
      gospelData: row.gospel_data as unknown as GospelPresentationData,
      lastViewedScripture: row.last_viewed_scripture ? {
        reference: row.last_viewed_scripture.reference,
        sectionId: row.last_viewed_scripture.sectionId,
        subsectionId: row.last_viewed_scripture.subsectionId,
        viewedAt: new Date(row.last_viewed_scripture.viewedAt)
      } : undefined,
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
    
    // Check if slug already exists
    const existing = await getProfileBySlug(request.slug)
    if (existing) {
      throw new Error(`Profile with slug '${request.slug}' already exists`)
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
        slug: request.slug,
        title: request.title,
        description: request.description,
        gospel_data: sourceProfile.gospelData,
        is_default: false,
        created_by: user.id // Automatically owned by current user
      })
      .select()
      .single()
    
    if (error) throw error
    
    logger.debug(`[supabase-data-service] Created profile: ${request.slug}`)
    
    return {
      id: data.id,
      slug: data.slug,
      title: data.title,
      description: data.description || undefined,
      isDefault: data.is_default,
      visitCount: data.visit_count,
      gospelData: data.gospel_data as GospelPresentationData,
      lastViewedScripture: undefined,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      lastVisited: undefined
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
  }>
): Promise<GospelProfile> {
  try {
    const supabase = await createClient()
    
    const updateData: any = {}
    if (updates.title !== undefined) updateData.title = updates.title
    if (updates.description !== undefined) updateData.description = updates.description
    if (updates.gospelData !== undefined) updateData.gospel_data = updates.gospelData
    if (updates.lastViewedScripture !== undefined) {
      updateData.last_viewed_scripture = updates.lastViewedScripture
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
      visitCount: data.visit_count,
      gospelData: data.gospel_data as GospelPresentationData,
      lastViewedScripture: data.last_viewed_scripture ? {
        reference: data.last_viewed_scripture.reference,
        sectionId: data.last_viewed_scripture.sectionId,
        subsectionId: data.last_viewed_scripture.subsectionId,
        viewedAt: new Date(data.last_viewed_scripture.viewedAt)
      } : undefined,
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
    
    const { error } = await supabase.rpc('increment_visit_count', { profile_slug: slug })
    
    if (error) throw error
    
    logger.debug(`[supabase-data-service] Incremented visit count for: ${slug}`)
  } catch (error) {
    logger.warn(`[supabase-data-service] Error incrementing visit count for ${slug}:`, error)
  }
}
