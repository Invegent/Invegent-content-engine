# Brief: Discovery Stage 1.1 — Onboarding Keyword Form

**Date:** 27 April 2026
**Track:** Concrete-the-pipeline / Section 1: Discovery & Onboarding
**Stage:** 1.1 (first of ~5 in Section 1)
**Gate B status:** Safe — touches `f.*` and `c.*` only, fully upstream of Phase B
**Estimated effort:** 4–6 hours CC work + 1 hour PK verification

---

## Why this stage exists

Care for Welfare currently has **2 of 26 assigned feeds enabled** (24 disabled, 6 of those have inactive sources). Invegent has 5 of 21. The discovery infrastructure exists and works — `feed-discovery-daily` cron has provisioned 9 seeds successfully — but there is no client-facing way to feed it new keywords. Today, seeds are inserted manually via SQL by PK. As ICE moves toward external clients, "client provides keywords during onboarding" must be a real flow, not a backend handshake.

This stage adds the smallest possible vertical slice: a client's keywords get captured at onboarding and land in `f.feed_discovery_seed` with `status='pending'`. The existing daily discovery cron picks them up at the next 8pm UTC firing without code change, because the cron already filters on `status='pending'`.

## Stage scope

### What this stage delivers

1. **DB:** `f.feed_discovery_seed.client_id` column added (nullable, FK to `c.client(client_id)`), backwards compatible with the 9 existing seeds (NULL client_id).
2. **RPC:** `public.add_client_discovery_seeds(p_client_id UUID, p_keywords TEXT[], p_example_urls TEXT[])` — `SECURITY DEFINER`, validates inputs, derives `vertical_slug` from client's primary content scope, inserts one seed row per keyword/URL with `status='pending'`.
3. **Frontend:** New section in the Onboarding tab of `invegent-dashboard` — "Discovery keywords" — with two repeating-input groups (keywords, example URLs), Save button calls the RPC.

### What this stage does NOT do

- Does NOT modify the `feed-discovery` Edge Function. Verified pre-flight: 9 existing seeds already reached `status='provisioned'` via this EF, which means the EF correctly polls `WHERE status='pending'` and writes back. No EF change required for new seeds with `client_id` set — the column is additive.
- Does NOT build the suggestion review queue UI (Stage 1.2).
- Does NOT auto-create `c.client_source` rows when a seed completes provisioning (Stage 1.3).
- Does NOT auto-promote provisioned feeds to `is_enabled=true` (Stage 1.4).
- Does NOT backfill CFW's 24 disabled feeds (Stage 1.5).
- Does NOT change vertical_slug derivation logic for the existing 9 seeds (they stay as-is).

---

## Pre-flight queries (Lesson #32 — run before writing any code)

CC must run all six and confirm results match expectations before opening any file.

```sql
-- PF1: Confirm f.feed_discovery_seed shape (column names, types, NOT NULL, defaults)
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'f' AND table_name = 'feed_discovery_seed'
ORDER BY ordinal_position;
-- Expect 14 columns. seed_id NOT NULL default gen_random_uuid().
-- seed_type NOT NULL. seed_value NOT NULL. status NOT NULL default 'pending'.
-- No client_id column (this stage adds it).

-- PF2: Confirm CHECK constraints
SELECT con.conname, pg_get_constraintdef(con.oid)
FROM pg_constraint con
JOIN pg_class cl ON cl.oid = con.conrelid
JOIN pg_namespace n ON n.oid = cl.relnamespace
WHERE n.nspname = 'f' AND cl.relname = 'feed_discovery_seed';
-- Expect: PK (seed_id), seed_type CHECK in ('url','keyword','youtube_keyword'),
-- status CHECK in ('pending','provisioned','failed','paused').

-- PF3: Confirm c.client primary key column name (FK target)
SELECT a.attname
FROM pg_index i
JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
JOIN pg_class cl ON cl.oid = i.indrelid
JOIN pg_namespace n ON n.oid = cl.relnamespace
WHERE n.nspname = 'c' AND cl.relname = 'client' AND i.indisprimary;
-- Expect: client_id

-- PF4: Confirm c.client_content_scope shape (used to derive vertical_slug)
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema = 'c' AND table_name = 'client_content_scope'
ORDER BY ordinal_position;
-- Expect a vertical_id or vertical_slug column + a weight column.
-- If table doesn't exist or shape differs, see Fallback in RPC spec below.

-- PF5: Confirm t.content_vertical → slug mapping if needed for derivation
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema = 't' AND table_name = 'content_vertical'
ORDER BY ordinal_position;

-- PF6: Confirm feed-discovery-daily cron is active and what it calls
SELECT jobname, schedule, active, command
FROM cron.job WHERE jobname = 'feed-discovery-daily';
-- Expect active=true, schedule='0 20 * * *',
-- command POSTs to /functions/v1/feed-discovery
```

