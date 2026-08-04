# Post-CGU-v1 — Phase 2 Schedule Expansion Proposal v1

**Status:** PROPOSAL ONLY — no DB mutation has been made or is authorized by this document.
**Lane:** `post-cgu-v1-optimum-schedule-expansion`, Phase 2 (Phase 1 = the v11 containment
packet, executed and committed 2026-08-04; registered in `docs/00_sync_state.md` as
"Phase 2 waits on §6 schedule-expansion approval").
**Constraint (PK ruling, this turn):** expand scheduled volume **only** on Layer-1
(`autonomy_ready_for_unsupervised_schedule`) routes. The v11 Layer-2 exclusions are
authorities, not defaults to be reopened. `client_format_config.is_enabled=true` is
capability, not scheduling permission.
**Evidence basis:** live read-only queries against project `mbkmaxqhsohbtwsqolns`
(`c.client_publish_schedule`, `c.client_format_config`, `c.client_schedule_cap_override`,
`c.client_creative_governance`, `c.client_brand_asset`, `m.post_publish`,
`m.post_render_log`, and the v11 rollback pre-image tables), gathered via `db-rls-auditor`
2026-08-04, plus the v11 execution's own confirmed after-state.

---

## 0. What "Layer-1" means per client/platform in this proposal

`c.client_creative_governance` is **client + format** grain (no platform column) — it does
not by itself resolve which platform a format may run on unattended. Combined with the v11
STOP rules and this turn's PK ruling, Layer-1-eligible cells for Phase 2 are:

| Client | Format | Governance ref | Platform scope this phase |
|---|---|---|---|
| ndis-yarns | image_quote | `ndis_yarns.image_quote.news_card`, `creative_library_b1_production` | facebook, instagram, linkedin |
| ndis-yarns | text | capability-exempt (`is_capability_exempt_format('text')=true`, M11a finding) | facebook, instagram, linkedin |
| care-for-welfare | image_quote | `care_for_welfare.image_quote.news_card`, `creative_library_b1_production` | **held flat — see §3 asset constraint** |
| care-for-welfare | text | capability-exempt | facebook, instagram, linkedin |
| invegent | image_quote | `invegent.image_quote.quote_card`, `creative_library_generic_selector` | **held flat — see §3 asset constraint** |
| invegent | text | capability-exempt | facebook, instagram, linkedin |
| property-pulse | image_quote / text / carousel | image_quote+text governed `b1_production`; **carousel is `legacy_pipeline`/`image_worker_legacy_carousel_v1`** | **no change — see §1** |
| property-pulse | video_short_stat (YT only) | governed `video_short_stat.market_stat` | unchanged, already automated-only per rule |

Excluded from any expansion this phase (Layer-2 / explicitly ruled out, unchanged from v11):
NDIS carousel/video_short*/video_long* on all platforms, NDIS YouTube (all formats),
PP video_short_kinetic (stays supervised), PP carousel (legacy pipeline — no *increase* in
exposure), CFW LinkedIn image_quote, CFW/Invegent YouTube entirely.

---

## 1. Property Pulse — no schedule change proposed

Current: FB 5/5, IG 5/5, LI 5/5 (all three slots resolve dynamically across
carousel/image_quote/text — rows carry `format_override=NULL`), YT 1/9 (`video_short_stat`
only). PP is already at its apparent per-platform ceiling on FB/IG/LI, and the only unused
headroom there runs through the same NULL-resolver slots that also serve carousel — adding
rows would risk increasing carousel exposure, which is explicitly excluded. YouTube already
matches the rule exactly (stat-only, kinetic supervised). **Net: zero rows changed for PP
this phase.** If PK wants PP FB/IG growth later, it requires format-*pinned* new slots
(explicit `image_quote`/`text` override, never `NULL`) to keep carousel exposure flat — a
distinct follow-up design decision, not part of this matrix.

---

## 2. NDIS Yarns — the primary Layer-1 expansion target

