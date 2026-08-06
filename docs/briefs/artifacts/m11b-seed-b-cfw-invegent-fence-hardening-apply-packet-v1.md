# Apply Packet — M11b Seed B: CFW + Invegent carousel fence-hardening + retirement records (v1)

**Status: DRAFT / NOT FOR APPLY.** Authored under the PK-approved Gate-1 brief
`docs/briefs/m11b-seed-b-cfw-invegent-fence-hardening-gate1-brief-v1.md` ("approved as drafted,"
v6.147 §2.4). Requires its own `db-rls-auditor` fresh pass at execution time, external review pinned
to its frozen hash, `branch-warden` safe, and an explicit PK apply gate. **No SQL below has been
executed. Applies stay watch-gated** (v6.140, ~2026-08-11 20:20 Sydney) unless PK separately elects to
expedite.

## 1. Fresh live pre-checks (2026-08-06, `execute_sql` SELECT-only, project `mbkmaxqhsohbtwsqolns`)

| # | Check | Result |
|---|---|---|
| CFW `client_id` (fresh lookup, not trusted from any prior citation) | `c.client` WHERE `client_slug='care-for-welfare-pty-ltd'` | **`3eca32aa-e460-462f-a846-3f6ace6a3cae`** |
| CFW `c.client_format_config` current rows | | Exactly 2: `image_quote` (`d1aa225e-4678-4c43-a91f-6d2fc46a5619`, `is_enabled=true`) + `text` (`f0c12fc7-1505-4ec3-802e-da606a744bea`, `is_enabled=true`), both created/updated `2026-08-02 04:55:33.155490+00` — unchanged since containment |
| Invegent (`93494a09-cc89-41d1-b364-cb63983063a6`) `c.client_format_config` current rows | | Exactly 2: `image_quote` (`8dd229ec-82a0-4d74-afe9-b4b365d18c11`, `is_enabled=true`) + `text` (`3ca24656-c419-4f5a-9626-d785e5a9863c`, `is_enabled=true`), same timestamp — unchanged |
| Either client already has a `carousel` row in `c.client_format_config`? | | **No** — idempotency clean, both clients |
| Either client already has a `carousel` row in `c.client_creative_governance`? | | **No** — both clients currently carry exactly ONE governance row each, both `format='image_quote'` (CFW: `7ee8d838-078c-42e8-ade3-fe2b99bb2790`, `declarative_registry_ref='care-for-welfare.json'`; Invegent: `ac5d2caa-6c44-4caa-a80a-d08964948e72`, `declarative_registry_ref=NULL`), both `enabled=true`, both created 2026-07-20 — unrelated to carousel, idempotency clean for this packet's target row |
| CFW/Invegent carousel drafts/renders/publishes since 2026-08-02 | | **0 for both**, exact-match re-verified after an initial `ILIKE '%carousel%'` substring pull returned 5 false-positive `post_draft` rows (the AI's free-text `format_reason` merely *mentioned* carousel while explaining why it rejected the format, e.g. "no multi-point structure exists to justify a carousel" — actual `format_decided`/`recommended_format` on every one of those 5 rows was `image_quote` or `text`). **Methodology note for any future re-run of this check: use exact-match on `requested_format`/`final_format_authority`/`recommended_format`/`draft_format->>'format'`, never a bare `ILIKE` substring — it produces false positives from rejection-reasoning text.** |
| `tmr-drift-probe` current status | | **`error`**, 3/3 recent runs — SAME 4 pre-existing causes as Seed A's packet §1 (NDIS pattern-not-found, CFW 404, Invegent+PP `declarative_registry_ref_missing`) — see §2 below for why this packet cannot change that. |

## 2. Drift-probe impact of THIS packet's TWO new `enabled=false` rows — computed, not assumed

Same mechanism as the Seed A packet: `fetchGovernedClients()` filters `.eq("enabled", true)`. Both new
rows this packet proposes (CFW `carousel`, Invegent `carousel`) are **`enabled=false`** — neither will
ever be read by `fetchGovernedClients()`, neither can reach `fetchDeclarativeRegistry()`. The probe is
already `status='error'` today from 4 unrelated pre-existing causes (§1); this packet's two new rows
are invisible to the probe by construction, so **post-apply status remains byte-identical `error` with
the same 4 causes** — same conclusion as Seed A, independently re-derived for this packet's own rows,
not copy-pasted. This resolves the brief's own open question 2 (tmr-drift-probe side-effect
acceptance) as **moot for this specific design** — there is no new side effect to accept, since
`enabled=false` rows produce none. (Open question 2 remains meaningful only if PK later wants the
governance rows `enabled=true` instead — not what this packet proposes, and not recommended, since
`enabled=true` would misrepresent these as declared-legacy-*live* when neither route is live.)

## 3. Fence-hardening mechanism — re-confirmed against a fresh code read (per the brief's own instruction)

