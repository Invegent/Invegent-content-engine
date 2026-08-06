# Music Library — BATCH 2 four-brand fenced intake — Gate-1 packet **v3** (NOT applied)

**Status: DRAFT — awaiting PK aural + licence review. Nothing in this packet has been applied.**
**Lane:** music sourcing/intake, batch 2. Successor to the batch-1 starter harvest
(`docs/briefs/music-library-v0-manual-starter-harvest-brief.md`, gate1_approved 2026-07-09).
**Lane label (CCF-02):** PRODUCT_PROOF · **Tier: T2** (additive, fully-fenced, INSERT-only, no DDL,
no GRANT/REVOKE, no upsert — same shape as the batch-1 intake; the apply itself is a PK hard stop).
**Scope:** global `m.music_track` / `m.music_license` (project `mbkmaxqhsohbtwsqolns`).

**v3 supersedes v2 supersedes v1.** The packet was audited pre-freeze **three times** by
`apply-harness-auditor` (SHADOW MODE — its verdict clears no gate): v1 **CONCERNS/10** · v2
**CONCERNS/7** · v3 **CONCERNS/6, 0 high**. Runs 1 and 2 each closed findings while *introducing*
new ones; run 3 confirmed all seven run-2 fixes closed **in the executable text** (it declined to
credit §2a prose on its own) and found six more, all now fixed. v1's and v2's hashes are void;
nothing was reviewed or gated against them. Full history: §2a.

**Frozen artifacts (pin any review to these hashes):**

| Artifact | sha256 |
|---|---|
| `_harness/music_harvester_v1_20260806/music_v1_batch2_intake_apply.sql` | `97937388bf9990cde222cdc2891d142dc8890e64b75b2dce83e7e8d9083ed958` |
| `_harness/music_harvester_v1_20260806/music_v1_batch2_intake_rollback.sql` | `f1efe5a16178ccde24762bd765f2f54f510da34eee07fa4a8cc8ea108cb7e99b` |
| `_harness/music_harvester_v1_20260806/manifest.json` | `bbb6fde47e7c229a33b79ba48902895d015f1348700e9a8daf27b8cb10a037f2` |
| `_harness/music_harvester_v1_20260806/build_intake.py` (the generator — pinned per AHA-02-2) | `d386b1c1a734f9f0f21c336a7d15fff6e99ebcb3ba676549b22af3816dfcdd72` |

**Generator determinism proven:** regenerating both SQL files from the pinned manifest with the
pinned generator reproduces them **byte-identically**. The manifest → apply → rollback chain is
therefore checked, not merely asserted.

> **⚠ LINE-ENDING TRAP — read before verifying any hash above.** These four hashes are of the
> **LF** bytes as authored. This repo has `core.autocrlf` on, so a *fresh checkout* materialises
> these files with **CRLF** and every hash above will mismatch — the files are not corrupt, the
> encoding differs. The CRLF hashes are `085d42a4…` (apply), `a0b0d9fb…` (rollback), `43f66133…`
> (manifest), `62772a03…` (generator).
> **The git blob is authoritative** (git stores LF); verify with `git cat-file` or
> `git show HEAD:<path> | sha256sum`, not with a hash of the checked-out working copy.
> This is the same trap recorded against the `apply-harness-auditor` merge. It matters at **§6
> step 3** (regenerate-and-byte-diff) and for any `reviewed_input_hash` pinned by an external
> reviewer working from a different checkout.

Full sourcing narrative, exclusions and caveats: `_harness/music_harvester_v1_20260806/SOURCING_LOG.md`.

---

## 0. Headline — what this delivers, and what it deliberately does not

**Delivers:** 13 licence-clean CC0 instrumental candidates (keys `010`–`022`), downloaded, hashed,
licence-evidenced, manifested, and packaged as a fenced-intake apply **with a matching executable
rollback**. Mood weighting was chosen against the four brands' registers: uplifting ×5, warm ×4,
calm ×2, neutral ×2.

**Does not deliver — and cannot:**
1. **No track becomes selectable.** All 13 carry `content_id_safe=false` (fail-closed). Live
   `select_music` requires `content_id_safe IS TRUE` unconditionally, so the apply changes live
   render behaviour by exactly nothing.
