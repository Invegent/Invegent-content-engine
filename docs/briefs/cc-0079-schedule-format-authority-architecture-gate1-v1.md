# cc-0079 — Schedule → Format Authority Architecture (Gate-1 Brief)

> **Lane:** cc-0079 · **Type:** READ-ONLY architecture brief · **Tier:** T1 (this brief) / proposes T2+T3 successors
> **Lane class:** SAFETY_GATE (production defect recorded) + PRODUCT_PROOF (architecture target)
> **Status:** DRAFT — awaiting PK Gate-1 approval. Authorises NO build, NO migration, NO deploy.
> **Author base (stale-ref gate PASSED):** see §0.

---

## 0 · Stale-ref gate record (mandatory precondition)

| Repo | Fetched with prune | Upstream SHA (fetched this session) | Working base | Verdict |
|---|---|---|---|---|
| `Invegent-content-engine` (CE) | yes | `ce3e4b8cfd65951e1719e936aa5b12d77b6573d4` | `ce3e4b8…` on `main`, parity **0/0** | **AT UPSTREAM — accepted** |
| `invegent-dashboard` | yes | `6fe8d1e198d8afaff22483c36072f07a8be5d4eb` | `fda2b512…` on branch `tmr-template-intake-ui-v0`, **0 ahead / 3 behind** | **STALE — divergence described below; re-read from fetched ref** |

**Dashboard divergence, explicitly described.** The local checkout was missing three commits:

- `f0ab742` — `feat(capability-matrix): cc-0046 Slice 0 — read-only platform×format×format-type matrix wired to live ice_ro views` ← **directly in scope for §6**
- `1572fbd` — containment Batch 1 (authz guard)
- `6fe8d1e` — containment Batch 2

Action taken: all dashboard evidence in this brief was re-read from `origin/main` via `git show origin/main:<path>` rather than the stale working tree. `PublishingPlanPyramid.tsx` and `CreativeConfigGapCard.tsx` are **not** modified by those three commits, so prior reads of those two files remain valid. `actions/capability-matrix.ts` existed **only** on the fetched ref and is incorporated into §6.

> This is the exact failure the standing gate exists to prevent: a §6 capability-matrix section authored from the stale tree would have declared "no capability matrix surface exists" and duplicated shipped work.

---

## 1 · Current demand creation

### 1.1 What causes a slot to exist

One cron, one function, one table.

```
cron materialise-slots-nightly (15:00Z, expected 1440m, green)
  └─ m.materialise_slots(p_days_forward := 7)          [SECURITY DEFINER]
       └─ FOR each row in c.client_publish_schedule WHERE enabled = TRUE
            JOIN c.client ON status = 'active'
          └─ m.compute_rule_slot_times(schedule_id, days_forward)
             └─ INSERT INTO m.slot (... , format_preference, ...) ON CONFLICT DO NOTHING
```

`c.client_publish_schedule` is the **entire** schedule model — six meaningful columns:

```
schedule_id · client_id · platform · day_of_week · publish_time · enabled
```

### 1.2 Where each dimension is introduced

| Dimension | Introduced where | Notes |
|---|---|---|
| brand / client | `client_publish_schedule.client_id` | present |
| platform | `client_publish_schedule.platform` | present |
| time | `day_of_week` + `publish_time` (+ `c.client.timezone`) | present |
| **format** | **NOT on the schedule** — stamped at materialise time from `client_publish_profile` (legacy) or the mix engine (enrolled) | **§1.4** |
| **format mode (fixed vs policy)** | **nowhere — not representable** | **primary schema gap** |
| cadence | emergent from the count of enabled rows | no explicit cadence object on this path |
| pillar / topic / campaign | **absent from the demand path entirely** | `m.creative_intent` + `intent_id` exist on `m.slot` but are unused by the scheduled path (`intent_id` NULL on every scheduled row sampled) |
| priority | absent on the schedule; `m.ai_job.priority` is a fixed literal `100` | not operator-controllable |
| format constraints | absent | |

### 1.3 Multiple slots, same platform, same day

**Already supported and already in use.** The PK is per (client, platform, day_of_week, publish_time), so several rows per platform-day coexist. Live evidence — Care for Welfare × Facebook × Monday carries four rows at `09:06`, `11:02`, `13:04`, `17:30` (one enabled, three disabled). Property Pulse × Facebook × Tue and Thu each carry two.

`m.compute_rule_slot_times` emits one timestamp per row, and `m.materialise_slots` assigns each occurrence a **stable 1-based ordinal within the ISO week**, ordered by occurrence timestamp. So a Monday 09:00 / 10:00 / 17:00 triple is already three distinct, individually addressable, stably-ordered demand units.

