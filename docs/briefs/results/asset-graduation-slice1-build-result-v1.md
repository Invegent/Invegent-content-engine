CLAIMED · asset-graduation-slice1 · main-checkout `C:\Users\parve\Invegent-content-engine` · built, uncommitted · 2026-07-30

# Result — Asset Graduation Slice 1: `asset-graduation-check` · ✅ BUILT + PROVEN ON REAL DATA

**Date:** 2026-07-30 Sydney · **Lane:** SAFETY_GATE · **Tier: T2**
**Gate 1:** APPROVED by PK 2026-07-30, all five open decisions ratified.
**Contract:** `docs/briefs/asset-graduation-contract-v1.md`
**Packet:** `docs/briefs/asset-graduation-backgrounds-slice1-build-packet-v1.md`
**Base:** CE `main`, HEAD `4e7dfa6`, parity ahead 0 / behind 0.
**State:** three files created, **uncommitted and unpushed**. No DB object, no production mutation,
no asset state change, no sourcing batch. All DB access this session was read-only SELECT via
`execute_sql` (project `mbkmaxqhsohbtwsqolns`) — zero writes performed at any point.

> **Outcome in one line:** the mechanical half of asset graduation is now executable, proven against
> **85/85 hermetic tests** and a **live shadow batch of 15 real production/candidate assets** across
> Property Pulse and Invegent. All four required historical defect classes are caught; a live
> `db-rls-auditor` pass found and this session fixed two real schema mismatches and one real reason-
> code mislabelling before they could reach production; the corrected evaluator parses real data
> correctly, classifies ownership correctly across all reachable states, and produces byte-identical
> output across repeated runs. It grants no production eligibility and clears no gate.

---

## 1. What was built

| File | Role |
|---|---|
| `.claude/helpers/asset-graduation-check.mjs` | The evaluator: pure core + thin read-only CLI shell |
| `.claude/helpers/asset-graduation-check.test.mjs` | **85** hermetic tests, inline fixtures, no network/DB |
| `docs/briefs/artifacts/asset-graduation-candidates-v1.sql` | Hash-pinned read pack — one SELECT, SELECT-only |

Exactly the three files PK authorised. No migration, no DB object, no `ice_ro` view, no worker or
resolver change.

## 2. The four required defect-class proofs — all caught, all still hold after every correction below

| # | Defect class | Result |
|---|---|---|
| 1 | False declared pool — `safe_for_text_overlay='needs_gradient_scrim'` | `FAILED` / `text_safety_unknown`, `resolver` origin |
| 2 | ~32 % retained crop / upscale — 1920×1080 → 1080×1920 | `FAILED` / `upscale_required`, geometry reproduces 31.64 % retained, 1.7778× upscale exactly |
| 3 | Phantom shared asset — no `client_asset_pool_policy` row | `FAILED` / `shared_pool_unreachable`, ownership `shared_unreachable` |
| 4 | `client_brand_asset.is_active` default-open | `FAILED` / `fence_open_on_intake`, hoisted above every other check |

## 3. `db-rls-auditor` schema pass — verdict `concerns`, three real defects, all fixed before first run

Run against the exact read pack file, live `pg_catalog` (R0 wrapper) + read-only `execute_sql`. Full
findings preserved verbatim below §3's table; every `must_fix` item was corrected in the pack and/or
evaluator, then re-verified against the same live data.

| # | Finding | Fix |
|---|---|---|
| 1 | **`c.client_asset_pool_policy` has NO `permitted_scopes` column.** Real shape: `pool_policy` + two booleans `allow_vertical_shared` / `allow_global_shared`, matched against `governance_scope` (`global_generic`/`vertical_shared`/`purpose_bound`). The evaluator's original design would have waited forever on a key that can never appear. | `classifyOwnership` rewritten against the **live deployed `resolve_slot_assets`** (`pg_get_functiondef`, not the migration file): derives the permitted set from the two booleans exactly as the live function does; `governance_scope='purpose_bound'` is structurally excluded under any policy (confirmed from the function's own construction, not inferred) |
| 2 | **Silent-empty-result bug.** `shared_candidates` filtered `asset_kind='image'`; the live CHECK is `('static_background','logo','image','video_broll')` and **all 14 live rows are `'static_background'`** — the pack returned ZERO shared candidates with no error, exactly the class of defect its own header claims is impossible. | Filter corrected to `'static_background'`; evaluator's kind check normalises both tables' native vocabularies (`image`/`static_background` ≡ static, `video`/`video_broll` ≡ video) |
| 3 | `asset_kind` hardcode (`'image'`) on `c.client_brand_asset`, which has no such column at all — protected today only by the usage filter, fragile if that filter ever widens. | Derived from `asset_meta->>'mime'` (present on 40/57 background + all 7 broll rows), with `usage` as a fallback only when mime is absent; an unresolvable kind is `NULL`, reported as a gap, never guessed as `'image'` |

