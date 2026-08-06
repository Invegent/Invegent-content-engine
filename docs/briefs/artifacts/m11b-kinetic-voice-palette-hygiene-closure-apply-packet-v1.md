# Apply Packet — M11b kinetic_voice / stat_voice palette-hygiene closure (v1)

**Status: DRAFT / NOT FOR APPLY.** This packet is a proposed future apply description, produced under
a T1 docs-only investigation-and-design brief (`docs/briefs/kinetic-voice-palette-hygiene-m11-fold-closure-design-gate1-brief-v1.md`).
**No SQL in this file has been executed. No code has been edited.** Every block below is illustrative /
for-future-apply-only. This packet requires its own fresh Gate-1 approval, `db-rls-auditor` review,
external review, and an explicit PK apply gate before any of it may run — none of that has happened.

**Governing scope widening (v6.147, PK):** BOTH `_voice` siblings (`video_short_kinetic_voice` AND
`video_short_stat_voice`) are in scope (resolves the original brief's open question 1).

**IMPORTANT — evidence correction vs the seed's assumption (read this before the rest of the packet):**
The control-tower seed for this lane stated "the one live eligible draft is ruled CONTAINED/VOIDED
(design its containment; do not execute it)," referring to draft `4f877c79…` (property-pulse,
`video_short_kinetic_voice`). **A fresh live read today (2026-08-06) found this draft has since
PUBLISHED** — `video_status='published'`, `youtube_published='2026-07-31T04:51:33.955Z'`,
`youtube_url=https://www.youtube.com/watch?v=4ejuEQ15j0U`. It is **no longer unpublished/pending** —
it went live 6 days ago, before this ruling/lane. **A "containment" action on a pre-publish draft is
no longer executable or meaningful for this specific draft** — reversing a live YouTube publish is a
takedown decision, categorically different from "void an in-flight draft," and is explicitly outside
this brief's scope (not named, not authorized). This packet does **not** propose any action on
`4f877c79…`; see §3 for the correct current candidate for a containment-style disposition
(`a44288f7…`, a different, still-genuinely-unpublished row this fresh read surfaced instead) and §5
Open Questions for the PK decision this correction requires.

---

## 1. Fresh live-state facts (2026-08-06, `execute_sql` SELECT-only, project `mbkmaxqhsohbtwsqolns`)

- `t."5.3_content_format"`: both `video_short_kinetic_voice` and `video_short_stat_voice` carry
  `is_buildable = true`, `is_active = true` (this is the **global** advisor-palette gate — see §2).
