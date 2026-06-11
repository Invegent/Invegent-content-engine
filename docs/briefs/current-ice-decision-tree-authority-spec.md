# Design Brief — Current ICE Authority Document Specification

**Date:** 2026-06-11 Sydney
**Role:** CCH (design brief only — read-only synthesis)
**Status:** SPECIFICATION — a design brief for a not-yet-built document. This brief does **not** create the authority document; it defines what that document must be. The authority document itself (the "T1 doc") is a separate, gated build.
**Walls honoured:** docs-only · 0 production mutation · 0 DB write · 0 D-01 · 0 deploy · 0 provider call · 0 cron change. No `00_` files, docs index, code, or config touched.

**Target document this brief governs:** `docs/architecture/current-ice-decision-tree.md` (the `docs/architecture/` directory does not yet exist and must be created when the doc is built). This is the single T1 "authoritative current-state" doc proposed in the knowledge-capture & authority-promotion audit (§9, rule 1).

**Source evidence (read for this brief):**
- `docs/runtime/sessions/2026-06-11-content-decision-trace-audit.md` (`6fd5f4d`) — what ICE currently does, post-level, GREEN-traced.
- `docs/runtime/sessions/2026-06-11-slot-level-decision-tree-decomposition.md` (`b74c8e50`) — the same decision tree proven at slot level.
- `docs/runtime/sessions/2026-06-11-knowledge-capture-authority-promotion-audit.md` (`e39fa3a`) — the authority gap this doc closes (§1, §4, §8, §9, §10).
- `docs/00_docs_index.md` (current) — the tier/freshness vocabulary and the "trust the DB" escape valve to remove.
- `docs/03_blueprint.md` (current, 🟢-labelled) — the stale doc this T1 supersedes; the negative example throughout.

---

## 0 — Why this document must exist (problem statement)

The authority audit's verdict: **ICE has a strong knowledge-CAPTURE system and no knowledge-PROMOTION system.** Discovery → Evidence works; Evidence → Decision works; **Decision → Authoritative Documentation is broken** (audit §1, §10). There is currently **no T1 doc** — nothing in the repo accurately and discoverably explains how ICE works today (audit §4, T1 = EMPTY).

The proof is `03_blueprint.md`: labelled 🟢 living in the index, it still describes the **digest-era** architecture (`digest_run` / `digest_item` / `post_seed` / `planner-hourly` / `m_phase2_*` crons) that the v3.34 trace audit proved is **not in the live chain** (`digest_item_id` NULL on all window drafts; legacy seed-and-enqueue crons disabled). It contains zero mention of `m.slot`, `materialise_slots`, `fill_pending_slots`, the format advisor, the A2 avatar override, the render layer (heygen/video/image workers), or the four current publishers; it lists 2 clients (live: 4) and EF versions years stale (ai-worker "v44/v2.0.0"; live v2.13.0). It is **living-by-label and wrong-by-content** (audit §4 key principle).

This brief specifies the document that fixes that — and, as importantly, the **rules that keep it from rotting the same way**.

---

## 1 — Purpose

A single, authoritative, continuously-true description of **how ICE actually works in production today**: the live content pipeline, the live decision tree, and **who/what owns each decision**. One reader-trustable source so that current truth no longer lives only in `00_sync_state.md` banners, CCH memory, and scattered session evidence.

It must let any qualified reader answer, without reading the database or chat history:
- What is the end-to-end path from a feed item to a published post, today?
- At each branch, **who decides** (config / deterministic SQL / AI advisor / agent / executor), and where is that decision recorded?
- What is current vs legacy vs aspirational?
- What is known-broken and where is it tracked?

Explicitly a **promotion target**, not more capture. The audit's smallest-fix conclusion (§10): build this once, then keep it alive by rule (the mandatory authority-impact line + the index T1 section). This doc is the "somewhere to point."

---

## 2 — Intended audience

In priority order:

1. **A fresh CCH instance after memory loss** — must reconstruct ICE correctly from the repo alone. Today it would reconstruct from `03_blueprint.md` and confidently operate the wrong (digest) system (audit §8 risk).
2. **A new operator / founder bus-factor backup** — current truth presently lives in "one person plus one model's memory" (audit §8, amplifying Risk 6 in `05_risks.md`).
3. **An external reviewer / auditor** — needs a trustable current-state map to assess the system without a guided tour.
4. **CCD/CCH during a build session** — to decide whether a proposed change touches the live decision tree, and therefore whether it triggers an authority-doc update.

Explicitly **NOT** the audience for: a changelog (that is `00_sync_state.md`, T2), a task list (`00_action_list.md`, T3), or historical design rationale (`03_blueprint.md` / `06_decisions.md`, T5). The doc must say so, to stop scope creep back into a changelog.

---

## 3 — Authority rules

