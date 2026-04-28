> **STATUS UPDATE 2026-04-28 evening (4th shift): RESOLVED via joint operator+chat session.**
>
> Migration applied: `20260428100257_audit_f002_low_confidence_joint_resolution`.
>
> **Resolutions:**
> - `c.brand_avatar.avatar_gen_status` → A — reserved-infra framing (HeyGen lifecycle, all rows currently `'empty'`)
> - `c.client_avatar_profile.avatar_status` → B — DEFERRED until 2026-10-31 (state machine pending first video-content client)
> - `c.client_brand_asset.asset_type` → A — reserved-infra framing (planned asset-management UI; not currently consumed by image-worker)
> - `f.raw_metric_point.entity_type` → A — reserved-infra framing (Phase 2.1 insights-worker activation)
>
> File kept as historical record per operator instruction ("do not remove"). Original deferral content below.
>
> ---

# F-002 Phase A — LOW-confidence column followup

**Status:** Backlog — awaiting joint operator + chat session
**Source:** ChatGPT review of CC's Phase A output, 28 Apr 2026
**Originating finding:** F-2026-04-28-D-002 (closed-action-pending)
**Related migration:** `supabase/migrations/20260428055331_audit_f002_p1_column_purposes_corrected.sql`

---

## Why these 4 rows are deferred

CC produced 83 P1 column purpose proposals. ChatGPT's review flagged that 4 of them were LOW-confidence inferences — typically because the column has zero populated rows in production, leaving CC to infer purpose from column name and table context alone.

The ChatGPT recommendation: do not auto-flow LOW-confidence rows into a migration. Either rewrite from operator knowledge or remove until the value space is known.

These 4 rows were removed from the applied migration. They are captured here as a small backlog item: in a future session, PK and chat sit together and write purposes manually, drawing on operator knowledge of the actual intent.

---

## The 4 deferred columns

### 1. `c.brand_avatar.avatar_gen_status`

- **Current state in DB:** column exists, only value observed across all rows is `'empty'`
- **Schema clue:** suggests a generation-job lifecycle (pending → generating → ready → failed)
- **CC's LOW-confidence draft:**
  > Lifecycle of the avatar generation job at HeyGen. 'empty' is the only observed value to date — additional states such as 'pending', 'generating', 'ready', 'failed' are likely in design; full set should be confirmed against HeyGen worker code if precision matters.
- **What's needed:** confirm against HeyGen worker code (or operator knowledge) what the full enum is.

### 2. `c.client_avatar_profile.avatar_status`

- **Current state in DB:** column exists, no rows populated
- **Schema clue:** lifecycle status for the production avatar+voice profile per client
- **CC's LOW-confidence draft:**
  > Lifecycle status of the production avatar+voice profile for this client. No populated rows yet — values not observed; column reserved for future video pipeline activation. Likely lifecycle: 'pending' → 'consent_signed' → 'active'.
- **What's needed:** operator confirms intended state machine when first row is created. Could become "the column is unused; defer documentation until first use" if appropriate.

### 3. `c.client_brand_asset.asset_type`

- **Current state in DB:** column exists, no rows populated
- **Schema clue:** table_purpose says canonical set is 'logo', 'banner', 'avatar' (used by image-worker for Creatomate render slots)
- **CC's LOW-confidence draft:**
  > Asset classification. Per table_purpose the canonical set is 'logo', 'banner', 'avatar' — image-worker reads asset_type to pick the right asset for a given Creatomate render slot. No populated rows yet.
- **What's needed:** operator confirms whether image-worker actually reads this column today, or whether it reads asset role from elsewhere. The draft is plausible but unverified.

### 4. `f.raw_metric_point.entity_type`

- **Current state in DB:** column exists, no rows populated
- **Schema clue:** combined with `entity_key` to identify what the metric describes
- **CC's LOW-confidence draft:**
  > Type of the entity the metric describes (e.g. 'page', 'post', 'account', 'video'). No populated rows yet — values not observed; column reserved for future analytics ingestion. Combined with entity_key to identify the metric subject.
- **What's needed:** operator confirms intended set when first row is created. Likely will be enumerated by the analytics ingestion EF when built.

---

## How to close this followup

In a future session, PK and chat sit together and:

1. For each of the 4 columns, decide one of:
   - Write a confident purpose (operator knowledge fills the gap)
   - Mark as DEFERRED until first use (`'DEFERRED until YYYY-MM-DD: first row not yet inserted'`) using the audit slice 1 escape hatch from `docs/audit/roles/data_auditor.md`
   - Mark as deprecated/vestigial if appropriate
2. Apply a small migration with the 4 UPDATEs
3. Update `docs/audit/runs/2026-04-28-data.md` closure note for F-002 Phase A to reflect the 4 are now resolved
4. Delete this file (its job is done)

---

## Why this pattern matters

The ChatGPT review caught a real risk: CC's Phase A would otherwise have written 4 plausible-but-unverified purposes into k.column_registry. They would have looked authoritative on read. Future audit cycles wouldn't have flagged them because they passed the `is documented` test.

LOW-confidence purposes are worse than no purpose at all when they are wrong. Better to have 79 confident purposes + 4 acknowledged gaps than 83 of mixed quality.

This is a forward discipline: any future column documentation pass treats LOW-confidence rows as "propose, don't auto-apply."
