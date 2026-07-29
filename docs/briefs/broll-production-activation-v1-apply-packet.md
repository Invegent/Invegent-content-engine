# Apply Packet — B-roll Production Activation v1 (Route A)

**Lane:** B-roll Production Activation v1 · **Tier:** T3 (production-touching: changes live PP video selection)
**Gate 1:** PK-approved 2026-07-28 (Route A elected) · **Gate 2 (apply): PENDING — PK hard stop**
**Brief:** `docs/briefs/broll-production-activation-v1-gate1-brief.md`

**Frozen artifacts — REV 3** · **repo HEAD at freeze: `14453ff`** (register head v6.46)
| Artifact | Path | SHA256 |
|---|---|---|
| Forward | `_harness/cc_broll_activation_20260728/forward.sql` | `502486c668a4231d69f4d68ae0ff2406c40dcf1c940dac759e47d7452ed6b64c` |
| Rollback | `_harness/cc_broll_activation_20260728/rollback.sql` | `c5cd0afee1a0b4602503a0f40c042e7f3ec4ca0c9ff1ef85f32bd4e83b04e0dd` |
| **Combined pin** | `sha256(forward_bytes ‖ rollback_bytes)` | **`77d8f6cd889b948eeef15de00aedfdcfb7decd6601ee499f66152529343cbbcb`** |

> Rev-1 pin `5a7de37b…` and rev-2 pin `d0f5d4b9…` are **STALE** — any review pinned to either is void.

### C0c digested plaintext (recorded so the rollback literals are verifiable by inspection)

The md5 `962043fb55bdd2a1a9e5d0a8718118e0` is taken over exactly these three lines. Compare them
against the rollback's restore literals directly — this closes AHA-02-3 by inspection, and the
rollback's own step-(2a) closes it **mechanically** by recomputing this digest after restoring.

```
8b611275-…-f05a329dfd5d|dd5fd75e-…-7ce0936076b2|video_short_stat|stat-reveal-9x16-broll-v1|candidate|Slice B contained proof — B-roll video Background variant; intent-only selection (never default-wins)|PK|<null>
b61e2f15-…-8629ae11313a|a3d8472d-…-b6a920be4014|video_short_stat|stat-reveal-9x16-video-v2|strong_candidate|D6 Lane 2 — direct-bind variant promoted to spine mapping (baked-bg, logo-only slot)|PK|2026-07-19 01:08:00.431900
dee47d2e-…-3165f8c22bd2|4cd2c9e2-…-44e05d790fb9|video_short_stat|stat-reveal-9x16-governed-av-v2|strong_candidate|Route A governed-AV template; governed keys (Logo/VoiceAudio/MusicBed + 4 text) bind — proven at 2A.|PK|2026-07-26 07:35:25.966026
```
*(ids elided mid-string for readability only; the digest is computed over the full untruncated values.
Full template_ids, in row order: `dd5fd75e-982d-4c3d-89cd-7ce0936076b2` ·
`a3d8472d-9438-4312-9f11-b6a920be4014` · `4cd2c9e2-bb55-4a71-9f13-cb2e1c41e958`.)*

**Type precondition for C0c's invariance — VERIFIED.** `reviewed_at` is `timestamp with time zone`
(live `information_schema.columns`). `AT TIME ZONE 'UTC'` therefore yields a plain `timestamp`, and
`to_char` with an explicit format is DateStyle-independent — so no session GUC is consulted.
**Proven empirically**, not just argued: db-rls-auditor recomputed the digest under five session
timezones (UTC · Asia/Kolkata · Australia/Perth · America/Los_Angeles · Pacific/Kiritimati) and got
`962043fb…` in all five, while a naive `reviewed_at::text` control produced five *different* digests —
confirming both that the harness genuinely varied the timezone and that the rev-2 defect was real.

**Independent PRE-APPLY proof that the rollback literals reproduce the frozen state.** Beyond the
rollback's own step-(2a), db-rls-auditor parsed the three restore blocks **byte-exact out of
`rollback.sql`** (regex over file bytes, no hand transcription), normalised the timestamps through the
same rule, rebuilt the digest plaintext and hashed it → `962043fb55bdd2a1a9e5d0a8718118e0`. So the
"do the literals actually equal the frozen state?" link is closed **before** any apply, by a second
party, rather than only detectively at rollback time.

## Review chain

