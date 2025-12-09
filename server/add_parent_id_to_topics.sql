-- ======================================================
-- ADD parent_id COLUMN TO topics TABLE
-- This enables hierarchical sub-pages within topics
-- ======================================================
-- Run this in Supabase SQL Editor:
-- https://app.supabase.com/project/nqpfjsduwxyrwclpssig/sql
-- ======================================================

-- Add parent_id column to topics table for hierarchical structure
ALTER TABLE topics 
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES topics(id) ON DELETE CASCADE;

-- Add notes column to topics table for rich text editing
ALTER TABLE topics
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create index for faster parent-child queries
CREATE INDEX IF NOT EXISTS idx_topics_parent_id ON topics(parent_id);

-- ======================================================
-- VERIFICATION: After running, check with:
-- SELECT column_name, data_type FROM information_schema.columns 
-- WHERE table_name = 'topics' AND column_name IN ('parent_id', 'notes');
-- ======================================================