2. **The corporate mood gap is NOT closed** — zero corporate tracks added; see §4. This is the
   honest shortfall of the batch, and it lands hardest on Invegent.
3. **No rotation.** `select_music` still returns one deterministic winner; pool growth does not
   create rotation. Unchanged, and not touched here.

## 1. The four brands and how the batch was weighted

`m.music_track` is a **GLOBAL pool with no `client_id`**. "Music for our four brands" therefore means
*a pool whose mood coverage serves all four*, not per-brand rows. Per-brand binding lives in
`m.music_suitability` + `c.client_music_profile`, which belong to the **scoped-approval gate, not
intake** — this packet writes neither, and the brand mapping in `manifest.json` is ADVISORY ONLY.

| Brand | Register wanted | Batch coverage |
|---|---|---|
| Property Pulse | Professional, credible, non-salesy — neutral/calm beds, restrained uplift on positive market data | 9 suggested |
| NDIS Yarns | Warmth + dignity; never clinical, never saccharine | 6 suggested |
| Care For Welfare | Warm, human, gentle | 7 suggested |
| Invegent | Neutral, composed, corporate-leaning | 5 suggested — **weakest covered; corporate is the missing mood** |

## 2. Declared control / assertion register

Controls fall into **three** classes, not two. Every earlier version of this packet collapsed them
and thereby over-claimed enforcement (AHA-02-1 run 1, AHA-02-1 run 2, AHA-01-1 run 3):

- **RAISE-backed asserts** — executable, and a breach aborts the transaction:
  **C-3, C-4, C-6, C-7, C-8, C-9, C-10, C-12, C-14, C-15, C-18, C-19.**
- **Non-asserting executable mechanics** — real SQL, but they cannot "fail" and have no `RAISE`:
  **C-1** (the transaction wrapper itself), **C-2** (baseline capture), **C-5** (a provenance
  *write*, not a check), **C-17** (the identity basis the asserts are keyed on).
- **Operator preconditions** — not executable at all: **C-11, C-13, C-16.**

The "Kind" column below carries these three values verbatim.

