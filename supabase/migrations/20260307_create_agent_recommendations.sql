-- m.agent_recommendations: stores feed quality recommendations from the feed intelligence agent
CREATE TABLE IF NOT EXISTS m.agent_recommendations (
  recommendation_id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent                 text NOT NULL DEFAULT 'feed-intelligence',
  source_id             uuid REFERENCES f.feed_source(source_id) ON DELETE CASCADE,
  recommendation_type   text NOT NULL, -- 'deprecate' | 'review' | 'watch'
  reason                text NOT NULL,
  stats                 jsonb NOT NULL DEFAULT '{}',
  status                text NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'dismissed'
  actioned_at           timestamptz,
  actioned_by           text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_recommendation_type CHECK (recommendation_type IN ('deprecate','review','watch')),
  CONSTRAINT chk_status CHECK (status IN ('pending','approved','dismissed'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_agent_rec_pending
  ON m.agent_recommendations (source_id, recommendation_type)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_agent_rec_status ON m.agent_recommendations (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_rec_source ON m.agent_recommendations (source_id);

CREATE OR REPLACE FUNCTION m.set_agent_rec_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_agent_rec_updated_at
  BEFORE UPDATE ON m.agent_recommendations
  FOR EACH ROW EXECUTE FUNCTION m.set_agent_rec_updated_at();
