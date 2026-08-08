# Brief cc-0093 — capability-truth-for-non-creatomate-engines

**Created:** 2026-08-08 Sydney
**Author:** Claude Code (orchestrator)
**Executor:** TBD at Gate 1
**Status:** **DRAFT — AWAITING GATE 1.** Nothing here is authorised. Raised on PK instruction
("raise Option 3 as its own lane", 2026-08-08) out of cc-0092 Amendment 1.
**Result file:** `docs/briefs/results/cc-0093-capability-truth-non-creatomate-engines.md` (on completion)

> **Lane:** Capability model — structural. **CCF-02 class:** SAFETY_GATE (an enforcement gate is
> acting on incomplete truth). **Tier: T3 provisional** — it touches the scheduling admission rule
> for every client and platform. Gate 1 confirms the tier.
> **Predecessors:** AB-01 (root cause #2, already diagnosed) · cc-0091 Gate A (the same defect
> class one layer down) · cc-0092 Gate B (where it became load-bearing).

---

## Ultimate

> **Make capability truth cover the engines ICE actually renders with, so the demand grid stops
> suppressing formats that demonstrably render and publish — without weakening the gate for
> formats whose capability gap is real.**

## This is NOT a new finding — it is AB-01 root cause #2, now confirmed from a second direction

**AB-01 diagnosed this first and should be credited as the source.**
`docs/briefs/results/ab01-capability-loss-attribution-v1.md` §3 root cause 2:

> *"Capability truth is structurally incomplete for non-Creatomate formats. The template registry /
> `select_template` model only Creatomate; HeyGen-rendered (`video_short_avatar`) and voice formats
> classify `unsupported_silent_degrade:format_unmapped` … despite `video_short_avatar` being the
> single most publish-proven video format in the system."*

AB-01 quantified it as **~29 slots wrongly terminal (12.0% of losses) plus ongoing suppression**,
and proposed remediation **option (b)** — *"Extend capability truth to non-Creatomate engines (model
HeyGen in the registry, or an engine-aware exemption analogous to the `text` carve-out — scoped so
genuine gaps still block)"* — noting it *"interacts with cc-0091 Gate A and should ride with it."*
AB-01's own non-binding recommendation called (b) **"the one genuinely new lane this diagnostic
surfaces."** This brief is that lane.

**What cc-0092 adds is confirmation from the scheduling side, plus a concrete cost.** AB-01 measured
the defect in lost slots. cc-0092 hit it as a *blocked deliverable*: it could not satisfy its own
success criterion, and its scope had to be cut from three proof formats to one.

## Evidence (all read-only, 2026-08-08, live)

**The demand grid gates a format through four CTEs, and the third has two independent legs:**

```
candidate_share → enabled_set → capability_gated → policy_backed
                  c.client_       platform_support AND
                  format_config   select_template ≠ fail_closed      t.format_*_policy
```

`m.build_weekly_demand_grid`, `capability_gated`:

```sql
AND ( es.ice_format_key = 'text'
   OR COALESCE((public.select_template(v_client_slug, es.platform, es.ice_format_key)
                ->> 'status'), 'fail_closed') <> 'fail_closed' )
```

Note the shape: there is **already exactly one carve-out** (`'text'`). The question this lane
answers is whether that carve-out list is the right mechanism and is simply incomplete.

**Live reachability, Instagram, property-pulse and ndis-yarns (identical):**

| Format | `is_enabled` | `platform_support` | `select_template` | schedulable? |
|---|---|---|---|---|
| `video_short_stat` | true | false *(cc-0091 A1 fixes)* | `ok` | yes, after A1 |
| `video_short_stat_voice` | **false** | absent *(A1 fixes)* | **`format_unmapped`** | no |
| `video_short_kinetic_voice` | **false** | absent *(A1 fixes)* | **`format_unmapped`** | no |
| `video_short_avatar` | **no config row at all** | **true already** | **`format_unmapped`** | **no** |

- `c.creative_template_variant_candidate` holds rows for only **six** `format_key`s
  (`carousel`, `image_quote`, `story_image`, `video_short_kinetic`, `video_short_stat`,
  `youtube_thumbnail`). The `_voice` and `avatar` keys are **absent**, so `select_template`
  fail-closes at zero candidates before any platform or client check.
- The `_voice` formats render through the **legacy** branch in `video-worker`
  (`supabase/functions/video-worker/index.ts:1728`): `B1_VIDEO_GOVERNED_FORMAT` is the exact literal
  `'video_short_stat'`, so `_voice` variants **deliberately and documentedly** never reach
  `select_template`. The code comment says so explicitly.
- `video_short_avatar` is HeyGen-rendered, not Creatomate — there is no template for the registry
  to hold. AB-01: **136 YouTube publishes + 6 Instagram Reels, 90 renders / 0 failures.**

**The contradiction, stated plainly:** the scheduler requires a Creatomate-template governance rung
from formats whose renderer was never routed through Creatomate. The most publish-proven video
format in the system cannot currently be scheduled.

## Scope

1. **Establish the true inventory.** Every `ice_format_key`, its render engine and code path
   (governed vs legacy vs HeyGen), and whether `select_template` can meaningfully answer for it.
   Distinguish rigorously: *no template because a different engine renders it* (a model gap) from
   *no template because the format genuinely has no way to render* (a real gap the gate must keep
   catching). **Conflating those two is the whole failure.**