| # | Control | Kind | Enforcement site | Failure behaviour |
|---|---|---|---|---|
| C-1 | **Single-transaction atomicity** | executable mechanic (no RAISE) | one `BEGIN;` … `COMMIT;` around all 13 inserts + all asserts | any exception → whole batch rolled back |
| C-2 | **Baseline capture before ALL DML** | executable mechanic (no RAISE) | three `CREATE TEMP TABLE … ON COMMIT DROP` (`_music_intake_txn`, `_music_intake_baseline`, `_music_intake_counts`), all before the first insert | n/a (capture step) |
| C-3 | **Baseline is the expected pool** — exactly 1 selectable track, and it is `calm_piano_drifting_006` | executable | `DO $$`: count + `NOT IN` membership | `RAISE` → rollback. Catches "the live pool moved since authoring" |
| C-4 | **Per-object storage byte precheck** (×13) | executable | `PERFORM 1 FROM storage.objects WHERE bucket_id='post-music' AND name=… AND (metadata->>'size')::bigint = …` | `RAISE` → rollback if missing or wrong size |
| C-5 | **sha256-of-bytes recorded in every row** | executable mechanic (no RAISE) | `m.music_track.sha256` literal per insert | n/a — see AHA-01-2 in §2a for the residual gap |
| C-6 | **Idempotency** | executable | `WHERE NOT EXISTS (… track_key = …)` (×13) | re-run inserts nothing; asserts still pass (C-15 is delta-aware) |
| C-7 | **Fenced-count assert** — exactly 13 batch rows, all four fences off | executable | `DO $$` verify, scoped on the 13 `track_key`s (**not** on `notes` — AHA-01-3 run 2) | `RAISE` → rollback |
| C-8 | **1:1 licence-row assert** — no batch track without its licence row | executable | `DO $$` verify, `NOT EXISTS`, scoped on `track_key` | `RAISE` → rollback |
| C-9 | **v0 licence invariant** — every batch licence row `cc0`, `attribution_required=false`, `content_id_safe=false`, `commercial_use_allowed=true`, `social_use_allowed=true` | executable | `DO $$` verify, scoped on `track_key` | `RAISE` → rollback |
| C-10 | **Pool-neutrality** — selectable set after == baseline, BOTH directions | executable | `DO $$` verify, parenthesised `(A EXCEPT B) UNION ALL (B EXCEPT A)` over `pg_temp.` relations | `RAISE` → rollback |
| C-11 | **Pinned execution channel** — `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f <file>`; `apply_migration` **ruled out** (mints its own migration version + nests the transaction) | **operator precondition — NOT executably backed** | packet §6 + both SQL headers | Operator STOP only. **C-12 covers the SPLIT case only.** A *nesting* wrapper is undetectable from inside the file: temp relations survive and the txid is unchanged, so C-12 passes while this file's `BEGIN`/`COMMIT` silently join the outer transaction. After the fact it surfaces as an unexpected migration-ledger entry — a `db-rls-auditor` read |
| C-12 | **Split-channel guard** — temp relations present **and** `txid_current()` unchanged, asserted before the first write and re-checked at the end. Emitted in **BOTH** files (apply: before the first INSERT; rollback: before the first DELETE) | executable | `DO $$` immediately after baseline capture, in each file | `RAISE` → **nothing written** (v1 detected this only post-commit — AHA-05-1; v2 claimed it in the rollback header without emitting it — AHA-02-1 run 2) |
| C-13 | **Mandatory `BEGIN … ROLLBACK` rehearsal** on the live schema before the real apply | **operator precondition (mandatory STOP)** | §6 step 4 | rehearsal error → re-author → re-freeze → **the pinned hashes and any review against them are void** |
| C-14 | **Batch-marker consistency** — the `notes`-marker set equals the apply's own 13 `track_key` set | executable | `DO $$` verify, bidirectional `EXCEPT` | `RAISE` → rollback. **Scope note:** this proves marker ↔ *this file's* key literals. It does NOT bind the rollback file's independent key list — that congruence is established mechanically by the regenerate-and-byte-diff step (§6 step 3), not by C-14 |
| C-15 | **Additive-only** — `m.music_track` and `m.music_license` each grew by exactly `13 − pre_existing` | executable | `DO $$` verify against `pg_temp._music_intake_counts` | `RAISE` → rollback. Delta-based, so idempotent re-runs pass |
| C-16 | **Storage disposition on abort** — the 13 uploaded objects are **LEFT IN PLACE for re-attempt** (PK ruling 2026-08-06); removal, if the batch is abandoned, is a separate explicit operator step | **operator precondition** | rollback header | documented, not enforced |
| C-17 | **Rollback identity = the apply's identity** — rollback keyed on the same 13 literal `track_key`s, never on `notes`. The apply's own verify asserts (C-7/C-8/C-9) are likewise keyed on `track_key` | executable mechanic (no RAISE) | temp key table (`track_key` + `sha256`) + `JOIN … USING (track_key)` | n/a (identity basis; the asserts keyed on it do the raising) |
| C-18 | **Rollback preconditions** — ABORT rather than delete on any of: **(0)** cardinality — the key table did not load 13 rows, or fewer than 13 targets are present (without this, every rollback assert is satisfied *vacuously* by a zero-match run — wrong database, apply never committed, already rolled back — and reports success while deleting nothing: AHA-03-1 run 3); **(a)** any target row has left the fenced state; **(b)** any row exists in the four FK child tables; **(c)** any target row's `sha256` differs from the manifest value for that `track_key` (the apply *skips* a pre-existing `track_key` under C-6, so without this the rollback could delete a same-keyed row this batch never created: AHA-07-1 run 3) | executable | two `DO $$` preconditions before the first DELETE | `RAISE` → nothing removed. **(a) is the load-bearing half**: approval state lives in *columns* on `m.music_track` and no trigger forces a review-event row on a fence flip, so a child-only check would let the rollback delete an approved, selectable track (AHA-01-2 run 2, severity high) |
| C-19 | **Rollback is bounded and pool-neutral** — both tables fall by exactly the number of rows that MATCHED the key list; the selectable set is unchanged in both directions; the orphan count is exactly unchanged (the SQL enforces equality, not a one-sided bound) | executable | `DO $$` verify against four pre-DELETE baselines | `RAISE` → rollback. v2 baselined only a scalar orphan count, which could not detect an out-of-scope delete (AHA-06-1 run 2) |

### 2a. The `apply-harness-auditor` shadow runs and what changed