> **This is the single most important structural finding for PK's Mode A requirement.** The "FB Mon 09:00 static / 10:00 text / 17:00 reel" shape needs **no new row model** — the rows already exist and are already ordinally stable. What is missing is one column telling each row which format it demands, and one column telling it whether that demand is binding.

### 1.4 Can the current schema express fixed-format and policy-driven demand independently?

**No.** Format arrives via two mutually exclusive, whole-client paths chosen by an enrolment flag — never per schedule row.

```
m.materialise_slots
  ├─ m.format_mix_enrolled(client_id)?              -- c.client_control_tower_enrollment
  │    control_type='format_mix' AND enabled AND status='active'
  │    AND approval_status='approved' AND rollout_stage='enforce' AND is_current
  │
  ├─ TRUE  → POLICY PATH   m.build_weekly_demand_grid → m.allocate_week_formats
  │                        (Hamilton largest-remainder + smooth weighted round-robin
  │                         over the ACTUAL week occurrence count N)
  │
  └─ FALSE → LEGACY PATH   c.client_publish_profile.preferred_format_<platform>
                           (youtube hardcoded 'video_short_avatar' in the function body)
```

Consequences, all confirmed live:

- The choice is **per client, not per row.** A client is entirely policy-driven or entirely legacy. There is no way to say "this client's Monday 09:00 is fixed, its Wednesday 12:00 floats."
- **Exactly one client is enrolled:** `property-pulse`, `rollout_stage='enforce'`, `effective_from=2026-06-01`. The other three run legacy.
- **Zero rows exist in `c.client_format_mix_override`.** Every enrolled allocation uses the platform-wide default.
- `c.client_format_config` has rows only for `property-pulse` and `ndis-yarns`, and **every row has `platform = NULL`** — per-platform format enablement is defined in the schema and used by nobody.
- Legacy is degenerate: `preferred_format_instagram` and `preferred_format_linkedin` are **NULL on every row of `c.client_publish_profile` for all four clients**. Only `preferred_format_facebook` is ever populated (`'image_quote'`, 4 rows). So legacy IG and LI slots materialise with `format_preference = '{}'`.

**Latent defect (dormant), carried forward.** `client_publish_schedule.day_of_week` uses `0=Sunday…6=Saturday`, but both `m.compute_rule_slot_times` and the `materialise_slots` ordinal enumeration match on `EXTRACT(isodow)` (`1=Mon…7=Sun`). `day_of_week = 0` therefore matches nothing and **Sunday is unschedulable**. All 12 Sunday rows are currently `enabled=false`, so this is dormant, not live. Any future schedule editor must not expose Sunday until the convention is reconciled.

---

## 2 · Format authority — the eight distinct concepts

Today ICE conflates these into two columns, one of which nothing reads. They must be named separately.

| # | Concept | Exists today? | Where |
|---|---|---|---|
| 1 | **Requested / scheduled format** | partial | `m.slot.format_preference text[]` — stamped at materialise; carries the legacy pick *or* the policy allocation with no marker distinguishing them |
| 2 | **Format mode** (fixed vs policy-driven) | **NO** | not representable at any level below the client enrolment flag |
| 3 | **Policy-selected format** | yes, but indistinguishable from (1) | output of `m.allocate_week_formats`, written into the same `format_preference` array |
| 4 | **Advisor-recommended format** | yes | `ai-worker` `callFormatAdvisor` → `m.post_draft.recommended_format` + `m.post_visual_spec.spec.format_key` |
| 5 | **Final governed format** | **NO** | there is no such concept; `recommended_format` is final *by accident of being last writer* |
| 6 | **Override authority** | **NO** | no field records who/what decided |
| 7 | **Override reason** | partial, non-governed | free-text prose inside `m.post_visual_spec.spec.reason`; one hardcoded string `avatar_override (F-HEYGEN A2)` at `ai-worker/index.ts:1012` |
| 8 | **Policy / version provenance** | **NO** | no mix version, no policy version, no allocation snapshot persisted on the slot or the draft |

### 2.1 The consumption fact

`m.slot.format_chosen` is written by `m.fill_pending_slots` and then **read by nothing in production.** A grep across all 51 edge functions returns exactly one consumer:

- `supabase/functions/obs-observer/raw_observation_0a.ts:67,92` and `read_client.ts:28,58` — telemetry only.

Every renderer and publisher keys off `m.post_draft.recommended_format`:

- `image-worker/index.ts:910` (`image_quote`), `:1023` (`animated_text_reveal`), `:1039` (`animated_data`), `:1065` (`carousel`), `:1106-1109` (video formats → defer)
- `video-worker/index.ts:973`, `:1047`, `:1231-1234`, `:1238`, `:1249`, `:1279`

