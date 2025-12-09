-- ======================================================
-- ADD CUSTOM COLUMNS SUPPORT TO TOPICS TABLE
-- This enables dynamic custom columns with JSONB storage
-- ======================================================
-- Run this in Supabase SQL Editor:
-- https://app.supabase.com/project/nqpfjsduwxyrwclpssig/sql
-- ======================================================

-- Add custom_columns field to store column definitions
ALTER TABLE topics 
ADD COLUMN IF NOT EXISTS custom_columns JSONB DEFAULT '[]'::jsonb;

-- Add custom_data field to store custom column values
ALTER TABLE topics
ADD COLUMN IF NOT EXISTS custom_data JSONB DEFAULT '{}'::jsonb;

-- Create a table to store custom column definitions globally
CREATE TABLE IF NOT EXISTS custom_column_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    column_name TEXT NOT NULL UNIQUE,
    column_type TEXT NOT NULL, -- 'text', 'date', 'checkbox', 'tags'
    column_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries on custom data
CREATE INDEX IF NOT EXISTS idx_topics_custom_data ON topics USING GIN (custom_data);

-- ======================================================
-- VERIFICATION: After running, check with:
-- SELECT column_name, data_type FROM information_schema.columns 
-- WHERE table_name = 'topics' AND column_name IN ('custom_columns', 'custom_data');
-- SELECT * FROM custom_column_definitions;
-- ======================================================
