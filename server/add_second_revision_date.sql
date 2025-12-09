-- Add second_revision_date column to topics table
-- Run this in your Supabase SQL Editor

-- Add the missing second_revision_date column
ALTER TABLE topics ADD COLUMN IF NOT EXISTS second_revision_date DATE;

-- Verify columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'topics' AND column_name LIKE '%date%';