**Should-fix, applied:** provenance keys re-pointed to the names actually populated (`provider`→
`source_platform`/`source_site` fallback, `provider_asset_id`→`source_pexels_id`, `author`→
`photographer`/`creator`, `pk_exception`→`pk_decision`/`pk_design_approval`), each with the original
key kept as a fallback.

**Named, disclosed, NOT modeled:** the live function's shared-asset gate also checks a per-row
`purpose_bound` **boolean** column, `vertical_key` match, and `allowed_clients`/`excluded_clients`
membership. The read pack does not select these and `SHARED_POOLED` does not verify them — stated in
the evaluator's `POSTURE` array on every result, not silently assumed complete.

## 4. A second live-truth correction, found reading the deployed function body directly

Reading `pg_get_functiondef(resolve_slot_assets)` (not the base migration file — the two have already
diverged at least twice in ICE history) surfaced that **usage admission is conditional on the target
template's Background field type**, not a fixed set: `usage='broll_background'` **is** a real,
live-admitted resolver literal for a video-typed Background field. My first draft would have labelled
every real B-roll row `usage_not_resolver_eligible` — falsely implying the resolver universally
excludes it, when the true reason is that Slice 1 itself only evaluates static images.

**Fixed:** `usage_not_resolver_eligible` (renamed per PK's explicit instruction, and clearly labelled
`GRADUATION` origin — never dressed as a resolver literal) now fires **only** for a value truly outside
`{'background','broll_background','logo'}` — invisible under every target. A real `'broll_background'`
or `'logo'` value instead fails `slot_contract_mismatch`, with wording that states in the detail itself:
*"a real, live-admitted resolver literal... this is a Slice-1 SCOPE decision, not a resolver-eligibility
defect."* Verified on real data in §6.

## 5. Live shadow batch — 15 real assets, Property Pulse + Invegent

**Method.** The frozen read pack was executed twice via `execute_sql` (parameters substituted inline,
file unmodified) — once for `property-pulse`, once for `invegent` — because shared-asset reachability
is inherently relative to the target client, and Property Pulse has **no** `client_asset_pool_policy`
row at all (confirmed live), so it cannot by itself demonstrate a *reachable* shared asset. One
additional real row (a governed, already-eligible PP B-roll clip, `broll_pp_au_suburb_aerial`) was read
via a labelled diagnostic SELECT to supply a second real B-roll example, since only one PP B-roll row
was still fenced. **No candidate was invented; every row is a real, live table row, queried read-only.**

| Requirement (PK) | Met with |
|---|---|
| ≥2 PP image backgrounds | `bg_pp_for_sale_sign_street`, `bg_pp_transaction_keys_contract` — real fenced candidates |
| ≥2 PP B-roll assets | `broll_pp_perth_skyline` (fenced) + `broll_pp_au_suburb_aerial` (real, live, already-eligible) |
| ≥1 correctly reachable shared asset | 9 real fenced global_generic shared rows, evaluated under **Invegent's** real permissive policy (`allow_global_shared=true`) → `shared_pooled` |
| ≥1 fence/reachability issue | the **same 9 real rows**, evaluated under **Property Pulse's** real absent-policy context → `shared_unreachable` |

The last two rows are the same underlying assets in two different, both-real client contexts — the
cleanest possible demonstration that reachability is relative to the target client, using no
manufactured data at all.

### 5.1 Required evidence — all met