| Platform | Current enabled | Proposed wk1 | Δ | Change |
|---|---|---|---|---|
| Facebook | 10 (image_quote 5 + text 5) | 14 (image_quote 7 + text 7) | +4 | +2 image_quote, +2 text |
| Instagram | 7 (image_quote 7, **no text row exists yet**) | 12 (image_quote 7 + text 5) | +5 | +5 text — new rotation, pinned from currently-disabled NULL slots |
| LinkedIn | 14 (image_quote 7 + text 7) | 14 | 0 | already at cap (`max_per_week=14`, matches the "max 2/day" LinkedIn cadence rule — not raised) |
| YouTube | 0 | 0 | 0 | stays zero — explicit PK rule, unattended volume never authorized here |

NDIS has an explicit `client_schedule_cap_override` row: FB/IG max 4/day, 28/week; LI max
2/day, 14/week. This proposal uses **14 of 28 (FB) and 12 of 28 (IG)** — well under half of
the authorized ceiling, deliberately conservative for a first week. Carousel and all
video_* formats on NDIS FB/IG stay disabled exactly as v11 left them — nothing in this
section touches those rows.

---

## 3. CFW and Invegent — text expansion only; image_quote held flat

**Hard constraint found in the data, not inferred:** `c.client_brand_asset` shows CFW has
**one** usable background asset total, and invegent has **zero** rows tagged
`usage='background'` (its one active asset is a logo). This is the direct, evidenced cause
of the current render failure rates: CFW Facebook image_quote is running at 14
succeeded / 35 failed renders in the last 30 days already, at only 1 enabled slot/week;
invegent Facebook is 20 succeeded / 87 failed, invegent Instagram 19 succeeded / 61 failed —
at their current, unchanged volumes. **Increasing image_quote schedule capacity for either
client would increase failed-render count, not published output.** image_quote counts are
therefore proposed **unchanged** for both clients. (Invegent's renders technically
succeeding at all despite zero confirmed background assets is itself unexplained — flagged
as an open question in §6, not assumed benign.)

Text is capability-exempt (no render/asset dependency), so it is the only lever this phase
for these two clients:

| Client | Platform | Current enabled | Proposed wk1 | Δ | Change |
|---|---|---|---|---|---|
| CFW | Facebook | 3 (iq 1 + text 2) | 5 (iq 1 + text 4) | +2 | +2 text; image_quote untouched |
| CFW | Instagram | 3 (iq 3, no text row) | 5 (iq 3 + text 2) | +2 | +2 text — new rotation |
| CFW | LinkedIn | 5 (text 5) | 5 | 0 | already all-text, already at cap — matches "CFW LinkedIn image_quote remains supervised" exactly, no change needed |
| CFW | YouTube | not configured | — | 0 | excluded |
| Invegent | Facebook | 3 (iq 1 + text 2) | 5 (iq 1 + text 4) | +2 | +2 text; image_quote untouched |
| Invegent | Instagram | 3 (iq 3, no text row) | 5 (iq 3 + text 2) | +2 | +2 text — new rotation |
| Invegent | LinkedIn | 5 (iq 1 + text 4) | 5 | 0 | already at cap, no change |
| Invegent | YouTube | not configured | — | 0 | excluded |

No `client_schedule_cap_override` row exists for CFW, invegent, or property-pulse — the
"/5" cap shown on their dashboard cards is inferred from consistent current row totals
(28 total rows/platform, 5 currently reachable as "on" before hitting the visible cap), not
read from a table. This proposal stays inside that apparent 5-slot ceiling for both clients
and does **not** propose adding a `client_schedule_cap_override` row — confirming the true
cap mechanism for these three clients is listed as an open item (§6) before any apply.

---

## 4. Net weekly volume — before / after (schedule capacity, not realized output)

| Client | Before (enabled rows/wk) | After (proposed wk1) | Δ |
|---|---|---|---|
| Property Pulse | 16 | 16 | 0 |
| NDIS Yarns | 31 | 40 | +9 |
| CFW | 11 | 15 | +4 |
| Invegent | 11 | 15 | +4 |
| **Total** | **69** | **86** | **+17** |