If any pre-flight result deviates from "expect", STOP and update the brief — do not patch around the deviation.

---

## Acceptance criteria

This stage is done when ALL of these are true:

- [ ] Migration applied via Supabase MCP `apply_migration`. `f.feed_discovery_seed.client_id` exists as nullable UUID with FK to `c.client(client_id)` ON DELETE SET NULL.
- [ ] RPC `public.add_client_discovery_seeds` exists, callable, returns count of rows inserted.
- [ ] Onboarding tab in invegent-dashboard renders the new Discovery Keywords section under the existing Onboarding tab.
- [ ] PK can submit 5 keywords + 2 URLs for CFW via the form. Form shows success state on save.
- [ ] DB confirms 7 new rows in `f.feed_discovery_seed` with `client_id=<CFW UUID>`, `status='pending'`, `vertical_slug='ndis'`.
- [ ] At next 8pm UTC firing of `feed-discovery-daily`, at least one of the new seeds transitions from `pending` → `provisioned` (or `failed` with error_message populated). Verify via single SQL the morning after.
- [ ] No regressions in existing 9 seeds — they still show `status='provisioned'` with their original `feed_source_id`.

---

## Migration

File: `supabase/migrations/20260428_001_discovery_stage_1_1_seed_client_id.sql`

```sql
-- Stage 1.1 — add client_id to f.feed_discovery_seed
-- Backwards compatible: existing 9 seeds remain with NULL client_id.

ALTER TABLE f.feed_discovery_seed
  ADD COLUMN client_id uuid NULL
    REFERENCES c.client(client_id)
    ON DELETE SET NULL;

-- Index for lookups by client (review queue, per-client seed status)
CREATE INDEX IF NOT EXISTS ix_feed_discovery_seed_client_id
  ON f.feed_discovery_seed (client_id)
  WHERE client_id IS NOT NULL;

COMMENT ON COLUMN f.feed_discovery_seed.client_id IS
  'Client whose onboarding submitted this seed. NULL for operator-submitted seeds (the original 9 manual seeds use NULL).';
```

Rollback (only if cutting losses, not a routine action):
```sql
DROP INDEX IF EXISTS f.ix_feed_discovery_seed_client_id;
ALTER TABLE f.feed_discovery_seed DROP COLUMN IF EXISTS client_id;
```

---

## RPC spec

File: `supabase/migrations/20260428_002_discovery_stage_1_1_rpc_add_seeds.sql`