| # | Requirement | Result |
|---|---|---|
| 1 | Real rows parse successfully | 15/15, zero parse errors |
| 2 | Ownership classification correct | `{client_owned: 4, shared_pooled: 2, shared_unreachable: 9, indeterminate: 0}` — the two `shared_pooled` and two of the nine `shared_unreachable` are the **same two asset rows**, correctly differentiated by target-client context |
| 3 | Geometry values plausible | retained-area figures 56–75 % across real image dimensions (e.g. 1920×1440→1080×1080 = 66.67 %), all internally consistent with the stored width/height |
| 4 | Reasons map to resolver literals or labelled graduation checks | distribution: `provenance_incomplete` ×8, `licence_ambiguous` ×6, `fence_open_on_intake` ×1 — all `graduation` origin, all correctly labelled; **C7's corrected `slot_contract_mismatch` fires as a genuine secondary finding on both real B-roll rows** (confirmed by inspecting `checks.C7` directly — see §5.2), even where an earlier-priority check wins the headline reason |
| 5 | No asset state changes | zero writes any point; verified read-only throughout |
| 6 | C12 visibly `not_evaluated` | present and printed on every run, including this one |
| 7 | Deterministic across repeats | **byte-identical** `diff` across 4 separate runs (2 before the provider-derivation fix in §6, 2 after) |

### 5.2 The scope-check correction, verified on real data

```
broll_pp_au_suburb_aerial  (real, live, already-eligible PP B-roll clip)
  winning reason: fence_open_on_intake   (see §7 scope note)
  C7 (independently): FAIL slot_contract_mismatch —
    "asset_meta.usage='broll_background' IS a real, live-admitted resolver
     literal — for a VIDEO-typed Background field. Slice 1 governs STATIC
     image backgrounds only (B-roll video is Slice 5). This is a Slice-1
     SCOPE decision, not a resolver-eligibility defect."

broll_pp_perth_skyline  (real, fenced PP B-roll candidate)
  winning reason: provenance_incomplete
  C7 (independently): FAIL slot_contract_mismatch — identical wording
```

Both real B-roll rows are correctly identified as out-of-scope video assets, with the exact corrected
wording from §4, regardless of which check ultimately wins the row's headline reason.

## 6. A real bug found and fixed via the live shadow batch — provider identity

Before any fix, **every** real asset failed uniformly with `provenance_incomplete`. Investigating why
found a genuine defect, distinct from the schema issues in §3: `c.shared_creative_asset` **never**
populates a dedicated `provider` field on any of the 9 real rows read — only `licence_name` (`'pexels'`,
`'wikimedia_cc0'`) identifies the source. `checkRights` hard-required a field the table structurally
never has.

**Fixed:** `provider` is now derived from `licence_name` when the dedicated field is absent (`'pexels'`,
`'unsplash'`, `'wikimedia'` patterns recognised), with the dedicated field always taking precedence
when present. **Deliberately NOT relaxed:** `provider_asset_id` and `commercial_use_permitted` stay
hard requirements — real data shows most rows genuinely lack them, and that is an authentic,
contract-grounded (`§4` point 3, `§4.4`) provenance-completeness finding about the corpus, not a false
positive to paper over. Per PK's explicit instruction, this run does not manufacture a failing asset —
and it does not manufacture a passing one either. Six real rows now correctly progress past provider
identification to fail on `licence_ambiguous` (commercial-use affirmation genuinely unrecorded),
proving the fix specifically and narrowly closed the intended gap.

**5 new tests added** covering: absent-provider-but-recognised-licence-name (passes), unsplash/wikimedia
pattern recognition, absent-provider-and-unrecognised-licence-name (correctly fails), a dedicated field
always overriding the derivation (regression guard), and `provider_asset_id` remaining a hard, disclosed
requirement.

## 7. Scope note, disclosed rather than silently absorbed

`broll_pp_au_suburb_aerial` is a **real, live, already-eligible** production asset (`is_active=true`,
`approved=true`) — not a pending candidate. Slice 1's fence check (C14) is designed to confirm a
**candidate** row is correctly fenced; feeding it an already-graduated row correctly reports
`fence_open_on_intake` because the fence genuinely is open — but the *reason* is legitimate prior PK
graduation, not an intake defect. This is not a false positive (the fence state is truthfully reported)
but the label could be misread as implying a defect in a row that has none. **Recorded here rather than
silently treated as proof of a problem in that asset.** C7's independent, correct `slot_contract_mismatch`
finding on the same row (§5.2) is Slice 1's substantive verdict on it; C14 is answering a narrower,
different question (fence correctness for candidate-state rows) that doesn't quite apply to an
already-live asset.

