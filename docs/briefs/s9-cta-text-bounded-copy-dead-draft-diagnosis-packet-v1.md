# S9 — Bounded-copy (`cta_text`) dead-draft defect: diagnosis + recommended repair

**Status:** `FROZEN — DIAGNOSIS COMPLETE · RECOMMENDATION SINGLE · AUTHORISES NOTHING`
**Lane classification (CCF-02):** SAFETY_GATE · **T2** (isolated code lane, no DB subject at repair time — see §9)
**Posture:** diagnose and author only. **Zero production mutation.**
**Date:** 2026-07-24 Sydney · **Session:** S9 · **Priority:** 2 (Creatomate governed video)
**Base:** `origin/main` == `HEAD` == `565540dbeff3e9c10bb0c32e23342c53feca3e15`, parity 0/0, branch `main`
**No `cc-` ID claimed. No register version claimed. Not approved by its author.**

---

## 0. Stale-ref gate — PASS

`git fetch --prune` run first. `git rev-parse HEAD` = `git rev-parse origin/main` = `565540d…`,
`git rev-list --left-right --count HEAD...origin/main` = `0 0`, branch `main`. Base re-derived, not
taken from the seed line.

---

## 1. 🔴 HEADLINE — THE PREMISE IS FALSIFIED ON THE EVIDENCE

**There is not now, and there has never been, a production dead draft caused by `cta_text` overflow.**

The **single** `cta_text` gate trip in the entire render history was **cc-0038's own deliberate
fail-closed proof** — a PK-gated, CAS-guarded synthetic write that padded one elected draft past the
bound to prove the gate throws, then restored it 45 minutes later.

| Fact | Value | Source |
|---|---|---|
| Total `b1_video:` gate failures, all time | **1** | `m.post_render_log` |
| Distinct drafts affected | **1** (`1f5633de-6b83-4440-90ab-6673b0b8fbaa`) | same |
| Failure timestamp | `2026-07-16 07:00:12.180032+00` | same |
| Error | `b1_video: cta_text length 133 exceeds max_chars=90 (no truncation / no AI rewrite in v1)` | same |
| Draft state **now** | `video_status='published'`, `video_url` present, stored `cta_text` = **61 chars** | `m.post_draft` |
| Actually published | YouTube `tZEVJW7fnyU`, `2026-06-24 04:15:09+00` | `m.post_publish` |
| Blank-field (`b1_video: missing …`) failures, all time | **0** | `m.post_render_log` |

**The 133-char string is byte-identical to the padding literal in the proof harness**
([`_harness/cc0038_b4_proof/B4_1_write.sql`](_harness/cc0038_b4_proof/B4_1_write.sql)):

> `Are you watching the Perth market? Drop your thoughts below 👇 [cc-0038 B4 gate-trip padding to exceed the 90-char CtaText hard gate]`

and the 61-char value restored by
[`_harness/cc0038_b4_proof/B4_4_rollback.sql`](_harness/cc0038_b4_proof/B4_4_rollback.sql) is
byte-identical to what the draft holds today. The write was CAS-guarded (`AND video_status =
'published'`, assert exactly 1 row); the rollback asserted exactly 1 row. Render-log history for the
draft is attempt 1 `succeeded` (2026-06-24), attempt 2 `succeeded` (2026-07-10), attempt 3 `failed`
(the proof). `render_spec.qa.failure_stage = 'pre_render'` — the gate fired before any Creatomate
call, exactly as designed.

**Forward exposure is also zero, measured.** Across the entire draft corpus (every client, every
video format, every status), **no draft exceeds any of the four bounds**:

| Field | Bound | Max observed | Drafts over |
|---|---|---|---|
| `cta_text` | 90 | **66** | **0** |
| `stat_label` | 48 | — | **0** |
| `context_line` | 160 | — | **0** |
| `stat_value` | 12 | — | **0** |

**Consequence for the priority-2 program:** this is **not a live production defect and not a current
blocker**. It is a **latent structural defect** and a **pre-enablement precondition**. Under PK's
blocker rule it therefore must not displace the ordered program — it attaches to broad video
enablement as a gate, and §8 contains it to the minimum repair.

---

## 2. Item 1 — Where the limit is defined

[`supabase/functions/video-worker/b1_video_stat.ts:67-70`](supabase/functions/video-worker/b1_video_stat.ts:67) —
four exported TypeScript constants, the sole definition:

```
B1_VIDEO_STAT_VALUE_MAX_CHARS   = 12
B1_VIDEO_STAT_LABEL_MAX_CHARS   = 48
B1_VIDEO_CONTEXT_LINE_MAX_CHARS = 160
B1_VIDEO_CTA_TEXT_MAX_CHARS     = 90
```

