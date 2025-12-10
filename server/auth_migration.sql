-- =====================================================
-- AUTH & MULTI-TENANCY MIGRATION
-- =====================================================

-- 1. Create Master Syllabus (Template) from existing data
-- This table will hold the "fresh" copy of data for new users
CREATE TABLE IF NOT EXISTS master_syllabus AS 
SELECT * FROM topics;

-- Remove ID from master_syllabus so we generate new IDs when copying
-- Actually, we can just select columns explicitly when copying.

-- 2. Add user_id to topics table
-- We enable it to be nullable first, to not break existing data immediately
ALTER TABLE topics 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 3. Create Index for performance
CREATE INDEX IF NOT EXISTS idx_topics_user ON topics(user_id);

-- 4. (Optional) Row Level Security
-- ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can only see their own topics" ON topics
--     FOR ALL
--     USING (auth.uid() = user_id);

-- =====================================================
-- RUN THIS IN SUPABASE SQL EDITOR
-- =====================================================
