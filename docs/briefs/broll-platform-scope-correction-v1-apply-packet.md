CLAIMED · broll-platform-scope-correction-v1 · main-checkout `C:\Users\parve\Invegent-content-engine` · Gate-2 apply · 2026-07-29

# Apply Packet — B-roll `platform_scope` Correction v1

**Created:** 2026-07-29 Sydney · **Status: FROZEN — awaiting PK Gate-2 apply authorisation.**
**Lane classification:** SAFETY_GATE · **Tier: T2** (see §2 for why not T3).
**Origin:** PK instruction 2026-07-29 — *"Fix the platform_scope on both rows"*, opening the gate this
lane flagged at `docs/briefs/results/broll-rotation-readiness-handoff-v1.md` §8.3.
**Artifacts:** `docs/briefs/artifacts/broll-platform-scope-correction-v1-forward.sql` ·
`docs/briefs/artifacts/broll-platform-scope-correction-v1-rollback.sql`

---

## 1. The change

Two rows in `c.client_brand_asset`, **one column**:

| asset | asset_key | from | to |
|---|---|---|---|
| `2d62b04e` | `broll_pp_au_suburb_aerial` (live, the sole eligible clip) | `{youtube}` | `{facebook,instagram,youtube}` |
| `42211c0f` | `broll_pp_perth_skyline` (fenced: `is_active=false`, `approved=false`) | `{youtube}` | `{facebook,instagram,youtube}` |

LinkedIn is **deliberately excluded**, per `video-broll-intake-v1` Gate-1 ruling 4 — until LinkedIn's
own governed vertical-video template and publisher path are proven. Guard **G5** asserts LinkedIn still
fail-closes after the change, so the exclusion is proven rather than assumed.

**No DDL · no GRANT/REVOKE · no fence change · no `fit_status`/`enabled` change · no template change ·
no resolver change · no code · no deploy.** Two rows, one column.

## 2. Tier justification (T2, not T3)

DML is ≥ T2 by contract. It is **not** T3 because it touches no caller, grant, deploy, publish path,
posture or secret, and — proven in §4 — **cannot change what production renders**. The production video
path calls with `p_platform = NULL`, where the scope predicate is short-circuited by
`p_platform IS NOT NULL`; the resolver payload at that signature is **byte-identical** across the
change. It is not T1 because it is production DML on live governance rows.

> **⚠ EXTERNAL REVIEW PUSHED BACK ON THIS TIER — PK DECIDES.** Review `278fdc71` (round 1) verified the
> `p_platform=NULL` short-circuit and the guard/rollback model, raised **no concrete defect**, and left
> exactly one pushback: that production DML on *governance* rows may warrant **T3** regardless of proven
> impact, because the tier should track what a row class *governs*, not only what this particular change
> measurably does. **Triage class: `policy_decision`** (a tier judgment, not a defect) → PK decision gate.
> **The lane's position:** T2 is defensible on measured blast radius (§4.1–4.4), but the reviewer's
> principle is reasonable and the cost of T3 here is small — the full chain has effectively been run
> already; T3 would add independent lead re-verification and named live pre-check STOPs (§6 already
> names them). **Escalation up is free under Convention 3; PK may simply say "treat as T3".** Either way
> this packet stops at the PK gate.

## 3. Why this is worth doing

Established live in the v6.56 inspection (`docs/briefs/results/broll-rotation-readiness-handoff-v1.md`
§2.4): `platform_scope` is **inert** at the production signature, so the sole eligible clip — scoped
`{youtube}` only — is rendered into governed video for **every** platform. The declared control is not
consulted. Two defects follow:

1. **Honesty.** The row asserts a restriction production does not honour. That is the ICE
   "declared control production never reads" failure mode.
2. **A latent detonator.** Any future caller passing an explicit `p_platform` of `facebook`/`instagram`
   — an ordinary-looking correctness improvement — makes the clip `platform_excluded`, emptying the
   pool and fail-closing the B-roll background. This packet defuses that at the **asset layer**.

