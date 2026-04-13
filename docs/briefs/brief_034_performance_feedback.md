# Claude Code Brief 034 — Performance → Scoring Feedback Loop

**Date:** 13 April 2026
**Phase:** D — Intelligence
**Repo:** `Invegent-content-engine`
**Working directory:** `C:\Users\parve\Invegent-content-engine`
**Supabase project:** `mbkmaxqhsohbtwsqolns`
**MCPs required:** Supabase MCP, GitHub MCP
**Estimated time:** 3 hours

---

## What this builds

insights-worker already collects Facebook engagement data daily into `m.post_performance`.
None of it feeds back into content scoring. This brief closes the loop:
- Posts with high engagement → their source topics get boosted scoring weight
- Posts with low engagement → those topic weights decay
- ICE content gets measurably better over time without manual tuning

---

## Task 1 — Verify post_performance schema and data

```sql
SELECT schema_name, table_name, columns_list
FROM k.vw_table_summary
WHERE schema_name = 'm' AND table_name IN ('post_performance', 'digest_item', 'post_format_performance');
```

Also check how many rows we have:
```sql
SELECT
  COUNT(*) AS total_perf_rows,
  COUNT(DISTINCT pp.client_id) AS clients_with_data,
  MIN(created_at) AS earliest,
  MAX(created_at) AS latest
FROM m.post_performance perf
JOIN m.post_publish pp ON pp.post_publish_id = perf.post_publish_id;
```

If total_perf_rows = 0: the feedback loop can be built but won't fire yet.
Build it anyway — data will accumulate.

---

## Task 2 — Create topic_weight table

This stores per-client, per-topic scoring multipliers derived from performance data.

```sql
CREATE TABLE IF NOT EXISTS m.topic_score_weight (
  weight_id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES c.client(client_id),
  topic_label text NOT NULL,
  weight numeric NOT NULL DEFAULT 1.0 CHECK (weight BETWEEN 0.1 AND 3.0),
  sample_count integer NOT NULL DEFAULT 0,
  avg_engagement_rate numeric,
  last_calculated_at timestamptz NOT NULL DEFAULT NOW(),
  created_at timestamptz DEFAULT NOW(),
  UNIQUE (client_id, topic_label)
);

CREATE INDEX idx_topic_score_weight_client ON m.topic_score_weight(client_id);
```

---

## Task 3 — Create the feedback calculation function

```sql
CREATE OR REPLACE FUNCTION public.recalculate_topic_weights(p_client_id uuid)
RETURNS integer SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count integer := 0;
  v_global_avg numeric;
BEGIN
  -- Get global average engagement rate for this client (baseline)
  SELECT COALESCE(AVG(perf.engagement_rate), 0.02)
  INTO v_global_avg
  FROM m.post_performance perf
  JOIN m.post_publish pp ON pp.post_publish_id = perf.post_publish_id
  WHERE pp.client_id = p_client_id
    AND perf.engagement_rate IS NOT NULL
    AND pp.published_at > NOW() - INTERVAL '90 days';

  -- Calculate weight per topic based on relative performance
  -- Weight = clamp(avg_engagement / global_avg, 0.3, 2.5)
  -- Topics with 3+ posts get a real weight; fewer get 1.0 (neutral)
  INSERT INTO m.topic_score_weight
    (client_id, topic_label, weight, sample_count, avg_engagement_rate, last_calculated_at)
  SELECT
    p_client_id,
    COALESCE(di.topic_label, 'unknown'),
    CASE
      WHEN COUNT(*) >= 3 AND v_global_avg > 0
      THEN GREATEST(0.3, LEAST(2.5, AVG(perf.engagement_rate) / v_global_avg))
      ELSE 1.0
    END AS weight,
    COUNT(*) AS sample_count,
    AVG(perf.engagement_rate) AS avg_engagement_rate,
    NOW()
  FROM m.post_performance perf
  JOIN m.post_publish pp ON pp.post_publish_id = perf.post_publish_id
  JOIN m.post_draft pd ON pd.post_draft_id = pp.post_draft_id
  LEFT JOIN m.digest_item di ON di.digest_item_id = pd.digest_item_id
  WHERE pp.client_id = p_client_id
    AND perf.engagement_rate IS NOT NULL
    AND pp.published_at > NOW() - INTERVAL '90 days'
  GROUP BY COALESCE(di.topic_label, 'unknown')
  ON CONFLICT (client_id, topic_label) DO UPDATE
    SET weight = EXCLUDED.weight,
        sample_count = EXCLUDED.sample_count,
        avg_engagement_rate = EXCLUDED.avg_engagement_rate,
        last_calculated_at = NOW();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.recalculate_topic_weights(uuid) TO service_role;
```

