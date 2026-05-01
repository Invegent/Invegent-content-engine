# Round-1 ChatGPT Review — 7 Amendments

**Date**: 2026-05-01 Friday evening Sydney
**Reviewer**: ChatGPT (round 1)
**Verdict**: Mostly approved; not green-to-deploy until 7 amendments applied
**Action**: All 7 amendments folded into the relevant briefs. Round-2 review pending.

## Summary

| # | Amendment | Affected brief | Severity |
|---|---|---|---|
| 1 | T17 — approved as-is | 01 | none |
| 2 | T18 — add go/no-go FB queue-status query as deploy gate | 02 | medium |
| 3 | T13 — approved as-is | 03 | none |
| 4 | T08-A — platform-scope `auto_approve_enabled` SQL lookup | 04 | **HIGH** |
| 5 | T08-B — dual-field response (deprecated alias for backward compat) | 04 | low |
| 6 | T08-C — staged first run protocol | 04 | medium |
| 7 | T08-D — P-B snapshot before deploy | 04 | medium |
| 8 | T09 — platform-specific check 7 + dry_run wording | 06 | medium |
| 9 | T10 — use `'skipped'` not `'failed'`/`'dead'`; split P-A discovery by approval_status | 07 | low |
| 10 | T14 — not blocking, B25 carry-forward agreed | 05 | none |

Amendments 1, 3, 10 require no action. Amendments 2, 4, 5, 6, 7, 8, 9 (7 amendments) folded into briefs.

## Amendment 2 — T18 go/no-go gate

**Issue**: T18 brief noted FB may not transit `'approved'` explicitly. If true, T18 could pause FB publishing entirely. Was a footnote; should be a deploy gate.

**Fold-in**: Added "Pre-deploy go/no-go check (REQUIRED before deploy)" section to `02_t18_facebook_publisher_gate.md`. Decision tree:
- Mostly `'approved'` → deploy as planned
- Mostly `'needs_review'` → STOP; acknowledge intentional pause; document; deploy with eyes open
- Mostly `'published'` → investigate queue-cleanup hygiene first
- FB intended to bypass approval → STOP; new architecture decision required

## Amendment 4 — T08-A platform-scoped auto_approve_enabled

**Issue (HIGH)**: After stratification by `(client, platform)`, the existing `LIMIT 1` lookup against `c.client_publish_profile` could pull an arbitrary platform's auto_approve setting. Silent risk of auto-approving on a platform the operator hasn't explicitly enabled.

**Fold-in**: SQL function v2 in `04_t08_auto_approver_stratify_cooldown.md` now uses LEFT JOIN LATERAL with explicit `cpp.platform = pd.platform` filter. Returns new `auto_approve_config_found` boolean.

**PK-confirmed semantics** (option c + Set aggregation):
- Exact (client_id, platform) row with `auto_approve_enabled=true` → eligible
- Exact row with `false` → not eligible
- No exact row → not eligible (default false), one warning per (client, platform) per run via EF Set aggregation

EF code:
```typescript
const missingConfigSet = new Set<string>();
for (const draft of drafts) {
  if (!draft.auto_approve_config_found) {
    const key = `${draft.client_id}:${draft.platform}`;
    if (!missingConfigSet.has(key)) {
      console.warn(`[auto-approver] missing_auto_approve_profile:${draft.client_id}:${draft.platform}`);
      missingConfigSet.add(key);
    }
  }
}
```

Response includes `missing_config_warnings: Array.from(missingConfigSet)` so dashboards can surface gaps.

## Amendment 5 — T08-B dual-field response

**Issue**: Renaming `skipped_needs_human_review` to `auto_rejected` is semantically right but may break cron dashboards/log parsers reading the old field.

**Fold-in**: EF v1.6.0 returns BOTH fields. Deprecated alias removed in v1.7.0.

```typescript
auto_rejected: results.filter((r) => r.outcome === "rejected").length,
skipped_needs_human_review: results.filter((r) => r.outcome === "rejected").length, // deprecated alias
```