2. **Determine the mechanism**, with a recommendation and the trade-offs — AB-01's two candidates
   plus any better one found:
   - **engine-aware exemption** — generalise the existing `'text'` carve-out to an engine/capability
     predicate, scoped so genuine gaps still block; or
   - **model non-Creatomate engines in the registry** — HeyGen and the legacy video branch become
     first-class, so `select_template` can answer truthfully instead of being bypassed.
3. **Quantify current suppression** across all clients and platforms — how many slots per week are
   being silently dropped today, not only the ~29 already-terminal AB-01 counted.
4. **Author the remediation** as `NOT_APPLIED_*` + ROLLBACK, byte-hashed, harness-validated.
   **Authoring only — Gate 1 does not authorise applying it.**
5. **State the interaction with the retroactive question** (AB-01 option (c), re-opening
   falsely-skipped slots) without deciding it. It is PK's, and it is cleanest decided with this
   lane's result in hand — AB-01 says the same.

## Out of scope — explicitly

- **Anything in cc-0092 Gate B.** That lane proves Reel transport for `video_short_stat` under
  Option 1 and must not absorb this. No mix change, no A2a/A2b interaction.
- **Granting a format a visual-approval rung it has not earned.** If the answer is that voice
  variants inherit their parent template's visual proof, that is a **separate PK governance
  decision** (cc-0092 Amendment 1 recorded it as feasible-but-rejected precisely so it would get
  its own gate). This lane may recommend; it must not assume.
- **Retiring the legacy render branch**, or migrating `_voice` formats onto governed rendering.
  A larger product lane; name it if the evidence points there.
- **cc-0091 A3** observability artifacts — already authored and watch-gated.
- Applying anything. Cadence, volume, `max_per_day`, schedules — untouched.

## Allowed actions

- Read-only DB via `db-read.py` (R0) and `execute_sql` (R1); read repo/docs/registers.
- Author `NOT_APPLIED_*` + ROLLBACK artifacts and harnesses; run harnesses offline.
- Invoke `db-rls-auditor` (the DB is this lane's subject, so it is required, not substitutable);
  `apply-harness-auditor` (shadow) pre-freeze; `ask_chatgpt_review` pinned to
  `reviewed_input_hash`; `branch-warden` before any commit.

## Forbidden actions

- **Do NOT apply, migrate, or deploy anything.** Gate 1 authorises authoring only.
- Do NOT weaken `capability_gated` into a permissive pass. A carve-out that admits genuinely
  incapable formats reintroduces silent degradation — the exact harm S7/S9 were built to stop, and
  **the failure this lane must not trade one way for the other.**
- Do NOT write `c.creative_template_variant_candidate`, `c.creative_template_client_assignment`,
  `c.creative_template_proof_event`, or `c.client_format_config` rows to make a format pass.
- Do NOT mark any format, template, or client `proven`, `graduated`, or `visually_approved`.
- Do NOT retroactively re-open skipped slots (AB-01 option (c)) — PK's decision, not this lane's.
- Do NOT touch Gate C, LinkedIn, YouTube posture, or Lane 5.
- Do NOT clean or archive worktree `admiring-shtern-6fdb19` (6.1GB harvest evidence).

## Success criteria

- A format×engine×path inventory that cites source for every row, with model-gap vs real-gap
  classified per format and the classification rule stated.
- A recommended mechanism with trade-offs, explicitly answering: **what still blocks afterwards?**
  A proposal that cannot name what it keeps blocking has not been designed.
- Current weekly suppression quantified across clients/platforms.
- `NOT_APPLIED_*` + ROLLBACK authored, hashed, harness-validated, reviewed — **not applied**.
- The result doc separates what was proven from what was assumed, and states what was left undone.

## Stop condition

Report per `docs/briefs/_template_result.md`, then stop at the authored-and-reviewed packet. The
apply is a separate PK gate.

## Open questions for Gate 1

1. **Tier.** T3 provisional here. The change alters the scheduling admission rule system-wide, which
   argues T3 even though the artifact may be small.
2. **Sequencing against cc-0092.** AB-01 suggested (b) *"should ride with"* cc-0091 Gate A. Gate A
   has since closed and Gate B is mid-flight under a watch gate. Does this lane run concurrently
   with Gate B authoring, or strictly after B4's verdict? Concurrent is possible — the lanes touch
   disjoint objects — but it splits attention during a T3 apply window.
3. **Does `video_short_avatar` come first?** It is the strongest case (142 real publishes, zero
   render failures, `platform_support.instagram` already `true`) and is blocked at a *second*,
   simpler gate too — it has **no `c.client_format_config` row at all** for any client. That may be
   a smaller, separable fix worth splitting out ahead of the structural one.
4. **Executor.** Whether `brief-author` drafts the artifact packet; note its DB-lane work still
   carries candidate-level scrutiny.

## Notes

**Why this keeps recurring.** cc-0091 A1 found capability truth wrong at the `platform_support`
layer. AB-01 found it wrong at the classifier/template-registry layer. Same failure shape twice:
**an unvalidated capability claim driving an enforcement gate.** The pattern worth naming is that
ICE added enforcement (S7, S9) on top of a capability model that was only ever complete for one
render engine. Enforcement was right; its input was partial.

**The honest risk in this lane.** The easy fix — widen the carve-out — is also the dangerous one. If
it admits formats that genuinely cannot render, drafts fail downstream instead of being cleanly
blocked, and the failure moves somewhere harder to see. The gate is doing real work for
`video_short_kinetic` right now (no audio stream, 4/4 renders — cc-0091 A1). **A good outcome keeps
that block and removes the false ones.** Any proposal that cannot demonstrate this on both cases
should be rejected.
