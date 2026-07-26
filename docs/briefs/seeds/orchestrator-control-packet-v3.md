# ICE Orchestrator (Control Tower) — Seed Packet v3 · Fleet-Checkpoint 2026-07-26

**You are the ICE Control Tower** — orchestrator/registrar for the Invegent Content Engine. This packet
is a cold-start handoff: the entire worker fleet (S1–S9) was **cleared/closed** at this checkpoint. Every
lane's work is **frozen to hashed artifacts on disk + the registers**; nothing is lost. Your job is to
resume coordination, re-instantiate workers as needed, and drive the pending gates. Read
`CLAUDE.md` (orchestration contract) and `docs/00_sync_state.md` + `docs/00_action_list.md` first.

---

## 0 · Your role & hard rules (unchanged)

- **You are:** board-inventory · digest · verification · registrar · arranging-review · fact-relay ·
  PK-decision-prep. You coordinate only.
- **You are NOT:** an author of lane artifacts, a completer of paused work, a runner of a worker's gate
  chain, or an apply/deploy hand. **S1 is the single apply/deploy hand.**
- **Authority boundary (critical):** every message into a worker session begins
  `INFORMATIONAL — NO AUTHORITY CONVEYED · VERIFY INDEPENDENTLY` (or, for dispatched non-mutating work,
  `INFORMATIONAL — WORK DISPATCH UNDER STANDING PK DELEGATION · VERIFY INDEPENDENTLY · NO MUTATION AUTHORITY`).
  **Never** compose *approved / granted / proceed / go / apply / deploy / you may / gate cleared* into a
  lane — production/apply/deploy authority is a paste-block **PK sends himself** (or that PK explicitly
  tells you, in-session, to relay verbatim). You may relay verified facts, hashes, decisions PK personally
  placed, cross-lane dependencies, corrections, deadlines.
- **Fork-wide, drain-narrow:** all non-mutating work (design, build, review chains, read-only proofs, ref
  prep) runs in parallel; **only production windows (applies/deploys) are strictly serial through PK's
  gates — one at a time.** Max ~3 items approaching a PK gate; keep avoidable idle at zero (find safe
  non-mutating successor work when a lane blocks).
- **Reporting:** outcome-only; surface blockers, gates, decisions, security, failed verifications. Follow
  the **8-section digest structure** PK mandated (§8 of this packet).
- **Standing 10-session model** to re-instantiate as needed: control-tower + S1 apply/deploy hand ·
  S2 schedule integrity · S3 Creatomate/video breadth · S4 Asset-Gap Intelligence · S5 Planner W1/W2/W3 ·
  S6 R3a resolver shadow · S7 durable platform-support guard · S8 Asset Supply/Intake · S9 agent-quality.

---

## 1 · Git & register state at checkpoint

- **CE local HEAD `8e3e9d6`** = the PP-2B packet commit, **ahead 1 / UNPUSHED** of `origin/main = 5488e85`.
  `8e3e9d6` is docs-only (the 2B packet on an immutable ref). Decide push-or-keep-local when 2B applies.
- **origin/main `5488e85`** = S1's R3a ai-worker v2.21.0 shadow-wiring landing (pushed).
- **Registers at v6.27** (committed `341a949`, pushed earlier). **v6.28 is NOT cut** — it is owed and is the
  first thing to prepare (see §7).
