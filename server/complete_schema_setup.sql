-- =====================================================
-- COMPLETE SCHEMA SETUP FOR NOTION STUDY APP
-- =====================================================
-- Run this ONCE in your Supabase SQL Editor to set up all features
-- https://app.supabase.com/project/nqpfjsduwxyrwclpssig/sql
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. TOPICS TABLE - Main data table
-- =====================================================
CREATE TABLE IF NOT EXISTS topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notion_id TEXT UNIQUE,
    topic_name TEXT NOT NULL,
    subject_category TEXT,
    no INTEGER,
    priority TEXT,
    source TEXT,
    duration DECIMAL(4,2),
    planned_date DATE,
    mcq_solving_date DATE,
    first_revision_date DATE,
    second_revision_date DATE,
    completed TEXT DEFAULT 'False',
    first_revision TEXT,
    second_revision TEXT,
    times_repeated INTEGER DEFAULT 0,
    pyq_asked TEXT,
    parent_id UUID REFERENCES topics(id) ON DELETE CASCADE,
    notes TEXT DEFAULT '',
    custom_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add columns if they don't exist (for existing tables)
ALTER TABLE topics ADD COLUMN IF NOT EXISTS second_revision_date DATE;
ALTER TABLE topics ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES topics(id) ON DELETE CASCADE;
ALTER TABLE topics ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';
ALTER TABLE topics ADD COLUMN IF NOT EXISTS custom_data JSONB DEFAULT '{}'::jsonb;

-- =====================================================
-- 2. CUSTOM COLUMN DEFINITIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS custom_column_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    column_name TEXT NOT NULL UNIQUE,
    column_type TEXT NOT NULL CHECK (column_type IN ('text', 'date', 'checkbox', 'tags')),
    column_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. PAGES TABLE (for sub-pages/notes)
-- =====================================================
CREATE TABLE IF NOT EXISTS pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID REFERENCES pages(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'Untitled',
    content_html TEXT DEFAULT '',
    icon TEXT DEFAULT '📝',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 4. INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_topics_subject ON topics(subject_category);
CREATE INDEX IF NOT EXISTS idx_topics_completed ON topics(completed);
CREATE INDEX IF NOT EXISTS idx_topics_notion_id ON topics(notion_id);
CREATE INDEX IF NOT EXISTS idx_topics_parent_id ON topics(parent_id);
CREATE INDEX IF NOT EXISTS idx_topics_planned_date ON topics(planned_date);
CREATE INDEX IF NOT EXISTS idx_topics_first_revision_date ON topics(first_revision_date);
CREATE INDEX IF NOT EXISTS idx_topics_second_revision_date ON topics(second_revision_date);
CREATE INDEX IF NOT EXISTS idx_custom_columns_order ON custom_column_definitions(column_order);

-- =====================================================
-- 5. AUTO-UPDATE TRIGGERS
-- =====================================================
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

DROP TRIGGER IF EXISTS update_pages_updated_at ON pages;
CREATE TRIGGER update_pages_updated_at
    BEFORE UPDATE ON pages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VERIFICATION
-- =====================================================
-- Check all columns exist:
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'topics' 
ORDER BY ordinal_position;

-- Check custom_column_definitions table:
SELECT * FROM custom_column_definitions LIMIT 5;

-- =====================================================
-- SUCCESS! Schema is now complete.
-- You should see all date columns including second_revision_date
-- =====================================================
