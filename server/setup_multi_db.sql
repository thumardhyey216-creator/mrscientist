-- 1. Create study_databases table
CREATE TABLE IF NOT EXISTS public.study_databases (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT DEFAULT '📚',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.study_databases ENABLE ROW LEVEL SECURITY;

-- Policies for study_databases
CREATE POLICY "Users can view their own databases" 
    ON public.study_databases FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own databases" 
    ON public.study_databases FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own databases" 
    ON public.study_databases FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own databases" 
    ON public.study_databases FOR DELETE 
    USING (auth.uid() = user_id);

-- 2. Add database_id to topics table
ALTER TABLE public.topics 
ADD COLUMN IF NOT EXISTS database_id UUID REFERENCES public.study_databases(id) ON DELETE CASCADE;

-- 3. Migration: Create default database for existing users and link topics
DO $$
DECLARE
    user_record RECORD;
    new_db_id UUID;
BEGIN
    FOR user_record IN SELECT DISTINCT user_id FROM public.topics WHERE user_id IS NOT NULL AND database_id IS NULL LOOP
        -- Create a default database for this user
        INSERT INTO public.study_databases (user_id, name, description)
        VALUES (user_record.user_id, 'Default Study Plan', 'Auto-generated from existing topics')
        RETURNING id INTO new_db_id;

        -- Update their topics to belong to this new database
        UPDATE public.topics
        SET database_id = new_db_id
        WHERE user_id = user_record.user_id AND database_id IS NULL;
    END LOOP;
END $$;