**Round 1 (rev-1 artifact, pin `5a7de37b…`) — both auditors returned `concerns`; NOT advanced.**
- **db-rls-auditor → `concerns`/high.** Verified every id, the pre-image string (ordering included), the
  live baseline winner, the CHECK constraint, READ-COMMITTED concurrency semantics, and — answering the
  explicit question — confirmed `STABLE`+`SECURITY DEFINER` does **not** cause a stale-snapshot read, so
  C3a/b/c are genuine post-state assertions. Findings: MF-1 caller split (**folded in** as a disclosure),
  SF-1 `updated_at` over-claim (**fixed**), SF-2 rollback guard asymmetry (**fixed in SQL**), SF-3
  accepted as named residual.
- **apply-harness-auditor (SHADOW) → `CONCERNS`, 7 findings.** AHA-01-1/2 (baseline blind to
  `fit_reason`/`reviewed_at`/`reviewed_by` drift → **fixed: new control C0c**), AHA-01-3 (same guard
  asymmetry → **fixed**), AHA-01-4 (single-call atomicity was operator discipline only → **fixed: new
  control C0d/C3z txid guard**), AHA-01-5/6/7 (**fixed in packet**: human-gate labelling, seed-independence
  declared, STOP order corrected).

Both auditors independently flagged the guard asymmetry and the baseline-coverage gap. All three SQL
fixes were re-proven by dry-run v2 (below).

**Round 2 (rev-2, pin `d0f5d4b9…`) — both `concerns`, NO `must_fix`; PK elected to fix the residuals.**
- **db-rls-auditor → `concerns`/high, 0 must_fix.** Independently recomputed the digest, the hash pin,
  the baseline winner and every rollback literal against live raw values (all exact). Confirmed the txid
  guard is sound and cannot pass vacuously (its negative path returns `''`, which the SQL handles), and
  that explicit `BEGIN…COMMIT` genuinely composes through the `execute_sql` channel. Residuals: SF-4,
  SF-5, SF-6, SF-7.
- **apply-harness-auditor (SHADOW) → `CONCERNS`, 4 findings**; all six round-1 findings confirmed
  resolved *in SQL*. New: AHA-02-1 (guard detective-not-preventive), **AHA-02-2 (medium — attested scope
  keyed on `format_key`, mutated scope keyed on `id`, never joined; explicitly NOT fail-closed)**,
  AHA-02-3 (digest constant and rollback literals independently frozen, link unproven), AHA-02-4 (TZ).
- **`branch-warden` → `stop`.** HEAD had drifted `93795cc`→`b2c23de` mid-session (another lane). Lane
  halted and surfaced to PK per Convention 2. **HEAD has since moved again to `14453ff`** (v6.46); rev 3
  is re-pinned to that. Note: local `main` is **ahead 1** with another lane's unpushed commit —
  **not ours to push** (CCF-02 R4).

**Round 3 fixes (rev-3, this pin `77d8f6cd…`):**
- **AHA-02-2 → FIXED.** All six UPDATEs now carry `format_key='video_short_stat'`, **and** C0c's digest
  payload now includes `id`/`format_key`/`variant_key`. Attested scope and mutated scope are provably
  the same rows.
- **AHA-02-4 / SF-5 → FIXED.** C0c uses `to_char(reviewed_at AT TIME ZONE 'UTC', …)`, making the digest
  state-dependent only. A non-UTC session can no longer cause a spurious ABORT.
- **AHA-02-1 / SF-4 → FIXED.** The guard is asserted at **(2z) before any mutation** (preventive), and
  the rollback now carries its **own** txid guard, likewise preventive.
- **AHA-02-3 / SF-7 → FIXED MECHANICALLY, better than suggested.** Rather than only recording the
  plaintext (done above), the rollback's new **step (2a) recomputes the C0c digest after restoring and
  aborts unless it equals `962043fb…`** — so "the literals reproduce the frozen state" is now proven by
  execution, not asserted. Verified live in dry-run v3 (`R2a … OK`).
- **SF-6 → FIXED.** The rollback's pre-image check now pins the row identity set, not just fit_status.

**Round 3 (rev-3, pin `77d8f6cd…`) — CHAIN COMPLETE.**
- **`branch-warden` → `safe`.** Earlier `stop` CLEARED. HEAD stable at `14453ff`, origin parity 0/0, both
  artifacts byte-verified against the pin, no tracked modifications, and **no object collision** with the
  discarded S3 resolver lane (`grep resolve_slot_assets` = 0 in our forward). The other lane's commit was
  pushed **by its own owner**, so the CCF-02 R4 exposure is moot. Verdict split: **safe to APPLY**;
  **not safe to COMMIT unattended** — re-verify HEAD and re-claim the register version at commit time
  (v6.47 is next-free *as of that read only*; two renumbers already happened this session family).
