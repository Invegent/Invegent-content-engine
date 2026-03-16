-- ICE Migration: 20260316_portal_v1
-- Client portal v1 schema
-- Applied: 16 March 2026
-- Refs: D023

-- 1. Portal columns on c.client
ALTER TABLE c.client
  ADD COLUMN IF NOT EXISTS notifications_email TEXT,
  ADD COLUMN IF NOT EXISTS portal_enabled       BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. notification_sent_at on m.post_draft
ALTER TABLE m.post_draft
  ADD COLUMN IF NOT EXISTS notification_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS post_draft_notify_idx
  ON m.post_draft (approval_status, notification_sent_at)
  WHERE approval_status = 'needs_review' AND notification_sent_at IS NULL;

-- 3. public.portal_user mapping table
-- PK onboards clients: INSERT INTO public.portal_user (client_id, email)
-- user_id is NULL until first login, hydrated in /auth/callback
CREATE TABLE IF NOT EXISTS public.portal_user (
  portal_user_id  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID        NOT NULL,
  email           TEXT        NOT NULL,
  user_id         UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (email),
  UNIQUE (client_id)
);

ALTER TABLE public.portal_user ENABLE ROW LEVEL SECURITY;

CREATE POLICY "portal_user: read own row"
  ON public.portal_user FOR SELECT
  USING (auth.uid() = user_id);

GRANT SELECT, UPDATE ON public.portal_user TO service_role;
GRANT SELECT ON public.portal_user TO authenticated;
