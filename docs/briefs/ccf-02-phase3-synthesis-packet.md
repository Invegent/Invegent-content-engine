# CCF-02 Phase 2→3 Synthesis Packet (v1)

**Created:** 2026-07-05 Sydney · **Lane:** T1 docs/governance · **Label:** SAFETY_GATE (escalated to external review + PK ratification — governance change)
**Scope:** docs/convention only — no code, no hooks, no DB, no deploy, no enforcement flips, no new agents. **Stops at the PK ratification gate;** nothing here is in force until PK ratifies.
**Inputs:** Phase 2 Observation Notes #1 (`ccf-02-phase2-observation-note-1-cc0027.md`) and #2 (`ccf-02-phase2-observation-note-2-provider-recon.md`) · PHASE2-FRICTION-001..004 · the live adoption record of the Phase 1 contract across register v4.96→v5.04 · Phase 0 measurements (v4.88 onward).

---

## §1 What Phase 2 proved (evidence summary)

- **The contract is in real use, not on paper:** every lane v4.97→v5.04 declared tier + label at Gate 1 (T1 through T3 all exercised, incl. a T3 production promotion under a Convention-2 sequence with zero STOPs); the claim protocol was used on every register cut and scored a **live cross-session win** (concurrent v4.98 claim, zero collision — the exact failure mode O-6 recorded now demonstrably prevented); the findings contract reached three charters via lazy adoption at promotions.
- **The packet-shape fix (O-1) held:** zero connector-bounce failures since ratification — every external review reached a verdict on the first transport attempt (content revisions occurred twice — `3792e950`, `4701ef73` — and both strengthened packets; that is the review system working, not friction).
- **Two-stage agent design proved its value live:** stage-2 catches (Villanova; half-res branding) and the day-hero product chain (harvest → PK visual → v5.01 fenced intake → v5.02 T3 promotion → witnessed selection `wit-1`) — the assembly line delivered production value with every gate PK-held.
- **Measured cost stayed low:** review lanes ran ~6–35 min wall-clock; external review was never the bottleneck.
- **On closing the phase plan with 2 formal notes:** the plan asked for 2–3 observation lanes; Phase 2 holds 2 formal notes **plus** live contract adoption across 8 recorded lanes spanning every tier and label — a broader evidence base than 3 notes alone. Closure ends the *phase structure*, not observation: the contract stays living, friction keeps being recorded in lane results, and PK can reopen a phase at any time.

## §2 Contract refinements for ratification (the four friction rules)

**R1 (closes PHASE2-FRICTION-001) — orchestrator reads vs db-rls-auditor:** direct orchestrator read-only checks are acceptable for (a) pre/post invariant fingerprints in lanes where the DB is NOT the subject, and (b) read-only evidence gathering for triage. `db-rls-auditor` is REQUIRED when the DB is the lane's subject (schema/RLS/grants/exposure/DML review) and in every T3 chain. Substitutions must be named in the lane record either way.

**R2 (closes PHASE2-FRICTION-002) — secret use vs secret change:** secret **posture changes** (create/rotate/grant/expose) are T3, unchanged. Read-only secret **use** (e.g. GET-only provider calls with an API key) is **T2 + mandatory secret-handling rider**: Gate 1 names which secret, how it is conveyed (file handoff, never in transcript), and declares use-vs-change. Doubt → T3, unchanged.

> **⚠ R2 is the one deliberate de-escalation in this packet — PK's headline ratification
> decision (external review `0fe63030` flagged it; delta analysis follows).**
> **What R2 relaxes:** the plain `secrets → T3` trigger no longer forces the FULL T3 chain
> (builder isolation, rollback-proven-before-apply, explicit PK live gate) onto lanes that only
> *read with* a key — a chain that half-misfits them because nothing is built and nothing is
> rollback-able (Observation Note #2's finding: the provider-recon lane *could not* satisfy T3
> as written).
> **What R2 keeps, in full:** T2's chain is not light — scope-relevant auditors + branch-warden
> + external review pinned to hash remain mandatory; the NEW rider adds a protection that T3
> never had (explicit Gate-1 secret declaration: which key, conveyance, never-in-transcript,
> use-vs-change); posture changes stay T3; mixed scope → highest tier; doubt → T3; the §1.2
> escalation triggers (credentials-adjacent → one tier higher) still apply on evidence.
> **Net safety argument:** the incident class ICE has actually suffered (v4.95 — provider
> account/key entanglement) involved posture/state CHANGE, which stays T3. If PK prefers
> conservatism over right-sizing, striking R2 leaves read-only-secret lanes at T3-as-written
> with the known chain misfit — a coherent alternative; the packet is ratifiable with R2
> struck and R1/R3/R4 intact.

**R3 (closes PHASE2-FRICTION-003) — mid-flight lanes at ratification:** a lane already past Gate 1 when a contract change ratifies picks up the new requirements **at its next gate** (not retroactively); its record notes the straddle. Lanes gated entirely before ratification are judged by the contract of their day.

