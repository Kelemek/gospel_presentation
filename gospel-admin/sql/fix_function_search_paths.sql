-- Fix Function Search Path Mutable Security Warnings
-- Run this in Supabase SQL Editor
-- 
-- This addresses Supabase database linter warnings about functions with mutable search_path.
-- Setting search_path prevents potential SQL injection via search_path manipulation.
-- Reference: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable

-- ============================================================================
-- 1. link_user_to_profile_access
-- ============================================================================

CREATE OR REPLACE FUNCTION public.link_user_to_profile_access()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update any profile_access records that match this user's email
  UPDATE public.profile_access
  SET user_id = NEW.id
  WHERE user_email = NEW.email AND user_id IS NULL;
  
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 2. get_cached_scripture
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_cached_scripture(
  p_reference TEXT,
  p_translation TEXT,
  p_ttl_days INTEGER DEFAULT 30
)
RETURNS TABLE (text TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT sc.text
  FROM scripture_cache sc
  WHERE sc.reference = p_reference
    AND sc.translation = p_translation
    AND sc.cached_at >= NOW() - (p_ttl_days || ' days')::INTERVAL;
END;
$$;

-- ============================================================================
-- 3. upsert_scripture_cache
-- ============================================================================

CREATE OR REPLACE FUNCTION public.upsert_scripture_cache(
  p_reference TEXT,
  p_translation TEXT,
  p_text TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO scripture_cache (reference, translation, text, cached_at)
  VALUES (p_reference, p_translation, p_text, NOW())
  ON CONFLICT (reference, translation)
  DO UPDATE SET
    text = EXCLUDED.text,
    cached_at = NOW();
END;
$$;

-- ============================================================================
-- 4. update_user_translation
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_user_translation(user_id UUID, new_translation VARCHAR(10))
RETURNS VOID 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE user_profiles 
  SET preferred_translation = new_translation 
  WHERE id = user_id;
END;
$$;

-- ============================================================================
-- 5. enforce_esv_cache_limit
-- ============================================================================

CREATE OR REPLACE FUNCTION public.enforce_esv_cache_limit(p_max_verses INTEGER DEFAULT 500)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count INTEGER;
  excess_count INTEGER;
  deleted_count INTEGER;
BEGIN
  -- Count current ESV cache entries
  SELECT COUNT(*) INTO current_count
  FROM scripture_cache
  WHERE translation = 'esv';
  
  -- If under limit, no action needed
  IF current_count <= p_max_verses THEN
    RETURN 0;
  END IF;
  
  -- Calculate how many entries to delete
  excess_count := current_count - p_max_verses;
  
  -- Delete oldest (least recently used) entries
  DELETE FROM scripture_cache
  WHERE translation = 'esv'
    AND reference IN (
      SELECT reference
      FROM scripture_cache
      WHERE translation = 'esv'
      ORDER BY cached_at ASC
      LIMIT excess_count
    );
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- ============================================================================
-- 6. update_updated_at_column
-- ============================================================================

-- This is a common trigger function - recreate it with search_path set
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 7. increment_visit_count
-- ============================================================================

CREATE OR REPLACE FUNCTION public.increment_visit_count(profile_slug TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles 
  SET 
    visit_count = visit_count + 1,
    last_visited = NOW(),
    updated_at = NOW()
  WHERE slug = profile_slug;
END;
$$;

-- ============================================================================
-- 8. handle_new_user
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, role, display_name)
  VALUES (
    NEW.id,
    'counselor', -- Default role, admin must be set manually
    NEW.email -- Use email as display_name initially
  );
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log the error but don't fail user creation
    RAISE WARNING 'Failed to create user_profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- ============================================================================
-- 9. get_user_role
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Temporarily disable RLS for this function
  SET LOCAL row_security = off;
  
  SELECT role::TEXT INTO user_role 
  FROM public.user_profiles 
  WHERE id = user_id;
  
  RETURN user_role;
END;
$$;

-- ============================================================================
-- Verification
-- ============================================================================

-- Verify all functions have search_path set
SELECT 
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  CASE 
    WHEN p.proconfig IS NOT NULL AND 'search_path=public' = ANY(p.proconfig) THEN '✓ Fixed'
    ELSE '✗ Still needs fix'
  END as search_path_status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'link_user_to_profile_access',
    'get_cached_scripture',
    'upsert_scripture_cache',
    'update_user_translation',
    'enforce_esv_cache_limit',
    'update_updated_at_column',
    'increment_visit_count',
    'handle_new_user',
    'get_user_role'
  )
ORDER BY p.proname;