```sql
-- Stage 1.1 — RPC for client onboarding to submit discovery seeds
CREATE OR REPLACE FUNCTION public.add_client_discovery_seeds(
  p_client_id     uuid,
  p_keywords      text[]  DEFAULT '{}',
  p_example_urls  text[]  DEFAULT '{}'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, f, c, t
AS $$
DECLARE
  v_vertical_slug text;
  v_keyword text;
  v_url text;
  v_inserted_count int := 0;
  v_skipped_count int := 0;
BEGIN
  -- Validate client exists and is active
  IF NOT EXISTS (
    SELECT 1 FROM c.client
    WHERE client_id = p_client_id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Client % not found or not active', p_client_id;
  END IF;

  -- Validate at least one input
  IF (array_length(p_keywords, 1) IS NULL OR array_length(p_keywords, 1) = 0)
     AND (array_length(p_example_urls, 1) IS NULL OR array_length(p_example_urls, 1) = 0)
  THEN
    RAISE EXCEPTION 'Must provide at least one keyword or example URL';
  END IF;

  -- Derive primary vertical_slug from client's content scope
  -- Highest-weighted active vertical for the client
  -- Fallback: 'general' if client has no scope rows yet (won't break the cron;
  -- existing 9 seeds use 'ndis' or 'property' but cron doesn't filter on slug)
  SELECT cv.slug
    INTO v_vertical_slug
  FROM c.client_content_scope ccs
  JOIN t.content_vertical cv ON cv.vertical_id = ccs.vertical_id
  WHERE ccs.client_id = p_client_id
    AND COALESCE(ccs.is_active, true) = true
  ORDER BY COALESCE(ccs.weight, 1.0) DESC, cv.slug ASC
  LIMIT 1;

  IF v_vertical_slug IS NULL THEN
    v_vertical_slug := 'general';
  END IF;

  -- Insert keyword seeds
  FOREACH v_keyword IN ARRAY p_keywords
  LOOP
    -- Skip empty/whitespace-only entries
    IF length(trim(v_keyword)) = 0 THEN
      v_skipped_count := v_skipped_count + 1;
      CONTINUE;
    END IF;

    -- Dedupe per (client_id, seed_value) — don't re-submit existing
    IF EXISTS (
      SELECT 1 FROM f.feed_discovery_seed
      WHERE client_id = p_client_id
        AND seed_type = 'keyword'
        AND lower(seed_value) = lower(trim(v_keyword))
    ) THEN
      v_skipped_count := v_skipped_count + 1;
      CONTINUE;
    END IF;

    INSERT INTO f.feed_discovery_seed
      (seed_type, seed_value, vertical_slug, status, client_id, label)
    VALUES
      ('keyword', trim(v_keyword), v_vertical_slug, 'pending', p_client_id,
       'client-onboarding');

    v_inserted_count := v_inserted_count + 1;
  END LOOP;

  -- Insert URL seeds
  FOREACH v_url IN ARRAY p_example_urls
  LOOP
    IF length(trim(v_url)) = 0 THEN
      v_skipped_count := v_skipped_count + 1;
      CONTINUE;
    END IF;

    -- Basic URL sanity check
    IF trim(v_url) !~* '^https?://' THEN
      v_skipped_count := v_skipped_count + 1;
      CONTINUE;
    END IF;

    -- Dedupe per (client_id, seed_value)
    IF EXISTS (
      SELECT 1 FROM f.feed_discovery_seed
      WHERE client_id = p_client_id
        AND seed_type = 'url'
        AND lower(seed_value) = lower(trim(v_url))
    ) THEN
      v_skipped_count := v_skipped_count + 1;
      CONTINUE;
    END IF;

    INSERT INTO f.feed_discovery_seed
      (seed_type, seed_value, vertical_slug, status, client_id, label)
    VALUES
      ('url', trim(v_url), v_vertical_slug, 'pending', p_client_id,
       'client-onboarding');

    v_inserted_count := v_inserted_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'inserted', v_inserted_count,
    'skipped',  v_skipped_count,
    'vertical_slug', v_vertical_slug,
    'next_discovery_run_utc', '20:00 daily'
  );
END;
$$;

-- Grants — service_role only (Lesson #33 territory: ensure portal/dashboard
-- service role can call this; PostgREST will enforce shape at the API edge)
GRANT EXECUTE ON FUNCTION public.add_client_discovery_seeds(uuid, text[], text[])
  TO service_role;

REVOKE EXECUTE ON FUNCTION public.add_client_discovery_seeds(uuid, text[], text[])
  FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.add_client_discovery_seeds IS
  'Captures client onboarding keywords and example URLs as discovery seeds. '
  'Existing feed-discovery-daily cron at 8pm UTC picks up status=pending rows '
  'and provisions RSS.app feeds. Idempotent on (client_id, seed_value) per type.';
```

---

## Frontend spec — invegent-dashboard

CC must locate the existing Onboarding tab component (likely `app/(dashboard)/clients/[clientId]/onboarding/page.tsx` or similar — search for "Onboarding" tab label first, the screenshot in chat confirms it exists).

### New section: "Discovery Keywords"

Place this section above any existing onboarding sections, OR as the topmost item if Onboarding is currently a stub. Visual hierarchy:

```
Discovery Keywords
─────────────────────────────────────────────────────
Add keywords and example URLs that describe the kind
of content this client wants. ICE will use these to
discover new RSS feeds overnight.

Keywords (5–10 recommended)
[+ Add keyword]
  [NDIS plan management        ] [×]
  [occupational therapy         ] [×]
  [disability support           ] [×]

Example URLs (2–3 recommended)
[+ Add URL]
  [https://www.ndis.gov.au/news ] [×]
  [https://summerfoundation.org ] [×]

[Save Discovery Keywords]
```

### Component requirements

