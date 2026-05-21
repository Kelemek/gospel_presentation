/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
// Supabase data service - replaces blob-data-service.ts
// Note: Type checking disabled due to Supabase client type inference issues
import { createClient, createAdminClient } from './supabase/server'
import type { GospelProfile, CreateProfileRequest, GospelPresentationData } from './types'
import { parseResourceOrder, templateSlugsInResourceOrder } from './resourceOrderCategory'
import { isResourcesMenuPickableTemplateSlug } from './resourcesMenuPickableTemplates'
import { morneveLibraryMenuTitle } from './spurgeon/morneveSlug'
import { logger } from './logger'
import { validateProfileSlug } from './profile-service'

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
 * Gets all profiles using the provided client (bypasses RLS when admin client used)
 */
async function getProfilesWithClient(supabase: any): Promise<GospelProfile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    logger.error('[supabase-data-service] Error loading profiles:', error)
    throw error
  }

  const userIds = [...new Set(data?.map((p: any) => p.created_by).filter(Boolean))]
  const userMap = new Map()
  if (userIds.length > 0) {
    const { data: users } = await supabase
      .from('user_profiles')
      .select('id, display_name')
      .in('id', userIds)
    if (users) {
      users.forEach((u: any) => userMap.set(u.id, u.display_name))
    }
  }

  logger.debug(`[supabase-data-service] Loaded ${(data || []).length} profiles`)

  return (data || []).map((row: any) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description || undefined,
    isDefault: row.is_default,
    isTemplate: row.is_template || false,
    isPublic: row.is_public || false,
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
    ownerDisplayName: row.created_by ? userMap.get(row.created_by) || null : null
  }))
}

/**
 * Gets all profiles (respects RLS - users only see their own + default)
 * Admins bypass RLS via admin client to avoid session/verification-code issues
 */
export async function getProfiles(): Promise<GospelProfile[]> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    logger.debug('[supabase-data-service] getProfiles called', { userId: user?.id })

    if (user) {
      const adminClient = createAdminClient()
      const { data: userProfile } = await adminClient
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      const role = (userProfile as any)?.role
      logger.debug('[supabase-data-service] User role:', role)

      if (role === 'admin') {
        logger.debug('[supabase-data-service] Admin user - bypassing RLS for all profiles')
        return getProfilesWithClient(adminClient)
      }
    }

    logger.debug('[supabase-data-service] Using normal client (no user or non-admin role)')
    return getProfilesWithClient(supabase)
  } catch (error) {
    logger.error('[supabase-data-service] Error loading profiles:', error)
    return []
  }
}

export type PublicResourceCategoryChild =
  | { type: 'template'; slug: string; title: string }
  | { type: 'spurgeonLibrary'; title: string }
  | { type: 'morningEveningLibrary'; title: string }
  | { type: 'calvinLibrary'; title: string }

export type PublicResourceItem =
  | { type: 'template'; slug: string; title: string }
  | { type: 'category'; id: string; name: string; children: PublicResourceCategoryChild[] }
  | { type: 'spurgeonLibrary'; title: string }
  | { type: 'morningEveningLibrary'; title: string }
  | { type: 'calvinLibrary'; title: string }

/**
 * Gets public resources structure for the Resources dropdown (categories + templates with titles).
 * Uses regular client - RLS allows anon to see is_template AND is_public rows.
 * Order and categories come from admin_settings.public_template_order (new format only).
 */