- **db-rls-auditor → `concerns`, 2 must_fix — BOTH PACKET-TEXT ONLY, both fixed; SQL untouched, pin
  intact.** It independently recomputed the digest, proved TZ-invariance under five timezones against a
  control, reproduced the rollback literals from file bytes pre-apply, and confirmed ids/pre-image/
  baseline/hashes all still match live. Also corrected a **wrong rationale in the Gate-1 brief** (see below).
- **apply-harness-auditor (SHADOW) → `CONCERNS`, 4** — all packet-text or handed off. AHA-03-2 (C0c's
  invariance depends on `reviewed_at` being `timestamptz`) was a genuine precondition to check: **verified
  `timestamp with time zone`**, so the fix holds. AHA-03-4 (R2a is detective at rollback time) is closed
  out-of-band by the independent pre-apply literal reproduction recorded above.
- **external `ask_chatgpt_review` → `partial` / medium / medium → PK escalation**, review_id
  `5f301cd9-651b-4b83-a7c6-32294233841d`, pinned to `77d8f6cd…`. **No concrete defect.** The bridge
  auto-escalates every T3 DML by design. Its two pushback points, answered:
  1. *"Assumes demotion is necessary without exploring alternatives."* Alternatives **were** explored and
     put to PK at Gate 1 — Route B (intent-driven caller change) was the named alternative and PK elected
     Route A. Mechanically there is no third option: within the strong bucket, order is template
     `created_at ASC`, and `dd5fd75e` is the newest, so no promotion alone can outrank an older
     `strong_candidate`. The only other lever would be falsifying `created_at`, which is worse.
     Triage class: **`policy_decision`** — already decided by PK, not a defect to fix.
  2. *"One-clip pool needs verification."* **Verified live this session:** PP holds exactly two
     `broll_background` assets — `2d62b04e` (active/approved, the eligible one) and `42211c0f` (fenced,
     `is_active=false`). Pool of one confirmed, and disclosed as an accepted consequence.

**Gate-1 brief correction (db-rls-auditor R3-SF-1):** the brief said other clients are unaffected because
they "have no video governance row" — **false**; `ndis-yarns` has one and selects successfully today. The
real, stronger reason is that `dd5fd75e` has **no assignment** for them and assignment gating sits
upstream of `fit_status`. Brief corrected; conclusion unchanged.

## What changes

**DML only. Three rows. No DDL, no function change, no EF deploy, no grant change.**

`UPDATE c.creative_template_variant_candidate` × 3 (`fit_status`, `fit_reason`, `reviewed_by/at`):

| Row id | template | variant_key | fit_status |
|---|---|---|---|
| `8b611275…` | `dd5fd75e` (B-roll) | `stat-reveal-9x16-broll-v1` | `candidate` → **`strong_candidate`** |
| `b61e2f15…` | `a3d8472d` (incumbent) | `stat-reveal-9x16-video-v2` | `strong_candidate` → **`candidate`** |
| `dee47d2e…` | `4cd2c9e2` (incumbent) | `stat-reveal-9x16-governed-av-v2` | `strong_candidate` → **`candidate`** |

**Effect:** PP's live `video_short_stat` production call
(`video-worker/index.ts:1231` — `p_platform=null, p_variant_intent=null`) selects the B-roll template
instead of the incumbent, resolving a governed B-roll **video** clip into its video Background.

**Why all three rows:** `select_template` ranks `v_b_strong` before `v_b_other`, each in
`t.created_at ASC` order. `dd5fd75e` is the newest template, so promoting it alone leaves it third and
the incumbent still wins. The demotions are what make the promotion effective. Demoted rows remain
**fully selectable** (`candidate` is a passing status) — they become the fallback, not disabled.

## Declared control / assertion register

Every control below is an **executable `RAISE`** inside the single transaction — none is comment-only.
Any RAISE aborts the whole transaction; nothing commits.

