# ICE — Current Decision Tree (T1 Authoritative Current State)

| Field | Value |
|---|---|
| **tier** | T1 — authoritative current state |
| **status** | T1 authoritative current-state — the repo's source of truth for "how ICE works now" |
| **last_verified** | **2026-06-11** |
| **verified_by** | CCH session 2026-06-11 (read-only verification against production) |
| **verified_against** | project `mbkmaxqhsohbtwsqolns`; ai-worker `8204a5c7`; heygen-worker `9acb17e8`; live `cron.job` read 2026-06-11 (69 jobs); evidence audits `6fd5f4d`, `b74c8e50`, `e39fa3a9` |
| **supersedes** | `docs/03_blueprint.md` pipeline-flow and four-agents sections (digest-era; historical only for live production flow) |
| **update_owner** | CCH authors/verifies · CCD applies if >80KB (patch-spec pattern, `b77f4f98`) · PK approves |

A T1 doc whose `last_verified` is more than 30 days old is, by rule, **not authoritative** until re-verified. When this doc and any lower-tier doc disagree, trust this doc. When **production disagrees with this doc**, that is a staleness trigger — log it and re-verify; do not silently work around it.

---

## 1 — What ICE is today

ICE (Invegent Content Engine) is a signal-centric, **slot-demand-driven** content engine running on a single Supabase project (`mbkmaxqhsohbtwsqolns`). It ingests external signals (RSS/feeds/email), canonicalises and scores them per client scope, materialises forward publishing **demand as slots**, fills those slots from the scored signal pool, generates platform-ready drafts where an **AI format advisor makes the final format decision**, renders visual/video assets (Creatomate, HeyGen, ElevenLabs), and publishes to five live surfaces. Four active clients: NDIS Yarns, Property Pulse, Care for Welfare, Invegent. Five live platforms: Facebook, Instagram, LinkedIn, YouTube, website (WordPress).

The legacy **digest path is not live**: `m.digest_run`/`m.digest_item` are out of the production chain (`digest_item_id` NULL on all current drafts; the seed-and-enqueue crons are disabled). Any document describing ICE as digest-driven is historical.

## 2 — Current production pipeline (the live chain)

```
f.feed_source → f.ingest_run → f.raw_content_item → f.content_item
  → f.canonical_content_item (dedupe) → f.canonical_content_body (content-fetch)
  → scored signal pool (per client scope)
  → m.slot                  ← m.materialise_slots (nightly DB fn, 7-day demand horizon)
  → m.slot_fill_attempt     ← m.fill_pending_slots (10-min cron; pool snapshot recorded)
  → m.ai_job → ai-worker    ← callFormatAdvisor decides FINAL format here
  → m.post_draft (recommended_format = final; draft_format jsonb = provenance/kill metadata)
  → render by format        ← image-worker / video-worker (Creatomate, +ElevenLabs voice) / heygen-worker → m.post_render_log
  → auto-approver → enqueue cron → per-platform publisher → m.post_publish
  → insights workers (daily, FB per client) → m.post_performance
```

Publisher exception: **youtube-publisher selects approved drafts directly and bypasses `m.post_publish_queue`** (queue rows for YouTube are orphans — known carry). Breaking-news slots exist as a parallel demand source (`source_kind='breaking'`, `try_urgent_breaking_fills` cron); evergreen demand exists but carried zero volume in the verified window.

## 3 — Current decision tree & ownership

| Decision | Owner (type) | Where it happens | Recorded in | Notes |
|---|---|---|---|---|
| Client eligibility | Config | `c.client.status` + `c.client_content_scope` | config tables | |
| Platform eligibility | Config | `c.client_channel` + `c.client_publish_profile` | config tables | |
| Slot creation & cadence | Deterministic SQL | `m.materialise_slots` (nightly) + cadence rules | `m.slot` | 7-day forward demand |
| Initial format preference | Config (FB) / **Hardcoded (YT)** | `preferred_format_facebook` column; **`video_short_avatar` hardcoded in `m.materialise_slots` source for YouTube (the A2 override)**; IG/LI null | `m.slot.format_preference` | A2's true home is slot creation, not ai-worker |
| Pool eligibility + item selection | Deterministic SQL | `m.fill_pending_slots` (10-min); gates: `t.format_synthesis_policy`, `t.format_quality_policy` | `m.slot_fill_attempt` (pool snapshot, canonical ids) | Degrades safely: skips on thin pool, no threshold relaxation observed |
| Fill format | Deterministic SQL | `COALESCE(format_preference[1],'image_quote')` | `m.slot_fill_attempt.chosen_format` | **Mechanical: 35/35 non-YouTube fills chose image_quote** in verified cohort |
| **FINAL format** | **AI advisor** | ai-worker `callFormatAdvisor`; palette = `t."5.3_content_format".platform_support` ∩ `c.client_format_config` | `m.post_draft.recommended_format` | **The live decision-maker — altered 19/37 (51%) of cohort fills.** Sole exception: YouTube avatar is forced (A2); advisor's view recorded as prose only |
| Narrative shape | Proxy of format | ai-worker generation branches per format | draft body / visual spec | See §4 — no independent narrative dimension |
| Compliance / scope kill | AI (post-generation) | ai-worker kills out-of-scope drafts | `approval_status='dead'`, reason in `draft_format` jsonb | Currently costs a full ai_job + draft before the kill (CFW class; efficiency carry) |
| Render engine routing | Deterministic by format | text=none · image_quote/carousel/kinetic/stat=Creatomate (+ElevenLabs for *_voice) · avatar=HeyGen | `m.post_render_log` (`ice_format_key`) | |
| Avatar identity | **Arbitrary-first** | heygen-worker `lookupAvatar`: `c.brand_avatar`⋈`c.brand_stakeholder` **LIMIT 1, no ORDER BY**; ai-worker never emits `stakeholder_role` | `avatar_identity` telemetry from heygen-worker v2.1.1 onward | Role-aware inventory exists (NY 7 / PP 8 active) but is unused |
| Approval | Agent | auto-approver sweep | `approval_status` | |
| Publication gating | Config | mode (auto/manual), throttle in publish profile; enqueue cron | `m.post_publish_queue` | |
| Execution | Executors | per-platform publisher EFs; YouTube draft-direct | `m.post_publish` | No format re-decision at publish |
| Performance feedback | Deterministic | insights workers (daily FB per client); format-performance refresh | `m.post_performance` | |