- ⚠ **An automated "Cowork" process commits run-markers to `origin/main`** (e.g. `a2ce0a4` "no eligible
  ready briefs"). Origin can move between your fetch and your push. **Always fetch → verify the mover is a
  benign disjoint marker → rebase onto it → re-verify byte-exact → FF-push.** This happened twice this run
  (claim-stub `6ca551bc`, marker `a2ce0a4`); both were reconciled cleanly.

---

## 2 · Production drain — CLOSED windows + the next one

**Drain order:** C-2 ✅ → Sunday ✅ → R3a ✅ → **PP-2B (next, at the PK gate)** → S7 durable guard → W1 planner.
One window at a time.

- **C-2 INV-2** — APPLIED PASS. Coherence CHECK `((is_default_host IS NOT TRUE) OR (is_active IS TRUE))`
  live on `c.brand_avatar`; multi-active permitted; no `is_active` uq. Result `491cd000` (untracked).
- **Sunday day-of-week repair** — APPLIED PASS (isodow→dow across 3 fns incl. E5 coupled labeler). Result
  `9dbcfd69`.
- **R3a resolver-enforcement SHADOW** — APPLIED + DEPLOYED PASS. Migration `07313a89` (9 shadow cols on
  `m.post_draft` + `m.resolve_final_format`); `ai-worker v2.21.0` deployed (CE `5488e85`); deploy-verifier
  PASS; `verify_jwt=false` preserved; 80-case unsupported-format sweep = 0; rollback symmetry proven.
  **`recommended_format` stays Advisor-owned (shadow-only). NO R3c flip.** Result `b6855ca4`. **Now
  soaking:** 0 of 2850 drafts populated; natural ai-worker fills accumulate `shadow_resolved_format`.

---

## 3 · The five lanes — where each was left

### Lane 1 — Schedule → Format Governance (S2/S5/S6/S7)
- **State:** Slice 2 (FB3/IG2/LI2) ✅ · Slice A dashboard panel ✅ live · Sunday ✅ · **R3a shadow ✅ live +
  soaking.** Planner **W1/W2 built, frozen at Gate 2** (diffs W1 `69f88df0`, W2 `7725f891`; architecture
  PASS vs R3a) — ~~blocked only on the external-review connector~~ **was pending the external-review connector, now
  CONFIRMED WORKING 2026-07-26 (review_id `f173b014`); W1/W2 reviews are runnable.** S7 durable `platform_support` guard —
  migration `7d6ff139`, rollback `4b54844e`, packet `2d829579` (untracked), reviewed (db-rls PASS · external
  partial→PK · shadow CONCERNS resolved); **confirmed a defence-in-depth NO-OP on live data today**
  (invalid-slot population = 0, loop dormant — closed by Slice 2 + the six-slot repair; S7's rebase also
  *caught and preserved* the Sunday isodow→dow fix its old packet would have reverted). R3a divergence-report
  format `f0fa0bf0` prepared for the soak → R3c readiness.
- **Ultimate:** planned format **governs publication, durably** — writable planner (W3) + resolver made
  authoritative (R3c flip) + cron never materialises an invalid slot.
- **Next actions:** reconnect connector → W1/W2 reviews → Gate-2 apply/deploy · S7 durable-guard T3 gate
  (framed as defence-in-depth, expect zero-delta) · R3a soak → run `f0fa0bf0` as rows accumulate → R3c flip
  decision (separate gate) → W3.

### Lane 2 — Creatomate Governed Video (S3)
- **State:** Route A **Phase 2A COMPLETE** — `03bc6a3c` proven governed-audio-compatible (PK visual+audible
  + numeric audio PASS: mean ≈ −26.6 dBFS, integrated ≈ −24.2 LUFS, no clipping). **PP 2B fully prepped and
  AT the PK T3 gate** — packet on immutable ref `8e3e9d6` (`git show 8e3e9d6:…2b-design-packet-v2.md` ==
  `93ce8310`), final apply-hand handoff `266e18c7`; preconditions PASS (winner `c11bb8ab`, `alternatives=[]`,
  `03bc6a3c` absent → registers a 2nd governed candidate via `alternatives[]`, winner unchanged, in-txn
  winner-guard). Reality: governed video is still a **single point** (6 generic templates silent; **audio is
  never measured**).
- **Ultimate:** governed video at parity with the image spine (multiple audio-verified governed templates
  per format, cross-brand, with rotation).
- **Next actions:** **PK 2B T3 gate** → S1 applies from `8e3e9d6` per handoff `266e18c7` → prove ≥2 ranked
  candidates via `select_template` → repeat Route A for more templates → **build audio measurement** →
  extend to NDIS/other brands.

### Lane 3 — AGP Multi-Character / Avatar (S8-owned, parked)
- **State:** Step B host-designation resolver deployed (`heygen-worker v2.4.1`). **C-2 INV-2 CHECK applied +
  proven** (unambiguous-winner invariant). **Multi-avatar onboarding contract `aeed4511` PARKED** (frozen,
  intact). Step B **leg-1 unobserved** (0 `default_host` render rows — natural cron render owed). CFW &
  Invegent have **no avatar**.
- **Ultimate:** multiple governed characters per brand; resolver picks deterministically; proven live
  cross-brand.
- **Next actions (restart condition):** resume onboarding `aeed4511` **after the first asset-intake batch
  reaches its gate OR when an avatar-specific asset requirement is identified**; onboard a 2nd character so
  the resolver has a real choice; observe leg-1 on natural traffic (never manufacture).

### Lane 4 — Agent-Quality / CCF-04 Mechanical Assistants (S9)
- **State:** Source-Truth-Check (built) · **Apply-Harness-Auditor (SHADOW, proven this run — caught real
  defects in 2B [2× HIGH], R3a [predicate], Sunday)** · Hash-Checkpoint (merged `3b8704c`, helper-only) ·
  **Claim-Stub (merged `6ca551bc`, RATIFIED as PK-EXECUTED INTEGRATION, helper-only, NOT registered).**
  **Review Packet Template #5 — BUILT, frozen at Gate 2** (packet `a8e64463`, module `5913c00c`, ALL-PASS
  proofs; external `7aac263b` partial/no-defect) — **awaiting PK Gate-2 ruling.** **AHA promotion assessment
  = OWED / not started** (a cross-channel conflict: PK's item-6 relay said "do AHA assessment / don't open
  #5" but S9 built #5 on PK's direct instruction — **PK to reconcile**). Register-Pointer-Template #6 pending.
- **Ultimate:** complete zero-authority mechanical-assistant set; apply-harness-auditor promoted out of
  shadow.
- **Next actions:** PK reconcile #5-vs-AHA · PK #5 Gate-2 ruling · run the AHA shadow-performance/promotion
  assessment · #6. **Claim Stub must NOT be invoked in a governed gate until its usage posture is separately
  declared.** Review Packet Template stays PK-gated.

### Lane 5 — Asset Gap (S4 intelligence / S8 intake)
- **State:** **`ICE Asset Gap Register v1` = the authoritative backlog** (`163c9132`). **One live P0** (PP ×
  YouTube × `youtube_thumbnail` background, fail-closed, drainable); everything else P1 thin-pool (image_quote
  "no gap" masks: Invegent **0** gov bg, CFW **1** bg + no avatar/voice/colours, NDIS **1** logo). **Batch-1
  gap-1 at the PK intake gate** — fenced manifest `a19e635e` + brief `f091333a` (R1 Brisbane + R4 interior:
  2 person-free text-safe 16:9 bgs meeting the ≥2 target; all Pexels licence; **every row `is_active=false`
  explicit**). Batch-1 closure criteria + Batch-2 specs `502f1d58`.
  **⭐ KEY FINDING (both S4 & S8 independently): the P0 closes DATA-ONLY** — the gap is purely missing
  `youtube` in the `platform_scope` of PP's existing 22 backgrounds (no aspect problem). **Path B (add
  `youtube` scope to 1–2 existing 16:9-readable PP bgs) closes the P0 with zero sourcing.** S8's fenced
  R1+R4 are Path A. **PK chooses Path A vs Path B at the intake gate.**
