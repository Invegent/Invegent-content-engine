-- ============================================================
-- CONTENT SERIES SCHEMA
-- Date: 19 March 2026
-- Applied: 19 March 2026 via Supabase MCP
-- ============================================================

-- 1. c.content_series — the brief and series metadata

CREATE TABLE c.content_series (
  series_id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id         uuid        NOT NULL REFERENCES c.client(client_id),
  title             text        NOT NULL,
  topic             text        NOT NULL,
  goal              text,
  audience_notes    text,
  episode_count     integer     NOT NULL DEFAULT 5,
  platform          text        NOT NULL DEFAULT 'facebook',
  tone_notes        text,
  status            text        NOT NULL DEFAULT 'draft'
    CHECK (status IN (
      'draft', 'outline_pending', 'outline_ready', 'approved',
      'writing', 'active', 'complete', 'cancelled'
    )),
  series_summary    text,
  outline_json      jsonb,
  outline_approved_by   text,
  outline_approved_at   timestamptz,
  created_by        text        NOT NULL DEFAULT 'operator',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_content_series_client ON c.content_series(client_id, status);

-- 2. c.content_series_episode — one row per episode

CREATE TABLE c.content_series_episode (
  episode_id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id           uuid        NOT NULL REFERENCES c.content_series(series_id) ON DELETE CASCADE,
  client_id           uuid        NOT NULL REFERENCES c.client(client_id),
  position            integer     NOT NULL,
  episode_title       text,
  episode_angle       text,
  episode_hook        text,
  cta_type            text,
  recommended_format  text        DEFAULT 'image_quote',
  image_headline      text,
  scheduled_for       timestamptz,
  post_draft_id       uuid,
  status              text        NOT NULL DEFAULT 'outline'
    CHECK (status IN ('outline', 'writing', 'draft_ready', 'published')),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_series_episode_series ON c.content_series_episode(series_id, position);
CREATE INDEX idx_series_episode_draft  ON c.content_series_episode(post_draft_id) WHERE post_draft_id IS NOT NULL;

-- 3. SECURITY DEFINER functions

CREATE OR REPLACE FUNCTION public.create_content_series(
  p_client_id uuid, p_title text, p_topic text, p_goal text,
  p_audience_notes text, p_episode_count integer, p_platform text, p_tone_notes text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_series_id uuid;
BEGIN
  INSERT INTO c.content_series (client_id, title, topic, goal, audience_notes, episode_count, platform, tone_notes, status)
  VALUES (p_client_id, p_title, p_topic, p_goal, p_audience_notes, COALESCE(p_episode_count, 5), COALESCE(p_platform, 'facebook'), p_tone_notes, 'draft')
  RETURNING series_id INTO v_series_id;
  RETURN jsonb_build_object('series_id', v_series_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_series_outline(
  p_series_id uuid, p_approved_by text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_current_status text;
BEGIN
  SELECT status INTO v_current_status FROM c.content_series WHERE series_id = p_series_id;
  IF v_current_status NOT IN ('outline_ready') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'series_not_in_outline_ready_state', 'status', v_current_status);
  END IF;
  UPDATE c.content_series
  SET status = 'approved', outline_approved_by = p_approved_by, outline_approved_at = now(), updated_at = now()
  WHERE series_id = p_series_id;
  RETURN jsonb_build_object('ok', true, 'series_id', p_series_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.set_episode_schedule(
  p_episode_id uuid, p_scheduled_for timestamptz
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE c.content_series_episode SET scheduled_for = p_scheduled_for, updated_at = now() WHERE episode_id = p_episode_id;
  RETURN jsonb_build_object('ok', true, 'episode_id', p_episode_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_series_status(
  p_series_id uuid, p_status text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE c.content_series SET status = p_status, updated_at = now() WHERE series_id = p_series_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.link_episode_to_draft(
  p_episode_id uuid, p_post_draft_id uuid
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE c.content_series_episode
  SET post_draft_id = p_post_draft_id, status = 'draft_ready', updated_at = now()
  WHERE episode_id = p_episode_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.series_post_insert(
  p_client_id uuid, p_platform text, p_draft_title text, p_draft_body text,
  p_series_id uuid, p_episode_id uuid, p_scheduled_for timestamptz,
  p_recommended_format text DEFAULT 'image_quote', p_image_headline text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_draft_id uuid; v_now timestamptz := now();
BEGIN
  INSERT INTO m.post_draft (
    client_id, platform, draft_title, draft_body, approval_status, created_by,
    scheduled_for, recommended_format, image_headline, image_status
  ) VALUES (
    p_client_id, p_platform, p_draft_title, p_draft_body, 'needs_review', 'series-writer',
    p_scheduled_for, COALESCE(p_recommended_format, 'image_quote'), p_image_headline, 'pending'
  ) RETURNING post_draft_id INTO v_draft_id;
  UPDATE c.content_series_episode
  SET post_draft_id = v_draft_id, status = 'draft_ready', updated_at = v_now
  WHERE episode_id = p_episode_id;
  RETURN jsonb_build_object('ok', true, 'post_draft_id', v_draft_id, 'episode_id', p_episode_id);
END;
$$;
