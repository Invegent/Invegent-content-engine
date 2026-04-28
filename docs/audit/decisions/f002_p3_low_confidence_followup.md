> **STATUS UPDATE 2026-04-28 evening (4th shift): RESOLVED via joint operator+chat session — SPLIT decision** for the 3 payload_hash columns.
>
> Migration applied: `20260428100257_audit_f002_low_confidence_joint_resolution`.
>
> **Resolutions (SPLIT):**
> - `f.raw_content_item.payload_hash` → **DEPRECATED.** DEFERRED until 2027-04-30, schedule column-drop in future schema cleanup pass. Rationale: 0 of 2,124+ rows populated; ingest-worker never implemented payload-hash dedup; deduplication is achieved via `url_hash` and downstream `content_hash` on `f.canonical_content_body`.
> - `f.raw_metric_point.payload_hash` → **KEEP** as designed-but-unimplemented. Tightened existing purpose to add "currently unwritten — designed but not implemented; reassess when analytics ingestion activates and Phase 2.1 insights-worker begins populating raw_metric_point". Empty table (0 rows); reassess at Phase 2.1 activation.
> - `f.raw_timeseries_point.payload_hash` → **KEEP** as designed-but-unimplemented. Same treatment as raw_metric_point. Empty table; reassess when time-series infrastructure activates.
>
> **Why split:** raw_content_item has 2,124+ rows that demonstrate the dedup design wasn't implemented. raw_metric_point and raw_timeseries_point are empty future analytics infrastructure where the dedup design might still be implemented when the tables go live.
>
> File kept as historical record of the split decision per operator instruction. Original deferral content below.
>
> ---

# F-002 Phase C — LOW-confidence column followup

**Status:** Backlog — awaiting joint operator + chat session
**Source:** chat sanity-check + ChatGPT review of CC's Phase C output, 28 Apr 2026 evening
**Originating finding:** F-2026-04-28-D-002 (closed-action-taken)
**Related migration:** `supabase/migrations/20260428080943_audit_f002_p3_column_purposes_corrected.sql`
**Related followups:** `docs/audit/decisions/f002_p1_low_confidence_followup.md`, `docs/audit/decisions/f002_p2_low_confidence_followup.md`

---

## Why this row is deferred

CC produced 28 effective P3 column purpose proposals (after excluding 1 surrogate-key UUID). Per the Phase A and B discipline, CC self-flagged 1 of them as LOW-confidence and isolated it in the proposals' Deferred section rather than carrying it into the draft migration. The discipline pattern continues to work as intended.

---

## The 1 deferred column

### `f.raw_content_item.payload_hash`

- **Type:** text · **Nullable:** true · **FK:** none
- **Current state in DB:** column exists, **0 of 2123 rows populated** (payload IS populated)
- **Schema clue conflict:** the table_purpose names `payload_hash` as a dedup key alongside `url_hash`, but in actual data the column is NULL on every single row while `payload` itself is populated 100%. Either:
  1. **Designed-but-unimplemented payload-dedup feature** — the ingest-worker doesn't currently compute or write the hash; the column was added in anticipation of a future dedup pass that hasn't been built
  2. **Deprecated column** — superseded by url-based dedup or by upstream content_hash logic on `f.canonical_content_body`; column was left in place but is no longer written
- **CC's reasoning:** "designed-but-unimplemented feature, or column to deprecate. Operator call."
- **Suggested next step (one of three):**
  1. **Confirm designed-but-unimplemented** — update column purpose accordingly with a `(currently unwritten)` qualifier; possibly schedule the dedup-by-payload-hash work as a future pipeline brief
  2. **Confirm deprecated** — mark with `DEFERRED until YYYY-MM-DD: deprecated, remove in future schema cleanup` per the audit slice 1 escape hatch
  3. **Confirm deprecated AND drop** — schedule a column-drop migration; if `f.raw_content_item.payload_hash` goes, the related MEDIUM-confidence rows on `f.raw_metric_point.payload_hash` and `f.raw_timeseries_point.payload_hash` (both empty tables, both currently documented as "hash digest for dedup on re-ingest") should be reconsidered

---

## Related rows worth revisiting at the same time

During CC's review, two parallel `payload_hash` columns were noted:

- `f.raw_metric_point.payload_hash` — documented as MEDIUM in the applied migration; table is entirely empty (0 rows total), so cannot observe whether the column would be populated in practice
- `f.raw_timeseries_point.payload_hash` — documented as MEDIUM in the applied migration; table is entirely empty (0 rows total), same situation

If `f.raw_content_item.payload_hash` resolves to deprecated, these two should likely be deprecated alongside, since the dedup-on-payload-hash design appears not to have been implemented anywhere.

---

## How to close this followup

In a future session, PK and chat sit together and:

1. PK confirms which of the three options is correct for `f.raw_content_item.payload_hash`
2. Apply a small migration with either the corrected column purpose, a DEFERRED marker, or a column-drop
3. If deprecating, apply the same treatment to `raw_metric_point.payload_hash` and `raw_timeseries_point.payload_hash`
4. Update `docs/audit/runs/2026-04-28-data.md` closure note for F-002 Phase C to reflect resolution
5. Delete this file (its job is done)

The Phase A and B followup files track 4 + 1 = 5 separate columns. All three followups can be resolved in the same operator session, or independently.

---

## Why this pattern matters

Phase A: 4 LOW rows (CC's first attempt, fixed mid-flight)
Phase B: 1 LOW row (CC self-applied discipline; sat in Deferred only)
Phase C: 1 LOW row (CC self-applied discipline; sat in Deferred only)

Forward discipline is now stable: LOW rows go to Deferred + followup file, never silently dropped, never carried into migration. The audit recurrence prevention (slice 1, PENDING_DOCUMENTATION sentinel + 14-day grace + DEFERRED escape hatch) means a future audit cycle won't re-flag these columns as undocumented — they're explicitly tracked as deferred.