- Use existing dashboard component library (shadcn/ui based on existing patterns — verify via `package.json`).
- Two repeating inputs: keyword strings (max 10), URL strings (max 5). Each row has a remove (×) button. "Add" button at the bottom of each list adds an empty row.
- Save button:
  - Disabled when both lists are empty
  - On click, calls Supabase RPC `add_client_discovery_seeds` with `client_id` from URL params, the keywords array, the URLs array
  - **Lesson #33 applies:** destructure `{ data, error }` from `.rpc()` call. On `error`, show toast with error message. On success, show toast `"Submitted N seeds. Next discovery run: 8pm UTC."` (use `data.inserted` from RPC response)
  - After successful save, clear the inputs and re-fetch the seed list to show what's now pending
- Below the form, render a read-only "Seeds submitted" list pulling from `f.feed_discovery_seed WHERE client_id = $1` showing seed_value, seed_type, status, created_at. This gives PK/the client immediate feedback that the submission landed.

### File locations (CC to verify and confirm)

- New form component: `components/onboarding/DiscoveryKeywordsForm.tsx`
- New seeds list component: `components/onboarding/DiscoverySeedsList.tsx`
- Wire into existing Onboarding tab page

### TypeScript types (rough — CC to align with existing patterns)

```typescript
type AddSeedsResult = {
  inserted: number;
  skipped: number;
  vertical_slug: string;
  next_discovery_run_utc: string;
};

type DiscoverySeed = {
  seed_id: string;
  seed_type: 'keyword' | 'url' | 'youtube_keyword';
  seed_value: string;
  status: 'pending' | 'provisioned' | 'failed' | 'paused';
  vertical_slug: string | null;
  client_id: string | null;
  feed_source_id: string | null;
  rssapp_feed_url: string | null;
  error_message: string | null;
  created_at: string;
  provisioned_at: string | null;
};
```

---

## Verification (V1–V8)

PK (or chat) runs after CC reports done:

**V1 — Migration applied**
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema='f' AND table_name='feed_discovery_seed' AND column_name='client_id';
-- Expect: 1 row, uuid, YES nullable
```

**V2 — Index exists**
```sql
SELECT indexname FROM pg_indexes
WHERE schemaname='f' AND tablename='feed_discovery_seed'
  AND indexname='ix_feed_discovery_seed_client_id';
