-- Backfill user_profiles for existing users
-- Run this in Supabase SQL Editor

-- This will create user_profiles for any auth.users that don't have one yet
INSERT INTO public.user_profiles (id, role, display_name, created_at, updated_at)
SELECT 
  u.id,
  'counselor' as role,  -- Default role
  u.email as display_name,
  u.created_at,
  NOW() as updated_at
FROM auth.users u
LEFT JOIN public.user_profiles up ON u.id = up.id
WHERE up.id IS NULL;

-- Now update the first user to be admin (replace email with your actual email)
UPDATE public.user_profiles
SET role = 'admin'
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'markdlarson@me.com' LIMIT 1
);

-- Verify the users were created
SELECT 
  up.*,
  u.email
FROM public.user_profiles up
JOIN auth.users u ON u.id = up.id
ORDER BY up.created_at;
