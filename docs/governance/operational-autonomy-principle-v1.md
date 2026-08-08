# ICE Operational Autonomy Principle (OAP v1)

> **Status: DRAFT — PENDING PK RATIFICATION.** Authored 2026-08-08 (during the mutation
> watch, docs-only — no production mutation). On ratification this becomes standing
> architecture doctrine inherited by all subsequent capability briefs. It amends no
> existing gate, grants no authority, and changes no live behaviour.

---

## 1. The principle

ICE is intended to operate continuously (24×7) with minimum operator intervention.

1. Production capabilities must expose enough **authoritative state** for ICE to
   independently determine outcome, failure, and (eventually) recovery.
2. Automated actors remain **zero-authority by default**.
3. Recovery authority may only be introduced through **explicitly ratified, bounded
   recovery playbooks** (§5). Authority belongs to the ratified playbook, never to the
   intelligence operating it.
4. **Fail-closed remains the default** wherever no applicable recovery authority exists —
   indefinitely.
5. ICE should progressively reduce operator **investigation** and **repair** effort while
   preserving operator authority over **policy, creative, and business decisions**.

**The operative rule:** *nothing important ships blind.* NOT: "nothing ships until it is
self-healing" — that rule is explicitly rejected. A capability with production=YES,
observable=YES, failure-classified=YES, automated-recovery=NO is **fully mature at ship
time**. Recovery is a later upgrade to the same capability, never a shipping prerequisite.

## 2. The four layers of a production capability

Every important capability is designed across four layers. Layers 1–3 are expected at
ship; layer 4 is a design question only.

1. **Outcome capability** — the feature achieves something useful. Feature velocity is
   preserved; this doctrine adds design questions, not new gates.
2. **Truth capability** — ICE can answer: Was it invoked? What did it select? Did it
   succeed? What was rendered/published/generated? If not, why? Is the reported state
   **authoritative or inferred**? Can assurance verify it independently?
3. **Failure capability** — failures surface as **named classes** (from the shared
   registry, §4), not an undifferentiated "failed". This is what gives the Assurance
   Routine something to observe and count.
4. **Recovery readiness** — at design time, ask: *if this failure class becomes common,
   is there a safe bounded recovery action?* If yes, capture it as a **recovery
   candidate** in the brief. Authority stays OFF until a playbook is separately ratified.

**Scope:** applies to all NEW important capabilities, and to EXISTING capabilities
whenever they are opened for other work — the touching brief inherits the Operational
Contract for the parts it touches. The truth layer accretes through ordinary work; no
dedicated instrumentation programme is opened.

## 3. The Operational Contract (standard brief section)

Every important capability brief carries this short section:

```
## Operational Contract
- Outcome:            What is supposed to happen?
- Truth:              What authoritative evidence proves it happened?
                      (name each signal authoritative vs inferred)
- Failure:            Which failure classes (registry §4) can occur? Any new ones?
- Containment:        What happens when it cannot complete safely?
- Recovery candidate: Is there a mechanically safe bounded recovery that might later
                      deserve a playbook? (capture only — grants nothing)
- Authority:          None unless separately ratified.
```

This is a design aid, not a governance gate: `brief-author` includes it; Gate 1 review
reads it; an incomplete contract is a Gate-1 conversation, not an automatic block.

## 4. Failure-class registry (shared vocabulary)

One registry file — `docs/governance/failure-classes-v1.md` (created empty on
ratification, seeded lazily) — holds the canonical failure-class names. A brief either
reuses an existing class or registers a new one; workers never invent private names for
the same condition. Rationale: "PK handled this exact failure N times" is an aggregation
claim, and aggregation requires one vocabulary across workers (same logic as the
canonical task-ID ledger).

## 5. Recovery playbooks (RP-NNN) — reserved shape, none ratified

Stage-4 authority arrives only as individually ratified playbooks, numbered `RP-001…`,
each its own Gate-1/T-tier lane. Constitutional basis: Convention 2 (conditional sequence
approvals) generalized from one-off artifact to recurring failure class — the sole new
decision per playbook is *"may this approved sequence re-fire on its trigger without a
fresh gate."* Anatomy (all fields mandatory):

- **Failure class** — exact registry class + trigger condition.
- **Verified-trigger rule** — the trigger signal MUST be authoritative (layer-2 truth,
  post truth-layer repair). A playbook may never key off a signal known to be blind or
  inferred.
- **Permitted actions** — enumerated, bounded (e.g. one retry, same draft/template/
  approved assets).
- **Prohibited changes** — enumerated (no promotion, approval, schedule, or posture
  change unless explicitly listed).
- **Success evidence** — independent proof, assurance-verifiable.
- **Failure condition** — on failure: STOP + escalate; never retry-loop past the bound.
- **Authority** — explicitly granted by PK ratification; supervised runs first;
  autonomous execution only after the playbook is PROVEN.
- **Rollback / containment** — defined before first run.

Anything outside the contract escalates. A tripped STOP voids the remainder (Convention-2
semantics).

## 6. Measurement

Operator cost is tracked in three buckets, per failure class where possible:

- **Investigation minutes** — ICE couldn't tell PK reality → driven toward zero by the
  truth layer + Assurance Routine.
- **Repair minutes** — reality known, PK restored it → driven toward zero by playbooks.
- **Decision minutes** — legitimate authority boundary → NOT targeted; this is where
  PK's attention has value.

Scaling test: production volume doubles while investigation+repair minutes stay flat or
fall ⇒ ICE is becoming leverage. The two long-run maturity curves: *how much of ICE
operates correctly without PK establishing reality* and *how much returns itself to
outcome without PK repairing it*.

## 7. Sequencing (ratified path — no autonomy programme)

1. **Now → 2026-08-11:** finish the watch cleanly; ratify this doctrine (docs-only).
2. **2026-08-12 onward:** normal capability building continues under this doctrine;
   AR v1 (first fire 08-12 08:00 Sydney) accumulates system-side evidence; PK keeps a
   one-line **intervention log** (date · bucket · ~minutes · failure class · note) as the
   operator-side half of the dataset.
3. **After sufficient evidence (~Sep 2026):** rank recurring investigation/repair
   classes; the most frequent mechanical class becomes **RP-001**.
4. **Then:** accumulate bounded recovery authority one proven playbook at a time.
   "Self-healing ICE" is only ever the emergent surface of many small governed
   authorities with known blast radii — never a general remediation engine.

## 8. The loop this connects

Dashboard capability visibility · asset-gap analysis · Assurance Routine · publish
reconciliation · capability registry · worker guards · recovery playbooks are components
of one loop:

> desired outcome → capability → execution → authoritative evidence → assurance →
> classified exception → governed recovery **or** PK decision → outcome resumes.

## 9. Non-goals (explicit)

- No "Self-Healing ICE" programme or lane is opened by this doctrine.
- No existing gate, review chain, or agent charter is weakened or altered.
- No automated actor gains any authority from ratification of this document.
- Self-healing is never a shipping prerequisite for any feature.
