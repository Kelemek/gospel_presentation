-- SQL function to increment profile visit count
-- Run this in your Supabase SQL Editor

CREATE OR REPLACE FUNCTION increment_visit_count(profile_slug TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION increment_visit_count(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_visit_count(TEXT) TO anon;
