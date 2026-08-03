# Apply record — P3: register + calibrate `video_stat_reveal_9x16_v2` + PP restore (Lane A, WS-5)

**Applied:** 2026-08-03 Sydney, by chat (orchestrator) on PK's explicit apply verdict (pinned hash honored).
**Packet:** `docs/briefs/artifacts/ws5-p3-calibration-persist-apply-packet-v2.md` — hash re-verified at apply time = `73c28dd7ee6916fb69a5cd9297130c0bfde259a8625dd61b35502f4fc01c0b35` (exact match to PK's pin).
**Chain:** db-rls-auditor concerns→both must-fixes implemented · AHA shadow 5 findings→all fixed in v2 · external v2 `agree/proceed` (`c2c70f05`, pinned `73c28dd7…`).

## Step 0a — preconditions (ALL PASS)

- Packet hash exact match.
- Fresh security-advisor baseline captured: **250 findings, zero naming any touched function.**
- Pre-images captured and matched required pre-state exactly: template `inventory_hash IS NULL` (inventory_source pre-image text recorded in-session, beginning "V2 authoring spec _harness/video_tmr/…", ending "…(property-pulse.json v0.9)") · field rows = exactly Background (`fbec1217…`) + Logo (`ff69ce05…`), both constraints NULL · PP assignment `blocked`, `approved_by='PK'`, `approved_at='2026-07-19 01:08:00.4319+00'`.
- Rollback-validation: C.2/C.3 literals verified against the pre-images (restore values == pre-image values; identities character-identical). PASS.

## Step 0b — vocabulary migration (PASS)

- `apply_migration` name `tmr5_field_constraints_vocabulary_max_words_v1` (SQL byte-identical to the in-repo file `18ce83e3…`) → success.
- Smokes: max_words triple accepted (validator returned NULL) · unknown key still rejected (`text_limits_unknown_key:bogus_key`). PASS.
- Advisors re-run: **250, zero new, zero naming `tmr_validate_field_constraints`.** PASS.
- Repo file `supabase/migrations/20260803090000_…_v1.sql` exists locally, UNCOMMITTED — commit/push with the lane's git step on PK instruction (ledger⇄git no-drift rule).

## Step 1 — DO block (PASS, single transaction, zero exceptions)

All 10 gated writes landed: 7 field-row inserts (StatValue/StatLabel/ContextLine/CtaText/EyebrowText/VoiceAudio/MusicBed) + 2 CAS-from-NULL constraint sets (Background/Logo) + re-capture. Terminal assertion held (9 rows, zero NULL constraints).

## Step 2 — post-checks (ALL PASS)

1. **9 rows, all constraints populated.** Persisted md5s (the calibration identity): Background `62aea3b5…` · ContextLine `418847bb…` (130ch/4L) · CtaText `ec611b93…` (38ch/1L) · EyebrowText `01087a4f…` (13ch/1L + baked) · Logo `0426c7a2…` · MusicBed `a70b7f60…` · StatLabel `f1a18158…` (30ch/1L) · **StatValue `308bcf17…` (7ch/1L/1word)** · VoiceAudio `655cf4d0…`.
2. **EyebrowText baked values exact:** `eyebrow_value_property_pulse='MARKET UPDATE'` · `eyebrow_value_ndis_yarns='NDIS UPDATE'`.
3. **First content fingerprint set:** `inventory_hash='f98a8e082ac87655a44fbf8f4823ad0a5f2f81d8839f771a48952631e3751423'` (the PK-saved post-edit editor source).
4. NDIS selector still `fail_closed`; PP winner still `dd5fd75e…` pre-restore; claimable drafts 0.
5. **Intake validation: `verdict='pass'`, `mode='capture_check'`, `hard_failure_count=0`, `calibration_required=[]`, `limits_tbc=[]`** under the platform-neutral contract (`platforms:[]`, recorded Lane-B decision). Disclosure: the contract's element array was built from the just-persisted rows, whose bytes are the packet's Appendix-A literals by construction (validated at insert; md5s above) — C2 completeness, template block, and platform rules were exercised live; C3 declared-vs-captured is tautological under this construction and is covered instead by the insert-time validation + recorded md5s.

## Step 3 — PP restore (PASS)

- DO-wrapped CAS `blocked`→`visually_approved`, rowcount gate passed (no exception).
- Post-checks: PP assignment `visually_approved` with `approved_by='PK'`, `approved_at='2026-07-19 01:08:00.4319+00'` INTACT · **PP winner STILL `dd5fd75e-982d-4c3d-89cd-7ce0936076b2`** · `a3d8472d…` back in PP `alternatives[]` (with `4cd2c9e2…`) · **NDIS assignment still `blocked`**, selector `fail_closed` · claimable drafts 0.
- Lane-A exclusive ownership of row `1ee1a547…` ENDED at successful restore.

## PK required-final-state checklist — MET IN FULL

vocabulary supports max_words ✅ · all real template fields registered ✅ · all nine governed constraints persisted ✅ · EyebrowText carries PP `MARKET UPDATE` / NDIS `NDIS UPDATE` ✅ · first captured fingerprint ✅ · intake validation passes (platform-neutral P3 contract) ✅ · PP restored to `visually_approved` ✅ · PP production winner unchanged ✅ · NDIS remains blocked ✅ · no publish ✅.

## Standing next step

**P4 (final visual step of the repair):** produce the corrected NDIS render out-of-band, confirm it passes live bounds enforcement, bring it for PK's visual verdict. NO NDIS restoration, NO publication authorized at P3.