`ai-worker/index.ts:958` states the design intent explicitly: for scheduled slots, `input_payload.format` is *"a fill-time fallback, not a preference."* Only T0 manual/operator slots receive preference bias (`:959-963`). The sole exception is the narrow avatar override at `:1009-1014`.

### 2.2 Recommended final-format contract

**Do not promote `slot.format_chosen` to authoritative.** It is written before the Advisor runs, before content is known, and before platform/template/provider capability is checked — it cannot carry a decision that depends on all four. Promoting it would trade an unconstrained Advisor for an uninformed scheduler.

**Recommendation — keep the physical consumer column, change who is allowed to write it.**

`m.post_draft.recommended_format` remains the single field every draft creator, renderer and publisher reads. **Zero worker changes.** It becomes the **output of a governed resolver**, never a direct Advisor write. Provenance moves to additive sibling columns:

```
m.post_draft
  recommended_format        text     -- UNCHANGED semantics for all consumers: THE FINAL GOVERNED FORMAT
  format_mode               text     -- 'fixed' | 'policy' | 'manual' | 'legacy'
  requested_format          text     -- what the demand slot asked for (mode-aware)
  advisor_format            text     -- what the Advisor actually returned (never discarded)
  final_format_authority    text     -- 'schedule' | 'policy' | 'advisor' | 'resolver_fallback' | 'operator'
  final_format_reason       text     -- governed enum + detail, not free prose
  format_policy_version     text     -- mix/policy identity in force at allocation
  format_resolved_at        timestamptz
```

Invariant: **`recommended_format` is written by exactly one code path — the resolver.** `ai-worker` writes `advisor_format` and nothing else. This is the smallest change that makes the authority explicit while leaving `image-worker`, `video-worker`, `heygen-worker` and the publishers untouched.

---

## 3 · Fixed-format behaviour (Mode A)

Required properties, and what each needs:

| Requirement | Today | Needed |
|---|---|---|
| Advisor must not silently substitute | **violated** — Advisor output is final by construction | resolver pins `recommended_format := requested_format` when `format_mode='fixed'`; Advisor's differing pick is recorded in `advisor_format`, never applied |
| Platform incompatibility fails **before** draft creation | **violated** — see §9; unpublishable drafts exist today | capability check (§6) at `m.fill_pending_slots`, before the skeleton `m.post_draft` INSERT and before the `m.ai_job` enqueue |
| Missing template / asset / provider capability → governed gap | partial | `m.slot.status='skipped'` + `skip_reason` already exists and is used (`publish_path_disabled`, `format_policy_missing:<fmt>`); extend the reason vocabulary rather than inventing a new mechanism |
| Fallback explicit, permitted, recorded | **violated** — the only fallbacks are implicit and unlogged (`COALESCE(format_preference[1],'image_quote')` in `fill_pending_slots`; `: 'text'` at `ai-worker/index.ts:472`) | fallback must be an allow-list per (format, platform), off by default, and always stamped into `final_format_authority='resolver_fallback'` + `final_format_reason` |
| No unsupported format becomes an unpublishable draft | **violated** — 4 YouTube `text` drafts in 30 days, 0 published | fail closed at the §6 gate |

The Advisor retains everything PK named: content angle, pillar, topic, headline, template choice, copy. It loses exactly one power — changing the format when the mode is `fixed`.

---

## 4 · Policy-driven behaviour (Mode B)

### 4.1 What exists and is genuinely good

`m.allocate_week_formats(p_formats jsonb, p_n integer)` is a well-built pure function: Hamilton largest-remainder seat allocation, then smooth weighted round-robin spread, `IMMUTABLE`, no `now()`/`random()`, deterministic. Because ordinals are anchored to the ISO week rather than to "now", re-running the materialiser on a later night yields **the same format for the same slot** (convergence). This is sound and should be kept.

### 4.2 The window problem

**The current window is one ISO week, and it is an allocation window only — never an assessment window.** Nothing anywhere compares intended share against achieved share. `c.client_format_mix_audit` exists as a table; it is not written by `materialise_slots`, `fill_pending_slots`, or any worker.

Required per PK: targets assessed across a **named rolling window**, accounting for already scheduled / drafted / rendered / published output. That means the allocator must read backwards, which today it does not do at all — it allocates each week from a blank slate.

### 4.3 Repeated Advisor overrides defeating the mix

This is the mechanism PK named, and it is real (§9). But the honest decomposition is **two distinct faults**, and conflating them would produce the wrong fix:

**Fault A — data: the default mix allocates platform-invalid formats.** Cross-checking `t.platform_format_mix_default` against `t."5.3_content_format".platform_support`:

| Platform | Mix entries that are platform-INVALID | Invalid share of mix |
|---|---|---|
| facebook | `animated_text_reveal` (fb=false) 5% · `video_short_kinetic` (fb=false) 10% · `video_short_kinetic_voice` (fb=false) 10% | **25%** |
| instagram | `animated_data` (ig=false) 10% · `animated_text_reveal` (ig=false) 5% · `video_short_kinetic` (ig=false) 20% · `video_short_stat_voice` (no ig key) 15% | **50%** |
| linkedin | `carousel` (li=false) **40%** · `video_short_kinetic` (li=false) 15% · `video_short_stat_voice` (no li key) 10% | **65%** |
| youtube | none — all five entries are `youtube=true` | **0%** |

On LinkedIn the single largest mix entry (carousel, 40%) is platform-invalid, leaving only `image_quote` and `text` as valid — which is precisely and entirely why LinkedIn output is text-dominated. **Those Advisor "overrides" were the system correcting an invalid allocation. The Advisor was right.**

**Fault B — code: the Advisor has unconstrained final authority.** Visible in its pure form on **YouTube**, where the mix is 100% valid and the Advisor still substituted the format in 8 of 16 slots and emitted 4 unpublishable `text` picks.

> Fixing only the Advisor leaves 25/50/65% of FB/IG/LI demand allocating formats that cannot ship. Fixing only the data leaves YouTube broken. **Both are required, and the data fix is the cheaper and larger win.**

### 4.4 Missed demand

Undefined today. `m.slot.status` vocabulary in live data is `{filled: 1017, skipped: 318, future: 56, failed: 10}`. A skipped or failed slot is simply abandoned — never rolled forward, never reallocated, never expired with intent. 318 skipped slots represent silently lost demand that no surface reports. PK decision required (§10 open questions).

### 4.5 Onboarding a new format safely

The existing shape is already correct and should be reused: a format enters the mix only when it has **both** a current `t.format_synthesis_policy` **and** a current `t.format_quality_policy` (Amendment B of the Phase-1 migration). It must additionally clear the §6 capability gate before receiving nonzero share. Recommended staging: `share=0` + enabled → proof render → PK gate → nonzero share.

---

## 5 · Advisor boundary

Three candidate models:

| Model | Description | Assessment |
|---|---|---|
| **M1 — constrained selection** | Advisor receives only the slot-permitted candidate set; cannot name anything outside it | Safest. But alone it cannot express Mode A vs Mode B, and it still leaves the palette-collapse bug (§9) if the constrained set is empty |
| **M2 — recommend + resolver validates** | Advisor recommends freely; a governed resolver decides the final format, records both | **RECOMMENDED** |
| **M3 — governed override** | Advisor may override under narrow conditions | Strictly a later increment on top of M2; not a starting point |

**Recommended: M2, with M1 as a defence-in-depth layer inside it.** The Advisor is given the mode-appropriate candidate set (M1), *and* its answer is validated and resolved by the resolver before anything is written (M2). Belt and braces, because the live evidence shows the palette-restriction layer alone already fails (§9 — the model reasons outside its palette and the failure handler is platform-blind).

Under M2, `format_mode` drives the resolver:

- `fixed` → final = requested. Advisor divergence recorded, not applied.
- `policy` → final = policy allocation if platform-valid and capability-clear; Advisor may refine **only within** the eligible set; every deviation recorded against the rolling target.
- `manual` (T0 operator) → existing behaviour preserved (`format_preference_explicit`).

Every override records, without exception: original demand · Advisor recommendation · final decision · reason · authority · timestamp · policy version — the §2.2 column set.

---

## 6 · Platform compatibility

### 6.1 Authoritative source

`t."5.3_content_format".platform_support` (jsonb) is the only live per-platform capability declaration. **Semantics matter and are already correctly implemented in two places and incorrectly implied in a third:**

- key **present and `true`** → supported
- key **present and `false`** → explicitly unsupported
- key **absent** → not in taxonomy (n/a) — **must be treated as unsupported**

`ai-worker/index.ts:424` uses correct opt-in semantics (`if (s[platform] !== true) continue;`) — this was the v2.11.2 fix for the earlier YouTube-text incident. The dashboard capability matrix on `origin/main` (`actions/capability-matrix.ts`) documents the same three-state semantics explicitly. **`t.platform_format_mix_default` does not consult it at all** — that is Fault A.

### 6.2 Live matrix (13 formats × 4 platforms)

`✓` supported · `✗` explicitly false · `–` key absent (treat as unsupported)

