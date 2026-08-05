# Result — M10/M9 Documentation Foundation (lane `m10-m9-docs-foundation`)

**Created:** 2026-08-05 Sydney · **Class:** docs_only — 0 code / 0 DB / 0 migration / 0 RPC / 0 deploy /
0 replay execution. Tier: **T1** (docs-only spec-authoring; matches the delta-audit's own lane estimate
for both milestones — M10 "1 docs lane, T1"; M9 "1 spec-authoring lane... T1 (spec)",
`docs/briefs/creatomate-global-ultimate-final-delta-audit-v1.md:548-549`).

---

## 1. Result status

**COMPLETE** — both requested documents drafted, evidence-grounded, and ready for PK Gate-1 review. Neither
document is self-ratifying: closing M9's or M10's row in the CGU Final must-have table
(`docs/briefs/creatomate-global-ultimate-final-delta-audit-v1.md` §2.2) remains a PK act, not something
either document performs on itself. M9's replay half is explicitly untouched — no DB write, migration, or
production mutation occurred in this lane, per the task's own constraint ("Docs only. Do not implement the
replay or modify production.").

## 2. Deliverables

| # | File | Milestone | Status |
|---|---|---|---|
| 1 | `docs/briefs/m10-provider-neutral-render-contract-v1.md` | M10 | DRAFT — spec complete, pending PK ratification |
| 2 | `docs/briefs/m9-zero-code-day1-onboarding-package-v1.md` | M9 | DRAFT — **spec half only**; replay half OPEN, gated behind §6 |
| 3 | This result doc | both | canonical record per the Recording Compression convention |

Each of the two spec documents is self-contained and "review-ready": each carries its own acceptance
matrix, dependencies section (with an ASCII sequencing diagram), exclusions section, and open-questions/
named-handoffs section, per the house design-doc conventions found in `governor-architecture.md`,
`registry-schema-v2.md`, and `render-provider-creatomate-capability-audit.md`.

## 3. Evidence base

Four parallel read-only research passes grounded both documents before drafting, each producing file:line
citations subsequently spot-checked directly against source (not taken on faith):

1. **M9/M10 programme definitions** — full read of `creatomate-global-ultimate-programme-brief-v1.md` and
   `creatomate-global-ultimate-final-delta-audit-v1.md` (the documents that literally define M9/M10 as
   table rows), plus `render-provider-creatomate-capability-audit.md`, the TPR-1 origin rule + addendum,
   the audio-presence-vs-loudness outcome result, the CGU-v1 25/25 verdict, and the M11a legacy-routing
   inventory.
2. **Render pipeline architecture** — direct read of `video-worker/index.ts`, `b1_video_stat.ts`,
   `b1_video_kinetic.ts`, `image-worker/index.ts`, `b1_production.ts`, `contract_validation.ts`,
   `creatomate_submit.ts`, the TMR-3 registry migration, `select_template`'s decision chain, the
   graduation-contract ladder, `youtube-publisher`/`auto-approver`/`publisher`, and
   `governance/governor-architecture.md`.
3. **Client onboarding precedent** — direct read of `09_client_onboarding.md`, the S6 Slice A NDIS
   enrolment packet + result, cc-0086 voice-config brief + result, `ice-asset-gap-register-v1.md`,
   `registry-schema-v2.md`, the graduation contract, and the dashboard's `operator-journey-ia-v1.md` +
   `global-client-picker-v1-brief.md`.
4. **House documentation conventions** — direct read of `_template_brief.md`, `_template_result.md`,
   `governor-architecture.md`, `registry-schema-v2.md`, `render-provider-creatomate-capability-audit.md`,
   the Recording Compression convention (`ice-workflow-acceleration-convention-packet.md` §1), and live
   `00_sync_state.md`/`00_action_list.md` pointer-entry examples.

Spot-checks re-confirmed directly against source before drafting (not solely relying on sub-agent
transcription): the delta-audit's §2.2 must-have table rows for M9/M10 (lines 383–407), the capability-audit
§7 "Shared Render Intelligence abstraction" text, the graduation contract's 9-state ladder table, and the
S6 Slice A packet's exact enrolment/audit-row column values.

## 4. Constraints confirmed

- **Docs only** — no file outside `docs/` was created or modified; no `supabase/migrations/`, no worker
  code, no dashboard code.
- **No replay implemented** — M9's replay half (§7 of that document) is explicitly deferred; the document
  defines acceptance criteria for a future replay, it does not execute one.
