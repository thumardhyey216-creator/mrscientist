-- =====================================================
-- UPDATE: ADD PAGE CONTENT TABLE
-- Run this in Supabase SQL Editor
-- =====================================================

CREATE TABLE IF NOT EXISTS page_content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notion_id TEXT UNIQUE NOT NULL, -- Links to topics.notion_id
    blocks JSONB,                   -- Stores the raw Notion blocks
    plain_text TEXT,                -- Optional: for search
    last_synced TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_page_content_notion_id ON page_content(notion_id);

-- Auto-update updated_at timestamp
DROP TRIGGER IF EXISTS update_page_content_updated_at ON page_content;
CREATE TRIGGER update_page_content_updated_at
    BEFORE UPDATE ON page_content
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