export async function getPublicResourcesStructure(): Promise<PublicResourceItem[]> {
  try {
    const supabase = await createClient()

    const [profilesResult, orderResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('slug, title, include_in_resources_menu')
        .eq('is_template', true)
        .eq('is_public', true)
        .not('slug', 'ilike', 'sg%')
        .not('slug', 'ilike', 'me%')
        .not('slug', 'ilike', 'cv%'),
      supabase
        .from('admin_settings')
        .select('public_template_order')
        .eq('id', 1)
        .single()
    ])

    if (profilesResult.error) {
      logger.error('[supabase-data-service] Error loading public templates:', profilesResult.error)
      return []
    }

    const order = parseResourceOrder(orderResult.data?.public_template_order)
    const bySlug = new Map<string, { slug: string; title: string }>()

    const addMenuProfileRow = (row: { slug: string; title: string | null; include_in_resources_menu?: boolean }) => {
      if (row.include_in_resources_menu === false) return
      if (!isResourcesMenuPickableTemplateSlug(row.slug)) return
      bySlug.set(row.slug, { slug: row.slug, title: row.title || row.slug })
    }

    for (const row of profilesResult.data || []) {
      addMenuProfileRow(row)
    }

    const orderSlugs = [...new Set(templateSlugsInResourceOrder(order))]
    const missingOrderSlugs = orderSlugs.filter((slug) => !bySlug.has(slug))
    if (missingOrderSlugs.length > 0) {
      const { data: orderProfileRows, error: orderProfilesError } = await supabase
        .from('profiles')
        .select('slug, title, include_in_resources_menu')
        .eq('is_template', true)
        .eq('is_public', true)
        .in('slug', missingOrderSlugs)

      if (orderProfilesError) {
        logger.error(
          '[supabase-data-service] Error loading ordered template profiles:',
          orderProfilesError
        )
      } else {
        for (const row of orderProfileRows || []) {
          if (row.include_in_resources_menu === false) continue
          bySlug.set(row.slug, { slug: row.slug, title: row.title || row.slug })
        }
      }
    }
    const usedSlugs = new Set<string>()
    const items: PublicResourceItem[] = []

    for (const item of order) {
      if (item.type === 'template') {
        const p = bySlug.get(item.slug)
        if (p) {
          items.push({ type: 'template', slug: p.slug, title: p.title })
          usedSlugs.add(p.slug)
        }
      } else if (item.type === 'spurgeonLibrary') {
        items.push({
          type: 'spurgeonLibrary',
          title: item.title?.trim() || 'Spurgeon sermons',
        })
      } else if (item.type === 'morningEveningLibrary') {
        items.push({
          type: 'morningEveningLibrary',
          title: morneveLibraryMenuTitle(item.title),
        })
      } else if (item.type === 'calvinLibrary') {
        items.push({
          type: 'calvinLibrary',
          title: item.title?.trim() || "Calvin's Commentaries",
        })
      } else {
        const children: PublicResourceCategoryChild[] = []
        for (const child of item.children) {
          if (child.type === 'template') {
            const p = bySlug.get(child.slug)
            if (p) {
              children.push({ type: 'template', slug: p.slug, title: p.title })
              usedSlugs.add(p.slug)
            }
          } else if (child.type === 'spurgeonLibrary') {
            children.push({
              type: 'spurgeonLibrary',
              title: child.title?.trim() || 'Spurgeon sermons',
            })
          } else if (child.type === 'morningEveningLibrary') {
            children.push({
              type: 'morningEveningLibrary',
              title: morneveLibraryMenuTitle(child.title),
            })
          } else if (child.type === 'calvinLibrary') {
            children.push({
              type: 'calvinLibrary',
              title: child.title?.trim() || "Calvin's Commentaries",
            })
          }
        }
        items.push({ type: 'category', id: item.id, name: item.name, children })
      }
    }

    const rest = Array.from(bySlug.values())
      .filter((p) => !usedSlugs.has(p.slug))
      .sort((a, b) => (a.title || a.slug).localeCompare(b.title || b.slug, undefined, { sensitivity: 'base' }))
    for (const p of rest) {
      items.push({ type: 'template', slug: p.slug, title: p.title })
    }

    return items
  } catch (error) {
    logger.error('[supabase-data-service] Error loading public resources structure:', error)
    return []
  }
}

/**
 * Lightweight metadata fetch for SEO - avoids loading full gospelData
 */