- `c.client_format_config`: `property-pulse` and `ndis-yarns` each carry an explicit
  `is_enabled = false` row for BOTH formats (notes: "Stage A+B activated" / "Stage B — ElevenLabs +
  YouTube"). `care-for-welfare-pty-ltd` and `invegent` carry **no row at all** for either format
  specifically (each has 2 total config rows, for other formats — NOT the "zero rows for this client
  at all" fail-open trap the brief flagged as a risk to check).
- **Net result, TODAY, for all 4 existing clients: the advisor's candidate-palette query
  (`ai-worker/index.ts` `fetchFormatContext`, lines ~1183-1200) already EXCLUDES both formats for
  every one of the 4 clients** — PP/NDIS via explicit `is_enabled=false`, CFW/Invegent via
  absence-of-row-for-this-format (which does NOT trigger the fail-open branch, since that branch
  checks "does this client have ANY config row for ANY format," and both have some). **The advisor
  palette is not currently offering these formats to any existing client.**
- **The residual, still-real gap:** `is_buildable=true` is a **global** switch — any *future* new
  client added with zero `client_format_config` rows at all would fail-open into the
  `NOT EXISTS (... WHERE client_id=...)` branch and be offered both formats regardless of the
  per-client rows above. This is the actual live exposure "palette hygiene" still needs to close, not
  a currently-active offer to an existing client.
- **Downstream publish-eligibility arrays are UNCHANGED by any of the above** — `youtube-publisher`,
  `instagram-publisher`, `image-worker`, and all three `asset_backstop.ts` files still list both
  format keys as eligible/video-classified in their own independent constant arrays (§2 full list).
  These are a **separate enforcement surface**: even with the advisor palette closed, any draft that
  reaches one of these formats by another path (a stale orphaned row, a future manual/T0 slot, a
  config regression) could still be picked up by a publisher. A complete closure must change every
  surface together — a partial fix (DB-only, or code-only) is explicitly the defect class this
  packet's design must avoid, per the governing brief.

## 2. Complete list of sites that must change together (current-HEAD line numbers, re-verified 2026-08-06)

| # | Surface | File:line | Current content | Kind |
|---|---|---|---|---|
| 1 | Advisor palette source (global gate) | `t."5.3_content_format"` row, `ice_format_key='video_short_kinetic_voice'` | `is_buildable=true` | **DB row** |
| 2 | Advisor palette source (global gate) | `t."5.3_content_format"` row, `ice_format_key='video_short_stat_voice'` | `is_buildable=true` | **DB row** |
| 3 | ai-worker video-format classifier | `supabase/functions/ai-worker/index.ts:344-348` | `VIDEO_FORMATS = new Set(['video_short_kinetic','video_short_stat','video_short_kinetic_voice','video_short_stat_voice','video_short_avatar','video_long_explainer','video_long_podcast_clip'])` | **code constant** |
| 4 | YouTube publisher eligibility | `supabase/functions/youtube-publisher/index.ts:306` | `ELIGIBLE_FORMATS = ['video_short_kinetic','video_short_stat','video_short_kinetic_voice','video_short_stat_voice','video_short_avatar']` | **code constant** |
| 5 | YouTube publisher asset backstop | `supabase/functions/youtube-publisher/asset_backstop.ts:47-53` (`VIDEO_CLASSES` Set, `video_short_kinetic_voice`/`video_short_stat_voice` at lines 50-51) | same shape as #4 | **code constant** |
| 6 | Instagram publisher eligibility | `supabase/functions/instagram-publisher/index.ts:154-158` | `IG_VIDEO_FORMATS = new Set([...,'video_short_kinetic_voice','video_short_stat_voice',...])` | **code constant** |
| 7 | Instagram publisher asset backstop | `supabase/functions/instagram-publisher/asset_backstop.ts:47-53` | same shape as #4/#5 | **code constant** |
| 8 | Generic `publisher` asset backstop | `supabase/functions/publisher/asset_backstop.ts:47-53` | same shape as #4/#5 | **code constant** |
| 9 | image-worker video-format classifier | `supabase/functions/image-worker/index.ts:607` | `VIDEO_FORMATS = ['video_short_kinetic','video_short_stat','video_short_kinetic_voice','video_short_stat_voice']` | **code constant** |

**Deliberately NOT in this list** (checked, judged out of scope for a *removal*, not omitted by
oversight): `video-worker/index.ts`'s `isKinetic`/`isStat` legacy-branch composition (lines
~1645-1646) and its `_voice`-specific caption/audio-mood logic — this is the **render-time consumer**,
reachable only if a draft already carries one of these format keys. Once sites #1-9 above close (no
new advisor offer, no publish-side eligibility), no new draft can ever reach this code again; it
becomes dead-reachable-only-by-legacy-drafts, not a defect requiring its own removal. Left as a named
residual-dead-code observation (§5), not a removal target — touching video-worker's render composer
is a code change with a materially larger blast radius than a constant-array trim, and is not needed
to close the exposure.

## 3. In-flight-draft disposition — corrected candidate