**R4 (closes PHASE2-FRICTION-004) — harness namespaces + local-ahead coordination:** each session/run writes under its own sub-root (`_harness/<package>/<run-slug>/`); shared package-root files are append-only with session attribution noted in the lane record. Unpushed local-ahead commits are treated as a Convention-2 STOP-#2-class signal: the next committing session verifies the foreign commit is benign (read-only inspection) and must not push another session's commit without explicit PK authorization.

## §3 Phase 3 automation decisions (automate ONLY the proven-mechanical; zero authority transfer)

**AUTOMATE (helper scripts/templates — each carries zero decision authority, all outputs still flow through existing gates):**
1. **Hash-checkpoint helper** — compute/compare `reviewed_input_hash` at the named checkpoints (cut/review/apply/merge/push); evidence: hand-run ≥5×/lane all week, caught real drift twice. Output: match/mismatch line for the lane record; a mismatch is still the human-handled STOP.
2. **Claim-stub helper** — fetch + head read + stub scan + propose next version + write the `CLAIMED` line; evidence: protocol exercised ~8 lanes, one live collision prevented. Numbering only; never commits.
3. **Review-packet template** — canonical proposal-heavy/minimal-context/≤4.5KB scaffold; evidence: zero transport bounces since the shape was fixed. Templating only; content stays authored.
4. **Register-pointer template** — Convention-1 pointer scaffold from lane metadata. Formatting only.

**KEEP MANUAL (judgment-bearing — re-examine only after more Phase-3-era evidence):** tier/label assignment at Gate 1 (PK) · licence/source judgment and all image verdicts (PK + scoped agents under their fences) · PK-package assembly · external-review invocation content · triage-class routing of non-clean verdicts · register-entry substance.

**NEVER AUTOMATE (re-affirmed from the CCF-02 charter; unchanged):** approval or promotion of anything · merge/deploy/publish/migrate execution · guard enforcement flips (each remains its own PK gate on its own log evidence — CCF-01 carry, explicitly OUTSIDE this packet) · agent promotion · PARKED-lane admission.

**Per-helper authority proof (external-review request `0fe63030`):**

| Helper | Reads | Writes | Cannot, by construction | Failure mode |
|---|---|---|---|---|
| Hash-checkpoint | named artifact files | one match/mismatch line into the lane record | approve, suppress, or proceed past a mismatch — the STOP remains a human act; it has no git/DB/review surface | wrong hash reported → caught at the next human checkpoint (hashes are re-verified at review and apply anyway) |
| Claim-stub | registers (read), results stubs (read) | the one `CLAIMED` line in a NEW stub file | commit, push, renumber another session's claim, or edit any existing file | wrong number proposed → collision caught by the protocol's own commit-time re-scan |
| Review-packet template | lane metadata | a scaffold file the author fills | invoke the review bridge, alter content, or shrink the review focus — content authorship stays human | bad scaffold → visibly malformed packet, caught at authoring |
| Register-pointer template | lane metadata | a pointer-entry draft | touch the registers themselves — the surgical edit + verify-or-abort remains the docs-lane act | bad draft → caught at the docs-lane readback diff |

None of the four can advance a gate, mask a STOP, mutate shared state, or act without a human invoking them and consuming their output through the existing gates.

**Build posture:** the four helpers are FUTURE T2 candidate lanes (isolated code, hermetic tests, external review, PK gates) — **this packet authorizes none of them**; each is built only when its friction cost next recurs, smallest-first.

## §4 Proposed CLAUDE.md amendment (exact; applied ONLY on ratification, as its own T1 lane)

Append to the `## CCF-02 orchestration contract` section:

```markdown
- **Phase 2/3 refinements (ratified <DATE>):** R1 orchestrator read-only checks OK for
  invariant fingerprints + triage evidence where the DB is not the lane's subject; db-rls-auditor
  required when it is, and in every T3 chain — substitutions named in the lane record. R2 secret
  POSTURE change = T3; read-only secret USE = T2 + mandatory Gate-1 secret-handling rider (which
  secret · conveyance · never-in-transcript · use-vs-change). R3 lanes mid-flight at a contract
  ratification pick up new requirements at their next gate. R4 one harness sub-root per
  session/run; shared-root files append-only with attribution; never push another session's
  unpushed commit without explicit PK authorization.
- **Phase 3 posture:** automation is limited to four zero-authority helpers (hash checkpoints ·
  claim stubs · review-packet template · register-pointer template), each its own future
  PK-gated T2 lane; judgment stays manual; approval/promotion/deploy/enforcement are never
  automated. CCF-02's phase plan is complete — the contract is living and amends only by PK
  ratification.
```

## §5 What this packet does NOT do
No helper is built or scheduled · no agent/charter/tool change · no tier-table change beyond R1–R4 · no enforcement flip · Conventions 1–3 and the 7 STOPs untouched · TMR/D6 untouched · no register-history rewrite.

## §6 Adoption + rollback
On ratification: apply §4 (T1 docs lane) → R1–R4 govern immediately → helpers built lazily as separate gated lanes → CCF-02 phase plan closes (registers record closure; the contract lives on). **Rollback:** revert the §4 append; R1–R4 lapse to Phase-1 text — docs-only, trivially reversible.