| ice_format_key | category | buildable | engine | FB | IG | LI | YT | synth+qual policy | in default mix |
|---|---|---|---|---|---|---|---|---|---|
| `text` | text | ✓ | none | ✓ | ✗ | ✓ | **–** | both | yes |
| `image_quote` | image | ✓ | creatomate | ✓ | ✓ | ✓ | **–** | both | yes |
| `carousel` | image | ✓ | creatomate | ✓ | ✓ | **✗** | – | both | yes |
| `animated_text_reveal` | animated_image | ✓ | creatomate | ✗ | ✗ | ✗ | – | both | yes |
| `animated_data` | animated_image | ✓ | creatomate | ✗ | ✗ | ✗ | – | both | yes |
| `video_short_avatar` | (null) | ✓ | heygen | ✗ | ✓ | ✗ | ✓ | both | yes |
| `video_short_kinetic` | (null) | ✓ | creatomate | ✗ | ✗ | ✗ | ✓ | both | yes |
| `video_short_kinetic_voice` | (null) | ✓ | creatomate+11labs | ✗ | – | – | ✓ | both | yes |
| `video_short_stat` | (null) | ✓ | creatomate | ✗ | ✗ | ✗ | ✓ | both | yes |
| `video_short_stat_voice` | (null) | ✓ | creatomate+11labs | ✗ | – | – | ✓ | both | yes |
| `video_short` | video | **✗** | creatomate+11labs | ✓ | ✓ | ✗ | ✓ | **neither** | no |
| `video_long_explainer` | (null) | **✗** | creatomate+11labs | ✗ | – | – | ✓ | **neither** | no |
| `video_long_podcast_clip` | (null) | **✗** | creatomate | ✓ | – | – | ✓ | **neither** | no |

**Open question 1 — CLOSED.** Amendment B (`format_synthesis_policy` ∧ `format_quality_policy` both current) drops **nothing** from the mix: all 12 formats with `in_default_mix=true` carry both policies. The three formats missing policies are all `is_buildable=false` and all absent from the mix. **Amendment B is inert in current data** — it is a correct guard with nothing to guard against today, and must stay.

### 6.3 Gaps this matrix reveals

1. **`animated_text_reveal` and `animated_data` are supported on ZERO platforms** yet both hold mix share (FB 5%, IG 10%+5%) and both have live render branches (`image-worker:1023`, `:1039`). Dead capability consuming allocation.
2. **`format_category` is NULL for all six video formats** — the dashboard capability matrix orders by it and treats NULL as a real gap. Taxonomy hygiene issue.
3. **The matrix is one-dimensional.** It covers format × platform only. A final format must additionally be valid for the **publisher**, the **render path**, the **active brand**, and the **template/provider capability** — none of which `platform_support` expresses. Live template inventory exists at `ice_ro.template_registry_status` (provider, `output_type`, `aspect_ratio`, `inventory_status`, proof `status`) and governance at `ice_ro.asset_governance_status`, but **nothing joins them to `platform_support` at decision time**. The dashboard matrix on `origin/main` renders all three sources side by side for a human; no code consults the join.

**Recommendation:** the capability gate is a five-predicate conjunction — `platform_support` ∧ publisher-supported ∧ render path available ∧ brand-enabled ∧ template/provider present — evaluated **before** draft creation, failing closed with a named `skip_reason`.

---

## 7 · Demand fulfilment

### 7.1 The chain that exists

```
c.client_publish_schedule.schedule_id
  └─ m.slot.schedule_id            ✓ present on every scheduled slot
       └─ m.slot.filled_draft_id → m.post_draft.post_draft_id      ✓
            └─ m.post_publish_queue.post_draft_id                   ✓
```

### 7.2 The breaks

- **`m.post_publish_queue` carries only `post_draft_id`.** No `slot_id`, and **no format column**. Confirmed by catalogue read.
- **No format is recorded at publish time.** The format a post actually went out as is only inferable by walking back to the draft — and the draft's value has been mutated by the Advisor relative to the demand.
- **`m.slot.status` has no terminal publication state.** Live vocabulary is `{future, filled, skipped, failed}`. `filled` means *"a skeleton draft was created"* — **not** *"a post published."* 1017 slots sit at `filled` and that number tells you nothing about whether anything shipped.
- No `expired`, no `replaced`, no `superseded_by`. A slot skipped or failed simply stops.

**A successful post cannot currently be reconciled to the demand that caused it in one hop, and cannot be reconciled to the *format* that demand requested at all.** Closing this requires (a) a slot terminal-state vocabulary covering the full lifecycle PK named — generated / allocated / drafted / rendered / approved / published / failed / skipped / expired / replaced-via-governed-fallback — and (b) the final format persisted at publish time, not only on the draft.

---

## 8 · Weekly schedule analysis (permanent operational view)

Proposed as a permanent read-only view, not a one-off report. Grain: **one row per demand slot per ISO week**, columns spanning intent → outcome.

