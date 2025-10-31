-- Assign all migrated profiles to the admin user
-- Run this in Supabase SQL Editor

-- First, get your admin user ID
SELECT id, email FROM auth.users WHERE email = 'markdlarson@me.com';

-- Assign all profiles without an owner to the admin user
-- Replace 'YOUR-ADMIN-USER-ID' with the ID from the query above
UPDATE public.profiles
SET created_by = 'YOUR-ADMIN-USER-ID'
WHERE created_by IS NULL;

-- Or run this combined query (it will auto-get your user ID):
UPDATE public.profiles
SET created_by = (
  SELECT id FROM auth.users WHERE email = 'markdlarson@me.com' LIMIT 1
)
WHERE created_by IS NULL;

-- Verify all profiles are now assigned
SELECT 
  p.slug,
  p.title,
  p.created_by,
  u.email as owner_email
FROM public.profiles p
LEFT JOIN auth.users u ON u.id = p.created_by
ORDER BY p.created_at;
