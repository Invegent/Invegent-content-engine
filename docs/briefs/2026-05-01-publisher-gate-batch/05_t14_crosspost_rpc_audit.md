# T14 — `crosspost_facebook_to_linkedin` RPC Audit

**Status**: CLOSED — no patch needed. Documentation only.

## Finding

The `crosspost_facebook_to_linkedin` RPC has been **disabled since D154 (18 Apr 2026)**. Its current body is:

```sql
CREATE OR REPLACE FUNCTION public.crosspost_facebook_to_linkedin(
  p_hours_lookback integer DEFAULT 24,
  p_limit integer DEFAULT 10
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- D154 18 Apr 2026: Disabled. Native LinkedIn seeding is now live
  -- (seed-and-enqueue-linkedin-every-10m + enqueue trigger extended).
  -- This function intentionally no longer enqueues anything.
  RETURN jsonb_build_object(
    'ok', true,
    'queued_for_linkedin', 0,
    'note', 'disabled_d154_native_linkedin_seeding_active'
  );
END;
$function$;
```

It's still called by `linkedin-zapier-publisher` v1.0.0 at the top of every run (Step 1), but does nothing. This is a no-op.

## Closure

T14 closes with no patch needed. The RPC is not an unguarded enqueue path because it doesn't enqueue anything.

## NEW finding — B25 referral

The RPC's body references **two NEW objects** that need investigation:

1. **`seed-and-enqueue-linkedin-every-10m`** — a cron job. Active LinkedIn enqueue path per the comment.
2. **"enqueue trigger extended"** — likely refers to the `trg_enqueue_publish_from_ai_job_v1` we already mapped. The comment suggests it was extended to cover LinkedIn (which it does, per source pull v2.6).

Neither is necessarily a problem — but neither has been audited for approval-gating. Per Lesson #46 and the v2.7 publisher-gate audit pattern, these deserve their own pass.

**B25 ticket** added to action_list backlog (next session): audit `seed-and-enqueue-linkedin-every-10m` cron and any LinkedIn-specific seeding logic for approval-gate compliance.

## Implication for T13 deployment

None. T13 patches the consumer (publisher) which is downstream of any seeding logic. Even if `seed-and-enqueue-linkedin-every-10m` enqueues unreviewed drafts (which would be a B25 issue), T13's per-row publisher gate catches them at publish time.

This is exactly why **consumer-side gates are the right architectural answer** — defence-in-depth that doesn't require auditing every producer.

## Acceptance criteria (T14 done when)

1. RPC source documented (above) ✓
2. B25 added to action_list backlog ✓ (will land in v2.8 next session bump)
3. Decision recorded: no patch to `crosspost_facebook_to_linkedin` because RPC is disabled ✓