```
intended demand   : client · platform · local day+time · format_mode · requested_format · policy_version
generation        : slot_id · materialised_at · schedule_id · week_ordinal
allocation        : policy_allocated_format · allocation_rank · mix_share_target
advisor           : advisor_format · advisor_reason · advisor_ms
resolution        : final_format · final_format_authority · final_format_reason · deviation_class
production        : draft_id · render status · approval status · publish status · published_at
failure           : skip_reason · render error · publisher error · capability_gap
```

**Mandatory discrimination.** The view must not report a single undifferentiated "miss". Every shortfall must be classified into exactly one of:

| Class | Detectable from |
|---|---|
| insufficient scheduled demand | count of enabled `client_publish_schedule` rows vs target cadence |
| mix-policy distortion | `policy_allocated_format` ∉ platform-valid set (**catches Fault A — today this is 25/50/65% on FB/IG/LI**) |
| Advisor override | `advisor_format ≠ requested_format` ∧ authority='advisor' |
| missing template / provider capability | `ice_ro.template_registry_status` join empty for (format, aspect, brand) |
| render failure | `ice_ro.render_status` / `m.post_render_log` |
| publisher incompatibility | final format ∉ publisher-supported set for platform |
| missing asset supply | `ice_ro.asset_governance_status` / asset-gap tables |

Plus the four aggregate signals PK named: **mix target vs actual over the rolling window** · unused format capability (buildable + platform-valid + never allocated) · repeated/thin output (same format N weeks running) · demand never fulfilled.

**Feasibility note.** Six of the seven classes are computable from existing sources **today**, read-only. The only genuinely blocked one is publish-time format (§7.2). Existing R0 views (`slot_status`, `draft_status`, `render_status`, `publish_status`, `template_registry_status`, `asset_governance_status`) already cover most inputs — this view is largely a join, not new instrumentation. The `PublishingPlanPyramid` (read-only, `origin/main`) is the natural host surface and already labels `max_per_week` honestly as *"configured / not enforced"*.

---

## 9 · Current production defect — recorded

**Classification:** live, ongoing, silent. Not an incident (nothing is down); a governance failure producing wrong and occasionally unpublishable output.

### 9.1 Findings

1. **`m.slot.format_chosen` is not consumed by any production worker.** Sole consumer is `obs-observer` telemetry. (§2.1)
2. **`m.post_draft.recommended_format` — the Advisor's output — drives all downstream behaviour.** `image-worker`, `video-worker` and the render/publish path key off it exclusively. (§2.1)
3. **Facebook and Instagram policy allocations were repeatedly overwritten to `image_quote`.** Property Pulse, enrolled and `enforce`, 30 days: FB `video_short_kinetic` ×3 → `image_quote`; IG `video_short_kinetic` ×3 → `image_quote`; IG `video_short_stat_voice` ×3 → `image_quote`. **12 of 12 non-`image_quote` FB/IG allocations did not survive.**
4. **LinkedIn heavily shifted to `text`** — 10 of 12 PP LinkedIn drafts in 30 days, from requested `(none)`, `image_quote` and `video_short_kinetic`.
5. **YouTube received `text` recommendations it cannot publish** — 4 in 30 days for PP; 0 of 26 PP YouTube drafts published in the window.
6. **The intended YouTube video-only policy is not enforced by the production authority path.** The YouTube mix is 100% platform-valid (§6.2) and `m.slot.format_preference` correctly carried video formats; the Advisor substituted the format in 8 of 16 slots regardless.

### 9.2 Root cause of the YouTube `text` picks — Open question 2, CLOSED

**Palette-driven, not content-driven.** Two independent platform-blind mechanisms in `ai-worker`, either of which produces `text` on YouTube:

```ts
// ai-worker/index.ts:472 — the failure handler
const formatKey = validKeys.includes(parsed?.format_key ?? '') ? parsed.format_key : 'text';

// ai-worker/index.ts:427 — the empty-palette handler
const formats = allFormats.length > 0 ? allFormats : [{ ice_format_key: 'text', ... }];
```

`text` has **no `youtube` key** in `platform_support`, so it can never legitimately be in a YouTube palette — yet it is the hardcoded fallback on both paths, applied without any platform check.

**Direct evidence from `m.post_visual_spec`.** A YouTube draft dated 2026-05-24 recorded `ice_format_key = 'text'` while its stored advisor reason argues explicitly for a different format and carries a populated `image_headline`:

> *"…It is an event/recognition story best served by a visual headline format… **image_quote** suits this conversational, brand-awareness content well."* — recorded `format_key`: **`text`**