The packet was audited pre-freeze **twice**, in SHADOW MODE (its verdict clears no gate; every
specialist and PK gate runs unchanged above it).

**Run 1 on v1 — CONCERNS, 10 findings, 0 INCOMPLETE.** It independently confirmed the v1 C-10 fix
(parenthesised, genuinely bidirectional, baseline in scope, predicates byte-identical).

**Run 2 on v2 — CONCERNS, 7 findings, 0 INCOMPLETE.** It confirmed 7 of run 1's ten closed *in the
executable text* (it explicitly declined to credit §2a prose on its own), and found **two defects
the v2 fixes themselves introduced** — which is exactly why a re-authored harness gets re-audited.

Every load-bearing claim from both runs was verified against the live migration before being
accepted: 5 FK children of `m.music_track` (`…create_music_library_v0.sql:121,147,162,181,199`) ·
`notes` is bare `text` (`:108`) · `post-music` is created `public = true` (`:268-269`) · the v1
INSERT column list genuinely omitted all four fence columns · no trigger forces a review-event row
on a fence flip.

**Run 1 findings → fixed in v2:**

| Finding | Change |
|---|---|
| **AHA-05-1** split detected only post-commit | **C-12**: temp-relation + `txid_current()` guard **before** the first INSERT |
| **AHA-07-2** rollback keyed on mutable `notes` | rollback re-keyed on the 13 literal `track_key`s |
| **AHA-07-1** rollback non-atomic, ignored 4 FK children | rollback became a real transactional script with child-row preconditions |
| **AHA-07-3** storage residue undeclared | **C-16**: objects left in place for re-attempt (PK ruling) |
| **AHA-02-1** §2 falsely claimed all controls executable | register gained an explicit executable-vs-precondition column |
| **AHA-02-2** rehearsal only "recommended"; `search_path` risk | **C-13** mandatory STOP; all temp reads `pg_temp.`-qualified |
| **AHA-04-1** three channels named, none pinned | **C-11** pins `psql -f`; `apply_migration` ruled out |
| **AHA-01-1** fences inherited from DEFAULTs | four fence values written explicitly in all 13 INSERTs |
| **AHA-06-1** only the selectable set baselined | **C-15** row-count baseline, delta-aware |
| **AHA-01-2** C-4 discriminates on path+size only | residual, accepted; pre-upload sha256 re-verify added as §6 step 1 |

**Run 2 findings → fixed in v3:**

| Finding | Severity | Change |
|---|---|---|
| **AHA-01-2** rollback's validity window checked only child tables — approval state lives in *columns*, so a direct fence flip would pass the precondition and the rollback would delete an **approved, selectable** track | **high** | **C-18(a)**: fail-closed assert that every target row is still fenced, naming the offending keys |
| **AHA-02-1** v2 transplanted the apply's channel header into the rollback, claiming a guard "before the first INSERT" the rollback did **not** have — a prose-only STOP | medium | the header block is now **parameterised** by guard site, and **C-12 is genuinely emitted in the rollback** before the first DELETE |
| **AHA-06-1** rollback verify claimed "the surviving pool is untouched" but baselined only a scalar orphan count, which cannot detect an out-of-scope delete | medium | **C-19**: four pre-DELETE baselines — selectable set, both row counts, matched-row counts — with bounded-cardinality and bidirectional pool-neutrality asserts |
| **AHA-01-1** C-11 credited C-12 with executable backing; C-12 catches SPLIT, not NESTING | medium | C-11 reworded to state exactly what C-12 covers and to name the migration-ledger read as the only after-the-fact detection |
| **AHA-01-3** four apply asserts still scoped on `notes` while the rollback declared `notes` unreliable | low | C-7/C-8/C-9 re-scoped onto the 13 `track_key`s; the marker check survives as C-14, relabelled data-quality |
| **AHA-02-2** generator unpinned; no regenerate-and-diff | low | `build_intake.py` hash pinned; **byte-identical regeneration proven** and added as §6 step 3 |
| **AHA-07-1** C-14's rationale overstated what it proves | low | C-14 reworded; cross-file congruence now rests on the regenerate-and-diff step. (Run 2 statically compared all five materialisations of the 13-key list and found **no divergence** in the frozen text) |

**Run 3 findings → fixed (this version):**