**A second, tighter, unenforced set of numbers exists** in the ai-worker's LLM prompt
([`supabase/functions/ai-worker/index.ts:261`](supabase/functions/ai-worker/index.ts:261)):
`stat_value` max 12 · `stat_label` max 35 · `context_line` max 75 · **`cta_text` max 65**. These are
**instructions to a model, not validation.** Nothing checks them. They are tighter than the render
bounds on 3 of 4 fields, which is why a compliant generation never trips the gate — and why an
overflow requires the model to exceed its own instruction by >38%.

**Declared field policy:** `hard_gate_throw` (named in the b1_video_stat.ts docblock, mirroring
`b1_production.assertHeadlineWithinGate`).

## 3. Item 2 — Where validation currently occurs

[`b1_video_stat.ts:112-129`](supabase/functions/video-worker/b1_video_stat.ts:112) —
`assertStatFieldsWithinGate()`. Trims, throws on blank, throws on `value.length > max`. No
truncation, no rewrite.

Called from **one production site**:
[`video-worker/index.ts:985`](supabase/functions/video-worker/index.ts:985), inside
`renderGovernedVideoStat`, fail-fast before slug/selector/voice/Creatomate work. The plan builder
re-gates idempotently.

**⚠ Scope of the gate — it is NOT on the whole video path.** The governed branch fires only when
`fmt === 'video_short_stat'` **AND** `isVideoGovernanceEnabled(client, format)`
([`index.ts:1092-1094`](supabase/functions/video-worker/index.ts:1092)). The **legacy** `isStat`
branch ([`index.ts:1107-1113`](supabase/functions/video-worker/index.ts:1107)) passes
`vs.cta_text ?? 'What does this mean for you?'` straight into `buildStatRevealSpec` with **no length
check at all**. `video_short_stat_voice` is excluded by construction.

Second, non-production caller: the `governed_video_stat_smoke` entrypoint
([`index.ts:1156-1162`](supabase/functions/video-worker/index.ts:1156)) accepts an operator-supplied
`body.fields.cta_text` and applies the same gate. It writes `post_draft_id=null` render-log rows and
touches no production draft.

## 4. Item 3 — Why the draft is created BEFORE the failure becomes terminal ⭐

**This is the defect, and it is one SQL statement.**

`public.set_draft_video_script(p_post_draft_id uuid, p_video_script jsonb)` — SECURITY DEFINER,
`search_path='public'`, live definition read from `pg_proc`:

```sql
UPDATE m.post_draft
SET draft_format = COALESCE(draft_format,'{}'::jsonb) || jsonb_build_object('video_script', p_video_script),
    video_status = 'pending',
    updated_at   = now()
WHERE post_draft_id = p_post_draft_id;
```

**The same statement that persists the unvalidated content also enrols the draft in the render queue
(`video_status='pending'`).** There is no window between "content stored" and "draft is render-ready",
so there is no point at which content could be rejected before the draft becomes a production object.
Validation cannot be inserted "earlier in the flow" because **there is no earlier** — it has to be
inserted *into or before this call*.

Three compounding structural facts:

1. **Producer and enforcer are different workers, separated by hours or days.** `ai-worker` writes the
   content ([`index.ts:1172`](supabase/functions/ai-worker/index.ts:1172)); `video-worker` enforces the
   bound on a later cron pass. The bound is not expressed anywhere `ai-worker` reads.
2. **Governance arming is retroactive.** Content persisted while a client/format was *ungoverned* becomes
   subject to a bound it was never written against the moment `c.client_creative_governance.enabled` flips.
   **cc-0038 B4 is the live proof of this mechanism**: the same draft rendered successfully twice on the
   ungated legacy path (2026-06-24, 2026-07-10) and only failed once the governed branch was armed
   (`enabled=true`, 2026-07-10) and the content was pushed past the bound.
3. **Measurement contract differs by layer.** The gate measures JavaScript `String.length` — UTF-16 code
   units. Postgres `length()` counts characters. The current 61-char CTA ends in 👇 (U+1F447, 2 UTF-16
   units), so the renderer sees **62** where SQL sees **61**. Immaterial at this margin; **material to any
   validator written in SQL**, which would enforce a different bound than the gate it protects.

## 5. Item 4 — Affected formats, brands, historical count (live)

**Governance rows (`c.client_creative_governance`), live — the exact blast radius:**

| Client | Format | Enabled | Since |
|---|---|---|---|
| **property-pulse** | **`video_short_stat`** | **true** | 2026-07-10 04:25 |
| property-pulse | `image_quote` | true | 2026-07-07 |
| ndis-yarns | `image_quote` | true | 2026-07-18 |
| care-for-welfare-pty-ltd | `image_quote` | true | 2026-07-20 |
| invegent | `image_quote` | true | 2026-07-20 |