| # | Control | Enforcement | Failure mode |
|---|---|---|---|
| C0a | Exactly 3 `video_short_stat` candidate rows exist | `RAISE` on `count(*) <> 3` | ABORT — a 4th candidate appeared post-freeze |
| C0b | Pre-image `template_id=fit_status` string matches exactly | `RAISE` on string mismatch | ABORT — state drifted since freeze |
| **C0c** | **TZ-invariant digest** over row IDENTITY (`id`, `template_id`, `format_key`, `variant_key`) **and** every column the rollback restores == `962043fb…` | `RAISE` on md5 mismatch | ABORT — drift since freeze; rollback literals no longer the true pre-image. Pinning `id` binds this baseline to exactly the rows the UPDATEs mutate |
| **C0d/C2z/C3z** | **Atomicity guard** — `set_config('ice.apply_txid', …, is_local=true)` armed at (0), asserted **before any mutation** at (2z), re-asserted at (3z) | `RAISE` if absent or `<>` current txid | ABORT — file split across calls. **(2z) is PREVENTIVE**: a split aborts with nothing written |
| **R2a** *(rollback)* | Restore is **digest-exact** — recomputes C0c after restoring and requires `962043fb…` | `RAISE` on mismatch | ABORT — the rollback literals did not reproduce the original state |
| C1 | Baseline: incumbent `a3d8472d` wins **before** the change | `RAISE` on winner ≠ `a3d8472d` | ABORT — ranking model invalid |
| C2a/b/c | Each UPDATE affects **exactly 1** row | `GET DIAGNOSTICS` + `RAISE` on `<> 1` | ABORT — over/under-match |
| C3a | Post-change `select_template` returns `status='ok'` | `RAISE` on non-ok | ABORT — slot would fail closed |
| C3b | Post-change winner **is** `dd5fd75e` | `RAISE` on winner mismatch | ABORT — repoint ineffective |
| C3c | Winner resolves a **video** `Background.source` (`/Broll/` + `.mp4`) | `RAISE` on pattern miss | ABORT — guards the v1.3-class "video field filled with a still" |

**Seed-independence (declared assumption, verified):** the verify calls pass a text label as `p_seed`
where production passes `draft.post_draft_id`. Template ranking is `intent bucket → fit_status bucket →
t.created_at ASC` and does **not** consult the seed, so the winner assertions are seed-invariant. The
seed does affect asset pick, but the eligible pool is one clip, and C3c asserts shape not identity.

**Guarded UPDATE predicates:** each UPDATE also matches on `id` **and** `template_id` **and**
`variant_key` **and** the expected current `fit_status`, so a concurrent change makes it match 0 rows
and trip C2 rather than silently overwrite.

**Apply channel (named):** ONE `mcp supabase execute_sql` call carrying the whole file, so
`BEGIN…COMMIT` composes on a single pooled connection. Splitting across calls is forbidden.

## Rollback — proven, symmetric

`rollback.sql` restores the exact pre-apply values of `fit_status`, `fit_reason`, `reviewed_by` and
`reviewed_at` on all 3 rows (including `reviewed_at=NULL` on the B-roll row). It carries the **same**
control shape: a pre-image check that expects the **post-apply** state (so it refuses to run against a
state it did not create), per-row `ROW_COUNT=1` assertions **each guarded on the expected current
`fit_status`** (symmetric with forward — a concurrent change collapses the match to 0 rows and aborts
rather than silently overwriting), and a post-verify that the incumbent wins again.

**Two deliberate non-restorations, named rather than implied:**
- `updated_at` is set to `now()`, not restored. Nothing reads `vc.updated_at` (ranking uses
  `t.created_at` on the template table) and no trigger maintains it — inert by inspection.
- The rollback restores from **hardcoded literals** frozen at authoring time, not from a durable
  captured pre-image. Control **C0c** is what makes that safe: the apply aborts if any restored column
  drifted since freeze, so the literals cannot go stale behind our back.

## Dry-run — EXECUTED 2026-07-28, ALL CHECKS PASSED, ROLLED BACK

Run on prod inside a transaction that **cannot commit by construction** (terminates in a deliberate
`RAISE EXCEPTION`). Two rounds — v2 re-proves the rev-2 controls:

**v1 (rev-1 artifact):**
```
B1 baseline=incumbent_a3d8472d OK;
B2 three_updates_1row_each OK;
C1 winner=broll_dd5fd75e bg=broll_pp_au_suburb_aerial.mp4 OK;
C2 fallback=incumbent_a3d8472d (slot survives) OK;
R1 rollback_restores_incumbent OK
```