All +17 rows are either text (zero asset dependency) or, for NDIS FB only, a modest +2
image_quote add backed by a 21-asset background pool. Zero rows added to any Layer-2,
legacy-pipeline, or YouTube cell.

---

## 5. Asset repetition pressure

| Client | Format | Usable background assets | Current draws/30d | Proposed draws/30d (est.) | Rotation pressure |
|---|---|---|---|---|---|
| NDIS Yarns | image_quote | 21 (5 needs_scrim + 16 text-safe) | ~19 (FB 5 + IG 7 wk → ~52/mo scheduled, ~19 rendered-succeeded/30d observed) | ~28 (FB 7 + IG 7 wk) | ~1.3x/month → still light; acceptable |
| NDIS Yarns | text | none (copy-only) | 17 | 17+ (FB+IG text added) | n/a — no asset ceiling |
| CFW | image_quote | **1** | 14 succ / 35 fail (FB alone) | unchanged | already over-drawn; do not expand |
| CFW | text | none | 1 (LI) | + FB/IG text added | n/a |
| Invegent | image_quote | **0 confirmed** | 20 succ / 87 fail (FB), 19 succ / 61 fail (IG) | unchanged | already failing at current volume; do not expand |
| Invegent | text | none | 14 (LI) | + FB/IG text added | n/a |
| Property Pulse | image_quote/carousel | 22 background + 6 broll | stable, no change proposed | no change | n/a |

CFW and invegent's image_quote render-failure rates are a standing production problem
independent of this proposal — recommend a separate asset-intake lane before any future
image_quote volume increase for either client (flagged as its own item below, not folded
into this schedule matrix).

---

## 6. Open items to resolve before an apply packet is authored

1. **Cap source for PP/CFW/invegent unconfirmed** — no `client_schedule_cap_override` row
   exists for these three; the "/5" dashboard figure is inferred from row-count convention,
   not read from a cap table. Needs a dashboard-source check before treating 5 as a hard,
   enforced ceiling rather than a coincidence of current data.
2. **Invegent image_quote renders are succeeding with zero confirmed background assets** —
   unexplained by the `client_brand_asset` data pulled; needs a direct trace (possibly a
   template-baked background with no variable asset, or an asset tagged outside the
   `usage='background'` convention) before trusting any capacity math involving invegent
   image_quote.
3. **NDIS `video_short_stat` governance ref is literally named `cgu_supervised_proof_v1`**
   — reads as a supervised-proof lane, not autonomy-ready. Moot for this proposal (NDIS
   YouTube stays at zero regardless), but should not be treated as Layer-1 anywhere else
   without an explicit PK ruling.
4. **PP carousel is tagged `legacy_pipeline`** in `client_creative_governance` — consistent
   with the M11a legacy-routing inventory's PP-carousel finding (D2, declared-legacy).
   Confirms §1's decision to leave PP FB/IG untouched.

---

## 7. Dashboard-visible outcome if this matrix is approved and applied

| Client | Facebook | Instagram | LinkedIn | YouTube |
|---|---|---|---|---|
| Property Pulse | 5/5 (unchanged) | 5/5 (unchanged) | 5/5 (unchanged) | 1/5 (unchanged, stat only) |
| NDIS Yarns | 14/28 | 12/28 | 14/14 (unchanged) | 0/28 (unchanged) |
| CFW | 5/28* | 5/28* | 5/28 (unchanged) | not configured |
| Invegent | 5/28* | 5/28* | 5/28 (unchanged) | not configured |

\* Denominator shown as 28 to match NDIS's confirmed cap-table structure; per §6 item 1 this
is unverified for CFW/invegent and the dashboard may display a different number until the
cap source is confirmed.

---

**No SQL has been written or executed for this proposal.** Per PK's instruction, this
matrix awaits explicit approval before any apply packet is drafted; if approved, the next
step is a CAS-guarded apply packet (same discipline as v11: frozen row-level `schedule_id`
targets, pre-image capture, durable rollback, apply-harness-auditor + branch-warden +
hash-pinned external review) sized to exactly this table — nothing broader.

---