| Finding | Severity | Change |
|---|---|---|
| **AHA-03-1** every rollback assert was satisfiable by a **zero-match run** — wrong database, apply never committed, or an under-populated key table would all exit clean while deleting nothing | medium | **C-18(0)** cardinality floor: the key table must load 13 and all 13 targets must be present |
| **AHA-06-1** the one unqualified temp **write** (`INSERT INTO _music_rollback_keys`) resolved through `search_path` while every read was `pg_temp.`-qualified — the concrete mechanism that made a zero-match run reachable | low | write now `pg_temp.`-qualified; §2b claim widened from "reads" to "references" |
| **AHA-07-1** the apply *skips* a pre-existing `track_key` (C-6) but the rollback deleted all 13 unconditionally — it could remove a same-keyed row this batch never created | low | **C-18(c)** sha256 provenance assert per target row |
| **AHA-01-1** the §2 lead sentence promised `RAISE` backing for C-2, C-5 and C-17, which the table itself contradicted — the same over-claim class as runs 1 and 2, one layer up | medium | register split into **three** classes; the Kind column now carries them verbatim |
| **AHA-01-2** C-19 said "no worse than found" while the SQL enforces exact equality | low | C-19 reworded to match the SQL (which is the stricter, safer form — kept as-is) |
| **AHA-01-3** the generator and both emitted headers still self-identified as **v2** and credited only the run-1 audit | low | headers and generator docstring bumped to v3 with the full three-run change list; all four hashes re-frozen |

Run 3 also positively verified, rather than assumed: the rollback's new baseline arithmetic is exact
(`track_key` is `NOT NULL UNIQUE`; `m.music_license.track_id` is the PK referencing the parent, so
1:1 holds) · the `track_key` re-scoping of the apply's asserts is **strictly stronger** than the
`notes`-scoped version · every `RAISE` placeholder count matches its argument list, with no residual
`%%` · precondition (a)'s `string_agg` cannot be NULL-swallowed, because all four fence columns are
`NOT NULL` in the migration.

Two defects I found myself during v1 authoring are also recorded: the `EXCEPT`/`UNION ALL`
left-associativity bug in C-10 (proven live — unparenthesised returned 0 where parenthesised
returned 1), and a `%%` in a `RAISE` format string.
### 2b. Known harness limitation (declared, not waived)

**Neither SQL file has been executed against any database, not even `BEGIN … ROLLBACK`** — the watch
holds DB writes and a trial transaction is still a write attempt. The controls are verified
**statically**: 1 `BEGIN`/1 `COMMIT` per file · 13 prechecks · 13 track + 13 licence INSERTs ·
13 idempotency guards · 16 balanced `DO $$`/`END $$;` in the apply and 6 in the rollback · 25 and 13
`RAISE EXCEPTION` guards, **every one with a matching `%`-placeholder/argument count** · fence literals in all 13 INSERTs · zero `notes`-scoped identity predicates
in the rollback · no `UPDATE`/`DELETE`/`ALTER`/`GRANT`/`REVOKE`/`ON CONFLICT` in the apply (the only
`DROP`s are `ON COMMIT DROP` on temp tables) · every temp **reference** `pg_temp.`-qualified (reads *and* the identity write — AHA-06-1 run 3) · balanced
quoting · 2 `DELETE`s and both preconditions in the rollback. Plus the live read-only proof of the
C-10 set-logic and the byte-identical regeneration proof.

That is sufficient for presence, shape, balance and fail-closed wiring. It is **not** sufficient for
live column/type existence, live CHECK/DEFAULT drift, temp-relation visibility under the real
session, or the `storage.objects.metadata` shape. **C-13 (the mandatory rehearsal) is the named
compensator for exactly those gaps** and is a STOP, not a suggestion. Run it against **both** files.
## 3. What the apply does NOT touch

No DDL (temp tables only). No `GRANT`/`REVOKE`. No upsert / `ON CONFLICT`. No fence flipped, no
`content_id_safe` set. No `m.music_review_event`, `m.music_suitability`, `m.music_track_tag`, or
`c.client_music_profile` row. No `select_music` change. No `video-worker` change, no
`VIDEO_WORKER_MUSIC_ENABLED` change. No bucket created or repurposed. No Creatomate/render wiring.