---

## Task 4 — Wire weights into the bundler/digest scoring

The bundler creates `m.digest_item` rows with a `final_score`. We need to apply
the topic weight multiplier when scoring digest items.

First check how the bundler currently scores items:
```sql
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname IN ('populate_digest_items_v1', 'score_canonical_item')
  AND pronamespace = 'public'::regnamespace
LIMIT 2;
```

Find where `final_score` is set in the digest population. Add the weight multiplier:

```sql
-- Pattern to add: multiply final_score by topic weight
-- The weight lookup:
COALESCE(
  (SELECT tsw.weight FROM m.topic_score_weight tsw
   WHERE tsw.client_id = <client_id>
     AND tsw.topic_label = <topic_label>
   LIMIT 1),
  1.0  -- neutral if no weight calculated yet
) AS topic_weight_multiplier
```

Then: `final_score = base_score * topic_weight_multiplier`

If the scoring is in a function, create a new version that includes the multiplier.
If it's inline SQL in the planner cron, add the JOIN to topic_score_weight.

**Important:** Do not change the scoring if you cannot safely identify where
`final_score` is set. In that case: implement Task 5 only and note the gap.

---

## Task 5 — Create Edge Function: insights-feedback

**File:** `supabase/functions/insights-feedback/index.ts`

This runs after insights-worker completes (or daily) and updates weights.

```typescript
import { createClient } from 'jsr:@supabase/supabase-js@2';

const VERSION = 'insights-feedback-v1.0.0';

Deno.serve(async () => {
  const url = Deno.env.get('SUPABASE_URL')!;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { data: clients } = await supabase.rpc('exec_sql', {
    query: `SELECT client_id, client_name FROM c.client WHERE status = 'active'`
  });

  const results: any[] = [];

  for (const client of (clients ?? []) as any[]) {
    const { data: weightCount } = await supabase.rpc('recalculate_topic_weights', {
      p_client_id: client.client_id
    });
    results.push({
      client: client.client_name,
      topics_updated: Number(weightCount ?? 0)
    });
    console.log(`[insights-feedback] ${client.client_name}: ${weightCount} topics updated`);
  }

  return new Response(
    JSON.stringify({ ok: true, version: VERSION, results }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
```

---

## Task 6 — Add pg_cron (daily after insights-worker)

insights-worker runs at 3am UTC. Run feedback at 3:30am UTC:

```sql
SELECT cron.schedule(
  'insights-feedback-daily',
  '30 3 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL')
            || '/functions/v1/insights-feedback',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY')
    ),
    body := '{}'
  );
  $$
);
```

---

## Task 7 — Push and deploy

```bash
cd C:\Users\parve\Invegent-content-engine
git add supabase/functions/insights-feedback/
git commit -m "feat: insights-feedback v1.0.0 + topic_score_weight table + recalculate_topic_weights()"
git push origin main
npx supabase functions deploy insights-feedback --project-ref mbkmaxqhsohbtwsqolns
```

---

## Task 8 — Verify

```sql
-- Run manually for NDIS Yarns
SELECT public.recalculate_topic_weights('fb98a472-ae4d-432d-8738-2273231c1ef4'::uuid);

-- Check weights created
SELECT topic_label, weight, sample_count, avg_engagement_rate
FROM m.topic_score_weight
WHERE client_id = 'fb98a472-ae4d-432d-8738-2273231c1ef4'
ORDER BY weight DESC
LIMIT 10;
```

If 0 rows: m.post_performance has no data yet. That's fine — function is correct,
data will flow as insights-worker runs nightly.

---

## Task 9 — Write result file

Write `docs/briefs/brief_034_result.md` in Invegent-content-engine:
- Table created
- recalculate_topic_weights() created
- Bundler wiring: done or skipped with reason
- insights-feedback deployed
- cron created
- Weights calculated: N topics (may be 0 if no perf data yet)

---

## Error handling

- If populate_digest_items_v1 is complex and the scoring integration is risky,
  skip Task 4 and note it. The weight table + function + Edge Function are still
  valuable — they pre-calculate weights ready for the bundler to use when it's next updated.
- If engagement_rate is stored as a percentage (4.2) not a decimal (0.042):
  the division by v_global_avg still works correctly (both are in the same unit).
- Weight clamped 0.3–2.5: prevents any single topic from dominating or being
  completely excluded based on small sample sizes.