**Exposure today = 1 client × 1 format** (`property-pulse` × `video_short_stat`). Every other
client/format renders on the ungated legacy path. **Broad video enablement is precisely the act that
widens this.**

**Historical row count: 1** (§1) — synthetic, rolled back. **Production dead drafts from this cause: 0.**

**Adjacent census (context, not this defect):** 36 drafts sit at `video_status='failed'` across five
video formats — avatar 7 · kinetic 7 · kinetic_voice 10 · stat 8 · stat_voice 4. **All 36 have
`dead_reason IS NULL`.** None is attributable to a bounds failure (only 1 `b1_video:` log row exists,
and that draft is `published`). See §7 trap 2.

## 6. Item 5 — Can retry or recovery EVER succeed without changing content?

**No — and worse, nothing retries at all.**

- On throw, the per-draft catch sets `video_status='failed'`
  ([`index.ts:1246`](supabase/functions/video-worker/index.ts:1246)) and writes a `failed`
  `post_render_log` row ([`index.ts:1279`](supabase/functions/video-worker/index.ts:1279)).
- The worker selects only `video_status='pending'`
  ([`index.ts:1233`](supabase/functions/video-worker/index.ts:1233)). A `failed` draft is never re-picked.
- **No component resets `video_status` `failed`→`pending`.** Verified by exhaustive grep across
  `supabase/functions/**` and `supabase/migrations/**`. The other writers are `heygen-worker` (the avatar
  renderer — sets `rendering`/`generated`/`failed`, selects only `pending`, never resets), the publishers
  (`youtube-publisher` sets `published`), and read-side guards/backstops that only *read* the column.
- **`pipeline-fixer` FIX 2 operates on `image_status` ONLY**
  ([`pipeline-fixer/index.ts:68-107`](supabase/functions/pipeline-fixer/index.ts:68)) — `.eq("image_status","failed")`
  → `.update({ image_status: "pending" })`. The video path is **not in its scope at all.**

So the answer to "can retry succeed" is: **the bound is content-derived, so a retry on identical content
is deterministic failure — but the question is moot, because no retry exists.** A `cta_text`-failed draft
would be terminal on first failure, and terminal *silently*: `dead_reason` is never set, so it is invisible
to every dead-letter census.

## 7. Trap checks — all three, answered against findings

**Trap 1 — "declared control nothing reads."** Applies to the *existing* prompt limits: the ai-worker's
`cta_text max 65` instruction is a declared bound that **no production path consumes**. Confirmed by grep —
those numbers appear only inside the prompt string. §8 names the consuming path and the consumption proof
for anything new.

**Trap 2 — "the dead-letter loop."** **NOT the same state — the opposite one.** The recorded loop
(cc-0048 carry F-C) was *infinite retry* on the image path: `RENDER_ATTEMPT_CAP=5` unreachable because each
failure refreshed `updated_at` past FIX 2's `updated_at < now()-120min` filter. The video path has **no
reset and no cap**, so nothing retries invisibly. What it *does* share is the visibility failure: all 36
failed video drafts carry `dead_reason IS NULL` and are therefore absent from dead-letter reporting.
**Terminal but unlabelled.** This is a real observability gap — and it is **not caused by `cta_text`**; §8
keeps it out of the minimum repair.

**Trap 3 — "errors discarded into false nulls."** The gate itself does **not** swallow — it throws, the
catch records a typed `post_render_log` row with the exact field, length and bound. That message is why
this diagnosis was possible at all. **One genuine error-discard found adjacent:**
[`ai-worker/index.ts:1173`](supabase/functions/ai-worker/index.ts:1173) —
`if (vsErr) console.error(...)` on the `set_draft_video_script` RPC. A failed write is logged to console
and **swallowed**; the draft proceeds with `videoScriptGenerated=false`, no `video_script`, and (because the
RPC is what sets it) `video_status` never reaches `'pending'` — the draft silently never gets a video, with
no failure row anywhere. Recorded here; **out of the minimum repair**, named as a separate finding.

## 8. The comparison PK required — three options, one recommendation

Bounds are exceeded rarely (**0 real occurrences, ever**), so throughput impact is dominated by *what
happens in the rare case*, not by steady-state cost.

### A — Pre-draft validation with visible rejection

Validate the four fields before/at the persistence point; on violation do not set
`video_status='pending'`, and record a visible, typed rejection.

- **Cost:** low build. **But** if implemented in SQL (the natural place — it is one RPC), the bounds must be
  *copied* into the DB, creating a second source of truth for numbers that live in TypeScript — the exact
  divergence class this codebase has been bitten by — **and** SQL `length()` measures characters while the
  gate measures UTF-16 units (§4.3), so the two would enforce genuinely different bounds.
