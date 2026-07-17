# TMR — Re-skin Video Templates v1 · Fenced Registry Intake Packet

**Created:** 2026-07-16 Sydney · **Author:** chat (orchestrator) · **Status:** DRAFT — staged for PK Gate 1 (no apply)
**Lane class (CCF-02):** SIDE_PROVING · **Tier T2** (additive DB writes: 3 INSERT rows + tags into the LIVE TMR registry; deny-all RLS, service-role-only; fenced/not-selectable; zero production behaviour change)
**Predecessors:** `tmr-generic-template-library-foundation-v1.md` (unified static+video model) · `tmr4-generic-template-tags-asset-appetite-apply-result.md` (asset-appetite + tag tables APPLIED, v5.53) · `tmr-four-template-reskin-classification-workbook-v1.md` (classification)
**Source artefacts:** `~/Downloads/Creatomate Video template examples/Template intake/reskin_video_templates_v1/` (3 template JSONs + README) · smoke evidence `_harness/reskin_video_smoke_20260716/`

---

## 1. Task

Intake the three re-skinned, PK-transposed, smoke-passed generic **video** templates into the live TMR registry as **fenced** (`classified`) rows so a later, separately-gated **video-lane governed smoke + PK visual approval** can promote them. This packet writes registry metadata only. It does **not** render, select, enable, assign to a client, or mark anything proven.

### The three templates (all PK-transposed + direct-Creatomate smoke-passed 2026-07-16)

| # | Creatomate `provider_template_id` | Target family (EXISTING) | output_type | W×H | aspect | dur | JSON sha256 |
|---|---|---|---|---|---|---|---|
| 01 Stat Reveal | `c6dcaa2d-f3fe-4564-a588-6ac588680387` | `generic.stat_hero_card` | video | 720×1280 | 9:16 | 8s | `3dc71c36…` |
| 02 Multi-Stat / Tips | `817ce92d-6843-4580-ad09-3d35d80d8154` | `generic.listicle_card` | video | 1080×1080 | 1:1 | 9s | `0fd5248c…` |
| 03 Quote Statement | `416658f5-f565-4351-95e6-12b9a4063df0` | `generic.news.quote_card` | video | 720×1280 | 9:16 | 8s | `c7613d69…` |

---

## 2. Grounded schema evidence (live introspection, project `mbkmaxqhsohbtwsqolns`, 2026-07-16)

> All facts below were read live before drafting; the intake SQL is built against these, **not** the workbook preview (which was wrong on family keys — see §3).

- **`c.creative_provider_template`** — cols incl. `provider, provider_template_id, provider_template_name, family_id, scope, width, height, aspect_ratio, output_type, file_type_candidate, duration_seconds, inventory_status (dflt 'missing'), status (dflt 'discovered'), image_slot_min/max, needs_governed_background, text_overlay_safe_required`.
  - `status` CHECK (14-step lifecycle): `discovered → inventory_requested → inventory_captured → inventory_verified → classified → field_mapped → governance_reviewed → smoke_rendered → visually_approved → platform_safe → client_enabled → production_proven → deprecated → blocked`.
  - `output_type` CHECK: `static_image | animated_image | video | audio | unknown`. · `scope` CHECK: `generic | brand | client`.
  - `inventory_status` CHECK incl. `captured_from_render_probe`, `captured_from_manual_entry`.
  - UNIQUE `(provider, provider_template_id)`. FK `family_id → c.creative_template_family(id) ON DELETE SET NULL`.
- **`c.creative_template_family`** — `family_key` UNIQUE; `status` CHECK `draft | active | deprecated | blocked` (dflt `draft`); `scope` CHECK `generic|brand|client`.
- **`c.creative_provider_template_tag`** — `(template_id, namespace, value)`; UNIQUE `(template_id, namespace, value)`; FK `template_id → creative_provider_template(id) ON DELETE CASCADE`. `namespace` CHECK: `vertical | use_case | tone | motion_treatment | length_class | aspect_fit`. `length_class` value-vocab CHECK: `static | short_video | standard_short_video | long_video` (other namespaces = free-text).
- **`c.creative_template_family_tag`** — same shape keyed on `family_id`.

### Live registry facts that shaped this packet
- **Target families already exist as `draft`, each with ONE `static_image` member at `smoke_rendered` (1080×1080):** `generic.stat_hero_card` (`54b305c8…`), `generic.listicle_card` (`47ad6a9c…`), `generic.news.quote_card` (`2140ca19…`). → Adding a **video** row to each is the unified static+video model working as designed; **no new families**.
- **No collision:** none of the 3 new `provider_template_id`s exist in `c.creative_provider_template`.
- **No existing family default tags** on the 3 target families.

---

## 3. Correction to the classification workbook (material)

