# DRAFT — Creatomate Pre-Cleanup Guard Checklist (TMR-GOV-PROVIDER-1)

**Status: DRAFT for PK ratification** (Creatomate Provider Reconciliation v0 lane; not in force until PK ratifies). Born from the 2026-07-04 incident: template `fb9820f8…` deleted in the Creatomate UI during cleanup → PP image_quote production down ~27h (fail-safe held).

> **Rule:** before ANY Creatomate template is deleted, renamed, paste-overwritten (repurposed), or moved, run this checklist. A template that fails ANY check is production-coupled — deleting it is a production change and takes a PK-gated lane, not a UI click.

For each template you intend to touch, check its ID against:

1. **Registry check (live DB):** `SELECT provider_template_name, status FROM c.creative_provider_template WHERE provider_template_id = '<id>'` — any row with a `visually_approved`+ assignment is **selectable by the live TMR selector**; deleting its provider template breaks production renders the moment it wins. ⚠️ *A code grep is NOT sufficient: 15 of the 16 live-selectable generics have zero code references (data-driven selection) — the registry is the only guard.*
2. **Code check (CE repo):** `grep -r "<id>" supabase/functions/` — any non-test, non-comment hit = a wired branch (production or opt-in).
3. **Contract check:** `grep "<id>" supabase/functions/*/creative_contract.ts` — vendored contract pins are evidence surfaces; changing the template's identity invalidates them (contract version bump lane).
4. **Dashboard check:** `grep -r "<id>" ../invegent-dashboard/lib ../invegent-dashboard/actions` — status cards/vendored registry may present it as truth.
5. **Repurposing rule (the `48cba556` lesson):** paste-overwriting a template's design KEEPS its ID — every registry row, contract, doc, and test pinning that ID now describes the wrong artwork. Repurposing = same gate as deletion, PLUS a registry re-capture in the same motion.
6. **Recent-render check:** `SELECT count(*) FROM m.post_render_log WHERE render_spec::text LIKE '%<id>%' AND created_at > now() - interval '30 days'` — recent production usage = hard stop.
7. **After any ratified cleanup:** re-run the Provider Reconciliation matrix (this lane's artifact) and record the delta in the registers.

**Standing follow-ups this checklist implies (separate gated lanes, recorded):** periodic automated provider-inventory probe vs registry (detects silent provider-side loss for the 15 un-anchored generics) · `CREATOMATE_GENERICS_API_KEY` secret split · dashboard vendored-registry refresh.