## 8. Other required proofs (unchanged from the first build)

| Requirement | How it is proven |
|---|---|
| Unknown/missing data fails closed | `not_run` never counts as `pass`; malformed payloads → `INCOMPLETE` |
| Advisory output cannot mutate eligibility | source-level assertions ban every write/DB/network/git API; exactly one fs import (`readFileSync`) |
| Rollback = deleting three files | no DB object, no production surface |
| C12/C13 explicitly not evaluated | stamped on every asset and at batch level, always printed |

## 9. PK rulings, as encoded (unchanged, now proven on real data)

R1 judgment framework, no DB object · R2 60 % floor + actual percentage always reported (real retained
figures 56–75 % printed on every real row) · R3 no auto-graduation, future path preserved (contract
§9.1) · R4 prompted batch read only (two real `execute_sql` calls this session, zero widened access) ·
R5 shared pool day one, 4-way ownership (proven correct on the same real asset under two real client
contexts).

## 10. Boundaries honoured

- ✅ No DB object, migration, DDL, DML, GRANT, or deploy — every DB interaction this session was a
  read-only `SELECT` via `execute_sql`.
- ✅ No production mutation, no asset-state change, no fence flipped, no sourcing batch.
- ✅ No change to `resolve_slot_assets`, `select_template`, any worker or template.
- ✅ No widened SQL access beyond the two disclosed, hash-reproducible prompted reads.
- ✅ Nothing committed or pushed.
- ✅ `requires_pk_visual_review` defaults **true** on every one of the 15 real assets (none carried a
  matching prior-approval record).

## 11. Non-claims

- ❌ Not claimed: this batch's specific 15 assets are contract-ready. All 15 correctly FAILED — that is
  the evaluator working, not a defect to fix.
- ❌ Not claimed: the corpus-wide `provenance_incomplete`/`licence_ambiguous` pattern is fixed. It is a
  genuine, disclosed finding about the corpus's current metadata completeness — a candidate future lane
  (metadata backfill), not something this build resolves.
- ❌ Not claimed: `purpose_bound` (boolean), `vertical_key`, or `allowed_clients`/`excluded_clients` are
  modeled for shared-asset reachability — named gap, disclosed in the evaluator's own `POSTURE`.
- ❌ Not claimed: `declared == reachable` (C12) is checked anywhere in Slice 1. Deliberately not.
- ❌ Not claimed: a clean sheet is an approval, or that this run's `FAILED` verdict is itself a rejection
  of any asset for production — the evaluator decides nothing; PK's visual verdict is the only
  deciding act, unaffected by anything in this document.
- ❌ Not claimed: the C14 fence-check nuance in §7 is a defect requiring a fix before commit — it is a
  disclosed scope note about evaluating an already-graduated asset through a candidate-only lens.

## 12. Chain status

| Step | State |
|---|---|
| Hermetic tests | ✅ **85 / 85 pass** |
| `db-rls-auditor` schema pass | ✅ **complete** — `concerns`, 3 must-fix + 3 should-fix, all applied |
| Live shadow batch (15 real assets, 2 clients) | ✅ **complete** — all 7 required evidence items met |
| Read pack SELECT-only static check | ✅ 1 statement, zero DML/DDL tokens (re-verified post-fix) |
| Determinism across repeats | ✅ byte-identical across 4 runs |
| `ask_chatgpt_review` pinned to final hashes | ⛔ **pending** — next step |
| `branch-warden` | ⛔ **pending** — after review |
| **PK gate 2 (commit)** | ⛔ **pending — the hard stop** |

## 13. Stop condition

**Not yet met — external review and `branch-warden` remain.** Per PK's explicit instruction: continue
in the current session, do not commit. Next: pin `ask_chatgpt_review` to the final hashes of the
evaluator, tests, read pack, contract, and this result record; then `branch-warden` against
`origin/main`; then stage only this lane's declared files, commit and push on PK's word, preserving
every unrelated working-tree change untouched.
