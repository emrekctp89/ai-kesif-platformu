-- Archive table for sent newsletter emails (web archive at /bulten)
-- Idempotent: safe if objects were partially created earlier.
CREATE TABLE IF NOT EXISTS public.newsletters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    subject TEXT NOT NULL,
    description TEXT,
    html_content TEXT NOT NULL,
    content_json JSONB DEFAULT '{}'::jsonb,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_newsletters_sent_at ON public.newsletters (sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_newsletters_slug ON public.newsletters (slug);

ALTER TABLE public.newsletters ENABLE ROW LEVEL SECURITY;

-- Public read access for archive pages (writes go through service role only)
DROP POLICY IF EXISTS "Allow public read of newsletters" ON public.newsletters;
CREATE POLICY "Allow public read of newsletters"
ON public.newsletters
FOR SELECT
TO public
USING (true);

CREATE OR REPLACE FUNCTION update_newsletters_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::TEXT, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_newsletters_updated_at ON public.newsletters;
CREATE TRIGGER tr_newsletters_updated_at
    BEFORE UPDATE ON public.newsletters
    FOR EACH ROW
    EXECUTE FUNCTION update_newsletters_updated_at();
