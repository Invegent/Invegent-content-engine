# WS-5 Constraints Shape + Write RPCs + Intake Validator — Design Lane Result (v1)

**Lane:** ws5-constraints-shape-and-kinetic-registration, Phase 1 (seed packet relayed 2026-08-01)
**Tier/class:** T2 · SIDE_PROVING (design/docs only this lane; the packet's migration is NOT applied)
**Status:** `DESIGN COMPLETE — STOPPED AT THE PK APPLY GATE` (as the seed packet requires)
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
| External review (`ask_chatgpt_review`) | **PENDING — bridge unavailable in this session** | The MCP review bridge is not connected here (ToolSearch: no match). Per the orchestration contract this is treated as a STOP-shaped gap, not waived: external review MUST be run against the FINAL packet sha256 in a bridge-connected session BEFORE any PK apply. `reviewed_input_hash` must equal the final hash above. |
| PK apply gate | **STOPPED — awaiting PK** | Nothing applied, deployed, migrated, or committed to main by this lane. |

## Named handoffs / carries

- **External review carry:** run `ask_chatgpt_review` on the final packet (hash above) from a
  bridge-connected session; triage classes per contract; any non-clean → fix → re-review.
- **PK decisions at the gate:** packet §8 Q1–Q5 (suffix vocabulary freeze · platform vocabulary ·
  suitability status ceiling · Phase-2 audit row · 2–3-template population order).
- **Phase 2 remains BLOCKED** on PK returning `{template_name, provider_template_id}` from the
  Creatomate transposition sitting (packet §9 records the capture-lane sequence, including the
  `scope='generic'` footgun check now mechanized as intake-validator C1).
- **WS-4 coordination:** the intake validator's declared-only mode can machine-check the kinetic
  declared contract (authored from WS-4 §6/§7/§9) before PK opens the Creatomate editor — a
  Phase-2 pre-step, no DB write required.