## 4 — Format = narrative proxy

Choosing a format **is** choosing the narrative pattern: kinetic = multi-scene hook/point/CTA; stat = single-stat reveal; avatar = first-person narration; image_quote = pull-quote; carousel = multi-slide. There is **no independent narrative dimension** in data or code. Consequence: all narrative diversity in output is created at the advisor node, nowhere else.

## 5 — Component & version register (pointer)

Live worker set: ingest-worker, content-fetch, ai-worker, image-worker, video-worker, heygen-worker, auto-approver, per-platform publishers (facebook, instagram, linkedin-zapier, youtube, wordpress), insights workers, plus the health/doctor/sentinel observability set. **Versions are tracked in the EF drift register (`m.vw_ef_drift_current`) — consult it live; this doc deliberately does not duplicate version numbers** (hardcoded versions are how the blueprint rotted). Known live caveat: the register itself can run stale (youtube-publisher row — open carry).

## 6 — Known exceptions & gaps (pointer — these are tasks, tracked in `00_action_list.md`)

Open carries against this tree: **A2 avatar-override policy** (three branches, held for fresh `avatar_identity` telemetry) · F-ADVISOR-RESPIN-ORPHAN-SLIDES (render against superseded spec — the one proven chain-integrity break) · F-YT-QUEUE-ORPHAN-RECURRENCE · F-FORMAT-MIX-UNWIRED · F-AIW-PREF-COL-HARDCODE · F-EFDRIFT-REGISTER-STALE-YTPUB. Proposed (v3.35): F-PUBLISH-LEDGER-STATUS-MISMATCH (P2 — drafts marked published with failed-only ledger) · F-IG-TEXT-PALETTE-GAP (advisor palette enforcement) · F-PUBLISHER-STATUS-FLIP-INCONSISTENT · F-CFW-COMPLIANCE-PREGEN (efficiency). Legacy observation: `digest-selector-every-30m` still fires but feeds nothing live.

## 7 — Intended vs actual

`t.platform_format_mix_default` (the evidence-based portfolio mix seeded 2026-04-22) is **wired into nothing**. Actual output is a near-monoculture — FB/IG ≈ all image_quote, YouTube 100% avatar — produced by the FB preference column, the YT hardcode, the IG/LI COALESCE default, and advisor overrides. Do not read aspirational config as live behaviour.

## 8 — Evidence linkage

Every claim above traces to: the content decision trace audit (`docs/runtime/sessions/2026-06-11-content-decision-trace-audit.md`, commit `6fd5f4d`), the slot-level decomposition (`docs/runtime/sessions/2026-06-11-slot-level-decision-tree-decomposition.md`, `b74c8e50`), the knowledge-capture & authority-promotion audit (`docs/runtime/sessions/2026-06-11-knowledge-capture-authority-promotion-audit.md`, `e39fa3a9`), production tables named inline, and code at the commits in the header. Evidence older than 30 days is never cited here as *current* state.

## 9 — What this document is NOT

- **Not a changelog** — operational state and recent decisions live in `00_sync_state.md` (T2).
- **Not a task list** — **`00_action_list.md` is a task register, not truth-of-record.** Carries are work items; current truth lands here.
- **Not design history** — rationale lives in `06_decisions.md` and `03_blueprint.md` (T5 for pipeline content).
- **Session documents are evidence, not authority.** They prove claims at a point in time; this doc states what is currently true.
- Not future architecture — nothing aspirational appears here.

## 10 — Promotion rule (mandatory, PK-approved 2026-06-11)

> **Every completion report must include: `Authority impact: none` OR `Authority impact: patch queued → {file}`.**

This line carries the same standing as the walls confirmation. A change to the live decision tree without it is a process breach. This rule is what keeps this document from rotting the way the blueprint did.

## 11 — Verification log

| Date | Verified by | Verified against | Change |
|---|---|---|---|
| 2026-06-11 | CCH | production reads + audits `6fd5f4d`/`b74c8e50`/`e39fa3a9`; ai-worker `8204a5c7`; heygen-worker `9acb17e8`; cron register | Initial creation (v3.35 cycle; Rules 1, 2, 3, 7, 6a approved) |