- **Operator experience:** a slot produces no video and a visible reason. Honest, but terminal.
- **Throughput:** trades availability for correctness — one lost video per violation, no recovery attempt.

### B — Bounded regeneration before persistence ✅ **RECOMMENDED**

In `ai-worker`, validate the generated script against the **imported** render contract before calling
`set_draft_video_script`; on violation, re-prompt with the explicit bound (capped at N attempts, N=2);
on exhaustion, fall through to A's visible rejection.

- **Cost:** ~1–2 extra LLM calls in a case that has occurred **zero** times in production. Requires exporting
  the four constants from `b1_video_stat.ts` and importing them in `ai-worker` — **one** source of truth, same
  measurement (`String.length`) as the gate. Precedent exists: both workers already carry a
  `creative_contract.ts` with `max_chars` fields.
- **Operator experience:** invisible in the overwhelming case — the draft is simply correct. A visible
  rejection remains for genuine exhaustion.
- **Throughput:** effectively unchanged; the availability trade is retained only as the terminal fallback.
- **Satisfies PK's invariant literally** — *"rejected **or** regenerated before a production draft enters an
  unrecoverable state"* — by doing both, in that order.

### C — Deterministic governed shortening

- **PK asked for the contract to be cited if it exists. It partially does, and it does not cover this field.**
  The contract vocabulary **does** include a governed truncation policy: `policy: 'truncate_optional'` on
  `subtitle` (max_chars 90) in
  [`ai-worker/creative_contract.ts:228`](supabase/functions/ai-worker/creative_contract.ts:228) and
  [`image-worker/creative_contract.ts`](supabase/functions/image-worker/creative_contract.ts) — an
  **optional** field on the **image** path.
- **`cta_text`'s declared policy is `hard_gate_throw`, and it is a required field.** No governed contract
  permits shortening it. So C is **not available as an engineering choice** — it would require a deliberate
  creative-governance change of the field's declared policy, which is PK's call and a different lane.
- Stated plainly per PK's instruction: **silent truncation is off the table.** It is named here only because
  PK asked whether a permitting contract exists — it exists for a *different field with a different policy*.

### Recommendation

**Option B**, with A as its terminal fallback. It is the only option that satisfies the invariant without
duplicating the bounds, without a second measurement contract, and without touching a `hard_gate_throw`
policy. The availability trade survives where it belongs — at exhaustion, not as the first response.

**Named consuming path (trap 1 discharge):** `ai-worker` → `generateVideoScript()` →
**new validation** → `set_draft_video_script`. **Consumption proof:** (i) hermetic unit tests on the pure
validator, both directions; (ii) a live proof that an over-length script never reaches
`video_status='pending'` — **using cc-0038 B4's own 133-char padding literal as the fixture**, which is a
ready-made, already-proven-to-trip-the-gate input requiring no new synthetic content; (iii) grep-proof that
the constants have exactly one definition after the change.

### Containment (PK's blocker rule)

- **Minimum repair (this packet's recommendation):** validation + bounded regeneration at the ai-worker write
  point. **This is the pre-enablement gate for broad governed video.**
- **NOT bundled, named not lost — two separate findings:** (1) video-path dead-letter labelling (36 drafts,
  `dead_reason IS NULL`, no reset path — §7 trap 2); (2) the `set_draft_video_script` error-discard at
  [`ai-worker/index.ts:1173`](supabase/functions/ai-worker/index.ts:1173) (§7 trap 3). Each needs its own
  Gate 1. Neither may displace the ordered program.

## 9. Tier, review chain, and what this packet is NOT

**Tier T2** — isolated code lane, no DDL, no DML, no deploy inside the build. Chain: `ef-builder` (isolated
worktree) → `branch-warden` `safe` → external review pinned to the diff hash → PK Gate 2. **`db-rls-auditor`
is NOT required at repair time** (CCF-02 R1, omission named here): the recommended repair adds no DB object
and changes no SQL — `set_draft_video_script` is read as evidence, not modified. **If PK instead elects
Option A implemented in SQL, that inverts: the RPC becomes the subject and `db-rls-auditor` becomes
mandatory.**

**Non-claims.** Nothing applied, deployed, migrated, or mutated. No draft read for mutation; **no dead draft
touched, revived, deleted or truncated**. No `cc-` ID allocated, no register version claimed. This packet
does not approve itself, does not open the repair lane, and does not authorise broad video enablement. All
live figures are point-in-time reads of 2026-07-24 and must be re-verified at any future gate.

## 10. Next gate

> **PK: accept or reject Option B as the recommended approach, and confirm the finding in §1 — that this is
> a pre-enablement precondition, not a live production defect — since that reclassification changes whether
> it belongs in the priority-2 critical path at all.**

Routed through the control tower. S9 holds no production window and does not coordinate with S3 directly.
