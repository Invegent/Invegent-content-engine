# Brief — Subscription Email Ingest MVP

> **Lane:** Subscription Email Ingest → automated historical subscription-spend tracking.
> **Owner (build):** CCD.  **Orchestrator / scope-control:** CCH (Chat).
> **Status:** AUTHORED — awaiting CCD Stage 0 discovery + PK go.  **cc-number:** _unassigned — PK to assign against `00_action_list.md`._
> **Branch (CCD):** `feat/subscription-email-ingest-mvp` (do NOT touch `main` until merge is separately gated).
> **Lane isolation:** This lane is fully separate from the Instagram diagnosis lane. No shared files, branches, commits, summaries, or approvals.
> **Authored:** 2026-05-27.

---

## 0. Why / problem statement

The dashboard has a **manual** subscriptions register (`k.subscription_register`) where PK types in current fixed monthly costs. There is **no historical spend ledger** — no record of each actual charge over time. Goal: let the system parse subscription-billing emails from Gmail into structured **historical spend records**, so PK can see spend history per vendor over time, without manual entry.

This MVP delivers everything **except** live Gmail access. The live path is built but disabled-by-default and gated behind a separate explicit PK approval.

## 1. Grounding — existing state (CCH preliminary read 2026-05-27; CCD to confirm authoritatively in Stage 0)

`k.subscription_register` is a **definitions/catalog** table (one row per service), columns:
`subscription_id (uuid, pk)`, `service_name`, `category`, `use_case`, `plan_name`, `billing_type`, `cost_aud (numeric)`, `cost_notes`, `renewal_date (date)`, `account_email`, `status`, `login_url`, `notes`, `created_at`, `updated_at`.

It is **current-state only** — not a transaction history. **This table is OFF-LIMITS to writes in this lane** (append-only architecture: new tables reference it, never mutate it).

**CCD Stage 0 must also discover:** which dashboard repo + route renders the register (content-engine `dashboard/` vs `invegent-dashboard`), the read path it uses, and whether `k.*` is PostgREST-exposed or needs a direct/SECURITY-DEFINER read (note: `c.*`/`f.*` are not PostgREST-exposed; confirm `k.*`).

## 2. Target architecture (append-only, import-candidate first)

Two new tables in `k.*`, both append-only, register untouched:

1. **`k.subscription_import_candidate`** — raw parsed extraction from one email, awaiting PK review.
   - `candidate_id uuid pk`, `gmail_message_id text NOT NULL` **(idempotency key — see §4)**, `vendor_raw text`, `vendor_normalised text`, `matched_subscription_id uuid NULL` (FK → `k.subscription_register.subscription_id`, nullable until matched), `amount numeric`, `currency text`, `billing_date date`, `cadence text` (monthly/annual/one-off/unknown), `confidence numeric` (parser confidence 0–1), `source_from_domain text`, `source_subject text`, `source_received_at timestamptz`, `parser_version text`, `review_status text` (`candidate`/`accepted`/`rejected`/`duplicate`, default `candidate`), `created_at`, `updated_at`.
   - **No email body.** Only the structured fields + minimal source metadata above.

2. **`k.subscription_spend_event`** — the confirmed historical ledger; rows promoted from accepted candidates.
   - `spend_event_id uuid pk`, `subscription_id uuid` (FK → register), `amount_aud numeric`, `amount_original numeric`, `currency text`, `charged_on date`, `cadence text`, `source_candidate_id uuid` (FK → candidate), `created_at`.

**Flow:** email → parser → upsert candidate (idempotent) → PK reviews in dashboard → accept promotes to `subscription_spend_event`; reject marks the candidate. The register stays the source of truth for *what* the subscriptions are; the spend ledger is the *history*.

> MVP may collapse to a single table with a `review_status` if two tables is too heavy for v1 — but keep the candidate/ledger separation conceptually and keep idempotency on `gmail_message_id`. CCD to recommend in Stage 0/2.

## 3. Stages (each gate is explicit; do not skip Stage 0)

