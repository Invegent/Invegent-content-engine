# cc-a2-branch-a-host-pin — Branch A: interim primary brand host v1 (avatar pin)

**Brief ID:** `cc-a2-branch-a-host-pin`
**Class:** `config_change` — DML on `c.brand_avatar` (UPDATE only; zero DDL; zero deletes)
**Status:** AUTHORED — **NOT EXECUTED.** Committing this brief is a docs action only.
**Execution gates (all required, at execution time, in order):** Stage 0 read-only preflight → **D-01 `ask_chatgpt_review`** → **PK exact approval phrase** → `apply_migration` only after approval → post-apply V-checks → passive telemetry confirmation on next scheduled render.
**Decision basis:** `docs/runtime/sessions/2026-06-12-a2-branch-a-avatar-host-selection.md` (PK interim-host decision) + `docs/runtime/sessions/2026-06-12-option-c-a2-gate-prep.md` (telemetry evidence).

---

## 1. Framing

**Branch A = interim primary brand host v1 — NOT "one avatar forever," NOT a permanent reduction of the cast.** The pin establishes a deliberate, deterministic default face per brand by leaving exactly one active `c.brand_avatar` row each for NDIS Yarns and Property Pulse, making heygen-worker v2.1.1's `LIMIT 1` selection deterministic. All deactivated avatars remain **future Branch B assets** (role-aware supporting cast). Future purpose-built hosts remain desirable and may later replace the interim picks: **"NDIS Yarns Host" / "NDIS Navigator"** and **"Property Pulse Analyst" / "Property Pulse Host"** (each = `brand_stakeholder` row + gated HeyGen avatar creation + `brand_avatar` row; re-pin under this same mechanism).

## 2. Decisions of record (PK, 2026-06-12)

| # | Decision |
|---|---|
| 1 | **NDIS Yarns interim primary host: `Support Coordinator (Realistic)`** — ID prefix `7e98bd38…` |
| 2 | **Property Pulse interim primary host: `Buyer's Agent (Realistic)`** — ID prefix `5d03454f…` |
| 3 | **Fallback hosts to avoid as defaults:** NY `Alex — NDIS Participant (Realistic)` (lived-experience scripts only); PP `Tenant (Realistic)` (tenant-perspective scripts only). Both were arbitrary `fallback_limit1` picks, proven live in `avatar_identity` telemetry, with no face-stability guarantee. |
| 4 | **Cast preserved:** supporting avatars (both render styles) remain Branch B assets; nothing is deleted. |
| 5 | **Execution separate:** this brief authorises nothing by itself — gates in the header apply at execution time. |

## 3. Why now

Both channels' first-person expert narration is currently fronted by an arbitrarily-selected stakeholder persona nobody chose (`avatar_selected_by='fallback_limit1'`, `stakeholder_role=null` on both post-v2.1.1 renders), and `LIMIT 1` without `ORDER BY` means the face can silently change between renders. Brand-governance unsafe; each render cycle extends exposure.

## 4. Stage 0 — Preflight (read-only, same session as apply; ABORT on any failure)

1. **Rollback manifest capture:** re-read the full NY+PP inventory — **all 28 rows** (14 per brand) — capturing `brand_avatar_id`, full `heygen_avatar_id`, `avatar_display_name`, `render_style`, `is_active` into the execution session record. This manifest IS the rollback artifact.
2. **Pin-target uniqueness:** confirm exactly ONE row per brand matches the pin predicate (client + display name + `render_style='realistic'` + ID prefix match `7e98bd38…` / `5d03454f…`). Abort if 0 or >1.
3. **Consumer check:** confirm no production reader depends on currently-deactivated rows in a breaking way — grep invegent-dashboard for `brand_avatar` usage (deactivation must only hide, not error) and confirm heygen-worker is the sole render-path `is_active` consumer.
4. **In-flight check:** confirm no avatar render job is mid-cycle at apply time.
5. **Expected state check:** active-count per brand currently = 14; total NY+PP rows = 28. Abort on drift (re-baseline first).

## 5. Stage 1 — Apply (ONLY after D-01 + PK exact approval phrase)

One `apply_migration` DO block (`pin_primary_brand_host_v1`), UPDATE-only:

- For NDIS Yarns: `UPDATE c.brand_avatar SET is_active=false, updated_at=now() WHERE client_id=<NY> AND is_active=true AND brand_avatar_id <> <NY_pinned_id>;`
- For Property Pulse: same shape with `<PP>` / `<PP_pinned_id>`.
- In-block assertions: pinned row still active per brand; post-update active-count per brand = 1; `RAISE EXCEPTION` (aborting the transaction) on any assertion failure.
- **Expected effect: NY 13 rows deactivated + 1 active; PP 13 rows deactivated + 1 active; 26 rows updated total; 0 rows deleted; CFW/Invegent untouched.**
- IDs are taken from the Stage 0 manifest at execution time — never hardcoded from this brief (prefixes above are identification aids, not execution values).

## 6. Stage 2 — V-checks (read-only, immediately post-apply)

- **V1:** active-count per brand = 1 AND the active row's `heygen_avatar_id` matches the pinned prefix (`7e98bd38…` NY / `5d03454f…` PP).
- **V2:** CFW and Invegent `brand_avatar` row states unchanged.
- **V3:** total NY+PP row count still 28 — nothing deleted.

## 7. Stage 3 — Passive telemetry confirmation (next scheduled render; NO worker invocation)

Next NY and PP HeyGen renders show `m.post_render_log.render_spec->avatar_identity->talking_photo_id` = pinned IDs. Wait for the scheduled cycle — do not force a render.

## 8. D-01 payload skeleton (fire at execution time, not now)

`decision_under_review`: interim primary host pin (Branch A v1). `production_action_if_approved`: Stage 1 UPDATEs (26 rows deactivated, 2 brands pinned). `consequence_if_delayed`: arbitrary off-brand hosts (Participant/Tenant) keep fronting both channels each render. `cost_of_waiting`: low per render; brand-governance unsafe; compounds per cycle. `current_evidence`: live `fallback_limit1` telemetry + PK selection record + this brief. `known_weak_evidence`: 2 telemetry data points; LIMIT-1 face stability unproven either way. `default_action`: apply the pin.

## 9. Rollback

Single statement from the Stage 0 manifest: `UPDATE c.brand_avatar SET is_active=true, updated_at=now() WHERE brand_avatar_id IN (<the 26 deactivated ids>);` — restores the exact prior state (all 28 NY+PP rows active). **Deactivate 13 rows per brand only; delete nothing; rollback = reactivating the captured 26 rows.** Worst case: one render cycle on the pinned host before rollback. Zero schema change; zero worker redeploy.

## 10. Abort conditions

Preflight uniqueness mismatch (§4.2); consumer check failure (§4.3); inventory drift from 14/14/28 (§4.5); D-01 escalation with a genuine type-(b) objection (satisfy before proceeding); absence of PK exact approval phrase.
