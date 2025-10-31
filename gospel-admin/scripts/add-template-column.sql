-- Add is_template column to profiles table
-- Run this in the Supabase SQL Editor

-- Add the column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT false;

-- Mark the default profile as a template
UPDATE profiles 
SET is_template = true 
WHERE is_default = true;

-- Verify
SELECT slug, title, is_default, is_template 
FROM profiles 
ORDER BY is_default DESC, is_template DESC, created_at;