The model returned `image_quote`; `image_quote` is not in the YouTube palette; `validKeys.includes` failed; the hardcoded `: 'text'` fired. **The recorded format contradicts the recorded reasoning in the same JSON object.** Later examples (2026-07-07/08/22/23) show the model reasoning toward `text` on its own — it is not confined to its palette in its reasoning either — but the outcome is identical because both routes terminate at the same platform-blind literal.

> ⚠ **Explicitly NOT a request to build static YouTube image capability.** The defect is that an unpublishable format is *selectable*; the fix is to make it unselectable, never to make it publishable.

### 9.3 Two further defects carried forward

- **Platform-blind preference read.** `ai-worker/index.ts:437` selects `preferred_format_facebook` **for every platform**, including on the instagram/linkedin/youtube profile rows. Since that column is only ever populated on the facebook row, the Advisor's client-preference bias can physically only fire on Facebook. The `preferred_format_instagram` / `preferred_format_linkedin` columns are read by nothing.
- **Single-client enrolment.** `m.format_mix_enrolled` resolves true for `property-pulse` only. Note the live function body has already been upgraded past the Phase-1 hardcoded-UUID gate to a proper `c.client_control_tower_enrollment` lookup — the migration file's header comment (`STATUS: NOT YET APPLIED`, hardcoded PP UUID) is **stale relative to the live database**. Verified via `pg_get_functiondef`. Recording this so no future lane trusts the file header over the catalogue.

---

## 10 · Repair options

| | Option | Mode A? | Mode B? | Worker changes | Risk | Verdict |
|---|---|---|---|---|---|---|
| **R1** | Schedule-selected format directly authoritative — `recommended_format := format_preference[1]`, Advisor demoted to copy | yes | **no** — kills policy allocation | none | content/format mismatch ships unchecked; no capability gate | **reject** — fails PK's coexistence requirement |
| **R2** | Advisor selects only within slot constraints (pass `format_preference[]` as the candidate palette) | weak — "should" not "must" | partial | `ai-worker` only | **does not fix §9.2** — the empty/invalid-palette fallbacks still collapse to `text` | insufficient alone; adopt as a **layer** |
| **R3** | **Governed final-format resolver between allocation and draft creation** | yes | yes | **none** (resolver writes the column workers already read) | new component; needs provenance columns | **RECOMMENDED architecture** |
| **R4** | Separate fixed-format and policy-driven slots in the schema (`format_mode` + `requested_format` on `client_publish_schedule`) | yes | yes | none | schema change + editor surface + backfill | **RECOMMENDED target state**, complementary to R3 |

R3 and R4 are not alternatives — **R4 is how demand is expressed, R3 is how it is honoured.** R4 without R3 lets the Advisor keep overriding a now-explicit demand. R3 without R4 has no per-row mode to resolve against and stays client-global.

### 10.1 Recommended minimal near-term slice

Ordered by (harm reduction ÷ blast radius). **Nothing here forecloses R4** — every item is either a data correction or a fail-closed guard, and none introduces a schema shape the target model would have to undo.

**Slice 1 — stop the unpublishable output. T2, code, `ai-worker` only, no schema, no DB.**
Replace both platform-blind literals. At `:472`, an out-of-palette Advisor answer must resolve to a **platform-valid** member of the live palette (or fail closed to a governed skip), never to the constant `'text'`. At `:427`, an empty palette must fail closed — a synthetic `text` entry for a platform that does not support text is never a valid recovery. Fix `:437` to read the platform-correct `preferred_format_<platform>` column in the same pass.
→ Eliminates finding 5 outright and the YouTube half of finding 6.

**Slice 2 — stop allocating impossible formats. T2, DATA ONLY, no code, no deploy.**
Reconcile `t.platform_format_mix_default` against `platform_support`: remove or zero the 25% / 50% / 65% platform-invalid share on FB / IG / LI (§4.3) and renormalise. Decide separately whether `animated_text_reveal` and `animated_data` — supported on zero platforms — should hold share at all.
→ **Largest single win in the lane, and the cheapest.** Removes the majority of findings 3 and 4 by making the allocation legal rather than by constraining the Advisor. Data-only, reversible, no worker touched.

**Slice 3 — make authority explicit. T2, additive.**
Add the §2.2 provenance columns (all nullable, no consumer change) and introduce the resolver as the sole writer of `recommended_format`, initially in **shadow mode**: resolver computes and records `final_format` + authority + reason, `ai-worker` still writes `recommended_format`, and the weekly view (§8) reports the divergence. Flip to authoritative only after the shadow delta is understood at a PK gate.

**Slice 4 — capability gate before draft creation. T3.**
The five-predicate conjunction (§6.3) evaluated in `m.fill_pending_slots` before the skeleton INSERT, failing closed to `status='skipped'` with a named reason.