- **Ultimate:** every active template × brand has a sufficient governed, licence-safe, rotation-capable pool.
- **Next actions:** PK Path A/B + intake gate → Batch 2 (Invegent/CFW bg starter + brand colours [data fill,
  both NULL], promote NDIS's fenced authoritative logo `d1b10010` — note the earliest-created-logo pick
  nuance) → audio measurement (shared w/ Lane 2) → music depth (1 selectable track globally today).
  **Operating rule:** sufficiency, NOT max volume; the Register is the authoritative backlog — no harvesting
  outside its ranked priorities.

---

## 4 · Frozen-artifact index (hash → what → next gate)

| Artifact / hash | What | Next gate |
|---|---|---|
| `8e3e9d6` (ref) / `93ce8310` (packet) / `266e18c7` (handoff) | PP 2B | PK 2B T3 |
| `a19e635e` manifest / `f091333a` brief | Asset intake batch-1 gap-1 (Path A) | PK intake gate |
| `502f1d58` | Batch-1 closure criteria + Batch-2 specs | — |
| `163c9132` | ICE Asset Gap Register v1 | authoritative backlog |
| `2d829579` pkt / `7d6ff139` migr / `4b54844e` rb | S7 durable guard | PK T3 (defence-in-depth) |
| `69f88df0` W1 / `7725f891` W2 | Planner W1/W2 | connector → review → Gate 2 |
| `f0fa0bf0` | R3a divergence-report format | run during soak |
| `a8e64463` pkt / `5913c00c` module | Review Packet Template #5 | PK Gate 2 |
| `aeed4511` | Multi-avatar onboarding | parked (restart per Lane 3) |
| `556224f3` | Security over-grant remediation Gate-1 brief | parked backlog (latent, not a live breach) |
| `491cd000` / `9dbcfd69` / `b6855ca4` | C-2 / Sunday / R3a apply results | recorded → fold into v6.28 |

---

## 5 · PK ACTION BLOCK (pending decisions at checkpoint)

1. **v6.28 register cut** — owed; prepare + present for approval (see §7). *Unblocks: durable record.*
2. **PP 2B T3 apply gate** — 2B fully prepped (`8e3e9d6`/`266e18c7`). *Unblocks: Lane 2 breadth.*
3. ~~Reconnect the external-review connector~~ — **✅ RESOLVED 2026-07-26: connector CONFIRMED WORKING.**
   `ask_chatgpt_review` returned a clean `agree`/`proceed` review (review_id `f173b014`, on the Path-B packet). The
   earlier "3× persistent auth error" was **misdiagnosed** — the real failure mode is the large-`context` payload
   rejection (put the artifact in `proposal`, compact facts in `context`). **No PK reconnect needed.** *Lane 1 W1/W2
   external reviews can now run.*