export async function getProfileMeta(slug: string): Promise<{ title: string; description?: string; updatedAt: Date } | null> {
  try {
    const userClient = await createClient()
    const { data: { user } } = await userClient.auth.getUser()

    let supabase: any
    if (slug === 'default') {
      supabase = createAdminClient()
    } else if (user) {
      const adminClient = createAdminClient()
      const { data: userProfile } = await adminClient
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      const role = (userProfile as any)?.role
      if (role === 'admin') {
        supabase = adminClient
      } else {
        supabase = userClient
      }
    } else {
      supabase = userClient
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('title, description, updated_at')
      .eq('slug', slug)
      .single()

    if (error || !data) {
      if (error?.code === 'PGRST116') return null
      throw error
    }
    return {
      title: data.title,
      description: data.description || undefined,
      updatedAt: new Date(data.updated_at)
    }
  } catch (error) {
    logger.error('[supabase-data-service] Error loading profile meta:', error)
    return null
  }
}

/**
 * Returns profile updated_at only - for cache validation (lightweight, minimal DB hit)
 */
export async function getProfileUpdatedAt(slug: string): Promise<Date | null> {
  try {
    const meta = await getProfileMeta(slug)
    return meta?.updatedAt ?? null
  } catch {
    return null
  }
}

/**
 * Gets a profile by slug (respects RLS)
 * Uses admin client for: default profile, and when user is admin (enables template cloning)
 */
export async function getProfileBySlug(slug: string): Promise<GospelProfile | null> {
  try {
    const userClient = await createClient()
    const { data: { user } } = await userClient.auth.getUser()

    let supabase: any
    if (slug === 'default') {
      supabase = createAdminClient()
    } else if (user) {
      const adminClient = createAdminClient()
      const { data: userProfile } = await adminClient
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      const role = (userProfile as any)?.role
      if (role === 'admin') {
        supabase = adminClient
      } else {
        supabase = userClient
      }
    } else {
      supabase = userClient
    }

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
      isPublic: row.is_public || false,
      includeInResourcesMenu: row.include_in_resources_menu !== false,
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
    
    const rawProvidedSlug = typeof request.slug === 'string' ? request.slug.trim() : ''
    const profileSlug = rawProvidedSlug
      ? rawProvidedSlug.toLowerCase()
      : crypto.randomUUID().split('-')[0]

    if (rawProvidedSlug) {
      const slugValidation = validateProfileSlug(profileSlug)
      if (!slugValidation.isValid) {
        const err = new Error(slugValidation.error || 'Invalid slug') as Error & { httpStatus?: number }
        err.httpStatus = 400
        throw err
      }
    }

    // Check if slug already exists
    const existing = await getProfileBySlug(profileSlug)
    if (existing) {
      const err = new Error(`Profile with slug '${profileSlug}' already exists`) as Error & {
        httpStatus?: number
      }
      err.httpStatus = 400
      throw err
    }
    
    let gospelDataToInsert: GospelPresentationData
    if (request.blankGospelData) {
      gospelDataToInsert = []
    } else {
      const sourceSlug = request.cloneFromSlug || 'default'
      const sourceProfile = await getProfileBySlug(sourceSlug)
      if (!sourceProfile) {
        throw new Error(`Source profile '${sourceSlug}' not found`)
      }
      gospelDataToInsert = sourceProfile.gospelData
    }

    // Create new profile
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        slug: profileSlug,
        title: request.title,
        description: request.description,
        gospel_data: gospelDataToInsert,
        is_default: false,
        is_template: request.isTemplate || false,
        created_by: user.id // Automatically owned by current user
      })
      .select()
      .single()
    
    if (error) throw error
    
    logger.debug(`[supabase-data-service] Created profile: ${profileSlug}`)
    
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
      createdBy: data.created_by
    }
  } catch (error) {
    logger.error('[supabase-data-service] Error creating profile:', error)
    throw error
  }
}

/**
 * Updates a profile (RLS ensures users can only update their own)
 * Admins use admin client (bypass RLS). Other authenticated users rely on RLS.
 */
export async function updateProfile(
  slug: string,
  updates: Partial<{
    title: string
    description: string
    gospelData: GospelPresentationData
    lastViewedScripture: any
    isPublic: boolean
  }>
): Promise<GospelProfile> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    let clientToUse: any = supabase
    if (user) {
      const adminClient = createAdminClient()
      const { data: userProfile } = await adminClient
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      const role = (userProfile as any)?.role
      if (role === 'admin') {
        logger.debug('[supabase-data-service] Admin updating profile - bypassing RLS')
        clientToUse = adminClient
      }
    }
    
    const updateData: any = {}
    if (updates.title !== undefined) updateData.title = updates.title
    if (updates.description !== undefined) updateData.description = updates.description
    if (updates.gospelData !== undefined) updateData.gospel_data = updates.gospelData
    if (updates.lastViewedScripture !== undefined) {
      // Use null to clear the field, otherwise use the value
      updateData.last_viewed_scripture = updates.lastViewedScripture === null ? null : updates.lastViewedScripture
    }
    if (updates.isPublic !== undefined) {
      updateData.is_public = updates.isPublic
    }

    const { data, error } = await clientToUse
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
      isPublic: data.is_public || false,
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