- **No production mutation** — zero DB writes, zero deploys, zero RPC calls beyond read-only research.
- **No register self-cut** — this lane does not directly edit `docs/00_sync_state.md` or
  `docs/00_action_list.md`. Per the standing single-register-cut-owner convention
  (`docs/00_action_list.md` v6.109 marker: "other lanes submit version-less pointer payloads, versions
  allocated here"), §6 below provides the payload text for the register-cut-owner session to apply, rather
  than this lane assigning itself a version number.
- **No overclaim of closure** — both spec documents state explicitly, in their own status headers and
  acceptance matrices, that PK ratification (not the document's existence) closes their respective
  milestone rows.

## 5. Open issues / named handoffs (rolled up from both documents)

From M10 (`m10-provider-neutral-render-contract-v1.md` §13):
1. Proof-event write-RPC status unverified (`tmr-template-proof-lifecycle-v1-g1-write-rpc-apply-result.md`
   not read this pass).
2. Whether legacy composition-mode renders populate `render_spec` today — unconfirmed.
3. "Silent-template trap" has no single canonical repo definition — this document picked a two-instance
   reading; PK may want to narrow it.
4. `drift-check`/`tmr-drift-probe` depth not independently re-verified.

From M9 (`m9-zero-code-day1-onboarding-package-v1.md` §11):
1. `c.client_creative_governance` live-gate rewire status unverified since its 2026-07-07 dark/additive
   state.
2. `c.client_format_config` exact DDL not found in tracked migrations — needs a live
   `information_schema` read before replay.
3. Dashboard visibility depth — a real, unresolved contradiction between the operator-journey IA (silent
   on format-mix-governance UI) and named-but-unread dashboard components.
4. The WS-5 kinetic lane's "rung 6–13" proof numbering is inconsistent with the canonical 9-state ladder —
   flagged, not resolved.
5. The migration-ledger-vs-git commit refinement (§2 Layer C of the M9 doc) is a recommendation over the
   S6 Slice A precedent, not yet PK-confirmed.

None of these block PK's Gate-1 review of the documents as written — each is named inline, with a citation,
at the point in the document where it matters, rather than silently smoothed over.

## 6. Register payloads (version-less — for the register-cut-owner session to apply)

Per Convention 1 (`docs/briefs/ice-workflow-acceleration-convention-packet.md` §1.1), pointer-entry shape,
version number intentionally omitted:

**For `docs/00_sync_state.md`:**

```
> **✅ M10/M9 DOCS FOUNDATION DRAFTED — both spec documents review-ready, submitted for PK Gate-1
> (T1, docs-only, zero DB/deploy/replay)** — M10: `docs/briefs/m10-provider-neutral-render-contract-v1.md`
> (extracted from stat+kinetic+image_quote, Phase 0 dependency satisfied); M9:
> `docs/briefs/m9-zero-code-day1-onboarding-package-v1.md` (spec half only — replay half stays OPEN,
> gated behind the unratified §6 schedule-expansion approval). Result:
> `docs/briefs/results/m10-m9-docs-foundation-result-v1.md`.
> · Next gate: PK Gate-1 review of both documents; neither milestone's must-have row closes until PK
> ratifies. Queue impact: M9/M10 remain OPEN in `creatomate-global-ultimate-final-delta-audit-v1.md` §2.2
> pending that ratification — this lane does not edit that table itself.
```

**For `docs/00_action_list.md`:**

```
> M10/M9 DOCS FOUNDATION LANE — both review-ready spec documents drafted (T1, docs-only; zero code/DB/
> deploy/replay change). M10 provider-neutral render contract extracted from ≥2 real closed format
> implementations (stat, kinetic, cross-checked against image_quote), satisfying its Phase-0 dependency;
> encodes TPR-1, the silent-template trap (both named instances), and the audio-presence-vs-loudness gap
> as named contract clauses. M9 Day-1 onboarding package specifies the exact governance-row/asset-pool/
> proof-ladder state a brand needs before its one real zero-code precedent (NDIS S6 Slice A, two rows)
> is safe to repeat — spec half only; replay stays gated behind the not-yet-obtained §6 approval. Five
> named open-verification items carried into both documents' own Open Questions sections, not hidden.
> Result: `docs/briefs/results/m10-m9-docs-foundation-result-v1.md`. Awaiting PK Gate-1.
```

## 7. Next recommended step

PK reviews both documents at Gate 1. If accepted: (a) the register-cut-owner session applies §6's payloads
with an allocated version number; (b) M9/M10's status cells in
`creatomate-global-ultimate-final-delta-audit-v1.md` §2.2 update from `OPEN` to reflect "spec authored,
pending replay" (M9) and "design doc complete" (M10) — an edit this lane deliberately did not make itself,
consistent with the docs-only, no-self-ratification constraint. If PK elects to clear the §6
schedule-expansion gate separately, M9's replay lane (T2/T3, per the delta-audit's own lane estimate) can
then be scoped as its own follow-on task, executed under the full apply-gate chain named in M9 §6/§7 — not
by extending this lane.