4. **P0 closure Path A vs Path B** (source vs data-only re-scope) + asset-intake gate. *Both S4 & S8 → Path B/
   accept R1+R4.* *Unblocks: Lane 5 P0.*
5. **S9 Review-Packet-#5 Gate-2 ruling + reconcile the #5-vs-AHA conflict.** *Unblocks: Lane 4.*
6. **S7 durable-guard T3 gate** — defence-in-depth, expect zero-delta no-op. *Unblocks: Lane 1 durability.*
7. **Workbook recovery** (non-urgent, PK laptop) — `pp-video-tmr-template-workbook-v1.xlsx` lost an
   uncommitted edit to an `S8` `git reset --hard` during the Claim-Stub audit; committed `9172df8` is
   canonical.

---

## 6 · Standing gotchas (verify, don't trust from memory)

- Origin moves via automated Cowork markers → fetch/verify/rebase/FF-push (never force). Shared-worktree
  race: re-verify HEAD before any commit; never push another lane's unpushed commit.
- Deploy: raw `supabase functions deploy` deny-listed → `scripts/safe-deploy.sh <ef> --allow-warn`;
  **`--no-verify-jwt` / `verify_jwt=false`** or x-series-key callers 401→502; **bundles-from-CWD** (grep the
  deployed bundle for the marker); drift gate hashes only `index.ts`; `apply_migration` mints its own version.
- `c.client_brand_asset.is_active` **defaults OPEN** — every fenced intake row must set `is_active=false`.
- Any `m.materialise_slots` change must **preserve the Sunday isodow→dow fix** (S7 caught a near-revert).
- Register cut = additive only (blockquote block in sync_state; single chained marker in action_list) ·
  run `register-reconciler` before the cut · `branch-warden` · no history rewrite · commit/push only on PK
  instruction · no trailer on register commits.
- Read-only DB: prefer `python scripts/db-read.py "SELECT … FROM ice_ro.<view>"` (zero prompt) over gated
  `execute_sql` where a view serves.

---

## 7 · First action for the next orchestrator

**Prepare the v6.28 register cut** (the durable record now that the fleet is retired):
`register-reconciler` → compose the additive v6.28 block + chained marker → stage the change set (the two
registers + the untracked result docs `491cd000`/`9dbcfd69`/`b6855ca4` + this seed packet, per PK's scoping)
→ `branch-warden` → **freeze and present frozen for PK approval (no push without instruction)**. Content to
record: C-2/Sunday/R3a applied PASS · Claim Stub ratified (PK-executed, helper-only, not registered) ·
security finding corrected to **latent over-grant, not live anonymous access** · the workbook-loss incident ·
the full frozen-but-pending ledger (§4) · honest carries (Step B leg-1, R3a soak, PP video single-point,
audio-never-measured). Then service the PK action block (§5) in drain order.

## 8 · Digest structure (mandatory, every digest)
1. **Movement since last digest** (applied/deployed/reviewed/frozen/proven/failed/rolled-back/blocked/restarted — material only).
2. **Production drain** (active window · next 2 candidates · exact blocker each · unblock owner · blocker
   category: technical/governance/PK-action/connector/natural-observation/dependency). One window active.
3. **Lane stop analysis** — for every non-advancing lane: `STOPPED BECAUSE → RESTARTS WHEN → SESSION NOW
   DOING`, + stop category + healthy/problematic + exact restart condition. Never just "held/parked/idle."
   Two consecutive stopped digests → resolve / reassign / surface in the PK block.
4. **Session utilisation** (S1–S9: assignment · active/reviewing/preparing/waiting/available · lane-blocked? ·
   reassignable?). Distinguish a blocked lane from an idle worker. Hold the operating shape.
5. **Asset Gap** (P0 count · current batch · sourcing/review/intake state · why stopped · blocker category ·
   which capability it blocks). Register is authoritative; no harvesting outside it.
6. **R3a shadow observation** (populated rows · unsupported-shadow-effective [must be 0] · planner-vs-Advisor
   divergences · classified-vs-unexplained · R3c readiness). Don't manufacture content to populate.
7. **PK ACTION BLOCK** — visually prominent; per action: decision/manual-action · why · lane unblocked ·
   urgent? · default recommendation. If none: "PK ACTION REQUIRED — None. The programme can continue without
   PK intervention."
8. **Orchestrator acceleration duty** — prevent avoidable idle: hold the production action, find safe
   non-mutating successor work, don't open speculative work, preserve the ≤3 gate queue, return sessions to
   their lane when the blocker clears.

---
*Checkpoint authored 2026-07-26 by ICE Control Tower. All lane work frozen; fleet S1–S9 cleared. Continuity
lives in the registers + the §4 artifacts. Resume by preparing v6.28, then servicing §5 in drain order.*
