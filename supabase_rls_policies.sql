-- ============================================================
-- GenAI Academy - Prompts Table & RLS Policies Setup
-- Run this entire script in your Supabase SQL Editor
-- ============================================================

-- 0. Create the prompts table if it doesn't exist yet
CREATE TABLE IF NOT EXISTS prompts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  visibility TEXT DEFAULT 'public',
  status TEXT DEFAULT 'Pending',
  tool TEXT DEFAULT 'Text Prompts',
  tags TEXT DEFAULT '',
  image_url TEXT,
  author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL
);

-- Ensure image_url column exists if table was created previously
ALTER TABLE prompts ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 1. Make sure RLS is enabled on the prompts table
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to start fresh
DROP POLICY IF EXISTS "Public can view approved public prompts" ON prompts;
DROP POLICY IF EXISTS "Users can view their own prompts" ON prompts;
DROP POLICY IF EXISTS "Users can insert their own prompts" ON prompts;
DROP POLICY IF EXISTS "Users can update their own prompts" ON prompts;
DROP POLICY IF EXISTS "Users can delete their own prompts" ON prompts;
DROP POLICY IF EXISTS "Admins can view pending public prompts" ON prompts;
DROP POLICY IF EXISTS "Admins can update prompt status" ON prompts;
DROP POLICY IF EXISTS "Admins can delete prompts" ON prompts;

-- 3. POLICY: Anyone (even logged out) can see public + approved prompts
CREATE POLICY "Public can view approved public prompts"
ON prompts FOR SELECT
USING (
  visibility = 'public' AND status = 'Approved'
);

-- 4. POLICY: Logged-in users can ALWAYS see their OWN prompts (private + public)
CREATE POLICY "Users can view their own prompts"
ON prompts FOR SELECT
USING (
  auth.uid() = author_id
);

-- 5. POLICY: Logged-in users can INSERT their own prompts (non-admins can only insert public prompts as Pending, private prompts as Approved)
CREATE POLICY "Users can insert their own prompts"
ON prompts FOR INSERT
WITH CHECK (
  auth.uid() = author_id
  AND (
    visibility = 'private'
    OR
    (visibility = 'public' AND status = 'Pending')
    OR
    (auth.jwt() ->> 'email' = 'genaiacademy123@gmail.com')
  )
);

-- 6. POLICY: Logged-in users can UPDATE their own prompts (non-admins cannot approve their own public prompts)
CREATE POLICY "Users can update their own prompts"
ON prompts FOR UPDATE
USING (
  auth.uid() = author_id
)
WITH CHECK (
  auth.uid() = author_id
  AND (
    visibility = 'private'
    OR
    (visibility = 'public' AND status = 'Pending')
    OR
    (auth.jwt() ->> 'email' = 'genaiacademy123@gmail.com')
  )
);

-- 7. POLICY: Logged-in users can DELETE their own prompts
CREATE POLICY "Users can delete their own prompts"
ON prompts FOR DELETE
USING (
  auth.uid() = author_id
);

-- 8. POLICY: Admins can SELECT all PENDING PUBLIC prompts for moderation
--    (Private prompts are excluded - admins CANNOT see them)
CREATE POLICY "Admins can view pending public prompts"
ON prompts FOR SELECT
USING (
  visibility = 'public'
  AND status = 'Pending'
  AND auth.jwt() ->> 'email' = 'genaiacademy123@gmail.com'
);

-- 9. POLICY: Admins can UPDATE status (approve/reject) on PUBLIC prompts only
CREATE POLICY "Admins can update prompt status"
ON prompts FOR UPDATE
USING (
  visibility = 'public'
  AND auth.jwt() ->> 'email' = 'genaiacademy123@gmail.com'
);

-- 10. POLICY: Admins can DELETE public prompts (for rejection)
CREATE POLICY "Admins can delete prompts"
ON prompts FOR DELETE
USING (
  visibility = 'public'
  AND auth.jwt() ->> 'email' = 'genaiacademy123@gmail.com'
);

-- ============================================================
-- Also add 'tool' and 'tags' columns if they don't exist yet
-- ============================================================
ALTER TABLE prompts ADD COLUMN IF NOT EXISTS tool TEXT DEFAULT 'ChatGPT';
ALTER TABLE prompts ADD COLUMN IF NOT EXISTS tags TEXT DEFAULT '';
