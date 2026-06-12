# Fix 1 patch plan — insights-worker v14.2.0 (FB engagement acquisition repair)

**Parent brief:** `docs/briefs/f-optionc-engagement-evidence-null-fix1-fb-engagement-acquisition.md` (amended `a5815d4e`)
**Baseline:** `supabase/functions/insights-worker/index.ts` v14.1.0, blob `d31071b8` (16,838 B). CCD MUST verify this blob sha before patching (L41 read-before-write); if drifted, stop and re-plan.
**Status:** PATCH PLAN ONLY — not implemented, not deployed. Remaining gates: CCD patch+commit → **D-01** → **PK exact phrase** → CLI deploy → V-checks.
**Scope locks:** no Option C, no Advisor/ai-worker change, no aggregation-ownership change (D2 stands), no YouTube change (D3 stands), no DB schema change (all 8 metric columns verified nullable 2026-06-12 — NULL-writing is constraint-safe), no cron change. **No Option C approval implied.**

## 0. Prep-lane evidence updates (2026-06-12, this lane)

1. **Nullability verified:** `m.post_performance` reach/impressions/engaged_users/reactions/comments/shares/clicks/engagement_rate are ALL nullable → NULL-on-failure writes safe.
2. **Gated CFW fields-call retest EXECUTED** (one pg_net GET on the new CFW token, Graph v24.0, strict L-StageR-paging redaction; request 160595): **still fails `(#10) pages_read_engagement / Page Public Content Access`.** Since debug_token shows the scope IS on the token, **Leg B is APP-level** (denied-App-Review app lacks usable access for this endpoint), not token-level. The session-file hope that §3a "may shrink or close" is **corrected: §3a Meta-side carry STANDS.** Comments+shares unavailable until App Review/advanced access lands.
3. Design consequence: **primary basis = `post_reactions_by_type_total`** (proven 200 without the permission); fields call **retained behind failure-visible recording** (~200 extra failing GETs/day, trivial) so comments+shares auto-heal with zero deploys when Meta-side lands, and the per-row call record becomes a live permission-flip signal.

## 1. Canonical decisions (for D-01)