## 4. Evidence (live, this lane)

All measured against the real production template `dd5fd75e` / `46c5c4ac`.

### 4.1 Resolver behaviour, before vs after (measured in an aborted transaction)

| `p_platform` | BEFORE | AFTER |
|---|---|---|
| **`NULL`** — the production signature | `ok` (picks the clip) | **`ok`, payload byte-identical** |
| `facebook` | `fail_closed` / `no_governed_background` | **`ok`** ✅ |
| `instagram` | `fail_closed` / `no_governed_background` | **`ok`** ✅ |
| `linkedin` | `fail_closed` | **`fail_closed`** (correctly still excluded) |
| `youtube` | `ok` | `ok` |

**`FULL RESOLVER PAYLOAD IDENTICAL AT p_platform=NULL: true`** — not merely the same pick, the same
jsonb. This is the core safety claim, and guard **G4** re-asserts it inside the apply transaction, so
the apply aborts if it ever stops holding.

### 4.2 Blast radius — who actually calls with an explicit platform

| Caller | `p_platform` | Affected? |
|---|---|---|
| `video-worker` production (`index.ts:1251`) | **`null`** | **No** — payload byte-identical |
| `video-worker` governed smoke (`index.ts:1437`) | **`null`** | **No** — same |
| `image-worker` production (`index.ts:952`) | explicit `b1Platform` | **No** — `image_quote` templates have an **image** Background, and resolver v1.4's exclusive-by-element-type filter never even fetches `usage='broll_background'` rows for a non-video Background |
| `image-worker` smoke (`index.ts:833`) | explicit `smokePlatform` | **No** — same |

No production caller passes an explicit platform for `video_short_stat`. Other clients are unaffected —
these are Property Pulse client-owned rows, and no shared-pool path exists for B-roll (the shared
fallback is gated on `NOT v_bg_is_video`).

### 4.3 ⚠ Honest limitation — this does NOT restore end-to-end fb/ig B-roll

Measured after the change, `select_template('property-pulse', <platform>, 'video_short_stat', …)`:

| `p_platform` | winner returned |
|---|---|
| `facebook` | `video_stat_reveal_9x16_v2` — **the incumbent, not B-roll** |
| `instagram` | `video_stat_reveal_9x16_v2` — **the incumbent, not B-roll** |
| `youtube` | `(none)` — pre-existing, unrelated |
| `NULL` (production) | `AU_generic_national_Suburb_9:16_V1` — B-roll, **unchanged** |

**Why:** the B-roll template `46c5c4ac` has **no row at all** in
`c.creative_template_platform_suitability` (verified: `suitability_row = null`). That gate runs **above**
asset resolution, so at an explicit platform the B-roll template is rejected before its assets are ever
considered, and selection falls back to the incumbent.

**So this packet fixes the asset layer only.** An explicit-platform caller would now degrade gracefully
to the incumbent rather than fail-closed — **safer, but B-roll would silently vanish rather than
render.** Closing that fully requires a suitability row for `46c5c4ac`, which is a **separate lane** (it
changes what can win, and inherits TPR-1 + Addendum v1). Stated here so nobody reads this apply as
"explicit-platform B-roll now works" — it does not.

### 4.4 Exclusivity and shared-pool unreachability (measured, not asserted)

Both were flagged by external review as asserted-without-demonstration. Closed with live counts:

| Check | Result |
|---|---|
| **ALL `usage='broll_background'` rows, ALL clients** | **2**, both `property-pulse` |
| Rows this packet touches | **2**, both `property-pulse` — **identical set** |
| `c.shared_creative_asset` rows of any kind ≠ `static_background` | **0** |
| `c.shared_creative_asset` total, by kind | 14 rows, **all** `static_background` |
| Templates in the whole registry with a **video-typed dynamic Background** | **1** — `46c5c4ac` |

