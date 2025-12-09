-- =====================================================
-- DYNAMIC SCHEMA & VIEWS SUPPORT
-- =====================================================
-- Run this to enable adding columns and saving views
-- =====================================================

-- 1. Function to get table schema (columns and types)
CREATE OR REPLACE FUNCTION get_table_info(t_name TEXT)
RETURNS TABLE (column_name TEXT, data_type TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT c.column_name::TEXT, c.data_type::TEXT
    FROM information_schema.columns c
    WHERE c.table_name = t_name
    And c.table_schema = 'public';
END;
$$;

-- 2. Function to add/remove columns dynamically
CREATE OR REPLACE FUNCTION manage_schema(operation TEXT, t_name TEXT, col_name TEXT, col_type TEXT DEFAULT 'TEXT')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF operation = 'add' THEN
        -- Default to TEXT if not specified, sanitize input
        EXECUTE format('ALTER TABLE %I ADD COLUMN %I %s', t_name, col_name, col_type);
        RETURN jsonb_build_object('status', 'success', 'message', 'Column added');
    ELSIF operation = 'delete' THEN
        EXECUTE format('ALTER TABLE %I DROP COLUMN %I', t_name, col_name);
        RETURN jsonb_build_object('status', 'success', 'message', 'Column deleted');
    END IF;
    RETURN jsonb_build_object('status', 'error', 'message', 'Invalid operation');
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('status', 'error', 'message', SQLERRM);
END;
$$;

-- 3. Table to store saved views (Calendar views, specific filtered tables)
CREATE TABLE IF NOT EXISTS database_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    view_name TEXT NOT NULL,
    view_type TEXT NOT NULL, -- 'table', 'board', 'calendar', 'gallery'
    config JSONB DEFAULT '{}'::JSONB, -- Store filters, sorts, hidden columns
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Insert some default views
INSERT INTO database_views (view_name, view_type, config) VALUES
('Master Table', 'table', '{}'),
('Study Calendar', 'calendar', '{"dateField": "planned_date"}'),
('Exam Schedule', 'calendar', '{"dateField": "mcq_solving_date"}');

-- 5. Fix permissions (if needed)
GRANT ALL ON database_views TO anon;
GRANT ALL ON database_views TO authenticated;