-- Expect: 1 row
```

**V3 — RPC callable, dry-run with empty arrays raises expected error**
```sql
SELECT public.add_client_discovery_seeds(
  'fb98a472-ae4d-432d-8738-2273231c1ef1'::uuid,  -- NDIS Yarns
  ARRAY[]::text[],
  ARRAY[]::text[]
);
-- Expect: ERROR "Must provide at least one keyword or example URL"
```

**V4 — RPC end-to-end with CFW + 3 keywords + 2 URLs**

Look up CFW `client_id` first via dashboard or:
```sql
SELECT client_id, client_name FROM c.client WHERE client_name ILIKE '%care for welfare%';
```

Then call:
```sql
SELECT public.add_client_discovery_seeds(
  '<CFW_UUID>'::uuid,
  ARRAY['paediatric occupational therapy', 'NDIS allied health Sydney', 'sensory processing therapy'],
  ARRAY['https://www.otaus.com.au/news', 'https://www.ndis.gov.au/news']
);
-- Expect: jsonb result with inserted=5, skipped=0
```

**V5 — Seeds visible**
```sql
SELECT seed_type, seed_value, vertical_slug, status, client_id IS NOT NULL AS has_client
FROM f.feed_discovery_seed
WHERE client_id = '<CFW_UUID>'::uuid
ORDER BY created_at DESC;
-- Expect: 5 rows, all status='pending', all has_client=true,
-- vertical_slug should be 'ndis' (CFW's primary vertical)
```

**V6 — Idempotency: re-submitting same keywords doesn't duplicate**
```sql
SELECT public.add_client_discovery_seeds(
  '<CFW_UUID>'::uuid,
  ARRAY['paediatric occupational therapy'],  -- already submitted in V4
  ARRAY[]::text[]
);
-- Expect: jsonb result with inserted=0, skipped=1
```

**V7 (next-day check) — Discovery cron picked up the new seeds**
The morning after the next 8pm UTC firing:
```sql
SELECT seed_value, status, feed_source_id IS NOT NULL AS has_feed, error_message
FROM f.feed_discovery_seed
WHERE client_id = '<CFW_UUID>'::uuid
ORDER BY created_at DESC;
-- Expect: ≥1 row transitioned from 'pending' to 'provisioned' or 'failed'
-- (RSS.app may not provision every seed — that is expected and Stage 1.2 review territory)
```

**V8 — Frontend manual test (PK in browser)**
1. Open dashboard → Clients → Care for Welfare → Onboarding tab
2. Find the Discovery Keywords section
3. Add 2 new keywords + 1 URL
4. Click Save → toast shows "Submitted 3 seeds"
5. Seeds list below the form refreshes and shows the 3 new items with `status='pending'`
6. Reload the page → list still shows the seeds (data persisted)

---

## Lessons applied

- **Lesson #32 (pre-flight column verification):** Six pre-flight queries above. Stop if any deviation.
- **Lesson #33 (Supabase JS write must destructure `{ error }`):** Frontend Save handler must destructure `{ data, error }` from `.rpc()`. Throw on `error` with toast surface. Codified in component spec.
- **Lesson #34 (recovery owns dependent state):** Not directly applicable here — no recovery operation in this stage. But note: a future stage that handles failed seeds (Stage 1.2 or 1.4) must consider whether reset to `pending` should clear `error_message` and `last_attempted_at`.

---

## Out of scope — captured for next stages

- **Stage 1.2 — Suggestion review queue UI.** `f.feed_discovery_seed WHERE status='provisioned' AND feed_source_id IS NOT NULL AND no client_source row exists yet` should appear in a `/feeds/review` page for one-click approve/reject. Existing RPCs (`get_feed_suggestions`, `review_feed_suggestion`) cover the `public.feed_suggestion` table; equivalent or extended RPCs needed for seed-table review.
- **Stage 1.3 — Auto-assignment.** When a seed completes provisioning AND has `client_id` set, automatically create `c.client_source` row with `is_enabled=true, weight=1.0`. Requires either trigger on `f.feed_discovery_seed` UPDATE or extension of `feed-discovery` EF.
- **Stage 1.4 — Auto-promotion guard.** High-confidence seeds (RSS health check pass + dedup against existing client feeds) auto-enable; low-confidence stay pending in review queue.
- **Stage 1.5 — CFW backfill sprint.** The 24 existing disabled feeds for CFW: review each, decide enable / disable / replace. One operator session, not Claude Code work.

---

## Risks and mitigations

- **Risk:** RPC silently inserts seeds that the discovery cron later fails on (RSS.app couldn't generate a feed for that keyword).
  **Mitigation:** Stage 1.2 review queue exposes failed seeds. Stage 1.1 only owns the capture; failure visibility is the next stage's job.

- **Risk:** Client provides terrible keywords ("stuff", "news") that produce noise feeds.
  **Mitigation:** Out of scope for this stage. Frontend can add a soft minimum-length check (≥3 chars per keyword) but no validation of quality. Operator review queue (Stage 1.2) catches noise.

- **Risk:** `c.client_content_scope` is empty for some clients, vertical_slug fallback is `'general'` which doesn't match existing seeds' verticals.
  **Mitigation:** This is benign — discovery EF uses RSS.app and `vertical_slug` is metadata, not a filter. The fallback gets cleaned up when client onboarding sets a proper content scope.

- **Risk:** Frontend ships before migration, RPC call returns "function does not exist".
  **Mitigation:** Apply migrations FIRST via Supabase MCP, verify V1–V3 pass, THEN merge frontend PR.

---

## Order of operations (for CC)

1. Run all 6 pre-flight queries via Supabase MCP `execute_sql`. Confirm results match expected.
2. Apply migration `20260428_001_discovery_stage_1_1_seed_client_id.sql` via Supabase MCP `apply_migration`. Verify V1, V2.
3. Apply migration `20260428_002_discovery_stage_1_1_rpc_add_seeds.sql`. Verify V3.
4. Branch `feature/discovery-stage-1.1` in invegent-dashboard.
5. Implement frontend components per spec.
6. Push, deploy via Vercel preview, manual test V8.
7. Merge to main only after V4–V6 pass via Supabase SQL.
8. PK runs V7 the morning after first 8pm UTC firing post-deploy.

---

## What success looks like at the end of this stage

PK opens dashboard, navigates to CFW → Onboarding, types 5 keywords, hits Save. Within 24 hours, several of those keywords become live RSS.app feeds in `f.feed_source` (with `feed_source_id` populated on the seed row). Stage 1.2 then surfaces them for one-click client assignment.

This stage on its own does not solve CFW's content starvation. It delivers the input mechanism. Stages 1.2, 1.3, 1.4, 1.5 turn that input into actually-enabled feeds. Stage 1.1 closing means the door is open.

---

*End of Stage 1.1 brief.*