The brief's Note explicitly flagged its forward-mechanism claim as the brief-author's own inference,
"not independently re-verified against a fresh code read this pass," and asked the executing session
to re-confirm before relying on it. **Re-read `ai-worker/index.ts`'s `fetchFormatContext` this
session** (lines ~1183-1200, same function cited in the M11b kinetic_voice lane's design correction):

```sql
WHERE f.is_buildable = true AND f.ice_format_key IS NOT NULL
  AND (
    EXISTS (SELECT 1 FROM c.client_format_config cfc
      WHERE cfc.client_id = '${clientId}' AND cfc.ice_format_key = f.ice_format_key
        AND cfc.is_enabled = true AND (cfc.platform IS NULL OR cfc.platform = '${platform}'))
    OR NOT EXISTS (SELECT 1 FROM c.client_format_config cfc2 WHERE cfc2.client_id = '${clientId}')
  )
```

**CONFIRMED: the claim holds.** The second OR-branch (`NOT EXISTS ... WHERE client_id=...`) checks
whether the client has ANY `client_format_config` row **for any format at all** — not scoped to
`carousel` specifically. Today, CFW/Invegent's carousel-eligibility exclusion rests ENTIRELY on that
branch evaluating false (both clients have 2 rows, for OTHER formats) — if those 2 rows were ever
deleted, row count would return to zero, the branch would flip true, and carousel (plus every other
unlisted format) would silently reopen. **Adding this packet's explicit `carousel, is_enabled=false`
row closes this specific fragility**: with that row present, the FIRST OR-branch's `EXISTS(...
ice_format_key=f.ice_format_key AND is_enabled=true)` is scoped per-format and evaluates false for
`carousel` regardless of what happens to the `image_quote`/`text` rows — carousel eligibility no
longer depends on the *accidental persistence* of unrelated rows. This is independently re-verified
against the live query text this session, not merely inherited from the brief's own citation.

## 4. Proposed SQL (illustrative — NOT FOR APPLY)

**Execution channel (post-audit fix — pinned to one specific tool, not two alternatives):** ONE
explicit `BEGIN;...COMMIT;` transaction, submitted as ONE single `mcp__supabase__apply_migration`
call — `apply_migration` specifically (not `execute_sql`), same reasoning as the Seed A packet (this
packet is intended to land as a real, ledgered migration file, mirroring the D2 precedent's applied
form). `apply-harness-auditor`'s shadow review of an earlier draft flagged naming both tools as
interchangeable as a low-severity completeness gap (finding AHA-02-1) — fixed by pinning to one tool.

```sql
-- PROPOSED, NOT EXECUTED. Four additive INSERTs (2 client_format_config + 2 client_creative_governance),
-- one deterministic id each, ON CONFLICT DO NOTHING + fail-loud row-count assertion per row, mirroring
-- the D2 / Seed-A pattern. CFW and Invegent's wording is DELIBERATELY DISTINCT (see contract_ref values)
-- because the evidence supports two genuinely different histories (brief Notes, §5 below).
BEGIN;