- **Tier:** T1 — Authoritative current state. The repo's single source of truth for "how ICE works now." Capped per the audit: **≤4 T1 docs total** across the repo; this is the architecture/decision-tree T1.
- **Supersession:** This doc **supersedes the pipeline / decision sections of `03_blueprint.md`**. On build, those sections of the blueprint are demoted to 🟡 snapshot with a one-line pointer to this T1 (audit §9, rule 2). The blueprint remains valid only as T5 historical design.
- **Conflict resolution — replace the broken valve.** Today the index says "When the DB and any doc disagree, trust the DB" (`00_docs_index.md`). That escape valve **masked the gap** (audit §8, step 5) by removing the pain signal that would have forced repair. The new rule for T1:
  - When T1 and a lower-tier doc (blueprint, session evidence) disagree → **trust T1**.
  - When the **DB disagrees with T1** → this is a **stale-detection trigger** (see §8), not a silent "trust the DB." The disagreement must be logged and the T1 re-verified, not quietly worked around.
- **"Living ≠ authoritative" is retired for T1.** A freshness marker never substitutes for the `last_verified` contract in §5. A doc is authoritative because it was verified against production on a dated check, not because it carries a 🟢.

---

## 4 — Update rules

- **Trigger to update (any of):**
  - A production change that alters the live decision tree: a new EF version that changes behaviour, a new/removed decision node, a schema change in the decision path, a cron change that re-routes the pipeline.
  - A finding that contradicts a current claim in the doc.
  - The 30-day `last_verified` clock expiring (§8).
- **Promotion rule (the smallest structural fix — audit §9, rule 3):** every session-completion report MUST end with one of two lines, at the same standing as the walls confirmation:
  - `Authority impact: none`, or
  - `Authority impact: patch queued → docs/architecture/current-ice-decision-tree.md`.
  This is what repairs the Decision → Documentation break: it makes "did this change current truth?" an explicit, unskippable step.
- **No silent drift:** a change to the live tree without a corresponding `Authority impact:` line is a process breach, flagged by the Monday Cowork reconciliation (§8).
- **Size routing (audit §9, rule 7):** if the doc exceeds the ~80KB full-file re-emission limit, it is **CCD-owned for application** via the patch-spec pattern proven in v3.34 (`docs/briefs/v3.34-doc-sync-ccd-patch.md`, `b77f4f98`): CCH authors anchor-based `str_replace` specs; CCD applies locally. The doc must be authored to **stay well under 80KB** (pointer-not-duplicate discipline, §7) precisely so it normally edits as a single file.
- **One commit, dated:** every content update bumps `last_verified` and `verified_against` in the same commit.

---

## 5 — Authority contract (header / frontmatter — mandatory)

The doc MUST open with a machine-and-human-readable header carrying the verification contract:

| Field | Meaning | Rule |
|---|---|---|
| `tier` | `T1 — authoritative current state` | fixed |
| `last_verified` | date the content was last checked against production | **mandatory**; drives §8 staleness |
| `verified_by` | role/session that verified (e.g. CCH 2026-06-11) | mandatory |
| `verified_against` | the exact evidence basis: code commit SHAs (e.g. ai-worker `8204a5c7`, heygen-worker `9acb17e8`), project ref (`mbkmaxqhsohbtwsqolns`), and the source audit commits | mandatory — this is what makes a claim re-checkable |
| `supersedes` | `03_blueprint.md` pipeline/decision sections | fixed |
| `update_owner` | CCH (author/verify) · CCD (apply if >80KB) · PK (approve) | fixed (see §9) |

A doc without a current `last_verified` is, by rule, **not authoritative** until re-verified — the header is the contract, not decoration.

---

## 6 — Structure & required sections

The doc must contain these sections, in this order. (Content shown as *what each must capture*, sourced from the audits — this brief specifies the shape, it does not write the doc.)

1. **Authority header** — the §5 frontmatter contract.
2. **Executive "what ICE is today"** — one tight paragraph: a slot-driven, advisor-refined pipeline; the format advisor is the live decision-maker; digest path is legacy/disabled (trace audit §1).
3. **Current production pipeline (the live chain)** — the real end-to-end path, explicitly flagging the legacy digest detour as **NOT live**:
   `feed_source → ingest_run → raw_content_item → content_item → canonical_content_item → canonical_content_body → m.slot (materialise_slots) → m.slot_fill_attempt (fill_pending_slots) → m.ai_job (slot_fill_synthesis_v1) → m.post_draft (advisor recommended_format) → render (heygen / video / image worker, by format) → auto-approver → enqueue cron → per-platform publisher → m.post_publish`. Must state the digest tables are out of the live chain (`digest_item_id` NULL; seed-and-enqueue crons disabled).
