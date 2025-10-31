-- Manual User Creation (Alternative Method)
-- Use this if the automatic user creation via Supabase UI fails

-- Step 1: First, create the user via Supabase Auth UI
-- Go to Authentication → Users → Add User
-- Note down the user ID (UUID)

-- Step 2: Then run this SQL to create their profile
-- Replace 'YOUR-USER-ID-HERE' with the actual UUID from Step 1

INSERT INTO public.user_profiles (id, email, role, created_at, updated_at)
VALUES (
  'YOUR-USER-ID-HERE', -- Replace with actual user ID
  'your-email@example.com', -- Replace with actual email
  'admin', -- 'admin' or 'counselor'
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE
SET 
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  updated_at = NOW();

-- Step 3: Verify it was created
SELECT * FROM public.user_profiles WHERE email = 'your-email@example.com';

-- Example:
-- INSERT INTO public.user_profiles (id, email, role, created_at, updated_at)
-- VALUES (
--   'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
--   'admin@example.com',
--   'admin',
--   NOW(),
--   NOW()
-- );
