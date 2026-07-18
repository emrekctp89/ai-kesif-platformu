-- Create workflows table
CREATE TABLE IF NOT EXISTS public.workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    prompt TEXT NOT NULL,
    nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
    edges JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- RLS
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own workflows" ON public.workflows
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view public workflows" ON public.workflows
    FOR SELECT USING (is_public = true);

CREATE POLICY "Users can insert their own workflows" ON public.workflows
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workflows" ON public.workflows
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workflows" ON public.workflows
    FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS workflows_user_id_idx ON public.workflows(user_id);
CREATE INDEX IF NOT EXISTS workflows_is_public_idx ON public.workflows(is_public) WHERE is_public = true;