`4f877c79…` is moot (§ header note — already published). The fresh read (§1, and the investigation
result) instead surfaced **`a44288f7-5654-477f-8a78-3c64febb1de3`** — `ndis-yarns`, `youtube`,
`approval_status='approved'`, `scheduled_for=2026-05-20` (>2 months past-due), `video_status=null`,
never updated since creation (`created_at`≈`updated_at`, 2026-05-19), matched via the legacy
`recommended_format` column (not `final_format_authority`/`advisor_format`, which are both null on
this row — it predates those columns being populated, so its format-resolution provenance cannot be
independently confirmed from this row alone). This is a **genuinely different situation** from what
the original ruling described (a fresh advisor-selected `_voice` draft) — it looks like a stale,
possibly-orphaned pre-existing row from well before this format-governance work started, not a live
current instance of "the advisor palette deviation" this closure targets.

**This packet does NOT propose voiding `a44288f7…` unilaterally.** Per the brief's own Forbidden
actions ("do not decide unilaterally... surface every genuinely unresolved question"), this is named
as an **open PK decision** (§5 below), not resolved here — voiding an `approved` draft is itself a
content/schedule-adjacent action this T1 docs-only lane is not authorized to decide, let alone execute.

## 4. Proposed removal mechanism (ranked, with rationale)

**Recommended: (1) global `is_buildable=false`, PLUS (2) trim the 6 code-constant arrays — both,
not either.**

- **`is_buildable=false` alone is necessary but not sufficient.** It closes the advisor-palette source
  cleanly and durably (a single global row flip, self-documenting, survives any future client
  onboarding without needing a new per-client config row) — but does nothing about the 6 downstream
  publish-eligibility arrays, which are independent code paths that never consult `is_buildable` at
  all (confirmed by reading each file — none of the 6 arrays are DB-driven).
- **Trimming the 6 arrays alone is necessary but not sufficient.** It closes the publish-side surface,
  but leaves `is_buildable=true`, so the advisor could still (in the residual future-new-client
  scenario named in §1) select the format for generation — the draft would then simply get stuck
  wherever the array-based checks now reject it (blocked_by_capability-style, matching the existing
  pattern already observed on `2e34d0c2`/`90cf9bc8`), rather than never being offered at all. Leaves a
  wasted-generation-cycle / confusing-stuck-draft failure mode instead of a clean non-offer.
- **Rejected alternative — per-client `client_format_config` rows only:** already the CURRENT state
  for PP/NDIS (explicit `is_enabled=false`) and functions correctly for them today, but does not
  generalize to CFW/Invegent (no row at all — works today only because they aren't zero-total-rows
  clients) or to any future client (would need a NEW disabling row added proactively for every new
  client, an easy-to-forget manual step) — `is_buildable=false` is a single global source of truth
  that needs no per-client maintenance and cannot be silently skipped for a new client.

## 5. Review tier recommendation

