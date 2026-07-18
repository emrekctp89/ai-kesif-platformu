-- Workmind (beta): kullanıcı iş akışları
CREATE TABLE IF NOT EXISTS public.workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    prompt TEXT NOT NULL,
    nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
    edges JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own workflows" ON public.workflows;
CREATE POLICY "Users can view their own workflows" ON public.workflows
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can view public workflows" ON public.workflows;
CREATE POLICY "Anyone can view public workflows" ON public.workflows
    FOR SELECT USING (is_public = true);

DROP POLICY IF EXISTS "Users can insert their own workflows" ON public.workflows;
CREATE POLICY "Users can insert their own workflows" ON public.workflows
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own workflows" ON public.workflows;
CREATE POLICY "Users can update their own workflows" ON public.workflows
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own workflows" ON public.workflows;
CREATE POLICY "Users can delete their own workflows" ON public.workflows
    FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS workflows_user_id_idx ON public.workflows(user_id);
CREATE INDEX IF NOT EXISTS workflows_is_public_idx ON public.workflows(is_public) WHERE is_public = true;
