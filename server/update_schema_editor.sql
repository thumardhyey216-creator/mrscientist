-- =====================================================
-- UPDATE: Enhanced Page Content for Note Editor
-- Run this in Supabase SQL Editor
-- =====================================================

-- Add new columns for rich editing and hierarchy
ALTER TABLE page_content ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES page_content(id);
ALTER TABLE page_content ADD COLUMN IF NOT EXISTS title TEXT DEFAULT 'Untitled';
ALTER TABLE page_content ADD COLUMN IF NOT EXISTS content_html TEXT;
ALTER TABLE page_content ADD COLUMN IF NOT EXISTS page_type TEXT DEFAULT 'note';
ALTER TABLE page_content ADD COLUMN IF NOT EXISTS topic_id UUID REFERENCES topics(id);

-- Index for faster child page queries
CREATE INDEX IF NOT EXISTS idx_page_content_parent ON page_content(parent_id);
CREATE INDEX IF NOT EXISTS idx_page_content_topic ON page_content(topic_id);

-- Create a pages table for standalone pages (not tied to topics)
CREATE TABLE IF NOT EXISTS pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID REFERENCES pages(id),
    title TEXT NOT NULL DEFAULT 'Untitled',
    content_html TEXT DEFAULT '',
    icon TEXT DEFAULT '📝',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for hierarchy
CREATE INDEX IF NOT EXISTS idx_pages_parent ON pages(parent_id);

-- Auto-update timestamp trigger
DROP TRIGGER IF EXISTS update_pages_updated_at ON pages;
CREATE TRIGGER update_pages_updated_at
    BEFORE UPDATE ON pages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VERIFICATION: After running, check with:
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'page_content';
-- SELECT * FROM pages LIMIT 5;
-- =====================================================