- **Engagement basis:** preferred `reactions+comments+shares` when the fields call returns 200 (`engagement_basis_source='fields_rcs'`); fallback `total reactions` from `post_reactions_by_type_total` (`'reactions_by_type_total'`). **Clicks deliberately EXCLUDED** from the basis to keep the two sources comparable (brief allowed optional inclusion; excluded for definitional honesty — engagement ≠ clicks).
- `engagement_rate = basis / reach`, only when reach is a trustworthy 200 value > 0 AND a basis exists; else NULL.
- **`engaged_users` column semantic change:** now stores the canonical basis count (Meta's `post_engaged_users` is dead). `reactions` column = total reactions from whichever endpoint succeeded (same quantity, two endpoints); `comments`/`shares` NULL unless fields call succeeded.
- **`impressions`: metric REMOVED** (`post_impressions` = #100 invalid under served version; no verified successor) — column retained, written NULL.
- **`reach` becomes NULL-preserving** (v14.1.0 coerced failed reach to 0 via `?? 0`). Side-benefit: `refresh_post_format_performance()`'s `reach IS NOT NULL` filter now correctly excludes failed-reach rows.
- **Graph version pinned `v24.0`** (the actually-served version; v19 sunset auto-upgrade caused this failure mode).
- **L-StageR-paging in code:** `delete parsed.paging` immediately after every JSON.parse; never log/persist raw response text; error messages truncated to 140 chars.

## 2. Exact patch hunks (CCD, surgical str_replace; function-level where rewritten)

**H1 — VERSION + changelog.** Replace `const VERSION = "insights-worker-v14.1.0";` with:
```ts
const VERSION = "insights-worker-v14.2.0";
// v14.2.0 (2026-06-12, F-OPTIONC-ENGAGEMENT-EVIDENCE-NULL Fix 1, Stage R verified):
//   - post_engaged_users and post_impressions REMOVED: both return (#100)
//     invalid metric under the actually-served Graph version (v19 sunset →
//     Meta silently served v24.0; version now pinned explicitly).
//   - Engagement basis (canonical): reactions+comments+shares when the post
//     fields call succeeds (200); else total reactions from
//     post_reactions_by_type_total (proven 200 without pages_read_engagement).
//     Clicks excluded from the basis. engaged_users column now stores this
//     basis count. engagement_rate = basis/reach from trustworthy 200 inputs
//     only; failed reads are NULL, never 0 (incl. reach — was coerced via ??0).
//   - Fields call (R/C/S) retained behind failure-visible recording: it fails
//     (#10) APP-level (denied App Review) — auto-heals when the Meta-side
//     carry lands; per-row call record is the live permission signal.
//   - raw_payload now carries per-call records {source, http_status,
//     fb_error_code, fb_error_message, value_present} + engagement_basis_source.
//   - L-StageR-paging: paging blocks deleted post-parse, never logged/persisted.
```

**H2 — Graph pin.** Replace `const GRAPH_VERSION = "v19.0";` with:
```ts
const GRAPH_VERSION = "v24.0"; // pinned to served version (v14.2.0) — v19 sunset; silent auto-upgrade caused the dead-metric failure mode
```

**H3 — METRICS_TO_TRY.** Replace the whole `const METRICS_TO_TRY ...` block with:
```ts
type MetricSpec = { key: string; names: string[]; sumObjectValues?: boolean };
const METRICS_TO_TRY: MetricSpec[] = [
  { key: "reach",           names: ["post_impressions_unique"] },
  { key: "clicks",          names: ["post_clicks"] },
  { key: "reactions_total", names: ["post_reactions_by_type_total"], sumObjectValues: true },
];
// v14.2.0: post_engaged_users + post_impressions removed — (#100) invalid
// under served Graph version (Stage R 2026-06-12, all four clients/tokens).
```

**H4 — fetchSingleMetric: full-function replacement** (adds `MetricCallRecord`, status/error capture, object-summing, paging strip, NULL-never-0):
```ts
type MetricCallRecord = {
  source: string;                    // metric name or "post_fields_rcs"
  http_status: number | null;
  fb_error_code: number | null;
  fb_error_message: string | null;   // truncated 140 chars; never raw body
  value_present: boolean;            // true = trustworthy 200 read (0 is a REAL 0)
};

async function fetchSingleMetric(
  postId: string, pageToken: string, spec: MetricSpec, calls: MetricCallRecord[],
): Promise<{ value: number | null; metricName: string | null }> {
  for (const metricName of spec.names) {
    const rec: MetricCallRecord = { source: metricName, http_status: null, fb_error_code: null, fb_error_message: null, value_present: false };
    const url =
      `https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(postId)}/insights` +
      `?metric=${metricName}&period=${INSIGHTS_PERIOD}&access_token=${encodeURIComponent(pageToken)}`;
    try {
      const resp = await fetch(url);
      rec.http_status = resp.status;
      const text = await resp.text();
      let parsed: any = null;
      try { parsed = JSON.parse(text); } catch { parsed = null; }
      if (parsed && typeof parsed === "object" && "paging" in parsed) delete parsed.paging; // L-StageR-paging: paging URLs echo the token
      if (!parsed) { rec.fb_error_message = "unparseable_response"; calls.push(rec); continue; }
      if (parsed.error) {
        rec.fb_error_code = parsed.error.code ?? null;
        rec.fb_error_message = String(parsed.error.message ?? "").slice(0, 140);
        calls.push(rec); continue;
      }
      const raw = parsed?.data?.[0]?.values?.[0]?.value ?? parsed?.data?.[0]?.value;
      if (spec.sumObjectValues && raw != null && typeof raw === "object") {
        // post_reactions_by_type_total: by-type map; {} = genuine zero on 200
        const total = Object.values(raw).reduce((a: number, b: any) => a + (Number(b) || 0), 0);
        rec.value_present = true; calls.push(rec);
        return { value: total, metricName };
      }
      if (raw == null) { rec.fb_error_message = "no_value_in_200"; calls.push(rec); continue; }
      const n = Number(raw);
      if (!Number.isFinite(n)) { rec.fb_error_message = "non_numeric_value"; calls.push(rec); continue; }
      rec.value_present = true; calls.push(rec);
      return { value: n, metricName };
    } catch (e: any) {
      rec.fb_error_message = String(e?.message ?? e).slice(0, 140);
      calls.push(rec); continue;
    }
  }
  return { value: null, metricName: null }; // NULL on failure — never 0
}
```

**H5 — fetchPostInsights: full-function replacement:**
```ts
async function fetchPostInsights(platformPostId: string, pageToken: string) {
  const metricResults: Record<string, number | null> = {};
  const metricNamesUsed: Record<string, string> = {};
  const failedMetrics: string[] = [];
  const calls: MetricCallRecord[] = [];

  for (const spec of METRICS_TO_TRY) {
    const result = await fetchSingleMetric(platformPostId, pageToken, spec, calls);
    metricResults[spec.key] = result.value;
    if (result.metricName) metricNamesUsed[spec.key] = result.metricName;
    if (result.value == null) failedMetrics.push(spec.key);
  }

  // Post-level fields: reactions, comments, shares. Known-failing (#10) at
  // APP level (Stage R + new-token retest 2026-06-12 — fails even on tokens
  // whose debug_token shows pages_read_engagement). Retained behind
  // failure-visible recording: auto-heals with zero deploys when the
  // Meta-side carry (§3a) lands; the per-row record is the live signal.
  const fieldsRec: MetricCallRecord = { source: "post_fields_rcs", http_status: null, fb_error_code: null, fb_error_message: null, value_present: false };
  let fReactions: number | null = null, fComments: number | null = null, fShares: number | null = null;
  const postUrl =
    `https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(platformPostId)}` +
    `?fields=reactions.summary(true),comments.limit(0).summary(true),shares` +
    `&access_token=${encodeURIComponent(pageToken)}`;
  try {
    const postResp = await fetch(postUrl);
    fieldsRec.http_status = postResp.status;
    const postText = await postResp.text();
    let postParsed: any = null;
    try { postParsed = JSON.parse(postText); } catch { postParsed = null; }
    if (postParsed && typeof postParsed === "object" && "paging" in postParsed) delete postParsed.paging; // L-StageR-paging
    if (postParsed?.error) {
      fieldsRec.fb_error_code = postParsed.error.code ?? null;
      fieldsRec.fb_error_message = String(postParsed.error.message ?? "").slice(0, 140);
    } else if (postResp.status === 200 && postParsed) {
      fieldsRec.value_present = true; // genuine read — zeros below are REAL zeros
      fReactions = Number(postParsed?.reactions?.summary?.total_count ?? 0) || 0;
      fComments  = Number(postParsed?.comments?.summary?.total_count ?? 0) || 0;
      fShares    = Number(postParsed?.shares?.count ?? 0) || 0;
    } else {
      fieldsRec.fb_error_message = "unparseable_or_non_200";
    }
  } catch (e: any) {
    fieldsRec.fb_error_message = String(e?.message ?? e).slice(0, 140);
  }
  calls.push(fieldsRec);

  // Engagement basis (v14.2.0 canonical): trustworthy 200 inputs ONLY.
  const reactionsTotal = metricResults["reactions_total"];
  let engagementBasis: number | null = null;
  let engagementBasisSource: string | null = null;
  if (fieldsRec.value_present) {
    engagementBasis = (fReactions ?? 0) + (fComments ?? 0) + (fShares ?? 0);
    engagementBasisSource = "fields_rcs";
  } else if (reactionsTotal != null) {
    engagementBasis = reactionsTotal;
    engagementBasisSource = "reactions_by_type_total";
  }

  const reach = metricResults["reach"];   // NULL-preserving (was `?? 0`)
  const clicks = metricResults["clicks"];
  const reactions = fieldsRec.value_present ? fReactions : reactionsTotal; // same quantity, two endpoints
  const comments  = fieldsRec.value_present ? fComments : null;
  const shares    = fieldsRec.value_present ? fShares : null;
  const engaged_users = engagementBasis;  // semantic change: canonical basis count
  const impressions: number | null = null; // post_impressions removed; column kept for compat
  const engagement_rate = reach != null && reach > 0 && engagementBasis != null
    ? engagementBasis / reach : null;

  return {
    impressions, reach, engaged_users, reactions, comments, shares, clicks,
    engagement_rate,
    metricNamesUsed, failedMetrics, calls,
    engagementBasisSource,
  };
}
```

