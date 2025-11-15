-- Add view_preference column to user_profiles table
-- Stores user's preference for card or list view (default: 'list')

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS view_preference VARCHAR(10) DEFAULT 'list';

-- Create RLS policy to allow users to update their own view_preference (if it doesn't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_profiles' 
    AND policyname = 'Users can update own profile'
  ) THEN
    CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_view_preference 
ON user_profiles(id, view_preference);

COMMENT ON COLUMN user_profiles.view_preference IS 'User preference for viewing profiles: list or card layout';