## Amendment 6 — T08-C staged first run

**Issue**: T08 is the riskiest patch. Setting `approval_status='rejected'` fires `trg_handle_draft_rejection` which resets slots. Could create churn. Don't blast the cycling-30 in one cron tick.

**Fold-in**: "Staged first-run protocol (T08-C)" section added to T08 brief. Sequence:
1. Apply SQL migration
2. Deploy EF v1.6.0
3. **First invocation: `POST {limit: 5}`** — NOT 30
4. Run post-step queries (Q1 rejection-by-gate, Q2 slot churn, Q3 fresh approvals)
5. If clean: invoke with `{limit: 10}`
6. If still clean: let cron tick at full default

Document observations in `docs/audit/runs/2026-05-01-t08-staged-deploy.md`.

## Amendment 7 — T08-D P-B snapshot before deploy

**Issue**: T10 brief flip-flopped on P-B: "operator decision" then "T08 handles it". If T08 silently auto-rejects 30 drafts, no record of WHAT was rejected.

**Fold-in**: "Pre-deploy step — P-B snapshot (NEW v2.8)" section at top of T08 brief. SQL captures cycling-30 with title excerpt, body excerpt, body length, failed gate, client, platform. Exported to `docs/audit/runs/2026-05-01-t08-pre-deploy-pb-snapshot.md` BEFORE T08 deploy. Each draft retrievable later by `post_draft_id` if operator wants to review individually.

## Amendment 8 — T09 platform-specific check 7 + dry_run wording

**Issue**: Generic `token_expires_at` query doesn't apply to all publishers (YouTube uses refresh tokens in JSONB, LinkedIn Zapier uses webhook URLs, WordPress uses env app passwords). Also: "dry run" wording inappropriate for publishers that don't support it (YouTube).

**Fold-in**: Check 7 in `06_t09_safe_to_resume_publisher_checklist.md` rewritten with platform-specific subsections (7-FB, 7-IG, 7-LZ, 7-LD, 7-YT, 7-WP). Each has its own SQL query matching the credential layout.

Check 4 (manual invocation) split into "For publishers that support `dry_run`" vs "For publishers that do NOT support `dry_run`" — latter uses GET + eligibility query instead.

## Amendment 9 — T10 use `'skipped'` + split discovery

**Issue**: `'failed'` semantics imply publisher failure; `'dead'` implies irreversible corruption. `'skipped'` is the right semantic for pre-fix orphans (won't process by design). Also: P-A discovery should split by approval_status before disposition (different reason codes for `needs_review` vs `rejected`).

**Fold-in**: T10 brief revised:
- Disposition uses `status='skipped'` with `last_error='pre_fix_disposition:non_approved_draft:<state>'`
- Round-2 ChatGPT review point: confirm `'skipped'` is in legal `m.post_publish_queue.status` enum (weak evidence: instagram-publisher v2.0.0 uses `'skipped'` for `publish_disabled` rows)
- Discovery query A1 splits by approval_status; separate disposition UPDATE per group

Fallback: if round-2 review confirms `'skipped'` is not legal, use `'failed'`.

## Round-2 review prompts

1. T08-A: does the LEFT JOIN LATERAL design + `auto_approve_config_found` + EF Set produce exactly one warning per (client, platform) per run? Edge cases?
2. T08-D: does the P-B snapshot SQL capture enough fields for retrospective review?
3. T18 go/no-go: are there other states beyond approved/needs_review/published that should branch differently?
4. T09 check 7: are all five publisher credential layouts captured correctly? Any I missed?
5. T10: confirm `'skipped'` is in legal `m.post_publish_queue.status` enum? Source-pull evidence?

## Acceptance criteria (round-1 amendments done when)

1. All 7 amendments folded into respective briefs ✓ (this commit)
2. ChatGPT round-2 review captures any further refinements
3. Round-2 amendments folded in (if any)
4. Then: deploy micro-staged per `00_INDEX.md` sequence