| Stage | Scope | Output | Gate |
|---|---|---|---|
| **0 — Discovery (MANDATORY FIRST)** | Read `k.subscription_register` + the dashboard UI/route that shows it + read path + `k.*` exposure. **Add nothing.** | Discovery report (§ acceptance #1) | none — but nothing else starts until this is reported |
| **1 — Parser library + fixtures** | Pure offline extractor: email payload → structured fields (vendor, amount, currency, billing_date, cadence, confidence). Checked-in **synthetic** fixtures (no real emails). Unit tests. | Library + fixtures + passing tests | — |
| **2 — Migration DRAFT** | `supabase/migrations/` **draft file only — NOT applied anywhere.** Both tables, append-only, idempotency constraint, FKs. | Draft migration file | **NOT applied** — apply is a later PK+D-01 gate |
| **3 — Ingest function scaffold** | EF/script scaffold: takes a message payload (fixture in MVP), runs parser, upserts candidate idempotently. **Gmail-fetch step stubbed/flagged OFF.** | Scaffold reading fixtures only | live fetch disabled |
| **4 — Review surface (optional, if quick)** | Read-only admin table of candidates + accept/reject affordance (accept → spend_event). Local/preview only. | Dashboard candidate review view | no production deploy |
| **5 — LIVE Gmail path (OUT OF MVP — separately gated)** | OAuth scope, token handling, real inbox read, cron. | — | **separate explicit PK approval + D-01; not part of this brief's deliverable** |

## 4. Idempotency (hard requirement)

The same Gmail message must never create a duplicate spend record. Enforce a **UNIQUE constraint on `gmail_message_id`** (the immutable RFC822 message id) on `subscription_import_candidate`, and ingest via `INSERT … ON CONFLICT (gmail_message_id) DO NOTHING` (or `DO UPDATE` only to refresh parse fields on a re-parse, never to duplicate). Secondary defence: a content hash of the normalised extraction. Promotion candidate→spend_event must also be idempotent (one spend_event per accepted candidate).

## 5. Privacy-by-design (hard requirement)

- **Never store full email bodies.** Only the structured extracted fields + minimal metadata: `gmail_message_id`, sender **domain** (not full address unless PK approves), subject line, received timestamp.
- If a short redacted snippet is ever needed for audit, that requires **explicit PK approval** first.
- **Never print or store** tokens, refresh tokens, access tokens, client secrets, or DSNs — not in logs, not in tables, not in report-back.
- Parser/tests run on **synthetic fixtures**, not PK's real mail.

## 6. Hard stops (non-negotiable this lane)

- No production deploy.  No production DB migration apply.
- No Gmail OAuth consent changes.  No Gmail token creation/refresh/rotation/storage.
- No reading PK's real Gmail inbox unless PK explicitly approves.
- No printing email bodies / tokens / secrets / DSNs.
- No cron enablement.  No automated recurring ingestion in production.
- No destructive changes to `k.subscription_register` (or any existing register data).
- No cross-contamination with the Instagram lane.

## 7. CCD report-back — acceptance criteria (CCH requires all 8, evidence-backed)

1. **Existing register architecture** — `k.subscription_register` shape + the dashboard route/repo + read path + `k.*` PostgREST exposure finding.
2. **Proposed target schema** — final candidate/spend-event DDL (or single-table justification).
3. **Files changed** — exact paths + branch (`feat/subscription-email-ingest-mvp`), with SHAs.
4. **Migration status** — confirm DRAFT/local only; **not applied** anywhere (state the project/branch explicitly).
5. **Parser test results** — fixtures used + pass/fail counts + sample extraction (synthetic data only).
6. **Duplicate-protection strategy** — the exact idempotency key + constraint + on-conflict behaviour, with a test proving a re-ingest is a no-op.
7. **Privacy posture** — confirm no bodies stored, what metadata is stored, no secrets emitted.
8. **Exact gated items remaining** before live Gmail automation can be switched on (the Stage 5 list + each approval/D-01 required).

## 8. Governance

Build behind the branch. The Stage 2 migration is **draft-only**; applying it is a later `apply_migration` behind **D-01 + PK approval phrase**. Any later live-Gmail work (Stage 5) is separately gated. CCH (Chat) reviews CCD's report-back against §7 before any apply/deploy is proposed.