**T2**, per CLAUDE.md Convention 3: "DML/DDL ≥ T2." This packet's #1-2 items are a DML `UPDATE` on a
non-secret, non-privilege-bearing configuration table (`t."5.3_content_format".is_buildable`) — additive
in effect (disabling, not deleting, reversible by construction), touching a table whose values are
already read by live production code paths but not itself a schema/grant/privilege change. It does
**not** rise to T3: no callers/grants/deploy/publish/posture/secrets surface is touched by the DB half.
**The code half (items #3-9) DOES require an Edge Function deploy** for `ai-worker`,
`youtube-publisher`, `instagram-publisher`, `image-worker`, and the `publisher` function — deploy is
always a T3-adjacent hard stop per CLAUDE.md ("Deploy is where past incidents happened; it stays
manual") regardless of how small the underlying diff is. **Net tier for the WHOLE packet: T2 chain
(scope-relevant auditors + branch-warden + hermetic tests + external review pinned to hash + rollback
proven before apply) for the DB half, escalating to the standing T3 PK deploy hard-stop for the code
half** — these should be sequenced as two explicit sub-gates, not blurred into one.

## 6. Proposed SQL (illustrative — NOT FOR APPLY)

**Execution channel (declared, not yet used):** the precheck / UPDATE / postcheck block below MUST be
submitted as ONE single `mcp__supabase__execute_sql` call (or, if applied via a migration, as ONE
`apply_migration` call) containing all three statements verbatim, in the order shown — never as
separate calls. `execute_sql` and `apply_migration` each run their full input as one implicit
transaction; splitting the three statements across multiple calls would break that atomicity (the
postcheck's abort would no longer be able to undo an already-committed UPDATE from an earlier call) —
this is the exact non-composition failure class named in the apply-harness-auditor shadow review of
this packet (`apply-harness-auditor` finding AHA-04-1/AHA-10-1, run 2026-08-06). This line is the
packet's fix for that finding — added post-audit, before freeze.

```sql
-- PROPOSED, NOT EXECUTED. Requires its own fresh Gate-1 + db-rls-auditor + external review + PK gate.
-- MUST be submitted as ONE single execute_sql / apply_migration call (see "Execution channel" above)
-- — never as separate statements/calls.
-- Fail-closed pre-check: abort if either row is already false (idempotency guard — a rerun after a
-- partial/earlier apply must not silently no-op past a real state it didn't expect).
DO $precheck$
DECLARE v_count int;
BEGIN
  SELECT count(*) INTO v_count FROM t."5.3_content_format"
    WHERE ice_format_key IN ('video_short_kinetic_voice','video_short_stat_voice')
      AND is_buildable = true;
  IF v_count <> 2 THEN
    RAISE EXCEPTION 'm11b_precheck_failed: expected exactly 2 is_buildable=true rows for the two _voice keys, found %', v_count;
  END IF;
END $precheck$;

UPDATE t."5.3_content_format"
SET is_buildable = false
WHERE ice_format_key IN ('video_short_kinetic_voice','video_short_stat_voice');

-- Fail-closed post-check: assert exactly 2 rows changed and both now false.
DO $postcheck$
DECLARE v_count int;
BEGIN
  SELECT count(*) INTO v_count FROM t."5.3_content_format"
    WHERE ice_format_key IN ('video_short_kinetic_voice','video_short_stat_voice')
      AND is_buildable = false;
  IF v_count <> 2 THEN
    RAISE EXCEPTION 'm11b_postcheck_failed: expected exactly 2 rows now is_buildable=false, found %', v_count;
  END IF;
END $postcheck$;
```

```text
Code diff sketches (illustrative, NOT applied — no .ts file was edited by this lane):

--- a/supabase/functions/ai-worker/index.ts
+++ b/supabase/functions/ai-worker/index.ts
@@ -344,4 +344,3 @@
 const VIDEO_FORMATS = new Set([
-  'video_short_kinetic', 'video_short_stat',
-  'video_short_kinetic_voice', 'video_short_stat_voice',
+  'video_short_kinetic', 'video_short_stat',
   'video_short_avatar', 'video_long_explainer', 'video_long_podcast_clip',
 ]);

--- a/supabase/functions/youtube-publisher/index.ts
+++ b/supabase/functions/youtube-publisher/index.ts
@@ -306,1 +306,1 @@
-const ELIGIBLE_FORMATS = ['video_short_kinetic','video_short_stat','video_short_kinetic_voice','video_short_stat_voice','video_short_avatar'];
+const ELIGIBLE_FORMATS = ['video_short_kinetic','video_short_stat','video_short_avatar'];

(same two-key removal pattern applies identically to:
  youtube-publisher/asset_backstop.ts:50-51,
  instagram-publisher/index.ts:155-156,
  instagram-publisher/asset_backstop.ts:50-51,
  publisher/asset_backstop.ts:50-51,
  image-worker/index.ts:607 — VIDEO_FORMATS array, drop the two keys, same as ai-worker's Set.)
```

## 7. Fail-closed assertions declared for THIS packet (executable, per §6, not prose-only)

**Atomicity note (post-audit fix):** `apply-harness-auditor`'s shadow review of an earlier draft of
this packet (2026-08-06) found the precheck/UPDATE/postcheck block named no execution channel, so its
"rollback the whole transaction" assumption was not mechanically guaranteed (findings AHA-04-1,
AHA-10-1 — both INCOMPLETE-triggering). Fixed by naming the single-call channel explicitly in §6
above; the assertions below are only atomic with the rest of the UPDATE when delivered that way.

- Pre-check: exactly 2 `is_buildable=true` rows exist for the two keys before the UPDATE runs — abort
  otherwise (catches a partial-earlier-apply or an unexpected third row).
- Post-check: exactly 2 rows now read `is_buildable=false` — abort (rollback the whole transaction) if
  not exactly 2.
- (For the eventual code-side apply, a future packet revision should add: a grep-based CI/pre-deploy
  assertion that zero `.ts` files under `supabase/functions/**` still contain the literal strings
  `'video_short_kinetic_voice'`/`'video_short_stat_voice'` inside an eligibility-array context after
  the edit — not authored here, since no code edit is being made by this lane; named as a requirement
  for whoever executes the future code-apply.)

## 8. Rollback plan

**DB half:** `UPDATE t."5.3_content_format" SET is_buildable = true WHERE ice_format_key IN
('video_short_kinetic_voice','video_short_stat_voice');` — a single-statement, byte-symmetric reversal
of the forward UPDATE (same execution-channel discipline as §6: one `execute_sql`/`apply_migration`
call). No data is destroyed (no row deleted, no other column touched), so rollback is unconditionally
safe and instant.
**Code half:** revert the 6-file diff via the deploying commit's git revert, then re-deploy each of the
5 affected Edge Functions (`ai-worker`, `youtube-publisher`, `instagram-publisher`, `image-worker`,
`publisher`) with `--no-verify-jwt` preserved exactly as their current live flag (standing CLAUDE.md
deploy gotcha — confirm each function's current `verify_jwt` setting before any deploy or redeploy,
forward or rollback).

## 9. Re-entry condition (verbatim from the governing ruling)

> "unsupported `kinetic_voice` eligibility is removed unless/until the format receives its own
> governed implementation and proof" (delta-audit-v1.md:216-247 §0f; restated in this brief's Task
> section and the v6.147 fold ruling). Re-entry for either `_voice` sibling requires a SEPARATE,
> not-yet-elected future mission to build a governed implementation (mirroring the existing
> `video_short_kinetic`/`video_short_stat` B1 governed pattern) with its own PK visual-approval proof
> — this closure packet does not itself define or schedule that future work.

## 10. Compound-condition statement (required by the brief, restated verbatim in spirit)

Closing this item is **necessary but not sufficient** for PP kinetic's return to unsupervised
scheduling. The compound condition is: (a) `kinetic_voice` palette hygiene closes (this packet, once
actually applied) **AND** (b) one natural, unattended scheduled cycle succeeds post-watch. Neither
half alone authorizes lifting supervision; this packet addresses only (a), and does not itself request
or imply any change to PP kinetic's current supervised-scheduling status.

---

## 11. Open questions / not resolved by this packet

1. **`a44288f7…`'s disposition (§3)** — void, leave, or investigate further first (its
   format-resolution provenance can't be confirmed from the row alone since it predates the
   `final_format_authority` column) — PK decision, not resolved here.
2. **`stat_voice` symmetry** — resolved by v6.147 (both siblings in scope) — no longer open, noted only
   for completeness against the original brief's open question 1.
3. **CFW/Invegent's "no row for this format" state** — functions correctly today (excluded, not
   fail-open) only because neither client is a zero-total-rows client; whether an explicit
   `is_enabled=false` row should ALSO be added for these two clients (belt-and-braces, matching
   PP/NDIS) or left as-is (relying on `is_buildable=false` alone once applied) is a design-completeness
   question for whoever authors the eventual real apply packet — this draft recommends relying on the
   global `is_buildable=false` as the primary mechanism (§4) specifically so this doesn't need
   per-client duplication, but flags the option.
