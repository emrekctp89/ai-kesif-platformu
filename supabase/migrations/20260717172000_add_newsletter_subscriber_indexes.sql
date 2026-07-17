CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_active_email
ON public.newsletter_subscribers (email)
WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_status_updated_at
ON public.newsletter_subscribers (status, updated_at DESC);
