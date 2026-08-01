# WS-5 Constraints Shape + Write RPCs + Intake Validator — Design Lane Result (v1)

**Lane:** ws5-constraints-shape-and-kinetic-registration, Phase 1 (seed packet relayed 2026-08-01)
**Tier/class:** T2 · SIDE_PROVING (design/docs only this lane at authoring time; ~~the packet's migration is NOT applied~~ — **UPDATED 2026-08-01: APPLIED AND LIVE**, see "APPLIED — live record" section below)
**Status:** ~~`DESIGN COMPLETE — STOPPED AT THE PK APPLY GATE`~~ → **`DESIGN COMPLETE — APPLIED AND LIVE (2026-08-01)`** (PK authorised + executed against frozen hash `7cc5636d…`; see the "PK apply gate" row and "APPLIED — live record" section below)
**Deliverable:** `docs/briefs/ws5-constraints-shape-and-write-rpc-design-packet-v1.md`
**Packet sha256 (pre-review, rev-0):** `013c74699a2205703aa2f841705750b2cd95bdd86fc501efb46bcb1effd3db2f`
**Packet sha256 (FINAL, rev-1):** `7cc5636dad5a518fe53597cdde9aadbf644a3077e7e4cc47899182c786c81b49`
— the hash external review and the PK gate must pin. Any further edit = new hash = stale reviews.

## What was designed (Phase 1, all three seed items)

1. **`tmr_field_constraints_v1`** — the per-field `constraints` jsonb shape for
   `c.creative_provider_template_field` (packet §2), vocabulary drawn from
   `branch-b-template-capability-contracts.md` §1/§3 and the WS-4 kinetic package §6/§7/§9 (the
   named 26-field input). Calibration triples make `to_be_calibrated` machine-checkable; numbers
   without a basis/citation cannot exist in the shape.
2. **`tmr_platform_constraints_v1`** — the platform-suitability sibling (packet §2a): aspect,
   safe zones (caption band), scene contract, duration bounds — the composition-level facts with
   no column home (kinetic's variable 20–45 s duration cannot live in `duration_seconds`).
3. **Governed write RPCs** (packet §5): 3 private fail-closed validators in schema `c` + 4
   service-role-only SECDEF writers (`record_tmr_template_field`, `set_tmr_field_constraints`,
   `record_tmr_platform_suitability`, `set_tmr_platform_constraints`) — insert-only or
   md5-CAS, no upsert, no status elevation, proof-RPC conventions throughout.
4. **P-7 first consumer** (packet §3/§5 fn 8): `public.validate_tmr_template_intake` — the
   operator template-intake validator, checks C1–C10, two modes (declared-only usable NOW on the
   kinetic contract; capture-check for Phase 2). Zero-inert-fields coverage matrix at packet §7.

## Review chain record

| Stage | Verdict | Notes |
|---|---|---|
| `apply-harness-auditor` (SHADOW — clears/blocks nothing; run via its backing helper `.claude/helpers/apply-harness-auditor.mjs` because the registered agent-type is not invocable in this session — same fallback precedent as the creative-graph-auditor A1.4 manual smoke) | CONCERNS — rev-0: 4 findings; rev-1 re-run: 5 findings, same family | **All dispositioned as mechanical false positives** by the invoker (this session, per the shadow-mode contract "audit left to the invoker"): the helper's declared-STOP scraper matched the tier labels "T2"/"T3" and the precedent references "TMR-3"/"TMR-4" in §6 prose and reported them as unenforced declared controls. The packet's only declared *executable* control is the §0 DO-block precondition, which IS present in the SQL (checked: 8 signatures probed, RAISE on any hit). No declared-control-without-enforcement exists. Check-7 (apply/rollback identity — the named watch item): 8 CREATEs ↔ 8 DROPs, 1:1. |
| `db-rls-auditor` (registered subagent, live catalog reads via db-read.py) | **concerns → all 4 should-fix APPLIED (rev-1); 0 must-fix** | Verified sound against live `mbkmaxqhsohbtwsqolns`: REVOKE/GRANT posture necessary-and-present on both schemas (live default ACLs grant EXECUTE to anon/authenticated on new `public` fns; schema `c` has anon/auth USAGE, so helper REVOKEs are load-bearing too); both UNIQUE keys the RPCs rely on confirmed in `pg_constraint`; all CHECK vocabularies confirmed (RPC sets are deliberate strict subsets); no name/signature collision (only `record_tmr_proof_event` exists); CAS/`FOR UPDATE` race-safe; regex interpolation safe behind the name gate; single-txn + DO-block precondition + 8↔8 apply/rollback identity confirmed. **Fixes applied:** (1) C1 widened to `scope <> 'generic'` — a `brand` row passed silently before; (2) declared-input type guards before every cast (no raw 22P02); (3) free-text RPC params bounded + secret-scanned; (4) migration name minted `_v2`, unused `_v1` retired. **Two residuals it could not close (no `execute_sql` in its session or this one)** → folded into packet §6 as named pre-apply STOP checks: re-verify the all-NULL `constraints` baseline; confirm the live PostgREST exposed-schema list. |
| External review (`ask_chatgpt_review`) | **CLEAN — agree · medium risk · high confidence · escalate false · zero pushback** | **Executed 2026-08-01 by the programme-planning session (bridge-holder) on PK's explicit directive** ("Fire external review now against frozen hash 7cc5636d…; no apply authority is granted"), relayed cross-session to this lane. `reviewed_input_hash` = `7cc5636dad5a518fe53597cdde9aadbf644a3077e7e4cc47899182c786c81b49` (byte-exact re-verify immediately pre-review; 78,139 bytes / 1,338 lines) — equals the FINAL rev-1 hash above, so the review is valid for exactly this packet. `review_id` = `1cbce433-fcc5-4eeb-ae41-360f4442beb5`. Under house rules this clears ONLY the external-review link of the chain. Any further packet edit = new hash = this review is stale and must re-run. |
| Packet §8 Q1–Q5 | **DECIDED — PK 2026-08-01 (direct, this session): "accept the packet's recommendations as written"** | Q1 suffix vocabulary frozen at 7 · Q2 platform vocabulary frozen at 5 · Q3 suitability-status ceiling at `needs_review` (elevation stays a separate governed act) · Q4 Phase-2 capture appends one `inventory_audit` row per batch · Q5 population order = kinetic first, then the B0/stat templates. Recorded here; the packet itself is unmodified (hash preserved). |
| Pre-apply check 1 — all-NULL constraints baseline | **CLOSED — CONFIRMED (live `execute_sql`, 2026-08-01, this session)** | `c.creative_provider_template_field`: 144 rows, 0 non-null `constraints` · `c.creative_template_platform_suitability`: 66 rows, 0 non-null. Exactly the packet's claimed baseline (suitability rows additionally confirmed all-NULL). |
| Pre-apply check 2 — live PostgREST exposed-schema list | **CLOSED — CONFIRMED empirically (REST probe, 2026-08-01)** | PGRST106 contrast probe returned the authoritative live list: `public, graphql_public, k, f, m, c, r, a, t, friction` — **schema `c` IS exposed**, as prior evidence said. Anon probe on the field table via `Accept-Profile: c` correctly bounced `42501 permission denied` (table grants hold). Consequence confirmed: the §9 function REVOKEs are load-bearing (new `c`-schema functions would otherwise be REST-callable by anon via default PUBLIC EXECUTE + anon USAGE on `c`). |
| Pre-apply advisor baseline (optional, auditor-suggested) | **CAPTURED** | `get_advisors(security)` 2026-08-01: 251 findings — 3 ERROR `security_definer_view` · 92 WARN `function_search_path_mutable` · 50 WARN `authenticated_security_definer_function_executable` · 41 WARN `anon_security_definer_function_executable` · 61 INFO `rls_enabled_no_policy` · 4 other WARN. Only "tmr" hits: two INFO deny-all-RLS notes on unrelated `c.tmr_drift_probe_run`/`c.tmr_shadow_decision`. **Post-apply expectation: ZERO new findings** — in particular none of the 8 new functions may appear under the two SECDEF-executable classes or `function_search_path_mutable`. |
| PK apply gate | **AUTHORISED & EXECUTED — 2026-08-01** | PK (direct, this session): "Apply authorised against hash 7cc5636d — execute the sequence." Pre-apply hash re-verified byte-exact = the authorised hash (STOP #1 clear); §5 SQL extracted byte-exact (48,331 B, extraction sha256 `6cbe52dc…`, 8 creates/8 revokes/8 grants confirmed). |

## APPLIED — live record (2026-08-01)

- **Channel:** ONE `apply_migration` call (the named single-call channel), name
  `tmr5_field_constraints_write_rpcs_and_intake_validator_v2`, minted version **`20260801043347`**
  (ledger row confirmed). The §0 fail-closed DO-block precondition passed (no pre-existing
  signature). In-repo record of the applied statement:
  `supabase/migrations/20260801043347_tmr5_field_constraints_write_rpcs_and_intake_validator_v2.sql`
  (ledger⇄git drift closed same-day). Honest delta note: the applied string carried §5's
  executable statements byte-faithfully; §5's trailing reference-only ROLLBACK **comment** block
  was not part of the applied string (non-executable; preserved in the repo migration file).
- **Post-apply verification (all PASS, recomputed from ground truth):**
  1. 8/8 functions live; 5 public entry points `prosecdef=true` + `proconfig={search_path=""}`;
     3 `c`-schema helpers `search_path=""` pinned; **all 8 ACLs exactly
     `{postgres=X, service_role=X}`** — anon/authenticated absent.
  2. **Zero rows written:** field 144/0 and suitability 66/0 unchanged; smoke throwaway rows 0.
  3. **Advisors 251 → 251:** zero new findings, zero resolved, zero naming any of the 8 new
     functions (exactly the declared acceptance).
- **Acceptance smoke — `WS5_SMOKE_PASS`, 6 checks, self-aborting transaction (nothing persisted):**
  (a) good `HookHeadline` insert → `ok` · (b) duplicate → `field_already_exists` · (c) unknown
  top-level key → `constraints_invalid:constraints_unknown_key` · (c2) element/key prefix
  mismatch → `constraints_invalid:modification_key_invalid` (discovered live in smoke run 1,
  where a script bug passed HookHeadline-keyed constraints under CtaHeadline and the RPC
  correctly fail-closed — an unplanned live proof of the prefix guard) · (d) TBC triple carrying
  a number → `limit_tbc_must_have_null_value` · (e) `validate_tmr_template_intake` declared-only
  mode → `verdict=pass`, `calibration_required=[{HookHeadline, max_lines}]`.
- **Rollback posture:** the 8 exact-signature `DROP FUNCTION`s (packet §5 tail) remain valid —
  no data was written, so rollback stays a pure function drop.

**Lane state: WS-5 Phase 1 COMPLETE AND LIVE.** The constraints shapes, governed write RPCs, and
the P-7 intake-validation consumer exist in production, dark (no caller until the Phase-2 capture
lane). |

## PHASE 2 — kinetic template registry capture (EXECUTED 2026-08-01)

**Unblock:** PK delivered `{generic_kinetic_text_9x16_v1, 0bd871ae-79c1-431a-a7bd-9f631a6cf75a}`
directly (with layer-list screenshots — all 26 element names verified exact; deviations: none).
**Declared contract:** `docs/briefs/artifacts/ws4-kinetic-declared-contract-v1.json`
(sha256 `eecab2e731216ff2a692f3ac2570e82bbad1b0c7d084175f2b5bc5eaf120020f`; 26 elements; zero
invented numbers — every limit `declared_from_source` ai-worker/index.ts:728 or
`to_be_calibrated`). **Declared-only intake validation: `pass`, 0 hard** (10 `calibration_required`
items = the probe queue; 6 advisory shape-collapse warnings only).
**External review (capture plan): CLEAN** — agree · medium · high · zero pushback,
`review_id f7c1a748-8780-4dab-8e53-d9811e9a47c2`, pinned to the artifact hash.
**PK capture authorisation:** direct, this session ("capture … and go").

**Executed** as ONE self-aborting transaction (any failure → full rollback): template row
(`scope='generic'`) → 26 × `record_tmr_template_field` (each fail-closed shape-validated) →
1 × `record_tmr_platform_suitability` (youtube/default, `candidate`) → 1 append-only audit row
(Q4) → **in-transaction gate `validate_tmr_template_intake(tid, contract)` = `pass`/0-hard**.

**Post-capture ground truth:** registry id **`9ad024cc-3eda-488e-b346-bc661ec70a6a`** ·
`scope='generic'` · `status='inventory_captured'` · `inventory_hash` = artifact hash · 26/26
field rows all with constraints · 1 suitability + 1 audit row · table totals 144→170 fields /
66→67 suitability, **non-null `constraints` 0→26 (exactly the kinetic rows — the NULL era ended
here, P-7 consumer already consuming)**. Dark by construction: no client assignment, no variant
candidate, no proof events — invisible to `select_template` until graduation.

**Post-capture db-rls-auditor pass on the written rows: CLEAN (`pass`, high confidence, 0
must-fix / 0 should-fix)** — template row exact-match on every attribute incl. `scope='generic'`;
26/26 element names + constraints shape verified; modification-key prefixes checked across ALL 26
rows (zero violations); zero invented numeric limits (spot-checked citations); blast radius exact
(170/26/67, all 144 pre-existing rows still NULL); dark-capture confirmed (0 assignment, 0
variant rows); **advisors still exactly the 251 baseline — zero new findings.**
**Orchestrator hash-checkpoint (auditor-named step): CLOSED** — artifact bytes recomputed
2026-08-01: sha256 = `eecab2e7…` = the stored `inventory_hash`, byte-exact (artifact committed at
`b72efc8`).
**Carries from the auditor (recorded, not blockers):** (1) the five TMR `c.*` tables' deny-all
RLS (enabled, zero policies) is a PRE-EXISTING posture inside the 251 baseline — if these tables
are ever served to dashboard callers, that needs explicit policies or an RPC (its own lane);
(2) `evidence_reference` semantics for `declared_from_source` limits: the `source` citation IS
the terminal reference by design (packet §2 — `evidence_reference` is mandatory only for
`probe_calibrated`); recorded here as the authoritative answer.
**Audit row review fields (`reviewed_by`/`decision`) intentionally NULL** — the capture is dark
and awaits the graduation-lane gates.

**Next (WS-4 loop):** probe renders against the 10-item calibration queue — first probe =
top-level `duration` overridability (WS-4 pkg §15 Q4, highest-leverage) — then PK visual verdict,
then 13-rung graduation.

## PROBE 1 — duration overridability (EXECUTED 2026-08-01, PK-authorised) — **Q4 = YES**

Two paid renders on the live template (key conveyance per cc-0033 precedent; key found ROTATED —
new pin `bcde13d1` validated read-only before spend; value never in transcript):

| Probe | Result | ffprobe duration | Wall-clock | Render id |
|---|---|---|---|---|
| A_control (no override, `HookHeadline.text` modified) | succeeded | **35.00 s** (= saved) | 30.9 s | `982e8abb-1e48-4240-94b9-39ef2fd57526` |
| B_bare_duration_mod (`"duration": 27` inside `modifications`) | succeeded | **27.00 s** | 23.4 s | `fc7e2707-7507-4d82-bb29-e690112b0ae4` |

Findings: (1) **the §5 timing mechanism is viable as designed** — bare `duration` modification
key overrides the saved 35 s timeline exactly; fallback probe C not needed; (2) **suffixed
modification-key form confirmed on the video family** (cc-0049's resolution now proven beyond
image cards); (3) reliability: both renders far under the 2-min ceiling (§9a); (4) bonus rung-1:
provider existence confirmed by DIRECT `GET /v1/templates` read (id + exact name). mp4 sha256s:
`58abac67…` (A) / `bc8c6e9d…` (B); local evidence `_harness/ws5_kinetic_probe1_duration/`
(untracked by repo convention — this section is the canonical record).
**Proof event recorded** via `record_tmr_proof_event`: `smoke_render`/`passed`, evidence =
render id `fc7e2707…`, `proof_event_id 25c20718-5028-45fa-a826-0a7854ddca87`.
**Remaining probe queue:** collapse-mechanism leak test (§15 Q2) · shape-element timing overrides ·
`source:""` silence on this composition · the 10 text-calibration items.

## Named handoffs / carries

- ~~External review carry~~ **CLOSED 2026-08-01** — executed by the bridge-holding session on PK
  directive, clean, pinned to the final hash (row above).
- **Register pointer:** submitted version-LESS to the single register-cut owner
  (`docs-hygiene-register-reconciliation-t1`) per PK governance item 7 — this lane allocates no
  register version itself.
- **PK decisions at the gate:** packet §8 Q1–Q5 (suffix vocabulary freeze · platform vocabulary ·
  suitability status ceiling · Phase-2 audit row · 2–3-template population order).
- **Phase 2 remains BLOCKED** on PK returning `{template_name, provider_template_id}` from the
  Creatomate transposition sitting (packet §9 records the capture-lane sequence, including the
  `scope='generic'` footgun check now mechanized as intake-validator C1).
- **WS-4 coordination:** the intake validator's declared-only mode can machine-check the kinetic
  declared contract (authored from WS-4 §6/§7/§9) before PK opens the Creatomate editor — a
  Phase-2 pre-step, no DB write required.