So: the packet touches **every** `broll_background` row in existence, they are all one client's, **no
shared B-roll asset exists at all** (the shared pool is 100% still-image, so it could not surface a
B-roll clip even if the resolver's `NOT v_bg_is_video` gate were removed), and exactly **one** template
in the registry can consume these rows. The blast radius is closed on all four sides.

### 4.5 Rollback proven BEFORE apply

Forward + rollback executed in one live transaction ending in a sentinel `RAISE`:

```
G1 pre-image digest MATCHES frozen value: a779f700296959c8cf18e28cdcceb1b8
FORWARD:  2 rows updated, G4 payload byte-identical, G5 linkedin still fail_closed
ROLLBACK: 2 rows restored, G3 DIGEST-EXACT to a779f700296959c8cf18e28cdcceb1b8
=> ROLLBACK_PROOF_PASSED — zero production effect
```

Post-proof verification: live digest still `a779f700296959c8cf18e28cdcceb1b8`, and **`updated_at` did
not move on either row** (`2026-07-28 02:19:34` / `2026-07-10 12:17:07`) — the proof left no trace at
all, not even a timestamp.

## 5. Guard register (every one an executable `RAISE`, none a comment)

| ID | Guard | Fail behaviour |
|---|---|---|
| **G0** | atomicity armed via `set_config(..., txid_current(), TRUE)` **before the first write**, re-asserted after | abort |
| **G1** | pre-image digest == `a779f700296959c8cf18e28cdcceb1b8` (refuses a state it did not freeze) | abort |
| **G2** | exactly **2** rows updated (CAS-pinned `AND platform_scope = ARRAY['youtube']`) | abort |
| **G3** | post-image is exactly `{facebook,instagram,youtube}` on both rows | abort |
| **G4** | **production-signature resolver payload byte-identical before/after** | abort |
| **G5** | LinkedIn still `fail_closed` | abort |

Rollback carries its own G0–G4 plus a **G3 that recomputes the forward packet's frozen pre-image
digest** — the restore proves itself rather than being assumed.

**Fail-closed posture:** every guard aborts the whole transaction; nothing partial can land. The
`UPDATE` is CAS-pinned to the known prior value, so a concurrent change makes it match 0 rows and trip
G2 rather than silently overwrite.

## 6. Exact apply sequence

1. **Re-verify the pre-image digest is still `a779f700296959c8cf18e28cdcceb1b8`** (freeze is only valid
   against this state; G1 enforces it anyway).
2. Run `docs/briefs/artifacts/broll-platform-scope-correction-v1-forward.sql` — **one** `execute_sql`
   call, the whole file, so `BEGIN`/`DO`/`COMMIT` compose in one transaction.
3. Readback: both rows `= {facebook,instagram,youtube}`.
4. Live post-apply probe: `NULL` → `ok` (same clip) · `facebook`/`instagram` → `ok` · `linkedin` →
   `fail_closed`.
5. Record the result doc + register pointer; commit; push.

**STOP conditions (any one voids the remainder):** digest mismatch · row count ≠ 2 · any guard raising ·
production-signature payload differing · LinkedIn resolving anything but `fail_closed` · unexpected
files in the change set.

> ⚠ **Single-call requirement.** Steps 2 must go through **one** `execute_sql` call. Splitting the file
> across calls risks the pooled-channel transaction non-composition failure class (cc-0079 Slice-2) —
> the `DO` block's guards would still fire, but `BEGIN`/`COMMIT` would not wrap them.

## 7. Review chain

| Check | Verdict |
|---|---|
| Live read-only inspection + aborted-transaction dry run | complete, §4 |
| Rollback proven before apply | **`ROLLBACK_PROOF_PASSED`**, digest-exact, zero production effect |
| Guards are executable, not prose | verified — all six are `RAISE EXCEPTION` |
| Blast radius: every caller enumerated | §4.2 |
| `db-rls-auditor` / `branch-warden` | **orchestrator-run substitution (CCF-02 R1)** — this session is instructed not to spawn subagents; the equivalent read-only checks were run inline and are named in §4. PK may route the frozen packet to the registered agents before authorising. |
| External review round 1 | **`partial`** · medium · high · 1 pushback (tier) · escalate — `review_id 278fdc71-9f8f-4182-ad39-b0977f14c723`, pinned `81be969e…` |
| External review round 2 | see §7.1 — re-run after §4.4 was added (round 1's pin went stale) |
| **PK Gate-2 apply authorisation** | ⏸ **PENDING — this lane stops here** |

### 7.1 External review record

**Round 1** — `review_id 278fdc71-9f8f-4182-ad39-b0977f14c723`, `reviewed_input_hash`
`81be969e7a79e0c4910d94d18a9476b014cfc546063c0734edbe22e311354ebe`.
Verdict **`partial`** · risk medium · confidence high · `requires_pk_escalation: true`.

- **Verified:** that the production path's `p_platform=NULL` genuinely bypasses the scope predicate, and
  that the guards deliver fail-closed behaviour with a working rollback (rollback proof accepted).
- **No concrete defect** raised against the SQL, the guard set, the CAS pin, or the rollback.
- **One pushback — tier (T2 vs T3).** `policy_decision` → PK decision gate (§2).
- **Two unverified claims, both now closed in §4.4** with live counts: B-roll row exclusivity (the
  packet touches all 2 of 2 rows that exist, across all clients) and shared-pool unreachability (0 of 14
  shared assets are anything but `static_background`). Round 1's pin went stale when §4.4 landed, so a
  round 2 was run against the new hash per external-review rule 1/4.

**Round 2** — `review_id ebbce1f6-a2de-43a1-8817-abc5e4efee27`, `reviewed_input_hash`
`12c760c9246f4e118320351d819049977c603abd40ab0e1b559e52dfbcdfb3bf` (packet);
`7670e4ab…` / `606328c1…` (forward/rollback SQL, **byte-unchanged between rounds — no SQL was edited**).
Verdict **`partial`** · risk medium · confidence medium · `requires_pk_escalation: true`.

- **Verified:** *"No concrete defect present, previous claims closed by live inventory counts"*, and that
  the round-1→2 delta touched only evidence/disclosure — not the SQL, guards, or apply sequence.
- **Remaining pushback: the tier question, unchanged.** It is the same `policy_decision` as round 1 and
  it will not resolve by further review rounds — **only PK can settle it** (§2). CCF-02 routing sends
  `policy_decision` to the PK decision gate, which is where this packet stops regardless.
- **Residual soft assumptions noted, not actioned:** the reviewer observes that a byte-identical
  payload "does not account for unforeseen interactions". That is a fair generic caution rather than a
  named mechanism. The lane's answer is the §4.4 bound: the packet touches **all 2 of 2** B-roll rows in
  existence, consumed by **exactly 1** template, with **0** shared B-roll assets able to substitute —
  the blast radius is closed on four sides, and G4 aborts the apply if the production payload moves at
  all. **No further review round is proposed:** two rounds have produced zero concrete defects and the
  only live disagreement is a tier judgment reserved to PK.

## 8. Non-claims

- ❌ Not claimed: that explicit-platform B-roll selection now works end-to-end. It does **not** (§4.3).
- ❌ Not claimed: that this changes anything production renders today. It provably does not (§4.1).
- ❌ Not claimed: that `platform_scope` is now *enforced* in production. It is still inert at
  `p_platform=NULL`; this makes the declared value **honest**, not consulted.
- ❌ Not claimed: that the Perth row becomes usable. It stays triple-fenced, and its
  `sfto='needs_gradient_scrim'` remains an unrecognised value that would fail closed even if un-fenced
  — **deliberately not fixed here**, since PK asked for `platform_scope` and changing `sfto` touches
  eligibility.

## 9. Stop condition

**Packet frozen; apply NOT executed.** DML is a PK hard stop under the orchestration contract, and the
instruction that opened this lane was a task direction, not a Convention-2 pinned sequence approval
(no hash pin, no ordered steps, no STOP conditions). PK authorises step 2, or runs it.