DO $$
DECLARE v_rows int;
BEGIN
  -- ── CFW: fence-hardening row (client_format_config) ──────────────────────────────────
  IF EXISTS (SELECT 1 FROM c.client_format_config
             WHERE client_id = '3eca32aa-e460-462f-a846-3f6ace6a3cae' AND ice_format_key = 'carousel') THEN
    RAISE EXCEPTION 'm11b_seed_b_precheck_failed: CFW already has a carousel client_format_config row — STOP';
  END IF;
  INSERT INTO c.client_format_config (config_id, client_id, ice_format_key, is_enabled)
  VALUES ('b5eed001-0000-4000-8000-0000000000c1', '3eca32aa-e460-462f-a846-3f6ace6a3cae', 'carousel', false)
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'm11b_seed_b_postcheck_failed: CFW carousel config row insert expected 1, got %', v_rows;
  END IF;

  -- ── Invegent: fence-hardening row (client_format_config) ─────────────────────────────
  IF EXISTS (SELECT 1 FROM c.client_format_config
             WHERE client_id = '93494a09-cc89-41d1-b364-cb63983063a6' AND ice_format_key = 'carousel') THEN
    RAISE EXCEPTION 'm11b_seed_b_precheck_failed: Invegent already has a carousel client_format_config row — STOP';
  END IF;
  INSERT INTO c.client_format_config (config_id, client_id, ice_format_key, is_enabled)
  VALUES ('b5eed001-0000-4000-8000-0000000000c2', '93494a09-cc89-41d1-b364-cb63983063a6', 'carousel', false)
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'm11b_seed_b_postcheck_failed: Invegent carousel config row insert expected 1, got %', v_rows;
  END IF;

  -- ── CFW: retirement record (client_creative_governance) — REAL 171-render history ────
  IF EXISTS (SELECT 1 FROM c.client_creative_governance
             WHERE client_id = '3eca32aa-e460-462f-a846-3f6ace6a3cae' AND format = 'carousel') THEN
    RAISE EXCEPTION 'm11b_seed_b_precheck_failed: CFW already has a carousel governance row — STOP';
  END IF;
  INSERT INTO c.client_creative_governance
    (id, client_id, format, contract_ref, declarative_registry_ref, render_label, enabled)
  VALUES (
    'b5eed002-0000-4000-8000-0000000000c1',
    '3eca32aa-e460-462f-a846-3f6ace6a3cae',
    'carousel',
    'care_for_welfare.carousel.legacy_pipeline_retired',  -- genuine historical retirement: 171 real
                                                            -- succeeded carousel renders/90d before
                                                            -- 2026-08-02 incidental containment
    NULL,   -- honest NULL, same reasoning as D2/Seed-A
    'image_worker_legacy_carousel_v1',
    false   -- retirement record, not declared-legacy-live
  )
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'm11b_seed_b_postcheck_failed: CFW carousel governance row insert expected 1, got %', v_rows;
  END IF;

  -- ── Invegent: retirement record (client_creative_governance) — NEVER actually live ────
  IF EXISTS (SELECT 1 FROM c.client_creative_governance
             WHERE client_id = '93494a09-cc89-41d1-b364-cb63983063a6' AND format = 'carousel') THEN
    RAISE EXCEPTION 'm11b_seed_b_precheck_failed: Invegent already has a carousel governance row — STOP';
  END IF;
  INSERT INTO c.client_creative_governance
    (id, client_id, format, contract_ref, declarative_registry_ref, render_label, enabled)
  VALUES (
    'b5eed002-0000-4000-8000-0000000000c2',
    '93494a09-cc89-41d1-b364-cb63983063a6',
    'carousel',
    'invegent.carousel.retired_never_live',  -- distinct wording: the "5 succeeded" figure was slide-
                                              -- image RENDERS, not delivered posts — 2 drafts voided
                                              -- pre-publish, 3 silently downgraded to plain text by a
                                              -- since-fixed (v1.3.0, 2026-07-06) Zapier bridge bug;
                                              -- ZERO real carousel posts ever delivered for Invegent
    NULL,
    'image_worker_legacy_carousel_v1',
    false
  )
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'm11b_seed_b_postcheck_failed: Invegent carousel governance row insert expected 1, got %', v_rows;
  END IF;

  -- ── CAS no-volume-increase guard: pre-existing image_quote/text rows byte-identical ───
  IF (SELECT count(*) FROM c.client_format_config
      WHERE client_id IN ('3eca32aa-e460-462f-a846-3f6ace6a3cae','93494a09-cc89-41d1-b364-cb63983063a6')
        AND ice_format_key IN ('image_quote','text') AND is_enabled = true) <> 4 THEN
    RAISE EXCEPTION 'm11b_seed_b_cas_guard_failed: expected exactly 4 unchanged image_quote/text rows (2 per client, both enabled) after this apply — got a different count, ABORT';
  END IF;
END $$;

COMMIT;
```

## 5. Retirement-record wording — deliberately distinct, per the brief's own Notes

- **CFW** (`care_for_welfare.carousel.legacy_pipeline_retired`): a genuine historical route — 171
  real succeeded carousel renders across FB/IG/LI in the cited 90-day window before the 2026-08-02
  incidental containment.
- **Invegent** (`invegent.carousel.retired_never_live`): a route that never produced a real delivered
  post — the earlier "5 succeeded" figure was slide-image renders only; 2 drafts were voided pre-
  publish and 3 were silently downgraded to plain text by a since-fixed Zapier bridge bug (v1.3.0,
  2026-07-06). Collapsing both to identical wording would misrepresent the evidence — preserved as two
  distinct `contract_ref` strings and two distinct inline comments, per the brief's own instruction.

## 6. Rollback plan

```sql
-- Byte-symmetric reversal — 4 DELETEs by deterministic id, same single apply_migration-call
-- execution-channel discipline as the forward apply.
DELETE FROM c.client_creative_governance WHERE id IN ('b5eed002-0000-4000-8000-0000000000c1','b5eed002-0000-4000-8000-0000000000c2');
DELETE FROM c.client_format_config WHERE config_id IN ('b5eed001-0000-4000-8000-0000000000c1','b5eed001-0000-4000-8000-0000000000c2');
```
No pre-existing row is touched or destroyed by either the forward apply or the rollback — both are
scoped exactly to the 4 rows this packet itself would create.

## 7. Review tier

**T2** per CLAUDE.md Convention 3 (DML ⇒ ≥T2) — same reasoning as Seed A: additive, reversible,
non-secret, non-schedule, non-deploy DML. Full T2 chain required.

## 8. Open questions carried from the brief (not resolved here)

1. **Watch-window apply timing** — does this packet's apply count as a "new heavy CGU Final
   implementation lane" barred until watch expiry, or may PK elect to expedite? Not decided here.
2. **tmr-drift-probe side effect** — resolved as MOOT for this specific design (§2: `enabled=false`
   rows produce no new side effect) — remains a live question only if PK later wants `enabled=true`
   instead, which this packet does not propose and does not recommend.

## 9. `apply-harness-auditor` shadow-mode result

See the combined shadow-review section in the result doc (`docs/briefs/results/m11b-seed-a-seed-b-apply-packet-authoring-result-v1.md`)
— run against both packets together, findings recorded there per-packet.