The workbook Sheet 3 proposed **new** family keys `generic.stat_reveal` / `generic.quote_statement` / `generic.tips_listicle`. **Those keys do not exist and would proliferate families.** The live registry already carries the matching archetype families (`generic.stat_hero_card`, `generic.listicle_card`, `generic.news.quote_card`), each seeded with a static sibling. **This packet reuses them** — one archetype family holding a static + a video member, differentiated by `output_type` + tags. (This is the doctrinal "vertical/medium is a tag, not a new family" rule; the workbook's family-key column is superseded by this packet.)

---

## 4. Exactly what gets written (and what does NOT)

**WRITES (all additive, fenced):**
1. **3 rows** into `c.creative_provider_template` — `scope='generic'`, `status='classified'`, `output_type='video'`, linked to the existing `family_id`, geometry/duration/asset-appetite as built.
2. **Template-level tags** into `c.creative_provider_template_tag` (6 per template = 18 rows). Tags are placed at **template level, not family default**, so the intake is surgical and does **not** retroactively re-tag the pre-existing static siblings.

**DELIBERATELY NOT WRITTEN (this is the fence — §5):**
- ✗ No `c.creative_template_family` rows (families exist).
- ✗ No `c.creative_template_variant_candidate` row → the template never enters the `select_template` candidate loop.
- ✗ No `c.creative_template_platform_suitability` row.
- ✗ No `c.creative_template_client_assignment` row.
- ✗ No `c.creative_template_proof_event` row.
- ✗ No DDL, no GRANT/REVOKE, no RLS change, no RPC change, no `apply_migration` deny-list touch, no worker/deploy change.

### Asset-appetite (as built — all three are background-free)
| # | image_slot_min | image_slot_max | needs_governed_background | text_overlay_safe_required |
|---|---|---|---|---|
| 01 | 0 | 0 | false | NULL (n/a — no image bg) |
| 02 | 0 | 0 | false | NULL |
| 03 | 0 | 0 | false | NULL |

### Tags (template-level)
| # | vertical | use_case | tone | motion_treatment | length_class | aspect_fit |
|---|---|---|---|---|---|---|
| 01 | generic | stat_reveal | clean | counter_reveal | short_video | 9x16 |
| 02 | generic | tips_listicle | clean | staggered_slide | short_video | 1x1 |
| 03 | generic | quote_statement | dramatic | searchlight_reveal | short_video | 9x16 |

> **Honesty note on 03 `motion_treatment`:** built as a translucent **spotlight sweep**, not a true alpha mask (kept background-free). Tagged `searchlight_reveal` to reflect what actually renders; the workbook's `masked_reveal` is retired for this row. The photo-reveal mask variant is a documented future upgrade.

### Copy-length note (from 02 smoke)
Each `Points` line renders as its own scaling-clip pill; a line that exceeds the box wraps into an extra pill (observed: "…first / impression"). Not a defect. Recorded here as the intake copy rule: **`Points` lines should each fit one line at max font.** (Informational — no column encodes it; carried in the result doc.)

---

## 5. Fencing proof (why these rows are unreachable by production)

`public.select_template` (read live) only returns a template when **all** hold. Each fails independently for our rows:

1. **Candidate set** = JOIN through `c.creative_template_variant_candidate` on `format_key`. We write **no** variant_candidate row → our templates are never even iterated (`format_unmapped` / not a candidate). *(primary fence)*
2. **status filter:** must be ∈ `{smoke_rendered, visually_approved, platform_safe, client_enabled, production_proven}`. `classified` → rejected `status_below_smoke`.
3. **client assignment:** none written → `no_assignment`.
4. **visual proof:** no passed `visual_approval` proof event → `not_visually_proven`.

Any ONE suffices; all four are true. Additionally `resolve_slot_assets` is never reached. **Zero production behaviour change** — no live selection path, worker, or client sees these rows.

---

## 6. Proposed migration (parameterised; final SQL cut at apply time)

Single transaction, sub-selects resolve `family_id` by key, guarded against re-run by the `(provider, provider_template_id)` UNIQUE (use `ON CONFLICT (provider, provider_template_id) DO NOTHING` on the parent, and `ON CONFLICT (template_id, namespace, value) DO NOTHING` on tags). Illustrative shape (one template shown):

```sql
BEGIN;
WITH ins AS (
  INSERT INTO c.creative_provider_template
    (provider, provider_template_id, provider_template_name, family_id, scope,
     width, height, aspect_ratio, output_type, file_type_candidate, duration_seconds,
     inventory_status, inventory_source, captured_by, captured_at, inventory_hash,
     status, image_slot_min, image_slot_max, needs_governed_background, text_overlay_safe_required)
  SELECT 'creatomate', 'c6dcaa2d-f3fe-4564-a588-6ac588680387',
         'ICE Generic Stat Reveal 9x16 v1 (video)', f.id, 'generic',
         720, 1280, '9:16', 'video', 'mp4', 8,
         'captured_from_render_probe',
         'ICE reskin_video_templates_v1 direct+v2 Creatomate smoke 2026-07-16',
         'ICE orchestrator (tmr reskin video intake v1)', now(),
         '3dc71c360d3d4773d219686c919a149b9221b21ead9016dde078250e523b826c',
         'classified', 0, 0, false, NULL
  FROM c.creative_template_family f
  WHERE f.family_key = 'generic.stat_hero_card'
  ON CONFLICT (provider, provider_template_id) DO NOTHING
  RETURNING id
)
INSERT INTO c.creative_provider_template_tag (template_id, namespace, value)
SELECT ins.id, v.namespace, v.value FROM ins,
  (VALUES ('vertical','generic'),('use_case','stat_reveal'),('tone','clean'),
          ('motion_treatment','counter_reveal'),('length_class','short_video'),('aspect_fit','9x16')) AS v(namespace,value)
ON CONFLICT (template_id, namespace, value) DO NOTHING;
-- … repeat block for 02 (generic.listicle_card) and 03 (generic.news.quote_card) …
COMMIT;
```

**Apply mechanism:** per the TMR-4 precedent, `apply_migration` is deny-listed for agents; PK authorises a one-time apply (execute_sql fallback + `supabase_migrations` ledger backfill, byte-exact, deny-list untouched). Migration name is permanent identity: `<ts>_tmr_reskin_video_templates_v1_fenced_intake`.

**Post-apply in-txn assertions (fail-closed):** row counts = 3 provider rows + 18 tag rows; all 3 `status='classified'`; all 3 `scope='generic'`, `output_type='video'`; 0 rows written to variant_candidate / platform_suitability / client_assignment / proof_event by this migration.

---

## 7. Review chain (T2) + rollback

- **db-rls-auditor** — verify: additive-only, no RLS/grant change, ON CONFLICT correctness, FK resolves, no PostgREST exposure change, tag CHECK vocab satisfied, no satellite rows.
- **External review** (`ask_chatgpt_review`) — pinned to the final migration hash; STOP on any non-clean verdict.
- **branch-warden** — HEAD/parity/file-set before any commit.
- **Rollback (written + validated before apply):** `DELETE FROM c.creative_provider_template WHERE provider='creatomate' AND provider_template_id IN (…3 ids…);` — tags cascade via FK `ON DELETE CASCADE`. No other object touched; families and the static siblings are untouched. Rollback is exact and side-effect-free.

---

## 8. Post-apply verification (read-only)
1. 3 rows present, `status='classified'`, correct family_id/output_type/geometry/appetite.
2. 18 tag rows present, vocab-valid.
3. `select_template('property-pulse', <platform>, <any format>, …)` does **not** return any of the 3 (expect they never appear as candidates / `status_below_smoke`).
4. The 7 reader RPCs still function; the 3 pre-existing static siblings unchanged; family count unchanged (still no new families).
5. 0 rows in variant_candidate / platform_suitability / client_assignment / proof_event for the 3 template_ids.

---

## 9. Open questions for PK (decisions before apply)
- **Q1 — Reuse vs new families.** This packet **reuses** the existing archetype families (static + video siblings in one family, per the unified model). Confirm — or do you want medium-specific families (e.g. a separate video family)? *(Recommend: reuse.)*
- **Q2 — Intake status.** Proposed `classified` (conservative fenced floor). We have in fact field-mapped + ad-hoc-smoke-rendered these; do you want to intake at `classified` and let the video-lane governed smoke advance the status, or intake higher at `field_mapped`? *(Recommend: `classified` — keep the lifecycle honest; the ad-hoc Creatomate render is not the governed `smoke_rendered` rung.)*
- **Q3 — 03 motion tag.** `searchlight_reveal` (reflects the spotlight build) vs the workbook's `masked_reveal`. *(Recommend: `searchlight_reveal`.)*

## 10. Success criteria / STOP conditions
- **Success:** 3 fenced `classified` video rows + 18 tags land; fencing verified 4 ways; static siblings + families + reader RPCs unchanged; rollback proven.
- **STOP (any):** family-key or id collision surfaces · a satellite row would be written · any CHECK/vocab violation · db-rls-auditor or external review non-clean · migration hash drift from the reviewed cut · rollback not validated first · any DDL/GRANT/RLS creep. A tripped STOP voids the sequence; resume only at a fresh PK gate.

---

**This packet decides nothing.** It stages the fenced intake for PK Gate 1. On approval the orchestrator cuts the final migration, runs the T2 review chain against its hash, and stops for the PK apply gate. Promotion (video-lane governed smoke → PK visual approval → assignment/proof/enable) remains a later, separately-gated lane.