**v2 (rev-2 artifact — the three new/changed controls):**
```
0c full_preimage_digest OK;
0d txid_guard_arms OK;
C1 baseline OK;
C2 three_updates_guarded_1row OK;
3z atomicity_guard_holds OK;
C3 broll_wins_video_bg OK;
R1 symmetric_rollback_guards_match_1row + restores_incumbent OK
```

**v3 (rev-3 artifact — THE CURRENT PIN `77d8f6cd…`):**
```
0c identity_digest_invariant OK;
0d guard_armed OK;
C1 baseline OK;
2z preventive_guard_before_mutation OK;
C2 three_format_key_guarded_updates OK;
C3 broll_wins OK;
R0b postapply_identity_signature OK;
R2a rollback_DIGEST_EXACT_to_frozen_preimage OK;
R2b incumbent_restored OK
```
`R2a` is the load-bearing new result: after the rollback restores, the C0c digest recomputes to
`962043fb…` — the frozen pre-image — proving the restore is byte-faithful on every attested column.

**Post-check confirms prod untouched:** fit_status trio unchanged, clip `2d62b04e` still
`is_active=true`, live winner still `video_stat_reveal_9x16_v2`.

**Success criterion 2 is PROVEN, not assumed:** with the clip forced ineligible, `select_template`
returned `status='ok'` and fell through to incumbent `a3d8472d`. The slot degrades to a
still-background video; it does not die.

## Live pre-check STOPs at the gate (named)

**Machine-enforced** (executable `RAISE` in the transaction, listed in executable order):

1. Candidate row count ≠ 3 → **STOP** (C0a).
2. `fit_status` pre-image ≠ frozen expectation → **STOP** (C0b).
3. Identity + restored-column digest ≠ `962043fb…` → **STOP** (C0c).
4. Baseline winner ≠ `a3d8472d` → **STOP** (C1).
5. Transaction split across calls → **STOP** (C0d armed at (0) · **C2z asserted BEFORE mutation** · C3z after).

**Human / orchestrator gates** (NOT SQL-enforceable — each has a named owner):

6. Any review verdict non-clean → **STOP** — owner: orchestrator (review-verdict gate).
7. Artifact hash ≠ the pin below → **STOP**, review is stale — owner: orchestrator, via re-computed
   `sha256` (hash-checkpoint helper).
8. Unexpected origin movement → **STOP** — owner: `branch-warden`.

## Known consequences PK is accepting

- **100% of PP governed `video_short_stat` output on the PRODUCTION path switches to B-roll footage.**
  This is the intent.
- **⚠ Selection now DIVERGES by caller — disclosed by db-rls-auditor (MF-1), corrected from an earlier
  unqualified "100%" claim.** Template `dd5fd75e` has **zero** `platform_suitability` rows, so
  `select_template` rejects it (`no_suitability_row_for_platform`) for **any caller passing a non-null
  `p_platform`**, which then falls through to the demoted incumbents and picks `a3d8472d`. Net effect:
  - production video (`p_platform=null`, index.ts:1231) → **B-roll** ✅ intended;
  - any platform-declaring caller (dashboard previews, smoke paths, future callers) → **incumbent**.

  This is a real behavioural split, not a defect in the SQL. It is arguably desirable as a soft
  containment, but PK should accept it knowingly. Converging the two would mean adding suitability rows
  for `dd5fd75e` — deliberately **out of scope** here; flagged as the lane's first carry.
- **The eligible B-roll pool is exactly ONE clip** (`2d62b04e`, `broll_pp_au_suburb_aerial.mp4`), so a
  seeded pick is deterministic and **every PP governed video gets the identical footage** until
  inventory breadth lands. Content-quality consequence, not a defect.
- Geo: the clip is AU-national; `label_constraint`/`geo_scope` are not machine-enforced. City-specific
  copy over generic national footage remains an open C1-class carry.
- Audio remains **declared, never measured** by the worker — the post-apply render proof must measure it.

## Out of scope / forbidden in this apply

No resolver or `select_template` change · no fence weakening · no promotion of the fenced Perth clip
`42211c0f` (and note its `safe_for_text_overlay='needs_gradient_scrim'` is unrecognised — it would fail
closed if promoted) · no publisher path · no commit/push without PK instruction ·
**do not run `_harness/cc_broll_resolver_20260728/s3_rollback.sql`** (discarded S3 lane; would revert live resolver v1.4).
