-- Add performance indexes for frequently queried columns

-- tools table indexes
CREATE INDEX IF NOT EXISTS idx_tools_is_approved ON public.tools (is_approved);
CREATE INDEX IF NOT EXISTS idx_tools_slug ON public.tools (slug);
CREATE INDEX IF NOT EXISTS idx_tools_category_id ON public.tools (category_id);
CREATE INDEX IF NOT EXISTS idx_tools_is_featured ON public.tools (is_featured);
CREATE INDEX IF NOT EXISTS idx_tools_created_at ON public.tools (created_at DESC);

-- favorites table indexes
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON public.favorites (user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_tool_id ON public.favorites (tool_id);

-- collections table indexes
CREATE INDEX IF NOT EXISTS idx_collections_user_id ON public.collections (user_id);
CREATE INDEX IF NOT EXISTS idx_collections_slug ON public.collections (slug);

-- prompts table indexes
CREATE INDEX IF NOT EXISTS idx_prompts_user_id ON public.prompts (user_id);
CREATE INDEX IF NOT EXISTS idx_prompts_tool_id ON public.prompts (tool_id);