**Coverage note (AHA-06-1):** C-10 asserts pool-neutrality and C-15 asserts additive-only row
counts. The remaining claims in this section are a **design property of the SQL** (it contains only
INSERTs) rather than machine-asserted invariants — do not read them as executably checked.

## 4. The corporate gap — the one thing PK should decide on

Zero corporate-mood tracks were added. The mood stays at 1 (`corporate_theme_medieval_008`, already
flagged in the gate-1 completion packet as a probable mis-tag). **Corporate beds are not harvestable
from FMA CC0**; they live on Pixabay Music and the YouTube Audio Library, both of which require a
human (Pixabay re-tested 2026-08-06: HTTP 403 Cloudflare; YAL needs a Studio login).

Closest substitute in the batch: **`uplifting_lofi_walkingaway_013`**, source-tagged
*"Peaceful, Motivating"*. PK may elect `mood='corporate'` for it at the aural gate.

**Carry finding:** FMA's own `music-filter-CC0=1` search parameter is **unreliable** — it surfaced
five CC BY-ND / CC BY-NC-ND albums as "CC0". All were caught by per-album licence verification and
excluded before download. Standing rule for future music lanes: read the `creativecommons.org/...`
URL off each track page; never trust the filter.

## 5. Open questions for PK (Gate 1)

1. **Aural verdict** — listen to the 13 in `_harness/music_harvester_v1_20260806/candidates/` and
   cull/confirm. Facets are harvester guesses; your verdict is authoritative.
2. **Corporate** — accept the gap, re-tag `uplifting_lofi_walkingaway_013` as corporate, or
   hand-source corporate beds from Pixabay/YAL yourself (§4)?
3. **All-lo-fi register** — acceptable as the batch's identity, or should a non-lo-fi register be
   hand-sourced for Property Pulse / Invegent?
4. **Watch interaction** — this packet is harness-only and applies nothing, so it does not touch the
   Phase-1 watch's no-DB-writes constraint. Confirm whether the **apply** waits for watch expiry
   (~2026-08-11 20:20 Sydney) or is authorised earlier as an off-schedule, pool-neutral intake.
5. **Content-ID** — run the cc-0039 check on any of these 13, or keep the batch fenced-but-
   unselectable until the existing 7 candidates are resolved first?

## 6. Gate — the ordered apply sequence

Each step is a STOP on failure.

1. **Pre-upload sha256 re-verify** (AHA-01-2 run 1) — confirm each local file's hash still matches
   `manifest.json`, with particular attention to the two sharing byte count 5,907,043
   (`uplifting_lofi_bubbles_014`, `calm_lofi_calmcurrents_019`), so an upload swap cannot pass C-4.
2. **Upload** the 13 objects to `post-music/global/<mood>/<track_key>.mp3`.
3. **Regenerate-and-byte-diff** (AHA-02-2 run 2) — re-run the pinned `build_intake.py` against the
   pinned `manifest.json` and byte-compare both SQL files against the frozen hashes. Any diff →
   re-freeze, hashes void. This is what binds the apply's and the rollback's key lists together;
   C-14 alone does not (see its scope note).
4. **C-13 mandatory rehearsal** — run **both** files as `BEGIN … ROLLBACK` on the live schema via
   the pinned channel. Any error → re-author → re-freeze → **hashes and any review against them are
   void**. This is the named compensator for everything §2b says static analysis cannot reach.
5. **Reviews, concurrent** — `db-rls-auditor` (live schema/defaults, bucket privileges,
   `storage.objects.metadata` shape, the C-3 baseline claim, and whether approval flows in practice
   always write a `m.music_review_event` row — the assumption behind C-18(b)) · `branch-warden`
   (HEAD/parity) · external review pinned to the apply hash above.
6. **PK apply gate** (hard stop).
7. **Apply** via the pinned channel:
   `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f music_v1_batch2_intake_apply.sql`.
8. **Live readback** — confirm 13 fenced rows, 13 licence rows, and `select_music` still returns
   exactly `calm_piano_drifting_006`.
9. **Post-apply channel check** — read the migration ledger and confirm **no** new migration version
   was minted. This is the only after-the-fact detection of the nesting-wrapper case C-12 cannot
   catch (C-11).

Approval, fence-flip, scoped suitability, and Content-ID clearance remain separate later gates.
