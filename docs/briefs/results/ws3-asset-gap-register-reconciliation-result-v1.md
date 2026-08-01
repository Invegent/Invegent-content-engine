# WS-3 (c) — Asset Gap register reconciliation: DB ledger ⇄ markdown — result v1

**Created:** 2026-08-01 Sydney
**Author:** Claude Code (orchestrator)
**Tier:** **T1** (read-only reconciliation + one surgical docs edit)
**Lane class (CCF-02):** SAFETY_GATE
**Governing brief:** `docs/briefs/creatomate-global-ultimate-programme-brief-v1.md` §3 WS-3(c)
**Verdict:** `CONCERNS` — reconciliation complete; **the demotion the brief calls for is
NOT safe to execute as written**, for the reason in §4. One PK decision required (§6).
**Mutation:** none to the database. One additive `§0.3` block added to
`docs/briefs/ice-asset-gap-register-v1.md`. No historical rewrite.

---

## 1. What was asked, and what this reconciliation found

The programme brief asks WS-3(c) to "reconcile DB ledger ⇄ markdown register into ONE
register (DB-generated; markdown demoted to commentary)".

The reconciliation is done and is reported below. The finding that matters is not a
discrepancy — it is that **the two artifacts are not two views of the same thing**:

- `m.asset_gap_suggestion` is the analyzer's **per-(client × platform × format) demand
  queue**. A row exists only when an approved draft caused `analyze_asset_gap` to detect a
  gap on one of four `slot_kind` values (`static_background`, `logo`, `image`,
  `video_broll`).
- `docs/briefs/ice-asset-gap-register-v1.md` is a **manual coverage census across asset
  classes** — backgrounds, logos, brand colours, music, avatars, voice, B-roll — most of
  which the analyzer does not and cannot emit rows for.

So the markdown is not a stale duplicate of the ledger. It is a **superset carrying items
the ledger has no way to represent**, and demoting it to commentary without first routing
those items would silently drop them. §4 quantifies this; §6 is the resulting PK decision.

## 2. DB ledger — live truth, 2026-08-01

Project `mbkmaxqhsohbtwsqolns`. **8 rows: 4 `open`, 4 `resolved`. Unchanged since
2026-07-20** — every row's `first_seen_at`, `last_seen_at` and `updated_at` is that date.
This confirms the register's own §0.2 claim, twelve days on, and is the direct evidence
that the analyzer has never run live: the writer's `p_dry_run` default is `true` and no
schedule exists (WS-3(b) packet §3).

### 2.1 Open rows (4)

| # | Client | Platform | Format | slot_kind | subject_kind / failure_state | primary_route | drainability | demand | why_needed |
|---|---|---|---|---|---|---|---|---|---|
| L-1 | invegent | linkedin | carousel | static_background | assignment / unassigned | governance_gap | blocked_by_template | 2 | ambiguous_asset_appetite |
| L-2 | care-for-welfare-pty-ltd | facebook | carousel | static_background | assignment / unassigned | governance_gap | blocked_by_template | 1 | ambiguous_asset_appetite |
| L-3 | care-for-welfare-pty-ltd | linkedin | carousel | static_background | assignment / unassigned | governance_gap | blocked_by_template | 3 | ambiguous_asset_appetite |
| L-4 | property-pulse | youtube | video_short_stat | static_background | platform_config / misconfigured | template_gap | blocked_by_template | 3 | no_governed_background |

**All four are `blocked_by_template`, none is `drainable`.** Not one is an asset shortage
an image harvest could close. The register's §0.2 conclusion — "the current
genuine-asset-shortage backlog is EMPTY" — is re-confirmed live.

### 2.2 Resolved rows (4)

| Client | Platform | Format | demand | resolved |
|---|---|---|---|---|
| care-for-welfare-pty-ltd | facebook | image_quote | 1 | 2026-07-20 |
| invegent | facebook | image_quote | 1 | 2026-07-20 |
| invegent | instagram | image_quote | 5 | 2026-07-20 |
| invegent | linkedin | image_quote | 5 | 2026-07-20 |

## 3. Item-by-item reconciliation

Every markdown register item mapped to its ledger representation. "Not representable" =
the analyzer has no subject type that could ever emit this row today (Asset Gap
subject-type expansion — music / avatar / voice / feed-volume / provider-capability — is
explicitly out of Ultimate v1, programme brief §1.3).

| Markdown item | Markdown status | Ledger representation | Reconciliation |
|---|---|---|---|
| P0-1 PP YT thumbnail background | CLOSED 2026-07-28 | **none, ever** | Agreed closed. Sourced from a direct `analyze_asset_gap` probe, never persisted. Live-confirmed: no ledger row has `format = 'youtube_thumbnail'`. |
| P0-2 governed video single point | OPEN | none | **Not representable** — a template/governance gap, not asset demand. L-4 is adjacent (PP × YT × video_short_stat) but the analyzer classified it `template_gap` / `platform_config`, which is a different claim. |
| P0-3 ungoverned legacy video volume | OPEN | none | **Not representable** — a policy decision, not detectable demand. |
| P1-1 Invegent backgrounds | CLOSED 2026-07-28 | **3 `resolved` rows** (fb/ig/li × image_quote) | **Full agreement.** The ledger independently records this closure. |
| P1-2 Invegent brand colours | CLOSED 2026-07-26 | none | **Not representable** — brand-profile data, not an asset subject type. |
| P1-3 CFW backgrounds | CLOSED 2026-07-28 | **1 `resolved` row** (fb × image_quote) | **Agreement.** |
| P1-4 CFW brand colours | CLOSED 2026-07-26 | none | **Not representable.** |
| P1-5 NDIS authoritative logo (fenced) | **OPEN** | **none** | **⚠ Divergence.** `slot_kind = 'logo'` is a representable type, but no row exists and none will appear: NDIS renders fine on its one governed logo, so the resolver never fails and the analyzer never detects a gap. A *promotion-quality* gap is invisible to a *fail-closed* detector. |
| P1-6 PP YT thumbnail foreground | OPEN (unconfirmed) | none | Rides the closed P0-1. No ledger row. |
| P2-1 music (1 selectable, 8 fenced) | OPEN | none | **Not representable.** |
| P2-2 PP/NDIS single-character avatars | OPEN | none | **Not representable.** |
| P2-3 CFW/Invegent no avatar/voice | OPEN | none | **Not representable.** |
| P2-4 CFW/Invegent no voice | OPEN | none | **Not representable.** |
| P2-5 PP video B-roll depth | OPEN | none | **Not representable** today (`video_broll` is a valid `slot_kind`, but no approved draft has driven a detection). |
| P2-6 template-governed elements | covered | none | n/a. |
| — | — | **L-1…L-4 (4 open rows)** | Present in the markdown **only** in the §0.2 refresh table, not in the severity-ranked §2 register. |