4. **Decision tree & ownership table** — the spine of the doc. One row per decision, mirroring the trace audit §5 / slot decomposition §2: client eligibility, platform eligibility, format (initial/fill/final), **A2 avatar override**, narrative shape, provider/render-engine routing, **avatar identity**, schedule/cadence, publication gating, final execution. Each row: **owner** (config / deterministic SQL / AI advisor / agent / executor), code path, where stored, recoverable?, notes. Must record the two headline facts the audit said have "no home a reviewer would find": **ai-worker `callFormatAdvisor` is the final format decision-maker** (alters ~51% of fills), and **the YouTube avatar format is hardcoded in `m.materialise_slots`** (the true home of the A2 override).
5. **Format = narrative proxy** — that choosing a format chooses the narrative pattern; there is no independent narrative dimension in data or code (trace audit §8).
6. **Component & version register (pointer, not copy)** — the live worker set and that versions are tracked in the EF drift register; **link** to the register rather than duplicating version numbers (duplication is how the blueprint rotted). Must note known register-staleness as a live caveat (youtube-publisher row).
7. **Known gaps & active carries (pointer)** — link to `00_action_list.md` carries (A2 avatar policy, F-YT-QUEUE-ORPHAN-RECURRENCE, F-ADVISOR-RESPIN-ORPHAN-SLIDES, F-FORMAT-MIX-UNWIRED, F-AIW-PREF-COL-HARDCODE, F-EFDRIFT-REGISTER-STALE-YTPUB, plus the slot-level P2s); **summarise, do not duplicate** — carries are tasks (T3), this doc is truth (T1).
8. **Intended vs actual** — the `t.platform_format_mix_default` taxonomy mix is **unwired**; actual output is a near-monoculture (trace audit §6). Records the difference between designed intent and live behaviour so a reader is not misled by aspirational config.
9. **Evidence linkage** — the §7 rules made concrete: every current-state claim cites its source.
10. **What this document is NOT** — explicit non-goals (not a changelog, not a task list, not design history) with pointers to the doc that *is* each of those.
11. **Verification log** — dated `last_verified` history: who verified, against what, what changed.

---

## 7 — Evidence linkage rules

- **Every current-state claim must be traceable to a source:** a production table (e.g. `m.slot_fill_attempt`), a code path (`file@commit`), or a committed evidence doc (session-doc SHA). No unsourced assertions in a T1 doc.
- **Link, do not absorb.** Evidence stays T4 (session docs, run markers, DB). The T1 doc references evidence by commit SHA / table name; it does not copy evidence bodies in. This keeps the doc small (so it edits as one file, §4) and keeps a single home for each fact.
- **Recency gate (audit §9, rule 4):** evidence older than 30 days is never cited as *current* state — it may be cited as history. A claim whose only support is stale evidence must be re-verified before it can carry into a new `last_verified`.
- **Pointers for volatile facts:** version numbers, cron counts, and health metrics are referenced via their live registers (drift register, `cron.job`, health snapshots), never hardcoded — hardcoding is exactly what fossilised the blueprint.

---

## 8 — Stale-detection rules

The absence of any drift detector is a named audit finding (§5: "no job detects documentation drift — drift-check watches EF versions; nothing watches whether the architecture doc still describes the system"). The doc must ship with detection, not just hope:

- **30-day `last_verified` check:** add one line to the monthly review checklist in `05_risks.md` — *"T1 `last_verified` < 30 days old?"* — and have the **Monday Cowork reconciliation flag breaches automatically** (audit §9, rule 6). A T1 doc past 30 days is auto-downgraded in effect until re-verified.
- **DB-disagrees-with-T1 is a signal, not a workaround** (§3): any observed divergence between production and a T1 claim is logged as a staleness trigger and forces re-verification — replacing the old "trust the DB" valve that hid the rot.
- **Process-breach detection:** a commit that changes the live decision tree (new EF behaviour version, decision-path schema/cron change) **without** an accompanying `Authority impact:` line is flagged by the reconciliation as a missed promotion.
- **Register-staleness as a self-test:** because §6.6 points at the drift register, a stale register row (e.g. youtube-publisher) surfaces in this doc's own caveats — the doc partly audits itself.

---

## 9 — Ownership model

Mirrors the v3.34 routing already proven, formalised as standing (audit §9, rule 7):

- **CCH — authors and verifies.** Owns the content, runs the read-only re-verification against production, sets `last_verified` / `verified_against`. Accountable for freshness.
- **CCD — applies at scale.** Owns application of edits when the file exceeds the ~80KB single-emit limit, via the anchor-based patch-spec pattern (`b77f4f98` / v3.34). Direct-push to main after verification.
- **PK — approves.** Authority changes carry the same approval discipline as register edits; PK exact-phrase approval where a build/gate is involved (the T1 *build* is itself a gated step — this brief does not build it).
- **The promotion rule binds everyone:** every completion report ends with the mandatory `Authority impact:` line (§4). Ownership of *freshness* is CCH's; ownership of *the rule being followed* is the session protocol's.

---

## 10 — Explicit non-goals of this brief

- This brief **does not create** `docs/architecture/current-ice-decision-tree.md`. Building it is a separate gated task.
- It **does not** modify `00_` files, the docs index, `03_blueprint.md`, code, or config. The index T1 section and the blueprint demotion (audit §9, rule 2) are downstream steps, not part of this brief.
- It **does not** apply the audit's §9 governance proposal — that remains a proposed v3.35 change. This brief specifies one artifact of that proposal (the T1 doc) so it is build-ready when the governance is approved.

---

*Synthesised read-only from the two 2026-06-11 evidence audits (`6fd5f4d`, `b74c8e50`), the knowledge-capture/authority audit (`e39fa3a`), `00_docs_index.md`, and `03_blueprint.md`. No production, DB, deploy, provider, cron, or config action taken. Design brief only — the authority document is not created here.*
