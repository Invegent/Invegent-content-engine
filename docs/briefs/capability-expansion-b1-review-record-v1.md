# S6 · B1 packet — review record v1

**Packet:** `docs/briefs/capability-expansion-b1-implementation-packet-v1.md`
**Current frozen sha256 (rev-2, reviewed_input_hash):** `e1052fc1921df90667a722bf6ee10b6722fb73da81c0b02fd29c31799fec10fc`
**Recorded:** 2026-07-31 · **Status: NOTHING APPLIED — next gate is a FRESH PK apply gate (the 2026-07-31 gate's STOP tripped; its authorisation is void).**

---

## REV-2 record (current — supersedes §§1–2 below, which are VOID with rev-1 hash `b67928a4…`)

**Why rev-1 died at its apply gate (STOP tripped, per Convention 2 the sequence voided):** the
PK-required fresh `db-rls-auditor` pass returned **block** on two grounds. (a) Structural: no live DB path
reaches subagents in this session (Supabase MCP tools not attached to subagent harnesses; no
`ice_readonly` DSN), so the agent fail-closed rather than fabricate — live checks were re-run by the
orchestrator as the named CCF-02 R1 substitution, and the structural gap is surfaced to PK below.
(b) **Concrete defect (real, would have aborted the apply):** the rev-1 §7 INSERT omitted `template_id`
(`uuid NOT NULL`, no default, no trigger — live-confirmed via `information_schema`); W1 would have raised
23502. Fail-closed, non-corrupting, but unapplyable. The auditor's repo-static posture checks were all
clean (deny-all RLS · anon/authenticated revoked · service-role-only schema `c` · CHECK vocabulary match ·
no triggers · no upsert).

**Rev-2 changes:** `template_id` added (market-insight `0e006c5c…` ×2, quote `1cfe0f9c…`); `platform='facebook'`
+ `evidence_kind='production_publish'` added mirroring live PP row `5a1b4304`; guard **G3b** added
(machine-verified client attribution of the three cited publishes); rollback unchanged (identical row set).

- **Shadow `apply-harness-auditor` (rev-2):** **PASS, zero findings** — all ten checks; executable order
  G1→G2→G3→G3b→W1..W3→G4 matches the declared register; apply/rollback identity byte-compared.
- **External review (rev-2):** review_id `73c3e482-05eb-4c6e-a58a-35522c610909` · plan_review ·
  **agree / medium / high / no escalation / no pushback** · reviewed_input_hash `e1052fc1…` (this rev-2).
- **Fresh pre-image reads (2026-07-31, orchestrator, read-only):** G1=3 · G2=0 · G3=3 ·
  rollback-predicate precount=0 · proof events on the two templates=6 · assignment fingerprint unchanged.
- **S5 reconciliation (PK pre-apply requirement):** fresh live read of PP×facebook
  `c.client_publish_profile` → `paused_until=NULL · paused_reason=NULL · publish_enabled=true`, exactly
  matching S5's authoritative CAS clear (S5 commit `eb52723`). The earlier `2026-08-03T12:00Z` observation
  is confirmed stale. **No S6 write to `client_publish_profile`.**
- **Origin movement at gate time:** `4fbe10d→aa1b2fe` = youtube-publisher claim-rpc fix only (another
  lane's work; zero file overlap with S6). Verified benign/unrelated.

**Structural blocker surfaced to PK:** a DB-capable `db-rls-auditor` **subagent** pass is not obtainable in
this session type (subagents get no MCP tools; `db-read.py` has no DSN provisioned). PK options at the
fresh gate: provision `ICE_READONLY_DSN` for the wrapper (covers catalog reads; `m.*`/`c.*` data reads
still need `execute_sql`) · run the auditor from a session where MCP reaches subagents · or explicitly
accept the orchestrator's read-only substitution (queries in-transcript) as satisfying the pre-apply
requirement for this packet.

**Next gate:** FRESH PK APPLY GATE on rev-2 hash `e1052fc1…` — STOPs: hash mismatch · G1/G2/G3/G3b abort ·
non-clean review · unexpected origin movement · invalidated rollback.

---

## VOID — rev-1 record (hash `b67928a4…`; kept for the audit trail, no authority)

> Note: packet §10 step 1 says the shadow-audit result is "recorded below the freeze line"; it is recorded
> HERE instead so the frozen artifact stays byte-stable under the hash above. Any change to the packet
> voids this record and both reviews (re-freeze + re-review required).

## 1. apply-harness-auditor (registered, SHADOW MODE — clears no gate)

Verdict **PASS / normalized clean, zero findings** — all ten mechanical checks passed, including check 7
(apply/rollback identity: assignment-id triple, `recorded_by` string, and occurred_at values byte-compared
across §1, the INSERTs, and the rollback predicate; over/under-match fails closed). Auditor's residual
(correct): `recorded_by` uniqueness and all live-state claims are live-DB facts outside a static audit —
covered by G2 fail-closed at apply plus the required post-apply `db-rls-auditor` pass.

## 2. External review (`ask_chatgpt_review`)

- **review_id:** `8de43386-8ab3-40b4-b547-cb85808db2a7` · **action_type:** plan_review
- **verdict:** agree · **risk_level:** medium · **confidence:** high · **escalation:** none · pushback: none
- **reviewed_input_hash:** `b67928a4d922dc998e536df9c6dc71bfdb5a8951544d9553d6de22a7b643a3eb` (this packet, frozen)
- Triage class: none required (clean verdict).

## 3. Named substitution (CCF-02 R1)

The registered `db-rls-auditor` had no live DB path this session (no `ice_readonly` DSN; Supabase MCP
toolset not attached to subagents — its run fail-closed to `block` with repo-static findings only, which
were incorporated: internal-id vs provider-id join trap · selector STABLE/write-free · S5 disjointness
minus the `save_publish_schedule` residual, since closed by a live `pg_proc.prosrc` read). All live reads
in packet §2/§3/§5 were executed by the orchestrator via read-only `execute_sql`. **A fresh
`db-rls-auditor` pass in a DB-capable session is required at/after the apply gate** (packet §10.4).

## 4. Next explicit gate

**PK APPLY GATE (hard stop):** PK runs or Convention-2-authorises the packet §7 apply — one `execute_sql`
call, single DO block. STOPs: packet-hash ≠ `b67928a4…` · G1/G2/G3 abort · any non-clean review ·
unexpected origin movement · invalidated rollback. Then post-apply verification, result doc, one register
pointer, and the matrix-staleness handoff to `register-reconciler`.