**Totals.** 15 markdown items: 2 reconcile to ledger rows (both `resolved`), 1 is a live
divergence (P1-5), 3 are closed with no ledger trace, and **9 are structurally not
representable**. 4 ledger open rows appear in the markdown's §0.2 refresh only.

## 4. Why the demotion cannot be executed as written

Demoting the markdown to commentary makes the DB the single register. But the DB **cannot
carry 9 of the 15 markdown items**, and cannot carry P1-5 even though its type is
representable. Executing the demotion today would move ten live backlog items from an
authoritative document into a file explicitly marked non-authoritative, with nothing
inheriting them.

That is not a reconciliation — it is a quiet deletion of the majority of the backlog.

The programme brief already contains the correct destination: **WS-3(d), "route every
non-ready target cell to an owner (readiness queue `responsible_lane` coverage extended,
not rebuilt)"**. The non-representable items are exactly what `responsible_lane` routing is
for. **The demotion is therefore safe only AFTER (d), not in parallel with it.** This
packet does not reorder the brief on its own authority; it surfaces the dependency and
asks (§6).

## 5. The DB-generated register — as of 2026-08-01

The generated register is §2 above. Once WS-3(a) lands, it is regenerable with no
privileged access, zero prompt:

```bash
python scripts/db-read.py "SELECT status, client_slug, platform, format, slot_kind, subject_kind, failure_state, primary_route, asset_gap_drainability, demand_count, first_seen_at::date, last_seen_at::date FROM ice_ro.asset_gap_backlog ORDER BY status, priority_score DESC NULLS LAST, first_seen_at"
```

Until WS-3(a) lands, the same read requires gated `execute_sql`. **The read view is a
prerequisite for the register being genuinely "DB-generated" in routine operation** —
otherwise regenerating it costs an R1 permission prompt every time, which is how registers
drift in the first place.

## 6. PK decision required

**D-1 — sequencing of the demotion.** Pick one:

- **Option A (recommended) — route first, demote second.** Complete WS-3(d)
  `responsible_lane` routing for the 10 non-representable / non-detectable items, then
  demote the markdown to commentary. Nothing is dropped; the brief's ordering within WS-3
  shifts, its content does not.
- **Option B — demote now, accept the loss.** Faster, and defensible only if PK judges the
  10 items already tracked elsewhere. Reconciliation evidence says they are not.
- **Option C — permanent two-register model.** DB register for analyzer-detected demand;
  markdown (or its successor) remains authoritative for class-level coverage. Honest, but
  it declines the brief's "ONE register" goal and should be an explicit amendment, not a
  drift.

**D-2 — P1-5 (NDIS authoritative logo).** The one live divergence: an open markdown item
whose type the ledger *could* represent but never will, because a fail-closed detector
cannot see a quality gap. Either route it under D-1, or accept that promotion-quality gaps
are permanently outside the analyzer's remit and record that as a stated limit of the
Asset Gap system.

## 7. What was changed

- `docs/briefs/ice-asset-gap-register-v1.md` — one additive `§0.3` block recording this
  reconciliation, the live re-verification date, and the pending D-1 decision. §§0.1–0.2
  and §§1–6 are byte-unchanged (Convention 1: no historical rewrite).
- No database mutation. No register version cut. No file committed.

## 8. Non-claims

This reconciliation approves nothing, promotes nothing, and closes no backlog item. It
does not demote the markdown register — that awaits D-1. It does not extend
`responsible_lane` coverage (WS-3(d), not performed here). It does not re-verify the
markdown's own closure claims for P1-2/P1-4 (brand colours), which the register itself
flags as carried from memory and never live-re-checked; that flag is unchanged and still
stands.

## 9. PK decision record (added 2026-08-01, post-packet)

**D-1: Option A — route via WS-3(d) first, demote second.** Nothing dropped; the brief's
(c)/(d) execution order (§3 WS-3) is reversed relative to its listed lettering, its
content is not changed. `docs/briefs/ice-asset-gap-register-v1.md` §0.3 has been updated
in place (additive bullet, no rewrite) to record this and to restate its own
still-AUTHORITATIVE status pending WS-3(d) completion.

**D-2: resolved as a direct consequence of D-1**, not decided independently — P1-5 (NDIS
authoritative-logo divergence) is routed under WS-3(d) alongside the other 9
non-representable items, rather than being recorded as a standing analyzer limitation.

**Still not performed by this record:** WS-3(d) `responsible_lane` routing itself, and the
markdown-to-commentary demotion (§4/§6) — both remain future, separately-gated lanes. No
DB mutation, no code change, no template/asset promotion.
