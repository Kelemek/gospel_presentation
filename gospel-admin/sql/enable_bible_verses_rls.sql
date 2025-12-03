-- Enable Row Level Security on bible_verses table
-- Run this in Supabase SQL Editor

-- Enable RLS
ALTER TABLE public.bible_verses ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to read bible verses (they're public scripture data)
CREATE POLICY "Allow public read access to bible_verses"
ON public.bible_verses
FOR SELECT
TO public
USING (true);

-- Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'bible_verses';