**H6 — raw_payload in the upsert.** Replace the `raw_payload: { ... }` object with:
```ts
          raw_payload: {
            metric_names_used: metrics.metricNamesUsed,
            failed_metrics:    metrics.failedMetrics,
            calls:             metrics.calls,
            engagement_basis_source: metrics.engagementBasisSource,
            version:           VERSION,
          },
```
No other upsert lines change textually — the metric fields already reference `metrics.*`, which are now nullable.

**Untouched (scope locks honoured):** Type C selection SQL, Type B token fallback, `computeFormatPerformance`, upsert conflict key, Deno.serve handler, cron config.

## 3. Known downstream interactions (recorded, accepted)

1. `failed_metrics` keys change (`impressions`/`engaged_users` disappear; `reactions_total` appears) — diagnostic-only consumers.
2. `engaged_users` semantic change documented in H1 changelog; sole numeric consumer of consequence is `engagement_rate` (computed in-function).
3. Once engagement populates, the 03:15 refresh begins writing real FB-only window-30 averages (partial Advisor heal pre-Fix-2; Fix 2 still required).
4. NULL reach on failed reads correctly drops those rows from the refresh aggregation.

## 4. Execution sequence (unchanged gates)

1. CCD: verify baseline blob `d31071b8` → apply H1–H6 → local dry run vs one client if practical → commit+push.
2. CCH: **D-01** with this plan + Stage R + retest evidence attached.
3. PK: exact approval phrase.
4. CCD: deploy via Supabase CLI from terminal (never MCP wrapper); commit-then-deploy (A-LE).
5. CCH: post-deploy V-checks after the 03:00–03:15 UTC cycle, per brief §5 (V1 per-call records present + no paging content; V2 reactions basis on 200-reads; V3 engagement_rate plausible 0–1 where reach>0+basis; V4 reach/clicks ≥ 459/526 baseline under the v24.0 pin; V5 zero-vs-failure observed; V6 drift register v14.2.0 A-LE). Expected day-1 outcome: `engagement_basis_source='reactions_by_type_total'` on ~all rows, fields_rcs records showing #10 until Meta-side lands.
**Rollback:** redeploy v14.1.0 (`d31071b8`) via CLI — single step; no DB rollback (new raw_payload keys inert).

**Option C remains PARKED. This plan does not approve Option C.**
