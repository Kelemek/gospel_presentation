-- Add saved_answers column to profiles table
-- This stores answers that anonymous users provide to reflection questions
-- Run this in Supabase SQL Editor

-- Add the column to store saved answers as JSONB
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS saved_answers JSONB DEFAULT '[]'::jsonb;

-- Add a comment explaining the column
COMMENT ON COLUMN public.profiles.saved_answers IS 'Array of saved answers from users: [{ questionId: string, answer: string, answeredAt: timestamp }]';

-- Create an index for faster querying by question IDs
CREATE INDEX IF NOT EXISTS idx_profiles_saved_answers 
ON public.profiles USING gin(saved_answers);

-- Verify the column was added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'saved_answers';
