# CGU Final — Phase-1 Watch Log (2026-08-04 → 2026-08-11, Sydney)

Read-only monitoring record for the v11 seven-day watch, per the PK control-tower ruling
(`docs/briefs/cgu-final-control-tower-watch-ruling-v1.md`, v6.140). All reads via the
allowlisted R0 path (`scripts/db-read.py`, `ice_ro` views) — zero writes. Feeds the
watch-expiry verdict; resolves nothing by itself.

## Day 1 — 2026-08-05 ~15:20 Sydney (baseline)

- **Cron health:** 12/12 jobs `green`, zero consecutive misses (incl. `fill-pending-slots-every-10m`,
  `materialise-slots-nightly`, `asset-gap-analysis-daily`).
- **Slots scheduled after the v11 commit time (2026-08-04T10:20Z), by platform (status: filled/future/skipped):**
  facebook 6/21/7 · instagram 4/25/8 · linkedin 3/31/14 · youtube 3/8/5.
  Skips are terminal by design (S9); counts recorded as baseline, to be trended not judged.
- **Pipeline health (latest snapshot 2026-08-05T05:00Z):** queue_total 830, queued 26,
  **failed 15, has_stuck_items=true** — recorded as baseline for trending; not classified an
  incident by this read. If failed/stuck grows day-over-day, escalate to PK before watch end.
- **Watched supervised-only cells (v11 exception list):** no volume observed outside baseline —
  PP YT kinetic / NDIS YT stat / CFW LI image_quote remain supervised-only; NDIS carousel frozen.

## Control-tower notes — corrections owed at the NEXT register cut (not a daily entry)

1. **v6.142 protocol-note correction:** S-A (M11c reconciliation) committed `e3129d1` locally only
   and never pushed — content reached origin via the control tower's subsequent pushes. The entry's
   "self-committed/pushed" overstates by one word; deviation was commit-instead-of-return only.
2. **Commit `a814e4f` attribution:** the M13 packet §13 addendum in that commit was authored by the
   M13 scoping session (S-B, staged in the shared checkout, swept in by the control tower's Seed-A
   commit) — not by the Gate-1 batch lane the commit message names.

## Session-reduction status (v6.140 order) — as of 2026-08-05 ~16:20 Sydney

All three watch-week decision-prep lanes TERMINAL and archived (Gate-1 batch · M11c reconciliation ·
M13 scoping). Active: control tower + CFW/INV asset sourcing only.

## M18 escalation-trigger sweep — 2026-08-05 ~16:45 Sydney (read-only; digest-only discipline, no value read into any transcript)

- Repo: **zero literal key assignments** (pattern scan, 35 env-var-name references all benign).
- The 4 local out-of-band scripts (M18 packet §B rows 4–7): all read `Deno.env.get('CREATOMATE_API_KEY')`,
  **zero embedded literals**.
- Operator shell env: `CREATOMATE_API_KEY` **SET**, sha256 prefix `df13b951` = the key P1_FINDINGS
  (2026-07-10) digest-confirmed as **invalid** — benign unless the v5.89 rotation reused it (unlikely, unverified).
- **⚠ FINDING — probable trigger match:** `C:/Users/parve/Downloads/creatomate api key.txt` exists,
  96 chars trimmed, file dated **2026-07-19** (the v5.89 rotation window), sha256 prefix `bcde13d1` —
  a **third digest**, matching neither the P1-invalid key nor the pre-rotation production key
  (`8ab5a356`). Most probable classification: **plaintext copy of the CURRENT production key,
  unmanaged, on disk**. Liveness NOT confirmed — confirming would require using the key (R2 secret-USE,
  needs its own Gate-1 rider; not done). Surfaced to PK same session as a probable match to the
  v6.140 M18 early-execution trigger ("current accessible unmanaged credential").
- Out-of-M18-scope pattern, noted for PK: Downloads also holds plaintext `ANTHROPIC_API_KEY.txt`,
  `Elevellabsapikey.txt`, `ICE_HEYGEN_API_KEY.txt`, `ICE_PEXELS_API_KEY.txt`, `ICE_Pixabay_API_KEY.txt`,
  and 3 Google `client_secret_*.json` files — same unmanaged-plaintext habit across 6+ other credentials.

*(Subsequent daily entries append below; one line-block per day; any STOP-condition match →
surface to PK immediately, do not wait for watch expiry.)*