## 8. Addendum (2026-08-04, same day) — §3/§5/§6-item-2 correction: background-scarcity theory tested and rejected; open item 2 resolved

Prompted by PK reviewing this proposal and flagging §3/§6-item-2 for a direct trace rather than
accepting the background-asset theory as given. Two read-only `db-rls-auditor` passes (zero
mutations) plus a parallel `brief-author` draft (not issued) investigated and found:

**§6 open item 2 is resolved:** invegent's `image_quote` renders succeed because its resolver
(`select_template`→`resolve_slot_assets`) deliberately falls through to a **PK-proven governed
shared-pool background** (`bg_shared_datacentre_server.jpg`, per
`docs/briefs/results/cc-0044-proof1-invegent-shared-pool-render-result-v1.md`, 2026-07-20 PK visual
PASS) — a deliberate, working mechanism, not a bug, gap, or silent fallback. Separately,
`docs/briefs/results/cc-0073-d2-background-pool-promotion-result.md` (2026-07-27) already gave
**both** CFW and invegent 4 rotation-pool backgrounds each via shared-pool promotion — the "CFW=1/
invegent=0" figures this proposal's §3 cites are scoped to each client's own-table asset count
only, not their effective rotation pool.

**§3/§5's "hard constraint found in the data" is superseded — background-asset scarcity was never
the cause of the CFW/invegent failure rates.** A direct query of `m.post_render_log.error_message`
(30-day window, both clients) found the failure counts fully and exactly accounted for by two
already-fixed incidents that both fall inside this proposal's evidence-gathering window:

- **cc-0048** (`brand_payload_contract_unresolved`, 2026-07-20 15:30Z→2026-07-22, 312 rows total):
  CFW+invegent had no entry in image-worker's `CREATIVE_CONTRACT_REGISTRY`, so every `image_quote`
  render fail-closed before reaching Creatomate. Fixed by adding registry entries.
- **cc-0049** (`tmr_winner_unmapped: generic_quote_card_1x1_v1`, fixed 2026-07-23, 38 rows):
  invegent's winning template had no winner→field mapping. Fixed the next day.

`202+2=204` = CFW's exact reported failed count; `110+38=148` = invegent's exact reported failed
count — zero unexplained residual for either client. **Both clients have rendered `image_quote` at
~100% success for the 12 days since the cc-0049 fix** (modest volume, ~34 renders/12 days combined
— caveat noted). The decisive disconfirmation: **CFW already has its own dedicated background
asset (unlike invegent) and still failed at an equal-or-worse rate during the incident window**
(85% vs invegent's 78%) — a client that already satisfies the hypothesized cause and still exhibits
the effect rules out that cause. Control check: NDIS (registry-present throughout) ran 0% failure
in the same window, ruling out a platform-wide cause; PP's unrelated 24.1% fail rate is its own
separate, also-historical headline-length gate issue, not recurring in the 17 days prior.

Full evidence, per-incident counts, and control-group detail:
`docs/briefs/results/image-quote-reliability-diagnosis-result-v1.md`.

**What this changes, and what it doesn't:** this addendum corrects the *reasoning* in §3/§5/§6 —
it does **not** itself revise the proposed row counts in §3's table, §4's totals, or §7's
dashboard-outcome table. Those held CFW/invegent `image_quote` flat for a reason that no longer
applies, but re-opening image_quote capacity for either client is a distinct decision this
addendum does not make. **Recommended for the Phase-2 approval gate:** PK should decide whether to
(a) approve this proposal's existing text-only matrix as-is and treat an image_quote capacity
increase as a separate, later decision now that the reliability blocker is gone, or (b) fold an
image_quote increase into this same Phase-2 packet before it's authored. Either way, the "do not
expand — already over-drawn/already failing" framing in §3/§5's tables should be read as
superseded, not current, when this decision is made.

This addendum does not authorize any apply and does not touch the active 7-day monitoring watch
on the v11 apply (armed 2026-08-04 ~20:20 Sydney → 2026-08-11 ~20:20 Sydney, per
`docs/00_sync_state.md` v6.130) — no schedule/DB mutation is made here.