**Then R4** — `format_mode` + `requested_format` on `client_publish_schedule`, plus the operator editor. By this point the resolver honours the mode and the capability gate protects it, so "FB Mon 09:00 static / 10:00 text / 17:00 reel" becomes a data change on rows that already exist (§1.3), coexisting with percentage-based policy slots on other rows.

> Slices 1 and 2 together address findings 3, 4, 5 and the YouTube half of 6 **without any schema change, any new component, or any change to `image-worker` / `video-worker` / the publishers.** They are the honest minimum.

### 10.2 Open questions requiring PK decision

1. **Missed demand** (§4.4): roll forward / expire / reallocate? 318 slots currently sit silently skipped.
2. **Rolling window definition** (§4.2): trailing 7 / 14 / 28 days, or ISO-week bucketed? Assessment window and allocation window need not match.
3. **Fallback permission** (§3): when a fixed-format demand cannot be met, is *any* substitution permitted, or is a governed gap always preferred? Recommendation: gap by default, substitution only via a per-(format, platform) allow-list.
4. **`animated_text_reveal` / `animated_data`** (§6.3): retire, or fix `platform_support`? They hold mix share and have live render branches but zero platform support.
5. **Sunday** (§1.4): reconcile the `day_of_week` convention, or permanently exclude?

---

## 11 · Proof matrix

Every row is falsifiable and read-only-verifiable except where a T2/T3 apply is named. No row may be marked PASS on a plan — only on observed output.

| # | Property proven | Method | Pass criterion | Detects |
|---|---|---|---|---|
| P1 | Fixed-format demand preserved end to end | seed a `fixed` slot per platform; trace slot → draft → render → publish | `requested_format == recommended_format == rendered format == published format` for 100% | silent substitution |
| P2 | Policy allocation respects rolling targets | replay allocator over ≥4 windows; compare achieved vs target share | within Hamilton rounding tolerance of target | drift, distortion |
| P3 | **Advisor cannot emit a platform-invalid format** | adversarial: force out-of-palette + empty-palette on all 4 platforms | zero platform-invalid finals; **YouTube never `text`**; empty palette → governed skip, never a synthetic format | **§9.2 — both literals** |
| P4 | Every override visible | diff `requested` vs `advisor` vs `final` across a full week | every divergence carries authority + reason + policy version; zero nulls | invisible overrides |
| P5 | Multiple same-day platform slots stay distinct | FB Mon 09:00/10:00/17:00 with three different fixed formats | three distinct slots, three distinct finals, stable ordinals across re-runs | ordinal collision, convergence break |
| P6 | Final format consumed consistently | assert draft / renderer / publisher all read the same field | single source; no worker reads `slot.format_chosen`; no worker reads a stale copy | §2.1 regression |
| P7 | Unsupported demand fails before an unusable draft | request every invalid (format, platform) pair from §6.2 | `m.slot.status='skipped'` + named reason; **zero `m.post_draft` rows created; zero `m.ai_job` enqueued** | §3, token waste |
| P8 | Telemetry reconciles intended vs actual | run the §8 view over a full week | every slot classified into exactly one outcome class; no unclassified rows | §8 completeness |
| P9 | *(regression)* Amendment B still guards | add a mix format lacking a policy | excluded from allocation, reason recorded | §6.2 — currently inert |
| P10 | *(regression)* Convergence preserved | re-run materialiser on N consecutive nights | identical format per slot every night | the property §4.1 already has |

**Baselines to capture before any change** (read-only, valid at `ce3e4b8`): the §9 divergence table; the §4.3 invalid-share figures (25/50/65%); PP 30-day published-format distribution; 0/26 PP YouTube publish rate.

---

## 12 · Scope fences

**This lane is READ-ONLY.** No mutation of schedules, format policies, Advisor logic, drafts, renderers or publishers. No migration, no deploy, no commit, no register version, no push. No new capability implied for any platform — in particular **no static-image capability for YouTube** (§9.2).

**Deliverable:** this brief. **Next gate:** PK Gate-1 approval, then Slice 1 and Slice 2 as separate T2 lanes (Slice 2 is data-only and may precede Slice 1).

**Non-claims.** This brief does not claim: that the resolver design is proven (it is not built); that Slices 1–2 are sufficient for Mode A (they are not — they are harm reduction); that the §8 view is costed; that any format is safe to add to the mix; that the dashboard capability matrix is wired to the decision path (it is a read-only operator surface only).

**Evidence basis.** CE `ce3e4b8` (fetched); dashboard `6fe8d1e` (fetched, read via `git show`); live catalogue and data reads via `ice_ro` R0 views and read-only `execute_sql` SELECTs, 2026-07-24. No write was issued in this lane.
