-- =====================================================
-- SUPABASE SETUP FOR NOTION STUDY APP
-- =====================================================
-- Run this SQL in your Supabase SQL Editor (https://app.supabase.com)
-- After creating your project, go to: SQL Editor > New Query
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the topics table
CREATE TABLE IF NOT EXISTS topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notion_id TEXT UNIQUE,  -- Links to Notion page ID for sync
    topic_name TEXT NOT NULL,
    subject_category TEXT,
    no INTEGER,
    priority TEXT,
    source TEXT,
    duration DECIMAL(4,2),
    planned_date DATE,
    mcq_solving_date DATE,
    first_revision_date DATE,
    completed TEXT DEFAULT 'False',
    first_revision TEXT,
    second_revision TEXT,
    times_repeated INTEGER DEFAULT 0,
    pyq_asked TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_topics_subject ON topics(subject_category);
CREATE INDEX IF NOT EXISTS idx_topics_completed ON topics(completed);
CREATE INDEX IF NOT EXISTS idx_topics_notion_id ON topics(notion_id);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_topics_updated_at ON topics;
CREATE TRIGGER update_topics_updated_at
    BEFORE UPDATE ON topics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (optional - uncomment if needed)
-- ALTER TABLE topics ENABLE ROW LEVEL SECURITY;

-- Allow public access (for development - restrict in production)
-- CREATE POLICY "Allow public access" ON topics FOR ALL USING (true);

-- =====================================================
-- VERIFICATION
-- =====================================================
-- After running this script, verify:
-- SELECT * FROM topics LIMIT 5;
-- =====================================================
